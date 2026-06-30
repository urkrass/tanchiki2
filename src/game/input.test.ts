import { describe, expect, it } from 'vitest'
import {
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
} from './constants.ts'
import { getMenuPointerIndex } from './input.ts'

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
