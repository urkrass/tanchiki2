import { describe, expect, it } from 'vitest'
import {
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
} from '../shared/src/multiplayer.ts'
import { RoomKeyRegistry } from './roomKeyRegistry.mjs'
import { OnlineRoomError, TeamBattleController } from './teamBattleController.mjs'

const engine = {
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

function harness() {
  let now = 1_000
  let id = 0
  let randomIndex = 0
  let destroyed = 0
  const phases: string[] = []
  const registry = new RoomKeyRegistry({ randomIndex: (max) => randomIndex++ % max })
  const controller = new TeamBattleController({
    roomId: 'internal-room',
    registry,
    engine,
    now: () => now,
    uuid: () => `id-${++id}`,
    config: { countdownMs: 100, reconnectMs: 150, terminalMs: 200, idleLobbyMs: 500 },
    onPhaseChange: (phase) => phases.push(phase),
    onDestroyRequested: () => { destroyed += 1 },
  })
  return {
    controller,
    registry,
    phases,
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

    const staleReservation = connection()
    await expect(target.controller.join({
      sessionId: 'session-stale',
      name: 'Stale reservation',
      roomKey: previousKey,
      send: staleReservation.send,
      leave: staleReservation.leave,
    })).rejects.toMatchObject({ code: 'ROOM_KEY_EXPIRED' })
    expect(target.controller.inspect().slots.map((slot) => slot.playerId)).toEqual([host.slot.playerId])
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

  it('neutralizes a heartbeat timeout immediately and reports bounded diagnostics', async () => {
    const target = harness()
    const host = await join(target, 'Host', 'session-host')
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
    target.advance(3_500)
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

  it('cleans results after all acknowledgements or terminal TTL', async () => {
    const target = harness()
    const { blue, red } = await readyAndStart(target)
    target.advance(100)
    await target.controller.tick(0.05)
    target.controller.match.phase = 'finished'
    target.controller.match.winner = null
    target.controller.match.timeRemaining = 0
    await target.controller.tick(0.05)
    const resultId = target.controller.inspect().result?.resultId
    expect(resultId).toBeTruthy()
    await target.controller.command(blue.slot.playerId, { type: 'result_ack', resultId })
    expect(target.controller.inspect().phase).toBe('RESULTS')
    await target.controller.command(red.slot.playerId, { type: 'result_ack', resultId })
    expect(target.controller.inspect().phase).toBe('DESTROYED')
    expect(target.destroyed).toBe(1)

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
