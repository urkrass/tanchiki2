import type { Direction, Rect, Vec } from './types.ts'

export const TILE_SIZE = 32
export const GRID_COLS = 13
export const GRID_ROWS = 13
export const LEFT_HUD_WIDTH = 48
export const RIGHT_HUD_WIDTH = 96
export const BOTTOM_HUD_HEIGHT = 32
export const ARENA_X = LEFT_HUD_WIDTH
export const ARENA_Y = 16
export const ARENA_WIDTH = GRID_COLS * TILE_SIZE
export const ARENA_HEIGHT = GRID_ROWS * TILE_SIZE
export const HUD_X = ARENA_X + ARENA_WIDTH
export const HUD_WIDTH = RIGHT_HUD_WIDTH
export const LOGICAL_WIDTH = LEFT_HUD_WIDTH + ARENA_WIDTH + HUD_WIDTH
export const LOGICAL_HEIGHT = ARENA_Y + ARENA_HEIGHT + BOTTOM_HUD_HEIGHT
export const TANK_SIZE = 26
export const TANK_OFFSET = 3
export const BULLET_SIZE = 5
export const MENU_OPTION_X = ARENA_X + 80
export const MENU_OPTION_Y = 166
export const MENU_OPTION_WIDTH = 256
export const MENU_OPTION_HEIGHT = 30
export const MENU_OPTION_STEP = 32
export const LEVEL_SELECT_OPTION_Y = 150
export const LEVEL_SELECT_OPTION_HEIGHT = 24
export const LEVEL_SELECT_OPTION_STEP = 26
export const TANK_SELECT_TAB_X = ARENA_X + 22
export const TANK_SELECT_TAB_Y = 142
export const TANK_SELECT_TAB_WIDTH = 118
export const TANK_SELECT_TAB_HEIGHT = 112
export const TANK_SELECT_TAB_GAP = 8
export const TANK_SELECT_BACK_Y = 366

export const DIR_VECTORS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

export const DIRECTION_ORDER: Direction[] = ['up', 'right', 'down', 'left']

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function tankCenter(tank: { x: number; y: number }) {
  return {
    x: tank.x + TANK_SIZE / 2,
    y: tank.y + TANK_SIZE / 2,
  }
}

export function gridToTankPosition(col: number, row: number) {
  return {
    x: ARENA_X + col * TILE_SIZE + TANK_OFFSET,
    y: ARENA_Y + row * TILE_SIZE + TANK_OFFSET,
  }
}

export function tankRect(tank: { x: number; y: number }): Rect {
  return {
    x: tank.x + 1,
    y: tank.y + 1,
    w: TANK_SIZE - 2,
    h: TANK_SIZE - 2,
  }
}
