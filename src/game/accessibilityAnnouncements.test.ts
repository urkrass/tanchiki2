import { describe, expect, it } from 'vitest'
import { getAccessibilityAnnouncement } from './accessibilityAnnouncements.ts'
import type { GameSnapshot } from './types.ts'

describe('game accessibility announcements', () => {
  it('announces a completed tutorial transmission without exposing the full automation snapshot', () => {
    const state = {
      mode: 'playing',
      tutorial: {
        active: true,
        missionId: 1,
        stepId: 'move',
        dialogueComplete: true,
        speaker: 'General Rook',
        dialogue: 'Drive the marked route.',
        activeGoal: 'Move and turn.',
      },
    } as unknown as GameSnapshot

    expect(getAccessibilityAnnouncement(state)).toEqual({
      key: 'tutorial-dialogue:1:move:Drive the marked route.',
      message: 'General Rook: Drive the marked route.',
    })
  })

  it('announces concise objective changes during ordinary play', () => {
    const state = {
      mode: 'playing',
      tutorial: { active: false },
      feedback: { notices: [] },
      level: { current: 2 },
      readableText: { hud: { objective: 'Free For All kills: 2/4.' } },
    } as unknown as GameSnapshot

    expect(getAccessibilityAnnouncement(state).message).toBe('Free For All kills: 2/4.')
  })

  it('announces the newest visible battlefield update before repeating the objective', () => {
    const state = {
      mode: 'playing',
      tutorial: { active: false },
      feedback: {
        notices: [
          { id: 'notice-1', text: 'AMMO +2' },
          { id: 'notice-2', text: 'ENGINEER ALLY EMP' },
        ],
      },
      level: { current: 10 },
      readableText: { hud: { objective: 'Destroy command core.' } },
    } as unknown as GameSnapshot

    expect(getAccessibilityAnnouncement(state)).toEqual({
      key: 'feedback:notice-2',
      message: 'Battlefield update: ENGINEER ALLY EMP.',
    })
  })
})
