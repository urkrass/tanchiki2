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

  it('announces a hidden sound by coarse direction without leaking its source cell', () => {
    const state = {
      mode: 'playing',
      tutorial: { active: false },
      feedback: { notices: [] },
      hearing: {
        channel: 'physical',
        cues: [{
          id: 'acoustic-7',
          channel: 'physical',
          kind: 'rustle',
          loudness: 'quiet',
          age: 0.1,
          lifetime: 0.8,
          direction: 'north-east',
          distanceBand: 'near',
          gain: 0.6,
          pan: 0.3,
          occluded: false,
          sourcePrecision: 'directional',
        }],
      },
      level: { current: 10 },
      readableText: { hud: { objective: 'Destroy command core.' } },
    } as unknown as GameSnapshot

    const announcement = getAccessibilityAnnouncement(state)
    expect(announcement).toEqual({
      key: 'hearing:acoustic-7',
      message: 'Foliage rustle near to the north-east.',
    })
    expect(announcement.message).not.toMatch(/\d/)
  })
})
