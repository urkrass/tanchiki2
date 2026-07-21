import type { BattleTankKitSnapshot, Direction, Tank } from './types.ts'

export const BULWARK_DURATION_SECONDS = 5
export const BULWARK_CAPACITY = 3
export const BULWARK_RECHARGE_SECONDS = 12
export const BULWARK_TOTAL_CYCLE_SECONDS = BULWARK_DURATION_SECONDS + BULWARK_RECHARGE_SECONDS

export const TRAVERSE_DURATION_SECONDS = 4
export const TRAVERSE_RECHARGE_SECONDS = 10
export const TRAVERSE_TOTAL_CYCLE_SECONDS = TRAVERSE_DURATION_SECONDS + TRAVERSE_RECHARGE_SECONDS
// A 1.25 duration multiplier is exactly 80% of normal travel speed.
export const TRAVERSE_MOVE_MULTIPLIER = 1.25

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

export function lateralDirection(facing: Direction, side: 'left' | 'right'): Direction {
  const order: Direction[] = ['up', 'right', 'down', 'left']
  const index = order.indexOf(facing)
  const offset = side === 'left' ? -1 : 1
  return order[(index + offset + order.length) % order.length] ?? facing
}

function roundTimer(value: number) {
  return Number(Math.max(0, value).toFixed(2))
}
