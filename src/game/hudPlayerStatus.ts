import type { MajorModsSnapshot } from './types.ts'

export type OverdriveHudPhase = 'ready' | 'active' | 'recharging'

export interface OverdriveHudModel {
  phase: OverdriveHudPhase
  label: 'OVERDRIVE' | 'REGEN'
  value: string
  progress: number
}

export function getOverdriveHudModel(
  overdrive: MajorModsSnapshot['overdrive'],
): OverdriveHudModel {
  if (overdrive.active) {
    const duration = Math.max(0.01, overdrive.duration)
    return {
      phase: 'active',
      label: 'OVERDRIVE',
      value: `${Math.max(1, Math.ceil(overdrive.remaining))}s`,
      progress: clamp01(overdrive.remaining / duration),
    }
  }

  if (overdrive.ready) {
    return {
      phase: 'ready',
      label: 'OVERDRIVE',
      value: 'RDY',
      progress: 1,
    }
  }

  const rechargeDuration = Math.max(0.01, overdrive.rechargeDuration)
  return {
    phase: 'recharging',
    label: 'REGEN',
    value: `${Math.max(1, Math.ceil(overdrive.cooldown))}s`,
    progress: clamp01(1 - overdrive.cooldown / rechargeDuration),
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
