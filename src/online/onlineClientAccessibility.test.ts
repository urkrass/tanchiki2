import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudibleAcousticCue, LobbyView } from '../../packages/shared/src/index.ts'
import { OnlineBattleClient } from './onlineClient.ts'

type OnlineAccessibilityInternals = {
  lobby: LobbyView | null
  pendingAccessibilityAcousticCues: Array<{
    cue: AudibleAcousticCue
    expiresAt: number
  }>
}

describe('online accessibility acoustic announcements', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('announces a queued hidden cue after the network snapshot no longer carries it', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const client = new OnlineBattleClient()
    const internals = client as unknown as OnlineAccessibilityInternals
    internals.lobby = { phase: 'PLAYING' } as LobbyView
    internals.pendingAccessibilityAcousticCues = [{
      cue: {
        id: 'online-short-shot',
        channel: 'physical',
        kind: 'shot',
        loudness: 'loud',
        age: 0,
        lifetime: 0.45,
        direction: 'south',
        distanceBand: 'near',
        gain: 0.7,
        pan: 0,
        occluded: false,
        sourcePrecision: 'directional',
      },
      expiresAt: performance.now() + 2500,
    }]

    expect(client.getAccessibilityAnnouncement()).toEqual({
      key: 'online-hearing-online-short-shot',
      message: 'Gunfire near to the south.',
    })
    expect(internals.pendingAccessibilityAcousticCues).toHaveLength(0)
  })
})
