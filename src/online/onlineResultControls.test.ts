import { describe, expect, it } from 'vitest'
import { ONLINE_RESULT_CONTROLS, getOnlineResultControlHit } from './onlineResultControls.ts'

describe('online result controls', () => {
  it('keeps Play Again as the dominant tablet-sized target', () => {
    expect(ONLINE_RESULT_CONTROLS.rematch.width).toBeGreaterThan(ONLINE_RESULT_CONTROLS.close.width)
    expect(ONLINE_RESULT_CONTROLS.rematch.height).toBeGreaterThanOrEqual(48)
    expect(getOnlineResultControlHit(280, 346)).toBe('rematch')
  })

  it('keeps the main-menu action separate and secondary', () => {
    expect(getOnlineResultControlHit(280, 414)).toBe('close')
    expect(getOnlineResultControlHit(40, 40)).toBeNull()
  })
})
