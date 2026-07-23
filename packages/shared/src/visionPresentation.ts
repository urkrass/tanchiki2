export interface VisionApertureCircle {
  x: number
  y: number
  radius: number
}

export interface VisionAperturePoint {
  x: number
  y: number
}

// Canvas fog uses this same soft edge. Entity projection must keep a tank
// available until its last visible pixel has crossed the aperture.
export const VISION_APERTURE_SOFT_EDGE_CELLS = 0.35
export const TANK_PRESENTATION_HALF_EXTENT_CELLS = 0.5

export function squareIntersectsVisionAperture(
  center: VisionAperturePoint,
  circles: readonly VisionApertureCircle[],
  halfExtent = TANK_PRESENTATION_HALF_EXTENT_CELLS,
  softEdge = VISION_APERTURE_SOFT_EDGE_CELLS,
) {
  const safeHalfExtent = Math.max(0, halfExtent)
  const safeSoftEdge = Math.max(0, softEdge)

  return circles.some((circle) => {
    const nearestX = clamp(circle.x, center.x - safeHalfExtent, center.x + safeHalfExtent)
    const nearestY = clamp(circle.y, center.y - safeHalfExtent, center.y + safeHalfExtent)
    const radius = Math.max(0, circle.radius) + safeSoftEdge
    const dx = nearestX - circle.x
    const dy = nearestY - circle.y
    return dx * dx + dy * dy < radius * radius
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
