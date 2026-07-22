import type { ConnectionQuality, NetworkSummary } from './onlineProtocol.js'

export const NETWORK_SAMPLE_LIMIT = 120
export const NETWORK_QUALITY_THRESHOLDS = Object.freeze({
  minimumSamples: 3,
  unstableRttP95Ms: 120,
  poorRttP95Ms: 250,
  unstableJitterMs: 30,
  poorJitterMs: 80,
  unstableSnapshotGapP95Ms: 350,
  poorSnapshotGapP95Ms: 800,
  heartbeatMissMs: 2_500,
  longFrameMs: 50,
})

/** Jitter is the median absolute difference between consecutive RTT samples. */
export function calculateJitter(rttSamples: readonly number[]) {
  if (rttSamples.length < 2) return null
  const differences: number[] = []
  for (let index = 1; index < rttSamples.length; index += 1) {
    differences.push(Math.abs((rttSamples[index] ?? 0) - (rttSamples[index - 1] ?? 0)))
  }
  return percentile(differences, 0.5)
}

export function classifyConnectionQuality(summary: NetworkSummary, connected: boolean): ConnectionQuality {
  if (!connected) return 'Disconnected'
  const measured = summary.rttMedianMs !== null || summary.snapshotGapP95Ms !== null
  if (!measured) return 'Measuring'
  const poor =
    (summary.rttP95Ms ?? 0) > NETWORK_QUALITY_THRESHOLDS.poorRttP95Ms
    || (summary.jitterMs ?? 0) > NETWORK_QUALITY_THRESHOLDS.poorJitterMs
    || (summary.snapshotGapP95Ms ?? 0) > NETWORK_QUALITY_THRESHOLDS.poorSnapshotGapP95Ms
    || summary.missedHeartbeats >= 3
  if (poor) return 'Poor'
  const unstable =
    (summary.rttP95Ms ?? 0) > NETWORK_QUALITY_THRESHOLDS.unstableRttP95Ms
    || (summary.jitterMs ?? 0) > NETWORK_QUALITY_THRESHOLDS.unstableJitterMs
    || (summary.snapshotGapP95Ms ?? 0) > NETWORK_QUALITY_THRESHOLDS.unstableSnapshotGapP95Ms
    || summary.missedHeartbeats > 0
    || summary.stallCount > 0
  return unstable ? 'Unstable' : 'Good'
}

export class ClientNetworkDiagnostics {
  private rttSamples: number[] = []
  private snapshotGaps: number[] = []
  private inputAcks: number[] = []
  private fpsSamples: number[] = []
  private pendingHeartbeats = new Map<number, number>()
  private pendingInputs = new Map<number, number>()
  private lastSnapshotAt: number | null = null
  private disconnectedAt: number | null = null
  private frameWindowStartedAt: number | null = null
  private frameCount = 0
  private missedHeartbeats = 0
  private stallCount = 0
  private stallDurationMs = 0
  private longFrames = 0
  private hiddenHeartbeatCount = 0
  private reconnectCount = 0
  private reconnectSuccessCount = 0
  private reconnectFailureCount = 0
  private backpressureEvents = 0

  recordFrame(dtSeconds: number, now: number) {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) return
    if (dtSeconds * 1000 >= NETWORK_QUALITY_THRESHOLDS.longFrameMs) this.longFrames += 1
    this.frameWindowStartedAt ??= now
    this.frameCount += 1
    const elapsed = now - this.frameWindowStartedAt
    if (elapsed >= 1_000) {
      pushBounded(this.fpsSamples, (this.frameCount * 1_000) / elapsed)
      this.frameWindowStartedAt = now
      this.frameCount = 0
    }
  }

  recordHeartbeatSent(sequence: number, now: number, pageVisible: boolean) {
    this.sweepMissedHeartbeats(now)
    this.pendingHeartbeats.set(sequence, now)
    trimMap(this.pendingHeartbeats, 8)
    if (!pageVisible) this.hiddenHeartbeatCount += 1
  }

  recordHeartbeatAck(sequence: number, now: number) {
    const sentAt = this.pendingHeartbeats.get(sequence)
    if (sentAt === undefined) return null
    this.pendingHeartbeats.delete(sequence)
    const rtt = Math.max(0, now - sentAt)
    pushBounded(this.rttSamples, rtt)
    return rtt
  }

  recordInputSent(sequence: number, now: number) {
    this.pendingInputs.set(sequence, now)
    trimMap(this.pendingInputs, 256, () => { this.backpressureEvents += 1 })
  }

  recordSnapshot(lastProcessedInputSeq: number, now: number) {
    if (this.lastSnapshotAt !== null) {
      const gap = Math.max(0, now - this.lastSnapshotAt)
      pushBounded(this.snapshotGaps, gap)
      if (gap > NETWORK_QUALITY_THRESHOLDS.poorSnapshotGapP95Ms) {
        this.stallCount += 1
        this.stallDurationMs += gap
      }
    }
    this.lastSnapshotAt = now
    for (const [sequence, sentAt] of this.pendingInputs) {
      if (sequence > lastProcessedInputSeq) break
      pushBounded(this.inputAcks, Math.max(0, now - sentAt))
      this.pendingInputs.delete(sequence)
    }
  }

  recordDrop(now: number) {
    this.disconnectedAt = now
    this.reconnectCount += 1
  }

  recordReconnect(now: number) {
    if (this.disconnectedAt !== null) {
      const duration = Math.max(0, now - this.disconnectedAt)
      if (duration > NETWORK_QUALITY_THRESHOLDS.poorSnapshotGapP95Ms) {
        this.stallCount += 1
        this.stallDurationMs += duration
      }
    }
    this.disconnectedAt = null
    this.reconnectSuccessCount += 1
  }

  recordReconnectFailure() {
    this.reconnectFailureCount += 1
  }

  summary(connected = true): NetworkSummary {
    const summary: NetworkSummary = {
      rttMedianMs: percentile(this.rttSamples, 0.5),
      rttP95Ms: percentile(this.rttSamples, 0.95),
      jitterMs: calculateJitter(this.rttSamples),
      missedHeartbeats: this.missedHeartbeats,
      stallCount: this.stallCount,
      stallDurationMs: Math.round(this.stallDurationMs),
      inputAckMedianMs: percentile(this.inputAcks, 0.5),
      inputAckP95Ms: percentile(this.inputAcks, 0.95),
      snapshotGapP95Ms: percentile(this.snapshotGaps, 0.95),
      reconnectCount: this.reconnectCount,
      reconnectSuccessCount: this.reconnectSuccessCount,
      reconnectFailureCount: this.reconnectFailureCount,
      backpressureEvents: this.backpressureEvents,
      serverTickP95Ms: null,
      serverTickMaxMs: null,
      serverTickDriftMs: null,
      serverTickOverruns: 0,
      clientFpsMedian: percentile(this.fpsSamples, 0.5),
      clientLongFrames: this.longFrames,
      hiddenHeartbeatCount: this.hiddenHeartbeatCount,
    }
    if (!connected && this.disconnectedAt !== null) {
      const duration = Math.max(0, performanceNow() - this.disconnectedAt)
      summary.stallDurationMs += Math.round(duration)
    }
    return summary
  }

  quality(connected = true) {
    if (connected && Math.max(this.rttSamples.length, this.snapshotGaps.length) < NETWORK_QUALITY_THRESHOLDS.minimumSamples) {
      return 'Measuring'
    }
    return classifyConnectionQuality(this.summary(connected), connected)
  }

  private sweepMissedHeartbeats(now: number) {
    for (const [sequence, sentAt] of this.pendingHeartbeats) {
      if (now - sentAt < NETWORK_QUALITY_THRESHOLDS.heartbeatMissMs) continue
      this.pendingHeartbeats.delete(sequence)
      this.missedHeartbeats += 1
    }
  }
}

export function percentile(values: readonly number[], fraction: number) {
  if (values.length === 0) return null
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return Math.round((sorted[index] ?? 0) * 10) / 10
}

function pushBounded(target: number[], value: number) {
  if (!Number.isFinite(value)) return
  target.push(value)
  if (target.length > NETWORK_SAMPLE_LIMIT) target.splice(0, target.length - NETWORK_SAMPLE_LIMIT)
}

function trimMap<T>(target: Map<number, T>, limit: number, onTrim: () => void = () => {}) {
  while (target.size > limit) {
    const oldest = target.keys().next().value
    if (oldest === undefined) break
    target.delete(oldest)
    onTrim()
  }
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now()
}
