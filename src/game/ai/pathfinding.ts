import type { Vec } from '../types.ts'
import type { BotPathGrid, BotPathOptions, BotPathResult, BotTileInfo } from './botTypes.ts'

const CARDINALS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const

type NormalizedBotPathOptions = Required<Omit<BotPathOptions, 'tieTarget'>> & Pick<BotPathOptions, 'tieTarget'>

const DEFAULT_PATH_OPTIONS: Required<Omit<BotPathOptions, 'tieTarget'>> = {
  allowDestructibleWalls: false,
  baseCost: 1,
  destructibleWallCost: 5,
  dangerPenalty: 2,
  unknownPenalty: 0.6,
  coverPreference: 0,
  objectiveProximityWeight: 0,
}

export function findWeightedPath(
  grid: BotPathGrid,
  start: Vec,
  goals: Vec[],
  options: BotPathOptions = {},
): BotPathResult {
  const config: NormalizedBotPathOptions = { ...DEFAULT_PATH_OPTIONS, ...options }
  const goalKeys = new Set(goals.map(cellKey))
  if (goals.length === 0 || !inBounds(grid, start)) {
    return emptyPath()
  }

  const startKey = cellKey(start)
  let order = 0
  const frontier: Array<{ cell: Vec; priority: number; order: number }> = [{ cell: { ...start }, priority: 0, order: order++ }]
  const cameFrom = new Map<string, string | null>([[startKey, null]])
  const costSoFar = new Map<string, number>([[startKey, 0]])

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.priority - b.priority || a.order - b.order)
    const current = frontier.shift()
    if (!current) break

    const currentKey = cellKey(current.cell)
    if (goalKeys.has(currentKey)) {
      return reconstructWeightedPath(start, current.cell, cameFrom, grid)
    }

    for (const direction of CARDINALS) {
      const next = { x: current.cell.x + direction.x, y: current.cell.y + direction.y }
      const nextKey = cellKey(next)
      if (!canEnter(grid, next, config) || (grid.isOccupied?.(next) && !goalKeys.has(nextKey))) {
        continue
      }

      const tile = grid.tileAt(next)
      const newCost = (costSoFar.get(currentKey) ?? 0) + movementCost(grid, next, tile, config, goals)
      const previous = costSoFar.get(nextKey)
      if (previous !== undefined && newCost >= previous) {
        continue
      }

      costSoFar.set(nextKey, newCost)
      cameFrom.set(nextKey, currentKey)
      frontier.push({
        cell: next,
        priority: newCost + nearestManhattan(next, goals) + axisTieBias(next, goals, config.tieTarget),
        order: order++,
      })
    }
  }

  return emptyPath()
}

export function isBreakerWallPlanUseful(path: BotPathResult, directPath: BotPathResult | null = null) {
  if (!path.found || path.breakWalls.length === 0) {
    return false
  }

  if (!directPath?.found) {
    return true
  }

  return path.steps.length < directPath.steps.length
}

export function cellKey(cell: Vec) {
  return `${cell.x},${cell.y}`
}

function reconstructWeightedPath(start: Vec, end: Vec, cameFrom: Map<string, string | null>, grid: BotPathGrid): BotPathResult {
  const steps: Vec[] = []
  const breakWalls: Vec[] = []
  let currentKey: string | null = cellKey(end)

  while (currentKey) {
    const [x, y] = currentKey.split(',').map(Number)
    if (x === start.x && y === start.y) {
      break
    }

    const step = { x, y }
    steps.unshift(step)
    if (isDestructibleWall(grid.tileAt(step))) {
      breakWalls.unshift(step)
    }
    currentKey = cameFrom.get(currentKey) ?? null
  }

  return {
    found: true,
    steps,
    breakWalls,
    cost: steps.reduce((total, step) => total + (isDestructibleWall(grid.tileAt(step)) ? 5 : 1), 0),
  }
}

function emptyPath(): BotPathResult {
  return { found: false, steps: [], cost: Number.POSITIVE_INFINITY, breakWalls: [] }
}

function canEnter(grid: BotPathGrid, cell: Vec, options: NormalizedBotPathOptions) {
  if (!inBounds(grid, cell)) {
    return false
  }

  const tile = grid.tileAt(cell)
  if (isPassable(tile)) {
    return true
  }

  return options.allowDestructibleWalls && isDestructibleWall(tile)
}

function movementCost(grid: BotPathGrid, cell: Vec, tile: BotTileInfo, options: NormalizedBotPathOptions, goals: Vec[]) {
  let cost = options.baseCost
  if (isDestructibleWall(tile)) {
    cost += options.destructibleWallCost
  }
  if (grid.dangerCells?.has(cellKey(cell))) {
    cost += options.dangerPenalty
  }
  if (grid.unknownCells?.has(cellKey(cell))) {
    cost += options.unknownPenalty
  }
  if (options.coverPreference > 0 && hasAdjacentSolid(grid, cell)) {
    cost -= Math.min(options.coverPreference, cost * 0.45)
  }
  if (options.objectiveProximityWeight > 0) {
    cost -= Math.min(options.objectiveProximityWeight, 0.25) / Math.max(1, nearestManhattan(cell, goals))
  }
  return Math.max(0.1, cost)
}

function isPassable(tile: BotTileInfo) {
  return tile.kind === 'empty' || tile.kind === 'trees' || tile.kind === 'road' || tile.kind === 'ammo'
}

function isDestructibleWall(tile: BotTileInfo) {
  return tile.kind === 'brick' || tile.kind === 'radio' || tile.kind === 'depot'
}

function hasAdjacentSolid(grid: BotPathGrid, cell: Vec) {
  return CARDINALS.some((direction) => {
    const next = { x: cell.x + direction.x, y: cell.y + direction.y }
    return !inBounds(grid, next) || !isPassable(grid.tileAt(next))
  })
}

function nearestManhattan(cell: Vec, goals: Vec[]) {
  return goals.reduce((best, goal) => Math.min(best, Math.abs(goal.x - cell.x) + Math.abs(goal.y - cell.y)), Number.POSITIVE_INFINITY)
}

function axisTieBias(cell: Vec, goals: Vec[], tieTarget: Vec | undefined) {
  if (tieTarget) {
    return Math.abs(tieTarget.x - cell.x) * 0.001
  }

  const nearest = goals
    .map((goal) => ({ goal, distance: Math.abs(goal.x - cell.x) + Math.abs(goal.y - cell.y) }))
    .sort((a, b) => a.distance - b.distance || a.goal.y - b.goal.y || a.goal.x - b.goal.x)[0]?.goal
  return nearest ? Math.abs(nearest.x - cell.x) * 0.001 : 0
}

function inBounds(grid: BotPathGrid, cell: Vec) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < grid.cols && cell.y < grid.rows
}
