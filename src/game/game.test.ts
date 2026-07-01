import { describe, expect, it } from 'vitest'
import { BASE_MAX_HP, CAMPAIGN_LEVELS, DEFAULT_OBJECTIVE, createTiles, getWaterNeighbors } from './level.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import { TanchikiGame } from './game.ts'
import type { Bullet, LevelDefinition, PowerUp, RewardLedger, RunStats, SavedObjectiveState, SavedRun } from './types.ts'

const EMPTY_LEVEL = [
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '......E......',
]

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)

  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function pressMenu(game: TanchikiGame) {
  game.primaryAction()
  step(game, 0.14)
}

function expectPassableSpawn(source: { getTile: (col: number, row: number) => { kind: string } | undefined }, col: number, row: number) {
  const tile = source.getTile(col, row)
  expect(tile?.kind === 'empty' || tile?.kind === 'trees').toBe(true)
}

function expectEscapableSpawn(source: { getTile: (col: number, row: number) => { kind: string } | undefined }, col: number, row: number) {
  expectPassableSpawn(source, col, row)
  const neighbors = [
    { col, row: row - 1 },
    { col: col + 1, row },
    { col, row: row + 1 },
    { col: col - 1, row },
  ]

  expect(neighbors.some((cell) => {
    const tile = source.getTile(cell.col, cell.row)
    return tile?.kind === 'empty' || tile?.kind === 'trees'
  })).toBe(true)
}

function makeTestLevel(id: number, rewards = { credits: 10 * id, xp: 5 * id, score: 100 * id }): LevelDefinition {
  return {
    id,
    name: `Test ${id}`,
    briefing: `Test briefing ${id}`,
    objective: DEFAULT_OBJECTIVE,
    rows: EMPTY_LEVEL,
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: [{ x: 0, y: 0 }],
    enemyTotal: 0,
    activeEnemyLimit: 1,
    spawnInterval: 2,
    roleWeights: { base_attacker: 0.5, hunter: 0.3, wall_breaker: 0.2 },
    armoredEnemyRatio: 0.2,
    rewards,
  }
}

function emptyRewards(): RewardLedger {
  return {
    killScore: 0,
    killCredits: 0,
    killXp: 0,
    pickupScore: 0,
    objectiveScore: 0,
    missionScore: 0,
    missionCredits: 0,
    missionXp: 0,
    tacticalCredits: 0,
    tacticalXp: 0,
    totalScore: 0,
    totalCredits: 0,
    totalXp: 0,
  }
}

function emptyRunStats(): RunStats {
  return {
    duration: 0,
    shotsFired: 0,
    tankHits: 0,
    bricksDestroyed: 0,
    playerKills: 0,
    armoredKills: 0,
    livesLost: 0,
    repairKitUses: 0,
    baseDamageTaken: 0,
    criticalCoverDestroyed: 0,
    objectiveRelevantPowerUps: 0,
    friendlyTotal: 0,
    friendlySurvivors: 0,
    powerUps: { repair: 0, rapid: 0, shield: 0 },
    ctfCaptures: 0,
    assaultDamage: 0,
    rewards: emptyRewards(),
  }
}

function objectiveStateFor(level: LevelDefinition): SavedObjectiveState {
  const objective = level.objective
  return {
    mode: objective.mode,
    label: objective.label,
    winCondition: objective.winCondition,
    playerScore: 0,
    enemyScore: 0,
    neutralScore: 0,
    targetScore: objective.targetScore ?? objective.flag?.capturesToWin ?? 0,
    flag: objective.flag
      ? {
          playerBase: { ...objective.flag.playerBase },
          enemyHome: { ...objective.flag.enemyFlag },
          position: { ...objective.flag.enemyFlag },
          carrierId: null,
          captures: 0,
          capturesToWin: objective.flag.capturesToWin,
        }
      : null,
    assault: objective.assault
      ? {
          cell: { ...objective.assault.cell },
          hp: objective.assault.hp,
          maxHp: objective.assault.hp,
        }
      : null,
  }
}

function savedRunWithBullets(level: LevelDefinition, bullets: Bullet[]): SavedRun {
  return {
    currentLevel: level.id,
    score: 0,
    lives: 3,
    baseHp: BASE_MAX_HP,
    enemiesRemaining: level.enemyTotal,
    spawnCursor: 0,
    spawnTimer: 99,
    nextId: 10,
    time: 0,
    tiles: createTiles(level.rows),
    player: {
      id: 'player',
      faction: 'player',
      side: 'player',
      team: 'blue',
      role: null,
      col: level.playerSpawn.x,
      row: level.playerSpawn.y,
      dir: 'up',
      hp: 3,
      maxHp: 3,
      reload: 0,
      reloadTime: 0.42,
      aiCooldown: 0,
      turnCooldown: 0,
      spawnGrace: 0,
      scoreValue: 0,
      shield: 0,
      rapid: 0,
      repairCharges: 0,
    },
    enemies: [],
    bullets,
    powerUps: [],
    repairCharges: 0,
    objective: objectiveStateFor(level),
    runStats: emptyRunStats(),
  }
}

function enemyBaseHitBullet(id: string): Bullet {
  return {
    id,
    owner: 'enemy',
    ownerId: 'enemy-test',
    side: 'enemy',
    team: 'red',
    x: 6 * 32 + 13,
    y: 16 + 12 * 32 + 1,
    dir: 'down',
    speed: 175,
    damage: 1,
    ttl: 2.4,
  }
}

describe('TanchikiGame real-game upgrade', () => {
  it('moves the player exactly one 32px tile at a time', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.03)
    game.setInput({ right: false })

    let snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 11, moving: true })

    step(game, 0.25)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 11, moving: true })
    expect(snapshot.player.x).toBeGreaterThan(131)
    expect(snapshot.player.x).toBeLessThan(163)

    step(game, 0.1)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 5, row: 11, moving: false })
    expect(snapshot.player.x).toBe(163)
  })

  it('turns on blocked movement without drifting into a wall', () => {
    const blockedLevel = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.....B.......',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: blockedLevel,
      playerSpawn: { x: 4, y: 10 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.45)

    const snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 10, dir: 'right', moving: false })
    expect(snapshot.player.x).toBe(131)
  })

  it('relocates a player spawn that is configured on blocked terrain', () => {
    const blockedSpawnLevel = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '....B........',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: blockedSpawnLevel,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.player).not.toMatchObject({ col: 4, row: 11 })
    expectPassableSpawn(game, snapshot.player.col, snapshot.player.row)
  })

  it('relocates a player spawn that is passable but has no exit', () => {
    const trappedSpawnLevel = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '....B........',
      '...B.B.......',
      '....B.E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: trappedSpawnLevel,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.player).not.toMatchObject({ col: 4, row: 11 })
    expectEscapableSpawn(game, snapshot.player.col, snapshot.player.row)
  })

  it('relocates a blocked enemy spawn and only decrements the wave when placed', () => {
    const blockedEnemySpawnLevel = [
      'B............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: blockedEnemySpawnLevel,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.enemies).toHaveLength(1)
    expect(snapshot.enemies[0]).not.toMatchObject({ col: 0, row: 0 })
    expectPassableSpawn(game, snapshot.enemies[0].col, snapshot.enemies[0].row)
    expect(snapshot.enemiesRemaining).toBe(0)
  })

  it('relocates an enemy spawn that is passable but has no exit', () => {
    const trappedEnemySpawnLevel = [
      '.B...........',
      'B............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: trappedEnemySpawnLevel,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.enemies).toHaveLength(1)
    expect(snapshot.enemies[0]).not.toMatchObject({ col: 0, row: 0 })
    expectEscapableSpawn(game, snapshot.enemies[0].col, snapshot.enemies[0].row)
    expect(snapshot.enemiesRemaining).toBe(0)
  })

  it('gives the base three HP and survives the first hit', () => {
    const defenseLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 6, y: 11 },
      enemyTotal: 1,
    }
    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(defenseLevel, [enemyBaseHitBullet('base-hit-1')])
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(saveData) })

    expect(game.continueSavedRun()).toBe(true)
    expect(game.getSnapshot()).toMatchObject({ baseHp: BASE_MAX_HP, baseMaxHp: BASE_MAX_HP })

    step(game, 0.2)

    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.baseHp).toBe(BASE_MAX_HP - 1)
    expect(game.getTile(6, 12)?.hp).toBe(BASE_MAX_HP - 1)

    ;(game as unknown as { bullets: Bullet[] }).bullets = [enemyBaseHitBullet('base-hit-2')]
    step(game, 0.2)
    ;(game as unknown as { bullets: Bullet[] }).bullets = [enemyBaseHitBullet('base-hit-3')]
    step(game, 0.2)

    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('lost')
    expect(snapshot.baseHp).toBe(0)
  })

  it('preserves damaged base HP through save and continue', () => {
    const store = new MemorySaveStore()
    const defenseLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 6, y: 11 },
      enemyTotal: 1,
    }
    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(defenseLevel, [enemyBaseHitBullet('base-save-hit')])
    store.save(saveData)
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: store })

    expect(game.continueSavedRun()).toBe(true)
    step(game, 0.2)
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: store })

    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot()).toMatchObject({ baseHp: BASE_MAX_HP - 1, baseMaxHp: BASE_MAX_HP })
    expect(reloaded.getTile(6, 12)?.hp).toBe(BASE_MAX_HP - 1)
  })

  it('uses grid-aware enemy AI to route toward objectives', () => {
    const mazeLevel = [
      '.............',
      '.....S.......',
      '.....S.......',
      '.....S.......',
      '.....S.......',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: mazeLevel,
      playerSpawn: { x: 12, y: 11 },
      saveStore: new MemorySaveStore(),
      seed: 2,
    })

    game.startGame()
    const before = game.getSnapshot().enemies[0]
    step(game, 1.2)
    const after = game.getSnapshot().enemies[0]

    expect(after).toBeDefined()
    expect(after.col + after.row).toBeGreaterThan(before.col + before.row)
  })

  it('persists selected team and flips the opposing team', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ saveStore: store })

    game.setTeam('red')

    const reloaded = new TanchikiGame({ saveStore: store })
    const snapshot = reloaded.getSnapshot()
    expect(snapshot.team).toEqual({ player: 'red', enemy: 'blue' })
    expect(snapshot.progression.selectedTeam).toBe('red')
  })

  it('migrates old unlocked-stage saves into completed level replay state', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.unlockedStage = 5
    // Simulate an older v1 save without the new completed-level list.
    delete (saveData.progression as Partial<typeof saveData.progression>).completedLevels

    const game = new TanchikiGame({ saveStore: new MemorySaveStore(saveData) })
    const snapshot = game.getSnapshot()

    expect(snapshot.progression.completedLevels).toEqual([1, 2, 3, 4])
    expect(snapshot.objective.selectableLevels).toEqual([1, 2, 3, 4, 5])
  })

  it('buys garage upgrades, persists them, and applies upgraded stats', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.credits = 500
    const store = new MemorySaveStore(saveData)
    const game = new TanchikiGame({
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })

    expect(game.buyUpgrade('armor')).toBe(true)
    expect(game.buyUpgrade('engine')).toBe(true)

    const reloaded = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })
    reloaded.startGame()
    const snapshot = reloaded.getSnapshot()

    expect(snapshot.progression.upgrades).toMatchObject({ armor: 1, engine: 1 })
    expect(snapshot.progression.upgradeStats.maxHp).toBe(4)
    expect(snapshot.progression.upgradeStats.moveDuration).toBe(0.3)
    expect(snapshot.player.hp).toBe(4)
  })

  it('explains selected garage upgrades with current and next effects', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.credits = 175
    saveData.progression.upgrades = { armor: 1, cannon: 2, engine: 0, repairKit: 0 }
    const game = new TanchikiGame({ saveStore: new MemorySaveStore(saveData) })

    game.navigateMenu(1)
    pressMenu(game)

    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('garage')
    expect(snapshot.garage?.selectedUpgrade).toMatchObject({
      kind: 'armor',
      level: 1,
      currentEffect: 'Max HP 4',
      nextEffect: 'Max HP 5',
      canAfford: true,
    })
    expect(snapshot.menu.helper.join(' ')).toContain('Max HP 4')

    game.navigateMenu(1)
    snapshot = game.getSnapshot()
    expect(snapshot.garage?.selectedUpgrade).toMatchObject({
      kind: 'cannon',
      level: 2,
      currentEffect: 'Reload 0.36s  Rapid 0.28s  Damage 1',
      nextEffect: 'Reload 0.33s  Rapid 0.25s  Damage 2',
      canAfford: false,
    })
    expect(snapshot.menu.helper.join(' ')).toContain('Need $75')
  })

  it('applies upgrade-assisted run stats from saved garage progression', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.upgrades = { armor: 2, cannon: 3, engine: 2, repairKit: 1 }
    const game = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(saveData),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.progression.upgradeStats.maxHp).toBe(5)
    expect(snapshot.progression.upgradeStats.reloadTime).toBeCloseTo(0.33)
    expect(snapshot.progression.upgradeStats.bulletDamage).toBe(2)
    expect(snapshot.progression.upgradeStats.moveDuration).toBe(0.28)
    expect(snapshot.player).toMatchObject({ hp: 5, repairCharges: 1 })
  })

  it('uses the calmer offline reload and bullet speed tuning', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.upgrades = { armor: 0, cannon: 5, engine: 5, repairKit: 0 }
    const game = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(saveData),
    })

    game.startGame()
    let snapshot = game.getSnapshot()
    expect(snapshot.progression.upgradeStats.reloadTime).toBeCloseTo(0.27)
    expect(snapshot.progression.upgradeStats.moveDuration).toBe(0.22)

    game.primaryAction()
    snapshot = game.getSnapshot()

    expect(snapshot.bullets).toHaveLength(1)
    expect(snapshot.bullets[0]).toMatchObject({ owner: 'player', speed: 205 })
  })

  it('persists settings and color-safe preference through local save', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ saveStore: store })

    game.navigateMenu(3)
    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('settings')

    pressMenu(game)
    game.navigateMenu(1)
    pressMenu(game)
    game.navigateMenu(1)
    pressMenu(game)

    const reloaded = new TanchikiGame({ saveStore: store })
    const snapshot = reloaded.getSnapshot()
    expect(snapshot.settings.volume).toBe(1)
    expect(snapshot.settings.muted).toBe(true)
    expect(snapshot.settings.colorSafe).toBe(true)
  })

  it('animates menu presses before committing and allows escape to cancel', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    game.navigateMenu(3)
    game.primaryAction()

    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('main-menu')
    expect(snapshot.menu.pressedIndex).toBe(3)

    step(game, 0.06)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('main-menu')
    expect(snapshot.menu.pressProgress).toBeGreaterThan(0)

    game.navigateMenu(1)
    expect(game.getSnapshot().menu.selectedIndex).toBe(3)

    game.back()
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('main-menu')
    expect(snapshot.menu.pressedIndex).toBeNull()

    game.primaryAction()
    step(game, 0.14)
    expect(game.getSnapshot().mode).toBe('settings')
  })

  it('loads after briefing before starting offline gameplay', () => {
    const levels = [{ ...makeTestLevel(1), enemyTotal: 1 }, makeTestLevel(2)]
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore() })

    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('level-select')
    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('briefing')

    game.primaryAction()
    step(game, 0.14)
    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('loading')
    expect(snapshot.loading).toMatchObject({
      duration: 1.2,
      targetLevel: { id: 1, name: 'Test 1' },
    })
    expect(snapshot.loading?.tip).toBeTruthy()
    expect(snapshot.enemies).toHaveLength(0)

    step(game, 0.6)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('loading')
    expect(snapshot.loading?.progress).toBeGreaterThan(0.45)

    game.primaryAction()
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('loading')
    expect(snapshot.loading?.readyToProceed).toBe(false)

    step(game, 0.7)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('loading')
    expect(snapshot.loading).toMatchObject({
      progress: 1,
      readyToProceed: true,
    })
    expect(snapshot.enemies).toHaveLength(0)

    game.primaryAction()
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.loading).toBeNull()
  })

  it('backs out of loading to the briefing instead of trapping the player', () => {
    const levels = [{ ...makeTestLevel(1), enemyTotal: 1 }]
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore() })

    pressMenu(game)
    pressMenu(game)
    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('loading')

    game.back()
    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('briefing')
    expect(snapshot.loading).toBeNull()
    expect(snapshot.level.current).toBe(1)
  })

  it('uses loading for restart but continues saved runs directly', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })

    game.startGame()
    game.togglePause()
    game.navigateMenu(2)
    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('loading')
    step(game, 1.25)
    expect(game.getSnapshot().mode).toBe('loading')
    expect(game.getSnapshot().loading?.readyToProceed).toBe(true)
    game.primaryAction()
    expect(game.getSnapshot().mode).toBe('playing')

    game.togglePause()
    game.saveAndQuit()
    const reloaded = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })

    expect(reloaded.getSnapshot().menu.options[0]).toBe('Continue')
    pressMenu(reloaded)
    expect(reloaded.getSnapshot().mode).toBe('playing')
    expect(reloaded.getSnapshot().loading).toBeNull()
  })

  it('queues sound events and deterministic feedback for player actions', () => {
    const levels = [makeTestLevel(1), makeTestLevel(2)]
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore() })

    game.startGame(1)
    game.primaryAction()
    expect(game.drainSoundEvents().map((event) => event.kind)).toContain('fire')

    step(game, 0.02)
    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.feedback.shake).toBeGreaterThan(0)
    expect(snapshot.feedback.levelClearPause).toBeGreaterThan(0)
    expect(game.drainSoundEvents().map((event) => event.kind)).toContain('level-clear')
  })

  it('shows pickup notices, records pickup rewards, and expires the notice', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const snapshot = game.getSnapshot()
    ;(game as unknown as { powerUps: PowerUp[] }).powerUps = [{
      id: 'test-rapid',
      kind: 'rapid',
      x: snapshot.player.x,
      y: snapshot.player.y,
      ttl: 9,
    }]

    step(game, 0.02)
    const picked = game.getSnapshot()
    expect(picked.score).toBe(50)
    expect(picked.runStats.powerUps.rapid).toBe(1)
    expect(picked.runStats.rewards.pickupScore).toBe(50)
    expect(picked.feedback.notices[0]?.text).toContain('RAPID FIRE 8s')

    step(game, 1.5)
    expect(game.getSnapshot().feedback.notices).toHaveLength(0)
  })

  it('saves and continues a run from local storage', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      saveStore: store,
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.03)
    game.setInput({ right: false })
    step(game, 0.35)
    game.primaryAction()
    expect(game.getSnapshot().runStats.shotsFired).toBe(1)
    game.togglePause()
    game.saveAndQuit()

    const menuSnapshot = game.getSnapshot()
    expect(menuSnapshot.mode).toBe('main-menu')
    expect(menuSnapshot.progression.hasSavedRun).toBe(true)

    const reloaded = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })
    expect(reloaded.continueSavedRun()).toBe(true)
    const continued = reloaded.getSnapshot()

    expect(continued.mode).toBe('playing')
    expect(continued.player).toMatchObject({ col: 5, row: 11 })
    expect(continued.runStats.shotsFired).toBe(1)
  })

  it('opens campaign level select with completed levels plus the next unlocked level', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.unlockedStage = 3
    saveData.progression.completedLevels = [1, 2]
    const game = new TanchikiGame({ saveStore: new MemorySaveStore(saveData) })

    expect(game.getSnapshot().level.current).toBe(3)
    expect(game.getSnapshot().enemiesRemaining).toBe(CAMPAIGN_LEVELS[2].enemyTotal)
    pressMenu(game)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-select')
    expect(snapshot.objective.selectableLevels).toEqual([1, 2, 3])
    expect(snapshot.menu.options.slice(0, 3)).toEqual([
      `1. ${CAMPAIGN_LEVELS[0].objective.label}: ${CAMPAIGN_LEVELS[0].name}`,
      `2. ${CAMPAIGN_LEVELS[1].objective.label}: ${CAMPAIGN_LEVELS[1].name}`,
      `3. ${CAMPAIGN_LEVELS[2].objective.label}: ${CAMPAIGN_LEVELS[2].name}`,
    ])
  })

  it('clearing a level awards rewards, unlocks the next level, and enters level-complete', () => {
    const levels = [makeTestLevel(1, { credits: 77, xp: 33, score: 444 }), makeTestLevel(2)]
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: store })

    game.startGame(1)
    step(game, 0.02)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.score).toBe(444)
    expect(snapshot.progression.credits).toBe(85)
    expect(snapshot.progression.xp).toBe(36)
    expect(snapshot.progression.unlockedStage).toBe(2)
    expect(snapshot.progression.hasSavedRun).toBe(false)
    expect(snapshot.results).toMatchObject({
      levelId: 1,
      levelName: 'Test 1',
      objectiveMode: 'defense',
      rewards: {
        missionCredits: 77,
        missionXp: 33,
        missionScore: 444,
        tacticalCredits: 8,
        tacticalXp: 3,
        totalCredits: 85,
        totalXp: 36,
        totalScore: 444,
      },
      tactical: {
        style: 'Fortress',
        quality: 'Controlled Win',
      },
    })
    expect(snapshot.menu.helper.join(' ')).toContain('Earned +$85')
  })

  it('spawns friendly and enemy sides in team-battle missions', () => {
    const levels: LevelDefinition[] = [{
      ...makeTestLevel(1),
      enemyTotal: 1,
      objective: {
        mode: 'team-battle',
        label: 'Team Battle',
        briefing: 'Test team battle.',
        winCondition: 'Clear enemy tickets.',
        friendlySpawns: [{ x: 5, y: 11 }],
        friendlyTotal: 1,
      },
    }]
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: levels, saveStore: new MemorySaveStore() })

    game.startGame(1)
    const snapshot = game.getSnapshot()

    expect(snapshot.objective.mode).toBe('team-battle')
    expect(snapshot.enemies.some((tank) => tank.side === 'player')).toBe(true)
    expect(snapshot.enemies.some((tank) => tank.side === 'enemy')).toBe(true)
  })

  it('captures a CTF flag and preserves carried flag state through continue', () => {
    const ctfLevel: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 0,
      playerSpawn: { x: 4, y: 11 },
      objective: {
        mode: 'ctf',
        label: 'Capture The Flag',
        briefing: 'Test CTF.',
        winCondition: 'Return one flag.',
        flag: { playerBase: { x: 5, y: 11 }, enemyFlag: { x: 4, y: 11 }, capturesToWin: 1 },
      },
    }
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [ctfLevel, makeTestLevel(2)], saveStore: store })

    game.startGame(1)
    step(game, 0.02)
    expect(game.getSnapshot().objective.flag?.carrierId).toBe('player')

    game.saveAndQuit()
    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [ctfLevel, makeTestLevel(2)], saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().objective.flag?.carrierId).toBe('player')

    reloaded.setInput({ right: true })
    step(reloaded, 0.36)
    reloaded.setInput({ right: false })
    step(reloaded, 0.02)

    const snapshot = reloaded.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.objective.flag?.captures).toBe(1)
    expect(snapshot.results?.stats.ctfCaptures).toBe(1)
    expect(snapshot.results?.rewards.objectiveScore).toBe(300)
  })

  it('wins FFA by player kill score while bots are hostile by side rules', () => {
    const ffaLevel: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      armoredEnemyRatio: 0,
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [{ x: 5, y: 11 }],
      objective: {
        mode: 'ffa',
        label: 'Free For All',
        briefing: 'Test FFA.',
        winCondition: 'Score one kill.',
        neutralSpawns: [{ x: 5, y: 11 }],
        neutralTotal: 1,
        targetScore: 1,
      },
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [ffaLevel, makeTestLevel(2)], saveStore: new MemorySaveStore() })

    game.startGame(1)
    game.setInput({ right: true })
    step(game, 0.02)
    game.setInput({ right: false })
    game.primaryAction()
    step(game, 0.2)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.objective.playerScore).toBe(1)
    expect(snapshot.runStats.playerKills).toBe(1)
    expect(snapshot.results?.rewards).toMatchObject({
      killScore: 100,
      killCredits: 15,
      killXp: 10,
    })
  })

  it('ends FFA when bots exhaust the neutral objective pool before player score target', () => {
    const ffaLevel: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [{ x: 5, y: 11 }],
      objective: {
        mode: 'ffa',
        label: 'Free For All',
        briefing: 'Test FFA exhaustion.',
        winCondition: 'Score three kills.',
        neutralSpawns: [{ x: 5, y: 11 }],
        neutralTotal: 1,
        targetScore: 3,
      },
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [ffaLevel, makeTestLevel(2)], saveStore: new MemorySaveStore() })
    const internals = game as unknown as { enemiesRemaining: number; enemies: unknown[] }

    game.startGame(1)
    internals.enemiesRemaining = 0
    internals.enemies = []
    step(game, 0.02)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.objective.playerScore).toBe(0)
    expect(snapshot.objective.targetScore).toBe(3)
  })

  it('wins assault by damaging the command objective instead of losing the base', () => {
    const assaultRows = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.....E.......',
      '.............',
      '.............',
    ]
    const assaultLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: assaultRows,
      enemyTotal: 0,
      playerSpawn: { x: 5, y: 11 },
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Test assault.',
        winCondition: 'Destroy the core.',
        assault: { cell: { x: 5, y: 10 }, hp: 2 },
      },
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [assaultLevel, makeTestLevel(2)], saveStore: new MemorySaveStore() })

    game.startGame(1)
    game.setInput({ up: true })
    step(game, 0.02)
    game.setInput({ up: false })
    game.primaryAction()
    step(game, 0.2)
    expect(game.getSnapshot()).toMatchObject({ mode: 'playing', baseHp: BASE_MAX_HP })

    step(game, 0.45)
    game.primaryAction()
    step(game, 0.2)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.objective.assault?.hp).toBe(0)
    expect(snapshot.results?.stats.assaultDamage).toBe(2)
  })

  it('prevents enemy defenders from shooting their own assault core', () => {
    const assaultLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: [
        '.....E.......',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
      ],
      playerSpawn: { x: 0, y: 12 },
      enemySpawns: [{ x: 6, y: 0 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 1, hunter: 0, wall_breaker: 0 },
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Test assault.',
        winCondition: 'Destroy the core.',
        assault: { cell: { x: 5, y: 0 }, hp: 3 },
      },
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [assaultLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(), seed: 4 })

    game.startGame(1)
    step(game, 1.8)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.objective.assault?.hp).toBe(3)
    expect(snapshot.bullets).toEqual([])
  })

  it('lets assault defenders shoot a real hostile target in line', () => {
    const assaultLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: [
        '.....E.......',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
      ],
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [{ x: 4, y: 0 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 1, hunter: 0, wall_breaker: 0 },
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Test assault.',
        winCondition: 'Destroy the core.',
        assault: { cell: { x: 5, y: 0 }, hp: 3 },
      },
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [assaultLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(), seed: 6 })

    game.startGame(1)
    step(game, 1.8)

    const snapshot = game.getSnapshot()
    expect(snapshot.bullets.some((bullet) => bullet.team === snapshot.team.enemy && bullet.dir === 'down')).toBe(true)
  })

  it('aims assault defenders at hostiles instead of their own command core', () => {
    const assaultLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: [
        '.....E.......',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
      ],
      playerSpawn: { x: 0, y: 12 },
      enemySpawns: [{ x: 6, y: 0 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 1, hunter: 0, wall_breaker: 0 },
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Test assault.',
        winCondition: 'Destroy the core.',
        assault: { cell: { x: 5, y: 0 }, hp: 3 },
      },
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [assaultLevel, makeTestLevel(2)], saveStore: new MemorySaveStore() })
    const internals = game as unknown as {
      enemies: Array<{ id: string; col: number; row: number }>
      getAiTargetCell: (tank: { id: string; col: number; row: number }) => { x: number; y: number }
    }

    game.startGame(1)
    const target = internals.getAiTargetCell(internals.enemies[0])

    expect(target).toEqual({ x: 0, y: 12 })
  })

  it('ignores enemy-side bullets that hit the enemy assault core', () => {
    const assaultLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: [
        '.....E.......',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
      ],
      playerSpawn: { x: 4, y: 11 },
      enemyTotal: 0,
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Test assault.',
        winCondition: 'Destroy the core.',
        assault: { cell: { x: 5, y: 0 }, hp: 3 },
      },
    }
    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(assaultLevel, [
      {
        id: 'enemy-core-test',
        owner: 'enemy',
        ownerId: 'enemy-test',
        side: 'enemy',
        team: 'red',
        x: 5 * 32 + 13,
        y: 16 + 1 * 32 + 2,
        dir: 'up',
        speed: 175,
        damage: 1,
        ttl: 2.4,
      },
    ])
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [assaultLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(saveData) })

    expect(game.continueSavedRun()).toBe(true)
    step(game, 0.2)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.objective.assault?.hp).toBe(3)
    expect(snapshot.results).toBeNull()
  })

  it('protects the player defense base from player-side bullets but not enemy fire', () => {
    const defenseLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      enemyTotal: 1,
    }
    const friendlySave = createDefaultSaveData()
    friendlySave.resumableRun = savedRunWithBullets(defenseLevel, [
      {
        id: 'friendly-base-test',
        owner: 'player',
        ownerId: 'player',
        side: 'player',
        team: 'blue',
        x: 6 * 32 + 13,
        y: 16 + 12 * 32 + 1,
        dir: 'down',
        speed: 205,
        damage: 1,
        ttl: 2.4,
      },
    ])
    const friendlyGame = new TanchikiGame({ aiEnabled: false, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(friendlySave) })

    expect(friendlyGame.continueSavedRun()).toBe(true)
    step(friendlyGame, 0.2)
    expect(friendlyGame.getSnapshot().baseHp).toBe(BASE_MAX_HP)

    const enemySave = createDefaultSaveData()
    enemySave.resumableRun = savedRunWithBullets(defenseLevel, [
      {
        id: 'enemy-base-test',
        owner: 'enemy',
        ownerId: 'enemy-test',
        side: 'enemy',
        team: 'red',
        x: 6 * 32 + 13,
        y: 16 + 12 * 32 + 1,
        dir: 'down',
        speed: 175,
        damage: 1,
        ttl: 2.4,
      },
    ])
    const enemyGame = new TanchikiGame({ aiEnabled: false, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(enemySave) })

    expect(enemyGame.continueSavedRun()).toBe(true)
    step(enemyGame, 0.2)
    expect(enemyGame.getSnapshot().baseHp).toBe(BASE_MAX_HP - 1)
  })

  it('clearing the final campaign level enters campaign-complete', () => {
    const levels = Array.from({ length: 8 }, (_, index) => makeTestLevel(index + 1))
    const saveData = createDefaultSaveData()
    saveData.progression.unlockedStage = 8
    saveData.progression.completedLevels = [1, 2, 3, 4, 5, 6, 7]
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore(saveData) })

    game.startGame(8)
    step(game, 0.02)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('campaign-complete')
    expect(snapshot.level.campaignComplete).toBe(true)
    expect(snapshot.progression.unlockedStage).toBe(8)
    expect(snapshot.progression.completedLevels).toContain(8)
    expect(snapshot.objective.selectableLevels).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('continues a saved run on the saved level definition', () => {
    const levels = [makeTestLevel(1), makeTestLevel(2)]
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: store })

    game.startGame(2)
    game.togglePause()
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ levelDefinitions: levels, saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().level).toMatchObject({ current: 2, name: 'Test 2' })
  })

  it('mixes objective modes across handcrafted campaign levels', () => {
    const first = CAMPAIGN_LEVELS[0]
    const final = CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1]

    expect(CAMPAIGN_LEVELS.map((level) => level.objective.mode)).toEqual([
      'defense',
      'team-battle',
      'ctf',
      'ffa',
      'assault',
      'ctf',
      'team-battle',
      'assault',
    ])
    expect(CAMPAIGN_LEVELS.map((level) => level.spawnInterval)).toEqual([3.2, 2.95, 2.7, 2.45, 2.25, 2.1, 1.9, 1.7])
    expect(final.enemyTotal).toBeGreaterThan(first.enemyTotal)
    expect(final.activeEnemyLimit).toBeGreaterThanOrEqual(first.activeEnemyLimit)
    expect(final.spawnInterval).toBeLessThan(first.spawnInterval)
    expect(final.armoredEnemyRatio).toBeGreaterThan(first.armoredEnemyRatio)
    expect(final.objective.assault?.hp).toBeGreaterThan(CAMPAIGN_LEVELS[4].objective.assault?.hp ?? 0)
  })

  it('keeps campaign spawns and objective cells valid for each mode', () => {
    for (const level of CAMPAIGN_LEVELS) {
      const tiles = createTiles(level.rows)
      const base = level.rows
        .flatMap((row, rowIndex) => [...row].map((char, colIndex) => ({ char, col: colIndex, row: rowIndex })))
        .find((cell) => cell.char === 'E')

      expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, level.playerSpawn.x, level.playerSpawn.y)
      for (const spawn of level.enemySpawns) {
        expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }
      for (const spawn of level.objective.friendlySpawns ?? []) {
        expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }
      for (const spawn of level.objective.neutralSpawns ?? []) {
        expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }

      if (level.objective.mode === 'defense') {
        expect(base, `${level.name} should contain a protected base`).toBeDefined()
        if (!base) continue
        expect(tiles[base.row][base.col]).toMatchObject({ kind: 'base', hp: BASE_MAX_HP })
        expect(tiles[base.row][base.col - 1]?.kind).toBe('steel')
        expect(tiles[base.row][base.col + 1]?.kind).toBe('steel')
        expect(tiles[base.row - 1][base.col]?.kind).toBe('brick')
      }

      if (level.objective.mode === 'ctf') {
        const flag = level.objective.flag
        expect(flag, `${level.name} should define a flag`).toBeDefined()
        if (!flag) continue
        expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, flag.playerBase.x, flag.playerBase.y)
        expectPassableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, flag.enemyFlag.x, flag.enemyFlag.y)
      }

      if (level.objective.mode === 'assault') {
        const target = level.objective.assault
        expect(target, `${level.name} should define an assault target`).toBeDefined()
        if (!target) continue
        expect(tiles[target.cell.y]?.[target.cell.x]?.kind).toBe('base')
      }
    }
  })

  it('detects neighboring water tiles for connected river rendering', () => {
    const riverLevel = [
      '.............',
      '.....W.......',
      '....WWW......',
      '.....W.......',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const tiles = createTiles(riverLevel)

    expect(getWaterNeighbors(tiles, 5, 2)).toEqual({ up: true, right: true, down: true, left: true })
    expect(getWaterNeighbors(tiles, 4, 2)).toEqual({ up: false, right: true, down: false, left: false })
  })
})
