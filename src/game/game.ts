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
  CAMPAIGN_LEVELS,
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
  LevelDefinition,
  Particle,
  PowerUp,
  PowerUpKind,
  ProgressionState,
  RenderState,
  SaveData,
  SaveStore,
  SavedRun,
  SavedTank,
  SettingsState,
  SoundEvent,
  SoundEventKind,
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
const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1]
const LOADING_DURATION = 1.2
const MENU_PRESS_DURATION = 0.12
const LOADING_TIPS = [
  'Oiling tank caterpillars.',
  'Counting bricks before demolition.',
  'Retuning the walkie-talkie static.',
  'Tightening pixel bolts.',
  'Asking the eagle base to stay brave.',
  'Teaching shells to travel in straight lines.',
  'Checking if the base remembered its helmet.',
  'Negotiating with steel walls.',
]

interface MenuPresentation {
  title: string
  options: string[]
  selectedIndex: number
  pressedIndex: number | null
  pressProgress: number
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

interface PendingMenuPress {
  index: number
  elapsed: number
  duration: number
}

interface LoadingPresentation {
  elapsed: number
  duration: number
  targetLevelId: number
  tip: string
}

export class TanchikiGame {
  private readonly aiEnabled: boolean
  private readonly levels: LevelDefinition[]
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
  private settings: SettingsState
  private repairCharges = 0
  private rngState: number
  private savedRun: SavedRun | null
  private score = 0
  private soundEvents: SoundEvent[] = []
  private shake = 0
  private flash = 0
  private levelClearPause = 0
  private touchControlsVisible = false
  private onlineQuickMatchRequested = false
  private pendingMenuPress: PendingMenuPress | null = null
  private loading: LoadingPresentation | null = null
  private spawnCursor = 0
  private spawnTimer = 0
  private tiles: Tile[][]
  private time = 0
  private baseHp = 1
  private currentLevelId = 1
  private completedLevelId: number | null = null

  constructor(options: GameOptions = {}) {
    this.aiEnabled = options.aiEnabled ?? true
    this.levels = options.levelDefinitions ?? this.createOptionLevels(options)
    this.saveStore = options.saveStore ?? createBrowserSaveStore()
    this.rngState = options.seed ?? 112358

    const saveData = this.saveStore.load() ?? createDefaultSaveData()
    this.progression = saveData.progression
    this.settings = saveData.settings
    this.savedRun = saveData.resumableRun
    this.currentLevelId = this.clampLevelId(this.savedRun?.currentLevel ?? this.progression.unlockedStage)
    this.tiles = createTiles(this.currentLevel.rows)
    this.enemiesRemaining = this.savedRun?.enemiesRemaining ?? this.currentLevel.enemyTotal
    this.player = this.createPlayer()
  }

  private createOptionLevels(options: GameOptions): LevelDefinition[] {
    if (options.levelRows || options.enemySpawns || options.enemyTotal !== undefined || options.playerSpawn) {
      return [
        {
          id: 1,
          name: 'Test Field',
          briefing: 'Local test configuration.',
          rows: options.levelRows ?? DEFAULT_LEVEL_ROWS,
          playerSpawn: options.playerSpawn ?? DEFAULT_PLAYER_SPAWN,
          enemySpawns: options.enemySpawns ?? DEFAULT_ENEMY_SPAWNS,
          enemyTotal: options.enemyTotal ?? 18,
          activeEnemyLimit: Math.min(4, Math.max(1, options.enemyTotal ?? 4)),
          spawnInterval: 2.2,
          roleWeights: { base_attacker: 0.46, hunter: 0.32, wall_breaker: 0.22 },
          armoredEnemyRatio: 0.33,
          rewards: { credits: 100, xp: 60, score: 500 },
        },
      ]
    }

    return CAMPAIGN_LEVELS
  }

  private get currentLevel() {
    return this.levels.find((level) => level.id === this.currentLevelId) ?? this.levels[0]
  }

  private get maxLevelId() {
    return this.levels[this.levels.length - 1]?.id ?? 1
  }

  private clampLevelId(levelId: number) {
    return Math.max(1, Math.min(this.maxLevelId, Math.floor(levelId || 1)))
  }

  startGame(levelId = this.currentLevelId) {
    this.currentLevelId = this.clampLevelId(levelId)
    this.tiles = createTiles(this.currentLevel.rows)
    this.bullets = []
    this.enemies = []
    this.particles = []
    this.powerUps = []
    this.input = { ...EMPTY_INPUT }
    this.mode = 'playing'
    this.menuIndex = 0
    this.pendingMenuPress = null
    this.loading = null
    this.nextId = 1
    this.score = 0
    this.time = 0
    this.lives = 3
    this.baseHp = 1
    this.enemiesRemaining = this.currentLevel.enemyTotal
    this.spawnCursor = 0
    this.spawnTimer = 0
    this.repairCharges = this.getUpgradeStats().repairCharges
    this.player = this.createPlayer()
    this.savedRun = null
    this.completedLevelId = null
    this.persist()
    this.spawnEnemy()
  }

  beginLevelLoading(levelId = this.currentLevelId) {
    const targetLevelId = this.clampLevelId(levelId)
    this.currentLevelId = targetLevelId
    this.mode = 'loading'
    this.menuIndex = 0
    this.pendingMenuPress = null
    this.input = { ...EMPTY_INPUT }
    this.loading = {
      elapsed: 0,
      duration: LOADING_DURATION,
      targetLevelId,
      tip: this.pickLoadingTip(targetLevelId),
    }
  }

  primaryAction() {
    if (this.mode === 'playing') {
      this.fire(this.player)
      return
    }

    if (this.mode === 'loading') {
      if (this.loading && this.isLoadingReady()) {
        this.startGame(this.loading.targetLevelId)
      }
      return
    }

    this.beginMenuPress()
  }

  restart() {
    this.beginLevelLoading(this.currentLevelId)
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
    if (this.pendingMenuPress) {
      this.pendingMenuPress = null
      return
    }

    if (this.mode === 'playing') {
      this.togglePause()
      return
    }

    if (this.mode === 'loading') {
      this.loading = null
      this.mode = 'briefing'
      this.menuIndex = 0
      this.input = { ...EMPTY_INPUT }
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
    if (this.mode === 'playing' || this.mode === 'loading' || this.pendingMenuPress) {
      return
    }

    const options = this.getMenuItems()

    if (options.length === 0) {
      return
    }

    this.menuIndex = (this.menuIndex + delta + options.length) % options.length
    this.queueSound('menu')
  }

  selectMenuIndex(index: number) {
    if (this.mode === 'playing' || this.mode === 'loading' || this.pendingMenuPress) {
      return
    }

    const options = this.getMenuItems()

    if (options.length === 0) {
      return
    }

    if (index < 0 || index >= options.length) {
      return
    }

    this.menuIndex = index
    this.queueSound('menu')
  }

  private beginMenuPress() {
    const options = this.getMenuItems()

    if (options.length === 0 || this.pendingMenuPress) {
      return
    }

    this.menuIndex = clamp(this.menuIndex, 0, options.length - 1)
    this.pendingMenuPress = {
      index: this.menuIndex,
      elapsed: 0,
      duration: MENU_PRESS_DURATION,
    }
    this.queueSound('menu')
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
        this.beginLevelLoading(this.currentLevelId)
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

    if (this.mode === 'settings') {
      this.confirmSettings(item.id)
      return
    }

    if (this.mode === 'online-menu') {
      this.confirmOnlineMenu(item.id)
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
      return
    }

    if (this.mode === 'level-complete') {
      if (item.id === 'next') {
        this.currentLevelId = this.clampLevelId((this.completedLevelId ?? this.currentLevelId) + 1)
        this.mode = 'briefing'
        this.menuIndex = 0
      } else if (item.id === 'garage') {
        this.mode = 'garage'
        this.menuIndex = 0
      } else {
        this.mode = 'main-menu'
        this.menuIndex = 0
      }
      return
    }

    if (this.mode === 'campaign-complete') {
      if (item.id === 'replay') {
        this.currentLevelId = this.maxLevelId
        this.mode = 'briefing'
        this.menuIndex = 0
      } else if (item.id === 'garage') {
        this.mode = 'garage'
        this.menuIndex = 0
      } else {
        this.mode = 'main-menu'
        this.menuIndex = 0
      }
      return
    }

    if (this.mode === 'won' || this.mode === 'lost') {
      this.mode = 'main-menu'
      this.menuIndex = 0
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
    this.queueSound('upgrade')
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

  setTouchControlsVisible(visible: boolean) {
    this.touchControlsVisible = visible
  }

  drainSoundEvents() {
    const events = [...this.soundEvents]
    this.soundEvents = []
    return events
  }

  getSettings() {
    return { ...this.settings }
  }

  consumeOnlineQuickMatchRequest() {
    const requested = this.onlineQuickMatchRequested
    this.onlineQuickMatchRequested = false
    return requested
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
      level: this.currentLevel,
      currentLevel: this.currentLevelId,
      campaignComplete: this.progression.unlockedStage >= this.maxLevelId && this.mode === 'campaign-complete',
      progression: this.progression,
      settings: this.settings,
      loading: this.getRenderLoadingState(),
      feedback: this.getFeedbackState(),
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
        pressedIndex: menu.pressedIndex,
        pressProgress: menu.pressProgress,
      },
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      level: {
        current: this.currentLevelId,
        name: this.currentLevel.name,
        briefing: this.currentLevel.briefing,
        unlockedStage: this.progression.unlockedStage,
        campaignComplete: this.mode === 'campaign-complete',
        difficulty: {
          enemyTotal: this.currentLevel.enemyTotal,
          activeEnemyLimit: this.currentLevel.activeEnemyLimit,
          spawnInterval: this.currentLevel.spawnInterval,
          armoredEnemyRatio: this.currentLevel.armoredEnemyRatio,
          roleWeights: this.currentLevel.roleWeights,
        },
      },
      team: {
        player: this.playerTeam,
        enemy: this.enemyTeam,
      },
      progression: {
        ...this.progression,
        hasSavedRun: Boolean(this.savedRun),
        upgradeStats: this.getUpgradeStats(),
      },
      settings: { ...this.settings },
      loading: this.getSnapshotLoadingState(),
      feedback: this.getFeedbackState(),
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
    this.updateFeedback(safeDt)
    this.updateMenuPress(safeDt)

    if (this.mode === 'loading') {
      this.updateLoading(safeDt)
      return
    }

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

  private updateMenuPress(dt: number) {
    if (!this.pendingMenuPress) {
      return
    }

    this.pendingMenuPress.elapsed += dt

    if (this.pendingMenuPress.elapsed < this.pendingMenuPress.duration) {
      return
    }

    const press = this.pendingMenuPress
    this.pendingMenuPress = null
    this.menuIndex = press.index
    this.confirmMenu()
  }

  private updateLoading(dt: number) {
    if (!this.loading) {
      return
    }

    this.loading.elapsed = Math.min(this.loading.duration, this.loading.elapsed + dt)
  }

  private get playerTeam() {
    return this.progression.selectedTeam
  }

  private get enemyTeam(): Team {
    return this.progression.selectedTeam === 'blue' ? 'red' : 'blue'
  }

  private getFeedbackState() {
    return {
      shake: Number(this.shake.toFixed(2)),
      flash: Number(this.flash.toFixed(2)),
      levelClearPause: Number(this.levelClearPause.toFixed(2)),
      touchControlsVisible: this.touchControlsVisible,
    }
  }

  private getRenderLoadingState() {
    if (!this.loading) {
      return null
    }

    return {
      progress: this.getLoadingProgress(),
      duration: this.loading.duration,
      readyToProceed: this.isLoadingReady(),
      tip: this.loading.tip,
      targetLevel: this.getLevelById(this.loading.targetLevelId),
    }
  }

  private getSnapshotLoadingState() {
    if (!this.loading) {
      return null
    }

    const targetLevel = this.getLevelById(this.loading.targetLevelId)

    return {
      progress: this.getLoadingProgress(),
      duration: this.loading.duration,
      readyToProceed: this.isLoadingReady(),
      tip: this.loading.tip,
      targetLevel: {
        id: targetLevel.id,
        name: targetLevel.name,
      },
    }
  }

  private getLoadingProgress() {
    if (!this.loading) {
      return 0
    }

    return Number(clamp(this.loading.elapsed / this.loading.duration, 0, 1).toFixed(2))
  }

  private isLoadingReady() {
    return Boolean(this.loading && this.loading.elapsed >= this.loading.duration)
  }

  private pickLoadingTip(levelId: number) {
    const teamOffset = this.playerTeam === 'red' ? 3 : 0
    const index = (levelId * 5 + teamOffset) % LOADING_TIPS.length
    return LOADING_TIPS[index] ?? LOADING_TIPS[0]
  }

  private getLevelById(levelId: number) {
    return this.levels.find((level) => level.id === levelId) ?? this.currentLevel
  }

  private confirmMainMenu(id: string) {
    if (id === 'continue') {
      this.continueSavedRun()
    } else if (id === 'new') {
      this.currentLevelId = this.clampLevelId(this.progression.unlockedStage)
      this.mode = 'briefing'
      this.menuIndex = 0
    } else if (id === 'garage') {
      this.mode = 'garage'
      this.menuIndex = 0
    } else if (id === 'settings') {
      this.mode = 'settings'
      this.menuIndex = 0
    } else if (id === 'online') {
      this.mode = 'online-menu'
      this.menuIndex = 0
    } else if (id === 'team') {
      this.mode = 'team-select'
      this.menuIndex = this.playerTeam === 'blue' ? 0 : 1
    } else if (id === 'how') {
      this.mode = 'how-to-play'
      this.menuIndex = 0
    }
  }

  private confirmOnlineMenu(id: string) {
    if (id === 'quick') {
      this.onlineQuickMatchRequested = true
      return
    }

    this.back()
  }

  private confirmSettings(id: string) {
    if (id === 'back') {
      this.back()
      return
    }

    if (id === 'volume') {
      const currentIndex = VOLUME_STEPS.findIndex((step) => step >= this.settings.volume)
      const nextIndex = (Math.max(0, currentIndex) + 1) % VOLUME_STEPS.length
      this.settings.volume = VOLUME_STEPS[nextIndex] ?? 0.7
      this.settings.muted = this.settings.volume === 0
    }

    if (id === 'mute') {
      this.settings.muted = !this.settings.muted
      if (!this.settings.muted && this.settings.volume === 0) {
        this.settings.volume = 0.7
      }
    }

    if (id === 'color') {
      this.settings.colorSafe = !this.settings.colorSafe
    }

    this.persist()
    this.queueSound(id === 'mute' && this.settings.muted ? 'menu' : 'upgrade')
  }

  private getMenuItems(): MenuItem[] {
    if (this.mode === 'main-menu') {
      const items: MenuItem[] = []

      if (this.savedRun) {
        items.push({ id: 'continue', label: 'Continue' })
      }

      items.push(
        { id: 'new', label: `New Game: Level ${this.progression.unlockedStage}` },
        { id: 'garage', label: 'Garage' },
        { id: 'online', label: 'Online Battle' },
        { id: 'settings', label: 'Settings' },
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

    if (this.mode === 'settings') {
      return [
        { id: 'volume', label: `Volume ${Math.round(this.settings.volume * 100)}%` },
        { id: 'mute', label: `Muted ${this.settings.muted ? 'ON' : 'OFF'}` },
        { id: 'color', label: `Color Safe ${this.settings.colorSafe ? 'ON' : 'OFF'}` },
        { id: 'back', label: 'Back' },
      ]
    }

    if (this.mode === 'online-menu') {
      return [
        { id: 'quick', label: 'Quick Match' },
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

    if (this.mode === 'level-complete') {
      return [
        { id: 'next', label: `Next Briefing: Level ${this.clampLevelId((this.completedLevelId ?? this.currentLevelId) + 1)}` },
        { id: 'garage', label: 'Garage' },
        { id: 'menu', label: 'Main Menu' },
      ]
    }

    if (this.mode === 'campaign-complete') {
      return [
        { id: 'replay', label: 'Replay Final Level' },
        { id: 'garage', label: 'Garage' },
        { id: 'menu', label: 'Main Menu' },
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
    const pressedIndex = this.pendingMenuPress?.index ?? null
    const pressProgress = this.pendingMenuPress
      ? Number(clamp(this.pendingMenuPress.elapsed / this.pendingMenuPress.duration, 0, 1).toFixed(2))
      : 0
    const withPressState = (presentation: Omit<MenuPresentation, 'pressedIndex' | 'pressProgress'>): MenuPresentation => ({
      ...presentation,
      pressedIndex,
      pressProgress,
    })

    if (this.mode === 'briefing') {
      return withPressState({
        title: `Level ${this.currentLevel.id}: ${this.currentLevel.name}`,
        options,
        selectedIndex,
        helper: [
          this.currentLevel.briefing,
          `Enemies ${this.currentLevel.enemyTotal}  Active ${this.currentLevel.activeEnemyLimit}  Spawn ${this.currentLevel.spawnInterval.toFixed(1)}s`,
          'Clear the wave, earn rewards, then choose the next briefing or garage.',
        ],
      })
    }

    if (this.mode === 'garage') {
      return withPressState({
        title: `Garage  LV ${this.progression.unlockedStage}  $${this.progression.credits}  XP ${this.progression.xp}`,
        options,
        selectedIndex,
        helper: [
          'Armor adds HP. Cannon improves reload and later damage.',
          'Engine shortens each tile move. Repair Kit adds emergency charges.',
        ],
      })
    }

    if (this.mode === 'team-select') {
      return withPressState({
        title: 'Choose Team',
        options,
        selectedIndex,
        helper: ['Your team color affects your tank, flag, HUD, and saved profile.'],
      })
    }

    if (this.mode === 'settings') {
      return withPressState({
        title: 'Settings',
        options,
        selectedIndex,
        helper: [
          'Sound and color preferences are saved locally.',
          'Touch controls appear automatically after a touch input.',
        ],
      })
    }

    if (this.mode === 'online-menu') {
      return withPressState({
        title: 'Online Battle',
        options,
        selectedIndex,
        helper: [
          'Team PvP starts with narrow vision and shared radio pings.',
          'Capture retranslators to merge team sight across the map.',
          'Unseen map, relays, shots, and enemies are hidden until your team has vision.',
        ],
      })
    }

    if (this.mode === 'how-to-play') {
      return withPressState({
        title: 'How To Play',
        options,
        selectedIndex,
        helper: [
          'Arrows/WASD: move one tile. Space: fire. P: pause. F: fullscreen.',
          'Enemies path toward you or the base, and breakers shoot through brick.',
          'Save from pause, continue later, and spend credits in the garage.',
        ],
      })
    }

    if (this.mode === 'paused') {
      return withPressState({
        title: 'Paused',
        options,
        selectedIndex,
        helper: ['Save And Quit stores the current run locally.'],
      })
    }

    if (this.mode === 'level-complete') {
      return withPressState({
        title: `Level ${this.completedLevelId ?? this.currentLevelId} Clear`,
        options,
        selectedIndex,
        helper: [
          `Rewards saved. Campaign unlocked through Level ${this.progression.unlockedStage}.`,
          `Score ${this.score}  Best ${this.progression.bestScore}`,
        ],
      })
    }

    if (this.mode === 'campaign-complete') {
      return withPressState({
        title: 'Campaign Complete',
        options,
        selectedIndex,
        helper: [
          'The final assault is broken. All campaign levels are unlocked.',
          `Final score ${this.score}  Best ${this.progression.bestScore}`,
        ],
      })
    }

    if (this.mode === 'won') {
      return withPressState({
        title: 'City Held',
        options,
        selectedIndex,
        helper: [`Score ${this.score}`, 'Wave bonus saved. Return to the garage for upgrades.'],
      })
    }

    if (this.mode === 'lost') {
      return withPressState({
        title: 'Base Lost',
        options,
        selectedIndex,
        helper: [`Score ${this.score}`, 'Progress saved. Upgrade and try again.'],
      })
    }

    if (this.mode === 'loading' && this.loading) {
      const targetLevel = this.getLevelById(this.loading.targetLevelId)
      return withPressState({
        title: `Loading Level ${targetLevel.id}`,
        options,
        selectedIndex,
        helper: [
          targetLevel.name,
          this.loading.tip,
        ],
      })
    }

    return withPressState({
      title: 'Tanchiki',
      options,
      selectedIndex,
      helper: [
        `Team ${this.playerTeam.toUpperCase()}  Level ${this.progression.unlockedStage}/${this.maxLevelId}  Best ${this.progression.bestScore}`,
        'Clear handcrafted levels, save progress, and upgrade in the garage.',
      ],
    })
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
      col: this.currentLevel.playerSpawn.x,
      row: this.currentLevel.playerSpawn.y,
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
    const spawnedCount = this.currentLevel.enemyTotal - this.enemiesRemaining
    const armoredStart = Math.floor(this.currentLevel.enemyTotal * (1 - this.currentLevel.armoredEnemyRatio))
    const armored = spawnedCount >= armoredStart
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
        this.queueSound('powerup')
        this.burst(powerUp.x + 10, powerUp.y + 10, '#ffe17a', 8)
        return false
      }

      return true
    })
  }

  private updateSpawning(dt: number) {
    if (this.enemiesRemaining <= 0 || this.enemies.length >= this.currentLevel.activeEnemyLimit) {
      return
    }

    this.spawnTimer -= dt

    if (this.spawnTimer <= 0) {
      this.spawnEnemy()
      this.spawnTimer = this.currentLevel.spawnInterval
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

  private updateFeedback(dt: number) {
    this.shake = Math.max(0, this.shake - dt)
    this.flash = Math.max(0, this.flash - dt)
    this.levelClearPause = Math.max(0, this.levelClearPause - dt)
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
    this.queueSound('fire')
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
        this.queueSound('brick')
        this.addImpactFeedback(0.1, 0.08)
        this.burst(col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + row * TILE_SIZE + TILE_SIZE / 2, '#e4572e', 10)
      } else {
        this.queueSound('hit')
        this.burst(centerX, centerY, '#ffb347', 5)
      }
    }

    if (tile.kind === 'base') {
      this.baseHp = 0
      tile.hp = 0
      this.mode = 'lost'
      this.queueSound('game-over')
      this.addImpactFeedback(0.45, 0.3)
      this.finishRun()
      this.burst(centerX, centerY, '#ffd35a', 20)
    }

    if (tile.kind === 'steel') {
      this.queueSound('hit')
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
      this.queueSound('hit')
      this.addImpactFeedback(0.08, 0.05)
      this.burst(bullet.x, bullet.y, '#cce9ff', 8)

      if (enemy.hp <= 0) {
        this.destroyEnemy(enemy)
      }

      return true
    }

    if (rectsIntersect(bulletRect, tankRect(this.player))) {
      this.damagePlayer(bullet.damage)
      this.queueSound('hit')
      this.addImpactFeedback(0.18, 0.16)
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
      this.queueSound('game-over')
      this.addImpactFeedback(0.45, 0.3)
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
    this.queueSound('enemy-destroyed')
    this.addImpactFeedback(0.14, 0.08)
    this.burst(enemy.x + TANK_SIZE / 2, enemy.y + TANK_SIZE / 2, '#a7dcff', 18)

    if (this.random() > 0.78) {
      this.spawnPowerUp(enemy)
    }
  }

  private spawnEnemy() {
    if (this.enemiesRemaining <= 0) {
      return
    }

    for (let attempts = 0; attempts < this.currentLevel.enemySpawns.length; attempts += 1) {
      const spawn = this.currentLevel.enemySpawns[this.spawnCursor % this.currentLevel.enemySpawns.length]
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
      this.completedLevelId = this.currentLevelId
      this.progression.credits += this.currentLevel.rewards.credits
      this.progression.xp += this.currentLevel.rewards.xp
      this.score += this.currentLevel.rewards.score
      this.progression.unlockedStage = Math.max(this.progression.unlockedStage, this.clampLevelId(this.currentLevelId + 1))
      this.mode = this.currentLevelId >= this.maxLevelId ? 'campaign-complete' : 'level-complete'
      this.levelClearPause = 0.9
      this.queueSound('level-clear')
      this.addImpactFeedback(0.2, 0.16)
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
    const weights = this.currentLevel.roleWeights
    const total = weights.base_attacker + weights.hunter + weights.wall_breaker
    const baseThreshold = weights.base_attacker / total
    const hunterThreshold = (weights.base_attacker + weights.hunter) / total

    if (roll < baseThreshold) {
      return 'base_attacker'
    }

    if (roll < hunterThreshold) {
      return 'hunter'
    }

    return 'wall_breaker'
  }

  private serializeRun(): SavedRun {
    return {
      currentLevel: this.currentLevelId,
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
    this.currentLevelId = this.clampLevelId(run.currentLevel ?? 1)
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
      settings: this.settings,
      resumableRun: this.savedRun,
    }
    this.saveStore.save(data)
  }

  private queueSound(kind: SoundEventKind) {
    if (!this.settings.muted && this.settings.volume > 0) {
      this.soundEvents.push({ kind })
    }
  }

  private addImpactFeedback(shake: number, flash: number) {
    this.shake = Math.max(this.shake, shake)
    this.flash = Math.max(this.flash, flash)
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
