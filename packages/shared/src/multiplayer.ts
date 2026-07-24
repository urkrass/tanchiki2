import {
  TANK_CLASS_MECHANICS,
  classCellDistance,
  getClassDeployableInteraction,
  getSharedTankClassDefinition,
  getSharedTankClassCombatStats,
  isTraverseMovementDirection,
  type ClassShellKind,
  type NativeClassKitKind,
  type TankClassId,
} from './tankClasses.js'
import {
  createAcousticEvent,
  projectAcousticEventsForListener,
  pruneAcousticEvents,
  type AcousticEvent,
  type AcousticEventKind,
  type AudibleAcousticCue,
} from './spatialHearing.js'
import {
  PORTABLE_RELAY_TUNING,
  advancePortableSignalField,
  createPortableSignalPulse,
  getPortableRelayInteraction,
  getPortableRelayLimit,
  type PortableSignalContact,
  type PortableSignalTarget,
  type PortableSignalWave,
} from './portableRelay.js'
import { squareIntersectsVisionAperture } from './visionPresentation.js'

export type Team = 'blue' | 'red'
export type Direction = 'up' | 'right' | 'down' | 'left'
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'trees' | 'base' | 'ammo'
export type MatchPhase = 'lobby' | 'playing' | 'finished'
export const TEAM_RADIO_COMMANDS = ['ATTACK', 'DEFEND', 'REGROUP', 'HELP', 'THANKS'] as const
export type TeamRadioCommand = typeof TEAM_RADIO_COMMANDS[number]
export type CommandKind = 'input' | 'radio' | 'ping'

export interface Vec {
  x: number
  y: number
}

export interface PlayerCommand {
  up?: boolean
  down?: boolean
  left?: boolean
  right?: boolean
  fire?: boolean
  seq?: number
}

export interface MultiplayerMove {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  elapsed: number
  duration: number
}

export interface StationaryPivotState {
  direction: Direction
  elapsed: number
  queued: boolean
  released: boolean
}

export interface MultiplayerPlayer {
  id: string
  name: string
  team: Team
  classId: TankClassId
  col: number
  row: number
  dir: Direction
  hp: number
  maxHp: number
  shield: number
  alive: boolean
  reload: number
  reloadDuration: number
  shells: number
  shellCapacity: number
  shellRechargeProgress: number
  moveCooldown: number
  move: MultiplayerMove | null
  pivot: StationaryPivotState | null
  respawnTimer: number
  slow: number
  immobilized: number
  bulwarkRemaining: number
  bulwarkCapacity: number
  bulwarkCooldown: number
  traverseRemaining: number
  traverseCooldown: number
  equipmentHold: MultiplayerEquipmentHold | null
  equipmentHeld: Record<1 | 2, boolean>
  equipmentConsumed: Record<1 | 2, boolean>
  lastEquipmentSeq: number
  portableRelayHold: MultiplayerPortableRelayHold | null
  portableRelayHeld: boolean
  portableRelayConsumed: boolean
  lastPortableRelaySeq: number
  score: number
  kills: number
  lastCommand: PlayerCommand
  lastCommandSeq: number
}

export interface MultiplayerBullet {
  id: string
  ownerId: string
  team: Team
  shellKind: ClassShellKind
  damage: number
  splashDamage: number
  splashRadius: number
  x: number
  y: number
  dir: Direction
  ttl: number
}

export type MultiplayerDeployableKind = Extract<NativeClassKitKind, 'decoy' | 'tripwire' | 'mine' | 'steel'>

export interface MultiplayerDeployable {
  id: string
  ownerId: string
  team: Team
  kind: MultiplayerDeployableKind
  col: number
  row: number
}

export interface MultiplayerEquipmentHold {
  slot: 1 | 2
  kind: MultiplayerDeployableKind
  action: 'place' | 'recover'
  col: number
  row: number
  elapsed: number
  duration: number
}

export interface MultiplayerEquipmentAlert {
  id: string
  team: Team
  kind: 'tripwire' | 'steel'
  col: number
  row: number
  at: number
}

export interface MultiplayerPortableRelay {
  id: string
  ownerId: string
  team: Team
  col: number
  row: number
  pulseTimer: number
}

export interface MultiplayerPortableRelayHold {
  action: 'place' | 'recover'
  relayId?: string
  col: number
  row: number
  elapsed: number
  duration: number
}

export interface Retranslator {
  id: string
  col: number
  row: number
  owner: Team | null
  captureTeam: Team | null
  progress: number
}

export interface VisionMemory {
  id: string
  team: Team
  col: number
  row: number
  seenAt: number
}

export interface TeamRadioMessage {
  id: string
  team: Team
  playerId: string
  command: TeamRadioCommand
  at: number
}

export interface TeamPing {
  id: string
  team: Team
  playerId: string
  col: number
  row: number
  at: number
}

export interface MultiplayerLevel {
  id: string
  name: string
  rows: string[]
  blueSpawns: Vec[]
  redSpawns: Vec[]
  retranslators: Vec[]
}

export interface MultiplayerMatchState {
  id: string
  phase: MatchPhase
  level: MultiplayerLevel
  terrain: TileKind[][]
  players: Record<string, MultiplayerPlayer>
  bullets: MultiplayerBullet[]
  deployables: MultiplayerDeployable[]
  portableRelays: MultiplayerPortableRelay[]
  portableSignalWaves: PortableSignalWave[]
  portableSignalContacts: PortableSignalContact[]
  equipmentAlerts: MultiplayerEquipmentAlert[]
  acousticEvents: AcousticEvent[]
  retranslators: Retranslator[]
  radio: TeamRadioMessage[]
  pings: TeamPing[]
  visionMemory: Record<Team, Record<string, VisionMemory>>
  scores: Record<Team, number>
  winner: Team | null
  nextId: number
  nextAcousticEventId: number
  time: number
  timeRemaining: number
  serverTick: number
}

export interface VisibleCell {
  col: number
  row: number
}

export interface VisiblePlayer {
  id: string
  name: string
  team: Team
  classId: TankClassId
  col: number
  row: number
  dir: Direction
  hp: number
  maxHp: number
  alive: boolean
  self: boolean
  move: {
    fromCol: number
    fromRow: number
    toCol: number
    toRow: number
    progress: number
    duration: number
  } | null
  pivot?: {
    direction: Direction
    progress: number
    holdSeconds: number
    queued: boolean
  } | null
}

export interface VisibleBullet {
  id: string
  team: Team
  shellKind: ClassShellKind
  x: number
  y: number
  dir: Direction
}

export interface SelfEquipmentSlotSnapshot {
  slot: 1 | 2
  kind: NativeClassKitKind
  state: 'ready' | 'hold' | 'out' | 'active' | 'cooldown'
  count: number
  progress: number | null
  remaining: number
  duration: number
}

export interface MultiplayerSelfSnapshot {
  classId: TankClassId
  hp: number
  maxHp: number
  shield: number
  shells: number
  shellCapacity: number
  shellRechargeProgress: number
  onAmmoStation: boolean
  reload: number
  reloadDuration: number
  equipment: SelfEquipmentSlotSnapshot[]
  portableRelay: {
    available: boolean
    activeCount: number
    limit: number
    state: 'ready' | 'hold' | 'out'
    progress: number | null
    remaining: number
    duration: number
    action: 'place' | 'recover' | null
    targetCol: number | null
    targetRow: number | null
    lastProcessedSeq: number
    label: string
  }
}

export type VisionCircleKind = 'self' | 'teammate' | 'relay'

export interface VisionCircle {
  id: string
  kind: VisionCircleKind
  x: number
  y: number
  radius: number
}

export interface MultiplayerSnapshot {
  kind: 'multiplayer-snapshot'
  roomId: string
  playerId: string
  team: Team
  phase: MatchPhase
  levelName: string
  time: number
  timeRemaining: number
  serverTick: number
  lastProcessedInputSeq: number
  scores: Record<Team, number>
  winner: Team | null
  self: MultiplayerSelfSnapshot
  visibleCells: VisibleCell[]
  visibleTerrain: Array<VisibleCell & { kind: TileKind }>
  players: VisiblePlayer[]
  bullets: VisibleBullet[]
  deployables: MultiplayerDeployable[]
  portableRelays: Array<Omit<MultiplayerPortableRelay, 'pulseTimer' | 'ownerId'>>
  portableSignals: {
    channel: 'relay-radar'
    waves: PortableSignalWave[]
    contacts: PortableSignalContact[]
  }
  equipmentAlerts: MultiplayerEquipmentAlert[]
  hearing?: {
    channel: 'physical'
    cues: AudibleAcousticCue[]
  }
  retranslators: Retranslator[]
  lastKnown: VisionMemory[]
  radio: TeamRadioMessage[]
  pings: TeamPing[]
  teamVisionMerged: boolean
  vision: {
    circles: VisionCircle[]
  }
  fog: {
    shape: 'circular'
    visibleCellCount: number
    hiddenCellCount: number
    visibleRetranslatorCount: number
    visionCircleCount: number
    teamVisionMerged: boolean
  }
}

const GRID_COLS = 20
const GRID_ROWS = 16
export const MULTIPLAYER_TUNING = {
  moveCooldown: TANK_CLASS_MECHANICS.movement.baseDurationSeconds,
  stationaryPivotHoldSeconds: TANK_CLASS_MECHANICS.grid.stationaryPivotHoldSeconds,
  reloadSeconds: TANK_CLASS_MECHANICS.weapon.baseReloadSeconds,
  bulletSpeed: TANK_CLASS_MECHANICS.weapon.projectileSpeedPixelsPerSecond / TANK_CLASS_MECHANICS.grid.tileSize,
  bulletTtlSeconds: TANK_CLASS_MECHANICS.weapon.projectileTtlSeconds,
  baseDamage: TANK_CLASS_MECHANICS.weapon.baseDamage,
  battleSplashRadiusTiles: TANK_CLASS_MECHANICS.weapon.battleSplashRadiusPixels / TANK_CLASS_MECHANICS.grid.tileSize,
  captureSeconds: 3.6,
  respawnSeconds: 3,
  shellCapacity: TANK_CLASS_MECHANICS.weapon.shellCapacity,
  shellRechargeSeconds: TANK_CLASS_MECHANICS.weapon.shellRechargeSeconds,
  deployablePlaceSeconds: TANK_CLASS_MECHANICS.deployable.placeSeconds,
  deployableRecoverSeconds: TANK_CLASS_MECHANICS.deployable.recoverSeconds,
  mineTriggerRangeCells: TANK_CLASS_MECHANICS.deployable.mineTriggerRangeCells,
  mineDamage: TANK_CLASS_MECHANICS.deployable.mineDamage,
  mineSlowSeconds: TANK_CLASS_MECHANICS.deployable.mineSlowSeconds,
  mineSlowMultiplier: TANK_CLASS_MECHANICS.movement.mineSlowMultiplier,
  steelTrapSeconds: TANK_CLASS_MECHANICS.deployable.steelTrapSeconds,
  bulwarkDurationSeconds: TANK_CLASS_MECHANICS.bulwark.durationSeconds,
  bulwarkCapacity: TANK_CLASS_MECHANICS.bulwark.capacity,
  bulwarkRechargeSeconds: TANK_CLASS_MECHANICS.bulwark.rechargeSeconds,
  traverseDurationSeconds: TANK_CLASS_MECHANICS.traverse.durationSeconds,
  traverseRechargeSeconds: TANK_CLASS_MECHANICS.traverse.rechargeSeconds,
  traverseMoveMultiplier: TANK_CLASS_MECHANICS.movement.traverseDurationMultiplier,
} as const

const MATCH_DURATION = 8 * 60
const RESPAWN_SECONDS = MULTIPLAYER_TUNING.respawnSeconds
export const STATIONARY_PIVOT_HOLD_SECONDS = MULTIPLAYER_TUNING.stationaryPivotHoldSeconds
const BULLET_SPEED = MULTIPLAYER_TUNING.bulletSpeed
const CAPTURE_SECONDS = MULTIPLAYER_TUNING.captureSeconds
const SHELL_CAPACITY = MULTIPLAYER_TUNING.shellCapacity
const SHELL_RECHARGE_SECONDS = MULTIPLAYER_TUNING.shellRechargeSeconds
const DEPLOYABLE_PLACE_SECONDS = MULTIPLAYER_TUNING.deployablePlaceSeconds
const DEPLOYABLE_RECOVER_SECONDS = MULTIPLAYER_TUNING.deployableRecoverSeconds
const EQUIPMENT_ALERT_SECONDS = TANK_CLASS_MECHANICS.deployable.alertTtlSeconds
const LAST_KNOWN_SECONDS = 3
const PLAYER_VISION_RADIUS = 2.75
const RELAY_VISION_RADIUS = 4.25
const PORTABLE_SIGNAL_WAVE_SNAPSHOT_LIMIT = 96
const PORTABLE_SIGNAL_CONTACT_SNAPSHOT_LIMIT = 48

const DIR_VECTORS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}
const DIRECTION_ORDER: Direction[] = ['up', 'right', 'down', 'left']

export const MULTIPLAYER_LEVEL: MultiplayerLevel = {
  id: 'relay-yard',
  name: 'Relay Yard',
  rows: [
    '....B....S....B.....',
    '.BB.A.B.....B..ABB..',
    '.....W..BBB..W......',
    '..B..W.......W..B...',
    '..B..S..BBB..S..B...',
    '......B.....B.......',
    'BBB.....SSS.....BBB.',
    '.....B.......B......',
    '......B.......B.....',
    '.BBB.....SSS.....BBB',
    '.......B.....B......',
    '...B..S..BBB..S..B..',
    '...B..W.......W..B..',
    '......W..BBB..W.....',
    '..BBA..B.....B.A.BB.',
    '.....B....S....B....',
  ],
  blueSpawns: [
    { x: 5, y: 14 },
    { x: 7, y: 14 },
    { x: 9, y: 14 },
    { x: 11, y: 14 },
  ],
  redSpawns: [
    { x: 5, y: 1 },
    { x: 7, y: 1 },
    { x: 9, y: 1 },
    { x: 11, y: 1 },
  ],
  retranslators: [
    { x: 4, y: 7 },
    { x: 10, y: 7 },
    { x: 15, y: 8 },
    { x: 10, y: 3 },
    { x: 10, y: 12 },
  ],
}

export function createMatchState(id = 'quick'): MultiplayerMatchState {
  assertLevel(MULTIPLAYER_LEVEL)

  return {
    id,
    phase: 'lobby',
    level: MULTIPLAYER_LEVEL,
    terrain: MULTIPLAYER_LEVEL.rows.map((row) => [...row].map(tileFromChar)),
    players: {},
    bullets: [],
    deployables: [],
    portableRelays: [],
    portableSignalWaves: [],
    portableSignalContacts: [],
    equipmentAlerts: [],
    acousticEvents: [],
    retranslators: MULTIPLAYER_LEVEL.retranslators.map((point, index) => ({
      id: `relay-${index + 1}`,
      col: point.x,
      row: point.y,
      owner: null,
      captureTeam: null,
      progress: 0,
    })),
    radio: [],
    pings: [],
    visionMemory: { blue: {}, red: {} },
    scores: { blue: 0, red: 0 },
    winner: null,
    nextId: 1,
    nextAcousticEventId: 1,
    time: 0,
    timeRemaining: MATCH_DURATION,
    serverTick: 0,
  }
}

export function addPlayer(
  state: MultiplayerMatchState,
  id: string,
  name: string,
  preferredTeam?: Team,
  classId?: TankClassId,
) {
  const team = preferredTeam ?? pickTeam(state)
  const spawn = pickSpawn(state, team, id)
  const classDefinition = getSharedTankClassDefinition(classId)
  const combat = getSharedTankClassCombatStats(classDefinition.id)
  const player: MultiplayerPlayer = {
    id,
    name: sanitizeName(name),
    team,
    classId: classDefinition.id,
    col: spawn.x,
    row: spawn.y,
    dir: team === 'blue' ? 'up' : 'down',
    hp: 3,
    maxHp: 3,
    shield: 0,
    alive: true,
    reload: 0,
    reloadDuration: combat.reloadDuration,
    shells: SHELL_CAPACITY,
    shellCapacity: SHELL_CAPACITY,
    shellRechargeProgress: 0,
    moveCooldown: 0,
    move: null,
    pivot: null,
    respawnTimer: 0,
    slow: 0,
    immobilized: 0,
    bulwarkRemaining: 0,
    bulwarkCapacity: 0,
    bulwarkCooldown: 0,
    traverseRemaining: 0,
    traverseCooldown: 0,
    equipmentHold: null,
    equipmentHeld: { 1: false, 2: false },
    equipmentConsumed: { 1: false, 2: false },
    lastEquipmentSeq: 0,
    portableRelayHold: null,
    portableRelayHeld: false,
    portableRelayConsumed: false,
    lastPortableRelaySeq: 0,
    score: 0,
    kills: 0,
    lastCommand: {},
    lastCommandSeq: 0,
  }
  state.players[id] = player
  refreshVisionMemory(state)
  return player
}

export function startMatch(state: MultiplayerMatchState) {
  if (state.phase !== 'lobby' || Object.keys(state.players).length === 0) return false
  state.phase = 'playing'
  return true
}

export function neutralizePlayerInput(state: MultiplayerMatchState, playerId: string) {
  const player = state.players[playerId]
  if (!player) return false
  player.lastCommand = {}
  player.move = null
  player.pivot = null
  player.equipmentHold = null
  player.equipmentHeld = { 1: false, 2: false }
  player.equipmentConsumed = { 1: false, 2: false }
  player.portableRelayHold = null
  player.portableRelayHeld = false
  player.portableRelayConsumed = false
  return true
}

export function setPlayerClass(state: MultiplayerMatchState, playerId: string, classId: TankClassId) {
  const player = state.players[playerId]
  if (!player || state.phase !== 'lobby') return false
  const classDefinition = getSharedTankClassDefinition(classId)
  const combat = getSharedTankClassCombatStats(classDefinition.id)
  neutralizePlayerInput(state, playerId)
  player.classId = classDefinition.id
  player.reloadDuration = combat.reloadDuration
  player.reload = 0
  player.shells = player.shellCapacity
  player.shellRechargeProgress = 0
  resetClassAbilities(player)
  state.deployables = state.deployables.filter((deployable) => deployable.ownerId !== playerId)
  removePortableRelaysForPlayer(state, playerId)
  return true
}

export function setPlayerTeam(state: MultiplayerMatchState, playerId: string, team: Team) {
  const player = state.players[playerId]
  if (!player || state.phase !== 'lobby') return false
  neutralizePlayerInput(state, playerId)
  const spawn = pickSpawn(state, team, playerId)
  player.team = team
  player.col = spawn.x
  player.row = spawn.y
  player.dir = team === 'blue' ? 'up' : 'down'
  player.hp = player.maxHp
  player.alive = true
  player.respawnTimer = 0
  removePortableRelaysForPlayer(state, playerId)
  refreshVisionMemory(state)
  return true
}

export function deactivatePlayer(state: MultiplayerMatchState, playerId: string) {
  const player = state.players[playerId]
  if (!player) return false
  neutralizePlayerInput(state, playerId)
  player.alive = false
  player.hp = 0
  player.respawnTimer = Number.POSITIVE_INFINITY
  state.bullets = state.bullets.filter((bullet) => bullet.ownerId !== playerId)
  return true
}

export function removePlayer(state: MultiplayerMatchState, id: string) {
  delete state.players[id]
  state.bullets = state.bullets.filter((bullet) => bullet.ownerId !== id)
  state.deployables = state.deployables.filter((deployable) => deployable.ownerId !== id)
  removePortableRelaysForPlayer(state, id)
}

export function setPlayerCommand(state: MultiplayerMatchState, playerId: string, command: PlayerCommand) {
  const player = state.players[playerId]
  if (!player) return false
  const incomingSeq = normalizeCommandSeq(command.seq)
  if (incomingSeq === null && player.lastCommandSeq > 0) {
    return true
  }
  if (incomingSeq !== null && incomingSeq <= player.lastCommandSeq) {
    return true
  }

  const previousDirection = directionFromCommand(player.lastCommand)
  player.lastCommand = {
    up: command.up === true,
    down: command.down === true,
    left: command.left === true,
    right: command.right === true,
    fire: command.fire === true,
    seq: command.seq,
  }
  if (incomingSeq !== null) {
    player.lastCommandSeq = incomingSeq
  }
  const nextDirection = directionFromCommand(player.lastCommand)
  if (player.traverseRemaining > 0) {
    player.pivot = null
    return true
  }
  if (!nextDirection) {
    if (player.pivot?.queued && player.move) {
      player.pivot.released = true
    } else {
      player.pivot = null
    }
  } else if (
    player.alive
    && nextDirection !== previousDirection
    && nextDirection !== player.dir
  ) {
    if (player.move) {
      player.pivot = {
        direction: nextDirection,
        elapsed: 0,
        queued: true,
        released: false,
      }
    } else {
      player.dir = nextDirection
      player.pivot = {
        direction: nextDirection,
        elapsed: 0,
        queued: false,
        released: false,
      }
    }
  } else if (nextDirection !== previousDirection && player.pivot?.queued) {
    player.pivot = null
  }
  return true
}

export function setPlayerEquipment(
  state: MultiplayerMatchState,
  playerId: string,
  slot: 1 | 2,
  down: boolean,
  seq?: number,
) {
  const player = state.players[playerId]
  if (!player || state.phase !== 'playing' || !player.alive) return false
  const incomingSeq = normalizeCommandSeq(seq)
  if (incomingSeq !== null && incomingSeq <= player.lastEquipmentSeq) return true
  if (incomingSeq !== null) player.lastEquipmentSeq = incomingSeq

  const wasDown = player.equipmentHeld[slot]
  player.equipmentHeld[slot] = down
  if (!down) {
    if (player.equipmentHold?.slot === slot) player.equipmentHold = null
    player.equipmentConsumed[slot] = false
    return true
  }
  if (wasDown) return true
  player.equipmentConsumed[slot] = false

  const kitKind = getSharedTankClassDefinition(player.classId).kit[slot - 1]
  if (kitKind === 'bulwark' || kitKind === 'traverse') {
    activateBattleAbility(player, kitKind)
    player.equipmentConsumed[slot] = true
    return true
  }
  beginDeployableHold(state, player, slot)
  return true
}

export function setPlayerPortableRelay(
  state: MultiplayerMatchState,
  playerId: string,
  down: boolean,
  seq?: number,
) {
  const player = state.players[playerId]
  if (!player || state.phase !== 'playing' || !player.alive) return false
  const incomingSeq = normalizeCommandSeq(seq)
  if (incomingSeq !== null && incomingSeq <= player.lastPortableRelaySeq) return true
  if (incomingSeq !== null) player.lastPortableRelaySeq = incomingSeq

  const wasDown = player.portableRelayHeld
  player.portableRelayHeld = down
  if (!down) {
    player.portableRelayHold = null
    player.portableRelayConsumed = false
    return true
  }
  if (wasDown) return true
  player.portableRelayConsumed = false
  beginPortableRelayHold(state, player)
  return true
}

export function addTeamRadioMessage(state: MultiplayerMatchState, playerId: string, command: TeamRadioCommand) {
  const player = state.players[playerId]
  if (!player || !TEAM_RADIO_COMMANDS.includes(command)) return null
  const message: TeamRadioMessage = {
    id: `radio-${state.nextId++}`,
    team: player.team,
    playerId,
    command,
    at: state.time,
  }
  state.radio.push(message)
  state.radio = state.radio.slice(-20)
  return message
}

export function addTeamPing(state: MultiplayerMatchState, playerId: string, col: number, row: number) {
  const player = state.players[playerId]
  if (!player || !isInBounds(col, row)) return null
  const ping: TeamPing = {
    id: `ping-${state.nextId++}`,
    team: player.team,
    playerId,
    col,
    row,
    at: state.time,
  }
  state.pings.push(ping)
  state.pings = state.pings.filter((candidate) => state.time - candidate.at <= 8)
  return ping
}

export function updateMatch(state: MultiplayerMatchState, dt: number) {
  if (state.phase !== 'playing') return
  const safeDt = Math.max(0, Math.min(0.1, dt))
  state.serverTick += 1
  state.time += safeDt
  state.timeRemaining = Math.max(0, state.timeRemaining - safeDt)

  for (const player of Object.values(state.players)) {
    updatePlayer(state, player, safeDt)
  }

  updateDeployables(state)
  updatePortableRelays(state, safeDt)
  updateBullets(state, safeDt)
  updateRetranslators(state, safeDt)
  refreshVisionMemory(state)
  state.radio = state.radio.filter((message) => state.time - message.at <= 8)
  state.pings = state.pings.filter((ping) => state.time - ping.at <= 8)
  state.equipmentAlerts = state.equipmentAlerts.filter((alert) => state.time - alert.at <= EQUIPMENT_ALERT_SECONDS)
  state.acousticEvents = pruneAcousticEvents(state.acousticEvents, state.time)

  if (state.timeRemaining <= 0) {
    finishByScore(state)
  }
}

export function createSnapshotForPlayer(state: MultiplayerMatchState, playerId: string): MultiplayerSnapshot | null {
  const player = state.players[playerId]
  if (!player) return null
  const vision = computeVisionModel(state, playerId)
  const visible = vision.visibleCells
  const visibleCells = visibleCellsFromSet(visible)
  const now = state.time
  const visiblePlayers = Object.values(state.players)
    .filter((candidate) => {
      const point = playerVisionPoint(candidate)
      return candidate.id === playerId || squareIntersectsVisionAperture(point, vision.circles)
    })
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      team: candidate.team,
      classId: candidate.classId,
      col: candidate.col,
      row: candidate.row,
      dir: candidate.dir,
      hp: candidate.hp,
      maxHp: candidate.maxHp,
      alive: candidate.alive,
      self: candidate.id === playerId,
      move: visibleMove(candidate),
      pivot: visiblePivot(candidate),
    }))
  const visiblePlayerIds = new Set(visiblePlayers.map((candidate) => candidate.id))
  const portableRelays = state.portableRelays
    .filter((relay) =>
      relay.team === player.team
      || isPointVisible(vision.circles, relay.col + 0.5, relay.row + 0.5),
    )
    .map(({ pulseTimer: _pulseTimer, ownerId: _ownerId, ...relay }) => ({ ...relay }))
  const portableSignalWaves = state.portableSignalWaves
    .filter((wave) =>
      wave.sourceTeam === player.team
      && Math.hypot(wave.x - (player.col + 0.5), wave.y - (player.row + 0.5)) <= 8,
    )
    .slice(-PORTABLE_SIGNAL_WAVE_SNAPSHOT_LIMIT)
    .map((wave) => clonePortableSignalWave(wave))
  const portableSignalContacts = state.portableSignalContacts
    .filter((contact) => contact.sourceTeam === player.team)
    .slice(-PORTABLE_SIGNAL_CONTACT_SNAPSHOT_LIMIT)
    .map((contact) => clonePortableSignalContact(contact))

  return {
    kind: 'multiplayer-snapshot',
    roomId: state.id,
    playerId,
    team: player.team,
    phase: state.phase,
    levelName: state.level.name,
    time: Number(state.time.toFixed(2)),
    timeRemaining: Number(state.timeRemaining.toFixed(2)),
    serverTick: state.serverTick,
    lastProcessedInputSeq: player.lastCommandSeq,
    scores: { ...state.scores },
    winner: state.winner,
    self: createSelfSnapshot(state, player),
    visibleCells,
    visibleTerrain: visibleCells.map((cell) => ({ ...cell, kind: state.terrain[cell.row]?.[cell.col] ?? 'steel' })),
    players: visiblePlayers,
    bullets: state.bullets
      .filter((bullet) => isPointVisible(vision.circles, bullet.x, bullet.y))
      .map((bullet) => ({
        id: bullet.id,
        team: bullet.team,
        shellKind: bullet.shellKind,
        x: Number(bullet.x.toFixed(2)),
        y: Number(bullet.y.toFixed(2)),
        dir: bullet.dir,
      })),
    deployables: state.deployables
      .filter((deployable) => deployable.team === player.team)
      .map((deployable) => ({ ...deployable })),
    portableRelays,
    portableSignals: {
      channel: 'relay-radar',
      waves: portableSignalWaves,
      contacts: portableSignalContacts,
    },
    equipmentAlerts: state.equipmentAlerts
      .filter((alert) => alert.team === player.team)
      .map((alert) => ({ ...alert })),
    hearing: {
      channel: 'physical',
      cues: projectAcousticEventsForListener({
        events: state.acousticEvents,
        listener: { col: player.col, row: player.row },
        now: state.time,
        isSourceVisible: (source) =>
          isPointVisible(vision.circles, source.col + 0.5, source.row + 0.5),
        isOccludingCell: (col, row) => isAcousticOccludingCell(state, col, row),
      }),
    },
    retranslators: state.retranslators
      .filter((relay) => isPointVisible(vision.circles, relay.col + 0.5, relay.row + 0.5))
      .map((relay) => ({ ...relay, progress: Number(relay.progress.toFixed(2)) })),
    lastKnown: Object.values(state.visionMemory[player.team]).filter((memory) => {
      const ttl = memory.id.startsWith('device-')
        ? TANK_CLASS_MECHANICS.deployable.decoyContactTtlSeconds
        : LAST_KNOWN_SECONDS
      return now - memory.seenAt <= ttl && !visiblePlayerIds.has(memory.id)
    }),
    radio: state.radio.filter((message) => message.team === player.team).slice(-3),
    pings: state.pings.filter((ping) => ping.team === player.team && isPointVisible(vision.circles, ping.col + 0.5, ping.row + 0.5)),
    teamVisionMerged: hasTeamRelay(state, player.team),
    vision: {
      circles: vision.circles.map((circle) => ({
        ...circle,
        x: Number(circle.x.toFixed(2)),
        y: Number(circle.y.toFixed(2)),
        radius: Number(circle.radius.toFixed(2)),
      })),
    },
    fog: {
      shape: 'circular',
      visibleCellCount: visible.size,
      hiddenCellCount: GRID_COLS * GRID_ROWS - visible.size,
      visibleRetranslatorCount: state.retranslators.filter((relay) =>
        isPointVisible(vision.circles, relay.col + 0.5, relay.row + 0.5),
      ).length,
      visionCircleCount: vision.circles.length,
      teamVisionMerged: hasTeamRelay(state, player.team),
    },
  }
}

export function computeVisibleSet(state: MultiplayerMatchState, playerId: string) {
  return computeVisionModel(state, playerId).visibleCells
}

export function computeVisionCircles(state: MultiplayerMatchState, playerId: string) {
  return computeVisionModel(state, playerId).circles
}

function computeVisionModel(state: MultiplayerMatchState, playerId: string) {
  const player = state.players[playerId]
  const circles: VisionCircle[] = []
  const visibleCells = new Set<string>()
  if (!player) return { circles, visibleCells }

  if (!hasTeamRelay(state, player.team)) {
    addPersonalVision(circles, player, 'self')
    addCircleCells(visibleCells, circles)
    return { circles, visibleCells }
  }

  for (const teammate of Object.values(state.players)) {
    if (teammate.team === player.team && teammate.alive) {
      addPersonalVision(circles, teammate, teammate.id === playerId ? 'self' : 'teammate')
    }
  }

  for (const relay of state.retranslators) {
    if (relay.owner === player.team) {
      circles.push({
        id: relay.id,
        kind: 'relay',
        x: relay.col + 0.5,
        y: relay.row + 0.5,
        radius: RELAY_VISION_RADIUS,
      })
    }
  }

  const uniqueCircles = dedupeVisionCircles(circles)
  addCircleCells(visibleCells, uniqueCircles)
  return { circles: uniqueCircles, visibleCells }
}

export function hasTeamRelay(state: MultiplayerMatchState, team: Team) {
  return state.retranslators.some((relay) => relay.owner === team)
}

function updatePlayer(state: MultiplayerMatchState, player: MultiplayerPlayer, dt: number) {
  player.reload = Math.max(0, player.reload - dt)
  player.moveCooldown = Math.max(0, player.moveCooldown - dt)
  player.slow = Math.max(0, player.slow - dt)
  player.immobilized = Math.max(0, player.immobilized - dt)
  player.bulwarkRemaining = Math.max(0, player.bulwarkRemaining - dt)
  player.bulwarkCooldown = Math.max(0, player.bulwarkCooldown - dt)
  player.traverseRemaining = Math.max(0, player.traverseRemaining - dt)
  player.traverseCooldown = Math.max(0, player.traverseCooldown - dt)
  if (player.bulwarkRemaining <= 0) player.bulwarkCapacity = 0
  const wasMoving = Boolean(player.move)
  updatePlayerMove(player, dt)

  if (!player.alive) {
    player.move = null
    player.pivot = null
    player.respawnTimer = Math.max(0, player.respawnTimer - dt)
    if (player.respawnTimer <= 0) {
      const spawn = pickSpawn(state, player.team, player.id)
      player.col = spawn.x
      player.row = spawn.y
      player.dir = player.team === 'blue' ? 'up' : 'down'
      player.hp = player.maxHp
      player.shells = player.shellCapacity
      player.shellRechargeProgress = 0
      player.slow = 0
      player.immobilized = 0
      player.alive = true
      player.pivot = null
    }
    return
  }

  updateShellRecharge(state, player, dt)
  updateEquipmentHold(state, player, dt)
  updatePortableRelayHold(state, player, dt)

  const direction = directionFromCommand(player.lastCommand)
  if (player.traverseRemaining > 0) {
    player.pivot = null
    if (direction && isTraverseMovementDirection(player.dir, direction)) {
      if (!player.move && player.moveCooldown <= 0 && player.immobilized <= 0) {
        movePlayer(state, player, direction)
      }
    }
    if (player.lastCommand.fire && player.reload <= 0 && player.shells > 0) {
      spawnBullet(state, player)
    }
    return
  }
  if (
    wasMoving
    && player.pivot?.queued
    && !player.pivot.released
    && direction === player.pivot.direction
  ) {
    player.pivot.elapsed = Math.min(
      STATIONARY_PIVOT_HOLD_SECONDS,
      player.pivot.elapsed + dt,
    )
  }
  if (player.move) {
    // Steering is buffered until the current tile movement finishes.
  } else if (player.pivot?.queued) {
    const queuedPivot = player.pivot
    player.dir = queuedPivot.direction
    const stillHeld = !queuedPivot.released && direction === queuedPivot.direction
    if (!stillHeld) {
      player.pivot = null
    } else {
      queuedPivot.queued = false
      if (
        queuedPivot.elapsed >= STATIONARY_PIVOT_HOLD_SECONDS
        && player.moveCooldown <= 0
      ) {
        player.pivot = null
        if (player.immobilized <= 0) movePlayer(state, player, queuedPivot.direction)
      }
    }
  } else if (!direction) {
    player.pivot = null
  } else {
    if (direction !== player.dir) {
      player.dir = direction
      player.pivot = { direction, elapsed: dt, queued: false, released: false }
    } else if (player.pivot?.direction === direction) {
      player.pivot.elapsed = Math.min(
        STATIONARY_PIVOT_HOLD_SECONDS,
        player.pivot.elapsed + dt,
      )
      if (
        player.pivot.elapsed >= STATIONARY_PIVOT_HOLD_SECONDS
        && player.moveCooldown <= 0
      ) {
        player.pivot = null
        if (player.immobilized <= 0) movePlayer(state, player, direction)
      }
    } else if (player.moveCooldown <= 0) {
      if (player.immobilized <= 0) movePlayer(state, player, direction)
    }
  }

  if (player.lastCommand.fire && player.reload <= 0 && player.shells > 0) {
    spawnBullet(state, player)
  }
}

function movePlayer(state: MultiplayerMatchState, player: MultiplayerPlayer, direction: Direction) {
  const vector = DIR_VECTORS[direction]
  const targetCol = player.col + vector.x
  const targetRow = player.row + vector.y
  if (!canTankOccupy(state, targetCol, targetRow, player.id)) return
  player.equipmentHold = null
  player.portableRelayHold = null
  const combat = getSharedTankClassCombatStats(player.classId)
  const slowMultiplier = player.slow > 0 ? MULTIPLAYER_TUNING.mineSlowMultiplier : 1
  const traverseMultiplier = player.traverseRemaining > 0 ? MULTIPLAYER_TUNING.traverseMoveMultiplier : 1
  const duration = combat.moveDuration * slowMultiplier * traverseMultiplier
  player.move = {
    fromCol: player.col,
    fromRow: player.row,
    toCol: targetCol,
    toRow: targetRow,
    elapsed: 0,
    duration,
  }
  player.col = targetCol
  player.row = targetRow
  player.moveCooldown = duration
  emitAcousticEvent(
    state,
    'tracks',
    { col: targetCol, row: targetRow },
    player.classId === 'battle' ? 1.25 : player.classId === 'scout' ? 0.8 : 1,
  )
}

function updatePlayerMove(player: MultiplayerPlayer, dt: number) {
  if (!player.move) {
    return
  }

  player.move.elapsed = Math.min(player.move.duration, player.move.elapsed + dt)

  if (player.move.elapsed >= player.move.duration) {
    player.move = null
  }
}

function visibleMove(player: MultiplayerPlayer): VisiblePlayer['move'] {
  if (!player.move) {
    return null
  }

  return {
    fromCol: player.move.fromCol,
    fromRow: player.move.fromRow,
    toCol: player.move.toCol,
    toRow: player.move.toRow,
    progress: Number(clampNumber(player.move.elapsed / player.move.duration, 0, 1).toFixed(3)),
    duration: Number(player.move.duration.toFixed(3)),
  }
}

function visiblePivot(player: MultiplayerPlayer): VisiblePlayer['pivot'] {
  if (!player.pivot) {
    return null
  }

  return {
    direction: player.pivot.direction,
    progress: Number(clampNumber(
      player.pivot.elapsed / STATIONARY_PIVOT_HOLD_SECONDS,
      0,
      1,
    ).toFixed(3)),
    holdSeconds: STATIONARY_PIVOT_HOLD_SECONDS,
    queued: player.pivot.queued,
  }
}

function clonePortableSignalWave(wave: PortableSignalWave): PortableSignalWave {
  const { sourceId: _sourceId, ...publicWave } = wave
  return {
    ...publicWave,
    x: Number(wave.x.toFixed(3)),
    y: Number(wave.y.toFixed(3)),
    previousX: Number(wave.previousX.toFixed(3)),
    previousY: Number(wave.previousY.toFixed(3)),
    age: Number(wave.age.toFixed(3)),
    ttl: Number(wave.ttl.toFixed(3)),
    strength: Number(wave.strength.toFixed(3)),
  }
}

function clonePortableSignalContact(contact: PortableSignalContact): PortableSignalContact {
  const {
    sourceId: _sourceId,
    targetId: _targetId,
    ...publicContact
  } = contact
  return {
    ...publicContact,
    id: contact.kind === 'hostile'
      ? `portable-contact-hostile-${contact.col}-${contact.row}`
      : contact.id,
    x: Number(contact.x.toFixed(3)),
    y: Number(contact.y.toFixed(3)),
    age: Number(contact.age.toFixed(3)),
    ttl: Number(contact.ttl.toFixed(3)),
    strength: Number(contact.strength.toFixed(3)),
  }
}

function resetClassAbilities(player: MultiplayerPlayer) {
  player.shield = 0
  player.slow = 0
  player.immobilized = 0
  player.bulwarkRemaining = 0
  player.bulwarkCapacity = 0
  player.bulwarkCooldown = 0
  player.traverseRemaining = 0
  player.traverseCooldown = 0
  player.equipmentHold = null
  player.equipmentHeld = { 1: false, 2: false }
  player.equipmentConsumed = { 1: false, 2: false }
  player.portableRelayHold = null
  player.portableRelayHeld = false
  player.portableRelayConsumed = false
}

function activateBattleAbility(player: MultiplayerPlayer, kind: 'bulwark' | 'traverse') {
  if (kind === 'bulwark' && player.bulwarkRemaining <= 0 && player.bulwarkCooldown <= 0) {
    player.bulwarkRemaining = MULTIPLAYER_TUNING.bulwarkDurationSeconds
    player.bulwarkCapacity = MULTIPLAYER_TUNING.bulwarkCapacity
    player.bulwarkCooldown = MULTIPLAYER_TUNING.bulwarkDurationSeconds + MULTIPLAYER_TUNING.bulwarkRechargeSeconds
  }
  if (kind === 'traverse' && player.traverseRemaining > 0) {
    player.traverseRemaining = 0
    player.traverseCooldown = Math.min(player.traverseCooldown, MULTIPLAYER_TUNING.traverseRechargeSeconds)
  } else if (kind === 'traverse' && player.traverseCooldown <= 0) {
    player.traverseRemaining = MULTIPLAYER_TUNING.traverseDurationSeconds
    player.traverseCooldown = MULTIPLAYER_TUNING.traverseDurationSeconds + MULTIPLAYER_TUNING.traverseRechargeSeconds
  }
}

function canDeployAt(
  state: MultiplayerMatchState,
  player: MultiplayerPlayer,
  kind: MultiplayerDeployableKind,
  col: number,
  row: number,
) {
  if (!isInBounds(col, row)) return false
  if (state.deployables.some((deployable) => deployable.ownerId === player.id && deployable.kind === kind)) return false
  if (state.deployables.some((deployable) => deployable.col === col && deployable.row === row)) return false
  if (state.portableRelays.some((relay) => relay.col === col && relay.row === row)) return false
  if (state.retranslators.some((relay) => relay.col === col && relay.row === row)) return false
  if (Object.values(state.players).some((candidate) =>
    candidate.id !== player.id && candidate.alive && candidate.col === col && candidate.row === row,
  )) return false
  const tile = state.terrain[row]?.[col] ?? 'steel'
  return tile === 'empty' || tile === 'trees' || tile === 'ammo'
}

function beginDeployableHold(
  state: MultiplayerMatchState,
  player: MultiplayerPlayer,
  slot: 1 | 2,
) {
  if (player.move || player.equipmentConsumed[slot] || !player.equipmentHeld[slot]) return false
  const kind = getSharedTankClassDefinition(player.classId).kit[slot - 1]
  if (kind === 'bulwark' || kind === 'traverse') return false
  const active = state.deployables.find((deployable) =>
    deployable.ownerId === player.id && deployable.kind === kind,
  ) ?? null
  const interaction = getClassDeployableInteraction(player, active)
  if (!interaction) return false
  if (interaction.action === 'place' && !canDeployAt(state, player, kind, interaction.col, interaction.row)) return false

  player.equipmentHold = {
    slot,
    kind,
    action: interaction.action,
    col: interaction.col,
    row: interaction.row,
    elapsed: 0,
    duration: interaction.action === 'recover' ? DEPLOYABLE_RECOVER_SECONDS : DEPLOYABLE_PLACE_SECONDS,
  }
  return true
}

function updateShellRecharge(state: MultiplayerMatchState, player: MultiplayerPlayer, dt: number) {
  const onAmmoStation = !player.move && state.terrain[player.row]?.[player.col] === 'ammo'
  if (!onAmmoStation || player.shells >= player.shellCapacity) {
    player.shellRechargeProgress = 0
    return
  }
  player.shellRechargeProgress += dt
  while (player.shellRechargeProgress >= SHELL_RECHARGE_SECONDS && player.shells < player.shellCapacity) {
    player.shells += 1
    player.shellRechargeProgress -= SHELL_RECHARGE_SECONDS
  }
}

function updateEquipmentHold(state: MultiplayerMatchState, player: MultiplayerPlayer, dt: number) {
  if (player.move) {
    player.equipmentHold = null
    return
  }
  let hold = player.equipmentHold
  if (!hold) {
    const slot = ([1, 2] as const).find((candidate) =>
      player.equipmentHeld[candidate] && !player.equipmentConsumed[candidate],
    )
    if (!slot || !beginDeployableHold(state, player, slot)) return
    hold = player.equipmentHold
  }
  if (!hold || !player.equipmentHeld[hold.slot]) return
  hold.elapsed = Math.min(hold.duration, hold.elapsed + dt)
  if (hold.elapsed < hold.duration) return

  if (hold.action === 'recover') {
    const deployableIndex = state.deployables.findIndex((deployable) =>
      deployable.ownerId === player.id
      && deployable.kind === hold.kind
      && deployable.col === hold.col
      && deployable.row === hold.row,
    )
    if (deployableIndex >= 0) state.deployables.splice(deployableIndex, 1)
  } else if (canDeployAt(state, player, hold.kind, hold.col, hold.row)) {
    state.deployables.push({
      id: `device-${state.nextId++}`,
      ownerId: player.id,
      team: player.team,
      kind: hold.kind,
      col: hold.col,
      row: hold.row,
    })
  }
  player.equipmentConsumed[hold.slot] = true
  player.equipmentHold = null
}

function beginPortableRelayHold(state: MultiplayerMatchState, player: MultiplayerPlayer) {
  if (player.move || player.portableRelayConsumed || !player.portableRelayHeld) return false
  const ownedRelays = state.portableRelays.filter((relay) => relay.ownerId === player.id)
  const interaction = getPortableRelayInteraction(
    player,
    ownedRelays,
    getPortableRelayLimit(player.classId),
  )
  if (!interaction) return false
  if (interaction.action === 'place' && !canPlacePortableRelayAt(state, player, interaction.col, interaction.row)) {
    return false
  }
  player.portableRelayHold = {
    action: interaction.action,
    relayId: interaction.action === 'recover' ? interaction.relayId : undefined,
    col: interaction.col,
    row: interaction.row,
    elapsed: 0,
    duration: interaction.duration,
  }
  return true
}

function updatePortableRelayHold(state: MultiplayerMatchState, player: MultiplayerPlayer, dt: number) {
  if (player.move) {
    player.portableRelayHold = null
    return
  }
  let hold = player.portableRelayHold
  if (!hold) {
    if (!player.portableRelayHeld || player.portableRelayConsumed) return
    if (!beginPortableRelayHold(state, player)) return
    hold = player.portableRelayHold
  }
  if (!hold || !player.portableRelayHeld) return
  hold.elapsed = Math.min(hold.duration, hold.elapsed + dt)
  if (hold.elapsed < hold.duration) return

  if (hold.action === 'recover') {
    const index = state.portableRelays.findIndex((relay) =>
      relay.id === hold.relayId
      && relay.ownerId === player.id
      && classCellDistance(player, relay) <= PORTABLE_RELAY_TUNING.recoverRangeCells,
    )
    if (index >= 0) {
      const [relay] = state.portableRelays.splice(index, 1)
      if (relay) clearPortableRelaySignals(state, new Set([relay.id]))
    }
  } else if (canPlacePortableRelayAt(state, player, hold.col, hold.row)) {
    state.portableRelays.push({
      id: `portable-relay-${state.nextId++}`,
      ownerId: player.id,
      team: player.team,
      col: hold.col,
      row: hold.row,
      pulseTimer: 0,
    })
  }
  player.portableRelayConsumed = true
  player.portableRelayHold = null
}

function canPlacePortableRelayAt(
  state: MultiplayerMatchState,
  player: MultiplayerPlayer,
  col: number,
  row: number,
) {
  if (!isInBounds(col, row)) return false
  if (
    state.portableRelays.filter((relay) => relay.ownerId === player.id).length
    >= getPortableRelayLimit(player.classId)
  ) return false
  if (state.portableRelays.some((relay) => relay.col === col && relay.row === row)) return false
  if (state.deployables.some((deployable) => deployable.col === col && deployable.row === row)) return false
  if (state.retranslators.some((relay) => relay.col === col && relay.row === row)) return false
  if (Object.values(state.players).some((candidate) =>
    candidate.id !== player.id && candidate.alive && candidate.col === col && candidate.row === row,
  )) return false
  const tile = state.terrain[row]?.[col] ?? 'steel'
  return tile === 'empty' || tile === 'trees' || tile === 'ammo'
}

function updatePortableRelays(state: MultiplayerMatchState, dt: number) {
  for (const relay of state.portableRelays) {
    relay.pulseTimer -= dt
    if (relay.pulseTimer > 0) continue
    state.portableSignalWaves.push(...createPortableSignalPulse({
      idPrefix: `portable-signal-${state.nextId++}`,
      center: { x: relay.col + 0.5, y: relay.row + 0.5 },
      cellSize: 1,
      sourceTeam: relay.team,
      sourceId: relay.id,
    }))
    relay.pulseTimer += PORTABLE_RELAY_TUNING.pulsePeriodSeconds
  }

  const hostileTargets: PortableSignalTarget[] = Object.values(state.players)
    .filter((player) => player.alive)
    .map((player) => ({
      id: player.id,
      team: player.team,
      col: player.col,
      row: player.row,
      x: player.col + PORTABLE_RELAY_TUNING.probeRadiusCells,
      y: player.row + PORTABLE_RELAY_TUNING.probeRadiusCells,
      width: 1 - PORTABLE_RELAY_TUNING.probeRadiusCells * 2,
      height: 1 - PORTABLE_RELAY_TUNING.probeRadiusCells * 2,
    }))
  const decoyTargets: PortableSignalTarget[] = state.deployables
    .filter((deployable) => deployable.kind === 'decoy')
    .map((deployable) => ({
      id: deployable.id,
      team: deployable.team,
      col: deployable.col,
      row: deployable.row,
      x: deployable.col + PORTABLE_RELAY_TUNING.decoyInsetCells,
      y: deployable.row + PORTABLE_RELAY_TUNING.decoyInsetCells,
      width: 1 - PORTABLE_RELAY_TUNING.decoyInsetCells * 2,
      height: 1 - PORTABLE_RELAY_TUNING.decoyInsetCells * 2,
    }))
  const result = advancePortableSignalField({
    waves: state.portableSignalWaves,
    contacts: state.portableSignalContacts,
    dt,
    environment: {
      cols: GRID_COLS,
      rows: GRID_ROWS,
      cellSize: 1,
      isSolidCell: (col, row) => {
        const tile = state.terrain[row]?.[col] ?? 'steel'
        return tile === 'brick' || tile === 'steel' || tile === 'water' || tile === 'base'
      },
      hostileTargets,
      decoyTargets,
    },
  })
  state.portableSignalWaves = result.waves
  state.portableSignalContacts = result.contacts
}

function removePortableRelaysForPlayer(state: MultiplayerMatchState, playerId: string) {
  const removedIds = new Set(
    state.portableRelays
      .filter((relay) => relay.ownerId === playerId)
      .map((relay) => relay.id),
  )
  if (removedIds.size === 0) return
  state.portableRelays = state.portableRelays.filter((relay) => relay.ownerId !== playerId)
  clearPortableRelaySignals(state, removedIds)
}

function clearPortableRelaySignals(state: MultiplayerMatchState, relayIds: ReadonlySet<string>) {
  state.portableSignalWaves = state.portableSignalWaves.filter((wave) =>
    !wave.sourceId || !relayIds.has(wave.sourceId),
  )
  state.portableSignalContacts = state.portableSignalContacts.filter((contact) =>
    !contact.sourceId || !relayIds.has(contact.sourceId),
  )
}

function updateDeployables(state: MultiplayerMatchState) {
  for (const deployable of [...state.deployables]) {
    if (deployable.kind === 'decoy') continue
    const target = Object.values(state.players).find((player) => {
      if (!player.alive || player.team === deployable.team) return false
      if (deployable.kind === 'mine') {
        return classCellDistance(player, deployable) <= MULTIPLAYER_TUNING.mineTriggerRangeCells
      }
      return player.col === deployable.col && player.row === deployable.row
    })
    if (!target) continue

    if (deployable.kind === 'tripwire') {
      emitAcousticEvent(state, 'trap', { col: deployable.col, row: deployable.row }, 0.8)
      addEquipmentAlert(state, deployable, 'tripwire')
    }
    if (deployable.kind === 'mine') {
      emitAcousticEvent(state, 'explosion', { col: deployable.col, row: deployable.row }, 1.1)
      applyDamage(state, deployable.ownerId, target, MULTIPLAYER_TUNING.mineDamage, false)
      if (target.alive) target.slow = Math.max(target.slow, MULTIPLAYER_TUNING.mineSlowSeconds)
    }
    if (deployable.kind === 'steel') {
      emitAcousticEvent(state, 'trap', { col: deployable.col, row: deployable.row })
      target.immobilized = Math.max(target.immobilized, MULTIPLAYER_TUNING.steelTrapSeconds)
      target.move = null
      target.moveCooldown = 0
      addEquipmentAlert(state, deployable, 'steel')
    }
    state.deployables = state.deployables.filter((candidate) => candidate.id !== deployable.id)
  }
}

function addEquipmentAlert(
  state: MultiplayerMatchState,
  deployable: MultiplayerDeployable,
  kind: MultiplayerEquipmentAlert['kind'],
) {
  state.equipmentAlerts.push({
    id: `alert-${state.nextId++}`,
    team: deployable.team,
    kind,
    col: deployable.col,
    row: deployable.row,
    at: state.time,
  })
}

function createSelfSnapshot(state: MultiplayerMatchState, player: MultiplayerPlayer): MultiplayerSelfSnapshot {
  const onAmmoStation = player.alive && !player.move && state.terrain[player.row]?.[player.col] === 'ammo'
  return {
    classId: player.classId,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.bulwarkRemaining > 0 ? player.bulwarkCapacity : player.shield,
    shells: player.shells,
    shellCapacity: player.shellCapacity,
    shellRechargeProgress: onAmmoStation && player.shells < player.shellCapacity
      ? Number(clampNumber(player.shellRechargeProgress / SHELL_RECHARGE_SECONDS, 0, 1).toFixed(3))
      : 0,
    onAmmoStation,
    reload: Number(player.reload.toFixed(3)),
    reloadDuration: Number(player.reloadDuration.toFixed(3)),
    equipment: [equipmentSlotSnapshot(state, player, 1), equipmentSlotSnapshot(state, player, 2)],
    portableRelay: portableRelaySelfSnapshot(state, player),
  }
}

function portableRelaySelfSnapshot(
  state: MultiplayerMatchState,
  player: MultiplayerPlayer,
): MultiplayerSelfSnapshot['portableRelay'] {
  const limit = getPortableRelayLimit(player.classId)
  const activeCount = state.portableRelays.filter((relay) => relay.ownerId === player.id).length
  const hold = player.portableRelayHold
  const progress = hold ? clampNumber(hold.elapsed / hold.duration, 0, 1) : null
  return {
    available: activeCount < limit,
    activeCount,
    limit,
    state: hold ? 'hold' : activeCount >= limit ? 'out' : 'ready',
    progress,
    remaining: hold ? Math.max(0, hold.duration - hold.elapsed) : 0,
    duration: hold?.duration ?? 0,
    action: hold?.action ?? null,
    targetCol: hold?.col ?? null,
    targetRow: hold?.row ?? null,
    lastProcessedSeq: player.lastPortableRelaySeq,
    label: hold
      ? `RELAY ${Math.round((progress ?? 0) * 100)}%`
      : limit > 1
        ? `RELAY ${activeCount}/${limit}`
        : activeCount > 0
          ? 'RELAY OUT'
          : 'RELAY READY',
  }
}

function equipmentSlotSnapshot(
  state: MultiplayerMatchState,
  player: MultiplayerPlayer,
  slot: 1 | 2,
): SelfEquipmentSlotSnapshot {
  const kind = getSharedTankClassDefinition(player.classId).kit[slot - 1]
  if (kind === 'bulwark') {
    if (player.bulwarkRemaining > 0) {
      return { slot, kind, state: 'active', count: player.bulwarkCapacity, progress: player.bulwarkRemaining / MULTIPLAYER_TUNING.bulwarkDurationSeconds, remaining: player.bulwarkRemaining, duration: MULTIPLAYER_TUNING.bulwarkDurationSeconds }
    }
    return abilityCooldownSnapshot(slot, kind, player.bulwarkCooldown, MULTIPLAYER_TUNING.bulwarkRechargeSeconds)
  }
  if (kind === 'traverse') {
    if (player.traverseRemaining > 0) {
      return { slot, kind, state: 'active', count: 1, progress: player.traverseRemaining / MULTIPLAYER_TUNING.traverseDurationSeconds, remaining: player.traverseRemaining, duration: MULTIPLAYER_TUNING.traverseDurationSeconds }
    }
    return abilityCooldownSnapshot(slot, kind, player.traverseCooldown, MULTIPLAYER_TUNING.traverseRechargeSeconds)
  }

  const active = state.deployables.some((deployable) => deployable.ownerId === player.id && deployable.kind === kind)
  const hold = player.equipmentHold?.slot === slot ? player.equipmentHold : null
  if (hold) {
    return { slot, kind, state: 'hold', count: active ? 0 : 1, progress: clampNumber(hold.elapsed / hold.duration, 0, 1), remaining: Math.max(0, hold.duration - hold.elapsed), duration: hold.duration }
  }
  return { slot, kind, state: active ? 'out' : 'ready', count: active ? 0 : 1, progress: null, remaining: 0, duration: 0 }
}

function abilityCooldownSnapshot(
  slot: 1 | 2,
  kind: 'bulwark' | 'traverse',
  cooldown: number,
  duration: number,
): SelfEquipmentSlotSnapshot {
  if (cooldown <= 0) return { slot, kind, state: 'ready', count: 1, progress: null, remaining: 0, duration }
  return { slot, kind, state: 'cooldown', count: 0, progress: 1 - clampNumber(cooldown / duration, 0, 1), remaining: cooldown, duration }
}

function spawnBullet(state: MultiplayerMatchState, player: MultiplayerPlayer) {
  const vector = DIR_VECTORS[player.dir]
  const combat = getSharedTankClassCombatStats(player.classId)
  state.bullets.push({
    id: `bullet-${state.nextId++}`,
    ownerId: player.id,
    team: player.team,
    shellKind: combat.shellKind,
    damage: combat.damage,
    splashDamage: combat.splashDamage,
    splashRadius: combat.splashRadiusPixels / TANK_CLASS_MECHANICS.grid.tileSize,
    x: player.col + 0.5 + vector.x * 0.45,
    y: player.row + 0.5 + vector.y * 0.45,
    dir: player.dir,
    ttl: MULTIPLAYER_TUNING.bulletTtlSeconds,
  })
  player.shells = Math.max(0, player.shells - 1)
  player.shellRechargeProgress = 0
  player.reloadDuration = combat.reloadDuration
  player.reload = player.reloadDuration
  emitAcousticEvent(state, 'shot', { col: player.col, row: player.row })
}

function updateBullets(state: MultiplayerMatchState, dt: number) {
  const kept: MultiplayerBullet[] = []

  for (const bullet of state.bullets) {
    const vector = DIR_VECTORS[bullet.dir]
    bullet.x += vector.x * BULLET_SPEED * dt
    bullet.y += vector.y * BULLET_SPEED * dt
    bullet.ttl -= dt
    const col = Math.floor(bullet.x)
    const row = Math.floor(bullet.y)

    if (bullet.ttl <= 0 || !isInBounds(col, row)) continue

    const tile = state.terrain[row]?.[col] ?? 'steel'
    if (tile === 'steel' || tile === 'water') {
      emitAcousticEvent(state, 'impact', { col, row })
      continue
    }
    if (tile === 'brick') {
      state.terrain[row][col] = 'empty'
      emitAcousticEvent(state, 'impact', { col, row }, 1.1)
      applySplashTerrainDamage(state, bullet, bullet.x, bullet.y, col, row)
      applySplashDamage(state, bullet, bullet.x, bullet.y)
      continue
    }

    const hit = Object.values(state.players).find(
      (player) => player.alive && player.team !== bullet.team && player.col === col && player.row === row,
    )
    if (hit) {
      applyDamage(state, bullet.ownerId, hit, bullet.damage)
      applySplashTerrainDamage(state, bullet, bullet.x, bullet.y, col, row)
      applySplashDamage(state, bullet, bullet.x, bullet.y, hit.id)
      continue
    }

    kept.push(bullet)
  }

  state.bullets = kept
}

function applyDamage(
  state: MultiplayerMatchState,
  attackerId: string,
  target: MultiplayerPlayer,
  damage: number,
  emitImpact = true,
) {
  let remainingDamage = Math.max(0, damage)
  if (target.bulwarkRemaining > 0 && target.bulwarkCapacity > 0) {
    const absorbed = Math.min(target.bulwarkCapacity, remainingDamage)
    target.bulwarkCapacity -= absorbed
    remainingDamage -= absorbed
    if (target.bulwarkCapacity <= 0) {
      target.bulwarkRemaining = 0
      target.bulwarkCooldown = Math.min(target.bulwarkCooldown, MULTIPLAYER_TUNING.bulwarkRechargeSeconds)
    }
  }
  if (remainingDamage <= 0 || !target.alive) return
  target.hp -= remainingDamage
  if (target.hp <= 0) {
    killPlayer(state, attackerId, target)
    if (emitImpact) {
      emitAcousticEvent(state, 'explosion', { col: target.col, row: target.row })
    }
  } else if (emitImpact) {
    emitAcousticEvent(state, 'impact', { col: target.col, row: target.row })
  }
}

function applySplashDamage(
  state: MultiplayerMatchState,
  bullet: MultiplayerBullet,
  impactX: number,
  impactY: number,
  directHitId?: string,
) {
  if (bullet.splashDamage <= 0) return
  for (const player of Object.values(state.players)) {
    if (
      player.alive
      && player.team !== bullet.team
      && player.id !== directHitId
      && Math.hypot(player.col + 0.5 - impactX, player.row + 0.5 - impactY) <= bullet.splashRadius
    ) {
      applyDamage(state, bullet.ownerId, player, bullet.splashDamage)
    }
  }
}

function applySplashTerrainDamage(
  state: MultiplayerMatchState,
  bullet: MultiplayerBullet,
  impactX: number,
  impactY: number,
  directCol: number,
  directRow: number,
) {
  if (bullet.splashDamage <= 0 || bullet.splashRadius <= 0) return
  const cellRadius = Math.ceil(bullet.splashRadius)
  for (let row = directRow - cellRadius; row <= directRow + cellRadius; row += 1) {
    for (let col = directCol - cellRadius; col <= directCol + cellRadius; col += 1) {
      if (col === directCol && row === directRow) continue
      if (state.terrain[row]?.[col] !== 'brick') continue
      if (Math.hypot(col + 0.5 - impactX, row + 0.5 - impactY) > bullet.splashRadius) continue
      state.terrain[row][col] = 'empty'
    }
  }
}

function killPlayer(state: MultiplayerMatchState, killerId: string, victim: MultiplayerPlayer) {
  victim.alive = false
  victim.respawnTimer = RESPAWN_SECONDS
  victim.lastCommand = {}
  victim.move = null
  victim.pivot = null
  victim.equipmentHold = null
  victim.equipmentHeld = { 1: false, 2: false }
  victim.equipmentConsumed = { 1: false, 2: false }
  victim.portableRelayHold = null
  victim.portableRelayHeld = false
  victim.portableRelayConsumed = false
  victim.bulwarkRemaining = 0
  victim.bulwarkCapacity = 0
  victim.traverseRemaining = 0
  victim.hp = 0
  const killer = state.players[killerId]
  if (killer) {
    killer.kills += 1
    killer.score += 1
    state.scores[killer.team] += 1
    if (state.scores[killer.team] >= 15) {
      state.phase = 'finished'
      state.winner = killer.team
    }
  }
}

function updateRetranslators(state: MultiplayerMatchState, dt: number) {
  for (const relay of state.retranslators) {
    const adjacent = { blue: 0, red: 0 }
    for (const player of Object.values(state.players)) {
      if (player.alive && manhattan(player.col, player.row, relay.col, relay.row) <= 1) {
        adjacent[player.team] += 1
      }
    }

    const capturingTeam = adjacent.blue > 0 && adjacent.red === 0 ? 'blue' : adjacent.red > 0 && adjacent.blue === 0 ? 'red' : null
    if (!capturingTeam) continue

    if (relay.captureTeam !== capturingTeam) {
      relay.captureTeam = capturingTeam
      relay.progress = relay.owner === capturingTeam ? 1 : 0
    }

    relay.progress = Math.min(1, relay.progress + dt / CAPTURE_SECONDS)
    if (relay.progress >= 1) {
      relay.owner = capturingTeam
      relay.captureTeam = capturingTeam
    }
  }
}

function refreshVisionMemory(state: MultiplayerMatchState) {
  for (const team of ['blue', 'red'] as Team[]) {
    const teammates = Object.values(state.players).filter((player) => player.team === team && player.alive)
    if (teammates.length === 0) continue

    for (const teammate of teammates) {
      const circles = computeVisionCircles(state, teammate.id)
      for (const player of Object.values(state.players)) {
        const point = playerVisionPoint(player)
        if (player.team !== team && player.alive && isPointVisible(circles, point.x, point.y)) {
          state.visionMemory[team][player.id] = {
            id: player.id,
            team: player.team,
            col: player.col,
            row: player.row,
            seenAt: state.time,
          }
        }
      }
    }

    const relayCircles = state.retranslators
      .filter((relay) => relay.owner === team)
      .map((relay) => ({
        id: relay.id,
        kind: 'relay' as const,
        x: relay.col + 0.5,
        y: relay.row + 0.5,
        radius: RELAY_VISION_RADIUS,
      }))
    for (const decoy of state.deployables) {
      if (
        decoy.kind === 'decoy'
        && decoy.team !== team
        && isPointVisible(relayCircles, decoy.col + 0.5, decoy.row + 0.5)
      ) {
        state.visionMemory[team][decoy.id] = {
          id: decoy.id,
          team: decoy.team,
          col: decoy.col,
          row: decoy.row,
          seenAt: state.time,
        }
      }
    }
  }
}

function normalizeCommandSeq(seq: number | undefined) {
  return Number.isFinite(seq) ? Math.max(0, Math.floor(seq as number)) : null
}

function addPersonalVision(circles: VisionCircle[], player: MultiplayerPlayer, kind: VisionCircleKind) {
  if (!player.alive) return
  const point = playerVisionPoint(player)
  circles.push({
    id: player.id,
    kind,
    x: point.x,
    y: point.y,
    radius: PLAYER_VISION_RADIUS,
  })
}

function playerVisionPoint(player: MultiplayerPlayer) {
  if (!player.move) {
    return { x: player.col + 0.5, y: player.row + 0.5 }
  }

  const progress = clampNumber(player.move.elapsed / player.move.duration, 0, 1)

  return {
    x: player.move.fromCol + 0.5 + (player.move.toCol - player.move.fromCol) * progress,
    y: player.move.fromRow + 0.5 + (player.move.toRow - player.move.fromRow) * progress,
  }
}

function addCircleCells(visible: Set<string>, circles: VisionCircle[]) {
  for (const circle of circles) {
    const startCol = Math.max(0, Math.floor(circle.x - circle.radius))
    const endCol = Math.min(GRID_COLS - 1, Math.floor(circle.x + circle.radius))
    const startRow = Math.max(0, Math.floor(circle.y - circle.radius))
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(circle.y + circle.radius))

    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        if (tileIntersectsCircle(col, row, circle)) {
          addCell(visible, col, row)
        }
      }
    }
  }
}

function tileIntersectsCircle(col: number, row: number, circle: VisionCircle) {
  const nearestX = clampNumber(circle.x, col, col + 1)
  const nearestY = clampNumber(circle.y, row, row + 1)
  return distanceSquared(nearestX, nearestY, circle.x, circle.y) <= circle.radius * circle.radius
}

function isPointVisible(circles: VisionCircle[], x: number, y: number) {
  return circles.some((circle) => distanceSquared(x, y, circle.x, circle.y) <= circle.radius * circle.radius)
}

function dedupeVisionCircles(circles: VisionCircle[]) {
  const seen = new Set<string>()
  return circles.filter((circle) => {
    const circleKey = `${circle.kind}:${circle.id}`
    if (seen.has(circleKey)) return false
    seen.add(circleKey)
    return true
  })
}

function visibleCellsFromSet(visible: Set<string>) {
  return [...visible].map(cellFromKey).sort((a, b) => a.row - b.row || a.col - b.col)
}

function distanceSquared(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function addCell(visible: Set<string>, col: number, row: number) {
  if (isInBounds(col, row)) visible.add(key(col, row))
}

function directionFromCommand(command: PlayerCommand): Direction | null {
  if (command.up) return 'up'
  if (command.down) return 'down'
  if (command.left) return 'left'
  if (command.right) return 'right'
  return null
}

function canTankOccupy(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  if (!isInBounds(col, row)) return false
  const tile = state.terrain[row]?.[col] ?? 'steel'
  if (tile !== 'empty' && tile !== 'trees' && tile !== 'ammo') return false
  return !Object.values(state.players).some((player) => player.id !== playerId && player.alive && player.col === col && player.row === row)
}

function canTankSpawnAt(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  return canTankOccupy(state, col, row, playerId) && hasTankSpawnExit(state, col, row, playerId)
}

function hasTankSpawnExit(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  return DIRECTION_ORDER.some((direction) => {
    const vector = DIR_VECTORS[direction]
    return canTankOccupy(state, col + vector.x, row + vector.y, playerId)
  })
}

function pickTeam(state: MultiplayerMatchState): Team {
  const players = Object.values(state.players)
  const blue = players.filter((player) => player.team === 'blue').length
  const red = players.length - blue
  return blue <= red ? 'blue' : 'red'
}

function pickSpawn(state: MultiplayerMatchState, team: Team, playerId = '') {
  const spawns = team === 'blue' ? state.level.blueSpawns : state.level.redSpawns
  const spawn = resolveMultiplayerSpawn(state, spawns, playerId) ?? findFirstMultiplayerSpawn(state, playerId)

  if (!spawn) {
    throw new Error('No safe multiplayer spawn available')
  }

  return spawn
}

function resolveMultiplayerSpawn(state: MultiplayerMatchState, preferredSpawns: Vec[], playerId: string) {
  const queue: Vec[] = []
  const visited = new Set<string>()

  for (const spawn of preferredSpawns.length > 0 ? preferredSpawns : [{ x: 1, y: 1 }]) {
    const start = {
      x: clampInt(spawn.x, 0, GRID_COLS - 1),
      y: clampInt(spawn.y, 0, GRID_ROWS - 1),
    }
    const startKey = key(start.x, start.y)

    if (!visited.has(startKey)) {
      visited.add(startKey)
      queue.push(start)
    }
  }

  while (queue.length > 0) {
    const cell = queue.shift()
    if (!cell) break

    if (canTankSpawnAt(state, cell.x, cell.y, playerId)) {
      return cell
    }

    for (const direction of DIRECTION_ORDER) {
      const vector = DIR_VECTORS[direction]
      const next = { x: cell.x + vector.x, y: cell.y + vector.y }
      const nextKey = key(next.x, next.y)

      if (!isInBounds(next.x, next.y) || visited.has(nextKey)) {
        continue
      }

      visited.add(nextKey)
      queue.push(next)
    }
  }

  return null
}

function findFirstMultiplayerSpawn(state: MultiplayerMatchState, playerId: string) {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (canTankSpawnAt(state, col, row, playerId)) {
        return { x: col, y: row }
      }
    }
  }

  return null
}

function finishByScore(state: MultiplayerMatchState) {
  state.phase = 'finished'
  state.winner = state.scores.blue === state.scores.red ? null : state.scores.blue > state.scores.red ? 'blue' : 'red'
}

function emitAcousticEvent(
  state: MultiplayerMatchState,
  kind: AcousticEventKind,
  source: { col: number; row: number },
  intensity = 1,
) {
  state.acousticEvents = pruneAcousticEvents([
    ...state.acousticEvents,
    createAcousticEvent({
      id: `acoustic-${state.nextAcousticEventId++}`,
      kind,
      source,
      emittedAt: state.time,
      intensity,
    }),
  ], state.time)
}

function isAcousticOccludingCell(
  state: MultiplayerMatchState,
  col: number,
  row: number,
) {
  const kind = state.terrain[row]?.[col]
  return kind === 'brick' || kind === 'steel' || kind === 'base'
}

function tileFromChar(char: string): TileKind {
  if (char === 'B') return 'brick'
  if (char === 'S') return 'steel'
  if (char === 'W') return 'water'
  if (char === 'T') return 'trees'
  if (char === 'A') return 'ammo'
  return 'empty'
}

function sanitizeName(name: string) {
  return name.replace(/[^\w -]/g, '').trim().slice(0, 18) || 'Rookie'
}

function isInBounds(col: number, row: number) {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function key(col: number, row: number) {
  return `${col},${row}`
}

function cellFromKey(value: string) {
  const [col = 0, row = 0] = value.split(',').map(Number)
  return { col, row }
}

function manhattan(aCol: number, aRow: number, bCol: number, bRow: number) {
  return Math.abs(aCol - bCol) + Math.abs(aRow - bRow)
}

function assertLevel(level: MultiplayerLevel) {
  if (level.rows.length !== GRID_ROWS || level.rows.some((row) => row.length !== GRID_COLS)) {
    throw new Error(`Multiplayer level must be ${GRID_COLS}x${GRID_ROWS}`)
  }
  if (level.retranslators.length < 3) {
    throw new Error('Multiplayer level must include at least three retranslators')
  }
}
