import { describe, expect, it } from 'vitest'
import {
  CLASS_EQUIPMENT_CANONICAL_SIZE,
  CLASS_EQUIPMENT_VISUAL_CONTRACT,
  drawClassEquipmentIcon,
  validateClassEquipmentVisualContract,
} from './classEquipmentVisual.ts'

describe('class equipment visual contract', () => {
  it('keeps all class-kit artwork on one canonical dense source grid', () => {
    expect(CLASS_EQUIPMENT_CANONICAL_SIZE).toBe(48)
    expect(validateClassEquipmentVisualContract()).toEqual([])
    expect(CLASS_EQUIPMENT_VISUAL_CONTRACT.map((entry) => entry.id)).toEqual([
      'decoy',
      'tripwire',
      'mine',
      'steel',
      'shell',
      'he-shell',
      'shield',
    ])
  })

  it('keeps every silhouette within bounds and physically detailed', () => {
    for (const entry of CLASS_EQUIPMENT_VISUAL_CONTRACT) {
      expect(entry.bounds.x + entry.bounds.w).toBeLessThanOrEqual(48)
      expect(entry.bounds.y + entry.bounds.h).toBeLessThanOrEqual(48)
      expect(entry.militaryDetails.length).toBeGreaterThanOrEqual(3)
    }
    expect(CLASS_EQUIPMENT_VISUAL_CONTRACT.find((entry) => entry.id === 'tripwire')?.militaryDetails)
      .toEqual(expect.arrayContaining(['insulators', 'trigger box']))
    expect(CLASS_EQUIPMENT_VISUAL_CONTRACT.find((entry) => entry.id === 'steel')?.militaryDetails)
      .toEqual(expect.arrayContaining(['springs', 'anchor chain']))
  })

  it('rejects missing IDs, overflow, and underspecified artwork', () => {
    expect(validateClassEquipmentVisualContract(CLASS_EQUIPMENT_VISUAL_CONTRACT.slice(0, -1)))
      .toContain('Class equipment visual IDs do not match the canonical kit.')
    expect(validateClassEquipmentVisualContract([
      ...CLASS_EQUIPMENT_VISUAL_CONTRACT.slice(0, -1),
      { id: 'shield', bounds: { x: 20, y: 20, w: 40, h: 40 }, militaryDetails: ['plate'] },
    ])).toEqual(expect.arrayContaining([
      'shield exceeds its canonical 48-unit bounds.',
      'shield lacks the required military construction detail.',
    ]))
  })

  it('renders every atlas identifier deterministically at HUD and battlefield sizes', () => {
    for (const entry of CLASS_EQUIPMENT_VISUAL_CONTRACT) {
      for (const size of [24, 48]) {
        const first = recordIconDraw(entry.id, size)
        const second = recordIconDraw(entry.id, size)
        expect(first).toEqual(second)
        expect(first.some(([operation]) => operation === 'fillRect')).toBe(true)
        expect(first.at(-1)).toEqual(['restore'])
      }
    }
  })
})

function recordIconDraw(kind: (typeof CLASS_EQUIPMENT_VISUAL_CONTRACT)[number]['id'], size: number) {
  const operations: Array<[string, ...unknown[]]> = []
  const context = new Proxy<Record<string, unknown>>({}, {
    get: (_target, property) => (...args: unknown[]) => {
      operations.push([String(property), ...args])
    },
    set: (_target, property, value) => {
      operations.push([`set:${String(property)}`, value])
      return true
    },
  }) as unknown as CanvasRenderingContext2D

  drawClassEquipmentIcon(context, kind, 7, 11, size, {
    active: true,
    teamColor: '#86f4ff',
  })
  return operations
}
