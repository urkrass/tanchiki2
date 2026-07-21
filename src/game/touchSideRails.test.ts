import { describe, expect, it } from 'vitest'
import {
  TOUCH_RAIL_JOYSTICK_BASE_RADIUS,
  TOUCH_RAIL_JOYSTICK_KNOB_RADIUS,
  TOUCH_RAIL_JOYSTICK_MAX_OFFSET,
  TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y,
  TOUCH_RAIL_MOD_SLIDER_TOP_Y,
  TOUCH_RAIL_RELAY_Y,
  getTouchRailModSliderProgress,
  getTouchRailControl,
  isTabletTouchSideRailActive,
  isTouchRailConfirmPoint,
  isTouchRailFirePoint,
  isTouchRailModSliderStartPoint,
  isTouchRailRelayPoint,
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

  it('keeps briefing, Relay, Mod slider, movement, and Fire targets separated', () => {
    expect(isTouchRailConfirmPoint(56, 354)).toBe(true)
    expect(isTouchRailConfirmPoint(56, 320)).toBe(false)
    expect(isTouchRailRelayPoint(56, TOUCH_RAIL_RELAY_Y)).toBe(true)
    expect(isTouchRailRelayPoint(56, 354)).toBe(false)
    expect(isTouchRailModSliderStartPoint(56, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y)).toBe(true)
    expect(isTouchRailModSliderStartPoint(56, TOUCH_RAIL_MOD_SLIDER_TOP_Y)).toBe(false)
    expect(isTouchRailFirePoint(56, 354)).toBe(true)
    expect(isTouchRailFirePoint(56, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y)).toBe(false)
  })

  it('maps the Mod slider from bottom to top and clamps pointer drift', () => {
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y)).toBe(0)
    expect(getTouchRailModSliderProgress((TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y + TOUCH_RAIL_MOD_SLIDER_TOP_Y) / 2)).toBe(0.5)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_TOP_Y)).toBe(1)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y + 100)).toBe(0)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_TOP_Y - 100)).toBe(1)
  })
})
