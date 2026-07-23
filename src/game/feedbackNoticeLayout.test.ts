import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_NOTICE_EDGE_GAP,
  FEEDBACK_NOTICE_STACK_GAP,
  FEEDBACK_NOTICE_VISIBLE_LIMIT,
  layoutFeedbackNotices,
} from './feedbackNoticeLayout.ts'
import { cameraScreenPixelPoint } from './spatialCoordinates.ts'

const ARENA = { space: 'battlefield-screen-rect', left: 48, top: 0, right: 464, bottom: 416 } as const

describe('feedback notice presentation layout', () => {
  it('keeps long off-screen notices fully inside the battlefield instead of the HUD', () => {
    const [notice] = layoutFeedbackNotices([
      {
        id: 'ally-overdrive',
        text: 'SCOUT ALLY OVERDRIVE',
        preferred: cameraScreenPixelPoint(900, 760),
        textWidth: 220,
      },
    ], ARENA)

    expect(notice.center.x + notice.width / 2).toBeLessThanOrEqual(ARENA.right - FEEDBACK_NOTICE_EDGE_GAP)
    expect(notice.center.y + notice.height / 2).toBeLessThanOrEqual(ARENA.bottom - FEEDBACK_NOTICE_EDGE_GAP)
  })

  it('stacks concurrent ally actions without merged text or panels', () => {
    const notices = layoutFeedbackNotices([
      {
        id: 'scout-overdrive',
        text: 'SCOUT ALLY OVERDRIVE',
        preferred: cameraScreenPixelPoint(900, 760),
        textWidth: 170,
      },
      {
        id: 'battle-hedgehog',
        text: 'BATTLE TANK ALLY HEDGEHOG',
        preferred: cameraScreenPixelPoint(880, 760),
        textWidth: 210,
      },
      {
        id: 'engineer-emp',
        text: 'ENGINEER ALLY EMP',
        preferred: cameraScreenPixelPoint(870, 760),
        textWidth: 150,
      },
    ], ARENA)

    for (let index = 0; index < notices.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < notices.length; otherIndex += 1) {
        const left = notices[index]
        const right = notices[otherIndex]
        const horizontalGap = Math.abs(left.center.x - right.center.x) - (left.width + right.width) / 2
        const verticalGap = Math.abs(left.center.y - right.center.y) - (left.height + right.height) / 2
        expect(horizontalGap >= FEEDBACK_NOTICE_STACK_GAP || verticalGap >= FEEDBACK_NOTICE_STACK_GAP).toBe(true)
      }
    }
  })

  it('limits the visual stack to the newest notices while preserving their order', () => {
    const notices = Array.from({ length: 7 }, (_, index) => ({
      id: `notice-${index}`,
      text: `NOTICE ${index}`,
      preferred: cameraScreenPixelPoint(240, 120),
      textWidth: 60,
    }))

    const layout = layoutFeedbackNotices(notices, ARENA)

    expect(layout).toHaveLength(FEEDBACK_NOTICE_VISIBLE_LIMIT)
    expect(layout.map((notice) => notice.id)).toEqual(['notice-3', 'notice-4', 'notice-5', 'notice-6'])
  })
})
