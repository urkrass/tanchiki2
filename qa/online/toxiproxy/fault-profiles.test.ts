import { describe, expect, it } from 'vitest'
import {
  LIVE_FAULT_PROFILES,
  PLAYER_ENDPOINTS,
  PLAYER_PROXIES,
  STATIC_FAULT_PROFILES,
  TIMED_FAULT_PROFILES,
} from './fault-profiles.mjs'

describe('Toxiproxy online fault profiles', () => {
  it('assigns every player an independent route', () => {
    expect(new Set(PLAYER_PROXIES).size).toBe(4)
    expect(new Set(PLAYER_ENDPOINTS).size).toBe(4)
  })

  it('models clean, 30 ms, 80 ms, and 150 ms plus jitter in the mixed profile', () => {
    const mixed = STATIC_FAULT_PROFILES.mixed
    expect(mixed.filter((toxic) => toxic.proxy === 'player_1')).toHaveLength(0)
    expect(mixed.filter((toxic) => toxic.proxy === 'player_2').map((toxic) => toxic.attributes.latency)).toEqual([15, 15])
    expect(mixed.filter((toxic) => toxic.proxy === 'player_3').map((toxic) => toxic.attributes.latency)).toEqual([40, 40])
    expect(mixed.filter((toxic) => toxic.proxy === 'player_4').map((toxic) => toxic.attributes)).toEqual([
      { latency: 75, jitter: 20 },
      { latency: 75, jitter: 20 },
    ])
  })

  it('defines bounded outage, simultaneous reconnect, overlong expiry, reset, stall, and backpressure cases', () => {
    expect(TIMED_FAULT_PROFILES.outage5.durationMs).toBe(5_000)
    expect(TIMED_FAULT_PROFILES.simultaneous_reconnect.proxies).toHaveLength(4)
    expect(TIMED_FAULT_PROFILES.overlong.durationMs).toBe(22_000)
    expect(LIVE_FAULT_PROFILES.reset[0]).toMatchObject({ type: 'reset_peer', proxy: 'player_2' })
    expect(LIVE_FAULT_PROFILES.stall[0]).toMatchObject({ type: 'timeout', stream: 'downstream', proxy: 'player_3' })
    expect(LIVE_FAULT_PROFILES.backpressure[0]).toMatchObject({ type: 'bandwidth', stream: 'downstream', proxy: 'player_4' })
  })

  it('keeps established-socket faults out of pre-matchmaking profiles', () => {
    expect(STATIC_FAULT_PROFILES).not.toHaveProperty('reset')
    expect(STATIC_FAULT_PROFILES).not.toHaveProperty('stall')
    expect(STATIC_FAULT_PROFILES).not.toHaveProperty('backpressure')
  })
})
