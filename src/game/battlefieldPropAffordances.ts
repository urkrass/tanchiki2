import affordanceJson from './assets/battlefield-prop-affordances.json'
import { BATTLEFIELD_PROP_EXAMPLE_IDS, type BattlefieldPropSpriteId } from './battlefieldProps.ts'

export type PropTerrainBehavior = 'none' | 'terrain_backed'
export type PropConcealment = 'none' | 'soft_cover'
export type PropInactiveBehavior = 'none' | 'inactive'
export type PropEvidenceBehavior = 'none' | 'soft_cover_rustle_fire'
export type PropSignalBehavior = 'none' | 'inactive' | 'broken'
export type PropAffordanceCue =
  | 'terrain_backed_blocker'
  | 'soft_cover'
  | 'inactive'
  | 'broken'
  | 'historical'
  | 'decorative'

export interface BattlefieldPropAffordance {
  id: BattlefieldPropSpriteId
  movementCollision: PropTerrainBehavior
  projectileCollision: PropTerrainBehavior
  hardCover: PropTerrainBehavior
  concealment: PropConcealment
  destructibility: 'none'
  hazard: PropInactiveBehavior
  evidence: PropEvidenceBehavior
  signal: PropSignalBehavior
  fog: 'visible_cells_only'
  online: 'unsupported'
  cue: PropAffordanceCue
}

export interface BattlefieldPropAffordanceContract {
  version: number
  stablePropCount: number
  staticSignalObjectsAreFunctional: false
  entries: BattlefieldPropAffordance[]
}

export const BATTLEFIELD_PROP_AFFORDANCE_CONTRACT = affordanceJson as BattlefieldPropAffordanceContract
const AFFORDANCE_BY_ID = new Map(BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries.map((entry) => [entry.id, entry]))

export function getBattlefieldPropAffordance(id: string) {
  return AFFORDANCE_BY_ID.get(id as BattlefieldPropSpriteId) ?? null
}

export function validateBattlefieldPropAffordanceContract(
  contract: BattlefieldPropAffordanceContract = BATTLEFIELD_PROP_AFFORDANCE_CONTRACT,
) {
  const errors: string[] = []
  const expectedIds = new Set<string>(BATTLEFIELD_PROP_EXAMPLE_IDS)
  const seen = new Set<string>()

  if (contract.stablePropCount !== BATTLEFIELD_PROP_EXAMPLE_IDS.length) {
    errors.push(`Affordance contract must preserve ${BATTLEFIELD_PROP_EXAMPLE_IDS.length} stable prop ids.`)
  }
  if (contract.staticSignalObjectsAreFunctional !== false) {
    errors.push('Static signal prop art must never claim functional relay behavior.')
  }

  for (const entry of contract.entries) {
    if (!expectedIds.has(entry.id)) errors.push(`Unexpected affordance prop id: ${entry.id}`)
    if (seen.has(entry.id)) errors.push(`Duplicate affordance prop id: ${entry.id}`)
    seen.add(entry.id)
    if (entry.fog !== 'visible_cells_only') errors.push(`Prop ${entry.id} must use strict visible-cell fog clipping.`)
    if (entry.online !== 'unsupported') errors.push(`Prop ${entry.id} must not imply online protocol support.`)
    if (entry.destructibility !== 'none') errors.push(`Prop ${entry.id} must not imply unimplemented destructibility.`)
    if (entry.concealment === 'soft_cover' && entry.cue !== 'soft_cover') {
      errors.push(`Soft-cover prop ${entry.id} must use the soft-cover cue.`)
    }
    if (entry.cue === 'terrain_backed_blocker') {
      if (entry.movementCollision !== 'terrain_backed' || entry.projectileCollision !== 'terrain_backed' || entry.hardCover !== 'terrain_backed') {
        errors.push(`Terrain-backed blocker ${entry.id} must delegate all hard-blocking behavior to terrain.`)
      }
    }
  }

  for (const id of expectedIds) {
    if (!seen.has(id)) errors.push(`Missing affordance contract for prop: ${id}`)
  }
  return errors
}
