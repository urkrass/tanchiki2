import type { MultiplayerSnapshot, VisibleBullet, VisiblePlayer } from '../../packages/shared/src/index.ts'

export const ONLINE_INTERPOLATION_DELAY_MS = 120
export const ONLINE_SNAPSHOT_HISTORY_LIMIT = 6

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
  renderAlpha: number
  visualTime: number
  visualSelf: {
    id: string
    x: number
    y: number
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
  const visualTime = latest.snapshot.time + Math.max(0, now - latest.receivedAt) / 1000 - delayMs / 1000
  const bracket = findSnapshotBracket(history, visualTime)
  const latestSnapshot = latest.snapshot
  const players = latestSnapshot.players.map((player) => interpolatePlayer(player, bracket))
  const bullets = latestSnapshot.bullets.map((bullet) => interpolateBullet(bullet, bracket))
  const self = players.find((player) => player.self)

  return {
    snapshot: latestSnapshot,
    players,
    bullets,
    animation: {
      snapshotBufferSize: history.length,
      interpolationDelayMs: delayMs,
      renderAlpha: round(bracket.alpha),
      visualTime: round(Math.max(0, visualTime)),
      visualSelf: self ? { id: self.id, x: round(self.visualCol), y: round(self.visualRow) } : null,
    },
  }
}

function interpolatePlayer(player: VisiblePlayer, bracket: SnapshotBracket): VisualOnlinePlayer {
  const from = bracket.from.snapshot.players.find((candidate) => candidate.id === player.id)
  const to = bracket.to.snapshot.players.find((candidate) => candidate.id === player.id)

  if (!from || !to) {
    return { ...player, visualCol: player.col, visualRow: player.row }
  }

  return {
    ...player,
    visualCol: lerp(from.col, to.col, bracket.alpha),
    visualRow: lerp(from.row, to.row, bracket.alpha),
  }
}

function interpolateBullet(bullet: VisibleBullet, bracket: SnapshotBracket): VisualOnlineBullet {
  const from = bracket.from.snapshot.bullets.find((candidate) => candidate.id === bullet.id)
  const to = bracket.to.snapshot.bullets.find((candidate) => candidate.id === bullet.id)

  if (!from || !to) {
    return { ...bullet, visualX: bullet.x, visualY: bullet.y }
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
