import type {
  BattlefieldScreenRect,
  CameraScreenPixelPoint,
} from './spatialCoordinates.ts'

export interface FeedbackNoticeLayoutInput {
  id: string
  text: string
  preferred: CameraScreenPixelPoint
  textWidth: number
}

export interface FeedbackNoticeLayoutItem extends FeedbackNoticeLayoutInput {
  center: CameraScreenPixelPoint
  width: number
  height: number
}

export const FEEDBACK_NOTICE_HEIGHT = 14
export const FEEDBACK_NOTICE_MIN_WIDTH = 72
export const FEEDBACK_NOTICE_MAX_WIDTH = 180
export const FEEDBACK_NOTICE_EDGE_GAP = 4
export const FEEDBACK_NOTICE_STACK_GAP = 3
export const FEEDBACK_NOTICE_VISIBLE_LIMIT = 4

export function layoutFeedbackNotices(
  notices: readonly FeedbackNoticeLayoutInput[],
  bounds: BattlefieldScreenRect,
): FeedbackNoticeLayoutItem[] {
  const visible = notices.slice(-FEEDBACK_NOTICE_VISIBLE_LIMIT)
  const placed: FeedbackNoticeLayoutItem[] = []

  for (let index = visible.length - 1; index >= 0; index -= 1) {
    const notice = visible[index]
    const width = clamp(
      Math.ceil(notice.textWidth) + 16,
      FEEDBACK_NOTICE_MIN_WIDTH,
      Math.min(FEEDBACK_NOTICE_MAX_WIDTH, bounds.right - bounds.left - FEEDBACK_NOTICE_EDGE_GAP * 2),
    )
    const halfWidth = width / 2
    const halfHeight = FEEDBACK_NOTICE_HEIGHT / 2
    const x = clamp(
      notice.preferred.x,
      bounds.left + halfWidth + FEEDBACK_NOTICE_EDGE_GAP,
      bounds.right - halfWidth - FEEDBACK_NOTICE_EDGE_GAP,
    )
    const preferredY = clamp(
      notice.preferred.y,
      bounds.top + halfHeight + FEEDBACK_NOTICE_EDGE_GAP,
      bounds.bottom - halfHeight - FEEDBACK_NOTICE_EDGE_GAP,
    )
    const y = findFreeY(x, preferredY, width, placed, bounds)

    placed.push({
      ...notice,
      center: {
        space: 'camera-screen-pixel',
        x,
        y,
      },
      width,
      height: FEEDBACK_NOTICE_HEIGHT,
    })
  }

  return placed.reverse()
}

function findFreeY(
  x: number,
  preferredY: number,
  width: number,
  placed: readonly FeedbackNoticeLayoutItem[],
  bounds: BattlefieldScreenRect,
) {
  const step = FEEDBACK_NOTICE_HEIGHT + FEEDBACK_NOTICE_STACK_GAP
  const maxSteps = Math.ceil((bounds.bottom - bounds.top) / step)

  for (let distance = 0; distance <= maxSteps; distance += 1) {
    const offsets = distance === 0 ? [0] : [-distance * step, distance * step]
    for (const offset of offsets) {
      const candidateY = preferredY + offset
      if (
        candidateY - FEEDBACK_NOTICE_HEIGHT / 2 < bounds.top + FEEDBACK_NOTICE_EDGE_GAP
        || candidateY + FEEDBACK_NOTICE_HEIGHT / 2 > bounds.bottom - FEEDBACK_NOTICE_EDGE_GAP
      ) {
        continue
      }

      const candidate = {
        center: {
          space: 'camera-screen-pixel' as const,
          x,
          y: candidateY,
        },
        width,
        height: FEEDBACK_NOTICE_HEIGHT,
      }
      if (placed.every((item) => !overlaps(candidate, item))) {
        return candidateY
      }
    }
  }

  return preferredY
}

function overlaps(
  left: Pick<FeedbackNoticeLayoutItem, 'center' | 'width' | 'height'>,
  right: Pick<FeedbackNoticeLayoutItem, 'center' | 'width' | 'height'>,
) {
  const horizontalGap = Math.abs(left.center.x - right.center.x) - (left.width + right.width) / 2
  const verticalGap = Math.abs(left.center.y - right.center.y) - (left.height + right.height) / 2
  return horizontalGap < FEEDBACK_NOTICE_STACK_GAP && verticalGap < FEEDBACK_NOTICE_STACK_GAP
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
