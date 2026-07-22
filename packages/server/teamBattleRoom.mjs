import { Room, ServerError } from 'colyseus'
import {
  MAX_CLIENT_MESSAGE_BYTES,
  MAX_ROOM_PLAYERS,
  RECONNECTION_WINDOW_SECONDS,
  addChatMessage,
  addPlayer,
  addTeamPing,
  createMatchState,
  createSnapshotForPlayer,
  deactivatePlayer,
  estimateMessageBytes,
  neutralizePlayerInput,
  removePlayer,
  setPlayerCommand,
  setPlayerTeam,
  startMatch,
  updateMatch,
  validateClientRoomMessage,
  validateJoinRoomOptions,
} from '../shared/dist/index.js'
import { OnlineRoomError, TeamBattleController } from './teamBattleController.mjs'

const SIMULATION_MS = 50
const SNAPSHOT_MS = 50

export class TeamBattleRoom extends Room {
  async onCreate(options) {
    if (!options?.registry) throw new Error('TeamBattleRoom requires a room-key registry.')

    this.maxClients = MAX_ROOM_PLAYERS
    this.maxMessagesPerSecond = 45
    this.autoDispose = false
    this.setPatchRate(null)
    await this.setPrivate(true)

    this.controller = new TeamBattleController({
      roomId: this.roomId,
      registry: options.registry,
      engine: options.engine ?? createEngineAdapter(),
      config: options.controllerConfig,
      onPhaseChange: (phase) => this.#handlePhaseChange(phase),
      onDestroyRequested: () => queueMicrotask(() => this.#disconnectOnce()),
    })

    this.onMessage('command', (client, rawMessage) => {
      this.#handleCommand(client, rawMessage)
    })
    this.setSimulationInterval((deltaMs) => {
      const startedAt = performance.now()
      this.controller.tick(deltaMs / 1000)
        .then(() => this.controller.recordServerTick(performance.now() - startedAt, deltaMs - SIMULATION_MS))
        .catch((error) => this.#handleControllerFailure(error))
    }, SIMULATION_MS)
    this.clock.setInterval(() => this.controller.sendSnapshots(), SNAPSHOT_MS)
  }

  onAuth(_client, rawOptions, context) {
    validateOrigin(context)
    const validated = validateJoinRoomOptions(rawOptions)
    if (!validated.ok) throw matchmakingError(validated.code, validated.message)

    try {
      this.controller.canReserve(validated.value)
    } catch (error) {
      throw matchmakingErrorFrom(error)
    }
    return validated.value
  }

  async onJoin(client, _options, auth) {
    try {
      const slot = await this.controller.join({
        sessionId: client.sessionId,
        name: auth.name,
        roomKey: auth.roomKey,
        create: auth.create,
        ...connectionAdapter(client, this.controller),
      })
      client.userData = {
        playerId: slot.playerId,
        connectionEpoch: slot.connectionEpoch,
        dropped: false,
        commandTimes: [],
      }
    } catch (error) {
      throw matchmakingErrorFrom(error)
    }
  }

  async onDrop(client) {
    const identity = client.userData
    if (!identity?.playerId) return

    identity.dropped = true
    const dropped = await this.controller.drop(identity.playerId, identity.connectionEpoch)
    if (dropped || this.controller.canReconnect(identity.playerId, identity.connectionEpoch)) {
      this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS)
    }
  }

  async onReconnect(client) {
    const identity = client.userData
    if (!identity?.playerId) throw matchmakingError('RECONNECTION_EXPIRED', 'The player identity is unavailable.')

    const slot = await this.controller.reconnect(
      identity.playerId,
      identity.connectionEpoch,
      { sessionId: client.sessionId, ...connectionAdapter(client, this.controller) },
    )
    client.userData = {
      playerId: slot.playerId,
      connectionEpoch: slot.connectionEpoch,
      dropped: false,
      commandTimes: [],
    }
  }

  async onLeave(client) {
    const identity = client.userData
    if (!identity?.playerId) return

    if (identity.dropped) {
      await this.controller.expire(identity.playerId, identity.connectionEpoch)
    } else {
      await this.controller.leave(identity.playerId, identity.connectionEpoch)
    }
  }

  onDispose() {
    this.controller?.dispose()
  }

  #handleCommand(client, rawMessage) {
    const playerId = client.userData?.playerId
    if (!playerId) return

    const now = Date.now()
    const commandTimes = client.userData.commandTimes ??= []
    while (commandTimes.length > 0 && now - commandTimes[0] >= 1_000) commandTimes.shift()
    if (commandTimes.length >= 40) {
      client.send('error', { type: 'error', code: 'RATE_LIMITED', message: 'Too many room messages were sent at once.' })
      return
    }
    commandTimes.push(now)

    if (estimateMessageBytes(rawMessage) > MAX_CLIENT_MESSAGE_BYTES) {
      client.send('error', { type: 'error', code: 'MESSAGE_TOO_LARGE', message: 'Room messages may not exceed 2048 bytes.' })
      return
    }

    const validated = validateClientRoomMessage(rawMessage)
    if (!validated.ok) {
      client.send('error', { type: 'error', code: validated.code, message: validated.message })
      return
    }

    this.controller.command(playerId, validated.value).catch((error) => {
      const normalized = normalizeControllerError(error)
      client.send('error', { type: 'error', ...normalized })
    })
  }

  #handlePhaseChange(phase) {
    if (phase === 'LOBBY') {
      this.unlock().catch((error) => this.#handleControllerFailure(error))
    } else if (phase !== 'DESTROYED') {
      this.lock().catch((error) => this.#handleControllerFailure(error))
    }
  }

  #handleControllerFailure(error) {
    const normalized = normalizeControllerError(error)
    for (const client of this.clients) {
      client.send('error', { type: 'error', ...normalized })
    }
  }

  async #disconnectOnce() {
    if (this.disconnecting) return
    this.disconnecting = true
    await this.disconnect(4000)
  }
}

export function createEngineAdapter() {
  return {
    addChatMessage,
    addPlayer,
    addTeamPing,
    createMatchState,
    createSnapshotForPlayer,
    deactivatePlayer,
    neutralizePlayerInput,
    removePlayer,
    setPlayerCommand,
    setPlayerTeam,
    startMatch,
    updateMatch,
  }
}

function connectionAdapter(client, controller) {
  return {
    send: (type, payload) => {
      if (type === 'snapshot' && Number(client.ref?.bufferedAmount ?? 0) > 64 * 1024) {
        controller.recordBackpressure(client.userData?.playerId)
        return
      }
      client.send(type, payload)
    },
    leave: (code, data) => client.leave(code, data),
  }
}

function normalizeControllerError(error) {
  if (error instanceof OnlineRoomError) return { code: error.code, message: error.message }
  return { code: 'MESSAGE_INVALID', message: error instanceof Error ? error.message : 'Room command failed.' }
}

function matchmakingErrorFrom(error) {
  const normalized = normalizeControllerError(error)
  return matchmakingError(normalized.code, normalized.message)
}

function matchmakingError(code, message) {
  return new ServerError(4000, `${code}:${message}`)
}

function validateOrigin(context) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN
  const production = process.env.NODE_ENV === 'production'
  const origin = context?.headers?.get?.('origin') ?? context?.headers?.origin
  if ((production && !allowedOrigin) || (allowedOrigin && origin !== allowedOrigin)) {
    throw matchmakingError('ORIGIN_NOT_ALLOWED', 'This browser origin is not allowed.')
  }
}
