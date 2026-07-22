import { randomUUID } from 'node:crypto'

const DEFAULTS = Object.freeze({
  maxPlayers: 4,
  countdownMs: 3_000,
  reconnectMs: 15_000,
  terminalMs: 30_000,
  idleLobbyMs: null,
  heartbeatTimeoutMs: 3_500,
  radioCooldownMs: 1_000,
  pingCooldownMs: 500,
  scoreLimit: 15,
  roundDurationMs: 8 * 60_000,
})

export class OnlineRoomError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'OnlineRoomError'
    this.code = code
  }
}

export class TeamBattleController {
  #engine
  #registry
  #now
  #randomUUID
  #config
  #serial = Promise.resolve()
  #connections = new Map()
  #sessionToPlayer = new Map()
  #destroyRequested = false
  #onPhaseChange
  #onDestroyRequested
  #serverTickDurations = []
  #serverTickDrifts = []
  #serverTickOverruns = 0
  #telemetryPlayerSequence = 0
  #onTelemetry

  constructor({
    roomId,
    registry,
    engine,
    now = () => Date.now(),
    uuid = () => randomUUID(),
    config = {},
    onPhaseChange = () => {},
    onDestroyRequested = () => {},
    onTelemetry = () => {},
  }) {
    this.roomId = requireText(roomId, 'roomId')
    this.#registry = registry
    this.#engine = requireEngine(engine)
    this.#now = now
    this.#randomUUID = uuid
    this.#config = { ...DEFAULTS, ...config }
    this.#onPhaseChange = onPhaseChange
    this.#onDestroyRequested = onDestroyRequested
    this.#onTelemetry = onTelemetry
    this.phase = 'LOBBY'
    this.version = 1
    this.createdAt = this.#now()
    this.lastActivityAt = this.createdAt
    this.countdownEndsAt = null
    this.terminalExpiresAt = null
    this.matchId = null
    this.playingStartedAt = null
    this.result = null
    this.resultAcks = new Set()
    this.resultEligible = new Set()
    this.slots = new Map()
    this.match = this.#engine.createMatchState(this.roomId)
    this.roomKey = this.#registry.register(this.roomId)
    this.#telemetry('room_created', {
      phase: this.phase,
      maxPlayers: this.#config.maxPlayers,
    }, {
      roomId: this.roomId,
      roomKey: this.roomKey,
    })
  }

  enqueue(operation) {
    const task = this.#serial.then(() => operation())
    this.#serial = task.catch(() => {})
    return task
  }

  canReserve(options) {
    if (this.phase === 'DESTROYED') throw roomError('ROOM_DESTROYED', 'This room has already been destroyed.')
    if (this.phase !== 'LOBBY') throw roomError('ROOM_LOCKED', 'Deployment has already started.')
    if (this.slots.size >= this.#config.maxPlayers) throw roomError('ROOM_FULL', 'This room already has four players.')
    if (options.create === true && this.slots.size > 0) throw roomError('ROOM_LOCKED', 'This room has already been created.')
    if (options.create !== true && this.#registry.resolve(options.roomKey) !== this.roomId) {
      throw roomError('ROOM_KEY_NOT_FOUND', 'No open room matches that key.')
    }
    return true
  }

  canReconnect(playerId, observedEpoch) {
    const slot = this.slots.get(playerId)
    return Boolean(
      slot
      && !slot.connected
      && !slot.expired
      && !slot.kicked
      && slot.connectionEpoch === observedEpoch
      && slot.expiresAt !== null
      && this.#now() <= slot.expiresAt
    )
  }

  join({ sessionId, name, roomKey, create, classId, telemetryIp = null, send, leave }) {
    return this.enqueue(() => {
      this.canReserve({ create: create === true, roomKey })
      const playerId = this.#randomUUID()
      const host = this.slots.size === 0
      const team = this.#teamWithFewestPlayers()
      const telemetryPlayer = `p${++this.#telemetryPlayerSequence}`
      const gameplayPlayer = this.#engine.addPlayer(this.match, playerId, name, team, classId)
      const selectedClassId = gameplayPlayer?.classId ?? classId ?? 'engineer'
      const slot = {
        playerId,
        sessionId: requireText(sessionId, 'sessionId'),
        name,
        team,
        classId: selectedClassId,
        ready: false,
        connected: true,
        host,
        connectionEpoch: 1,
        expired: false,
        kicked: false,
        disconnectedAt: null,
        expiresAt: null,
        quality: 'Measuring',
        lastHeartbeatAt: this.#now(),
        lastRadioAt: Number.NEGATIVE_INFINITY,
        lastPingAt: Number.NEGATIVE_INFINITY,
        heartbeatTimedOut: false,
        diagnostics: createPlayerDiagnostics(),
        telemetryPlayer,
        telemetryIp,
      }
      this.slots.set(playerId, slot)
      this.#sessionToPlayer.set(slot.sessionId, playerId)
      this.#connections.set(playerId, { send, leave })
      this.#telemetry('player_joined', {
        player: telemetryPlayer,
        team,
        classId: selectedClassId,
        host,
      }, {
        playerId,
        sessionId: slot.sessionId,
        name,
        ip: telemetryIp,
        roomKey: this.roomKey,
      })
      this.#touch()
      this.#broadcastLobby()
      return { ...slot }
    })
  }

  command(playerId, message) {
    return this.enqueue(() => {
      const slot = this.#requireActiveSlot(playerId)
      this.#touch()

      if (message.type === 'team') return this.#changeTeam(slot, message.team)
      if (message.type === 'class') return this.#changeClass(slot, message.classId)
      if (message.type === 'ready') return this.#changeReady(slot, message.ready)
      if (message.type === 'start') return this.#startCountdown(slot)
      if (message.type === 'kick') return this.#kick(slot, message.playerId)
      if (message.type === 'input') return this.#input(slot, message)
      if (message.type === 'equipment') return this.#equipment(slot, message)
      if (message.type === 'radio') return this.#radio(slot, message.command)
      if (message.type === 'ping') return this.#ping(slot, message.col, message.row)
      if (message.type === 'heartbeat') return this.#heartbeat(slot, message)
      if (message.type === 'result_ack') return this.#ackResult(slot, message.resultId)
      return this.#fail(slot.playerId, 'MESSAGE_INVALID', 'Unsupported room message.')
    })
  }

  drop(playerId, observedEpoch) {
    return this.enqueue(() => {
      const slot = this.slots.get(playerId)
      if (!slot || slot.expired || slot.connectionEpoch !== observedEpoch || !slot.connected) return false
      return this.#markDropped(slot)
    })
  }

  reconnect(playerId, observedEpoch, { sessionId, telemetryIp = null, send, leave }) {
    return this.enqueue(() => {
      const slot = this.slots.get(playerId)
      if (this.phase === 'DESTROYED' || !slot || slot.kicked || slot.expired || slot.connectionEpoch !== observedEpoch) {
        throw roomError('RECONNECTION_EXPIRED', 'The reserved player slot is no longer available.')
      }
      if (slot.expiresAt !== null && this.#now() > slot.expiresAt) {
        throw roomError('RECONNECTION_EXPIRED', 'The reconnection window has expired.')
      }
      slot.sessionId = requireText(sessionId, 'sessionId')
      slot.connectionEpoch += 1
      slot.connected = true
      slot.disconnectedAt = null
      slot.expiresAt = null
      slot.quality = 'Measuring'
      slot.lastHeartbeatAt = this.#now()
      slot.heartbeatTimedOut = false
      slot.telemetryIp = telemetryIp ?? slot.telemetryIp
      slot.diagnostics.reconnectCount += 1
      slot.diagnostics.reconnectSuccessCount += 1
      if (slot.diagnostics.disconnectStartedAt !== null) {
        slot.diagnostics.stallDurationMs += this.#now() - slot.diagnostics.disconnectStartedAt
        slot.diagnostics.disconnectStartedAt = null
      }
      this.#sessionToPlayer.set(slot.sessionId, playerId)
      this.#connections.set(playerId, { send, leave })
      this.#telemetry('player_reconnected', {
        player: slot.telemetryPlayer,
        phase: this.phase,
        connectionEpoch: slot.connectionEpoch,
      }, {
        playerId,
        sessionId: slot.sessionId,
        name: slot.name,
        ip: slot.telemetryIp,
      })
      this.#touch()
      if (this.phase === 'RESULTS' && this.result) {
        this.#send(playerId, 'result', { type: 'result', result: this.result })
      } else {
        this.sendSnapshot(playerId)
        this.#broadcastLobby()
      }
      return { ...slot }
    })
  }

  leave(playerId, observedEpoch, { kicked = false } = {}) {
    return this.enqueue(() => {
      const slot = this.slots.get(playerId)
      if (!slot || slot.connectionEpoch !== observedEpoch) return false
      if (kicked || slot.kicked) return false

      this.#connections.delete(playerId)
      slot.connected = false
      slot.ready = false
      this.#telemetry('player_left', {
        player: slot.telemetryPlayer,
        phase: this.phase,
      }, {
        playerId,
        sessionId: slot.sessionId,
        name: slot.name,
        ip: slot.telemetryIp,
      })
      this.#engine.neutralizePlayerInput(this.match, playerId)

      if (this.phase === 'LOBBY' || this.phase === 'COUNTDOWN') {
        if (slot.host) {
          this.#requestDestroy()
          return true
        }
        this.#removeSlot(playerId)
        if (this.phase === 'COUNTDOWN') this.#cancelCountdown()
        this.#broadcastLobby()
        return true
      }

      if (this.phase === 'PLAYING') {
        this.#expireSlot(slot)
        return true
      }

      if (this.phase === 'RESULTS') {
        this.#checkResultCompletion()
        return true
      }
      return false
    })
  }

  expire(playerId, observedEpoch) {
    return this.enqueue(() => {
      const slot = this.slots.get(playerId)
      if (!slot || slot.connectionEpoch !== observedEpoch || slot.connected || slot.expired) return false
      if (slot.expiresAt !== null && this.#now() < slot.expiresAt) return false
      return this.#expireDisconnectedSlot(slot)
    })
  }

  tick(dtSeconds) {
    return this.enqueue(() => {
      const now = this.#now()
      if (this.phase === 'DESTROYED') return this.phase

      if (this.phase === 'PLAYING') {
        for (const slot of this.slots.values()) {
          if (!slot.connected || slot.expired || slot.heartbeatTimedOut) continue
          if (now - slot.lastHeartbeatAt < this.#config.heartbeatTimeoutMs) continue
          const connection = this.#connections.get(slot.playerId)
          slot.heartbeatTimedOut = true
          slot.diagnostics.missedHeartbeats += 1
          slot.diagnostics.stallCount += 1
          slot.diagnostics.stallDurationMs += now - slot.lastHeartbeatAt
          this.#markDropped(slot)
          connection?.leave?.(4001, 'HEARTBEAT_TIMEOUT')
        }
        for (const slot of [...this.slots.values()]) {
          if (slot.connected || slot.expired || slot.expiresAt === null || now < slot.expiresAt) continue
          this.#expireDisconnectedSlot(slot)
        }
      }

      if (
        this.phase === 'LOBBY'
        && Number.isFinite(this.#config.idleLobbyMs)
        && now - this.lastActivityAt >= this.#config.idleLobbyMs
      ) {
        this.#requestDestroy()
        return this.phase
      }

      if (this.phase === 'COUNTDOWN' && this.countdownEndsAt !== null && now >= this.countdownEndsAt) {
        const readinessError = this.#startValidationError()
        if (readinessError) {
          this.#cancelCountdown()
        } else {
          this.matchId = this.#randomUUID()
          this.playingStartedAt = now
          for (const slot of this.slots.values()) {
            if (slot.connected && !slot.expired) slot.lastHeartbeatAt = now
          }
          this.#engine.startMatch(this.match)
          this.#setPhase('PLAYING')
          this.countdownEndsAt = null
          this.#broadcastLobby()
        }
      }

      if (this.phase === 'PLAYING') {
        this.#engine.updateMatch(this.match, dtSeconds)
        const reachedScore = this.match.scores.blue >= this.#config.scoreLimit || this.match.scores.red >= this.#config.scoreLimit
        const reachedTime = this.playingStartedAt !== null && now - this.playingStartedAt >= this.#config.roundDurationMs
        if (this.match.phase === 'finished' || reachedScore || reachedTime) {
          const reason = reachedScore ? 'SCORE_LIMIT' : 'TIME_LIMIT'
          const winner = this.match.scores.blue === this.match.scores.red
            ? null
            : this.match.scores.blue > this.match.scores.red ? 'blue' : 'red'
          this.#commitResult(reason, winner)
        } else {
          this.#adjudicateExpiredTeams()
        }
      }

      if (this.phase === 'RESULTS') {
        if (this.#allResultAcksReceived() || (this.terminalExpiresAt !== null && now >= this.terminalExpiresAt)) {
          this.#requestDestroy()
        }
      }
      return this.phase
    })
  }

  sendSnapshots() {
    if (this.phase !== 'PLAYING') return 0
    let count = 0
    for (const slot of this.slots.values()) {
      if (slot.connected && !slot.expired && this.sendSnapshot(slot.playerId)) count += 1
    }
    return count
  }

  recordServerTick(durationMs, driftMs) {
    pushSample(this.#serverTickDurations, durationMs)
    pushSample(this.#serverTickDrifts, Math.abs(driftMs))
    if (durationMs > 50 || Math.abs(driftMs) > 10) this.#serverTickOverruns += 1
  }

  recordBackpressure(playerId) {
    const slot = this.slots.get(playerId)
    if (!slot) return false
    slot.diagnostics.backpressureEvents += 1
    return true
  }

  sendSnapshot(playerId) {
    if (this.phase !== 'PLAYING') return false
    const snapshot = this.#engine.createSnapshotForPlayer(this.match, playerId)
    if (!snapshot) return false
    return this.#send(playerId, 'snapshot', { type: 'snapshot', snapshot })
  }

  inspect() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      version: this.version,
      countdownEndsAt: this.countdownEndsAt,
      terminalExpiresAt: this.terminalExpiresAt,
      matchId: this.matchId,
      playingStartedAt: this.playingStartedAt,
      result: this.result,
      resultAcks: [...this.resultAcks],
      slots: [...this.slots.values()].map((slot) => ({ ...slot })),
      serverTick: this.match.serverTick,
      scores: { ...this.match.scores },
      network: this.#networkSummary(),
    }
  }

  dispose() {
    this.#registry.deleteByRoom(this.roomId)
    this.#connections.clear()
    this.#sessionToPlayer.clear()
    this.resultAcks.clear()
    this.resultEligible.clear()
    this.slots.clear()
    this.roomKey = null
    if (this.phase !== 'DESTROYED') this.#setPhase('DESTROYED')
  }

  #changeTeam(slot, team) {
    if (this.phase !== 'LOBBY') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Teams are frozen after deployment begins.')
    if (slot.team === team) return true
    slot.team = team
    slot.ready = false
    this.#engine.setPlayerTeam(this.match, slot.playerId, team)
    this.#version()
    this.#broadcastLobby()
    return true
  }

  #changeClass(slot, classId) {
    if (this.phase !== 'LOBBY') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Tank class is frozen after deployment begins.')
    if (slot.classId === classId) return true
    const accepted = this.#engine.setPlayerClass(this.match, slot.playerId, classId)
    if (!accepted) return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Tank class is unavailable right now.')
    slot.classId = classId
    slot.ready = false
    this.#version()
    this.#broadcastLobby()
    return true
  }

  #changeReady(slot, ready) {
    if (this.phase === 'COUNTDOWN') {
      if (ready) return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Ready state is frozen during countdown.')
      this.#cancelCountdown()
      this.#broadcastLobby()
      return true
    }
    if (this.phase !== 'LOBBY') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Ready state is available only in the lobby.')
    if (!slot.connected) return this.#fail(slot.playerId, 'PLAYER_DISCONNECTED', 'Disconnected players cannot become Ready.')
    slot.ready = ready
    this.#version()
    this.#broadcastLobby()
    return true
  }

  #startCountdown(slot) {
    if (!slot.host) return this.#fail(slot.playerId, 'NOT_HOST', 'Only the host can start deployment.')
    if (this.phase !== 'LOBBY') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Deployment has already started.')
    const readinessError = this.#startValidationError()
    if (readinessError) return this.#fail(slot.playerId, readinessError.code, readinessError.message)
    this.countdownEndsAt = this.#now() + this.#config.countdownMs
    this.#setPhase('COUNTDOWN')
    this.#broadcastLobby()
    return true
  }

  #kick(host, targetPlayerId) {
    if (!host.host) return this.#fail(host.playerId, 'NOT_HOST', 'Only the host can kick a player.')
    if (this.phase !== 'LOBBY') return this.#fail(host.playerId, 'COMMAND_NOT_ALLOWED', 'Players can be kicked only in the lobby.')
    if (host.playerId === targetPlayerId) return this.#fail(host.playerId, 'HOST_CANNOT_KICK_SELF', 'The host cannot kick themselves.')
    const target = this.slots.get(targetPlayerId)
    if (!target) return this.#fail(host.playerId, 'PLAYER_NOT_FOUND', 'That player is no longer in the room.')

    const previousRoomKey = this.roomKey
    this.#telemetry('player_kicked', {
      player: target.telemetryPlayer,
      by: host.telemetryPlayer,
    }, {
      playerId: target.playerId,
      name: target.name,
      ip: target.telemetryIp,
    })
    target.kicked = true
    target.expired = true
    target.connected = false
    this.#engine.neutralizePlayerInput(this.match, targetPlayerId)
    const connection = this.#connections.get(targetPlayerId)
    this.#removeSlot(targetPlayerId)
    this.roomKey = this.#registry.rotate(this.roomId)
    this.#telemetry('room_key_rotated', {}, {
      previousRoomKey,
      roomKey: this.roomKey,
    })
    connection?.leave?.(4403, 'PLAYER_KICKED')
    this.#send(host.playerId, 'room_key', { type: 'room_key', roomKey: this.roomKey })
    this.#version()
    this.#broadcastLobby()
    return true
  }

  #input(slot, message) {
    if (this.phase !== 'PLAYING' || !slot.connected || slot.expired) {
      return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Gameplay input is unavailable right now.')
    }
    return this.#engine.setPlayerCommand(this.match, slot.playerId, {
      up: message.up,
      down: message.down,
      left: message.left,
      right: message.right,
      fire: message.fire,
      seq: message.inputSeq,
    })
  }

  #equipment(slot, message) {
    if (this.phase !== 'PLAYING' || !slot.connected || slot.expired) {
      return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Equipment input is unavailable right now.')
    }
    return this.#engine.setPlayerEquipment(
      this.match,
      slot.playerId,
      message.slot,
      message.down,
      message.equipmentSeq,
    )
  }

  #radio(slot, command) {
    if (this.phase !== 'PLAYING') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Team radio is available during play.')
    const now = this.#now()
    if (now - slot.lastRadioAt < this.#config.radioCooldownMs) {
      return this.#fail(slot.playerId, 'RATE_LIMITED', 'Wait a moment before sending another radio command.')
    }
    const accepted = Boolean(this.#engine.addTeamRadioMessage(this.match, slot.playerId, command))
    if (accepted) {
      slot.lastRadioAt = now
      this.#telemetry('radio_command', {
        player: slot.telemetryPlayer,
        team: slot.team,
        command,
      }, {
        playerId: slot.playerId,
        name: slot.name,
        ip: slot.telemetryIp,
      })
    }
    return accepted
  }

  #ping(slot, col, row) {
    if (this.phase !== 'PLAYING') return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'Team pings are available during play.')
    const now = this.#now()
    if (now - slot.lastPingAt < this.#config.pingCooldownMs) {
      return this.#fail(slot.playerId, 'RATE_LIMITED', 'Wait a moment before placing another team ping.')
    }
    const accepted = Boolean(this.#engine.addTeamPing(this.match, slot.playerId, col, row))
    if (accepted) {
      slot.lastPingAt = now
      this.#telemetry('team_ping', {
        player: slot.telemetryPlayer,
        team: slot.team,
        col,
        row,
      }, {
        playerId: slot.playerId,
        name: slot.name,
        ip: slot.telemetryIp,
      })
    }
    return accepted
  }

  #heartbeat(slot, message) {
    const now = this.#now()
    const previousQuality = slot.quality
    slot.lastHeartbeatAt = now
    slot.heartbeatTimedOut = false
    slot.diagnostics.heartbeatCount += 1
    if (!message.pageVisible) slot.diagnostics.hiddenHeartbeatCount += 1
    if (message.rttMs !== undefined) pushSample(slot.diagnostics.rtt, message.rttMs)
    if (message.inputAckMs !== undefined) pushSample(slot.diagnostics.inputAck, message.inputAckMs)
    if (message.snapshotGapMs !== undefined) pushSample(slot.diagnostics.snapshotGap, message.snapshotGapMs)
    if (message.fps !== undefined) pushSample(slot.diagnostics.fps, message.fps)
    if (message.longFrames !== undefined) slot.diagnostics.clientLongFrames = Math.max(slot.diagnostics.clientLongFrames, message.longFrames)
    if (message.quality && message.quality !== 'Disconnected') slot.quality = message.quality
    if (slot.quality !== previousQuality && (this.phase === 'LOBBY' || this.phase === 'COUNTDOWN')) {
      this.#version()
      this.#broadcastLobby()
    }
    return this.#send(slot.playerId, 'heartbeat_ack', {
      type: 'heartbeat_ack',
      heartbeatSeq: message.heartbeatSeq,
      clientSentAt: message.clientSentAt,
      serverReceivedAt: now,
      serverSentAt: this.#now(),
      serverTick: this.match.serverTick,
    })
  }

  #ackResult(slot, resultId) {
    if (this.phase !== 'RESULTS' || !this.result || this.result.resultId !== resultId) {
      return this.#fail(slot.playerId, 'COMMAND_NOT_ALLOWED', 'No matching result is awaiting acknowledgement.')
    }
    this.resultAcks.add(slot.playerId)
    this.#checkResultCompletion()
    return true
  }

  #cancelCountdown() {
    if (this.phase !== 'COUNTDOWN') return false
    for (const slot of this.slots.values()) slot.ready = false
    this.countdownEndsAt = null
    this.#setPhase('LOBBY')
    return true
  }

  #startValidationError() {
    const active = [...this.slots.values()].filter((slot) => !slot.expired && !slot.kicked)
    const blue = active.filter((slot) => slot.team === 'blue')
    const red = active.filter((slot) => slot.team === 'red')
    if (blue.length === 0 || red.length === 0 || blue.length !== red.length) {
      return roomError('TEAMS_INVALID', 'Blue and Red must have equal, non-empty teams.')
    }
    if (active.some((slot) => !slot.connected)) return roomError('PLAYER_DISCONNECTED', 'Every roster member must be connected.')
    if (active.some((slot) => !slot.ready)) return roomError('PLAYERS_NOT_READY', 'Every roster member must be Ready.')
    return null
  }

  #expireSlot(slot) {
    if (slot.expired) return
    slot.expired = true
    slot.connected = false
    slot.ready = false
    slot.expiresAt = null
    slot.quality = 'Disconnected'
    this.#connections.delete(slot.playerId)
    this.#engine.deactivatePlayer(this.match, slot.playerId)
    this.#version()
  }

  #expireDisconnectedSlot(slot) {
    slot.diagnostics.reconnectFailureCount += 1
    this.#telemetry('reconnect_expired', {
      player: slot.telemetryPlayer,
      phase: this.phase,
    }, {
      playerId: slot.playerId,
      sessionId: slot.sessionId,
      name: slot.name,
      ip: slot.telemetryIp,
    })
    if (slot.diagnostics.disconnectStartedAt !== null) {
      slot.diagnostics.stallDurationMs += this.#now() - slot.diagnostics.disconnectStartedAt
      slot.diagnostics.disconnectStartedAt = null
    }
    if (this.phase === 'LOBBY' || this.phase === 'COUNTDOWN') {
      if (slot.host) {
        this.#requestDestroy()
      } else {
        this.#removeSlot(slot.playerId)
        if (this.phase === 'COUNTDOWN') this.#cancelCountdown()
        this.#broadcastLobby()
      }
      return true
    }
    if (this.phase === 'PLAYING') {
      this.#expireSlot(slot)
      return true
    }
    return false
  }

  #adjudicateExpiredTeams() {
    const blue = [...this.slots.values()].filter((slot) => slot.team === 'blue')
    const red = [...this.slots.values()].filter((slot) => slot.team === 'red')
    const blueExpired = blue.length > 0 && blue.every((slot) => slot.expired)
    const redExpired = red.length > 0 && red.every((slot) => slot.expired)
    if (blueExpired && redExpired) this.#commitResult('NO_CONTEST', null)
    else if (blueExpired) this.#commitResult('FORFEIT', 'red')
    else if (redExpired) this.#commitResult('FORFEIT', 'blue')
  }

  #commitResult(reason, winner) {
    if (this.result || this.phase !== 'PLAYING') return false
    this.result = {
      matchId: this.matchId ?? this.#randomUUID(),
      resultId: this.#randomUUID(),
      finalServerTick: this.match.serverTick,
      scores: { ...this.match.scores },
      winner,
      reason,
      network: this.#networkSummary(),
    }
    this.#telemetry('match_ended', {
      durationMs: this.playingStartedAt === null ? null : Math.max(0, this.#now() - this.playingStartedAt),
      finalServerTick: this.result.finalServerTick,
      scores: this.result.scores,
      winner,
      reason,
      network: this.result.network,
    }, {
      matchId: this.result.matchId,
      resultId: this.result.resultId,
    })
    for (const slot of this.slots.values()) {
      this.#engine.neutralizePlayerInput(this.match, slot.playerId)
      if (!slot.kicked && !slot.expired) this.resultEligible.add(slot.playerId)
    }
    this.#registry.deleteByRoom(this.roomId)
    this.roomKey = null
    this.terminalExpiresAt = this.#now() + this.#config.terminalMs
    this.#setPhase('RESULTS')
    for (const slot of this.slots.values()) {
      if (slot.connected) this.#send(slot.playerId, 'result', { type: 'result', result: this.result })
    }
    return true
  }

  #checkResultCompletion() {
    if (this.#allResultAcksReceived()) this.#requestDestroy()
  }

  #allResultAcksReceived() {
    return this.resultEligible.size > 0 && [...this.resultEligible].every((playerId) => this.resultAcks.has(playerId))
  }

  #removeSlot(playerId) {
    const slot = this.slots.get(playerId)
    if (!slot) return false
    this.#connections.delete(playerId)
    this.#sessionToPlayer.delete(slot.sessionId)
    this.slots.delete(playerId)
    this.#engine.removePlayer(this.match, playerId)
    this.#version()
    return true
  }

  #markDropped(slot) {
    if (!slot.connected) return false
    slot.connected = false
    slot.ready = false
    slot.disconnectedAt = this.#now()
    slot.expiresAt = slot.disconnectedAt + this.#config.reconnectMs
    slot.quality = 'Disconnected'
    slot.diagnostics.disconnectStartedAt = slot.disconnectedAt
    this.#connections.delete(slot.playerId)
    this.#telemetry('player_dropped', {
      player: slot.telemetryPlayer,
      phase: this.phase,
    }, {
      playerId: slot.playerId,
      sessionId: slot.sessionId,
      name: slot.name,
      ip: slot.telemetryIp,
    })
    this.#engine.neutralizePlayerInput(this.match, slot.playerId)
    if (this.phase === 'COUNTDOWN') this.#cancelCountdown()
    this.#touch()
    this.#broadcastLobby()
    return true
  }

  #networkSummary() {
    const summaries = [...this.slots.values()].map((slot) => slot.diagnostics)
    const output = emptyNetworkSummary()
    const rtt = summaries.flatMap((entry) => entry.rtt)
    const inputAck = summaries.flatMap((entry) => entry.inputAck)
    const snapshotGap = summaries.flatMap((entry) => entry.snapshotGap)
    const fps = summaries.flatMap((entry) => entry.fps)
    output.rttMedianMs = percentile(rtt, 0.5)
    output.rttP95Ms = percentile(rtt, 0.95)
    output.jitterMs = jitter(rtt)
    output.inputAckMedianMs = percentile(inputAck, 0.5)
    output.inputAckP95Ms = percentile(inputAck, 0.95)
    output.snapshotGapP95Ms = percentile(snapshotGap, 0.95)
    output.clientFpsMedian = percentile(fps, 0.5)
    output.missedHeartbeats = sum(summaries, 'missedHeartbeats')
    output.stallCount = sum(summaries, 'stallCount')
    output.stallDurationMs = sum(summaries, 'stallDurationMs')
    output.reconnectCount = sum(summaries, 'reconnectCount')
    output.reconnectSuccessCount = sum(summaries, 'reconnectSuccessCount')
    output.reconnectFailureCount = sum(summaries, 'reconnectFailureCount')
    output.backpressureEvents = sum(summaries, 'backpressureEvents')
    output.clientLongFrames = sum(summaries, 'clientLongFrames')
    output.hiddenHeartbeatCount = sum(summaries, 'hiddenHeartbeatCount')
    output.serverTickP95Ms = percentile(this.#serverTickDurations, 0.95)
    output.serverTickMaxMs = this.#serverTickDurations.length > 0 ? Math.max(...this.#serverTickDurations) : null
    output.serverTickDriftMs = percentile(this.#serverTickDrifts, 0.95)
    output.serverTickOverruns = this.#serverTickOverruns
    return output
  }

  #requestDestroy() {
    if (this.#destroyRequested) return false
    this.#destroyRequested = true
    this.#registry.deleteByRoom(this.roomId)
    this.roomKey = null
    this.#setPhase('DESTROYED')
    this.#onDestroyRequested()
    return true
  }

  #broadcastLobby() {
    for (const slot of this.slots.values()) {
      if (slot.connected) {
        this.#send(slot.playerId, 'lobby', { type: 'lobby', lobby: this.#lobbyView(slot.playerId) })
      }
    }
  }

  #lobbyView(selfPlayerId) {
    const self = this.slots.get(selfPlayerId)
    const host = [...this.slots.values()].find((slot) => slot.host)
    return {
      phase: this.phase,
      version: this.version,
      selfPlayerId,
      hostPlayerId: host?.playerId ?? '',
      players: [...this.slots.values()].map((slot) => ({
        playerId: slot.playerId,
        name: slot.name,
        team: slot.team,
        classId: slot.classId,
        ready: slot.ready,
        connected: slot.connected,
        host: slot.host,
        connectionEpoch: slot.connectionEpoch,
        quality: slot.quality,
      })),
      countdownEndsAt: this.countdownEndsAt,
      ...(self?.host && this.roomKey ? { roomKey: this.roomKey } : {}),
    }
  }

  #send(playerId, type, payload) {
    const connection = this.#connections.get(playerId)
    if (!connection?.send) return false
    connection.send(type, payload)
    return true
  }

  #fail(playerId, code, message) {
    this.#send(playerId, 'error', { type: 'error', code, message })
    return false
  }

  #requireActiveSlot(playerId) {
    const slot = this.slots.get(playerId)
    if (!slot || slot.kicked || slot.expired) throw roomError('PLAYER_NOT_FOUND', 'The player slot is not active.')
    return slot
  }

  #teamWithFewestPlayers() {
    const blue = [...this.slots.values()].filter((slot) => slot.team === 'blue').length
    const red = this.slots.size - blue
    return blue <= red ? 'blue' : 'red'
  }

  #touch() {
    this.lastActivityAt = this.#now()
  }

  #version() {
    this.version += 1
  }

  #setPhase(phase) {
    if (this.phase === phase) return
    this.phase = phase
    this.#version()
    this.#onPhaseChange(phase)
    this.#telemetry('phase_changed', {
      phase,
      players: this.slots.size,
      scores: { ...this.match.scores },
    }, {
      matchId: this.matchId,
      roomKey: this.roomKey,
    })
  }

  #telemetry(event, data = {}, sensitive = {}) {
    try {
      this.#onTelemetry(event, data, sensitive)
    } catch {
      // Telemetry must never change authoritative room behavior.
    }
  }
}

function requireEngine(engine) {
  const methods = [
    'createMatchState',
    'addPlayer',
    'removePlayer',
    'setPlayerTeam',
    'setPlayerClass',
    'startMatch',
    'setPlayerCommand',
    'setPlayerEquipment',
    'neutralizePlayerInput',
    'deactivatePlayer',
    'addTeamRadioMessage',
    'addTeamPing',
    'updateMatch',
    'createSnapshotForPlayer',
  ]
  for (const method of methods) {
    if (typeof engine?.[method] !== 'function') throw new Error(`Missing gameplay engine method: ${method}`)
  }
  return engine
}

function requireText(value, label) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`${label} is required.`)
  return text
}

function roomError(code, message) {
  return new OnlineRoomError(code, message)
}

function emptyNetworkSummary() {
  return {
    rttMedianMs: null,
    rttP95Ms: null,
    jitterMs: null,
    missedHeartbeats: 0,
    stallCount: 0,
    stallDurationMs: 0,
    inputAckMedianMs: null,
    inputAckP95Ms: null,
    snapshotGapP95Ms: null,
    reconnectCount: 0,
    reconnectSuccessCount: 0,
    reconnectFailureCount: 0,
    backpressureEvents: 0,
    serverTickP95Ms: null,
    serverTickMaxMs: null,
    serverTickDriftMs: null,
    serverTickOverruns: 0,
    clientFpsMedian: null,
    clientLongFrames: 0,
    hiddenHeartbeatCount: 0,
  }
}

function createPlayerDiagnostics() {
  return {
    rtt: [],
    inputAck: [],
    snapshotGap: [],
    fps: [],
    heartbeatCount: 0,
    missedHeartbeats: 0,
    stallCount: 0,
    stallDurationMs: 0,
    reconnectCount: 0,
    reconnectSuccessCount: 0,
    reconnectFailureCount: 0,
    backpressureEvents: 0,
    clientLongFrames: 0,
    hiddenHeartbeatCount: 0,
    disconnectStartedAt: null,
  }
}

function pushSample(target, value, limit = 120) {
  if (!Number.isFinite(value)) return
  target.push(value)
  if (target.length > limit) target.splice(0, target.length - limit)
}

function percentile(values, fraction) {
  if (values.length === 0) return null
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return Math.round((sorted[index] ?? 0) * 10) / 10
}

function jitter(values) {
  if (values.length < 2) return null
  const differences = []
  for (let index = 1; index < values.length; index += 1) {
    differences.push(Math.abs((values[index] ?? 0) - (values[index - 1] ?? 0)))
  }
  return percentile(differences, 0.5)
}

function sum(entries, key) {
  return entries.reduce((total, entry) => total + (Number(entry[key]) || 0), 0)
}
