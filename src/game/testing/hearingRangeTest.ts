import type { AcousticEventKind } from '../../../packages/shared/src/spatialHearing.ts'
import type {
  BattlefieldPropInstance,
  LevelDefinition,
  Vec,
} from '../types.ts'

export const HEARING_RANGE_TEST_LEVEL_ID = 9012
export const HEARING_RANGE_TEST_LEVEL_SLUG = 'acoustic_range'
export const HEARING_RANGE_TEST_LISTENER: Vec = { x: 10, y: 8 }

export type HearingRangeTestExpectedVisual = 'exact' | 'strong' | 'medium' | 'faint' | 'none'

export interface HearingRangeTestStation {
  id: string
  label: string
  instruction: string
  expectedVisual: HearingRangeTestExpectedVisual
  listener: Vec
  source: Vec
  sourceVisible: boolean
  kind: AcousticEventKind
  intensity: number
}

const SHARED_RUSTLE_INTENSITY = 1.5

export const HEARING_RANGE_TEST_STATIONS: readonly HearingRangeTestStation[] = [
  {
    id: 'visible-reference',
    label: 'VISIBLE REFERENCE - 2 CELLS',
    instruction: 'EXPECTED: FULL CUE ON THE BUSH',
    expectedVisual: 'exact',
    listener: HEARING_RANGE_TEST_LISTENER,
    source: { x: 12, y: 8 },
    sourceVisible: true,
    kind: 'rustle',
    intensity: SHARED_RUSTLE_INTENSITY,
  },
  {
    id: 'lab-near',
    label: 'HIDDEN NEAR - 4 CELLS',
    instruction: 'EXPECTED: STRONG APPROX CUE IN FOG',
    expectedVisual: 'strong',
    listener: HEARING_RANGE_TEST_LISTENER,
    source: { x: 14, y: 8 },
    sourceVisible: false,
    kind: 'rustle',
    intensity: SHARED_RUSTLE_INTENSITY,
  },
  {
    id: 'lab-mid',
    label: 'HIDDEN MID - 5 CELLS',
    instruction: 'EXPECTED: MEDIUM APPROX CUE IN FOG',
    expectedVisual: 'medium',
    listener: HEARING_RANGE_TEST_LISTENER,
    source: { x: 10, y: 13 },
    sourceVisible: false,
    kind: 'rustle',
    intensity: SHARED_RUSTLE_INTENSITY,
  },
  {
    id: 'lab-edge',
    label: 'HIDDEN EDGE - 6 CELLS',
    instruction: 'EXPECTED: FAINT APPROX CUE IN FOG',
    expectedVisual: 'faint',
    listener: HEARING_RANGE_TEST_LISTENER,
    source: { x: 4, y: 8 },
    sourceVisible: false,
    kind: 'rustle',
    intensity: SHARED_RUSTLE_INTENSITY,
  },
  {
    id: 'lab-out',
    label: 'OUT OF RANGE - 7.1 CELLS',
    instruction: 'EXPECTED: NO CUE OR MAP CLUTTER',
    expectedVisual: 'none',
    listener: HEARING_RANGE_TEST_LISTENER,
    source: { x: 15, y: 3 },
    sourceVisible: false,
    kind: 'rustle',
    intensity: SHARED_RUSTLE_INTENSITY,
  },
]

const HEARING_RANGE_TEST_PROPS: BattlefieldPropInstance[] = [
  { id: 'hearing-listener', spriteId: 'warning_sign', x: 10, y: 9 },
  { id: 'hearing-visible-source', spriteId: 'bush', x: 12, y: 8 },
  { id: 'hearing-near-source', spriteId: 'bush', x: 14, y: 8 },
  { id: 'hearing-mid-source', spriteId: 'reeds', x: 10, y: 13 },
  { id: 'hearing-edge-source', spriteId: 'bush', x: 4, y: 8 },
  { id: 'hearing-out-source', spriteId: 'reeds', x: 15, y: 3 },
]

export const HEARING_RANGE_TEST_LEVEL: LevelDefinition = {
  id: HEARING_RANGE_TEST_LEVEL_ID,
  name: 'Acoustic Lab',
  briefing: 'A dev-only visual hearing lab. Stay at the center, select a distance with Left or Right, then play its hidden rustle with Fire.',
  objective: {
    mode: 'team-battle',
    label: 'Visual Hearing QA',
    briefing: 'Compare one identical rustle at visible, near, mid, edge, and out-of-range sources through real fog of war.',
    winCondition: 'Confirm that hidden cues fade with distance and disappear beyond hearing range.',
    targetScore: 999,
  },
  biome: 'industrial',
  rows: createHearingRangeTestRows(),
  props: HEARING_RANGE_TEST_PROPS,
  playerSpawn: { ...HEARING_RANGE_TEST_LISTENER },
  enemySpawns: [],
  retranslators: [],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 999,
  roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
  armoredEnemyRatio: 0,
  rewards: { credits: 0, xp: 0, score: 0 },
  revealMap: false,
}

export function getHearingRangeTestStation(index: number) {
  const normalized = ((Math.floor(index) % HEARING_RANGE_TEST_STATIONS.length)
    + HEARING_RANGE_TEST_STATIONS.length) % HEARING_RANGE_TEST_STATIONS.length
  return HEARING_RANGE_TEST_STATIONS[normalized]
}

function createHearingRangeTestRows() {
  const cols = 21
  const rows = 17
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))

  for (let col = 0; col < cols; col += 1) {
    cells[0][col] = 'S'
    cells[rows - 1][col] = 'S'
  }
  for (let row = 0; row < rows; row += 1) {
    cells[row][0] = 'S'
    cells[row][cols - 1] = 'S'
  }

  for (let col = 2; col < cols - 2; col += 1) {
    cells[8][col] = '='
  }
  for (let row = 2; row < rows - 2; row += 1) {
    cells[row][10] = '='
  }

  cells[8][12] = 'r'
  cells[8][14] = 'r'
  cells[13][10] = 'r'
  cells[8][4] = 'r'
  cells[3][15] = 'r'

  return cells.map((row) => row.join(''))
}
