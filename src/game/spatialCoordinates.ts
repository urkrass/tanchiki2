import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, TILE_SIZE } from './constants.ts'
import type { BattlefieldCamera } from './battlefield.ts'

export interface GridCellPoint {
  space: 'grid-cell'
  col: number
  row: number
}

export interface ArenaWorldPixelPoint {
  space: 'arena-world-pixel'
  x: number
  y: number
}

export interface CameraScreenPixelPoint {
  space: 'camera-screen-pixel'
  x: number
  y: number
}

export interface BattlefieldScreenRect {
  space: 'battlefield-screen-rect'
  left: number
  top: number
  right: number
  bottom: number
}

export function gridCellPoint(col: number, row: number): GridCellPoint {
  return { space: 'grid-cell', col, row }
}

export function arenaWorldPixelPoint(x: number, y: number): ArenaWorldPixelPoint {
  return { space: 'arena-world-pixel', x, y }
}

export function gridCellTopCenterToArenaWorldPixel(cell: GridCellPoint): ArenaWorldPixelPoint {
  return arenaWorldPixelPoint(
    ARENA_X + (cell.col + 0.5) * TILE_SIZE,
    ARENA_Y + cell.row * TILE_SIZE,
  )
}

export function arenaWorldPixelToCameraScreen(
  camera: BattlefieldCamera,
  point: ArenaWorldPixelPoint,
): CameraScreenPixelPoint {
  return {
    space: 'camera-screen-pixel',
    x: ARENA_X + ((point.x - ARENA_X) / TILE_SIZE - camera.col) * TILE_SIZE,
    y: ARENA_Y + ((point.y - ARENA_Y) / TILE_SIZE - camera.row) * TILE_SIZE,
  }
}

export function cameraScreenPixelPoint(x: number, y: number): CameraScreenPixelPoint {
  return { space: 'camera-screen-pixel', x, y }
}

export function battlefieldScreenRect(): BattlefieldScreenRect {
  return {
    space: 'battlefield-screen-rect',
    left: ARENA_X,
    top: ARENA_Y,
    right: ARENA_X + ARENA_WIDTH,
    bottom: ARENA_Y + ARENA_HEIGHT,
  }
}
