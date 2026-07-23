import { describe, expect, it } from 'vitest'
import type { AudibleAcousticCue } from '../../packages/shared/src/index.ts'
import {
  ONLINE_HEARD_CUE_HISTORY_LIMIT,
  ingestOnlineAcousticCues,
} from './onlineHearing.ts'

function cue(id: string, overrides: Partial<AudibleAcousticCue> = {}): AudibleAcousticCue {
  return {
    id,
    channel: 'physical',
    kind: 'shot',
    loudness: 'loud',
    age: 0.1,
    lifetime: 0.5,
    direction: 'east',
    distanceBand: 'near',
    gain: 0.7,
    pan: 0.4,
    occluded: false,
    sourcePrecision: 'directional',
    ...overrides,
  }
}

describe('online hearing ingestion', () => {
  it('plays a repeated snapshot cue once and strips exact data from directional cues', () => {
    const first = ingestOnlineAcousticCues([], [
      cue('shot-1', { source: { col: 9, row: 7 } }),
    ])
    expect(first.newlyHeard).toEqual([
      expect.objectContaining({ id: 'shot-1', sourcePrecision: 'directional' }),
    ])
    expect(first.newlyHeard[0]).not.toHaveProperty('source')

    const repeated = ingestOnlineAcousticCues(first.seenIds, [cue('shot-1')])
    expect(repeated.newlyHeard).toEqual([])
  })

  it('retains independently visible exact sources and bounds deduplication history', () => {
    const exact = ingestOnlineAcousticCues([], [
      cue('impact-1', {
        kind: 'impact',
        sourcePrecision: 'exact',
        source: { col: 3, row: 4 },
      }),
    ])
    expect(exact.newlyHeard[0]).toMatchObject({
      sourcePrecision: 'exact',
      source: { col: 3, row: 4 },
    })

    const many = ingestOnlineAcousticCues(
      Array.from({ length: ONLINE_HEARD_CUE_HISTORY_LIMIT }, (_, index) => `old-${index}`),
      [cue('newest')],
    )
    expect(many.seenIds).toHaveLength(ONLINE_HEARD_CUE_HISTORY_LIMIT)
    expect(many.seenIds.at(-1)).toBe('newest')
  })
})
