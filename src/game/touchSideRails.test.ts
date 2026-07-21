import { describe, expect, it } from 'vitest'
import {
  TOUCH_RAIL_JOYSTICK_BASE_RADIUS,
  TOUCH_RAIL_JOYSTICK_KNOB_RADIUS,
  TOUCH_RAIL_JOYSTICK_MAX_OFFSET,
  TOUCH_RAIL_GEAR_X,
  TOUCH_RAIL_GEAR_Y,
  TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y,
  TOUCH_RAIL_MOD_SLIDER_TOP_Y,
  TOUCH_RAIL_RELAY_Y,
  getTouchRailGearKindAt,
  getTouchRailGearState,
  getTouchRailModState,
  getTouchRailModSliderProgress,
  getTouchRailControl,
  isTabletTouchSideRailActive,
  isTouchRailConfirmPoint,
  isTouchRailFirePoint,
  isTouchRailModSliderStartPoint,
  isTouchRailRelayPoint,
} from './touchSideRails.ts'
import type { InputState, MajorModsSnapshot, OfflineDeployablesSnapshot } from './types.ts'

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
    expect(getTouchRailGearKindAt(TOUCH_RAIL_GEAR_X[0], TOUCH_RAIL_GEAR_Y, ['mine', 'steel'])).toBe('mine')
    expect(getTouchRailGearKindAt(TOUCH_RAIL_GEAR_X[1], TOUCH_RAIL_GEAR_Y, ['mine', 'steel'])).toBe('steel')
    expect(getTouchRailGearKindAt(56, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y, ['mine', 'steel'])).toBeNull()
  })

  it('projects native class gear readiness and hold progress onto the Fire rail', () => {
    const heldButtons = { mine: true } satisfies Partial<InputState>
    const deployables: OfflineDeployablesSnapshot = {
      active: [{ id: 'trap-1', kind: 'steel', col: 2, row: 2, owner: 'player', label: 'TRAP' }],
      available: ['mine', 'steel'],
      hold: {
        kind: 'mine',
        action: 'place',
        key: '1',
        col: 2,
        row: 2,
        progress: 0.5,
        duration: 0.6,
        remaining: 0.3,
        label: 'MINE',
      },
      alerts: [],
      label: 'GEAR 1/2',
    }

    expect(getTouchRailGearState(deployables, heldButtons)).toEqual([
      { kind: 'mine', label: 'MINE', state: 'hold', progress: 0.5, pressed: true },
      { kind: 'steel', label: 'TRAP', state: 'out', progress: null, pressed: false },
    ])
  })

  it('maps the Mod slider from bottom to top and clamps pointer drift', () => {
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y)).toBe(0)
    expect(getTouchRailModSliderProgress((TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y + TOUCH_RAIL_MOD_SLIDER_TOP_Y) / 2)).toBe(0.5)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_TOP_Y)).toBe(1)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y + 100)).toBe(0)
    expect(getTouchRailModSliderProgress(TOUCH_RAIL_MOD_SLIDER_TOP_Y - 100)).toBe(1)
  })

  it('projects Overdrive cooldown and one-shot Mod states onto the slider', () => {
    const slider = { active: false, progress: 0, activated: false }
    const mods: MajorModsSnapshot = {
      selected: 'overdrive',
      overdrive: {
        active: false,
        remaining: 0,
        cooldown: 9,
        duration: 4,
        rechargeDuration: 12,
        ready: false,
      },
      pontoon: { active: false, cells: [], dir: 'up' },
      hedgehog: {
        active: false,
        spent: false,
        col: null,
        row: null,
        hitsTaken: 0,
        hitsRequired: 5,
        hitsRemaining: 0,
        trappedTankId: null,
      },
      emp: {
        active: false,
        col: null,
        row: null,
        radius: 4,
        nextPulseIn: 0,
        disrupting: false,
        disruptingRemaining: 0,
        disruptionProgress: 0,
        visionFade: 0,
      },
      tracks: [],
    }

    expect(getTouchRailModState(mods, slider)).toMatchObject({
      kind: 'overdrive',
      status: 'cooldown',
      statusRemaining: 9,
      cooldownProgress: 0.25,
    })

    mods.selected = 'hedgehog'
    mods.hedgehog.spent = true
    expect(getTouchRailModState(mods, slider)).toMatchObject({
      kind: 'hedgehog',
      status: 'spent',
    })
  })
})
