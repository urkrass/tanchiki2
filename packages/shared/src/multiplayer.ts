export type Team = 'blue' | 'red'
export type Direction = 'up' | 'right' | 'down' | 'left'
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'trees' | 'base'
export type MatchPhase = 'lobby' | 'playing' | 'finished'
export type CommandKind = 'input' | 'ping'

export interface Vec {
  x: number
  y: number
}

export interface PlayerCommand {
  up?: boolean
  down?: boolean
  left?: boolean
  right?: boolean
  fire?: boolean
  seq?: number
}

export interface MultiplayerMove {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  elapsed: number
  duration: number
}

export interface StationaryPivotState {
  direction: Direction
  elapsed: number
}

export interface MultiplayerPlayer {
  id: string
  name: string
  team: Team
  col: number
  row: number
  dir: Direction
  hp: number
  maxHp: number
  alive: boolean
  reload: number
  moveCooldown: number
  move: MultiplayerMove | null
  pivot: StationaryPivotState | null
  respawnTimer: number
  score: number
  kills: number
  lastCommand: PlayerCommand
  lastCommandSeq: number
}

export interface MultiplayerBullet {
  id: string
  ownerId: string
  team: Team
  x: number
  y: number
  dir: Direction
  ttl: number
}

export interface Retranslator {
  id: string
  col: number
  row: number
  owner: Team | null
  captureTeam: Team | null
  progress: number
}

export interface VisionMemory {
  id: string
  team: Team
  col: number
  row: number
  seenAt: number
}

export interface ChatMessage {
  id: string
  team: Team
  playerId: string
  name: string
  text: string
  at: number
}

export interface TeamPing {
  id: string
  team: Team
  playerId: string
  col: number
  row: number
  at: number
}

export interface MultiplayerLevel {
  id: string
  name: string
  rows: string[]
  blueSpawns: Vec[]
  redSpawns: Vec[]
  retranslators: Vec[]
}

export interface MultiplayerMatchState {
  id: string
  phase: MatchPhase
  level: MultiplayerLevel
  terrain: TileKind[][]
  players: Record<string, MultiplayerPlayer>
  bullets: MultiplayerBullet[]
  retranslators: Retranslator[]
  chat: ChatMessage[]
  pings: TeamPing[]
  visionMemory: Record<Team, Record<string, VisionMemory>>
  scores: Record<Team, number>
  winner: Team | null
  nextId: number
  time: number
  timeRemaining: number
}

export interface VisibleCell {
  col: number
  row: number
}

export interface VisiblePlayer {
  id: string
  name: string
  team: Team
  col: number
  row: number
  dir: Direction
  hp: number
  alive: boolean
  self: boolean
  move: {
    fromCol: number
    fromRow: number
    toCol: number
    toRow: number
    progress: number
    duration: number
  } | null
  pivot?: {
    direction: Direction
    progress: number
    holdSeconds: number
  } | null
}

export interface VisibleBullet {
  id: string
  team: Team
  x: number
  y: number
  dir: Direction
}

export type VisionCircleKind = 'self' | 'teammate' | 'relay'

export interface VisionCircle {
  id: string
  kind: VisionCircleKind
  x: number
  y: number
  radius: number
}

export interface MultiplayerSnapshot {
  kind: 'multiplayer-snapshot'
  roomId: string
  playerId: string
  team: Team
  phase: MatchPhase
  levelName: string
  time: number
  timeRemaining: number
  scores: Record<Team, number>
  winner: Team | null
  visibleCells: VisibleCell[]
  visibleTerrain: Array<VisibleCell & { kind: TileKind }>
  players: VisiblePlayer[]
  bullets: VisibleBullet[]
  retranslators: Retranslator[]
  lastKnown: VisionMemory[]
  chat: ChatMessage[]
  pings: TeamPing[]
  teamVisionMerged: boolean
  vision: {
    circles: VisionCircle[]
  }
  fog: {
    shape: 'circular'
    visibleCellCount: number
    hiddenCellCount: number
    visibleRetranslatorCount: number
    visionCircleCount: number
    teamVisionMerged: boolean
  }
}

const GRID_COLS = 20
const GRID_ROWS = 16
export const MULTIPLAYER_TUNING = {
  moveCooldown: 0.28,
  stationaryPivotHoldSeconds: 0.16,
  reloadSeconds: 0.6,
  bulletSpeed: 6.5,
  captureSeconds: 3.6,
  respawnSeconds: 3,
} as const

const MATCH_DURATION = 8 * 60
const RESPAWN_SECONDS = MULTIPLAYER_TUNING.respawnSeconds
const MOVE_COOLDOWN = MULTIPLAYER_TUNING.moveCooldown
export const STATIONARY_PIVOT_HOLD_SECONDS = MULTIPLAYER_TUNING.stationaryPivotHoldSeconds
const RELOAD_SECONDS = MULTIPLAYER_TUNING.reloadSeconds
const BULLET_SPEED = MULTIPLAYER_TUNING.bulletSpeed
const CAPTURE_SECONDS = MULTIPLAYER_TUNING.captureSeconds
const LAST_KNOWN_SECONDS = 3
const PLAYER_VISION_RADIUS = 2.75
const RELAY_VISION_RADIUS = 4.25

const DIR_VECTORS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}
const DIRECTION_ORDER: Direction[] = ['up', 'right', 'down', 'left']

export const MULTIPLAYER_LEVEL: MultiplayerLevel = {
  id: 'relay-yard',
  name: 'Relay Yard',
  rows: [
    '....B....S....B.....',
    '.BB...B.....B...BB..',
    '.....W..BBB..W......',
    '..B..W.......W..B...',
    '..B..S..BBB..S..B...',
    '......B.....B.......',
    'BBB.....SSS.....BBB.',
    '.....B.......B......',
    '......B.......B.....',
    '.BBB.....SSS.....BBB',
    '.......B.....B......',
    '...B..S..BBB..S..B..',
    '...B..W.......W..B..',
    '......W..BBB..W.....',
    '..BB...B.....B...BB.',
    '.....B....S....B....',
  ],
  blueSpawns: [
    { x: 5, y: 14 },
    { x: 7, y: 14 },
    { x: 9, y: 14 },
    { x: 11, y: 14 },
  ],
  redSpawns: [
    { x: 5, y: 1 },
    { x: 7, y: 1 },
    { x: 9, y: 1 },
    { x: 11, y: 1 },
  ],
  retranslators: [
    { x: 4, y: 7 },
    { x: 10, y: 7 },
    { x: 15, y: 8 },
    { x: 10, y: 3 },
    { x: 10, y: 12 },
  ],
}

export function createMatchState(id = 'quick'): MultiplayerMatchState {
  assertLevel(MULTIPLAYER_LEVEL)

  return {
    id,
    phase: 'lobby',
    level: MULTIPLAYER_LEVEL,
    terrain: MULTIPLAYER_LEVEL.rows.map((row) => [...row].map(tileFromChar)),
    players: {},
    bullets: [],
    retranslators: MULTIPLAYER_LEVEL.retranslators.map((point, index) => ({
      id: `relay-${index + 1}`,
      col: point.x,
      row: point.y,
      owner: null,
      captureTeam: null,
      progress: 0,
    })),
    chat: [],
    pings: [],
    visionMemory: { blue: {}, red: {} },
    scores: { blue: 0, red: 0 },
    winner: null,
    nextId: 1,
    time: 0,
    timeRemaining: MATCH_DURATION,
  }
}

export function addPlayer(state: MultiplayerMatchState, id: string, name: string, preferredTeam?: Team) {
  const team = preferredTeam ?? pickTeam(state)
  const spawn = pickSpawn(state, team, id)
  const player: MultiplayerPlayer = {
    id,
    name: sanitizeName(name),
    team,
    col: spawn.x,
    row: spawn.y,
    dir: team === 'blue' ? 'up' : 'down',
    hp: 3,
    maxHp: 3,
    alive: true,
    reload: 0,
    moveCooldown: 0,
    move: null,
    pivot: null,
    respawnTimer: 0,
    score: 0,
    kills: 0,
    lastCommand: {},
    lastCommandSeq: 0,
  }
  state.players[id] = player
  state.phase = 'playing'
  refreshVisionMemory(state)
  return player
}

export function removePlayer(state: MultiplayerMatchState, id: string) {
  delete state.players[id]
  state.bullets = state.bullets.filter((bullet) => bullet.ownerId !== id)
}

export function setPlayerCommand(state: MultiplayerMatchState, playerId: string, command: PlayerCommand) {
  const player = state.players[playerId]
  if (!player) return false
  const incomingSeq = normalizeCommandSeq(command.seq)
  if (incomingSeq === null && player.lastCommandSeq > 0) {
    return true
  }
  if (incomingSeq !== null && incomingSeq <= player.lastCommandSeq) {
    return true
  }

  const previousDirection = directionFromCommand(player.lastCommand)
  player.lastCommand = {
    up: command.up === true,
    down: command.down === true,
    left: command.left === true,
    right: command.right === true,
    fire: command.fire === true,
    seq: command.seq,
  }
  if (incomingSeq !== null) {
    player.lastCommandSeq = incomingSeq
  }
  const nextDirection = directionFromCommand(player.lastCommand)
  if (!nextDirection) {
    player.pivot = null
  } else if (
    player.alive
    && !player.move
    && nextDirection !== previousDirection
    && nextDirection !== player.dir
  ) {
    player.dir = nextDirection
    player.pivot = { direction: nextDirection, elapsed: 0 }
  }
  return true
}

export function addChatMessage(state: MultiplayerMatchState, playerId: string, text: string) {
  const player = state.players[playerId]
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 120)
  if (!player || !cleaned) return null
  const message: ChatMessage = {
    id: `chat-${state.nextId++}`,
    team: player.team,
    playerId,
    name: player.name,
    text: cleaned,
    at: state.time,
  }
  state.chat.push(message)
  state.chat = state.chat.slice(-40)
  return message
}

export function addTeamPing(state: MultiplayerMatchState, playerId: string, col: number, row: number) {
  const player = state.players[playerId]
  if (!player || !isInBounds(col, row)) return null
  const ping: TeamPing = {
    id: `ping-${state.nextId++}`,
    team: player.team,
    playerId,
    col,
    row,
    at: state.time,
  }
  state.pings.push(ping)
  state.pings = state.pings.filter((candidate) => state.time - candidate.at <= 8)
  return ping
}

export function updateMatch(state: MultiplayerMatchState, dt: number) {
  if (state.phase !== 'playing') return
  const safeDt = Math.max(0, Math.min(0.1, dt))
  state.time += safeDt
  state.timeRemaining = Math.max(0, state.timeRemaining - safeDt)

  for (const player of Object.values(state.players)) {
    updatePlayer(state, player, safeDt)
  }

  updateBullets(state, safeDt)
  updateRetranslators(state, safeDt)
  refreshVisionMemory(state)
  state.pings = state.pings.filter((ping) => state.time - ping.at <= 8)

  if (state.timeRemaining <= 0) {
    finishByScore(state)
  }
}

export function createSnapshotForPlayer(state: MultiplayerMatchState, playerId: string): MultiplayerSnapshot | null {
  const player = state.players[playerId]
  if (!player) return null
  const vision = computeVisionModel(state, playerId)
  const visible = vision.visibleCells
  const visibleCells = visibleCellsFromSet(visible)
  const now = state.time
  const visiblePlayers = Object.values(state.players)
    .filter((candidate) => {
      const point = playerVisionPoint(candidate)
      return candidate.id === playerId || isPointVisible(vision.circles, point.x, point.y)
    })
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      team: candidate.team,
      col: candidate.col,
      row: candidate.row,
      dir: candidate.dir,
      hp: candidate.hp,
      alive: candidate.alive,
      self: candidate.id === playerId,
      move: visibleMove(candidate),
      pivot: visiblePivot(candidate),
    }))
  const visiblePlayerIds = new Set(visiblePlayers.map((candidate) => candidate.id))

  return {
    kind: 'multiplayer-snapshot',
    roomId: state.id,
    playerId,
    team: player.team,
    phase: state.phase,
    levelName: state.level.name,
    time: Number(state.time.toFixed(2)),
    timeRemaining: Number(state.timeRemaining.toFixed(2)),
    scores: { ...state.scores },
    winner: state.winner,
    visibleCells,
    visibleTerrain: visibleCells.map((cell) => ({ ...cell, kind: state.terrain[cell.row]?.[cell.col] ?? 'steel' })),
    players: visiblePlayers,
    bullets: state.bullets
      .filter((bullet) => isPointVisible(vision.circles, bullet.x, bullet.y))
      .map((bullet) => ({ id: bullet.id, team: bullet.team, x: Number(bullet.x.toFixed(2)), y: Number(bullet.y.toFixed(2)), dir: bullet.dir })),
    retranslators: state.retranslators
      .filter((relay) => isPointVisible(vision.circles, relay.col + 0.5, relay.row + 0.5))
      .map((relay) => ({ ...relay, progress: Number(relay.progress.toFixed(2)) })),
    lastKnown: Object.values(state.visionMemory[player.team]).filter(
      (memory) => now - memory.seenAt <= LAST_KNOWN_SECONDS && !visiblePlayerIds.has(memory.id),
    ),
    chat: state.chat.filter((message) => message.team === player.team).slice(-8),
    pings: state.pings.filter((ping) => ping.team === player.team && isPointVisible(vision.circles, ping.col + 0.5, ping.row + 0.5)),
    teamVisionMerged: hasTeamRelay(state, player.team),
    vision: {
      circles: vision.circles.map((circle) => ({
        ...circle,
        x: Number(circle.x.toFixed(2)),
        y: Number(circle.y.toFixed(2)),
        radius: Number(circle.radius.toFixed(2)),
      })),
    },
    fog: {
      shape: 'circular',
      visibleCellCount: visible.size,
      hiddenCellCount: GRID_COLS * GRID_ROWS - visible.size,
      visibleRetranslatorCount: state.retranslators.filter((relay) =>
        isPointVisible(vision.circles, relay.col + 0.5, relay.row + 0.5),
      ).length,
      visionCircleCount: vision.circles.length,
      teamVisionMerged: hasTeamRelay(state, player.team),
    },
  }
}

export function computeVisibleSet(state: MultiplayerMatchState, playerId: string) {
  return computeVisionModel(state, playerId).visibleCells
}

export function computeVisionCircles(state: MultiplayerMatchState, playerId: string) {
  return computeVisionModel(state, playerId).circles
}

function computeVisionModel(state: MultiplayerMatchState, playerId: string) {
  const player = state.players[playerId]
  const circles: VisionCircle[] = []
  const visibleCells = new Set<string>()
  if (!player) return { circles, visibleCells }

  if (!hasTeamRelay(state, player.team)) {
    addPersonalVision(circles, player, 'self')
    addCircleCells(visibleCells, circles)
    return { circles, visibleCells }
  }

  for (const teammate of Object.values(state.players)) {
    if (teammate.team === player.team && teammate.alive) {
      addPersonalVision(circles, teammate, teammate.id === playerId ? 'self' : 'teammate')
    }
  }

  for (const relay of state.retranslators) {
    if (relay.owner === player.team) {
      circles.push({
        id: relay.id,
        kind: 'relay',
        x: relay.col + 0.5,
        y: relay.row + 0.5,
        radius: RELAY_VISION_RADIUS,
      })
    }
  }

  const uniqueCircles = dedupeVisionCircles(circles)
  addCircleCells(visibleCells, uniqueCircles)
  return { circles: uniqueCircles, visibleCells }
}

export function hasTeamRelay(state: MultiplayerMatchState, team: Team) {
  return state.retranslators.some((relay) => relay.owner === team)
}

function updatePlayer(state: MultiplayerMatchState, player: MultiplayerPlayer, dt: number) {
  player.reload = Math.max(0, player.reload - dt)
  player.moveCooldown = Math.max(0, player.moveCooldown - dt)
  updatePlayerMove(player, dt)

  if (!player.alive) {
    player.move = null
    player.pivot = null
    player.respawnTimer = Math.max(0, player.respawnTimer - dt)
    if (player.respawnTimer <= 0) {
      const spawn = pickSpawn(state, player.team, player.id)
      player.col = spawn.x
      player.row = spawn.y
      player.dir = player.team === 'blue' ? 'up' : 'down'
      player.hp = player.maxHp
      player.alive = true
      player.pivot = null
    }
    return
  }

  const direction = directionFromCommand(player.lastCommand)
  if (!direction) {
    player.pivot = null
  } else if (!player.move) {
    if (direction !== player.dir) {
      player.dir = direction
      player.pivot = { direction, elapsed: dt }
    } else if (player.pivot?.direction === direction) {
      player.pivot.elapsed = Math.min(
        STATIONARY_PIVOT_HOLD_SECONDS,
        player.pivot.elapsed + dt,
      )
      if (
        player.pivot.elapsed >= STATIONARY_PIVOT_HOLD_SECONDS
        && player.moveCooldown <= 0
      ) {
        player.pivot = null
        movePlayer(state, player, direction)
      }
    } else if (player.moveCooldown <= 0) {
      movePlayer(state, player, direction)
    }
  }

  if (player.lastCommand.fire && player.reload <= 0) {
    spawnBullet(state, player)
  }
}

function movePlayer(state: MultiplayerMatchState, player: MultiplayerPlayer, direction: Direction) {
  const vector = DIR_VECTORS[direction]
  const targetCol = player.col + vector.x
  const targetRow = player.row + vector.y
  if (!canTankOccupy(state, targetCol, targetRow, player.id)) return
  player.move = {
    fromCol: player.col,
    fromRow: player.row,
    toCol: targetCol,
    toRow: targetRow,
    elapsed: 0,
    duration: MOVE_COOLDOWN,
  }
  player.col = targetCol
  player.row = targetRow
  player.moveCooldown = MOVE_COOLDOWN
}

function updatePlayerMove(player: MultiplayerPlayer, dt: number) {
  if (!player.move) {
    return
  }

  player.move.elapsed = Math.min(player.move.duration, player.move.elapsed + dt)

  if (player.move.elapsed >= player.move.duration) {
    player.move = null
  }
}

function visibleMove(player: MultiplayerPlayer): VisiblePlayer['move'] {
  if (!player.move) {
    return null
  }

  return {
    fromCol: player.move.fromCol,
    fromRow: player.move.fromRow,
    toCol: player.move.toCol,
    toRow: player.move.toRow,
    progress: Number(clampNumber(player.move.elapsed / player.move.duration, 0, 1).toFixed(3)),
    duration: Number(player.move.duration.toFixed(3)),
  }
}

function visiblePivot(player: MultiplayerPlayer): VisiblePlayer['pivot'] {
  if (!player.pivot) {
    return null
  }

  return {
    direction: player.pivot.direction,
    progress: Number(clampNumber(
      player.pivot.elapsed / STATIONARY_PIVOT_HOLD_SECONDS,
      0,
      1,
    ).toFixed(3)),
    holdSeconds: STATIONARY_PIVOT_HOLD_SECONDS,
  }
}

function spawnBullet(state: MultiplayerMatchState, player: MultiplayerPlayer) {
  const vector = DIR_VECTORS[player.dir]
  state.bullets.push({
    id: `bullet-${state.nextId++}`,
    ownerId: player.id,
    team: player.team,
    x: player.col + 0.5 + vector.x * 0.45,
    y: player.row + 0.5 + vector.y * 0.45,
    dir: player.dir,
    ttl: 1.6,
  })
  player.reload = RELOAD_SECONDS
}

function updateBullets(state: MultiplayerMatchState, dt: number) {
  const kept: MultiplayerBullet[] = []

  for (const bullet of state.bullets) {
    const vector = DIR_VECTORS[bullet.dir]
    bullet.x += vector.x * BULLET_SPEED * dt
    bullet.y += vector.y * BULLET_SPEED * dt
    bullet.ttl -= dt
    const col = Math.floor(bullet.x)
    const row = Math.floor(bullet.y)

    if (bullet.ttl <= 0 || !isInBounds(col, row)) continue

    const tile = state.terrain[row]?.[col] ?? 'steel'
    if (tile === 'steel' || tile === 'water') continue
    if (tile === 'brick') {
      state.terrain[row][col] = 'empty'
      continue
    }

    const hit = Object.values(state.players).find(
      (player) => player.alive && player.team !== bullet.team && player.col === col && player.row === row,
    )
    if (hit) {
      hit.hp -= 1
      if (hit.hp <= 0) {
        killPlayer(state, bullet.ownerId, hit)
      }
      continue
    }

    kept.push(bullet)
  }

  state.bullets = kept
}

function killPlayer(state: MultiplayerMatchState, killerId: string, victim: MultiplayerPlayer) {
  victim.alive = false
  victim.respawnTimer = RESPAWN_SECONDS
  victim.lastCommand = {}
  victim.move = null
  victim.pivot = null
  victim.hp = 0
  const killer = state.players[killerId]
  if (killer) {
    killer.kills += 1
    killer.score += 1
    state.scores[killer.team] += 1
    if (state.scores[killer.team] >= 15) {
      state.phase = 'finished'
      state.winner = killer.team
    }
  }
}

function updateRetranslators(state: MultiplayerMatchState, dt: number) {
  for (const relay of state.retranslators) {
    const adjacent = { blue: 0, red: 0 }
    for (const player of Object.values(state.players)) {
      if (player.alive && manhattan(player.col, player.row, relay.col, relay.row) <= 1) {
        adjacent[player.team] += 1
      }
    }

    const capturingTeam = adjacent.blue > 0 && adjacent.red === 0 ? 'blue' : adjacent.red > 0 && adjacent.blue === 0 ? 'red' : null
    if (!capturingTeam) continue

    if (relay.captureTeam !== capturingTeam) {
      relay.captureTeam = capturingTeam
      relay.progress = relay.owner === capturingTeam ? 1 : 0
    }

    relay.progress = Math.min(1, relay.progress + dt / CAPTURE_SECONDS)
    if (relay.progress >= 1) {
      relay.owner = capturingTeam
      relay.captureTeam = capturingTeam
    }
  }
}

function refreshVisionMemory(state: MultiplayerMatchState) {
  for (const team of ['blue', 'red'] as Team[]) {
    const teammates = Object.values(state.players).filter((player) => player.team === team && player.alive)
    if (teammates.length === 0) continue

    for (const teammate of teammates) {
      const circles = computeVisionCircles(state, teammate.id)
      for (const player of Object.values(state.players)) {
        const point = playerVisionPoint(player)
        if (player.team !== team && player.alive && isPointVisible(circles, point.x, point.y)) {
          state.visionMemory[team][player.id] = {
            id: player.id,
            team: player.team,
            col: player.col,
            row: player.row,
            seenAt: state.time,
          }
        }
      }
    }
  }
}

function normalizeCommandSeq(seq: number | undefined) {
  return Number.isFinite(seq) ? Math.max(0, Math.floor(seq as number)) : null
}

function addPersonalVision(circles: VisionCircle[], player: MultiplayerPlayer, kind: VisionCircleKind) {
  if (!player.alive) return
  const point = playerVisionPoint(player)
  circles.push({
    id: player.id,
    kind,
    x: point.x,
    y: point.y,
    radius: PLAYER_VISION_RADIUS,
  })
}

function playerVisionPoint(player: MultiplayerPlayer) {
  if (!player.move) {
    return { x: player.col + 0.5, y: player.row + 0.5 }
  }

  const progress = clampNumber(player.move.elapsed / player.move.duration, 0, 1)

  return {
    x: player.move.fromCol + 0.5 + (player.move.toCol - player.move.fromCol) * progress,
    y: player.move.fromRow + 0.5 + (player.move.toRow - player.move.fromRow) * progress,
  }
}

function addCircleCells(visible: Set<string>, circles: VisionCircle[]) {
  for (const circle of circles) {
    const startCol = Math.max(0, Math.floor(circle.x - circle.radius))
    const endCol = Math.min(GRID_COLS - 1, Math.floor(circle.x + circle.radius))
    const startRow = Math.max(0, Math.floor(circle.y - circle.radius))
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(circle.y + circle.radius))

    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        if (tileIntersectsCircle(col, row, circle)) {
          addCell(visible, col, row)
        }
      }
    }
  }
}

function tileIntersectsCircle(col: number, row: number, circle: VisionCircle) {
  const nearestX = clampNumber(circle.x, col, col + 1)
  const nearestY = clampNumber(circle.y, row, row + 1)
  return distanceSquared(nearestX, nearestY, circle.x, circle.y) <= circle.radius * circle.radius
}

function isPointVisible(circles: VisionCircle[], x: number, y: number) {
  return circles.some((circle) => distanceSquared(x, y, circle.x, circle.y) <= circle.radius * circle.radius)
}

function dedupeVisionCircles(circles: VisionCircle[]) {
  const seen = new Set<string>()
  return circles.filter((circle) => {
    const circleKey = `${circle.kind}:${circle.id}`
    if (seen.has(circleKey)) return false
    seen.add(circleKey)
    return true
  })
}

function visibleCellsFromSet(visible: Set<string>) {
  return [...visible].map(cellFromKey).sort((a, b) => a.row - b.row || a.col - b.col)
}

function distanceSquared(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function addCell(visible: Set<string>, col: number, row: number) {
  if (isInBounds(col, row)) visible.add(key(col, row))
}

function directionFromCommand(command: PlayerCommand): Direction | null {
  if (command.up) return 'up'
  if (command.down) return 'down'
  if (command.left) return 'left'
  if (command.right) return 'right'
  return null
}

function canTankOccupy(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  if (!isInBounds(col, row)) return false
  const tile = state.terrain[row]?.[col] ?? 'steel'
  if (tile !== 'empty' && tile !== 'trees') return false
  return !Object.values(state.players).some((player) => player.id !== playerId && player.alive && player.col === col && player.row === row)
}

function canTankSpawnAt(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  return canTankOccupy(state, col, row, playerId) && hasTankSpawnExit(state, col, row, playerId)
}

function hasTankSpawnExit(state: MultiplayerMatchState, col: number, row: number, playerId: string) {
  return DIRECTION_ORDER.some((direction) => {
    const vector = DIR_VECTORS[direction]
    return canTankOccupy(state, col + vector.x, row + vector.y, playerId)
  })
}

function pickTeam(state: MultiplayerMatchState): Team {
  const players = Object.values(state.players)
  const blue = players.filter((player) => player.team === 'blue').length
  const red = players.length - blue
  return blue <= red ? 'blue' : 'red'
}

function pickSpawn(state: MultiplayerMatchState, team: Team, playerId = '') {
  const spawns = team === 'blue' ? state.level.blueSpawns : state.level.redSpawns
  const spawn = resolveMultiplayerSpawn(state, spawns, playerId) ?? findFirstMultiplayerSpawn(state, playerId)

  if (!spawn) {
    throw new Error('No safe multiplayer spawn available')
  }

  return spawn
}

function resolveMultiplayerSpawn(state: MultiplayerMatchState, preferredSpawns: Vec[], playerId: string) {
  const queue: Vec[] = []
  const visited = new Set<string>()

  for (const spawn of preferredSpawns.length > 0 ? preferredSpawns : [{ x: 1, y: 1 }]) {
    const start = {
      x: clampInt(spawn.x, 0, GRID_COLS - 1),
      y: clampInt(spawn.y, 0, GRID_ROWS - 1),
    }
    const startKey = key(start.x, start.y)

    if (!visited.has(startKey)) {
      visited.add(startKey)
      queue.push(start)
    }
  }

  while (queue.length > 0) {
    const cell = queue.shift()
    if (!cell) break

    if (canTankSpawnAt(state, cell.x, cell.y, playerId)) {
      return cell
    }

    for (const direction of DIRECTION_ORDER) {
      const vector = DIR_VECTORS[direction]
      const next = { x: cell.x + vector.x, y: cell.y + vector.y }
      const nextKey = key(next.x, next.y)

      if (!isInBounds(next.x, next.y) || visited.has(nextKey)) {
        continue
      }

      visited.add(nextKey)
      queue.push(next)
    }
  }

  return null
}

function findFirstMultiplayerSpawn(state: MultiplayerMatchState, playerId: string) {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (canTankSpawnAt(state, col, row, playerId)) {
        return { x: col, y: row }
      }
    }
  }

  return null
}

function finishByScore(state: MultiplayerMatchState) {
  state.phase = 'finished'
  state.winner = state.scores.blue === state.scores.red ? null : state.scores.blue > state.scores.red ? 'blue' : 'red'
}

function tileFromChar(char: string): TileKind {
  if (char === 'B') return 'brick'
  if (char === 'S') return 'steel'
  if (char === 'W') return 'water'
  if (char === 'T') return 'trees'
  return 'empty'
}

function sanitizeName(name: string) {
  return name.replace(/[^\w -]/g, '').trim().slice(0, 18) || 'Rookie'
}

function isInBounds(col: number, row: number) {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function key(col: number, row: number) {
  return `${col},${row}`
}

function cellFromKey(value: string) {
  const [col = 0, row = 0] = value.split(',').map(Number)
  return { col, row }
}

function manhattan(aCol: number, aRow: number, bCol: number, bRow: number) {
  return Math.abs(aCol - bCol) + Math.abs(aRow - bRow)
}

function assertLevel(level: MultiplayerLevel) {
  if (level.rows.length !== GRID_ROWS || level.rows.some((row) => row.length !== GRID_COLS)) {
    throw new Error(`Multiplayer level must be ${GRID_COLS}x${GRID_ROWS}`)
  }
  if (level.retranslators.length < 3) {
    throw new Error('Multiplayer level must include at least three retranslators')
  }
}
