import { getTankClassDefinition } from './tankClasses.ts'
import type {
  OfflineDeployableKind,
  OfflineDeployablesSnapshot,
  PortableRelaySnapshot,
  TankClassId,
} from './types.ts'

export type ClassEquipmentHudSlotKind =
  | 'shell'
  | 'he-shell'
  | 'decoy'
  | 'tripwire'
  | 'mine'
  | 'steel-trap'
  | 'shield'

export type ClassEquipmentHudSlotState =
  | 'ready'
  | 'out'
  | 'hold'
  | 'low'
  | 'empty'
  | 'recharging'

export interface ClassEquipmentHudSlot {
  kind: ClassEquipmentHudSlotKind
  label: string
  key: string | null
  count: number
  capacity: number | null
  state: ClassEquipmentHudSlotState
  progress: number | null
  passive: boolean
}

export interface ClassEquipmentHudModel {
  tankClass: TankClassId
  classLabel: string
  slots: ClassEquipmentHudSlot[]
  summary: string
}

export interface ClassEquipmentHudInput {
  tankClass: TankClassId
  classLabel?: string
  shells: number
  shellCapacity: number
  shellRechargeProgress: number
  onAmmoStation: boolean
  shield: number
  deployables: OfflineDeployablesSnapshot
}

const DEPLOYABLE_PRESENTATION: Partial<Record<
  OfflineDeployableKind,
  { kind: ClassEquipmentHudSlotKind; label: string; key: string }
>> = {
  decoy: { kind: 'decoy', label: 'DECOY', key: '1' },
  mine: { kind: 'mine', label: 'MINE', key: '2' },
  steel: { kind: 'steel-trap', label: 'TRAP', key: '4' },
  tripwire: { kind: 'tripwire', label: 'WIRE', key: '5' },
}

export function getClassEquipmentHudModel(input: ClassEquipmentHudInput): ClassEquipmentHudModel {
  const definition = getTankClassDefinition(input.tankClass)
  const classLabel = input.classLabel ?? definition.shortLabel
  const slots: ClassEquipmentHudSlot[] = [
    createShellSlot(input),
    ...input.deployables.available.flatMap((kind) => {
      const presentation = DEPLOYABLE_PRESENTATION[kind]
      return presentation ? [createDeployableSlot(kind, presentation, input.deployables)] : []
    }),
  ]

  // Shield equipment artwork and slot support stay available for a future
  // treatment. The top shield bar is the canonical readout for now.

  return {
    tankClass: input.tankClass,
    classLabel,
    slots,
    summary: `${classLabel} KIT | ${slots.map(formatClassEquipmentHudSlot).join(' | ')}`,
  }
}

export function formatClassEquipmentHudSlot(slot: ClassEquipmentHudSlot) {
  const keyedLabel = slot.key ? `${slot.key} ${slot.label}` : slot.label
  const quantity = slot.capacity === null ? String(slot.count) : `${slot.count}/${slot.capacity}`
  return `${keyedLabel} ${quantity} ${slot.state.toUpperCase()}`
}

function createShellSlot(input: ClassEquipmentHudInput): ClassEquipmentHudSlot {
  const count = Math.max(0, Math.floor(input.shells))
  const capacity = Math.max(1, Math.floor(input.shellCapacity))
  const recharging = input.onAmmoStation && count < capacity
  const state: ClassEquipmentHudSlotState = count <= 0
    ? 'empty'
    : recharging
      ? 'recharging'
      : count <= 2
        ? 'low'
        : 'ready'

  return {
    kind: input.tankClass === 'battle' ? 'he-shell' : 'shell',
    label: input.tankClass === 'battle' ? 'HE SHELL' : 'SHELLS',
    key: 'SPACE',
    count,
    capacity,
    state,
    progress: recharging ? clamp01(input.shellRechargeProgress) : null,
    passive: false,
  }
}

function createDeployableSlot(
  deployableKind: OfflineDeployableKind,
  presentation: { kind: ClassEquipmentHudSlotKind; label: string; key: string },
  deployables: OfflineDeployablesSnapshot,
): ClassEquipmentHudSlot {
  const active = deployables.active.some((deployable) => deployable.kind === deployableKind)
  const hold = deployables.hold?.kind === deployableKind ? deployables.hold : null
  const count = active || hold?.action === 'place' ? 0 : 1

  return {
    kind: presentation.kind,
    label: presentation.label,
    key: presentation.key,
    count,
    capacity: 1,
    state: hold ? 'hold' : active ? 'out' : 'ready',
    progress: hold ? clamp01(hold.progress) : null,
    passive: false,
  }
}

export function getUniversalRelayHudModel(relay: PortableRelaySnapshot) {
  const remaining = Math.max(0, relay.limit - relay.activeCount)
  return {
    activeCount: relay.activeCount,
    remaining,
    limit: Math.max(0, relay.limit),
    state: relay.hold ? 'hold' as const : remaining > 0 ? 'ready' as const : 'out' as const,
    progress: relay.hold ? clamp01(relay.hold.progress) : null,
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}
