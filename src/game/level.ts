import { GRID_COLS, GRID_ROWS } from './constants.ts'
import { terrainCharMap } from './terrain.ts'
import type { BattlefieldPropInstance, LevelDefinition, LevelObjective, RoadNeighbors, Tile, TileKind, Vec, WaterNeighbors } from './types.ts'

export const BASE_MAX_HP = 3
export const CAMPAIGN_MAP_COLS = 21
export const CAMPAIGN_MAP_ROWS = 17

const LEGACY_MAP_COLS = GRID_COLS
const LEGACY_MAP_ROWS = GRID_ROWS
const MAP_COLUMN_OFFSET = 4
const MAP_ROW_OFFSET = 2
const DEFAULT_CAMPAIGN_RETRANSLATORS: Vec[] = [
  { x: 10, y: 1 },
  { x: 10, y: 15 },
  { x: 1, y: 8 },
  { x: 19, y: 8 },
]

interface MapDecoration {
  x: number
  y: number
  char: string
}

const LEGACY_DEFAULT_LEVEL_ROWS = [
  '...B.B.B.B...',
  '.BB...B...BB.',
  '.B..SSS..B...',
  '.B.B...B.B.B.',
  '...B.W.B.....',
  'BB...W...B.BB',
  '...SSW..SS...',
  'BB.B.W.B...BB',
  '...B.W.B.....',
  '.B.B...B.B.B.',
  '.B..SSS..B...',
  '.BB..BB.BB...',
  '.....SES.....',
]

const LEGACY_DEFAULT_PLAYER_SPAWN: Vec = {
  x: 4,
  y: 11,
}

const LEGACY_DEFAULT_ENEMY_SPAWNS: Vec[] = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 12, y: 0 },
]

export const DEFAULT_LEVEL_ROWS = expandLevelRows(LEGACY_DEFAULT_LEVEL_ROWS, [
  ...horizontalRoad(1, 5, 15),
  ...horizontalRoad(15, 5, 15),
  { x: 6, y: 15, char: 'A' },
  { x: 14, y: 1, char: 'A' },
  { x: 2, y: 1, char: 'R' },
  { x: 18, y: 1, char: 'D' },
  { x: 2, y: 15, char: 'D' },
  { x: 18, y: 15, char: 'R' },
])

export const DEFAULT_PLAYER_SPAWN: Vec = shiftCampaignCell(LEGACY_DEFAULT_PLAYER_SPAWN)

export const DEFAULT_ENEMY_SPAWNS: Vec[] = shiftCampaignCells(LEGACY_DEFAULT_ENEMY_SPAWNS)
export const DEFAULT_RETRANSLATORS: Vec[] = DEFAULT_CAMPAIGN_RETRANSLATORS.map((point) => ({ ...point }))
export const TERRAIN_EVIDENCE_TEST_LEVEL_ID = 9002
export const TERRAIN_EVIDENCE_TEST_LEVEL_SLUG = 'terrain_evidence_test'
export const BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID = 9003
export const BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG = 'battlefield_biomes_props'

export const DEFAULT_OBJECTIVE: LevelObjective = {
  mode: 'defense',
  label: 'Defense',
  briefing: 'Hold the eagle base and clear every hostile tank.',
  winCondition: 'Clear all enemy tanks before the base falls.',
}

const DEFENSE_OBJECTIVE: LevelObjective = DEFAULT_OBJECTIVE
const TEAM_BATTLE_OBJECTIVE: LevelObjective = {
  mode: 'team-battle',
  label: 'Team Battle',
  briefing: 'Fight with allied tanks and drain the opposing squad tickets.',
  winCondition: 'Destroy all enemy tickets while keeping yourself in the fight.',
  friendlySpawns: shiftCampaignCells([{ x: 3, y: 11 }, { x: 10, y: 11 }]),
  friendlyTotal: 2,
  targetScore: 0,
}
const CTF_OBJECTIVE: LevelObjective = {
  mode: 'ctf',
  label: 'Capture The Flag',
  briefing: 'Steal the enemy flag and bring it back to your base marker.',
  winCondition: 'Return the enemy flag once.',
  friendlySpawns: shiftCampaignCells([{ x: 3, y: 11 }, { x: 8, y: 11 }]),
  friendlyTotal: 2,
  flag: {
    playerBase: shiftCampaignCell({ x: 5, y: 11 }),
    enemyFlag: shiftCampaignCell({ x: 6, y: 0 }),
    capturesToWin: 1,
  },
}
const FFA_OBJECTIVE: LevelObjective = {
  mode: 'ffa',
  label: 'Free For All',
  briefing: 'Every tank is hostile. Score kills before the arena overwhelms you.',
  winCondition: 'Score three player kills.',
  neutralSpawns: shiftCampaignCells([{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 5 }, { x: 12, y: 5 }]),
  neutralTotal: 7,
  targetScore: 3,
}
const ASSAULT_OBJECTIVE: LevelObjective = {
  mode: 'assault',
  label: 'Assault',
  briefing: 'Push into the bunker and destroy the enemy command core.',
  winCondition: 'Destroy the command core before your lives run out.',
  friendlySpawns: shiftCampaignCells([{ x: 4, y: 11 }, { x: 8, y: 11 }]),
  friendlyTotal: 2,
  assault: {
    cell: shiftCampaignCell({ x: 5, y: 0 }),
    hp: 4,
  },
}

export const TERRAIN_EVIDENCE_TEST_LEVEL: LevelDefinition = {
  id: TERRAIN_EVIDENCE_TEST_LEVEL_ID,
  name: 'Terrain Evidence Test',
  briefing: 'Prototype proving ground for terrain evidence mechanics.',
  objective: {
    mode: 'defense',
    label: 'Prototype',
    briefing: 'Drive, fire, and observe terrain-created traces, sound markers, sliding, concealment, and ricochets.',
    winCondition: 'Manual test map: inspect terrain evidence behavior in open lanes, chambers, and blocked corridors.',
  },
  rows: [
    '.....................',
    '..nnn...sss...ggg....',
    '..nnn...sss...ggg....',
    '.....................',
    '..ddd...mmm...rrr....',
    '..ddd...mmm...rrr....',
    '..ddd...mmm...rrr....',
    '...........hhhh......',
    '..BBBBBBBBB...x......',
    '..Bhhhhhh.B...x......',
    '..BhBBBBh.B...x......',
    '..BhBhhBh.B...x......',
    '..BhB..Bh.B..BxB.....',
    '..Bhhhhhh.B..........',
    '..BB.BBBBBB..........',
    '....A..............E.',
    '.....................',
  ],
  playerSpawn: { x: 4, y: 14 },
  enemySpawns: [{ x: 8, y: 13 }],
  retranslators: [{ x: 4, y: 8 }, { x: 16, y: 8 }],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 99,
  roleWeights: { base_attacker: 0.25, hunter: 0.5, wall_breaker: 0.25 },
  armoredEnemyRatio: 0,
  rewards: { credits: 0, xp: 0, score: 0 },
}

const BATTLEFIELD_BIOME_PROPS: BattlefieldPropInstance[] = [
  { id: 'qa-tree-small', spriteId: 'tree_small', x: 4, y: 4 },
  { id: 'qa-tree-large', spriteId: 'tree_large', x: 5, y: 4 },
  { id: 'qa-pine', spriteId: 'pine', x: 6, y: 4 },
  { id: 'qa-palm', spriteId: 'palm', x: 7, y: 4 },
  { id: 'qa-stump', spriteId: 'stump', x: 8, y: 4 },
  { id: 'qa-log-h', spriteId: 'fallen_log_horizontal', x: 9, y: 4 },
  { id: 'qa-log-v', spriteId: 'fallen_log_vertical', x: 10, y: 4, rotation: 90 },
  { id: 'qa-rock-small', spriteId: 'rock_small', x: 11, y: 4 },
  { id: 'qa-rock-large', spriteId: 'rock_large', x: 12, y: 4 },
  { id: 'qa-reeds', spriteId: 'reeds_cluster', x: 13, y: 4 },
  { id: 'qa-bush', spriteId: 'bush', x: 14, y: 4 },
  { id: 'qa-dry-bush', spriteId: 'dry_bush', x: 15, y: 4 },
  { id: 'qa-snow-bush', spriteId: 'snow_bush', x: 16, y: 4 },
  { id: 'qa-crate-wood', spriteId: 'crate_wood', x: 4, y: 6 },
  { id: 'qa-crate-metal', spriteId: 'crate_metal', x: 5, y: 6 },
  { id: 'qa-fuel-barrel', spriteId: 'fuel_barrel', x: 6, y: 6 },
  { id: 'qa-sandbags', spriteId: 'sandbags', x: 7, y: 6 },
  { id: 'qa-barbed-wire', spriteId: 'barbed_wire', x: 8, y: 6 },
  { id: 'qa-tank-wreck', spriteId: 'tank_wreck', x: 9, y: 6 },
  { id: 'qa-broken-turret', spriteId: 'broken_turret', x: 10, y: 6 },
  { id: 'qa-crater-small', spriteId: 'crater_small', x: 11, y: 6 },
  { id: 'qa-crater-large', spriteId: 'crater_large', x: 12, y: 6 },
  { id: 'qa-rubble', spriteId: 'rubble_pile', x: 13, y: 6 },
  { id: 'qa-roadblock', spriteId: 'roadblock', x: 14, y: 6 },
  { id: 'qa-hedgehog', spriteId: 'czech_hedgehog', x: 15, y: 6 },
  { id: 'qa-relay-tower', spriteId: 'relay_tower', x: 5, y: 10 },
  { id: 'qa-portable-relay', spriteId: 'portable_relay', x: 6, y: 10 },
  { id: 'qa-broken-relay', spriteId: 'broken_relay', x: 7, y: 10 },
  { id: 'qa-antenna-mast', spriteId: 'antenna_mast', x: 8, y: 10 },
  { id: 'qa-generator', spriteId: 'generator', x: 9, y: 10 },
  { id: 'qa-emp-emitter', spriteId: 'emp_emitter', x: 10, y: 10 },
  { id: 'qa-signal-jammer', spriteId: 'signal_jammer', x: 11, y: 10 },
  { id: 'qa-field-lamp', spriteId: 'field_lamp', x: 12, y: 10 },
  { id: 'qa-warning-sign', spriteId: 'warning_sign', x: 13, y: 10 },
]

export const BATTLEFIELD_BIOME_PROPS_TEST_LEVEL: LevelDefinition = {
  id: BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID,
  name: 'Battlefield Biome Props Test',
  briefing: 'Visual QA board for biome props, infrastructure, cover, debris, and non-mechanical decorations.',
  biome: 'temperate',
  objective: {
    mode: 'defense',
    label: 'Biome Props',
    briefing: 'Inspect placeholder prop taxonomy and layering across biome bands.',
    winCondition: 'Manual test map: verify all prop categories stay readable without final art.',
  },
  rows: [
    '.....................',
    '....===...===...===..',
    '....nnn...sss...ggg..',
    '....nnn...sss...ggg..',
    '....nnn...sss...ggg..',
    '....ddd...mmm...rrr..',
    '....ddd...mmm...rrr..',
    '....ddd...mmm...rrr..',
    '....===.........===..',
    '....BBB...SSS...BBB..',
    '....BBB...SSS...BBB..',
    '....hhh...xxx...hhh..',
    '....hhh...xxx...hhh..',
    '.....................',
    '..........E..........',
    '.....................',
    '.....................',
  ],
  props: BATTLEFIELD_BIOME_PROPS,
  playerSpawn: { x: 10, y: 8 },
  enemySpawns: [{ x: 18, y: 2 }],
  retranslators: [{ x: 4, y: 11 }, { x: 16, y: 11 }],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 99,
  roleWeights: { base_attacker: 0.25, hunter: 0.5, wall_breaker: 0.25 },
  armoredEnemyRatio: 0,
  rewards: { credits: 0, xp: 0, score: 0 },
}

export const CAMPAIGN_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Outer Blocks',
    briefing: 'Mode: Defense. Protect the eagle base while you learn the lanes; clear the first probe to win.',
    objective: DEFENSE_OBJECTIVE,
    rows: DEFAULT_LEVEL_ROWS,
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 6,
    activeEnemyLimit: 2,
    spawnInterval: 3.2,
    roleWeights: { base_attacker: 0.64, hunter: 0.28, wall_breaker: 0.08 },
    armoredEnemyRatio: 0.08,
    rewards: { credits: 90, xp: 50, score: 450 },
  },
  {
    id: 2,
    name: 'Squad Lanes',
    briefing: 'Mode: Team Battle. Allied tanks hold the lower lanes while enemies push through the split river.',
    objective: TEAM_BATTLE_OBJECTIVE,
    rows: expandLevelRows([
      '...B...B.....',
      '.BB.B.B.B.BB.',
      '.....W.W.....',
      'BBB..W.W..BBB',
      '.....W.W.....',
      '.B.B.W.W.B.B.',
      '...SS.SSS....',
      '.B.B.W.W.B.B.',
      '.....W.W.....',
      'BBB..W.W..BBB',
      '.....S.S.....',
      '.BB...B.BB...',
      '.....SES.....',
    ], levelDecorations(2)),
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 8,
    activeEnemyLimit: 3,
    spawnInterval: 2.95,
    roleWeights: { base_attacker: 0.52, hunter: 0.36, wall_breaker: 0.12 },
    armoredEnemyRatio: 0.16,
    rewards: { credits: 105, xp: 60, score: 600 },
  },
  {
    id: 3,
    name: 'Flag Brickworks',
    briefing: 'Mode: Capture The Flag. Break through the brickworks, steal the flag, and return home.',
    objective: CTF_OBJECTIVE,
    rows: expandLevelRows([
      '.B.B..F..B.B.',
      'B...B...B...B',
      '.BBB.B.B.BBB.',
      '.....S.S.....',
      'BBB.B...B.BBB',
      '...B.W.W.B...',
      '.S...W.W...S.',
      '...B.W.W.B...',
      'BBB.B...B.BBB',
      '.....S.S.....',
      '.BBB...BBB...',
      'B.....B...B..',
      '.....SES.....',
    ], levelDecorations(3)),
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 10,
    activeEnemyLimit: 3,
    spawnInterval: 2.7,
    roleWeights: { base_attacker: 0.44, hunter: 0.3, wall_breaker: 0.26 },
    armoredEnemyRatio: 0.22,
    rewards: { credits: 120, xp: 75, score: 780 },
  },
  {
    id: 4,
    name: 'Crossfire Freehold',
    briefing: 'Mode: Free For All. Open firing lanes punish hesitation; every tank is a threat.',
    objective: FFA_OBJECTIVE,
    rows: expandLevelRows([
      '.....B.B.....',
      '.SS..B.B..SS.',
      '.....B.B.....',
      'BBB.......BBB',
      '...S.WWW.S...',
      '.............',
      'BB.B.S.S.B.BB',
      '.............',
      '...S.WWW.S...',
      'BBB.......BBB',
      '.....B.B.....',
      '.SS..BBB..SS.',
      '.....SES.....',
    ], levelDecorations(4)),
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 7,
    activeEnemyLimit: 4,
    spawnInterval: 2.45,
    roleWeights: { base_attacker: 0.38, hunter: 0.43, wall_breaker: 0.19 },
    armoredEnemyRatio: 0.28,
    rewards: { credits: 140, xp: 90, score: 950 },
  },
  {
    id: 5,
    name: 'Steel Teeth',
    briefing: 'Mode: Assault. Steel bunkers guard an enemy command core at the top of the yard.',
    objective: ASSAULT_OBJECTIVE,
    rows: expandLevelRows([
      '..S.BEB.S....',
      '.B..S.S..B.B.',
      '...BS.SB.....',
      'BB...B...BBBB',
      '..S.WWW.S....',
      '....BBB......',
      '.SS.....SS...',
      '....BBB......',
      '..S.WWW.S....',
      'BBBB...B...BB',
      '.....S.SB....',
      '.B.B..B..B.B.',
      '.....SES.....',
    ], levelDecorations(5)),
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: shiftCampaignCells([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 2 }]),
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 12,
    activeEnemyLimit: 4,
    spawnInterval: 2.25,
    roleWeights: { base_attacker: 0.36, hunter: 0.42, wall_breaker: 0.22 },
    armoredEnemyRatio: 0.32,
    rewards: { credits: 165, xp: 110, score: 1120 },
  },
  {
    id: 6,
    name: 'River Flag Run',
    briefing: 'Mode: Capture The Flag. Rivers force a longer flag route and defenders watch the banks.',
    objective: {
      ...CTF_OBJECTIVE,
      flag: { playerBase: shiftCampaignCell({ x: 5, y: 11 }), enemyFlag: shiftCampaignCell({ x: 6, y: 0 }), capturesToWin: 2 },
      winCondition: 'Return the enemy flag twice.',
    },
    rows: expandLevelRows([
      '...B..F..B...',
      '.B.B.S.S.B.B.',
      '.....S.S.....',
      'BBB.......BBB',
      '...W.B.B.W...',
      '.B.W.....W.B.',
      '...WSS.SSW...',
      '.B.W.....W.B.',
      '...W.B.B.W...',
      'BBB.......BBB',
      '.......B.....',
      '.B....B..B...',
      '.....SES.....',
    ], levelDecorations(6)),
    playerSpawn: shiftCampaignCell({ x: 5, y: 11 }),
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 16,
    activeEnemyLimit: 4,
    spawnInterval: 2.1,
    roleWeights: { base_attacker: 0.44, hunter: 0.38, wall_breaker: 0.18 },
    armoredEnemyRatio: 0.36,
    rewards: { credits: 190, xp: 130, score: 1320 },
  },
  {
    id: 7,
    name: 'Hunter Net',
    briefing: 'Mode: Team Battle. Fast hunters pressure both flanks while allied tanks hold the net.',
    objective: {
      ...TEAM_BATTLE_OBJECTIVE,
      friendlySpawns: shiftCampaignCells([{ x: 2, y: 11 }, { x: 9, y: 11 }, { x: 6, y: 10 }]),
      friendlyTotal: 3,
    },
    rows: expandLevelRows([
      '.B...S...B...',
      '...B.S.B...B.',
      'B....S....B..',
      '.BBBB.BBBB...',
      '.....WWW.....',
      'BB.........BB',
      '...SS.SSS....',
      'BB.........BB',
      '.....WWW.....',
      '.BBBB.BBBB...',
      'B....S....B..',
      '...B..BB...B.',
      '.....SES.....',
    ], levelDecorations(7)),
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 18,
    activeEnemyLimit: 5,
    spawnInterval: 1.9,
    roleWeights: { base_attacker: 0.3, hunter: 0.5, wall_breaker: 0.2 },
    armoredEnemyRatio: 0.4,
    rewards: { credits: 225, xp: 155, score: 1600 },
  },
  {
    id: 8,
    name: 'Final Foundry',
    briefing: 'Mode: Assault. Crack the foundry core while heavy defenders counterattack from every lane.',
    objective: {
      ...ASSAULT_OBJECTIVE,
      briefing: 'Final assault: destroy the foundry core while defenders keep pressure on every lane.',
      assault: { cell: shiftCampaignCell({ x: 5, y: 0 }), hp: 6 },
    },
    rows: expandLevelRows([
      '..B.SES.B....',
      '.B..S.S..B.B.',
      'B...B.B...B..',
      '...BBB.BBB...',
      '.S.WWWWW.S...',
      'BB...B...BB..',
      '...SS.SSS....',
      'BB...B...BB..',
      '.S.WWWWW.S...',
      '...BBB.BBB...',
      'B.....B...B..',
      '.B....B..B.B.',
      '.....SES.....',
    ], levelDecorations(8)),
    playerSpawn: shiftCampaignCell({ x: 5, y: 11 }),
    enemySpawns: shiftCampaignCells([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 2 }]),
    retranslators: DEFAULT_RETRANSLATORS,
    enemyTotal: 20,
    activeEnemyLimit: 5,
    spawnInterval: 1.7,
    roleWeights: { base_attacker: 0.4, hunter: 0.34, wall_breaker: 0.26 },
    armoredEnemyRatio: 0.48,
    rewards: { credits: 280, xp: 205, score: 2200 },
  },
]

export function createTiles(rows = DEFAULT_LEVEL_ROWS): Tile[][] {
  if (rows.length < GRID_ROWS) {
    throw new Error(`Level must contain at least ${GRID_ROWS} rows`)
  }

  const expectedCols = rows[0]?.length ?? 0
  if (expectedCols < GRID_COLS) {
    throw new Error(`Level must contain at least ${GRID_COLS} columns`)
  }

  return rows.map((row, rowIndex) => {
    if (row.length !== expectedCols) {
      throw new Error(`Level row ${rowIndex} must contain ${expectedCols} columns`)
    }

    return [...row].map(tileFromChar)
  })
}

function tileFromChar(char: string): Tile {
  const kindByChar = terrainCharMap()
  const kind = kindByChar[char] ?? 'empty'

  return {
    kind,
    hp: kind === 'brick' || kind === 'depot' ? 2 : kind === 'radio' ? 3 : kind === 'base' ? BASE_MAX_HP : 0,
  }
}

function shiftCampaignCell(cell: Vec): Vec {
  return {
    x: cell.x + MAP_COLUMN_OFFSET,
    y: cell.y + MAP_ROW_OFFSET,
  }
}

function shiftCampaignCells(cells: Vec[]): Vec[] {
  return cells.map(shiftCampaignCell)
}

function expandLevelRows(rows: string[], decorations: MapDecoration[] = []): string[] {
  if (rows.length !== LEGACY_MAP_ROWS || rows.some((row) => row.length !== LEGACY_MAP_COLS)) {
    throw new Error(`Legacy level rows must be ${LEGACY_MAP_COLS}x${LEGACY_MAP_ROWS}`)
  }

  const expanded = Array.from({ length: CAMPAIGN_MAP_ROWS }, (_, row) => {
    if (row < MAP_ROW_OFFSET || row >= MAP_ROW_OFFSET + LEGACY_MAP_ROWS) {
      return '.'.repeat(CAMPAIGN_MAP_COLS)
    }

    return `${'.'.repeat(MAP_COLUMN_OFFSET)}${rows[row - MAP_ROW_OFFSET]}${'.'.repeat(CAMPAIGN_MAP_COLS - MAP_COLUMN_OFFSET - LEGACY_MAP_COLS)}`
  }).map((row) => [...row])

  for (const decoration of decorations) {
    if (
      decoration.x < 0 ||
      decoration.x >= CAMPAIGN_MAP_COLS ||
      decoration.y < 0 ||
      decoration.y >= CAMPAIGN_MAP_ROWS
    ) {
      continue
    }
    const row = expanded[decoration.y]
    if (row) {
      row[decoration.x] = decoration.char
    }
  }

  return expanded.map((row) => row.join(''))
}

function horizontalRoad(y: number, fromX: number, toX: number): MapDecoration[] {
  const decorations: MapDecoration[] = []
  for (let x = fromX; x <= toX; x += 1) {
    decorations.push({ x, y, char: '=' })
  }
  return decorations
}

function verticalRoad(x: number, fromY: number, toY: number): MapDecoration[] {
  const decorations: MapDecoration[] = []
  for (let y = fromY; y <= toY; y += 1) {
    decorations.push({ x, y, char: '=' })
  }
  return decorations
}

function levelDecorations(levelId: number): MapDecoration[] {
  const leftPropY = 3 + (levelId % 5)
  const rightPropY = 6 + (levelId % 6)
  return [
    ...horizontalRoad(1, 4, 16),
    ...horizontalRoad(15, 4, 16),
    ...verticalRoad(1, 4, 12),
    ...verticalRoad(19, 4, 12),
    { x: 6, y: 15, char: 'A' },
    { x: 14, y: 1, char: 'A' },
    { x: 2, y: leftPropY, char: levelId % 2 === 0 ? 'D' : 'R' },
    { x: 18, y: rightPropY, char: levelId % 2 === 0 ? 'R' : 'D' },
    { x: 10, y: 0, char: '=' },
    { x: 10, y: 16, char: '=' },
  ]
}

export function getWaterNeighbors(tiles: Tile[][], col: number, row: number): WaterNeighbors {
  return {
    up: tiles[row - 1]?.[col]?.kind === 'water',
    right: tiles[row]?.[col + 1]?.kind === 'water',
    down: tiles[row + 1]?.[col]?.kind === 'water',
    left: tiles[row]?.[col - 1]?.kind === 'water',
  }
}

export function getRoadNeighbors(tiles: Tile[][], col: number, row: number): RoadNeighbors {
  return {
    up: isRoadConnection(tiles[row - 1]?.[col]?.kind),
    right: isRoadConnection(tiles[row]?.[col + 1]?.kind),
    down: isRoadConnection(tiles[row + 1]?.[col]?.kind),
    left: isRoadConnection(tiles[row]?.[col - 1]?.kind),
  }
}

function isRoadConnection(kind: TileKind | undefined) {
  return kind === 'road' || kind === 'ammo'
}
