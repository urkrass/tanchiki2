import { describe, expect, it } from 'vitest'
import { assertFogSafeSnapshot } from './online-bot.mjs'

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    team: 'blue',
    visibleCells: [{ col: 19, row: 5 }],
    visibleTerrain: [{ col: 19, row: 5, kind: 'empty' }],
    retranslators: [],
    players: [],
    bullets: [],
    pings: [],
    radio: [],
    vision: { circles: [{ kind: 'self', id: 'self', x: 13, y: 5, radius: 7 }] },
    ...overrides,
  }
}

describe('online bot fog assertions', () => {
  it('accepts a visible bullet rounded onto a neighboring cell at serialization precision', () => {
    expect(() => assertFogSafeSnapshot(snapshot({ bullets: [{ x: 20, y: 5 }] }))).not.toThrow()
  })

  it('rejects a bullet outside every personalized vision circle', () => {
    expect(() => assertFogSafeSnapshot(snapshot({ bullets: [{ x: 20.1, y: 5 }] }))).toThrow(
      'Fog regression: bullet escaped every personalized vision circle.',
    )
  })

  it('uses a moving player visual position and permits an always-included self slot', () => {
    const players = [
      { self: true, col: 50, row: 50, move: null },
      { self: false, col: 21, row: 5, move: { fromCol: 19, fromRow: 5, toCol: 21, toRow: 5, progress: 0.25 } },
    ]
    expect(() => assertFogSafeSnapshot(snapshot({ players }))).not.toThrow()
  })

  it('rejects opposing-team radio traffic', () => {
    expect(() => assertFogSafeSnapshot(snapshot({ radio: [{ team: 'red' }] }))).toThrow(
      'Fog regression: another team radio command escaped filtering.',
    )
  })
})
