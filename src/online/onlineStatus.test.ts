import { describe, expect, it } from 'vitest'
import { getOnlineHudStatus, getOnlineReadableText, getOnlineRenderedStatus, getOnlineWaitingCopy } from './onlineStatus.ts'

describe('online status copy', () => {
  it('explains the waiting state before a quick room is assigned', () => {
    expect(getOnlineWaitingCopy('connecting')).toEqual({
      title: 'JOINING ONLINE',
      detail: 'REQUESTING ROOM',
      hint: 'WAITING FOR SERVER',
      tone: 'info',
    })
  })

  it('distinguishes a joined room that is waiting for the first snapshot', () => {
    expect(getOnlineWaitingCopy('connected')).toEqual({
      title: 'ROOM READY',
      detail: 'WAITING FOR SNAPSHOT',
      hint: 'SERVER IS PREPARING MAP',
      tone: 'ready',
    })
  })

  it('normalizes local server errors into short player-facing copy', () => {
    expect(getOnlineWaitingCopy('error', 'server_unavailable').detail).toBe('SERVER UNAVAILABLE')
    expect(getOnlineWaitingCopy('error', 'Failed to fetch').detail).toBe('SERVER NOT REACHED')
  })

  it('uses battle-specific HUD status instead of the raw connection state', () => {
    expect(getOnlineHudStatus('connected', { phase: 'playing' })).toEqual({
      label: 'ONLINE',
      detail: 'BATTLE LIVE',
      tone: 'ready',
    })
  })

  it('exposes the same status summary through rendered diagnostics', () => {
    expect(
      getOnlineRenderedStatus({
        connection: 'error',
        error: 'Lost connection to multiplayer server',
        snapshot: { phase: 'playing' },
        roomId: 'quick',
        playerId: 'p-1',
        team: 'blue',
      }),
    ).toMatchObject({
      connectionLabel: 'OFFLINE',
      connectionDetail: 'CONNECTION LOST',
      waiting: {
        title: 'ONLINE UNAVAILABLE',
        detail: 'CONNECTION LOST',
      },
      battle: {
        label: 'OFFLINE',
        detail: 'CONNECTION LOST',
      },
    })
  })

  it('keeps join failures consistent when no battle snapshot exists', () => {
    expect(
      getOnlineRenderedStatus({
        connection: 'error',
        error: 'server_unavailable',
        snapshot: null,
        roomId: null,
        playerId: null,
        team: null,
      }),
    ).toMatchObject({
      connectionLabel: 'OFFLINE',
      connectionDetail: 'SERVER UNAVAILABLE',
      battle: {
        label: 'OFFLINE',
        detail: 'SERVER UNAVAILABLE',
      },
    })
  })

  it('builds keyboard-readable online status and touch label evidence', () => {
    expect(
      getOnlineReadableText({
        connection: 'connected',
        snapshot: { phase: 'playing' },
        roomId: 'quick',
        playerId: 'p-1',
        team: 'blue',
        touchControlsVisible: true,
      }),
    ).toEqual({
      screen: 'online-battle',
      status: ['ROOM READY', 'WAITING FOR SNAPSHOT', 'SERVER IS PREPARING MAP', 'ONLINE', 'BATTLE LIVE'],
      hud: {
        connection: 'ONLINE',
        detail: 'BATTLE LIVE',
        team: 'Team blue',
        room: 'Room quick',
        player: 'Player p-1',
      },
      touch: {
        visible: true,
        labels: ['Move on left rail', 'Fire on right rail', 'Pause', 'Back button at lower left'],
      },
    })
  })
})
