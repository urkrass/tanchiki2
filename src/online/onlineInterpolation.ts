import {
  MULTIPLAYER_TUNING,
  type Direction,
  type MultiplayerSnapshot,
  type VisibleBullet,
  type VisiblePlayer,
} from '../../packages/shared/src/index.ts'

export const ONLINE_INTERPOLATION_DELAY_MS = 75
// Snapshots arrive at 20 Hz. Keep enough bounded history to retain the first
// presentation anchor through the slowest legal tile move (Battle + mine slow
// + Traverse is just under one second), plus delivery-jitter margin.
export const ONLINE_SNAPSHOT_HISTORY_LIMIT = 24

export interface SnapshotHistoryEntry {
  snapshot: MultiplayerSnapshot
  receivedAt: number
}

export interface VisualOnlinePlayer extends VisiblePlayer {
  visualCol: number
  visualRow: number
}

export interface VisualOnlineBullet extends VisibleBullet {
  visualX: number
  visualY: number
}

export interface OnlineAnimationSummary {
  snapshotBufferSize: number
  interpolationDelayMs: number
  localSelfExtrapolationMs: number
  renderAlpha: number
  visualTime: number
  continuousTileMovement: boolean
  movingPlayerCount: number
  visualSelf: {
    id: string
    x: number
    y: number
  } | null
  selfMove: {
    from: { col: number; row: number }
    to: { col: number; row: number }
    progress: number
    duration: number
  } | null
}

export interface InterpolatedOnlineSnapshot {
  snapshot: MultiplayerSnapshot
  players: VisualOnlinePlayer[]
  bullets: VisualOnlineBullet[]
  animation: OnlineAnimationSummary
}

export function appendSnapshotHistory(
  history: SnapshotHistoryEntry[],
  snapshot: MultiplayerSnapshot,
  receivedAt: number,
  limit = ONLINE_SNAPSHOT_HISTORY_LIMIT,
) {
  return [...history, { snapshot, receivedAt }].slice(-limit)
}

export function interpolateOnlineSnapshot(
  history: SnapshotHistoryEntry[],
  now: number,
  delayMs = ONLINE_INTERPOLATION_DELAY_MS,
): InterpolatedOnlineSnapshot | null {
  if (history.length === 0) {
    return null
  }

  const latest = history[history.length - 1]
  const elapsedSinceLatestSeconds = Math.max(0, now - latest.receivedAt) / 1000
  const visualTime = latest.snapshot.time + elapsedSinceLatestSeconds - delayMs / 1000
  const bracket = findSnapshotBracket(history, visualTime)
  const latestSnapshot = latest.snapshot
  const latestSelf = latestSnapshot.players.find((player) => player.self)
  const localSelfMove = latestSelf?.move
    ? getLocalMovePresentation(latestSelf, latestSelf.move, history, now)
    : null
  const players = latestSnapshot.players.map((player) => interpolatePlayer(player, bracket, player.self ? localSelfMove : null))
  const bullets = latestSnapshot.bullets.map((bullet) => interpolateBullet(bullet, bracket))
  const self = players.find((player) => player.self)

  return {
    snapshot: latestSnapshot,
    players,
    bullets,
    animation: {
      snapshotBufferSize: history.length,
      interpolationDelayMs: delayMs,
      localSelfExtrapolationMs: round((localSelfMove?.extrapolationSeconds ?? 0) * 1000),
      renderAlpha: round(bracket.alpha),
      visualTime: round(Math.max(0, visualTime)),
      continuousTileMovement: true,
      movingPlayerCount: players.filter((player) => player.move).length,
      visualSelf: self ? { id: self.id, x: round(self.visualCol), y: round(self.visualRow) } : null,
      selfMove: self?.move ? moveSummary(self.move) : null,
    },
  }
}

function interpolatePlayer(
  player: VisiblePlayer,
  bracket: SnapshotBracket,
  localMove: LocalMovePresentation | null,
): VisualOnlinePlayer {
  if (player.self && player.move && localMove) {
    return {
      ...player,
      visualCol: lerp(player.move.fromCol, player.move.toCol, localMove.progress),
      visualRow: lerp(player.move.fromRow, player.move.toRow, localMove.progress),
    }
  }

  // The local player is extrapolated while a tile move is active. Once the
  // authoritative completion snapshot clears `move`, rendering it through the
  // delayed remote-player bracket can jump behind the position already shown.
  // Keep the completion handoff at the authoritative destination; remote
  // players still use the buffered interpolation path below.
  if (player.self && !player.move) {
    return { ...player, visualCol: player.col, visualRow: player.row }
  }

  const from = bracket.from.snapshot.players.find((candidate) => candidate.id === player.id)
  const to = bracket.to.snapshot.players.find((candidate) => candidate.id === player.id)

  if (!from || !to) {
    const position = playerVisualPosition(player)
    return { ...player, visualCol: position.col, visualRow: position.row }
  }
  const fromPosition = playerVisualPosition(from)
  const toPosition = playerVisualPosition(to)

  if (shouldSnapPlayerInterpolation(from, to, fromPosition, toPosition)) {
    return { ...player, visualCol: toPosition.col, visualRow: toPosition.row }
  }

  return {
    ...player,
    visualCol: lerp(fromPosition.col, toPosition.col, bracket.alpha),
    visualRow: lerp(fromPosition.row, toPosition.row, bracket.alpha),
  }
}

interface LocalMovePresentation {
  progress: number
  extrapolationSeconds: number
}

function getLocalMovePresentation(
  latestPlayer: VisiblePlayer,
  latestMove: NonNullable<VisiblePlayer['move']>,
  history: SnapshotHistoryEntry[],
  now: number,
): LocalMovePresentation {
  const duration = Math.max(0.01, latestMove.duration)
  let progress = latestMove.progress

  for (const entry of history) {
    const candidate = entry.snapshot.players.find((player) => player.id === latestPlayer.id)
    if (!candidate?.move || !isSameMove(candidate.move, latestMove)) continue
    const elapsedSeconds = Math.max(0, now - entry.receivedAt) / 1000
    progress = Math.max(progress, candidate.move.progress + elapsedSeconds / duration)
  }

  progress = clamp(progress, 0, 1)
  return {
    progress,
    extrapolationSeconds: Math.max(0, progress - latestMove.progress) * duration,
  }
}

function isSameMove(
  candidate: NonNullable<VisiblePlayer['move']>,
  latest: NonNullable<VisiblePlayer['move']>,
) {
  return candidate.fromCol === latest.fromCol
    && candidate.fromRow === latest.fromRow
    && candidate.toCol === latest.toCol
    && candidate.toRow === latest.toRow
    && candidate.duration === latest.duration
}

function shouldSnapPlayerInterpolation(
  from: VisiblePlayer,
  to: VisiblePlayer,
  fromPosition: { col: number; row: number },
  toPosition: { col: number; row: number },
) {
  if (from.alive !== to.alive) {
    return true
  }

  return Math.abs(toPosition.col - fromPosition.col) > 1.5 ||
    Math.abs(toPosition.row - fromPosition.row) > 1.5
}

function playerVisualPosition(player: VisiblePlayer) {
  if (!player.move) {
    return { col: player.col, row: player.row }
  }

  return {
    col: lerp(player.move.fromCol, player.move.toCol, player.move.progress),
    row: lerp(player.move.fromRow, player.move.toRow, player.move.progress),
  }
}

function moveSummary(move: NonNullable<VisiblePlayer['move']>) {
  return {
    from: { col: move.fromCol, row: move.fromRow },
    to: { col: move.toCol, row: move.toRow },
    progress: round(move.progress),
    duration: round(move.duration),
  }
}

function interpolateBullet(bullet: VisibleBullet, bracket: SnapshotBracket): VisualOnlineBullet {
  const from = bracket.from.snapshot.bullets.find((candidate) => candidate.id === bullet.id)
  const to = bracket.to.snapshot.bullets.find((candidate) => candidate.id === bullet.id)

  if (!to) {
    return { ...bullet, visualX: bullet.x, visualY: bullet.y }
  }

  if (!from) {
    const span = Math.max(0.05, bracket.to.snapshot.time - bracket.from.snapshot.time)
    const vector = vectorForDirection(to.dir)
    const syntheticFrom = {
      x: to.x - vector.x * MULTIPLAYER_TUNING.bulletSpeed * span,
      y: to.y - vector.y * MULTIPLAYER_TUNING.bulletSpeed * span,
    }

    return {
      ...bullet,
      visualX: lerp(syntheticFrom.x, to.x, bracket.alpha),
      visualY: lerp(syntheticFrom.y, to.y, bracket.alpha),
    }
  }

  return {
    ...bullet,
    visualX: lerp(from.x, to.x, bracket.alpha),
    visualY: lerp(from.y, to.y, bracket.alpha),
  }
}

interface SnapshotBracket {
  from: SnapshotHistoryEntry
  to: SnapshotHistoryEntry
  alpha: number
}

function findSnapshotBracket(history: SnapshotHistoryEntry[], visualTime: number): SnapshotBracket {
  if (history.length === 1 || visualTime <= history[0].snapshot.time) {
    return { from: history[0], to: history[0], alpha: 1 }
  }

  for (let index = 1; index < history.length; index += 1) {
    const from = history[index - 1]
    const to = history[index]

    if (visualTime <= to.snapshot.time) {
      const span = to.snapshot.time - from.snapshot.time
      const alpha = span <= 0 ? 1 : clamp((visualTime - from.snapshot.time) / span, 0, 1)
      return { from, to, alpha }
    }
  }

  return { from: history[Math.max(0, history.length - 2)], to: history[history.length - 1], alpha: 1 }
}

function lerp(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function vectorForDirection(direction: Direction) {
  if (direction === 'right') return { x: 1, y: 0 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 0, y: -1 }
}
