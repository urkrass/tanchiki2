import { describe, expect, it } from 'vitest'
import {
  CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS,
  CTF_DROPPED_FLAG_SIGNAL_PERIOD_SECONDS,
  getCarriedFlagPlacement,
  getDroppedFlagSignalProgress,
  isCtfFlagDropped,
} from './ctfFlag.ts'
import type { SavedObjectiveState } from './types.ts'

const FLAG: NonNullable<SavedObjectiveState['flag']> = {
  playerBase: { x: 2, y: 8 },
  enemyHome: { x: 9, y: 1 },
  position: { x: 9, y: 1 },
  carrierId: null,
  captures: 0,
  capturesToWin: 2,
}

describe('CTF flag presentation model', () => {
  it('distinguishes a loose battlefield flag from the enemy-home flag', () => {
    expect(isCtfFlagDropped(FLAG)).toBe(false)
    expect(isCtfFlagDropped({ ...FLAG, position: { x: 6, y: 4 } })).toBe(true)
    expect(isCtfFlagDropped({ ...FLAG, position: { x: 6, y: 4 }, carrierId: 'friendly-1' })).toBe(false)
  })

  it('emits a short immediate locator pulse and then stays quiet until the rare interval', () => {
    expect(getDroppedFlagSignalProgress(10, 10)).toBe(0)
    expect(getDroppedFlagSignalProgress(10.8, 10)).toBeCloseTo(0.5)
    expect(getDroppedFlagSignalProgress(10 + CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS + 0.01, 10)).toBeNull()
    expect(getDroppedFlagSignalProgress(10 + CTF_DROPPED_FLAG_SIGNAL_PERIOD_SECONDS, 10)).toBe(0)
    expect(getDroppedFlagSignalProgress(10, undefined)).toBeNull()
  })

  it('anchors the carried flag behind the exact moving tank position rather than its grid cell', () => {
    const movingRight = getCarriedFlagPlacement({ x: 103.25, y: 220.5, dir: 'right' })
    const advancedRight = getCarriedFlagPlacement({ x: 110.75, y: 220.5, dir: 'right' })
    const movingDown = getCarriedFlagPlacement({ x: 103.25, y: 220.5, dir: 'down' })

    expect(advancedRight.x - movingRight.x).toBeCloseTo(7.5)
    expect(movingRight.x + movingRight.size / 2).toBeLessThan(103.25 + 16)
    expect(movingDown.y + movingDown.size / 2).toBeLessThan(220.5 + 16)
  })
})
