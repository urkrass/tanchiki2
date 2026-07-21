import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, HUD_WIDTH, HUD_X } from './constants.ts'
import type { Direction, InputState, TouchHandedness } from './types.ts'

export type TouchControlButton = keyof InputState
export type TouchControlAction = TouchControlButton | 'pause'
export type TouchControlHit = TouchControlAction | 'joystick'

export interface TouchCircle {
  centerX: number
  centerY: number
  hitRadius: number
  iconSize: number
}

export interface TouchRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TouchControlLayout {
  handedness: TouchHandedness
  joystick: {
    defaultCenterX: number
    defaultCenterY: number
    zone: TouchRect
    baseRadius: number
    knobRadius: number
    maxOffset: number
    deadzone: number
    axisHysteresis: number
  }
  fire: TouchCircle
  relay: TouchCircle
  mod: TouchCircle
  pause: TouchRect & {
    iconX: number
    iconY: number
    iconSize: number
  }
}

export interface TouchHitOptions {
  includePause?: boolean
  includeActions?: boolean
  includePrimary?: boolean
}

const STANDARD_LAYOUT: TouchControlLayout = {
  handedness: 'standard',
  joystick: {
    defaultCenterX: ARENA_X + 80,
    defaultCenterY: 370,
    zone: {
      x: ARENA_X,
      y: ARENA_Y + 220,
      width: 202,
      height: ARENA_HEIGHT - 220,
    },
    baseRadius: 56,
    knobRadius: 22,
    maxOffset: 32,
    deadzone: 10,
    axisHysteresis: 6,
  },
  fire: {
    centerX: ARENA_X + 370,
    centerY: 372,
    hitRadius: 46,
    iconSize: 64,
  },
  relay: {
    centerX: 24,
    centerY: 370,
    hitRadius: 26,
    iconSize: 36,
  },
  mod: {
    centerX: HUD_X + 28,
    centerY: 228,
    hitRadius: 26,
    iconSize: 28,
  },
  pause: {
    x: HUD_X,
    y: 304,
    width: HUD_WIDTH,
    height: 60,
    iconX: HUD_X + 28,
    iconY: 314,
    iconSize: 40,
  },
}

export function resolveTouchControlLayout(handedness: TouchHandedness = 'standard'): TouchControlLayout {
  if (handedness === 'standard') {
    return cloneTouchLayout(STANDARD_LAYOUT)
  }

  return {
    ...cloneTouchLayout(STANDARD_LAYOUT),
    handedness: 'mirrored',
    joystick: {
      ...STANDARD_LAYOUT.joystick,
      defaultCenterX: mirrorArenaX(STANDARD_LAYOUT.joystick.defaultCenterX),
      zone: mirrorArenaRect(STANDARD_LAYOUT.joystick.zone),
    },
    fire: mirrorArenaCircle(STANDARD_LAYOUT.fire),
    relay: { ...STANDARD_LAYOUT.relay },
    mod: { ...STANDARD_LAYOUT.mod },
  }
}

export function getTouchControlAt(
  x: number,
  y: number,
  layout: TouchControlLayout = resolveTouchControlLayout(),
  options: TouchHitOptions = {},
): TouchControlHit | null {
  const includePause = options.includePause ?? true
  const includeActions = options.includeActions ?? true
  const includePrimary = options.includePrimary ?? true

  if (includePause && pointInRect(x, y, layout.pause)) {
    return 'pause'
  }

  if (includePrimary && pointInCircle(x, y, layout.fire)) {
    return 'fire'
  }

  if (includeActions && pointInCircle(x, y, layout.relay)) {
    return 'relay'
  }

  if (includeActions && pointInCircle(x, y, layout.mod)) {
    return 'mod'
  }

  if (includePrimary && pointInRect(x, y, layout.joystick.zone)) {
    return 'joystick'
  }

  return null
}

export function getJoystickDirection(
  dx: number,
  dy: number,
  previous: Direction | null,
  layout: TouchControlLayout = resolveTouchControlLayout(),
): Direction | null {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (Math.hypot(dx, dy) < layout.joystick.deadzone) {
    return null
  }

  if (previous === 'left' || previous === 'right') {
    if (absX > layout.joystick.deadzone && absY <= absX + layout.joystick.axisHysteresis) {
      return dx < 0 ? 'left' : 'right'
    }
  } else if (previous === 'up' || previous === 'down') {
    if (absY > layout.joystick.deadzone && absX <= absY + layout.joystick.axisHysteresis) {
      return dy < 0 ? 'up' : 'down'
    }
  }

  if (absX > absY) {
    return dx < 0 ? 'left' : 'right'
  }
  return dy < 0 ? 'up' : 'down'
}

export function clampJoystickOffset(dx: number, dy: number, maxOffset: number) {
  const distance = Math.hypot(dx, dy)
  if (distance <= maxOffset || distance === 0) {
    return { x: dx, y: dy }
  }
  const scale = maxOffset / distance
  return { x: dx * scale, y: dy * scale }
}

function cloneTouchLayout(layout: TouchControlLayout): TouchControlLayout {
  return {
    ...layout,
    joystick: { ...layout.joystick, zone: { ...layout.joystick.zone } },
    fire: { ...layout.fire },
    relay: { ...layout.relay },
    mod: { ...layout.mod },
    pause: { ...layout.pause },
  }
}

function mirrorArenaX(x: number) {
  return ARENA_X + ARENA_WIDTH - (x - ARENA_X)
}

function mirrorArenaCircle(circle: TouchCircle): TouchCircle {
  return { ...circle, centerX: mirrorArenaX(circle.centerX) }
}

function mirrorArenaRect(rect: TouchRect): TouchRect {
  return {
    ...rect,
    x: ARENA_X + ARENA_WIDTH - (rect.x - ARENA_X) - rect.width,
  }
}

function pointInCircle(x: number, y: number, circle: TouchCircle) {
  const dx = x - circle.centerX
  const dy = y - circle.centerY
  return dx * dx + dy * dy <= circle.hitRadius * circle.hitRadius
}

function pointInRect(x: number, y: number, rect: TouchRect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
