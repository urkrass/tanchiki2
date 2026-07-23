import { describe, expect, it } from 'vitest'
import {
  ACOUSTIC_EVENT_RULES,
  createAcousticEvent,
  describeAudibleAcousticCue,
  projectAcousticEventForListener,
  projectAcousticEventsForListener,
  pruneAcousticEvents,
} from './spatialHearing.js'

function event(
  kind: Parameters<typeof createAcousticEvent>[0]['kind'],
  col: number,
  row: number,
) {
  return createAcousticEvent({
    id: `${kind}-${col}-${row}`,
    kind,
    source: { col, row },
    emittedAt: 10,
  })
}

describe('spatial hearing', () => {
  it('keeps quiet movement local while allowing loud combat to travel farther', () => {
    expect(projectAcousticEventForListener({
      event: event('rustle', 3, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
    })).toMatchObject({ kind: 'rustle', distanceBand: 'far', direction: 'east' })

    expect(projectAcousticEventForListener({
      event: event('rustle', 5, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
    })).toBeNull()

    expect(projectAcousticEventForListener({
      event: event('shot', 8, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
    })).toMatchObject({ kind: 'shot', loudness: 'loud', direction: 'east' })

    expect(projectAcousticEventForListener({
      event: event('shot', 10, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
    })).toBeNull()
  })

  it('applies deterministic obstacle attenuation without inventing full acoustics', () => {
    const open = projectAcousticEventForListener({
      event: event('impact', 5, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
      isOccludingCell: () => false,
    })
    const blocked = projectAcousticEventForListener({
      event: event('impact', 5, 0),
      listener: { col: 0, row: 0 },
      now: 10.1,
      isOccludingCell: (col) => col === 2,
    })

    expect(open).toMatchObject({ occluded: false })
    expect(blocked).toBeNull()
  })

  it('blocks maximum-intensity heavy tracks across the field-course steel screen', () => {
    const heavyTracks = createAcousticEvent({
      id: 'heavy-tracks-behind-steel',
      kind: 'tracks',
      source: { col: 72, row: 5 },
      emittedAt: 10,
      intensity: 1.5,
    })
    const listener = { col: 72, row: 8 }

    expect(projectAcousticEventForListener({
      event: heavyTracks,
      listener,
      now: 10.1,
      isOccludingCell: () => false,
    })).toMatchObject({
      kind: 'tracks',
      occluded: false,
    })
    expect(projectAcousticEventForListener({
      event: heavyTracks,
      listener,
      now: 10.1,
      isOccludingCell: (col, row) => col === 72 && row === 7,
    })).toBeNull()
  })

  it('never includes an exact hidden source and exposes it only when independently visible', () => {
    const hidden = projectAcousticEventForListener({
      event: event('explosion', 6, 4),
      listener: { col: 2, row: 4 },
      now: 10.2,
    })
    expect(hidden).toMatchObject({
      channel: 'physical',
      sourcePrecision: 'directional',
      direction: 'east',
    })
    expect(hidden).not.toHaveProperty('source')
    expect(describeAudibleAcousticCue(hidden!)).toBe('Explosion near to the east.')

    const visible = projectAcousticEventForListener({
      event: event('explosion', 6, 4),
      listener: { col: 2, row: 4 },
      now: 10.2,
      sourceVisible: true,
    })
    expect(visible).toMatchObject({
      sourcePrecision: 'exact',
      source: { col: 6, row: 4 },
    })
  })

  it('projects, expires, and bounds physical events without signal-channel vocabulary', () => {
    const events = [
      event('tracks', 0, 0),
      event('trap', 1, 0),
      event('environment', 2, 0),
    ]
    expect(projectAcousticEventsForListener({
      events,
      listener: { col: 0, row: 0 },
      now: 10.1,
    }).map((cue) => cue.kind)).toEqual(['tracks', 'trap', 'environment'])

    expect(pruneAcousticEvents(events, 11)).toEqual([])
    expect(pruneAcousticEvents(events, 10.1, 2).map((item) => item.kind))
      .toEqual(['trap', 'environment'])
    expect(Object.keys(ACOUSTIC_EVENT_RULES)).not.toEqual(
      expect.arrayContaining(['relay', 'radar', 'radio', 'ping']),
    )
  })
})
