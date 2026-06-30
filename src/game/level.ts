import { ARENA_Y, GRID_COLS, GRID_ROWS, TILE_SIZE } from './constants.ts'
import type { Tile, TileKind, Vec } from './types.ts'

export const DEFAULT_LEVEL_ROWS = [
  '...B.B.B.B...',
  '.BB...B...BB.',
  '.B..SSS..B...',
  '.B.B...B.B.B.',
  '...B.W.B.....',
  'BB...B...B.BB',
  '...SS...SS...',
  'BB.B...B...BB',
  '...B.W.B.....',
  '.B.B...B.B.B.',
  '.B..SSS..B...',
  '.BB..B..BB...',
  '.....BEB.....',
]

export const DEFAULT_PLAYER_SPAWN: Vec = {
  x: 4 * TILE_SIZE + 3,
  y: ARENA_Y + 11 * TILE_SIZE + 3,
}

export const DEFAULT_ENEMY_SPAWNS: Vec[] = [
  { x: 0 * TILE_SIZE + 3, y: ARENA_Y + 0 * TILE_SIZE + 3 },
  { x: 6 * TILE_SIZE + 3, y: ARENA_Y + 0 * TILE_SIZE + 3 },
  { x: 12 * TILE_SIZE + 3, y: ARENA_Y + 0 * TILE_SIZE + 3 },
]

export function createTiles(rows = DEFAULT_LEVEL_ROWS): Tile[][] {
  if (rows.length !== GRID_ROWS) {
    throw new Error(`Level must contain ${GRID_ROWS} rows`)
  }

  return rows.map((row, rowIndex) => {
    if (row.length !== GRID_COLS) {
      throw new Error(`Level row ${rowIndex} must contain ${GRID_COLS} columns`)
    }

    return [...row].map(tileFromChar)
  })
}

function tileFromChar(char: string): Tile {
  const kindByChar: Record<string, TileKind> = {
    '.': 'empty',
    B: 'brick',
    S: 'steel',
    W: 'water',
    T: 'trees',
    E: 'base',
  }
  const kind = kindByChar[char] ?? 'empty'

  return {
    kind,
    hp: kind === 'brick' ? 2 : kind === 'base' ? 1 : 0,
  }
}
