import { describe, expect, it } from 'vitest'
import { BULLET_SIZE, gridToTankPosition, TANK_SIZE } from './constants.ts'
import {
  FIELD_SALVAGE_CONFIG,
  getFieldSalvageDecayRemaining,
  getFieldSalvageWreckPhase,
} from './fieldSalvage.ts'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore } from './save.ts'
import {
  FIELD_SALVAGE_TEST_LEVEL,
  FIELD_SALVAGE_TEST_LEVEL_ID,
} from './testing/qaIntegrationLevel.ts'
import type { Bullet, Direction, FieldSalvageWreck, PowerUp, Tank, Vec } from './types.ts'

describe('field salvage', () => {
  it('uses a 20 second recovery window followed by 9 seconds of blocking burnout', () => {
    expect(getFieldSalvageWreckPhase(0)).toBe('salvageable')
    expect(getFieldSalvageWreckPhase(19.99)).toBe('salvageable')
    expect(getFieldSalvageWreckPhase(20)).toBe('burned')
    expect(getFieldSalvageDecayRemaining(20)).toBe(9)
    expect(getFieldSalvageDecayRemaining(29)).toBe(0)
  })

  it('turns a destroyed tank into neutral blocking salvage instead of a random pickup', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    const target = requireEnemy(internals)

    internals.destroyEnemy(target, playerBulletAt(target))

    expect(internals.powerUps).toHaveLength(0)
    expect(internals.wrecks).toHaveLength(1)
    expect(internals.wrecks[0]).toMatchObject({
      phase: 'salvageable',
      sourceSide: 'enemy',
      sourceTeam: 'red',
      shellsAvailable: FIELD_SALVAGE_CONFIG.shellCapacity,
      repairsAvailable: FIELD_SALVAGE_CONFIG.repairCapacity,
    })
    expect(internals.wrecks[0]).not.toMatchObject(FIELD_SALVAGE_TEST_LEVEL.enemySpawns[0])

    const wreck = internals.wrecks[0]
    setTankCell(internals.player, { x: wreck.col, y: wreck.row + 1 })
    expect(internals.startMove(internals.player, 'up')).toBe(false)
    expect(internals.player.move).toBeNull()
  })

  it('leaves the player wreck behind for the opposing side after a reckless death', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    internals.repairCharges = 0
    internals.player.spawnGrace = 0
    internals.player.hp = 1
    setTankCell(internals.player, { x: 8, y: 8 })

    internals.damagePlayer(1)

    expect(game.getSnapshot().lives).toBe(2)
    expect(internals.wrecks).toContainEqual(expect.objectContaining({
      col: 8,
      row: 8,
      sourceSide: 'player',
      sourceTeam: 'blue',
      shellsAvailable: FIELD_SALVAGE_CONFIG.shellCapacity,
      repairsAvailable: FIELD_SALVAGE_CONFIG.repairCapacity,
    }))
    expect(internals.player).toMatchObject({ col: 4, row: 14, hp: 3 })
  })

  it('slowly recovers shells and one HP while the player holds beside a wreck', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    internals.destroyEnemy(requireEnemy(internals), playerBulletAt(requireEnemy(internals)))
    const wreck = internals.wrecks[0]

    internals.playerShells = 5
    internals.playerShellRechargeProgress = 1.8
    internals.player.hp = internals.player.maxHp - 1
    setTankCell(internals.player, { x: wreck.col, y: wreck.row + 1 })

    step(game, 2)
    expect(game.getSnapshot().player.salvage).toMatchObject({
      active: true,
      wreckId: wreck.id,
      shellsAvailable: 4,
      repairsAvailable: 1,
    })
    expect(game.getSnapshot().player.salvage.shellProgress).toBeGreaterThan(0.5)

    step(game, 1.6)
    expect(game.getSnapshot().player.shells).toBe(6)
    expect(internals.playerShellRechargeProgress).toBe(0)
    expect(game.getSnapshot().runStats).toMatchObject({
      wrecksSalvaged: 1,
      wreckShellsRecovered: 1,
      wreckHpRecovered: 0,
    })

    step(game, 2.6)
    expect(game.getSnapshot().player.hp).toBe(internals.player.maxHp)
    expect(game.getSnapshot().runStats.wreckHpRecovered).toBe(1)
  })

  it('resets partial recovery when the tank moves, fires, or takes damage', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    const target = requireEnemy(internals)
    internals.destroyEnemy(target, playerBulletAt(target))
    const wreck = internals.wrecks[0]
    internals.playerShells = 4
    internals.player.hp = internals.player.maxHp - 2
    setTankCell(internals.player, { x: wreck.col, y: wreck.row + 1 })

    step(game, 2)
    expect(wreck.shellProgress).toBeGreaterThan(1.9)
    expect(internals.startMove(internals.player, 'down')).toBe(true)
    expect(wreck.shellProgress).toBe(0)
    expect(wreck.repairProgress).toBe(0)

    step(game, 1)
    setTankCell(internals.player, { x: wreck.col, y: wreck.row + 1 })
    step(game, 1)
    internals.player.reload = 0
    internals.fire(internals.player)
    expect(wreck.shellProgress).toBe(0)
    expect(wreck.repairProgress).toBe(0)

    internals.player.reload = 0
    step(game, 1)
    internals.damagePlayer(1)
    expect(wreck.shellProgress).toBe(0)
    expect(wreck.repairProgress).toBe(0)
  })

  it('lets another side salvage the wreck and keeps fixed ammo stations authoritative', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    const target = requireEnemy(internals)
    internals.destroyEnemy(target, playerBulletAt(target))
    const wreck = internals.wrecks[0]
    const salvager = makeFiniteAmmoTank('enemy-salvager', { x: wreck.col, y: wreck.row + 1 })
    internals.enemies = [salvager]
    setTankCell(internals.player, { x: 1, y: 1 })

    step(game, FIELD_SALVAGE_CONFIG.repairSeconds + 0.1)
    expect(salvager).toMatchObject({ hp: 3, shells: 1 })
    expect(wreck).toMatchObject({ shellsAvailable: 3, repairsAvailable: 0, salvagingTankId: salvager.id })

    setTankCell(salvager, { x: 5, y: 15 })
    const stationWreck = wreckAt({ x: 5, y: 14 }, 'station-wreck')
    internals.wrecks = [stationWreck]
    salvager.shells = 0
    step(game, FIELD_SALVAGE_CONFIG.shellSeconds + 0.1)
    expect(stationWreck.shellsAvailable).toBe(FIELD_SALVAGE_CONFIG.shellCapacity)
    expect(stationWreck.salvagingTankId).toBeNull()
  })

  it('lets a damaged finite-ammo bot route toward nearby salvage', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    const bot = makeFiniteAmmoTank('seeking-bot', { x: 8, y: 11 })
    internals.enemies = [bot]
    internals.wrecks = [wreckAt({ x: 8, y: 8 }, 'seeking-wreck')]
    setTankCell(internals.player, { x: 1, y: 1 })

    expect(internals.trySeekFieldSalvage(bot)).toBe('moved')
    expect(bot.move).toMatchObject({ toCol: 8, toRow: 10 })

    setTankCell(bot, { x: 8, y: 9 })
    expect(internals.trySeekFieldSalvage(bot)).toBe('idle')
  })

  it('allows each tank to work only one adjacent wreck at a time', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    internals.enemies = []
    internals.playerShells = 0
    setTankCell(internals.player, { x: 4, y: 11 })
    internals.wrecks = [
      wreckAt({ x: 4, y: 10 }, 'north-wreck'),
      wreckAt({ x: 5, y: 11 }, 'east-wreck'),
    ]

    step(game, FIELD_SALVAGE_CONFIG.shellSeconds + 0.1)

    expect(internals.playerShells).toBe(1)
    expect(internals.wrecks.map((wreck) => wreck.shellsAvailable).sort()).toEqual([3, 4])
    expect(internals.wrecks.filter((wreck) => wreck.salvagingTankId === internals.player.id)).toHaveLength(1)
  })

  it('burns out, remains blocking, then disappears, while direct fire can deny it early', () => {
    const game = startSalvageGame()
    const internals = getInternals(game)
    const target = requireEnemy(internals)
    internals.destroyEnemy(target, playerBulletAt(target))
    const wreck = internals.wrecks[0]
    wreck.age = FIELD_SALVAGE_CONFIG.salvageableSeconds - 0.05

    step(game, 0.1)
    expect(game.getSnapshot().wrecks[0]).toMatchObject({
      phase: 'burned',
      shellsAvailable: 0,
      repairsAvailable: 0,
    })
    setTankCell(internals.player, { x: wreck.col, y: wreck.row + 1 })
    expect(internals.startMove(internals.player, 'up')).toBe(false)

    step(game, FIELD_SALVAGE_CONFIG.burnedSeconds + 0.05)
    expect(game.getSnapshot().wrecks).toHaveLength(0)

    const second = makeFiniteAmmoTank('second-target', { x: 8, y: 8 })
    internals.enemies = [second]
    internals.createFieldSalvageWreck(second)
    const denied = internals.wrecks[0]
    const scoreBefore = game.getSnapshot().score
    expect(internals.hitWreckWithBullet(playerBulletAtWreck(denied))).toBe(true)
    expect(game.getSnapshot().wrecks).toHaveLength(0)
    expect(game.getSnapshot().score).toBe(scoreBefore)
    expect(game.getSnapshot().runStats.wrecksCleared).toBe(1)
  })

  it('persists active wrecks, normalizes old saves, and caps crowded battlefields at eight', () => {
    const store = new MemorySaveStore()
    const game = startSalvageGame(store)
    const internals = getInternals(game)
    const target = requireEnemy(internals)
    internals.destroyEnemy(target, playerBulletAt(target))
    internals.wrecks[0].age = 4.25
    game.saveAndQuit()

    const reloaded = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [FIELD_SALVAGE_TEST_LEVEL],
      saveStore: store,
    })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().wrecks[0]).toMatchObject({ age: 4.25, phase: 'salvageable' })

    const oldSave = store.load()
    if (!oldSave?.resumableRun) throw new Error('Expected a resumable Field Salvage run')
    delete oldSave.resumableRun.wrecks
    const oldReloaded = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [FIELD_SALVAGE_TEST_LEVEL],
      saveStore: new MemorySaveStore(oldSave),
    })
    expect(oldReloaded.continueSavedRun()).toBe(true)
    expect(oldReloaded.getSnapshot().wrecks).toEqual([])

    const crowded = getInternals(reloaded)
    for (let index = 0; index < 10; index += 1) {
      crowded.wrecks.push(wreckAt({ x: 2 + index, y: 8 }, `crowded-${index}`, index))
    }
    crowded.trimFieldSalvageWrecks()
    expect(crowded.wrecks).toHaveLength(FIELD_SALVAGE_CONFIG.activeWreckCap)
  })
})

function startSalvageGame(saveStore = new MemorySaveStore()) {
  const game = new TanchikiGame({
    aiEnabled: false,
    levelDefinitions: [FIELD_SALVAGE_TEST_LEVEL],
    saveStore,
    seed: 73,
  })
  game.startGame(FIELD_SALVAGE_TEST_LEVEL_ID)
  return game
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function getInternals(game: TanchikiGame) {
  return game as unknown as {
    enemies: Tank[]
    player: Tank
    playerShells: number
    playerShellRechargeProgress: number
    repairCharges: number
    powerUps: PowerUp[]
    wrecks: FieldSalvageWreck[]
    destroyEnemy: (tank: Tank, bullet?: Bullet) => void
    createFieldSalvageWreck: (tank: Tank) => void
    trimFieldSalvageWrecks: () => void
    startMove: (tank: Tank, direction: Direction) => boolean
    fire: (tank: Tank) => void
    damagePlayer: (damage: number) => void
    hitWreckWithBullet: (bullet: Bullet) => boolean
    trySeekFieldSalvage: (tank: Tank) => 'moved' | 'acted' | 'idle' | null
  }
}

function requireEnemy(internals: ReturnType<typeof getInternals>) {
  const enemy = internals.enemies[0]
  if (!enemy) throw new Error('Expected the Field Salvage target to spawn')
  return enemy
}

function setTankCell(tank: Tank, cell: Vec) {
  const position = gridToTankPosition(cell.x, cell.y)
  tank.col = cell.x
  tank.row = cell.y
  tank.x = position.x
  tank.y = position.y
  tank.move = null
}

function makeFiniteAmmoTank(id: string, cell: Vec): Tank {
  const position = gridToTankPosition(cell.x, cell.y)
  return {
    id,
    faction: 'enemy',
    classId: 'engineer',
    side: 'enemy',
    team: 'red',
    role: 'hunter',
    col: cell.x,
    row: cell.y,
    x: position.x,
    y: position.y,
    dir: 'down',
    hp: 2,
    maxHp: 3,
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
    bulwarkRemaining: 0,
    bulwarkCapacity: 0,
    bulwarkCooldown: 0,
    traverseRemaining: 0,
    traverseCooldown: 0,
    immobilized: 0,
    move: null,
    path: [],
    shells: 0,
    shellCapacity: 2,
    shellRechargeProgress: 0,
  }
}

function playerBulletAt(tank: Tank): Bullet {
  return {
    id: `test-hit-${tank.id}`,
    owner: 'player',
    ownerId: 'player',
    classId: 'battle',
    side: 'player',
    team: 'blue',
    x: tank.x + TANK_SIZE / 2 - BULLET_SIZE / 2,
    y: tank.y + TANK_SIZE / 2 - BULLET_SIZE / 2,
    dir: 'up',
    speed: 0,
    damage: 3,
    ttl: 1,
  }
}

function playerBulletAtWreck(wreck: FieldSalvageWreck): Bullet {
  return {
    id: `test-wreck-hit-${wreck.id}`,
    owner: 'player',
    ownerId: 'player',
    classId: 'battle',
    side: 'player',
    team: 'blue',
    x: wreck.x + TANK_SIZE / 2 - BULLET_SIZE / 2,
    y: wreck.y + TANK_SIZE / 2 - BULLET_SIZE / 2,
    dir: 'up',
    speed: 0,
    damage: 3,
    ttl: 1,
  }
}

function wreckAt(cell: Vec, id: string, age = 0): FieldSalvageWreck {
  const position = gridToTankPosition(cell.x, cell.y)
  return {
    id,
    col: cell.x,
    row: cell.y,
    x: position.x,
    y: position.y,
    dir: 'up',
    classId: 'battle',
    sourceTeam: 'red',
    sourceSide: 'enemy',
    phase: getFieldSalvageWreckPhase(age),
    age,
    shellsAvailable: FIELD_SALVAGE_CONFIG.shellCapacity,
    repairsAvailable: FIELD_SALVAGE_CONFIG.repairCapacity,
    salvagingTankId: null,
    shellProgress: 0,
    repairProgress: 0,
    playerSalvaged: false,
  }
}
