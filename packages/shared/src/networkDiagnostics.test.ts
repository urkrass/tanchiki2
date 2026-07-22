import { describe, expect, it } from 'vitest'
import {
  ClientNetworkDiagnostics,
  DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE,
  NETWORK_QUALITY_THRESHOLDS,
  NETWORK_SAMPLE_LIMIT,
  calculateJitter,
  classifyConnectionQuality,
  shouldRecycleStalledConnection,
  type NetworkSummary,
} from './index.ts'

describe('network diagnostics', () => {
  it('recycles a visible connected client only after the inbound watchdog threshold', () => {
    expect(DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE).toBe(4010)
    const threshold = NETWORK_QUALITY_THRESHOLDS.downstreamStallReconnectMs
    expect(shouldRecycleStalledConnection({ connected: true, pageVisible: true, lastServerMessageAt: 10, now: 10 + threshold - 1 })).toBe(false)
    expect(shouldRecycleStalledConnection({ connected: true, pageVisible: false, lastServerMessageAt: 10, now: 10 + threshold })).toBe(false)
    expect(shouldRecycleStalledConnection({ connected: false, pageVisible: true, lastServerMessageAt: 10, now: 10 + threshold })).toBe(false)
    expect(shouldRecycleStalledConnection({ connected: true, pageVisible: true, lastServerMessageAt: null, now: 10 + threshold })).toBe(false)
    expect(shouldRecycleStalledConnection({ connected: true, pageVisible: true, lastServerMessageAt: 10, now: 10 + threshold })).toBe(true)
  })

  it('defines jitter as the median absolute consecutive RTT difference', () => {
    expect(calculateJitter([40, 50, 45, 80])).toBe(10)
  })

  it('keeps samples bounded and derives percentiles, input acks, and snapshot gaps', () => {
    const diagnostics = new ClientNetworkDiagnostics()
    for (let index = 0; index < NETWORK_SAMPLE_LIMIT + 20; index += 1) {
      diagnostics.recordHeartbeatSent(index, index * 100, true)
      diagnostics.recordHeartbeatAck(index, index * 100 + 20 + (index % 3))
    }
    diagnostics.recordInputSent(1, 10)
    diagnostics.recordSnapshot(0, 100)
    diagnostics.recordSnapshot(1, 220)
    const summary = diagnostics.summary()
    expect(summary.rttMedianMs).toBe(21)
    expect(summary.rttP95Ms).toBe(22)
    expect(summary.inputAckMedianMs).toBe(210)
    expect(summary.snapshotGapP95Ms).toBe(120)
  })

  it('centralizes Measuring, Good, Unstable, Poor, and Disconnected thresholds', () => {
    const good = summary({ rttMedianMs: 45, rttP95Ms: 80, jitterMs: 8, snapshotGapP95Ms: 130 })
    expect(classifyConnectionQuality(summary(), true)).toBe('Measuring')
    expect(classifyConnectionQuality(good, true)).toBe('Good')
    expect(classifyConnectionQuality(summary({ ...good, rttP95Ms: 150 }), true)).toBe('Unstable')
    expect(classifyConnectionQuality(summary({ ...good, rttP95Ms: 300 }), true)).toBe('Poor')
    expect(classifyConnectionQuality(good, false)).toBe('Disconnected')
  })

  it('keeps client quality Measuring until the minimum rolling sample count is reached', () => {
    const diagnostics = new ClientNetworkDiagnostics()
    for (let sequence = 1; sequence <= 2; sequence += 1) {
      diagnostics.recordHeartbeatSent(sequence, sequence * 100, true)
      diagnostics.recordHeartbeatAck(sequence, sequence * 100 + 30)
    }
    expect(diagnostics.quality()).toBe('Measuring')
    diagnostics.recordHeartbeatSent(3, 300, true)
    diagnostics.recordHeartbeatAck(3, 330)
    expect(diagnostics.quality()).toBe('Good')
  })

  it('records disconnect outcomes, stalls, long frames, and visibility without identifiers', () => {
    const diagnostics = new ClientNetworkDiagnostics()
    diagnostics.recordFrame(0.06, 0)
    diagnostics.recordHeartbeatSent(1, 0, false)
    diagnostics.recordDrop(100)
    diagnostics.recordReconnect(1_200)
    const output = diagnostics.summary()
    expect(output.clientLongFrames).toBe(1)
    expect(output.hiddenHeartbeatCount).toBe(1)
    expect(output.reconnectCount).toBe(1)
    expect(output.reconnectSuccessCount).toBe(1)
    expect(output.stallCount).toBe(1)
    expect(JSON.stringify(output)).not.toMatch(/room|token|player|ip/i)
  })
})

function summary(overrides: Partial<NetworkSummary> = {}): NetworkSummary {
  return {
    rttMedianMs: null,
    rttP95Ms: null,
    jitterMs: null,
    missedHeartbeats: 0,
    stallCount: 0,
    stallDurationMs: 0,
    inputAckMedianMs: null,
    inputAckP95Ms: null,
    snapshotGapP95Ms: null,
    reconnectCount: 0,
    reconnectSuccessCount: 0,
    reconnectFailureCount: 0,
    backpressureEvents: 0,
    serverTickP95Ms: null,
    serverTickMaxMs: null,
    serverTickDriftMs: null,
    serverTickOverruns: 0,
    clientFpsMedian: null,
    clientLongFrames: 0,
    hiddenHeartbeatCount: 0,
    ...overrides,
  }
}
