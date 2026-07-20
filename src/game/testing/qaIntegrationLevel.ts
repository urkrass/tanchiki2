import type { LevelDefinition, LevelObjective, Vec } from '../types.ts'

export const QA_INTEGRATION_LEVEL_ID = 9001
export const QA_INTEGRATION_LEVEL_NAME = 'QA Integration Range'
const QA_COLS = 21
const QA_ROWS = 17

export const QA_CELLS = {
  playerSpawn: { x: 4, y: 14 },
  stagingEast: { x: 5, y: 14 },
  ammoStation: { x: 5, y: 15 },
  base: { x: 19, y: 15 },
  relayNear: { x: 5, y: 14 },
  relayFar: { x: 17, y: 2 },
  hiddenWall: { x: 10, y: 14 },
  hiddenHostile: { x: 4, y: 8 },
  decoyEcho: { x: 8, y: 14 },
  minePad: { x: 7, y: 10 },
  mineTrigger: { x: 8, y: 10 },
  noisePad: { x: 10, y: 10 },
  noiseTrigger: { x: 11, y: 10 },
  steelPad: { x: 4, y: 14 },
  tripwirePad: { x: 14, y: 10 },
  shellDirectTarget: { x: 4, y: 12 },
  shellSplashTarget: { x: 5, y: 12 },
  shellAllySafe: { x: 3, y: 12 },
  friendlySpawn: { x: 12, y: 14 },
  friendlyVisionProbe: { x: 12, y: 12 },
  enemySpawnNear: { x: 4, y: 4 },
  enemySpawnFar: { x: 18, y: 2 },
  neutralSpawn: { x: 18, y: 10 },
  ctfHome: { x: 3, y: 15 },
  ctfFlag: { x: 18, y: 1 },
  assaultCore: { x: 18, y: 2 },
} as const satisfies Record<string, Vec>

type QaScenarioKind = 'defense' | 'team' | 'assault' | 'ctf' | 'ffa'

export const QA_INTEGRATION_ROWS = buildQaRows()
const QA_CLASS_KIT_ROWS = QA_INTEGRATION_ROWS.map((row, rowIndex) => (
  rowIndex === QA_CELLS.shellDirectTarget.y
    ? `${row.slice(0, QA_CELLS.shellDirectTarget.x - 1)}BBB${row.slice(QA_CELLS.shellDirectTarget.x + 2)}`
    : row
))

export const QA_INTEGRATION_LEVEL: LevelDefinition = createQaScenario('defense')
export const QA_CTF_HUD_LEVEL_ID = 9006
export const QA_CTF_HUD_LEVEL_SLUG = 'ctf_hud_test'
export const QA_CTF_HUD_LEVEL: LevelDefinition = createQaScenario('ctf', {
  id: QA_CTF_HUD_LEVEL_ID,
  name: 'CTF HUD Test',
  objective: {
    mode: 'ctf',
    label: 'Capture The Flag',
    briefing: 'QA flag HUD and objective-state scenario.',
    winCondition: 'Return two flags.',
    friendlySpawns: [{ ...QA_CELLS.friendlySpawn }],
    friendlyTotal: 1,
    flag: {
      playerBase: { ...QA_CELLS.ctfHome },
      enemyFlag: { ...QA_CELLS.ctfFlag },
      capturesToWin: 2,
    },
  },
})
export const QA_CTF_FLAG_LEVEL_ID = 9007
export const QA_CTF_FLAG_LEVEL_SLUG = 'ctf_flag_test'
export const QA_CTF_FLAG_LEVEL: LevelDefinition = createQaScenario('ctf', {
  id: QA_CTF_FLAG_LEVEL_ID,
  name: 'CTF Flag Interaction Test',
  playerSpawn: { x: 4, y: 14 },
  enemySpawns: [],
  retranslators: [],
  enemyTotal: 0,
  activeEnemyLimit: 0,
  objective: {
    mode: 'ctf',
    label: 'Capture The Flag',
    briefing: 'QA carried flag, manual drop, and locator signal scenario.',
    winCondition: 'Return two flags.',
    friendlySpawns: [],
    friendlyTotal: 0,
    flag: {
      playerBase: { x: 7, y: 14 },
      enemyFlag: { x: 4, y: 14 },
      capturesToWin: 2,
    },
  },
})
export const QA_CLASS_KIT_LEVEL_ID = 9008
export const QA_CLASS_KIT_LEVEL_SLUG = 'class_kit_test'
export const QA_CLASS_KIT_LEVEL: LevelDefinition = createQaScenario('defense', {
  id: QA_CLASS_KIT_LEVEL_ID,
  name: 'Class Kit Visual Range',
  briefing: 'QA class equipment HUD, deployment, relay, shield, and HE-shell presentation.',
  rows: QA_CLASS_KIT_ROWS,
  enemySpawns: [],
  retranslators: [],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 99,
})
export const QA_ALL_EQUIPMENT_LEVEL_ID = 9009
export const QA_ALL_EQUIPMENT_LEVEL_SLUG = 'all_mods_test'
export const QA_ALL_EQUIPMENT_LEVEL: LevelDefinition = createQaScenario('defense', {
  id: QA_ALL_EQUIPMENT_LEVEL_ID,
  name: 'All Equipment Test Range',
  briefing: 'Development-only Test Tank with HE shells, shield, relays, Decoy 1, Mine 2, Trap 4, and Wire 5.',
  rows: QA_CLASS_KIT_ROWS,
  enemySpawns: [],
  retranslators: [],
  enemyTotal: 1,
  activeEnemyLimit: 0,
  spawnInterval: 99,
  objective: {
    mode: 'defense',
    label: 'Test Range',
    briefing: 'Use 1, 2, 4, 5, E, and Space to inspect every built-in class-equipment visual.',
    winCondition: 'Free testing; this hidden range does not affect Campaign progress.',
  },
})

export function createQaScenario(
  kind: QaScenarioKind = 'defense',
  overrides: Partial<LevelDefinition> = {},
): LevelDefinition {
  return {
    id: QA_INTEGRATION_LEVEL_ID,
    name: QA_INTEGRATION_LEVEL_NAME,
    briefing: 'Test-only proving ground for offline integration coverage.',
    objective: objectiveFor(kind),
    rows: QA_INTEGRATION_ROWS,
    playerSpawn: { ...QA_CELLS.playerSpawn },
    enemySpawns: [{ ...QA_CELLS.enemySpawnNear }, { ...QA_CELLS.enemySpawnFar }],
    retranslators: [{ ...QA_CELLS.relayNear }, { ...QA_CELLS.relayFar }],
    enemyTotal: kind === 'ffa' ? 0 : 1,
    activeEnemyLimit: kind === 'ffa' ? 0 : 1,
    spawnInterval: 99,
    roleWeights: { base_attacker: kind === 'defense' ? 1 : 0, hunter: kind === 'defense' ? 0 : 1, wall_breaker: 0 },
    armoredEnemyRatio: 0,
    rewards: { credits: 0, xp: 0, score: 0 },
    ...overrides,
  }
}

function objectiveFor(kind: QaScenarioKind): LevelObjective {
  if (kind === 'team') {
    return {
      mode: 'team-battle',
      label: 'Team Battle',
      briefing: 'QA team-vision merge scenario.',
      winCondition: 'Drain enemy tickets.',
      friendlySpawns: [{ ...QA_CELLS.friendlySpawn }],
      friendlyTotal: 1,
      targetScore: 0,
    }
  }

  if (kind === 'assault') {
    return {
      mode: 'assault',
      label: 'Assault',
      briefing: 'QA assault objective scenario.',
      winCondition: 'Destroy the command core.',
      friendlySpawns: [{ ...QA_CELLS.friendlySpawn }],
      friendlyTotal: 1,
      assault: {
        cell: { ...QA_CELLS.assaultCore },
        hp: 4,
      },
    }
  }

  if (kind === 'ctf') {
    return {
      mode: 'ctf',
      label: 'Capture The Flag',
      briefing: 'QA flag visibility and routing scenario.',
      winCondition: 'Return one flag.',
      friendlySpawns: [{ ...QA_CELLS.friendlySpawn }],
      friendlyTotal: 1,
      flag: {
        playerBase: { ...QA_CELLS.ctfHome },
        enemyFlag: { ...QA_CELLS.ctfFlag },
        capturesToWin: 1,
      },
    }
  }

  if (kind === 'ffa') {
    return {
      mode: 'ffa',
      label: 'Free For All',
      briefing: 'QA neutral-side routing scenario.',
      winCondition: 'Score one player kill.',
      neutralSpawns: [{ ...QA_CELLS.neutralSpawn }, { ...QA_CELLS.enemySpawnFar }],
      neutralTotal: 0,
      targetScore: 1,
    }
  }

  return {
    mode: 'defense',
    label: 'Defense',
    briefing: 'QA base and shell-economy scenario.',
    winCondition: 'Protect the base and clear hostiles.',
  }
}

function buildQaRows() {
  const rows = Array.from({ length: QA_ROWS }, () => Array<string>(QA_COLS).fill('.'))
  const set = (cell: Vec, char: string) => {
    rows[cell.y][cell.x] = char
  }
  const road = (fromX: number, toX: number, y: number) => {
    for (let x = fromX; x <= toX; x += 1) {
      rows[y][x] = '='
    }
  }

  road(3, 8, 13)
  road(3, 8, 14)
  road(4, 6, 15)
  road(6, 15, 10)
  road(12, 15, 14)

  for (const cell of [
    { x: 10, y: 13 },
    QA_CELLS.hiddenWall,
    { x: 10, y: 15 },
    { x: 2, y: 9 },
    { x: 2, y: 10 },
    { x: 2, y: 11 },
    { x: 16, y: 9 },
    { x: 16, y: 10 },
    { x: 16, y: 11 },
  ]) {
    set(cell, 'B')
  }

  for (const cell of [
    { x: 1, y: 1 },
    { x: 19, y: 1 },
    { x: 1, y: 15 },
    { x: 17, y: 5 },
  ]) {
    set(cell, 'S')
  }

  set({ x: 9, y: 6 }, 'W')
  set({ x: 11, y: 6 }, 'W')
  set({ x: 7, y: 3 }, 'R')
  set({ x: 17, y: 6 }, 'D')
  set(QA_CELLS.ammoStation, 'A')
  set(QA_CELLS.base, 'E')
  set(QA_CELLS.ctfHome, '=')
  set(QA_CELLS.ctfFlag, '=')
  set(QA_CELLS.assaultCore, '=')

  return rows.map((row) => row.join(''))
}
