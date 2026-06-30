import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  BULLET_SIZE,
  DIR_VECTORS,
  DIRECTION_ORDER,
  GRID_COLS,
  GRID_ROWS,
  TANK_SIZE,
  TILE_SIZE,
  clamp,
  rectsIntersect,
  tankCenter,
  tankRect,
} from './constants.ts'
import {
  DEFAULT_ENEMY_SPAWNS,
  DEFAULT_LEVEL_ROWS,
  DEFAULT_PLAYER_SPAWN,
  createTiles,
} from './level.ts'
import type {
  Bullet,
  Direction,
  GameMode,
  GameOptions,
  GameSnapshot,
  InputState,
  Particle,
  PowerUp,
  PowerUpKind,
  Rect,
  RenderState,
  Tank,
  Tile,
  TileKind,
  Vec,
} from './types.ts'

const EMPTY_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
}

export class TanchikiGame {
  private readonly aiEnabled: boolean
  private readonly enemySpawns: Vec[]
  private readonly enemyTotal: number
  private readonly levelRows: string[]
  private readonly playerSpawn: Vec
  private bullets: Bullet[] = []
  private enemies: Tank[] = []
  private enemiesRemaining = 18
  private input: InputState = { ...EMPTY_INPUT }
  private mode: GameMode = 'menu'
  private nextId = 1
  private particles: Particle[] = []
  private player: Tank
  private powerUps: PowerUp[] = []
  private rngState: number
  private score = 0
  private spawnCursor = 0
  private spawnTimer = 0
  private tiles: Tile[][]
  private time = 0
  private lives = 3
  private baseHp = 1

  constructor(options: GameOptions = {}) {
    this.aiEnabled = options.aiEnabled ?? true
    this.enemySpawns = options.enemySpawns ?? DEFAULT_ENEMY_SPAWNS
    this.enemyTotal = options.enemyTotal ?? 18
    this.levelRows = options.levelRows ?? DEFAULT_LEVEL_ROWS
    this.playerSpawn = options.playerSpawn ?? DEFAULT_PLAYER_SPAWN
    this.rngState = options.seed ?? 112358
    this.tiles = createTiles(this.levelRows)
    this.player = this.createPlayer()
  }

  startGame() {
    this.tiles = createTiles(this.levelRows)
    this.bullets = []
    this.enemies = []
    this.particles = []
    this.powerUps = []
    this.input = { ...EMPTY_INPUT }
    this.mode = 'playing'
    this.nextId = 1
    this.score = 0
    this.time = 0
    this.lives = 3
    this.baseHp = 1
    this.enemiesRemaining = this.enemyTotal
    this.spawnCursor = 0
    this.spawnTimer = 0
    this.player = this.createPlayer()
    this.spawnEnemy()
  }

  primaryAction() {
    if (this.mode === 'menu' || this.mode === 'won' || this.mode === 'lost') {
      this.startGame()
      return
    }

    if (this.mode === 'paused') {
      this.mode = 'playing'
      return
    }

    this.fire(this.player)
  }

  restart() {
    this.startGame()
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused'
      return
    }

    if (this.mode === 'paused') {
      this.mode = 'playing'
    }
  }

  setButton(button: keyof InputState, down: boolean) {
    this.input[button] = down
  }

  setInput(input: Partial<InputState>) {
    this.input = { ...this.input, ...input }
  }

  getMode() {
    return this.mode
  }

  getTile(col: number, row: number) {
    return this.tiles[row]?.[col]
  }

  getRenderState(): RenderState {
    return {
      mode: this.mode,
      time: this.time,
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      tiles: this.tiles,
      player: this.player,
      enemies: this.enemies,
      bullets: this.bullets,
      particles: this.particles,
      powerUps: this.powerUps,
    }
  }

  getSnapshot(): GameSnapshot {
    const terrain = this.tiles.flat().reduce(
      (counts, tile) => {
        if (tile.kind === 'brick' || tile.kind === 'steel' || tile.kind === 'water' || tile.kind === 'base') {
          counts[tile.kind] += 1
        }
        return counts
      },
      { brick: 0, steel: 0, water: 0, base: 0 },
    )

    return {
      coordinateSystem: 'origin top-left, x right, y down, units canvas pixels',
      mode: this.mode,
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        dir: this.player.dir,
        hp: this.player.hp,
        shield: Number(this.player.shield.toFixed(2)),
        rapid: Number(this.player.rapid.toFixed(2)),
      },
      enemies: this.enemies.map((enemy) => ({
        id: enemy.id,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        dir: enemy.dir,
        hp: enemy.hp,
      })),
      bullets: this.bullets.map((bullet) => ({
        owner: bullet.owner,
        x: Math.round(bullet.x),
        y: Math.round(bullet.y),
        dir: bullet.dir,
      })),
      powerUps: this.powerUps.map((powerUp) => ({
        kind: powerUp.kind,
        x: Math.round(powerUp.x),
        y: Math.round(powerUp.y),
      })),
      terrain,
    }
  }

  renderText() {
    return JSON.stringify(this.getSnapshot())
  }

  update(dt: number) {
    const safeDt = clamp(dt, 0, 0.05)
    this.time += safeDt
    this.updateParticles(safeDt)

    if (this.mode !== 'playing') {
      return
    }

    this.updatePlayer(safeDt)
    this.updateEnemies(safeDt)
    this.updateBullets(safeDt)
    this.updatePowerUps(safeDt)
    this.updateSpawning(safeDt)
    this.checkWinState()
  }

  private createPlayer(): Tank {
    return {
      id: 'player',
      faction: 'player',
      x: this.playerSpawn.x,
      y: this.playerSpawn.y,
      dir: 'up',
      hp: 3,
      maxHp: 3,
      speed: 94,
      reload: 0,
      reloadTime: 0.32,
      aiCooldown: 0,
      turnCooldown: 0,
      spawnGrace: 1.6,
      scoreValue: 0,
      shield: 1.6,
      rapid: 0,
    }
  }

  private createEnemy(spawn: Vec): Tank {
    const armored = this.enemiesRemaining <= Math.ceil(this.enemyTotal / 3)
    return {
      id: `enemy-${this.nextId}`,
      faction: 'enemy',
      x: spawn.x,
      y: spawn.y,
      dir: 'down',
      hp: armored ? 2 : 1,
      maxHp: armored ? 2 : 1,
      speed: armored ? 54 : 66,
      reload: 0.7 + this.random() * 0.6,
      reloadTime: armored ? 1.05 : 1.2,
      aiCooldown: 0.1,
      turnCooldown: 0.2,
      spawnGrace: 0.8,
      scoreValue: armored ? 250 : 100,
      shield: 0,
      rapid: 0,
    }
  }

  private updatePlayer(dt: number) {
    this.player.reload = Math.max(0, this.player.reload - dt)
    this.player.spawnGrace = Math.max(0, this.player.spawnGrace - dt)
    this.player.shield = Math.max(0, this.player.shield - dt)
    this.player.rapid = Math.max(0, this.player.rapid - dt)
    this.player.reloadTime = this.player.rapid > 0 ? 0.18 : 0.32

    const direction = this.directionFromInput()

    if (direction) {
      this.player.dir = direction
      const vector = DIR_VECTORS[direction]
      this.moveTank(this.player, vector.x * this.player.speed * dt, vector.y * this.player.speed * dt)
    }

    if (this.input.fire) {
      this.fire(this.player)
    }
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      enemy.reload = Math.max(0, enemy.reload - dt)
      enemy.spawnGrace = Math.max(0, enemy.spawnGrace - dt)
      enemy.aiCooldown -= dt
      enemy.turnCooldown -= dt

      if (this.aiEnabled) {
        if (enemy.turnCooldown <= 0) {
          enemy.dir = this.chooseEnemyDirection(enemy)
          enemy.turnCooldown = 0.45 + this.random() * 0.75
        }

        const vector = DIR_VECTORS[enemy.dir]
        const moved = this.moveTank(enemy, vector.x * enemy.speed * dt, vector.y * enemy.speed * dt)

        if (!moved) {
          enemy.turnCooldown = 0
        }

        if (enemy.aiCooldown <= 0 && (this.hasLineOfFire(enemy, this.player) || this.random() > 0.72)) {
          this.fire(enemy)
          enemy.aiCooldown = 0.35 + this.random() * 0.65
        }
      }
    }
  }

  private updateBullets(dt: number) {
    const nextBullets: Bullet[] = []

    for (const bullet of this.bullets) {
      const vector = DIR_VECTORS[bullet.dir]
      bullet.x += vector.x * bullet.speed * dt
      bullet.y += vector.y * bullet.speed * dt
      bullet.ttl -= dt

      if (bullet.ttl <= 0 || this.isOutsideArena(bullet.x, bullet.y)) {
        continue
      }

      if (this.hitTileWithBullet(bullet)) {
        continue
      }

      if (this.hitTankWithBullet(bullet)) {
        continue
      }

      nextBullets.push(bullet)
    }

    this.bullets = nextBullets
  }

  private updatePowerUps(dt: number) {
    const playerRect = tankRect(this.player)
    this.powerUps = this.powerUps.filter((powerUp) => {
      powerUp.ttl -= dt

      if (powerUp.ttl <= 0) {
        return false
      }

      const powerUpRect = {
        x: powerUp.x,
        y: powerUp.y,
        w: 20,
        h: 20,
      }

      if (rectsIntersect(playerRect, powerUpRect)) {
        this.applyPowerUp(powerUp.kind)
        this.burst(powerUp.x + 10, powerUp.y + 10, '#ffe17a', 8)
        return false
      }

      return true
    })
  }

  private updateSpawning(dt: number) {
    if (this.enemiesRemaining <= 0 || this.enemies.length >= 4) {
      return
    }

    this.spawnTimer -= dt

    if (this.spawnTimer <= 0) {
      this.spawnEnemy()
      this.spawnTimer = 2.2
    }
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      return particle.life > 0
    })
  }

  private directionFromInput(): Direction | null {
    if (this.input.up) {
      return 'up'
    }
    if (this.input.down) {
      return 'down'
    }
    if (this.input.left) {
      return 'left'
    }
    if (this.input.right) {
      return 'right'
    }
    return null
  }

  private fire(tank: Tank) {
    if (tank.reload > 0) {
      return
    }

    const center = tankCenter(tank)
    const vector = DIR_VECTORS[tank.dir]
    const bullet: Bullet = {
      id: `bullet-${this.nextId}`,
      owner: tank.faction,
      x: center.x + vector.x * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      y: center.y + vector.y * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      dir: tank.dir,
      speed: tank.faction === 'player' ? 245 : 205,
      damage: 1,
      ttl: 2.4,
    }

    this.nextId += 1
    tank.reload = tank.reloadTime
    this.bullets.push(bullet)
  }

  private moveTank(tank: Tank, dx: number, dy: number) {
    const oldX = tank.x
    const oldY = tank.y

    tank.x = clamp(tank.x + dx, ARENA_X, ARENA_X + ARENA_WIDTH - TANK_SIZE)
    if (this.tankCollides(tank)) {
      tank.x = oldX
    }

    tank.y = clamp(tank.y + dy, ARENA_Y, ARENA_Y + ARENA_HEIGHT - TANK_SIZE)
    if (this.tankCollides(tank)) {
      tank.y = oldY
    }

    return Math.abs(tank.x - oldX) > 0.1 || Math.abs(tank.y - oldY) > 0.1
  }

  private tankCollides(tank: Tank) {
    const rect = tankRect(tank)

    if (this.rectHitsSolidTile(rect)) {
      return true
    }

    const tanks = tank.faction === 'player' ? this.enemies : [this.player, ...this.enemies]
    return tanks.some((other) => other.id !== tank.id && rectsIntersect(rect, tankRect(other)))
  }

  private rectHitsSolidTile(rect: Rect) {
    const minCol = Math.floor((rect.x - ARENA_X) / TILE_SIZE)
    const maxCol = Math.floor((rect.x + rect.w - 1 - ARENA_X) / TILE_SIZE)
    const minRow = Math.floor((rect.y - ARENA_Y) / TILE_SIZE)
    const maxRow = Math.floor((rect.y + rect.h - 1 - ARENA_Y) / TILE_SIZE)

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (this.isSolidForTank(this.tileKindAt(col, row))) {
          return true
        }
      }
    }

    return false
  }

  private hitTileWithBullet(bullet: Bullet) {
    const centerX = bullet.x + BULLET_SIZE / 2
    const centerY = bullet.y + BULLET_SIZE / 2
    const col = Math.floor((centerX - ARENA_X) / TILE_SIZE)
    const row = Math.floor((centerY - ARENA_Y) / TILE_SIZE)
    const tile = this.tiles[row]?.[col]

    if (!tile || !this.isSolidForBullet(tile.kind)) {
      return false
    }

    if (tile.kind === 'brick') {
      tile.hp -= bullet.damage

      if (tile.hp <= 0) {
        tile.kind = 'empty'
        this.burst(col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + row * TILE_SIZE + TILE_SIZE / 2, '#e4572e', 10)
      } else {
        this.burst(centerX, centerY, '#ffb347', 5)
      }
    }

    if (tile.kind === 'base') {
      this.baseHp = 0
      tile.hp = 0
      this.mode = 'lost'
      this.burst(centerX, centerY, '#ffd35a', 20)
    }

    if (tile.kind === 'steel') {
      this.burst(centerX, centerY, '#cfd3d8', 5)
    }

    return true
  }

  private hitTankWithBullet(bullet: Bullet) {
    const bulletRect = {
      x: bullet.x,
      y: bullet.y,
      w: BULLET_SIZE,
      h: BULLET_SIZE,
    }

    if (bullet.owner === 'player') {
      const enemy = this.enemies.find((candidate) => rectsIntersect(bulletRect, tankRect(candidate)))

      if (!enemy) {
        return false
      }

      enemy.hp -= bullet.damage
      this.burst(bullet.x, bullet.y, '#cce9ff', 8)

      if (enemy.hp <= 0) {
        this.destroyEnemy(enemy)
      }

      return true
    }

    if (rectsIntersect(bulletRect, tankRect(this.player))) {
      this.damagePlayer(bullet.damage)
      this.burst(bullet.x, bullet.y, '#ffd35a', 8)
      return true
    }

    return false
  }

  private damagePlayer(damage: number) {
    if (this.player.shield > 0 || this.player.spawnGrace > 0) {
      return
    }

    this.player.hp -= damage

    if (this.player.hp > 0) {
      this.player.shield = 0.5
      return
    }

    this.lives -= 1

    if (this.lives <= 0) {
      this.mode = 'lost'
      return
    }

    this.player = this.createPlayer()
  }

  private destroyEnemy(enemy: Tank) {
    this.score += enemy.scoreValue
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id)
    this.burst(enemy.x + TANK_SIZE / 2, enemy.y + TANK_SIZE / 2, '#a7dcff', 18)

    if (this.random() > 0.78) {
      this.spawnPowerUp(enemy)
    }
  }

  private spawnEnemy() {
    if (this.enemiesRemaining <= 0) {
      return
    }

    for (let attempts = 0; attempts < this.enemySpawns.length; attempts += 1) {
      const spawn = this.enemySpawns[this.spawnCursor % this.enemySpawns.length]
      this.spawnCursor += 1
      const candidate = this.createEnemy(spawn)

      if (!this.tankCollides(candidate)) {
        this.nextId += 1
        this.enemies.push(candidate)
        this.enemiesRemaining -= 1
        this.burst(candidate.x + TANK_SIZE / 2, candidate.y + TANK_SIZE / 2, '#ffffff', 8)
        return
      }
    }
  }

  private spawnPowerUp(enemy: Tank) {
    const kinds: PowerUpKind[] = ['repair', 'rapid', 'shield']
    const kind = kinds[Math.floor(this.random() * kinds.length)] ?? 'repair'
    this.powerUps.push({
      id: `power-${this.nextId}`,
      kind,
      x: enemy.x + 3,
      y: enemy.y + 3,
      ttl: 9,
    })
    this.nextId += 1
  }

  private applyPowerUp(kind: PowerUpKind) {
    if (kind === 'repair') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1)
    }

    if (kind === 'rapid') {
      this.player.rapid = 8
    }

    if (kind === 'shield') {
      this.player.shield = 6
    }

    this.score += 50
  }

  private chooseEnemyDirection(enemy: Tank): Direction {
    const target = this.baseHp > 0 ? this.findBaseCenter() : tankCenter(this.player)
    const center = tankCenter(enemy)
    const horizontalFirst = Math.abs(target.x - center.x) > Math.abs(target.y - center.y)
    const preferred: Direction[] = horizontalFirst
      ? [target.x > center.x ? 'right' : 'left', target.y > center.y ? 'down' : 'up']
      : [target.y > center.y ? 'down' : 'up', target.x > center.x ? 'right' : 'left']

    if (this.random() > 0.34) {
      return preferred[0]
    }

    return DIRECTION_ORDER[Math.floor(this.random() * DIRECTION_ORDER.length)] ?? 'down'
  }

  private hasLineOfFire(enemy: Tank, target: Tank) {
    const enemyCenter = tankCenter(enemy)
    const targetCenter = tankCenter(target)
    const alignedX = Math.abs(enemyCenter.x - targetCenter.x) < 12
    const alignedY = Math.abs(enemyCenter.y - targetCenter.y) < 12

    if (alignedX) {
      enemy.dir = targetCenter.y > enemyCenter.y ? 'down' : 'up'
      return true
    }

    if (alignedY) {
      enemy.dir = targetCenter.x > enemyCenter.x ? 'right' : 'left'
      return true
    }

    return false
  }

  private checkWinState() {
    if (this.mode === 'playing' && this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.mode = 'won'
    }
  }

  private findBaseCenter() {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        if (this.tiles[row]?.[col]?.kind === 'base') {
          return {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: ARENA_Y + row * TILE_SIZE + TILE_SIZE / 2,
          }
        }
      }
    }

    return tankCenter(this.player)
  }

  private tileKindAt(col: number, row: number): TileKind {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return 'steel'
    }

    return this.tiles[row]?.[col]?.kind ?? 'steel'
  }

  private isSolidForTank(kind: TileKind) {
    return kind === 'brick' || kind === 'steel' || kind === 'water' || kind === 'base'
  }

  private isSolidForBullet(kind: TileKind) {
    return kind === 'brick' || kind === 'steel' || kind === 'base'
  }

  private isOutsideArena(x: number, y: number) {
    return x < ARENA_X || y < ARENA_Y || x > ARENA_X + ARENA_WIDTH || y > ARENA_Y + ARENA_HEIGHT
  }

  private burst(x: number, y: number, color: string, count: number) {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2
      const speed = 28 + this.random() * 64
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + this.random() * 0.35,
        color,
      })
    }
  }

  private random() {
    this.rngState = (1664525 * this.rngState + 1013904223) >>> 0
    return this.rngState / 0x100000000
  }
}
