import { describe, expect, it } from 'vitest'
import { measurePixelText, wrapPixelText } from './pixelText.ts'

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

  it('wraps long mission helper text without dropping words', () => {
    const briefing = 'Mode: Defense. A light probe enters the city. Learn the lanes and keep the eagle standing.'
    const lines = wrapPixelText(briefing, 380)

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toBe(briefing)
    for (const line of lines) {
      expect(measurePixelText(line)).toBeLessThanOrEqual(380)
    }
  })
})
