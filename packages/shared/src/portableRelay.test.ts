import { describe, expect, it } from 'vitest'
import {
  PORTABLE_RELAY_TUNING,
  advancePortableSignalField,
  createPortableSignalPulse,
  getPortableRelayInteraction,
  getPortableRelayLimit,
  type PortableSignalEnvironment,
} from './portableRelay.js'

describe('portable relay shared contract', () => {
  it('keeps class limits and hold timings in one shared definition', () => {
    expect(getPortableRelayLimit('scout')).toBe(1)
    expect(getPortableRelayLimit('engineer')).toBe(2)
    expect(getPortableRelayLimit('battle')).toBe(1)

    expect(getPortableRelayInteraction({ col: 4, row: 5 }, [], 1)).toEqual({
      action: 'place',
      col: 4,
      row: 5,
      duration: PORTABLE_RELAY_TUNING.placeSeconds,
    })
    expect(getPortableRelayInteraction(
      { col: 4, row: 5 },
      [{ id: 'relay-1', col: 5, row: 5 }],
      1,
    )).toEqual({
      action: 'recover',
      col: 5,
      row: 5,
      duration: PORTABLE_RELAY_TUNING.recoverSeconds,
      relayId: 'relay-1',
    })
  })

  it('creates deterministic radial pulses in caller coordinates', () => {
    const waves = createPortableSignalPulse({
      idPrefix: 'pulse-1',
      center: { x: 10.5, y: 8.5 },
      cellSize: 1,
      sourceTeam: 'blue',
      rayCount: 4,
    })
    expect(waves).toHaveLength(4)
    expect(waves[0]).toMatchObject({
      id: 'pulse-1-0',
      x: 10.5,
      y: 8.5,
      vx: 1,
      vy: 0,
      sourceTeam: 'blue',
      ttl: PORTABLE_RELAY_TUNING.waveTtlSeconds,
    })
  })

  it('reflects from walls and records a decaying wall contact', () => {
    const environment = makeEnvironment((col) => col === 2)
    const wave = createPortableSignalPulse({
      idPrefix: 'wall',
      center: { x: 1.5, y: 2.5 },
      cellSize: 1,
      rayCount: 1,
    })[0]!
    const hit = advancePortableSignalField({
      waves: [wave],
      contacts: [],
      dt: 0.2,
      environment,
    })
    expect(hit.waves[0]).toMatchObject({
      vx: -1,
      bounces: 1,
      strength: PORTABLE_RELAY_TUNING.bounceStrength,
    })
    expect(hit.contacts).toContainEqual(expect.objectContaining({
      kind: 'wall',
      col: 2,
      row: 2,
    }))
    expect(hit.newContactCount).toBe(1)

    const decayed = advancePortableSignalField({
      waves: [],
      contacts: hit.contacts,
      dt: PORTABLE_RELAY_TUNING.contactTtlSeconds,
      environment,
    })
    expect(decayed.contacts).toEqual([])
  })

  it('keeps opposing teams wall and target contacts independent', () => {
    const wallEnvironment = makeEnvironment((col) => col === 2)
    const blueWallWave = createPortableSignalPulse({
      idPrefix: 'blue-wall',
      center: { x: 1.5, y: 2.5 },
      cellSize: 1,
      sourceTeam: 'blue',
      rayCount: 1,
    })[0]!
    const redWallWave = createPortableSignalPulse({
      idPrefix: 'red-wall',
      center: { x: 1.5, y: 2.5 },
      cellSize: 1,
      sourceTeam: 'red',
      rayCount: 1,
    })[0]!
    const result = advancePortableSignalField({
      waves: [blueWallWave, redWallWave],
      contacts: [],
      dt: 0.2,
      environment: wallEnvironment,
    })

    expect(result.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'wall', sourceTeam: 'blue', col: 2, row: 2 }),
      expect.objectContaining({ kind: 'wall', sourceTeam: 'red', col: 2, row: 2 }),
    ]))
    expect(result.contacts).toHaveLength(2)
  })

  it('detects an entering hostile or decoy without granting vision', () => {
    const environment: PortableSignalEnvironment = {
      ...makeEnvironment(),
      hostileTargets: [{
        id: 'enemy-1',
        team: 'red',
        col: 2,
        row: 2,
        x: 2.05,
        y: 2.05,
        width: 0.9,
        height: 0.9,
      }],
    }
    const wave = createPortableSignalPulse({
      idPrefix: 'hostile',
      center: { x: 1.5, y: 2.5 },
      cellSize: 1,
      sourceTeam: 'blue',
      rayCount: 1,
    })[0]!
    const result = advancePortableSignalField({
      waves: [wave],
      contacts: [],
      dt: 0.2,
      environment,
    })
    expect(result.contacts).toContainEqual(expect.objectContaining({
      kind: 'hostile',
      targetId: 'enemy-1',
      team: 'red',
      col: 2,
      row: 2,
    }))
    expect(result.waves[0]?.bounces).toBe(1)
  })
})

function makeEnvironment(
  isSolidCell: PortableSignalEnvironment['isSolidCell'] = () => false,
): PortableSignalEnvironment {
  return {
    cols: 20,
    rows: 16,
    cellSize: 1,
    isSolidCell,
  }
}
