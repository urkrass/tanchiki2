import { describe, expect, it } from 'vitest'
import { ARENA_X, ARENA_Y, TILE_SIZE } from './constants.ts'
import {
  arenaWorldPixelPoint,
  arenaWorldPixelToCameraScreen,
  battlefieldScreenRect,
  gridCellPoint,
  gridCellTopCenterToArenaWorldPixel,
} from './spatialCoordinates.ts'

describe('spatial coordinate contracts', () => {
  it('converts a grid cell notice anchor to arena-offset world pixels', () => {
    expect(gridCellTopCenterToArenaWorldPixel(gridCellPoint(4, 11))).toEqual({
      space: 'arena-world-pixel',
      x: ARENA_X + 4.5 * TILE_SIZE,
      y: ARENA_Y + 11 * TILE_SIZE,
    })
  })

  it('projects arena world pixels through a fractional camera exactly once', () => {
    const point = arenaWorldPixelPoint(
      ARENA_X + 8.5 * TILE_SIZE,
      ARENA_Y + 10 * TILE_SIZE,
    )

    expect(arenaWorldPixelToCameraScreen({ col: 3.25, row: 4.5 }, point)).toEqual({
      space: 'camera-screen-pixel',
      x: ARENA_X + 5.25 * TILE_SIZE,
      y: ARENA_Y + 5.5 * TILE_SIZE,
    })
  })

  it('names the complete battlefield presentation rectangle', () => {
    expect(battlefieldScreenRect()).toMatchObject({
      space: 'battlefield-screen-rect',
      left: ARENA_X,
      top: ARENA_Y,
    })
  })
})
