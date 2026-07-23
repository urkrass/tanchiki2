import type { GameSnapshot } from './types.ts'
import { describeAudibleAcousticCue } from '../../packages/shared/src/spatialHearing.ts'

export interface AccessibilityAnnouncement {
  key: string
  message: string
}

export function getAccessibilityAnnouncement(state: GameSnapshot): AccessibilityAnnouncement {
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
      const latestCue = state.hearing.cues.at(-1)
      const result = latestCue
        ? describeAudibleAcousticCue(latestCue)
        : state.hearingTest.lastPulseAt === null
          ? 'Select a station, then play its cue.'
          : 'No physical or visual cue reached the listener.'
      return {
        key: `hearing-test:${state.hearingTest.stationId}:${state.hearingTest.lastPulseAt ?? 'ready'}`,
        message: `Visual hearing lab ${state.hearingTest.stationIndex + 1} of ${state.hearingTest.stationCount}. ${state.hearingTest.label}. ${state.hearingTest.instruction}. ${result}`,
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
