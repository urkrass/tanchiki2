import { TANK_SIZE } from './constants.ts'
import type { Direction, SavedObjectiveState } from './types.ts'

type FlagState = NonNullable<SavedObjectiveState['flag']>

export const CTF_DROPPED_FLAG_SIGNAL_PERIOD_SECONDS = 24
export const CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS = 1.6
export const CTF_CARRIED_FLAG_SIZE = 24

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

export function isCtfFlagAtHome(flag: FlagState) {
  return flag.position.x === flag.enemyHome.x && flag.position.y === flag.enemyHome.y
}

export function isCtfFlagDropped(flag: FlagState) {
  return flag.carrierId === null && !isCtfFlagAtHome(flag)
}

export function getDroppedFlagSignalProgress(time: number, droppedAt: number | undefined) {
  if (droppedAt === undefined || !Number.isFinite(droppedAt)) {
    return null
  }

  const elapsed = Math.max(0, time - droppedAt)
  const phase = elapsed % CTF_DROPPED_FLAG_SIGNAL_PERIOD_SECONDS
  if (phase > CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS) {
    return null
  }

  return Math.min(1, phase / CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS)
}

export function getCarriedFlagPlacement(tank: { x: number; y: number; dir: Direction }) {
  const vector = DIRECTION_VECTORS[tank.dir]
  const centerX = tank.x + TANK_SIZE / 2
  const centerY = tank.y + TANK_SIZE / 2
  const rearDistance = TANK_SIZE * 0.42
  const anchorX = centerX - vector.x * rearDistance
  const anchorY = centerY - vector.y * rearDistance

  return {
    x: anchorX - CTF_CARRIED_FLAG_SIZE * 0.34,
    y: anchorY - CTF_CARRIED_FLAG_SIZE * 0.78,
    size: CTF_CARRIED_FLAG_SIZE,
  }
}
