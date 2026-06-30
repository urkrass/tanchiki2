import http from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import {
  addChatMessage,
  addPlayer,
  addTeamPing,
  createMatchState,
  createSnapshotForPlayer,
  removePlayer,
  setPlayerCommand,
  updateMatch,
} from '../shared/dist/index.js'

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const TICK_MS = 50
const SNAPSHOT_MS = 100
const isMain = Boolean(process.argv[1]) && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()

export function createTanchikiServer() {
  const rooms = new Map()
  const streams = new Map()

  function getRoom(roomId = 'quick') {
    let state = rooms.get(roomId)
    if (!state) {
      state = createMatchState(roomId)
      rooms.set(roomId, state)
    }
    return state
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)
    setCors(response)

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          ok: true,
          rooms: rooms.size,
          players: [...rooms.values()].reduce((total, room) => total + Object.keys(room.players).length, 0),
        })
        return
      }

      if (request.method === 'POST' && url.pathname === '/rooms/quick/join') {
        const body = await readJson(request)
        const room = getRoom('quick')
        const playerId = `p-${room.nextId++}`
        const player = addPlayer(room, playerId, String(body.name ?? 'Rookie'), body.team === 'red' ? 'red' : body.team === 'blue' ? 'blue' : undefined)
        sendJson(response, 200, { roomId: room.id, playerId, team: player.team, name: player.name })
        return
      }

      const commandMatch = url.pathname.match(/^\/rooms\/([^/]+)\/commands$/)
      if (request.method === 'POST' && commandMatch) {
        const room = getRoom(commandMatch[1])
        const body = await readJson(request)
        const ok = setPlayerCommand(room, String(body.playerId ?? ''), body.command ?? {})
        sendJson(response, ok ? 200 : 404, { ok })
        return
      }

      const chatMatch = url.pathname.match(/^\/rooms\/([^/]+)\/chat$/)
      if (request.method === 'POST' && chatMatch) {
        const room = getRoom(chatMatch[1])
        const body = await readJson(request)
        const message = addChatMessage(room, String(body.playerId ?? ''), String(body.text ?? ''))
        sendJson(response, message ? 200 : 400, { ok: Boolean(message), message })
        return
      }

      const pingMatch = url.pathname.match(/^\/rooms\/([^/]+)\/pings$/)
      if (request.method === 'POST' && pingMatch) {
        const room = getRoom(pingMatch[1])
        const body = await readJson(request)
        const ping = addTeamPing(room, String(body.playerId ?? ''), Number(body.col), Number(body.row))
        sendJson(response, ping ? 200 : 400, { ok: Boolean(ping), ping })
        return
      }

      const eventsMatch = url.pathname.match(/^\/rooms\/([^/]+)\/events$/)
      if (request.method === 'GET' && eventsMatch) {
        const room = getRoom(eventsMatch[1])
        const playerId = String(url.searchParams.get('playerId') ?? '')
        if (!room.players[playerId]) {
          sendJson(response, 404, { ok: false, error: 'unknown_player' })
          return
        }
        openEventStream(streams, rooms, room.id, playerId, request, response)
        return
      }

      if (request.method === 'POST' && url.pathname === '/livekit/token') {
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
          sendJson(response, 503, { ok: false, error: 'livekit_not_configured' })
          return
        }
        sendJson(response, 501, {
          ok: false,
          error: 'livekit_sdk_required',
          detail: 'Install livekit-server-sdk in deployment and mint team-room tokens server-side.',
        })
        return
      }

      sendJson(response, 404, { ok: false, error: 'not_found' })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : 'server_error' })
    }
  })

  const tickInterval = setInterval(() => {
    for (const room of rooms.values()) {
      updateMatch(room, TICK_MS / 1000)
    }
  }, TICK_MS)

  const streamInterval = setInterval(() => {
    for (const stream of streams.values()) {
      const room = rooms.get(stream.roomId)
      const snapshot = room ? createSnapshotForPlayer(room, stream.playerId) : null
      if (!snapshot) {
        stream.response.write(`event: close\ndata: ${JSON.stringify({ reason: 'missing_player' })}\n\n`)
        stream.response.end()
        streams.delete(stream.id)
        continue
      }
      stream.response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
    }
  }, SNAPSHOT_MS)

  server.on('close', () => {
    clearInterval(tickInterval)
    clearInterval(streamInterval)
    for (const stream of streams.values()) {
      stream.response.end()
    }
    streams.clear()
  })

  return { server, rooms }
}

async function runSmoke() {
  const { server } = createTanchikiServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('server did not bind a TCP port')
  const base = `http://127.0.0.1:${address.port}`
  const joinA = await postJson(`${base}/rooms/quick/join`, { name: 'Blue' })
  const joinB = await postJson(`${base}/rooms/quick/join`, { name: 'Red' })
  await postJson(`${base}/rooms/${joinA.roomId}/commands`, { playerId: joinA.playerId, command: { right: true, fire: true, seq: 1 } })
  await postJson(`${base}/rooms/${joinA.roomId}/chat`, { playerId: joinA.playerId, text: 'Relay left' })
  const health = await fetch(`${base}/health`).then((response) => response.json())
  if (!health.ok || health.players < 2 || !joinB.playerId) {
    throw new Error('server smoke failed')
  }
  await new Promise((resolve) => server.close(resolve))
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`${url} failed: ${JSON.stringify(payload)}`)
  return payload
}

function openEventStream(streams, rooms, roomId, playerId, request, response) {
  const id = `${roomId}:${playerId}:${Date.now()}:${Math.random().toString(16).slice(2)}`
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  response.write(`event: ready\ndata: ${JSON.stringify({ roomId, playerId })}\n\n`)
  streams.set(id, { id, roomId, playerId, response })
  request.on('close', () => {
    streams.delete(id)
    const room = rooms.get(roomId)
    if (room) removePlayer(room, playerId)
  })
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function setCors(response) {
  response.setHeader('access-control-allow-origin', process.env.ALLOWED_ORIGIN ?? '*')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')
}

if (process.argv.includes('--smoke')) {
  runSmoke().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else if (isMain) {
  const { server } = createTanchikiServer()
  server.listen(DEFAULT_PORT, () => {
    console.log(`Tanchiki multiplayer server listening on http://127.0.0.1:${DEFAULT_PORT}`)
  })
}
