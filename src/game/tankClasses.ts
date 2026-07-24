import type { OfflineDeployableKind, TankClassId } from './types.ts'
import {
  DEFAULT_TANK_CLASS,
  SHARED_TANK_CLASS_DEFINITIONS,
  TANK_CLASS_MECHANICS,
  TANK_CLASS_ORDER as SHARED_TANK_CLASS_ORDER,
  normalizeTankClassId as normalizeSharedTankClassId,
} from '../../packages/shared/src/tankClasses.ts'

export interface TankClassDefinition {
  id: TankClassId
  label: string
  shortLabel: string
  role: string
  description: string
  strategy: string
  strength: string
  caution: string
  projectileLabel: string
  moveMultiplier: number
  minMoveDuration: number
  reloadMultiplier: number
  damageDelta: number
  splash: boolean
  shieldPoints: number
  portableRelayLimit: number
  deployables: OfflineDeployableKind[]
  equipment: string[]
}

export { DEFAULT_TANK_CLASS }
export const TANK_CLASS_ORDER: TankClassId[] = [...SHARED_TANK_CLASS_ORDER]

export const TANK_CLASS_DEFINITIONS: Record<TankClassId, TankClassDefinition> = {
  scout: {
    id: 'scout',
    label: 'Scout',
    shortLabel: 'SCOUT',
    role: 'fast recon',
    description: 'Fast movement, lighter shells, decoys and wires.',
    strategy: 'Seize routes, seed warnings, then break contact.',
    strength: 'Fast route control',
    caution: 'Avoid head-on duels',
    projectileLabel: 'Light AP Shell',
    moveMultiplier: SHARED_TANK_CLASS_DEFINITIONS.scout.moveMultiplier,
    minMoveDuration: TANK_CLASS_MECHANICS.movement.minimumDurationSeconds,
    reloadMultiplier: SHARED_TANK_CLASS_DEFINITIONS.scout.reloadMultiplier,
    damageDelta: SHARED_TANK_CLASS_DEFINITIONS.scout.damageDelta,
    splash: false,
    shieldPoints: 0,
    portableRelayLimit: SHARED_TANK_CLASS_DEFINITIONS.scout.portableRelayLimit,
    deployables: ['decoy', 'tripwire'],
    equipment: ['Decoy', 'Wire', '1 relay'],
  },
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    shortLabel: 'ENGINEER',
    role: 'field control',
    description: 'Balanced movement, slower reload, mines, traps, and two relays.',
    strategy: 'Prepare lanes and force enemies through your kit.',
    strength: 'Prepared lane control',
    caution: 'Reload from cover',
    projectileLabel: 'Utility AP Shell',
    moveMultiplier: SHARED_TANK_CLASS_DEFINITIONS.engineer.moveMultiplier,
    minMoveDuration: TANK_CLASS_MECHANICS.movement.minimumDurationSeconds,
    reloadMultiplier: SHARED_TANK_CLASS_DEFINITIONS.engineer.reloadMultiplier,
    damageDelta: SHARED_TANK_CLASS_DEFINITIONS.engineer.damageDelta,
    splash: false,
    shieldPoints: 0,
    portableRelayLimit: SHARED_TANK_CLASS_DEFINITIONS.engineer.portableRelayLimit,
    deployables: ['mine', 'steel'],
    equipment: ['Mine', 'Trap', '2 relays'],
  },
  battle: {
    id: 'battle',
    label: 'Battle Tank',
    shortLabel: 'BATTLE',
    role: 'heavy assault',
    description: 'Slow heavy gun with a timed field and lateral firing stance.',
    strategy: 'Anchor the line, time Bulwark, then strafe without losing aim.',
    strength: 'Mobile heavy battery',
    caution: 'Mazes and cooldowns',
    projectileLabel: 'Heavy HE Shell',
    moveMultiplier: SHARED_TANK_CLASS_DEFINITIONS.battle.moveMultiplier,
    minMoveDuration: TANK_CLASS_MECHANICS.movement.minimumDurationSeconds,
    reloadMultiplier: SHARED_TANK_CLASS_DEFINITIONS.battle.reloadMultiplier,
    damageDelta: SHARED_TANK_CLASS_DEFINITIONS.battle.damageDelta,
    splash: true,
    shieldPoints: 0,
    portableRelayLimit: SHARED_TANK_CLASS_DEFINITIONS.battle.portableRelayLimit,
    deployables: [],
    equipment: ['Bulwark Field', 'Traverse Mode', 'Heavy HE', '1 relay'],
  },
}

export function normalizeTankClassId(value: unknown): TankClassId {
  return normalizeSharedTankClassId(value)
}

export function getTankClassDefinition(id: unknown) {
  return TANK_CLASS_DEFINITIONS[normalizeTankClassId(id)]
}
