import { describe, expect, it } from 'vitest'
import {
  advanceTerrainEvidence,
  appendTerrainEvidence,
  distortEchoEvidenceCell,
  distortHiddenEchoPulseCell,
  distortHiddenEvidenceCell,
  planMovementTerrainEvidence,
  projectTerrainEvidenceForSide,
  type TerrainEvidenceState,
} from './terrainEvidenceRuntime.ts'
import {
  createSignalWarfareSnapshot,
  isRelayJammedForSide,
  type SignalWarfareEnvironment,
} from './signalWarfare.ts'
import { selectStrongestTerrainEvidenceByCell } from './battlefieldPerceptionRender.ts'
import type {
  LevelSignalJammerDefinition,
  OfflineRetranslator,
  TerrainEvidenceSnapshot,
} from './types.ts'

function terrainEvidence(
  overrides: Partial<TerrainEvidenceState> = {},
): TerrainEvidenceState {
  return {
    id: 'evidence-1',
    kind: 'noise',
    surface: 'gravel',
    side: 'enemy',
    sourceTeam: 'red',
    col: 3,
    row: 4,
    sourceCol: 3,
    sourceRow: 4,
    age: 0,
    ttl: 1,
    strength: 1,
    label: 'GRAVEL',
    ...overrides,
  }
}

describe('offline terrain evidence runtime', () => {
  it('plans the existing surface, weight, and overdrive evidence rules without game state', () => {
    expect(planMovementTerrainEvidence('dust', 'medium', false)).toEqual({
      echoPulse: false,
      emissions: [{
        kind: 'dust',
        ttl: 1.05,
        strength: 0.9,
        label: 'DUST',
      }],
    })
    expect(planMovementTerrainEvidence('echo', 'medium', false)).toEqual({
      echoPulse: true,
      emissions: [],
    })
    const reeds = planMovementTerrainEvidence('reeds', 'light', false)
    expect(reeds).toMatchObject({
      echoPulse: false,
      emissions: [{
        kind: 'rustle',
        ttl: 1.9,
        label: 'RUSTLE',
      }],
    })
    expect(reeds.emissions[0]?.strength).toBeCloseTo(0.943)
    expect(planMovementTerrainEvidence('metal', 'heavy', true)).toEqual({
      echoPulse: false,
      emissions: [{
        kind: 'metal',
        ttl: 1.5,
        strength: 1.2,
        label: 'METAL',
      }],
    })
    expect(planMovementTerrainEvidence('gravel', 'heavy', true)).toEqual({
      echoPulse: false,
      emissions: [{
        kind: 'noise',
        ttl: 1.8,
        strength: 1.2,
        label: 'GRAVEL',
      }],
    })
    expect(planMovementTerrainEvidence('empty', 'medium', false)).toEqual({
      echoPulse: false,
      emissions: [],
    })
  })

  it('ages, expires, bounds, filters, and rounds evidence through pure helpers', () => {
    const active = terrainEvidence({ id: 'active', age: 0.1, ttl: 1 })
    const expired = terrainEvidence({ id: 'expired', age: 0.9, ttl: 1 })
    expect(advanceTerrainEvidence([active, expired], 0.2).map((item) => item.id)).toEqual(['active'])

    const bounded = [
      terrainEvidence({ id: 'oldest' }),
      terrainEvidence({ id: 'middle' }),
    ]
    expect(appendTerrainEvidence(bounded, terrainEvidence({ id: 'newest' }), 2).map((item) => item.id))
      .toEqual(['middle', 'newest'])

    const projected = projectTerrainEvidenceForSide([
      terrainEvidence({
        id: 'friendly-private',
        sourceCol: 1,
        sourceRow: 1,
        col: 1,
        row: 1,
        age: 0.126,
        strength: 0.874,
      }),
      terrainEvidence({
        id: 'hidden-hostile',
        col: 7,
        row: 8,
        sourceCol: 8,
        sourceRow: 8,
      }),
      terrainEvidence({
        id: 'visible-hostile',
        col: 5,
        row: 5,
        sourceCol: 5,
        sourceRow: 5,
      }),
    ], {
      listener: { col: 1, row: 1 },
      now: 0.2,
      isCellVisible: (col, row) => col === 5 && row === 5,
    })
    expect(projected).toEqual([
      expect.objectContaining({
        id: 'friendly-private',
        age: 0.13,
        strength: 0.76,
        channel: 'physical',
        audible: true,
        sourcePrecision: 'directional',
      }),
      expect.objectContaining({
        id: 'visible-hostile',
        audible: false,
        sourcePrecision: 'exact',
      }),
    ])
  })

  it('drops distant hidden physical evidence but retains relay-style signal evidence separately', () => {
    const projected = projectTerrainEvidenceForSide([
      terrainEvidence({
        id: 'near-rustle',
        kind: 'rustle',
        col: 3,
        row: 1,
        sourceCol: 4,
        sourceRow: 1,
      }),
      terrainEvidence({
        id: 'far-rustle',
        kind: 'rustle',
        col: 10,
        row: 1,
        sourceCol: 11,
        sourceRow: 1,
      }),
      terrainEvidence({
        id: 'hidden-echo',
        kind: 'echo',
        col: 3,
        row: 1,
        sourceCol: 4,
        sourceRow: 1,
      }),
      terrainEvidence({
        id: 'visible-echo',
        kind: 'echo',
        col: 2,
        row: 2,
        sourceCol: 2,
        sourceRow: 2,
      }),
      terrainEvidence({
        id: 'visible-distorted-echo',
        kind: 'echo',
        col: 3,
        row: 2,
        sourceCol: 4,
        sourceRow: 2,
      }),
    ], {
      listener: { col: 1, row: 1 },
      now: 0.1,
      isCellVisible: (col, row) => (
        (col === 2 && row === 2)
        || (col === 3 && row === 2)
      ),
    })

    expect(projected.map((item) => item.id)).toEqual([
      'near-rustle',
      'visible-echo',
      'visible-distorted-echo',
    ])
    expect(projected[0]).toMatchObject({
      channel: 'physical',
      audible: true,
      sourcePrecision: 'directional',
    })
    expect(projected[1]).toMatchObject({
      channel: 'signal',
      audible: false,
      sourcePrecision: 'exact',
    })
    expect(projected[2]).toMatchObject({
      channel: 'signal',
      col: 3,
      row: 2,
      audible: false,
      sourcePrecision: 'directional',
    })
  })

  it('attenuates hidden physical visuals with the same distance gain used by hearing', () => {
    const projected = projectTerrainEvidenceForSide([
      terrainEvidence({
        id: 'hidden-near',
        kind: 'rustle',
        col: 5,
        row: 2,
        sourceCol: 5,
        sourceRow: 1,
        strength: 1.5,
      }),
      terrainEvidence({
        id: 'hidden-mid',
        kind: 'rustle',
        col: 6,
        row: 2,
        sourceCol: 6,
        sourceRow: 1,
        strength: 1.5,
      }),
      terrainEvidence({
        id: 'hidden-edge',
        kind: 'rustle',
        col: 7,
        row: 2,
        sourceCol: 7,
        sourceRow: 1,
        strength: 1.5,
      }),
      terrainEvidence({
        id: 'hidden-out',
        kind: 'rustle',
        col: 8,
        row: 2,
        sourceCol: 8,
        sourceRow: 1,
        strength: 1.5,
      }),
    ], {
      listener: { col: 1, row: 1 },
      now: 0.1,
      isCellVisible: () => false,
    })

    expect(projected.map(({ id, strength, sourcePrecision }) => ({
      id,
      strength,
      sourcePrecision,
    }))).toEqual([
      { id: 'hidden-near', strength: 0.75, sourcePrecision: 'directional' },
      { id: 'hidden-mid', strength: 0.38, sourcePrecision: 'directional' },
      { id: 'hidden-edge', strength: 0.18, sourcePrecision: 'directional' },
    ])
  })

  it('expires hidden terrain hearing by the shared acoustic lifetime, not the longer visual trail', () => {
    const hidden = projectTerrainEvidenceForSide([
      terrainEvidence({
        id: 'old-hidden-rustle',
        kind: 'rustle',
        col: 2,
        row: 1,
        sourceCol: 2,
        sourceRow: 1,
        age: 0.9,
        ttl: 1.9,
      }),
    ], {
      listener: { col: 1, row: 1 },
      now: 2,
      isCellVisible: () => false,
    })

    expect(hidden).toEqual([])
  })

  it('keeps hidden and echo distortion deterministic, bounded, and behind the source heading', () => {
    expect(distortEchoEvidenceCell(0, 0, 4, 4)).toEqual({ x: 1, y: 0 })
    expect(distortEchoEvidenceCell(3, 3, 4, 4)).toEqual({ x: 2, y: 3 })

    const hidden = distortHiddenEvidenceCell({
      col: 0,
      row: 0,
      salt: 'enemy-1',
      mapCols: 4,
      mapRows: 4,
    })
    expect(hidden).toEqual(distortHiddenEvidenceCell({
      col: 0,
      row: 0,
      salt: 'enemy-1',
      mapCols: 4,
      mapRows: 4,
    }))
    expect(hidden.x).toBeGreaterThanOrEqual(0)
    expect(hidden.y).toBeGreaterThanOrEqual(0)
    expect(hidden.x).toBeLessThan(4)
    expect(hidden.y).toBeLessThan(4)

    const echoPulse = distortHiddenEchoPulseCell({
      col: 3,
      row: 3,
      dir: 'up',
      salt: 'enemy-1:up:echo',
      mapCols: 7,
      mapRows: 7,
      isSolid: () => false,
    })
    expect(echoPulse.y).toBeGreaterThanOrEqual(3)
    expect(echoPulse).not.toEqual({ x: 3, y: 3 })
  })
})

describe('offline signal warfare runtime', () => {
  const jammer: LevelSignalJammerDefinition = {
    id: 'jammer-1',
    cell: { x: 3, y: 3 },
    radius: 3,
    side: 'enemy',
    propId: 'signal-jammer',
  }
  const nearbyRelay: OfflineRetranslator = {
    id: 'relay-near',
    col: 2,
    row: 3,
    owner: 'player',
    captureSide: 'player',
    progress: 1,
  }
  const distantRelay: OfflineRetranslator = {
    id: 'relay-far',
    col: 8,
    row: 8,
    owner: 'player',
    captureSide: 'player',
    progress: 1,
  }

  function environment(anchorHp: number, empDisabled = false): SignalWarfareEnvironment {
    return {
      tileAt: (col, row) => col === 3 && row === 3
        ? { kind: 'brick', hp: anchorHp }
        : undefined,
      isCellEmpDisrupted: (col, row) => empDisabled && col === 3 && row === 3,
    }
  }

  it('keeps relay suppression server-modelled and separate from visibility', () => {
    expect(isRelayJammedForSide({
      relay: nearbyRelay,
      side: 'player',
      jammers: [jammer],
      environment: environment(3),
    })).toBe(true)
    expect(isRelayJammedForSide({
      relay: distantRelay,
      side: 'player',
      jammers: [jammer],
      environment: environment(3),
    })).toBe(false)
    expect(isRelayJammedForSide({
      relay: nearbyRelay,
      side: 'player',
      jammers: [jammer],
      environment: environment(3, true),
    })).toBe(false)
  })

  it('reports jammed, EMP-window, and destroyed states without leaking hidden jammer coordinates', () => {
    const hidden = createSignalWarfareSnapshot({
      jammers: [jammer],
      relays: [nearbyRelay, distantRelay],
      side: 'player',
      anchorMaxHp: 3,
      environment: environment(3),
      isCellVisible: () => false,
    })
    expect(hidden).toMatchObject({
      state: 'jammed',
      activeJammerCount: 1,
      suppressedRelayCount: 1,
      visibleJammers: [],
    })

    const empWindow = createSignalWarfareSnapshot({
      jammers: [jammer],
      relays: [nearbyRelay],
      side: 'player',
      anchorMaxHp: 3,
      environment: environment(3, true),
      isCellVisible: () => true,
    })
    expect(empWindow).toMatchObject({
      state: 'emp-window',
      activeJammerCount: 1,
      suppressedRelayCount: 0,
      visibleJammers: [{
        id: 'jammer-1',
        active: true,
        empDisabled: true,
        anchorHp: 3,
        anchorMaxHp: 3,
      }],
    })

    const destroyed = createSignalWarfareSnapshot({
      jammers: [jammer],
      relays: [nearbyRelay],
      side: 'player',
      anchorMaxHp: 3,
      environment: environment(0),
      isCellVisible: () => true,
    })
    expect(destroyed).toMatchObject({
      state: 'clear',
      activeJammerCount: 0,
      suppressedRelayCount: 0,
      visibleJammers: [{ active: false, empDisabled: false, anchorHp: 0 }],
    })
  })
})

describe('battlefield perception render model', () => {
  function snapshot(overrides: Partial<TerrainEvidenceSnapshot>): TerrainEvidenceSnapshot {
    return {
      id: 'evidence',
      kind: 'noise',
      channel: 'physical',
      surface: 'gravel',
      col: 2,
      row: 2,
      age: 0,
      ttl: 1,
      strength: 1,
      label: 'GRAVEL',
      audible: true,
      sourcePrecision: 'directional',
      hearing: {
        direction: 'east',
        distanceBand: 'near',
        occluded: false,
      },
      ...overrides,
    }
  }

  it('coalesces each cell to the evidence with the strongest remaining signal', () => {
    const result = selectStrongestTerrainEvidenceByCell([
      snapshot({ id: 'faded-strong', strength: 1, age: 0.9 }),
      snapshot({ id: 'fresh-medium', strength: 0.6, age: 0.1 }),
      snapshot({ id: 'other-cell', col: 4, row: 4 }),
    ])
    expect(result.map((item) => item.id)).toEqual(['fresh-medium', 'other-cell'])
  })
})
