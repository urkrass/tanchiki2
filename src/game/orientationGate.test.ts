import { describe, expect, it } from 'vitest'
import { isTabletPortraitGateActive } from './orientationGate.ts'

describe('tablet portrait orientation gate', () => {
  it('gates coarse-pointer tablets only while portrait', () => {
    expect(isTabletPortraitGateActive(800, 1280, true)).toBe(true)
    expect(isTabletPortraitGateActive(1280, 800, true)).toBe(false)
  })

  it('keeps portrait phones and fine pointers playable', () => {
    expect(isTabletPortraitGateActive(390, 844, true)).toBe(false)
    expect(isTabletPortraitGateActive(800, 1280, false)).toBe(false)
  })
})
