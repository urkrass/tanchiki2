import { describe, expect, it } from 'vitest'
import {
  addTeamRadioMessage,
  addPlayer as addPlayerToLobby,
  addTeamPing,
  computeVisionCircles,
  computeVisibleSet,
  createMatchState,
  createSnapshotForPlayer,
  hasTeamRelay,
  MULTIPLAYER_TUNING,
  setPlayerClass,
  setPlayerCommand,
  setPlayerEquipment,
  startMatch,
  updateMatch,
} from './multiplayer.ts'
import {
  TANK_CLASS_MECHANICS,
  getSharedTankClassCombatStats,
} from './tankClasses.ts'

function addPlayer(
  state: ReturnType<typeof createMatchState>,
  id: string,
  name: string,
  team?: 'blue' | 'red',
  classId?: 'scout' | 'engineer' | 'battle',
) {
  const player = addPlayerToLobby(state, id, name, team, classId)
  startMatch(state)
  return player
}

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
  it('personalizes physical hearing without turning relay vision into global audio', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const listener = addPlayerToLobby(state, 'listener', 'Listener', 'blue')
    const distantListener = addPlayerToLobby(state, 'distant', 'Distant', 'blue')
    const shooter = addPlayerToLobby(state, 'shooter', 'Shooter', 'red')
    listener.col = 1
    listener.row = 1
    distantListener.col = 18
    distantListener.row = 15
    shooter.col = 7
    shooter.row = 1
    shooter.dir = 'down'
    startMatch(state)

    setPlayerCommand(state, shooter.id, { fire: true, seq: 1 })
    updateMatch(state, 0.05)

    const nearby = createSnapshotForPlayer(state, listener.id)
    const distant = createSnapshotForPlayer(state, distantListener.id)
    expect(nearby?.players.some((player) => player.id === shooter.id)).toBe(false)
    expect(nearby?.hearing?.cues).toContainEqual(expect.objectContaining({
      kind: 'shot',
      channel: 'physical',
      sourcePrecision: 'directional',
      direction: 'east',
    }))
    expect(nearby?.hearing?.cues[0]).not.toHaveProperty('source')
    expect(nearby).not.toHaveProperty('acousticEvents')
    expect(distant?.hearing?.cues).toEqual([])

    const relay = state.retranslators[0]
    relay.owner = 'blue'
    relay.col = shooter.col
    relay.row = shooter.row
    const distantWithRelay = createSnapshotForPlayer(state, distantListener.id)
    expect(distantWithRelay?.teamVisionMerged).toBe(true)
    expect(distantWithRelay?.players).toContainEqual(
      expect.objectContaining({ id: shooter.id }),
    )
    expect(distantWithRelay?.hearing?.cues).toEqual([])
  })

  it('applies the selected class to authoritative movement, reload, damage, and shell identity', () => {
    for (const classId of ['scout', 'engineer', 'battle'] as const) {
      const expected = getSharedTankClassCombatStats(classId)
      const state = createMatchState()
      state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
      const player = addPlayer(state, classId, classId, 'blue', classId)
      player.col = 5
      player.row = 5
      player.dir = 'right'
      setPlayerCommand(state, player.id, { right: true, fire: true, seq: 1 })
      updateMatch(state, 0.05)

      expect(player.move?.duration).toBeCloseTo(expected.moveDuration)
      expect(player.reload).toBeCloseTo(expected.reloadDuration)
      expect(player.shells).toBe(9)
      expect(state.bullets[0]).toMatchObject({
        shellKind: expected.shellKind,
        damage: expected.damage,
      })
      expect(createSnapshotForPlayer(state, player.id)?.self).toMatchObject({ classId, shells: 9 })
    }
  })

  it('changes class only in the lobby and refills shells from symmetric ammo stations', () => {
    const state = createMatchState()
    const player = addPlayerToLobby(state, 'p1', 'Blue One', 'blue', 'scout')
    expect(setPlayerClass(state, player.id, 'battle')).toBe(true)
    expect(player).toMatchObject({ classId: 'battle', shells: 10 })
    expect(state.terrain.flat().filter((tile) => tile === 'ammo')).toHaveLength(4)
    startMatch(state)
    expect(setPlayerClass(state, player.id, 'engineer')).toBe(false)

    player.col = 4
    player.row = 1
    player.shells = 8
    step(state, MULTIPLAYER_TUNING.shellRechargeSeconds + 0.05)
    expect(player.shells).toBe(9)
    expect(createSnapshotForPlayer(state, player.id)?.self).toMatchObject({
      classId: 'battle',
      shells: 9,
      onAmmoStation: true,
    })
  })

  it('keeps Scout and Engineer devices authoritative and team-scoped', () => {
    const scoutState = createMatchState()
    scoutState.terrain = scoutState.terrain.map((row) => row.map(() => 'empty'))
    const scout = addPlayer(scoutState, 'scout', 'Scout', 'blue', 'scout')
    const enemy = addPlayer(scoutState, 'enemy', 'Enemy', 'red', 'battle')
    scout.col = 5
    scout.row = 5
    scout.dir = 'up'
    enemy.col = 8
    enemy.row = 5
    setPlayerEquipment(scoutState, scout.id, 1, true, 1)
    step(scoutState, MULTIPLAYER_TUNING.deployablePlaceSeconds + 0.05)
    setPlayerEquipment(scoutState, scout.id, 1, false, 2)
    expect(scoutState.deployables).toContainEqual(expect.objectContaining({ ownerId: scout.id, kind: 'decoy', col: 5, row: 5 }))
    expect(createSnapshotForPlayer(scoutState, scout.id)?.deployables).toHaveLength(1)
    expect(createSnapshotForPlayer(scoutState, enemy.id)?.deployables).toEqual([])
    step(scoutState, 0.05)
    expect(createSnapshotForPlayer(scoutState, enemy.id)?.lastKnown).not.toContainEqual(
      expect.objectContaining({ id: scoutState.deployables[0].id }),
    )
    const enemyRelay = scoutState.retranslators[0]
    enemyRelay.owner = 'red'
    enemyRelay.col = 5
    enemyRelay.row = 6
    step(scoutState, 0.05)
    expect(createSnapshotForPlayer(scoutState, enemy.id)?.lastKnown).toContainEqual(
      expect.objectContaining({ id: scoutState.deployables[0].id, team: 'blue', col: 5, row: 5 }),
    )
    scout.row = 4
    setPlayerEquipment(scoutState, scout.id, 1, true, 3)
    step(scoutState, MULTIPLAYER_TUNING.deployableRecoverSeconds + 0.05)
    setPlayerEquipment(scoutState, scout.id, 1, false, 4)
    expect(scoutState.deployables).toEqual([])

    const engineerState = createMatchState()
    engineerState.terrain = engineerState.terrain.map((row) => row.map(() => 'empty'))
    const engineer = addPlayer(engineerState, 'engineer', 'Engineer', 'blue', 'engineer')
    const raider = addPlayer(engineerState, 'raider', 'Raider', 'red', 'scout')
    engineer.col = 5
    engineer.row = 5
    engineer.dir = 'up'
    raider.col = 8
    raider.row = 8
    setPlayerEquipment(engineerState, engineer.id, 1, true, 1)
    step(engineerState, MULTIPLAYER_TUNING.deployablePlaceSeconds + 0.05)
    setPlayerEquipment(engineerState, engineer.id, 1, false, 2)
    raider.col = 5
    raider.row = 4
    step(engineerState, 0.05)
    expect(raider).toMatchObject({ hp: 1, slow: MULTIPLAYER_TUNING.mineSlowSeconds })
    expect(engineerState.deployables).toEqual([])
  })

  it('runs Battle Bulwark and Traverse as authoritative timed abilities', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const battle = addPlayer(state, 'battle', 'Battle', 'blue', 'battle')
    battle.col = 5
    battle.row = 5
    battle.dir = 'right'

    setPlayerEquipment(state, battle.id, 1, true, 1)
    expect(createSnapshotForPlayer(state, battle.id)?.self.equipment[0]).toMatchObject({
      kind: 'bulwark', state: 'active', count: 3,
    })
    setPlayerEquipment(state, battle.id, 1, false, 2)
    setPlayerEquipment(state, battle.id, 2, true, 3)
    setPlayerCommand(state, battle.id, { right: true, seq: 1 })
    updateMatch(state, 0.05)
    expect(battle).toMatchObject({ dir: 'right', col: 5, row: 5, move: null })
    setPlayerCommand(state, battle.id, { up: true, fire: true, seq: 2 })
    updateMatch(state, 0.05)
    expect(battle).toMatchObject({ dir: 'right', col: 5, row: 4 })
    expect(battle.move).toMatchObject({ fromRow: 5, toRow: 4 })
    expect(battle.move?.duration).toBeCloseTo(
      getSharedTankClassCombatStats('battle').moveDuration * TANK_CLASS_MECHANICS.movement.traverseDurationMultiplier,
    )
    expect(createSnapshotForPlayer(state, battle.id)?.self.equipment[1]).toMatchObject({
      kind: 'traverse', state: 'active',
    })
    expect(state.bullets[0]).toMatchObject({ dir: 'right', damage: 3, splashDamage: 1, splashRadius: 1.25 })
    setPlayerEquipment(state, battle.id, 2, false, 4)
    setPlayerEquipment(state, battle.id, 2, true, 5)
    expect(battle).toMatchObject({ traverseRemaining: 0, traverseCooldown: 10 })
  })

  it('consumes crossing traps, keeps decoys persistent, and reports alerts only to their team', () => {
    const tripwireState = createMatchState()
    tripwireState.terrain = tripwireState.terrain.map((row) => row.map(() => 'empty'))
    const scout = addPlayer(tripwireState, 'scout', 'Scout', 'blue', 'scout')
    const intruder = addPlayer(tripwireState, 'intruder', 'Intruder', 'red', 'scout')
    scout.col = 2
    scout.row = 2
    intruder.col = 6
    intruder.row = 5
    tripwireState.deployables.push({ id: 'wire', ownerId: scout.id, team: 'blue', kind: 'tripwire', col: 6, row: 5 })
    step(tripwireState, 0.05)
    expect(tripwireState.deployables).toEqual([])
    expect(createSnapshotForPlayer(tripwireState, scout.id)?.equipmentAlerts).toContainEqual(
      expect.objectContaining({ kind: 'tripwire', team: 'blue', col: 6, row: 5 }),
    )
    expect(createSnapshotForPlayer(tripwireState, intruder.id)?.equipmentAlerts).toEqual([])

    const steelState = createMatchState()
    steelState.terrain = steelState.terrain.map((row) => row.map(() => 'empty'))
    const engineer = addPlayer(steelState, 'engineer', 'Engineer', 'blue', 'engineer')
    const raider = addPlayer(steelState, 'raider', 'Raider', 'red', 'scout')
    engineer.col = 2
    engineer.row = 2
    raider.col = 5
    raider.row = 5
    raider.dir = 'right'
    steelState.deployables.push({ id: 'steel', ownerId: engineer.id, team: 'blue', kind: 'steel', col: 6, row: 5 })
    setPlayerCommand(steelState, raider.id, { right: true, seq: 1 })
    updateMatch(steelState, 0.05)
    expect(raider).toMatchObject({ col: 6, row: 5, move: null, moveCooldown: 0, immobilized: 5 })
    expect(steelState.deployables).toEqual([])
    expect(createSnapshotForPlayer(steelState, engineer.id)?.equipmentAlerts).toContainEqual(
      expect.objectContaining({ kind: 'steel', team: 'blue', col: 6, row: 5 }),
    )

    steelState.deployables.push({ id: 'decoy', ownerId: engineer.id, team: 'blue', kind: 'decoy', col: 8, row: 5 })
    steelState.bullets.push({
      id: 'decoy-shot', ownerId: raider.id, team: 'red', shellKind: 'scout-shell',
      damage: 1, splashDamage: 0, splashRadius: 0, x: 7.75, y: 5.5, dir: 'right', ttl: 1,
    })
    updateMatch(steelState, 0.05)
    expect(steelState.deployables).toContainEqual(expect.objectContaining({ id: 'decoy', kind: 'decoy' }))
  })

  it('matches offline Bulwark absorption and Battle HE impact rules', () => {
    const bulwarkState = createMatchState()
    bulwarkState.terrain = bulwarkState.terrain.map((row) => row.map(() => 'empty'))
    const battle = addPlayer(bulwarkState, 'battle', 'Battle', 'blue', 'battle')
    const attacker = addPlayer(bulwarkState, 'attacker', 'Attacker', 'red', 'battle')
    battle.col = 5
    battle.row = 5
    attacker.col = 2
    attacker.row = 2
    setPlayerEquipment(bulwarkState, battle.id, 1, true, 1)
    bulwarkState.bullets.push({
      id: 'bulwark-break', ownerId: attacker.id, team: 'red', shellKind: 'battle-shell',
      damage: 4, splashDamage: 0, splashRadius: 0, x: 4.75, y: 5.5, dir: 'right', ttl: 1,
    })
    updateMatch(bulwarkState, 0.05)
    expect(battle).toMatchObject({ hp: 2, bulwarkRemaining: 0, bulwarkCapacity: 0, bulwarkCooldown: 12 })

    const splashState = createMatchState()
    splashState.terrain = splashState.terrain.map((row) => row.map(() => 'empty'))
    const shooter = addPlayer(splashState, 'shooter', 'Shooter', 'blue', 'battle')
    const direct = addPlayer(splashState, 'direct', 'Direct', 'red', 'battle')
    const nearby = addPlayer(splashState, 'nearby', 'Nearby', 'red', 'battle')
    shooter.col = 2
    shooter.row = 2
    direct.col = 6
    direct.row = 5
    nearby.col = 6
    nearby.row = 6
    splashState.terrain[4][6] = 'brick'
    splashState.bullets.push({
      id: 'he-player-impact', ownerId: shooter.id, team: 'blue', shellKind: 'battle-shell',
      damage: 3, splashDamage: 1, splashRadius: 1.25, x: 5.75, y: 5.5, dir: 'right', ttl: 1,
    })
    updateMatch(splashState, 0.05)
    expect(direct.alive).toBe(false)
    expect(nearby.hp).toBe(2)
    expect(splashState.terrain[4][6]).toBe('empty')

    splashState.terrain[8][6] = 'steel'
    splashState.terrain[8][7] = 'brick'
    splashState.bullets.push({
      id: 'he-steel-impact', ownerId: shooter.id, team: 'blue', shellKind: 'battle-shell',
      damage: 3, splashDamage: 1, splashRadius: 1.25, x: 5.75, y: 8.5, dir: 'right', ttl: 1,
    })
    updateMatch(splashState, 0.05)
    expect(splashState.terrain[8][7]).toBe('brick')
  })
  it('keeps newly added players in the lobby until the room deploys', () => {
    const state = createMatchState()
    addPlayerToLobby(state, 'p1', 'Blue One', 'blue')

    expect(state.phase).toBe('lobby')
    expect(state.serverTick).toBe(0)
    expect(updateMatch(state, 0.05)).toBeUndefined()
    expect(state.serverTick).toBe(0)
    expect(startMatch(state)).toBe(true)
    updateMatch(state, 0.05)
    expect(state).toMatchObject({ phase: 'playing', serverTick: 1 })
  })

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

  it('keeps a quick online direction tap stationary and reports pivot progress', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    updateMatch(state, 0.08)

    expect(player).toMatchObject({ col: 5, row: 5, dir: 'right', move: null })
    expect(player.pivot?.elapsed).toBeCloseTo(0.08)
    expect(createSnapshotForPlayer(state, player.id)?.players[0].pivot).toMatchObject({
      direction: 'right',
      progress: 0.5,
      holdSeconds: 0.16,
    })

    setPlayerCommand(state, player.id, { seq: 2 })
    updateMatch(state, 0.2)
    expect(player).toMatchObject({ col: 5, row: 5, dir: 'right', move: null, pivot: null })
  })

  it('moves after the online pivot hold threshold and fires along the new facing immediately', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5

    setPlayerCommand(state, player.id, { right: true, fire: true, seq: 1 })
    updateMatch(state, 0.1)
    expect(player).toMatchObject({ col: 5, row: 5, dir: 'right', move: null })
    expect(state.bullets[0]).toMatchObject({ dir: 'right' })

    updateMatch(state, 0.06)
    expect(player).toMatchObject({ col: 6, row: 5, pivot: null })
    expect(player.move).toMatchObject({ fromCol: 5, toCol: 6 })
  })

  it('buffers held online steering during a tile and starts the queued tile without an idle gap', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5
    player.dir = 'right'

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    updateMatch(state, 0.05)
    updateMatch(state, 0.1)
    setPlayerCommand(state, player.id, { up: true, seq: 2 })
    updateMatch(state, 0.1)
    updateMatch(state, 0.06)

    expect(player).toMatchObject({ col: 6, row: 5, dir: 'right' })
    expect(player.move).toMatchObject({ fromCol: 5, fromRow: 5, toCol: 6, toRow: 5 })
    expect(player.pivot).toMatchObject({ direction: 'up', elapsed: 0.16, queued: true, released: false })

    updateMatch(state, 0.1)
    updateMatch(state, 0.03)
    expect(player).toMatchObject({ col: 6, row: 4, dir: 'up', pivot: null })
    expect(player.move).toMatchObject({ fromCol: 6, fromRow: 5, toCol: 6, toRow: 4 })
  })

  it('keeps a quick online mid-move tap as a boundary turn without movement', () => {
    const state = createMatchState()
    state.terrain = state.terrain.map((row) => row.map(() => 'empty'))
    const player = addPlayer(state, 'p1', 'Blue One', 'blue')
    player.col = 5
    player.row = 5
    player.dir = 'right'

    setPlayerCommand(state, player.id, { right: true, seq: 1 })
    updateMatch(state, 0.05)
    updateMatch(state, 0.1)
    setPlayerCommand(state, player.id, { up: true, seq: 2 })
    updateMatch(state, 0.05)
    setPlayerCommand(state, player.id, { seq: 3 })
    step(state, 0.25)

    expect(player).toMatchObject({ col: 6, row: 5, dir: 'up', move: null, pivot: null })
  })

  it('uses the shared offline tuning for movement, reload, bullets, and relay capture', () => {
    const movementState = createMatchState()
    movementState.terrain = movementState.terrain.map((row) => row.map(() => 'empty'))
    const mover = addPlayer(movementState, 'mover', 'Mover', 'blue')
    mover.col = 5
    mover.row = 5
    mover.dir = 'right'

    setPlayerCommand(movementState, mover.id, { right: true, seq: 1 })
    updateMatch(movementState, 0.05)

    expect(MULTIPLAYER_TUNING).toMatchObject({
      moveCooldown: TANK_CLASS_MECHANICS.movement.baseDurationSeconds,
      reloadSeconds: TANK_CLASS_MECHANICS.weapon.baseReloadSeconds,
      bulletSpeed: TANK_CLASS_MECHANICS.weapon.projectileSpeedPixelsPerSecond / TANK_CLASS_MECHANICS.grid.tileSize,
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

    expect(shooter.reload).toBeCloseTo(MULTIPLAYER_TUNING.reloadSeconds * 1.2)
    expect(firingState.bullets[0]).toMatchObject({
      team: 'blue',
      dir: 'right',
      shellKind: 'engineer-shell',
      damage: 2,
    })
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
    player.dir = 'right'

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
    player.dir = 'right'

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
    first.dir = 'right'
    second.col = 7
    second.row = 5
    second.dir = 'left'

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

  it('keeps fixed radio commands and pings team-scoped in snapshots', () => {
    const state = createMatchState()
    const blue = addPlayer(state, 'blue-one', 'Blue One', 'blue')
    const red = addPlayer(state, 'red-one', 'Red One', 'red')

    addTeamRadioMessage(state, blue.id, 'DEFEND')
    addTeamRadioMessage(state, red.id, 'ATTACK')
    addTeamPing(state, blue.id, blue.col, blue.row)
    addTeamPing(state, blue.id, 4, 7)
    addTeamPing(state, red.id, 15, 8)

    const blueSnapshot = createSnapshotForPlayer(state, blue.id)
    const redSnapshot = createSnapshotForPlayer(state, red.id)

    expect(blueSnapshot?.radio.map((message) => message.command)).toEqual(['DEFEND'])
    expect(redSnapshot?.radio.map((message) => message.command)).toEqual(['ATTACK'])
    expect(blueSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([`${blue.col},${blue.row}`])
    expect(redSnapshot?.pings.map((ping) => `${ping.col},${ping.row}`)).toEqual([])
  })
})
