import type { GameSnapshot } from './types.ts'

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
    const latestNotice = state.feedback.notices.at(-1)
    if (latestNotice) {
      return {
        key: `feedback:${latestNotice.id}`,
        message: `Battlefield update: ${latestNotice.text}.`,
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
