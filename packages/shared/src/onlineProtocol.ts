import { TEAM_RADIO_COMMANDS, type Direction, type MultiplayerSnapshot, type Team, type TeamRadioCommand } from './multiplayer.js'
import { DEFAULT_TANK_CLASS, isTankClassId, type TankClassId } from './tankClasses.js'

export const ONLINE_PROTOCOL_VERSION = 5
export const ROOM_KEY_LENGTH = 6
export const ROOM_KEY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const MAX_ROOM_PLAYERS = 4
export const MAX_PLAYER_NAME_LENGTH = 18
export const MAX_CLIENT_MESSAGE_BYTES = 2048
export const RECONNECTION_WINDOW_SECONDS = 15
export const COUNTDOWN_SECONDS = 3
export const TERMINAL_GRACE_SECONDS = 30

export type RoomPhase = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'RESULTS' | 'DESTROYED'
export type TerminalReason = 'SCORE_LIMIT' | 'TIME_LIMIT' | 'FORFEIT' | 'NO_CONTEST'
export type ConnectionQuality = 'Measuring' | 'Good' | 'Unstable' | 'Poor' | 'Disconnected'

export type OnlineErrorCode =
  | 'PROTOCOL_VERSION_UNSUPPORTED'
  | 'MESSAGE_INVALID'
  | 'MESSAGE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'ROOM_KEY_INVALID'
  | 'ROOM_KEY_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_LOCKED'
  | 'ROOM_DESTROYED'
  | 'PLAYER_KICKED'
  | 'NOT_HOST'
  | 'HOST_CANNOT_KICK_SELF'
  | 'PLAYER_NOT_FOUND'
  | 'COMMAND_NOT_ALLOWED'
  | 'TEAMS_INVALID'
  | 'PLAYERS_NOT_READY'
  | 'PLAYER_DISCONNECTED'
  | 'RECONNECTION_EXPIRED'
  | 'RESULT_ALREADY_COMMITTED'

export interface LobbyPlayerView {
  playerId: string
  name: string
  team: Team
  classId: TankClassId
  ready: boolean
  connected: boolean
  host: boolean
  connectionEpoch: number
  quality: ConnectionQuality
}

export interface LobbyView {
  phase: RoomPhase
  version: number
  selfPlayerId: string
  hostPlayerId: string
  players: LobbyPlayerView[]
  countdownEndsAt: number | null
  roomKey?: string
}

export interface NetworkSummary {
  rttMedianMs: number | null
  rttP95Ms: number | null
  jitterMs: number | null
  missedHeartbeats: number
  stallCount: number
  stallDurationMs: number
  inputAckMedianMs: number | null
  inputAckP95Ms: number | null
  snapshotGapP95Ms: number | null
  reconnectCount: number
  reconnectSuccessCount: number
  reconnectFailureCount: number
  backpressureEvents: number
  serverTickP95Ms: number | null
  serverTickMaxMs: number | null
  serverTickDriftMs: number | null
  serverTickOverruns: number
  clientFpsMedian: number | null
  clientLongFrames: number
  hiddenHeartbeatCount: number
}

export interface MatchResult {
  matchId: string
  resultId: string
  finalServerTick: number
  scores: Record<Team, number>
  winner: Team | null
  reason: TerminalReason
  network: NetworkSummary
}

export interface RematchStatus {
  resultId: string
  available: boolean
  votes: number
  required: number
  selfVoted: boolean
}

export type ClientRoomMessage =
  | { type: 'team'; protocolVersion: number; team: Team }
  | { type: 'class'; protocolVersion: number; classId: TankClassId }
  | { type: 'ready'; protocolVersion: number; ready: boolean }
  | { type: 'start'; protocolVersion: number }
  | { type: 'kick'; protocolVersion: number; playerId: string }
  | { type: 'input'; protocolVersion: number; inputSeq: number; up?: boolean; down?: boolean; left?: boolean; right?: boolean; fire?: boolean }
  | { type: 'equipment'; protocolVersion: number; equipmentSeq: number; slot: 1 | 2; down: boolean }
  | { type: 'relay'; protocolVersion: number; relaySeq: number; down: boolean }
  | { type: 'radio'; protocolVersion: number; command: TeamRadioCommand }
  | { type: 'ping'; protocolVersion: number; col: number; row: number }
  | { type: 'heartbeat'; protocolVersion: number; heartbeatSeq: number; clientSentAt: number; pageVisible: boolean; fps?: number; longFrames?: number; rttMs?: number; inputAckMs?: number; snapshotGapMs?: number; quality?: ConnectionQuality }
  | { type: 'result_ack'; protocolVersion: number; resultId: string }
  | { type: 'result_choice'; protocolVersion: number; resultId: string; choice: 'rematch' | 'close' }

export type ServerRoomMessage =
  | { type: 'lobby'; lobby: LobbyView }
  | { type: 'snapshot'; snapshot: MultiplayerSnapshot }
  | { type: 'result'; result: MatchResult }
  | { type: 'rematch_status'; status: RematchStatus }
  | { type: 'error'; code: OnlineErrorCode; message: string }
  | { type: 'heartbeat_ack'; heartbeatSeq: number; clientSentAt: number; serverReceivedAt: number; serverSentAt: number; serverTick: number }
  | { type: 'room_key'; roomKey: string }

export interface JoinRoomOptions {
  protocolVersion: number
  name: string
  classId: TankClassId
  roomKey?: string
  create?: boolean
}

export interface ValidationSuccess<T> {
  ok: true
  value: T
}

export interface ValidationFailure {
  ok: false
  code: OnlineErrorCode
  message: string
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export function normalizeRoomKey(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
}

export function isRoomKey(value: unknown) {
  const normalized = normalizeRoomKey(value)
  return normalized.length === ROOM_KEY_LENGTH && [...normalized].every((character) => ROOM_KEY_ALPHABET.includes(character))
}

export function sanitizePlayerName(value: unknown) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return [...normalized].slice(0, MAX_PLAYER_NAME_LENGTH).join('') || 'Rookie'
}

export function validateJoinRoomOptions(value: unknown): ValidationResult<JoinRoomOptions> {
  if (!isRecord(value)) return invalid('MESSAGE_INVALID', 'Join options must be an object.')
  if (value.protocolVersion !== ONLINE_PROTOCOL_VERSION) {
    return invalid('PROTOCOL_VERSION_UNSUPPORTED', `Protocol version ${ONLINE_PROTOCOL_VERSION} is required.`)
  }

  const create = value.create === true
  const roomKey = value.roomKey === undefined ? undefined : normalizeRoomKey(value.roomKey)
  if (!create && !isRoomKey(roomKey)) return invalid('ROOM_KEY_INVALID', 'Enter a valid six-character room key.')

  return {
    ok: true,
    value: {
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      name: sanitizePlayerName(value.name),
      classId: isTankClassId(value.classId) ? value.classId : DEFAULT_TANK_CLASS,
      roomKey,
      create,
    },
  }
}

export function validateClientRoomMessage(value: unknown): ValidationResult<ClientRoomMessage> {
  if (!isRecord(value) || typeof value.type !== 'string') return invalid('MESSAGE_INVALID', 'Message must be an object with a type.')
  if (value.protocolVersion !== ONLINE_PROTOCOL_VERSION) {
    return invalid('PROTOCOL_VERSION_UNSUPPORTED', `Protocol version ${ONLINE_PROTOCOL_VERSION} is required.`)
  }

  if (value.type === 'team' && (value.team === 'blue' || value.team === 'red')) {
    return valid({ type: 'team', protocolVersion: ONLINE_PROTOCOL_VERSION, team: value.team })
  }
  if (value.type === 'class' && isTankClassId(value.classId)) {
    return valid({ type: 'class', protocolVersion: ONLINE_PROTOCOL_VERSION, classId: value.classId })
  }
  if (value.type === 'ready' && typeof value.ready === 'boolean') {
    return valid({ type: 'ready', protocolVersion: ONLINE_PROTOCOL_VERSION, ready: value.ready })
  }
  if (value.type === 'start') return valid({ type: 'start', protocolVersion: ONLINE_PROTOCOL_VERSION })
  if (value.type === 'kick' && isBoundedText(value.playerId, 1, 80)) {
    return valid({ type: 'kick', protocolVersion: ONLINE_PROTOCOL_VERSION, playerId: value.playerId })
  }
  if (value.type === 'input' && isSafeInteger(value.inputSeq, 0)) {
    const activeDirections = [value.up, value.down, value.left, value.right].filter((entry) => entry === true).length
    if (activeDirections > 1) return invalid('MESSAGE_INVALID', 'Only one movement direction may be active.')
    return valid({
      type: 'input',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      inputSeq: value.inputSeq,
      up: value.up === true,
      down: value.down === true,
      left: value.left === true,
      right: value.right === true,
      fire: value.fire === true,
    })
  }
  if (
    value.type === 'equipment'
    && isSafeInteger(value.equipmentSeq, 0)
    && (value.slot === 1 || value.slot === 2)
    && typeof value.down === 'boolean'
  ) {
    return valid({
      type: 'equipment',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      equipmentSeq: value.equipmentSeq,
      slot: value.slot,
      down: value.down,
    })
  }
  if (
    value.type === 'relay'
    && isSafeInteger(value.relaySeq, 0)
    && typeof value.down === 'boolean'
  ) {
    return valid({
      type: 'relay',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      relaySeq: value.relaySeq,
      down: value.down,
    })
  }
  if (value.type === 'radio' && isTeamRadioCommand(value.command)) {
    return valid({ type: 'radio', protocolVersion: ONLINE_PROTOCOL_VERSION, command: value.command })
  }
  if (value.type === 'ping' && isSafeInteger(value.col, 0, 19) && isSafeInteger(value.row, 0, 15)) {
    return valid({ type: 'ping', protocolVersion: ONLINE_PROTOCOL_VERSION, col: value.col, row: value.row })
  }
  if (
    value.type === 'heartbeat'
    && isSafeInteger(value.heartbeatSeq, 0)
    && isFiniteNumber(value.clientSentAt, 0)
    && typeof value.pageVisible === 'boolean'
  ) {
    return valid({
      type: 'heartbeat',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      heartbeatSeq: value.heartbeatSeq,
      clientSentAt: value.clientSentAt,
      pageVisible: value.pageVisible,
      fps: isFiniteNumber(value.fps, 0, 1000) ? value.fps : undefined,
      longFrames: isSafeInteger(value.longFrames, 0, 1_000_000) ? value.longFrames : undefined,
      rttMs: isFiniteNumber(value.rttMs, 0, 60_000) ? value.rttMs : undefined,
      inputAckMs: isFiniteNumber(value.inputAckMs, 0, 60_000) ? value.inputAckMs : undefined,
      snapshotGapMs: isFiniteNumber(value.snapshotGapMs, 0, 60_000) ? value.snapshotGapMs : undefined,
      quality: isConnectionQuality(value.quality) ? value.quality : undefined,
    })
  }
  if (value.type === 'result_ack' && isBoundedText(value.resultId, 1, 120)) {
    return valid({ type: 'result_ack', protocolVersion: ONLINE_PROTOCOL_VERSION, resultId: value.resultId })
  }
  if (
    value.type === 'result_choice'
    && isBoundedText(value.resultId, 1, 120)
    && (value.choice === 'rematch' || value.choice === 'close')
  ) {
    return valid({
      type: 'result_choice',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      resultId: value.resultId,
      choice: value.choice,
    })
  }

  return invalid('MESSAGE_INVALID', `Invalid ${value.type} message.`)
}

export function estimateMessageBytes(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export function directionFromInput(message: Extract<ClientRoomMessage, { type: 'input' }>): Direction | null {
  if (message.up) return 'up'
  if (message.down) return 'down'
  if (message.left) return 'left'
  if (message.right) return 'right'
  return null
}

function valid<T>(value: T): ValidationSuccess<T> {
  return { ok: true, value }
}

function invalid(code: OnlineErrorCode, message: string): ValidationFailure {
  return { ok: false, code, message }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoundedText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max
}

function isSafeInteger(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
}

function isFiniteNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isConnectionQuality(value: unknown): value is ConnectionQuality {
  return value === 'Measuring' || value === 'Good' || value === 'Unstable' || value === 'Poor' || value === 'Disconnected'
}

function isTeamRadioCommand(value: unknown): value is TeamRadioCommand {
  return typeof value === 'string' && TEAM_RADIO_COMMANDS.includes(value as TeamRadioCommand)
}
