import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import {
  TUTORIAL_BRIEFING_OFFICER,
  TUTORIAL_MISSIONS,
} from './tutorial.ts'
import {
  TUTORIAL_DIALOGUE_SECONDS,
  TutorialDirector,
  type TutorialDirectorProbe,
} from './tutorialDirector.ts'
import type { Bullet, Tile } from './types.ts'

describe('TutorialDirector', () => {
  it('holds danger and player control until opening orders are confirmed', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)

    expect(director.getState()).toMatchObject({
      stepId: 'welcome',
      dangerHeld: true,
      playerControlHeld: true,
      speaker: 'Actual',
    })

    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState().speaker).toBe('Spanner')
    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState()).toMatchObject({
      stepId: 'move',
      dangerHeld: false,
      playerControlHeld: false,
      goal: 'Move one grid cell.',
    })
  })

  it('advances action goals only after their observed requirements', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)

    director.update(0.2, { ...probe, player: { ...probe.player, col: 10 } })
    expect(director.getState().stepId).toBe('move')

    director.update(0.2, { ...probe, player: { ...probe.player, col: 11 } })
    expect(director.getState().stepId).toBe('turn')

    director.update(0.2, {
      ...probe,
      player: { ...probe.player, col: 11, dir: 'left' },
    })
    expect(director.getState().stepId).toBe('fire')

    director.update(0.2, {
      ...probe,
      player: { ...probe.player, col: 11, dir: 'left' },
      shotsFired: 1,
    })
    expect(director.getState().stepId).toBe('defend')
  })

  it('keeps normal radio lines on screen for the slower six-second reading beat', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)

    director.update(TUTORIAL_DIALOGUE_SECONDS - 0.5, probe)
    expect(director.getState().speaker).toBe('Actual')

    director.update(0.6, probe)
    expect(director.getState().speaker).toBe('Spanner')
  })

  it('plays final drill dialogue before marking a mission complete', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)

    const moved = { ...probe, player: { ...probe.player, col: 11 } }
    director.update(0.1, moved)
    const turned = { ...moved, player: { ...moved.player, dir: 'left' as const } }
    director.update(0.1, turned)
    const fired = { ...turned, shotsFired: 1 }
    director.update(0.1, fired)
    const cleared = { ...fired, playerKills: 2 }
    director.update(0.1, cleared)

    expect(director.getState()).toMatchObject({
      stepId: 'defend',
      speaker: 'Spanner',
      missionComplete: false,
    })
    director.advanceDialogue(cleared)
    expect(director.getState().missionComplete).toBe(true)
  })

  it('counts squad defeats cumulatively when allies score during the adaptive step', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[2]!, probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)

    const adapted = { ...probe, deployableActions: 1, hostilesDefeated: 2 }
    director.update(0.1, adapted)
    expect(director.getState().stepId).toBe('tickets')

    director.update(0.1, { ...adapted, hostilesDefeated: 4 })
    expect(director.getState()).toMatchObject({
      stepId: 'tickets',
      speaker: 'Brick',
      missionComplete: false,
    })
  })

  it('holds the camera tour, releases to player follow, and completes after return', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[1]!, probe)
    director.advanceDialogue(probe)

    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      cameraControlled: true,
      dangerHeld: true,
      playerControlHeld: true,
      cameraTarget: { x: 16, y: 8 },
    })

    director.update(2.5, { ...probe, cameraAtPlayer: false })
    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      cameraControlled: true,
      cameraTarget: { x: 16, y: 8 },
    })

    director.update(1.8, { ...probe, cameraAtPlayer: false })
    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      cameraControlled: true,
      cameraTarget: null,
    })

    director.update(0.1, { ...probe, cameraAtPlayer: true })
    expect(director.getState()).toMatchObject({
      stepId: 'relay',
      cameraControlled: false,
      dangerHeld: false,
    })
  })
})

describe('Boot Camp runtime safety', () => {
  it('identifies General Rook and the active drill in readable briefing text', () => {
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    pressMenu(game)
    pressMenu(game)

    expect(game.getSnapshot()).toMatchObject({
      mode: 'briefing',
      readableText: {
        tutorial: {
          mission: 'First Gear',
          speaker: TUTORIAL_BRIEFING_OFFICER,
          dialogue: TUTORIAL_MISSIONS[0]!.briefing,
        },
      },
    })
  })

  it('blocks movement during opening radio orders and exposes live tutorial text', () => {
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    launchFirstDrill(game)

    const initial = game.getSnapshot()
    expect(initial.tutorial).toMatchObject({
      stepId: 'welcome',
      speaker: 'Actual',
      cameraControlled: false,
    })
    expect(initial.readableText.tutorial.dialogue).toContain('Welcome to Boot Camp')

    game.setInput({ right: true })
    step(game, 0.8)
    expect(game.getSnapshot().player.col).toBe(initial.player.col)

    game.primaryAction()
    game.primaryAction()
    game.setInput({ right: true })
    step(game, 0.6)
    expect(game.getSnapshot().player.col).toBe(initial.player.col + 1)
  })

  it('records completion without Campaign rewards or replacing a saved Campaign run', () => {
    const save = createDefaultSaveData()
    save.progression.credits = 40
    save.progression.xp = 12
    const store = new MemorySaveStore(save)
    const campaign = new TanchikiGame({ aiEnabled: false, saveStore: store })
    campaign.startGame()
    campaign.saveAndQuit()
    const savedCampaign = store.load()?.resumableRun
    expect(savedCampaign).not.toBeNull()

    const game = new TanchikiGame({ aiEnabled: false, saveStore: store })

    game.navigateMenu(1)
    pressMenu(game)
    pressMenu(game)
    ;(game as unknown as { completeTutorialMission: () => void }).completeTutorialMission()

    expect(game.getSnapshot()).toMatchObject({
      mode: 'level-complete',
      runKind: 'tutorial',
      progression: {
        credits: 40,
        xp: 12,
        unlockedStage: 1,
        completedLevels: [],
        tutorialCompletedMissions: [1],
        hasSavedRun: true,
      },
    })
    expect(store.load()?.resumableRun).toEqual(savedCampaign)
  })

  it.each([1, 2] as const)('keeps the training base indestructible in drill %i', (missionId) => {
    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = missionId === 2 ? [1] : []
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore(save) })
    launchFirstDrill(game)

    const mission = TUTORIAL_MISSIONS[missionId - 1]!
    const baseRow = mission.level.rows.findIndex((row) => row.includes('E'))
    const baseCol = mission.level.rows[baseRow]!.indexOf('E')
    const baseTile = game.getTile(baseCol, baseRow)
    expect(baseTile?.kind).toBe('base')

    const internals = game as unknown as {
      spawnTimer: number
      tutorialDirector: TutorialDirector | null
      hitBaseTileWithBullet: (
        bullet: Bullet,
        tile: Tile,
        col: number,
        row: number,
        centerX: number,
        centerY: number,
      ) => void
    }
    expect(internals.spawnTimer).toBe(mission.level.spawnInterval)
    internals.tutorialDirector = null

    const shell: Bullet = {
      id: `training-base-${missionId}`,
      owner: 'enemy',
      ownerId: 'training-hostile',
      side: 'enemy',
      team: 'red',
      x: 0,
      y: 0,
      dir: 'down',
      speed: 0,
      damage: 4,
      ttl: 1,
    }
    internals.hitBaseTileWithBullet(shell, baseTile!, baseCol, baseRow, 0, 0)

    expect(game.getSnapshot()).toMatchObject({
      mode: 'playing',
      baseHp: 3,
    })
    expect(game.getTile(baseCol, baseRow)?.hp).toBe(3)
  })
})

function makeProbe(): TutorialDirectorProbe {
  return {
    elapsed: 0,
    player: { col: 10, row: 14, dir: 'up' },
    shotsFired: 0,
    playerKills: 0,
    hostilesDefeated: 0,
    relayActions: 0,
    deployableActions: 0,
    selectedClass: 'engineer',
    selectedMod: 'overdrive',
    activeMod: null,
    flag: null,
    assaultHp: null,
    cameraAtPlayer: true,
  }
}

function launchFirstDrill(game: TanchikiGame) {
  pressMenu(game)
  pressMenu(game)
  pressMenu(game)
  step(game, 1.25)
  game.primaryAction()
  expect(game.getSnapshot().mode).toBe('playing')
}

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
