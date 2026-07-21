import { describe, expect, it } from 'vitest'
import { getTouchRailControl, isTabletTouchSideRailActive } from './touchSideRails.ts'

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
})
