import type { BotDifficultyConfig } from './ai/botTypes.ts'

export type Direction = 'up' | 'right' | 'down' | 'left'
export type GameMode =
  | 'main-menu'
  | 'level-select'
  | 'team-select'
  | 'tank-select'
  | 'garage'
  | 'settings'
  | 'online-menu'
  | 'briefing'
  | 'encyclopedia'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'level-complete'
  | 'campaign-complete'
  | 'won'
  | 'lost'
export type TankFaction = 'player' | 'enemy'
export type Team = 'blue' | 'red'
export type CombatSide = 'player' | 'enemy' | 'neutral'
export type TankClassId = 'scout' | 'engineer' | 'battle'
export type EnemyRole = 'base_attacker' | 'hunter' | 'wall_breaker'
export type ObjectiveMode = 'defense' | 'team-battle' | 'ctf' | 'ffa' | 'assault'
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'trees' | 'base' | 'radio' | 'depot' | 'road' | 'ammo'
export type PowerUpKind = 'repair' | 'rapid' | 'shield'
export type UpgradeKind = 'armor' | 'cannon' | 'engine' | 'repairKit'
export type OfflineDeployableKind = 'decoy' | 'mine' | 'noise' | 'steel' | 'tripwire'
export type EncyclopediaVisualKind =
  | 'player-tank'
  | 'basic-tank'
  | 'scout-tank'
  | 'breaker-tank'
  | 'armored-tank'
  | 'defense-base'
  | 'team-battle'
  | 'ctf-flag'
  | 'ffa-star'
  | 'assault-core'
  | 'repair'
  | 'rapid'
  | 'shield'
  | 'relay'
  | 'portable-relay'
  | 'decoy'
  | 'mine'
  | 'noise'
  | 'steel-trap'
  | 'tripwire'
  | 'brick'
  | 'steel'
  | 'water'
  | 'trees'
  | 'base'
  | 'radio'
  | 'depot'
  | 'road'
  | 'ammo'
  | 'controls'
  | 'campaign'
  | 'online'
export type FeedbackNoticeKind = 'pickup' | 'repair' | 'reward' | 'upgrade' | 'ammo'
export type TacticalStyle =
  | 'Fortress'
  | 'Surgeon'
  | 'Sniper'
  | 'Bulldozer'
  | 'Raider'
  | 'Guardian'
  | 'Opportunist'
  | 'Last Wall'
  | 'Pyrrhic Victory'
  | 'Reckless Victory'
  | 'Failed Defense'
export type VictoryQuality = 'Clean Win' | 'Controlled Win' | 'Costly Win' | 'Last Wall' | 'Pyrrhic Victory' | 'Failed Defense'
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

export interface FlagObjectiveDefinition {
  playerBase: Vec
  enemyFlag: Vec
  capturesToWin: number
}

export interface AssaultObjectiveDefinition {
  cell: Vec
  hp: number
}

export interface LevelObjective {
  mode: ObjectiveMode
  label: string
  briefing: string
  winCondition: string
  friendlySpawns?: Vec[]
  friendlyTotal?: number
  enemyTickets?: number
  neutralSpawns?: Vec[]
  neutralTotal?: number
  targetScore?: number
  flag?: FlagObjectiveDefinition
  assault?: AssaultObjectiveDefinition
}

export interface LevelDefinition {
  id: number
  name: string
  briefing: string
  objective: LevelObjective
  rows: string[]
  playerSpawn: Vec
  enemySpawns: Vec[]
  retranslators?: Vec[]
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
  classId: TankClassId | null
  side: CombatSide
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
  slow: number
  immobilized: number
  move: GridMove | null
  path: Vec[]
}

export interface Bullet {
  id: string
  owner: TankFaction
  ownerId?: string
  side?: CombatSide
  team: Team
  x: number
  y: number
  dir: Direction
  speed: number
  damage: number
  ttl: number
  splashDamage?: number
  splashRadius?: number
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

export type OfflineVisionCircleKind = 'self' | 'teammate' | 'relay'

export interface OfflineVisibleCell {
  col: number
  row: number
}

export interface OfflineVisionCircle {
  id: string
  kind: OfflineVisionCircleKind
  x: number
  y: number
  radius: number
}

export type PortableRelayHoldAction = 'place' | 'recover'

export interface PortableRelayHoldSnapshot {
  action: PortableRelayHoldAction
  col: number
  row: number
  progress: number
  duration: number
  remaining: number
  label: string
}

export interface PortableSignalWaveSnapshot {
  id: string
  x: number
  y: number
  previousX: number
  previousY: number
  age: number
  ttl: number
  strength: number
  bounces: number
}

export interface PortableSignalContactSnapshot {
  id: string
  kind: 'wall' | 'hostile'
  col: number
  row: number
  x: number
  y: number
  age: number
  ttl: number
  strength: number
  team?: Team
}

export interface PortableRelaySnapshot {
  available: boolean
  deployed: boolean
  col: number | null
  row: number | null
  activeCount: number
  limit: number
  relays: Array<{ id: string; col: number; row: number }>
  status: 'ready' | 'deployed' | 'placing' | 'recovering'
  label: string
  hold: PortableRelayHoldSnapshot | null
  waveCount: number
  signalContacts: PortableSignalContactSnapshot[]
  waves: PortableSignalWaveSnapshot[]
}

export type OfflineDeployableHoldAction = 'place' | 'recover'

export interface OfflineDeployableHoldSnapshot {
  kind: OfflineDeployableKind
  action: OfflineDeployableHoldAction
  key: string
  col: number
  row: number
  progress: number
  duration: number
  remaining: number
  label: string
}

export interface OfflineDeployableSnapshot {
  id: string
  kind: OfflineDeployableKind
  col: number
  row: number
  owner: CombatSide
  label: string
}

export interface OfflineDeployableAlertSnapshot {
  id: string
  kind: Exclude<OfflineDeployableKind, 'decoy' | 'mine'>
  side: CombatSide
  team: Team
  col: number
  row: number
  age: number
  ttl: number
  strength: number
  label: string
}

export interface OfflineDeployablesSnapshot {
  active: OfflineDeployableSnapshot[]
  available: OfflineDeployableKind[]
  hold: OfflineDeployableHoldSnapshot | null
  alerts: OfflineDeployableAlertSnapshot[]
  label: string
}

export interface OfflineRetranslator {
  id: string
  col: number
  row: number
  owner: CombatSide | null
  captureSide: CombatSide | null
  progress: number
}

export interface OfflineVisionMemory {
  id: string
  side: CombatSide
  team: Team
  col: number
  row: number
  seenAt: number
  alert?: boolean
  source?: OfflineDeployableKind
}

export interface OfflineFogSnapshot {
  shape: 'circular'
  visibleCellCount: number
  hiddenCellCount: number
  visibleRetranslatorCount: number
  ownedRetranslatorCount: number
  totalRetranslatorCount: number
  visionCircleCount: number
  teamVisionMode: 'solo' | 'linked'
  teamVisionMerged: boolean
  lastKnownCount: number
}

export interface OfflineVisionSnapshot {
  circles: OfflineVisionCircle[]
  visibleCells: OfflineVisibleCell[]
  alwaysVisibleCells: OfflineVisibleCell[]
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  fire: boolean
  relay: boolean
  decoy: boolean
  mine: boolean
  noise: boolean
  steel: boolean
  tripwire: boolean
}

export interface UpgradeLevels {
  armor: number
  cannon: number
  engine: number
  repairKit: number
}

export interface ProgressionState {
  selectedTeam: Team
  selectedTankClass: TankClassId
  bestScore: number
  xp: number
  credits: number
  unlockedStage: number
  completedLevels: number[]
  upgrades: UpgradeLevels
}

export interface SettingsState {
  volume: number
  muted: boolean
  colorSafe: boolean
}

export interface FeedbackNotice {
  id: string
  kind: FeedbackNoticeKind
  text: string
  age: number
  duration: number
  x: number | null
  y: number | null
}

export interface FeedbackState {
  shake: number
  flash: number
  levelClearPause: number
  touchControlsVisible: boolean
  heldButtons: InputState
  notices: FeedbackNotice[]
}

export interface RewardLedger {
  killScore: number
  killCredits: number
  killXp: number
  pickupScore: number
  objectiveScore: number
  missionScore: number
  missionCredits: number
  missionXp: number
  tacticalCredits: number
  tacticalXp: number
  totalScore: number
  totalCredits: number
  totalXp: number
}

export interface RunStats {
  duration: number
  shotsFired: number
  tankHits: number
  bricksDestroyed: number
  playerKills: number
  armoredKills: number
  livesLost: number
  repairKitUses: number
  baseDamageTaken: number
  criticalCoverDestroyed: number
  objectiveRelevantPowerUps: number
  friendlyTotal: number
  friendlySurvivors: number
  powerUps: Record<PowerUpKind, number>
  ctfCaptures: number
  assaultDamage: number
  shellsRecharged: number
  shrapnelHits: number
  portableRelaysPlaced: number
  portableRelaysRecovered: number
  portableSignalContacts: number
  deployablesPlaced: Record<OfflineDeployableKind, number>
  deployablesRecovered: Record<OfflineDeployableKind, number>
  deployablesTriggered: Record<OfflineDeployableKind, number>
  rewards: RewardLedger
}

export interface TacticalEvaluation {
  style: TacticalStyle
  quality: VictoryQuality
  reasons: string[]
  metrics: {
    accuracy: number
    structuralDamage: number
    criticalCoverDestroyed: number
    objectiveIntegrity: number
    survivalCost: number
    powerupRelevance: number
    friendlySurvival: number | null
    objectivePressure: number
  }
  objectiveInterpretation: string
  rewardModifier: {
    creditsMultiplier: number
    xpMultiplier: number
    creditsBonus: number
    xpBonus: number
    explanation: string
  }
}

export interface UpgradePresentation {
  kind: UpgradeKind
  label: string
  level: number
  maxLevel: number
  cost: number | null
  canAfford: boolean
  isMaxed: boolean
  description: string
  currentEffect: string
  nextEffect: string | null
}

export interface LevelResult {
  levelId: number
  levelName: string
  objectiveMode: ObjectiveMode
  objectiveLabel: string
  winCondition: string
  campaignComplete: boolean
  duration: number
  score: number
  bestScore: number
  unlockedStage: number
  completedLevels: number[]
  stats: RunStats
  rewards: RewardLedger
  tactical: TacticalEvaluation
}

export interface SoundEvent {
  kind: SoundEventKind
}

export interface SavedTank {
  id: string
  faction: TankFaction
  classId?: TankClassId
  side?: CombatSide
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
  slow?: number
  immobilized?: number
}

export interface EncyclopediaEntryPresentation {
  label: string
  description: string
  visual: EncyclopediaVisualKind
}

export interface EncyclopediaPresentation {
  activeTopic: string | null
  title: string
  summary: string[]
  entries: EncyclopediaEntryPresentation[]
}

export interface SavedOfflineDeployable {
  id?: string
  kind?: OfflineDeployableKind
  col?: number
  row?: number
  owner?: CombatSide
  safeTankId?: string
}

export interface SavedOfflineDeployableAlert {
  id?: string
  kind?: OfflineDeployableAlertSnapshot['kind']
  side?: CombatSide
  team?: Team
  col?: number
  row?: number
  age?: number
  ttl?: number
  strength?: number
}

export interface SavedObjectiveState {
  mode: ObjectiveMode
  label: string
  winCondition: string
  playerScore: number
  enemyScore: number
  neutralScore: number
  targetScore: number
  flag: {
    playerBase: Vec
    enemyHome: Vec
    position: Vec
    carrierId: string | null
    captures: number
    capturesToWin: number
  } | null
  assault: {
    cell: Vec
    hp: number
    maxHp: number
  } | null
}

export interface SavedRun {
  currentLevel: number
  tankClass?: TankClassId
  score: number
  lives: number
  baseHp: number
  enemiesRemaining: number
  spawnCursor: number
  spawnTimer: number
  friendlyRespawnTimer?: number
  nextId: number
  time: number
  tiles: Tile[][]
  player: SavedTank
  enemies: SavedTank[]
  bullets: Bullet[]
  powerUps: PowerUp[]
  repairCharges: number
  playerShells?: number
  playerShellCapacity?: number
  playerShellRechargeProgress?: number
  portableRelay?: {
    deployed?: boolean
    col?: number
    row?: number
  }
  portableRelays?: Array<{
    id?: string
    deployed?: boolean
    col?: number
    row?: number
  }>
  deployables?: SavedOfflineDeployable[]
  deployableAlerts?: SavedOfflineDeployableAlert[]
  retranslators?: OfflineRetranslator[]
  visionMemory?: Partial<Record<CombatSide, Record<string, OfflineVisionMemory>>>
  objective?: SavedObjectiveState
  runStats?: RunStats
}

export interface WaterNeighbors {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
}

export interface RoadNeighbors {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
}

export type LevelReadabilityMarkerKind =
  | 'player-spawn'
  | 'friendly-spawn'
  | 'enemy-spawn'
  | 'neutral-spawn'
  | 'defense-base'
  | 'flag-home'
  | 'flag-target'
  | 'assault-core'
  | 'critical-cover'

export interface LevelReadabilityMarker {
  kind: LevelReadabilityMarkerKind
  label: string
  col: number
  row: number
  team: Team | 'neutral' | null
  priority: 'primary' | 'secondary'
  visible: boolean
}

export interface LevelReadabilitySummary {
  objectiveMarkerCount: number
  spawnMarkerCount: number
  criticalCoverCount: number
  visibleMarkers: number
  hiddenMarkers: number
  markers: LevelReadabilityMarker[]
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
  botDifficulty?: Partial<BotDifficultyConfig>
  enemySpawns?: Vec[]
  enemyTotal?: number
  levelDefinitions?: LevelDefinition[]
  levelRows?: string[]
  playerSpawn?: Vec
  retranslators?: Vec[]
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
    helper: string[]
  }
  encyclopedia: EncyclopediaPresentation | null
  score: number
  lives: number
  baseHp: number
  baseMaxHp: number
  enemiesRemaining: number
  ai: {
    policy: 'visible-fire-scout-uncertainty'
    activeBotCount: number
    activeBeliefCount: number
    uncertainContactCount: number
    visibleAttackContactCount: number
    hiddenCoordinateLeak: false
  }
  fog: OfflineFogSnapshot
  vision: OfflineVisionSnapshot
  retranslators: OfflineRetranslator[]
  lastKnown: OfflineVisionMemory[]
  portableRelay: PortableRelaySnapshot
  deployables: OfflineDeployablesSnapshot
  map: {
    cols: number
    rows: number
    viewportCols: number
    viewportRows: number
  }
  camera: {
    current: { col: number; row: number }
    target: { col: number; row: number }
    smoothingMs: number
  }
  level: {
    current: number
    name: string
    briefing: string
    unlockedStage: number
    campaignComplete: boolean
    difficulty: {
      objectiveMode: ObjectiveMode
      winCondition: string
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
      tankClass: TankClassId
      maxHp: number
      shield: number
      reloadTime: number
      bulletDamage: number
      moveDuration: number
      repairCharges: number
      splashDamage?: number
      splashRadius?: number
    }
  }
  tankClasses: {
    selected: TankClassId
    active: TankClassId
    options: TankClassPresentation[]
  }
  garage: {
    selectedUpgrade: UpgradePresentation | null
    upgrades: UpgradePresentation[]
  } | null
  settings: SettingsState
  objective: SavedObjectiveState & {
    selectableLevels: number[]
    completedLevels: number[]
  }
  onboarding: {
    firstLevel: boolean
    objective: string
    controls: string
    recovery: string
  }
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
  runStats: RunStats
  results: LevelResult | null
  player: {
    classId: TankClassId
    classLabel: string
    col: number
    row: number
    x: number
    y: number
    dir: Direction
    hp: number
    reload: number
    reloadTime: number
    moving: boolean
    shield: number
    rapid: number
    repairCharges: number
    shells: number
    shellCapacity: number
    shellRechargeProgress: number
    shellRechargeDuration: number
    onAmmoStation: boolean
    portableRelay: PortableRelaySnapshot
    deployables: OfflineDeployablesSnapshot
  }
  enemies: Array<{
    id: string
    role: EnemyRole | null
    side: CombatSide
    team: Team
    col: number
    row: number
    x: number
    y: number
    dir: Direction
    hp: number
    maxHp: number
    moving: boolean
  }>
  bullets: Array<{
    owner: TankFaction
    team: Team
    x: number
    y: number
    dir: Direction
    speed: number
    damage: number
    ttl: number
    splashDamage?: number
    splashRadius?: number
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
    radio: number
    depot: number
    road: number
    ammo: number
  }
  readability: LevelReadabilitySummary
  readableText: {
    screen: GameMode
    title: string
    menuOptions: string[]
    helper: string[]
    hud: {
      team: string
      tankClass: string
      link: string
      score: string
      health: string
      lives: string
      enemies: string
      level: string
      credits: string
      objective: string
        shells: string
        recharge: string
        relay: string
        gear: string
        alerts: string
    }
    touch: {
      visible: boolean
      labels: string[]
    }
    levelMarkers: {
      visible: string[]
      offscreenPrimary: string[]
      labels: string[]
    }
    results: string[]
    encyclopedia: {
      activeTopic: string | null
      entries: string[]
    }
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
  encyclopedia: EncyclopediaPresentation | null
  time: number
  score: number
  lives: number
  baseHp: number
  baseMaxHp: number
  enemiesRemaining: number
  activeEnemyCount: number
  fog: OfflineFogSnapshot
  vision: OfflineVisionSnapshot
  retranslators: OfflineRetranslator[]
  lastKnown: OfflineVisionMemory[]
  portableRelay: PortableRelaySnapshot
  deployables: OfflineDeployablesSnapshot
  map: {
    cols: number
    rows: number
    viewportCols: number
    viewportRows: number
  }
  camera: {
    current: { col: number; row: number }
    target: { col: number; row: number }
    smoothingMs: number
  }
  level: LevelDefinition
  currentLevel: number
  campaignComplete: boolean
  progression: ProgressionState
  settings: SettingsState
  objective: SavedObjectiveState
  selectableLevels: number[]
  loading: {
    progress: number
    duration: number
    readyToProceed: boolean
    tip: string
    targetLevel: LevelDefinition
  } | null
  feedback: FeedbackState
  upgradeStats: {
    tankClass: TankClassId
    maxHp: number
    shield: number
    reloadTime: number
    bulletDamage: number
    moveDuration: number
    repairCharges: number
    splashDamage?: number
    splashRadius?: number
  }
  tankClasses: {
    selected: TankClassId
    active: TankClassId
    options: TankClassPresentation[]
  }
  garage: {
    selectedUpgrade: UpgradePresentation | null
    upgrades: UpgradePresentation[]
  } | null
  runStats: RunStats
  results: LevelResult | null
  hasSavedRun: boolean
  playerShells: number
  playerShellCapacity: number
  playerShellRechargeProgress: number
  playerShellRechargeDuration: number
  playerOnAmmoStation: boolean
  playerTeam: Team
  enemyTeam: Team
  readability: LevelReadabilitySummary
  tiles: Tile[][]
  player: Tank
  enemies: Tank[]
  bullets: Bullet[]
  particles: Particle[]
  powerUps: PowerUp[]
}

export interface TankClassPresentation {
  id: TankClassId
  label: string
  shortLabel: string
  role: string
  description: string
  selected: boolean
  active: boolean
  stats: string[]
  equipment: string[]
  deployables: OfflineDeployableKind[]
  portableRelayLimit: number
}
