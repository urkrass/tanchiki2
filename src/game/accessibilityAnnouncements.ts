import type { AudibleAcousticCue } from '../../packages/shared/src/index.ts'
import type { GameSnapshot } from './types.ts'
import { describeAudibleAcousticCue } from '../../packages/shared/src/spatialHearing.ts'

export interface AccessibilityAnnouncement {
  key: string
  message: string
}

export function getAccessibilityAnnouncement(
  state: GameSnapshot,
  pendingHiddenCue: AudibleAcousticCue | null = null,
): AccessibilityAnnouncement {
  if (state.tutorial.active && state.mode === 'playing') {
    if (state.tutorial.dialogueComplete && state.tutorial.speaker && state.tutorial.dialogue) {
      return {
        key: `tutorial-dialogue:${state.tutorial.missionId}:${state.tutorial.stepId}:${state.tutorial.dialogue}`,
        message: `${state.tutorial.speaker}: ${state.tutorial.dialogue}`,
      }
    }
    return {
      key: `tutorial-goal:${state.tutorial.missionId}:${state.tutorial.stepId}:${state.tutorial.activeGoal ?? ''}`,
      message: `Training goal: ${state.tutorial.activeGoal ?? 'Await instructions.'}`,
    }
  }

  if (state.mode === 'playing') {
    if (state.hearingTest) {
      const latestCue = pendingHiddenCue ?? state.hearing.cues.at(-1)
      const resultState = latestCue || state.hearingTest.observed.cueObservedSinceEntry
        ? 'cue-observed'
        : state.hearingTest.observed.patrolCellsTraversed === 0
          ? 'waiting'
          : 'no-cue'
      const result = latestCue
        ? describeAudibleAcousticCue(latestCue)
        : state.hearingTest.observed.patrolCellsTraversed === 0
          ? 'The patrol has not crossed a terrain cell yet.'
          : state.hearingTest.observed.cueObservedSinceEntry
            ? 'The expected patrol cue was observed.'
            : 'The patrol moved, but no cue reached the listener.'
      return {
        key: `hearing-test:${state.hearingTest.checkpointId}:${state.hearingTest.checkpointEnteredAt}:${resultState}`,
        message: `Acoustic field course ${state.hearingTest.checkpointIndex + 1} of ${state.hearingTest.checkpointCount}. ${state.hearingTest.label}. ${state.hearingTest.instruction}. ${result}`,
      }
    }

    if (pendingHiddenCue) {
      return {
        key: `hearing:${pendingHiddenCue.id}`,
        message: describeAudibleAcousticCue(pendingHiddenCue),
      }
    }

    const latestNotice = state.feedback.notices.at(-1)
    if (latestNotice) {
      return {
        key: `feedback:${latestNotice.id}`,
        message: `Battlefield update: ${latestNotice.text}.`,
      }
    }

    const latestHiddenCue = state.hearing?.cues
      .filter((cue) => cue.sourcePrecision === 'directional')
      .at(-1)
    if (latestHiddenCue) {
      return {
        key: `hearing:${latestHiddenCue.id}`,
        message: describeAudibleAcousticCue(latestHiddenCue),
      }
    }

    return {
      key: `objective:${state.level.current}:${state.readableText.hud.objective}`,
      message: state.readableText.hud.objective,
    }
  }

  return {
    key: `screen:${state.mode}:${state.readableText.title}`,
    message: state.readableText.title,
  }
}
