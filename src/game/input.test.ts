import { describe, expect, it } from 'vitest'
import {
  HUD_X,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
} from './constants.ts'
import { PointerButtonTracker, getMenuPointerIndex, routeInputButton } from './input.ts'
import { getTouchControlAt } from './touchControls.ts'

describe('menu pointer hit testing', () => {
  it('matches the enlarged visible button rows', () => {
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y + 12)).toBe(0)
    expect(getMenuPointerIndex(MENU_OPTION_X + MENU_OPTION_WIDTH - 2, MENU_OPTION_Y + MENU_OPTION_STEP + 14)).toBe(1)
  })

  it('ignores misses outside button bounds and row gaps', () => {
    expect(getMenuPointerIndex(MENU_OPTION_X - 1, MENU_OPTION_Y + 12)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + MENU_OPTION_WIDTH + 1, MENU_OPTION_Y + 12)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y - 1)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y + MENU_OPTION_HEIGHT + 1)).toBeNull()
  })
})

describe('touch pointer button tracking', () => {
  it('keeps the existing touch hit map aligned with the visible controls', () => {
    expect(getTouchControlAt(80, 346)).toBe('up')
    expect(getTouchControlAt(80, 398)).toBe('down')
    expect(getTouchControlAt(54, 372)).toBe('left')
    expect(getTouchControlAt(106, 372)).toBe('right')
    expect(getTouchControlAt(356, 372)).toBe('fire')
    expect(getTouchControlAt(HUD_X + 48, 220)).toBe('pause')
    expect(getTouchControlAt(20, 430)).toBeNull()
  })

  it('keeps the first held touch active when another touch presses fire', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'up', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'fire', (button, down) => events.push(`${button}:${down}`))
    tracker.clear(1, (button, down) => events.push(`${button}:${down}`))
    tracker.clear(2, (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['up:true', 'fire:true', 'up:false', 'fire:false'])
  })

  it('does not release a button until every pointer holding that button is lifted', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'right', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'right', (button, down) => events.push(`${button}:${down}`))
    tracker.clear(1, (button, down) => events.push(`${button}:${down}`))
    tracker.clear(2, (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['right:true', 'right:false'])
  })

  it('switches only the moved pointer while preserving other held buttons', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'left', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'fire', (button, down) => events.push(`${button}:${down}`))
    tracker.set(1, 'up', (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['left:true', 'fire:true', 'left:false', 'up:true'])
  })
})

describe('input target routing', () => {
  it('routes pointer buttons to online controls only while online is active', () => {
    const offlineEvents: string[] = []
    const onlineEvents: string[] = []
    const offline = {
      setButton: (button: string, down: boolean) => offlineEvents.push(`${button}:${down}`),
    }
    const online = {
      active: true,
      isActive() {
        return this.active
      },
      releaseControls() {},
      setButton: (button: string, down: boolean) => onlineEvents.push(`${button}:${down}`),
      setTouchControlsVisible() {},
    }

    expect(routeInputButton('up', true, offline, online)).toBe('online')
    online.active = false
    expect(routeInputButton('fire', true, offline, online)).toBe('offline')

    expect(onlineEvents).toEqual(['up:true'])
    expect(offlineEvents).toEqual(['fire:true'])
  })
})
