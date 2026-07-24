import assert from 'node:assert/strict'
import { matchMaker } from '@colyseus/core'
import { createTanchikiServer } from '../../../packages/server/server.mjs'
import { OnlinePlayerBot } from '../online-bot.mjs'
import { parseFaultLabArgs } from '../cli-args.mjs'
import {
  LIVE_FAULT_PROFILES,
  PLAYER_ENDPOINTS,
  PLAYER_PROXIES,
  STATIC_FAULT_PROFILES,
  TIMED_FAULT_PROFILES,
  TOXIPROXY_API,
} from './fault-profiles.mjs'

const originalConsoleInfo = console.info.bind(console)
console.info = (message, ...rest) => {
  if (!process.env.FAULT_LAB_DEBUG && String(message).startsWith('[Colyseus reconnection]')) return
  originalConsoleInfo(message, ...rest)
}

const { profile, matches, seed } = parseFaultLabArgs(process.argv.slice(2))
if (!(profile in STATIC_FAULT_PROFILES) && !(profile in LIVE_FAULT_PROFILES) && !(profile in TIMED_FAULT_PROFILES)) {
  throw new Error(`Unknown fault profile: ${profile}`)
}

await requireToxiproxy()
const { server, registry } = createTanchikiServer({
  controllerConfig: {
    countdownMs: 150,
    roundDurationMs: profile === 'overlong' ? 40_000 : 9_000,
    terminalMs: 8_000,
  },
})
let completed = 0
let sameSlotReclaims = 0
let reconnectSuccesses = 0
let reconnectFailures = 0
let backpressureEvents = 0
let stallCount = 0

try {
  await new Promise((resolve, reject) => Promise.resolve(server.listen(18787, '0.0.0.0', resolve)).catch(reject))
  for (let index = 0; index < matches; index += 1) {
    await resetAllProxies()
    await applyStaticProfile(profile)
    await waitForProxyRoutes()
    let outcome
    try {
      outcome = await runFaultMatch(seed + index)
    } catch (error) {
      throw new Error(`Match ${index + 1} failed: ${error instanceof Error ? error.message : 'unknown'}`)
    }
    await waitFor(() => registry.size === 0, 10_000, 'fault room cleanup')
    await waitFor(() => !matchMaker.getLocalRoomById(outcome.roomId), 10_000, 'fault room disposal')
    sameSlotReclaims += outcome.sameSlotReclaims
    reconnectSuccesses += outcome.network.reconnectSuccessCount
    reconnectFailures += outcome.network.reconnectFailureCount
    backpressureEvents += outcome.network.backpressureEvents
    stallCount += outcome.network.stallCount
    completed += 1
    if (matches >= 10 && completed % 10 === 0) {
      console.log(JSON.stringify({ profile, progress: completed, matches }))
    }
  }
  console.log(JSON.stringify({
    ok: true,
    profile,
    seed,
    matches: completed,
    sameSlotReclaims,
    reconnectSuccesses,
    reconnectFailures,
    backpressureEvents,
    stallCount,
    cleanupFailures: 0,
    divergentResults: 0,
  }))
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
    const roomId = bots[0].room?.roomId
    assert(roomId, 'The fault host did not receive a room id.')
    for (const bot of bots.slice(1)) {
      const botIndex = bots.indexOf(bot)
      try {
        await bot.join(roomKey)
      } catch (error) {
        throw new Error(`${PLAYER_PROXIES[botIndex]} room join failed: ${error instanceof Error ? error.message : 'unknown'}`)
      }
    }
    await Promise.all(bots.map((bot) => bot.waitFor(() => bot.lobby?.players.length === 4)))
    const initialPlayerIds = bots.map((bot) => bot.lobby?.selfPlayerId)
    assert(initialPlayerIds.every(Boolean), 'A fault bot did not receive its stable player slot.')
    assert.equal(new Set(initialPlayerIds).size, 4, 'The initial fault roster contains a duplicate player slot.')
    for (const bot of bots) bot.ready()
    await bots[0].waitFor(() => bots[0].lobby?.players.every((player) => player.ready))
    bots[0].start()
    await Promise.all(bots.map((bot) => bot.waitFor(() => bot.snapshot?.phase === 'playing', 8_000)))

    const timed = TIMED_FAULT_PROFILES[profile]
    if (timed) {
      await applyTimedNetworkCut(profile, timed.proxies)
      if (profile === 'overlong') {
        const room = matchMaker.getLocalRoomById(bots[0].room?.roomId)
        assert(room?.controller, 'The overlong profile could not inspect the authoritative room.')
        const affectedPlayerIds = timed.proxies.map((proxy) => initialPlayerIds[PLAYER_PROXIES.indexOf(proxy)])
        await waitFor(() => affectedPlayerIds.every((playerId) => {
          const slot = room.controller.inspect().slots.find((candidate) => candidate.playerId === playerId)
          return slot?.connected === false && slot.expiresAt !== null
        }), 10_000, 'authoritative overlong disconnect')
      }
      await sleep(timed.durationMs)
      await Promise.all(timed.proxies.map((proxy) => resetProxyToxics(proxy)))
    } else if (profile in LIVE_FAULT_PROFILES) {
      await applyLiveProfile(profile)
      await sleep(profile === 'reset' ? 100 : 5_000)
      await Promise.all(liveProfileProxies(profile).map((proxy) => resetProxyToxics(proxy)))
    }

    const resultBots = profile === 'overlong' ? [bots[1], bots[3]] : bots
    const results = await Promise.all(resultBots.map(async (bot) => {
      try {
        return await bot.waitForResult(30_000)
      } catch (error) {
        const botIndex = bots.indexOf(bot)
        throw new Error(`${PLAYER_PROXIES[botIndex]} result timeout: ${JSON.stringify({
          connectionOpen: bot.room?.connection?.isOpen === true,
          lobbyPhase: bot.lobby?.phase ?? null,
          snapshotPhase: bot.snapshot?.phase ?? null,
          lastServerMessageAgeMs: bot.lastServerMessageAt === null ? null : Date.now() - bot.lastServerMessageAt,
          cause: error instanceof Error ? error.message : 'unknown',
        })}`)
      }
    }))
    const core = results.map((result) => JSON.stringify({
      finalServerTick: result.finalServerTick,
      scores: result.scores,
      winner: result.winner,
      reason: result.reason,
    }))
    assert(core.every((entry) => entry === core[0]), 'Faulted players observed divergent results.')
    if (profile === 'overlong') assert.equal(results[0].reason, 'FORFEIT')
    const network = results[0].network
    const expectedReclaimProxies = reclaimProxies(profile)
    if (expectedReclaimProxies.length > 0) {
      assert(network.reconnectSuccessCount >= expectedReclaimProxies.length, `${profile} did not reconnect every faulted player.`)
      assert.equal(network.reconnectFailureCount, 0, `${profile} unexpectedly exhausted a reconnection window.`)
      for (const proxy of expectedReclaimProxies) {
        const botIndex = PLAYER_PROXIES.indexOf(proxy)
        assert.equal(bots[botIndex].lobby?.selfPlayerId, initialPlayerIds[botIndex], `${profile} did not reclaim the same player slot.`)
      }
    }
    for (const bot of resultBots) {
      const rosterIds = bot.lobby?.players.map((player) => player.playerId) ?? []
      assert.equal(rosterIds.length, 4, `${profile} changed the locked roster size.`)
      assert.equal(new Set(rosterIds).size, 4, `${profile} produced a duplicate player slot.`)
    }
    return { roomId, sameSlotReclaims: expectedReclaimProxies.length, network }
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

async function waitForProxyRoutes() {
  await waitForAsync(async () => {
    const responses = await Promise.all(PLAYER_ENDPOINTS.map((endpoint) => fetch(`${endpoint}/health`, {
      headers: { connection: 'close' },
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null)))
    return responses.every((response) => response?.ok)
  }, 8_000, 'fault proxy routes')
}

async function applyLiveProfile(name) {
  for (const toxic of LIVE_FAULT_PROFILES[name] ?? []) {
    await api(`/proxies/${toxic.proxy}/toxics`, { method: 'POST', body: toxic })
  }
}

function liveProfileProxies(name) {
  return [...new Set((LIVE_FAULT_PROFILES[name] ?? []).map((toxic) => toxic.proxy))]
}

function reclaimProxies(name) {
  if (name === 'overlong') return []
  if (name in TIMED_FAULT_PROFILES) return TIMED_FAULT_PROFILES[name].proxies
  if (name in LIVE_FAULT_PROFILES) return liveProfileProxies(name)
  return []
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
  await Promise.all(proxies.map(async (proxy) => {
    const current = await api(`/proxies/${proxy}`)
    if (current.enabled === enabled) return
    await api(`/proxies/${proxy}`, {
      method: 'POST',
      body: { enabled },
    })
  }))
}

async function applyTimedNetworkCut(name, proxies) {
  await Promise.all(proxies.flatMap((proxy) => [
    api(`/proxies/${proxy}/toxics`, {
      method: 'POST',
      body: {
        name: `${name}_upstream_cut`,
        type: 'timeout',
        stream: 'upstream',
        toxicity: 1,
        attributes: { timeout: 0 },
      },
    }),
    api(`/proxies/${proxy}/toxics`, {
      method: 'POST',
      body: {
        name: `${name}_downstream_cut`,
        type: 'timeout',
        stream: 'downstream',
        toxicity: 1,
        attributes: { timeout: 0 },
      },
    }),
  ]))
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

async function waitForAsync(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
