import { describe, expect, it } from 'vitest'
import { BULLET_SIZE, gridToTankPosition, TANK_SIZE } from './constants.ts'
import { CAMPAIGN_LEVELS, CAMPAIGN_MAP_COLS, CAMPAIGN_MAP_ROWS, createTiles } from './level.ts'
import { MemorySaveStore } from './save.ts'
import { TanchikiGame } from './game.ts'
import {
  createQaScenario,
  QA_CELLS,
  QA_INTEGRATION_LEVEL,
  QA_INTEGRATION_LEVEL_ID,
  QA_INTEGRATION_LEVEL_NAME,
  QA_INTEGRATION_ROWS,
} from './testing/qaIntegrationLevel.ts'
import type {
  Bullet,
  CombatSide,
  InputState,
  LevelDefinition,
  OfflineDeployableKind,
  OfflineRetranslator,
  OfflineVisionMemory,
  SavedRun,
  Tank,
  Team,
  Vec,
} from './types.ts'

describe('hidden QA integration map', () => {
  it.concurrent('stays out of the player-facing campaign and uses valid arena geometry', () => {
    expect(CAMPAIGN_LEVELS.some((level) => level.id === QA_INTEGRATION_LEVEL_ID)).toBe(false)
    expect(CAMPAIGN_LEVELS.some((level) => level.name === QA_INTEGRATION_LEVEL_NAME)).toBe(false)
    expect(QA_INTEGRATION_ROWS).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(QA_INTEGRATION_ROWS.every((row) => row.length === CAMPAIGN_MAP_COLS)).toBe(true)

    const defaultGame = new TanchikiGame({ saveStore: new MemorySaveStore() })
    const defaultText = defaultGame.renderText()
    expect(defaultText).not.toContain(QA_INTEGRATION_LEVEL_NAME)
    expect(defaultGame.getSnapshot().level.name).not.toBe(QA_INTEGRATION_LEVEL_NAME)

    for (const cell of Object.values(QA_CELLS)) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(CAMPAIGN_MAP_COLS)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeLessThan(CAMPAIGN_MAP_ROWS)
    }
  })

  it.concurrent('marks named pads, blockers, ammo, and objective cells with the expected tile roles', () => {
    const tiles = createTiles(QA_INTEGRATION_LEVEL.rows)
    const passableCells = [
      QA_CELLS.playerSpawn,
      QA_CELLS.stagingEast,
      QA_CELLS.minePad,
      QA_CELLS.noisePad,
      QA_CELLS.tripwirePad,
      QA_CELLS.relayNear,
      QA_CELLS.relayFar,
      QA_CELLS.ctfHome,
      QA_CELLS.ctfFlag,
      QA_CELLS.assaultCore,
    ]

    for (const cell of passableCells) {
      expect(['empty', 'road']).toContain(tiles[cell.y]?.[cell.x]?.kind)
    }
    expect(tiles[QA_CELLS.hiddenWall.y]?.[QA_CELLS.hiddenWall.x]?.kind).toBe('brick')
    expect(tiles[QA_CELLS.ammoStation.y]?.[QA_CELLS.ammoStation.x]?.kind).toBe('ammo')
    expect(tiles[QA_CELLS.base.y]?.[QA_CELLS.base.x]?.kind).toBe('base')
  })

  it('covers shell economy, ammo recharge, direct splash behavior, and empty-fire safety', () => {
    const game = startQaGame(createQaScenario('defense', noSpawnOverrides()), false)
    const internals = getGameInternals(game)

    expect(game.getSnapshot().player.shells).toBe(10)
    game.primaryAction()
    let snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(9)
    expect(internals.bullets).toContainEqual(expect.objectContaining({ owner: 'player', speed: 240, ttl: expect.any(Number), splashDamage: 1, splashRadius: 40 }))
    expect(internals.bullets[0]?.ttl).toBeCloseTo(2.05, 2)

    game.primaryAction()
    expect(game.getSnapshot().player.shells).toBe(9)
    internals.bullets = []
    internals.playerShells = 0
    internals.player.reload = 0
    game.primaryAction()
    expect(internals.bullets).toHaveLength(0)
    expect(game.getSnapshot().player.shells).toBe(0)

    internals.playerShells = 9
    internals.playerShellRechargeProgress = 0
    setTankCell(internals.player, QA_CELLS.ammoStation)
    step(game, 2.05)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ shells: 10, onAmmoStation: true })
    expect(snapshot.runStats.shellsRecharged).toBe(1)
    expect(snapshot.feedback.notices).toContainEqual(expect.objectContaining({ text: 'AMMO' }))

    const direct = makeTankAt('qa-direct', QA_CELLS.shellDirectTarget, 'enemy', 'red', 2)
    const shrapnel = makeTankAt('qa-shrapnel', QA_CELLS.shellSplashTarget, 'enemy', 'red', 2)
    const ally = makeTankAt('qa-ally', QA_CELLS.shellAllySafe, 'player', 'blue', 2)
    internals.enemies = [direct, shrapnel, ally]
    internals.bullets = [{
      id: 'qa-splash',
      owner: 'player',
      ownerId: 'player',
      side: 'player',
      team: 'blue',
      x: direct.x + TANK_SIZE / 2 - BULLET_SIZE / 2,
      y: direct.y + TANK_SIZE / 2 - BULLET_SIZE / 2,
      dir: 'up',
      speed: 0,
      damage: 2,
      ttl: 1,
      splashDamage: 1,
      splashRadius: 40,
    }]

    step(game, 0.02)
    snapshot = game.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.id === 'qa-direct')).toBe(false)
    expect(internals.enemies.find((enemy) => enemy.id === 'qa-shrapnel')).toMatchObject({ hp: 1 })
    expect(internals.enemies.find((enemy) => enemy.id === 'qa-ally')).toMatchObject({ hp: 2 })
    expect(snapshot.runStats).toMatchObject({ playerKills: 1, shrapnelHits: 1 })
  })

  it('covers strict fog, always-visible base cells, and fixed relay team-vision merge', () => {
    const game = startQaGame(createQaScenario('team', noSpawnOverrides()), false)
    let snapshot = game.getSnapshot()

    expect(snapshot.level.name).toBe(QA_INTEGRATION_LEVEL_NAME)
    expect(snapshot.vision.visibleCells).not.toContainEqual(cellAsVisible(QA_CELLS.relayFar))
    expect(snapshot.retranslators.some((relay) => sameCell(relay, QA_CELLS.relayFar))).toBe(false)
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'solo', teamVisionMerged: false, ownedRetranslatorCount: 0 })
    expect(snapshot.vision.circles).toHaveLength(1)

    step(game, 3.7)
    snapshot = game.getSnapshot()
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'linked', teamVisionMerged: true, ownedRetranslatorCount: 1 })
    expect(snapshot.retranslators).toContainEqual(expect.objectContaining({ col: QA_CELLS.relayNear.x, row: QA_CELLS.relayNear.y, owner: 'player' }))
    expect(snapshot.vision.circles.some((circle) => circle.kind === 'teammate')).toBe(true)
    expect(snapshot.vision.circles.some((circle) => circle.kind === 'relay')).toBe(true)

    const defense = startQaGame(createQaScenario('defense', noSpawnOverrides()), false)
    const defenseSnapshot = defense.getSnapshot()
    expect(defenseSnapshot.vision.alwaysVisibleCells).toContainEqual(cellAsVisible(QA_CELLS.base))
    expect(defenseSnapshot.terrain.base).toBe(1)
  })

  it('keeps portable relay signals echo-only on walls, hostiles, and decoys', () => {
    const game = startQaGame(createQaScenario('defense', noSpawnOverrides()), false)
    const internals = getGameInternals(game)
    internals.enemies.push(makeTankAt('qa-hidden-hostile', QA_CELLS.hiddenHostile, 'enemy', 'red', 3))

    const before = game.getSnapshot()
    expect(before.enemies.some((enemy) => enemy.id === 'qa-hidden-hostile')).toBe(false)
    expect(before.vision.visibleCells).not.toContainEqual(cellAsVisible(QA_CELLS.hiddenWall))

    holdButton(game, 'relay', 1.22)
    releaseButton(game, 'relay')
    step(game, 1.8)

    let snapshot = game.getSnapshot()
    const signalText = JSON.stringify(snapshot.portableRelay.signalContacts)
    expect(snapshot.portableRelay.waveCount).toBeGreaterThan(0)
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({ kind: 'wall', col: QA_CELLS.hiddenWall.x, row: QA_CELLS.hiddenWall.y }))
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({ kind: 'hostile', team: 'red' }))
    expect(snapshot.enemies.some((enemy) => enemy.id === 'qa-hidden-hostile')).toBe(false)
    expect(snapshot.vision.visibleCells).toEqual(before.vision.visibleCells)
    expect(snapshot.fog.visibleCellCount).toBe(before.fog.visibleCellCount)
    expect(snapshot.terrain.brick).toBe(before.terrain.brick)
    expect(signalText).not.toContain('qa-hidden-hostile')
    expect(JSON.stringify(snapshot.readableText)).not.toContain('qa-hidden-hostile')

    const decoyGame = startQaGame(createQaScenario('defense', noSpawnOverrides()), false)
    const decoyInternals = getGameInternals(decoyGame)
    decoyInternals.deployables.push({ id: 'qa-decoy', kind: 'decoy', col: QA_CELLS.decoyEcho.x, row: QA_CELLS.decoyEcho.y, owner: 'player' })
    holdButton(decoyGame, 'relay', 1.22)
    releaseButton(decoyGame, 'relay')
    step(decoyGame, 1.15)
    snapshot = decoyGame.getSnapshot()
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({ kind: 'hostile', col: QA_CELLS.decoyEcho.x, row: QA_CELLS.decoyEcho.y, team: 'red' }))
    expect(snapshot.enemies).toHaveLength(0)
  })

  it('covers deployable latch, recovery, triggers, alerts, status effects, and pass-through behavior', () => {
    const game = startQaGame(createQaScenario('defense', noSpawnOverrides()), false)
    const internals = getGameInternals(game)

    holdButton(game, 'decoy', 0.92)
    let snapshot = game.getSnapshot()
    expect(snapshot.deployables.active).toContainEqual(expect.objectContaining({ kind: 'decoy', col: QA_CELLS.playerSpawn.x, row: QA_CELLS.playerSpawn.y }))
    holdButton(game, 'decoy', 0.8)
    expect(game.getSnapshot().deployables.active).toHaveLength(1)
    releaseButton(game, 'decoy')
    holdButton(game, 'decoy', 0.72)
    expect(game.getSnapshot().deployables.active).toHaveLength(0)
    expect(game.getSnapshot().runStats.deployablesRecovered.decoy).toBe(1)
    releaseButton(game, 'decoy')

    internals.deployables.push({ id: 'qa-mine', kind: 'mine', col: QA_CELLS.minePad.x, row: QA_CELLS.minePad.y, owner: 'player' })
    internals.enemies.push(makeTankAt('qa-friendly-safe', QA_CELLS.mineTrigger, 'player', 'blue', 3))
    step(game, 0.1)
    expect(internals.deployables.some((deployable) => deployable.id === 'qa-mine')).toBe(true)
    internals.enemies = internals.enemies.filter((tank) => tank.id !== 'qa-friendly-safe')
    internals.enemies.push(makeTankAt('qa-mine-target', QA_CELLS.mineTrigger, 'enemy', 'red', 3))
    internals.bullets.push(passThroughBullet('qa-mine-pass', QA_CELLS.minePad))
    step(game, 0.1)
    expect(internals.enemies.find((tank) => tank.id === 'qa-mine-target')).toMatchObject({ hp: 1 })
    expect(internals.enemies.find((tank) => tank.id === 'qa-mine-target')?.slow).toBeGreaterThan(9)
    expect(internals.deployables.some((deployable) => deployable.id === 'qa-mine')).toBe(false)
    expect(internals.bullets.some((bullet) => bullet.id === 'qa-mine-pass')).toBe(true)

    internals.deployables.push({ id: 'qa-noise', kind: 'noise', col: QA_CELLS.noisePad.x, row: QA_CELLS.noisePad.y, owner: 'player' })
    internals.enemies.push(makeTankAt('qa-noise-target', QA_CELLS.noiseTrigger, 'enemy', 'red', 3))
    const beforeNoiseVision = game.getSnapshot().vision.visibleCells
    step(game, 0.1)
    snapshot = game.getSnapshot()
    expect(snapshot.deployables.alerts).toContainEqual(expect.objectContaining({ kind: 'noise', side: 'player', col: QA_CELLS.noisePad.x, row: QA_CELLS.noisePad.y }))
    expect(snapshot.enemies.some((enemy) => enemy.id === 'qa-noise-target')).toBe(false)
    expect(snapshot.vision.visibleCells).toEqual(beforeNoiseVision)

    internals.deployables.push({ id: 'qa-tripwire', kind: 'tripwire', col: QA_CELLS.tripwirePad.x, row: QA_CELLS.tripwirePad.y, owner: 'player' })
    const friendly = makeTankAt('qa-wire-friendly', QA_CELLS.tripwirePad, 'player', 'blue', 3)
    internals.enemies.push(friendly)
    step(game, 0.1)
    expect(internals.deployables.some((deployable) => deployable.id === 'qa-tripwire')).toBe(true)
    internals.enemies = internals.enemies.filter((tank) => tank.id !== 'qa-wire-friendly')
    internals.enemies.push(makeTankAt('qa-wire-target', QA_CELLS.tripwirePad, 'enemy', 'red', 3))
    step(game, 0.1)
    expect(internals.deployables.some((deployable) => deployable.id === 'qa-tripwire')).toBe(false)
    expect(game.getSnapshot().deployables.alerts).toContainEqual(expect.objectContaining({ kind: 'tripwire', col: QA_CELLS.tripwirePad.x, row: QA_CELLS.tripwirePad.y }))

    internals.deployables.push({ id: 'qa-steel', kind: 'steel', col: QA_CELLS.steelPad.x, row: QA_CELLS.steelPad.y, owner: 'player' })
    step(game, 0.1)
    expect(internals.player.immobilized).toBeGreaterThan(4.8)
    expect(internals.deployables.some((deployable) => deployable.id === 'qa-steel')).toBe(false)
    expect(game.getSnapshot().deployables.alerts.some((alert) => alert.kind === 'steel')).toBe(false)
    expect(Object.values(internals.visionMemory.enemy)).toContainEqual(expect.objectContaining({ alert: true, source: 'steel', col: QA_CELLS.steelPad.x, row: QA_CELLS.steelPad.y }))
  })

  it('keeps AI vision symmetric while preserving investigate alerts and objective fallback', () => {
    const game = startQaGame(createQaScenario('team', noSpawnOverrides()), true)
    const internals = getGameInternals(game)
    const friendly = internals.enemies.find((tank) => tank.side === 'player')
    if (!friendly) throw new Error('QA team scenario should spawn a friendly bot')

    const hiddenHostile = makeTankAt('qa-ai-hidden', QA_CELLS.friendlyVisionProbe, 'enemy', 'red', 3)
    internals.enemies.push(hiddenHostile)
    expect(internals.getAiShotTargetCell(friendly)).toBeNull()

    internals.deployables.push({ id: 'qa-ai-noise', kind: 'noise', col: QA_CELLS.noisePad.x, row: QA_CELLS.noisePad.y, owner: 'player' })
    hiddenHostile.col = QA_CELLS.noiseTrigger.x
    hiddenHostile.row = QA_CELLS.noiseTrigger.y
    setTankCell(hiddenHostile, QA_CELLS.noiseTrigger)
    step(game, 0.1)
    expect(internals.getAiTargetCell(friendly)).toEqual({ x: QA_CELLS.noisePad.x, y: QA_CELLS.noisePad.y })
    expect(internals.getAiShotTargetCell(friendly)).toBeNull()

    hiddenHostile.col = QA_CELLS.friendlyVisionProbe.x
    hiddenHostile.row = QA_CELLS.friendlyVisionProbe.y
    setTankCell(hiddenHostile, QA_CELLS.friendlyVisionProbe)
    step(game, 3.7)
    setTankCell(friendly, QA_CELLS.friendlySpawn)
    setTankCell(hiddenHostile, QA_CELLS.friendlyVisionProbe)
    expect(game.getSnapshot().fog.teamVisionMerged).toBe(true)
    expect(internals.getAiShotTargetCell(friendly)).toEqual({ x: QA_CELLS.friendlyVisionProbe.x, y: QA_CELLS.friendlyVisionProbe.y })

    const defense = startQaGame(createQaScenario('defense', noSpawnOverrides()), true)
    const defenseInternals = getGameInternals(defense)
    const baseAttacker = makeTankAt('qa-base-attacker', QA_CELLS.enemySpawnNear, 'enemy', 'red', 3)
    baseAttacker.role = 'base_attacker'
    defenseInternals.enemies.push(baseAttacker)
    expect(defenseInternals.getAiTargetCell(baseAttacker)).toEqual({ x: QA_CELLS.base.x, y: QA_CELLS.base.y })
  })

  it('executes bot decisions through fog-aware fire control and useful breaker plans', () => {
    const hiddenGame = startQaGame(createQaScenario('team', noSpawnOverrides()), true)
    const hiddenInternals = getGameInternals(hiddenGame)
    const hiddenHunter = makeTankAt('qa-hidden-hunter', QA_CELLS.enemySpawnNear, 'enemy', 'red', 3)
    hiddenHunter.role = 'hunter'
    hiddenInternals.enemies.push(hiddenHunter)
    setTankCell(hiddenInternals.player, QA_CELLS.playerSpawn)
    hiddenInternals.runEnemyDecision(hiddenHunter)
    expect(hiddenInternals.bullets).toHaveLength(0)

    const visibleGame = startQaGame(createQaScenario('defense', noSpawnOverrides()), true)
    const visibleInternals = getGameInternals(visibleGame)
    const visibleHunter = makeTankAt('qa-visible-hunter', { x: QA_CELLS.playerSpawn.x, y: QA_CELLS.playerSpawn.y - 2 }, 'enemy', 'red', 3)
    visibleHunter.role = 'hunter'
    visibleInternals.enemies.push(visibleHunter)
    setTankCell(visibleInternals.player, QA_CELLS.playerSpawn)
    visibleInternals.runEnemyDecision(visibleHunter)
    expect(visibleInternals.bullets).toContainEqual(expect.objectContaining({ ownerId: 'qa-visible-hunter', side: 'enemy', dir: 'down' }))

    const breakerGame = startQaGame(createQaScenario('defense', noSpawnOverrides()), true)
    const breakerInternals = getGameInternals(breakerGame)
    const breaker = makeTankAt('qa-breaker', { x: QA_CELLS.hiddenWall.x - 1, y: QA_CELLS.hiddenWall.y }, 'enemy', 'red', 3)
    breaker.role = 'wall_breaker'
    breakerInternals.enemies.push(breaker)
    breakerInternals.runEnemyDecision(breaker)
    expect(breakerInternals.bullets).toContainEqual(expect.objectContaining({ ownerId: 'qa-breaker', side: 'enemy', dir: 'right' }))
    expect(breakerInternals.bullets.at(-1)).toMatchObject({ damage: 1 })
    expect(breakerInternals.player.hp).toBe(breakerInternals.player.maxHp)
  })

  it('restores QA run state across continue and gives old saves safe defaults', () => {
    const level = createQaScenario('defense', noSpawnOverrides())
    const store = new MemorySaveStore()
    const game = startQaGame(level, false, store)
    const internals = getGameInternals(game)
    internals.playerShells = 4
    internals.playerShellRechargeProgress = 1.25
    internals.deployables.push({ id: 'qa-saved-decoy', kind: 'decoy', col: QA_CELLS.decoyEcho.x, row: QA_CELLS.decoyEcho.y, owner: 'player' })
    internals.retranslators[0].owner = 'player'
    internals.retranslators[0].progress = 1
    internals.enemies.push(makeTankAt('qa-saved-slow', QA_CELLS.mineTrigger, 'enemy', 'red', 3))
    internals.enemies[0].slow = 8
    internals.enemies[0].immobilized = 3
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    let snapshot = reloaded.getSnapshot()
    expect(snapshot.player.shells).toBe(4)
    expect(getGameInternals(reloaded).playerShellRechargeProgress).toBeCloseTo(1.25, 1)
    expect(snapshot.deployables.active).toContainEqual(expect.objectContaining({ kind: 'decoy', col: QA_CELLS.decoyEcho.x, row: QA_CELLS.decoyEcho.y }))
    expect(snapshot.fog.ownedRetranslatorCount).toBe(1)
    expect(getGameInternals(reloaded).enemies.find((tank) => tank.id === 'qa-saved-slow')).toMatchObject({ slow: expect.any(Number), immobilized: expect.any(Number) })

    const oldSave = store.load()
    if (!oldSave?.resumableRun) throw new Error('QA save should contain a resumable run')
    delete (oldSave.resumableRun as Partial<SavedRun>).playerShells
    delete (oldSave.resumableRun as Partial<SavedRun>).playerShellCapacity
    delete (oldSave.resumableRun as Partial<SavedRun>).playerShellRechargeProgress
    delete (oldSave.resumableRun as Partial<SavedRun>).portableRelay
    delete (oldSave.resumableRun as Partial<SavedRun>).deployables
    delete (oldSave.resumableRun as Partial<SavedRun>).deployableAlerts
    delete (oldSave.resumableRun as Partial<SavedRun>).retranslators
    delete (oldSave.resumableRun as Partial<SavedRun>).visionMemory

    const oldReloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore(oldSave) })
    expect(oldReloaded.continueSavedRun()).toBe(true)
    snapshot = oldReloaded.getSnapshot()
    expect(snapshot.player).toMatchObject({ shells: 10, shellCapacity: 10 })
    expect(snapshot.portableRelay).toMatchObject({ available: true, deployed: false, status: 'ready' })
    expect(snapshot.deployables).toMatchObject({ active: [], hold: null, alerts: [] })
    expect(getGameInternals(oldReloaded).retranslators).toHaveLength(level.retranslators?.length ?? 0)
    expect(getGameInternals(oldReloaded).retranslators.every((relay) => relay.owner === null && relay.progress === 0)).toBe(true)
    expect(Object.values(getGameInternals(oldReloaded).visionMemory.player)).toHaveLength(0)
  })

  it('provides valid objective presets over the same hidden arena', () => {
    expect(createQaScenario('defense').objective.mode).toBe('defense')
    expect(createQaScenario('team').objective).toMatchObject({ mode: 'team-battle', friendlyTotal: 1 })
    expect(createQaScenario('assault').objective.assault?.cell).toEqual(QA_CELLS.assaultCore)
    expect(createQaScenario('ctf').objective.flag?.playerBase).toEqual(QA_CELLS.ctfHome)
    expect(createQaScenario('ffa').objective).toMatchObject({ mode: 'ffa', targetScore: 1 })
  })
})

function startQaGame(level: LevelDefinition, aiEnabled: boolean, saveStore = new MemorySaveStore()) {
  const game = new TanchikiGame({ aiEnabled, levelDefinitions: [level], saveStore, seed: 42 })
  game.startGame(QA_INTEGRATION_LEVEL_ID)
  return game
}

function noSpawnOverrides(): Partial<LevelDefinition> {
  return { enemyTotal: 1, activeEnemyLimit: 0, enemySpawns: [] }
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function holdButton(game: TanchikiGame, button: keyof InputState, seconds: number) {
  game.setInput({ [button]: true } as Partial<InputState>)
  step(game, seconds)
}

function releaseButton(game: TanchikiGame, button: keyof InputState) {
  game.setInput({ [button]: false } as Partial<InputState>)
  step(game, 0.05)
}

function getGameInternals(game: TanchikiGame) {
  return game as unknown as {
    bullets: Bullet[]
    deployableAlerts: Array<{ id: string; kind: 'noise' | 'steel' | 'tripwire'; side: CombatSide; team: Team; col: number; row: number; age: number; ttl: number; strength: number }>
    deployables: Array<{ id: string; kind: OfflineDeployableKind; col: number; row: number; owner: CombatSide; safeTankId?: string }>
    enemies: Tank[]
    player: Tank
    playerShells: number
    playerShellCapacity: number
    playerShellRechargeProgress: number
    retranslators: OfflineRetranslator[]
    visionMemory: Record<CombatSide, Record<string, OfflineVisionMemory>>
    getAiTargetCell: (tank: Tank) => Vec
    getAiShotTargetCell: (tank: Tank) => Vec | null
    runEnemyDecision: (tank: Tank) => 'moved' | 'acted' | 'idle'
  }
}

function makeTankAt(id: string, cell: Vec, side: CombatSide = 'enemy', team: Team = side === 'player' ? 'blue' : 'red', hp = 3): Tank {
  const position = gridToTankPosition(cell.x, cell.y)
  return {
    id,
    faction: 'enemy',
    side,
    team,
    role: 'hunter',
    col: cell.x,
    row: cell.y,
    x: position.x,
    y: position.y,
    dir: side === 'player' ? 'up' : 'down',
    hp,
    maxHp: hp,
    speed: 0,
    reload: 0,
    reloadTime: 1.35,
    aiCooldown: 0,
    turnCooldown: 0,
    spawnGrace: 0,
    scoreValue: 100,
    shield: 0,
    rapid: 0,
    repairCharges: 0,
    slow: 0,
    immobilized: 0,
    move: null,
    path: [],
  }
}

function setTankCell(tank: Tank, cell: Vec) {
  const position = gridToTankPosition(cell.x, cell.y)
  tank.col = cell.x
  tank.row = cell.y
  tank.x = position.x
  tank.y = position.y
  tank.move = null
}

function passThroughBullet(id: string, cell: Vec): Bullet {
  const position = gridToTankPosition(cell.x, cell.y)
  return {
    id,
    owner: 'player',
    ownerId: 'player',
    side: 'player',
    team: 'blue',
    x: position.x + TANK_SIZE / 2,
    y: position.y + TANK_SIZE / 2,
    dir: 'up',
    speed: 0,
    damage: 1,
    ttl: 1,
  }
}

function sameCell(value: { col: number; row: number }, cell: Vec) {
  return value.col === cell.x && value.row === cell.y
}

function cellAsVisible(cell: Vec) {
  return { col: cell.x, row: cell.y }
}
