import type { FieldSalvageWreck, FieldSalvageWreckPhase } from './types.ts'

export interface FieldSalvageProgressBar {
  resource: 'shell' | 'repair'
  trackOffsetX: number
  trackWidth: number
  fillOffsetX: number
  fillWidth: number
}

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

export function getFieldSalvageProgressBars(input: {
  shellActive: boolean
  repairActive: boolean
  shellProgressRatio: number
  repairProgressRatio: number
}): FieldSalvageProgressBar[] {
  const activeResources = [
    input.shellActive ? { resource: 'shell' as const, ratio: input.shellProgressRatio } : null,
    input.repairActive ? { resource: 'repair' as const, ratio: input.repairProgressRatio } : null,
  ].filter((resource): resource is { resource: 'shell' | 'repair'; ratio: number } => resource !== null)

  if (activeResources.length === 1) {
    const active = activeResources[0]
    return [{
      resource: active.resource,
      trackOffsetX: -14,
      trackWidth: 28,
      fillOffsetX: -13,
      fillWidth: Math.round(26 * clampProgress(active.ratio)),
    }]
  }

  return activeResources.map((active, index) => ({
    resource: active.resource,
    trackOffsetX: index === 0 ? -14 : 1,
    trackWidth: 13,
    fillOffsetX: index === 0 ? -13 : 2,
    fillWidth: Math.round(11 * clampProgress(active.ratio)),
  }))
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(1, value))
}
