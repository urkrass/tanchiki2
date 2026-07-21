import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { TERRAIN_EVIDENCE_TEST_LEVEL, TERRAIN_EVIDENCE_TEST_LEVEL_ID } from './level.ts'
import { MemorySaveStore } from './save.ts'
import { SELECTED_TERRAIN_EVIDENCE_IDS, TERRAIN_DEFINITIONS, terrainCharMap, terrainDefinition } from './terrain.ts'
import { ARENA_X, ARENA_Y, DIR_VECTORS, TILE_SIZE } from './constants.ts'
import type { Bullet, Direction, InputState, LevelDefinition, OfflineDeployableKind, Tank } from './types.ts'

type GameInternals = {
  bullets: Bullet[]
  enemies: Tank[]
  player: Tank
  canPlaceDeployableAt: (kind: OfflineDeployableKind, col: number, row: number) => boolean
  canPlaceMajorModStructureAt: (col: number, row: number) => boolean
  canPlacePortableRelayAt: (col: number, row: number) => boolean
  startMove: (tank: Tank, direction: Direction) => boolean
  tryRicochetBullet: (bullet: Bullet, col: number, row: number, centerX: number, centerY: number) => boolean
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function internalsOf(game: TanchikiGame) {
  return game as unknown as GameInternals
}

function rowsWith(cells: Array<{ col: number; row: number; char: string }>, size = 13) {
  const rows = Array.from({ length: size }, () => Array.from({ length: size }, () => '.'))
  rows[size - 1]![Math.floor(size / 2)] = 'E'
  for (const cell of cells) {
    rows[cell.row]![cell.col] = cell.char
  }
  return rows.map((row) => row.join(''))
}

function makeLevel(rows: string[], overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 7001 + rows.join('').length + (overrides.playerSpawn?.x ?? 0),
    name: 'Terrain Evidence Unit',
    briefing: 'Unit test terrain evidence map.',
    objective: {
      mode: 'defense',
      label: 'Prototype',
      briefing: 'Exercise prototype terrain.',
      winCondition: 'Unit test only.',
    },
    rows,
    playerSpawn: { x: 2, y: 2 },
    enemySpawns: [{ x: 10, y: 10 }],
    enemyTotal: 1,
    activeEnemyLimit: 0,
    spawnInterval: 99,
    roleWeights: { base_attacker: 0.2, hunter: 0.6, wall_breaker: 0.2 },
    armoredEnemyRatio: 0,
    rewards: { credits: 0, xp: 0, score: 0 },
    ...overrides,
  }
}

function startLevel(rows: string[], overrides: Partial<LevelDefinition> = {}) {
  const level = makeLevel(rows, overrides)
  const game = new TanchikiGame({ aiEnabled: false, levelDefinitions: [level], saveStore: new MemorySaveStore() })
  game.startGame(level.id)
  return game
}

function startTerrainEvidenceTestLevel(aiEnabled = false) {
  const game = new TanchikiGame({
    aiEnabled,
    levelDefinitions: [TERRAIN_EVIDENCE_TEST_LEVEL],
    saveStore: new MemorySaveStore(),
  })
  game.startGame(TERRAIN_EVIDENCE_TEST_LEVEL_ID)
  return game
}

function movePlayer(game: TanchikiGame, direction: Direction) {
  const internals = internalsOf(game)
  expect(internals.startMove(internals.player, direction)).toBe(true)
  const duration = internals.player.move?.duration ?? 0.35
  stepUntilSettled(game, internals.player)
  return duration
}

function holdButton(game: TanchikiGame, button: keyof InputState, seconds: number) {
  game.setInput({ [button]: true } as Partial<InputState>)
  step(game, seconds)
  game.setInput({ [button]: false } as Partial<InputState>)
  step(game, 0.1)
}

function waveTouchesCell(wave: { x: number; y: number; previousX: number; previousY: number }, col: number, row: number) {
  const left = ARENA_X + col * TILE_SIZE
  const top = ARENA_Y + row * TILE_SIZE
  const right = left + TILE_SIZE
  const bottom = top + TILE_SIZE
  const pointInside = (x: number, y: number) => x >= left && x < right && y >= top && y < bottom
  const dx = wave.x - wave.previousX
  const dy = wave.y - wave.previousY
  const samples = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4))
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    if (pointInside(wave.previousX + dx * t, wave.previousY + dy * t)) {
      return true
    }
  }
  return false
}

function stepUntilSettled(game: TanchikiGame, tank: Tank, maxSeconds = 3) {
  const frames = Math.ceil(maxSeconds * 60)
  for (let index = 0; index < frames; index += 1) {
    if (!tank.move) {
      return
    }
    game.update(1 / 60)
  }
  expect(tank.move).toBeNull()
}

function makeTankAt(id: string, col: number, row: number): Tank {
  return {
    id,
    faction: 'enemy',
    classId: null,
    side: 'enemy',
    team: 'red',
    role: 'hunter',
    col,
    row,
    x: ARENA_X + col * TILE_SIZE + 3,
    y: ARENA_Y + row * TILE_SIZE + 3,
    dir: 'right',
    hp: 2,
    maxHp: 2,
    speed: 0,
    reload: 0,
    reloadTime: 1.35,
    aiCooldown: 0,
    turnCooldown: 0,
    spawnGrace: 0,
    scoreValue: 100,
    shield: 0,
    rapid: 0,
    repairCharges: 0,
    slow: 0,
    immobilized: 0,
    bulwarkRemaining: 0,
    bulwarkCapacity: 0,
    bulwarkCooldown: 0,
    traverseRemaining: 0,
    traverseCooldown: 0,
    move: null,
    path: [],
  }
}

describe('terrain evidence prototype catalog and map', () => {
  it('contains every selected terrain id with serializable mechanics metadata', () => {
    for (const id of SELECTED_TERRAIN_EVIDENCE_IDS) {
      const definition = terrainDefinition(id)
      expect(definition.id).toBe(id)
      expect(definition.char).toHaveLength(1)
      expect(typeof definition.movement.speedMultiplier).toBe('number')
      expect(typeof definition.tracks.persistenceMultiplier).toBe('number')
      expect(typeof definition.noise.multiplier).toBe('number')
      expect(typeof definition.render.hint).toBe('string')
    }
  })

  it('keeps the prototype level rectangular and limited to valid terrain chars', () => {
    const charMap = terrainCharMap()
    const rows = TERRAIN_EVIDENCE_TEST_LEVEL.rows

    expect(rows).toHaveLength(17)
    expect(rows.every((row) => row.length === 21)).toBe(true)

    const chars = new Set(rows.join('').split(''))
    for (const char of chars) {
      expect(charMap[char]).toBeDefined()
    }
    for (const id of SELECTED_TERRAIN_EVIDENCE_IDS) {
      expect(rows.join('')).toContain(TERRAIN_DEFINITIONS[id].char)
    }
    expect(TERRAIN_EVIDENCE_TEST_LEVEL.enemyTotal).toBe(1)
    expect(TERRAIN_EVIDENCE_TEST_LEVEL.activeEnemyLimit).toBe(0)

    const hardBlockers = new Set(['B', 'S'])
    const cellAt = (col: number, row: number) => rows[row]?.[col]
    const echoCells: Array<{ col: number; row: number }> = []
    rows.forEach((row, rowIndex) => {
      row.split('').forEach((char, colIndex) => {
        if (char === 'h') {
          echoCells.push({ col: colIndex, row: rowIndex })
        }
      })
    })
    const adjacentHardBlockers = ({ col, row }: { col: number; row: number }) => [
      cellAt(col, row - 1),
      cellAt(col + 1, row),
      cellAt(col, row + 1),
      cellAt(col - 1, row),
    ].filter((char) => char && hardBlockers.has(char)).length

    expect(cellAt(TERRAIN_EVIDENCE_TEST_LEVEL.playerSpawn.x, TERRAIN_EVIDENCE_TEST_LEVEL.playerSpawn.y)).toBe('.')
    expect(cellAt(TERRAIN_EVIDENCE_TEST_LEVEL.playerSpawn.x, TERRAIN_EVIDENCE_TEST_LEVEL.playerSpawn.y - 1)).toBe('h')
    expect(TERRAIN_EVIDENCE_TEST_LEVEL.enemySpawns).toEqual([{ x: 8, y: 13 }])
    expect(cellAt(8, 13)).toBe('h')
    expect(echoCells.some((cell) => adjacentHardBlockers(cell) === 0)).toBe(true)
    expect(echoCells.filter((cell) => adjacentHardBlockers(cell) >= 2).length).toBeGreaterThanOrEqual(8)
  })
})

describe('terrain evidence prototype mechanics', () => {
  it('allows placeable gear, relays, and structure mods on passable prototype terrain', () => {
    const passablePrototypeChars = SELECTED_TERRAIN_EVIDENCE_IDS
      .filter((id) => terrainDefinition(id).passable)
      .map((id) => TERRAIN_DEFINITIONS[id].char)

    for (const char of passablePrototypeChars) {
      const game = startLevel(rowsWith([{ col: 2, row: 2, char }]))
      const internals = internalsOf(game)

      expect(internals.canPlaceDeployableAt('mine', 2, 2)).toBe(true)
      expect(internals.canPlacePortableRelayAt(2, 2)).toBe(true)
      expect(internals.canPlaceMajorModStructureAt(2, 2)).toBe(true)
    }

    const mine = startLevel(rowsWith([{ col: 2, row: 2, char: 's' }]))
    holdButton(mine, 'mine', 0.92)
    expect(mine.getSnapshot().deployables.active).toContainEqual(expect.objectContaining({
      kind: 'mine',
      col: 2,
      row: 2,
    }))

    const steel = startLevel(rowsWith([{ col: 2, row: 2, char: 'g' }]))
    holdButton(steel, 'steel', 0.92)
    expect(steel.getSnapshot().deployables.active).toContainEqual(expect.objectContaining({
      kind: 'steel',
      col: 2,
      row: 2,
    }))

    const relay = startLevel(rowsWith([{ col: 2, row: 2, char: 'h' }]))
    holdButton(relay, 'relay', 1.22)
    expect(relay.getSnapshot().portableRelay.relays).toContainEqual(expect.objectContaining({
      col: 2,
      row: 2,
    }))

    const hedgehog = startLevel(rowsWith([{ col: 2, row: 2, char: 'n' }]))
    expect(hedgehog.setMajorMod('hedgehog')).toBe(true)
    holdButton(hedgehog, 'mod', 0.05)
    expect(hedgehog.getSnapshot().majorMods.hedgehog).toMatchObject({
      active: true,
      col: 2,
      row: 2,
    })

    const emp = startLevel(rowsWith([{ col: 2, row: 2, char: 'r' }]))
    expect(emp.setMajorMod('emp')).toBe(true)
    holdButton(emp, 'mod', 0.05)
    expect(emp.getSnapshot().majorMods.emp).toMatchObject({
      active: true,
      col: 2,
      row: 2,
    })

    const blocked = startLevel(rowsWith([{ col: 3, row: 2, char: 'x' }]))
    const internals = internalsOf(blocked)
    expect(internals.canPlaceDeployableAt('mine', 3, 2)).toBe(false)
    expect(internals.canPlacePortableRelayAt(3, 2)).toBe(false)
    expect(internals.canPlaceMajorModStructureAt(3, 2)).toBe(false)
  })

  it('slows swamp movement and makes muddy tracks last longer than open ground', () => {
    const open = startLevel(rowsWith([]))
    const openDuration = movePlayer(open, 'right')
    const openTrack = open.getSnapshot().majorMods.tracks.at(-1)

    const swamp = startLevel(rowsWith([{ col: 3, row: 2, char: 's' }]))
    const swampDuration = movePlayer(swamp, 'right')
    const swampTrack = swamp.getSnapshot().majorMods.tracks.at(-1)

    expect(swampDuration).toBeGreaterThan(openDuration)
    expect(swampTrack?.surface).toBe('swamp')
    expect(swampTrack?.ttl).toBeGreaterThan(openTrack?.ttl ?? 0)
  })

  it('keeps snow tracks stronger and longer-lived than open-ground tracks', () => {
    const snow = startLevel(rowsWith([{ col: 3, row: 2, char: 'n' }]))
    movePlayer(snow, 'right')
    const track = snow.getSnapshot().majorMods.tracks.at(-1)

    expect(track?.surface).toBe('snow')
    expect(track?.ttl).toBeGreaterThan(10)
    expect(track?.visibility).toBeGreaterThan(1)
  })

  it('creates short-lived directional dust evidence on dust roads', () => {
    const game = startLevel(rowsWith([{ col: 3, row: 2, char: 'd' }]))
    movePlayer(game, 'right')

    expect(game.getSnapshot().terrainEvidence).toContainEqual(expect.objectContaining({
      kind: 'dust',
      col: 3,
      row: 2,
      dir: 'right',
      label: 'DUST',
    }))
    expect(game.getSnapshot().terrainEvidence.find((marker) => marker.kind === 'dust')?.ttl).toBeLessThan(1.2)
  })

  it('emits louder gravel noise evidence without slowing movement', () => {
    const open = startLevel(rowsWith([]))
    const openDuration = movePlayer(open, 'right')

    const gravel = startLevel(rowsWith([{ col: 3, row: 2, char: 'g' }]))
    const gravelDuration = movePlayer(gravel, 'right')
    const marker = gravel.getSnapshot().terrainEvidence.find((item) => item.kind === 'noise')

    expect(gravelDuration).toBe(openDuration)
    expect(marker).toMatchObject({ col: 3, row: 2, label: 'GRAVEL' })
    expect(marker?.strength).toBeGreaterThan(1)
  })

  it('suppresses metal tracks and creates a metallic contact marker', () => {
    const game = startLevel(rowsWith([{ col: 3, row: 2, char: 'm' }]))
    movePlayer(game, 'right')

    expect(game.getSnapshot().majorMods.tracks).toHaveLength(0)
    expect(game.getSnapshot().terrainEvidence).toContainEqual(expect.objectContaining({
      kind: 'metal',
      label: 'METAL',
    }))
  })

  it('slides one extra tile on metal when clear and stops at a blocked next cell', () => {
    const clear = startLevel(rowsWith([{ col: 3, row: 2, char: 'm' }]))
    movePlayer(clear, 'right')
    step(clear, 0.6)
    expect(clear.getSnapshot().player).toMatchObject({ col: 4, row: 2, moving: false })

    const blocked = startLevel(rowsWith([{ col: 3, row: 2, char: 'm' }, { col: 4, row: 2, char: 'S' }]))
    movePlayer(blocked, 'right')
    step(blocked, 0.6)
    expect(blocked.getSnapshot().player).toMatchObject({ col: 3, row: 2, moving: false })
  })

  it('reduces stationary tank visibility in reeds and emits reed firing evidence', () => {
    const open = startLevel(rowsWith([]), { playerSpawn: { x: 2, y: 2 } })
    internalsOf(open).enemies.push(makeTankAt('open-enemy', 4, 2))
    expect(open.getSnapshot().enemies.map((enemy) => enemy.id)).toContain('open-enemy')

    const reeds = startLevel(rowsWith([{ col: 2, row: 2, char: 'r' }, { col: 4, row: 2, char: 'r' }]), { playerSpawn: { x: 2, y: 2 } })
    internalsOf(reeds).enemies.push(makeTankAt('reed-enemy', 4, 2))
    expect(reeds.getSnapshot().enemies.map((enemy) => enemy.id)).not.toContain('reed-enemy')

    reeds.primaryAction()
    expect(reeds.getSnapshot().terrainEvidence).toContainEqual(expect.objectContaining({
      kind: 'rustle',
      label: 'REED SHOT',
    }))
  })

  it('bounces ricochet shots once with deterministic parity and prevents pinball', () => {
    const game = startLevel(rowsWith([{ col: 4, row: 2, char: 'x' }]))
    const bullet: Bullet = {
      id: 'ricochet-test',
      owner: 'player',
      team: 'blue',
      x: ARENA_X + 4 * TILE_SIZE,
      y: ARENA_Y + 2 * TILE_SIZE,
      dir: 'right',
      speed: 220,
      damage: 2,
      ttl: 3,
    }
    const internals = internalsOf(game)

    expect(internals.tryRicochetBullet(bullet, 4, 2, bullet.x, bullet.y)).toBe(true)
    expect(bullet.dir).toBe('up')
    expect(bullet.ricochets).toBe(1)
    expect(internals.tryRicochetBullet(bullet, 4, 2, bullet.x, bullet.y)).toBe(false)
  })

  it('uses portable relay wave mechanics for echo tile steps in closed corridors', () => {
    const game = startLevel(rowsWith([
      { col: 3, row: 2, char: 'h' },
      { col: 6, row: 2, char: 'B' },
    ]))
    movePlayer(game, 'right')
    const triggered = game.getSnapshot()

    expect(triggered.player).toMatchObject({ col: 3, row: 2 })
    expect(triggered.terrainEvidence.some((item) => item.kind === 'echo')).toBe(false)
    expect(triggered.portableRelay.waveCount).toBe(10)
    expect(triggered.portableRelay.waves[0]).toMatchObject({
      bounces: 0,
      strength: 1,
      ttl: 1.8,
    })
    expect(triggered.portableRelay.waves[0]?.sourceTeam).toBeUndefined()
    expect(triggered.portableRelay.waves[0]?.age).toBeLessThanOrEqual(0.05)

    step(game, 0.82)
    const bounced = game.getSnapshot()
    expect(bounced.portableRelay.signalContacts).toContainEqual(expect.objectContaining({
      kind: 'wall',
      col: 6,
      row: 2,
    }))
    expect(bounced.portableRelay.waves.some((wave) => wave.bounces > 0)).toBe(true)
  })

  it('emits visible relay waves from hidden enemy echo steps without revealing the tank snapshot', () => {
    const game = startLevel(rowsWith([{ col: 10, row: 9, char: 'h' }], 13), { playerSpawn: { x: 1, y: 1 } })
    const internals = internalsOf(game)
    const enemy = makeTankAt('hidden-echo-enemy', 9, 9)
    internals.enemies.push(enemy)

    expect(internals.startMove(enemy, 'right')).toBe(true)
    stepUntilSettled(game, enemy)

    const snapshot = game.getSnapshot()
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.terrainEvidence.some((marker) => marker.kind === 'echo')).toBe(false)
    expect(snapshot.portableRelay.waveCount).toBe(10)
    expect(snapshot.portableRelay.waves.some((wave) => wave.sourceTeam === 'red')).toBe(false)
    expect(snapshot.portableRelay.waves.some((wave) => waveTouchesCell(wave, 10, 9))).toBe(false)
    const forward = DIR_VECTORS[enemy.dir]
    expect(snapshot.portableRelay.waves.some((wave) => waveTouchesCell(wave, enemy.col + forward.x, enemy.row + forward.y))).toBe(false)
    expect(snapshot.portableRelay.signalContacts.some((contact) => contact.kind === 'hostile')).toBe(false)
  })

  it('anchors visible enemy echo waves to the stopped tile instead of a hidden-source offset', () => {
    const game = startLevel(rowsWith([{ col: 10, row: 9, char: 'h' }], 13), { playerSpawn: { x: 10, y: 11 } })
    const internals = internalsOf(game)
    const enemy = makeTankAt('visible-echo-enemy', 9, 9)
    internals.enemies.push(enemy)

    expect(internals.startMove(enemy, 'right')).toBe(true)
    stepUntilSettled(game, enemy)

    const snapshot = game.getSnapshot()
    expect(snapshot.enemies).toContainEqual(expect.objectContaining({ col: 10, row: 9 }))
    expect(snapshot.portableRelay.waveCount).toBe(10)
    expect(snapshot.portableRelay.waves.some((wave) => wave.sourceTeam === 'red')).toBe(false)
    expect(snapshot.portableRelay.waves.some((wave) => waveTouchesCell(wave, 10, 9))).toBe(true)
    const forward = DIR_VECTORS[enemy.dir]
    expect(snapshot.portableRelay.waves.some((wave) => waveTouchesCell(wave, enemy.col + forward.x, enemy.row + forward.y))).toBe(false)
    expect(snapshot.portableRelay.signalContacts.some((contact) => contact.kind === 'hostile')).toBe(false)
  })

  it('shows passive patrol echo waves without hostile contacts when the player does not trigger a pulse', () => {
    const game = startTerrainEvidenceTestLevel(false)

    step(game, 2.7)

    const snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 14 })
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.portableRelay.waveCount).toBeGreaterThan(0)
    expect(snapshot.portableRelay.waves.some((wave) => wave.sourceTeam === 'red')).toBe(false)
    expect(snapshot.portableRelay.signalContacts.some((contact) => contact.kind === 'hostile')).toBe(false)
  })

  it('spawns a passive invincible patrol sentinel in the hidden echo maze', () => {
    const game = startTerrainEvidenceTestLevel(true)
    const internals = internalsOf(game)
    const sentinel = internals.enemies.find((enemy) => enemy.id === 'terrain-evidence-patrol')

    expect(sentinel).toBeDefined()
    expect(sentinel).toMatchObject({
      col: 8,
      row: 13,
      hp: 99,
      maxHp: 99,
      reloadTime: 999,
      scoreValue: 0,
    })
    expect(game.getSnapshot().enemies).toHaveLength(0)

    step(game, 2.7)

    expect(internals.bullets).toHaveLength(0)
    expect(sentinel?.hp).toBe(sentinel?.maxHp)
    expect(sentinel && { col: sentinel.col, row: sentinel.row }).not.toEqual({ col: 8, row: 13 })
  })

  it('does not report the hidden patrol sentinel as a hostile contact through echo tile sound waves', () => {
    const game = startTerrainEvidenceTestLevel(false)
    const internals = internalsOf(game)
    expect(internals.enemies.find((enemy) => enemy.id === 'terrain-evidence-patrol')).toBeDefined()
    expect(game.getSnapshot().enemies).toHaveLength(0)

    movePlayer(game, 'up')
    step(game, 1.25)

    const snapshot = game.getSnapshot()
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.portableRelay.waveCount).toBeGreaterThan(0)
    expect(snapshot.portableRelay.signalContacts.some((contact) => contact.kind === 'hostile')).toBe(false)
  })

  it('keeps the patrol sentinel alive after direct player hits', () => {
    const game = startTerrainEvidenceTestLevel(false)
    const internals = internalsOf(game)
    const sentinel = internals.enemies.find((enemy) => enemy.id === 'terrain-evidence-patrol')
    expect(sentinel).toBeDefined()
    if (!sentinel) return

    internals.bullets.push({
      id: 'sentinel-hit-test',
      owner: 'player',
      ownerId: 'player',
      side: 'player',
      team: 'blue',
      x: sentinel.x + 12,
      y: sentinel.y + 12,
      dir: 'right',
      speed: 0,
      damage: 200,
      ttl: 1,
    })
    step(game, 0.05)

    expect(internals.enemies.find((enemy) => enemy.id === 'terrain-evidence-patrol')).toBe(sentinel)
    expect(sentinel.hp).toBe(sentinel.maxHp)
    expect(game.getSnapshot().runStats.playerKills).toBe(0)
    expect(game.getSnapshot().score).toBe(0)
  })

  it('does not reveal hidden hostile tank identity or exact coordinates through tracks or terrain markers', () => {
    const game = startLevel(rowsWith([{ col: 10, row: 9, char: 'g' }], 13), { playerSpawn: { x: 1, y: 1 } })
    const internals = internalsOf(game)
    const enemy = makeTankAt('hidden-gravel-enemy', 9, 9)
    internals.enemies.push(enemy)

    expect(game.getSnapshot().enemies).toHaveLength(0)
    expect(internals.startMove(enemy, 'right')).toBe(true)
    stepUntilSettled(game, enemy)

    const snapshot = game.getSnapshot()
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.majorMods.tracks).toHaveLength(0)
    expect(snapshot.terrainEvidence.some((marker) => marker.col === 10 && marker.row === 9)).toBe(false)
    expect(snapshot.terrainEvidence).toContainEqual(expect.objectContaining({ kind: 'noise', label: 'GRAVEL' }))
  })
})
