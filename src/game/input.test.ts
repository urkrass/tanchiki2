import { describe, expect, it } from 'vitest'
import {
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
} from './constants.ts'
import { PointerButtonTracker, getMenuPointerIndex } from './input.ts'

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
