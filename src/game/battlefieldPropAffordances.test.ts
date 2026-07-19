import { describe, expect, it } from 'vitest'
import {
  BATTLEFIELD_PROP_AFFORDANCE_CONTRACT,
  getBattlefieldPropAffordance,
  validateBattlefieldPropAffordanceContract,
} from './battlefieldPropAffordances.ts'
import { BATTLEFIELD_PROP_EXAMPLE_IDS } from './battlefieldProps.ts'

describe('battlefield prop affordance contract', () => {
  it('defines one explicit non-authoritative behavior record for every stable prop id', () => {
    expect(validateBattlefieldPropAffordanceContract()).toEqual([])
    expect(BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries).toHaveLength(34)
    expect(new Set(BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries.map((entry) => entry.id))).toEqual(
      new Set(BATTLEFIELD_PROP_EXAMPLE_IDS),
    )
    expect(BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.staticSignalObjectsAreFunctional).toBe(false)
  })

  it('activates concealment and evidence only for the four existing soft-cover props', () => {
    const active = BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries
      .filter((entry) => entry.concealment === 'soft_cover')
      .map((entry) => entry.id)
      .sort()
    expect(active).toEqual(['bush', 'dry_bush', 'reeds_cluster', 'snow_bush'])
    for (const id of active) {
      expect(getBattlefieldPropAffordance(id)).toMatchObject({
        movementCollision: 'none',
        projectileCollision: 'none',
        hardCover: 'none',
        evidence: 'soft_cover_rustle_fire',
      })
    }
  })

  it('marks static signal and hazard-looking art as inactive or broken', () => {
    for (const id of ['relay_tower', 'portable_relay', 'antenna_mast', 'generator', 'emp_emitter', 'signal_jammer']) {
      expect(getBattlefieldPropAffordance(id)?.signal, id).toBe('inactive')
    }
    expect(getBattlefieldPropAffordance('broken_relay')?.signal).toBe('broken')
    for (const id of ['fuel_barrel', 'barbed_wire', 'czech_hedgehog', 'emp_emitter', 'signal_jammer']) {
      expect(getBattlefieldPropAffordance(id)?.hazard, id).toBe('inactive')
    }
  })

  it('never claims destructibility or online support that the runtime does not implement', () => {
    for (const entry of BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries) {
      expect(entry.destructibility, entry.id).toBe('none')
      expect(entry.online, entry.id).toBe('unsupported')
      expect(entry.fog, entry.id).toBe('visible_cells_only')
    }
  })
})
