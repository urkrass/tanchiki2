import { describe, expect, it } from 'vitest'
import {
  BATTLEFIELD_TILE_SIZE,
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  battlefieldCellKey,
  centerBattlefieldCameraOnCell,
  getBattlefieldDrawRange,
  isBattlefieldCellVisible,
  isWorldCellInCamera,
  worldCellToScreen,
} from './battlefield.ts'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  BOTTOM_HUD_HEIGHT,
  HUD_WIDTH,
  HUD_X,
  LEFT_HUD_WIDTH,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
} from './constants.ts'

describe('universal battlefield camera', () => {
  it('keeps the battlefield intact inside left, right, and bottom HUD bands', () => {
    expect(LEFT_HUD_WIDTH).toBe(48)
    expect(ARENA_X).toBe(48)
    expect(ARENA_WIDTH).toBe(416)
    expect(ARENA_HEIGHT).toBe(416)
    expect(HUD_X).toBe(464)
    expect(HUD_WIDTH).toBe(96)
    expect(BOTTOM_HUD_HEIGHT).toBe(48)
    expect(LOGICAL_WIDTH).toBe(560)
    expect(LOGICAL_HEIGHT).toBe(480)
  })

  it('centers on the local cell when map bounds allow it', () => {
    expect(centerBattlefieldCameraOnCell(10, 7, 20, 16)).toEqual({ col: 4, row: 1 })
  })

  it('clamps the 13x13 camera at multiplayer map edges', () => {
    expect(centerBattlefieldCameraOnCell(0, 0, 20, 16)).toEqual({ col: 0, row: 0 })
    expect(centerBattlefieldCameraOnCell(19, 15, 20, 16)).toEqual({
      col: 20 - BATTLEFIELD_VIEW_COLS,
      row: 16 - BATTLEFIELD_VIEW_ROWS,
    })
  })

  it('maps the camera origin cell to the arena origin', () => {
    const camera = { col: 4, row: 3 }

    expect(worldCellToScreen(camera, 4, 3)).toEqual({ x: ARENA_X, y: ARENA_Y })
    expect(worldCellToScreen(camera, 5, 4)).toEqual({
      x: ARENA_X + BATTLEFIELD_TILE_SIZE,
      y: ARENA_Y + BATTLEFIELD_TILE_SIZE,
    })
  })

  it('reports cells outside the current camera as not drawable', () => {
    const camera = { col: 4, row: 3 }

    expect(isWorldCellInCamera(camera, 4, 3)).toBe(true)
    expect(isWorldCellInCamera(camera, 16, 15)).toBe(true)
    expect(isWorldCellInCamera(camera, 3, 3)).toBe(false)
    expect(isWorldCellInCamera(camera, 17, 15)).toBe(false)
  })

  it('keeps hidden online cells out of visible-cell checks', () => {
    const visible = new Set([battlefieldCellKey(5, 5)])

    expect(isBattlefieldCellVisible(visible, 5, 5)).toBe(true)
    expect(isBattlefieldCellVisible(visible, 6, 5)).toBe(false)
  })

  it('includes partially visible cells and an extra draw margin for fractional cameras', () => {
    const camera = { col: 4.25, row: 2.5 }

    expect(isWorldCellInCamera(camera, 4, 2)).toBe(true)
    expect(isWorldCellInCamera(camera, 17, 15)).toBe(true)
    expect(isWorldCellInCamera(camera, 3, 2)).toBe(false)

    expect(getBattlefieldDrawRange(camera, 20, 16)).toEqual({
      startCol: 3,
      endCol: 19,
      startRow: 1,
      endRow: 16,
    })
  })
})
