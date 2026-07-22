import assert from 'node:assert/strict'
import { createTanchikiServer } from '../../../packages/server/server.mjs'
import { OnlinePlayerBot } from '../online-bot.mjs'
import { parseFaultLabArgs } from '../cli-args.mjs'
import {
  PLAYER_ENDPOINTS,
  PLAYER_PROXIES,
  STATIC_FAULT_PROFILES,
  TIMED_FAULT_PROFILES,
  TOXIPROXY_API,
} from './fault-profiles.mjs'

const originalConsoleInfo = console.info.bind(console)
console.info = (message, ...rest) => {
  if (String(message).startsWith('[Colyseus reconnection]')) return
  originalConsoleInfo(message, ...rest)
}

const { profile, matches, seed } = parseFaultLabArgs(process.argv.slice(2))
if (!(profile in STATIC_FAULT_PROFILES) && !(profile in TIMED_FAULT_PROFILES)) {
  throw new Error(`Unknown fault profile: ${profile}`)
}

await requireToxiproxy()
const { server, registry } = createTanchikiServer({
  controllerConfig: {
    countdownMs: 150,
    roundDurationMs: profile === 'overlong' ? 20_000 : 9_000,
    terminalMs: 2_000,
  },
})
let completed = 0

try {
  await new Promise((resolve, reject) => Promise.resolve(server.listen(18787, '0.0.0.0', resolve)).catch(reject))
  for (let index = 0; index < matches; index += 1) {
    await resetAllProxies()
    await applyStaticProfile(profile)
    await runFaultMatch(seed + index)
    await waitFor(() => registry.size === 0, 6_000, 'fault room cleanup')
    completed += 1
  }
  console.log(JSON.stringify({ ok: true, profile, seed, matches: completed, cleanupFailures: 0, divergentResults: 0 }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, profile, seed, completed, error: error instanceof Error ? error.message : 'fault_lab_failed' }))
  process.exitCode = 1
} finally {
  await resetAllProxies().catch(() => {})
  await new Promise((resolve) => server.close(() => resolve()))
}

async function runFaultMatch(matchSeed) {
  const bots = PLAYER_ENDPOINTS.map((endpoint, index) => new OnlinePlayerBot({
    endpoint,
    name: `Fault Bot ${index + 1}`,
    seed: matchSeed * 31 + index,
    mode: 'seeded',
  }))
  try {
    const roomKey = await bots[0].create()
    await Promise.all(bots.slice(1).map((bot) => bot.join(roomKey)))
    await Promise.all(bots.map((bot) => bot.waitFor(() => bot.lobby?.players.length === 4)))
    for (const bot of bots) bot.ready()
    await bots[0].waitFor(() => bots[0].lobby?.players.every((player) => player.ready))
    bots[0].start()
    await Promise.all(bots.map((bot) => bot.waitFor(() => bot.snapshot?.phase === 'playing', 8_000)))

    const timed = TIMED_FAULT_PROFILES[profile]
    if (timed) {
      await setProxyAvailability(timed.proxies, false)
      await sleep(timed.durationMs)
      await setProxyAvailability(timed.proxies, true)
    } else if (profile === 'stall') {
      await sleep(5_000)
      await resetProxyToxics('player_3')
    }

    const resultBots = profile === 'overlong' ? [bots[1], bots[3]] : bots
    const results = await Promise.all(resultBots.map((bot) => bot.waitForResult(30_000)))
    const core = results.map((result) => JSON.stringify({
      finalServerTick: result.finalServerTick,
      scores: result.scores,
      winner: result.winner,
      reason: result.reason,
    }))
    assert(core.every((entry) => entry === core[0]), 'Faulted players observed divergent results.')
    if (profile === 'overlong') assert.equal(results[0].reason, 'FORFEIT')
  } finally {
    await Promise.allSettled(bots.map((bot) => bot.close()))
  }
}

async function requireToxiproxy() {
  const response = await fetch(`${TOXIPROXY_API}/version`).catch(() => null)
  if (!response?.ok) throw new Error('TOXIPROXY_UNAVAILABLE: start qa/online/toxiproxy/docker-compose.yml first.')
}

async function applyStaticProfile(name) {
  for (const toxic of STATIC_FAULT_PROFILES[name] ?? []) {
    await api(`/proxies/${toxic.proxy}/toxics`, { method: 'POST', body: toxic })
  }
}

async function resetAllProxies() {
  for (const proxy of PLAYER_PROXIES) {
    await resetProxyToxics(proxy)
    await setProxyAvailability([proxy], true)
  }
}

async function resetProxyToxics(proxy) {
  const response = await api(`/proxies/${proxy}`)
  for (const toxic of response.toxics ?? []) {
    await api(`/proxies/${proxy}/toxics/${toxic.name}`, { method: 'DELETE' })
  }
}

async function setProxyAvailability(proxies, enabled) {
  await Promise.all(proxies.map((proxy) => api(`/proxies/${proxy}`, {
    method: 'POST',
    body: { enabled },
  })))
}

async function api(pathname, options = {}) {
  const response = await fetch(`${TOXIPROXY_API}${pathname}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) throw new Error(`Toxiproxy API failed with status ${response.status}.`)
  return response.status === 204 ? {} : response.json()
}

async function waitFor(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await sleep(50)
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
