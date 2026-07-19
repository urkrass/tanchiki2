import { describe, expect, it } from 'vitest'
import {
  getClassEquipmentHudModel,
  type ClassEquipmentHudInput,
} from './classEquipmentHud.ts'
import { getClassEquipmentHudLayout } from './classEquipmentHudRender.ts'
import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, HUD_X, LOGICAL_HEIGHT } from './constants.ts'
import type { OfflineDeployablesSnapshot, PortableRelaySnapshot, TankClassId } from './types.ts'

describe('class equipment HUD model', () => {
  it('maps Scout kit controls and carried counts without inventing finite inventory', () => {
    const model = getClassEquipmentHudModel(makeInput('scout'))

    expect(model.classLabel).toBe('SCOUT')
    expect(model.slots).toMatchObject([
      { kind: 'shell', label: 'SHELLS', count: 10, capacity: 10, state: 'ready' },
      { kind: 'decoy', key: '1', count: 1, capacity: 1, state: 'ready' },
      { kind: 'tripwire', key: '5', count: 1, capacity: 1, state: 'ready' },
      { kind: 'portable-relay', key: 'E', count: 1, capacity: 1, state: 'ready' },
    ])
    expect(model.summary).toContain('SCOUT KIT')
    expect(model.summary).toContain('1 DECOY 1/1 READY')
    expect(model.summary).toContain('5 WIRE 1/1 READY')
  })

  it('shows deployables as out while deployed and zero while placement is held', () => {
    const deployables = makeDeployables(['decoy', 'tripwire'])
    deployables.active.push({ id: 'wire', kind: 'tripwire', col: 4, row: 5, owner: 'player', label: '5 WIRE' })
    deployables.hold = {
      kind: 'decoy',
      action: 'place',
      key: '1',
      col: 4,
      row: 5,
      progress: 0.5,
      duration: 0.9,
      remaining: 0.45,
      label: 'HOLD 1 DECOY',
    }

    const model = getClassEquipmentHudModel({ ...makeInput('scout'), deployables })
    expect(model.slots.find((slot) => slot.kind === 'decoy')).toMatchObject({
      count: 0,
      state: 'hold',
      progress: 0.5,
    })
    expect(model.slots.find((slot) => slot.kind === 'tripwire')).toMatchObject({
      count: 0,
      state: 'out',
    })

    deployables.active = []
    deployables.hold = null
    const returned = getClassEquipmentHudModel({ ...makeInput('scout'), deployables })
    expect(returned.slots.find((slot) => slot.kind === 'tripwire')).toMatchObject({
      count: 1,
      state: 'ready',
    })
  })

  it('tracks Engineer mine, trap, and both remaining relays through existing state', () => {
    const input = makeInput('engineer')
    input.deployables.active = [{ id: 'mine', kind: 'mine', col: 1, row: 1, owner: 'player', label: '2 MINE' }]
    input.portableRelay = makeRelay(1, 2)
    const model = getClassEquipmentHudModel(input)

    expect(model.slots).toMatchObject([
      { kind: 'shell' },
      { kind: 'mine', key: '2', count: 0, state: 'out' },
      { kind: 'steel-trap', key: '4', count: 1, state: 'ready' },
      { kind: 'portable-relay', key: 'E', count: 1, capacity: 2, state: 'ready' },
    ])

    input.portableRelay = makeRelay(2, 2)
    expect(getClassEquipmentHudModel(input).slots.at(-1)).toMatchObject({ count: 0, state: 'out' })
  })

  it('combines Battle heavy shell and splash into HE ammo with exact shield points', () => {
    const input = makeInput('battle')
    input.shells = 2
    input.shield = 3
    const model = getClassEquipmentHudModel(input)

    expect(model.slots).toMatchObject([
      { kind: 'he-shell', label: 'HE SHELL', count: 2, capacity: 10, state: 'low' },
      { kind: 'shield', label: 'SHIELD', count: 3, capacity: null, state: 'ready', passive: true },
      { kind: 'portable-relay', count: 1, capacity: 1 },
    ])
    expect(model.summary).not.toContain('SPLASH')
  })

  it('surfaces shell recharge and relay hold progress without changing their counts', () => {
    const input = makeInput('battle')
    input.shells = 0
    input.onAmmoStation = true
    input.shellRechargeProgress = 0.42
    input.portableRelay = makeRelay(1, 1, 0.65)
    const model = getClassEquipmentHudModel(input)

    expect(model.slots[0]).toMatchObject({ state: 'empty', count: 0, progress: 0.42 })
    expect(model.slots.at(-1)).toMatchObject({ state: 'hold', count: 0, progress: 0.65 })
  })

  it.each(['scout', 'engineer', 'battle'] satisfies TankClassId[])(
    'keeps the %s strip within the existing bottom HUD without slot overlap',
    (tankClass) => {
      const model = getClassEquipmentHudModel(makeInput(tankClass))
      const stripX = ARENA_X + 6
      const stripY = ARENA_Y + ARENA_HEIGHT + 2
      const layout = getClassEquipmentHudLayout(model, ARENA_WIDTH - 12)

      expect(stripX + layout.width).toBeLessThan(HUD_X)
      expect(stripY + layout.height).toBeLessThanOrEqual(LOGICAL_HEIGHT)
      expect(layout.slots[0]?.x).toBe(0)
      expect(layout.slots.at(-1)!.x + layout.slots.at(-1)!.width).toBeCloseTo(layout.width)
      layout.slots.slice(1).forEach((slot, index) => {
        const previous = layout.slots[index]
        expect(previous.x + previous.width).toBeCloseTo(slot.x)
      })
    },
  )

  it('fits the development Test Tank and all six equipment slots in the same bottom strip', () => {
    const input = makeInput('battle')
    input.classLabel = 'TEST TANK'
    input.deployables.available = ['decoy', 'tripwire', 'mine', 'steel']
    input.shield = 3
    input.portableRelay = makeRelay(0, 2)
    const model = getClassEquipmentHudModel(input)
    const layout = getClassEquipmentHudLayout(model, ARENA_WIDTH - 12)

    expect(model.classLabel).toBe('TEST TANK')
    expect(model.slots.map((slot) => slot.kind)).toEqual([
      'he-shell',
      'decoy',
      'tripwire',
      'mine',
      'steel-trap',
      'shield',
      'portable-relay',
    ])
    expect(layout.compact).toBe(true)
    expect(layout.slots).toHaveLength(7)
    expect(layout.slots.at(-1)!.x + layout.slots.at(-1)!.width).toBeCloseTo(layout.width)
  })
})

function makeInput(tankClass: TankClassId): ClassEquipmentHudInput {
  const available = tankClass === 'scout'
    ? ['decoy', 'tripwire'] as const
    : tankClass === 'engineer'
      ? ['mine', 'steel'] as const
      : []
  return {
    tankClass,
    shells: 10,
    shellCapacity: 10,
    shellRechargeProgress: 0,
    onAmmoStation: false,
    shield: tankClass === 'battle' ? 1 : 0,
    deployables: makeDeployables([...available]),
    portableRelay: makeRelay(0, tankClass === 'engineer' ? 2 : 1),
  }
}

function makeDeployables(available: OfflineDeployablesSnapshot['available']): OfflineDeployablesSnapshot {
  return {
    active: [],
    available,
    hold: null,
    alerts: [],
    label: available.length > 0 ? `GEAR 0/${available.length}` : 'GEAR NONE',
  }
}

function makeRelay(activeCount: number, limit: number, holdProgress: number | null = null): PortableRelaySnapshot {
  return {
    available: activeCount < limit,
    deployed: activeCount > 0,
    col: activeCount > 0 ? 1 : null,
    row: activeCount > 0 ? 1 : null,
    activeCount,
    limit,
    relays: Array.from({ length: activeCount }, (_, index) => ({ id: `relay-${index}`, col: index, row: 1 })),
    status: holdProgress === null ? activeCount > 0 ? 'deployed' : 'ready' : 'recovering',
    label: 'RELAY',
    hold: holdProgress === null
      ? null
      : {
          action: 'recover',
          col: 1,
          row: 1,
          progress: holdProgress,
          duration: 0.85,
          remaining: 0.2,
          label: 'HOLD E PICKUP',
        },
    waveCount: 0,
    signalContacts: [],
    waves: [],
  }
}
