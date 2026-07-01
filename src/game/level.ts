import { GRID_COLS, GRID_ROWS } from './constants.ts'
import type { LevelDefinition, LevelObjective, Tile, TileKind, Vec, WaterNeighbors } from './types.ts'

export const BASE_MAX_HP = 3

export const DEFAULT_LEVEL_ROWS = [
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

export const DEFAULT_PLAYER_SPAWN: Vec = {
  x: 4,
  y: 11,
}

export const DEFAULT_ENEMY_SPAWNS: Vec[] = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 12, y: 0 },
]

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
  friendlySpawns: [{ x: 3, y: 11 }, { x: 10, y: 11 }],
  friendlyTotal: 2,
  targetScore: 0,
}
const CTF_OBJECTIVE: LevelObjective = {
  mode: 'ctf',
  label: 'Capture The Flag',
  briefing: 'Steal the enemy flag and bring it back to your base marker.',
  winCondition: 'Return the enemy flag once.',
  friendlySpawns: [{ x: 3, y: 11 }, { x: 8, y: 11 }],
  friendlyTotal: 2,
  flag: {
    playerBase: { x: 5, y: 11 },
    enemyFlag: { x: 6, y: 0 },
    capturesToWin: 1,
  },
}
const FFA_OBJECTIVE: LevelObjective = {
  mode: 'ffa',
  label: 'Free For All',
  briefing: 'Every tank is hostile. Score kills before the arena overwhelms you.',
  winCondition: 'Score three player kills.',
  neutralSpawns: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 5 }, { x: 12, y: 5 }],
  neutralTotal: 7,
  targetScore: 3,
}
const ASSAULT_OBJECTIVE: LevelObjective = {
  mode: 'assault',
  label: 'Assault',
  briefing: 'Push into the bunker and destroy the enemy command core.',
  winCondition: 'Destroy the command core before your lives run out.',
  friendlySpawns: [{ x: 4, y: 11 }, { x: 8, y: 11 }],
  friendlyTotal: 2,
  assault: {
    cell: { x: 5, y: 0 },
    hp: 4,
  },
}

export const CAMPAIGN_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Outer Blocks',
    briefing: 'Mode: Defense. A light probe enters the city. Learn the lanes and keep the eagle standing.',
    objective: DEFENSE_OBJECTIVE,
    rows: DEFAULT_LEVEL_ROWS,
    playerSpawn: DEFAULT_PLAYER_SPAWN,
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
    rows: [
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
    ],
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
    rows: [
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
    ],
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
    rows: [
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
    ],
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
    rows: [
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
    ],
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 2 }],
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
      flag: { playerBase: { x: 5, y: 11 }, enemyFlag: { x: 6, y: 0 }, capturesToWin: 2 },
      winCondition: 'Return the enemy flag twice.',
    },
    rows: [
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
    ],
    playerSpawn: { x: 5, y: 11 },
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
      friendlySpawns: [{ x: 2, y: 11 }, { x: 9, y: 11 }, { x: 6, y: 10 }],
      friendlyTotal: 3,
    },
    rows: [
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
    ],
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: DEFAULT_ENEMY_SPAWNS,
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
      assault: { cell: { x: 5, y: 0 }, hp: 6 },
    },
    rows: [
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
    ],
    playerSpawn: { x: 5, y: 11 },
    enemySpawns: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 2 }],
    enemyTotal: 20,
    activeEnemyLimit: 5,
    spawnInterval: 1.7,
    roleWeights: { base_attacker: 0.4, hunter: 0.34, wall_breaker: 0.26 },
    armoredEnemyRatio: 0.48,
    rewards: { credits: 280, xp: 205, score: 2200 },
  },
]

export function createTiles(rows = DEFAULT_LEVEL_ROWS): Tile[][] {
  if (rows.length !== GRID_ROWS) {
    throw new Error(`Level must contain ${GRID_ROWS} rows`)
  }

  return rows.map((row, rowIndex) => {
    if (row.length !== GRID_COLS) {
      throw new Error(`Level row ${rowIndex} must contain ${GRID_COLS} columns`)
    }

    return [...row].map(tileFromChar)
  })
}

function tileFromChar(char: string): Tile {
  const kindByChar: Record<string, TileKind> = {
    '.': 'empty',
    B: 'brick',
    S: 'steel',
    W: 'water',
    T: 'trees',
    E: 'base',
  }
  const kind = kindByChar[char] ?? 'empty'

  return {
    kind,
    hp: kind === 'brick' ? 2 : kind === 'base' ? BASE_MAX_HP : 0,
  }
}

export function getWaterNeighbors(tiles: Tile[][], col: number, row: number): WaterNeighbors {
  return {
    up: tiles[row - 1]?.[col]?.kind === 'water',
    right: tiles[row]?.[col + 1]?.kind === 'water',
    down: tiles[row + 1]?.[col]?.kind === 'water',
    left: tiles[row]?.[col - 1]?.kind === 'water',
  }
}
