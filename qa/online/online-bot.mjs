import NodeWebSocket from 'ws'

export const BOT_DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE = 4010
export const BOT_NETWORK_RECOVERY = Object.freeze({
  downstreamStallReconnectMs: 4_000,
  reconnectAttemptDelayMs: 2_500,
})

// Node 24 exposes an experimental native WebSocket which can retain closed
// connections during long Colyseus bot runs. Pin QA to the SDK's mature Node
// transport so the soak measures rooms, not the runtime's connection ceiling.
globalThis.WebSocket = NodeWebSocket
const { Client } = await import('@colyseus/sdk')

export const PROTOCOL_VERSION = 3

export class OnlinePlayerBot {
  constructor({ endpoint, name, seed, mode = 'scripted' }) {
    this.endpoint = endpoint
    this.name = name
    this.seed = seed >>> 0
    this.mode = mode
    this.random = mulberry32(this.seed)
    this.sdk = new Client(endpoint, { fetchFn: closeConnectionFetch })
    this.room = null
    this.lobby = null
    this.snapshot = null
    this.result = null
    this.roomKey = null
    this.inputSeq = 0
    this.heartbeatSeq = 0
    this.intervals = []
    this.waiters = []
    this.protocolError = null
    this.lastServerMessageAt = null
  }

  async create() {
    const room = await withTimeout(this.sdk.create('team_battle', {
      protocolVersion: PROTOCOL_VERSION,
      name: this.name,
      create: true,
    }), 15_000, 'room creation')
    this.attach(room)
    await this.waitFor(() => Boolean(this.roomKey))
    return this.roomKey
  }

  async join(roomKey) {
    const resolution = await fetch(`${this.endpoint}/matchmake/room-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', connection: 'close' },
      body: JSON.stringify({ protocolVersion: PROTOCOL_VERSION, roomKey }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!resolution.ok) throw new Error(`Room-key resolution failed with status ${resolution.status}.`)
    const { roomId } = await resolution.json()
    const room = await withTimeout(this.sdk.joinById(roomId, {
      protocolVersion: PROTOCOL_VERSION,
      name: this.name,
      roomKey,
    }), 15_000, 'room join')
    this.attach(room)
    await this.waitFor(() => Boolean(this.lobby))
  }

  ready() {
    this.send({ type: 'ready', protocolVersion: PROTOCOL_VERSION, ready: true })
  }

  start() {
    this.send({ type: 'start', protocolVersion: PROTOCOL_VERSION })
  }

  async waitForResult(timeoutMs = 15_000) {
    await this.waitFor(() => Boolean(this.result), timeoutMs)
    return this.result
  }

  async close() {
    for (const interval of this.intervals) clearInterval(interval)
    this.intervals = []
    const room = this.room
    this.room = null
    if (room) {
      room.reconnection.enabled = false
      room.reconnection.maxRetries = 0
      const leave = room.leave(true).catch(() => {})
      await Promise.race([leave, new Promise((resolve) => setTimeout(resolve, 500))])
      room.connection?.close()
    }
  }

  attach(room) {
    this.room = room
    this.lastServerMessageAt = Date.now()
    room.reconnection.minUptime = 0
    room.reconnection.minDelay = BOT_NETWORK_RECOVERY.reconnectAttemptDelayMs
    room.onMessage('*', (type, payload) => {
      this.lastServerMessageAt = Date.now()
      if (type === 'lobby') {
        this.lobby = payload.lobby
        this.roomKey = payload.lobby.roomKey ?? this.roomKey
      } else if (type === 'snapshot') {
        try {
          assertFogSafeSnapshot(payload.snapshot)
          this.snapshot = payload.snapshot
        } catch (error) {
          this.protocolError = error
        }
      } else if (type === 'result') {
        this.result = payload.result
        this.send({ type: 'result_ack', protocolVersion: PROTOCOL_VERSION, resultId: payload.result.resultId })
      }
      this.flushWaiters()
    })
    this.intervals.push(setInterval(() => this.sendHeartbeat(), 1_000))
    this.intervals.push(setInterval(() => this.sendInput(), 100))
    this.intervals.push(setInterval(() => {
      const now = Date.now()
      if (!shouldRecycleBotStalledConnection({
        connected: this.room === room && room.connection?.isOpen === true,
        pageVisible: true,
        lastServerMessageAt: this.lastServerMessageAt,
        now,
      })) return
      this.lastServerMessageAt = now
      room.reconnection.minDelay = BOT_NETWORK_RECOVERY.reconnectAttemptDelayMs
      room.connection.close(BOT_DOWNSTREAM_STALL_RECONNECT_CLOSE_CODE, 'DOWNSTREAM_STALL')
    }, 250))
    room.onReconnect(() => {
      this.lastServerMessageAt = Date.now()
    })
  }

  sendInput() {
    if (!this.snapshot || this.snapshot.phase !== 'playing') return
    this.inputSeq += 1
    const self = this.snapshot.players.find((player) => player.self)
    const visibleEnemy = this.snapshot.players.find((player) => !player.self && player.team !== this.snapshot.team && player.alive)
    let direction = null
    let fire = false

    if (this.mode === 'scripted') {
      direction = visibleEnemy && self ? directionToward(self, visibleEnemy) : scriptedDirection(this.inputSeq, this.seed)
      fire = Boolean(visibleEnemy) || this.inputSeq % 4 === 0
    } else {
      direction = this.random() < 0.78 ? ['up', 'right', 'down', 'left'][Math.floor(this.random() * 4)] : null
      fire = this.random() < 0.38
    }

    this.send({
      type: 'input',
      protocolVersion: PROTOCOL_VERSION,
      inputSeq: this.inputSeq,
      up: direction === 'up',
      right: direction === 'right',
      down: direction === 'down',
      left: direction === 'left',
      fire,
    })
  }

  sendHeartbeat() {
    this.heartbeatSeq += 1
    this.send({
      type: 'heartbeat',
      protocolVersion: PROTOCOL_VERSION,
      heartbeatSeq: this.heartbeatSeq,
      clientSentAt: Date.now(),
      pageVisible: true,
      fps: 60,
      longFrames: 0,
      quality: 'Good',
    })
  }

  send(message) {
    this.room?.send('command', message)
  }

  waitFor(predicate, timeoutMs = 5_000) {
    if (this.protocolError) return Promise.reject(this.protocolError)
    if (predicate()) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null }
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter((entry) => entry !== waiter)
        reject(new Error('Bot timed out waiting for room state.'))
      }, timeoutMs)
      this.waiters.push(waiter)
    })
  }

  flushWaiters() {
    for (const waiter of [...this.waiters]) {
      if (this.protocolError) {
        clearTimeout(waiter.timer)
        this.waiters = this.waiters.filter((entry) => entry !== waiter)
        waiter.reject(this.protocolError)
        continue
      }
      if (!waiter.predicate()) continue
      clearTimeout(waiter.timer)
      this.waiters = this.waiters.filter((entry) => entry !== waiter)
      waiter.resolve()
    }
  }
}

export function shouldRecycleBotStalledConnection({ connected, pageVisible, lastServerMessageAt, now }) {
  return connected
    && pageVisible
    && lastServerMessageAt !== null
    && now - lastServerMessageAt >= BOT_NETWORK_RECOVERY.downstreamStallReconnectMs
}

function closeConnectionFetch(input, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('connection', 'close')
  return fetch(input, { ...init, headers })
}

function withTimeout(promise, timeoutMs, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Bot timed out during ${label}.`)), timeoutMs)
    }),
  ]).finally(() => clearTimeout(timer))
}

export function assertFogSafeSnapshot(snapshot) {
  const visible = new Set(snapshot.visibleCells.map((cell) => `${cell.col},${cell.row}`))
  const requireVisible = (col, row, label) => {
    if (!visible.has(`${Math.floor(col)},${Math.floor(row)}`)) {
      throw new Error(`Fog regression: ${label} escaped the personalized visible set.`)
    }
  }
  const requireInsideVision = (x, y, label) => {
    const visibleAtSerializationPrecision = snapshot.vision.circles.some((circle) => {
      const dx = x - circle.x
      const dy = y - circle.y
      const serializationTolerance = 0.02
      return dx * dx + dy * dy <= (circle.radius + serializationTolerance) ** 2
    })
    if (!visibleAtSerializationPrecision) {
      throw new Error(`Fog regression: ${label} escaped every personalized vision circle.`)
    }
  }
  for (const tile of snapshot.visibleTerrain) requireVisible(tile.col, tile.row, 'terrain')
  for (const relay of snapshot.retranslators) requireVisible(relay.col, relay.row, 'relay')
  for (const player of snapshot.players) {
    if (player.self) continue
    const x = player.move
      ? player.move.fromCol + 0.5 + (player.move.toCol - player.move.fromCol) * player.move.progress
      : player.col + 0.5
    const y = player.move
      ? player.move.fromRow + 0.5 + (player.move.toRow - player.move.fromRow) * player.move.progress
      : player.row + 0.5
    requireInsideVision(x, y, 'player')
  }
  for (const bullet of snapshot.bullets) {
    requireInsideVision(bullet.x, bullet.y, 'bullet')
  }
  for (const ping of snapshot.pings) {
    if (ping.team !== snapshot.team) throw new Error('Fog regression: another team ping escaped filtering.')
  }
  for (const message of snapshot.radio) {
    if (message.team !== snapshot.team) throw new Error('Fog regression: another team radio command escaped filtering.')
  }
  for (const deployable of snapshot.deployables ?? []) {
    if (deployable.team !== snapshot.team) throw new Error('Fog regression: another team device escaped filtering.')
  }
  for (const alert of snapshot.equipmentAlerts ?? []) {
    if (alert.team !== snapshot.team) throw new Error('Fog regression: another team equipment alert escaped filtering.')
  }
  return true
}

function directionToward(source, target) {
  const horizontal = target.col - source.col
  const vertical = target.row - source.row
  if (Math.abs(horizontal) > Math.abs(vertical)) return horizontal > 0 ? 'right' : 'left'
  if (vertical !== 0) return vertical > 0 ? 'down' : 'up'
  return source.dir
}

function scriptedDirection(sequence, seed) {
  return ['up', 'right', 'down', 'left'][Math.floor(sequence / (8 + seed % 5)) % 4]
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296
  }
}
