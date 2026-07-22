import { describe, expect, it } from 'vitest'
import {
  DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE,
  NETWORK_QUALITY_THRESHOLDS,
  ONLINE_PROTOCOL_VERSION,
  shouldRecycleStalledConnection,
} from '../../packages/shared/src/index.ts'
import {
  BOT_DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE,
  BOT_NETWORK_RECOVERY,
  PROTOCOL_VERSION,
  assertFogSafeSnapshot,
  shouldRecycleBotStalledConnection,
} from './online-bot.mjs'

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
  it('uses the same protocol version as the shared room contract', () => {
    expect(PROTOCOL_VERSION).toBe(ONLINE_PROTOCOL_VERSION)
  })

  it('keeps QA bot recovery thresholds synchronized with the browser contract', () => {
    expect(BOT_DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE).toBe(DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE)
    expect(BOT_NETWORK_RECOVERY).toEqual({
      downstreamStallReconnectMs: NETWORK_QUALITY_THRESHOLDS.downstreamStallReconnectMs,
      reconnectAttemptDelayMs: NETWORK_QUALITY_THRESHOLDS.reconnectAttemptDelayMs,
    })
    const input = { connected: true, pageVisible: true, lastServerMessageAt: 1_000, now: 5_000 }
    expect(shouldRecycleBotStalledConnection(input)).toBe(shouldRecycleStalledConnection(input))
  })

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

  it('rejects opposing-team device and equipment-alert state', () => {
    expect(() => assertFogSafeSnapshot(snapshot({ deployables: [{ team: 'red' }] }))).toThrow(
      'Fog regression: another team device escaped filtering.',
    )
    expect(() => assertFogSafeSnapshot(snapshot({ equipmentAlerts: [{ team: 'red' }] }))).toThrow(
      'Fog regression: another team equipment alert escaped filtering.',
    )
  })
})
