export type TankClassId = 'scout' | 'engineer' | 'battle'

export type NativeClassKitKind =
  | 'decoy'
  | 'tripwire'
  | 'mine'
  | 'steel'
  | 'bulwark'
  | 'traverse'

export type ClassShellKind = `${TankClassId}-shell`
export type TankDirection = 'up' | 'right' | 'down' | 'left'

export const TANK_CLASS_MECHANICS = {
  grid: {
    tileSize: 32,
    stationaryPivotHoldSeconds: 0.16,
  },
  movement: {
    baseDurationSeconds: 0.38,
    minimumDurationSeconds: 0.22,
    mineSlowMultiplier: 1.7,
    traverseDurationMultiplier: 1.25,
  },
  weapon: {
    baseDamage: 2,
    baseReloadSeconds: 1.6,
    projectileSpeedPixelsPerSecond: 240,
    projectileTtlSeconds: 2.05,
    shellCapacity: 10,
    shellRechargeSeconds: 2,
    battleSplashDamage: 1,
    battleSplashRadiusPixels: 40,
  },
  deployable: {
    placeSeconds: 0.9,
    recoverSeconds: 0.7,
    recoverRangeCells: 1,
    alertTtlSeconds: 4,
    mineTriggerRangeCells: 1,
    mineDamage: 2,
    mineSlowSeconds: 10,
    steelTrapSeconds: 5,
    decoyContactTtlSeconds: 1,
  },
  bulwark: {
    durationSeconds: 5,
    capacity: 3,
    rechargeSeconds: 12,
  },
  traverse: {
    durationSeconds: 4,
    rechargeSeconds: 10,
  },
} as const

export interface SharedTankClassDefinition {
  id: TankClassId
  label: string
  shortLabel: string
  role: string
  moveMultiplier: number
  reloadMultiplier: number
  damageDelta: number
  splashDamage: number
  shellKind: ClassShellKind
  portableRelayLimit: number
  kit: readonly [NativeClassKitKind, NativeClassKitKind]
}

export const DEFAULT_TANK_CLASS: TankClassId = 'engineer'
export const TANK_CLASS_ORDER: readonly TankClassId[] = ['scout', 'engineer', 'battle']

export const SHARED_TANK_CLASS_DEFINITIONS: Record<TankClassId, SharedTankClassDefinition> = {
  scout: {
    id: 'scout',
    label: 'Scout',
    shortLabel: 'SCOUT',
    role: 'FAST RECON',
    moveMultiplier: 0.82,
    reloadMultiplier: 1,
    damageDelta: -1,
    splashDamage: 0,
    shellKind: 'scout-shell',
    portableRelayLimit: 1,
    kit: ['decoy', 'tripwire'],
  },
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    shortLabel: 'ENGINEER',
    role: 'FIELD CONTROL',
    moveMultiplier: 1,
    reloadMultiplier: 1.2,
    damageDelta: 0,
    splashDamage: 0,
    shellKind: 'engineer-shell',
    portableRelayLimit: 2,
    kit: ['mine', 'steel'],
  },
  battle: {
    id: 'battle',
    label: 'Battle Tank',
    shortLabel: 'BATTLE',
    role: 'HEAVY ASSAULT',
    moveMultiplier: 1.22,
    reloadMultiplier: 1,
    damageDelta: 1,
    splashDamage: 1,
    shellKind: 'battle-shell',
    portableRelayLimit: 1,
    kit: ['bulwark', 'traverse'],
  },
}

export function isTankClassId(value: unknown): value is TankClassId {
  return value === 'scout' || value === 'engineer' || value === 'battle'
}

export function normalizeTankClassId(value: unknown): TankClassId {
  return isTankClassId(value) ? value : DEFAULT_TANK_CLASS
}

export function getSharedTankClassDefinition(value: unknown) {
  return SHARED_TANK_CLASS_DEFINITIONS[normalizeTankClassId(value)]
}

export function getSharedTankClassCombatStats(value: unknown) {
  const definition = getSharedTankClassDefinition(value)
  const weapon = TANK_CLASS_MECHANICS.weapon
  const movement = TANK_CLASS_MECHANICS.movement
  return {
    moveDuration: Number(Math.max(
      movement.minimumDurationSeconds,
      movement.baseDurationSeconds * definition.moveMultiplier,
    ).toFixed(3)),
    reloadDuration: Number((weapon.baseReloadSeconds * definition.reloadMultiplier).toFixed(3)),
    damage: Math.max(1, weapon.baseDamage + definition.damageDelta),
    splashDamage: definition.splashDamage,
    splashRadiusPixels: definition.splashDamage > 0 ? weapon.battleSplashRadiusPixels : 0,
    shellKind: definition.shellKind,
  }
}

export interface ClassMechanicsCell {
  col: number
  row: number
}

export type ClassDeployableInteraction =
  | { action: 'place'; col: number; row: number }
  | { action: 'recover'; col: number; row: number }

export function getClassDeployableInteraction(
  tank: ClassMechanicsCell,
  active: ClassMechanicsCell | null,
): ClassDeployableInteraction | null {
  if (!active) return { action: 'place', col: tank.col, row: tank.row }
  if (classCellDistance(tank, active) > TANK_CLASS_MECHANICS.deployable.recoverRangeCells) return null
  return { action: 'recover', col: active.col, row: active.row }
}

export function classCellDistance(a: ClassMechanicsCell, b: ClassMechanicsCell) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
}

export function lateralDirection(facing: TankDirection, side: 'left' | 'right'): TankDirection {
  const order: TankDirection[] = ['up', 'right', 'down', 'left']
  const index = order.indexOf(facing)
  const offset = side === 'left' ? -1 : 1
  return order[(index + offset + order.length) % order.length] ?? facing
}

export function isTraverseMovementDirection(facing: TankDirection, requested: TankDirection) {
  return requested === lateralDirection(facing, 'left') || requested === lateralDirection(facing, 'right')
}
