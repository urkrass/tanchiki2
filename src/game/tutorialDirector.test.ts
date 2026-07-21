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
      player: { ...probe.player, col: 13, dir: 'right' as const },
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
      goal: 'Destroy both enemies; watch ammunition and reload timing.',
      dialogueComplete: false,
    })
  })

  it('counts a backtracking handling run cumulatively but still requires a heading change', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    enterFirstMissionActionPhase(director, probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)

    const forward = { ...probe, player: { ...probe.player, col: 11 } }
    director.update(0.1, forward)
    const back = { ...probe, player: { ...probe.player, dir: 'left' as const } }
    director.update(0.1, back)
    expect(director.getState().stepId).toBe('move')

    const forwardAgain = { ...probe, player: { ...probe.player, col: 11, dir: 'right' as const } }
    director.update(0.1, forwardAgain)
    expect(director.getState().stepId).toBe('engage')
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

    const moved = { ...probe, player: { ...probe.player, col: 13, dir: 'right' as const } }
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

    const adapted = {
      ...probe,
      deployableActions: 1,
      lastDeployablePlacement: { x: 10, y: 11 },
      hostilesDefeated: 2,
    }
    director.update(0.1, adapted)
    expect(director.getState().stepId).toBe('class-tactic')
    director.advanceDialogue(adapted)
    director.advanceDialogue(adapted)
    director.update(0, adapted)
    expect(director.getState().stepId).toBe('mod-tactic')

    const modded = {
      ...adapted,
      player: { ...adapted.player, col: 10, row: 9 },
      activeMod: 'overdrive' as const,
      lastModActivation: { kind: 'overdrive' as const, cell: { x: 10, y: 9 }, moving: true },
    }
    director.update(0.1, modded)
    director.advanceDialogue(modded)
    director.advanceDialogue(modded)
    director.update(0, modded)
    expect(director.getState().stepId).toBe('tickets')

    director.update(0.1, { ...modded, hostilesDefeated: 4, playerHits: 1 })
    expect(director.getState()).toMatchObject({
      stepId: 'tickets',
      speaker: 'Brick',
      missionComplete: false,
    })
  })

  it('rejects class gear and Major Mods outside their marked tactic zones', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[2]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)

    const wrongGear = {
      ...probe,
      deployableActions: 1,
      lastDeployablePlacement: { x: 2, y: 2 },
    }
    director.update(0.1, wrongGear)
    expect(director.getState().stepId).toBe('class-tactic')

    const rightGear = {
      ...wrongGear,
      deployableActions: 2,
      lastDeployablePlacement: { x: 10, y: 11 },
    }
    director.update(0.1, rightGear)
    expect(director.getState().stepId).toBe('mod-tactic')
    director.advanceDialogue(rightGear)
    director.advanceDialogue(rightGear)

    const stoppedOverdrive = {
      ...rightGear,
      activeMod: 'overdrive' as const,
      lastModActivation: { kind: 'overdrive' as const, cell: { x: 10, y: 9 }, moving: false },
    }
    director.update(0.1, stoppedOverdrive)
    expect(director.getState().stepId).toBe('mod-tactic')

    const movingOverdrive = {
      ...stoppedOverdrive,
      lastModActivation: { ...stoppedOverdrive.lastModActivation, moving: true },
    }
    director.update(0.1, movingOverdrive)
    expect(director.getState().stepId).toBe('tickets')
  })

  it('accepts every graduation Mod only at its defined tactical location', () => {
    for (const selectedMod of ['overdrive', 'pontoon', 'hedgehog', 'emp'] as const) {
      const probe = { ...makeProbe(), selectedMod }
      const director = new TutorialDirector(TUTORIAL_MISSIONS[5]!, probe)
      advanceUntilStepChanges(director, probe, 'welcome')
      director.update(5.1, { ...probe, cameraAtPlayer: false })
      director.update(0.1, { ...probe, cameraAtPlayer: true })
      director.advanceDialogue(probe)
      director.advanceDialogue(probe)
      director.update(0, probe)
      expect(director.getState().stepId).toBe('adaptive')
      director.advanceDialogue(probe)
      director.advanceDialogue(probe)

      const adaptive = TUTORIAL_MISSIONS[5]!.steps[2]!.adaptiveGoals!
        .find((goal) => goal.majorMod === selectedMod)!
      const wrong = {
        ...probe,
        activeMod: selectedMod,
        lastModActivation: { kind: selectedMod, cell: { x: 0, y: 0 }, moving: true },
      }
      director.update(0.1, wrong)
      expect(director.getState().stepId).toBe('adaptive')

      const correct = {
        ...wrong,
        lastModActivation: {
          kind: selectedMod,
          cell: { x: adaptive.trigger.zone!.x, y: adaptive.trigger.zone!.y },
          moving: true,
        },
      }
      director.update(0.1, correct)
      expect(director.getState().stepId).toBe('core')
    }
  })

  it('accepts a Battle shield trade as a real class contribution', () => {
    const probe = { ...makeProbe(), selectedClass: 'battle' as const }
    const director = new TutorialDirector(TUTORIAL_MISSIONS[2]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)
    director.update(0.1, { ...probe, shieldDamageAbsorbed: 1 })
    expect(director.getState().stepId).toBe('mod-tactic')
  })

  it('cannot miss a fast CTF action and follows Brick until the allied capture', () => {
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
    expect(director.getState().stepId).toBe('first-capture')

    const firstCaptured = {
      ...carrying,
      flag: {
        ...carrying.flag,
        carrierId: null,
        captures: 1,
      },
    }
    director.update(0.1, firstCaptured)
    director.advanceDialogue(firstCaptured)
    director.advanceDialogue(firstCaptured)
    director.update(0, firstCaptured)
    expect(director.getState().stepId).toBe('second-pickup')

    const carryingAgain = {
      ...firstCaptured,
      flag: {
        ...firstCaptured.flag,
        carrierId: 'player',
        captures: 1,
      },
    }
    director.update(0.1, carryingAgain)
    director.advanceDialogue(carryingAgain)
    director.advanceDialogue(carryingAgain)
    director.update(0, carryingAgain)
    expect(director.getState().stepId).toBe('return-second')

    director.update(0.1, carryingAgain)
    expect(director.getState().stepId).toBe('return-second')

    const trapped = {
      ...carryingAgain,
      flag: {
        ...carryingAgain.flag,
        trapTriggered: true,
      },
    }
    director.update(0.1, trapped)
    expect(director.getState().stepId).toBe('trapped')

    const dropped = {
      ...trapped,
      flag: {
        ...trapped.flag,
        carrierId: null,
        dropped: true,
        transferComplete: true,
      },
    }
    director.update(0.1, dropped)
    expect(director.getState().stepId).toBe('trapped')
    director.advanceDialogue(dropped)
    director.advanceDialogue(dropped)
    director.update(0, dropped)
    expect(director.getState()).toMatchObject({
      stepId: 'handoff',
      cameraControlled: true,
      cameraFollowActorId: 'instructor-brick',
    })

    director.update(20, { ...dropped, cameraAtPlayer: false })
    expect(director.getState()).toMatchObject({
      cameraControlled: true,
      cameraFollowActorId: 'instructor-brick',
    })

    const captured = {
      ...dropped,
      cameraAtPlayer: false,
      flag: { ...dropped.flag, captures: 2 },
    }
    director.update(0.1, captured)
    director.update(0.1, captured)
    expect(director.getState()).toMatchObject({
      cameraControlled: true,
      cameraFollowActorId: null,
    })
    director.update(0.1, { ...captured, cameraAtPlayer: true })
    expect(director.getState().cameraControlled).toBe(false)
  })

  it('separates relay placement, false-contact discovery, recovery, and ammo resupply', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[4]!, probe)
    advanceUntilStepChanges(director, probe, 'welcome')

    expect(director.getState()).toMatchObject({
      stepId: 'deploy-relay',
      dangerHeld: true,
      playerControlHeld: false,
    })
    const placed = { ...probe, relayActions: 1, relaysPlaced: 1 }
    director.update(0.1, placed)
    director.advanceDialogue(placed)
    director.advanceDialogue(placed)
    director.update(0, placed)
    expect(director.getState().stepId).toBe('find-decoy')

    const contact = { ...placed, relayContactIds: ['rook-decoy'] }
    director.update(0.1, contact)
    expect(director.getState()).toMatchObject({
      stepId: 'decoy-lesson',
      speaker: 'General Rook',
      cameraControlled: true,
      cameraLabel: 'False relay contact',
      dangerHeld: true,
    })

    const inspected = {
      ...contact,
      elapsed: 2,
      cameraAtPlayer: false,
      player: { ...contact.player, col: 10, row: 12 },
    }
    director.update(2, inspected)
    director.advanceDialogue(inspected)
    director.advanceDialogue(inspected)
    director.update(5, { ...inspected, elapsed: 7, cameraAtPlayer: true })
    expect(director.getState().stepId).toBe('recover-relay')

    const recovered = { ...inspected, elapsed: 7, cameraAtPlayer: true, relaysRecovered: 1 }
    director.update(0.1, recovered)
    director.advanceDialogue(recovered)
    director.advanceDialogue(recovered)
    director.update(0, recovered)
    expect(director.getState().stepId).toBe('calibration-shot')

    const fired = { ...recovered, shotsFired: 1 }
    director.update(0.1, fired)
    director.advanceDialogue(fired)
    director.advanceDialogue(fired)
    director.update(0, fired)
    expect(director.getState().stepId).toBe('resupply')

    const supplied = { ...fired, shellsRecharged: 1 }
    director.update(0.1, supplied)
    director.advanceDialogue(supplied)
    director.advanceDialogue(supplied)
    director.update(0, supplied)
    expect(director.getState()).toMatchObject({
      stepId: 'priority',
      dangerHeld: false,
    })

    const firstKill = { ...supplied, playerKills: 1 }
    director.update(0.1, firstKill)
    director.advanceDialogue(firstKill)
    director.advanceDialogue(firstKill)
    director.update(0, firstKill)
    expect(director.getState().stepId).toBe('relocate-relay')

    const relocated = {
      ...firstKill,
      relayActions: 2,
      relaysPlaced: 2,
      lastRelayPlacement: { x: 6, y: 9 },
    }
    director.update(0.1, relocated)
    director.advanceDialogue(relocated)
    director.advanceDialogue(relocated)
    director.update(0, relocated)
    expect(director.getState().stepId).toBe('finish')

    const onlyThreeKills = { ...relocated, playerKills: 3 }
    director.update(0.1, onlyThreeKills)
    director.advanceDialogue(onlyThreeKills)
    director.advanceDialogue(onlyThreeKills)
    director.update(0, onlyThreeKills)
    expect(director.getState()).toMatchObject({ stepId: 'finish', missionComplete: false })

    const fourKills = { ...relocated, playerKills: 4 }
    director.update(0.1, fourKills)
    expect(director.getState()).toMatchObject({
      stepId: 'finish',
      speaker: 'General Rook',
      missionComplete: false,
    })
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

  it('keeps Mission 2 completable when either the player or Needle defeats a hostile early', () => {
    for (const early of [
      { playerKills: 1, hostilesDefeated: 1 },
      { playerKills: 0, hostilesDefeated: 1 },
      { playerKills: 0, hostilesDefeated: 0 },
    ]) {
      const probe = makeProbe()
      const director = new TutorialDirector(TUTORIAL_MISSIONS[1]!, probe)
      advanceUntilStepChanges(director, probe, 'welcome')
      director.update(4.3, { ...probe, cameraAtPlayer: false })
      director.update(0.1, { ...probe, cameraAtPlayer: true })
      director.advanceDialogue(probe)
      director.advanceDialogue(probe)
      director.update(0, probe)
      expect(director.getState()).toMatchObject({ stepId: 'relay', dangerHeld: true })

      const linked = { ...probe, ...early, relayActions: 1 }
      director.update(0, linked)
      director.advanceDialogue(linked)
      director.advanceDialogue(linked)
      director.update(0, linked)
      expect(director.getState()).toMatchObject({ stepId: 'shared-contact', dangerHeld: true })

      const acquired = { ...linked, sharedContactIds: ['enemy-contact'] }
      director.update(0, acquired)
      director.advanceDialogue(acquired)
      director.advanceDialogue(acquired)
      director.update(0, acquired)
      expect(director.getState()).toMatchObject({ stepId: 'contacts', dangerHeld: false })

      const cleared = { ...acquired, hostilesDefeated: 2, playerKills: Math.max(early.playerKills, 1) }
      director.update(0.1, cleared)
      expect(director.getState().stepId).toBe('contacts')
      director.advanceDialogue(cleared)
      director.advanceDialogue(cleared)
      director.update(0, cleared)
      director.advanceDialogue(cleared)
      director.advanceDialogue(cleared)
      director.update(0, cleared)
      expect(director.getState().missionComplete).toBe(true)
    }
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

  it('hides a contextual action cue after ten seconds and re-shows it after continued inactivity', () => {
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    launchFirstDrill(game)

    game.primaryAction()
    game.primaryAction()
    game.primaryAction()
    step(game, 0.05)

    expect(game.getSnapshot()).toMatchObject({
      tutorial: {
        stepId: 'welcome',
        actionCue: { kind: 'confirm' },
        activeGoal: 'Confirm range-control instructions.',
      },
    })

    step(game, 9.8)
    expect(game.getSnapshot().tutorial.actionCue?.kind).toBe('confirm')

    step(game, 0.25)
    expect(game.getSnapshot()).toMatchObject({
      tutorial: {
        stepId: 'welcome',
        speaker: 'General Rook',
        dialogueComplete: true,
        activeGoal: 'Confirm range-control instructions.',
        actionCue: null,
      },
      readableText: {
        tutorial: {
          action: 'No action cue',
          goal: 'Confirm range-control instructions.',
        },
      },
    })

    step(game, 10)
    expect(game.getSnapshot()).toMatchObject({
      tutorial: {
        stepId: 'welcome',
        actionCue: { kind: 'confirm' },
        activeGoal: 'Confirm range-control instructions.',
      },
    })
  })

  it('honors reduced motion for typewriting and mandatory camera tours', () => {
    const probe = makeProbe()
    const director = new TutorialDirector(TUTORIAL_MISSIONS[0]!, probe)
    director.setReducedMotion(true)

    expect(director.getState()).toMatchObject({
      dialogueComplete: true,
      dialogueVisibleCharacters: TUTORIAL_MISSIONS[0]!.steps[0]!.dialogue[0]!.text.length,
    })

    director.advanceDialogue(probe)
    director.advanceDialogue(probe)
    director.advanceDialogue(probe)
    director.update(0.36, probe)

    expect(director.getState()).toMatchObject({
      stepId: 'tour',
      cameraControlled: true,
      cameraWaypointIndex: 1,
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

  it('keeps the graduation core locked until the breach and requires player cannon damage', () => {
    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = [1, 2, 3, 4, 5]
    save.progression.selectedTankClass = 'battle'
    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore(save) })
    launchFirstDrill(game)

    const core = TUTORIAL_MISSIONS[5]!.level.objective.assault!.cell
    const tile = game.getTile(core.x, core.y)!
    const internals = game as unknown as {
      player: { id: string }
      tutorialDirector: { getState: () => { stepId: string; dangerHeld: boolean } } | null
      hitBaseTileWithBullet: (
        bullet: Bullet,
        tile: Tile,
        col: number,
        row: number,
        centerX: number,
        centerY: number,
      ) => void
    }
    const playerShell: Bullet = {
      id: 'player-core-test',
      owner: 'player',
      ownerId: internals.player.id,
      side: 'player',
      team: 'blue',
      x: 0,
      y: 0,
      dir: 'up',
      speed: 0,
      damage: 4,
      ttl: 1,
    }

    internals.hitBaseTileWithBullet(playerShell, tile, core.x, core.y, 0, 0)
    expect(game.getSnapshot().objective.assault?.hp).toBe(6)

    internals.tutorialDirector = { getState: () => ({ stepId: 'core', dangerHeld: false }) }
    internals.hitBaseTileWithBullet(
      { ...playerShell, id: 'ally-core-test', owner: 'enemy', ownerId: 'instructor-brick' },
      tile,
      core.x,
      core.y,
      0,
      0,
    )
    expect(game.getSnapshot().objective.assault?.hp).toBe(6)

    internals.hitBaseTileWithBullet(playerShell, tile, core.x, core.y, 0, 0)
    expect(game.getSnapshot().objective.assault?.hp).toBe(2)
    internals.hitBaseTileWithBullet({ ...playerShell, id: 'player-core-test-2' }, tile, core.x, core.y, 0, 0)
    expect(game.getSnapshot().objective.assault?.hp).toBe(0)
    expect(game.getSnapshot().runStats.assaultDamage).toBe(6)
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
    playerHits: 0,
    playerKills: 0,
    hostilesDefeated: 0,
    relayActions: 0,
    relaysPlaced: 0,
    relaysRecovered: 0,
    relayContactIds: [],
    sharedContactIds: [],
    shellsRecharged: 0,
    deployableActions: 0,
    lastRelayPlacement: null,
    lastDeployablePlacement: null,
    lastModActivation: null,
    shieldDamageAbsorbed: 0,
    playerAssaultDamage: 0,
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
