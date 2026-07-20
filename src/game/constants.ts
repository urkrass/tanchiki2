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
export const PLAYER_BULLET_SPEED = 240
export const ENEMY_BULLET_SPEED = 145
export const DEPLOYABLE_PLACE_SECONDS = 0.9
export const DEPLOYABLE_ALERT_TTL = 4
export const MINE_SLOW_MULTIPLIER = 1.7
export const MENU_OPTION_X = ARENA_X + 80
export const MENU_OPTION_Y = 166
export const MENU_OPTION_WIDTH = 256
export const MENU_OPTION_HEIGHT = 30
export const MENU_OPTION_STEP = 32
export const LEVEL_SELECT_OPTION_Y = 150
export const LEVEL_SELECT_OPTION_HEIGHT = 24
export const LEVEL_SELECT_OPTION_STEP = 26
export const TANK_SELECT_CONTENT_X = ARENA_X + 48
export const TANK_SELECT_CONTENT_WIDTH = ARENA_WIDTH - 96
export const TANK_SELECT_THEATER_Y = ARENA_Y + 18
export const TANK_SELECT_THEATER_HEIGHT = 194
export const TANK_SELECT_THEATER_FOG_X = TANK_SELECT_CONTENT_X
export const TANK_SELECT_THEATER_FOG_Y = TANK_SELECT_THEATER_Y + 20
export const TANK_SELECT_THEATER_FOG_WIDTH = TANK_SELECT_CONTENT_WIDTH
export const TANK_SELECT_THEATER_FOG_HEIGHT =
  TANK_SELECT_THEATER_HEIGHT - 20
export const TANK_SELECT_PLAYBACK_CONTROL_SIZE = 13
export const TANK_SELECT_PLAYBACK_CONTROL_GAP = 2
export const TANK_SELECT_PLAYBACK_CONTROL_Y = TANK_SELECT_THEATER_Y + 5
export const TANK_SELECT_PLAYBACK_CONTROL_X =
  TANK_SELECT_CONTENT_X +
  TANK_SELECT_CONTENT_WIDTH -
  (TANK_SELECT_PLAYBACK_CONTROL_SIZE * 3 + TANK_SELECT_PLAYBACK_CONTROL_GAP * 2) -
  7
export const TANK_SELECT_DESCRIPTION_Y = TANK_SELECT_THEATER_Y + TANK_SELECT_THEATER_HEIGHT + 8
export const TANK_SELECT_DESCRIPTION_HEIGHT = 132
export const TANK_SELECT_ARROW_WIDTH = 42
export const TANK_SELECT_ARROW_HEIGHT = 138
export const TANK_SELECT_ARROW_Y = ARENA_Y + 96
export const TANK_SELECT_LEFT_ARROW_X = ARENA_X + 2
export const TANK_SELECT_RIGHT_ARROW_X = ARENA_X + ARENA_WIDTH - TANK_SELECT_ARROW_WIDTH - 2
export const TANK_SELECT_BACK_Y = 376
export const GARAGE_OVERVIEW_X = ARENA_X + 48
export const GARAGE_OVERVIEW_Y = 120
export const GARAGE_OVERVIEW_WIDTH = 320
export const GARAGE_OVERVIEW_HEIGHT = 58
export const GARAGE_OVERVIEW_STEP = 64
export const GARAGE_MOD_TAB_X = ARENA_X + 16
export const GARAGE_MOD_TAB_Y = 130
export const GARAGE_MOD_TAB_SIZE = 76
export const GARAGE_MOD_TAB_GAP = 8
export const GARAGE_DESCRIPTION_X = ARENA_X + 188
export const GARAGE_DESCRIPTION_Y = 130
export const GARAGE_DESCRIPTION_WIDTH = 212
export const GARAGE_DESCRIPTION_HEIGHT = 206
export const GARAGE_BACK_Y = 366

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
