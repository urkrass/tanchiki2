import {
  BATTLEFIELD_PROP_MANIFEST,
  type BattlefieldPropSpriteDefinition,
  type BattlefieldPropSpriteId,
} from './battlefieldProps.ts'
import type { SoftCoverDisturbanceReason, TankClassId } from './types.ts'

export const SOFT_COVER_STATIONARY_VISIBILITY_MULTIPLIER = 0.68
export const SOFT_COVER_MOVING_VISIBILITY_MULTIPLIER = 0.94
export const SOFT_COVER_REVEAL_DURATION_SECONDS = 1.25
export const SOFT_COVER_DISTURBANCE_TTL_SECONDS = 3
export const SOFT_COVER_CLOSE_DETECTION_RADIUS = 1.2

const SOFT_COVER_PROP_DISTURBANCE_MULTIPLIER: Partial<Record<BattlefieldPropSpriteId, number>> = {
  reeds_cluster: 1.16,
  bush: 1,
  dry_bush: 1.22,
  snow_bush: 0.92,
}

const SOFT_COVER_PROP_LABEL: Partial<Record<BattlefieldPropSpriteId, string>> = {
  reeds_cluster: 'REEDS',
  bush: 'BUSH',
  dry_bush: 'DRY RUSTLE',
  snow_bush: 'SNOW RUSTLE',
}

export function isSoftCoverPropDefinition(definition: BattlefieldPropSpriteDefinition | null | undefined) {
  return definition?.category === 'soft_cover_vegetation' && definition.mechanicalRole === 'soft_cover'
}

export function getSoftCoverPropIds(manifest = BATTLEFIELD_PROP_MANIFEST) {
  return manifest.sprites
    .filter(isSoftCoverPropDefinition)
    .map((sprite) => sprite.id)
    .sort()
}

export function getSoftCoverVisibilityMultiplier(input: {
  inSoftCover: boolean
  moving: boolean
  now: number
  revealedUntil?: number
}) {
  if (!input.inSoftCover || input.now < (input.revealedUntil ?? 0)) {
    return 1
  }

  return input.moving ? SOFT_COVER_MOVING_VISIBILITY_MULTIPLIER : SOFT_COVER_STATIONARY_VISIBILITY_MULTIPLIER
}

export function isSoftCoverConcealed(input: {
  inSoftCover: boolean
  moving: boolean
  now: number
  revealedUntil?: number
}) {
  return getSoftCoverVisibilityMultiplier(input) < 0.9
}

export function getSoftCoverTankClassMultiplier(classId: TankClassId | null | undefined) {
  if (classId === 'scout') return 0.78
  if (classId === 'battle') return 1.3
  return 1
}

export function getSoftCoverPropDisturbanceMultiplier(spriteId: string) {
  return SOFT_COVER_PROP_DISTURBANCE_MULTIPLIER[spriteId as BattlefieldPropSpriteId] ?? 1
}

export function getSoftCoverDisturbanceStrength(classId: TankClassId | null | undefined, spriteId: string, reason: SoftCoverDisturbanceReason) {
  const reasonMultiplier = reason === 'firing' ? 1.45 : 1
  return clamp(
    getSoftCoverTankClassMultiplier(classId) *
      getSoftCoverPropDisturbanceMultiplier(spriteId) *
      reasonMultiplier,
    0.45,
    1.6,
  )
}

export function getSoftCoverLabel(spriteId: string, reason: SoftCoverDisturbanceReason) {
  if (reason === 'firing') {
    return 'COVER SHOT'
  }

  return SOFT_COVER_PROP_LABEL[spriteId as BattlefieldPropSpriteId] ?? 'RUSTLE'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
