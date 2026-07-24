import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addPlayer,
  createMatchState,
  createSnapshotForPlayer,
  startMatch,
  type LobbyView,
  type MultiplayerSnapshot,
} from '../../packages/shared/src/index.ts'
import { OnlineBattleClient } from './onlineClient.ts'

type RelayClientInternals = {
  state: 'connected'
  lobby: LobbyView
  snapshot: MultiplayerSnapshot
  relaySeq: number
  room: { send: (type: string, payload: unknown) => void }
}

describe('online client portable relay input', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends one ordered hold edge per change and exposes the tablet action', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const sent: Array<{ type: string; payload: unknown }> = []
    const client = new OnlineBattleClient()
    const internals = client as unknown as RelayClientInternals
    internals.state = 'connected'
    internals.lobby = { phase: 'PLAYING' } as LobbyView
    const match = createMatchState()
    const player = addPlayer(match, 'player', 'Player', 'blue')
    startMatch(match)
    internals.snapshot = createSnapshotForPlayer(match, player.id)!
    internals.room = {
      send: (type, payload) => sent.push({ type, payload }),
    }

    client.setPortableRelay(true)
    client.setPortableRelay(true)
    expect(client.getState().relayHeld).toBe(true)
    expect(client.getState().touch.actions).toContain('relay')
    client.releaseControls()

    expect(sent).toEqual([
      {
        type: 'command',
        payload: expect.objectContaining({ type: 'relay', relaySeq: 1, down: true }),
      },
      {
        type: 'command',
        payload: expect.objectContaining({ type: 'relay', relaySeq: 2, down: false }),
      },
    ])
    expect(client.getState().relayHeld).toBe(false)
  })

  it('continues ordered relay edges above the authoritative reconnect acknowledgement', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const sent: Array<{ type: string; payload: unknown }> = []
    const client = new OnlineBattleClient()
    const internals = client as unknown as RelayClientInternals
    internals.state = 'connected'
    internals.lobby = { phase: 'PLAYING' } as LobbyView
    const match = createMatchState()
    const player = addPlayer(match, 'player', 'Player', 'blue')
    startMatch(match)
    player.lastPortableRelaySeq = 7
    internals.snapshot = createSnapshotForPlayer(match, player.id)!
    internals.relaySeq = internals.snapshot.self.portableRelay.lastProcessedSeq
    internals.room = {
      send: (type, payload) => sent.push({ type, payload }),
    }

    client.setPortableRelay(true)

    expect(sent).toEqual([{
      type: 'command',
      payload: expect.objectContaining({ type: 'relay', relaySeq: 8, down: true }),
    }])
  })
})
