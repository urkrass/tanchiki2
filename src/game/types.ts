export type Direction = 'up' | 'right' | 'down' | 'left'
export type GameMode =
  | 'main-menu'
  | 'team-select'
  | 'garage'
  | 'settings'
  | 'online-menu'
  | 'briefing'
  | 'how-to-play'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'level-complete'
  | 'campaign-complete'
  | 'won'
  | 'lost'
export type TankFaction = 'player' | 'enemy'
export type Team = 'blue' | 'red'
export type EnemyRole = 'base_attacker' | 'hunter' | 'wall_breaker'
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'trees' | 'base'
export type PowerUpKind = 'repair' | 'rapid' | 'shield'
export type UpgradeKind = 'armor' | 'cannon' | 'engine' | 'repairKit'
export type SoundEventKind =
  | 'menu'
  | 'fire'
  | 'hit'
  | 'brick'
  | 'enemy-destroyed'
  | 'powerup'
  | 'upgrade'
  | 'level-clear'
  | 'game-over'

export interface Vec {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Tile {
  kind: TileKind
  hp: number
}

export interface RoleWeights {
  base_attacker: number
  hunter: number
  wall_breaker: number
}

export interface LevelRewards {
  credits: number
  xp: number
  score: number
}

export interface LevelDefinition {
  id: number
  name: string
  briefing: string
  rows: string[]
  playerSpawn: Vec
  enemySpawns: Vec[]
  enemyTotal: number
  activeEnemyLimit: number
  spawnInterval: number
  roleWeights: RoleWeights
  armoredEnemyRatio: number
  rewards: LevelRewards
}

export interface GridMove {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  elapsed: number
  duration: number
}

export interface Tank {
  id: string
  faction: TankFaction
  team: Team
  role: EnemyRole | null
  col: number
  row: number
  x: number
  y: number
  dir: Direction
  hp: number
  maxHp: number
  speed: number
  reload: number
  reloadTime: number
  aiCooldown: number
  turnCooldown: number
  spawnGrace: number
  scoreValue: number
  shield: number
  rapid: number
  repairCharges: number
  move: GridMove | null
  path: Vec[]
}

export interface Bullet {
  id: string
  owner: TankFaction
  team: Team
  x: number
  y: number
  dir: Direction
  speed: number
  damage: number
  ttl: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface PowerUp {
  id: string
  kind: PowerUpKind
  x: number
  y: number
  ttl: number
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  fire: boolean
}

export interface UpgradeLevels {
  armor: number
  cannon: number
  engine: number
  repairKit: number
}

export interface ProgressionState {
  selectedTeam: Team
  bestScore: number
  xp: number
  credits: number
  unlockedStage: number
  upgrades: UpgradeLevels
}

export interface SettingsState {
  volume: number
  muted: boolean
  colorSafe: boolean
}

export interface FeedbackState {
  shake: number
  flash: number
  levelClearPause: number
  touchControlsVisible: boolean
}

export interface SoundEvent {
  kind: SoundEventKind
}

export interface SavedTank {
  id: string
  faction: TankFaction
  team: Team
  role: EnemyRole | null
  col: number
  row: number
  dir: Direction
  hp: number
  maxHp: number
  reload: number
  reloadTime: number
  aiCooldown: number
  turnCooldown: number
  spawnGrace: number
  scoreValue: number
  shield: number
  rapid: number
  repairCharges: number
}

export interface SavedRun {
  currentLevel: number
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  spawnCursor: number
  spawnTimer: number
  nextId: number
  time: number
  tiles: Tile[][]
  player: SavedTank
  enemies: SavedTank[]
  bullets: Bullet[]
  powerUps: PowerUp[]
  repairCharges: number
}

export interface SaveData {
  schemaVersion: 1
  progression: ProgressionState
  settings: SettingsState
  resumableRun: SavedRun | null
}

export interface SaveStore {
  load: () => SaveData | null
  save: (data: SaveData) => void
}

export interface GameOptions {
  aiEnabled?: boolean
  enemySpawns?: Vec[]
  enemyTotal?: number
  levelDefinitions?: LevelDefinition[]
  levelRows?: string[]
  playerSpawn?: Vec
  saveStore?: SaveStore
  seed?: number
}

export interface GameSnapshot {
  coordinateSystem: string
  mode: GameMode
  menu: {
    title: string
    options: string[]
    selectedIndex: number
    pressedIndex: number | null
    pressProgress: number
  }
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  level: {
    current: number
    name: string
    briefing: string
    unlockedStage: number
    campaignComplete: boolean
    difficulty: {
      enemyTotal: number
      activeEnemyLimit: number
      spawnInterval: number
      armoredEnemyRatio: number
      roleWeights: RoleWeights
    }
  }
  team: {
    player: Team
    enemy: Team
  }
  progression: ProgressionState & {
    hasSavedRun: boolean
    upgradeStats: {
      maxHp: number
      reloadTime: number
      bulletDamage: number
      moveDuration: number
      repairCharges: number
    }
  }
  settings: SettingsState
  loading: {
    progress: number
    duration: number
    readyToProceed: boolean
    tip: string
    targetLevel: {
      id: number
      name: string
    }
  } | null
  feedback: FeedbackState
  player: {
    col: number
    row: number
    x: number
    y: number
    dir: Direction
    hp: number
    moving: boolean
    shield: number
    rapid: number
    repairCharges: number
  }
  enemies: Array<{
    id: string
    role: EnemyRole | null
    team: Team
    col: number
    row: number
    x: number
    y: number
    dir: Direction
    hp: number
    moving: boolean
  }>
  bullets: Array<{
    owner: TankFaction
    team: Team
    x: number
    y: number
    dir: Direction
  }>
  powerUps: Array<{
    kind: PowerUpKind
    x: number
    y: number
  }>
  terrain: {
    brick: number
    steel: number
    water: number
    base: number
  }
}

export interface RenderState {
  mode: GameMode
  menu: {
    title: string
    options: string[]
    selectedIndex: number
    pressedIndex: number | null
    pressProgress: number
    helper: string[]
  }
  time: number
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  level: LevelDefinition
  currentLevel: number
  campaignComplete: boolean
  progression: ProgressionState
  settings: SettingsState
  loading: {
    progress: number
    duration: number
    readyToProceed: boolean
    tip: string
    targetLevel: LevelDefinition
  } | null
  feedback: FeedbackState
  upgradeStats: {
    maxHp: number
    reloadTime: number
    bulletDamage: number
    moveDuration: number
    repairCharges: number
  }
  hasSavedRun: boolean
  playerTeam: Team
  enemyTeam: Team
  tiles: Tile[][]
  player: Tank
  enemies: Tank[]
  bullets: Bullet[]
  particles: Particle[]
  powerUps: PowerUp[]
}
