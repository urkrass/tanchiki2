import type {
  BattlefieldPropInstance,
  Direction,
  LevelDefinition,
  Vec,
} from '../types.ts'
import type { AcousticEventKind } from '../../../packages/shared/src/spatialHearing.ts'

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
  | 'shot'
  | 'impact'
  | 'explosion'

export interface HearingRangeTestCheckpoint {
  id: string
  triggerCol: number
  observation: Vec
  label: string
  instruction: string
  expectedVisual: HearingRangeTestExpectedVisual
  focusPatrolId: string | null
  focusLiveFireStationId: string | null
  expectedAudibleKinds: readonly AcousticEventKind[]
  expectedSilentKinds: readonly AcousticEventKind[]
}

export interface HearingRangeTestPatrol {
  id: string
  label: string
  route: readonly Vec[]
  pauseSeconds: number
}

export interface HearingRangeTestLiveFireStation {
  id: string
  label: string
  shooterId: string
  shooter: Vec
  direction: Direction
  target:
    | { kind: 'steel'; cell: Vec }
    | { kind: 'fragile-tank'; id: string; cell: Vec }
  intervalSeconds: number
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
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['rustle'],
    expectedSilentKinds: [],
  },
  {
    id: 'hidden-near',
    triggerCol: 14,
    observation: { x: 20, y: 8 },
    label: '2  HIDDEN NEAR',
    instruction: 'EXPECT A STRONG DIRECTIONAL RUSTLE FROM FOG.',
    expectedVisual: 'strong',
    focusPatrolId: 'hearing-patrol-near',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['rustle'],
    expectedSilentKinds: [],
  },
  {
    id: 'hidden-mid',
    triggerCol: 26,
    observation: { x: 32, y: 8 },
    label: '3  HIDDEN MID',
    instruction: 'EXPECT A WEAKER DIRECTIONAL RUSTLE FROM FOG.',
    expectedVisual: 'medium',
    focusPatrolId: 'hearing-patrol-mid',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['rustle'],
    expectedSilentKinds: [],
  },
  {
    id: 'hidden-edge',
    triggerCol: 38,
    observation: { x: 44, y: 8 },
    label: '4  HIDDEN EDGE',
    instruction: 'EXPECT A FAINT MARKER NEAR THE HEARING LIMIT.',
    expectedVisual: 'faint',
    focusPatrolId: 'hearing-patrol-edge',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['rustle'],
    expectedSilentKinds: [],
  },
  {
    id: 'out-of-range',
    triggerCol: 50,
    observation: { x: 56, y: 8 },
    label: '5  OUT OF RANGE',
    instruction: 'PATROL STILL MOVES; EXPECT NO SOUND OR MARKER.',
    expectedVisual: 'none',
    focusPatrolId: 'hearing-patrol-out',
    focusLiveFireStationId: null,
    expectedAudibleKinds: [],
    expectedSilentKinds: ['rustle'],
  },
  {
    id: 'wall-outside',
    triggerCol: 61,
    observation: { x: 65, y: 8 },
    label: '6  WALL CONTROL',
    instruction: 'WAIT HERE; EXPECT THE GRAVEL PATROL TO BE HEARD.',
    expectedVisual: 'heard',
    focusPatrolId: 'hearing-patrol-wall',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['tracks'],
    expectedSilentKinds: [],
  },
  {
    id: 'wall-inside',
    triggerCol: 68,
    observation: { x: 72, y: 8 },
    label: '7  INSIDE STEEL SCREEN',
    instruction: 'SAME PATROL MOVES; EXPECT SILENCE BEHIND STEEL.',
    expectedVisual: 'blocked',
    focusPatrolId: 'hearing-patrol-wall',
    focusLiveFireStationId: null,
    expectedAudibleKinds: [],
    expectedSilentKinds: ['tracks'],
  },
  {
    id: 'wall-exit',
    triggerCol: 77,
    observation: { x: 79, y: 8 },
    label: '8  PAST THE SCREEN',
    instruction: 'WAIT HERE; EXPECT THE GRAVEL PATROL TO RETURN.',
    expectedVisual: 'heard-again',
    focusPatrolId: 'hearing-patrol-wall',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['tracks'],
    expectedSilentKinds: [],
  },
  {
    id: 'inspection-yard',
    triggerCol: 83,
    observation: { x: 88, y: 8 },
    label: '9  INSPECTION YARD',
    instruction: 'TURN NORTH AND APPROACH THE REAL MOVING PATROL.',
    expectedVisual: 'inspect',
    focusPatrolId: 'hearing-patrol-inspect',
    focusLiveFireStationId: null,
    expectedAudibleKinds: ['rustle'],
    expectedSilentKinds: [],
  },
  {
    id: 'distant-gunfire',
    triggerCol: 94,
    observation: { x: 99, y: 8 },
    label: '10  DISTANT GUNFIRE',
    instruction: 'STOP AT THE SIGN. HEAR THE SOUTHERN SHOT; ITS FAR IMPACT STAYS SILENT.',
    expectedVisual: 'shot',
    focusPatrolId: null,
    focusLiveFireStationId: 'hearing-live-fire-shot',
    expectedAudibleKinds: ['shot'],
    expectedSilentKinds: ['impact'],
  },
  {
    id: 'shot-and-impact',
    triggerCol: 106,
    observation: { x: 114, y: 8 },
    label: '11  SHOT AND IMPACT',
    instruction: 'HEAR A REAL SHOT, THEN ITS SEPARATE STEEL IMPACT FROM THE SOUTH.',
    expectedVisual: 'impact',
    focusPatrolId: null,
    focusLiveFireStationId: 'hearing-live-fire-impact',
    expectedAudibleKinds: ['shot', 'impact'],
    expectedSilentKinds: [],
  },
  {
    id: 'distant-explosion',
    triggerCol: 126,
    observation: { x: 127, y: 8 },
    label: '12  DISTANT EXPLOSION',
    instruction: 'HEAR THE SOUTHERN TARGET EXPLODE; THE FIRING TANK IS OUT OF RANGE.',
    expectedVisual: 'explosion',
    focusPatrolId: null,
    focusLiveFireStationId: 'hearing-live-fire-explosion',
    expectedAudibleKinds: ['impact', 'explosion'],
    expectedSilentKinds: ['shot'],
  },
]

export const HEARING_RANGE_TEST_LIVE_FIRE_STATIONS: readonly HearingRangeTestLiveFireStation[] = [
  {
    id: 'hearing-live-fire-shot',
    label: 'Distant gunfire control',
    shooterId: 'hearing-live-fire-shot-shooter',
    shooter: { x: 99, y: 14 },
    direction: 'right',
    target: { kind: 'steel', cell: { x: 108, y: 14 } },
    intervalSeconds: 3.4,
  },
  {
    id: 'hearing-live-fire-impact',
    label: 'Shot and steel impact',
    shooterId: 'hearing-live-fire-impact-shooter',
    shooter: { x: 109, y: 14 },
    direction: 'right',
    target: { kind: 'steel', cell: { x: 114, y: 14 } },
    intervalSeconds: 3.4,
  },
  {
    id: 'hearing-live-fire-explosion',
    label: 'Distant target destruction',
    shooterId: 'hearing-live-fire-explosion-shooter',
    shooter: { x: 116, y: 14 },
    direction: 'right',
    target: {
      kind: 'fragile-tank',
      id: 'hearing-live-fire-explosion-target',
      cell: { x: 127, y: 14 },
    },
    intervalSeconds: 4.2,
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
  briefing: 'A dev-only driving course. Follow the single road, compare real patrol movement through fog and steel, then verify real gunfire, impacts, and destruction on the south live-fire track.',
  objective: {
    mode: 'team-battle',
    label: 'Spatial Hearing Field Test',
    briefing: 'Every cue comes from ordinary tank movement, projectile, collision, or destruction mechanics. The player weapon stays disabled so the test remains controlled.',
    winCondition: 'Complete all twelve signed checkpoints and inspect the real moving patrol.',
    targetScore: 999,
  },
  biome: 'industrial',
  rows: createHearingRangeTestRows(),
  props: HEARING_RANGE_TEST_PROPS,
  playerSpawn: { ...HEARING_RANGE_TEST_PLAYER_SPAWN },
  enemySpawns: [],
  retranslators: [],
  enemyTotal: HEARING_RANGE_TEST_PATROLS.length + HEARING_RANGE_TEST_LIVE_FIRE_STATIONS.length,
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

export function getHearingRangeTestLiveFireStation(id: string) {
  return HEARING_RANGE_TEST_LIVE_FIRE_STATIONS.find((station) => station.id === id) ?? null
}

export function getHearingRangeTestLiveFireStationForActor(id: string) {
  return HEARING_RANGE_TEST_LIVE_FIRE_STATIONS.find((station) => (
    station.shooterId === id
    || (station.target.kind === 'fragile-tank' && station.target.id === id)
  )) ?? null
}

function createHearingRangeTestRows() {
  const cols = 136
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

  // The unused south half becomes a controlled live-fire line. The player
  // remains on the single observation road while ordinary shells travel into
  // real steel and tank targets through fog.
  for (let col = 94; col <= 133; col += 1) {
    cells[14]![col] = '='
  }
  for (const station of HEARING_RANGE_TEST_LIVE_FIRE_STATIONS) {
    if (station.target.kind === 'steel') {
      cells[station.target.cell.y]![station.target.cell.x] = 'S'
    }
  }

  return cells.map((row) => row.join(''))
}
