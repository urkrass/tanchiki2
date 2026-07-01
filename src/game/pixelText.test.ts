import { describe, expect, it } from 'vitest'
import { measurePixelText } from './pixelText.ts'

describe('pixel text', () => {
  it('measures text deterministically on the pixel grid', () => {
    expect(measurePixelText('TANK')).toBe(23)
    expect(measurePixelText('tank')).toBe(23)
    expect(measurePixelText('TANK', 2)).toBe(46)
  })

  it('uses narrower space and punctuation glyphs for compact HUD labels', () => {
    expect(measurePixelText('HP 3')).toBeLessThan(measurePixelText('HPX3'))
    expect(measurePixelText('LINK ON')).toBe(37)
  })
})
