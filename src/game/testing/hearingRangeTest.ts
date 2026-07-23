import type { AcousticEventKind } from '../../../packages/shared/src/spatialHearing.ts'
import type {
  BattlefieldPropInstance,
  LevelDefinition,
  Vec,
} from '../types.ts'

export const HEARING_RANGE_TEST_LEVEL_ID = 9012
export const HEARING_RANGE_TEST_LEVEL_SLUG = 'acoustic_range'
export const HEARING_RANGE_TEST_PHASE_SECONDS = 4
export const HEARING_RANGE_TEST_PULSE_TIMES = [1.25, 2.5] as const

export type HearingRangeTestExpectation = 'loud' | 'quiet' | 'silent'

export interface HearingRangeTestPhase {
  id: string
  label: string
  instruction: string
  expectation: HearingRangeTestExpectation
  listener: Vec
  source: Vec
  kind: AcousticEventKind
  intensity: number
}

export const HEARING_RANGE_TEST_PHASES: readonly HearingRangeTestPhase[] = [
  {
    id: 'near-east-shot',
    label: 'NEAR SHOT - RIGHT',
    instruction: 'EXPECTED: LOUD ON RIGHT',
    expectation: 'loud',
    listener: { x: 13, y: 4 },
    source: { x: 17, y: 4 },
    kind: 'shot',
    intensity: 1,
  },
  {
    id: 'near-west-shot',
    label: 'NEAR SHOT - LEFT',
    instruction: 'EXPECTED: LOUD ON LEFT',
    expectation: 'loud',
    listener: { x: 19, y: 4 },
    source: { x: 17, y: 4 },
    kind: 'shot',
    intensity: 1,
  },
  {
    id: 'far-shot',
    label: 'FAR SHOT',
    instruction: 'EXPECTED: SILENT',
    expectation: 'silent',
    listener: { x: 5, y: 4 },
    source: { x: 17, y: 4 },
    kind: 'shot',
    intensity: 1,
  },
  {
    id: 'far-explosion',
    label: 'FAR EXPLOSION',
    instruction: 'EXPECTED: AUDIBLE',
    expectation: 'loud',
    listener: { x: 5, y: 4 },
    source: { x: 17, y: 4 },
    kind: 'explosion',
    intensity: 1.4,
  },
  {
    id: 'wall-shot',
    label: 'SHOT THROUGH WALL',
    instruction: 'EXPECTED: QUIETER RIGHT',
    expectation: 'quiet',
    listener: { x: 10, y: 8 },
    source: { x: 15, y: 8 },
    kind: 'shot',
    intensity: 1,
  },
  {
    id: 'near-rustle',
    label: 'NEAR BUSH RUSTLE',
    instruction: 'EXPECTED: AUDIBLE RIGHT',
    expectation: 'quiet',
    listener: { x: 12, y: 12 },
    source: { x: 15, y: 12 },
    kind: 'rustle',
    intensity: 1.3,
  },
  {
    id: 'far-rustle',
    label: 'FAR BUSH RUSTLE',
    instruction: 'EXPECTED: SILENT',
    expectation: 'silent',
    listener: { x: 9, y: 12 },
    source: { x: 15, y: 12 },
    kind: 'rustle',
    intensity: 1.3,
  },
]

const HEARING_RANGE_TEST_PROPS: BattlefieldPropInstance[] = [
  { id: 'hearing-open-emitter', spriteId: 'antenna_mast', x: 17, y: 4 },
  { id: 'hearing-wall-emitter', spriteId: 'generator', x: 15, y: 8 },
  { id: 'hearing-rustle-emitter', spriteId: 'bush', x: 15, y: 12 },
  { id: 'hearing-listen-far', spriteId: 'warning_sign', x: 5, y: 3 },
  { id: 'hearing-listen-near-east', spriteId: 'warning_sign', x: 13, y: 3 },
  { id: 'hearing-listen-near-west', spriteId: 'warning_sign', x: 19, y: 3 },
  { id: 'hearing-listen-wall', spriteId: 'warning_sign', x: 10, y: 7 },
  { id: 'hearing-listen-rustle-far', spriteId: 'warning_sign', x: 9, y: 11 },
  { id: 'hearing-listen-rustle-near', spriteId: 'warning_sign', x: 12, y: 11 },
]

export const HEARING_RANGE_TEST_LEVEL: LevelDefinition = {
  id: HEARING_RANGE_TEST_LEVEL_ID,
  name: 'Acoustic Range',
  briefing: 'A dev-only human hearing range. The listener teleports automatically; each station plays twice and Fire replays the current test.',
  objective: {
    mode: 'team-battle',
    label: 'Hearing QA',
    briefing: 'Compare near, far, occluded, and loudness-dependent physical sounds without combat noise.',
    winCondition: 'The seven-station sequence loops indefinitely for human inspection.',
    targetScore: 999,
  },
  biome: 'industrial',
  rows: createHearingRangeTestRows(),
  props: HEARING_RANGE_TEST_PROPS,
  playerSpawn: { ...HEARING_RANGE_TEST_PHASES[0].listener },
  enemySpawns: [],
  retranslators: [],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 999,
  roleWeights: { base_attacker: 0, hunter: 1, wall_breaker: 0 },
  armoredEnemyRatio: 0,
  rewards: { credits: 0, xp: 0, score: 0 },
  revealMap: true,
}

export function getHearingRangeTestPhase(index: number) {
  const normalized = ((Math.floor(index) % HEARING_RANGE_TEST_PHASES.length)
    + HEARING_RANGE_TEST_PHASES.length) % HEARING_RANGE_TEST_PHASES.length
  return HEARING_RANGE_TEST_PHASES[normalized]
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

  for (const row of [4, 8, 12]) {
    for (let col = 1; col < cols - 1; col += 1) {
      cells[row][col] = '='
    }
  }
  for (let row = 1; row < rows - 1; row += 1) {
    cells[row][10] = '='
  }

  cells[8][13] = 'S'
  cells[12][14] = 'r'
  cells[12][15] = 'r'
  cells[12][16] = 'r'

  return cells.map((row) => row.join(''))
}
