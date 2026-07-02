import { ARENA_X, HUD_WIDTH, HUD_X } from './constants.ts'
import type { InputState } from './types.ts'

export type TouchControlButton = keyof InputState
export type TouchControlAction = TouchControlButton | 'pause'

export const TOUCH_DPAD = {
  centerX: ARENA_X + 80,
  centerY: 372,
  hitX: ARENA_X + 26,
  hitY: 314,
  hitWidth: 110,
  hitHeight: 112,
  iconSize: 42,
  up: { x: ARENA_X + 59, y: 325, centerX: ARENA_X + 80, centerY: 346 },
  down: { x: ARENA_X + 59, y: 377, centerX: ARENA_X + 80, centerY: 398 },
  left: { x: ARENA_X + 33, y: 351, centerX: ARENA_X + 54, centerY: 372 },
  right: { x: ARENA_X + 85, y: 351, centerX: ARENA_X + 106, centerY: 372 },
} as const

export const TOUCH_FIRE = {
  centerX: ARENA_X + 356,
  centerY: 372,
  hitRadius: 48,
  iconX: ARENA_X + 324,
  iconY: 340,
  iconSize: 64,
} as const

export const TOUCH_RELAY = {
  centerX: ARENA_X + 260,
  centerY: 372,
  hitRadius: 34,
  iconX: ARENA_X + 236,
  iconY: 348,
  iconSize: 48,
} as const

export const TOUCH_PAUSE = {
  hitX: HUD_X,
  hitY: 188,
  hitWidth: HUD_WIDTH,
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

  const relayDx = x - TOUCH_RELAY.centerX
  const relayDy = y - TOUCH_RELAY.centerY
  if (relayDx * relayDx + relayDy * relayDy <= TOUCH_RELAY.hitRadius * TOUCH_RELAY.hitRadius) {
    return 'relay'
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
