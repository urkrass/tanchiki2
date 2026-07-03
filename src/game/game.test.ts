import { describe, expect, it } from 'vitest'
import { BASE_MAX_HP, CAMPAIGN_LEVELS, CAMPAIGN_MAP_COLS, CAMPAIGN_MAP_ROWS, DEFAULT_OBJECTIVE, createTiles, getWaterNeighbors } from './level.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import { TanchikiGame } from './game.ts'
import type { Bullet, CombatSide, InputState, LevelDefinition, OfflineDeployableKind, OfflineVisionMemory, OfflineRetranslator, PowerUp, RewardLedger, RunStats, SavedObjectiveState, SavedRun, Tank } from './types.ts'
import type { ContactBelief } from './ai/botTypes.ts'
import { ARENA_X, TILE_SIZE } from './constants.ts'

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

const AMMO_LEVEL = [
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '......A......',
  '.............',
  '.............',
  '.............',
  '.............',
  '....A........',
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

function holdButton(game: TanchikiGame, button: keyof InputState, seconds: number) {
  game.setInput({ [button]: true } as Partial<InputState>)
  step(game, seconds)
}

function releaseButton(game: TanchikiGame, button: keyof InputState) {
  game.setInput({ [button]: false } as Partial<InputState>)
  step(game, 0.05)
}

function expectPassableSpawn(source: { getTile: (col: number, row: number) => { kind: string } | undefined }, col: number, row: number) {
  const tile = source.getTile(col, row)
  expect(tile?.kind === 'empty' || tile?.kind === 'trees' || tile?.kind === 'road' || tile?.kind === 'ammo').toBe(true)
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
    return tile?.kind === 'empty' || tile?.kind === 'trees' || tile?.kind === 'road' || tile?.kind === 'ammo'
  })).toBe(true)
}

function getEnemyProbe(game: TanchikiGame, index = 0) {
  return (game as unknown as { enemies: Array<{ aiCooldown: number; move: unknown; reload: number }> }).enemies[index]
}

function getGameInternals(game: TanchikiGame) {
  return game as unknown as {
    bullets: Bullet[]
    enemies: Tank[]
    friendlyRespawnTimer: number
    player: Tank
    playerShellRechargeProgress: number
    playerShells: number
    deployables: Array<{ id: string; kind: OfflineDeployableKind; col: number; row: number; owner: CombatSide; safeTankId?: string }>
    deployableAlerts: Array<{ id: string; kind: 'noise' | 'steel' | 'tripwire'; side: CombatSide; team: 'blue' | 'red'; col: number; row: number; age: number; ttl: number; strength: number }>
    retranslators: OfflineRetranslator[]
    visionMemory: Record<CombatSide, Record<string, OfflineVisionMemory>>
    damagePlayer: (damage: number) => void
    destroyEnemy: (enemy: Tank, bullet?: Bullet) => void
    getBotDecision: (tank: Tank) => { action: string; intention: string; target: { x: number; y: number } | null; nextStep: { x: number; y: number } | null }
    getAiTargetCell: (tank: Tank) => { x: number; y: number }
    getAiShotTargetCell: (tank: Tank) => { x: number; y: number } | null
    runEnemyDecision: (tank: Tank) => 'moved' | 'acted' | 'idle'
    botBeliefs: Record<string, ContactBelief[]>
  }
}

function makeTankAt(
  id: string,
  col: number,
  row: number,
  side: 'player' | 'enemy' | 'neutral' = 'enemy',
  team: 'blue' | 'red' = side === 'player' ? 'blue' : 'red',
  hp = 2,
): Tank {
  return {
    id,
    faction: 'enemy',
    side,
    team,
    role: 'hunter',
    col,
    row,
    x: ARENA_X + col * TILE_SIZE + 3,
    y: 16 + row * 32 + 3,
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

function makeTeamBattleLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    ...makeTestLevel(1),
    enemyTotal: 2,
    activeEnemyLimit: 1,
    spawnInterval: 0.5,
    objective: {
      mode: 'team-battle',
      label: 'Team Battle',
      briefing: 'Test team battle.',
      winCondition: 'Clear enemy tickets.',
      friendlySpawns: [{ x: 5, y: 11 }, { x: 7, y: 11 }],
      friendlyTotal: 2,
    },
    ...overrides,
  }
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
    shellsRecharged: 0,
    shrapnelHits: 0,
    portableRelaysPlaced: 0,
    portableRelaysRecovered: 0,
    portableSignalContacts: 0,
    deployablesPlaced: { decoy: 0, mine: 0, noise: 0, steel: 0, tripwire: 0 },
    deployablesRecovered: { decoy: 0, mine: 0, noise: 0, steel: 0, tripwire: 0 },
    deployablesTriggered: { decoy: 0, mine: 0, noise: 0, steel: 0, tripwire: 0 },
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
    x: ARENA_X + 6 * TILE_SIZE + 13,
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

    step(game, 0.3)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 11, moving: true })
    expect(snapshot.player.x).toBeGreaterThan(ARENA_X + 4 * TILE_SIZE + 3)
    expect(snapshot.player.x).toBeLessThan(ARENA_X + 5 * TILE_SIZE + 3)

    step(game, 0.08)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 5, row: 11, moving: false })
    expect(snapshot.player.x).toBe(ARENA_X + 5 * TILE_SIZE + 3)
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
    expect(snapshot.player.x).toBe(ARENA_X + 4 * TILE_SIZE + 3)
  })

  it('chains enemy movement without waiting after each tile', () => {
    const pursuitLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 11, y: 11 },
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 1, hunter: 0, wall_breaker: 0 },
    }
    const game = new TanchikiGame({
      aiEnabled: true,
      levelDefinitions: [pursuitLevel, makeTestLevel(2)],
      saveStore: new MemorySaveStore(),
      seed: 2,
    })

    game.startGame(1)
    step(game, 0.25)

    const internals = getGameInternals(game)
    expect(internals.enemies[0]).toMatchObject({ col: 0, row: 0, move: expect.any(Object) })

    step(game, 0.52)
    const enemy = internals.enemies[0]

    expect(enemy.col + enemy.row).toBeGreaterThan(0)
    expect(enemy.move).not.toBeNull()
  })

  it('keeps an AI cooldown after an enemy shooting decision', () => {
    const shootingLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [{ x: 4, y: 9 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
    }
    const game = new TanchikiGame({
      aiEnabled: true,
      levelDefinitions: [shootingLevel, makeTestLevel(2)],
      saveStore: new MemorySaveStore(),
      seed: 3,
    })

    game.startGame(1)
    getEnemyProbe(game).reload = 0
    step(game, 0.3)

    const internals = getGameInternals(game)
    const enemy = getEnemyProbe(game)
    expect(internals.bullets.some((bullet) => bullet.owner === 'enemy' && bullet.dir === 'down')).toBe(true)
    expect(enemy.move).toBeNull()
    expect(enemy.aiCooldown).toBeGreaterThan(0)
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
      playerSpawn: { x: 4, y: 2 },
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
    const internals = getGameInternals(game)
    const enemy = internals.enemies[0]

    expect(internals.enemies).toHaveLength(1)
    expect(enemy).not.toMatchObject({ col: 0, row: 0 })
    expectPassableSpawn(game, enemy.col, enemy.row)
    expect(game.getSnapshot().enemiesRemaining).toBe(0)
  })

  it('spawns tougher normal and armored enemies without changing armored reward tier', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemySpawns: [{ x: 0, y: 0 }, { x: 2, y: 0 }],
      enemyTotal: 2,
      activeEnemyLimit: 2,
      armoredEnemyRatio: 0.5,
    }
    const game = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [level],
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    step(game, 2.1)
    const internals = getGameInternals(game)
    expect(internals.enemies).toHaveLength(2)
    const normal = internals.enemies.find((enemy) => enemy.scoreValue === 100)
    const armored = internals.enemies.find((enemy) => enemy.scoreValue === 250)

    expect(normal).toMatchObject({ hp: 4, maxHp: 4 })
    expect(armored).toMatchObject({ hp: 5, maxHp: 5 })

    internals.destroyEnemy(normal as Tank, {
      id: 'test-shell',
      owner: 'player',
      ownerId: internals.player.id,
      side: 'player',
      team: 'blue',
      x: normal?.x ?? 0,
      y: normal?.y ?? 0,
      dir: 'up',
      speed: 0,
      damage: 4,
      ttl: 1,
    })

    const snapshot = game.getSnapshot()
    expect(snapshot.runStats.armoredKills).toBe(0)
    expect(snapshot.progression.credits).toBe(15)
    expect(snapshot.progression.xp).toBe(10)
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
    const internals = getGameInternals(game)
    const enemy = internals.enemies[0]

    expect(internals.enemies).toHaveLength(1)
    expect(enemy).not.toMatchObject({ col: 0, row: 0 })
    expectEscapableSpawn(game, enemy.col, enemy.row)
    expect(game.getSnapshot().enemiesRemaining).toBe(0)
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
    expect(snapshot.menu.helper.at(-1)).toContain('Retry: Campaign reopens briefing')
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
    const internals = getGameInternals(game)
    const before = { ...internals.enemies[0] }
    step(game, 1.2)
    const after = internals.enemies[0]

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
    expect(snapshot.progression.upgradeStats.moveDuration).toBeCloseTo(0.356)
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
      currentEffect: 'Reload 1.36s  Rapid 1.11s  Damage 2',
      nextEffect: 'Reload 1.24s  Rapid 0.99s  Damage 3',
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
    expect(snapshot.progression.upgradeStats.reloadTime).toBeCloseTo(1.24)
    expect(snapshot.progression.upgradeStats.bulletDamage).toBe(3)
    expect(snapshot.progression.upgradeStats.moveDuration).toBeCloseTo(0.332)
    expect(snapshot.player).toMatchObject({ hp: 5, repairCharges: 1 })
  })

  it('uses the scarce offline shell, movement, and bullet tuning', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.upgrades = { armor: 0, cannon: 5, engine: 5, repairKit: 0 }
    const game = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(saveData),
    })

    game.startGame()
    let snapshot = game.getSnapshot()
    expect(snapshot.progression.upgradeStats.reloadTime).toBeCloseTo(1)
    expect(snapshot.progression.upgradeStats.moveDuration).toBe(0.26)
    expect(snapshot.player).toMatchObject({ shells: 10, shellCapacity: 10 })

    game.primaryAction()
    snapshot = game.getSnapshot()

    expect(snapshot.bullets).toHaveLength(1)
    expect(snapshot.player.shells).toBe(9)
    expect(snapshot.bullets[0]).toMatchObject({
      owner: 'player',
      speed: 240,
      damage: 3,
      ttl: 2.05,
      splashDamage: 1,
      splashRadius: 40,
    })
  })

  it('exposes local shot and reload feedback without changing reload timing', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.primaryAction()

    const fired = game.getSnapshot()
    expect(fired.runStats.shotsFired).toBe(1)
    expect(fired.player.shells).toBe(9)
    expect(fired.player.reload).toBeCloseTo(fired.player.reloadTime)
    expect(fired.player.reloadTime).toBeCloseTo(1.6)
    expect(fired.feedback.shake).toBeGreaterThan(0)

    step(game, 0.24)
    const reloading = game.getSnapshot()
    expect(reloading.player.reload).toBeGreaterThan(0)
    expect(reloading.player.reload).toBeLessThan(reloading.player.reloadTime)
  })

  it('spends shells only on successful player shots and blocks empty fire', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const internals = getGameInternals(game)
    internals.playerShells = 1

    game.primaryAction()
    let snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(0)
    expect(snapshot.bullets).toHaveLength(1)
    expect(snapshot.runStats.shotsFired).toBe(1)

    game.primaryAction()
    snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(0)
    expect(snapshot.bullets).toHaveLength(1)
    expect(snapshot.runStats.shotsFired).toBe(1)

    internals.player.reload = 0
    game.primaryAction()
    snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(0)
    expect(snapshot.bullets).toHaveLength(1)
    expect(snapshot.runStats.shotsFired).toBe(1)
  })

  it('keeps hit grace out of the shield HUD and consumes real shield before HP', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const internals = getGameInternals(game)
    expect(game.getSnapshot().player).toMatchObject({ hp: 3, shield: 0 })

    internals.player.spawnGrace = 0
    internals.damagePlayer(1)
    expect(game.getSnapshot().player).toMatchObject({ hp: 2, shield: 0 })

    internals.player.spawnGrace = 0
    internals.player.shield = 6
    internals.damagePlayer(1)
    expect(game.getSnapshot().player).toMatchObject({ hp: 2, shield: 0 })

    internals.player.spawnGrace = 0
    internals.damagePlayer(1)
    expect(game.getSnapshot().player).toMatchObject({ hp: 1, shield: 0 })
  })

  it('recharges one shell at a time only while holding an ammo station', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 1,
      levelRows: AMMO_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const internals = getGameInternals(game)
    internals.playerShells = 8

    step(game, 1.95)
    let snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ shells: 8, onAmmoStation: true })
    expect(snapshot.player.shellRechargeProgress).toBeGreaterThan(0.9)

    step(game, 0.06)
    snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(9)
    expect(snapshot.runStats.shellsRecharged).toBe(1)
    expect(snapshot.feedback.notices.some((notice) => notice.text === 'AMMO')).toBe(true)

    step(game, 2.05)
    snapshot = game.getSnapshot()
    expect(snapshot.player.shells).toBe(10)
    expect(snapshot.player.shellRechargeProgress).toBe(0)
    expect(snapshot.runStats.shellsRecharged).toBe(2)

    internals.playerShells = 8
    internals.playerShellRechargeProgress = 1
    game.setInput({ right: true })
    step(game, 0.02)
    game.setInput({ right: false })
    snapshot = game.getSnapshot()
    expect(snapshot.player.shellRechargeProgress).toBe(0)
  })

  it('saves shell count and recharge progress while old saves default to full shells', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: AMMO_LEVEL,
      saveStore: store,
    })

    game.startGame()
    const internals = getGameInternals(game)
    internals.playerShells = 4
    internals.playerShellRechargeProgress = 1
    game.saveAndQuit()

    const reloaded = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: AMMO_LEVEL,
      saveStore: store,
    })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().player).toMatchObject({
      shells: 4,
      shellCapacity: 10,
      shellRechargeProgress: 0.5,
      onAmmoStation: true,
    })

    const oldSave = createDefaultSaveData()
    oldSave.resumableRun = savedRunWithBullets(makeTestLevel(1), [])
    const oldReloaded = new TanchikiGame({
      levelDefinitions: [makeTestLevel(1)],
      saveStore: new MemorySaveStore(oldSave),
    })

    expect(oldReloaded.continueSavedRun()).toBe(true)
    expect(oldReloaded.getSnapshot().player).toMatchObject({ shells: 10, shellCapacity: 10 })
  })

  it('keeps ammo stations passable and non-solid for bullets', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: AMMO_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const internals = getGameInternals(game)
    internals.bullets = [{
      id: 'station-pass',
      owner: 'player',
      ownerId: 'player',
      side: 'player',
      team: 'blue',
      x: ARENA_X + 6 * TILE_SIZE + 13,
      y: 16 + 6 * 32 + 13,
      dir: 'up',
      speed: 0,
      damage: 2,
      ttl: 1,
      splashDamage: 1,
      splashRadius: 40,
    }]

    step(game, 0.02)
    const snapshot = game.getSnapshot()
    expect(game.getTile(6, 6)?.kind).toBe('ammo')
    expect(game.getTile(4, 11)?.kind).toBe('ammo')
    expect(internals.bullets).toHaveLength(1)
    expect(snapshot.terrain.ammo).toBeLessThanOrEqual(2)
    expectPassableSpawn(game, 4, 11)
  })

  it('filters hidden offline enemies, relays, bullets, and terrain from the player snapshot', () => {
    const fogLevel: LevelDefinition = {
      ...makeTestLevel(1),
      playerSpawn: { x: 11, y: 11 },
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      retranslators: [{ x: 0, y: 0 }],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [fogLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const internals = getGameInternals(game)
    internals.bullets = [{
      id: 'hidden-shot',
      owner: 'enemy',
      ownerId: 'enemy-1',
      side: 'enemy',
      team: 'red',
      x: 32,
      y: 16 + 32,
      dir: 'down',
      speed: 0,
      damage: 1,
      ttl: 1,
    }]

    const snapshot = game.getSnapshot()
    expect(internals.enemies).toHaveLength(1)
    expect(internals.retranslators).toHaveLength(1)
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.bullets).toHaveLength(0)
    expect(snapshot.retranslators).toHaveLength(0)
    expect(snapshot.fog.hiddenCellCount).toBeGreaterThan(0)
    expect(snapshot.fog.visibleRetranslatorCount).toBe(0)
    expect(snapshot.terrain.brick + snapshot.terrain.steel + snapshot.terrain.water + snapshot.terrain.road + snapshot.terrain.ammo).toBeLessThan(10)
  })

  it('shows relays on visible fog-edge cells', () => {
    const edgeRelayLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS)),
      playerSpawn: { x: 8, y: 13 },
      enemyTotal: 0,
      retranslators: [{ x: 10, y: 15 }],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [edgeRelayLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const snapshot = game.getSnapshot()

    expect(snapshot.vision.visibleCells).toContainEqual({ col: 10, row: 15 })
    expect(snapshot.retranslators).toContainEqual(expect.objectContaining({ col: 10, row: 15 }))
    expect(snapshot.fog.visibleRetranslatorCount).toBe(1)
  })

  it('keeps the defense base visible through offline fog', () => {
    const rows = Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS))
    rows[16] = `${'.'.repeat(20)}E`
    const baseLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows,
      playerSpawn: { x: 0, y: 0 },
      enemyTotal: 0,
      enemySpawns: [],
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [baseLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const snapshot = game.getSnapshot()

    expect(snapshot.vision.alwaysVisibleCells).toContainEqual({ col: 20, row: 16 })
    expect(snapshot.vision.visibleCells).toContainEqual({ col: 20, row: 16 })
    expect(snapshot.terrain.base).toBe(1)
    expect(snapshot.readableText.levelMarkers.labels).toContain('BASE')
    expect(snapshot.readableText.levelMarkers.offscreenPrimary.join(' ')).toContain('BASE')
  })

  it('keeps the player CTF home visible without exposing the enemy flag', () => {
    const homeLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS)),
      playerSpawn: { x: 0, y: 0 },
      enemyTotal: 0,
      enemySpawns: [],
      retranslators: [],
      objective: {
        mode: 'ctf',
        label: 'Capture The Flag',
        briefing: 'Test CTF home visibility.',
        winCondition: 'Return the flag.',
        flag: {
          playerBase: { x: 20, y: 16 },
          enemyFlag: { x: 19, y: 0 },
          capturesToWin: 1,
        },
      },
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [homeLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const snapshot = game.getSnapshot()

    expect(snapshot.vision.alwaysVisibleCells).toContainEqual({ col: 20, row: 16 })
    expect(snapshot.readableText.levelMarkers.labels).toContain('HOME')
    expect(snapshot.readableText.levelMarkers.labels).not.toContain('FLAG')
    expect(JSON.stringify(snapshot.readableText)).not.toContain('flag-target')
  })

  it('captures offline retranslators over time and preserves ownership through continue', () => {
    const relayLevel: LevelDefinition = {
      ...makeTestLevel(1),
      playerSpawn: { x: 4, y: 11 },
      enemyTotal: 1,
      activeEnemyLimit: 0,
      retranslators: [{ x: 5, y: 11 }],
    }
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: store })

    game.startGame(1)
    step(game, 3.62)

    let snapshot = game.getSnapshot()
    expect(snapshot.retranslators).toHaveLength(1)
    expect(snapshot.retranslators[0]).toMatchObject({ owner: 'player', progress: 1 })
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'linked', teamVisionMerged: true, ownedRetranslatorCount: 1, totalRetranslatorCount: 1 })
    expect(snapshot.readableText.hud.link).toBe('Link 1/1 TEAM')

    game.saveAndQuit()
    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    snapshot = reloaded.getSnapshot()
    expect(snapshot.retranslators[0]).toMatchObject({ owner: 'player', progress: 1 })
    expect(snapshot.fog.teamVisionMode).toBe('linked')
    expect(snapshot.fog.teamVisionMerged).toBe(true)
  })

  it('keeps teammate vision private until a player relay links the squad', () => {
    const relayLevel: LevelDefinition = {
      ...makeTeamBattleLevel({
        rows: Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS)),
        playerSpawn: { x: 4, y: 11 },
        enemySpawns: [],
        enemyTotal: 0,
        activeEnemyLimit: 0,
        retranslators: [{ x: 5, y: 11 }],
        objective: {
          mode: 'team-battle',
          label: 'Team Battle',
          briefing: 'Test team battle private vision.',
          winCondition: 'Clear enemy tickets.',
          friendlySpawns: [{ x: 16, y: 11 }],
          friendlyTotal: 1,
        },
      }),
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const internals = getGameInternals(game)
    internals.enemies.push(makeTankAt('hidden-near-ally', 16, 12, 'enemy', 'red', 1))

    let snapshot = game.getSnapshot()
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'solo', teamVisionMerged: false, visionCircleCount: 1 })
    expect(snapshot.vision.circles.map((circle) => circle.kind)).toEqual(['self'])
    expect(snapshot.enemies.some((tank) => tank.id === 'hidden-near-ally')).toBe(false)
    expect(snapshot.readableText.hud.link).toBe('Link 0/1 SOLO')

    step(game, 3.62)

    snapshot = game.getSnapshot()
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'linked', teamVisionMerged: true, ownedRetranslatorCount: 1 })
    expect(snapshot.vision.circles.some((circle) => circle.kind === 'teammate')).toBe(true)
    expect(snapshot.vision.circles.some((circle) => circle.kind === 'relay')).toBe(true)
    expect(snapshot.enemies).toContainEqual(expect.objectContaining({ id: 'hidden-near-ally', side: 'enemy' }))
    expect(snapshot.readableText.hud.link).toBe('Link 1/1 TEAM')
  })

  it('freezes relay capture while contested and lets tanks pass through relay cells', () => {
    const relayLevel: LevelDefinition = {
      ...makeTestLevel(1),
      playerSpawn: { x: 4, y: 11 },
      enemyTotal: 1,
      activeEnemyLimit: 0,
      retranslators: [{ x: 5, y: 11 }],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: new MemorySaveStore() })
    game.startGame(1)
    const internals = getGameInternals(game)
    internals.enemies = [makeTankAt('contest', 6, 11, 'enemy', 'red', 1)]

    step(game, 1.2)
    expect(internals.retranslators[0]).toMatchObject({ owner: null, progress: 0 })

    game.setInput({ right: true })
    step(game, 0.4)
    expect(game.getSnapshot().player).toMatchObject({ col: 5, row: 11 })
  })

  it('defaults old saved runs to neutral level retranslators and empty vision memory', () => {
    const relayLevel: LevelDefinition = {
      ...makeTestLevel(1),
      playerSpawn: { x: 4, y: 11 },
      enemyTotal: 0,
      retranslators: [{ x: 5, y: 11 }],
    }
    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(relayLevel, [])
    delete (saveData.resumableRun as Partial<SavedRun>).retranslators
    delete (saveData.resumableRun as Partial<SavedRun>).visionMemory
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: new MemorySaveStore(saveData) })

    expect(game.continueSavedRun()).toBe(true)
    const snapshot = game.getSnapshot()
    expect(snapshot.retranslators[0]).toMatchObject({ owner: null, progress: 0 })
    expect(snapshot.fog.lastKnownCount).toBe(0)
  })

  it('places and recovers one portable relay through held input without linking team vision', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })

    game.startGame(1)
    expect(game.getSnapshot().portableRelay).toMatchObject({ available: true, deployed: false, status: 'ready' })

    game.setInput({ relay: true })
    step(game, 0.6)
    expect(game.getSnapshot().portableRelay.hold).toMatchObject({ action: 'place', progress: 0.5 })
    game.setInput({ relay: false })
    step(game, 0.1)
    expect(game.getSnapshot().portableRelay).toMatchObject({ deployed: false, hold: null })

    game.setInput({ relay: true })
    step(game, 1.22)
    let snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: false, deployed: true, col: 4, row: 11, status: 'deployed' })
    expect(snapshot.player.portableRelay).toMatchObject({ deployed: true, col: 4, row: 11 })
    expect(snapshot.runStats.portableRelaysPlaced).toBe(1)
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'solo', teamVisionMerged: false, ownedRetranslatorCount: 0 })
    expect(snapshot.readableText.hud.relay).toBe('RELAY OUT')

    step(game, 1.0)
    snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: false, deployed: true, hold: null })
    expect(snapshot.runStats.portableRelaysRecovered).toBe(0)

    game.setInput({ relay: false, right: true })
    step(game, 0.02)
    game.setInput({ right: false })
    step(game, 0.4)
    expect(game.getSnapshot().player).toMatchObject({ col: 5, row: 11 })

    game.setInput({ right: false, relay: true })
    step(game, 0.92)
    snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: true, deployed: false, status: 'ready' })
    expect(snapshot.runStats.portableRelaysRecovered).toBe(1)

    step(game, 1.3)
    snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: true, deployed: false, hold: null })
    expect(snapshot.runStats.portableRelaysPlaced).toBe(1)

    game.setInput({ relay: false })
    step(game, 0.1)
    game.setInput({ relay: true })
    step(game, 1.22)
    snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: false, deployed: true, col: 5, row: 11 })
    expect(snapshot.runStats.portableRelaysPlaced).toBe(2)
  })

  it('persists deployed portable relay and defaults old saves to ready', () => {
    const relayLevel: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: store })

    game.startGame(1)
    game.setInput({ relay: true })
    step(game, 1.22)
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    let snapshot = reloaded.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ deployed: true, col: 4, row: 11, hold: null, waveCount: 0 })

    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(relayLevel, [])
    delete (saveData.resumableRun as Partial<SavedRun>).portableRelay
    const oldReloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [relayLevel], saveStore: new MemorySaveStore(saveData) })
    expect(oldReloaded.continueSavedRun()).toBe(true)
    snapshot = oldReloaded.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ available: true, deployed: false, status: 'ready' })
  })

  it('places and recovers prototype deployables through held number inputs with one active per type', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })

    game.startGame(1)
    expect(game.getSnapshot().deployables).toMatchObject({ active: [], hold: null, label: 'GEAR 0/5' })

    holdButton(game, 'decoy', 0.45)
    expect(game.getSnapshot().deployables.hold).toMatchObject({ kind: 'decoy', action: 'place', key: '1', progress: 0.5 })
    releaseButton(game, 'decoy')
    expect(game.getSnapshot().deployables).toMatchObject({ active: [], hold: null })

    holdButton(game, 'decoy', 0.92)
    let snapshot = game.getSnapshot()
    expect(snapshot.deployables.active).toContainEqual(expect.objectContaining({ kind: 'decoy', col: 4, row: 11, label: '1 DECOY' }))
    expect(snapshot.deployables.label).toBe('GEAR 1/5')
    expect(snapshot.runStats.deployablesPlaced.decoy).toBe(1)
    expect(snapshot.readableText.hud.gear).toBe('GEAR 1/5')

    step(game, 0.9)
    snapshot = game.getSnapshot()
    expect(snapshot.deployables.active).toHaveLength(1)
    expect(snapshot.runStats.deployablesRecovered.decoy).toBe(0)

    releaseButton(game, 'decoy')
    holdButton(game, 'decoy', 0.72)
    snapshot = game.getSnapshot()
    expect(snapshot.deployables.active).toHaveLength(0)
    expect(snapshot.runStats.deployablesRecovered.decoy).toBe(1)
  })

  it('triggers mines only on hostiles, damages and slows without blocking bullets or terrain', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })
    game.startGame(1)

    holdButton(game, 'mine', 0.92)
    releaseButton(game, 'mine')
    const internals = getGameInternals(game)
    internals.enemies.push(makeTankAt('friendly-safe', 5, 11, 'player', 'blue', 3))
    step(game, 0.1)
    expect(game.getSnapshot().deployables.active).toContainEqual(expect.objectContaining({ kind: 'mine' }))

    internals.enemies = internals.enemies.filter((tank) => tank.id !== 'friendly-safe')
    internals.enemies.push(makeTankAt('mine-target', 5, 11, 'enemy', 'red', 3))
    internals.bullets.push({
      id: 'mine-pass-through',
      owner: 'player',
      ownerId: 'player',
      side: 'player',
      team: 'blue',
      x: ARENA_X + 4 * TILE_SIZE + 3,
      y: 16 + 11 * 32 + 3,
      dir: 'up',
      speed: 0,
      damage: 1,
      ttl: 1,
    })
    step(game, 0.1)

    const target = internals.enemies.find((tank) => tank.id === 'mine-target')
    expect(target).toMatchObject({ hp: 1 })
    expect(target?.slow).toBeGreaterThan(9)
    expect(game.getSnapshot().deployables.active.some((deployable) => deployable.kind === 'mine')).toBe(false)
    expect(game.getSnapshot().runStats.deployablesTriggered.mine).toBe(1)
    expect(game.getTile(4, 11)?.kind).toBe('empty')
    expect(internals.bullets.some((bullet) => bullet.id === 'mine-pass-through')).toBe(true)
  })

  it('creates investigate-only noise and tripwire alerts without hidden enemy leaks or fog reveal', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      rows: Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS)),
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [],
      enemyTotal: 1,
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })
    game.startGame(1)
    const internals = getGameInternals(game)
    const friendly = makeTankAt('ally-scout', 4, 10, 'player', 'blue', 3)
    const hidden = makeTankAt('noise-hidden', 10, 12, 'enemy', 'red', 3)
    internals.enemies.push(friendly, hidden)
    internals.deployables.push({ id: 'noise-probe', kind: 'noise', col: 10, row: 11, owner: 'player' })

    const before = game.getSnapshot()
    expect(before.enemies.some((tank) => tank.id === 'noise-hidden')).toBe(false)
    step(game, 0.1)

    let snapshot = game.getSnapshot()
    expect(snapshot.deployables.alerts).toContainEqual(expect.objectContaining({ kind: 'noise', side: 'player', team: 'red', col: 10, row: 11 }))
    expect(snapshot.enemies.some((tank) => tank.id === 'noise-hidden')).toBe(false)
    expect(snapshot.vision.visibleCells).toEqual(before.vision.visibleCells)
    expect(JSON.stringify(snapshot.readableText)).not.toContain('noise-hidden')
    expect(internals.getAiTargetCell(friendly)).toEqual({ x: 10, y: 11 })
    expect(internals.getAiShotTargetCell(friendly)).toBeNull()

    internals.deployables.push({ id: 'wire-friendly-safe', kind: 'tripwire', col: 6, row: 11, owner: 'player' })
    friendly.col = 6
    friendly.row = 11
    step(game, 0.1)
    expect(internals.deployables.some((deployable) => deployable.id === 'wire-friendly-safe')).toBe(true)

    hidden.col = 6
    hidden.row = 11
    step(game, 0.1)
    snapshot = game.getSnapshot()
    expect(internals.deployables.some((deployable) => deployable.id === 'wire-friendly-safe')).toBe(false)
    expect(snapshot.deployables.alerts).toContainEqual(expect.objectContaining({ kind: 'tripwire', side: 'player', team: 'red', col: 6, row: 11 }))
  })

  it('immobilizes steel-trapped tanks and warns only the enemy side', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })
    game.startGame(1)
    const internals = getGameInternals(game)
    const friendly = makeTankAt('ally-trapped', 6, 11, 'player', 'blue', 3)
    internals.enemies.push(friendly)
    internals.deployables.push({ id: 'steel-trap', kind: 'steel', col: 6, row: 11, owner: 'player' })

    step(game, 0.1)

    expect(friendly.immobilized).toBeGreaterThan(4.8)
    expect(internals.deployables.some((deployable) => deployable.id === 'steel-trap')).toBe(false)
    expect(game.getSnapshot().deployables.alerts).toHaveLength(0)
    expect(Object.values(internals.visionMemory.enemy)).toContainEqual(expect.objectContaining({ alert: true, source: 'steel', side: 'player', col: 6, row: 11 }))
    expect(game.getSnapshot().runStats.deployablesTriggered.steel).toBe(1)
  })

  it('persists deployed prototype gear and active tank status, while old saves default empty', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      enemyTotal: 1,
      enemySpawns: [],
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: store })
    game.startGame(1)
    holdButton(game, 'decoy', 0.92)
    releaseButton(game, 'decoy')
    const internals = getGameInternals(game)
    internals.enemies.push(makeTankAt('slowed-save', 7, 11, 'enemy', 'red', 3))
    internals.enemies[0].slow = 8
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().deployables.active).toContainEqual(expect.objectContaining({ kind: 'decoy', col: 4, row: 11 }))
    expect(getGameInternals(reloaded).enemies.find((tank) => tank.id === 'slowed-save')?.slow).toBeGreaterThan(7)

    const saveData = createDefaultSaveData()
    saveData.resumableRun = savedRunWithBullets(level, [])
    delete (saveData.resumableRun as Partial<SavedRun>).deployables
    const oldReloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore(saveData) })
    expect(oldReloaded.continueSavedRun()).toBe(true)
    expect(oldReloaded.getSnapshot().deployables).toMatchObject({ active: [], hold: null, alerts: [] })
  })

  it('uses portable signal waves as hidden hostile echoes without damage, id leaks, or team linking', () => {
    const signalLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS)),
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [],
      enemyTotal: 1,
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [signalLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const internals = getGameInternals(game)
    internals.enemies.push(makeTankAt('signal-hidden', 9, 11, 'enemy', 'red', 3))

    const before = game.getSnapshot()
    expect(before.enemies.some((tank) => tank.id === 'signal-hidden')).toBe(false)

    game.setInput({ relay: true })
    step(game, 1.22)
    game.setInput({ relay: false })
    step(game, 1.55)

    const snapshot = game.getSnapshot()
    const serializedReadable = JSON.stringify(snapshot.readableText)
    const serializedContacts = JSON.stringify(snapshot.portableRelay.signalContacts)
    expect(snapshot.portableRelay.waveCount).toBeGreaterThan(0)
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({ kind: 'hostile', team: 'red' }))
    expect(snapshot.enemies.some((tank) => tank.id === 'signal-hidden')).toBe(false)
    expect(snapshot.vision.visibleCells).toEqual(before.vision.visibleCells)
    expect(snapshot.fog.visibleCellCount).toBe(before.fog.visibleCellCount)
    expect(serializedContacts).not.toContain('signal-hidden')
    expect(serializedReadable).not.toContain('signal-hidden')
    expect(internals.enemies.find((tank) => tank.id === 'signal-hidden')?.hp).toBe(3)
    expect(snapshot.fog).toMatchObject({ teamVisionMode: 'solo', teamVisionMerged: false, ownedRetranslatorCount: 0 })
    expect(snapshot.readableText.hud.relay).toBe('RELAY OUT')
  })

  it('bounces portable signal waves off hidden solid terrain without revealing or damaging the wall', () => {
    const rows = Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS))
    rows[11] = `${'.'.repeat(9)}B${'.'.repeat(CAMPAIGN_MAP_COLS - 10)}`
    const wallLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows,
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [],
      enemyTotal: 1,
      activeEnemyLimit: 0,
      retranslators: [],
    }
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [wallLevel], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const before = game.getSnapshot()
    expect(game.getTile(9, 11)).toMatchObject({ kind: 'brick', hp: 2 })
    expect(before.vision.visibleCells).not.toContainEqual({ col: 9, row: 11 })
    game.setInput({ relay: true })
    step(game, 1.22)
    game.setInput({ relay: false })
    step(game, 1.55)

    const snapshot = game.getSnapshot()
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({ kind: 'wall', col: 9, row: 11 }))
    expect(snapshot.vision.visibleCells).toEqual(before.vision.visibleCells)
    expect(snapshot.fog.visibleCellCount).toBe(before.fog.visibleCellCount)
    expect(snapshot.terrain.brick).toBe(0)
    expect(game.getTile(9, 11)).toMatchObject({ kind: 'brick', hp: 2 })
    expect(snapshot.runStats.bricksDestroyed).toBe(0)
  })

  it('does not let AI shoot hidden hostiles but uses fresh last-known cells for movement targets', () => {
    const stealthLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      enemySpawns: [{ x: 4, y: 0 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [stealthLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(), seed: 12 })
    game.startGame(1)
    getEnemyProbe(game).reload = 0

    step(game, 0.4)
    expect(getGameInternals(game).bullets).toHaveLength(0)

    const internals = getGameInternals(game)
    internals.enemies[0].col = 4
    internals.enemies[0].row = 9
    internals.enemies[0].x = 4 * 32 + 3
    internals.enemies[0].y = 16 + 9 * 32 + 3
    step(game, 0.02)
    internals.player.col = 9
    internals.player.row = 11
    internals.player.x = 9 * 32 + 3
    internals.player.y = 16 + 11 * 32 + 3

    expect(internals.getAiTargetCell(internals.enemies[0])).toEqual({ x: 4, y: 11 })
  })

  it('does not let stale visible bot beliefs become hidden-coordinate fire', () => {
    const level: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 9, y: 11 },
      enemySpawns: [],
      enemyTotal: 0,
      activeEnemyLimit: 0,
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [level], saveStore: new MemorySaveStore(), seed: 22 })
    game.startGame(1)
    const internals = getGameInternals(game)
    step(game, 0.1)

    const hunter = makeTankAt('stale-belief-hunter', 4, 11, 'enemy', 'red', 3)
    hunter.role = 'hunter'
    hunter.reload = 0
    internals.enemies = [hunter]

    internals.botBeliefs[hunter.id] = [{
      id: 'player',
      kind: 'enemy',
      position: { x: 9, y: 11 },
      lastSeenAt: -0.5,
      confidence: 1,
      source: 'vision',
      side: 'player',
      team: 'blue',
      value: 1,
      visible: true,
    }]

    expect(internals.getAiShotTargetCell(hunter)).toBeNull()
    expect(internals.runEnemyDecision(hunter)).not.toBe('acted')
    expect(internals.bullets).toHaveLength(0)
  })

  it('turns hidden last-known contacts into cautious scouting goals instead of exact rushes', () => {
    const stealthLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 9, y: 11 },
      enemySpawns: [{ x: 4, y: 9 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [stealthLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(), seed: 12 })
    game.startGame(1)
    const internals = getGameInternals(game)
    const enemy = internals.enemies[0]
    const lastKnown = { x: 4, y: 11 }

    internals.visionMemory.enemy.player = {
      id: 'player',
      side: 'player',
      team: 'blue',
      col: lastKnown.x,
      row: lastKnown.y,
      seenAt: 0,
    }
    enemy.reload = 0

    const decision = internals.getBotDecision(enemy)
    const snapshot = game.getSnapshot()

    expect(decision).toMatchObject({ action: 'move', intention: 'investigate', target: lastKnown })
    expect(decision.nextStep).not.toEqual(lastKnown)
    expect(decision.nextStep).not.toBeNull()
    expect(Math.abs((decision.nextStep?.x ?? 0) - lastKnown.x) + Math.abs((decision.nextStep?.y ?? 0) - lastKnown.y)).toBeGreaterThanOrEqual(1)
    expect(internals.getAiShotTargetCell(enemy)).toBeNull()
    expect(internals.bullets).toHaveLength(0)
    expect(snapshot.ai).toMatchObject({
      policy: 'visible-fire-scout-uncertainty',
      hiddenCoordinateLeak: false,
      uncertainContactCount: 1,
      visibleAttackContactCount: 0,
    })
  })

  it('pauses objective shots while a fresh uncertain contact needs scouting', () => {
    const defenseLevel: LevelDefinition = {
      ...makeTestLevel(1),
      rows: EMPTY_LEVEL,
      playerSpawn: { x: 9, y: 11 },
      enemySpawns: [{ x: 6, y: 8 }],
      enemyTotal: 1,
      activeEnemyLimit: 1,
      roleWeights: { base_attacker: 1, hunter: 0, wall_breaker: 0 },
    }
    const game = new TanchikiGame({ aiEnabled: true, levelDefinitions: [defenseLevel, makeTestLevel(2)], saveStore: new MemorySaveStore(), seed: 3 })
    game.startGame(1)
    const internals = getGameInternals(game)
    const enemy = internals.enemies[0]

    expect(internals.getAiShotTargetCell(enemy)).toEqual({ x: 6, y: 12 })

    internals.visionMemory.enemy.player = {
      id: 'player',
      side: 'player',
      team: 'blue',
      col: 4,
      row: 8,
      seenAt: 0,
    }

    expect(internals.getAiShotTargetCell(enemy)).toBeNull()
  })

  it('applies direct player shell damage and hostile-only shrapnel splash', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    const internals = getGameInternals(game)
    const direct = makeTankAt('direct', 4, 10, 'enemy', 'red', 2)
    const shrapnel = makeTankAt('shrapnel', 5, 10, 'enemy', 'red', 2)
    const ally = makeTankAt('ally', 3, 10, 'player', 'blue', 2)
    internals.enemies = [direct, shrapnel, ally]
    internals.bullets = [{
      id: 'splash-test',
      owner: 'player',
      ownerId: 'player',
      side: 'player',
      team: 'blue',
      x: direct.x + 9,
      y: direct.y + 9,
      dir: 'up',
      speed: 0,
      damage: 2,
      ttl: 1,
      splashDamage: 1,
      splashRadius: 40,
    }]

    step(game, 0.02)
    const snapshot = game.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.id === 'direct')).toBe(false)
    expect(snapshot.enemies.find((enemy) => enemy.id === 'shrapnel')).toMatchObject({ hp: 1 })
    expect(snapshot.enemies.find((enemy) => enemy.id === 'ally')).toMatchObject({ hp: 2 })
    expect(snapshot.runStats).toMatchObject({ tankHits: 1, shrapnelHits: 1, playerKills: 1 })
  })

  it('adds small movement and solid-impact feedback only as local feel polish', () => {
    const steelLevel = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.....S.......',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: steelLevel,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.02)
    expect(game.getSnapshot().player.moving).toBe(true)
    expect(game.getSnapshot().feedback.shake).toBe(0)
    expect(game.getRenderState().particles.length).toBeGreaterThan(0)

    game.setInput({ right: false })
    step(game, 0.36)
    game.setInput({ up: true })
    step(game, 0.03)
    game.setInput({ up: false })
    step(game, 0.36)
    expect(game.getSnapshot().player).toMatchObject({ col: 5, row: 10 })

    game.primaryAction()
    step(game, 0.02)

    const hit = game.getSnapshot()
    expect(hit.bullets).toHaveLength(0)
    expect(hit.feedback.shake).toBeGreaterThan(0)
    expect(game.getTile(5, 9)?.kind).toBe('steel')
  })

  it('updates pause helper copy for the selected paused action', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.togglePause()
    expect(game.getSnapshot().menu.helper[0]).toContain('Select Resume to return')

    game.navigateMenu(1)
    expect(game.getSnapshot().menu.helper[0]).toContain('Select Save And Quit')
    expect(game.getSnapshot().menu.helper[0]).toContain('Continue resumes here')

    game.navigateMenu(1)
    expect(game.getSnapshot().menu.helper[0]).toContain('Select Restart')
    expect(game.getSnapshot().menu.helper[0]).toContain('unsaved progress is discarded')

    game.setTouchControlsVisible(true)
    expect(game.getSnapshot().menu.helper[0]).toContain('Tap Restart')
  })

  it('exposes held touch buttons for visual feedback without changing input ownership', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setTouchControlsVisible(true)
    game.setButton('up', true)
    game.setButton('fire', true)

    expect(game.getSnapshot().feedback).toMatchObject({
      touchControlsVisible: true,
      heldButtons: {
        up: true,
        right: false,
        down: false,
        left: false,
        fire: true,
        relay: false,
      },
    })

    game.setButton('fire', false)
    expect(game.getSnapshot().feedback.heldButtons).toMatchObject({ up: true, fire: false })

    game.releaseControls()
    expect(game.getSnapshot().feedback.heldButtons).toMatchObject({
      up: false,
      right: false,
      down: false,
      left: false,
      fire: false,
      relay: false,
    })
  })

  it('surfaces Encyclopedia topics, controls, and recovery copy in state text', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    game.navigateMenu(5)
    pressMenu(game)

    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('encyclopedia')
    expect(snapshot.menu.title).toBe('Encyclopedia')
    expect(snapshot.menu.options).toEqual([
      'Overview',
      'Controls',
      'Tanks',
      'Objectives',
      'Equipment',
      'Terrain',
      'Back',
    ])
    expect(snapshot.menu.helper.join(' ')).toContain('top-down tank campaign')

    game.navigateMenu(1)
    snapshot = game.getSnapshot()
    expect(snapshot.menu.helper.join(' ')).toContain('Move with WASD/Arrows')
    expect(snapshot.menu.helper.join(' ')).toContain('keys 1-5 place gear')
    expect(snapshot.menu.helper.join(' ')).toContain('P opens pause for Save And Quit or Restart')

    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.menu.title).toBe('Controls')
    expect(snapshot.menu.options).toEqual(['Back'])
    expect(snapshot.encyclopedia).toMatchObject({
      activeTopic: 'controls',
      title: 'Controls',
    })
    expect(snapshot.encyclopedia?.entries.map((entry) => entry.visual)).toEqual([
      'controls',
      'player-tank',
      'portable-relay',
      'mine',
      'controls',
    ])
    expect(snapshot.encyclopedia?.entries.map((entry) => entry.label)).toContain('Pause')
    expect(snapshot.encyclopedia?.entries.map((entry) => entry.description).join(' ')).toContain('Esc backs out')

    let stateText = JSON.parse(game.renderText())
    expect(stateText.readableText).toMatchObject({
      screen: 'encyclopedia',
      title: 'Controls',
      encyclopedia: {
        activeTopic: 'controls',
      },
    })
    expect(stateText.readableText.menuOptions).toEqual(['Back'])
    expect(stateText.readableText.encyclopedia.entries.join(' ')).toContain('portable-relay')

    game.back()
    snapshot = game.getSnapshot()
    expect(snapshot.menu.title).toBe('Encyclopedia')
    expect(snapshot.menu.selectedIndex).toBe(1)

    const topicCopyChecks: Array<[number, string, string, string]> = [
      [2, 'Tanks', 'armored-tank', 'armor, cannon, engine'],
      [3, 'Objectives', 'ctf-flag', 'Defense protects the eagle base'],
      [4, 'Equipment', 'repair', 'Relays and retranslators improve sight'],
      [5, 'Terrain', 'ammo', 'Ammo stations recharge shells'],
    ]

    for (const [index, topic, expectedVisual, expectedCopy] of topicCopyChecks) {
      game.selectMenuIndex(index)
      snapshot = game.getSnapshot()
      expect(snapshot.menu.options[snapshot.menu.selectedIndex]).toBe(topic)
      expect(snapshot.menu.helper.join(' ')).toContain(expectedCopy)
      pressMenu(game)
      snapshot = game.getSnapshot()
      expect(snapshot.menu.title).toBe(topic)
      expect(snapshot.encyclopedia?.entries.some((entry) => entry.visual === expectedVisual)).toBe(true)
      game.back()
    }

    stateText = JSON.parse(game.renderText())
    expect(stateText.readableText).toMatchObject({
      screen: 'encyclopedia',
      title: 'Encyclopedia',
    })
    expect(stateText.readableText.menuOptions).toContain('Objectives')
    expect(stateText.onboarding).toMatchObject({
      firstLevel: true,
      objective: 'Objective: protect the eagle base and clear all 6 enemies.',
      controls: 'Controls: WASD/Arrows move, Space fires, Hold E relays, P pauses.',
      recovery: 'Recovery: Pause offers Save And Quit or Restart; Esc backs out before launch.',
    })

    game.back()
    expect(game.getSnapshot().mode).toBe('main-menu')

    game.navigateMenu(5)
    pressMenu(game)
    game.navigateMenu(6)
    pressMenu(game)
    expect(game.getSnapshot().mode).toBe('main-menu')
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
    expect(game.getSnapshot().menu.helper).toEqual([
      'Test briefing 1',
      'Objective: protect the eagle base and clear all 1 enemy.',
      'Controls: WASD/Arrows move, Space fires, Hold E relays, P pauses.',
    ])
    expect(game.getSnapshot().onboarding).toMatchObject({
      objective: 'Objective: protect the eagle base and clear all 1 enemy.',
      controls: 'Controls: WASD/Arrows move, Space fires, Hold E relays, P pauses.',
      recovery: 'Recovery: Pause offers Save And Quit or Restart; Esc backs out before launch.',
    })

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
    expect(snapshot.menu.helper).toContain('Esc returns to briefing before the fight starts.')
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
    const internals = getGameInternals(game)
    const snapshot = game.getSnapshot()

    expect(snapshot.objective.mode).toBe('team-battle')
    expect(internals.enemies.some((tank) => tank.side === 'player')).toBe(true)
    expect(internals.enemies.some((tank) => tank.side === 'enemy')).toBe(true)
  })

  it('spawns team-based missions with a durable teammate squad', () => {
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [makeTeamBattleLevel()], saveStore: new MemorySaveStore() })

    game.startGame(1)
    const internals = getGameInternals(game)
    const snapshot = game.getSnapshot()
    const teammates = internals.enemies.filter((tank) => tank.side === 'player')

    expect(teammates).toHaveLength(2)
    expect(teammates.every((tank) => tank.hp === 3 && tank.maxHp === 3)).toBe(true)
    expect(internals.enemies.filter((tank) => tank.side === 'enemy')).toHaveLength(1)
    expect(snapshot.enemiesRemaining).toBe(1)
  })

  it('respawns killed teammates without spending enemy tickets or awarding player rewards', () => {
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [makeTeamBattleLevel()], saveStore: new MemorySaveStore() })
    game.startGame(1)
    const internals = getGameInternals(game)
    const teammate = internals.enemies.find((tank) => tank.side === 'player')

    expect(teammate).toBeDefined()
    if (!teammate) return

    internals.destroyEnemy(teammate, {
      id: 'enemy-shot',
      owner: 'enemy',
      ownerId: 'enemy-test',
      side: 'enemy',
      team: 'red',
      x: teammate.x,
      y: teammate.y,
      dir: 'up',
      speed: 0,
      damage: 3,
      ttl: 1,
    })

    let snapshot = game.getSnapshot()
    expect(internals.enemies.filter((tank) => tank.side === 'player')).toHaveLength(1)
    expect(snapshot.enemiesRemaining).toBe(1)
    expect(snapshot.score).toBe(0)
    expect(snapshot.runStats.playerKills).toBe(0)
    expect(internals.friendlyRespawnTimer).toBeGreaterThan(0)

    step(game, 0.49)
    expect(internals.enemies.filter((tank) => tank.side === 'player')).toHaveLength(1)

    step(game, 0.08)
    snapshot = game.getSnapshot()
    const teammates = internals.enemies.filter((tank) => tank.side === 'player')
    expect(teammates).toHaveLength(2)
    expect(teammates.some((tank) => tank.id !== teammate.id && tank.hp === 3 && tank.maxHp === 3)).toBe(true)
    expect(snapshot.enemiesRemaining).toBe(1)
    expect(snapshot.score).toBe(0)
  })

  it('preserves pending teammate respawns through save and continue', () => {
    const store = new MemorySaveStore()
    const levels = [makeTeamBattleLevel(), makeTestLevel(2)]
    const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: levels, saveStore: store })
    game.startGame(1)
    const internals = getGameInternals(game)
    const teammate = internals.enemies.find((tank) => tank.side === 'player')

    expect(teammate).toBeDefined()
    if (!teammate) return

    internals.destroyEnemy(teammate, {
      id: 'save-respawn-shot',
      owner: 'enemy',
      ownerId: 'enemy-test',
      side: 'enemy',
      team: 'red',
      x: teammate.x,
      y: teammate.y,
      dir: 'up',
      speed: 0,
      damage: 3,
      ttl: 1,
    })
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ aiEnabled: false, levelDefinitions: levels, saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    const reloadedInternals = getGameInternals(reloaded)
    expect(reloadedInternals.enemies.filter((tank) => tank.side === 'player')).toHaveLength(1)

    step(reloaded, 0.58)
    expect(reloadedInternals.enemies.filter((tank) => tank.side === 'player')).toHaveLength(2)
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
    step(reloaded, 0.4)
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
    const target = getGameInternals(game).enemies[0]
    target.hp = 2
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
        assault: { cell: { x: 5, y: 10 }, hp: 4 },
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

    step(game, 1.65)
    game.primaryAction()
    step(game, 0.2)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.objective.assault?.hp).toBe(0)
    expect(snapshot.results?.stats.assaultDamage).toBe(4)
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
      playerSpawn: { x: 4, y: 2 },
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
    step(game, 1.45)

    const internals = getGameInternals(game)
    expect(internals.bullets.some((bullet) => bullet.team === game.getSnapshot().team.enemy && bullet.dir === 'down')).toBe(true)
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

    expect(target).toEqual({ x: 6, y: 0 })
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
        x: ARENA_X + 5 * TILE_SIZE + 13,
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
        x: ARENA_X + 6 * TILE_SIZE + 13,
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
        x: ARENA_X + 6 * TILE_SIZE + 13,
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

  it('accepts viewport-sized and larger uniform maps with new prop tile kinds', () => {
    const largerRows = Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS))
    largerRows[2] = `${'.'.repeat(4)}R=D${'.'.repeat(CAMPAIGN_MAP_COLS - 7)}`
    largerRows[CAMPAIGN_MAP_ROWS - 1] = `${'.'.repeat(10)}E${'.'.repeat(10)}`

    const largerTiles = createTiles(largerRows)
    const viewportTiles = createTiles(EMPTY_LEVEL)

    expect(largerTiles).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(largerTiles[0]).toHaveLength(CAMPAIGN_MAP_COLS)
    expect(viewportTiles).toHaveLength(13)
    expect(viewportTiles[0]).toHaveLength(13)
    expect(largerTiles[2][4]).toMatchObject({ kind: 'radio', hp: 3 })
    expect(largerTiles[2][5]).toMatchObject({ kind: 'road', hp: 0 })
    expect(largerTiles[2][6]).toMatchObject({ kind: 'depot', hp: 2 })
  })

  it('reports dynamic map dimensions and clamps offline camera on large and viewport-sized maps', () => {
    const largeRows = Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS))
    largeRows[CAMPAIGN_MAP_ROWS - 1] = `${'.'.repeat(10)}E${'.'.repeat(10)}`
    const largeGame = new TanchikiGame({
      aiEnabled: false,
      levelRows: largeRows,
      playerSpawn: { x: 18, y: 14 },
      enemyTotal: 0,
      saveStore: new MemorySaveStore(),
    })

    largeGame.startGame()
    let snapshot = largeGame.getSnapshot()
    expect(snapshot.map).toMatchObject({ cols: CAMPAIGN_MAP_COLS, rows: CAMPAIGN_MAP_ROWS, viewportCols: 13, viewportRows: 13 })
    expect(snapshot.camera.current).toEqual({ col: 8, row: 4 })
    expect(snapshot.camera.target).toEqual({ col: 8, row: 4 })

    const viewportGame = new TanchikiGame({
      aiEnabled: false,
      levelRows: EMPTY_LEVEL,
      enemyTotal: 0,
      saveStore: new MemorySaveStore(),
    })
    viewportGame.startGame()
    snapshot = viewportGame.getSnapshot()
    expect(snapshot.map).toMatchObject({ cols: 13, rows: 13, viewportCols: 13, viewportRows: 13 })
    expect(snapshot.camera.current).toEqual({ col: 0, row: 0 })
    expect(snapshot.camera.target).toEqual({ col: 0, row: 0 })
  })

  it('moves across road tiles but blocks movement through radio towers and depots', () => {
    const rows = [...EMPTY_LEVEL]
    rows[11] = '....=RD......'
    const game = new TanchikiGame({
      aiEnabled: false,
      levelRows: rows,
      playerSpawn: { x: 3, y: 11 },
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.4)
    expect(game.getSnapshot().player).toMatchObject({ col: 4, row: 11 })

    step(game, 0.4)
    game.setInput({ right: false })
    expect(game.getSnapshot().player).toMatchObject({ col: 4, row: 11 })
  })

  it('damages and destroys radio towers and depots without changing brick metrics or rewards', () => {
    const rows = [...EMPTY_LEVEL]
    rows[5] = '......RD.....'
    const level = makeTestLevel(1, { credits: 0, xp: 0, score: 0 })
    level.rows = rows
    const store = new MemorySaveStore({
      ...createDefaultSaveData(),
      resumableRun: savedRunWithBullets(level, [
        {
          id: 'radio-hit-1',
          owner: 'player',
          ownerId: 'player',
          side: 'player',
          team: 'blue',
          x: ARENA_X + 6 * TILE_SIZE + 13,
          y: 16 + 5 * 32 + 13,
          dir: 'right',
          speed: 0,
          damage: 1,
          ttl: 2.4,
        },
        {
          id: 'depot-hit-1',
          owner: 'player',
          ownerId: 'player',
          side: 'player',
          team: 'blue',
          x: ARENA_X + 7 * TILE_SIZE + 13,
          y: 16 + 5 * 32 + 13,
          dir: 'right',
          speed: 0,
          damage: 2,
          ttl: 2.4,
        },
      ]),
    })
    const game = new TanchikiGame({ levelDefinitions: [level], saveStore: store })

    expect(game.continueSavedRun()).toBe(true)
    game.update(1 / 60)

    expect(game.getTile(6, 5)).toMatchObject({ kind: 'radio', hp: 2 })
    expect(game.getTile(7, 5)).toMatchObject({ kind: 'empty', hp: 0 })
    expect(game.getSnapshot().runStats.bricksDestroyed).toBe(0)
    expect(game.getSnapshot().runStats.rewards.killScore).toBe(0)
  })

  it('keeps off-viewport bullets and enemy spawns alive inside larger maps', () => {
    const rows = Array.from({ length: CAMPAIGN_MAP_ROWS }, () => '.'.repeat(CAMPAIGN_MAP_COLS))
    rows[CAMPAIGN_MAP_ROWS - 1] = `${'.'.repeat(10)}E${'.'.repeat(10)}`
    const level = makeTestLevel(1)
    level.rows = rows
    level.playerSpawn = { x: 8, y: 13 }
    level.enemySpawns = [{ x: 18, y: 2 }]
    level.enemyTotal = 1
    level.activeEnemyLimit = 1
    const store = new MemorySaveStore({
      ...createDefaultSaveData(),
      resumableRun: savedRunWithBullets(level, [
        {
          id: 'wide-map-bullet',
          owner: 'player',
          ownerId: 'player',
          side: 'player',
          team: 'blue',
          x: ARENA_X + 15 * TILE_SIZE,
          y: 16 + 8 * 32,
          dir: 'right',
          speed: 0,
          damage: 1,
          ttl: 2.4,
        },
      ]),
    })
    const game = new TanchikiGame({ levelDefinitions: [level], saveStore: store })

    expect(game.continueSavedRun()).toBe(true)
    game.update(1 / 60)
    expect(getGameInternals(game).bullets).toHaveLength(1)
    expect(game.getSnapshot().bullets).toHaveLength(0)

    game.startGame()
    game.update(1 / 60)
    expect(getGameInternals(game).enemies[0]).toMatchObject({ col: 18, row: 2 })
    expect(game.getSnapshot().enemies).toHaveLength(0)
  })

  it('keeps campaign spawns and objective cells valid for each mode', () => {
    for (const level of CAMPAIGN_LEVELS) {
      expect(level.rows).toHaveLength(CAMPAIGN_MAP_ROWS)
      expect(level.rows.every((row) => row.length === CAMPAIGN_MAP_COLS)).toBe(true)

      const tiles = createTiles(level.rows)
      const terrain = tiles.flat().reduce(
        (counts, tile) => {
          if (tile.kind === 'radio' || tile.kind === 'depot' || tile.kind === 'road' || tile.kind === 'ammo') {
            counts[tile.kind] += 1
          }
          return counts
        },
        { radio: 0, depot: 0, road: 0, ammo: 0 },
      )
      const base = level.rows
        .flatMap((row, rowIndex) => [...row].map((char, colIndex) => ({ char, col: colIndex, row: rowIndex })))
        .find((cell) => cell.char === 'E')

      expect(terrain.radio).toBeGreaterThan(0)
      expect(terrain.depot).toBeGreaterThan(0)
      expect(terrain.road).toBeGreaterThan(0)
      expect(terrain.ammo).toBe(2)

      expectEscapableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, level.playerSpawn.x, level.playerSpawn.y)
      for (const spawn of level.enemySpawns) {
        expectEscapableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }
      for (const spawn of level.objective.friendlySpawns ?? []) {
        expectEscapableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }
      for (const spawn of level.objective.neutralSpawns ?? []) {
        expectEscapableSpawn({ getTile: (col: number, row: number) => tiles[row]?.[col] }, spawn.x, spawn.y)
      }

      if (level.objective.mode === 'team-battle' || level.objective.mode === 'ctf' || level.objective.mode === 'assault') {
        expect(level.objective.friendlyTotal).toBeGreaterThanOrEqual(2)
        expect(level.objective.friendlySpawns?.length ?? 0).toBeGreaterThanOrEqual(2)
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
