import type { OfflineDeployableKind, TankClassId } from './types.ts'

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

export const DEFAULT_TANK_CLASS: TankClassId = 'engineer'
export const TANK_CLASS_ORDER: TankClassId[] = ['scout', 'engineer', 'battle']

export const TANK_CLASS_DEFINITIONS: Record<TankClassId, TankClassDefinition> = {
  scout: {
    id: 'scout',
    label: 'Scout',
    shortLabel: 'SCOUT',
    role: 'fast recon',
    description: 'Fast movement, lighter shells, decoys and wires.',
    strategy: 'Take objectives first, scout pursuit routes, and disengage before heavier armor can settle the fight.',
    strength: 'Fastest route control and pursuit warning.',
    caution: 'Light shells make head-on duels costly.',
    projectileLabel: 'Light AP Shell',
    moveMultiplier: 0.82,
    minMoveDuration: 0.22,
    reloadMultiplier: 1,
    damageDelta: -1,
    splash: false,
    shieldPoints: 0,
    portableRelayLimit: 1,
    deployables: ['decoy', 'tripwire'],
    equipment: ['Decoy', 'Wire', '1 relay'],
  },
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    shortLabel: 'ENGINEER',
    role: 'field control',
    description: 'Balanced movement, slower reload, mines, traps, and two relays.',
    strategy: 'Shape the battlefield before contact, then fight from routes covered by mines, traps, and relays.',
    strength: 'Best prepared-area control and relay coverage.',
    caution: 'The slower reload punishes exposed follow-up shots.',
    projectileLabel: 'Utility AP Shell',
    moveMultiplier: 1,
    minMoveDuration: 0.22,
    reloadMultiplier: 1.2,
    damageDelta: 0,
    splash: false,
    shieldPoints: 0,
    portableRelayLimit: 2,
    deployables: ['mine', 'steel'],
    equipment: ['Mine', 'Trap', '2 relays'],
  },
  battle: {
    id: 'battle',
    label: 'Battle Tank',
    shortLabel: 'BATTLE',
    role: 'heavy assault',
    description: 'Slow movement, heavy shells, explosive hits.',
    strategy: 'Commit to a breach, absorb the opening hit, and use heavy explosive shells to break clustered cover.',
    strength: 'Hardest opening exchange and strongest direct hit.',
    caution: 'Slow speed punishes a failed commitment.',
    projectileLabel: 'Heavy HE Shell',
    moveMultiplier: 1.22,
    minMoveDuration: 0.22,
    reloadMultiplier: 1,
    damageDelta: 1,
    splash: true,
    shieldPoints: 1,
    portableRelayLimit: 1,
    deployables: [],
    equipment: ['Heavy shell', 'Splash hit', 'Shield 1', '1 relay'],
  },
}

export function normalizeTankClassId(value: unknown): TankClassId {
  return value === 'scout' || value === 'engineer' || value === 'battle' ? value : DEFAULT_TANK_CLASS
}

export function getTankClassDefinition(id: unknown) {
  return TANK_CLASS_DEFINITIONS[normalizeTankClassId(id)]
}
