import { describe, expect, it } from 'vitest'
import {
  TANK_PRESENTATION_HALF_EXTENT_CELLS,
  VISION_APERTURE_SOFT_EDGE_CELLS,
  squareIntersectsVisionAperture,
} from './visionPresentation.ts'

const circles = [{ x: 5.5, y: 5.5, radius: 2.75 }]

describe('vision aperture presentation', () => {
  it('keeps a tank projected while its sprite intersects the softened fog edge', () => {
    expect(squareIntersectsVisionAperture({ x: 8.5, y: 5.5 }, circles)).toBe(true)
    expect(squareIntersectsVisionAperture({ x: 8.75, y: 5.5 }, circles)).toBe(true)
  })

  it('removes the tank once its complete sprite is behind opaque fog', () => {
    const hiddenCenterX =
      circles[0]!.x
      + circles[0]!.radius
      + VISION_APERTURE_SOFT_EDGE_CELLS
      + TANK_PRESENTATION_HALF_EXTENT_CELLS
      + 0.01

    expect(squareIntersectsVisionAperture({ x: hiddenCenterX, y: 5.5 }, circles)).toBe(false)
  })

  it('handles diagonal crossings against the actual square footprint', () => {
    expect(squareIntersectsVisionAperture({ x: 7.9, y: 7.9 }, circles)).toBe(true)
    expect(squareIntersectsVisionAperture({ x: 8.5, y: 8.5 }, circles)).toBe(false)
  })
})
