import {
  ARENA_X,
  ARENA_Y,
  BULLET_SIZE,
  DIR_VECTORS,
  DIRECTION_ORDER,
  GRID_COLS,
  GRID_ROWS,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  TANK_SIZE,
  TANK_SELECT_BACK_Y,
  TANK_SELECT_TAB_GAP,
  TANK_SELECT_TAB_HEIGHT,
  TANK_SELECT_TAB_WIDTH,
  TANK_SELECT_TAB_X,
  TANK_SELECT_TAB_Y,
  TILE_SIZE,
  clamp,
  gridToTankPosition,
  rectsIntersect,
  tankCenter,
  tankRect,
} from './constants.ts'
import {
  BASE_MAX_HP,
  CAMPAIGN_LEVELS,
  DEFAULT_ENEMY_SPAWNS,
  DEFAULT_LEVEL_ROWS,
  DEFAULT_OBJECTIVE,
  DEFAULT_PLAYER_SPAWN,
  TERRAIN_EVIDENCE_TEST_LEVEL_ID,
  createTiles,
} from './level.ts'
import {
  SELECTED_TERRAIN_EVIDENCE_IDS,
  TERRAIN_TYPE_IDS,
  isPassableTerrain,
  isProjectileBlockingTerrain,
  terrainDefinition,
} from './terrain.ts'
import {
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  clampBattlefieldCameraFractional,
  type BattlefieldCamera,
} from './battlefield.ts'
import { createBrowserSaveStore, createDefaultSaveData } from './save.ts'
import {
  DEFAULT_TANK_CLASS,
  TANK_CLASS_DEFINITIONS,
  TANK_CLASS_ORDER,
  getTankClassDefinition,
  normalizeTankClassId,
} from './tankClasses.ts'
import { evaluateTacticalVictory } from './tacticalEvaluation.ts'
import { buildLevelReadabilitySummary } from './levelReadability.ts'
import { chooseBotBehavior } from './ai/botBehaviors.ts'
import { evaluateFireControl } from './ai/fireControl.ts'
import { updateBotBeliefs } from './ai/botMemory.ts'
import { buildBotPercepts } from './ai/botPerception.ts'
import { scoreBotIntentions } from './ai/botUtility.ts'
import { findWeightedPath, isBreakerWallPlanUseful } from './ai/pathfinding.ts'
import { normalizeBotDifficulty, roleProfileForEnemyRole } from './ai/botTypes.ts'
import type {
  Bullet,
  CombatSide,
  Direction,
  EmpEmitterSnapshot,
  EncyclopediaEntryPresentation,
  EncyclopediaPresentation,
  EnemyRole,
  FeedbackNotice,
  GameMode,
  GameOptions,
  GameSnapshot,
  InputState,
  LevelDefinition,
  LevelReadabilityMarker,
  LevelReadabilitySummary,
  LevelResult,
  OfflineDeployableAlertSnapshot,
  OfflineDeployableHoldAction,
  OfflineDeployableKind,
  OfflineDeployableSnapshot,
  OfflineDeployablesSnapshot,
  OfflineFogSnapshot,
  MajorModKind,
  MajorModPresentation,
  MajorModsSnapshot,
  OfflineRetranslator,
  OfflineVisionCircle,
  OfflineVisionMemory,
  OfflineVisionSnapshot,
  OfflineVisibleCell,
  Particle,
  PortableRelayHoldAction,
  PortableRelaySnapshot,
  PortableSignalContactSnapshot,
  PortableSignalWaveSnapshot,
  PowerUp,
  PowerUpKind,
  ProgressionState,
  RewardLedger,
  RenderState,
  RunStats,
  SaveData,
  SaveStore,
  SavedObjectiveState,
  SavedRun,
  SavedTank,
  SettingsState,
  SoundEvent,
  SoundEventKind,
  Tank,
  TankClassId,
  TankClassPresentation,
  Team,
  TacticalEvaluation,
  TerrainEvidenceKind,
  TerrainEvidenceSnapshot,
  Tile,
  TileKind,
  TreadTrackSnapshot,
  Vec,
} from './types.ts'
import type {
  BotActor,
  BotDecision,
  BotDifficultyConfig,
  BotFireTarget,
  BotIntentionScore,
  BotObjectiveInfo,
  BotPathGrid,
  BotPathOptions,
  BotPathResult,
  BotRoleKind,
  ContactBelief,
} from './ai/botTypes.ts'

const EMPTY_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  relay: false,
  mod: false,
  decoy: false,
  mine: false,
  noise: false,
  steel: false,
  tripwire: false,
}

const MAJOR_MOD_ORDER: MajorModKind[] = ['overdrive', 'pontoon', 'hedgehog', 'emp']
const DEPLOYABLE_ORDER: OfflineDeployableKind[] = ['decoy', 'mine', 'noise', 'steel', 'tripwire']
const DEPLOYABLE_INPUTS: Record<OfflineDeployableKind, keyof InputState> = {
  decoy: 'decoy',
  mine: 'mine',
  noise: 'noise',
  steel: 'steel',
  tripwire: 'tripwire',
}
const DEPLOYABLE_KEYS: Record<OfflineDeployableKind, string> = {
  decoy: '1',
  mine: '2',
  noise: '3',
  steel: '4',
  tripwire: '5',
}
const DEPLOYABLE_LABELS: Record<OfflineDeployableKind, string> = {
  decoy: 'DECOY',
  mine: 'MINE',
  noise: 'NOISE',
  steel: 'TRAP',
  tripwire: 'WIRE',
}
const MAJOR_MOD_LABELS: Record<MajorModKind, string> = {
  overdrive: 'Overdrive',
  pontoon: 'Pontoon Bridge',
  hedgehog: 'Czech Hedgehog',
  emp: 'EMP Emitter',
}
const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1]
const LOADING_DURATION = 1.2
const MENU_PRESS_DURATION = 0.12
const FEEDBACK_NOTICE_DURATION = 1.4
const TREAD_TRACK_FOG_FADE_SECONDS = 0.8
const PLAYER_BASE_RELOAD = 1.6
const PLAYER_RAPID_RELOAD_BONUS = 0.25
const PLAYER_RAPID_MIN_RELOAD = 0.75
const PLAYER_BASE_MOVE_DURATION = 0.38
const ENEMY_MOVE_DURATION = 0.5
const ENEMY_WALL_BREAKER_RELOAD = 1.15
const ENEMY_DEFAULT_RELOAD = 1.35
const ENEMY_INITIAL_AI_COOLDOWN = 0.24
const ENEMY_AI_COOLDOWN_BASE = 0.24
const ENEMY_AI_COOLDOWN_RANDOM = 0.18
const ENEMY_NORMAL_MAX_HP = 4
const ENEMY_ARMORED_MAX_HP = 5
const FRIENDLY_BOT_MAX_HP = 3
const FRIENDLY_RESPAWN_RETRY_SECONDS = 0.75
const OFFLINE_CAMERA_SMOOTHING_MS = 180
const PLAYER_MAX_SHELLS = 10
const PLAYER_MAX_SHIELD = 6
const PLAYER_SHELL_RECHARGE_DURATION = 2
const PLAYER_SHELL_SPLASH_DAMAGE = 1
const PLAYER_SHELL_SPLASH_RADIUS = 40
const PLAYER_BULLET_SPEED = 240
const ENEMY_BULLET_SPEED = 145
const PLAYER_SHELL_TTL = 2.05
const ENEMY_BULLET_TTL = 2.9
const OFFLINE_PLAYER_VISION_RADIUS = 2.75
const OFFLINE_RELAY_VISION_RADIUS = 4.25
const OFFLINE_RELAY_CAPTURE_SECONDS = 3.6
const OFFLINE_LAST_KNOWN_SECONDS = 3
const BOT_SCOUTING_STANDOFF_DISTANCE = 2
const BOT_SCOUTING_GOAL_LIMIT = 6
const BOT_SUSPICION_DANGER_CONFIDENCE = 0.32
const PORTABLE_RELAY_PLACE_SECONDS = 1.2
const PORTABLE_RELAY_RECOVER_SECONDS = 0.9
const PORTABLE_RELAY_SIGNAL_STRENGTH = 1
const PORTABLE_RELAY_PULSE_PERIOD = 1.5
const PORTABLE_RELAY_WAVE_TTL = 1.8
const PORTABLE_RELAY_WAVE_SPEED = 110
const PORTABLE_RELAY_RAY_COUNT = 32
const PORTABLE_RELAY_MAX_BOUNCES = 2
const PORTABLE_RELAY_BOUNCE_STRENGTH = 0.55
const PORTABLE_RELAY_CONTACT_TTL = 1
const PORTABLE_RELAY_MIN_STRENGTH = 0.18
const ECHO_PLAYER_SIGNAL_START_RADIUS = 6
const ECHO_HIDDEN_SIGNAL_START_RADIUS = 6
const ECHO_SIGNAL_RAY_COUNT = 10
const TERRAIN_EVIDENCE_SENTINEL_ID = 'terrain-evidence-patrol'
const TERRAIN_EVIDENCE_SENTINEL_HP = 99
const TERRAIN_EVIDENCE_SENTINEL_INITIAL_DELAY = 1.8
const TERRAIN_EVIDENCE_SENTINEL_STEP_DELAY = 0.3
const TERRAIN_EVIDENCE_SENTINEL_PATROL: Vec[] = [
  { x: 8, y: 13 },
  { x: 8, y: 12 },
  { x: 8, y: 11 },
  { x: 8, y: 10 },
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
  { x: 7, y: 9 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12 },
]
const DEPLOYABLE_PLACE_SECONDS = 0.9
const DEPLOYABLE_RECOVER_SECONDS = 0.7
const DEPLOYABLE_ALERT_TTL = 4
const DEPLOYABLE_ALERT_MEMORY_TTL = OFFLINE_LAST_KNOWN_SECONDS
const MINE_TRIGGER_RADIUS = 1
const MINE_DAMAGE = 2
const MINE_SLOW_SECONDS = 10
const MINE_SLOW_MULTIPLIER = 1.7
const STEEL_TRAP_SECONDS = 5
const OVERDRIVE_COOLDOWN_SECONDS = 12
const HEDGEHOG_REQUIRED_HITS = 5
const HEDGEHOG_TRAP_SECONDS = 9999
const EMP_RADIUS_TILES = 4
const EMP_PULSE_PERIOD_SECONDS = 15
const EMP_DISRUPT_SECONDS = 3
const EMP_VISION_FADE_SECONDS = 0.75
const LOADING_TIPS = [
  'WASD or arrows move one tile at a time.',
  'Space fires in the direction your tank faces.',
  'Hold E to place or recover your portable relay.',
  'P pauses for Save And Quit or Restart.',
  'Esc backs out of briefing or loading before the fight.',
  'Protect the eagle base; enemy shots can break it.',
  'Clear enemy tanks to finish defense missions.',
  'Garage Mods change routes, timing, traps, and relay pressure.',
  'Touch controls appear after the first touch input.',
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

interface PontoonBridgeState {
  cells: Vec[]
  dir: Direction
}

interface HedgehogState {
  col: number
  row: number
  hitsTaken: number
  trappedTankId: string | null
}

interface EmpEmitterState {
  col: number
  row: number
  nextPulseIn: number
  disruptingUntil: number
}

interface MajorModRuntimeState {
  overdriveRemaining: number
  overdriveCooldown: number
  pontoon: PontoonBridgeState | null
  hedgehog: HedgehogState | null
  hedgehogSpent: boolean
  emp: EmpEmitterState | null
}

interface TreadTrackState {
  id: string
  tankId: string
  col: number
  row: number
  dir: Direction
  team: Team
  weight: TreadTrackSnapshot['weight']
  age: number
  ttl: number
  visibility: number
  lastSeenAt: number
  overdrive: boolean
  surface: TileKind
}

interface TerrainEvidenceState {
  id: string
  kind: TerrainEvidenceKind
  side: CombatSide
  sourceTeam: Team
  col: number
  row: number
  dir?: Direction
  age: number
  ttl: number
  strength: number
  label: string
}

interface MenuItem {
  id: string
  label: string
}

type EncyclopediaTopicId = 'overview' | 'controls' | 'tanks' | 'objectives' | 'equipment' | 'terrain'

interface EncyclopediaTopic extends MenuItem {
  id: EncyclopediaTopicId | 'back'
  helper: string[]
  summary: string[]
  entries: EncyclopediaEntryPresentation[]
}

interface PendingMenuPress {
  index: number
  elapsed: number
  duration: number
}

const ENCYCLOPEDIA_TOPICS: EncyclopediaTopic[] = [
  {
    id: 'overview',
    label: 'Overview',
    helper: [
      'Tanchiki is a top-down tank campaign of lanes, vision, and objectives.',
      'Garage Mods change routes, tempo, traps, and relay pressure.',
      'Win by defending, capturing, outscoring, or breaking the target.',
    ],
    summary: [
      'A quick visual map of the main loops: campaign, Mods, team vision, and objective pressure.',
    ],
    entries: [
      { label: 'Campaign', description: 'Clear missions, protect goals, and earn credits.', visual: 'campaign' },
      { label: 'Garage', description: 'Choose one Major Mod without permanent stat growth.', visual: 'player-tank' },
      { label: 'Online', description: 'Team color and shared sight matter in quick battles.', visual: 'online' },
      { label: 'Objectives', description: 'Every mode changes what a good push means.', visual: 'defense-base' },
    ],
  },
  {
    id: 'controls',
    label: 'Controls',
    helper: [
      'Move with WASD/Arrows. Your tank turns, then advances one tile.',
      'Fire with Space. X activates the Garage Mod; Hold E handles relay.',
      'P opens pause for Save And Quit or Restart. Esc backs out before launch.',
    ],
    summary: [
      'Controls are tile-based and deliberate: turn, advance, fire, place gear, or back out safely.',
    ],
    entries: [
      { label: 'Move', description: 'WASD or arrows turn first, then advance one tile.', visual: 'controls' },
      { label: 'Fire', description: 'Space fires the cannon along the current facing.', visual: 'player-tank' },
      { label: 'Mod', description: 'X activates the selected Major Mod.', visual: 'depot' },
      { label: 'Relay', description: 'Hold E to place or recover portable scouting sight.', visual: 'portable-relay' },
      { label: 'Gear', description: 'Keys 1-5 place decoy, mine, noise, steel, and tripwire.', visual: 'mine' },
      { label: 'Pause', description: 'P opens Save And Quit or Restart; Esc backs out.', visual: 'controls' },
    ],
  },
  {
    id: 'tanks',
    label: 'Tanks',
    helper: [
      'Tank classes keep fixed strengths and fixed class gear.',
      'Basic tanks pressure the base; Scouts hunt; Breakers open lanes.',
      'Armored enemies take more punishment and pay higher rewards.',
    ],
    summary: [
      'Tank silhouettes and roles are different enough to read at a glance during a push.',
    ],
    entries: [
      { label: 'Player', description: 'Class plus one Garage Mod shapes the mission.', visual: 'player-tank' },
      { label: 'Basic', description: 'Pressures the base and fills lanes.', visual: 'basic-tank' },
      { label: 'Scout', description: 'Hunts fast and forces movement.', visual: 'scout-tank' },
      { label: 'Breaker', description: 'Opens brick lanes and cover.', visual: 'breaker-tank' },
      { label: 'Armored', description: 'Extra hits, higher rewards.', visual: 'armored-tank' },
    ],
  },
  {
    id: 'objectives',
    label: 'Objectives',
    helper: [
      'Defense protects the eagle base while clearing hostile tanks.',
      'Team Battle drains enemy tickets with allies on your side.',
      'CTF returns flags, FFA rewards kills, Assault breaks the core.',
    ],
    summary: [
      'Game types change the target: defend, drain tickets, capture, survive, or break the core.',
    ],
    entries: [
      { label: 'Defense', description: 'Protect the eagle base and clear the wave.', visual: 'defense-base' },
      { label: 'Team Battle', description: 'Fight with allies and drain enemy tickets.', visual: 'team-battle' },
      { label: 'CTF', description: 'Steal the flag and return it to score.', visual: 'ctf-flag' },
      { label: 'FFA', description: 'Survive and reach the kill target first.', visual: 'ffa-star' },
      { label: 'Assault', description: 'Punch through defenses and break the core.', visual: 'assault-core' },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    helper: [
      'Repair, rapid-fire, and shield pickups can flip a push.',
      'Relays and retranslators improve sight without replacing objective play.',
      'Prototype gear covers decoys, mines, noise, steel traps, and tripwires.',
    ],
    summary: [
      'Pickups stabilize fights; relays and deployables create temporary tactical advantages.',
    ],
    entries: [
      { label: 'Repair', description: 'Restores health during a push.', visual: 'repair' },
      { label: 'Rapid', description: 'Speeds up short fire windows.', visual: 'rapid' },
      { label: 'Shield', description: 'Absorbs damage while crossing fire.', visual: 'shield' },
      { label: 'Relay', description: 'Extends sight down a lane.', visual: 'relay' },
      { label: 'Deployables', description: 'Decoys, mines, noise, steel, tripwires.', visual: 'mine' },
    ],
  },
  {
    id: 'terrain',
    label: 'Terrain',
    helper: [
      'Brick breaks, steel blocks shells, water blocks tanks, and trees hide.',
      'Radio towers link vision, depots can be destroyed, and roads clarify routes.',
      'Ammo stations recharge shells when you hold position on them.',
    ],
    summary: [
      'Terrain is readable by material: what breaks, blocks, hides, links, or resupplies.',
    ],
    entries: [
      { label: 'Brick', description: 'Breakable cover and lanes.', visual: 'brick' },
      { label: 'Steel', description: 'Hard cover that blocks shells.', visual: 'steel' },
      { label: 'Water/Trees', description: 'Water blocks; trees hide lanes.', visual: 'water' },
      { label: 'Radio', description: 'Linked towers improve sight.', visual: 'radio' },
      { label: 'Ammo', description: 'Hold to recharge shells.', visual: 'ammo' },
    ],
  },
  {
    id: 'back',
    label: 'Back',
    helper: ['Return to the main menu.'],
    summary: ['Return to the main menu.'],
    entries: [],
  },
]

interface LoadingPresentation {
  elapsed: number
  duration: number
  targetLevelId: number
  tip: string
}

interface OfflineCameraState {
  current: BattlefieldCamera
  target: BattlefieldCamera
  smoothingMs: number
}

interface PortableRelayState {
  id: string
  col: number
  row: number
  pulseTimer: number
}

interface PortableRelayHoldState {
  action: PortableRelayHoldAction
  col: number
  row: number
  elapsed: number
  duration: number
}

interface PortableSignalWaveState {
  id: string
  x: number
  y: number
  previousX: number
  previousY: number
  sourceTeam?: Team
  detectsHostiles: boolean
  vx: number
  vy: number
  age: number
  ttl: number
  strength: number
  bounces: number
}

interface PortableSignalContactState {
  id: string
  kind: 'wall' | 'hostile'
  col: number
  row: number
  x: number
  y: number
  age: number
  ttl: number
  strength: number
  tankId?: string
  team?: Team
}

interface OfflineDeployableState {
  id: string
  kind: OfflineDeployableKind
  col: number
  row: number
  owner: CombatSide
  safeTankId?: string
}

interface OfflineDeployableHoldState {
  kind: OfflineDeployableKind
  action: OfflineDeployableHoldAction
  col: number
  row: number
  elapsed: number
  duration: number
}

interface OfflineDeployableAlertState {
  id: string
  kind: OfflineDeployableAlertSnapshot['kind']
  side: CombatSide
  team: Team
  col: number
  row: number
  age: number
  ttl: number
  strength: number
}

type EnemyDecisionOutcome = 'moved' | 'acted' | 'idle'
type OfflineVisionModel = OfflineVisionSnapshot & { visibleSet: Set<string>; alwaysVisibleSet: Set<string> }

export class TanchikiGame {
  private readonly aiEnabled: boolean
  private readonly botDifficulty: BotDifficultyConfig
  private readonly levels: LevelDefinition[]
  private readonly saveStore: SaveStore
  private bullets: Bullet[] = []
  private enemies: Tank[] = []
  private enemiesRemaining = 18
  private input: InputState = { ...EMPTY_INPUT }
  private lives = 3
  private menuIndex = 0
  private mode: GameMode = 'main-menu'
  private encyclopediaTopicId: EncyclopediaTopicId | null = null
  private tankSelectReturnMode: 'main-menu' | 'garage' = 'main-menu'
  private nextId = 1
  private particles: Particle[] = []
  private player: Tank
  private playerShellCapacity = PLAYER_MAX_SHELLS
  private playerShellRechargeProgress = 0
  private playerShells = PLAYER_MAX_SHELLS
  private camera: OfflineCameraState = {
    current: { col: 0, row: 0 },
    target: { col: 0, row: 0 },
    smoothingMs: OFFLINE_CAMERA_SMOOTHING_MS,
  }
  private powerUps: PowerUp[] = []
  private portableRelays: PortableRelayState[] = []
  private portableRelayHold: PortableRelayHoldState | null = null
  private portableRelayInputConsumed = false
  private portableSignalWaves: PortableSignalWaveState[] = []
  private portableSignalContacts: PortableSignalContactState[] = []
  private deployables: OfflineDeployableState[] = []
  private deployableHold: OfflineDeployableHoldState | null = null
  private deployableInputConsumed: Record<OfflineDeployableKind, boolean> = this.createDeployableConsumedState()
  private deployableAlerts: OfflineDeployableAlertState[] = []
  private majorModInputConsumed = false
  private majorMods: MajorModRuntimeState = this.createMajorModRuntimeState()
  private treadTracks: TreadTrackState[] = []
  private terrainEvidence: TerrainEvidenceState[] = []
  private terrainEvidenceSentinelPatrolIndex = 0
  private retranslators: OfflineRetranslator[] = []
  private visionMemory: Record<CombatSide, Record<string, OfflineVisionMemory>> = this.createEmptyVisionMemory()
  private botBeliefs: Record<string, ContactBelief[]> = {}
  private progression: ProgressionState
  private activeTankClassId: TankClassId = DEFAULT_TANK_CLASS
  private settings: SettingsState
  private repairCharges = 0
  private rngState: number
  private savedRun: SavedRun | null
  private score = 0
  private soundEvents: SoundEvent[] = []
  private shake = 0
  private flash = 0
  private levelClearPause = 0
  private feedbackNotices: FeedbackNotice[] = []
  private touchControlsVisible = false
  private onlineQuickMatchRequested = false
  private pendingMenuPress: PendingMenuPress | null = null
  private loading: LoadingPresentation | null = null
  private spawnCursor = 0
  private spawnTimer = 0
  private friendlyRespawnTimer = 0
  private tiles: Tile[][]
  private time = 0
  private baseHp = BASE_MAX_HP
  private currentLevelId = 1
  private completedLevelId: number | null = null
  private objectiveState: SavedObjectiveState
  private runStats: RunStats
  private levelResult: LevelResult | null = null

  constructor(options: GameOptions = {}) {
    this.aiEnabled = options.aiEnabled ?? true
    this.botDifficulty = normalizeBotDifficulty(options.botDifficulty)
    this.levels = options.levelDefinitions ?? this.createOptionLevels(options)
    this.saveStore = options.saveStore ?? createBrowserSaveStore()
    this.rngState = options.seed ?? 112358

    const saveData = this.saveStore.load() ?? createDefaultSaveData()
    this.progression = saveData.progression
    this.activeTankClassId = this.progression.selectedTankClass
    this.settings = saveData.settings
    this.savedRun = saveData.resumableRun
    this.currentLevelId = this.clampLevelId(this.savedRun?.currentLevel ?? this.progression.unlockedStage)
    this.tiles = createTiles(this.currentLevel.rows)
    this.enemiesRemaining = this.savedRun?.enemiesRemaining ?? this.currentLevel.enemyTotal
    this.objectiveState = this.savedRun?.objective ?? this.createObjectiveState()
    this.runStats = this.normalizeRunStats(this.savedRun?.runStats)
    this.restoreShellState(this.savedRun)
    this.retranslators = this.createRetranslators(this.currentLevel.retranslators ?? [])
    this.restorePortableRelayState(this.savedRun)
    this.restoreDeployableState(this.savedRun)
    this.visionMemory = this.createEmptyVisionMemory()
    this.player = this.createPlayer()
    this.snapCameraToPlayer()
  }

  private createOptionLevels(options: GameOptions): LevelDefinition[] {
    if (options.levelRows || options.enemySpawns || options.enemyTotal !== undefined || options.playerSpawn) {
      const rows = options.levelRows ?? DEFAULT_LEVEL_ROWS
      const useViewportSizedRows = rows.length === GRID_ROWS && (rows[0]?.length ?? 0) === GRID_COLS
      const defaultPlayerSpawn = useViewportSizedRows ? { x: 4, y: 11 } : DEFAULT_PLAYER_SPAWN
      const defaultEnemySpawns = useViewportSizedRows ? [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }] : DEFAULT_ENEMY_SPAWNS
      return [
        {
          id: 1,
          name: 'Test Field',
          briefing: 'Local test configuration.',
          objective: DEFAULT_OBJECTIVE,
          rows,
          playerSpawn: options.playerSpawn ?? defaultPlayerSpawn,
          enemySpawns: options.enemySpawns ?? defaultEnemySpawns,
          retranslators: options.retranslators ?? [],
          enemyTotal: options.enemyTotal ?? 18,
          activeEnemyLimit: Math.min(4, Math.max(1, options.enemyTotal ?? 4)),
          spawnInterval: 2.7,
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

  private get currentObjective() {
    return this.currentLevel.objective ?? DEFAULT_OBJECTIVE
  }

  private get maxLevelId() {
    return this.levels[this.levels.length - 1]?.id ?? 1
  }

  private clampLevelId(levelId: number) {
    return Math.max(1, Math.min(this.maxLevelId, Math.floor(levelId || 1)))
  }

  startGame(levelId = this.currentLevelId) {
    this.currentLevelId = this.clampLevelId(levelId)
    this.activeTankClassId = this.progression.selectedTankClass
    this.tiles = createTiles(this.currentLevel.rows)
    this.bullets = []
    this.enemies = []
    this.particles = []
    this.powerUps = []
    this.terrainEvidence = []
    this.terrainEvidenceSentinelPatrolIndex = 0
    this.resetPortableRelayState()
    this.resetDeployableState()
    this.resetMajorModState()
    this.retranslators = this.createRetranslators(this.currentLevel.retranslators ?? [])
    this.visionMemory = this.createEmptyVisionMemory()
    this.botBeliefs = {}
    this.feedbackNotices = []
    this.input = { ...EMPTY_INPUT }
    this.mode = 'playing'
    this.menuIndex = 0
    this.pendingMenuPress = null
    this.loading = null
    this.nextId = 1
    this.score = 0
    this.time = 0
    this.lives = 3
    this.baseHp = BASE_MAX_HP
    this.objectiveState = this.createObjectiveState()
    this.enemiesRemaining = this.getInitialSpawnTotal()
    this.spawnCursor = 0
    this.spawnTimer = 0
    this.friendlyRespawnTimer = 0
    this.repairCharges = this.getUpgradeStats().repairCharges
    this.resetShellState()
    this.player = this.createPlayer()
    this.snapCameraToPlayer()
    this.savedRun = null
    this.completedLevelId = null
    this.runStats = this.createRunStats()
    this.levelResult = null
    this.persist()
    this.spawnInitialObjectiveActors()
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

    if (this.mode === 'encyclopedia' && this.encyclopediaTopicId) {
      this.closeEncyclopediaTopic()
      return
    }

    if (this.mode === 'tank-select') {
      this.mode = this.tankSelectReturnMode
      this.menuIndex = 0
      return
    }

    if (this.mode !== 'main-menu') {
      this.mode = 'main-menu'
      this.menuIndex = 0
      this.encyclopediaTopicId = null
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

  getMenuPointerIndex(x: number, y: number) {
    if (this.mode !== 'tank-select') {
      return null
    }

    for (let index = 0; index < TANK_CLASS_ORDER.length; index += 1) {
      const tabX = TANK_SELECT_TAB_X + index * (TANK_SELECT_TAB_WIDTH + TANK_SELECT_TAB_GAP)
      if (x >= tabX && x <= tabX + TANK_SELECT_TAB_WIDTH && y >= TANK_SELECT_TAB_Y && y <= TANK_SELECT_TAB_Y + TANK_SELECT_TAB_HEIGHT) {
        return index
      }
    }

    if (x >= MENU_OPTION_X && x <= MENU_OPTION_X + MENU_OPTION_WIDTH && y >= TANK_SELECT_BACK_Y && y <= TANK_SELECT_BACK_Y + MENU_OPTION_HEIGHT) {
      return TANK_CLASS_ORDER.length
    }

    return null
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

    if (this.mode === 'level-select') {
      if (item.id.startsWith('level-')) {
        this.currentLevelId = this.clampLevelId(Number(item.id.slice('level-'.length)))
        this.mode = 'briefing'
        this.menuIndex = 0
      } else {
        this.back()
      }
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

    if (this.mode === 'tank-select') {
      if (this.isTankClassId(item.id)) {
        this.setTankClass(item.id)
      } else {
        this.back()
      }
      return
    }

    if (this.mode === 'garage') {
      if (item.id === 'tank-select') {
        this.tankSelectReturnMode = 'garage'
        this.mode = 'tank-select'
        this.menuIndex = TANK_CLASS_ORDER.indexOf(this.progression.selectedTankClass)
      } else if (this.isMajorModKind(item.id)) {
        this.setMajorMod(item.id)
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

    if (this.mode === 'encyclopedia') {
      if (this.encyclopediaTopicId) {
        this.closeEncyclopediaTopic()
      } else if (item.id === 'back') {
        this.back()
      } else if (this.isEncyclopediaTopicId(item.id)) {
        this.openEncyclopediaTopic(item.id)
      }
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
      } else if (item.id === 'select') {
        this.mode = 'level-select'
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
      if (item.id === 'select') {
        this.mode = 'level-select'
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

  setTankClass(classId: TankClassId) {
    const normalized = normalizeTankClassId(classId)
    this.progression.selectedTankClass = normalized
    if (!this.savedRun && this.mode !== 'playing' && this.mode !== 'paused') {
      this.activeTankClassId = normalized
    }
    this.persist()
    this.queueSound('upgrade')
  }

  setMajorMod(kind: MajorModKind) {
    if (!this.isMajorModKind(kind)) {
      return false
    }

    this.progression.selectedMajorMod = kind
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
    if (button === 'relay' && !down) {
      this.portableRelayInputConsumed = false
    }
    if (button === 'mod' && !down) {
      this.majorModInputConsumed = false
    }
    const deployableKind = this.getDeployableKindForInput(button)
    if (deployableKind && !down) {
      this.deployableInputConsumed[deployableKind] = false
    }
  }

  setInput(input: Partial<InputState>) {
    this.input = { ...this.input, ...input }
    if (input.relay === false) {
      this.portableRelayInputConsumed = false
    }
    if (input.mod === false) {
      this.majorModInputConsumed = false
    }
    for (const kind of DEPLOYABLE_ORDER) {
      if (input[DEPLOYABLE_INPUTS[kind]] === false) {
        this.deployableInputConsumed[kind] = false
      }
    }
  }

  releaseControls() {
    this.input = { ...EMPTY_INPUT }
    this.portableRelayHold = null
    this.portableRelayInputConsumed = false
    this.deployableHold = null
    this.deployableInputConsumed = this.createDeployableConsumedState()
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

  getMapSize() {
    return {
      cols: this.getMapCols(),
      rows: this.getMapRows(),
    }
  }

  private getPlayerView() {
    const vision = this.getPlayerVisionModel()
    const lastKnown = this.getLastKnownForSide('player', vision)
    const visibleEnemies = this.enemies.filter((enemy) => this.isTankVisibleToVision(enemy, vision))
    const visibleBullets = this.bullets.filter((bullet) => this.isBulletVisibleToVision(bullet, vision))
    const visiblePowerUps = this.powerUps.filter((powerUp) => this.isPowerUpVisibleToVision(powerUp, vision))
    const visibleRetranslators = this.retranslators.filter((relay) => this.isRelayVisibleToVision(relay, vision))
    const visibleParticles = this.particles.filter((particle) => this.isPixelPointVisibleToVision(particle.x, particle.y, vision))
    const visibleTerrainEvidence = this.getTerrainEvidenceForSide('player', vision)
    const readability = this.filterReadabilityForVision(this.getReadabilitySnapshot(), vision)

    return {
      vision,
      lastKnown,
      enemies: visibleEnemies,
      bullets: visibleBullets,
      powerUps: visiblePowerUps,
      retranslators: visibleRetranslators,
      deployables: this.getDeployablesSnapshot(),
      terrainEvidence: visibleTerrainEvidence,
      particles: visibleParticles,
      readability,
      fog: this.getFogSnapshot(vision, visibleRetranslators.length, lastKnown.length),
    }
  }

  getRenderState(): RenderState {
    const playerView = this.getPlayerView()

    return {
      mode: this.mode,
      menu: this.getMenuPresentation(),
      encyclopedia: this.getEncyclopediaPresentation(),
      time: this.time,
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      baseMaxHp: BASE_MAX_HP,
      enemiesRemaining: this.enemiesRemaining,
      activeEnemyCount: this.enemies.filter((tank) => tank.side !== 'player').length,
      fog: playerView.fog,
      vision: this.cloneVisionSnapshot(playerView.vision),
      retranslators: playerView.retranslators.map((relay) => ({ ...relay })),
      lastKnown: playerView.lastKnown.map((memory) => ({ ...memory })),
      portableRelay: this.getPortableRelaySnapshot(),
      deployables: playerView.deployables,
      map: this.getMapSnapshot(),
      camera: this.getCameraSnapshot(),
      level: this.currentLevel,
      currentLevel: this.currentLevelId,
      campaignComplete: this.progression.unlockedStage >= this.maxLevelId && this.mode === 'campaign-complete',
      progression: this.progression,
      settings: this.settings,
      objective: this.getObjectiveSnapshot(),
      selectableLevels: this.getSelectableLevels().map((level) => level.id),
      loading: this.getRenderLoadingState(),
      feedback: this.getFeedbackState(),
      upgradeStats: this.getUpgradeStats(),
      garage: this.getGaragePresentation(),
      majorMods: this.getMajorModsSnapshot(playerView.vision),
      tankClasses: this.getTankClassSnapshot(),
      runStats: this.cloneRunStats(),
      results: this.getVisibleLevelResult(),
      hasSavedRun: Boolean(this.savedRun),
      playerShells: this.playerShells,
      playerShellCapacity: this.playerShellCapacity,
      playerShellRechargeProgress: this.getShellRechargeProgressRatio(),
      playerShellRechargeDuration: PLAYER_SHELL_RECHARGE_DURATION,
      playerOnAmmoStation: this.isPlayerOnAmmoStation(),
      playerTeam: this.playerTeam,
      enemyTeam: this.enemyTeam,
      readability: playerView.readability,
      tiles: this.tiles,
      player: this.player,
      enemies: playerView.enemies,
      bullets: playerView.bullets,
      particles: playerView.particles,
      powerUps: playerView.powerUps,
      terrainEvidence: playerView.terrainEvidence,
    }
  }

  getSnapshot(): GameSnapshot {
    const playerView = this.getPlayerView()
    const readability = playerView.readability
    const terrain = this.getVisibleTerrainCounts(playerView.vision)
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
        helper: [...menu.helper],
      },
      encyclopedia: this.getEncyclopediaPresentation(),
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      baseMaxHp: BASE_MAX_HP,
      enemiesRemaining: this.enemiesRemaining,
      ai: this.getAiSnapshot(),
      fog: playerView.fog,
      vision: this.cloneVisionSnapshot(playerView.vision),
      retranslators: playerView.retranslators.map((relay) => ({ ...relay })),
      lastKnown: playerView.lastKnown.map((memory) => ({ ...memory })),
      portableRelay: this.getPortableRelaySnapshot(),
      deployables: playerView.deployables,
      map: this.getMapSnapshot(),
      camera: this.getCameraSnapshot(),
      level: {
        current: this.currentLevelId,
        name: this.currentLevel.name,
        briefing: this.currentLevel.briefing,
        unlockedStage: this.progression.unlockedStage,
        campaignComplete: this.mode === 'campaign-complete',
        difficulty: {
          objectiveMode: this.currentObjective.mode,
          winCondition: this.currentObjective.winCondition,
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
      tankClasses: this.getTankClassSnapshot(),
      garage: this.getGaragePresentation(),
      majorMods: this.getMajorModsSnapshot(playerView.vision),
      settings: { ...this.settings },
      objective: {
        ...this.getObjectiveSnapshot(),
        selectableLevels: this.getSelectableLevels().map((level) => level.id),
        completedLevels: [...this.progression.completedLevels],
      },
      onboarding: {
        firstLevel: this.currentLevelId === 1,
        objective: this.getObjectiveBriefingLine(),
        controls: this.getControlsHelpLine(),
        recovery: this.getRecoveryHelpLine(),
      },
      loading: this.getSnapshotLoadingState(),
      feedback: this.getFeedbackState(),
      runStats: this.cloneRunStats(),
      results: this.getVisibleLevelResult(),
      player: {
        classId: this.activeTankClassId,
        classLabel: getTankClassDefinition(this.activeTankClassId).label,
        col: this.player.col,
        row: this.player.row,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        dir: this.player.dir,
        hp: this.player.hp,
        reload: Number(this.player.reload.toFixed(2)),
        reloadTime: Number(this.player.reloadTime.toFixed(2)),
        moving: Boolean(this.player.move),
        shield: Number(this.player.shield.toFixed(2)),
        rapid: Number(this.player.rapid.toFixed(2)),
        repairCharges: this.repairCharges,
        shells: this.playerShells,
        shellCapacity: this.playerShellCapacity,
        shellRechargeProgress: this.getShellRechargeProgressRatio(),
        shellRechargeDuration: PLAYER_SHELL_RECHARGE_DURATION,
        onAmmoStation: this.isPlayerOnAmmoStation(),
        portableRelay: this.getPortableRelaySnapshot(),
        deployables: playerView.deployables,
      },
      enemies: playerView.enemies.map((enemy) => ({
        id: enemy.id,
        role: enemy.role,
        side: enemy.side,
        team: enemy.team,
        col: enemy.col,
        row: enemy.row,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        dir: enemy.dir,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        moving: Boolean(enemy.move),
      })),
      bullets: playerView.bullets.map((bullet) => ({
        owner: bullet.owner,
        team: bullet.team,
        x: Math.round(bullet.x),
        y: Math.round(bullet.y),
        dir: bullet.dir,
        speed: bullet.speed,
        damage: bullet.damage,
        ttl: Number(bullet.ttl.toFixed(2)),
        splashDamage: bullet.splashDamage,
        splashRadius: bullet.splashRadius,
        ricochets: bullet.ricochets,
      })),
      powerUps: playerView.powerUps.map((powerUp) => ({
        kind: powerUp.kind,
        x: Math.round(powerUp.x),
        y: Math.round(powerUp.y),
      })),
      terrain,
      terrainEvidence: playerView.terrainEvidence,
      readability,
      readableText: this.getReadableTextSnapshot(menu, readability),
    }
  }

  renderText() {
    return JSON.stringify(this.getSnapshot())
  }

  private getVisibleTerrainCounts(vision: OfflineVisionModel): GameSnapshot['terrain'] {
    const counts = Object.fromEntries(TERRAIN_TYPE_IDS.map((id) => [id, 0])) as GameSnapshot['terrain']
    for (let row = 0; row < this.tiles.length; row += 1) {
      const rowTiles = this.tiles[row]
      if (!rowTiles) continue
      for (let col = 0; col < rowTiles.length; col += 1) {
        const tile = rowTiles[col]
        if (tile && vision.visibleSet.has(this.key(col, row))) {
          counts[tile.kind] += 1
        }
      }
    }
    return counts
  }

  private getMapCols() {
    return this.tiles[0]?.length ?? 0
  }

  private getMapRows() {
    return this.tiles.length
  }

  private getAiSnapshot() {
    const beliefs = Object.values(this.botBeliefs).flat()
    return {
      policy: 'visible-fire-scout-uncertainty' as const,
      activeBotCount: this.aiEnabled ? this.enemies.filter((tank) => tank.hp > 0).length : 0,
      activeBeliefCount: beliefs.length,
      uncertainContactCount: beliefs.filter((belief) =>
        belief.kind !== 'objective' &&
        belief.visible !== true &&
        belief.confidence >= this.botDifficulty.confidenceThreshold * 0.42,
      ).length,
      visibleAttackContactCount: beliefs.filter((belief) =>
        belief.kind === 'enemy' &&
        belief.visible === true &&
        belief.confidence >= this.botDifficulty.confidenceThreshold,
      ).length,
      hiddenCoordinateLeak: false as const,
    }
  }

  private getMapSnapshot() {
    return {
      cols: this.getMapCols(),
      rows: this.getMapRows(),
      viewportCols: BATTLEFIELD_VIEW_COLS,
      viewportRows: BATTLEFIELD_VIEW_ROWS,
    }
  }

  private getCameraSnapshot() {
    return {
      current: { ...this.camera.current },
      target: { ...this.camera.target },
      smoothingMs: this.camera.smoothingMs,
    }
  }

  private getReadabilitySnapshot() {
    return buildLevelReadabilitySummary(
      this.currentLevel,
      this.objectiveState,
      this.camera.current,
      this.playerTeam,
      this.enemyTeam,
    )
  }

  private getPlayerVisionModel(): OfflineVisionModel {
    return this.computeVisionModel('player', this.player)
  }

  private getTankVisionModel(tank: Tank): OfflineVisionModel {
    return this.computeVisionModel(tank.side, tank)
  }

  private computeVisionModel(side: CombatSide, focusTank: Tank): OfflineVisionModel {
    const circles: OfflineVisionCircle[] = []
    const merged = this.hasSideRelay(side)

    if (side === 'player') {
      this.addTankVisionCircle(circles, this.player, 'self')

      if (merged) {
        for (const teammate of this.enemies.filter((tank) => tank.side === 'player')) {
          this.addTankVisionCircle(circles, teammate, 'teammate')
        }
        this.addRelayVisionCircles(circles, side)
      }
    } else if (merged) {
      for (const teammate of this.enemies.filter((tank) => tank.side === side)) {
        this.addTankVisionCircle(circles, teammate, teammate.id === focusTank.id ? 'self' : 'teammate')
      }
      this.addRelayVisionCircles(circles, side)
    } else {
      this.addTankVisionCircle(circles, focusTank, 'self')
    }

    const uniqueCircles = this.dedupeVisionCircles(circles)
    const visibleSet = this.visibleSetFromCircles(uniqueCircles)
    const alwaysVisibleSet = side === 'player' ? this.alwaysVisiblePlayerBaseSet() : new Set<string>()
    for (const key of alwaysVisibleSet) {
      visibleSet.add(key)
    }

    return {
      circles: uniqueCircles,
      visibleCells: this.visibleCellsFromSet(visibleSet),
      alwaysVisibleCells: this.visibleCellsFromSet(alwaysVisibleSet),
      visibleSet,
      alwaysVisibleSet,
    }
  }

  private alwaysVisiblePlayerBaseSet() {
    const visible = new Set<string>()

    if (this.objectiveState.mode === 'defense') {
      for (const cell of this.baseCells()) {
        visible.add(this.key(cell.x, cell.y))
      }
    }

    if (this.objectiveState.mode === 'ctf' && this.objectiveState.flag) {
      const home = this.objectiveState.flag.playerBase
      if (this.isInBounds(home.x, home.y)) {
        visible.add(this.key(home.x, home.y))
      }
    }

    return visible
  }

  private baseCells(): Vec[] {
    const cells: Vec[] = []
    for (let row = 0; row < this.getMapRows(); row += 1) {
      for (let col = 0; col < this.getMapCols(); col += 1) {
        if (this.tiles[row]?.[col]?.kind === 'base') {
          cells.push({ x: col, y: row })
        }
      }
    }
    return cells
  }

  private addTankVisionCircle(circles: OfflineVisionCircle[], tank: Tank, kind: OfflineVisionCircle['kind']) {
    if (tank.hp <= 0) {
      return
    }

    const point = this.tankVisionPoint(tank)
    circles.push({
      id: tank.id,
      kind,
      x: point.x,
      y: point.y,
      radius: OFFLINE_PLAYER_VISION_RADIUS,
    })
  }

  private addRelayVisionCircles(circles: OfflineVisionCircle[], side: CombatSide) {
    for (const relay of this.retranslators) {
      if (relay.owner !== side || this.isCellEmpDisrupted(relay.col, relay.row)) {
        continue
      }

      circles.push({
        id: relay.id,
        kind: 'relay',
        x: relay.col + 0.5,
        y: relay.row + 0.5,
        radius: OFFLINE_RELAY_VISION_RADIUS,
      })
    }
  }

  private visibleSetFromCircles(circles: OfflineVisionCircle[]) {
    const visible = new Set<string>()

    for (const circle of circles) {
      const startCol = Math.max(0, Math.floor(circle.x - circle.radius))
      const endCol = Math.min(this.getMapCols() - 1, Math.floor(circle.x + circle.radius))
      const startRow = Math.max(0, Math.floor(circle.y - circle.radius))
      const endRow = Math.min(this.getMapRows() - 1, Math.floor(circle.y + circle.radius))

      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          if (this.tileIntersectsVisionCircle(col, row, circle)) {
            visible.add(this.key(col, row))
          }
        }
      }
    }

    return visible
  }

  private visibleCellsFromSet(visible: Set<string>): OfflineVisibleCell[] {
    return [...visible].map((key) => {
      const [col, row] = key.split(',').map(Number)
      return { col, row }
    }).sort((a, b) => a.row - b.row || a.col - b.col)
  }

  private tileIntersectsVisionCircle(col: number, row: number, circle: OfflineVisionCircle) {
    const nearestX = clamp(circle.x, col, col + 1)
    const nearestY = clamp(circle.y, row, row + 1)
    return this.distanceSquared(nearestX, nearestY, circle.x, circle.y) <= circle.radius * circle.radius
  }

  private isPointVisible(circles: OfflineVisionCircle[], x: number, y: number) {
    return circles.some((circle) => this.distanceSquared(x, y, circle.x, circle.y) <= circle.radius * circle.radius)
  }

  private distanceSquared(ax: number, ay: number, bx: number, by: number) {
    const dx = ax - bx
    const dy = ay - by
    return dx * dx + dy * dy
  }

  private tankVisionPoint(tank: Tank) {
    const center = tankCenter(tank)
    return {
      x: (center.x - ARENA_X) / TILE_SIZE,
      y: (center.y - ARENA_Y) / TILE_SIZE,
    }
  }

  private pixelVisionPoint(x: number, y: number) {
    return {
      x: (x - ARENA_X) / TILE_SIZE,
      y: (y - ARENA_Y) / TILE_SIZE,
    }
  }

  private isTankVisibleToVision(tank: Tank, vision: OfflineVisionModel) {
    const point = this.tankVisionPoint(tank)
    const definition = terrainDefinition(this.tileKindAt(tank.col, tank.row))
    const stationaryMultiplier = tank.move ? 1 : definition.visibility.stationaryMultiplier
    const effectiveRadius = (circle: OfflineVisionCircle) => circle.radius * stationaryMultiplier
    return vision.circles.some((circle) => (
      this.distanceSquared(point.x, point.y, circle.x, circle.y) <=
        effectiveRadius(circle) * effectiveRadius(circle)
    ))
  }

  private isBulletVisibleToVision(bullet: Bullet, vision: OfflineVisionModel) {
    const point = this.pixelVisionPoint(bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2)
    return this.isPointVisible(vision.circles, point.x, point.y)
  }

  private isPowerUpVisibleToVision(powerUp: PowerUp, vision: OfflineVisionModel) {
    const point = this.pixelVisionPoint(powerUp.x + 10, powerUp.y + 10)
    return this.isPointVisible(vision.circles, point.x, point.y)
  }

  private isPixelPointVisibleToVision(x: number, y: number, vision: OfflineVisionModel) {
    const point = this.pixelVisionPoint(x, y)
    return this.isPointVisible(vision.circles, point.x, point.y)
  }

  private isRelayVisibleToVision(relay: OfflineRetranslator, vision: OfflineVisionModel) {
    return vision.visibleSet.has(this.key(relay.col, relay.row))
  }

  private getTerrainEvidenceForSide(side: CombatSide, vision: OfflineVisionModel): TerrainEvidenceSnapshot[] {
    return this.terrainEvidence
      .filter((evidence) => evidence.side === side || vision.visibleSet.has(this.key(evidence.col, evidence.row)))
      .map((evidence) => ({
        id: evidence.id,
        kind: evidence.kind,
        col: evidence.col,
        row: evidence.row,
        dir: evidence.dir,
        age: Number(evidence.age.toFixed(2)),
        ttl: Number(evidence.ttl.toFixed(2)),
        strength: Number(evidence.strength.toFixed(2)),
        label: evidence.label,
      }))
  }

  private filterReadabilityForVision(readability: LevelReadabilitySummary, vision: OfflineVisionModel): LevelReadabilitySummary {
    const markers = readability.markers
      .filter((marker) => vision.visibleSet.has(this.key(marker.col, marker.row)))
      .map((marker) => ({ ...marker }))

    return {
      objectiveMarkerCount: markers.filter((marker) => this.isObjectiveReadabilityMarker(marker.kind)).length,
      spawnMarkerCount: markers.filter((marker) => this.isSpawnReadabilityMarker(marker.kind)).length,
      criticalCoverCount: markers.filter((marker) => marker.kind === 'critical-cover').length,
      visibleMarkers: markers.filter((marker) => marker.visible).length,
      hiddenMarkers: markers.filter((marker) => !marker.visible).length,
      markers,
    }
  }

  private isObjectiveReadabilityMarker(kind: LevelReadabilityMarker['kind']) {
    return kind === 'defense-base' || kind === 'flag-home' || kind === 'flag-target' || kind === 'assault-core'
  }

  private isSpawnReadabilityMarker(kind: LevelReadabilityMarker['kind']) {
    return kind === 'player-spawn' || kind === 'friendly-spawn' || kind === 'enemy-spawn' || kind === 'neutral-spawn'
  }

  private getFogSnapshot(
    vision: OfflineVisionModel,
    visibleRetranslatorCount: number,
    lastKnownCount: number,
  ): OfflineFogSnapshot {
    const teamVisionMerged = this.hasSideRelay('player')

    return {
      shape: 'circular',
      visibleCellCount: vision.visibleSet.size,
      hiddenCellCount: Math.max(0, this.getMapCols() * this.getMapRows() - vision.visibleSet.size),
      visibleRetranslatorCount,
      ownedRetranslatorCount: this.getOwnedRelayCount('player'),
      totalRetranslatorCount: this.retranslators.length,
      visionCircleCount: vision.circles.length,
      teamVisionMode: teamVisionMerged ? 'linked' : 'solo',
      teamVisionMerged,
      lastKnownCount,
    }
  }

  private cloneVisionSnapshot(vision: OfflineVisionModel): OfflineVisionSnapshot {
    return {
      circles: vision.circles.map((circle) => ({
        ...circle,
        x: Number(circle.x.toFixed(2)),
        y: Number(circle.y.toFixed(2)),
        radius: Number(circle.radius.toFixed(2)),
      })),
      visibleCells: vision.visibleCells.map((cell) => ({ ...cell })),
      alwaysVisibleCells: vision.alwaysVisibleCells.map((cell) => ({ ...cell })),
    }
  }

  private getLastKnownForSide(side: CombatSide, vision: OfflineVisionModel) {
    return Object.values(this.visionMemory[side])
      .filter((memory) => this.time - memory.seenAt <= OFFLINE_LAST_KNOWN_SECONDS)
      .filter((memory) => {
        if (memory.alert) {
          return true
        }
        const tank = this.getTankById(memory.id)
        return Boolean(tank && !this.isTankVisibleToVision(tank, vision))
      })
      .map((memory) => ({
        ...memory,
        seenAt: Number(memory.seenAt.toFixed(2)),
      }))
  }

  private hasSideRelay(side: CombatSide) {
    return this.getOwnedRelayCount(side) > 0
  }

  private getOwnedRelayCount(side: CombatSide) {
    return this.retranslators.filter((relay) => relay.owner === side && !this.isCellEmpDisrupted(relay.col, relay.row)).length
  }

  private dedupeVisionCircles(circles: OfflineVisionCircle[]) {
    const seen = new Set<string>()
    return circles.filter((circle) => {
      const key = `${circle.kind}:${circle.id}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private getCameraTarget(): BattlefieldCamera {
    const center = tankCenter(this.player)
    return clampBattlefieldCameraFractional(
      {
        col: (center.x - ARENA_X) / TILE_SIZE - BATTLEFIELD_VIEW_COLS / 2,
        row: (center.y - ARENA_Y) / TILE_SIZE - BATTLEFIELD_VIEW_ROWS / 2,
      },
      this.getMapCols(),
      this.getMapRows(),
    )
  }

  private snapCameraToPlayer() {
    const target = this.getCameraTarget()
    this.camera = {
      current: target,
      target,
      smoothingMs: OFFLINE_CAMERA_SMOOTHING_MS,
    }
  }

  private updateCamera(dt: number) {
    const target = this.getCameraTarget()
    this.camera = {
      current: stepCamera(this.camera.current, target, dt, this.camera.smoothingMs),
      target,
      smoothingMs: this.camera.smoothingMs,
    }
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

    this.runStats.duration += safeDt
    this.updateMajorMods(safeDt)
    this.updateTreadTracks(safeDt)
    this.updateTerrainEvidence(safeDt)
    this.updatePlayer(safeDt)
    this.updatePlayerShellRecharge(safeDt)
    this.updatePortableRelay(safeDt)
    this.updateDeployables(safeDt)
    this.updateCamera(safeDt)
    this.updateRetranslators(safeDt)
    this.refreshVisionMemory()
    this.updateEnemies(safeDt)
    this.updateBullets(safeDt)
    this.updatePowerUps(safeDt)
    this.updateFriendlyRespawns(safeDt)
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

  private getTankClassSnapshot() {
    return {
      selected: this.progression.selectedTankClass,
      active: this.activeTankClassId,
      options: TANK_CLASS_ORDER.map((id) => this.getTankClassPresentation(id)),
    }
  }

  private getTankClassPresentation(id: TankClassId): TankClassPresentation {
    const definition = TANK_CLASS_DEFINITIONS[id]
    const stats = this.getUpgradeStatsFor(id)
    return {
      id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      role: definition.role,
      description: definition.description,
      selected: this.progression.selectedTankClass === id,
      active: this.activeTankClassId === id,
      stats: [
        `Move ${this.formatSeconds(stats.moveDuration)}`,
        `Reload ${this.formatSeconds(stats.reloadTime)}`,
        `Damage ${stats.bulletDamage}`,
        stats.shield > 0 ? `Shield ${stats.shield}` : 'Shield 0',
        stats.splashDamage ? `Splash ${stats.splashDamage}` : 'No splash',
      ],
      equipment: [...definition.equipment],
      deployables: [...definition.deployables],
      portableRelayLimit: definition.portableRelayLimit,
    }
  }

  private getFeedbackState() {
    return {
      shake: Number(this.shake.toFixed(2)),
      flash: Number(this.flash.toFixed(2)),
      levelClearPause: Number(this.levelClearPause.toFixed(2)),
      touchControlsVisible: this.touchControlsVisible,
      heldButtons: { ...this.input },
      notices: this.feedbackNotices.map((notice) => ({
        ...notice,
        age: Number(notice.age.toFixed(2)),
        duration: Number(notice.duration.toFixed(2)),
        x: notice.x === null ? null : Math.round(notice.x),
        y: notice.y === null ? null : Math.round(notice.y),
      })),
    }
  }

  private createMajorModRuntimeState(): MajorModRuntimeState {
    return {
      overdriveRemaining: 0,
      overdriveCooldown: 0,
      pontoon: null,
      hedgehog: null,
      hedgehogSpent: false,
      emp: null,
    }
  }

  private resetMajorModState() {
    this.majorMods = this.createMajorModRuntimeState()
    this.treadTracks = []
    this.majorModInputConsumed = false
  }

  private restoreMajorModState(run: SavedRun | null | undefined) {
    this.resetMajorModState()
    const saved = run?.majorMods
    if (!saved) {
      return
    }

    this.majorMods.overdriveRemaining = Math.max(0, this.safeNumber(saved.overdrive?.remaining))
    this.majorMods.overdriveCooldown = Math.max(0, this.safeNumber(saved.overdrive?.cooldown))
    this.majorMods.pontoon = this.normalizePontoonBridge(saved.pontoon)
    this.majorMods.hedgehog = this.normalizeHedgehog(saved.hedgehog)
    this.majorMods.hedgehogSpent = saved.hedgehogSpent === true || Boolean(this.majorMods.hedgehog)
    this.majorMods.emp = this.normalizeEmpEmitter(saved.emp)
    this.treadTracks = this.normalizeTreadTracks(saved.tracks)
  }

  private updateMajorMods(dt: number) {
    this.majorMods.overdriveRemaining = Math.max(0, this.majorMods.overdriveRemaining - dt)
    this.majorMods.overdriveCooldown = Math.max(0, this.majorMods.overdriveCooldown - dt)
    this.updateEmpEmitter(dt)

    if (!this.input.mod) {
      this.majorModInputConsumed = false
      return
    }

    if (this.majorModInputConsumed || this.mode !== 'playing' || this.player.hp <= 0) {
      return
    }

    this.majorModInputConsumed = true
    const selected = this.progression.selectedMajorMod

    if (selected === 'overdrive') {
      this.activateOverdrive()
    } else if (selected === 'pontoon') {
      this.placePontoonBridge()
    } else if (selected === 'hedgehog') {
      this.placeHedgehog()
    } else {
      this.placeEmpEmitter()
    }
  }

  private activateOverdrive() {
    if (this.majorMods.overdriveRemaining > 0 || this.majorMods.overdriveCooldown > 0) {
      this.pushFeedbackNotice('pickup', 'MOD COOLING', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    this.majorMods.overdriveRemaining = this.getOverdriveDuration()
    this.majorMods.overdriveCooldown = this.getOverdriveDuration() + OVERDRIVE_COOLDOWN_SECONDS
    this.applyOverdriveToActiveMove(this.player)
    this.pushFeedbackNotice('pickup', 'OVERDRIVE', this.player.x + TANK_SIZE / 2, this.player.y)
    this.addImpactFeedback(0.08, 0.05)
    return true
  }

  private applyOverdriveToActiveMove(tank: Tank) {
    if (!tank.move) {
      return
    }

    const elapsed = clamp(tank.move.elapsed, 0, tank.move.duration)
    const remaining = Math.max(0.01, tank.move.duration - elapsed)
    tank.move.duration = elapsed + remaining * 0.5
  }

  private getOverdriveDuration(classId: TankClassId = this.activeTankClassId) {
    if (classId === 'scout') return 5
    if (classId === 'battle') return 2.5
    return 4
  }

  private isOverdriveActiveFor(tank: Tank) {
    return tank.faction === 'player' && this.majorMods.overdriveRemaining > 0
  }

  private getMoveDurationForTank(tank: Tank, targetCol = tank.col, targetRow = tank.row) {
    const base = tank.faction === 'player' ? this.getUpgradeStats().moveDuration : ENEMY_MOVE_DURATION
    const overdriveMultiplier = this.isOverdriveActiveFor(tank) ? 0.5 : 1
    const terrainMultiplier = terrainDefinition(this.effectiveTankTileKindAt(targetCol, targetRow)).movement.speedMultiplier
    return base * overdriveMultiplier * (tank.slow > 0 ? MINE_SLOW_MULTIPLIER : 1) * terrainMultiplier
  }

  private updateTreadTracks(dt: number) {
    this.treadTracks = this.treadTracks
      .map((track) => ({ ...track, age: track.age + dt }))
      .filter((track) => track.age < track.ttl)
  }

  private updateTerrainEvidence(dt: number) {
    this.terrainEvidence = this.terrainEvidence
      .map((evidence) => ({ ...evidence, age: evidence.age + dt }))
      .filter((evidence) => evidence.age < evidence.ttl)
  }

  private addTreadTrack(tank: Tank, col: number, row: number, dir: Direction = tank.dir, surface: TileKind = this.tileKindAt(col, row)) {
    if (!this.isInBounds(col, row)) {
      return
    }

    const definition = terrainDefinition(surface)
    if (definition.tracks.suppress) {
      return
    }

    const weight = this.getTankWeight(tank)
    const ttl = this.getTreadTrackTtl(weight) * definition.tracks.persistenceMultiplier * (this.isOverdriveActiveFor(tank) ? 2 : 1)
    this.treadTracks.push({
      id: `track-${this.nextId}`,
      tankId: tank.id,
      col,
      row,
      dir,
      team: tank.team,
      weight,
      age: 0,
      ttl,
      visibility: 0,
      lastSeenAt: this.time - TREAD_TRACK_FOG_FADE_SECONDS,
      overdrive: this.isOverdriveActiveFor(tank),
      surface,
    })
    this.nextId += 1
    if (this.treadTracks.length > 80) {
      this.treadTracks = this.treadTracks.slice(this.treadTracks.length - 80)
    }
  }

  private getTankWeight(tank: Tank): TreadTrackSnapshot['weight'] {
    if (tank.classId === 'scout') return 'light'
    if (tank.classId === 'battle' || tank.maxHp >= ENEMY_ARMORED_MAX_HP) return 'heavy'
    return 'medium'
  }

  private getTreadTrackTtl(weight: TreadTrackSnapshot['weight']) {
    if (weight === 'light') return 4
    if (weight === 'heavy') return 8
    return 6
  }

  private isTreadTrackVisibleToVision(track: TreadTrackState, vision: OfflineVisionModel) {
    const vector = DIR_VECTORS[track.dir]
    const sourceVisible = vision.visibleSet.has(this.key(track.col, track.row))
    const targetVisible = vision.visibleSet.has(this.key(track.col + vector.x, track.row + vector.y))
    if (sourceVisible || targetVisible) {
      return true
    }

    const startX = track.col + 0.5
    const startY = track.row + 0.5
    const endX = track.col + vector.x + 0.5
    const endY = track.row + vector.y + 0.5
    return (
      this.isPointVisible(vision.circles, startX, startY) ||
      this.isPointVisible(vision.circles, (startX + endX) / 2, (startY + endY) / 2) ||
      this.isPointVisible(vision.circles, endX, endY)
    )
  }

  private getTreadTrackVisibility(track: TreadTrackState, vision: OfflineVisionModel) {
    if (this.isTreadTrackVisibleToVision(track, vision)) {
      track.visibility = 1
      track.lastSeenAt = this.time
      return 1
    }

    const visibility = clamp(1 - (this.time - track.lastSeenAt) / TREAD_TRACK_FOG_FADE_SECONDS, 0, 1)
    track.visibility = visibility
    return visibility
  }

  private placePontoonBridge() {
    if (this.majorMods.pontoon) {
      this.pushFeedbackNotice('pickup', 'PONTOON SET', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    const placement = this.findPontoonPlacement()
    if (!placement) {
      this.pushFeedbackNotice('pickup', 'NO BRIDGE LINE', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    this.majorMods.pontoon = { cells: placement.cells, dir: placement.dir }
    this.pushFeedbackNotice('pickup', 'PONTOON BRIDGE', this.player.x + TANK_SIZE / 2, this.player.y)
    this.addImpactFeedback(0.06, 0.04)
    return true
  }

  private findPontoonPlacement(): PontoonBridgeState | null {
    const vector = DIR_VECTORS[this.player.dir]
    const cells: Vec[] = []
    let col = this.player.col + vector.x
    let row = this.player.row + vector.y

    while (this.isInBounds(col, row) && this.tileKindAt(col, row) === 'water') {
      cells.push({ x: col, y: row })
      col += vector.x
      row += vector.y
    }

    if (cells.length === 0 || !this.isInBounds(col, row) || !this.isTankPassableAt(col, row)) {
      return null
    }

    if (this.getTankAt(col, row)) {
      return null
    }

    return { cells, dir: this.player.dir }
  }

  private placeHedgehog() {
    if (this.majorMods.hedgehog || this.majorMods.hedgehogSpent) {
      this.pushFeedbackNotice('pickup', this.majorMods.hedgehog ? 'HEDGEHOG SET' : 'HEDGEHOG SPENT', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    if (!this.canPlaceMajorModStructureAt(this.player.col, this.player.row)) {
      this.pushFeedbackNotice('pickup', 'NO TRAP SPACE', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    this.majorMods.hedgehog = {
      col: this.player.col,
      row: this.player.row,
      hitsTaken: 0,
      trappedTankId: null,
    }
    this.majorMods.hedgehogSpent = true
    this.pushFeedbackNotice('pickup', 'HEDGEHOG', this.player.x + TANK_SIZE / 2, this.player.y)
    return true
  }

  private placeEmpEmitter() {
    if (this.majorMods.emp) {
      this.pushFeedbackNotice('pickup', 'EMP SET', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    if (!this.canPlaceMajorModStructureAt(this.player.col, this.player.row)) {
      this.pushFeedbackNotice('pickup', 'NO EMP SPACE', this.player.x + TANK_SIZE / 2, this.player.y)
      return false
    }

    this.majorMods.emp = {
      col: this.player.col,
      row: this.player.row,
      nextPulseIn: EMP_PULSE_PERIOD_SECONDS,
      disruptingUntil: this.time + EMP_DISRUPT_SECONDS,
    }
    this.pushFeedbackNotice('pickup', 'EMP EMITTER', this.player.x + TANK_SIZE / 2, this.player.y)
    return true
  }

  private canPlaceMajorModStructureAt(col: number, row: number) {
    if (!this.isPlacementTerrainAt(col, row)) {
      return false
    }

    if (this.hasMajorModStructureAt(col, row)) {
      return false
    }

    if (this.deployables.some((deployable) => deployable.col === col && deployable.row === row)) {
      return false
    }

    if (this.portableRelays.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    if (this.retranslators.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    return true
  }

  private hasMajorModStructureAt(col: number, row: number) {
    return Boolean(
      (this.majorMods.hedgehog && this.majorMods.hedgehog.col === col && this.majorMods.hedgehog.row === row) ||
        (this.majorMods.emp && this.majorMods.emp.col === col && this.majorMods.emp.row === row),
    )
  }

  private isPontoonBridgeCell(col: number, row: number) {
    return Boolean(this.majorMods.pontoon?.cells.some((cell) => cell.x === col && cell.y === row))
  }

  private effectiveTankTileKindAt(col: number, row: number): TileKind {
    if (this.isPontoonBridgeCell(col, row) && this.tileKindAt(col, row) === 'water') {
      return 'road'
    }

    return this.tileKindAt(col, row)
  }

  private isTankPassableAt(col: number, row: number) {
    return this.isInBounds(col, row) && this.isPassableForTank(this.effectiveTankTileKindAt(col, row))
  }

  private updateEmpEmitter(dt: number) {
    const emitter = this.majorMods.emp
    if (!emitter) {
      return
    }

    emitter.nextPulseIn = Math.max(0, emitter.nextPulseIn - dt)
    if (emitter.nextPulseIn > 0) {
      return
    }

    emitter.disruptingUntil = Math.max(emitter.disruptingUntil, this.time + EMP_DISRUPT_SECONDS)
    emitter.nextPulseIn += EMP_PULSE_PERIOD_SECONDS
    this.pushFeedbackNotice('pickup', 'EMP PULSE', emitter.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + emitter.row * TILE_SIZE)
  }

  private isEmpPulseActive() {
    return Boolean(this.majorMods.emp && this.time < this.majorMods.emp.disruptingUntil)
  }

  private getEmpDisruptionProgress() {
    const emitter = this.majorMods.emp
    if (!emitter || !this.isEmpPulseActive()) {
      return 0
    }

    const remaining = Math.max(0, emitter.disruptingUntil - this.time)
    return clamp(1 - remaining / EMP_DISRUPT_SECONDS, 0, 1)
  }

  private getEmpVisionFade() {
    if (!this.isEmpPulseActive()) {
      return 0
    }

    return clamp(1 - (this.getEmpDisruptionProgress() * EMP_DISRUPT_SECONDS) / EMP_VISION_FADE_SECONDS, 0, 1)
  }

  private isCellEmpDisrupted(col: number, row: number) {
    const emitter = this.majorMods.emp
    if (!emitter || !this.isEmpPulseActive()) {
      return false
    }

    return this.distanceCells({ x: col, y: row }, { x: emitter.col, y: emitter.row }) <= EMP_RADIUS_TILES
  }

  private triggerHedgehog(tank: Tank) {
    const hedgehog = this.majorMods.hedgehog
    if (!hedgehog || hedgehog.trappedTankId || tank.col !== hedgehog.col || tank.row !== hedgehog.row) {
      return
    }

    tank.immobilized = Math.max(tank.immobilized, HEDGEHOG_TRAP_SECONDS)
    hedgehog.trappedTankId = tank.id
    this.pushFeedbackNotice('pickup', 'TANK TRAPPED', tank.x + TANK_SIZE / 2, tank.y)
    this.addImpactFeedback(0.14, 0.1)
  }

  private hitMajorModWithBullet(bullet: Bullet) {
    const hedgehog = this.majorMods.hedgehog
    if (!hedgehog) {
      return false
    }

    const centerX = bullet.x + BULLET_SIZE / 2
    const centerY = bullet.y + BULLET_SIZE / 2
    const col = Math.floor((centerX - ARENA_X) / TILE_SIZE)
    const row = Math.floor((centerY - ARENA_Y) / TILE_SIZE)
    if (col !== hedgehog.col || row !== hedgehog.row) {
      return false
    }

    hedgehog.hitsTaken = Math.min(HEDGEHOG_REQUIRED_HITS, hedgehog.hitsTaken + 1)
    this.queueSound('hit')
    this.addImpactFeedback(0.05, 0.04)
    this.burst(centerX, centerY, '#cfd3d8', 5)

    if (hedgehog.hitsTaken >= HEDGEHOG_REQUIRED_HITS) {
      this.releaseHedgehogTrap()
      this.majorMods.hedgehog = null
      this.burst(centerX, centerY, '#fff1a5', 12)
      this.pushFeedbackNotice('pickup', 'HEDGEHOG BROKEN', centerX, centerY)
    }

    return true
  }

  private releaseHedgehogTrap() {
    const trappedTankId = this.majorMods.hedgehog?.trappedTankId
    if (!trappedTankId) {
      return
    }

    const tank = this.getTankById(trappedTankId)
    if (tank) {
      tank.immobilized = 0
    }
  }

  private getVisibleLevelResult() {
    if (this.mode !== 'level-complete' && this.mode !== 'campaign-complete' && this.mode !== 'lost') {
      return null
    }

    return this.levelResult ? {
      ...this.levelResult,
      completedLevels: [...this.levelResult.completedLevels],
      stats: this.cloneRunStats(this.levelResult.stats),
      rewards: this.normalizeRewardLedger(this.levelResult.rewards),
    } : null
  }

  private createRewardLedger(): RewardLedger {
    return {
      killScore: 0,
      killCredits: 0,
      killXp: 0,
      pickupScore: 0,
      objectiveScore: 0,
      missionScore: 0,
      missionCredits: 0,
      missionXp: 0,
      tacticalCredits: 0,
      tacticalXp: 0,
      totalScore: 0,
      totalCredits: 0,
      totalXp: 0,
    }
  }

  private normalizeRewardLedger(value: unknown): RewardLedger {
    const candidate = value && typeof value === 'object' ? value as Partial<RewardLedger> : {}
    const ledger = {
      ...this.createRewardLedger(),
      killScore: this.safeNumber(candidate.killScore),
      killCredits: this.safeNumber(candidate.killCredits),
      killXp: this.safeNumber(candidate.killXp),
      pickupScore: this.safeNumber(candidate.pickupScore),
      objectiveScore: this.safeNumber(candidate.objectiveScore),
      missionScore: this.safeNumber(candidate.missionScore),
      missionCredits: this.safeNumber(candidate.missionCredits),
      missionXp: this.safeNumber(candidate.missionXp),
      tacticalCredits: this.safeNumber(candidate.tacticalCredits),
      tacticalXp: this.safeNumber(candidate.tacticalXp),
      totalScore: 0,
      totalCredits: 0,
      totalXp: 0,
    }

    ledger.totalScore = ledger.killScore + ledger.pickupScore + ledger.objectiveScore + ledger.missionScore
    ledger.totalCredits = ledger.killCredits + ledger.missionCredits + ledger.tacticalCredits
    ledger.totalXp = ledger.killXp + ledger.missionXp + ledger.tacticalXp
    return ledger
  }

  private createRunStats(): RunStats {
    return {
      duration: 0,
      shotsFired: 0,
      tankHits: 0,
      bricksDestroyed: 0,
      playerKills: 0,
      armoredKills: 0,
      livesLost: 0,
      repairKitUses: 0,
      baseDamageTaken: 0,
      criticalCoverDestroyed: 0,
      objectiveRelevantPowerUps: 0,
      friendlyTotal: 0,
      friendlySurvivors: 0,
      powerUps: {
        repair: 0,
        rapid: 0,
        shield: 0,
      },
      ctfCaptures: 0,
      assaultDamage: 0,
      shellsRecharged: 0,
      shrapnelHits: 0,
      portableRelaysPlaced: 0,
      portableRelaysRecovered: 0,
      portableSignalContacts: 0,
      deployablesPlaced: this.createDeployableStatsRecord(),
      deployablesRecovered: this.createDeployableStatsRecord(),
      deployablesTriggered: this.createDeployableStatsRecord(),
      rewards: this.createRewardLedger(),
    }
  }

  private createDeployableStatsRecord(): Record<OfflineDeployableKind, number> {
    return {
      decoy: 0,
      mine: 0,
      noise: 0,
      steel: 0,
      tripwire: 0,
    }
  }

  private normalizeDeployableStatsRecord(value: unknown): Record<OfflineDeployableKind, number> {
    const candidate = value && typeof value === 'object' ? value as Partial<Record<OfflineDeployableKind, number>> : {}
    return {
      decoy: this.safeNumber(candidate.decoy),
      mine: this.safeNumber(candidate.mine),
      noise: this.safeNumber(candidate.noise),
      steel: this.safeNumber(candidate.steel),
      tripwire: this.safeNumber(candidate.tripwire),
    }
  }

  private normalizeRunStats(value: unknown): RunStats {
    const candidate = value && typeof value === 'object' ? value as Partial<RunStats> : {}
    const powerUps = (candidate.powerUps ?? {}) as Partial<Record<PowerUpKind, number>>

    return {
      duration: this.safeNumber(candidate.duration),
      shotsFired: this.safeNumber(candidate.shotsFired),
      tankHits: this.safeNumber(candidate.tankHits),
      bricksDestroyed: this.safeNumber(candidate.bricksDestroyed),
      playerKills: this.safeNumber(candidate.playerKills),
      armoredKills: this.safeNumber(candidate.armoredKills),
      livesLost: this.safeNumber(candidate.livesLost),
      repairKitUses: this.safeNumber(candidate.repairKitUses),
      baseDamageTaken: this.safeNumber(candidate.baseDamageTaken),
      criticalCoverDestroyed: this.safeNumber(candidate.criticalCoverDestroyed),
      objectiveRelevantPowerUps: this.safeNumber(candidate.objectiveRelevantPowerUps),
      friendlyTotal: this.safeNumber(candidate.friendlyTotal),
      friendlySurvivors: this.safeNumber(candidate.friendlySurvivors),
      powerUps: {
        repair: this.safeNumber(powerUps.repair),
        rapid: this.safeNumber(powerUps.rapid),
        shield: this.safeNumber(powerUps.shield),
      },
      ctfCaptures: this.safeNumber(candidate.ctfCaptures),
      assaultDamage: this.safeNumber(candidate.assaultDamage),
      shellsRecharged: this.safeNumber(candidate.shellsRecharged),
      shrapnelHits: this.safeNumber(candidate.shrapnelHits),
      portableRelaysPlaced: this.safeNumber(candidate.portableRelaysPlaced),
      portableRelaysRecovered: this.safeNumber(candidate.portableRelaysRecovered),
      portableSignalContacts: this.safeNumber(candidate.portableSignalContacts),
      deployablesPlaced: this.normalizeDeployableStatsRecord(candidate.deployablesPlaced),
      deployablesRecovered: this.normalizeDeployableStatsRecord(candidate.deployablesRecovered),
      deployablesTriggered: this.normalizeDeployableStatsRecord(candidate.deployablesTriggered),
      rewards: this.normalizeRewardLedger(candidate.rewards),
    }
  }

  private cloneRunStats(stats = this.runStats): RunStats {
    return this.normalizeRunStats(JSON.parse(JSON.stringify(stats)))
  }

  private addRewards(rewards: Partial<RewardLedger>) {
    this.runStats.rewards = this.normalizeRewardLedger({
      ...this.runStats.rewards,
      killScore: this.runStats.rewards.killScore + this.safeNumber(rewards.killScore),
      killCredits: this.runStats.rewards.killCredits + this.safeNumber(rewards.killCredits),
      killXp: this.runStats.rewards.killXp + this.safeNumber(rewards.killXp),
      pickupScore: this.runStats.rewards.pickupScore + this.safeNumber(rewards.pickupScore),
      objectiveScore: this.runStats.rewards.objectiveScore + this.safeNumber(rewards.objectiveScore),
      missionScore: this.runStats.rewards.missionScore + this.safeNumber(rewards.missionScore),
      missionCredits: this.runStats.rewards.missionCredits + this.safeNumber(rewards.missionCredits),
      missionXp: this.runStats.rewards.missionXp + this.safeNumber(rewards.missionXp),
      tacticalCredits: this.runStats.rewards.tacticalCredits + this.safeNumber(rewards.tacticalCredits),
      tacticalXp: this.runStats.rewards.tacticalXp + this.safeNumber(rewards.tacticalXp),
    })
  }

  private pushFeedbackNotice(kind: FeedbackNotice['kind'], text: string, x: number | null = null, y: number | null = null) {
    this.feedbackNotices.push({
      id: `notice-${this.nextId}-${this.feedbackNotices.length}`,
      kind,
      text,
      age: 0,
      duration: FEEDBACK_NOTICE_DURATION,
      x,
      y,
    })
  }

  private safeNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback
  }

  private resetShellState() {
    this.playerShellCapacity = PLAYER_MAX_SHELLS
    this.playerShells = PLAYER_MAX_SHELLS
    this.playerShellRechargeProgress = 0
  }

  private restoreShellState(run: SavedRun | null | undefined) {
    if (!run) {
      this.resetShellState()
      return
    }

    this.playerShellCapacity = this.normalizeShellCapacity(run.playerShellCapacity)
    this.playerShells = this.normalizeShellCount(run.playerShells, this.playerShellCapacity)
    this.playerShellRechargeProgress = this.normalizeShellRechargeProgress(run.playerShellRechargeProgress)
  }

  private normalizeShellCapacity(value: unknown) {
    return Math.floor(clamp(this.safeNumber(value, PLAYER_MAX_SHELLS), 1, PLAYER_MAX_SHELLS))
  }

  private normalizeShellCount(value: unknown, capacity = this.playerShellCapacity) {
    return Math.floor(clamp(this.safeNumber(value, capacity), 0, capacity))
  }

  private normalizeShellRechargeProgress(value: unknown) {
    return clamp(this.safeNumber(value), 0, PLAYER_SHELL_RECHARGE_DURATION)
  }

  private getShellRechargeProgressRatio() {
    if (this.playerShells >= this.playerShellCapacity || !this.isPlayerOnAmmoStation()) {
      return 0
    }

    return Number(clamp(this.playerShellRechargeProgress / PLAYER_SHELL_RECHARGE_DURATION, 0, 1).toFixed(2))
  }

  private getReadableShellRechargeLine() {
    if (this.playerShells >= this.playerShellCapacity) {
      return 'Recharge full.'
    }

    if (!this.isPlayerOnAmmoStation()) {
      return 'Recharge off station.'
    }

    return `Recharge ${Math.round(this.getShellRechargeProgressRatio() * 100)}%.`
  }

  private isPlayerOnAmmoStation() {
    return !this.player.move && this.tileKindAt(this.player.col, this.player.row) === 'ammo'
  }

  private updatePlayerShellRecharge(dt: number) {
    if (this.playerShells >= this.playerShellCapacity) {
      this.playerShellRechargeProgress = 0
      return
    }

    if (!this.isPlayerOnAmmoStation()) {
      this.playerShellRechargeProgress = 0
      return
    }

    this.playerShellRechargeProgress += dt

    if (this.playerShellRechargeProgress < PLAYER_SHELL_RECHARGE_DURATION) {
      return
    }

    this.playerShellRechargeProgress -= PLAYER_SHELL_RECHARGE_DURATION
    this.playerShells = Math.min(this.playerShellCapacity, this.playerShells + 1)
    this.runStats.shellsRecharged += 1
    this.pushFeedbackNotice('ammo', 'AMMO', this.player.x + TANK_SIZE / 2, this.player.y)

    if (this.playerShells >= this.playerShellCapacity) {
      this.playerShellRechargeProgress = 0
    }
  }

  private resetPortableRelayState() {
    this.portableRelays = []
    this.clearPortableRelayTransientState()
  }

  private clearPortableRelayTransientState() {
    this.portableRelayHold = null
    this.portableRelayInputConsumed = false
    this.portableSignalWaves = []
    this.portableSignalContacts = []
  }

  private restorePortableRelayState(run: SavedRun | null | undefined) {
    this.resetPortableRelayState()
    const savedRelays = Array.isArray(run?.portableRelays) ? run?.portableRelays ?? [] : []
    const legacyRelay = run?.portableRelay?.deployed ? [run.portableRelay] : []
    const source = savedRelays.length > 0 ? savedRelays : legacyRelay
    const limit = this.getPortableRelayLimit()

    for (const [index, saved] of source.entries()) {
      if (this.portableRelays.length >= limit || saved?.deployed === false) {
        continue
      }

      const col = Math.floor(clamp(this.safeNumber(saved.col), 0, Math.max(0, this.getMapCols() - 1)))
      const row = Math.floor(clamp(this.safeNumber(saved.row), 0, Math.max(0, this.getMapRows() - 1)))
      if (!this.canPlacePortableRelayAt(col, row)) {
        continue
      }

      const savedId = (saved as { id?: unknown }).id
      this.portableRelays.push({
        id: typeof savedId === 'string' && savedId ? savedId : `portable-relay-${index + 1}`,
        col,
        row,
        pulseTimer: 0,
      })
    }
  }

  private updatePortableRelay(dt: number) {
    this.updatePortableSignalDecay(dt)
    this.updatePortableRelayPulse(dt)
    this.updatePortableSignalWaves(dt)
    this.updatePortableRelayHold(dt)
  }

  private updatePortableRelayPulse(dt: number) {
    for (const relay of this.portableRelays) {
      if (this.isCellEmpDisrupted(relay.col, relay.row)) {
        relay.pulseTimer = Math.max(relay.pulseTimer, 0.15)
        continue
      }

      relay.pulseTimer -= dt
      if (relay.pulseTimer > 0) {
        continue
      }

      this.spawnPortableRelayPulse(this.getPortableRelayCenter(relay), this.playerTeam)
      relay.pulseTimer += PORTABLE_RELAY_PULSE_PERIOD
    }
  }

  private updatePortableRelayHold(dt: number) {
    if (!this.input.relay) {
      this.portableRelayHold = null
      this.portableRelayInputConsumed = false
      return
    }

    if (this.portableRelayInputConsumed) {
      this.portableRelayHold = null
      return
    }

    const candidate = this.getPortableRelayHoldCandidate()
    if (!candidate) {
      this.portableRelayHold = null
      return
    }

    if (
      !this.portableRelayHold ||
      this.portableRelayHold.action !== candidate.action ||
      this.portableRelayHold.col !== candidate.col ||
      this.portableRelayHold.row !== candidate.row
    ) {
      this.portableRelayHold = {
        action: candidate.action,
        col: candidate.col,
        row: candidate.row,
        elapsed: 0,
        duration: candidate.duration,
      }
    }

    this.portableRelayHold.elapsed += dt
    if (this.portableRelayHold.elapsed < this.portableRelayHold.duration) {
      return
    }

    if (this.portableRelayHold.action === 'place') {
      this.placePortableRelay(this.portableRelayHold.col, this.portableRelayHold.row)
    } else {
      this.recoverPortableRelay(this.portableRelayHold.col, this.portableRelayHold.row)
    }
    this.portableRelayHold = null
    this.portableRelayInputConsumed = true
  }

  private getPortableRelayHoldCandidate(): { action: PortableRelayHoldAction; col: number; row: number; duration: number } | null {
    if (this.mode !== 'playing' || this.player.hp <= 0 || this.player.move) {
      return null
    }

    const recoverableRelay = this.getRecoverablePortableRelay()
    if (recoverableRelay) {
      return {
        action: 'recover',
        col: recoverableRelay.col,
        row: recoverableRelay.row,
        duration: PORTABLE_RELAY_RECOVER_SECONDS,
      }
    }

    if (this.portableRelays.length >= this.getPortableRelayLimit() || !this.canPlacePortableRelayAt(this.player.col, this.player.row)) {
      return null
    }

    return {
      action: 'place',
      col: this.player.col,
      row: this.player.row,
      duration: PORTABLE_RELAY_PLACE_SECONDS,
    }
  }

  private canPlacePortableRelayAt(col: number, row: number) {
    if (!this.isPlacementTerrainAt(col, row)) {
      return false
    }

    if (this.retranslators.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    if (this.portableRelays.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    if (this.hasMajorModStructureAt(col, row)) {
      return false
    }

    return true
  }

  private placePortableRelay(col: number, row: number) {
    if (this.portableRelays.length >= this.getPortableRelayLimit() || !this.canPlacePortableRelayAt(col, row)) {
      return
    }

    this.portableRelays.push({
      id: `portable-relay-${this.nextId}`,
      col,
      row,
      pulseTimer: 0,
    })
    this.nextId += 1
    this.runStats.portableRelaysPlaced += 1
    this.pushFeedbackNotice('pickup', 'RELAY', col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + row * TILE_SIZE)
  }

  private recoverPortableRelay(col: number, row: number) {
    const relay = this.portableRelays.find((candidate) => candidate.col === col && candidate.row === row)
    if (!relay) {
      return
    }

    const relayX = relay.col * TILE_SIZE + TILE_SIZE / 2
    const relayY = ARENA_Y + relay.row * TILE_SIZE
    this.portableRelays = this.portableRelays.filter((candidate) => candidate.id !== relay.id)
    this.clearPortableRelayTransientState()
    this.runStats.portableRelaysRecovered += 1
    this.pushFeedbackNotice('pickup', 'RELAY BACK', relayX, relayY)
  }

  private getRecoverablePortableRelay() {
    return this.portableRelays.find((relay) =>
      this.distanceCells({ x: this.player.col, y: this.player.row }, { x: relay.col, y: relay.row }) <= 1,
    ) ?? null
  }

  private getPortableRelayLimit() {
    return getTankClassDefinition(this.activeTankClassId).portableRelayLimit
  }

  private createDeployableConsumedState(): Record<OfflineDeployableKind, boolean> {
    return {
      decoy: false,
      mine: false,
      noise: false,
      steel: false,
      tripwire: false,
    }
  }

  private resetDeployableState() {
    this.deployables = []
    this.deployableHold = null
    this.deployableInputConsumed = this.createDeployableConsumedState()
    this.deployableAlerts = []
  }

  private restoreDeployableState(run: SavedRun | null | undefined) {
    this.deployableHold = null
    this.deployableInputConsumed = this.createDeployableConsumedState()
    this.deployables = this.normalizeDeployables(run?.deployables)
    this.deployableAlerts = this.normalizeDeployableAlerts(run?.deployableAlerts)
  }

  private normalizeDeployables(value: unknown): OfflineDeployableState[] {
    if (!Array.isArray(value)) {
      return []
    }

    const usedKinds = new Set<OfflineDeployableKind>()
    const usedCells = new Set<string>()
    const deployables: OfflineDeployableState[] = []
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') {
        continue
      }

      const candidate = entry as Partial<OfflineDeployableState>
      if (!this.isDeployableKind(candidate.kind) || !this.canUseDeployableKind(candidate.kind) || usedKinds.has(candidate.kind)) {
        continue
      }

      const col = Math.floor(clamp(this.safeNumber(candidate.col), 0, Math.max(0, this.getMapCols() - 1)))
      const row = Math.floor(clamp(this.safeNumber(candidate.row), 0, Math.max(0, this.getMapRows() - 1)))
      const key = this.key(col, row)
      if (usedCells.has(key) || !this.isDeployablePlacementTile(col, row)) {
        continue
      }

      usedKinds.add(candidate.kind)
      usedCells.add(key)
      deployables.push({
        id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `deployable-${candidate.kind}-${col}-${row}`,
        kind: candidate.kind,
        col,
        row,
        owner: 'player',
        safeTankId: typeof candidate.safeTankId === 'string' ? candidate.safeTankId : undefined,
      })
    }

    return deployables
  }

  private normalizeDeployableAlerts(value: unknown): OfflineDeployableAlertState[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          return null
        }

        const candidate = entry as Partial<OfflineDeployableAlertState>
        const kind = candidate.kind === 'noise' || candidate.kind === 'steel' || candidate.kind === 'tripwire' ? candidate.kind : null
        const side = this.normalizeCombatSide(candidate.side) ?? null
        if (!kind || !side) {
          return null
        }

        const ttl = Math.max(0.1, this.safeNumber(candidate.ttl, DEPLOYABLE_ALERT_TTL))
        const age = clamp(this.safeNumber(candidate.age), 0, ttl)
        if (age >= ttl) {
          return null
        }

        return {
          id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `deployable-alert-${kind}-${index}`,
          kind,
          side,
          team: candidate.team === 'blue' ? 'blue' : 'red',
          col: Math.floor(clamp(this.safeNumber(candidate.col), 0, Math.max(0, this.getMapCols() - 1))),
          row: Math.floor(clamp(this.safeNumber(candidate.row), 0, Math.max(0, this.getMapRows() - 1))),
          age,
          ttl,
          strength: clamp(this.safeNumber(candidate.strength, 1), 0, 1),
        }
      })
      .filter((alert): alert is OfflineDeployableAlertState => Boolean(alert))
  }

  private updateDeployables(dt: number) {
    this.updateDeployableAlerts(dt)
    this.updateDeployableHold(dt)
    this.updateDeployableTriggers()
  }

  private updateDeployableAlerts(dt: number) {
    this.deployableAlerts = this.deployableAlerts
      .map((alert) => ({ ...alert, age: alert.age + dt }))
      .filter((alert) => alert.age < alert.ttl)
  }

  private updateDeployableHold(dt: number) {
    const kind = this.getActiveDeployableInput()
    if (!kind) {
      this.deployableHold = null
      this.deployableInputConsumed = this.createDeployableConsumedState()
      return
    }

    if (this.deployableInputConsumed[kind]) {
      this.deployableHold = null
      return
    }

    const candidate = this.getDeployableHoldCandidate(kind)
    if (!candidate) {
      this.deployableHold = null
      return
    }

    if (
      !this.deployableHold ||
      this.deployableHold.kind !== candidate.kind ||
      this.deployableHold.action !== candidate.action ||
      this.deployableHold.col !== candidate.col ||
      this.deployableHold.row !== candidate.row
    ) {
      this.deployableHold = {
        kind: candidate.kind,
        action: candidate.action,
        col: candidate.col,
        row: candidate.row,
        elapsed: 0,
        duration: candidate.duration,
      }
    }

    this.deployableHold.elapsed += dt
    if (this.deployableHold.elapsed < this.deployableHold.duration) {
      return
    }

    if (this.deployableHold.action === 'place') {
      this.placeDeployable(this.deployableHold.kind, this.deployableHold.col, this.deployableHold.row)
    } else {
      this.recoverDeployable(this.deployableHold.kind)
    }
    this.deployableInputConsumed[this.deployableHold.kind] = true
    this.deployableHold = null
  }

  private getActiveDeployableInput(): OfflineDeployableKind | null {
    return DEPLOYABLE_ORDER.find((kind) => this.canUseDeployableKind(kind) && this.input[DEPLOYABLE_INPUTS[kind]]) ?? null
  }

  private getDeployableHoldCandidate(kind: OfflineDeployableKind): { kind: OfflineDeployableKind; action: OfflineDeployableHoldAction; col: number; row: number; duration: number } | null {
    if (!this.canUseDeployableKind(kind) || this.mode !== 'playing' || this.player.hp <= 0 || this.player.move) {
      return null
    }

    const active = this.getDeployableByKind(kind)
    if (active) {
      if (this.distanceCells({ x: this.player.col, y: this.player.row }, { x: active.col, y: active.row }) > 1) {
        return null
      }

      return {
        kind,
        action: 'recover',
        col: active.col,
        row: active.row,
        duration: DEPLOYABLE_RECOVER_SECONDS,
      }
    }

    if (!this.canPlaceDeployableAt(kind, this.player.col, this.player.row)) {
      return null
    }

    return {
      kind,
      action: 'place',
      col: this.player.col,
      row: this.player.row,
      duration: DEPLOYABLE_PLACE_SECONDS,
    }
  }

  private canPlaceDeployableAt(kind: OfflineDeployableKind, col: number, row: number) {
    if (!this.canUseDeployableKind(kind) || this.getDeployableByKind(kind) || !this.isDeployablePlacementTile(col, row)) {
      return false
    }

    if (this.deployables.some((deployable) => deployable.col === col && deployable.row === row)) {
      return false
    }

    if (this.retranslators.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    if (this.portableRelays.some((relay) => relay.col === col && relay.row === row)) {
      return false
    }

    if (this.hasMajorModStructureAt(col, row)) {
      return false
    }

    return !this.getTanks().some((tank) => {
      if (tank.id === this.player.id) {
        return false
      }
      const occupied = tank.move ? { x: tank.move.toCol, y: tank.move.toRow } : { x: tank.col, y: tank.row }
      return occupied.x === col && occupied.y === row
    })
  }

  private isDeployablePlacementTile(col: number, row: number) {
    if (!this.isInBounds(col, row)) {
      return false
    }

    return this.isPlacementTerrainAt(col, row)
  }

  private isPlacementTerrainAt(col: number, row: number) {
    if (!this.isInBounds(col, row)) {
      return false
    }

    const kind = this.tileKindAt(col, row)
    return kind === 'empty' || kind === 'road' || (SELECTED_TERRAIN_EVIDENCE_IDS.includes(kind) && isPassableTerrain(kind))
  }

  private placeDeployable(kind: OfflineDeployableKind, col: number, row: number) {
    if (!this.canPlaceDeployableAt(kind, col, row)) {
      return
    }

    const deployable: OfflineDeployableState = {
      id: `deployable-${kind}-${this.nextId}`,
      kind,
      col,
      row,
      owner: 'player',
      safeTankId: this.player.id,
    }
    this.nextId += 1
    this.deployables.push(deployable)
    this.runStats.deployablesPlaced[kind] += 1
    this.pushFeedbackNotice('pickup', DEPLOYABLE_LABELS[kind], col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + row * TILE_SIZE)
  }

  private recoverDeployable(kind: OfflineDeployableKind) {
    const active = this.getDeployableByKind(kind)
    if (!active) {
      return
    }

    this.deployables = this.deployables.filter((deployable) => deployable.id !== active.id)
    this.runStats.deployablesRecovered[kind] += 1
    this.pushFeedbackNotice('pickup', `${DEPLOYABLE_LABELS[kind]} BACK`, active.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + active.row * TILE_SIZE)
  }

  private getDeployableByKind(kind: OfflineDeployableKind) {
    return this.deployables.find((deployable) => deployable.kind === kind) ?? null
  }

  private canUseDeployableKind(kind: OfflineDeployableKind) {
    return this.getAllowedDeployables().includes(kind)
  }

  private getAllowedDeployables() {
    return getTankClassDefinition(this.activeTankClassId).deployables
  }

  private updateDeployableTriggers() {
    const consumed = new Set<string>()
    for (const deployable of this.deployables) {
      this.updateDeployableSafeTank(deployable)
      const target = this.findDeployableTriggerTarget(deployable)
      if (!target) {
        continue
      }

      this.triggerDeployable(deployable, target)
      this.runStats.deployablesTriggered[deployable.kind] += 1
      consumed.add(deployable.id)
    }

    if (consumed.size > 0) {
      this.deployables = this.deployables.filter((deployable) => !consumed.has(deployable.id))
    }
  }

  private findDeployableTriggerTarget(deployable: OfflineDeployableState): Tank | null {
    if (deployable.kind === 'decoy') {
      return null
    }

    const candidates = this.getTanks().filter((tank) => tank.hp > 0)
    if (deployable.kind === 'steel') {
      return candidates.find((tank) => tank.id !== deployable.safeTankId && tank.col === deployable.col && tank.row === deployable.row) ?? null
    }

    const hostiles = candidates.filter((tank) => tank.side !== 'player')
    if (deployable.kind === 'tripwire') {
      return hostiles.find((tank) => tank.col === deployable.col && tank.row === deployable.row) ?? null
    }

    return hostiles.find((tank) => this.distanceCells({ x: tank.col, y: tank.row }, { x: deployable.col, y: deployable.row }) <= MINE_TRIGGER_RADIUS) ?? null
  }

  private updateDeployableSafeTank(deployable: OfflineDeployableState) {
    if (!deployable.safeTankId) {
      return
    }

    const tank = this.getTankById(deployable.safeTankId)
    if (!tank || tank.col !== deployable.col || tank.row !== deployable.row) {
      deployable.safeTankId = undefined
    }
  }

  private triggerDeployable(deployable: OfflineDeployableState, tank: Tank) {
    if (deployable.kind === 'mine') {
      this.applyMineDeployable(deployable, tank)
      return
    }

    if (deployable.kind === 'noise') {
      this.addDeployableAlert('noise', 'player', deployable.col, deployable.row, tank.side, tank.team)
      this.pushFeedbackNotice('pickup', 'NOISE', deployable.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + deployable.row * TILE_SIZE)
      return
    }

    if (deployable.kind === 'steel') {
      this.applySteelTrapDeployable(deployable, tank)
      return
    }

    if (deployable.kind === 'tripwire') {
      this.addDeployableAlert('tripwire', 'player', deployable.col, deployable.row, tank.side, tank.team)
      this.pushFeedbackNotice('pickup', 'WIRE', deployable.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + deployable.row * TILE_SIZE)
    }
  }

  private applyMineDeployable(deployable: OfflineDeployableState, tank: Tank) {
    this.burst(ARENA_X + (deployable.col + 0.5) * TILE_SIZE, ARENA_Y + (deployable.row + 0.5) * TILE_SIZE, '#ffd35a', 16)
    this.addImpactFeedback(0.12, 0.08)
    this.damageTankFromDeployable(tank, MINE_DAMAGE)
    const current = this.getTankById(tank.id)
    if (current && current.hp > 0) {
      current.slow = Math.max(current.slow, MINE_SLOW_SECONDS)
    }
    this.pushFeedbackNotice('pickup', 'MINE', deployable.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + deployable.row * TILE_SIZE)
  }

  private applySteelTrapDeployable(deployable: OfflineDeployableState, tank: Tank) {
    tank.immobilized = Math.max(tank.immobilized, STEEL_TRAP_SECONDS)
    if (tank.move) {
      const position = gridToTankPosition(tank.col, tank.row)
      tank.x = position.x
      tank.y = position.y
      tank.move = null
    }
    this.addDeployableAlert('steel', 'enemy', deployable.col, deployable.row, 'player', this.playerTeam)
    this.pushFeedbackNotice('pickup', 'STEEL', deployable.col * TILE_SIZE + TILE_SIZE / 2, ARENA_Y + deployable.row * TILE_SIZE)
  }

  private damageTankFromDeployable(tank: Tank, damage: number) {
    if (tank.faction === 'player') {
      this.damagePlayer(damage)
      return
    }

    if (this.isTerrainEvidenceSentinel(tank)) {
      tank.hp = tank.maxHp
      return
    }

    const remainingDamage = this.absorbDamageWithShield(tank, damage)
    if (remainingDamage <= 0) {
      return
    }

    tank.hp -= remainingDamage
    this.burst(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2, '#fff0a8', 8)
    if (tank.hp <= 0) {
      this.destroyEnemy(tank, {
        id: `deployable-hit-${this.nextId}`,
        owner: 'player',
        ownerId: this.player.id,
        side: 'player',
        team: this.playerTeam,
        x: tank.x,
        y: tank.y,
        dir: 'up',
        speed: 0,
        damage,
        ttl: 0,
      })
      this.nextId += 1
    }
  }

  private addDeployableAlert(
    kind: OfflineDeployableAlertState['kind'],
    side: CombatSide,
    col: number,
    row: number,
    reportedSide: CombatSide,
    reportedTeam: Team,
  ) {
    const id = `deployable-alert-${kind}-${this.nextId}`
    this.nextId += 1
    const alert: OfflineDeployableAlertState = {
      id,
      kind,
      side,
      team: reportedTeam,
      col,
      row,
      age: 0,
      ttl: DEPLOYABLE_ALERT_TTL,
      strength: 1,
    }
    this.deployableAlerts.push(alert)
    this.visionMemory[side][id] = {
      id,
      side: reportedSide,
      team: reportedTeam,
      col,
      row,
      seenAt: this.time,
      alert: true,
      source: kind,
    }
  }

  private updatePortableSignalDecay(dt: number) {
    this.portableSignalContacts = this.portableSignalContacts
      .map((contact) => ({ ...contact, age: contact.age + dt }))
      .filter((contact) => contact.age < contact.ttl)
  }

  private spawnPortableRelayPulse(
    center: { x: number; y: number },
    sourceTeam?: Team,
    detectsHostiles = true,
    startRadius = 0,
    rayCount = PORTABLE_RELAY_RAY_COUNT,
  ) {
    for (let index = 0; index < rayCount; index += 1) {
      const angle = (Math.PI * 2 * index) / rayCount
      const ringOffset = Math.max(0, startRadius + (startRadius > 0 ? (index % 4) * 3 : 0))
      const previousOffset = Math.max(0, ringOffset - 7)
      const vx = Math.cos(angle)
      const vy = Math.sin(angle)
      this.portableSignalWaves.push({
        id: `portable-signal-${this.nextId}-${index}`,
        x: center.x + vx * ringOffset,
        y: center.y + vy * ringOffset,
        previousX: center.x + vx * previousOffset,
        previousY: center.y + vy * previousOffset,
        sourceTeam,
        detectsHostiles,
        vx,
        vy,
        age: 0,
        ttl: PORTABLE_RELAY_WAVE_TTL,
        strength: PORTABLE_RELAY_SIGNAL_STRENGTH,
        bounces: 0,
      })
    }
    this.nextId += 1
  }

  private updatePortableSignalWaves(dt: number) {
    if (this.portableSignalWaves.length === 0) {
      return
    }

    const nextWaves: PortableSignalWaveState[] = []
    for (const wave of this.portableSignalWaves) {
      wave.age += dt
      if (wave.age >= wave.ttl || wave.strength < PORTABLE_RELAY_MIN_STRENGTH) {
        continue
      }

      wave.previousX = wave.x
      wave.previousY = wave.y
      const nextX = wave.x + wave.vx * PORTABLE_RELAY_WAVE_SPEED * dt
      const nextY = wave.y + wave.vy * PORTABLE_RELAY_WAVE_SPEED * dt

      const wallBounce = this.getPortableSignalWallBounce(wave, nextX, nextY)
      if (wallBounce) {
        this.bouncePortableSignalWave(wave, wallBounce.flipX, wallBounce.flipY)
        this.addPortableSignalContact('wall', wallBounce.col, wallBounce.row, nextX, nextY, wave.strength)
        nextWaves.push(wave)
        continue
      }

      if (wave.detectsHostiles) {
        const decoy = this.getPortableSignalDecoyHit(wave, nextX, nextY)
        if (decoy) {
          this.reflectPortableSignalWaveFromPoint(wave, ARENA_X + (decoy.col + 0.5) * TILE_SIZE, ARENA_Y + (decoy.row + 0.5) * TILE_SIZE)
          this.addPortableSignalContact('hostile', decoy.col, decoy.row, nextX, nextY, wave.strength, decoy.id, this.enemyTeam)
          nextWaves.push(wave)
          continue
        }

        const hostile = this.getPortableSignalHostileHit(wave, nextX, nextY)
        if (hostile) {
          this.reflectPortableSignalWaveFromTank(wave, hostile)
          this.addPortableSignalContact('hostile', hostile.col, hostile.row, nextX, nextY, wave.strength, hostile.id, hostile.team)
          nextWaves.push(wave)
          continue
        }
      }

      wave.x = nextX
      wave.y = nextY
      nextWaves.push(wave)
    }

    this.portableSignalWaves = nextWaves
  }

  private getPortableSignalWallBounce(wave: PortableSignalWaveState, nextX: number, nextY: number) {
    const next = this.getSignalCell(nextX, nextY)
    if (!next || this.isPortableSignalSolidCell(next.col, next.row)) {
      const clamped = this.clampSignalCell(next?.col ?? this.getSignalCol(nextX), next?.row ?? this.getSignalRow(nextY))
      return { ...clamped, flipX: true, flipY: true }
    }

    const horizontalCell = this.getSignalCell(nextX, wave.y)
    const verticalCell = this.getSignalCell(wave.x, nextY)
    const hitHorizontal = !horizontalCell || this.isPortableSignalSolidCell(horizontalCell.col, horizontalCell.row)
    const hitVertical = !verticalCell || this.isPortableSignalSolidCell(verticalCell.col, verticalCell.row)

    if (!hitHorizontal && !hitVertical) {
      return null
    }

    const contact = this.clampSignalCell(
      (hitHorizontal ? horizontalCell?.col : verticalCell?.col) ?? next.col,
      (hitVertical ? verticalCell?.row : horizontalCell?.row) ?? next.row,
    )
    return {
      ...contact,
      flipX: hitHorizontal || !hitVertical,
      flipY: hitVertical || !hitHorizontal,
    }
  }

  private getPortableSignalHostileHit(wave: PortableSignalWaveState, nextX: number, nextY: number) {
    const probe = {
      x: nextX - 2,
      y: nextY - 2,
      w: 4,
      h: 4,
    }

    return this.getTanks().find((tank) => {
      if (tank.hp <= 0 || tank.faction === 'player' || tank.side === 'player') {
        return false
      }
      if (!rectsIntersect(probe, tankRect(tank))) {
        return false
      }
      const previousProbe = { x: wave.x - 2, y: wave.y - 2, w: 4, h: 4 }
      return !rectsIntersect(previousProbe, tankRect(tank))
    }) ?? null
  }

  private getPortableSignalDecoyHit(wave: PortableSignalWaveState, nextX: number, nextY: number) {
    const probe = {
      x: nextX - 2,
      y: nextY - 2,
      w: 4,
      h: 4,
    }

    return this.deployables.find((deployable) => {
      if (deployable.kind !== 'decoy') {
        return false
      }

      const rect = {
        x: ARENA_X + deployable.col * TILE_SIZE + 6,
        y: ARENA_Y + deployable.row * TILE_SIZE + 6,
        w: TILE_SIZE - 12,
        h: TILE_SIZE - 12,
      }
      if (!rectsIntersect(probe, rect)) {
        return false
      }

      const previousProbe = { x: wave.x - 2, y: wave.y - 2, w: 4, h: 4 }
      return !rectsIntersect(previousProbe, rect)
    }) ?? null
  }

  private bouncePortableSignalWave(wave: PortableSignalWaveState, flipX: boolean, flipY: boolean) {
    if (flipX) wave.vx *= -1
    if (flipY) wave.vy *= -1
    wave.bounces += 1
    wave.strength *= PORTABLE_RELAY_BOUNCE_STRENGTH
    if (wave.bounces > PORTABLE_RELAY_MAX_BOUNCES) {
      wave.age = wave.ttl
    }
  }

  private reflectPortableSignalWaveFromTank(wave: PortableSignalWaveState, tank: Tank) {
    const center = tankCenter(tank)
    this.reflectPortableSignalWaveFromPoint(wave, center.x, center.y)
  }

  private reflectPortableSignalWaveFromPoint(wave: PortableSignalWaveState, centerX: number, centerY: number) {
    let nx = wave.x - centerX
    let ny = wave.y - centerY
    const length = Math.hypot(nx, ny) || 1
    nx /= length
    ny /= length
    const dot = wave.vx * nx + wave.vy * ny
    wave.vx -= 2 * dot * nx
    wave.vy -= 2 * dot * ny
    wave.bounces += 1
    wave.strength *= PORTABLE_RELAY_BOUNCE_STRENGTH
    if (wave.bounces > PORTABLE_RELAY_MAX_BOUNCES) {
      wave.age = wave.ttl
    }
  }

  private addPortableSignalContact(
    kind: PortableSignalContactState['kind'],
    col: number,
    row: number,
    x: number,
    y: number,
    strength: number,
    tankId?: string,
    team?: Team,
  ) {
    const cell = this.clampSignalCell(col, row)
    const existingIndex = tankId
      ? this.portableSignalContacts.findIndex((contact) => contact.tankId === tankId)
      : this.portableSignalContacts.findIndex((contact) => contact.kind === kind && contact.col === cell.col && contact.row === cell.row)
    const contact: PortableSignalContactState = {
      id: tankId ? `portable-contact-${tankId}` : `portable-contact-${kind}-${cell.col}-${cell.row}`,
      kind,
      col: cell.col,
      row: cell.row,
      x,
      y,
      age: 0,
      ttl: PORTABLE_RELAY_CONTACT_TTL,
      strength,
      tankId,
      team,
    }

    if (existingIndex >= 0) {
      this.portableSignalContacts[existingIndex] = contact
    } else {
      this.portableSignalContacts.push(contact)
      this.runStats.portableSignalContacts += 1
    }
  }

  private getPortableRelayCenter(relay: PortableRelayState) {
    return {
      x: ARENA_X + relay.col * TILE_SIZE + TILE_SIZE / 2,
      y: ARENA_Y + relay.row * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  private isPortableSignalSolidCell(col: number, row: number) {
    return !this.isInBounds(col, row) || this.isSolidForBullet(this.tileKindAt(col, row))
  }

  private getSignalCell(x: number, y: number): { col: number; row: number } | null {
    const col = this.getSignalCol(x)
    const row = this.getSignalRow(y)
    if (!this.isInBounds(col, row)) {
      return null
    }
    return { col, row }
  }

  private getSignalCol(x: number) {
    return Math.floor((x - ARENA_X) / TILE_SIZE)
  }

  private getSignalRow(y: number) {
    return Math.floor((y - ARENA_Y) / TILE_SIZE)
  }

  private clampSignalCell(col: number, row: number): { col: number; row: number } {
    return {
      col: Math.floor(clamp(col, 0, Math.max(0, this.getMapCols() - 1))),
      row: Math.floor(clamp(row, 0, Math.max(0, this.getMapRows() - 1))),
    }
  }

  private getPortableRelaySnapshot(): PortableRelaySnapshot {
    const hold = this.portableRelayHold
    const primaryRelay = this.portableRelays[0] ?? null
    const limit = this.getPortableRelayLimit()
    const status: PortableRelaySnapshot['status'] = hold
      ? hold.action === 'place' ? 'placing' : 'recovering'
      : this.portableRelays.length > 0 ? 'deployed' : 'ready'

    return {
      available: this.portableRelays.length < limit,
      deployed: this.portableRelays.length > 0,
      col: primaryRelay?.col ?? null,
      row: primaryRelay?.row ?? null,
      activeCount: this.portableRelays.length,
      limit,
      relays: this.portableRelays.map((relay) => ({ id: relay.id, col: relay.col, row: relay.row })),
      status,
      label: this.getPortableRelayLabel(status, hold, this.portableRelays.length, limit),
      hold: hold
        ? {
            action: hold.action,
            col: hold.col,
            row: hold.row,
            progress: Number(clamp(hold.elapsed / hold.duration, 0, 1).toFixed(2)),
            duration: Number(hold.duration.toFixed(2)),
            remaining: Number(Math.max(0, hold.duration - hold.elapsed).toFixed(2)),
            label: hold.action === 'place' ? 'HOLD E PLACE' : 'HOLD E PICKUP',
          }
        : null,
      waveCount: this.portableSignalWaves.length,
      signalContacts: this.portableSignalContacts.map((contact) => this.clonePortableSignalContact(contact)),
      waves: this.portableSignalWaves.map((wave) => this.clonePortableSignalWave(wave)),
    }
  }

  private getPortableRelayLabel(status: PortableRelaySnapshot['status'], hold: PortableRelayHoldState | null, activeCount: number, limit: number) {
    if (hold) {
      return `RELAY ${Math.round(clamp(hold.elapsed / hold.duration, 0, 1) * 100)}%`
    }
    if (status === 'deployed') {
      return limit > 1 ? `RELAY ${activeCount}/${limit}` : 'RELAY OUT'
    }
    return limit > 1 ? `RELAY 0/${limit}` : 'RELAY READY'
  }

  private clonePortableSignalWave(wave: PortableSignalWaveState): PortableSignalWaveSnapshot {
    return {
      id: wave.id,
      x: Math.round(wave.x),
      y: Math.round(wave.y),
      previousX: Math.round(wave.previousX),
      previousY: Math.round(wave.previousY),
      sourceTeam: wave.sourceTeam,
      age: Number(wave.age.toFixed(2)),
      ttl: Number(wave.ttl.toFixed(2)),
      strength: Number(wave.strength.toFixed(2)),
      bounces: wave.bounces,
    }
  }

  private clonePortableSignalContact(contact: PortableSignalContactState): PortableSignalContactSnapshot {
    const publicId = contact.kind === 'hostile'
      ? `portable-contact-hostile-${contact.col}-${contact.row}`
      : contact.id

    return {
      id: publicId,
      kind: contact.kind,
      col: contact.col,
      row: contact.row,
      x: Math.round(contact.x),
      y: Math.round(contact.y),
      age: Number(contact.age.toFixed(2)),
      ttl: Number(contact.ttl.toFixed(2)),
      strength: Number(contact.strength.toFixed(2)),
      team: contact.team,
    }
  }

  private getDeployablesSnapshot(): OfflineDeployablesSnapshot {
    const hold = this.deployableHold
    const available = this.getAllowedDeployables()
    return {
      active: this.deployables.map((deployable) => this.cloneDeployableSnapshot(deployable)),
      available: [...available],
      hold: hold
        ? {
            kind: hold.kind,
            action: hold.action,
            key: DEPLOYABLE_KEYS[hold.kind],
            col: hold.col,
            row: hold.row,
            progress: Number(clamp(hold.elapsed / hold.duration, 0, 1).toFixed(2)),
            duration: Number(hold.duration.toFixed(2)),
            remaining: Number(Math.max(0, hold.duration - hold.elapsed).toFixed(2)),
            label: `HOLD ${DEPLOYABLE_KEYS[hold.kind]} ${hold.action === 'place' ? DEPLOYABLE_LABELS[hold.kind] : 'PICKUP'}`,
          }
        : null,
      alerts: this.deployableAlerts
        .filter((alert) => alert.side === 'player')
        .map((alert) => this.cloneDeployableAlertSnapshot(alert)),
      label: this.getDeployablesLabel(hold, available.length),
    }
  }

  private cloneDeployableSnapshot(deployable: OfflineDeployableState): OfflineDeployableSnapshot {
    return {
      id: `deployable-${deployable.kind}-${deployable.col}-${deployable.row}`,
      kind: deployable.kind,
      col: deployable.col,
      row: deployable.row,
      owner: deployable.owner,
      label: `${DEPLOYABLE_KEYS[deployable.kind]} ${DEPLOYABLE_LABELS[deployable.kind]}`,
    }
  }

  private cloneDeployableAlertSnapshot(alert: OfflineDeployableAlertState): OfflineDeployableAlertSnapshot {
    return {
      id: `deployable-alert-${alert.kind}-${alert.col}-${alert.row}`,
      kind: alert.kind,
      side: alert.side,
      team: alert.team,
      col: alert.col,
      row: alert.row,
      age: Number(alert.age.toFixed(2)),
      ttl: Number(alert.ttl.toFixed(2)),
      strength: Number(alert.strength.toFixed(2)),
      label: `${DEPLOYABLE_LABELS[alert.kind]} ${alert.team}`,
    }
  }

  private getDeployablesLabel(hold: OfflineDeployableHoldState | null, availableCount: number) {
    if (hold) {
      return `${DEPLOYABLE_LABELS[hold.kind]} ${Math.round(clamp(hold.elapsed / hold.duration, 0, 1) * 100)}%`
    }

    return availableCount > 0 ? `GEAR ${this.deployables.length}/${availableCount}` : 'GEAR NONE'
  }

  private getMajorModsSnapshot(vision: OfflineVisionModel): MajorModsSnapshot {
    const visibleTracks = this.treadTracks
      .map((track) => {
        const visibility = this.getTreadTrackVisibility(track, vision)
        if (visibility <= 0.01) {
          return null
        }
        const surfaceVisibility = visibility * terrainDefinition(track.surface).tracks.visibilityMultiplier

        return {
          id: track.id,
          tankId: track.tankId,
          col: track.col,
          row: track.row,
          dir: track.dir,
          team: track.team,
          weight: track.weight,
          age: Number(track.age.toFixed(2)),
          ttl: Number(track.ttl.toFixed(2)),
          visibility: Number(surfaceVisibility.toFixed(2)),
          overdrive: track.overdrive,
          surface: track.surface,
        }
      })
      .filter((track): track is TreadTrackSnapshot => Boolean(track))

    return {
      selected: this.progression.selectedMajorMod,
      overdrive: {
        active: this.majorMods.overdriveRemaining > 0,
        remaining: Number(this.majorMods.overdriveRemaining.toFixed(2)),
        cooldown: Number(this.majorMods.overdriveCooldown.toFixed(2)),
        duration: this.getOverdriveDuration(),
        ready: this.majorMods.overdriveRemaining <= 0 && this.majorMods.overdriveCooldown <= 0,
      },
      pontoon: {
        active: Boolean(this.majorMods.pontoon),
        cells: this.majorMods.pontoon?.cells.map((cell) => ({ ...cell })) ?? [],
        dir: this.majorMods.pontoon?.dir ?? 'up',
      },
      hedgehog: this.majorMods.hedgehog
        ? {
            active: true,
            spent: this.majorMods.hedgehogSpent,
            col: this.majorMods.hedgehog.col,
            row: this.majorMods.hedgehog.row,
            hitsTaken: this.majorMods.hedgehog.hitsTaken,
            hitsRequired: HEDGEHOG_REQUIRED_HITS,
            hitsRemaining: Math.max(0, HEDGEHOG_REQUIRED_HITS - this.majorMods.hedgehog.hitsTaken),
            trappedTankId: this.majorMods.hedgehog.trappedTankId,
          }
        : {
            active: false,
            spent: this.majorMods.hedgehogSpent,
            col: null,
            row: null,
            hitsTaken: 0,
            hitsRequired: HEDGEHOG_REQUIRED_HITS,
            hitsRemaining: 0,
            trappedTankId: null,
          },
      emp: this.majorMods.emp
        ? {
            active: true,
            col: this.majorMods.emp.col,
            row: this.majorMods.emp.row,
            radius: EMP_RADIUS_TILES,
            nextPulseIn: Number(this.majorMods.emp.nextPulseIn.toFixed(2)),
            disrupting: this.isEmpPulseActive(),
            disruptingRemaining: Number(Math.max(0, this.majorMods.emp.disruptingUntil - this.time).toFixed(2)),
            disruptionProgress: Number(this.getEmpDisruptionProgress().toFixed(2)),
            visionFade: Number(this.getEmpVisionFade().toFixed(2)),
          }
        : {
            active: false,
            col: null,
            row: null,
            radius: EMP_RADIUS_TILES,
            nextPulseIn: 0,
            disrupting: false,
            disruptingRemaining: 0,
            disruptionProgress: 0,
            visionFade: 0,
          },
      tracks: visibleTracks,
    }
  }

  private normalizePontoonBridge(value: unknown): PontoonBridgeState | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const candidate = value as Partial<PontoonBridgeState>
    const cells = Array.isArray(candidate.cells)
      ? candidate.cells
          .map((cell) => {
            if (!cell || typeof cell !== 'object') return null
            const raw = cell as Partial<Vec>
            const x = Math.floor(this.safeNumber(raw.x, -1))
            const y = Math.floor(this.safeNumber(raw.y, -1))
            return this.isInBounds(x, y) ? { x, y } : null
          })
          .filter((cell): cell is Vec => Boolean(cell))
      : []

    const dir: Direction = candidate.dir === 'right' || candidate.dir === 'down' || candidate.dir === 'left' ? candidate.dir : 'up'
    return cells.length > 0 ? { cells, dir } : null
  }

  private normalizeHedgehog(value: unknown): HedgehogState | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const candidate = value as Partial<HedgehogState & { hp?: number; maxHp?: number }>
    const col = Math.floor(this.safeNumber(candidate.col, -1))
    const row = Math.floor(this.safeNumber(candidate.row, -1))
    const legacyHp = candidate.hp === undefined ? null : Math.floor(clamp(this.safeNumber(candidate.hp, HEDGEHOG_REQUIRED_HITS), 0, HEDGEHOG_REQUIRED_HITS))
    const legacyHitsTaken = legacyHp === null ? 0 : HEDGEHOG_REQUIRED_HITS - legacyHp
    const hitsTaken = Math.floor(clamp(this.safeNumber(candidate.hitsTaken, legacyHitsTaken), 0, HEDGEHOG_REQUIRED_HITS))
    if (!this.isInBounds(col, row) || hitsTaken >= HEDGEHOG_REQUIRED_HITS) {
      return null
    }

    return {
      col,
      row,
      hitsTaken,
      trappedTankId: typeof candidate.trappedTankId === 'string' ? candidate.trappedTankId : null,
    }
  }

  private normalizeEmpEmitter(value: unknown): EmpEmitterState | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const candidate = value as Partial<EmpEmitterSnapshot>
    const col = Math.floor(this.safeNumber(candidate.col, -1))
    const row = Math.floor(this.safeNumber(candidate.row, -1))
    if (!this.isInBounds(col, row)) {
      return null
    }

    return {
      col,
      row,
      nextPulseIn: Math.max(0, this.safeNumber(candidate.nextPulseIn)),
      disruptingUntil: this.time + Math.max(0, this.safeNumber(candidate.disruptingRemaining)),
    }
  }

  private normalizeTreadTracks(value: unknown): TreadTrackState[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') return null
        const candidate = entry as Partial<TreadTrackState>
        const col = Math.floor(this.safeNumber(candidate.col, -1))
        const row = Math.floor(this.safeNumber(candidate.row, -1))
        const weight: TreadTrackSnapshot['weight'] = candidate.weight === 'light' || candidate.weight === 'heavy' ? candidate.weight : 'medium'
        const dir: Direction = candidate.dir === 'right' || candidate.dir === 'down' || candidate.dir === 'left' ? candidate.dir : 'up'
        const team: Team = candidate.team === 'red' ? 'red' : 'blue'
        const surface: TileKind = candidate.surface && TERRAIN_TYPE_IDS.includes(candidate.surface) ? candidate.surface : this.tileKindAt(col, row)
        const ttl = Math.max(0.1, this.safeNumber(candidate.ttl, this.getTreadTrackTtl(weight)))
        const age = clamp(this.safeNumber(candidate.age), 0, ttl)
        const visibility = clamp(this.safeNumber(candidate.visibility, 0), 0, 1)
        const fallbackLastSeenAt = visibility > 0 ? this.time - (1 - visibility) * TREAD_TRACK_FOG_FADE_SECONDS : this.time - TREAD_TRACK_FOG_FADE_SECONDS
        const lastSeenAt = this.safeNumber(candidate.lastSeenAt, fallbackLastSeenAt)
        if (!this.isInBounds(col, row) || age >= ttl) return null
        return {
          id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `track-saved-${index}`,
          tankId: typeof candidate.tankId === 'string' && candidate.tankId ? candidate.tankId : '',
          col,
          row,
          dir,
          team,
          weight,
          age,
          ttl,
          visibility,
          lastSeenAt,
          overdrive: candidate.overdrive === true,
          surface,
        }
      })
      .filter((track): track is TreadTrackState => Boolean(track))
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

  private getSelectableLevels() {
    const allowed = new Set<number>([
      ...this.progression.completedLevels,
      this.clampLevelId(this.progression.unlockedStage),
    ])
    return this.levels.filter((level) => allowed.has(level.id))
  }

  private markLevelCompleted(levelId: number) {
    const completed = new Set(this.progression.completedLevels)
    completed.add(this.clampLevelId(levelId))
    this.progression.completedLevels = [...completed].sort((a, b) => a - b)
  }

  private getInitialSpawnTotal() {
    const objective = this.currentObjective
    if (objective.mode === 'ffa') {
      return objective.neutralTotal ?? this.currentLevel.enemyTotal
    }
    return objective.enemyTickets ?? this.currentLevel.enemyTotal
  }

  private getFriendlyTargetCount() {
    const objective = this.currentObjective
    if (objective.mode !== 'team-battle' && objective.mode !== 'ctf' && objective.mode !== 'assault') {
      return 0
    }

    return Math.min(objective.friendlyTotal ?? 0, objective.friendlySpawns?.length ?? 0)
  }

  private isFriendlyBot(tank: Tank) {
    return tank.side === 'player' && tank.faction !== 'player'
  }

  private getActiveFriendlyBotCount() {
    return this.enemies.filter((tank) => this.isFriendlyBot(tank)).length
  }

  private getSpawnSide(): CombatSide {
    return this.currentObjective.mode === 'ffa' ? 'neutral' : 'enemy'
  }

  private createObjectiveState(): SavedObjectiveState {
    const objective = this.currentObjective
    return {
      mode: objective.mode,
      label: objective.label,
      winCondition: objective.winCondition,
      playerScore: 0,
      enemyScore: 0,
      neutralScore: 0,
      targetScore: objective.targetScore ?? objective.flag?.capturesToWin ?? 0,
      flag: objective.flag
        ? {
            playerBase: { ...objective.flag.playerBase },
            enemyHome: { ...objective.flag.enemyFlag },
            position: { ...objective.flag.enemyFlag },
            carrierId: null,
            captures: 0,
            capturesToWin: objective.flag.capturesToWin,
          }
        : null,
      assault: objective.assault
        ? {
            cell: { ...objective.assault.cell },
            hp: objective.assault.hp,
            maxHp: objective.assault.hp,
          }
        : null,
    }
  }

  private getObjectiveSnapshot(): SavedObjectiveState {
    return JSON.parse(JSON.stringify(this.objectiveState)) as SavedObjectiveState
  }

  private spawnInitialObjectiveActors() {
    const friendlyTotal = this.getFriendlyTargetCount()
    this.runStats.friendlyTotal = friendlyTotal

    for (let index = 0; index < friendlyTotal; index += 1) {
      if (!this.spawnFriendlyBot(index)) {
        this.friendlyRespawnTimer = this.currentLevel.spawnInterval
        break
      }
    }

    this.spawnEnemy()
  }

  private updateObjectiveState() {
    if (this.objectiveState.mode === 'ctf') {
      this.updateFlagState()
    }
  }

  private updateFlagState() {
    const flag = this.objectiveState.flag
    if (!flag) return

    const carrier = flag.carrierId ? this.getTankById(flag.carrierId) : null
    if (carrier) {
      flag.position = { x: carrier.col, y: carrier.row }
      if (carrier.id === this.player.id && carrier.col === flag.playerBase.x && carrier.row === flag.playerBase.y) {
        flag.captures += 1
        this.runStats.ctfCaptures += 1
        flag.carrierId = null
        flag.position = { ...flag.enemyHome }
        this.score += 300
        this.addRewards({ objectiveScore: 300 })
        this.pushFeedbackNotice('reward', 'FLAG CAPTURE +300', carrier.x + TANK_SIZE / 2, carrier.y)
        this.queueSound('level-clear')
      }
      return
    }

    flag.carrierId = null
    if (this.player.col === flag.position.x && this.player.row === flag.position.y) {
      flag.carrierId = this.player.id
      return
    }

    const enemyOnDroppedFlag = this.enemies.find(
      (tank) => tank.side === 'enemy' && tank.col === flag.position.x && tank.row === flag.position.y,
    )
    if (enemyOnDroppedFlag) {
      flag.position = { ...flag.enemyHome }
    }
  }

  private dropFlagIfCarrier(tankId: string) {
    const flag = this.objectiveState.flag
    if (flag?.carrierId === tankId) {
      const carrier = this.getTankById(tankId)
      flag.carrierId = null
      flag.position = carrier ? { x: carrier.col, y: carrier.row } : { ...flag.enemyHome }
    }
  }

  private isObjectiveComplete() {
    const mode = this.objectiveState.mode
    if (mode === 'ctf') {
      return Boolean(this.objectiveState.flag && this.objectiveState.flag.captures >= this.objectiveState.flag.capturesToWin)
    }
    if (mode === 'ffa') {
      return this.objectiveState.playerScore >= Math.max(1, this.objectiveState.targetScore) ||
        (this.enemiesRemaining <= 0 && this.enemies.length === 0)
    }
    if (mode === 'assault') {
      return Boolean(this.objectiveState.assault && this.objectiveState.assault.hp <= 0)
    }
    return this.enemiesRemaining <= 0 && this.enemies.filter((tank) => tank.side === 'enemy').length === 0
  }

  private getTankById(id: string) {
    if (this.player.id === id) return this.player
    return this.enemies.find((tank) => tank.id === id) ?? null
  }

  private distanceCells(a: Vec, b: Vec) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  private areHostile(a: Tank, b: Tank) {
    if (this.currentObjective.mode === 'ffa') {
      return a.id !== b.id
    }
    return a.side !== b.side
  }

  private isBulletHostileToTank(bullet: Bullet, tank: Tank) {
    if (this.currentObjective.mode === 'ffa') {
      return bullet.ownerId !== tank.id
    }
    return this.bulletSide(bullet) !== tank.side
  }

  private bulletSide(bullet: Bullet): CombatSide {
    return bullet.side ?? (bullet.owner === 'player' ? 'player' : 'enemy')
  }

  private confirmMainMenu(id: string) {
    this.encyclopediaTopicId = null

    if (id === 'continue') {
      this.continueSavedRun()
    } else if (id === 'new') {
      this.mode = 'level-select'
      this.menuIndex = 0
    } else if (id === 'garage') {
      this.mode = 'garage'
      this.menuIndex = 0
    } else if (id === 'tank') {
      this.tankSelectReturnMode = 'main-menu'
      this.mode = 'tank-select'
      this.menuIndex = TANK_CLASS_ORDER.indexOf(this.progression.selectedTankClass)
    } else if (id === 'settings') {
      this.mode = 'settings'
      this.menuIndex = 0
    } else if (id === 'online') {
      this.mode = 'online-menu'
      this.menuIndex = 0
    } else if (id === 'team') {
      this.mode = 'team-select'
      this.menuIndex = this.playerTeam === 'blue' ? 0 : 1
    } else if (id === 'encyclopedia') {
      this.mode = 'encyclopedia'
      this.menuIndex = 0
      this.encyclopediaTopicId = null
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
        { id: 'new', label: 'Campaign' },
        { id: 'garage', label: 'Garage' },
        { id: 'tank', label: `Tank: ${getTankClassDefinition(this.progression.selectedTankClass).label}` },
        { id: 'online', label: 'Online Battle' },
        { id: 'settings', label: 'Settings' },
        { id: 'team', label: `Team: ${this.playerTeam.toUpperCase()}` },
        { id: 'encyclopedia', label: 'Encyclopedia' },
      )
      return items
    }

    if (this.mode === 'level-select') {
      const selectable = this.getSelectableLevels()
      return [
        ...selectable.map((level) => ({
          id: `level-${level.id}`,
          label: `${level.id}. ${(level.objective ?? DEFAULT_OBJECTIVE).label}: ${level.name}`,
        })),
        { id: 'back', label: 'Back' },
      ]
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

    if (this.mode === 'tank-select') {
      return [
        ...TANK_CLASS_ORDER.map((id) => ({
          id,
          label: this.progression.selectedTankClass === id ? `${TANK_CLASS_DEFINITIONS[id].label} *` : TANK_CLASS_DEFINITIONS[id].label,
        })),
        { id: 'back', label: 'Back' },
      ]
    }

    if (this.mode === 'garage') {
      return [
        { id: 'tank-select', label: `Tank Class: ${getTankClassDefinition(this.progression.selectedTankClass).label}` },
        ...MAJOR_MOD_ORDER.map((kind) => ({ id: kind, label: this.getMajorModLabel(kind) })),
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

    if (this.mode === 'encyclopedia') {
      if (this.encyclopediaTopicId) {
        return [{ id: 'back', label: 'Back' }]
      }

      return ENCYCLOPEDIA_TOPICS.map(({ id, label }) => ({ id, label }))
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
        { id: 'select', label: 'Level Select' },
        { id: 'garage', label: 'Garage' },
        { id: 'menu', label: 'Main Menu' },
      ]
    }

    if (this.mode === 'campaign-complete') {
      return [
        { id: 'select', label: 'Level Select' },
        { id: 'garage', label: 'Garage' },
        { id: 'menu', label: 'Main Menu' },
      ]
    }

    if (this.mode === 'won' || this.mode === 'lost') {
      return [{ id: 'menu', label: 'Main Menu' }]
    }

    return []
  }

  private isEncyclopediaTopicId(id: string): id is EncyclopediaTopicId {
    return id !== 'back' && ENCYCLOPEDIA_TOPICS.some((topic) => topic.id === id)
  }

  private isTankClassId(id: string): id is TankClassId {
    return id === 'scout' || id === 'engineer' || id === 'battle'
  }

  private isMajorModKind(id: string): id is MajorModKind {
    return id === 'overdrive' || id === 'pontoon' || id === 'hedgehog' || id === 'emp'
  }

  private getEncyclopediaTopicById(id: EncyclopediaTopicId | null) {
    return id ? ENCYCLOPEDIA_TOPICS.find((topic) => topic.id === id) ?? null : null
  }

  private getActiveEncyclopediaTopic() {
    return this.getEncyclopediaTopicById(this.encyclopediaTopicId)
  }

  private openEncyclopediaTopic(id: EncyclopediaTopicId) {
    this.encyclopediaTopicId = id
    this.menuIndex = 0
  }

  private closeEncyclopediaTopic() {
    const previousTopicId = this.encyclopediaTopicId
    this.encyclopediaTopicId = null
    const previousIndex = ENCYCLOPEDIA_TOPICS.findIndex((topic) => topic.id === previousTopicId)
    this.menuIndex = previousIndex >= 0 ? previousIndex : 0
  }

  private getEncyclopediaPresentation(): EncyclopediaPresentation | null {
    if (this.mode !== 'encyclopedia') {
      return null
    }

    const activeTopic = this.getActiveEncyclopediaTopic()

    if (activeTopic) {
      return {
        activeTopic: activeTopic.id,
        title: activeTopic.label,
        summary: [...activeTopic.summary],
        entries: activeTopic.entries.map((entry) => ({ ...entry })),
      }
    }

    const selectedTopic = ENCYCLOPEDIA_TOPICS[this.menuIndex] ?? ENCYCLOPEDIA_TOPICS[0]

    return {
      activeTopic: null,
      title: 'Encyclopedia',
      summary: selectedTopic ? [...selectedTopic.helper] : [],
      entries: [],
    }
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

    if (this.mode === 'level-select') {
      return withPressState({
        title: 'Campaign',
        options,
        selectedIndex,
        helper: [
          'Choose a completed mission or the next unlocked challenge.',
          `Completed ${this.progression.completedLevels.length}/${this.maxLevelId}  Next Level ${this.progression.unlockedStage}`,
        ],
      })
    }

    if (this.mode === 'briefing') {
      return withPressState({
        title: `L${this.currentLevel.id} ${this.currentObjective.label}`,
        options,
        selectedIndex,
        helper: this.getBriefingHelperLines(),
      })
    }

    if (this.mode === 'garage') {
      const selectedMod = this.getGaragePresentation()?.selectedMod
      const selectedItem = items[selectedIndex]
      if (selectedItem?.id === 'tank-select') {
        const selectedClass = getTankClassDefinition(this.progression.selectedTankClass)
        return withPressState({
          title: `Mods Bay  LV ${this.progression.unlockedStage}  $${this.progression.credits}  XP ${this.progression.xp}`,
          options,
          selectedIndex,
          helper: [
            `Current tank: ${selectedClass.label}.`,
            'Class equipment stays fixed; choose one Major Mod below.',
            this.savedRun ? 'Continue keeps the saved mission class.' : 'No saved mission is locked.',
          ],
        })
      }

      return withPressState({
        title: `Mods Bay  LV ${this.progression.unlockedStage}  $${this.progression.credits}  XP ${this.progression.xp}`,
        options,
        selectedIndex,
        helper: selectedMod
          ? [
              selectedMod.description,
              `Effect: ${selectedMod.effect}`,
              `Tradeoff: ${selectedMod.tradeoff}`,
            ]
            : [
              'Select one Major Mod for the next mission.',
              'Credits and XP are service record, not permanent combat power.',
            ],
      })
    }

    if (this.mode === 'tank-select') {
      const selectedClass = this.getTankClassPresentation(TANK_CLASS_ORDER[selectedIndex] ?? this.progression.selectedTankClass)
      return withPressState({
        title: 'Tank Select',
        options,
        selectedIndex,
        helper: [
          `${selectedClass.label}: ${selectedClass.description}`,
          selectedClass.stats.join('  '),
          `Equipment: ${selectedClass.equipment.join(', ')}`,
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

    if (this.mode === 'encyclopedia') {
      const activeTopic = this.getActiveEncyclopediaTopic()
      if (activeTopic) {
        return withPressState({
          title: activeTopic.label,
          options,
          selectedIndex,
          helper: activeTopic.summary,
        })
      }

      const topic = ENCYCLOPEDIA_TOPICS[selectedIndex] ?? ENCYCLOPEDIA_TOPICS[0]
      return withPressState({
        title: 'Encyclopedia',
        options,
        selectedIndex,
        helper: topic?.helper ?? [],
      })
    }

    if (this.mode === 'paused') {
      return withPressState({
        title: 'Paused',
        options,
        selectedIndex,
        helper: [this.getPauseHelperLine(items[selectedIndex]?.id)],
      })
    }

    if (this.mode === 'level-complete') {
      const resultLines = this.getResultHelperLines()

      return withPressState({
        title: `Level ${this.completedLevelId ?? this.currentLevelId} Clear`,
        options,
        selectedIndex,
        helper: resultLines.length > 0
          ? resultLines
          : [
              `Rewards saved. Unlocked through Level ${this.progression.unlockedStage}.`,
              `Score ${this.score}  Best ${this.progression.bestScore}`,
            ],
      })
    }

    if (this.mode === 'campaign-complete') {
      const resultLines = this.getResultHelperLines()

      return withPressState({
        title: 'Campaign Complete',
        options,
        selectedIndex,
        helper: resultLines.length > 0
          ? [...resultLines, this.getRetryRecoveryLine()]
          : [
              'The final objective is broken. Completed levels remain selectable.',
              `Final score ${this.score}  Best ${this.progression.bestScore}`,
            ],
      })
    }

    if (this.mode === 'won') {
      return withPressState({
        title: 'City Held',
        options,
        selectedIndex,
        helper: [`Score ${this.score}`, 'Wave bonus saved. Return to the Garage for Mods.'],
      })
    }

    if (this.mode === 'lost') {
      const resultLines = this.getResultHelperLines()

      return withPressState({
        title: 'Base Lost',
        options,
        selectedIndex,
        helper: resultLines.length > 0
          ? [...resultLines, this.getRetryRecoveryLine()]
          : [`Score ${this.score}`, this.getRetryRecoveryLine()],
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
          this.getLoadingRecoveryLine(),
        ],
      })
    }

    return withPressState({
      title: 'Tanchiki',
      options,
      selectedIndex,
      helper: [
        `Team ${this.playerTeam.toUpperCase()}  Tank ${getTankClassDefinition(this.progression.selectedTankClass).label}  Best ${this.progression.bestScore}`,
        `Unlocked ${this.progression.unlockedStage}/${this.maxLevelId}. Campaign opens a briefing first.`,
      ],
    })
  }

  private getMajorModLabel(kind: MajorModKind) {
    return this.progression.selectedMajorMod === kind ? `${MAJOR_MOD_LABELS[kind]} *` : MAJOR_MOD_LABELS[kind]
  }

  private getUpgradeStats(): UpgradeStats {
    return this.getUpgradeStatsFor(this.activeTankClassId)
  }

  private getUpgradeStatsFor(classId: TankClassId = this.activeTankClassId): UpgradeStats {
    const base = {
      maxHp: 3,
      reloadTime: PLAYER_BASE_RELOAD,
      bulletDamage: 2,
      moveDuration: PLAYER_BASE_MOVE_DURATION,
      repairCharges: 0,
    }
    const definition = getTankClassDefinition(classId)
    const damage = Math.max(1, base.bulletDamage + definition.damageDelta)
    const stats: UpgradeStats = {
      tankClass: definition.id,
      maxHp: base.maxHp,
      shield: definition.shieldPoints,
      reloadTime: Number((base.reloadTime * definition.reloadMultiplier).toFixed(3)),
      bulletDamage: damage,
      moveDuration: Number(Math.max(definition.minMoveDuration, base.moveDuration * definition.moveMultiplier).toFixed(3)),
      repairCharges: base.repairCharges,
    }

    if (definition.splash) {
      stats.splashDamage = PLAYER_SHELL_SPLASH_DAMAGE
      stats.splashRadius = PLAYER_SHELL_SPLASH_RADIUS
    }

    return stats
  }

  private getGaragePresentation() {
    if (this.mode !== 'garage') {
      return null
    }

    const mods = MAJOR_MOD_ORDER.map((kind) => this.getMajorModPresentation(kind))
    const selectedItem = this.getMenuItems()[this.menuIndex]
    const selectedKind = selectedItem && this.isMajorModKind(selectedItem.id) ? selectedItem.id : null
    return {
      selectedMod: selectedKind ? this.getMajorModPresentation(selectedKind) : null,
      mods,
    }
  }

  private getMajorModPresentation(kind: MajorModKind): MajorModPresentation {
    return {
      kind,
      label: MAJOR_MOD_LABELS[kind],
      selected: this.progression.selectedMajorMod === kind,
      status: this.getMajorModStatus(kind),
      description: this.getMajorModDescription(kind),
      effect: this.getMajorModEffect(kind),
      tradeoff: this.getMajorModTradeoff(kind),
    }
  }

  private getMajorModStatus(kind: MajorModKind): MajorModPresentation['status'] {
    if (kind === 'overdrive') {
      if (this.majorMods.overdriveRemaining > 0) return 'active'
      if (this.majorMods.overdriveCooldown > 0) return 'cooldown'
      return 'ready'
    }

    if (kind === 'pontoon') {
      return this.majorMods.pontoon ? 'placed' : 'ready'
    }

    if (kind === 'hedgehog') {
      if (this.majorMods.hedgehogSpent && !this.majorMods.hedgehog) return 'spent'
      return this.majorMods.hedgehog ? 'placed' : 'ready'
    }

    return this.majorMods.emp ? 'placed' : 'ready'
  }

  private getMajorModDescription(kind: MajorModKind) {
    if (kind === 'overdrive') return 'Burst speed for repositioning, escape, or objective pressure.'
    if (kind === 'pontoon') return 'Place one bridge across a valid river line from shore to shore.'
    if (kind === 'hedgehog') return 'Trap the next tank that drives over it until the obstacle is destroyed.'
    return 'Pulse a local relay blackout that affects both teams.'
  }

  private getMajorModEffect(kind: MajorModKind) {
    if (kind === 'overdrive') return `X: 2x movement for ${this.formatSeconds(this.getOverdriveDuration())}.`
    if (kind === 'pontoon') return 'X: bridge contiguous water only when a far shore is valid.'
    if (kind === 'hedgehog') return `X: place one trap that takes ${HEDGEHOG_REQUIRED_HITS} direct hits to destroy.`
    return `X: place one emitter; ${this.formatSeconds(EMP_DISRUPT_SECONDS)} blackout every ${EMP_PULSE_PERIOD_SECONDS}s.`
  }

  private getMajorModTradeoff(kind: MajorModKind) {
    if (kind === 'overdrive') return 'Tracks last twice as long while boosted.'
    if (kind === 'pontoon') return 'Bridge opens the route for enemies too.'
    if (kind === 'hedgehog') return 'Usable once per mission, even after it is destroyed.'
    return 'Friendly and enemy relays are disrupted in the same radius.'
  }

  private formatSeconds(value: number) {
    return `${value.toFixed(2)}s`
  }

  private getBriefingHelperLines() {
    return [
      this.getBriefingSummary(),
      this.getObjectiveBriefingLine(),
      this.getControlsHelpLine(),
    ]
  }

  private getBriefingSummary() {
    const briefing = this.currentLevel.briefing.trim()
    const withoutModePrefix = briefing.replace(/^Mode:\s*[^.]+[.]\s*/i, '').trim()
    return withoutModePrefix || this.currentObjective.briefing
  }

  private getObjectiveBriefingLine() {
    const total = this.getInitialSpawnTotal()
    const enemyLabel = total === 1 ? 'enemy' : 'enemies'

    if (this.currentObjective.mode === 'defense') {
      return `Objective: protect the eagle base and clear all ${total} ${enemyLabel}.`
    }

    if (this.currentObjective.mode === 'team-battle') {
      return 'Objective: fight with allies until enemy tickets are gone.'
    }

    if (this.currentObjective.mode === 'ctf') {
      const captures = this.currentObjective.flag?.capturesToWin ?? 1
      return `Objective: bring the enemy flag home ${captures} ${captures === 1 ? 'time' : 'times'}.`
    }

    if (this.currentObjective.mode === 'ffa') {
      return `Objective: every tank is hostile; score ${Math.max(1, this.currentObjective.targetScore ?? 1)} kills.`
    }

    return 'Objective: break the command core before your lives run out.'
  }

  private getControlsHelpLine() {
    return 'Controls: WASD/Arrows move, Space fires, X uses Mod, Hold E relays, P pauses.'
  }

  private getRecoveryHelpLine() {
    return 'Recovery: Pause offers Save And Quit or Restart; Esc backs out before launch.'
  }

  private getLoadingRecoveryLine() {
    return 'Esc returns to briefing before the fight starts.'
  }

  private getRetryRecoveryLine() {
    return 'Retry: Campaign reopens briefing; credits stay.'
  }

  private getResultHelperLines() {
    const result = this.getVisibleLevelResult()

    if (!result) {
      return []
    }

    const powerUpTotal = result.stats.powerUps.repair + result.stats.powerUps.rapid + result.stats.powerUps.shield
    const primaryReason = this.shortenResultLine(result.tactical.reasons[0] ?? result.tactical.objectiveInterpretation, 56)
    const accuracy = Math.round(result.tactical.metrics.accuracy * 100)
    const bonus = result.tactical.rewardModifier.creditsBonus > 0 || result.tactical.rewardModifier.xpBonus > 0
      ? `Bonus +$${result.tactical.rewardModifier.creditsBonus} +${result.tactical.rewardModifier.xpBonus}XP`
      : 'No tactical bonus'
    return [
      `Tactic ${result.tactical.style}: ${result.tactical.quality}`,
      primaryReason,
      `Hit rate ${accuracy}%  Bricks ${result.stats.bricksDestroyed}  Cover ${result.stats.criticalCoverDestroyed}  Power ${powerUpTotal}`,
      `Earned +$${result.rewards.totalCredits} +${result.rewards.totalXp}XP  ${bonus}`,
    ]
  }

  private shortenResultLine(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value
    }

    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
  }

  private getReadableTextSnapshot(menu: MenuPresentation, readability: LevelReadabilitySummary) {
    const visibleMarkers = readability.markers
      .filter((marker) => marker.visible)
      .map((marker) => this.formatReadableMarker(marker))
    const offscreenPrimary = readability.markers
      .filter((marker) => marker.priority === 'primary' && !marker.visible)
      .map((marker) => this.formatReadableMarker(marker))
    const labels = [...new Set(readability.markers.map((marker) => marker.label))]

    return {
      screen: this.mode,
      title: menu.title,
      menuOptions: [...menu.options],
      helper: [...menu.helper],
      hud: {
        team: `Team ${this.playerTeam}`,
        tankClass: `Tank ${getTankClassDefinition(this.activeTankClassId).label}`,
        link: `Link ${this.getOwnedRelayCount('player')}/${this.retranslators.length} ${this.hasSideRelay('player') ? 'TEAM' : 'SOLO'}`,
        score: `Score ${this.score}`,
        health: `Health ${this.player.hp}/${this.player.maxHp}`,
        lives: `Lives ${this.lives}`,
        enemies: `Enemies remaining ${this.enemiesRemaining + this.enemies.filter((tank) => tank.side !== 'player').length}`,
        level: `Level ${this.currentLevelId}: ${this.currentLevel.name}`,
        credits: `Credits ${this.progression.credits}`,
        objective: this.getReadableObjectiveLine(),
        shells: `Shells ${this.playerShells}/${this.playerShellCapacity}`,
        recharge: this.getReadableShellRechargeLine(),
        relay: this.getPortableRelaySnapshot().label,
        gear: this.getDeployablesSnapshot().label,
        mod: this.getReadableMajorModLine(),
        alerts: this.getReadableDeployableAlertsLine(),
      },
      touch: {
        visible: this.touchControlsVisible,
        labels: this.touchControlsVisible ? ['Move', 'Fire', 'Relay', 'Pause'] : [],
      },
      levelMarkers: {
        visible: visibleMarkers,
        offscreenPrimary,
        labels,
      },
      results: this.getResultHelperLines(),
      encyclopedia: {
        activeTopic: this.getEncyclopediaPresentation()?.activeTopic ?? null,
        entries: this.getEncyclopediaPresentation()?.entries.map((entry) => `${entry.label}: ${entry.description} [${entry.visual}]`) ?? [],
      },
    }
  }

  private getReadableDeployableAlertsLine() {
    const alerts = this.getDeployablesSnapshot().alerts
    if (alerts.length === 0) {
      return 'Alerts none'
    }

    return alerts
      .map((alert) => `${DEPLOYABLE_LABELS[alert.kind]} ${alert.team} col ${alert.col} row ${alert.row}`)
      .join('; ')
  }

  private getReadableMajorModLine() {
    const selected = this.progression.selectedMajorMod
    const label = MAJOR_MOD_LABELS[selected]

    if (selected === 'overdrive') {
      if (this.majorMods.overdriveRemaining > 0) return `${label} active ${this.formatSeconds(this.majorMods.overdriveRemaining)}`
      if (this.majorMods.overdriveCooldown > 0) return `${label} cooling ${this.formatSeconds(this.majorMods.overdriveCooldown)}`
      return `${label} ready on X`
    }

    if (selected === 'hedgehog' && this.majorMods.hedgehog) {
      return `${label} ${Math.max(0, HEDGEHOG_REQUIRED_HITS - this.majorMods.hedgehog.hitsTaken)} hits left`
    }

    const status = this.getMajorModStatus(selected)
    return status === 'spent' ? `${label} spent` : `${label} ${status} on X`
  }

  private getReadableObjectiveLine() {
    if (this.objectiveState.mode === 'ctf' && this.objectiveState.flag) {
      const carrier = this.objectiveState.flag.carrierId ? 'flag carried' : 'flag waiting'
      return `Capture the flag: ${this.objectiveState.flag.captures}/${this.objectiveState.flag.capturesToWin}; ${carrier}.`
    }

    if (this.objectiveState.mode === 'ffa') {
      return `Free For All kills: ${this.objectiveState.playerScore}/${this.objectiveState.targetScore}.`
    }

    if (this.objectiveState.mode === 'assault' && this.objectiveState.assault) {
      return `Enemy core health: ${this.objectiveState.assault.hp}/${this.objectiveState.assault.maxHp}.`
    }

    return `Base health ${this.baseHp}/${BASE_MAX_HP}; enemies remaining ${this.enemiesRemaining + this.enemies.filter((tank) => tank.side === 'enemy').length}.`
  }

  private formatReadableMarker(marker: LevelReadabilityMarker) {
    const label = marker.visible ? marker.label : `${marker.label} ${this.getReadableOffscreenDirection(marker)}`
    const team = marker.team ? ` ${marker.team}` : ''
    const visibility = marker.visible ? 'visible' : 'off screen'
    return `${label}${team} ${marker.kind} ${visibility} at col ${marker.col}, row ${marker.row}`
  }

  private getReadableOffscreenDirection(marker: LevelReadabilityMarker) {
    const pointX = ARENA_X + (marker.col + 0.5 - this.camera.current.col) * TILE_SIZE
    const pointY = ARENA_Y + (marker.row + 0.5 - this.camera.current.row) * TILE_SIZE
    const arenaBottom = ARENA_Y + BATTLEFIELD_VIEW_ROWS * TILE_SIZE

    if (pointY < ARENA_Y) return 'UP'
    if (pointY > arenaBottom) return 'DOWN'
    if (pointX < ARENA_X) return 'LEFT'
    return 'RIGHT'
  }

  private createPlayer(): Tank {
    const stats = this.getUpgradeStats()
    const spawn = this.resolveSafeSpawn(this.currentLevel.playerSpawn, 'player')

    if (!spawn) {
      throw new Error('No safe player spawn available')
    }

    const player = this.createTank({
      id: 'player',
      faction: 'player',
      classId: this.activeTankClassId,
      side: 'player',
      team: this.playerTeam,
      role: null,
      col: spawn.x,
      row: spawn.y,
      dir: 'up',
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      reload: 0,
      reloadTime: stats.reloadTime,
      scoreValue: 0,
      repairCharges: this.repairCharges,
    })
    player.shield = stats.shield
    return player
  }

  private createEnemy(spawn: Vec, side: CombatSide = this.getSpawnSide()): Tank | null {
    const id = `enemy-${this.nextId}`
    const safeSpawn = this.resolveSafeSpawn(spawn, id)

    if (!safeSpawn) {
      return null
    }

    if (this.currentLevelId === TERRAIN_EVIDENCE_TEST_LEVEL_ID) {
      return this.createTerrainEvidenceSentinel(safeSpawn)
    }

    const spawnedCount = this.currentLevel.enemyTotal - this.enemiesRemaining
    const armoredStart = Math.floor(this.currentLevel.enemyTotal * (1 - this.currentLevel.armoredEnemyRatio))
    const armored = spawnedCount >= armoredStart
    const role = this.pickEnemyRole()
    const maxHp = armored ? ENEMY_ARMORED_MAX_HP : ENEMY_NORMAL_MAX_HP
    return this.createTank({
      id,
      faction: 'enemy',
      classId: null,
      side,
      team: side === 'player' ? this.playerTeam : this.enemyTeam,
      role,
      col: safeSpawn.x,
      row: safeSpawn.y,
      dir: 'down',
      hp: maxHp,
      maxHp,
      reload: 0.7 + this.random() * 0.6,
      reloadTime: role === 'wall_breaker' ? ENEMY_WALL_BREAKER_RELOAD : ENEMY_DEFAULT_RELOAD,
      scoreValue: armored ? 250 : 100,
      repairCharges: 0,
    })
  }

  private createTerrainEvidenceSentinel(spawn: Vec) {
    const sentinel = this.createTank({
      id: TERRAIN_EVIDENCE_SENTINEL_ID,
      faction: 'enemy',
      classId: null,
      side: 'enemy',
      team: this.enemyTeam,
      role: 'hunter',
      col: spawn.x,
      row: spawn.y,
      dir: 'up',
      hp: TERRAIN_EVIDENCE_SENTINEL_HP,
      maxHp: TERRAIN_EVIDENCE_SENTINEL_HP,
      reload: 999,
      reloadTime: 999,
      scoreValue: 0,
      repairCharges: 0,
    })
    sentinel.aiCooldown = TERRAIN_EVIDENCE_SENTINEL_INITIAL_DELAY
    return sentinel
  }

  private createFriendlyBot(spawn: Vec): Tank | null {
    const id = `ally-${this.nextId}`
    const safeSpawn = this.resolveSafeSpawn(spawn, id)

    if (!safeSpawn) {
      return null
    }

    return this.createTank({
      id,
      faction: 'enemy',
      classId: null,
      side: 'player',
      team: this.playerTeam,
      role: 'hunter',
      col: safeSpawn.x,
      row: safeSpawn.y,
      dir: 'up',
      hp: FRIENDLY_BOT_MAX_HP,
      maxHp: FRIENDLY_BOT_MAX_HP,
      reload: 0.5 + this.random() * 0.4,
      reloadTime: ENEMY_DEFAULT_RELOAD,
      scoreValue: 0,
      repairCharges: 0,
    })
  }

  private createTank(config: {
    id: string
    faction: 'player' | 'enemy'
    classId: TankClassId | null
    side: CombatSide
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
      classId: config.classId,
      side: config.side,
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
      aiCooldown: config.faction === 'enemy' ? ENEMY_INITIAL_AI_COOLDOWN : 0.1,
      turnCooldown: 0.2,
      spawnGrace: config.faction === 'player' ? 1.2 : 0.6,
      scoreValue: config.scoreValue,
      shield: 0,
      rapid: 0,
      repairCharges: config.repairCharges,
      slow: 0,
      immobilized: 0,
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
      this.triggerHedgehog(enemy)

      if (this.updateTerrainEvidenceSentinel(enemy, dt)) {
        continue
      }

      if (!this.aiEnabled || enemy.move) {
        continue
      }

      if (enemy.immobilized > 0) {
        enemy.aiCooldown = Math.max(enemy.aiCooldown, 0.08)
        continue
      }

      enemy.aiCooldown -= dt

      if (enemy.aiCooldown > 0) {
        continue
      }

      const outcome = this.runEnemyDecision(enemy)
      const reactionDelay = Math.max(ENEMY_AI_COOLDOWN_BASE, this.botDifficulty.reactionDelayMs / 1000)
      enemy.aiCooldown = outcome === 'moved' ? 0 : reactionDelay + this.random() * ENEMY_AI_COOLDOWN_RANDOM
    }
  }

  private updateTankTimers(tank: Tank, dt: number) {
    tank.reload = Math.max(0, tank.reload - dt)
    tank.spawnGrace = Math.max(0, tank.spawnGrace - dt)
    tank.rapid = Math.max(0, tank.rapid - dt)
    tank.slow = Math.max(0, tank.slow - dt)
    tank.immobilized = Math.max(0, tank.immobilized - dt)

    if (tank.faction === 'player') {
      tank.reloadTime =
        tank.rapid > 0
          ? Math.max(PLAYER_RAPID_MIN_RELOAD, this.getUpgradeStats().reloadTime - PLAYER_RAPID_RELOAD_BONUS)
          : this.getUpgradeStats().reloadTime
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
      const completedMove = tank.move
      const direction = this.directionTo(completedMove.fromCol, completedMove.fromRow, completedMove.toCol, completedMove.toRow)
      const sourceSurface = this.effectiveTankTileKindAt(completedMove.fromCol, completedMove.fromRow)
      const targetSurface = this.effectiveTankTileKindAt(completedMove.toCol, completedMove.toRow)
      tank.col = tank.move.toCol
      tank.row = tank.move.toRow
      tank.x = to.x
      tank.y = to.y
      if (!terrainDefinition(sourceSurface).tracks.suppress && !terrainDefinition(targetSurface).tracks.suppress) {
        this.addTreadTrack(tank, completedMove.fromCol, completedMove.fromRow, direction, targetSurface)
      }
      this.addMovementTerrainEvidence(tank, targetSurface, completedMove.toCol, completedMove.toRow, direction)
      tank.move = null
      this.triggerHedgehog(tank)
      if (!completedMove.slide && terrainDefinition(targetSurface).control.slideOnStop) {
        this.tryStartTerrainSlide(tank, direction)
      }
    }
  }

  private tryStartTerrainSlide(tank: Tank, direction: Direction) {
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
      duration: Math.max(0.12, this.getMoveDurationForTank(tank, targetCol, targetRow) * 0.55),
      slide: true,
    }
    return true
  }

  private addMovementTerrainEvidence(tank: Tank, surface: TileKind, col: number, row: number, dir: Direction) {
    const definition = terrainDefinition(surface)
    const weight = this.getTankWeight(tank)
    const weightMultiplier = weight === 'heavy' ? 1.25 : weight === 'light' ? 0.82 : 1
    const overdriveMultiplier = this.isOverdriveActiveFor(tank) ? 1.3 : 1
    const strength = clamp(definition.noise.multiplier * weightMultiplier * overdriveMultiplier, 0.15, 1.5)

    if (definition.evidence.dustTrail) {
      this.addTerrainEvidence('dust', tank, col, row, dir, 1.05, clamp(strength, 0.25, 1.1), 'DUST')
    }

    if (definition.evidence.echoDistortion) {
      this.triggerEchoTerrainPulse(tank)
      return
    }

    if (definition.evidence.rustle) {
      this.addTerrainEvidence('rustle', tank, col, row, dir, 1.9, clamp(strength, 0.25, 1.2), definition.noise.label)
      return
    }

    if (definition.control.slideOnStop) {
      this.addTerrainEvidence('metal', tank, col, row, dir, 1.5, clamp(strength, 0.3, 1.2), definition.noise.label)
      return
    }

    if (definition.noise.marker) {
      this.addTerrainEvidence('noise', tank, col, row, dir, 1.8, clamp(strength, 0.2, 1.2), definition.noise.label)
    }
  }

  private addTerrainEvidence(
    kind: TerrainEvidenceKind,
    tank: Tank,
    col: number,
    row: number,
    dir: Direction | undefined,
    ttl: number,
    strength: number,
    label: string,
    sourceSurface: TileKind = this.tileKindAt(col, row),
  ) {
    let evidenceCol = col
    let evidenceRow = row
    let evidenceKind = kind
    let side = tank.side
    const sourceDefinition = terrainDefinition(sourceSurface)

    if (sourceDefinition.evidence.echoDistortion || kind === 'echo') {
      const distorted = this.distortEchoEvidenceCell(col, row)
      evidenceCol = distorted.x
      evidenceRow = distorted.y
      evidenceKind = 'echo'
    }

    if (tank.side !== 'player' && !this.isTankVisibleToVision(tank, this.getPlayerVisionModel())) {
      if (!sourceDefinition.noise.marker && !sourceDefinition.evidence.dustTrail && !sourceDefinition.evidence.rustle) {
        return
      }

      const approximate = this.distortHiddenEvidenceCell(col, row, tank.id)
      evidenceCol = approximate.x
      evidenceRow = approximate.y
      side = 'player'
    }

    if (!this.isInBounds(evidenceCol, evidenceRow)) {
      return
    }

    this.terrainEvidence.push({
      id: `terrain-evidence-${this.nextId}`,
      kind: evidenceKind,
      side,
      sourceTeam: tank.team,
      col: evidenceCol,
      row: evidenceRow,
      dir,
      age: 0,
      ttl,
      strength,
      label,
    })
    this.nextId += 1
    if (this.terrainEvidence.length > 90) {
      this.terrainEvidence = this.terrainEvidence.slice(this.terrainEvidence.length - 90)
    }
  }

  private triggerEchoTerrainPulse(tank: Tank) {
    const exactSource = tank.side === 'player' || this.isTankVisibleToVision(tank, this.getPlayerVisionModel())
    const center = exactSource ? tankCenter(tank) : this.getAmbiguousEchoPulseCenter(tank)
    this.spawnPortableRelayPulse(
      center,
      undefined,
      false,
      exactSource ? ECHO_PLAYER_SIGNAL_START_RADIUS : ECHO_HIDDEN_SIGNAL_START_RADIUS,
      ECHO_SIGNAL_RAY_COUNT,
    )
  }

  private getAmbiguousEchoPulseCenter(tank: Tank) {
    const cell = this.distortHiddenEchoPulseCell(tank)
    return {
      x: ARENA_X + cell.x * TILE_SIZE + TILE_SIZE / 2,
      y: ARENA_Y + cell.y * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  private distortHiddenEchoPulseCell(tank: Tank): Vec {
    const forward = DIR_VECTORS[tank.dir]
    const offsets = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ].filter((offset) => offset.x * forward.x + offset.y * forward.y <= 0)
    const hash = this.hiddenEvidenceHash(tank.col, tank.row, `${tank.id}:${tank.dir}:echo`)

    for (const allowSolid of [false, true]) {
      for (let attempt = 0; attempt < offsets.length; attempt += 1) {
        const offset = offsets[Math.abs(hash + attempt) % offsets.length]
        if (!offset) continue
        const nextCol = tank.col + offset.x
        const nextRow = tank.row + offset.y
        if (!this.isInBounds(nextCol, nextRow)) {
          continue
        }
        if (!allowSolid && this.isPortableSignalSolidCell(nextCol, nextRow)) {
          continue
        }
        return { x: nextCol, y: nextRow }
      }
    }

    return { x: tank.col, y: tank.row }
  }

  private addPointTerrainEvidence(
    kind: TerrainEvidenceKind,
    side: CombatSide,
    team: Team,
    col: number,
    row: number,
    dir: Direction | undefined,
    ttl: number,
    strength: number,
    label: string,
    sourceSurface: TileKind = this.tileKindAt(col, row),
  ) {
    const surface = terrainDefinition(sourceSurface)
    const point = surface.evidence.echoDistortion || kind === 'echo' ? this.distortEchoEvidenceCell(col, row) : { x: col, y: row }
    if (!this.isInBounds(point.x, point.y)) {
      return
    }

    this.terrainEvidence.push({
      id: `terrain-evidence-${this.nextId}`,
      kind: surface.evidence.echoDistortion || kind === 'echo' ? 'echo' : kind,
      side,
      sourceTeam: team,
      col: point.x,
      row: point.y,
      dir,
      age: 0,
      ttl,
      strength,
      label,
    })
    this.nextId += 1
    if (this.terrainEvidence.length > 90) {
      this.terrainEvidence = this.terrainEvidence.slice(this.terrainEvidence.length - 90)
    }
  }

  private distortEchoEvidenceCell(col: number, row: number): Vec {
    const horizontal = row % 2 === 0 ? 1 : -1
    const vertical = col % 2 === 0 ? -1 : 1
    return {
      x: Math.floor(clamp(col + horizontal, 0, Math.max(0, this.getMapCols() - 1))),
      y: Math.floor(clamp(row + vertical, 0, Math.max(0, this.getMapRows() - 1))),
    }
  }

  private distortHiddenEvidenceCell(col: number, row: number, salt: string): Vec {
    const offsets = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ]
    const hash = this.hiddenEvidenceHash(col, row, salt)

    for (let attempt = 0; attempt < offsets.length; attempt += 1) {
      const offset = offsets[Math.abs(hash + attempt) % offsets.length]
      if (!offset) continue
      const nextCol = col + offset.x
      const nextRow = row + offset.y
      if (this.isInBounds(nextCol, nextRow)) {
        return { x: nextCol, y: nextRow }
      }
    }

    return this.distortEchoEvidenceCell(col, row)
  }

  private hiddenEvidenceHash(col: number, row: number, salt: string) {
    let hash = col * 73856093 ^ row * 19349663
    for (let index = 0; index < salt.length; index += 1) {
      hash = Math.imul(hash ^ salt.charCodeAt(index), 16777619)
    }
    return hash
  }

  private runEnemyDecision(enemy: Tank): EnemyDecisionOutcome {
    const shotTarget = this.getAiShotTargetCell(enemy)
    if (shotTarget && enemy.reload > 0 && this.canBotFireAtCellIfLoaded(enemy, shotTarget)) {
      return 'idle'
    }
    if (shotTarget && this.tryBotFireAtCell(enemy, shotTarget)) {
      return 'acted'
    }

    const decision = this.getBotDecision(enemy)
    enemy.path = decision.nextStep ? [decision.nextStep] : []

    if (decision.action === 'fire' && decision.target) {
      enemy.dir = this.directionTo(enemy.col, enemy.row, decision.target.x, decision.target.y)
      this.fire(enemy)
      return 'acted'
    }

    if (decision.action === 'breakWall') {
      if (this.executeBreakWallDecision(enemy, decision)) {
        return 'acted'
      }

      if (decision.nextStep && this.startMove(enemy, this.directionTo(enemy.col, enemy.row, decision.nextStep.x, decision.nextStep.y))) {
        return 'moved'
      }
    }

    if (enemy.role === 'wall_breaker' && enemy.reload <= 0 && decision.target && this.faceAndShootUsefulBrick(enemy, decision.target)) {
      return 'acted'
    }

    if (decision.action === 'move' && decision.nextStep) {
      return this.startMove(enemy, this.directionTo(enemy.col, enemy.row, decision.nextStep.x, decision.nextStep.y)) ? 'moved' : 'idle'
    }

    const fallback = this.pickOpenNeighbor(enemy)
    if (fallback) {
      return this.startMove(enemy, this.directionTo(enemy.col, enemy.row, fallback.x, fallback.y)) ? 'moved' : 'idle'
    }

    return 'idle'
  }

  private updateTerrainEvidenceSentinel(enemy: Tank, dt: number) {
    if (!this.isTerrainEvidenceSentinel(enemy)) {
      return false
    }

    enemy.hp = enemy.maxHp
    enemy.reload = enemy.reloadTime
    enemy.path = []

    if (enemy.move) {
      return true
    }

    enemy.aiCooldown -= dt
    if (enemy.aiCooldown > 0) {
      return true
    }

    const nextTarget = this.nextTerrainEvidenceSentinelPatrolTarget(enemy)
    if (!nextTarget) {
      enemy.aiCooldown = TERRAIN_EVIDENCE_SENTINEL_STEP_DELAY
      return true
    }

    enemy.path = [nextTarget]
    const direction = this.directionTo(enemy.col, enemy.row, nextTarget.x, nextTarget.y)
    if (this.startMove(enemy, direction)) {
      this.terrainEvidenceSentinelPatrolIndex =
        (this.terrainEvidenceSentinelPatrolIndex + 1) % TERRAIN_EVIDENCE_SENTINEL_PATROL.length
      enemy.aiCooldown = TERRAIN_EVIDENCE_SENTINEL_STEP_DELAY
      return true
    }

    enemy.aiCooldown = TERRAIN_EVIDENCE_SENTINEL_STEP_DELAY
    return true
  }

  private nextTerrainEvidenceSentinelPatrolTarget(enemy: Tank) {
    const currentIndex = TERRAIN_EVIDENCE_SENTINEL_PATROL.findIndex((cell) => cell.x === enemy.col && cell.y === enemy.row)
    if (currentIndex >= 0 && this.terrainEvidenceSentinelPatrolIndex !== currentIndex) {
      this.terrainEvidenceSentinelPatrolIndex = currentIndex
    }

    for (let offset = 1; offset <= TERRAIN_EVIDENCE_SENTINEL_PATROL.length; offset += 1) {
      const target = TERRAIN_EVIDENCE_SENTINEL_PATROL[(this.terrainEvidenceSentinelPatrolIndex + offset) % TERRAIN_EVIDENCE_SENTINEL_PATROL.length]
      if (target && this.distanceCells({ x: enemy.col, y: enemy.row }, target) === 1) {
        return target
      }
    }

    return null
  }

  private isTerrainEvidenceSentinel(tank: Tank | null | undefined) {
    return this.currentLevelId === TERRAIN_EVIDENCE_TEST_LEVEL_ID && tank?.id === TERRAIN_EVIDENCE_SENTINEL_ID
  }

  private canBotFireAtCellIfLoaded(enemy: Tank, target: Vec) {
    const targetTank = this.getTankAt(target.x, target.y, enemy.id)
    const objectiveTarget = this.isBotObjectiveShotCell(enemy, target)
    if (!targetTank && !objectiveTarget) {
      return false
    }

    return evaluateFireControl({
      shooter: this.createBotActor(enemy),
      target: {
        id: targetTank?.id ?? `objective-${target.x}-${target.y}`,
        position: { ...target },
        side: targetTank?.side,
        team: targetTank?.team,
        confidence: 1,
        value: targetTank?.faction === 'player' ? 1 : 0.9,
        visible: targetTank ? this.isTankVisibleToVision(targetTank, this.getTankVisionModel(enemy)) : undefined,
        objective: objectiveTarget,
      },
      difficulty: this.botDifficulty,
      hasAmmo: true,
      tileAt: (cell) => this.tileKindAt(cell.x, cell.y),
      tankAt: (cell) => {
        const tank = this.getTankAt(cell.x, cell.y)
        return tank ? { id: tank.id, side: tank.side, team: tank.team } : null
      },
    }).shouldFire
  }

  private tryBotFireAtCell(enemy: Tank, target: Vec) {
    const targetTank = this.getTankAt(target.x, target.y, enemy.id)
    const objectiveTarget = this.isBotObjectiveShotCell(enemy, target)
    if (!targetTank && !objectiveTarget) {
      return false
    }

    const fireDecision = evaluateFireControl({
      shooter: this.createBotActor(enemy),
      target: {
        id: targetTank?.id ?? `objective-${target.x}-${target.y}`,
        position: { ...target },
        side: targetTank?.side,
        team: targetTank?.team,
        confidence: 1,
        value: targetTank?.faction === 'player' ? 1 : 0.9,
        visible: targetTank ? this.isTankVisibleToVision(targetTank, this.getTankVisionModel(enemy)) : undefined,
        objective: objectiveTarget,
      },
      difficulty: this.botDifficulty,
      hasAmmo: enemy.reload <= 0,
      tileAt: (cell) => this.tileKindAt(cell.x, cell.y),
      tankAt: (cell) => {
        const tank = this.getTankAt(cell.x, cell.y)
        return tank ? { id: tank.id, side: tank.side, team: tank.team } : null
      },
    })

    if (!fireDecision.shouldFire || !fireDecision.direction) {
      return false
    }

    enemy.dir = fireDecision.direction
    this.fire(enemy)
    return true
  }

  private isBotObjectiveShotCell(enemy: Tank, target: Vec) {
    const objective = this.currentObjective
    if (objective.mode === 'defense' && enemy.side === 'enemy' && enemy.role === 'base_attacker') {
      const base = this.findBaseCell()
      return base.x === target.x && base.y === target.y
    }

    return Boolean(
      objective.mode === 'assault' &&
      enemy.side === 'player' &&
      objective.assault &&
      objective.assault.cell.x === target.x &&
      objective.assault.cell.y === target.y,
    )
  }

  private getBotDecision(enemy: Tank): BotDecision {
    const actor = this.createBotActor(enemy)
    const role = roleProfileForEnemyRole(enemy.role)
    const objective = this.getBotObjectiveInfo(enemy)
    const percepts = this.getBotPercepts(enemy, actor, objective)
    const beliefs = updateBotBeliefs(
      this.botBeliefs[enemy.id] ?? [],
      percepts,
      this.time,
      this.botDifficulty,
      role,
    )
    this.botBeliefs[enemy.id] = beliefs

    const grid = this.getBotPathGrid(enemy)
    const start = { x: enemy.col, y: enemy.row }
    const target = this.getPrimaryBotMovementTarget(beliefs, objective)
    const goals = target ? this.getBotMoveGoals(enemy, target) : []
    const directPath = goals.length > 0
      ? findWeightedPath(grid, start, goals, { ...this.getBotPathOptions(role.role), tieTarget: target ?? undefined })
      : null
    const breakerPath = this.getBreakerPath(grid, start, goals, role.role)
    const scores = this.scoreBotDecisionIntentions(enemy, actor, beliefs, objective, breakerPath, directPath)
    const topScore = scores.find((score) => score.target)
    const topTarget = topScore?.target ?? target
    const topGoals = topScore ? this.getBotMoveGoalsForScore(enemy, topScore) : topTarget ? this.getBotMoveGoals(enemy, topTarget) : goals
    const movePath = topGoals.length > 0
      ? findWeightedPath(grid, start, topGoals, { ...this.getBotPathOptions(role.role), tieTarget: topTarget ?? undefined })
      : directPath
    const fireTarget = this.getBotFireTarget(enemy, beliefs, objective)
    const fireDecision = fireTarget
      ? evaluateFireControl({
          shooter: actor,
          target: fireTarget,
          difficulty: this.botDifficulty,
          hasAmmo: enemy.reload <= 0,
          tileAt: (cell) => this.tileKindAt(cell.x, cell.y),
          tankAt: (cell) => {
            const tank = this.getTankAt(cell.x, cell.y)
            return tank ? { id: tank.id, side: tank.side, team: tank.team } : null
          },
        })
      : null

    return chooseBotBehavior({
      scores,
      fire: fireDecision,
      movePath,
      breakerPath,
      fallbackTarget: null,
    })
  }

  private createBotActor(tank: Tank): BotActor {
    return {
      id: tank.id,
      role: tank.role,
      side: tank.side,
      team: tank.team,
      col: tank.col,
      row: tank.row,
      dir: tank.dir,
      hp: tank.hp,
      maxHp: tank.maxHp,
      reload: tank.reload,
    }
  }

  private getBotPercepts(tank: Tank, actor: BotActor, objective: BotObjectiveInfo): ContactBelief[] {
    const vision = this.getTankVisionModel(tank)
    const visibleHostiles = this.getTanks()
      .filter((candidate) => candidate.id !== tank.id && candidate.hp > 0 && this.areHostile(tank, candidate))
      .filter((candidate) => this.isTankVisibleToVision(candidate, vision))
      .map((candidate) => ({
        id: candidate.id,
        col: candidate.col,
        row: candidate.row,
        side: candidate.side,
        team: candidate.team,
        hp: candidate.hp,
        maxHp: candidate.maxHp,
        value: candidate.faction === 'player' ? 1 : Math.max(0.45, candidate.scoreValue / 250),
      }))
    const alerts = Object.values(this.visionMemory[tank.side])
      .filter((memory) => this.time - memory.seenAt <= (memory.alert ? DEPLOYABLE_ALERT_MEMORY_TTL : OFFLINE_LAST_KNOWN_SECONDS))
      .filter((memory) => {
        if (memory.alert) {
          return memory.side !== tank.side
        }
        const current = this.getTankById(memory.id)
        return Boolean(current && this.areHostile(tank, current))
      })
      .map((memory) => {
        const age = Math.max(0, this.time - memory.seenAt)
        const ttl = memory.alert ? DEPLOYABLE_ALERT_MEMORY_TTL : OFFLINE_LAST_KNOWN_SECONDS
        return {
          id: memory.id,
          col: memory.col,
          row: memory.row,
          side: memory.side,
          team: memory.team,
          source: memory.alert ? 'sound' as const : 'teammate' as const,
          kind: memory.alert ? 'noise' as const : 'enemy' as const,
          confidence: Number(Math.max(0.18, 1 - age / Math.max(0.1, ttl)).toFixed(4)),
          value: memory.alert ? 0.5 : 0.62,
        }
      })

    return buildBotPercepts({
      actor,
      now: this.time,
      visibleHostiles,
      alerts,
      objective,
    })
  }

  private getBotObjectiveInfo(tank: Tank): BotObjectiveInfo {
    const objective = this.currentObjective
    let pressureTarget: Vec | null = null
    let defendTarget: Vec | null = null

    if (objective.mode === 'defense') {
      const base = this.findBaseCell()
      if (tank.side === 'enemy') {
        pressureTarget = base
      } else if (tank.side === 'player') {
        defendTarget = base
      }
    }

    if (objective.mode === 'assault' && objective.assault) {
      if (tank.side === 'player') {
        pressureTarget = objective.assault.cell
      } else if (tank.side === 'enemy') {
        defendTarget = objective.assault.cell
      }
    }

    if (objective.mode === 'ctf' && this.objectiveState.flag) {
      const flag = this.objectiveState.flag
      if (tank.side === 'player') {
        pressureTarget = flag.carrierId === tank.id ? flag.playerBase : flag.position
      } else if (tank.side === 'enemy') {
        const carrier = flag.carrierId ? this.getTankById(flag.carrierId) : null
        pressureTarget = carrier ? { x: carrier.col, y: carrier.row } : null
        defendTarget = flag.enemyHome
      }
    }

    if (tank.side === 'player' && !pressureTarget && !defendTarget) {
      defendTarget = { x: this.player.col, y: this.player.row }
    }

    return {
      mode: objective.mode,
      pressureTarget,
      defendTarget,
    }
  }

  private getPrimaryBotMovementTarget(beliefs: ContactBelief[], objective: BotObjectiveInfo): Vec | null {
    const attack = this.getBestBotBelief(beliefs, (belief) =>
      belief.kind === 'enemy' && belief.visible === true && belief.confidence >= this.botDifficulty.confidenceThreshold,
    )
    if (attack) {
      return { ...attack.position }
    }

    const investigate = this.getBestBotBelief(beliefs, (belief) =>
      belief.kind !== 'objective' && belief.confidence >= this.botDifficulty.confidenceThreshold * 0.45,
    )
    if (investigate) {
      return { ...investigate.position }
    }

    return objective.pressureTarget ? { ...objective.pressureTarget } : objective.defendTarget ? { ...objective.defendTarget } : null
  }

  private getBestBotBelief(beliefs: ContactBelief[], predicate: (belief: ContactBelief) => boolean) {
    return beliefs
      .filter(predicate)
      .sort((a, b) =>
        (b.confidence * (b.value ?? 0.5)) - (a.confidence * (a.value ?? 0.5)) ||
        b.lastSeenAt - a.lastSeenAt ||
        a.id.localeCompare(b.id),
      )[0] ?? null
  }

  private getBotPathGrid(tank: Tank): BotPathGrid {
    const vision = this.getTankVisionModel(tank)
    const unknownCells = new Set<string>()
    for (let row = 0; row < this.getMapRows(); row += 1) {
      for (let col = 0; col < this.getMapCols(); col += 1) {
        const key = this.key(col, row)
        if (!vision.visibleSet.has(key)) {
          unknownCells.add(key)
        }
      }
    }

    const dangerCells = new Set<string>()
    for (const bullet of this.bullets) {
      if (!this.isBulletHostileToTank(bullet, tank)) {
        continue
      }
      const col = Math.floor((bullet.x + BULLET_SIZE / 2 - ARENA_X) / TILE_SIZE)
      const row = Math.floor((bullet.y + BULLET_SIZE / 2 - ARENA_Y) / TILE_SIZE)
      if (this.isInBounds(col, row)) {
        dangerCells.add(this.key(col, row))
      }
    }
    this.addSuspicionDangerCells(tank, dangerCells)

    return {
      cols: this.getMapCols(),
      rows: this.getMapRows(),
      tileAt: (cell) => {
        const tile = this.tiles[cell.y]?.[cell.x]
        return tile ? { kind: this.effectiveTankTileKindAt(cell.x, cell.y), hp: tile.hp } : { kind: 'steel', hp: 1 }
      },
      isOccupied: (cell) => Boolean(this.getTankAt(cell.x, cell.y, tank.id)),
      unknownCells,
      dangerCells,
    }
  }

  private addSuspicionDangerCells(tank: Tank, dangerCells: Set<string>) {
    for (const memory of Object.values(this.visionMemory[tank.side])) {
      if (!this.isSuspiciousHostileMemory(tank, memory)) {
        continue
      }

      if (this.memoryConfidence(memory) < BOT_SUSPICION_DANGER_CONFIDENCE) {
        continue
      }

      for (const offset of [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      ]) {
        const col = memory.col + offset.x
        const row = memory.row + offset.y
        if (this.isInBounds(col, row)) {
          dangerCells.add(this.key(col, row))
        }
      }
    }
  }

  private isSuspiciousHostileMemory(tank: Tank, memory: OfflineVisionMemory) {
    if (this.time - memory.seenAt > (memory.alert ? DEPLOYABLE_ALERT_MEMORY_TTL : OFFLINE_LAST_KNOWN_SECONDS)) {
      return false
    }

    if (memory.alert) {
      return memory.side !== tank.side
    }

    const current = this.getTankById(memory.id)
    return Boolean(current && this.areHostile(tank, current))
  }

  private hasFreshUncertainMemory(tank: Tank) {
    return Object.values(this.visionMemory[tank.side]).some((memory) =>
      this.isSuspiciousHostileMemory(tank, memory) &&
      this.memoryConfidence(memory) >= this.botDifficulty.confidenceThreshold * 0.42,
    )
  }

  private memoryConfidence(memory: OfflineVisionMemory) {
    const ttl = memory.alert ? DEPLOYABLE_ALERT_MEMORY_TTL : OFFLINE_LAST_KNOWN_SECONDS
    const age = Math.max(0, this.time - memory.seenAt)
    return Math.max(0, 1 - age / Math.max(0.1, ttl))
  }

  private getBotPathOptions(role: BotRoleKind): BotPathOptions {
    if (role === 'scout') {
      return { unknownPenalty: 0.32, dangerPenalty: 2.1, coverPreference: 0.14 }
    }
    if (role === 'breaker') {
      return { unknownPenalty: 0.9, dangerPenalty: 2.8, coverPreference: 0.08, objectiveProximityWeight: 0.12 }
    }
    return { unknownPenalty: 0.7, dangerPenalty: 2.4, coverPreference: 0.16 }
  }

  private getBreakerPath(
    grid: BotPathGrid,
    start: Vec,
    goals: Vec[],
    role: BotRoleKind,
  ): BotPathResult | null {
    if (role !== 'breaker' || goals.length === 0) {
      return null
    }

    return findWeightedPath(grid, start, goals, {
      ...this.getBotPathOptions(role),
      allowDestructibleWalls: true,
      destructibleWallCost: 2.6,
      objectiveProximityWeight: 0.16,
    })
  }

  private scoreBotDecisionIntentions(
    enemy: Tank,
    actor: BotActor,
    beliefs: ContactBelief[],
    objective: BotObjectiveInfo,
    breakerPath: BotPathResult | null,
    directPath: BotPathResult | null,
  ) {
    const role = roleProfileForEnemyRole(enemy.role)
    return scoreBotIntentions({
      actor,
      role,
      beliefs,
      objective,
      difficulty: this.botDifficulty,
      breakerWallUseful: role.role === 'breaker' && Boolean(breakerPath && isBreakerWallPlanUseful(breakerPath, directPath)),
    })
  }

  private getBotMoveGoals(tank: Tank, target: Vec): Vec[] {
    if (this.canPathThrough(tank, target.x, target.y)) {
      return [{ ...target }]
    }

    return this.getPassableNeighbors(target).filter((cell) => this.canPathThrough(tank, cell.x, cell.y))
  }

  private getBotMoveGoalsForScore(tank: Tank, score: BotIntentionScore): Vec[] {
    if (!score.target) {
      return []
    }

    if (score.intention === 'investigate' && score.beliefKind !== 'objective') {
      const scoutingGoals = this.getBotScoutingGoals(tank, score)
      if (scoutingGoals.length > 0) {
        return scoutingGoals
      }
    }

    return this.getBotMoveGoals(tank, score.target)
  }

  private getBotScoutingGoals(tank: Tank, score: BotIntentionScore): Vec[] {
    if (!score.target) {
      return []
    }

    const target = score.target
    const vision = this.getTankVisionModel(tank)
    const targetConfidence = score.confidence ?? 0.5
    const standoff = targetConfidence < 0.78 || score.beliefKind === 'noise' || score.beliefKind === 'unknown'
      ? BOT_SCOUTING_STANDOFF_DISTANCE
      : 1
    const candidates: Array<{ cell: Vec; score: number }> = []

    for (let row = target.y - 3; row <= target.y + 3; row += 1) {
      for (let col = target.x - 3; col <= target.x + 3; col += 1) {
        if (!this.isInBounds(col, row) || (col === target.x && row === target.y) || !this.canPathThrough(tank, col, row)) {
          continue
        }

        const cell = { x: col, y: row }
        const distanceToTarget = this.distanceCells(cell, target)
        if (distanceToTarget < 1 || distanceToTarget > 3) {
          continue
        }

        const visiblePenalty = vision.visibleSet.has(this.key(col, row)) ? 0 : 2.5
        const standoffPenalty = Math.abs(distanceToTarget - standoff) * 4
        const coverBonus = this.hasAdjacentBotCover(cell) ? -1.25 : 0
        const alignmentPenalty = col === target.x || row === target.y ? 0.35 : 0
        const travelPenalty = this.distanceCells({ x: tank.col, y: tank.row }, cell) * 0.08
        candidates.push({
          cell,
          score: standoffPenalty + visiblePenalty + alignmentPenalty + travelPenalty + coverBonus,
        })
      }
    }

    return candidates
      .sort((a, b) => a.score - b.score || a.cell.y - b.cell.y || a.cell.x - b.cell.x)
      .slice(0, BOT_SCOUTING_GOAL_LIMIT)
      .map((candidate) => candidate.cell)
  }

  private hasAdjacentBotCover(cell: Vec) {
    return DIRECTION_ORDER.some((direction) => {
      const vector = DIR_VECTORS[direction]
      const col = cell.x + vector.x
      const row = cell.y + vector.y
      return !this.isInBounds(col, row) || !this.isTankPassableAt(col, row)
    })
  }

  private getBotFireTarget(enemy: Tank, beliefs: ContactBelief[], objective: BotObjectiveInfo): BotFireTarget | null {
    const visible = beliefs
      .filter((belief) => belief.kind === 'enemy' && belief.visible === true && belief.confidence >= this.botDifficulty.confidenceThreshold)
      .sort((a, b) =>
        Number(this.isAligned(enemy, b.position)) - Number(this.isAligned(enemy, a.position)) ||
        (b.confidence * (b.value ?? 0.5)) - (a.confidence * (a.value ?? 0.5)) ||
        a.id.localeCompare(b.id),
      )[0]

    if (visible) {
      return {
        id: visible.id,
        position: { ...visible.position },
        side: visible.side,
        team: visible.team,
        confidence: visible.confidence,
        value: visible.value ?? 0.65,
        visible: true,
      }
    }

    if (objective.pressureTarget && this.canBotFireAtObjective(enemy, objective)) {
      return {
        id: `objective-${objective.mode}`,
        position: { ...objective.pressureTarget },
        confidence: 1,
        value: 0.92,
        objective: true,
      }
    }

    return null
  }

  private canBotFireAtObjective(tank: Tank, objective: BotObjectiveInfo) {
    return (
      objective.mode === 'defense' &&
      tank.side === 'enemy' &&
      tank.role === 'base_attacker'
    ) || (
      objective.mode === 'assault' &&
      tank.side === 'player'
    )
  }

  private executeBreakWallDecision(enemy: Tank, decision: BotDecision) {
    if (!decision.breakWall || enemy.reload > 0) {
      return false
    }

    const wall = decision.breakWall
    if (!this.isAligned(enemy, wall) || this.distanceCells({ x: enemy.col, y: enemy.row }, wall) !== 1) {
      return false
    }

    const kind = this.tileKindAt(wall.x, wall.y)
    if (kind !== 'brick' && kind !== 'radio' && kind !== 'depot') {
      return false
    }

    const direction = this.directionTo(enemy.col, enemy.row, wall.x, wall.y)
    if (this.brickShotWouldExposeFriendlyObjective(enemy, direction, wall.x, wall.y)) {
      return false
    }

    enemy.dir = direction
    this.fire(enemy)
    return true
  }

  private isAligned(tank: Tank, cell: Vec) {
    return tank.col === cell.x || tank.row === cell.y
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

      if (this.hitMajorModWithBullet(bullet)) {
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
        this.applyPowerUp(powerUp.kind, powerUp.x + 10, powerUp.y)
        this.queueSound('powerup')
        this.burst(powerUp.x + 10, powerUp.y + 10, '#ffe17a', 8)
        return false
      }

      return true
    })
  }

  private updateSpawning(dt: number) {
    const spawnSide = this.getSpawnSide()
    const activeSpawnSide = this.enemies.filter((enemy) => enemy.side === spawnSide).length

    if (this.enemiesRemaining <= 0 || activeSpawnSide >= this.currentLevel.activeEnemyLimit) {
      return
    }

    this.spawnTimer -= dt

    if (this.spawnTimer <= 0) {
      this.spawnEnemy()
      this.spawnTimer = this.currentLevel.spawnInterval
    }
  }

  private updateFriendlyRespawns(dt: number) {
    const friendlyTarget = this.getFriendlyTargetCount()
    if (friendlyTarget <= 0) {
      this.friendlyRespawnTimer = 0
      return
    }

    if (this.getActiveFriendlyBotCount() >= friendlyTarget) {
      this.friendlyRespawnTimer = 0
      return
    }

    if (this.friendlyRespawnTimer <= 0) {
      this.friendlyRespawnTimer = this.currentLevel.spawnInterval
    }

    this.friendlyRespawnTimer -= dt
    if (this.friendlyRespawnTimer > 0) {
      return
    }

    const spawned = this.spawnFriendlyBot(this.getActiveFriendlyBotCount())
    this.friendlyRespawnTimer = this.getActiveFriendlyBotCount() < friendlyTarget
      ? (spawned ? this.currentLevel.spawnInterval : FRIENDLY_RESPAWN_RETRY_SECONDS)
      : 0
  }

  private updateRetranslators(dt: number) {
    for (const relay of this.retranslators) {
      if (this.isCellEmpDisrupted(relay.col, relay.row)) {
        relay.captureSide = null
        continue
      }

      const adjacent: Record<CombatSide, number> = { player: 0, enemy: 0, neutral: 0 }

      for (const tank of this.getTanks()) {
        if (tank.hp <= 0 || this.distanceCells({ x: tank.col, y: tank.row }, { x: relay.col, y: relay.row }) > 1) {
          continue
        }
        adjacent[tank.side] += 1
      }

      const capturingSides = (['player', 'enemy', 'neutral'] as CombatSide[]).filter((side) => adjacent[side] > 0)
      if (capturingSides.length !== 1) {
        continue
      }

      const captureSide = capturingSides[0]
      if (!captureSide) {
        continue
      }

      if (relay.captureSide !== captureSide) {
        relay.captureSide = captureSide
        relay.progress = relay.owner === captureSide ? 1 : 0
      }

      relay.progress = Math.min(1, relay.progress + dt / OFFLINE_RELAY_CAPTURE_SECONDS)
      if (relay.progress >= 1) {
        relay.owner = captureSide
        relay.captureSide = captureSide
      }
    }
  }

  private refreshVisionMemory() {
    for (const side of ['player', 'enemy', 'neutral'] as CombatSide[]) {
      const visionActors = this.getVisionActorsForSide(side)
      for (const actor of visionActors) {
        const vision = this.getTankVisionModel(actor)
        for (const tank of this.getTanks()) {
          if (tank.id === actor.id || !this.areHostile(actor, tank) || tank.hp <= 0) {
            continue
          }

          if (this.isTankVisibleToVision(tank, vision)) {
            this.visionMemory[side][tank.id] = {
              id: tank.id,
              side: tank.side,
              team: tank.team,
              col: tank.col,
              row: tank.row,
              seenAt: this.time,
            }
          }
        }
      }

      for (const memory of Object.values(this.visionMemory[side])) {
        if (memory.alert) {
          if (this.time - memory.seenAt > DEPLOYABLE_ALERT_MEMORY_TTL) {
            delete this.visionMemory[side][memory.id]
          }
          continue
        }

        if (this.time - memory.seenAt > OFFLINE_LAST_KNOWN_SECONDS || !this.getTankById(memory.id)) {
          delete this.visionMemory[side][memory.id]
        }
      }
    }
  }

  private getVisionActorsForSide(side: CombatSide) {
    if (side === 'player') {
      return [this.player, ...this.enemies.filter((tank) => tank.side === 'player')]
    }

    return this.enemies.filter((tank) => tank.side === side)
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
    this.feedbackNotices = this.feedbackNotices
      .map((notice) => ({ ...notice, age: notice.age + dt }))
      .filter((notice) => notice.age < notice.duration)
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

    if (tank.immobilized > 0) {
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
      duration: this.getMoveDurationForTank(tank, targetCol, targetRow),
    }
    this.addMovementFeedback(tank)
    return true
  }

  private canOccupy(tank: Tank, col: number, row: number) {
    if (!this.isTankPassableAt(col, row)) {
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
    const player = this.player as Tank | undefined
    return player ? [player, ...this.enemies] : [...this.enemies]
  }

  private fire(tank: Tank) {
    if (tank.reload > 0) {
      return
    }

    const playerShot = tank.faction === 'player'
    if (playerShot && this.playerShells <= 0) {
      return
    }

    const playerStats = playerShot ? this.getUpgradeStats() : null
    const center = tankCenter(tank)
    const vector = DIR_VECTORS[tank.dir]
    const bullet: Bullet = {
      id: `bullet-${this.nextId}`,
      owner: tank.faction,
      ownerId: tank.id,
      side: tank.side,
      team: tank.team,
      x: center.x + vector.x * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      y: center.y + vector.y * (TANK_SIZE / 2 + 2) - BULLET_SIZE / 2,
      dir: tank.dir,
      speed: playerShot ? PLAYER_BULLET_SPEED : ENEMY_BULLET_SPEED,
      damage: playerStats ? playerStats.bulletDamage : 1,
      ttl: playerShot ? PLAYER_SHELL_TTL : ENEMY_BULLET_TTL,
      splashDamage: playerStats?.splashDamage,
      splashRadius: playerStats?.splashRadius,
    }

    this.nextId += 1
    tank.reload = tank.reloadTime
    this.bullets.push(bullet)
    this.addShotFeedback(tank, bullet)
    this.addFiringTerrainEvidence(tank)
    if (playerShot) {
      this.playerShells = Math.max(0, this.playerShells - 1)
      this.playerShellRechargeProgress = 0
      this.runStats.shotsFired += 1
    }
    this.queueSound('fire')
  }

  private addFiringTerrainEvidence(tank: Tank) {
    const surface = this.tileKindAt(tank.col, tank.row)
    const definition = terrainDefinition(surface)
    if (definition.evidence.echoDistortion) {
      this.triggerEchoTerrainPulse(tank)
      return
    }

    if (definition.evidence.rustle) {
      this.addTerrainEvidence('rustle', tank, tank.col, tank.row, tank.dir, 2.2, 1.25, 'REED SHOT', surface)
    }
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

    const impactKind = tile.kind
    if (tile.kind === 'ricochet' && this.tryRicochetBullet(bullet, col, row, centerX, centerY)) {
      return false
    }

    if (tile.kind === 'brick' || tile.kind === 'radio' || tile.kind === 'depot') {
      tile.hp -= bullet.damage

      if (tile.hp <= 0) {
        const destroyedKind = tile.kind
        tile.kind = 'empty'
        tile.hp = 0
        if (destroyedKind === 'brick' && bullet.owner === 'player') {
          this.runStats.bricksDestroyed += 1
          if (this.isCriticalCoverCell(col, row)) {
            this.runStats.criticalCoverDestroyed += 1
          }
        }
        this.queueSound('brick')
        this.addImpactFeedback(0.1, 0.08)
        this.burst(
          col * TILE_SIZE + TILE_SIZE / 2,
          ARENA_Y + row * TILE_SIZE + TILE_SIZE / 2,
          destroyedKind === 'radio' ? '#66c8ff' : destroyedKind === 'depot' ? '#ce9452' : '#e4572e',
          10,
        )
      } else {
        this.queueSound('hit')
        this.addImpactFeedback(0.05, 0.04)
        this.burst(centerX, centerY, tile.kind === 'radio' ? '#bdeeff' : '#ffb347', 5)
      }
    }

    if (tile.kind === 'base') {
      this.hitBaseTileWithBullet(bullet, tile, col, row, centerX, centerY)
    }

    if (tile.kind === 'steel') {
      this.queueSound('hit')
      this.addImpactFeedback(0.04, 0.03)
      this.burst(centerX, centerY, '#cfd3d8', 5)
    }

    if (tile.kind === 'ricochet') {
      this.queueSound('hit')
      this.addImpactFeedback(0.04, 0.03)
      this.burst(centerX, centerY, '#fff1a5', 7)
      this.addPointTerrainEvidence('ricochet', 'player', bullet.team, col, row, bullet.dir, 1.4, 1, 'RICOCHET', tile.kind)
    }

    if (this.isShellSplashPropImpact(impactKind)) {
      this.applyShellSplash(bullet, centerX, centerY, null)
    }
    return true
  }

  private tryRicochetBullet(bullet: Bullet, col: number, row: number, centerX: number, centerY: number) {
    if ((bullet.ricochets ?? 0) >= 1) {
      return false
    }

    const nextDir = this.ricochetDirection(bullet.dir, col, row)
    const vector = DIR_VECTORS[nextDir]
    const exitX = ARENA_X + (col + 0.5) * TILE_SIZE + vector.x * (TILE_SIZE / 2 + BULLET_SIZE + 1)
    const exitY = ARENA_Y + (row + 0.5) * TILE_SIZE + vector.y * (TILE_SIZE / 2 + BULLET_SIZE + 1)

    bullet.dir = nextDir
    bullet.x = exitX - BULLET_SIZE / 2
    bullet.y = exitY - BULLET_SIZE / 2
    bullet.ttl = Math.max(0.2, bullet.ttl * 0.65)
    bullet.damage = Math.max(1, bullet.damage - 1)
    bullet.ricochets = (bullet.ricochets ?? 0) + 1
    this.queueSound('hit')
    this.addImpactFeedback(0.04, 0.03)
    this.burst(centerX, centerY, '#fff1a5', 7)
    this.addPointTerrainEvidence('ricochet', 'player', bullet.team, col, row, nextDir, 1.4, 1, 'RICOCHET', 'ricochet')
    return true
  }

  private ricochetDirection(direction: Direction, col: number, row: number): Direction {
    const slash = (col + row) % 2 === 0
    if (slash) {
      if (direction === 'up') return 'right'
      if (direction === 'right') return 'up'
      if (direction === 'down') return 'left'
      return 'down'
    }

    if (direction === 'up') return 'left'
    if (direction === 'left') return 'up'
    if (direction === 'down') return 'right'
    return 'down'
  }

  private isShellSplashPropImpact(kind: TileKind) {
    return kind === 'brick' || kind === 'radio' || kind === 'depot' || kind === 'base'
  }

  private hitBaseTileWithBullet(bullet: Bullet, tile: Tile, col: number, row: number, centerX: number, centerY: number) {
    const assault = this.objectiveState.assault
    const side = this.bulletSide(bullet)

    if (this.currentObjective.mode === 'assault' && assault && assault.cell.x === col && assault.cell.y === row) {
      if (side === 'player') {
        const previousHp = assault.hp
        assault.hp = Math.max(0, assault.hp - bullet.damage)
        this.runStats.assaultDamage += previousHp - assault.hp
        tile.hp = Math.max(0, Math.min(BASE_MAX_HP, assault.hp))
        this.queueSound(assault.hp <= 0 ? 'level-clear' : 'hit')
        this.addImpactFeedback(0.22, 0.16)
        this.burst(centerX, centerY, assault.hp <= 0 ? '#fff0a8' : '#ffd35a', assault.hp <= 0 ? 22 : 8)
      } else {
        this.queueSound('hit')
        this.burst(centerX, centerY, '#cfd3d8', 5)
      }
      return
    }

    if (this.currentObjective.mode !== 'defense') {
      this.queueSound('hit')
      this.burst(centerX, centerY, '#cfd3d8', 5)
      return
    }

    if (side === 'player') {
      this.queueSound('hit')
      this.burst(centerX, centerY, '#cfd3d8', 5)
      return
    }

    const previousBaseHp = this.baseHp
    this.baseHp = this.clampBaseHp(this.baseHp - bullet.damage)
    this.runStats.baseDamageTaken += previousBaseHp - this.baseHp
    tile.hp = this.baseHp

    if (this.baseHp <= 0) {
      this.mode = 'lost'
      this.queueSound('game-over')
      this.addImpactFeedback(0.45, 0.3)
      this.finishRun()
      this.finalizeRunStatsForEvaluation()
      this.levelResult = this.createLevelResult(false, this.evaluateCurrentTacticalResult('defeat'))
      this.burst(centerX, centerY, '#ffd35a', 20)
    } else {
      this.queueSound('hit')
      this.addImpactFeedback(0.18, 0.12)
      this.burst(centerX, centerY, '#ffd35a', 8)
    }
  }

  private hitTankWithBullet(bullet: Bullet) {
    const bulletRect = {
      x: bullet.x,
      y: bullet.y,
      w: BULLET_SIZE,
      h: BULLET_SIZE,
    }

    const target = this.getTanks().find((candidate) => {
      if (candidate.id === bullet.ownerId) {
        return false
      }
      return this.isBulletHostileToTank(bullet, candidate) && rectsIntersect(bulletRect, tankRect(candidate))
    })

    if (!target) {
      return false
    }

    if (bullet.owner === 'player') {
      this.runStats.tankHits += 1
    }

    if (this.isTerrainEvidenceSentinel(target)) {
      target.hp = target.maxHp
      this.queueSound('hit')
      this.addImpactFeedback(0.08, 0.05)
      this.burst(bullet.x, bullet.y, '#86f4ff', 8)
      return true
    }

    if (target.faction === 'player') {
      this.damagePlayer(bullet.damage)
      this.queueSound('hit')
      this.addImpactFeedback(0.18, 0.16)
      this.burst(bullet.x, bullet.y, '#ffd35a', 8)
      this.applyShellSplash(bullet, bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2, target.id)
      return true
    }

    const remainingDamage = this.absorbDamageWithShield(target, bullet.damage)
    this.queueSound('hit')
    this.addImpactFeedback(0.08, 0.05)
    this.burst(bullet.x, bullet.y, target.side === 'player' ? '#ffe17a' : '#cce9ff', 8)

    if (remainingDamage > 0) {
      target.hp -= remainingDamage
    }

    if (target.hp <= 0) {
      this.destroyEnemy(target, bullet)
    }

    this.applyShellSplash(bullet, bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2, target.id)
    return true
  }

  private applyShellSplash(bullet: Bullet, impactX: number, impactY: number, directTargetId: string | null) {
    const splashDamage = bullet.splashDamage ?? 0
    const splashRadius = bullet.splashRadius ?? 0

    if (bullet.owner !== 'player' || splashDamage <= 0 || splashRadius <= 0) {
      return
    }

    const targets = this.getTanks().filter((candidate) => {
      if (candidate.id === bullet.ownerId || candidate.id === directTargetId) {
        return false
      }

      if (!this.isBulletHostileToTank(bullet, candidate)) {
        return false
      }

      const center = tankCenter(candidate)
      return Math.hypot(center.x - impactX, center.y - impactY) <= splashRadius
    })

    if (targets.length === 0) {
      return
    }

    this.burst(impactX, impactY, '#fff0a8', 10)
    this.addImpactFeedback(0.08, 0.05)

    for (const target of targets) {
      this.runStats.shrapnelHits += 1

      if (target.faction === 'player') {
        this.damagePlayer(splashDamage)
        continue
      }

      if (this.isTerrainEvidenceSentinel(target)) {
        target.hp = target.maxHp
        continue
      }

      const remainingDamage = this.absorbDamageWithShield(target, splashDamage)
      this.burst(target.x + TANK_SIZE / 2, target.y + TANK_SIZE / 2, '#fff0a8', 6)

      if (remainingDamage > 0) {
        target.hp -= remainingDamage
      }

      if (target.hp <= 0) {
        this.destroyEnemy(target, bullet)
      }
    }
  }

  private absorbDamageWithShield(tank: Tank, damage: number) {
    const incomingDamage = Math.max(0, damage)
    const shield = Math.max(0, tank.shield)
    const absorbed = Math.min(shield, incomingDamage)
    tank.shield = Number(Math.max(0, shield - absorbed).toFixed(3))
    return incomingDamage - absorbed
  }

  private damagePlayer(damage: number) {
    if (this.player.spawnGrace > 0) {
      return
    }

    const remainingDamage = this.absorbDamageWithShield(this.player, damage)
    if (remainingDamage <= 0) {
      this.player.spawnGrace = 0.5
      return
    }

    this.player.hp -= remainingDamage

    if (this.player.hp > 0) {
      this.player.spawnGrace = 0.5
      return
    }

    if (this.repairCharges > 0) {
      this.repairCharges -= 1
      this.runStats.repairKitUses += 1
      this.player.hp = Math.max(1, Math.ceil(this.player.maxHp / 2))
      this.player.spawnGrace = 1.2
      this.pushFeedbackNotice('repair', 'REPAIR KIT USED', this.player.x + TANK_SIZE / 2, this.player.y)
      return
    }

    this.lives -= 1
    this.runStats.livesLost += 1
    this.dropFlagIfCarrier(this.player.id)

    if (this.lives <= 0) {
      this.mode = 'lost'
      this.queueSound('game-over')
      this.addImpactFeedback(0.45, 0.3)
      this.finishRun()
      this.finalizeRunStatsForEvaluation()
      this.levelResult = this.createLevelResult(false, this.evaluateCurrentTacticalResult('defeat'))
      return
    }

    this.player = this.createPlayer()
  }

  private destroyEnemy(enemy: Tank, bullet?: Bullet) {
    const friendlyBot = this.isFriendlyBot(enemy)
    const playerKill = !friendlyBot && (bullet?.ownerId === this.player.id || bullet?.owner === 'player')

    if (playerKill) {
      const armored = enemy.scoreValue > 100
      const killCredits = armored ? 25 : 15
      const killXp = armored ? 18 : 10
      this.score += enemy.scoreValue
      this.progression.credits += killCredits
      this.progression.xp += killXp
      this.runStats.playerKills += 1
      if (armored) {
        this.runStats.armoredKills += 1
      }
      this.addRewards({
        killScore: enemy.scoreValue,
        killCredits,
        killXp,
      })
      this.objectiveState.playerScore += 1
    } else if (bullet?.side === 'enemy') {
      this.objectiveState.enemyScore += 1
    } else if (bullet?.side === 'neutral') {
      this.objectiveState.neutralScore += 1
    }

    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id)
    this.queueSound('enemy-destroyed')
    this.addImpactFeedback(0.14, 0.08)
    this.burst(enemy.x + TANK_SIZE / 2, enemy.y + TANK_SIZE / 2, '#a7dcff', 18)

    this.dropFlagIfCarrier(enemy.id)

    if (friendlyBot && this.getActiveFriendlyBotCount() < this.getFriendlyTargetCount()) {
      this.friendlyRespawnTimer = Math.max(this.friendlyRespawnTimer, this.currentLevel.spawnInterval)
    }

    if (playerKill && this.random() > 0.78) {
      this.spawnPowerUp(enemy)
    }
  }

  private spawnEnemy() {
    if (this.enemiesRemaining <= 0) {
      return
    }

    const spawns = this.getSpawnSide() === 'neutral'
      ? this.currentObjective.neutralSpawns ?? this.currentLevel.enemySpawns
      : this.currentLevel.enemySpawns

    for (let attempts = 0; attempts < spawns.length; attempts += 1) {
      const spawn = spawns[this.spawnCursor % spawns.length]
      this.spawnCursor += 1
      const candidate = this.createEnemy(spawn)

      if (candidate && this.canOccupy(candidate, candidate.col, candidate.row)) {
        this.nextId += 1
        this.enemies.push(candidate)
        this.enemiesRemaining -= 1
        this.burst(candidate.x + TANK_SIZE / 2, candidate.y + TANK_SIZE / 2, '#ffffff', 8)
        return
      }
    }
  }

  private spawnFriendlyBot(startIndex = 0) {
    const spawns = this.currentObjective.friendlySpawns ?? []
    for (let attempts = 0; attempts < spawns.length; attempts += 1) {
      const spawn = spawns[(startIndex + attempts) % spawns.length]
      if (!spawn) continue
      const candidate = this.createFriendlyBot(spawn)

      if (candidate && this.canOccupy(candidate, candidate.col, candidate.row)) {
        this.nextId += 1
        this.enemies.push(candidate)
        this.burst(candidate.x + TANK_SIZE / 2, candidate.y + TANK_SIZE / 2, '#cce9ff', 8)
        return true
      }
    }

    return false
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

  private applyPowerUp(kind: PowerUpKind, x: number | null = null, y: number | null = null) {
    let text = ''

    if (kind === 'repair') {
      const previousHp = this.player.hp
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1)
      const healed = this.player.hp - previousHp
      text = healed > 0 ? `REPAIR +${healed} HP` : 'REPAIR HP FULL'
    }

    if (kind === 'rapid') {
      this.player.rapid = 8
      text = 'RAPID FIRE 8s'
    }

    if (kind === 'shield') {
      const previousShield = this.player.shield
      this.player.shield = Math.min(PLAYER_MAX_SHIELD, this.player.shield + 1)
      const gained = this.player.shield - previousShield
      text = gained > 0 ? `SHIELD +${gained}` : 'SHIELD FULL'
    }

    this.runStats.powerUps[kind] += 1
    if (this.isPowerUpObjectiveRelevant(kind)) {
      this.runStats.objectiveRelevantPowerUps += 1
    }
    this.addRewards({ pickupScore: 50 })
    this.score += 50
    this.pushFeedbackNotice('pickup', `${text}  +50`, x, y)
  }

  private isPowerUpObjectiveRelevant(kind: PowerUpKind) {
    if (kind === 'repair' && this.player.hp <= Math.ceil(this.player.maxHp / 2)) {
      return true
    }

    if (this.currentObjective.mode === 'defense') {
      return this.baseHp < BASE_MAX_HP || this.distanceCells({ x: this.player.col, y: this.player.row }, this.findBaseCell()) <= 3
    }

    const flag = this.objectiveState.flag
    if (flag?.carrierId === this.player.id) {
      return true
    }

    const assault = this.objectiveState.assault
    if (assault && this.distanceCells({ x: this.player.col, y: this.player.row }, assault.cell) <= 3) {
      return true
    }

    return kind === 'shield' && this.player.hp <= 1
  }

  getAiTargetCell(tank: Tank): Vec {
    const objective = this.currentObjective
    const hostile = this.findNearestVisibleHostileTank(tank)
    const lastKnown = this.findNearestLastKnownHostile(tank)

    if (objective.mode === 'defense' && tank.side === 'enemy' && tank.role === 'base_attacker') {
      return this.findBaseCell()
    }

    if (hostile) {
      return { x: hostile.col, y: hostile.row }
    }

    if (lastKnown) {
      return { x: lastKnown.col, y: lastKnown.row }
    }

    if (objective.mode === 'assault' && tank.side === 'player' && objective.assault) {
      return this.getPassableNeighbors(objective.assault.cell)[0] ?? { x: this.player.col, y: this.player.row }
    }

    if (objective.mode === 'ctf') {
      const flag = this.objectiveState.flag
      if (flag?.carrierId && tank.side === 'enemy') {
        const carrier = this.getTankById(flag.carrierId)
        if (carrier) return { x: carrier.col, y: carrier.row }
      }
      if (tank.side === 'player' && flag && !flag.carrierId) {
        return flag.position
      }
    }

    if (objective.mode === 'defense' && tank.side === 'enemy') {
      return this.findBaseCell()
    }

    if (tank.side === 'player') {
      return { x: this.player.col, y: this.player.row }
    }

    return { x: tank.col, y: tank.row }
  }

  getAiShotTargetCell(tank: Tank): Vec | null {
    const objective = this.currentObjective
    const hostile = this.findNearestAlignedVisibleHostileTank(tank)

    if (hostile) {
      return { x: hostile.col, y: hostile.row }
    }

    if (this.hasFreshUncertainMemory(tank)) {
      return null
    }

    if (objective.mode === 'defense' && tank.side === 'enemy' && tank.role === 'base_attacker') {
      return this.findBaseCell()
    }

    if (objective.mode === 'assault' && tank.side === 'player' && objective.assault) {
      return objective.assault.cell
    }

    return null
  }

  private findNearestVisibleHostileTank(tank: Tank) {
    const vision = this.getTankVisionModel(tank)
    return this.getTanks()
      .filter((candidate) => candidate.id !== tank.id && this.areHostile(tank, candidate))
      .filter((candidate) => this.isTankVisibleToVision(candidate, vision))
      .sort((a, b) => this.distanceCells(tank, a) - this.distanceCells(tank, b))[0] ?? null
  }

  private findNearestAlignedVisibleHostileTank(tank: Tank) {
    const vision = this.getTankVisionModel(tank)
    return this.getTanks()
      .filter((candidate) => candidate.id !== tank.id && this.areHostile(tank, candidate))
      .filter((candidate) => this.isTankVisibleToVision(candidate, vision))
      .filter((candidate) => candidate.col === tank.col || candidate.row === tank.row)
      .sort((a, b) => this.distanceCells(tank, a) - this.distanceCells(tank, b))[0] ?? null
  }

  private findNearestLastKnownHostile(tank: Tank): OfflineVisionMemory | null {
    return Object.values(this.visionMemory[tank.side])
      .filter((memory) => this.time - memory.seenAt <= OFFLINE_LAST_KNOWN_SECONDS)
      .filter((memory) => {
        if (memory.alert) {
          return memory.side !== tank.side
        }
        const current = this.getTankById(memory.id)
        return Boolean(current && this.areHostile(tank, current))
      })
      .sort((a, b) =>
        this.distanceCells({ x: tank.col, y: tank.row }, { x: a.col, y: a.row }) -
        this.distanceCells({ x: tank.col, y: tank.row }, { x: b.col, y: b.row }),
      )[0] ?? null
  }

  private canPathThrough(tank: Tank, col: number, row: number) {
    return this.isTankPassableAt(col, row) && this.canOccupy(tank, col, row)
  }

  private getPassableNeighbors(cell: Vec) {
    return DIRECTION_ORDER.map((direction) => {
      const vector = DIR_VECTORS[direction]
      return { x: cell.x + vector.x, y: cell.y + vector.y }
    }).filter((candidate) => this.isTankPassableAt(candidate.x, candidate.y))
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

  private faceAndShootUsefulBrick(enemy: Tank, target: Vec) {
    const directDirections = this.preferredDirections(enemy.col, enemy.row, target.x, target.y)

    for (const direction of directDirections) {
      const vector = DIR_VECTORS[direction]
      const col = enemy.col + vector.x
      const row = enemy.row + vector.y

      if (this.tileKindAt(col, row) === 'brick' && !this.brickShotWouldExposeFriendlyObjective(enemy, direction, col, row)) {
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
    if (this.mode !== 'playing') {
      return
    }

    this.updateObjectiveState()

    if (this.isObjectiveComplete()) {
      this.completeCurrentLevel()
    }
  }

  private completeCurrentLevel() {
    this.completedLevelId = this.currentLevelId
    this.addRewards({
      missionCredits: this.currentLevel.rewards.credits,
      missionXp: this.currentLevel.rewards.xp,
      missionScore: this.currentLevel.rewards.score,
    })
    this.progression.credits += this.currentLevel.rewards.credits
    this.progression.xp += this.currentLevel.rewards.xp
    this.score += this.currentLevel.rewards.score
    this.markLevelCompleted(this.currentLevelId)
    this.progression.unlockedStage = Math.max(this.progression.unlockedStage, this.clampLevelId(this.currentLevelId + 1))
    this.mode = this.currentLevelId >= this.maxLevelId ? 'campaign-complete' : 'level-complete'
    this.finalizeRunStatsForEvaluation()
    const tactical = this.evaluateCurrentTacticalResult('victory')
    this.applyTacticalReward(tactical)
    this.levelClearPause = 0.9
    this.queueSound('level-clear')
    this.addImpactFeedback(0.2, 0.16)
    this.finishRun()
    this.levelResult = this.createLevelResult(this.mode === 'campaign-complete', tactical)
  }

  private createLevelResult(campaignComplete: boolean, tactical: TacticalEvaluation): LevelResult {
    return {
      levelId: this.completedLevelId ?? this.currentLevelId,
      levelName: this.currentLevel.name,
      objectiveMode: this.currentObjective.mode,
      objectiveLabel: this.currentObjective.label,
      winCondition: this.currentObjective.winCondition,
      campaignComplete,
      duration: Number(this.runStats.duration.toFixed(2)),
      score: this.score,
      bestScore: this.progression.bestScore,
      unlockedStage: this.progression.unlockedStage,
      completedLevels: [...this.progression.completedLevels],
      stats: this.cloneRunStats(),
      rewards: this.normalizeRewardLedger(this.runStats.rewards),
      tactical,
    }
  }

  private finalizeRunStatsForEvaluation() {
    this.runStats.friendlySurvivors = this.enemies.filter((tank) => tank.side === 'player' && tank.hp > 0).length
  }

  private evaluateCurrentTacticalResult(outcome: 'victory' | 'defeat') {
    return evaluateTacticalVictory({
      objectiveMode: this.currentObjective.mode,
      objective: this.getObjectiveSnapshot(),
      stats: this.cloneRunStats(),
      baseHp: this.baseHp,
      baseMaxHp: BASE_MAX_HP,
      lives: this.lives,
      startingLives: 3,
      missionRewards: this.currentLevel.rewards,
      outcome,
    })
  }

  private applyTacticalReward(tactical: TacticalEvaluation) {
    const creditsBonus = tactical.rewardModifier.creditsBonus
    const xpBonus = tactical.rewardModifier.xpBonus

    if (creditsBonus <= 0 && xpBonus <= 0) {
      return
    }

    this.progression.credits += creditsBonus
    this.progression.xp += xpBonus
    this.addRewards({
      tacticalCredits: creditsBonus,
      tacticalXp: xpBonus,
    })
  }

  private finishRun() {
    this.progression.bestScore = Math.max(this.progression.bestScore, this.score)
    this.savedRun = null
    this.persist()
  }

  private findBaseCell() {
    for (let row = 0; row < this.getMapRows(); row += 1) {
      for (let col = 0; col < this.getMapCols(); col += 1) {
        if (this.tiles[row]?.[col]?.kind === 'base') {
          return { x: col, y: row }
        }
      }
    }

    return { x: this.player.col, y: this.player.row }
  }

  private tileKindAt(col: number, row: number): TileKind {
    if (!this.isInBounds(col, row)) {
      return 'steel'
    }

    return this.tiles[row]?.[col]?.kind ?? 'steel'
  }

  private isInBounds(col: number, row: number) {
    return col >= 0 && col < this.getMapCols() && row >= 0 && row < this.getMapRows()
  }

  private isPassableForTank(kind: TileKind) {
    return isPassableTerrain(kind)
  }

  private isCriticalCoverCell(col: number, row: number) {
    if (this.currentObjective.mode === 'defense') {
      return this.distanceCells({ x: col, y: row }, this.findBaseCell()) <= 2
    }

    const flag = this.objectiveState.flag
    if (flag) {
      return (
        this.distanceCells({ x: col, y: row }, flag.playerBase) <= 2 ||
        this.distanceCells({ x: col, y: row }, flag.enemyHome) <= 2
      )
    }

    const assault = this.objectiveState.assault
    if (assault) {
      return this.distanceCells({ x: col, y: row }, assault.cell) <= 2
    }

    return false
  }

  private getTankAt(col: number, row: number, exceptId?: string) {
    return this.getTanks().find((tank) => tank.id !== exceptId && tank.col === col && tank.row === row) ?? null
  }

  private brickShotWouldExposeFriendlyObjective(tank: Tank, direction: Direction, brickCol: number, brickRow: number) {
    const vector = DIR_VECTORS[direction]
    const nextCol = brickCol + vector.x
    const nextRow = brickRow + vector.y

    return this.isObjectiveOwnedBySideAt(tank.side, nextCol, nextRow)
  }

  private isObjectiveOwnedBySideAt(side: CombatSide, col: number, row: number) {
    if (side === 'player' && this.currentObjective.mode === 'defense') {
      const base = this.findBaseCell()
      return base.x === col && base.y === row
    }

    if (side === 'enemy' && this.currentObjective.mode === 'assault') {
      const assault = this.objectiveState.assault
      return Boolean(assault && assault.cell.x === col && assault.cell.y === row)
    }

    return false
  }

  private resolveSafeSpawn(preferred: Vec, tankId: string): Vec | null {
    const start = {
      x: Math.floor(clamp(preferred.x, 0, Math.max(0, this.getMapCols() - 1))),
      y: Math.floor(clamp(preferred.y, 0, Math.max(0, this.getMapRows() - 1))),
    }
    const queue: Vec[] = [start]
    const visited = new Set<string>([`${start.x},${start.y}`])

    while (queue.length > 0) {
      const cell = queue.shift()
      if (!cell) break

      if (this.canSpawnAt(tankId, cell.x, cell.y)) {
        return cell
      }

      for (const direction of DIRECTION_ORDER) {
        const vector = DIR_VECTORS[direction]
        const next = { x: cell.x + vector.x, y: cell.y + vector.y }
        const key = `${next.x},${next.y}`

        if (!this.isInBounds(next.x, next.y) || visited.has(key)) {
          continue
        }

        visited.add(key)
        queue.push(next)
      }
    }

    return null
  }

  private canSpawnAt(tankId: string, col: number, row: number) {
    return this.isSpawnCellOpen(tankId, col, row) && this.hasSpawnExit(tankId, col, row)
  }

  private hasSpawnExit(tankId: string, col: number, row: number) {
    return DIRECTION_ORDER.some((direction) => {
      const vector = DIR_VECTORS[direction]
      return this.isSpawnCellOpen(tankId, col + vector.x, row + vector.y)
    })
  }

  private isSpawnCellOpen(tankId: string, col: number, row: number) {
    if (!this.isInBounds(col, row)) {
      return false
    }

    const tile = this.tiles[row]?.[col]
    if (!tile || !this.isTankPassableAt(col, row)) {
      return false
    }

    return !this.getTanks().some((tank) => {
      if (tank.id === tankId) {
        return false
      }

      const occupiedCol = tank.move ? tank.move.toCol : tank.col
      const occupiedRow = tank.move ? tank.move.toRow : tank.row
      return occupiedCol === col && occupiedRow === row
    })
  }

  private isSolidForBullet(kind: TileKind) {
    return isProjectileBlockingTerrain(kind)
  }

  private isOutsideArena(x: number, y: number) {
    return x < ARENA_X || y < ARENA_Y || x > ARENA_X + this.getMapCols() * TILE_SIZE || y > ARENA_Y + this.getMapRows() * TILE_SIZE
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

  private createRetranslators(points: Vec[]): OfflineRetranslator[] {
    return points.map((point, index) => ({
      id: `relay-${index + 1}`,
      col: Math.floor(clamp(point.x, 0, Math.max(0, this.getMapCols() - 1))),
      row: Math.floor(clamp(point.y, 0, Math.max(0, this.getMapRows() - 1))),
      owner: null,
      captureSide: null,
      progress: 0,
    }))
  }

  private normalizeRetranslators(value: unknown): OfflineRetranslator[] {
    const fallback = this.createRetranslators(this.currentLevel.retranslators ?? [])
    if (!Array.isArray(value)) {
      return fallback
    }

    const normalized = value
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          return null
        }

        const relay = entry as Partial<OfflineRetranslator>
        const owner = this.normalizeCombatSide(relay.owner)
        const captureSide = this.normalizeCombatSide(relay.captureSide)
        return {
          id: typeof relay.id === 'string' && relay.id ? relay.id : `relay-${index + 1}`,
          col: Math.floor(clamp(this.safeNumber(relay.col), 0, Math.max(0, this.getMapCols() - 1))),
          row: Math.floor(clamp(this.safeNumber(relay.row), 0, Math.max(0, this.getMapRows() - 1))),
          owner,
          captureSide,
          progress: clamp(this.safeNumber(relay.progress, owner ? 1 : 0), 0, 1),
        }
      })
      .filter((relay): relay is OfflineRetranslator => Boolean(relay))

    return normalized.length > 0 ? normalized : fallback
  }

  private normalizeCombatSide(value: unknown): CombatSide | null {
    return value === 'player' || value === 'enemy' || value === 'neutral' ? value : null
  }

  private isDeployableKind(value: unknown): value is OfflineDeployableKind {
    return value === 'decoy' || value === 'mine' || value === 'noise' || value === 'steel' || value === 'tripwire'
  }

  private getDeployableKindForInput(button: keyof InputState): OfflineDeployableKind | null {
    return DEPLOYABLE_ORDER.find((kind) => DEPLOYABLE_INPUTS[kind] === button) ?? null
  }

  private createEmptyVisionMemory(): Record<CombatSide, Record<string, OfflineVisionMemory>> {
    return {
      player: {},
      enemy: {},
      neutral: {},
    }
  }

  private normalizeVisionMemory(value: unknown): Record<CombatSide, Record<string, OfflineVisionMemory>> {
    const memory = this.createEmptyVisionMemory()
    if (!value || typeof value !== 'object') {
      return memory
    }

    const source = value as Partial<Record<CombatSide, Record<string, Partial<OfflineVisionMemory>>>>
    for (const side of ['player', 'enemy', 'neutral'] as CombatSide[]) {
      const sideEntries = source[side]
      if (!sideEntries || typeof sideEntries !== 'object') {
        continue
      }

      for (const [id, entry] of Object.entries(sideEntries)) {
        if (!entry || typeof entry !== 'object') {
          continue
        }

        const rememberedSide = this.normalizeCombatSide(entry.side) ?? side
        const team = entry.team === 'red' ? 'red' : 'blue'
        memory[side][id] = {
          id,
          side: rememberedSide,
          team,
          col: Math.floor(clamp(this.safeNumber(entry.col), 0, Math.max(0, this.getMapCols() - 1))),
          row: Math.floor(clamp(this.safeNumber(entry.row), 0, Math.max(0, this.getMapRows() - 1))),
          seenAt: this.safeNumber(entry.seenAt, this.time),
          alert: Boolean(entry.alert),
          source: this.isDeployableKind(entry.source) ? entry.source : undefined,
        }
      }
    }

    return memory
  }

  private cloneVisionMemory() {
    return {
      player: Object.fromEntries(Object.entries(this.visionMemory.player).map(([id, memory]) => [id, { ...memory }])),
      enemy: Object.fromEntries(Object.entries(this.visionMemory.enemy).map(([id, memory]) => [id, { ...memory }])),
      neutral: Object.fromEntries(Object.entries(this.visionMemory.neutral).map(([id, memory]) => [id, { ...memory }])),
    }
  }

  private serializeRun(): SavedRun {
    return {
      currentLevel: this.currentLevelId,
      tankClass: this.activeTankClassId,
      score: this.score,
      lives: this.lives,
      baseHp: this.baseHp,
      enemiesRemaining: this.enemiesRemaining,
      spawnCursor: this.spawnCursor,
      spawnTimer: this.spawnTimer,
      friendlyRespawnTimer: this.friendlyRespawnTimer,
      nextId: this.nextId,
      time: this.time,
      tiles: this.tiles.map((row) => row.map((tile) => ({ ...tile }))),
      player: this.serializeTank(this.player),
      enemies: this.enemies.map((enemy) => this.serializeTank(enemy)),
      bullets: this.bullets.map((bullet) => ({ ...bullet })),
      powerUps: this.powerUps.map((powerUp) => ({ ...powerUp })),
      repairCharges: this.repairCharges,
      playerShells: this.playerShells,
      playerShellCapacity: this.playerShellCapacity,
      playerShellRechargeProgress: this.playerShellRechargeProgress,
      portableRelay: {
        deployed: this.portableRelays.length > 0,
        col: this.portableRelays[0]?.col,
        row: this.portableRelays[0]?.row,
      },
      portableRelays: this.portableRelays.map((relay) => ({
        id: relay.id,
        deployed: true,
        col: relay.col,
        row: relay.row,
      })),
      deployables: this.deployables.map((deployable) => ({ ...deployable })),
      deployableAlerts: this.deployableAlerts.map((alert) => ({ ...alert })),
      majorMods: {
        selected: this.progression.selectedMajorMod,
        overdrive: {
          remaining: this.majorMods.overdriveRemaining,
          cooldown: this.majorMods.overdriveCooldown,
        },
        pontoon: {
          active: Boolean(this.majorMods.pontoon),
          cells: this.majorMods.pontoon?.cells.map((cell) => ({ ...cell })) ?? [],
          dir: this.majorMods.pontoon?.dir ?? 'up',
        },
        hedgehog: this.majorMods.hedgehog
          ? {
              active: true,
              spent: this.majorMods.hedgehogSpent,
              col: this.majorMods.hedgehog.col,
              row: this.majorMods.hedgehog.row,
              hitsTaken: this.majorMods.hedgehog.hitsTaken,
              hitsRequired: HEDGEHOG_REQUIRED_HITS,
              hitsRemaining: Math.max(0, HEDGEHOG_REQUIRED_HITS - this.majorMods.hedgehog.hitsTaken),
              trappedTankId: this.majorMods.hedgehog.trappedTankId,
            }
          : undefined,
        hedgehogSpent: this.majorMods.hedgehogSpent,
        emp: this.majorMods.emp
          ? {
              active: true,
              col: this.majorMods.emp.col,
              row: this.majorMods.emp.row,
              radius: EMP_RADIUS_TILES,
              nextPulseIn: this.majorMods.emp.nextPulseIn,
              disrupting: this.isEmpPulseActive(),
              disruptingRemaining: Math.max(0, this.majorMods.emp.disruptingUntil - this.time),
              disruptionProgress: this.getEmpDisruptionProgress(),
              visionFade: this.getEmpVisionFade(),
            }
          : undefined,
        tracks: this.treadTracks.map((track) => ({ ...track })),
      },
      retranslators: this.retranslators.map((relay) => ({ ...relay })),
      visionMemory: this.cloneVisionMemory(),
      objective: this.getObjectiveSnapshot(),
      runStats: this.cloneRunStats(),
    }
  }

  private serializeTank(tank: Tank): SavedTank {
    return {
      id: tank.id,
      faction: tank.faction,
      classId: tank.classId ?? undefined,
      side: tank.side,
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
      slow: tank.slow,
      immobilized: tank.immobilized,
    }
  }

  private restoreRun(run: SavedRun) {
    this.currentLevelId = this.clampLevelId(run.currentLevel ?? 1)
    this.activeTankClassId = normalizeTankClassId(run.tankClass ?? run.player?.classId)
    this.score = run.score
    this.lives = run.lives
    this.baseHp = this.clampBaseHp(run.baseHp)
    this.enemiesRemaining = run.enemiesRemaining
    this.spawnCursor = run.spawnCursor
    this.spawnTimer = run.spawnTimer
    this.friendlyRespawnTimer = run.friendlyRespawnTimer ?? 0
    this.nextId = run.nextId
    this.time = run.time
    this.tiles = run.tiles.map((row) => row.map((tile) => ({ ...tile })))
    this.objectiveState = run.objective ?? this.createObjectiveState()
    this.retranslators = this.normalizeRetranslators(run.retranslators)
    this.visionMemory = this.normalizeVisionMemory(run.visionMemory)
    this.botBeliefs = {}
    this.player = this.restoreTank(run.player)
    this.enemies = run.enemies.map((enemy) => this.restoreTank(enemy))
    this.bullets = run.bullets.map((bullet) => ({
      ...bullet,
      ownerId: bullet.ownerId ?? bullet.owner,
      side: bullet.side ?? (bullet.owner === 'player' ? 'player' : 'enemy'),
    }))
    this.powerUps = run.powerUps.map((powerUp) => ({ ...powerUp }))
    this.repairCharges = run.repairCharges
    this.restoreShellState(run)
    this.restorePortableRelayState(run)
    this.restoreDeployableState(run)
    this.restoreMajorModState(run)
    this.runStats = this.normalizeRunStats(run.runStats)
    this.levelResult = null
    this.feedbackNotices = []
    this.particles = []
    this.terrainEvidence = []
    this.terrainEvidenceSentinelPatrolIndex = 0
    this.portableSignalWaves = []
    this.portableSignalContacts = []
    this.input = { ...EMPTY_INPUT }
    this.mode = 'playing'
    this.menuIndex = 0
    this.snapCameraToPlayer()
    this.syncBaseTileHp()
  }

  private restoreTank(saved: SavedTank): Tank {
    const tank = this.createTank({
      id: saved.id,
      faction: saved.faction,
      classId: saved.faction === 'player' ? this.activeTankClassId : null,
      side: saved.side ?? (saved.faction === 'player' ? 'player' : 'enemy'),
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
    tank.slow = Math.max(0, this.safeNumber(saved.slow))
    tank.immobilized = Math.max(0, this.safeNumber(saved.immobilized))
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

  private addShotFeedback(tank: Tank, bullet: Bullet) {
    const muzzleX = bullet.x + BULLET_SIZE / 2
    const muzzleY = bullet.y + BULLET_SIZE / 2
    const color = tank.team === this.playerTeam ? '#fff1a5' : '#ffbd8a'
    const vector = DIR_VECTORS[tank.dir]
    const tangent = { x: -vector.y, y: vector.x }
    const count = tank.faction === 'player' ? 5 : 3

    for (let index = 0; index < count; index += 1) {
      const spread = index - (count - 1) / 2
      this.particles.push({
        x: muzzleX + tangent.x * spread * 2,
        y: muzzleY + tangent.y * spread * 2,
        vx: vector.x * (40 + index * 4) + tangent.x * spread * 12,
        vy: vector.y * (40 + index * 4) + tangent.y * spread * 12,
        life: 0.14 + index * 0.01,
        color,
      })
    }

    if (tank.faction === 'player') {
      this.addImpactFeedback(0.04, 0.03)
    }
  }

  private addMovementFeedback(tank: Tank) {
    if (tank.faction !== 'player') {
      return
    }

    const vector = DIR_VECTORS[tank.dir]
    const center = tankCenter(tank)
    const originX = center.x - vector.x * 12
    const originY = center.y - vector.y * 12
    const tangent = { x: -vector.y, y: vector.x }

    for (let index = 0; index < 3; index += 1) {
      const drift = (index - 1) * 5
      this.particles.push({
        x: originX + tangent.x * drift,
        y: originY + tangent.y * drift,
        vx: -vector.x * (18 + index * 5) + tangent.x * drift,
        vy: -vector.y * (18 + index * 5) + tangent.y * drift,
        life: 0.17 + index * 0.03,
        color: '#7f7954',
      })
    }
  }

  private getPauseHelperLine(itemId: string | undefined) {
    const action = this.touchControlsVisible ? 'Tap' : 'Select'

    if (itemId === 'resume') {
      return `${action} Resume to return to the fight without changing this run.`
    }

    if (itemId === 'restart') {
      return `${action} Restart to reload this mission from the beginning; unsaved progress is discarded.`
    }

    return `${action} Save And Quit to store this run locally so Continue resumes here.`
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

  private clampBaseHp(value: number) {
    return Math.floor(clamp(Number.isFinite(value) ? value : BASE_MAX_HP, 0, BASE_MAX_HP))
  }

  private syncBaseTileHp() {
    for (let row = 0; row < this.getMapRows(); row += 1) {
      for (let col = 0; col < this.getMapCols(); col += 1) {
        if (this.tiles[row]?.[col]?.kind === 'base') {
          this.tiles[row][col].hp = this.baseHp
          return
        }
      }
    }
  }
}

function stepCamera(current: BattlefieldCamera, target: BattlefieldCamera, dt: number, smoothingMs: number): BattlefieldCamera {
  const safeDt = Math.max(0, dt)
  const smoothingSeconds = Math.max(0.001, smoothingMs / 1000)
  const alpha = 1 - Math.exp(-safeDt / smoothingSeconds)
  const next = {
    col: lerp(current.col, target.col, alpha),
    row: lerp(current.row, target.row, alpha),
  }

  return {
    col: snapNear(next.col, target.col),
    row: snapNear(next.row, target.row),
  }
}

function lerp(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha
}

function snapNear(value: number, target: number) {
  return Math.abs(value - target) < 0.001 ? target : value
}
