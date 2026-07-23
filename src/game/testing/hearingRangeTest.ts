import type {
  BattlefieldPropInstance,
  LevelDefinition,
  Vec,
} from '../types.ts'

export const HEARING_RANGE_TEST_LEVEL_ID = 9012
export const HEARING_RANGE_TEST_LEVEL_SLUG = 'acoustic_range'
export const HEARING_RANGE_TEST_PLAYER_SPAWN: Vec = { x: 2, y: 8 }

export type HearingRangeTestExpectedVisual =
  | 'exact'
  | 'strong'
  | 'medium'
  | 'faint'
  | 'none'
  | 'heard'
  | 'blocked'
  | 'heard-again'
  | 'inspect'

export interface HearingRangeTestCheckpoint {
  id: string
  triggerCol: number
  observation: Vec
  label: string
  instruction: string
  expectedVisual: HearingRangeTestExpectedVisual
  focusPatrolId: string
}

export interface HearingRangeTestPatrol {
  id: string
  label: string
  route: readonly Vec[]
  pauseSeconds: number
}

function horizontalRoute(startCol: number, endCol: number, row: number): Vec[] {
  return Array.from(
    { length: endCol - startCol + 1 },
    (_, index) => ({ x: startCol + index, y: row }),
  )
}

export const HEARING_RANGE_TEST_PATROLS: readonly HearingRangeTestPatrol[] = [
  {
    id: 'hearing-patrol-visible',
    label: 'Visible reference',
    route: horizontalRoute(7, 9, 6),
    pauseSeconds: 0.55,
  },
  {
    id: 'hearing-patrol-near',
    label: 'Hidden near',
    route: horizontalRoute(19, 21, 5),
    pauseSeconds: 0.55,
  },
  {
    id: 'hearing-patrol-mid',
    label: 'Hidden mid',
    route: horizontalRoute(31, 33, 4),
    pauseSeconds: 0.55,
  },
  {
    id: 'hearing-patrol-edge',
    label: 'Hidden edge',
    route: horizontalRoute(45, 46, 4),
    pauseSeconds: 0.55,
  },
  {
    id: 'hearing-patrol-out',
    label: 'Out of range',
    route: horizontalRoute(55, 57, 3),
    pauseSeconds: 0.55,
  },
  {
    id: 'hearing-patrol-wall',
    label: 'Steel-screen control',
    route: horizontalRoute(64, 80, 5),
    pauseSeconds: 0.35,
  },
  {
    id: 'hearing-patrol-inspect',
    label: 'Inspection patrol',
    route: horizontalRoute(86, 90, 5),
    pauseSeconds: 0.55,
  },
]

export const HEARING_RANGE_TEST_CHECKPOINTS: readonly HearingRangeTestCheckpoint[] = [
  {
    id: 'visible-reference',
    triggerCol: 2,
    observation: { x: 8, y: 8 },
    label: '1  VISIBLE REFERENCE',
    instruction: 'DRIVE TO SIGN; EXPECT AN EXACT RUSTLE ON THE VISIBLE TANK.',
    expectedVisual: 'exact',
    focusPatrolId: 'hearing-patrol-visible',
  },
  {
    id: 'hidden-near',
    triggerCol: 14,
    observation: { x: 20, y: 8 },
    label: '2  HIDDEN NEAR',
    instruction: 'EXPECT A STRONG DIRECTIONAL RUSTLE FROM FOG.',
    expectedVisual: 'strong',
    focusPatrolId: 'hearing-patrol-near',
  },
  {
    id: 'hidden-mid',
    triggerCol: 26,
    observation: { x: 32, y: 8 },
    label: '3  HIDDEN MID',
    instruction: 'EXPECT A WEAKER DIRECTIONAL RUSTLE FROM FOG.',
    expectedVisual: 'medium',
    focusPatrolId: 'hearing-patrol-mid',
  },
  {
    id: 'hidden-edge',
    triggerCol: 38,
    observation: { x: 44, y: 8 },
    label: '4  HIDDEN EDGE',
    instruction: 'EXPECT A FAINT MARKER NEAR THE HEARING LIMIT.',
    expectedVisual: 'faint',
    focusPatrolId: 'hearing-patrol-edge',
  },
  {
    id: 'out-of-range',
    triggerCol: 50,
    observation: { x: 56, y: 8 },
    label: '5  OUT OF RANGE',
    instruction: 'PATROL STILL MOVES; EXPECT NO SOUND OR MARKER.',
    expectedVisual: 'none',
    focusPatrolId: 'hearing-patrol-out',
  },
  {
    id: 'wall-outside',
    triggerCol: 61,
    observation: { x: 65, y: 8 },
    label: '6  WALL CONTROL',
    instruction: 'WAIT HERE; EXPECT THE GRAVEL PATROL TO BE HEARD.',
    expectedVisual: 'heard',
    focusPatrolId: 'hearing-patrol-wall',
  },
  {
    id: 'wall-inside',
    triggerCol: 68,
    observation: { x: 72, y: 8 },
    label: '7  INSIDE STEEL SCREEN',
    instruction: 'SAME PATROL MOVES; EXPECT SILENCE BEHIND STEEL.',
    expectedVisual: 'blocked',
    focusPatrolId: 'hearing-patrol-wall',
  },
  {
    id: 'wall-exit',
    triggerCol: 77,
    observation: { x: 79, y: 8 },
    label: '8  PAST THE SCREEN',
    instruction: 'WAIT HERE; EXPECT THE GRAVEL PATROL TO RETURN.',
    expectedVisual: 'heard-again',
    focusPatrolId: 'hearing-patrol-wall',
  },
  {
    id: 'inspection-yard',
    triggerCol: 83,
    observation: { x: 88, y: 8 },
    label: '9  INSPECTION YARD',
    instruction: 'TURN NORTH AND APPROACH THE REAL MOVING PATROL.',
    expectedVisual: 'inspect',
    focusPatrolId: 'hearing-patrol-inspect',
  },
]

const HEARING_RANGE_TEST_PROPS: BattlefieldPropInstance[] = [
  ...HEARING_RANGE_TEST_CHECKPOINTS.map((checkpoint) => ({
    id: `hearing-checkpoint-${checkpoint.id}`,
    spriteId: 'warning_sign' as const,
    x: checkpoint.observation.x,
    y: checkpoint.observation.y,
  })),
]

export const HEARING_RANGE_TEST_LEVEL: LevelDefinition = {
  id: HEARING_RANGE_TEST_LEVEL_ID,
  name: 'Acoustic Field Course',
  briefing: 'A dev-only driving course. Follow the single road, stop at each sign, and compare real patrol movement through fog, distance, and the steel sound screen.',
  objective: {
    mode: 'team-battle',
    label: 'Spatial Hearing Field Test',
    briefing: 'Every cue comes from a real tank crossing ordinary reeds or gravel. Weapons are disabled so the test stays clean.',
    winCondition: 'Complete all nine checkpoints, then approach the inspection patrol.',
    targetScore: 999,
  },
  biome: 'industrial',
  rows: createHearingRangeTestRows(),
  props: HEARING_RANGE_TEST_PROPS,
  playerSpawn: { ...HEARING_RANGE_TEST_PLAYER_SPAWN },
  enemySpawns: [],
  retranslators: [],
  enemyTotal: HEARING_RANGE_TEST_PATROLS.length,
  activeEnemyLimit: 0,
  spawnInterval: 999,
  roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
  armoredEnemyRatio: 0,
  rewards: { credits: 0, xp: 0, score: 0 },
  revealMap: false,
}

export function getHearingRangeTestCheckpoint(index: number) {
  const normalized = Math.max(
    0,
    Math.min(HEARING_RANGE_TEST_CHECKPOINTS.length - 1, Math.floor(index)),
  )
  return HEARING_RANGE_TEST_CHECKPOINTS[normalized]
}

export function getHearingRangeTestCheckpointForCol(col: number) {
  let index = 0
  for (let candidate = 1; candidate < HEARING_RANGE_TEST_CHECKPOINTS.length; candidate += 1) {
    const checkpoint = HEARING_RANGE_TEST_CHECKPOINTS[candidate]
    if (!checkpoint || col < checkpoint.triggerCol) {
      break
    }
    index = candidate
  }
  return index
}

export function getHearingRangeTestPatrol(id: string) {
  return HEARING_RANGE_TEST_PATROLS.find((patrol) => patrol.id === id) ?? null
}

function createHearingRangeTestRows() {
  const cols = 94
  const rows = 17
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))

  for (let col = 0; col < cols; col += 1) {
    cells[0]![col] = 'S'
    cells[rows - 1]![col] = 'S'
  }
  for (let row = 0; row < rows; row += 1) {
    cells[row]![0] = 'S'
    cells[row]![cols - 1] = 'S'
  }

  // The player gets one calm east-west lane. Water is impassable but does not
  // attenuate hearing, so only the explicit steel screen changes the result.
  for (let col = 1; col < cols - 1; col += 1) {
    cells[7]![col] = 'W'
    cells[8]![col] = '='
    cells[9]![col] = 'W'
  }

  // The screen surrounds the road and crosses the acoustic line to the shared
  // gravel patrol. Its open approaches are the before/after controls.
  for (let col = 68; col <= 76; col += 1) {
    cells[7]![col] = 'S'
    cells[9]![col] = 'S'
  }

  // The last checkpoint opens a narrow northbound inspection lane so the
  // player can physically reach the final real patrol.
  for (let row = 5; row <= 8; row += 1) {
    cells[row]![88] = '='
  }

  for (const patrol of HEARING_RANGE_TEST_PATROLS) {
    const surface = patrol.id === 'hearing-patrol-wall' ? 'g' : 'r'
    for (const cell of patrol.route) {
      cells[cell.y]![cell.x] = surface
    }
  }

  return cells.map((row) => row.join(''))
}
