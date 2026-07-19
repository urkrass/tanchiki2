import { TANK_SIZE } from './constants.ts'
import type { Direction, SavedObjectiveState } from './types.ts'

type FlagState = NonNullable<SavedObjectiveState['flag']>

export const CTF_DROPPED_FLAG_SIGNAL_PERIOD_SECONDS = 24
export const CTF_DROPPED_FLAG_SIGNAL_DURATION_SECONDS = 1.6
export const CTF_CARRIED_FLAG_SIZE = 24

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
  const overlap = 4
  const centeredX = tank.x - 1
  const centeredY = tank.y + 1

  switch (tank.dir) {
    case 'right':
      return {
        x: tank.x - CTF_CARRIED_FLAG_SIZE + overlap,
        y: centeredY,
        size: CTF_CARRIED_FLAG_SIZE,
        mirrorX: true,
      }
    case 'left':
      return {
        x: tank.x + TANK_SIZE - overlap,
        y: centeredY,
        size: CTF_CARRIED_FLAG_SIZE,
        mirrorX: false,
      }
    case 'up':
      return {
        x: centeredX,
        y: tank.y + TANK_SIZE - overlap,
        size: CTF_CARRIED_FLAG_SIZE,
        mirrorX: false,
      }
    case 'down':
      return {
        x: centeredX,
        y: tank.y - CTF_CARRIED_FLAG_SIZE + overlap,
        size: CTF_CARRIED_FLAG_SIZE,
        mirrorX: false,
      }
  }
}
