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
  HEARING_RANGE_TEST_PHASES,
  type HearingRangeTestPhase,
} from './hearingRangeTest.ts'

function projectPhase(phase: HearingRangeTestPhase) {
  return projectAcousticEventForListener({
    event: createAcousticEvent({
      id: phase.id,
      kind: phase.kind,
      source: { col: phase.source.x, row: phase.source.y },
      emittedAt: 1,
      intensity: phase.intensity,
    }),
    listener: { col: phase.listener.x, row: phase.listener.y },
    now: 1.1,
    sourceVisible: true,
    isOccludingCell: (col, row) => {
      const cell = HEARING_RANGE_TEST_LEVEL.rows[row]?.[col]
      return cell === 'B' || cell === 'E' || cell === 'S'
    },
  })
}

function startRange() {
  const game = new TanchikiGame({
    aiEnabled: false,
    hearingRangeTestForTesting: true,
    levelDefinitions: [HEARING_RANGE_TEST_LEVEL],
    saveStore: new MemorySaveStore(),
  })
  game.startGame(HEARING_RANGE_TEST_LEVEL_ID)
  return game
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function advanceToPhase(game: TanchikiGame, phaseIndex: number) {
  for (let frame = 0; frame < 3000; frame += 1) {
    if (game.getSnapshot().hearingTest?.phaseIndex === phaseIndex) {
      game.drainSoundEvents()
      return
    }
    game.update(0.05)
  }
  throw new Error(`Hearing range did not reach phase ${phaseIndex}`)
}

describe('human hearing range', () => {
  it('defines a bounded seven-station map whose expected audible states match the hearing model', () => {
    expect(HEARING_RANGE_TEST_LEVEL.rows).toHaveLength(17)
    expect(new Set(HEARING_RANGE_TEST_LEVEL.rows.map((row) => row.length))).toEqual(new Set([21]))
    expect(HEARING_RANGE_TEST_PHASES).toHaveLength(7)

    const projections = HEARING_RANGE_TEST_PHASES.map(projectPhase)
    HEARING_RANGE_TEST_PHASES.forEach((phase, index) => {
      const listenerCell = HEARING_RANGE_TEST_LEVEL.rows[phase.listener.y]?.[phase.listener.x]
      const sourceCell = HEARING_RANGE_TEST_LEVEL.rows[phase.source.y]?.[phase.source.x]
      expect(listenerCell).not.toBe('S')
      expect(sourceCell).not.toBe('S')
      expect(projections[index] === null).toBe(phase.expectation === 'silent')
    })

    expect(projections[0]).toMatchObject({ direction: 'east', occluded: false })
    expect(projections[0]!.pan).toBeGreaterThan(0)
    expect(projections[1]).toMatchObject({ direction: 'west', occluded: false })
    expect(projections[1]!.pan).toBeLessThan(0)
    expect(projections[4]).toMatchObject({ direction: 'east', occluded: true })
    expect(projections[4]!.gain).toBeLessThan(projections[0]!.gain)
  })

  it('teleports, auto-pulses, and lets Fire replay audible and silent stations without firing a shell', () => {
    const game = startRange()
    const initial = game.getSnapshot()
    expect(initial.level.name).toBe('Acoustic Range')
    expect(initial.player).toMatchObject({ col: 13, row: 4, dir: 'right' })
    expect(initial.hearingTest).toMatchObject({
      active: true,
      phaseIndex: 0,
      phaseCount: 7,
      pulseCount: 0,
    })
    game.setButton('right', true)
    step(game, 0.3)
    game.setButton('right', false)
    expect(game.getSnapshot().player).toMatchObject({ col: 13, row: 4 })

    step(game, 1)
    expect(game.getSnapshot().hearingTest?.pulseCount).toBe(1)
    expect(game.getSnapshot().hearing.cues.at(-1)).toMatchObject({
      kind: 'shot',
      direction: 'east',
    })
    expect(game.drainSoundEvents().at(-1)?.cue).toMatchObject({ direction: 'east' })

    advanceToPhase(game, 1)
    expect(game.getSnapshot().player).toMatchObject({ col: 19, row: 4, dir: 'left' })
    game.setButton('fire', true, 'keyboard')
    game.setButton('fire', false, 'keyboard')
    expect(game.getSnapshot().hearing.cues.at(-1)).toMatchObject({
      kind: 'shot',
      direction: 'west',
    })
    expect(game.getSnapshot().bullets).toHaveLength(0)

    advanceToPhase(game, 2)
    game.primaryAction()
    expect(game.getSnapshot().hearingTest?.pulseCount).toBe(1)
    expect(game.getSnapshot().hearing.cues).toHaveLength(0)
    expect(game.drainSoundEvents()).toHaveLength(0)

    advanceToPhase(game, 3)
    game.primaryAction()
    expect(game.getSnapshot().hearing.cues.at(-1)).toMatchObject({
      kind: 'explosion',
      direction: 'east',
    })

    advanceToPhase(game, 4)
    game.primaryAction()
    expect(game.getSnapshot().hearing.cues.at(-1)).toMatchObject({
      kind: 'shot',
      direction: 'east',
      occluded: true,
    })

    advanceToPhase(game, 5)
    game.primaryAction()
    expect(game.getSnapshot().hearing.cues.at(-1)).toMatchObject({
      kind: 'rustle',
      direction: 'east',
    })

    advanceToPhase(game, 6)
    game.primaryAction()
    expect(game.getSnapshot().hearing.cues).toHaveLength(0)
    expect(game.drainSoundEvents()).toHaveLength(0)
  })
})
