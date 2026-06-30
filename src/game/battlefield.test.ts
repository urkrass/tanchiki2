import { describe, expect, it } from 'vitest'
import {
  BATTLEFIELD_TILE_SIZE,
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  battlefieldCellKey,
  centerBattlefieldCameraOnCell,
  isBattlefieldCellVisible,
  isWorldCellInCamera,
  worldCellToScreen,
} from './battlefield.ts'
import { ARENA_X, ARENA_Y } from './constants.ts'

describe('universal battlefield camera', () => {
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
})
