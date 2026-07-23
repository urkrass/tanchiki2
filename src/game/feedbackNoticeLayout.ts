export interface FeedbackNoticeLayoutInput {
  id: string
  text: string
  preferredX: number
  preferredY: number
  textWidth: number
}

export interface FeedbackNoticeLayoutBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface FeedbackNoticeLayoutItem extends FeedbackNoticeLayoutInput {
  x: number
  y: number
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
  bounds: FeedbackNoticeLayoutBounds,
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
      notice.preferredX,
      bounds.left + halfWidth + FEEDBACK_NOTICE_EDGE_GAP,
      bounds.right - halfWidth - FEEDBACK_NOTICE_EDGE_GAP,
    )
    const preferredY = clamp(
      notice.preferredY,
      bounds.top + halfHeight + FEEDBACK_NOTICE_EDGE_GAP,
      bounds.bottom - halfHeight - FEEDBACK_NOTICE_EDGE_GAP,
    )
    const y = findFreeY(x, preferredY, width, placed, bounds)

    placed.push({
      ...notice,
      x,
      y,
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
  bounds: FeedbackNoticeLayoutBounds,
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
        x,
        y: candidateY,
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
  left: Pick<FeedbackNoticeLayoutItem, 'x' | 'y' | 'width' | 'height'>,
  right: Pick<FeedbackNoticeLayoutItem, 'x' | 'y' | 'width' | 'height'>,
) {
  const horizontalGap = Math.abs(left.x - right.x) - (left.width + right.width) / 2
  const verticalGap = Math.abs(left.y - right.y) - (left.height + right.height) / 2
  return horizontalGap < FEEDBACK_NOTICE_STACK_GAP && verticalGap < FEEDBACK_NOTICE_STACK_GAP
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
