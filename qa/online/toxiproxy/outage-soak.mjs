import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PLAYER_PROXIES, TOXIPROXY_API } from './fault-profiles.mjs'

class RetryableSetupError extends Error {}

const BATCHES = 20
const MATCHES_PER_BATCH = 5
const BASE_SEED = 20260722
const faultLabPath = fileURLToPath(new URL('./fault-lab.mjs', import.meta.url))
const totals = {
  matches: 0,
  sameSlotReclaims: 0,
  reconnectSuccesses: 0,
  reconnectFailures: 0,
  backpressureEvents: 0,
  stallCount: 0,
  cleanupFailures: 0,
  divergentResults: 0,
}

for (let batch = 0; batch < BATCHES; batch += 1) {
  const seed = BASE_SEED + batch * MATCHES_PER_BATCH
  const result = await runBatchWithRetries(seed, batch)
  for (const key of Object.keys(totals)) totals[key] += Number(result[key] ?? 0)
  console.log(JSON.stringify({
    profile: 'outage5',
    batchesComplete: batch + 1,
    batches: BATCHES,
    matchesComplete: totals.matches,
  }))
}

assert.equal(totals.matches, 100)
assert.equal(totals.sameSlotReclaims, 100)
assert.equal(totals.reconnectSuccesses, 100)
assert.equal(totals.reconnectFailures, 0)
assert.equal(totals.cleanupFailures, 0)
assert.equal(totals.divergentResults, 0)
console.log(JSON.stringify({ ok: true, profile: 'outage5', seed: BASE_SEED, ...totals }))

async function runBatchWithRetries(seed, batch) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await recycleProxyListeners()
    try {
      return await runBatch(seed)
    } catch (error) {
      if (!(error instanceof RetryableSetupError) || attempt === 3) throw error
      console.log(JSON.stringify({
        profile: 'outage5',
        retryingBatch: batch + 1,
        attempt: attempt + 1,
        reason: 'setup_timeout',
      }))
    }
  }
  throw new Error('Outage soak batch retry loop ended unexpectedly.')
}

async function runBatch(seed) {
  const child = spawn(process.execPath, [
    faultLabPath,
    '--profile', 'outage5',
    '--matches', String(MATCHES_PER_BATCH),
    '--seed', String(seed),
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
  if (code !== 0) {
    const failure = `${stdout}\n${stderr}`.trim().split(/\r?\n/).reverse().map(parseJson).find((entry) => entry?.ok === false)
    const detail = [...stderr.trim().split(/\r?\n/), ...stdout.trim().split(/\r?\n/)].filter(Boolean).slice(-4).join(' | ')
    const message = `Outage soak batch failed: ${detail || `exit ${code}`}`
    if (failure && /room creation|room join|fault proxy routes/i.test(String(failure.error))) {
      throw new RetryableSetupError(message)
    }
    throw new Error(message)
  }
  const result = stdout.trim().split(/\r?\n/).reverse().map(parseJson).find((entry) => entry?.ok === true)
  if (!result) throw new Error('Outage soak batch did not emit a passing aggregate.')
  return result
}

async function recycleProxyListeners() {
  await setAvailability(false)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await setAvailability(true)
}

async function setAvailability(enabled) {
  for (const proxy of PLAYER_PROXIES) {
    const response = await fetch(`${TOXIPROXY_API}/proxies/${proxy}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!response.ok) {
      const currentResponse = await fetch(`${TOXIPROXY_API}/proxies/${proxy}`)
      const current = currentResponse.ok ? await currentResponse.json() : null
      if (current?.enabled !== enabled) {
        const detail = await response.text()
        throw new Error(`Toxiproxy listener refresh failed with status ${response.status}: ${detail}`)
      }
    }
  }
}

function parseJson(line) {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}
