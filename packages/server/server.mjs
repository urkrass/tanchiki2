import { fileURLToPath } from 'node:url'
import { matchMaker, Server, WebSocketTransport } from 'colyseus'
import {
  MAX_CLIENT_MESSAGE_BYTES,
  ONLINE_PROTOCOL_VERSION,
  normalizeRoomKey,
} from '../shared/dist/index.js'
import { RoomKeyRegistry } from './roomKeyRegistry.mjs'
import { createSessionTelemetryFromEnv } from './sessionTelemetry.mjs'
import {
  isAllowedHttpOrigin,
  resolveCorsOrigin,
  resolveServerRuntimeConfig,
} from './serverRuntimeConfig.mjs'
import { TeamBattleRoom } from './teamBattleRoom.mjs'

const isMain = Boolean(process.argv[1]) && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()

export function createTanchikiServer({
  controllerConfig,
  gracefullyShutdown = false,
  revision = 'local',
  telemetry = createSessionTelemetryFromEnv(),
} = {}) {
  configureColyseusCors()
  const registry = new RoomKeyRegistry()
  let closePromise = null
  const transport = new WebSocketTransport({
    maxPayload: MAX_CLIENT_MESSAGE_BYTES * 2,
    pingInterval: 1_000,
    pingMaxRetries: 3,
  })
  const gameServer = new Server({
    transport,
    gracefullyShutdown,
    greet: false,
    express: (app) => configureHttpRoutes(app, registry, revision),
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

function configureHttpRoutes(app, registry, revision) {
  app.use((request, response, next) => {
    setCors(request, response)
    if (request.method === 'OPTIONS') {
      response.status(204).end()
      return
    }
    if (request.path !== '/health' && !isAllowedHttpOrigin(request.headers.origin)) {
      sendJson(response, 403, {
        ok: false,
        code: 'ORIGIN_NOT_ALLOWED',
        error: 'This browser origin is not allowed.',
      })
      return
    }
    next()
  })

  app.get('/health', (_request, response) => {
    sendJson(response, 200, {
      ok: true,
      service: 'tanchiki-multiplayer',
      revision,
      privateRooms: registry.size,
    })
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
  const requestOrigin = request.headers.origin
  response.setHeader('access-control-allow-origin', resolveCorsOrigin(requestOrigin))
  response.setHeader('vary', 'Origin')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')
}

function configureColyseusCors() {
  matchMaker.controller.getCorsHeaders = (headers) => ({
    'Access-Control-Allow-Origin': resolveCorsOrigin(headers.get('origin') ?? undefined),
    Vary: 'Origin',
  })
}

if (isMain) {
  const runtime = resolveServerRuntimeConfig()
  const { gameServer, registry, server } = createTanchikiServer({
    gracefullyShutdown: true,
    revision: runtime.revision,
  })
  gameServer.onBeforeShutdown(() => {
    console.log(JSON.stringify({
      event: 'server_shutdown_started',
      privateRooms: registry.size,
      revision: runtime.revision,
    }))
  })
  gameServer.onShutdown(() => {
    console.log(JSON.stringify({ event: 'server_shutdown_complete', revision: runtime.revision }))
  })
  server.listen(runtime.port, runtime.host, () => {
    console.log(JSON.stringify({
      event: 'server_started',
      port: runtime.port,
      production: runtime.production,
      revision: runtime.revision,
    }))
  })
}
