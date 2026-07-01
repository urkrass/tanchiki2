import type { MatchPhase, MultiplayerSnapshot, Team } from '../../packages/shared/src/index.ts'

export interface OnlineWaitingCopy {
  title: string
  detail: string
  hint: string
  tone: 'info' | 'ready' | 'error'
}

export interface OnlineHudStatus {
  label: string
  detail: string
  tone: 'info' | 'ready' | 'error'
}

export interface OnlineRenderedStatus {
  connectionLabel: string
  connectionDetail: string
  waiting: OnlineWaitingCopy
  battle: OnlineHudStatus
  roomId: string | null
  playerId: string | null
  team: Team | string | null
}

export function getOnlineWaitingCopy(connection: string, error = ''): OnlineWaitingCopy {
  if (connection === 'error') {
    return {
      title: 'ONLINE UNAVAILABLE',
      detail: formatOnlineError(error),
      hint: 'ESC BACK, THEN RETRY',
      tone: 'error',
    }
  }

  if (connection === 'connected') {
    return {
      title: 'ROOM READY',
      detail: 'WAITING FOR SNAPSHOT',
      hint: 'SERVER IS PREPARING MAP',
      tone: 'ready',
    }
  }

  if (connection === 'idle') {
    return {
      title: 'ONLINE BATTLE',
      detail: 'READY TO CONNECT',
      hint: 'ESC BACK',
      tone: 'info',
    }
  }

  return {
    title: 'JOINING ONLINE',
    detail: 'REQUESTING ROOM',
    hint: 'WAITING FOR SERVER',
    tone: 'info',
  }
}

export function getOnlineHudStatus(connection: string, snapshot: Pick<MultiplayerSnapshot, 'phase'> | null): OnlineHudStatus {
  if (connection === 'error') {
    return {
      label: 'OFFLINE',
      detail: 'CONNECTION LOST',
      tone: 'error',
    }
  }

  if (connection === 'connecting') {
    return {
      label: 'JOINING',
      detail: 'WAITING',
      tone: 'info',
    }
  }

  if (connection !== 'connected') {
    return {
      label: 'OFFLINE',
      detail: 'NO ROOM',
      tone: 'info',
    }
  }

  return {
    label: 'ONLINE',
    detail: getBattlePhaseLabel(snapshot?.phase ?? 'lobby'),
    tone: 'ready',
  }
}

export function getOnlineRenderedStatus(input: {
  connection: string
  error?: string
  snapshot: Pick<MultiplayerSnapshot, 'phase'> | null
  roomId: string | null
  playerId: string | null
  team: Team | string | null
}): OnlineRenderedStatus {
  const waiting = getOnlineWaitingCopy(input.connection, input.error ?? '')
  const battle =
    input.connection === 'error' && !input.snapshot
      ? { label: 'OFFLINE', detail: waiting.detail, tone: 'error' as const }
      : getOnlineHudStatus(input.connection, input.snapshot)

  return {
    connectionLabel: battle.label,
    connectionDetail: input.connection === 'error' ? waiting.detail : battle.detail,
    waiting,
    battle,
    roomId: input.roomId,
    playerId: input.playerId,
    team: input.team,
  }
}

function getBattlePhaseLabel(phase: MatchPhase) {
  if (phase === 'playing') {
    return 'BATTLE LIVE'
  }

  if (phase === 'finished') {
    return 'MATCH ENDED'
  }

  return 'ROOM READY'
}

function formatOnlineError(error: string) {
  const normalized = error.trim().toLowerCase()

  if (!normalized) {
    return 'CONNECTION FAILED'
  }

  if (normalized.includes('server_unavailable')) {
    return 'SERVER UNAVAILABLE'
  }

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'SERVER NOT REACHED'
  }

  if (normalized.includes('lost connection')) {
    return 'CONNECTION LOST'
  }

  if (normalized.includes('closed') || normalized.includes('stream')) {
    return 'ROOM STREAM CLOSED'
  }

  return error
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 24)
}
