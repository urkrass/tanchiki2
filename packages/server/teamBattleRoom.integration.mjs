import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@colyseus/sdk'
import { ONLINE_PROTOCOL_VERSION } from '../shared/dist/index.js'
import { createTanchikiServer } from './server.mjs'
import { JsonlSessionTelemetry } from './sessionTelemetry.mjs'

const originalConsoleInfo = console.info.bind(console)
console.info = (message, ...rest) => {
  if (String(message).startsWith('[Colyseus reconnection]')) return
  originalConsoleInfo(message, ...rest)
}
const originalConsoleWarn = console.warn.bind(console)
console.warn = (message, ...rest) => {
  if (String(message).startsWith('Room connection was closed unexpectedly (4002)')) return
  originalConsoleWarn(message, ...rest)
}

const telemetryDirectory = mkdtempSync(join(tmpdir(), 'tanchiki-sdk-telemetry-'))
const telemetryPath = join(telemetryDirectory, 'session.jsonl')
const telemetry = new JsonlSessionTelemetry({ logPath: telemetryPath, includeSensitive: true })
const { server } = createTanchikiServer({
  controllerConfig: { countdownMs: 80, reconnectMs: 1_500, terminalMs: 250 },
  telemetry,
})
let host
let guest

try {
  await new Promise((resolve, reject) => Promise.resolve(server.listen(0, '127.0.0.1', resolve)).catch(reject))
  const address = server.address()
  assert(address && typeof address !== 'string', 'Colyseus server did not bind a TCP port.')
  const endpoint = `http://127.0.0.1:${address.port}`
  const hostSdk = new Client(endpoint)
  const guestSdk = new Client(endpoint)

  host = await hostSdk.create('team_battle', { protocolVersion: ONLINE_PROTOCOL_VERSION, name: 'Host', create: true })
  const hostMessages = collectMessages(host)
  const firstHostLobby = await hostMessages.next('lobby')
  assert.equal(firstHostLobby.lobby.phase, 'LOBBY')
  assert.equal(firstHostLobby.lobby.players.length, 1)
  assert.equal(firstHostLobby.lobby.roomKey.length, 6)
  const stableHostPlayerId = firstHostLobby.lobby.selfPlayerId

  const resolutionResponse = await fetch(`${endpoint}/matchmake/room-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocolVersion: ONLINE_PROTOCOL_VERSION, roomKey: firstHostLobby.lobby.roomKey }),
  })
  const resolution = await resolutionResponse.json()
  assert.equal(resolutionResponse.status, 200)
  assert.equal(resolution.roomId, host.roomId)
  assert.equal('roomKey' in resolution, false, 'Room-key resolver must not echo credentials.')

  await assert.rejects(
    guestSdk.joinById(host.roomId, { protocolVersion: ONLINE_PROTOCOL_VERSION, name: 'Intruder', roomKey: '222222' }),
    /ROOM_KEY_NOT_FOUND/,
  )

  guest = await guestSdk.joinById(host.roomId, {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    name: 'Guest',
    roomKey: firstHostLobby.lobby.roomKey,
  })
  const guestMessages = collectMessages(guest)
  const guestLobby = await guestMessages.next('lobby')
  assert.equal(guestLobby.lobby.players.length, 2)
  assert.equal('roomKey' in guestLobby.lobby, false, 'Room key leaked to a non-host player.')

  guest.send('command', { type: 'chat', protocolVersion: ONLINE_PROTOCOL_VERSION, text: 'x'.repeat(2_200) })
  assert.equal((await guestMessages.next('error')).code, 'MESSAGE_TOO_LARGE')
  guest.send('command', { type: 'chat', protocolVersion: ONLINE_PROTOCOL_VERSION, text: 'legacy free text' })
  assert.equal((await guestMessages.next('error')).code, 'MESSAGE_INVALID')
  guest.send('command', { type: 'input', protocolVersion: ONLINE_PROTOCOL_VERSION, inputSeq: 1, up: true, down: true })
  assert.equal((await guestMessages.next('error')).code, 'MESSAGE_INVALID')
  for (let index = 0; index < 41; index += 1) {
    guest.send('command', {
      type: 'heartbeat',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      heartbeatSeq: index,
      clientSentAt: Date.now(),
      pageVisible: true,
    })
  }
  assert.equal((await guestMessages.next('error', (message) => message.code === 'RATE_LIMITED')).code, 'RATE_LIMITED')
  await new Promise((resolve) => setTimeout(resolve, 1_050))

  host.send('command', { type: 'ready', protocolVersion: ONLINE_PROTOCOL_VERSION, ready: true })
  guest.send('command', { type: 'ready', protocolVersion: ONLINE_PROTOCOL_VERSION, ready: true })
  await hostMessages.next('lobby', (message) => message.lobby.players.every((player) => player.ready))
  host.send('command', { type: 'start', protocolVersion: ONLINE_PROTOCOL_VERSION })
  await hostMessages.next('lobby', (message) => message.lobby.phase === 'COUNTDOWN')
  const firstSnapshot = await hostMessages.next('snapshot')
  assert.equal(firstSnapshot.snapshot.phase, 'playing')
  assert(Number.isSafeInteger(firstSnapshot.snapshot.serverTick))
  const pacedSnapshot = await hostMessages.next(
    'snapshot',
    (message) => message.snapshot.serverTick >= firstSnapshot.snapshot.serverTick + 6,
  )
  const simulatedSeconds = pacedSnapshot.snapshot.time - firstSnapshot.snapshot.time
  assert(
    simulatedSeconds >= 0.25 && simulatedSeconds <= 0.35,
    `20 Hz simulation advanced ${simulatedSeconds.toFixed(3)}s across six server ticks.`,
  )

  host.reconnection.minUptime = 0
  const reconnected = onceSignal(host.onReconnect, 4_000)
  host.connection.close()
  await reconnected
  const resumedSnapshot = await hostMessages.next('snapshot')
  assert.equal(resumedSnapshot.snapshot.playerId, stableHostPlayerId)
  assert(resumedSnapshot.snapshot.serverTick >= firstSnapshot.snapshot.serverTick)

  host.send('command', {
    type: 'heartbeat',
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    heartbeatSeq: 1,
    clientSentAt: Date.now(),
    pageVisible: true,
  })
  const heartbeat = await hostMessages.next('heartbeat_ack')
  assert.equal(heartbeat.heartbeatSeq, 1)

  host.send('command', { type: 'radio', protocolVersion: ONLINE_PROTOCOL_VERSION, command: 'REGROUP' })
  host.send('command', { type: 'ping', protocolVersion: ONLINE_PROTOCOL_VERSION, col: 5, row: 14 })
  await new Promise((resolve) => setTimeout(resolve, 80))
  const telemetryEntries = readFileSync(telemetryPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  assert(telemetryEntries.some((entry) => entry.event === 'room_created' && entry.roomKey === firstHostLobby.lobby.roomKey))
  assert(telemetryEntries.some((entry) => entry.event === 'player_joined' && entry.name === 'Host' && entry.ip))
  assert(telemetryEntries.some((entry) => entry.event === 'player_reconnected' && entry.name === 'Host'))
  assert(telemetryEntries.some((entry) => entry.event === 'radio_command' && entry.command === 'REGROUP' && !('text' in entry)))
  assert(telemetryEntries.some((entry) => entry.event === 'team_ping' && entry.col === 5 && entry.row === 14))

  console.log(JSON.stringify({
    ok: true,
    roomLifecycle: ['LOBBY', 'COUNTDOWN', 'PLAYING'],
    privateKeyResolution: true,
    simulationClockKeepsWallPace: true,
    stableIdentityReconnect: true,
    sessionTelemetryJsonl: true,
  }))
} finally {
  await Promise.allSettled([host?.leave(), guest?.leave()].filter(Boolean))
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  rmSync(telemetryDirectory, { recursive: true, force: true })
}

function collectMessages(room) {
  const queued = new Map()
  const waiting = new Map()
  room.onMessage('*', (type, payload) => {
    const waiters = waiting.get(type) ?? []
    const matchingIndex = waiters.findIndex((entry) => entry.predicate(payload))
    if (matchingIndex >= 0) {
      const [entry] = waiters.splice(matchingIndex, 1)
      clearTimeout(entry.timer)
      entry.resolve(payload)
      return
    }
    const messages = queued.get(type) ?? []
    messages.push(payload)
    queued.set(type, messages)
  })

  return {
    next(type, predicate = () => true, timeoutMs = 3_000) {
      const messages = queued.get(type) ?? []
      const matchingIndex = messages.findIndex(predicate)
      if (matchingIndex >= 0) return Promise.resolve(messages.splice(matchingIndex, 1)[0])

      return new Promise((resolve, reject) => {
        const entry = { predicate, resolve, timer: null }
        entry.timer = setTimeout(() => {
          const waiters = waiting.get(type) ?? []
          const index = waiters.indexOf(entry)
          if (index >= 0) waiters.splice(index, 1)
          reject(new Error(`Timed out waiting for ${type}.`))
        }, timeoutMs)
        const waiters = waiting.get(type) ?? []
        waiters.push(entry)
        waiting.set(type, waiters)
      })
    },
  }
}

function onceSignal(signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for reconnection.')), timeoutMs)
    signal.once(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}
