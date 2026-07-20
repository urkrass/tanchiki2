import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import {
  TUTORIAL_MISSIONS,
  getAdaptiveTutorialGoal,
  getUnlockedTutorialMissionIds,
} from './tutorial.ts'

describe('Boot Camp foundations', () => {
  it('focuses Boot Camp for a new save while keeping Campaign selectable', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    let snapshot = game.getSnapshot()
    expect(snapshot.menu.options.slice(0, 2)).toEqual(['Boot Camp', 'Campaign'])
    expect(snapshot.menu.selectedIndex).toBe(0)
    expect(snapshot.runKind).toBe('campaign')

    game.navigateMenu(1)
    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-select')
    expect(snapshot.runKind).toBe('campaign')
  })

  it('normalizes old saves additively without changing schema or campaign state', () => {
    const oldSave = createDefaultSaveData()
    oldSave.progression.unlockedStage = 3
    oldSave.progression.completedLevels = [1, 2]
    delete (oldSave.progression as Partial<typeof oldSave.progression>).tutorialCompletedMissions

    const store = new MemorySaveStore(oldSave)
    const normalized = store.load()

    expect(normalized).toMatchObject({
      schemaVersion: 1,
      progression: {
        unlockedStage: 3,
        completedLevels: [1, 2],
        tutorialCompletedMissions: [],
      },
    })
  })

  it('unlocks Boot Camp sequentially and keeps completed drills replayable', () => {
    expect(getUnlockedTutorialMissionIds([])).toEqual([1])
    expect(getUnlockedTutorialMissionIds([1])).toEqual([1, 2])
    expect(getUnlockedTutorialMissionIds([1, 2, 3])).toEqual([1, 2, 3, 4])
    expect(getUnlockedTutorialMissionIds([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6])
    expect(getUnlockedTutorialMissionIds([0, 99])).toEqual([1])
  })

  it('opens a focused briefing with adaptive loadout context', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    pressMenu(game)
    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('tutorial-select')
    expect(snapshot.menu.options).toEqual(['1. First Gear', 'Back'])

    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('briefing')
    expect(snapshot.runKind).toBe('tutorial')
    expect(snapshot.menu.options).toEqual(['Start Drill', 'Change Loadout', 'Back'])
    expect(snapshot.tutorial).toMatchObject({
      active: true,
      missionId: 1,
      missionName: 'First Gear',
      stepId: 'welcome',
      activeGoal: 'Confirm range-control instructions.',
      recommendedLoadout: {
        classId: 'engineer',
        majorMod: 'overdrive',
      },
      actualLoadout: {
        classId: 'engineer',
        majorMod: 'overdrive',
      },
    })
    expect(snapshot.readableText.tutorial.goal).toBe('Confirm range-control instructions.')
  })

  it('provides valid maps, zero rewards, and adaptive paths for every class and Major Mod', () => {
    expect(TUTORIAL_MISSIONS).toHaveLength(6)

    for (const mission of TUTORIAL_MISSIONS) {
      expect(mission.id).toBeGreaterThan(0)
      expect(mission.level.id).toBe(mission.id)
      expect(mission.level.rows).toHaveLength(17)
      expect(mission.level.rows.every((row) => row.length === 21)).toBe(true)
      expect(mission.level.rewards).toEqual({ credits: 0, xp: 0, score: 0 })
    }

    const classMission = TUTORIAL_MISSIONS[2]!
    const classStepIndex = classMission.steps.findIndex((step) => step.id === 'adaptive')
    for (const classId of ['scout', 'engineer', 'battle'] as const) {
      expect(getAdaptiveTutorialGoal(classMission, classId, 'overdrive', classStepIndex)?.classId).toBe(classId)
    }

    const modMission = TUTORIAL_MISSIONS[5]!
    const modStepIndex = modMission.steps.findIndex((step) => step.id === 'adaptive')
    for (const majorMod of ['overdrive', 'pontoon', 'hedgehog', 'emp'] as const) {
      expect(getAdaptiveTutorialGoal(modMission, 'engineer', majorMod, modStepIndex)?.majorMod).toBe(majorMod)
    }
  })
})

function pressMenu(game: TanchikiGame) {
  game.primaryAction()
  step(game, 0.14)
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}
