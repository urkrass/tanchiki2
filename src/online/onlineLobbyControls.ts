import type { LobbyView } from '../../packages/shared/src/index.ts'

export interface OnlineLobbyControlRect {
  x: number
  y: number
  width: number
  height: number
}

export type OnlineLobbyControl = 'copy' | 'class-prev' | 'class-next' | 'blue' | 'red' | 'ready' | 'start'

export const ONLINE_LOBBY_CONTROLS: Record<OnlineLobbyControl, OnlineLobbyControlRect> = {
  copy: { x: 350, y: 75, width: 162, height: 32 },
  'class-prev': { x: 48, y: 278, width: 42, height: 34 },
  'class-next': { x: 278, y: 278, width: 42, height: 34 },
  blue: { x: 48, y: 320, width: 82, height: 36 },
  red: { x: 138, y: 320, width: 82, height: 36 },
  ready: { x: 228, y: 320, width: 92, height: 36 },
  start: { x: 334, y: 302, width: 178, height: 62 },
}

export interface OnlineLobbyStartState {
  isHost: boolean
  enabled: boolean
  detail: string
}

export function getOnlineLobbyStartState(lobby: LobbyView): OnlineLobbyStartState {
  const isHost = lobby.selfPlayerId === lobby.hostPlayerId
  if (!isHost) return { isHost, enabled: false, detail: 'WAITING FOR HOST TO START' }
  if (lobby.players.length < 2) return { isHost, enabled: false, detail: 'NEED AN OPPONENT' }

  const bluePlayers = lobby.players.filter((player) => player.team === 'blue')
  const redPlayers = lobby.players.filter((player) => player.team === 'red')
  if (bluePlayers.length === 0 || redPlayers.length === 0 || bluePlayers.length !== redPlayers.length) {
    return { isHost, enabled: false, detail: 'TEAMS MUST BE EQUAL' }
  }
  if (lobby.players.some((player) => !player.connected)) {
    return { isHost, enabled: false, detail: 'WAITING FOR RECONNECT' }
  }
  if (lobby.players.some((player) => !player.ready)) {
    return { isHost, enabled: false, detail: 'EVERY PLAYER MUST BE READY' }
  }
  return { isHost, enabled: true, detail: 'ALL READY - START THE BATTLE' }
}

export function getOnlineLobbyControlHit(x: number, y: number, isHost: boolean): OnlineLobbyControl | null {
  const controls: OnlineLobbyControl[] = isHost
    ? ['copy', 'class-prev', 'class-next', 'blue', 'red', 'ready', 'start']
    : ['class-prev', 'class-next', 'blue', 'red', 'ready']
  return controls.find((control) => pointInRect(x, y, ONLINE_LOBBY_CONTROLS[control])) ?? null
}

function pointInRect(x: number, y: number, rect: OnlineLobbyControlRect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
