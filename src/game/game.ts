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
  gridToTankPosition,
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
import { createBrowserSaveStore, createDefaultSaveData } from './save.ts'
import type {
  Bullet,
  Direction,
  EnemyRole,
  GameMode,
  GameOptions,
  GameSnapshot,
  InputState,
  Particle,
  PowerUp,
  PowerUpKind,
  ProgressionState,
  RenderState,
  SaveData,
  SaveStore,
  SavedRun,
  SavedTank,
  Tank,
  Team,
  Tile,
  TileKind,
  UpgradeKind,
  Vec,
} from './types.ts'

const EMPTY_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
}

const UPGRADE_ORDER: UpgradeKind[] = ['armor', 'cannon', 'engine', 'repairKit']
const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  armor: 'Armor',
  cannon: 'Cannon',
  engine: 'Engine',
  repairKit: 'Repair Kit',
}
const UPGRADE_MAX = 5

interface MenuPresentation {
  title: string
  options: string[]
  selectedIndex: number
  helper: string[]
}

interface UpgradeStats {
  maxHp: number
  reloadTime: number
  bulletDamage: number
  moveDuration: number
  repairCharges: number
}

interface MenuItem {
  id: string
  label: string
}

export class TanchikiGame {
  private readonly aiEnabled: boolean
  private readonly enemySpawns: Vec[]
  private readonly enemyTotal: number
  private readonly levelRows: string[]
  private readonly playerSpawn: Vec
  private readonly saveStore: SaveStore
  private bullets: Bullet[] = []
  private enemies: Tank[] = []
  private enemiesRemaining = 18
  private input: InputState = { ...EMPTY_INPUT }
  private lives = 3
  private menuIndex = 0
  private mode: GameMode = 'main-menu'
  private nextId = 1
  private particles: Particle[] = []
  private player: Tank
  private powerUps: PowerUp[] = []
  private progression: ProgressionState
  private repairCharges = 0
  private rngState: number
  private savedRun: SavedRun | null
  private score = 0
  private spawnCursor = 0
  private spawnTimer = 0
  private tiles: Tile[][]
  private time = 0
  private baseHp = 1

  constructor(options: GameOptions = {}) {
    this.aiEnabled = options.aiEnabled ?? true
    this.enemySpawns = options.enemySpawns ?? DEFAULT_ENEMY_SPAWNS
    this.enemyTotal = options.enemyTotal ?? 18
    this.levelRows = options.levelRows ?? DEFAULT_LEVEL_ROWS
    this.playerSpawn = options.playerSpawn ?? DEFAULT_PLAYER_SPAWN
    this.saveStore = options.saveStore ?? createBrowserSaveStore()
    this.rngState = options.seed ?? 112358

    const saveData = this.saveStore.load() ?? createDefaultSaveData()
    this.progression = saveData.progression
    this.savedRun = saveData.resumableRun
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
    this.menuIndex = 0
    this.nextId = 1
    this.score = 0
    this.time = 0
    this.lives = 3
    this.baseHp = 1
    this.enemiesRemaining = this.enemyTotal
    this.spawnCursor = 0
    this.spawnTimer = 0
    this.repairCharges = this.getUpgradeStats().repairCharges
    this.player = this.createPlayer()
    this.savedRun = null
    this.persist()
    this.spawnEnemy()
  }

  primaryAction() {
    if (this.mode === 'playing') {
      this.fire(this.player)
      return
    }

    if (this.mode === 'won' || this.mode === 'lost') {
      this.mode = 'main-menu'
      this.menuIndex = 0
      return
    }

    this.confirmMenu()
  }

  restart() {
    this.startGame()
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused'
      this.menuIndex = 0
      return
    }

    if (this.mode === 'paused') {
      this.mode = 'playing'
    }
  }

  back() {
    if (this.mode === 'playing') {
      this.togglePause()
      return
    }

    if (this.mode === 'paused') {
      this.mode = 'playing'
      return
    }

    if (this.mode !== 'main-menu') {
      this.mode = 'main-menu'
      this.menuIndex = 0
    }
  }

  navigateMenu(delta: number) {
    if (this.mode === 'playing') {
      return
    }

    const options = this.getMenuItems()

    if (options.length === 0) {
      return
    }

    this.menuIndex = (this.menuIndex + delta + options.length) % options.length
  }

  confirmMenu() {
    const item = this.getMenuItems()[this.menuIndex]

    if (!item) {
      return
    }

    if (this.mode === 'main-menu') {
      this.confirmMainMenu(item.id)
      return
    }

    if (this.mode === 'briefing') {
      if (item.id === 'start') {
        this.startGame()
      } else {
        this.back()
      }
      return
    }

    if (this.mode === 'team-select') {
      if (item.id === 'blue' || item.id === 'red') {
        this.setTeam(item.id)
      } else {
        this.back()
      }
      return
    }

    if (this.mode === 'garage') {
      if (this.isUpgradeKind(item.id)) {
        this.buyUpgrade(item.id)
      } else {
        this.back()
      }
      return
    }

    if (this.mode === 'how-to-play') {
      this.back()
      return
    }

    if (this.mode === 'paused') {
      if (item.id === 'resume') {
        this.mode = 'playing'
      } else if (item.id === 'save-quit') {
        this.saveAndQuit()
      } else if (item.id === 'restart') {
        this.restart()
      }
    }
  }

  setTeam(team: Team) {
    this.progression.selectedTeam = team
    this.savedRun = null
    this.persist()
  }

  buyUpgrade(kind: UpgradeKind) {
    const currentLevel = this.progression.upgrades[kind]

    if (currentLevel >= UPGRADE_MAX) {
      return false
    }

    const cost = this.getUpgradeCost(kind)

    if (this.progression.credits < cost) {
      return false
    }

    this.progression.credits -= cost
    this.progression.upgrades[kind] = currentLevel + 1
    this.savedRun = null
    this.persist()
    return true
  }

  continueSavedRun() {
    if (!this.savedRun) {
      return false
    }

    this.restoreRun(this.savedRun)
    return true
  }

  saveAndQuit() {
    if (this.mode !== 'paused' && this.mode !== 'playing') {
      return
    }

    this.savedRun = this.serializeRun()
    this.mode = 'main-menu'
    this.menuIndex = 0
    this.persist()
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

  getUpgradeCost(kind: UpgradeKind) {
    return 100 + this.progression.upgrades[kind] * 75
  }

  getRenderState(): RenderState {
    return {
      mode: this.mode,
      menu: this.getMenuPresentation(),
      time: this.time,
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      progression: this.progression,
      upgradeStats: this.getUpgradeStats(),
      hasSavedRun: Boolean(this.savedRun),
      playerTeam: this.playerTeam,
      enemyTeam: this.enemyTeam,
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
    const menu = this.getMenuPresentation()

    return {
      coordinateSystem: 'origin top-left, x right, y down, tanks occupy 32px grid cells',
      mode: this.mode,
      menu: {
        title: menu.title,
        options: menu.options,
        selectedIndex: menu.selectedIndex,
      },
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      team: {
        player: this.playerTeam,
        enemy: this.enemyTeam,
      },
      progression: {
        ...this.progression,
        hasSavedRun: Boolean(this.savedRun),
        upgradeStats: this.getUpgradeStats(),
      },
      player: {
        col: this.player.col,
        row: this.player.row,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        dir: this.player.dir,
        hp: this.player.hp,
        moving: Boolean(this.player.move),
        shield: Number(this.player.shield.toFixed(2)),
        rapid: Number(this.player.rapid.toFixed(2)),
        repairCharges: this.repairCharges,
      },
      enemies: this.enemies.map((enemy) => ({
        id: enemy.id,
        role: enemy.role,
        team: enemy.team,
        col: enemy.col,
        row: enemy.row,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        dir: enemy.dir,
        hp: enemy.hp,
        moving: Boolean(enemy.move),
      })),
      bullets: this.bullets.map((bullet) => ({
        owner: bullet.owner,
        team: bullet.team,
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

  private get playerTeam() {
    return this.progression.selectedTeam
  }

  private get enemyTeam(): Team {
    return this.progression.selectedTeam === 'blue' ? 'red' : 'blue'
  }

  private confirmMainMenu(id: string) {
    if (id === 'continue') {
      this.continueSavedRun()
    } else if (id === 'new') {
      this.mode = 'briefing'
      this.menuIndex = 0
    } else if (id === 'garage') {
      this.mode = 'garage'
      this.menuIndex = 0
    } else if (id === 'team') {
      this.mode = 'team-select'
      this.menuIndex = this.playerTeam === 'blue' ? 0 : 1
    } else if (id === 'how') {
      this.mode = 'how-to-play'
      this.menuIndex = 0
    }
  }

  private getMenuItems(): MenuItem[] {
    if (this.mode === 'main-menu') {
      const items: MenuItem[] = []

      if (this.savedRun) {
        items.push({ id: 'continue', label: 'Continue' })
      }

      items.push(
        { id: 'new', label: 'New Game' },
        { id: 'garage', label: 'Garage' },
        { id: 'team', label: `Team: ${this.playerTeam.toUpperCase()}` },
        { id: 'how', label: 'How To Play' },
      )
      return items
    }

    if (this.mode === 'briefing') {
      return [
        { id: 'start', label: 'Start Mission' },
        { id: 'back', label: 'Back' },
      ]
    }

    if (this.mode === 'team-select') {
      return [
        { id: 'blue', label: this.playerTeam === 'blue' ? 'Blue Team *' : 'Blue Team' },
        { id: 'red', label: this.playerTeam === 'red' ? 'Red Team *' : 'Red Team' },
        { id: 'back', label: 'Back' },
      ]
    }

    if (this.mode === 'garage') {
      return [
        ...UPGRADE_ORDER.map((kind) => ({ id: kind, label: this.getUpgradeLabel(kind) })),
        { id: 'back', label: 'Back' },
      ]
    }

    if (this.mode === 'how-to-play') {
      return [{ id: 'back', label: 'Back' }]
    }

    if (this.mode === 'paused') {
      return [
        { id: 'resume', label: 'Resume' },
        { id: 'save-quit', label: 'Save And Quit' },
        { id: 'restart', label: 'Restart' },
      ]
    }

    if (this.mode === 'won' || this.mode === 'lost') {
      return [{ id: 'menu', label: 'Main Menu' }]
    }

    return []
  }

  private getMenuPresentation(): MenuPresentation {
    const items = this.getMenuItems()
    const options = items.map((item) => item.label)
    const selectedIndex = options.length > 0 ? clamp(this.menuIndex, 0, options.length - 1) : 0
    this.menuIndex = selectedIndex

    if (this.mode === 'briefing') {
      return {
        title: 'Mission Briefing',
        options,
        selectedIndex,
        helper: [
          'Defend your eagle base and clear the red/blue opposition.',
          'Tanks move one tile at a time. A blocked move only turns your hull.',
          'Destroy brick cover, avoid steel and water, earn credits for upgrades.',
        ],
      }
    }

    if (this.mode === 'garage') {
      return {
        title: `Garage  $${this.progression.credits}  XP ${this.progression.xp}`,
        options,
        selectedIndex,
        helper: [
          'Armor adds HP. Cannon improves reload and later damage.',
          'Engine shortens each tile move. Repair Kit adds emergency charges.',
        ],
      }
    }

    if (this.mode === 'team-select') {
      return {
        title: 'Choose Team',
        options,
        selectedIndex,
        helper: ['Your team color affects your tank, flag, HUD, and saved profile.'],
      }
    }

    if (this.mode === 'how-to-play') {
      return {
        title: 'How To Play',
        options,
        selectedIndex,
        helper: [
          'Arrows/WASD: move one tile. Space: fire. P: pause. F: fullscreen.',
          'Enemies path toward you or the base, and breakers shoot through brick.',
          'Save from pause, continue later, and spend credits in the garage.',
        ],
      }
    }

    if (this.mode === 'paused') {
      return {
        title: 'Paused',
        options,
        selectedIndex,
        helper: ['Save And Quit stores the current run locally.'],
      }
    }

    if (this.mode === 'won') {
      return {
        title: 'City Held',
        options,
        selectedIndex,
        helper: [`Score ${this.score}`, 'Wave bonus saved. Return to the garage for upgrades.'],
      }
    }

    if (this.mode === 'lost') {
      return {
        title: 'Base Lost',
        options,
        selectedIndex,
        helper: [`Score ${this.score}`, 'Progress saved. Upgrade and try again.'],
      }
    }

    return {
      title: 'Tanchiki',
      options,
      selectedIndex,
      helper: [
        `Team ${this.playerTeam.toUpperCase()}  Best ${this.progression.bestScore}`,
        'A tile-tactics tank defense game with persistent garage upgrades.',
      ],
    }
  }

  private getUpgradeLabel(kind: UpgradeKind) {
    const level = this.progression.upgrades[kind]
    const suffix = level >= UPGRADE_MAX ? 'MAX' : `$${this.getUpgradeCost(kind)}`
    return `${UPGRADE_LABELS[kind]} L${level} ${suffix}`
  }

  private isUpgradeKind(id: string): id is UpgradeKind {
    return UPGRADE_ORDER.includes(id as UpgradeKind)
  }

  private getUpgradeStats(): UpgradeStats {
    const upgrades = this.progression.upgrades
    return {
      maxHp: 3 + upgrades.armor,
      reloadTime: Math.max(0.18, 0.34 - upgrades.cannon * 0.035),
      bulletDamage: 1 + Math.floor(upgrades.cannon / 3),
      moveDuration: Math.max(0.12, 0.26 - upgrades.engine * 0.025),
      repairCharges: upgrades.repairKit,
    }
  }

  private createPlayer(): Tank {
    const stats = this.getUpgradeStats()
    return this.createTank({
      id: 'player',
      faction: 'player',
      team: this.playerTeam,
      role: null,
      col: this.playerSpawn.x,
      row: this.playerSpawn.y,
      dir: 'up',
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      reload: 0,
      reloadTime: stats.reloadTime,
      scoreValue: 0,
      repairCharges: this.repairCharges,
    })
  }

  private createEnemy(spawn: Vec): Tank {
    const armored = this.enemiesRemaining <= Math.ceil(this.enemyTotal / 3)
    const role = this.pickEnemyRole()
    return this.createTank({
      id: `enemy-${this.nextId}`,
      faction: 'enemy',
      team: this.enemyTeam,
      role,
      col: spawn.x,
      row: spawn.y,
      dir: 'down',
      hp: armored ? 2 : 1,
      maxHp: armored ? 2 : 1,
      reload: 0.7 + this.random() * 0.6,
      reloadTime: role === 'wall_breaker' ? 0.95 : 1.15,
      scoreValue: armored ? 250 : 100,
      repairCharges: 0,
    })
  }

  private createTank(config: {
    id: string
    faction: 'player' | 'enemy'
    team: Team
    role: EnemyRole | null
    col: number
    row: number
    dir: Direction
    hp: number
    maxHp: number
    reload: number
    reloadTime: number
    scoreValue: number
    repairCharges: number
  }): Tank {
    const position = gridToTankPosition(config.col, config.row)
    return {
      id: config.id,
      faction: config.faction,
      team: config.team,
      role: config.role,
      col: config.col,
      row: config.row,
      x: position.x,
      y: position.y,
      dir: config.dir,
      hp: config.hp,
      maxHp: config.maxHp,
      speed: 0,
      reload: config.reload,
      reloadTime: config.reloadTime,
      aiCooldown: 0.1,
      turnCooldown: 0.2,
      spawnGrace: config.faction === 'player' ? 1.2 : 0.6,
      scoreValue: config.scoreValue,
      shield: config.faction === 'player' ? 1.2 : 0,
      rapid: 0,
      repairCharges: config.repairCharges,
      move: null,
      path: [],
    }
  }

  private updatePlayer(dt: number) {
    this.updateTankTimers(this.player, dt)
    this.updateTankMove(this.player, dt)

    if (!this.player.move) {
      const direction = this.directionFromInput()

      if (direction) {
        this.startMove(this.player, direction)
      }
    }

    if (this.input.fire) {
      this.fire(this.player)
    }
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      this.updateTankTimers(enemy, dt)
      this.updateTankMove(enemy, dt)

      if (!this.aiEnabled || enemy.move) {
        continue
      }

      enemy.aiCooldown -= dt

      if (enemy.aiCooldown > 0) {
        continue
      }

      this.runEnemyDecision(enemy)
      enemy.aiCooldown = 0.18 + this.random() * 0.14
    }
  }

  private updateTankTimers(tank: Tank, dt: number) {
    tank.reload = Math.max(0, tank.reload - dt)
    tank.spawnGrace = Math.max(0, tank.spawnGrace - dt)
    tank.shield = Math.max(0, tank.shield - dt)
    tank.rapid = Math.max(0, tank.rapid - dt)

    if (tank.faction === 'player') {
      tank.reloadTime = tank.rapid > 0 ? Math.max(0.14, this.getUpgradeStats().reloadTime - 0.08) : this.getUpgradeStats().reloadTime
      tank.maxHp = this.getUpgradeStats().maxHp
      tank.repairCharges = this.repairCharges
    }
  }

  private updateTankMove(tank: Tank, dt: number) {
    if (!tank.move) {
      return
    }

    tank.move.elapsed += dt
    const progress = clamp(tank.move.elapsed / tank.move.duration, 0, 1)
    const from = gridToTankPosition(tank.move.fromCol, tank.move.fromRow)
    const to = gridToTankPosition(tank.move.toCol, tank.move.toRow)
    tank.x = from.x + (to.x - from.x) * progress
    tank.y = from.y + (to.y - from.y) * progress

    if (progress >= 1) {
      tank.col = tank.move.toCol
      tank.row = tank.move.toRow
      tank.x = to.x
      tank.y = to.y
      tank.move = null
    }
  }

  private runEnemyDecision(enemy: Tank) {
    const shotTarget = enemy.role === 'base_attacker' ? this.findBaseCell() : { x: this.player.col, y: this.player.row }

    if (this.hasGridLineOfFire(enemy, shotTarget)) {
      this.fire(enemy)
      return
    }

    if (enemy.role === 'wall_breaker' && this.faceAndShootUsefulBrick(enemy, shotTarget)) {
      return
    }

    const goals = this.getGoalCells(enemy.role)
    const path = this.findPath({ x: enemy.col, y: enemy.row }, goals, enemy)
    enemy.path = path

    if (path.length > 0) {
      const next = path[0]
      this.startMove(enemy, this.directionTo(enemy.col, enemy.row, next.x, next.y))
      return
    }

    const fallback = this.pickOpenNeighbor(enemy)

    if (fallback) {
      this.startMove(enemy, this.directionTo(enemy.col, enemy.row, fallback.x, fallback.y))
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

  private startMove(tank: Tank, direction: Direction) {
    tank.dir = direction

    if (tank.move) {
      return false
    }

    const vector = DIR_VECTORS[direction]
    const targetCol = tank.col + vector.x
    const targetRow = tank.row + vector.y

    if (!this.canOccupy(tank, targetCol, targetRow)) {
      return false
    }

    tank.move = {
      fromCol: tank.col,
      fromRow: tank.row,
      toCol: targetCol,
      toRow: targetRow,
      elapsed: 0,
      duration: tank.faction === 'player' ? this.getUpgradeStats().moveDuration : 0.34,
    }
    return true
  }

  private canOccupy(tank: Tank, col: number, row: number) {
    if (!this.isInBounds(col, row) || !this.isPassableForTank(this.tileKindAt(col, row))) {
      return false
    }

    return !this.getTanks().some((other) => {
      if (other.id === tank.id) {
        return false
      }

      const otherTarget = other.move ? { x: other.move.toCol, y: other.move.toRow } : { x: other.col, y: other.row }
      return otherTarget.x === col && otherTarget.y === row
    })
  }

  private getTanks() {
    return [this.player, ...this.enemies]
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
      team: tank.team,
      x: center.x + vector.x * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      y: center.y + vector.y * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      dir: tank.dir,
      speed: tank.faction === 'player' ? 245 : 205,
      damage: tank.faction === 'player' ? this.getUpgradeStats().bulletDamage : 1,
      ttl: 2.4,
    }

    this.nextId += 1
    tank.reload = tank.reloadTime
    this.bullets.push(bullet)
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
      this.finishRun()
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

    if (this.repairCharges > 0) {
      this.repairCharges -= 1
      this.player.hp = Math.max(1, Math.ceil(this.player.maxHp / 2))
      this.player.shield = 1.2
      return
    }

    this.lives -= 1

    if (this.lives <= 0) {
      this.mode = 'lost'
      this.finishRun()
      return
    }

    this.player = this.createPlayer()
  }

  private destroyEnemy(enemy: Tank) {
    this.score += enemy.scoreValue
    this.progression.credits += enemy.maxHp > 1 ? 25 : 15
    this.progression.xp += enemy.maxHp > 1 ? 18 : 10
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

      if (this.canOccupy(candidate, candidate.col, candidate.row)) {
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

  private getGoalCells(role: EnemyRole | null) {
    if (role === 'hunter') {
      return this.getPassableNeighbors({ x: this.player.col, y: this.player.row })
    }

    return this.getPassableNeighbors(this.findBaseCell())
  }

  private findPath(start: Vec, goals: Vec[], tank: Tank) {
    const goalKeys = new Set(goals.map((goal) => this.key(goal.x, goal.y)))
    const queue: Vec[] = [start]
    const cameFrom = new Map<string, string | null>([[this.key(start.x, start.y), null]])

    while (queue.length > 0) {
      const current = queue.shift()

      if (!current) {
        break
      }

      if (goalKeys.has(this.key(current.x, current.y))) {
        return this.reconstructPath(start, current, cameFrom)
      }

      for (const direction of DIRECTION_ORDER) {
        const vector = DIR_VECTORS[direction]
        const next = { x: current.x + vector.x, y: current.y + vector.y }
        const nextKey = this.key(next.x, next.y)

        if (cameFrom.has(nextKey) || !this.canPathThrough(tank, next.x, next.y)) {
          continue
        }

        cameFrom.set(nextKey, this.key(current.x, current.y))
        queue.push(next)
      }
    }

    return []
  }

  private reconstructPath(start: Vec, end: Vec, cameFrom: Map<string, string | null>) {
    const path: Vec[] = []
    let currentKey: string | null = this.key(end.x, end.y)

    while (currentKey) {
      const [x, y] = currentKey.split(',').map(Number)

      if (x === start.x && y === start.y) {
        break
      }

      path.unshift({ x, y })
      currentKey = cameFrom.get(currentKey) ?? null
    }

    return path
  }

  private canPathThrough(tank: Tank, col: number, row: number) {
    return this.isInBounds(col, row) && this.isPassableForTank(this.tileKindAt(col, row)) && this.canOccupy(tank, col, row)
  }

  private getPassableNeighbors(cell: Vec) {
    return DIRECTION_ORDER.map((direction) => {
      const vector = DIR_VECTORS[direction]
      return { x: cell.x + vector.x, y: cell.y + vector.y }
    }).filter((candidate) => this.isInBounds(candidate.x, candidate.y) && this.isPassableForTank(this.tileKindAt(candidate.x, candidate.y)))
  }

  private pickOpenNeighbor(tank: Tank) {
    const candidates = DIRECTION_ORDER.map((direction) => {
      const vector = DIR_VECTORS[direction]
      return { x: tank.col + vector.x, y: tank.row + vector.y }
    }).filter((candidate) => this.canOccupy(tank, candidate.x, candidate.y))

    if (candidates.length === 0) {
      return null
    }

    return candidates[Math.floor(this.random() * candidates.length)] ?? candidates[0]
  }

  private hasGridLineOfFire(tank: Tank, target: Vec) {
    if (tank.col !== target.x && tank.row !== target.y) {
      return false
    }

    const direction = this.directionTo(tank.col, tank.row, target.x, target.y)

    if (!this.lineClearForShot(tank.col, tank.row, target.x, target.y)) {
      return false
    }

    tank.dir = direction
    return true
  }

  private lineClearForShot(fromCol: number, fromRow: number, toCol: number, toRow: number) {
    const dx = Math.sign(toCol - fromCol)
    const dy = Math.sign(toRow - fromRow)
    let col = fromCol + dx
    let row = fromRow + dy

    while (col !== toCol || row !== toRow) {
      const kind = this.tileKindAt(col, row)

      if (kind === 'steel' || kind === 'water' || kind === 'base') {
        return false
      }

      col += dx
      row += dy
    }

    return true
  }

  private faceAndShootUsefulBrick(enemy: Tank, target: Vec) {
    const directDirections = this.preferredDirections(enemy.col, enemy.row, target.x, target.y)

    for (const direction of directDirections) {
      const vector = DIR_VECTORS[direction]
      const col = enemy.col + vector.x
      const row = enemy.row + vector.y

      if (this.tileKindAt(col, row) === 'brick') {
        enemy.dir = direction
        this.fire(enemy)
        return true
      }
    }

    return false
  }

  private preferredDirections(fromCol: number, fromRow: number, toCol: number, toRow: number) {
    const horizontal = toCol >= fromCol ? 'right' : 'left'
    const vertical = toRow >= fromRow ? 'down' : 'up'
    const horizontalDistance = Math.abs(toCol - fromCol)
    const verticalDistance = Math.abs(toRow - fromRow)
    return horizontalDistance >= verticalDistance ? [horizontal, vertical] as Direction[] : [vertical, horizontal] as Direction[]
  }

  private directionTo(fromCol: number, fromRow: number, toCol: number, toRow: number): Direction {
    if (toCol > fromCol) {
      return 'right'
    }
    if (toCol < fromCol) {
      return 'left'
    }
    if (toRow > fromRow) {
      return 'down'
    }
    return 'up'
  }

  private checkWinState() {
    if (this.mode === 'playing' && this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.mode = 'won'
      this.progression.credits += 100
      this.progression.xp += 60
      this.progression.unlockedStage = Math.max(this.progression.unlockedStage, 2)
      this.finishRun()
    }
  }

  private finishRun() {
    this.progression.bestScore = Math.max(this.progression.bestScore, this.score)
    this.savedRun = null
    this.persist()
  }

  private findBaseCell() {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        if (this.tiles[row]?.[col]?.kind === 'base') {
          return { x: col, y: row }
        }
      }
    }

    return { x: this.player.col, y: this.player.row }
  }

  private tileKindAt(col: number, row: number): TileKind {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return 'steel'
    }

    return this.tiles[row]?.[col]?.kind ?? 'steel'
  }

  private isInBounds(col: number, row: number) {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
  }

  private isPassableForTank(kind: TileKind) {
    return kind === 'empty' || kind === 'trees'
  }

  private isSolidForBullet(kind: TileKind) {
    return kind === 'brick' || kind === 'steel' || kind === 'base'
  }

  private isOutsideArena(x: number, y: number) {
    return x < ARENA_X || y < ARENA_Y || x > ARENA_X + ARENA_WIDTH || y > ARENA_Y + ARENA_HEIGHT
  }

  private pickEnemyRole(): EnemyRole {
    const roll = this.random()

    if (roll < 0.46) {
      return 'base_attacker'
    }

    if (roll < 0.78) {
      return 'hunter'
    }

    return 'wall_breaker'
  }

  private serializeRun(): SavedRun {
    return {
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      spawnCursor: this.spawnCursor,
      spawnTimer: this.spawnTimer,
      nextId: this.nextId,
      time: this.time,
      tiles: this.tiles.map((row) => row.map((tile) => ({ ...tile }))),
      player: this.serializeTank(this.player),
      enemies: this.enemies.map((enemy) => this.serializeTank(enemy)),
      bullets: this.bullets.map((bullet) => ({ ...bullet })),
      powerUps: this.powerUps.map((powerUp) => ({ ...powerUp })),
      repairCharges: this.repairCharges,
    }
  }

  private serializeTank(tank: Tank): SavedTank {
    return {
      id: tank.id,
      faction: tank.faction,
      team: tank.team,
      role: tank.role,
      col: tank.move ? tank.move.toCol : tank.col,
      row: tank.move ? tank.move.toRow : tank.row,
      dir: tank.dir,
      hp: tank.hp,
      maxHp: tank.maxHp,
      reload: tank.reload,
      reloadTime: tank.reloadTime,
      aiCooldown: tank.aiCooldown,
      turnCooldown: tank.turnCooldown,
      spawnGrace: tank.spawnGrace,
      scoreValue: tank.scoreValue,
      shield: tank.shield,
      rapid: tank.rapid,
      repairCharges: tank.repairCharges,
    }
  }

  private restoreRun(run: SavedRun) {
    this.score = run.score
    this.lives = run.lives
    this.baseHp = run.baseHp
    this.enemiesRemaining = run.enemiesRemaining
    this.spawnCursor = run.spawnCursor
    this.spawnTimer = run.spawnTimer
    this.nextId = run.nextId
    this.time = run.time
    this.tiles = run.tiles.map((row) => row.map((tile) => ({ ...tile })))
    this.player = this.restoreTank(run.player)
    this.enemies = run.enemies.map((enemy) => this.restoreTank(enemy))
    this.bullets = run.bullets.map((bullet) => ({ ...bullet }))
    this.powerUps = run.powerUps.map((powerUp) => ({ ...powerUp }))
    this.repairCharges = run.repairCharges
    this.particles = []
    this.input = { ...EMPTY_INPUT }
    this.mode = 'playing'
    this.menuIndex = 0
  }

  private restoreTank(saved: SavedTank): Tank {
    const tank = this.createTank({
      id: saved.id,
      faction: saved.faction,
      team: saved.team,
      role: saved.role,
      col: saved.col,
      row: saved.row,
      dir: saved.dir,
      hp: saved.hp,
      maxHp: saved.maxHp,
      reload: saved.reload,
      reloadTime: saved.reloadTime,
      scoreValue: saved.scoreValue,
      repairCharges: saved.repairCharges,
    })
    tank.aiCooldown = saved.aiCooldown
    tank.turnCooldown = saved.turnCooldown
    tank.spawnGrace = saved.spawnGrace
    tank.shield = saved.shield
    tank.rapid = saved.rapid
    return tank
  }

  private persist() {
    const data: SaveData = {
      schemaVersion: 1,
      progression: this.progression,
      resumableRun: this.savedRun,
    }
    this.saveStore.save(data)
  }

  private key(col: number, row: number) {
    return `${col},${row}`
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
