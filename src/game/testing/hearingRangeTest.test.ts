import { describe, expect, it } from 'vitest'
import {
  createAcousticEvent,
  projectAcousticEventForListener,
} from '../../../packages/shared/src/spatialHearing.ts'
import { TanchikiGame } from '../game.ts'
import { MemorySaveStore } from '../save.ts'
import {
  HEARING_RANGE_TEST_LEVEL,
  HEARING_RANGE_TEST_LEVEL_ID,
  HEARING_RANGE_TEST_LISTENER,
  HEARING_RANGE_TEST_STATIONS,
  type HearingRangeTestStation,
} from './hearingRangeTest.ts'

function projectStation(station: HearingRangeTestStation) {
  return projectAcousticEventForListener({
    event: createAcousticEvent({
      id: station.id,
      kind: station.kind,
      source: { col: station.source.x, row: station.source.y },
      emittedAt: 1,
      intensity: station.intensity,
    }),
    listener: { col: station.listener.x, row: station.listener.y },
    now: 1.1,
    sourceVisible: station.sourceVisible,
    isOccludingCell: (col, row) => {
      const cell = HEARING_RANGE_TEST_LEVEL.rows[row]?.[col]
      return cell === 'B' || cell === 'E' || cell === 'S'
    },
  })
}

function startLab() {
  const game = new TanchikiGame({
    aiEnabled: false,
    hearingRangeTestForTesting: true,
    levelDefinitions: [HEARING_RANGE_TEST_LEVEL],
    saveStore: new MemorySaveStore(),
  })
  game.startGame(HEARING_RANGE_TEST_LEVEL_ID)
  return game
}

function tap(game: TanchikiGame, button: 'left' | 'right' | 'fire') {
  game.setButton(button, true, 'keyboard')
  game.setButton(button, false, 'keyboard')
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

describe('visual hearing lab', () => {
  it('defines one fixed listener and five distance-only stations across real fog of war', () => {
    expect(HEARING_RANGE_TEST_LEVEL.rows).toHaveLength(17)
    expect(new Set(HEARING_RANGE_TEST_LEVEL.rows.map((row) => row.length))).toEqual(new Set([21]))
    expect(HEARING_RANGE_TEST_LEVEL.revealMap).toBe(false)
    expect(HEARING_RANGE_TEST_STATIONS).toHaveLength(5)
    expect(new Set(HEARING_RANGE_TEST_STATIONS.map((station) => station.kind))).toEqual(new Set(['rustle']))
    expect(new Set(HEARING_RANGE_TEST_STATIONS.map((station) => station.intensity))).toEqual(new Set([1.5]))
    expect(HEARING_RANGE_TEST_STATIONS.every((station) => (
      station.listener.x === HEARING_RANGE_TEST_LISTENER.x
      && station.listener.y === HEARING_RANGE_TEST_LISTENER.y
    ))).toBe(true)

    const projections = HEARING_RANGE_TEST_STATIONS.map(projectStation)
    expect(projections[0]).toMatchObject({
      kind: 'rustle',
      sourcePrecision: 'exact',
      distanceBand: 'near',
    })
    expect(projections[1]).toMatchObject({
      kind: 'rustle',
      sourcePrecision: 'directional',
      distanceBand: 'mid',
    })
    expect(projections[2]).toMatchObject({
      kind: 'rustle',
      sourcePrecision: 'directional',
      distanceBand: 'far',
    })
    expect(projections[3]).toMatchObject({
      kind: 'rustle',
      sourcePrecision: 'directional',
      distanceBand: 'far',
    })
    expect(projections[4]).toBeNull()
    expect(projections[1]!.gain).toBeGreaterThan(projections[2]!.gain)
    expect(projections[2]!.gain).toBeGreaterThan(projections[3]!.gain)
  })

  it('selects stations manually, keeps the listener fixed, and fades hidden visuals by distance', () => {
    const game = startLab()
    const initial = game.getSnapshot()
    expect(initial.level.name).toBe('Acoustic Lab')
    expect(initial.player).toMatchObject({ col: 10, row: 8, dir: 'right' })
    expect(initial.hearingTest).toMatchObject({
      active: true,
      stationIndex: 0,
      stationCount: 5,
      stationId: 'visible-reference',
      expectedVisual: 'exact',
      observedVisual: null,
    })

    step(game, 6)
    expect(game.getSnapshot().hearingTest?.stationIndex).toBe(0)
    expect(game.getSnapshot().hearingTest?.pulseCount).toBe(0)

    tap(game, 'fire')
    const visible = game.getSnapshot()
    expect(visible.player).toMatchObject({ col: 10, row: 8 })
    expect(visible.bullets).toHaveLength(0)
    expect(visible.terrainEvidence).toHaveLength(1)
    expect(visible.terrainEvidence[0]).toMatchObject({
      kind: 'rustle',
      strength: 1.5,
      sourcePrecision: 'exact',
    })
    expect(visible.hearingTest?.observedVisual).toMatchObject({
      present: true,
      strength: 1.5,
      sourcePrecision: 'exact',
    })

    const hiddenStrengths: number[] = []
    for (const expected of [
      { id: 'lab-near', strength: 0.75 },
      { id: 'lab-mid', strength: 0.38 },
      { id: 'lab-edge', strength: 0.18 },
    ]) {
      tap(game, 'right')
      expect(game.getSnapshot().hearingTest).toMatchObject({
        stationId: expected.id,
        observedVisual: null,
      })
      expect(game.getSnapshot().player).toMatchObject({ col: 10, row: 8 })
      tap(game, 'fire')
      const state = game.getSnapshot()
      expect(state.terrainEvidence).toHaveLength(1)
      expect(state.terrainEvidence[0]).toMatchObject({
        kind: 'rustle',
        strength: expected.strength,
        sourcePrecision: 'directional',
      })
      expect(state.hearingTest?.observedVisual).toMatchObject({
        present: true,
        strength: expected.strength,
        sourcePrecision: 'directional',
      })
      hiddenStrengths.push(state.terrainEvidence[0]!.strength)
    }
    expect(hiddenStrengths[0]).toBeGreaterThan(hiddenStrengths[1]!)
    expect(hiddenStrengths[1]).toBeGreaterThan(hiddenStrengths[2]!)

    tap(game, 'right')
    tap(game, 'fire')
    const outOfRange = game.getSnapshot()
    expect(outOfRange.hearingTest).toMatchObject({
      stationId: 'lab-out',
      expectedVisual: 'none',
      observedVisual: {
        present: false,
        strength: null,
      },
    })
    expect(outOfRange.terrainEvidence).toHaveLength(0)
    expect(outOfRange.hearing.cues).toHaveLength(0)
    expect(outOfRange.bullets).toHaveLength(0)

    tap(game, 'right')
    expect(game.getSnapshot().hearingTest?.stationId).toBe('visible-reference')
    tap(game, 'left')
    expect(game.getSnapshot().hearingTest?.stationId).toBe('lab-out')
  })
})
