import { describe, expect, it } from 'vitest'
import {
  addChatMessage,
  addPlayer,
  addTeamPing,
  computeVisionCircles,
  computeVisibleSet,
  createMatchState,
  createSnapshotForPlayer,
  hasTeamRelay,
  MULTIPLAYER_TUNING,
  setPlayerCommand,
  updateMatch,
} from './multiplayer.ts'

function step(state: ReturnType<typeof createMatchState>, seconds: number) {
  const frames = Math.ceil(seconds * 20)
  for (let index = 0; index < frames; index += 1) {
    updateMatch(state, 1 / 20)
  }
}

function expectEscapableMultiplayerSpawn(state: ReturnType<typeof createMatchState>, player: { id: string; col: number; row: number }) {
  expect(['empty', 'trees']).toContain(state.terrain[player.row]?.[player.col])
  const neighbors = [
    { col: player.col, row: player.row - 1 },
    { col: player.col + 1, row: player.row },
    { col: player.col, row: player.row + 1 },
    { col: player.col - 1, row: player.row },
  ]

  expect(neighbors.some((cell) => {
    const tile = state.terrain[cell.row]?.[cell.col]
    const occupied = Object.values(state.players).some(
      (candidate) => candidate.id !== player.id && candidate.alive && candidate.col === cell.col && candidate.row === cell.row,
    )
    return (tile === 'empty' || tile === 'trees') && !occupied
  })).toBe(true)
}

describe('multiplayer vision and retranslators', () => {
  it('starts with narrow personal vision instead of the full map', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    const visible = computeVisibleSet(state, player.id)
    const snapshot = createSnapshotForPlayer(state, player.id)

    expect(visible.size).toBeLessThan(70)
    expect(visible.has('0,0')).toBe(false)
    expect(visible.has(`${player.col},${player.row}`)).toBe(true)
    expect(snapshot?.retranslators).toEqual([])
    expect(snapshot?.fog).toMatchObject({
      visibleCellCount: visible.size,
      hiddenCellCount: 320 - visible.size,
      visibleRetranslatorCount: 0,
      shape: 'circular',
      visionCircleCount: 1,
      teamVisionMerged: false,
    })
    expect(snapshot?.vision.circles).toEqual([
      expect.objectContaining({ id: player.id, kind: 'self', radius: 2.75 }),
    ])
  })

  it('uses circular personal vision instead of manhattan tile vision', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    const visible = computeVisibleSet(state, player.id)

    expect(visible.has('7,7')).toBe(true)
    expect(visible.has('9,9')).toBe(false)
    expect(computeVisionCircles(state, player.id)).toEqual([
      expect.objectContaining({ id: player.id, kind: 'self', x: 5.5, y: 5.5, radius: 2.75 }),
    ])
  })

  it('does not send entities whose centers are outside a partially visible edge tile', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    const enemy = addPlayer(state, 'red-edge', 'Edge Raider', 'red')
    player.col = 5
    player.row = 5
    enemy.col = 8
    enemy.row = 5

    const snapshot = createSnapshotForPlayer(state, player.id)

    expect(snapshot?.visibleTerrain.some((tile) => tile.col === 8 && tile.row === 5)).toBe(true)
    expect(snapshot?.players.some((visiblePlayer) => visiblePlayer.id === enemy.id)).toBe(false)
  })

  it('only includes retranslators whose tile is currently visible', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')

    let snapshot = createSnapshotForPlayer(state, player.id)
    expect(snapshot?.retranslators.map((relay) => relay.id)).toEqual([])

    player.col = 3
    player.row = 7
    player.dir = 'right'
    snapshot = createSnapshotForPlayer(state, player.id)

    expect(snapshot?.visibleCells.some((cell) => cell.col === 4 && cell.row === 7)).toBe(true)
    expect(snapshot?.retranslators.map((relay) => relay.id)).toEqual(['relay-1'])
  })

  it('captures a retranslator and merges teammate vision for the team', () => {
    const state = createMatchState()
    const scout = addPlayer(state, 'blue-scout', 'Scout', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    scout.col = 3
    scout.row = 7
    scout.dir = 'right'
    spotter.col = 15
    spotter.row = 14
    spotter.dir = 'up'
    enemy.col = 15
    enemy.row = 12
    enemy.dir = 'down'

    let snapshot = createSnapshotForPlayer(state, scout.id)
    expect(snapshot?.teamVisionMerged).toBe(false)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)

    step(state, MULTIPLAYER_TUNING.captureSeconds + 0.1)
    snapshot = createSnapshotForPlayer(state, scout.id)

    expect(hasTeamRelay(state, 'blue')).toBe(true)
    expect(snapshot?.teamVisionMerged).toBe(true)
    expect(snapshot?.fog.teamVisionMerged).toBe(true)
    expect(snapshot?.fog.shape).toBe('circular')
    expect(snapshot?.vision.circles.some((circle) => circle.kind === 'relay' && circle.id === 'relay-1')).toBe(true)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(true)
    expect(snapshot?.retranslators.length).toBeGreaterThanOrEqual(1)
    expect(snapshot?.retranslators.length).toBeLessThan(state.retranslators.length)
    for (const relay of snapshot?.retranslators ?? []) {
      expect(snapshot?.visibleCells.some((cell) => cell.col === relay.col && cell.row === relay.row)).toBe(true)
    }
  })

  it('keeps short last-known markers when enemies leave merged vision', () => {
    const state = createMatchState()
    const scout = addPlayer(state, 'blue-scout', 'Scout', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    scout.col = 3
    scout.row = 7
    scout.dir = 'right'
    spotter.col = 15
    spotter.row = 14
    spotter.dir = 'up'
    enemy.col = 15
    enemy.row = 12
    enemy.dir = 'down'
    step(state, MULTIPLAYER_TUNING.captureSeconds + 0.1)
    enemy.col = 19
    enemy.row = 15
    step(state, 0.2)

    const snapshot = createSnapshotForPlayer(state, scout.id)

    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)
    expect(snapshot?.lastKnown.some((memory) => memory.id === enemy.id)).toBe(true)
    expect(snapshot?.retranslators.every((relay) => snapshot.visibleCells.some((cell) => cell.col === relay.col && cell.row === relay.row))).toBe(true)
    expect(snapshot?.visibleTerrain.some((tile) => tile.col === enemy.col && tile.row === enemy.row)).toBe(false)
    expect(snapshot?.bullets).toEqual([])
  })

  it('records last-known enemies spotted by any teammate before relay vision is active', () => {
    const state = createMatchState()
    const baseGuard = addPlayer(state, 'blue-guard', 'Guard', 'blue')
    const spotter = addPlayer(state, 'blue-spotter', 'Spotter', 'blue')
    const enemy = addPlayer(state, 'red-target', 'Target', 'red')
    baseGuard.col = 0
    baseGuard.row = 15
    baseGuard.dir = 'left'
    spotter.col = 10
    spotter.row = 10
    spotter.dir = 'right'
    enemy.col = 12
    enemy.row = 10
    enemy.dir = 'down'

    step(state, 0.1)
    enemy.col = 19
    enemy.row = 15
    step(state, 0.1)

    const snapshot = createSnapshotForPlayer(state, spotter.id)

    expect(snapshot?.teamVisionMerged).toBe(false)
    expect(snapshot?.players.some((player) => player.id === enemy.id)).toBe(false)
    expect(snapshot?.lastKnown).toContainEqual(
      expect.objectContaining({
        id: enemy.id,
        col: 12,
        row: 10,
        team: 'red',
      }),
    )
  })

  it('applies authoritative commands for movement and firing', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 6
    player.row = 7

    setPlayerCommand(state, player.id, { right: true, fire: true, seq: 1 })
    step(state, 0.25)

    expect(player.dir).toBe('right')
    expect(player.col).toBeGreaterThan(5)
    expect(state.bullets.length).toBeGreaterThan(0)
  })

  it('uses slower multiplayer tuning for movement, reload, bullets, and relay capture', () => {
    const movementState = createMatchState()
    movementState.terrain = movementState.terrain.map((row) => row.map(() => 'empty'))
    const mover = addPlayer(movementState, 'mover', 'Mover', 'blue')
    mover.col = 5
    mover.row = 5

    setPlayerCommand(movementState, mover.id, { right: true, seq: 1 })
    updateMatch(movementState, 0.05)

    expect(MULTIPLAYER_TUNING).toMatchObject({
      moveCooldown: 0.28,
      reloadSeconds: 0.6,
      bulletSpeed: 6.5,
      captureSeconds: 3.6,
    })
    expect(mover.col).toBe(6)
    expect(mover.moveCooldown).toBeCloseTo(MULTIPLAYER_TUNING.moveCooldown)
    expect(mover.move).toMatchObject({
      fromCol: 5,
      fromRow: 5,
      toCol: 6,
      toRow: 5,
      elapsed: 0,
      duration: MULTIPLAYER_TUNING.moveCooldown,
    })

    const firingState = createMatchState()
    firingState.terrain = firingState.terrain.map((row) => row.map(() => 'empty'))
    const shooter = addPlayer(firingState, 'shooter', 'Shooter', 'blue')
    shooter.col = 5
    shooter.row = 5
    shooter.dir = 'right'

    setPlayerCommand(firingState, shooter.id, { fire: true, seq: 1 })
    updateMatch(firingState, 0.05)

    expect(shooter.reload).toBeCloseTo(MULTIPLAYER_TUNING.reloadSeconds)
    expect(firingState.bullets[0]).toMatchObject({ team: 'blue', dir: 'right' })
    expect(firingState.bullets[0].x).toBeCloseTo(
      5.5 + 0.45 + MULTIPLAYER_TUNING.bulletSpeed * 0.05,
    )

    const captureState = createMatchState()
    const capturer = addPlayer(captureState, 'capturer', 'Capturer', 'blue')
    capturer.col = 3
    capturer.row = 7
    step(captureState, MULTIPLAYER_TUNING.captureSeconds - 0.1)

    expect(captureState.retranslators[0]).toMatchObject({ owner: null, captureTeam: 'blue' })
    expect(captureState.retranslators[0].progress).toBeLessThan(1)

    step(captureState, 0.2)

    expect(captureState.retranslators[0]).toMatchObject({ owner: 'blue', progress: 1 })
  })

  it('advances and clears online tile movement metadata after release', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    updateMatch(state, 0.05)

    expect(player.move).toMatchObject({ fromCol: 5, fromRow: 5, toCol: 6, toRow: 5 })

    updateMatch(state, 0.1)
    const snapshot = createSnapshotForPlayer(state, player.id)

    expect(snapshot?.players[0].move?.progress).toBeGreaterThan(0)
    expect(snapshot?.players[0].move?.progress).toBeLessThan(1)

    setPlayerCommand(state, player.id, { seq: 2 })
    step(state, MULTIPLAYER_TUNING.moveCooldown + 0.1)

    expect(player).toMatchObject({ col: 6, row: 5, move: null })
  })

  it('chains held online movement into the next tile without a visual idle gap', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    step(state, MULTIPLAYER_TUNING.moveCooldown + 0.12)

    expect(player.col).toBe(7)
    expect(player.move).toMatchObject({ fromCol: 6, toCol: 7 })
  })

  it('rotates on blocked online movement without creating movement metadata', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    state.terrain[5][6] = 'steel'
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    updateMatch(state, 0.05)

    expect(player).toMatchObject({ col: 5, row: 5, dir: 'right', move: null })
  })

  it('reserves target tiles while online movement is active', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const first = addPlayer(state, 'p1', 'Blue One', 'blue')
    const second = addPlayer(state, 'p2', 'Red One', 'red')
    first.col = 5
    first.row = 5
    second.col = 7
    second.row = 5

    setPlayerCommand(state, first.id, { right: true, seq: 1 })
    setPlayerCommand(state, second.id, { left: true, seq: 1 })
    updateMatch(state, 0.05)

    expect(first).toMatchObject({ col: 6, row: 5, move: expect.objectContaining({ toCol: 6, toRow: 5 }) })
    expect(second).toMatchObject({ col: 7, row: 5, dir: 'left', move: null })
  })

  it('never falls back to blocked terrain for multiplayer spawns', () => {
    const state = createMatchState()

    for (const spawn of state.level.blueSpawns) {
      state.terrain[spawn.y][spawn.x] = 'steel'
    }

    const player = addPlayer(state, 'p1', 'Blue One', 'blue')

    expect(state.level.blueSpawns.some((spawn) => spawn.x === player.col && spawn.y === player.row)).toBe(false)
    expect(['empty', 'trees']).toContain(state.terrain[player.row][player.col])
  })

  it('respawns players away from passable spawn pockets with no exit', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    state.level = { ...state.level, blueSpawns: [{ x: 5, y: 5 }] }
    state.terrain[4][5] = 'brick'
    state.terrain[5][6] = 'brick'
    state.terrain[6][5] = 'brick'
    state.terrain[5][4] = 'brick'
    player.alive = false
    player.hp = 0
    player.respawnTimer = 0.01

    updateMatch(state, 0.05)

    expect(player.alive).toBe(true)
    expect(player).not.toMatchObject({ col: 5, row: 5 })
    expectEscapableMultiplayerSpawn(state, player)
  })

  it('ignores stale command sequences that arrive after newer input', () => {
    const state = createMatchState()
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 6
    player.row = 7

    setPlayerCommand(state, player.id, { right: true, fire: true, seq: 2 })
    setPlayerCommand(state, player.id, { left: true, fire: false, seq: 1 })
    step(state, 0.25)

    expect(player.lastCommandSeq).toBe(2)
    expect(player.lastCommand).toMatchObject({ right: true, left: false, fire: true })
    expect(player.dir).toBe('right')
    expect(player.col).toBeGreaterThan(6)
    expect(state.bullets.length).toBeGreaterThan(0)
  })

  it('keeps radio chat and pings team-scoped in snapshots', () => {
    const state = createMatchState()
    const blue = addPlayer(state, 'blue-one', 'Blue One', 'blue')
    const red = addPlayer(state, 'red-one', 'Red One', 'red')

    addChatMessage(state, blue.id, 'Hold the relay')
    addChatMessage(state, red.id, 'Rush south')
    addTeamPing(state, blue.id, blue.col, blue.row)
    addTeamPing(state, blue.id, 4, 7)
    addTeamPing(state, red.id, 15, 8)

    const blueSnapshot = createSnapshotForPlayer(state, blue.id)
    const redSnapshot = createSnapshotForPlayer(state, red.id)

    expect(blueSnapshot?.chat.map((message) => message.text)).toEqual(['Hold the relay'])
    expect(redSnapshot?.chat.map((message) => message.text)).toEqual(['Rush south'])
    expect(blueSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([`${blue.col},${blue.row}`])
    expect(redSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([])
  })
})
