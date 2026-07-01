import { HUD_X, LOGICAL_WIDTH } from './constants.ts'
import type { InputState } from './types.ts'

export type TouchControlButton = keyof InputState
export type TouchControlAction = TouchControlButton | 'pause'

export const TOUCH_DPAD = {
  centerX: 80,
  centerY: 372,
  hitX: 26,
  hitY: 314,
  hitWidth: 110,
  hitHeight: 112,
  iconSize: 42,
  up: { x: 59, y: 325, centerX: 80, centerY: 346 },
  down: { x: 59, y: 377, centerX: 80, centerY: 398 },
  left: { x: 33, y: 351, centerX: 54, centerY: 372 },
  right: { x: 85, y: 351, centerX: 106, centerY: 372 },
} as const

export const TOUCH_FIRE = {
  centerX: 356,
  centerY: 372,
  hitRadius: 48,
  iconX: 324,
  iconY: 340,
  iconSize: 64,
} as const

export const TOUCH_PAUSE = {
  hitX: HUD_X,
  hitY: 188,
  hitWidth: LOGICAL_WIDTH - HUD_X,
  hitHeight: 48,
  iconX: HUD_X + 28,
  iconY: 200,
  iconSize: 40,
} as const

export function getTouchControlAt(x: number, y: number, includePause = true): TouchControlAction | null {
  if (
    includePause &&
    x >= TOUCH_PAUSE.hitX &&
    x <= TOUCH_PAUSE.hitX + TOUCH_PAUSE.hitWidth &&
    y >= TOUCH_PAUSE.hitY &&
    y <= TOUCH_PAUSE.hitY + TOUCH_PAUSE.hitHeight
  ) {
    return 'pause'
  }

  const fireDx = x - TOUCH_FIRE.centerX
  const fireDy = y - TOUCH_FIRE.centerY
  if (fireDx * fireDx + fireDy * fireDy <= TOUCH_FIRE.hitRadius * TOUCH_FIRE.hitRadius) {
    return 'fire'
  }

  if (
    x < TOUCH_DPAD.hitX ||
    x > TOUCH_DPAD.hitX + TOUCH_DPAD.hitWidth ||
    y < TOUCH_DPAD.hitY ||
    y > TOUCH_DPAD.hitY + TOUCH_DPAD.hitHeight
  ) {
    return null
  }

  const dx = x - TOUCH_DPAD.centerX
  const dy = y - TOUCH_DPAD.centerY
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? 'left' : 'right'
  }

  return dy < 0 ? 'up' : 'down'
}
