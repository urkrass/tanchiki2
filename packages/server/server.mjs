import { fileURLToPath } from 'node:url'
import { Server, WebSocketTransport } from 'colyseus'
import {
  MAX_CLIENT_MESSAGE_BYTES,
  ONLINE_PROTOCOL_VERSION,
  normalizeRoomKey,
} from '../shared/dist/index.js'
import { RoomKeyRegistry } from './roomKeyRegistry.mjs'
import { createSessionTelemetryFromEnv } from './sessionTelemetry.mjs'
import { TeamBattleRoom } from './teamBattleRoom.mjs'

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const isMain = Boolean(process.argv[1]) && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()

export function createTanchikiServer({ controllerConfig, telemetry = createSessionTelemetryFromEnv() } = {}) {
  const registry = new RoomKeyRegistry()
  let closePromise = null
  const transport = new WebSocketTransport({
    maxPayload: MAX_CLIENT_MESSAGE_BYTES * 2,
    pingInterval: 1_000,
    pingMaxRetries: 3,
  })
  const gameServer = new Server({
    transport,
    gracefullyShutdown: false,
    greet: false,
    express: (app) => configureHttpRoutes(app, registry),
  })
  gameServer.define('team_battle', TeamBattleRoom, { registry, controllerConfig, telemetry })

  const server = {
    listen(port, hostname, callback) {
      return gameServer.listen(port, hostname, undefined, callback)
    },
    address() {
      return transport.server?.address() ?? null
    },
    close(callback) {
      closePromise ??= gameServer.gracefullyShutdown(false)
      closePromise.then(() => callback?.()).catch((error) => callback?.(error))
      return closePromise
    },
  }
  return { server, registry, transport, gameServer, telemetry }
}

function configureHttpRoutes(app, registry) {
  app.use((request, response, next) => {
    setCors(request, response)
    if (request.method === 'OPTIONS') {
      response.status(204).end()
      return
    }
    next()
  })

  app.get('/health', (_request, response) => {
    sendJson(response, 200, { ok: true, privateRooms: registry.size })
  })

  app.post('/matchmake/room-key', route(async (request, response) => {
    const body = await readJson(request)
    if (body.protocolVersion !== ONLINE_PROTOCOL_VERSION) {
      sendJson(response, 400, { ok: false, code: 'PROTOCOL_VERSION_UNSUPPORTED' })
      return
    }
    const roomId = registry.resolve(normalizeRoomKey(body.roomKey))
    if (!roomId) {
      sendJson(response, 404, { ok: false, code: 'ROOM_KEY_NOT_FOUND' })
      return
    }
    sendJson(response, 200, { ok: true, roomId })
  }))

  // Existing voice token boundary is preserved without adding LiveKit work.
  app.post('/livekit/token', route(async (_request, response) => {
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
      sendJson(response, 503, { ok: false, error: 'livekit_not_configured' })
      return
    }
    sendJson(response, 501, {
      ok: false,
      error: 'livekit_sdk_required',
      detail: 'Install livekit-server-sdk in deployment and mint team-room tokens server-side.',
    })
  }))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.byteLength
    if (size > MAX_CLIENT_MESSAGE_BYTES) throw new Error('request_body_too_large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function route(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response)).catch((error) => {
      if (response.headersSent) {
        next(error)
        return
      }
      const status = error instanceof SyntaxError || error?.message === 'request_body_too_large' ? 400 : 500
      sendJson(response, status, { ok: false, error: error instanceof Error ? error.message : 'server_error' })
    })
  }
}

function sendJson(response, status, body) {
  response.status(status).type('application/json').send(JSON.stringify(body))
}

function setCors(request, response) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN
  const requestOrigin = request.headers.origin
  const localDevelopment = process.env.NODE_ENV !== 'production'
  if (configuredOrigin && requestOrigin === configuredOrigin) {
    response.setHeader('access-control-allow-origin', configuredOrigin)
  } else if (localDevelopment && requestOrigin) {
    response.setHeader('access-control-allow-origin', requestOrigin)
  }
  response.setHeader('vary', 'Origin')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')
}

if (isMain) {
  const { server } = createTanchikiServer()
  server.listen(DEFAULT_PORT, '0.0.0.0', () => {
    console.log(`Tanchiki multiplayer server listening on port ${DEFAULT_PORT}`)
  })
}
