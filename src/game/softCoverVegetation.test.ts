import { describe, expect, it } from 'vitest'
import { ARENA_X, ARENA_Y, TILE_SIZE } from './constants.ts'
import { BATTLEFIELD_PROP_CATEGORIES, getBattlefieldPropDefinition, validateBattlefieldPropInstances } from './battlefieldProps.ts'
import { TanchikiGame } from './game.ts'
import {
  CAMPAIGN_MAP_COLS,
  CAMPAIGN_MAP_ROWS,
  SOFT_COVER_VEGETATION_TEST_LEVEL,
  SOFT_COVER_VEGETATION_TEST_LEVEL_ID,
  SOFT_COVER_VEGETATION_TEST_LEVEL_SLUG,
  createTiles,
} from './level.ts'
import { MemorySaveStore } from './save.ts'
import {
  SOFT_COVER_DISTURBANCE_TTL_SECONDS,
  SOFT_COVER_REVEAL_DURATION_SECONDS,
  getSoftCoverDisturbanceStrength,
  getSoftCoverPropIds,
  isSoftCoverPropDefinition,
} from './softCoverVegetation.ts'
import type {
  BattlefieldPropInstance,
  Direction,
  LevelDefinition,
  Tank,
  TerrainEvidenceKind,
  TileKind,
} from './types.ts'

type SoftCoverGameInternals = {
  enemies: Tank[]
  player: Tank
  startMove: (tank: Tank, direction: Direction) => boolean
  addTerrainEvidence: (
    kind: TerrainEvidenceKind,
    tank: Tank,
    col: number,
    row: number,
    dir: Direction | undefined,
    ttl: number,
    strength: number,
    label: string,
    sourceSurface?: TileKind,
  ) => void
}

const EMPTY_ROWS = [
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

function makeSoftCoverLevel(props: BattlefieldPropInstance[], overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 9104,
    name: 'Soft Cover Unit',
    briefing: 'Unit test soft cover map.',
    objective: {
      mode: 'defense',
      label: 'Soft Cover',
      briefing: 'Exercise soft-cover props.',
      winCondition: 'Unit test only.',
    },
    rows: EMPTY_ROWS,
    props,
    playerSpawn: { x: 2, y: 2 },
    enemySpawns: [{ x: 10, y: 10 }],
    enemyTotal: 1,
    activeEnemyLimit: 0,
    spawnInterval: 99,
    roleWeights: { base_attacker: 0.2, hunter: 0.6, wall_breaker: 0.2 },
    armoredEnemyRatio: 0,
    rewards: { credits: 0, xp: 0, score: 0 },
    ...overrides,
  }
}

function startLevel(level: LevelDefinition) {
  const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })
  game.startGame(level.id)
  return game
}

function internalsOf(game: TanchikiGame) {
  return game as unknown as SoftCoverGameInternals
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function stepUntilSettled(game: TanchikiGame, tank: Tank, maxSeconds = 3) {
  const frames = Math.ceil(maxSeconds * 60)
  for (let index = 0; index < frames; index += 1) {
    if (!tank.move) {
      return
    }
    game.update(1 / 60)
  }
  expect(tank.move).toBeNull()
}

function makeEnemyAt(id: string, col: number, row: number): Tank {
  return {
    id,
    faction: 'enemy',
    classId: null,
    side: 'enemy',
    team: 'red',
    role: 'hunter',
    col,
    row,
    x: ARENA_X + col * TILE_SIZE + 3,
    y: ARENA_Y + row * TILE_SIZE + 3,
    dir: 'down',
    hp: 2,
    maxHp: 2,
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
    bulwarkRemaining: 0,
    bulwarkCapacity: 0,
    bulwarkCooldown: 0,
    traverseRemaining: 0,
    traverseCooldown: 0,
    move: null,
    path: [],
  }
}

describe('soft-cover vegetation manifest source', () => {
  it('identifies soft-cover vegetation from the manifest category and role', () => {
    expect(BATTLEFIELD_PROP_CATEGORIES).toContain('soft_cover_vegetation')
    expect(getSoftCoverPropIds()).toEqual(['bush', 'dry_bush', 'reeds_cluster', 'snow_bush'])

    for (const spriteId of getSoftCoverPropIds()) {
      const definition = getBattlefieldPropDefinition(spriteId)
      expect(isSoftCoverPropDefinition(definition), `${spriteId} should be soft cover`).toBe(true)
      expect(definition?.category).toBe('soft_cover_vegetation')
      expect(definition?.mechanicalRole).toBe('soft_cover')
    }

    expect(isSoftCoverPropDefinition(getBattlefieldPropDefinition('tree_small'))).toBe(false)
  })

  it('scales vegetation disturbance by tank class without requiring a class', () => {
    expect(getSoftCoverDisturbanceStrength(null, 'bush', 'movement')).toBe(1)
    expect(getSoftCoverDisturbanceStrength('scout', 'bush', 'movement')).toBeLessThan(1)
    expect(getSoftCoverDisturbanceStrength('battle', 'bush', 'movement')).toBeGreaterThan(1)
    expect(getSoftCoverDisturbanceStrength('battle', 'dry_bush', 'firing')).toBeGreaterThan(
      getSoftCoverDisturbanceStrength('battle', 'dry_bush', 'movement'),
    )
  })
})

describe('soft-cover vegetation mechanics', () => {
  it('gives a stationary tank soft-cover concealment metadata', () => {
    const level = makeSoftCoverLevel([{ id: 'unit-bush', spriteId: 'bush', x: 2, y: 2 }])
    const game = startLevel(level)
    const snapshot = game.getSnapshot()

    expect(snapshot.softCover.supportedPropIds).toEqual(['bush', 'dry_bush', 'reeds_cluster', 'snow_bush'])
    expect(snapshot.softCover.active).toContainEqual(expect.objectContaining({
      tankId: 'player',
      propId: 'unit-bush',
      spriteId: 'bush',
      concealed: true,
      moving: false,
      multiplier: 0.68,
    }))
  })

  it('does not apply concealment to non-soft-cover props', () => {
    const level = makeSoftCoverLevel([{ id: 'unit-tree', spriteId: 'tree_small', x: 2, y: 2 }])
    const game = startLevel(level)

    expect(game.getSnapshot().softCover.active).toHaveLength(0)
  })

  it('uses soft cover to hide stationary hostile tanks at normal vision distance', () => {
    const level = makeSoftCoverLevel([{ id: 'enemy-bush', spriteId: 'bush', x: 4, y: 2 }])
    const game = startLevel(level)
    internalsOf(game).enemies.push(makeEnemyAt('hidden-bush-enemy', 4, 2))

    expect(game.getSnapshot().enemies.map((enemy) => enemy.id)).not.toContain('hidden-bush-enemy')
  })

  it('keeps sound and terrain evidence directional when soft cover conceals a tank on a visible tile', () => {
    const level = makeSoftCoverLevel([{ id: 'enemy-bush', spriteId: 'bush', x: 4, y: 2 }])
    const game = startLevel(level)
    const internals = internalsOf(game)
    const enemy = makeEnemyAt('hidden-bush-enemy', 4, 2)
    internals.enemies.push(enemy)

    expect(game.getSnapshot().vision.visibleCells).toContainEqual({ col: 4, row: 2 })
    expect(game.getSnapshot().enemies.map((candidate) => candidate.id)).not.toContain(enemy.id)

    internals.addTerrainEvidence('rustle', enemy, 4, 2, 'right', 1.9, 1.2, 'BUSH', 'reeds')
    const snapshot = game.getSnapshot()
    const evidence = snapshot.terrainEvidence.find((item) => item.kind === 'rustle')
    const cue = snapshot.hearing.cues.find((item) => item.kind === 'rustle')

    expect(evidence).toMatchObject({
      sourcePrecision: 'directional',
      audible: true,
    })
    expect(evidence).not.toMatchObject({ col: 4, row: 2 })
    expect(cue).toMatchObject({
      sourcePrecision: 'directional',
      direction: 'east',
    })
    expect(cue).not.toHaveProperty('source')
    expect(game.drainSoundEvents().at(-1)?.cue).toMatchObject({
      sourcePrecision: 'directional',
    })
  })

  it('creates movement rustle and disturbed vegetation when a tank enters soft cover', () => {
    const level = makeSoftCoverLevel([{ id: 'unit-bush', spriteId: 'bush', x: 3, y: 2 }])
    const game = startLevel(level)
    const internals = internalsOf(game)

    expect(internals.startMove(internals.player, 'right')).toBe(true)
    stepUntilSettled(game, internals.player)

    const snapshot = game.getSnapshot()
    expect(snapshot.softCover.disturbances).toContainEqual(expect.objectContaining({
      propId: 'unit-bush',
      spriteId: 'bush',
      reason: 'movement',
      label: 'BUSH',
    }))
    expect(snapshot.terrainEvidence).toContainEqual(expect.objectContaining({
      kind: 'rustle',
      col: 3,
      row: 2,
      label: 'BUSH',
    }))
  })

  it('suppresses concealment and creates stronger evidence when firing from soft cover', () => {
    const level = makeSoftCoverLevel([{ id: 'unit-bush', spriteId: 'bush', x: 2, y: 2 }])
    const game = startLevel(level)

    game.primaryAction()

    const snapshot = game.getSnapshot()
    expect(snapshot.softCover.active).toContainEqual(expect.objectContaining({
      tankId: 'player',
      propId: 'unit-bush',
      concealed: false,
      revealRemaining: SOFT_COVER_REVEAL_DURATION_SECONDS,
    }))
    expect(snapshot.softCover.disturbances).toContainEqual(expect.objectContaining({
      propId: 'unit-bush',
      reason: 'firing',
      label: 'COVER SHOT',
    }))
    expect(snapshot.terrainEvidence).toContainEqual(expect.objectContaining({
      kind: 'rustle',
      label: 'COVER SHOT',
    }))
  })

  it('expires disturbed vegetation deterministically', () => {
    const level = makeSoftCoverLevel([{ id: 'unit-bush', spriteId: 'bush', x: 3, y: 2 }])
    const game = startLevel(level)
    const internals = internalsOf(game)

    expect(internals.startMove(internals.player, 'right')).toBe(true)
    stepUntilSettled(game, internals.player)
    expect(game.getSnapshot().softCover.disturbances).toHaveLength(1)

    step(game, SOFT_COVER_DISTURBANCE_TTL_SECONDS + 0.1)
    expect(game.getSnapshot().softCover.disturbances).toHaveLength(0)
  })
})

describe('soft-cover vegetation dev route data', () => {
  it('keeps the test map rectangular and references only existing soft-cover props', () => {
    const level = SOFT_COVER_VEGETATION_TEST_LEVEL
    expect(SOFT_COVER_VEGETATION_TEST_LEVEL_SLUG).toBe('soft_cover_vegetation_test')
    expect(level.id).toBe(SOFT_COVER_VEGETATION_TEST_LEVEL_ID)
    expect(level.rows).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(level.rows.every((row) => row.length === CAMPAIGN_MAP_COLS)).toBe(true)
    expect(createTiles(level.rows)).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(validateBattlefieldPropInstances(level.props, CAMPAIGN_MAP_COLS, CAMPAIGN_MAP_ROWS)).toEqual([])
    expect(new Set(level.props?.map((prop) => prop.spriteId))).toEqual(new Set(getSoftCoverPropIds()))
  })
})
