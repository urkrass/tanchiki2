import { describe, expect, it } from 'vitest'
import {
  PORTABLE_RELAY_ROTATION_FRAME_COUNT,
  PORTABLE_RELAY_ROTATION_SECONDS,
  getPortableRelayRotationFrame,
} from './portableRelayVisual.ts'

describe('portable relay rotation frames', () => {
  it('advances through eight deterministic frames and loops cleanly', () => {
    const step = PORTABLE_RELAY_ROTATION_SECONDS / PORTABLE_RELAY_ROTATION_FRAME_COUNT
    const frames = Array.from(
      { length: PORTABLE_RELAY_ROTATION_FRAME_COUNT },
      (_, index) => getPortableRelayRotationFrame(index * step + 0.001).index,
    )

    expect(frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(getPortableRelayRotationFrame(PORTABLE_RELAY_ROTATION_SECONDS)).toEqual(
      getPortableRelayRotationFrame(0),
    )
  })

  it('narrows edge-on and reverses its lit face after half a turn', () => {
    const front = getPortableRelayRotationFrame(0)
    const edge = getPortableRelayRotationFrame(PORTABLE_RELAY_ROTATION_SECONDS / 4)
    const back = getPortableRelayRotationFrame(PORTABLE_RELAY_ROTATION_SECONDS / 2)

    expect(front.openness).toBe(1)
    expect(edge.openness).toBeLessThan(0.01)
    expect(front.frontFacing).toBe(true)
    expect(back.frontFacing).toBe(false)
  })

  it('supports stable per-relay phase offsets and invalid input fallback', () => {
    expect(getPortableRelayRotationFrame(0, PORTABLE_RELAY_ROTATION_SECONDS / 8).index).toBe(1)
    expect(getPortableRelayRotationFrame(Number.NaN)).toEqual(getPortableRelayRotationFrame(0))
  })
})
