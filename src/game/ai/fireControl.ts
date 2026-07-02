import type { Direction, Vec } from '../types.ts'
import type { BotFireControlInput, BotFireDecision } from './botTypes.ts'

const BLOCKING_TILES = new Set(['brick', 'steel', 'water', 'base', 'radio', 'depot'])

export function evaluateFireControl(input: BotFireControlInput): BotFireDecision {
  if (!input.hasAmmo) {
    return decision(false, 'no-ammo', null)
  }

  if (input.target.confidence < input.difficulty.confidenceThreshold) {
    return decision(false, 'low-confidence', null)
  }

  const shooter = { x: input.shooter.col, y: input.shooter.row }
  const target = input.target.position
  const direction = directionTo(shooter, target)
  if (!direction) {
    return decision(false, 'not-aligned', null)
  }

  const blocked = firstBlockingCell(shooter, target, input)
  if (blocked === 'friendly-fire') {
    return decision(false, 'friendly-fire', null)
  }
  if (blocked === 'blocked') {
    return decision(false, 'blocked', null)
  }

  const lowValue = input.target.value < 0.48
  const uncertain = input.target.confidence < Math.min(0.95, input.difficulty.confidenceThreshold + 0.22)
  if (lowValue && uncertain && input.difficulty.ammoConservation >= 0.55) {
    return decision(false, 'conserve-ammo', null)
  }

  return decision(true, 'clear', direction)
}

export function directionTo(from: Vec, to: Vec): Direction | null {
  if (from.x === to.x) {
    if (to.y > from.y) return 'down'
    if (to.y < from.y) return 'up'
  }

  if (from.y === to.y) {
    if (to.x > from.x) return 'right'
    if (to.x < from.x) return 'left'
  }

  return null
}

function firstBlockingCell(from: Vec, to: Vec, input: BotFireControlInput): 'blocked' | 'friendly-fire' | null {
  const dx = Math.sign(to.x - from.x)
  const dy = Math.sign(to.y - from.y)
  let col = from.x + dx
  let row = from.y + dy

  while (col !== to.x || row !== to.y) {
    const tile = input.tileAt({ x: col, y: row })
    if (BLOCKING_TILES.has(tile)) {
      return 'blocked'
    }

    const tank = input.tankAt?.({ x: col, y: row })
    if (tank && tank.side === input.shooter.side) {
      return 'friendly-fire'
    }
    if (tank) {
      return 'blocked'
    }

    col += dx
    row += dy
  }

  const targetTank = input.tankAt?.(to)
  if (targetTank && targetTank.side === input.shooter.side && targetTank.id !== input.target.id) {
    return 'friendly-fire'
  }

  return null
}

function decision(shouldFire: boolean, reason: BotFireDecision['reason'], direction: Direction | null): BotFireDecision {
  return { shouldFire, reason, direction }
}
