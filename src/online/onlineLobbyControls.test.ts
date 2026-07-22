import { describe, expect, it } from 'vitest'
import type { LobbyPlayerView, LobbyView } from '../../packages/shared/src/index.ts'
import {
  ONLINE_LOBBY_CONTROLS,
  getOnlineLobbyControlHit,
  getOnlineLobbyStartState,
} from './onlineLobbyControls.ts'

const host = player('host', 'blue', true, true, true)
const guest = player('guest', 'red', true, true, false)

describe('online lobby controls', () => {
  it('gives the host a dominant start target without overlapping the compact controls', () => {
    const start = ONLINE_LOBBY_CONTROLS.start
    const ready = ONLINE_LOBBY_CONTROLS.ready
    expect(start.width).toBeGreaterThan(ready.width)
    expect(start.height).toBeGreaterThan(ready.height)
    expect(getOnlineLobbyControlHit(start.x + start.width / 2, start.y + start.height / 2, true)).toBe('start')
    expect(getOnlineLobbyControlHit(start.x + start.width / 2, start.y + start.height / 2, false)).toBeNull()
  })

  it('gives only the host a touch-sized room-key copy target', () => {
    const copy = ONLINE_LOBBY_CONTROLS.copy
    expect(copy.width).toBeGreaterThan(ONLINE_LOBBY_CONTROLS.ready.width)
    expect(copy.height).toBeGreaterThanOrEqual(32)
    expect(getOnlineLobbyControlHit(copy.x + copy.width / 2, copy.y + copy.height / 2, true)).toBe('copy')
    expect(getOnlineLobbyControlHit(copy.x + copy.width / 2, copy.y + copy.height / 2, false)).toBeNull()
  })

  it('enables start only for the host with equal, connected, ready teams', () => {
    expect(getOnlineLobbyStartState(lobby([host, guest]))).toEqual({
      isHost: true,
      enabled: true,
      detail: 'ALL READY - START THE BATTLE',
    })
    expect(getOnlineLobbyStartState(lobby([{ ...host, ready: false }, guest])).detail).toBe('EVERY PLAYER MUST BE READY')
    expect(getOnlineLobbyStartState(lobby([host, { ...guest, connected: false }])).detail).toBe('WAITING FOR RECONNECT')
    expect(getOnlineLobbyStartState(lobby([host, { ...guest, team: 'blue' }])).detail).toBe('TEAMS MUST BE EQUAL')
    expect(getOnlineLobbyStartState(lobby([host])).detail).toBe('NEED AN OPPONENT')
  })

  it('shows guests a waiting message instead of a start action', () => {
    const guestLobby = { ...lobby([host, guest]), selfPlayerId: 'guest' }
    expect(getOnlineLobbyStartState(guestLobby)).toEqual({
      isHost: false,
      enabled: false,
      detail: 'WAITING FOR HOST TO START',
    })
  })
})

function lobby(players: LobbyPlayerView[]): LobbyView {
  return {
    phase: 'LOBBY',
    version: 1,
    selfPlayerId: 'host',
    hostPlayerId: 'host',
    players,
    countdownEndsAt: null,
  }
}

function player(
  playerId: string,
  team: LobbyPlayerView['team'],
  ready: boolean,
  connected: boolean,
  isHost: boolean,
): LobbyPlayerView {
  return {
    playerId,
    name: playerId,
    team,
    classId: 'engineer',
    ready,
    connected,
    host: isHost,
    connectionEpoch: 1,
    quality: 'Good',
  }
}
