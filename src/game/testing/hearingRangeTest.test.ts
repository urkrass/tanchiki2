import { describe, expect, it } from 'vitest'
import { TanchikiGame } from '../game.ts'
import { MemorySaveStore } from '../save.ts'
import {
  HEARING_RANGE_TEST_CHECKPOINTS,
  HEARING_RANGE_TEST_LEVEL,
  HEARING_RANGE_TEST_LEVEL_ID,
  HEARING_RANGE_TEST_PATROLS,
} from './hearingRangeTest.ts'

function startCourse() {
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

function driveEastTo(game: TanchikiGame, targetCol: number) {
  game.setButton('right', true, 'keyboard')
  for (let frame = 0; frame < 10_000; frame += 1) {
    game.update(1 / 60)
    if (game.getSnapshot().player.col >= targetCol - 1) {
      break
    }
  }
  game.setButton('right', false, 'keyboard')
  for (let frame = 0; frame < 300 && game.getSnapshot().player.moving; frame += 1) {
    game.update(1 / 60)
  }
  expect(game.getSnapshot().player.col).toBe(targetCol)
}

function driveNorthTo(game: TanchikiGame, targetRow: number) {
  game.setButton('up', true, 'keyboard')
  for (let frame = 0; frame < 2_000; frame += 1) {
    game.update(1 / 60)
    if (game.getSnapshot().player.row <= targetRow + 1) {
      break
    }
  }
  game.setButton('up', false, 'keyboard')
  for (let frame = 0; frame < 300 && game.getSnapshot().player.moving; frame += 1) {
    game.update(1 / 60)
  }
  expect(game.getSnapshot().player.row).toBe(targetRow)
}

function observeCheckpoint(game: TanchikiGame, seconds: number) {
  let maxCueGain = 0
  let maxVisualStrength = 0
  let cueSeen = false
  let visualSeen = false
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame += 1) {
    game.update(1 / 60)
    const observed = game.getSnapshot().hearingTest?.observed
    if (!observed) continue
    cueSeen ||= observed.cuePresent
    visualSeen ||= observed.visualPresent
    maxCueGain = Math.max(maxCueGain, observed.cueGain ?? 0)
    maxVisualStrength = Math.max(maxVisualStrength, observed.visualStrength ?? 0)
  }
  const state = game.getSnapshot()
  return {
    state,
    cueSeen,
    visualSeen,
    maxCueGain,
    maxVisualStrength,
  }
}

describe('acoustic field course', () => {
  it('defines a linear player lane, nine signed checkpoints, and real patrol routes', () => {
    expect(HEARING_RANGE_TEST_LEVEL.rows).toHaveLength(17)
    expect(new Set(HEARING_RANGE_TEST_LEVEL.rows.map((row) => row.length))).toEqual(new Set([94]))
    expect(HEARING_RANGE_TEST_LEVEL.revealMap).toBe(false)
    expect(HEARING_RANGE_TEST_CHECKPOINTS).toHaveLength(9)
    expect(HEARING_RANGE_TEST_PATROLS).toHaveLength(7)
    expect(HEARING_RANGE_TEST_CHECKPOINTS.map((checkpoint) => checkpoint.id)).toEqual([
      'visible-reference',
      'hidden-near',
      'hidden-mid',
      'hidden-edge',
      'out-of-range',
      'wall-outside',
      'wall-inside',
      'wall-exit',
      'inspection-yard',
    ])

    for (let col = 1; col < 93; col += 1) {
      expect(HEARING_RANGE_TEST_LEVEL.rows[8]![col]).toBe('=')
    }
    expect(HEARING_RANGE_TEST_LEVEL.rows[7]!.slice(68, 77)).toBe('S'.repeat(9))
    expect(HEARING_RANGE_TEST_LEVEL.rows[9]!.slice(68, 77)).toBe('S'.repeat(9))
    expect(HEARING_RANGE_TEST_LEVEL.rows[7]![88]).toBe('=')

    for (const patrol of HEARING_RANGE_TEST_PATROLS) {
      expect(patrol.route.length).toBeGreaterThan(1)
      for (let index = 1; index < patrol.route.length; index += 1) {
        expect(patrol.route[index]!.x - patrol.route[index - 1]!.x).toBe(1)
        expect(patrol.route[index]!.y).toBe(patrol.route[index - 1]!.y)
      }
    }
  })

  it('moves real tank entities through normal terrain and never synthesizes a cue or projectile', () => {
    const game = startCourse()
    const opening = game.getSnapshot()
    expect(opening.level.name).toBe('Acoustic Field Course')
    expect(opening.player).toMatchObject({ col: 2, row: 8, dir: 'right' })
    expect(opening.hearingTest).toMatchObject({
      active: true,
      checkpointIndex: 0,
      checkpointCount: 9,
      checkpointId: 'visible-reference',
    })
    expect(opening.hearingTest?.patrols).toHaveLength(7)
    expect(opening.hearingTest?.patrols.every((patrol) => patrol.cellsTraversed === 0)).toBe(true)

    step(game, 0.25)
    expect(game.getSnapshot().hearingTest?.patrols.every((patrol) => patrol.cellsTraversed === 0)).toBe(true)
    expect(game.getSnapshot().hearing.cues).toHaveLength(0)
    expect(game.getSnapshot().terrainEvidence).toHaveLength(0)

    step(game, 1.5)
    const moving = game.getSnapshot()
    expect(moving.hearingTest?.patrols.some((patrol) => patrol.cellsTraversed > 0)).toBe(true)
    expect(moving.hearingTest?.patrols.some((patrol) => patrol.moving)).toBe(true)

    game.setButton('fire', true, 'keyboard')
    game.setButton('fire', false, 'keyboard')
    step(game, 0.2)
    expect(game.getSnapshot().bullets).toHaveLength(0)

    driveEastTo(game, 8)
    expect(game.getSnapshot().player).toMatchObject({ col: 8, row: 8 })
  })

  it('weakens hidden movement with distance and emits nothing for a moving out-of-range patrol', () => {
    const game = startCourse()
    const results: Array<ReturnType<typeof observeCheckpoint>> = []

    for (const index of [0, 1, 2, 3, 4]) {
      const checkpoint = HEARING_RANGE_TEST_CHECKPOINTS[index]!
      driveEastTo(game, checkpoint.observation.x)
      expect(game.getSnapshot().hearingTest?.checkpointId).toBe(checkpoint.id)
      results.push(observeCheckpoint(game, 5))
    }

    const [visible, near, mid, edge, out] = results
    expect(visible!.cueSeen).toBe(true)
    expect(visible!.visualSeen).toBe(true)
    expect(visible!.state.hearingTest?.observed.sourcePrecision).toBe('exact')
    expect(near!.cueSeen).toBe(true)
    expect(mid!.cueSeen).toBe(true)
    expect(edge!.cueSeen).toBe(true)
    expect(near!.maxCueGain).toBeGreaterThan(mid!.maxCueGain)
    expect(mid!.maxCueGain).toBeGreaterThan(edge!.maxCueGain)
    expect(near!.maxVisualStrength).toBeGreaterThan(mid!.maxVisualStrength)
    expect(mid!.maxVisualStrength).toBeGreaterThan(edge!.maxVisualStrength)

    expect(out!.state.hearingTest?.observed.patrolCellsTraversed).toBeGreaterThan(0)
    expect(out!.cueSeen).toBe(false)
    expect(out!.visualSeen).toBe(false)
    expect(out!.state.hearingTest?.observed.cueObservedSinceEntry).toBe(false)
  })

  it('proves heard outside, silent behind steel, and heard again using one continuous gravel patrol', () => {
    const game = startCourse()

    driveEastTo(game, HEARING_RANGE_TEST_CHECKPOINTS[5]!.observation.x)
    const outside = observeCheckpoint(game, 12)
    expect(outside.state.hearingTest?.checkpointId).toBe('wall-outside')
    expect(outside.cueSeen).toBe(true)
    expect(outside.state.hearingTest?.wallProof.outsideHeard).toBe(true)

    const wallBefore = outside.state.hearingTest?.patrols.find((patrol) => patrol.id === 'hearing-patrol-wall')
    driveEastTo(game, HEARING_RANGE_TEST_CHECKPOINTS[6]!.observation.x)
    const inside = observeCheckpoint(game, 6)
    const wallInside = inside.state.hearingTest?.patrols.find((patrol) => patrol.id === 'hearing-patrol-wall')
    expect(inside.state.hearingTest?.checkpointId).toBe('wall-inside')
    expect(inside.state.hearingTest?.focusPatrolId).toBe('hearing-patrol-wall')
    expect(wallInside!.cellsTraversed).toBeGreaterThan(wallBefore!.cellsTraversed)
    expect(inside.cueSeen).toBe(false)
    expect(inside.visualSeen).toBe(false)
    expect(inside.state.hearingTest?.wallProof.insideSilent).toBe(true)

    driveEastTo(game, HEARING_RANGE_TEST_CHECKPOINTS[7]!.observation.x)
    const exit = observeCheckpoint(game, 12)
    expect(exit.state.hearingTest?.checkpointId).toBe('wall-exit')
    expect(exit.cueSeen).toBe(true)
    expect(exit.state.hearingTest?.wallProof).toEqual({
      patrolId: 'hearing-patrol-wall',
      outsideHeard: true,
      insideSilent: true,
      exitHeard: true,
    })
  })

  it('opens the final yard so the player can approach and reveal a normally simulated patrol', () => {
    const game = startCourse()
    driveEastTo(game, HEARING_RANGE_TEST_CHECKPOINTS[8]!.observation.x)
    expect(game.getSnapshot().hearingTest?.checkpointId).toBe('inspection-yard')

    driveNorthTo(game, 6)
    const inspection = game.getSnapshot()
    const patrol = inspection.hearingTest?.patrols.find((candidate) => candidate.id === 'hearing-patrol-inspect')
    expect(inspection.player).toMatchObject({ col: 88, row: 6 })
    expect(patrol?.distanceCells).toBeLessThanOrEqual(2.25)
    expect(patrol?.visible).toBe(true)
    expect(inspection.enemies.some((enemy) => enemy.id === 'hearing-patrol-inspect')).toBe(true)
  })
})
