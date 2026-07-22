export const TOXIPROXY_API = 'http://127.0.0.1:18474'
export const PLAYER_PROXIES = Object.freeze(['player_1', 'player_2', 'player_3', 'player_4'])
export const PLAYER_ENDPOINTS = Object.freeze([18788, 18789, 18790, 18791].map((port) => `http://127.0.0.1:${port}`))

export const STATIC_FAULT_PROFILES = Object.freeze({
  clean: [],
  mixed: [
    latency('player_2', 'upstream', 15, 0),
    latency('player_2', 'downstream', 15, 0),
    latency('player_3', 'upstream', 40, 0),
    latency('player_3', 'downstream', 40, 0),
    latency('player_4', 'upstream', 75, 20),
    latency('player_4', 'downstream', 75, 20),
  ],
  reset: [toxic('player_2', 'abrupt_reset', 'reset_peer', 'downstream', { timeout: 1_000 })],
  stall: [toxic('player_3', 'one_direction_stall', 'timeout', 'downstream', { timeout: 0 })],
  backpressure: [toxic('player_4', 'slow_downstream', 'bandwidth', 'downstream', { rate: 4 })],
})

export const TIMED_FAULT_PROFILES = Object.freeze({
  outage5: { proxies: ['player_2'], durationMs: 5_000 },
  simultaneous_reconnect: { proxies: PLAYER_PROXIES, durationMs: 5_000 },
  overlong: { proxies: ['player_1', 'player_3'], durationMs: 16_000 },
})

function latency(proxy, stream, delay, jitter) {
  return toxic(proxy, `${stream}_latency`, 'latency', stream, { latency: delay, jitter })
}

function toxic(proxy, name, type, stream, attributes) {
  return { proxy, name, type, stream, toxicity: 1, attributes }
}
