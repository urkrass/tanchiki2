import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  GRID_COLS,
  GRID_ROWS,
  HUD_WIDTH,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  TILE_SIZE,
} from './constants.ts'
import {
  drawPixelGround,
  drawPixelLastKnown,
  drawPixelPing,
  drawPixelProjectile,
  drawPixelRelay,
  drawPixelTank,
  drawPixelTerrainTile,
  type PixelTeamPalette,
  type ProjectileSpriteOptions,
  type RelaySpriteOptions,
  type TankSpriteOptions,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import type { Direction, RoadNeighbors, Team, TileKind, WaterNeighbors } from './types.ts'

export const BATTLEFIELD_TILE_SIZE = TILE_SIZE
export const BATTLEFIELD_VIEW_COLS = GRID_COLS
export const BATTLEFIELD_VIEW_ROWS = GRID_ROWS
export const ZERO_BATTLEFIELD_CAMERA: BattlefieldCamera = { col: 0, row: 0 }

export interface BattlefieldCamera {
  col: number
  row: number
}

export interface BattlefieldDrawRange {
  startCol: number
  endCol: number
  startRow: number
  endRow: number
}

export const TEAM_COLORS: Record<Team, PixelTeamPalette> = {
  blue: {
    body: '#66c8ff',
    trim: '#194f78',
    highlight: '#ecfbff',
    bullet: '#bdeeff',
  },
  red: {
    body: '#f06243',
    trim: '#7d2419',
    highlight: '#ffd6c8',
    bullet: '#ffcfb7',
  },
}

export const COLOR_SAFE_TEAM_COLORS: Record<Team, PixelTeamPalette> = {
  blue: {
    body: '#2fd4ff',
    trim: '#06364d',
    highlight: '#f3ffff',
    bullet: '#b9f3ff',
  },
  red: {
    body: '#ffb000',
    trim: '#553300',
    highlight: '#fff0bd',
    bullet: '#ffe0a3',
  },
}

export function drawBattlefieldFrame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#6a6964'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.fillStyle = '#050505'
  ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.fillStyle = '#4f504c'
  ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
}

export function centerBattlefieldCameraOnCell(col: number, row: number, mapCols: number, mapRows: number): BattlefieldCamera {
  return clampBattlefieldCamera(
    {
      col: Math.round(col) - Math.floor(BATTLEFIELD_VIEW_COLS / 2),
      row: Math.round(row) - Math.floor(BATTLEFIELD_VIEW_ROWS / 2),
    },
    mapCols,
    mapRows,
  )
}

export function clampBattlefieldCamera(camera: BattlefieldCamera, mapCols: number, mapRows: number): BattlefieldCamera {
  const maxCol = Math.max(0, mapCols - BATTLEFIELD_VIEW_COLS)
  const maxRow = Math.max(0, mapRows - BATTLEFIELD_VIEW_ROWS)
  return {
    col: clampInt(camera.col, 0, maxCol),
    row: clampInt(camera.row, 0, maxRow),
  }
}

export function clampBattlefieldCameraFractional(
  camera: BattlefieldCamera,
  mapCols: number,
  mapRows: number,
): BattlefieldCamera {
  const maxCol = Math.max(0, mapCols - BATTLEFIELD_VIEW_COLS)
  const maxRow = Math.max(0, mapRows - BATTLEFIELD_VIEW_ROWS)
  return {
    col: clampNumber(camera.col, 0, maxCol),
    row: clampNumber(camera.row, 0, maxRow),
  }
}

export function getBattlefieldDrawRange(camera: BattlefieldCamera, mapCols: number, mapRows: number): BattlefieldDrawRange {
  return {
    startCol: clampInt(Math.floor(camera.col) - 1, 0, Math.max(0, mapCols - 1)),
    endCol: clampInt(Math.ceil(camera.col + BATTLEFIELD_VIEW_COLS) + 1, 0, mapCols),
    startRow: clampInt(Math.floor(camera.row) - 1, 0, Math.max(0, mapRows - 1)),
    endRow: clampInt(Math.ceil(camera.row + BATTLEFIELD_VIEW_ROWS) + 1, 0, mapRows),
  }
}

export function worldCellToScreen(camera: BattlefieldCamera, col: number, row: number) {
  return {
    x: ARENA_X + (col - camera.col) * BATTLEFIELD_TILE_SIZE,
    y: ARENA_Y + (row - camera.row) * BATTLEFIELD_TILE_SIZE,
  }
}

export function worldPointToScreen(camera: BattlefieldCamera, x: number, y: number) {
  return {
    x: ARENA_X + (x - camera.col) * BATTLEFIELD_TILE_SIZE,
    y: ARENA_Y + (y - camera.row) * BATTLEFIELD_TILE_SIZE,
  }
}

export function isWorldCellInCamera(camera: BattlefieldCamera, col: number, row: number) {
  const viewRight = camera.col + BATTLEFIELD_VIEW_COLS
  const viewBottom = camera.row + BATTLEFIELD_VIEW_ROWS
  return (
    col + 1 > camera.col &&
    row + 1 > camera.row &&
    col < viewRight &&
    row < viewBottom
  )
}

export function battlefieldCellKey(col: number, row: number) {
  return `${col},${row}`
}

export function isBattlefieldCellVisible(visible: ReadonlySet<string>, col: number, row: number) {
  return visible.has(battlefieldCellKey(col, row))
}

export function drawBattlefieldGround(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, col: number, row: number) {
  const point = worldCellToScreen(camera, col, row)
  drawPixelGround(ctx, point.x, point.y, BATTLEFIELD_TILE_SIZE, col, row)
}

export function drawBattlefieldHiddenCell(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, col: number, row: number) {
  const point = worldCellToScreen(camera, col, row)
  ctx.fillStyle = '#030303'
  ctx.fillRect(point.x, point.y, BATTLEFIELD_TILE_SIZE, BATTLEFIELD_TILE_SIZE)
}

export function drawBattlefieldTerrainTile(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  camera: BattlefieldCamera,
  col: number,
  row: number,
  hp: number,
  time: number,
  waterNeighbors?: WaterNeighbors,
  roadNeighbors?: RoadNeighbors,
) {
  if (!isWorldCellInCamera(camera, col, row)) return
  const point = worldCellToScreen(camera, col, row)
  drawPixelTerrainTile(ctx, kind, point.x, point.y, BATTLEFIELD_TILE_SIZE, {
    col,
    row,
    hp,
    sheet: 'core32',
    time,
    waterNeighbors,
    roadNeighbors,
  })
}

export function drawBattlefieldTank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: Direction,
  palette: PixelTeamPalette,
  options: TankSpriteOptions = {},
) {
  drawPixelTank(ctx, x, y, size, direction, palette, { ...options, sheet: 'core32' })
}

export function drawBattlefieldProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  direction: Direction,
  options: ProjectileSpriteOptions = {},
) {
  drawPixelProjectile(ctx, x, y, size, color, direction, { ...options, sheet: 'core32' })
}

export function drawBattlefieldRelay(
  ctx: CanvasRenderingContext2D,
  camera: BattlefieldCamera,
  col: number,
  row: number,
  palette: PixelTeamPalette | null,
  progress: number,
  options: RelaySpriteOptions = {},
) {
  if (!isWorldCellInCamera(camera, col, row)) return
  const point = worldCellToScreen(camera, col, row)
  drawPixelRelay(ctx, point.x, point.y, BATTLEFIELD_TILE_SIZE, palette, progress, { ...options, sheet: 'core32' })
}

export function drawBattlefieldPing(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, col: number, row: number, color: string) {
  if (!isWorldCellInCamera(camera, col, row)) return
  const point = worldCellToScreen(camera, col, row)
  drawPixelPing(ctx, point.x, point.y, BATTLEFIELD_TILE_SIZE, color)
}

export function drawBattlefieldLastKnown(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, col: number, row: number, color: string) {
  if (!isWorldCellInCamera(camera, col, row)) return
  const point = worldCellToScreen(camera, col, row)
  drawPixelLastKnown(ctx, point.x, point.y, BATTLEFIELD_TILE_SIZE, color)
}

export function getBattlefieldTeamColors(team: Team, colorSafe: boolean) {
  return colorSafe ? COLOR_SAFE_TEAM_COLORS[team] : TEAM_COLORS[team]
}

export function getBattlefieldTeamKey(team: Team, colorSafe: boolean): AtlasTeamKey {
  if (colorSafe) {
    return team === 'blue' ? 'blueSafe' : 'redSafe'
  }

  return team
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
