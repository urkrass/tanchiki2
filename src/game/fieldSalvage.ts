import type { FieldSalvageWreck, FieldSalvageWreckPhase } from './types.ts'

export const FIELD_SALVAGE_CONFIG = {
  salvageableSeconds: 20,
  burnedSeconds: 9,
  shellSeconds: 3.5,
  repairSeconds: 6,
  shellCapacity: 4,
  repairCapacity: 1,
  interruptionSeconds: 0.85,
  activeWreckCap: 8,
  cautiousSeekDistance: 4,
  criticalSeekDistance: 8,
} as const

export function getFieldSalvageWreckPhase(age: number): FieldSalvageWreckPhase {
  return age < FIELD_SALVAGE_CONFIG.salvageableSeconds ? 'salvageable' : 'burned'
}

export function getFieldSalvagePhaseRemaining(wreck: Pick<FieldSalvageWreck, 'age' | 'phase'>) {
  const phaseEnd = wreck.phase === 'salvageable'
    ? FIELD_SALVAGE_CONFIG.salvageableSeconds
    : FIELD_SALVAGE_CONFIG.salvageableSeconds + FIELD_SALVAGE_CONFIG.burnedSeconds
  return Math.max(0, phaseEnd - wreck.age)
}

export function getFieldSalvageDecayRemaining(age: number) {
  return Math.max(
    0,
    FIELD_SALVAGE_CONFIG.salvageableSeconds + FIELD_SALVAGE_CONFIG.burnedSeconds - age,
  )
}

export function isFieldSalvageWreckExpired(age: number) {
  return getFieldSalvageDecayRemaining(age) <= 0
}

export function isFieldSalvageWreckEmpty(
  wreck: Pick<FieldSalvageWreck, 'shellsAvailable' | 'repairsAvailable'>,
) {
  return wreck.shellsAvailable <= 0 && wreck.repairsAvailable <= 0
}
