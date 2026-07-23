import { describe, expect, it } from 'vitest'
import {
  addTeamRadioMessage,
  addPlayer,
  addTeamPing,
  createMatchState,
  createSnapshotForPlayer,
  deactivatePlayer,
  neutralizePlayerInput,
  removePlayer,
  setPlayerClass,
  setPlayerCommand,
  setPlayerEquipment,
  setPlayerTeam,
  startMatch,
  updateMatch,
} from '../shared/src/multiplayer.ts'
import { RoomKeyRegistry } from './roomKeyRegistry.mjs'
import { OnlineRoomError, TeamBattleController } from './teamBattleController.mjs'

const engine = {
  addTeamRadioMessage,
  addPlayer,
  addTeamPing,
  createMatchState,
  createSnapshotForPlayer,
  deactivatePlayer,
  neutralizePlayerInput,
  removePlayer,
  setPlayerClass,
  setPlayerCommand,
  setPlayerEquipment,
  setPlayerTeam,
  startMatch,
  updateMatch,
}

interface FakeConnection {
  messages: Array<{ type: string; payload: unknown }>
  leaves: Array<{ code: number; reason: string }>
  send: (type: string, payload: unknown) => void
  leave: (code: number, reason: string) => void
}

function connection(): FakeConnection {
  const messages: FakeConnection['messages'] = []
  const leaves: FakeConnection['leaves'] = []
  return {
    messages,
    leaves,
    send: (type, payload) => messages.push({ type, payload }),
    leave: (code, reason) => leaves.push({ code, reason }),
  }
}

function harness(config: Record<string, number | null> = {}) {
  let now = 1_000
  let id = 0
  let randomIndex = 0
  let destroyed = 0
  const phases: string[] = []
  const telemetryEvents: Array<{ event: string; data: Record<string, unknown>; sensitive: Record<string, unknown> }> = []
  const registry = new RoomKeyRegistry({ randomIndex: (max) => randomIndex++ % max })
  const controller = new TeamBattleController({
    roomId: 'internal-room',
    registry,
    engine,
    now: () => now,
    uuid: () => `id-${++id}`,
    config: { countdownMs: 100, reconnectMs: 150, terminalMs: 200, ...config },
    onPhaseChange: (phase) => phases.push(phase),
    onDestroyRequested: () => { destroyed += 1 },
    onTelemetry: (event, data, sensitive) => telemetryEvents.push({ event, data, sensitive }),
  })
  return {
    controller,
    registry,
    phases,
    telemetryEvents,
    get destroyed() { return destroyed },
    setNow: (value: number) => { now = value },
    advance: (value: number) => { now += value },
  }
}

async function join(target: ReturnType<typeof harness>, name: string, sessionId: string) {
  const client = connection()
  const create = target.controller.inspect().slots.length === 0
  const slot = await target.controller.join({
    sessionId,
    name,
    create,
    roomKey: create ? undefined : target.registry.currentKey('internal-room'),
    telemetryIp: `${name.toLowerCase().replaceAll(' ', '-')}.test`,
    send: client.send,
    leave: client.leave,
  })
  return { slot, client }
}

async function readyAndStart(target: ReturnType<typeof harness>) {
  const blue = await join(target, 'Blue', 'session-blue')
  const red = await join(target, 'Red', 'session-red')
  await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
  await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
  await target.controller.command(blue.slot.playerId, { type: 'start' })
  return { blue, red }
}

describe('TeamBattleController', () => {
  it('deploys only after equal connected teams are Ready and countdown expiry revalidates', async () => {
    const target = harness()
    const blue = await join(target, 'Blue', 'session-blue')
    const red = await join(target, 'Red', 'session-red')

    expect(target.controller.inspect()).toMatchObject({ phase: 'LOBBY', serverTick: 0 })
    expect(await target.controller.command(blue.slot.playerId, { type: 'start' })).toBe(false)
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    expect(await target.controller.command(blue.slot.playerId, { type: 'start' })).toBe(true)
    expect(target.controller.inspect().phase).toBe('COUNTDOWN')

    target.advance(100)
    await target.controller.tick(0.05)
    expect(target.controller.inspect()).toMatchObject({ phase: 'PLAYING', matchId: 'id-3', serverTick: 1 })
    expect(target.registry.resolve(target.registry.currentKey('internal-room'))).toBe('internal-room')
  })

  it('cancels countdown on withdrawal or disconnect and clears every Ready flag', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)

    await target.controller.command(red.slot.playerId, { type: 'ready', ready: false })
    expect(target.controller.inspect()).toMatchObject({
      phase: 'LOBBY',
      slots: [{ ready: false }, { ready: false }],
    })

    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(blue.slot.playerId, { type: 'start' })
    await target.controller.drop(red.slot.playerId, 1)
    expect(target.controller.inspect()).toMatchObject({
      phase: 'LOBBY',
      slots: [{ ready: false }, { ready: false, connected: false }],
    })
  })

  it('clears Ready on team change and rejects team mutation during countdown', async () => {
    const target = harness()
    const blue = await join(target, 'Blue', 'session-blue')
    const red = await join(target, 'Red', 'session-red')
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(blue.slot.playerId, { type: 'team', team: 'red' })
    expect(target.controller.inspect().slots[0]).toMatchObject({ team: 'red', ready: false })

    await target.controller.command(blue.slot.playerId, { type: 'team', team: 'blue' })
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(blue.slot.playerId, { type: 'start' })
    expect(await target.controller.command(red.slot.playerId, { type: 'team', team: 'blue' })).toBe(false)
    expect(target.controller.inspect().phase).toBe('COUNTDOWN')
  })

  it('clears Ready on class change, freezes the class at countdown, and retains it on reconnect', async () => {
    const target = harness()
    const blue = await join(target, 'Blue', 'session-blue')
    const red = await join(target, 'Red', 'session-red')
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })

    expect(await target.controller.command(blue.slot.playerId, { type: 'class', classId: 'scout' })).toBe(true)
    expect(target.controller.inspect().slots.find((slot) => slot.playerId === blue.slot.playerId)).toMatchObject({
      classId: 'scout',
      ready: false,
    })
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(blue.slot.playerId, { type: 'start' })
    expect(await target.controller.command(blue.slot.playerId, { type: 'class', classId: 'battle' })).toBe(false)

    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: false })
    const epoch = target.controller.inspect().slots.find((slot) => slot.playerId === blue.slot.playerId)?.connectionEpoch ?? 0
    await target.controller.drop(blue.slot.playerId, epoch)
    const reconnected = connection()
    const slot = await target.controller.reconnect(blue.slot.playerId, epoch, {
      sessionId: 'session-blue-reconnected',
      send: reconnected.send,
      leave: reconnected.leave,
    })
    expect(slot).toMatchObject({ classId: 'scout', connectionEpoch: epoch + 1 })
  })

  it('serializes simultaneous joins for the final seat', async () => {
    const target = harness()
    await join(target, 'One', 'session-1')
    await join(target, 'Two', 'session-2')
    await join(target, 'Three', 'session-3')

    const fourth = connection()
    const fifth = connection()
    const results = await Promise.allSettled([
      target.controller.join({ sessionId: 'session-4', name: 'Four', roomKey: target.registry.currentKey('internal-room'), send: fourth.send, leave: fourth.leave }),
      target.controller.join({ sessionId: 'session-5', name: 'Five', roomKey: target.registry.currentKey('internal-room'), send: fifth.send, leave: fifth.leave }),
    ])

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect((results[1] as PromiseRejectedResult).reason).toMatchObject({ code: 'ROOM_FULL' })
    expect(target.controller.inspect().slots).toHaveLength(4)
  })

  it('rotates the key and revokes the kicked slot atomically', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
    const guest = await join(target, 'Guest', 'session-guest')
    const previousKey = target.registry.currentKey('internal-room')

    expect(await target.controller.command(host.slot.playerId, { type: 'kick', playerId: guest.slot.playerId })).toBe(true)
    const replacementKey = target.registry.currentKey('internal-room')
    expect(replacementKey).not.toBe(previousKey)
    expect(target.registry.resolve(previousKey)).toBeNull()
    expect(guest.client.leaves).toEqual([{ code: 4403, reason: 'PLAYER_KICKED' }])
    expect(target.controller.inspect().slots.map((slot) => slot.playerId)).toEqual([host.slot.playerId])
    expect(target.telemetryEvents.filter((entry) => entry.event === 'room_key_rotated')).toHaveLength(1)

    const staleReservation = connection()
    await expect(target.controller.join({
      sessionId: 'session-stale',
      name: 'Stale reservation',
      roomKey: previousKey,
      send: staleReservation.send,
      leave: staleReservation.leave,
    })).rejects.toMatchObject({ code: 'ROOM_KEY_NOT_FOUND' })
    expect(target.controller.inspect().slots.map((slot) => slot.playerId)).toEqual([host.slot.playerId])
  })

  it('emits bounded lifecycle, sensitive identity, fixed signals, and result telemetry', async () => {
    const target = harness({ roundDurationMs: 50 })
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    expect(await target.controller.command(blue.slot.playerId, { type: 'radio', command: 'DEFEND' })).toBe(true)
    expect(await target.controller.command(blue.slot.playerId, { type: 'ping', col: 5, row: 14 })).toBe(true)
    target.advance(50)
    await target.controller.tick(0.05)

    expect(target.telemetryEvents[0]).toMatchObject({
      event: 'room_created',
      data: { phase: 'LOBBY', maxPlayers: 4 },
      sensitive: { roomId: 'internal-room' },
    })
    expect(target.telemetryEvents.filter((entry) => entry.event === 'player_joined')).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ player: 'p1', team: 'blue', host: true }),
        sensitive: expect.objectContaining({ name: 'Blue', ip: 'blue.test' }),
      }),
      expect.objectContaining({
        data: expect.objectContaining({ player: 'p2', team: 'red', host: false }),
        sensitive: expect.objectContaining({ name: 'Red', ip: 'red.test' }),
      }),
    ])
    expect(target.telemetryEvents).toContainEqual(expect.objectContaining({
      event: 'radio_command',
      data: expect.objectContaining({ player: 'p1', command: 'DEFEND' }),
      sensitive: expect.objectContaining({ name: 'Blue' }),
    }))
    expect(target.telemetryEvents).toContainEqual(expect.objectContaining({
      event: 'team_ping',
      data: expect.objectContaining({ player: 'p1', col: 5, row: 14 }),
    }))
    expect(target.telemetryEvents).toContainEqual(expect.objectContaining({
      event: 'match_ended',
      data: expect.objectContaining({
        durationMs: 50,
        finalServerTick: 2,
        scores: { blue: 0, red: 0 },
        reason: 'TIME_LIMIT',
      }),
    }))
    expect(red.slot.telemetryPlayer).toBe('p2')
  })

  it('rate-limits radio commands and pings independently', async () => {
    const target = harness()
    const { blue } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)

    expect(await target.controller.command(blue.slot.playerId, { type: 'radio', command: 'ATTACK' })).toBe(true)
    expect(await target.controller.command(blue.slot.playerId, { type: 'radio', command: 'HELP' })).toBe(false)
    expect(await target.controller.command(blue.slot.playerId, { type: 'ping', col: 5, row: 14 })).toBe(true)
    expect(await target.controller.command(blue.slot.playerId, { type: 'ping', col: 6, row: 14 })).toBe(false)

    target.advance(500)
    expect(await target.controller.command(blue.slot.playerId, { type: 'ping', col: 6, row: 14 })).toBe(true)
    expect(await target.controller.command(blue.slot.playerId, { type: 'radio', command: 'HELP' })).toBe(false)
    target.advance(500)
    expect(await target.controller.command(blue.slot.playerId, { type: 'radio', command: 'HELP' })).toBe(true)
  })

  it('serializes kick versus start and disconnect versus start', async () => {
    const startFirst = harness()
    const blue = await join(startFirst, 'Blue', 'session-blue')
    const red = await join(startFirst, 'Red', 'session-red')
    await startFirst.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await startFirst.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    const [started, kicked] = await Promise.all([
      startFirst.controller.command(blue.slot.playerId, { type: 'start' }),
      startFirst.controller.command(blue.slot.playerId, { type: 'kick', playerId: red.slot.playerId }),
    ])
    expect([started, kicked]).toEqual([true, false])
    expect(startFirst.controller.inspect().phase).toBe('COUNTDOWN')

    const disconnectFirst = harness()
    const players = await readyAndStart(disconnectFirst)
    await disconnectFirst.controller.drop(players.red.slot.playerId, 1)
    expect(await disconnectFirst.controller.command(players.blue.slot.playerId, { type: 'start' })).toBe(false)
    expect(disconnectFirst.controller.inspect().phase).toBe('LOBBY')
  })

  it('keeps a waiting-room key live while a host tab is backgrounded', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
    const roomKey = target.registry.currentKey('internal-room')
    target.advance(60 * 60_000)
    await target.controller.tick(0.05)

    expect(target.controller.inspect()).toMatchObject({
      phase: 'LOBBY',
      slots: [{ playerId: host.slot.playerId, connected: true }],
    })
    expect(host.client.leaves).toEqual([])
    expect(target.registry.resolve(roomKey)).toBe('internal-room')
    await expect(join(target, 'Late Guest', 'session-late')).resolves.toBeDefined()
  })

  it('neutralizes a gameplay heartbeat timeout immediately and reports bounded diagnostics', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
    const guest = await join(target, 'Guest', 'session-guest')
    await target.controller.command(host.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(guest.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(host.slot.playerId, { type: 'start' })
    target.advance(100)
    await target.controller.tick(0.05)
    await target.controller.command(host.slot.playerId, {
      type: 'heartbeat',
      heartbeatSeq: 1,
      clientSentAt: 1_000,
      pageVisible: false,
      rttMs: 82,
      inputAckMs: 91,
      snapshotGapMs: 120,
      fps: 58,
      longFrames: 2,
      quality: 'Good',
    })
    expect(target.controller.inspect().slots[0]).toMatchObject({ quality: 'Good', connected: true })
    target.advance(3_400)
    await target.controller.command(guest.slot.playerId, {
      type: 'heartbeat',
      heartbeatSeq: 2,
      clientSentAt: 4_500,
      pageVisible: true,
    })
    target.advance(100)
    await target.controller.tick(0.05)
    expect(target.controller.inspect().slots[0]).toMatchObject({ quality: 'Disconnected', connected: false })
    expect(host.client.leaves).toEqual([{ code: 4001, reason: 'HEARTBEAT_TIMEOUT' }])
    expect(target.controller.inspect().network).toMatchObject({
      rttMedianMs: 82,
      inputAckMedianMs: 91,
      snapshotGapP95Ms: 120,
      clientFpsMedian: 58,
      clientLongFrames: 2,
      hiddenHeartbeatCount: 1,
      missedHeartbeats: 1,
    })
  })

  it('expires a heartbeat-timed-out slot on the server deadline without a transport callback', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    target.advance(3_500)
    await target.controller.command(blue.slot.playerId, {
      type: 'heartbeat',
      heartbeatSeq: 1,
      clientSentAt: 4_600,
      pageVisible: true,
    })
    await target.controller.tick(0.05)

    expect(target.controller.inspect().slots.find((slot) => slot.playerId === red.slot.playerId)).toMatchObject({
      connected: false,
      expired: false,
    })
    target.advance(150)
    await target.controller.tick(0.05)

    expect(target.controller.inspect()).toMatchObject({
      phase: 'RESULTS',
      result: { reason: 'FORFEIT', winner: 'blue' },
      network: { reconnectFailureCount: 1 },
    })
  })

  it('lets reconnect win before expiry and rejects stale close events after reclaim', async () => {
    const target = harness()
    const player = await join(target, 'Host', 'session-host')
    await target.controller.drop(player.slot.playerId, 1)
    target.advance(150)
    const replacement = connection()
    const reconnected = await target.controller.reconnect(player.slot.playerId, 1, {
      sessionId: 'session-host',
      send: replacement.send,
      leave: replacement.leave,
    })
    expect(reconnected.connectionEpoch).toBe(2)
    expect(await target.controller.expire(player.slot.playerId, 1)).toBe(false)
    expect(await target.controller.leave(player.slot.playerId, 1)).toBe(false)
    expect(target.controller.inspect().slots[0]).toMatchObject({ connected: true, expired: false, connectionEpoch: 2 })
  })

  it('expires before a late reconnect and closes a pre-deployment host lobby', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
    await target.controller.drop(host.slot.playerId, 1)
    target.advance(150)
    expect(await target.controller.expire(host.slot.playerId, 1)).toBe(true)
    expect(target.controller.inspect().phase).toBe('DESTROYED')
    await expect(target.controller.reconnect(host.slot.playerId, 1, {
      sessionId: 'session-host',
      ...connection(),
    })).rejects.toMatchObject({ code: 'RECONNECTION_EXPIRED' })
  })

  it('produces deterministic no-contest for simultaneous full-team expiry', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    await target.controller.drop(blue.slot.playerId, 1)
    await target.controller.drop(red.slot.playerId, 1)
    target.advance(150)
    await target.controller.expire(blue.slot.playerId, 1)
    await target.controller.expire(red.slot.playerId, 1)
    await target.controller.tick(0.05)

    expect(target.controller.inspect().result).toMatchObject({ winner: null, reason: 'NO_CONTEST' })
  })

  it('commits a score result before a same-tick forfeit and never commits twice', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    await target.controller.drop(red.slot.playerId, 1)
    target.advance(150)
    await target.controller.expire(red.slot.playerId, 1)
    target.controller.match.scores.blue = 15
    target.controller.match.phase = 'finished'
    target.controller.match.winner = 'blue'
    await target.controller.tick(0.05)
    const first = target.controller.inspect().result
    await target.controller.tick(0.05)
    expect(first).toMatchObject({ winner: 'blue', reason: 'SCORE_LIMIT' })
    expect(target.controller.inspect().result).toEqual(first)
    expect(blue.client.messages.filter((message) => message.type === 'result')).toHaveLength(1)
  })

  it('keeps acknowledged results open for a unanimous rematch and resets the authoritative round', async () => {
    const target = harness()
    const blue = await join(target, 'Blue', 'session-blue')
    const red = await join(target, 'Red', 'session-red')
    await target.controller.command(blue.slot.playerId, { type: 'class', classId: 'scout' })
    await target.controller.command(red.slot.playerId, { type: 'class', classId: 'battle' })
    const firstRoomKey = target.registry.currentKey('internal-room')
    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(blue.slot.playerId, { type: 'start' })
    target.advance(100)
    await target.controller.tick(0.05)
    target.controller.match.phase = 'finished'
    target.controller.match.winner = 'blue'
    target.controller.match.scores.blue = 15
    await target.controller.tick(0.05)
    const resultId = target.controller.inspect().result?.resultId
    expect(resultId).toBeTruthy()
    await target.controller.command(blue.slot.playerId, { type: 'result_ack', resultId })
    await target.controller.command(red.slot.playerId, { type: 'result_ack', resultId })
    expect(target.controller.inspect()).toMatchObject({
      phase: 'RESULTS',
      rematchAvailable: true,
      resultAcks: [blue.slot.playerId, red.slot.playerId],
    })

    await target.controller.command(blue.slot.playerId, { type: 'result_choice', resultId, choice: 'rematch' })
    expect(target.controller.inspect()).toMatchObject({
      phase: 'RESULTS',
      rematchVotes: [blue.slot.playerId],
    })
    await target.controller.command(red.slot.playerId, { type: 'result_choice', resultId, choice: 'rematch' })

    const rematch = target.controller.inspect()
    const secondRoomKey = target.registry.currentKey('internal-room')
    expect(rematch).toMatchObject({
      phase: 'LOBBY',
      result: null,
      resultAcks: [],
      rematchVotes: [],
      serverTick: 0,
      scores: { blue: 0, red: 0 },
      slots: [
        { playerId: blue.slot.playerId, team: 'blue', classId: 'scout', host: true, ready: false },
        { playerId: red.slot.playerId, team: 'red', classId: 'battle', host: false, ready: false },
      ],
    })
    expect(secondRoomKey).toBeTruthy()
    expect(secondRoomKey).not.toBe(firstRoomKey)
    expect(target.registry.resolve(secondRoomKey)).toBe('internal-room')
    expect(target.phases.slice(-2)).toEqual(['RESULTS', 'LOBBY'])
    expect(target.telemetryEvents.some((event) => event.event === 'rematch_opened')).toBe(true)

    const errorsBeforeLateInput = blue.client.messages.filter((message) => message.type === 'error').length
    expect(await target.controller.command(blue.slot.playerId, { type: 'input', inputSeq: 99, right: true })).toBe(false)
    expect(blue.client.messages.filter((message) => message.type === 'error')).toHaveLength(errorsBeforeLateInput)

    await target.controller.command(blue.slot.playerId, { type: 'ready', ready: true })
    await target.controller.command(red.slot.playerId, { type: 'ready', ready: true })
    expect(await target.controller.command(blue.slot.playerId, { type: 'start' })).toBe(true)
    expect(target.controller.inspect().phase).toBe('COUNTDOWN')
  })

  it('closes results on decline and after the terminal TTL', async () => {
    const declined = harness()
    const { blue } = await readyAndStart(declined)
    declined.advance(100)
    await declined.controller.tick(0.05)
    declined.controller.match.phase = 'finished'
    declined.controller.match.scores.blue = 15
    await declined.controller.tick(0.05)
    const declinedResultId = declined.controller.inspect().result?.resultId
    await declined.controller.command(blue.slot.playerId, {
      type: 'result_choice',
      resultId: declinedResultId,
      choice: 'close',
    })
    expect(declined.controller.inspect().phase).toBe('DESTROYED')
    expect(declined.destroyed).toBe(1)

    const ttl = harness()
    await readyAndStart(ttl)
    ttl.advance(100)
    await ttl.controller.tick(0.05)
    ttl.controller.match.phase = 'finished'
    ttl.controller.match.winner = null
    ttl.controller.match.timeRemaining = 0
    await ttl.controller.tick(0.05)
    ttl.advance(200)
    await ttl.controller.tick(0.05)
    expect(ttl.controller.inspect().phase).toBe('DESTROYED')
  })

  it('pauses rematch consensus across a transient drop and restores it after reconnect', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    target.controller.match.phase = 'finished'
    target.controller.match.scores.blue = 15
    await target.controller.tick(0.05)
    const resultId = target.controller.inspect().result?.resultId

    await target.controller.command(blue.slot.playerId, { type: 'result_choice', resultId, choice: 'rematch' })
    await target.controller.drop(red.slot.playerId, 1)
    expect(target.controller.inspect()).toMatchObject({
      phase: 'RESULTS',
      rematchAvailable: false,
      rematchVotes: [blue.slot.playerId],
    })

    const reconnected = connection()
    await target.controller.reconnect(red.slot.playerId, 1, {
      sessionId: 'session-red-reconnected',
      telemetryIp: 'red.test',
      send: reconnected.send,
      leave: reconnected.leave,
    })
    expect(target.controller.inspect().rematchAvailable).toBe(true)
    await target.controller.command(red.slot.playerId, { type: 'result_choice', resultId, choice: 'rematch' })
    expect(target.controller.inspect().phase).toBe('LOBBY')
  })

  it('closes a non-rematchable result at the dropped-player reconnect deadline', async () => {
    const target = harness()
    const { red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    target.controller.match.phase = 'finished'
    target.controller.match.scores.blue = 15
    await target.controller.tick(0.05)

    await target.controller.drop(red.slot.playerId, 1)
    expect(target.controller.inspect()).toMatchObject({
      phase: 'RESULTS',
      rematchAvailable: false,
    })
    target.advance(149)
    await target.controller.tick(0.05)
    expect(target.controller.inspect().phase).toBe('RESULTS')
    target.advance(1)
    await target.controller.tick(0.05)
    expect(target.controller.inspect().phase).toBe('DESTROYED')
    expect(target.destroyed).toBe(1)
  })

  it('reports stable machine errors without exposing the room key', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
    const result = await target.controller.command(host.slot.playerId, { type: 'start' })
    expect(result).toBe(false)
    const error = host.client.messages.at(-1)
    expect(error).toMatchObject({ type: 'error', payload: { code: 'TEAMS_INVALID' } })
    expect(JSON.stringify(error)).not.toContain(target.registry.currentKey('internal-room') ?? '')
    expect(new OnlineRoomError('ROOM_LOCKED', 'locked')).toMatchObject({ code: 'ROOM_LOCKED' })
  })
})
