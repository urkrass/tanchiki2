import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import {
  TUTORIAL_BRIEFING_OFFICER,
  TUTORIAL_MISSIONS,
} from './tutorial.ts'
import {
  TUTORIAL_DIALOGUE_SECONDS,
  TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS,
  TUTORIAL_SENTENCE_HOLD_SECONDS,
  TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND,
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
      speaker: 'General Rook',
      dialogueVisibleCharacters: 0,
      dialogueComplete: false,
    })

    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState()).toMatchObject({
      speaker: 'General Rook',
      dialogueComplete: true,
    })
    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState()).toMatchObject({
      stepId: 'welcome',
      speaker: 'General Rook',
      dialogueVisibleCharacters: 0,
    })
    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      dangerHeld: true,
      playerControlHeld: true,
      cameraControlled: true,
    })
  })

  it('holds an easy movement completion until Rook finishes the order and pauses', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    enterFirstMissionActionPhase(director, probe)

    const moved = {
      ...probe,
      player: { ...probe.player, col: 13 },
    }
    director.update(0.2, moved)
    expect(director.getState()).toMatchObject({
      stepId: 'move',
      dialogueComplete: false,
    })

    director.advanceDialogue(moved)
    expect(director.getState()).toMatchObject({
      stepId: 'move',
      dialogueComplete: true,
    })

    director.update(TUTORIAL_SENTENCE_HOLD_SECONDS - 0.1, moved)
    expect(director.getState().stepId).toBe('move')

    director.update(0.2, moved)
    expect(director.getState()).toMatchObject({
      stepId: 'engage',
      goal: 'Use cover and destroy both enemy tanks.',
      dialogueComplete: false,
    })
  })

  it('types dialogue letter by letter before advancing on the six-second reading beat', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)

    director.update(1, probe)
    expect(director.getState()).toMatchObject({
      speaker: 'General Rook',
      dialogueVisibleCharacters: TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND,
      dialogueComplete: false,
    })

    director.update(TUTORIAL_DIALOGUE_SECONDS - 1.2, probe)
    expect(director.getState()).toMatchObject({
      speaker: 'General Rook',
      dialogueComplete: true,
    })

    director.update(0.3, probe)
    expect(director.getState()).toMatchObject({
      speaker: 'General Rook',
      dialogueVisibleCharacters: 0,
      dialogueComplete: false,
    })
  })

  it('keeps the final confirmation order visible until the player advances it', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)

    director.update(TUTORIAL_DIALOGUE_SECONDS * 2, probe)
    director.update(TUTORIAL_DIALOGUE_SECONDS * 2, probe)
    director.update(TUTORIAL_DIALOGUE_SECONDS * 10, probe)

    expect(director.getState()).toMatchObject({
      stepId: 'welcome',
      speaker: 'General Rook',
      dialogue: 'Confirm when ready. Range control will borrow your camera, not your dignity.',
      dialogueComplete: true,
      dangerHeld: true,
      playerControlHeld: true,
    })

    expect(director.advanceDialogue(probe)).toBe(true)
    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      cameraControlled: true,
      playerControlHeld: true,
    })
  })

  it('pauses the typewriter briefly between sentences in one transmission', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    const firstSentenceCharacters = TUTORIAL_MISSIONS[0]!.steps[0]!.dialogue[0]!.text.indexOf('.') + 1

    director.update(
      firstSentenceCharacters / TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND
        + TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS
        - 0.05,
      probe,
    )
    expect(director.getState()).toMatchObject({
      dialogueVisibleCharacters: firstSentenceCharacters,
      dialogueComplete: false,
    })

    director.update(0.11, probe)
    expect(director.getState().dialogueVisibleCharacters).toBeGreaterThan(firstSentenceCharacters)
  })

  it('plays final drill dialogue before marking a mission complete', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    enterFirstMissionActionPhase(director, probe)

    const moved = { ...probe, player: { ...probe.player, col: 13 } }
    director.update(0.1, moved)
    director.advanceDialogue(moved)
    director.advanceDialogue(moved)
    director.update(0, moved)

    const cleared = { ...moved, playerKills: 2, hostilesDefeated: 2 }
    director.update(0.1, cleared)

    expect(director.getState()).toMatchObject({
      stepId: 'engage',
      speaker: 'General Rook',
      missionComplete: false,
    })
    director.advanceDialogue(cleared)
    director.advanceDialogue(cleared)
    director.advanceDialogue(cleared)
    director.advanceDialogue(cleared)
    director.update(0, cleared)
    expect(director.getState()).toMatchObject({
      stepId: 'engage',
      speaker: 'General Rook',
      missionComplete: false,
    })
    director.advanceDialogue(cleared)
    expect(director.getState()).toMatchObject({
      stepId: 'engage',
      dialogueComplete: true,
      missionComplete: false,
    })
    director.advanceDialogue(cleared)
    expect(director.getState().missionComplete).toBe(true)
  })

  it('counts squad defeats cumulatively when allies score during the adaptive step', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[2]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')

    const adapted = { ...probe, deployableActions: 1, hostilesDefeated: 2 }
    director.update(0.1, adapted)
    expect(director.getState().stepId).toBe('adaptive')
    director.advanceDialogue(adapted)
    director.advanceDialogue(adapted)
    director.update(0, adapted)
    expect(director.getState().stepId).toBe('tickets')

    director.update(0.1, { ...adapted, hostilesDefeated: 4 })
    expect(director.getState()).toMatchObject({
      stepId: 'tickets',
      speaker: 'Brick',
      missionComplete: false,
    })
  })

  it('remembers transient flag actions without interrupting their instructions', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[3]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')

    const carrying = {
      ...probe,
      flag: {
        carrierId: 'player',
        playerId: 'player',
        dropped: false,
        captures: 0,
      },
    }
    director.update(0.1, carrying)
    expect(director.getState().stepId).toBe('pickup')
    director.advanceDialogue(carrying)
    director.advanceDialogue(carrying)
    director.update(0, carrying)
    expect(director.getState().stepId).toBe('transfer')

    const dropped = {
      ...carrying,
      flag: {
        ...carrying.flag,
        carrierId: null,
        dropped: true,
        transferComplete: true,
      },
    }
    director.update(0.1, dropped)
    expect(director.getState().stepId).toBe('transfer')
    director.advanceDialogue(dropped)
    director.advanceDialogue(dropped)
    director.advanceDialogue(dropped)
    director.advanceDialogue(dropped)
    director.update(0, dropped)
    expect(director.getState().stepId).toBe('recover')
  })

  it('holds the camera tour, releases to player follow, and completes after return', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[1]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')

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
      stepId: 'tour',
      cameraControlled: false,
      dangerHeld: false,
    })
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)
    director.update(0, probe)
    expect(director.getState().stepId).toBe('relay')
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
      speaker: 'General Rook',
      cameraControlled: false,
      dialogueVisibleCharacters: 0,
      dialogueComplete: false,
    })
    expect(initial.readableText.tutorial.dialogue).toContain('Welcome to Boot Camp')

    game.setInput({ right: true })
    step(game, 0.8)
    expect(game.getSnapshot().player.col).toBe(initial.player.col)

    game.primaryAction()
    game.primaryAction()
    game.primaryAction()
    game.primaryAction()
    step(game, 11)
    game.setInput({ right: true })
    step(game, 0.6)
    expect(game.getSnapshot().player.col).toBe(initial.player.col + 1)
  })

  it('shows the confirm cue only after Rook finishes typing and hides it for the camera tour', () => {
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    launchFirstDrill(game)

    expect(game.getSnapshot().tutorial.actionCue).toBeNull()
    game.primaryAction()
    game.primaryAction()
    step(game, 6)

    expect(game.getSnapshot()).toMatchObject({
      tutorial: {
        stepId: 'welcome',
        dialogueComplete: true,
        actionCue: {
          kind: 'confirm',
          keyboardKeys: ['ENTER'],
          touchKeys: ['TAP'],
          label: 'CONFIRM',
        },
      },
      readableText: {
        tutorial: {
          action: 'ENTER: CONFIRM',
        },
      },
    })

    game.primaryAction()
    expect(game.getSnapshot()).toMatchObject({
      tutorial: {
        stepId: 'tour',
        cameraControlled: true,
        actionCue: null,
      },
      readableText: {
        tutorial: {
          action: 'No action cue',
        },
      },
    })
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

  it('removes the base from the first drill and preloads both camera-tour hostiles', () => {
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    launchFirstDrill(game)

    expect(TUTORIAL_MISSIONS[0]!.level.rows.some((row) => row.includes('E'))).toBe(false)
    expect(game.getSnapshot()).toMatchObject({
      mode: 'playing',
      enemiesRemaining: 0,
      readableText: {
        hud: {
          objective: 'Tank hunt: enemies remaining 2.',
        },
      },
    })
    expect((game as unknown as { enemies: Array<{ side: string }> }).enemies).toHaveLength(2)
    expect(TUTORIAL_MISSIONS[0]!.level.rows.every((row, y) =>
      [...row].every((_, x) => game.getTile(x, y)?.kind !== 'base'),
    )).toBe(true)
  })

  it('keeps the vision-drill base indestructible', () => {
    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = [1]
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore(save) })
    launchFirstDrill(game)

    const mission = TUTORIAL_MISSIONS[1]!
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
      id: 'training-base-2',
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

function advanceUntilStepChanges(
  director: TutorialDirector,
  probe: TutorialDirectorProbe,
  stepId: string,
) {
  for (let index = 0; index < 12 && director.getState().stepId === stepId; index += 1) {
    expect(director.advanceDialogue(probe)).toBe(true)
  }
  expect(director.getState().stepId).not.toBe(stepId)
}

function enterFirstMissionActionPhase(director: TutorialDirector, probe: TutorialDirectorProbe) {
  advanceUntilStepChanges(director, probe, 'welcome')
  expect(director.getState()).toMatchObject({
    stepId: 'tour',
    cameraWaypointCount: 3,
    cameraWaypointIndex: 0,
  })
  director.update(10, { ...probe, cameraAtPlayer: false })
  expect(director.getState()).toMatchObject({ cameraWaypointIndex: 1 })
  director.update(10, { ...probe, cameraAtPlayer: false })
  expect(director.getState()).toMatchObject({ cameraWaypointIndex: 2 })
  director.update(10, { ...probe, cameraAtPlayer: false })
  director.update(0.1, { ...probe, cameraAtPlayer: true })
  expect(director.getState().stepId).toBe('move')
}

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
