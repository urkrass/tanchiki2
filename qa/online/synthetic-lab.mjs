import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createTanchikiServer } from '../../packages/server/server.mjs'
import { ONLINE_PROTOCOL_VERSION } from '../../packages/shared/dist/index.js'
import { OnlinePlayerBot } from './online-bot.mjs'
import { parseSyntheticLabArgs } from './cli-args.mjs'

const args = parseSyntheticLabArgs(process.argv.slice(2))
const seed = args.seed ?? Date.now() >>> 0
const { server, registry } = createTanchikiServer({
  controllerConfig: {
    countdownMs: 120,
    roundDurationMs: args.realtime ? 12_000 : 2_000,
    terminalMs: 1_000,
  },
})
let completed = 0

try {
  await new Promise((resolve, reject) => Promise.resolve(server.listen(0, '127.0.0.1', resolve)).catch(reject))
  const address = server.address()
  assert(address && typeof address !== 'string')
  const endpoint = `http://127.0.0.1:${address.port}`

  for (let matchIndex = 0; matchIndex < args.matches; matchIndex += 1) {
    if (args.progress) console.error(JSON.stringify({ progress: 'starting', match: matchIndex + 1, total: args.matches }))
    await runMatch(endpoint, seed + matchIndex, args.mode)
    await waitFor(() => registry.size === 0, 3_000, 'room cleanup')
    completed += 1
    if (args.progress) console.error(JSON.stringify({ progress: 'completed', match: completed, total: args.matches }))
  }

  console.log(JSON.stringify({
    ok: true,
    seed,
    matches: completed,
    mode: args.mode,
    realtimeRepresentative: args.realtime,
    divergentResults: 0,
    stuckRooms: 0,
    cleanupFailures: 0,
  }))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    seed,
    completed,
    error: error instanceof Error ? error.message : 'synthetic_lab_failed',
  }))
  process.exitCode = 1
} finally {
  await new Promise((resolve) => server.close(() => resolve()))
}

async function runMatch(endpoint, matchSeed, mode) {
  const bots = Array.from({ length: 4 }, (_, index) => new OnlinePlayerBot({
    endpoint,
    name: `Bot ${index + 1}`,
    seed: matchSeed * 17 + index,
    mode,
  }))
  try {
    const roomKey = await bots[0].create()
    await Promise.all(bots.slice(1).map((bot) => bot.join(roomKey)))
    await Promise.all(bots.map((bot) => bot.waitFor(() => bot.lobby?.players.length === 4)))
    for (const bot of bots) bot.ready()
    await bots[0].waitFor(() => bots[0].lobby?.players.every((player) => player.ready))
    bots[0].start()
    const results = await Promise.all(bots.map((bot) => bot.waitForResult()))
    const coreResults = results.map((result) => JSON.stringify({
      matchId: result.matchId,
      resultId: result.resultId,
      finalServerTick: result.finalServerTick,
      scores: result.scores,
      winner: result.winner,
      reason: result.reason,
    }))
    assert(coreResults.every((result) => result === coreResults[0]), 'Bots observed divergent authoritative results.')

    const rejected = await fetch(`${endpoint}/matchmake/room-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', connection: 'close' },
      body: JSON.stringify({ protocolVersion: ONLINE_PROTOCOL_VERSION, roomKey }),
      signal: AbortSignal.timeout(8_000),
    })
    assert.equal(rejected.status, 404, 'Terminal room key remained valid.')
  } finally {
    await Promise.allSettled(bots.map((bot) => bot.close()))
  }
}

async function waitFor(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) !== process.argv[1]) {
  // This module is intentionally CLI-only; the guard keeps static analysis honest.
}
