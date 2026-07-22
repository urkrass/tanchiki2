import type { BattleTankKitSnapshot, Tank } from './types.ts'
import {
  TANK_CLASS_MECHANICS,
  lateralDirection,
} from '../../packages/shared/src/tankClasses.ts'

export const BULWARK_DURATION_SECONDS = TANK_CLASS_MECHANICS.bulwark.durationSeconds
export const BULWARK_CAPACITY = TANK_CLASS_MECHANICS.bulwark.capacity
export const BULWARK_RECHARGE_SECONDS = TANK_CLASS_MECHANICS.bulwark.rechargeSeconds
export const BULWARK_TOTAL_CYCLE_SECONDS = BULWARK_DURATION_SECONDS + BULWARK_RECHARGE_SECONDS

export const TRAVERSE_DURATION_SECONDS = TANK_CLASS_MECHANICS.traverse.durationSeconds
export const TRAVERSE_RECHARGE_SECONDS = TANK_CLASS_MECHANICS.traverse.rechargeSeconds
export const TRAVERSE_TOTAL_CYCLE_SECONDS = TRAVERSE_DURATION_SECONDS + TRAVERSE_RECHARGE_SECONDS
// A 1.25 duration multiplier is exactly 80% of normal travel speed.
export const TRAVERSE_MOVE_MULTIPLIER = TANK_CLASS_MECHANICS.movement.traverseDurationMultiplier

export { lateralDirection }

export function createBattleTankKitSnapshot(
  tank: Pick<
    Tank,
    | 'classId'
    | 'dir'
    | 'bulwarkRemaining'
    | 'bulwarkCapacity'
    | 'bulwarkCooldown'
    | 'traverseRemaining'
    | 'traverseCooldown'
  >,
): BattleTankKitSnapshot {
  const available = tank.classId === 'battle'
  return {
    available,
    bulwark: {
      active: available && tank.bulwarkRemaining > 0 && tank.bulwarkCapacity > 0,
      remaining: roundTimer(tank.bulwarkRemaining),
      capacity: Math.max(0, Math.floor(tank.bulwarkCapacity)),
      maxCapacity: BULWARK_CAPACITY,
      cooldown: roundTimer(tank.bulwarkCooldown),
      duration: BULWARK_DURATION_SECONDS,
      rechargeDuration: BULWARK_RECHARGE_SECONDS,
      ready: available && tank.bulwarkCooldown <= 0,
    },
    traverse: {
      active: available && tank.traverseRemaining > 0,
      remaining: roundTimer(tank.traverseRemaining),
      cooldown: roundTimer(tank.traverseCooldown),
      duration: TRAVERSE_DURATION_SECONDS,
      rechargeDuration: TRAVERSE_RECHARGE_SECONDS,
      ready: available && tank.traverseCooldown <= 0,
      facing: tank.dir,
    },
    label: available ? '1 BULWARK | 2 TRAVERSE' : 'BATTLE KIT UNAVAILABLE',
  }
}

function roundTimer(value: number) {
  return Number(Math.max(0, value).toFixed(2))
}
