import { describe, expect, it } from 'vitest'
import {
  TOUCH_RAIL_JOYSTICK_BASE_RADIUS,
  TOUCH_RAIL_JOYSTICK_KNOB_RADIUS,
  TOUCH_RAIL_JOYSTICK_MAX_OFFSET,
  TOUCH_RAIL_MOD_Y,
  getTouchRailControl,
  isTabletTouchSideRailActive,
  isTouchRailConfirmPoint,
  isTouchRailModPoint,
} from './touchSideRails.ts'

describe('tablet touch side rails', () => {
  it('uses the unused side margins only on landscape tablets', () => {
    expect(isTabletTouchSideRailActive(1280, 800, true)).toBe(true)
    expect(isTabletTouchSideRailActive(800, 1280, true)).toBe(false)
    expect(isTabletTouchSideRailActive(390, 844, true)).toBe(false)
    expect(isTabletTouchSideRailActive(1280, 800, false)).toBe(false)
    expect(isTabletTouchSideRailActive(1280, 800, false, true)).toBe(true)
  })

  it('keeps the requested standard placement and honors mirrored accessibility', () => {
    expect(getTouchRailControl('left', 'standard')).toBe('joystick')
    expect(getTouchRailControl('right', 'standard')).toBe('fire')
    expect(getTouchRailControl('left', 'mirrored')).toBe('fire')
    expect(getTouchRailControl('right', 'mirrored')).toBe('joystick')
  })

  it('keeps the complete joystick knob inside its base ring', () => {
    expect(TOUCH_RAIL_JOYSTICK_MAX_OFFSET + TOUCH_RAIL_JOYSTICK_KNOB_RADIUS)
      .toBeLessThan(TOUCH_RAIL_JOYSTICK_BASE_RADIUS)
  })

  it('keeps the briefing and Mod targets separated from movement and Fire', () => {
    expect(isTouchRailConfirmPoint(56, 354)).toBe(true)
    expect(isTouchRailConfirmPoint(56, 320)).toBe(false)
    expect(isTouchRailModPoint(56, TOUCH_RAIL_MOD_Y)).toBe(true)
    expect(isTouchRailModPoint(56, 354)).toBe(false)
    expect(isTouchRailModPoint(56, TOUCH_RAIL_MOD_Y + 36, true)).toBe(true)
  })
})
