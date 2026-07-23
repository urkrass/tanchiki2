import type { BotDifficultyConfig } from './ai/botTypes.ts'
import type { TankClassId } from '../../packages/shared/src/tankClasses.ts'
import type {
  AcousticDirection,
  AcousticDistanceBand,
  AcousticEventKind,
  AudibleAcousticCue,
} from '../../packages/shared/src/spatialHearing.ts'
import type { ArenaWorldPixelPoint } from './spatialCoordinates.ts'

export type { TankClassId } from '../../packages/shared/src/tankClasses.ts'

export type Direction = 'up' | 'right' | 'down' | 'left'
export type RunKind = 'campaign' | 'tutorial'
export type GameMode =
  | 'main-menu'
  | 'level-select'
  | 'tutorial-select'
  | 'team-select'
  | 'tank-select'
  | 'garage'
  | 'garage-mods'
  | 'settings'
  | 'online-menu'
  | 'briefing'
  | 'encyclopedia'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'level-complete'
  | 'tutorial-complete'
  | 'campaign-complete'
  | 'won'
  | 'lost'
export type TankFaction = 'player' | 'enemy'
export type Team = 'blue' | 'red'
export type CombatSide = 'player' | 'enemy' | 'neutral'
export type EnemyRole = 'base_attacker' | 'hunter' | 'wall_breaker'
export type ObjectiveMode = 'defense' | 'team-battle' | 'ctf' | 'ffa' | 'assault'
export type BattlefieldBiomeId = 'temperate' | 'swamp' | 'snow' | 'desert_dust' | 'industrial' | 'ruined_battlefield'
export type BattlefieldPropCategory =
  | 'blocking_natural'
  | 'soft_cover_vegetation'
  | 'destructible_clutter'
  | 'battlefield_debris'
  | 'infrastructure_signal'
  | 'decoration'
export type BattlefieldPropMechanicalRole =
  | 'none'
  | 'blocking'
  | 'soft_cover'
  | 'destructible'
  | 'infrastructure'
  | 'decoration'
  | 'evidence_surface'
  | 'hazard'
export type TileKind =
  | 'empty'
  | 'brick'
  | 'steel'
  | 'water'
  | 'trees'
  | 'base'
  | 'radio'
  | 'depot'
  | 'road'
  | 'ammo'
  | 'swamp'
  | 'ricochet'
  | 'metal'
  | 'dust'
  | 'echo'
  | 'reeds'
  | 'gravel'
  | 'snow'
export type PowerUpKind = 'repair' | 'rapid' | 'shield'
export type FieldSalvageWreckPhase = 'salvageable' | 'burned'
export type UpgradeKind = 'armor' | 'cannon' | 'engine' | 'repairKit'
export type MajorModKind = 'overdrive' | 'pontoon' | 'hedgehog' | 'emp'
export type BattleTankAbilityKind = 'bulwark' | 'traverse'
export type NativeClassKitActionKind = Exclude<OfflineDeployableKind, 'noise'> | BattleTankAbilityKind
export type TouchHandedness = 'standard' | 'mirrored'
export type TutorialMissionId = 1 | 2 | 3 | 4 | 5 | 6
export type TutorialSpeaker = 'General Rook' | 'Needle' | 'Spanner' | 'Brick'
export type TutorialTriggerKind =
  | 'confirm'
  | 'elapsed'
  | 'move'
  | 'turn'
  | 'fire'
  | 'destroy'
  | 'relay'
  | 'ammo'
  | 'deploy'
  | 'mod'
  | 'objective'
  | 'flag-pickup'
  | 'flag-drop'
  | 'flag-capture'
  | 'camera-complete'
export type OfflineDeployableKind = 'decoy' | 'mine' | 'noise' | 'steel' | 'tripwire'
export type EncyclopediaVisualKind =
  | 'player-tank'
  | 'scout-class'
  | 'engineer-class'
  | 'battle-class'
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
  | 'salvage-wreck'
  | 'relay'
  | 'portable-relay'
  | 'decoy'
  | 'mine'
  | 'noise'
  | 'steel-trap'
  | 'tripwire'
  | 'bulwark'
  | 'traverse'
  | 'overdrive'
  | 'pontoon'
  | 'hedgehog'
  | 'emp'
  | 'brick'
  | 'steel'
  | 'water'
  | 'trees'
  | 'base'
  | 'radio'
  | 'depot'
  | 'road'
  | 'ammo'
  | 'swamp'
  | 'ricochet'
  | 'metal'
  | 'dust'
  | 'echo'
  | 'reeds'
  | 'gravel'
  | 'snow'
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
  | 'tracks'
  | 'rustle'
  | 'trap'
  | 'environment'

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
  transfer?: {
    dropCell: Vec
    receiveCell: Vec
    gateCells: Vec[]
    trapCell?: Vec
    activatesAfterCaptures?: number
    handoffActorId?: string
    handoffWaitCell?: Vec
  }
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
  activeFriendlyLimit?: number
  friendlyRosterTotal?: number
  enemyTickets?: number
  neutralSpawns?: Vec[]
  neutralTotal?: number
  targetScore?: number
  flag?: FlagObjectiveDefinition
  assault?: AssaultObjectiveDefinition
}

export interface LevelSignalJammerDefinition {
  id: string
  cell: Vec
  radius: number
  side: Exclude<CombatSide, 'neutral'>
  propId: string
}

export interface LevelDefinition {
  id: number
  name: string
  briefing: string
  objective: LevelObjective
  biome?: BattlefieldBiomeId
  rows: string[]
  props?: BattlefieldPropInstance[]
  playerSpawn: Vec
  enemySpawns: Vec[]
  retranslators?: Vec[]
  signalJammers?: LevelSignalJammerDefinition[]
  enemyTotal: number
  activeEnemyLimit: number
  continuousEnemySpawns?: boolean
  spawnInterval: number
  roleWeights: RoleWeights
  armoredEnemyRatio: number
  rewards: LevelRewards
  revealMap?: boolean
  friendlyLoadouts?: LevelFriendlyLoadout[]
}

export interface LevelFriendlyLoadout {
  id: string
  classId: TankClassId
  majorMod?: MajorModKind
  spawn: Vec
  dir?: Direction
  behavior?: 'battle-battery' | 'recon-screen' | 'signal-support'
  shellCapacity?: number
}

export interface TutorialDialogueLine {
  speaker: TutorialSpeaker
  text: string
  duration?: number
}

export interface TutorialTriggerDefinition {
  kind: TutorialTriggerKind
  count?: number
  target?: string
  seconds?: number
  zone?: {
    x: number
    y: number
    radius: number
  }
  requireMoving?: boolean
}

export interface TutorialCameraCue {
  target: Vec
  duration: number
  holdDanger: boolean
  label: string
  followActorId?: string
  untilTrigger?: boolean
  waypoints?: {
    target: Vec
    duration: number
    label: string
  }[]
}

export interface TutorialActorLoadout {
  id: string
  callSign: TutorialSpeaker
  classId: TankClassId
  majorMod: MajorModKind
  side: CombatSide
  team: Team
  spawn: Vec
}

export interface TutorialAdaptiveGoal {
  classId?: TankClassId
  majorMod?: MajorModKind
  goal: string
  trigger: TutorialTriggerDefinition
}

export interface TutorialStepDefinition {
  id: string
  goal: string
  trigger: TutorialTriggerDefinition
  dialogue: TutorialDialogueLine[]
  completionDialogue?: TutorialDialogueLine[]
  cameraCue?: TutorialCameraCue
  holdDanger?: boolean
  adaptiveGoals?: TutorialAdaptiveGoal[]
  adaptiveMode?: 'class' | 'mod'
}

export type TutorialActionCueKind =
  | 'confirm'
  | 'move'
  | 'turn'
  | 'fire'
  | 'relay'
  | 'deploy'
  | 'mod'
  | 'drive'
  | 'wait'
  | 'drop-flag'

export interface TutorialActionCue {
  kind: TutorialActionCueKind
  label: string
  keyboardKeys: string[]
  touchKeys: string[]
}

export interface TutorialMissionDefinition {
  id: TutorialMissionId
  name: string
  subtitle: string
  objectiveMode: ObjectiveMode
  briefing: string
  recommendedClass: TankClassId
  recommendedMod: MajorModKind
  level: LevelDefinition
  steps: TutorialStepDefinition[]
  actors: TutorialActorLoadout[]
  scriptedDeployables?: Array<{
    id: string
    kind: OfflineDeployableKind
    cell: Vec
    owner: CombatSide
    ownerTankId: string
    team: Team
    tutorialTrigger?: 'flag-trap'
  }>
}

export interface TutorialSnapshot {
  active: boolean
  missionId: TutorialMissionId | null
  missionName: string | null
  stepId: string | null
  speaker: TutorialSpeaker | null
  dialogue: string | null
  dialogueVisibleCharacters: number
  dialogueComplete: boolean
  dangerHeld: boolean
  playerControlHeld: boolean
  activeGoal: string | null
  actionCue: TutorialActionCue | null
  completedMissions: number[]
  unlockedMissions: number[]
  missionComplete: boolean
  recommendedLoadout: {
    classId: TankClassId
    majorMod: MajorModKind
  } | null
  actualLoadout: {
    classId: TankClassId
    majorMod: MajorModKind
  }
  cameraControlled: boolean
  cameraLabel: string | null
  cameraFollowActorId: string | null
  cameraWaypointIndex: number
  cameraWaypointCount: number
  reducedMotion: boolean
  instructorLoadouts: TutorialActorLoadout[]
}

export interface BattlefieldPropInstance {
  id: string
  spriteId: string
  x: number
  y: number
  rotation?: number
  variant?: string
  mechanicalRole?: BattlefieldPropMechanicalRole
}

export interface BattlefieldPropSnapshot {
  id: string
  spriteId: string
  x: number
  y: number
  rotation: number
  variant: string | null
  category: BattlefieldPropCategory
  biome: BattlefieldBiomeId
  mechanicalRole: BattlefieldPropMechanicalRole
  collisionHint: string | null
  coverHint: string | null
  tags: string[]
}

export interface BattlefieldPropsSnapshot {
  manifestVersion: number
  biome: BattlefieldBiomeId
  total: number
  visible: BattlefieldPropSnapshot[]
  categories: Record<BattlefieldPropCategory, number>
  mechanicalRoles: Record<BattlefieldPropMechanicalRole, number>
}

export type SoftCoverDisturbanceReason = 'movement' | 'firing'

export interface SoftCoverConcealmentSnapshot {
  tankId: string
  side: CombatSide
  team: Team
  propId: string
  spriteId: string
  col: number
  row: number
  moving: boolean
  concealed: boolean
  multiplier: number
  revealRemaining: number
  label: string
}

export interface SoftCoverDisturbanceSnapshot {
  id: string
  propId: string
  spriteId: string
  col: number
  row: number
  age: number
  ttl: number
  strength: number
  sourceTeam: Team
  reason: SoftCoverDisturbanceReason
  label: string
}

export interface SoftCoverSnapshot {
  supportedPropIds: string[]
  active: SoftCoverConcealmentSnapshot[]
  disturbances: SoftCoverDisturbanceSnapshot[]
}

export interface GridMove {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  elapsed: number
  duration: number
  slide?: boolean
}

export interface Tank {
  id: string
  faction: TankFaction
  classId: TankClassId | null
  majorMod?: MajorModKind | null
  callSign?: TutorialSpeaker | null
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
  modActiveRemaining?: number
  bulwarkRemaining: number
  bulwarkCapacity: number
  bulwarkCooldown: number
  traverseRemaining: number
  traverseCooldown: number
  scriptedBehavior?: LevelFriendlyLoadout['behavior']
  scriptedAnchorCol?: number
  scriptedStrafeDirection?: -1 | 1
  shells?: number
  shellCapacity?: number
  shellRechargeProgress?: number
  scriptedEquipmentUsed?: boolean
  scriptedNativeKitUsed?: boolean
  scriptedModUsed?: boolean
  move: GridMove | null
  path: Vec[]
}

export interface Bullet {
  id: string
  owner: TankFaction
  ownerId?: string
  classId?: TankClassId
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
  ricochets?: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  visual?: 'spark' | 'smoke' | 'he-fragment' | 'dust' | 'shield-impact'
  anchorTankId?: string
}

export interface PowerUp {
  id: string
  kind: PowerUpKind
  x: number
  y: number
  ttl: number
}

export interface FieldSalvageWreck {
  id: string
  col: number
  row: number
  x: number
  y: number
  dir: Direction
  classId: TankClassId | null
  sourceTeam: Team
  sourceSide: CombatSide
  phase: FieldSalvageWreckPhase
  age: number
  shellsAvailable: number
  repairsAvailable: number
  salvagingTankId: string | null
  shellProgress: number
  repairProgress: number
  playerSalvaged: boolean
}

export interface FieldSalvageWreckSnapshot extends FieldSalvageWreck {
  phaseRemaining: number
  decayRemaining: number
  shellProgressRatio: number
  repairProgressRatio: number
}

export interface FieldSalvageTankSnapshot {
  active: boolean
  wreckId: string | null
  label: string
  shellsAvailable: number
  repairsAvailable: number
  shellProgress: number
  repairProgress: number
}

export type OfflineVisionCircleKind = 'self' | 'teammate' | 'relay' | 'camera'

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
  sourceTeam?: Team
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
  ownerTankId?: string
  team?: Team
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

export interface OfflineSignalJammerSnapshot {
  id: string
  propId: string
  col: number
  row: number
  radius: number
  side: Exclude<CombatSide, 'neutral'>
  active: boolean
  empDisabled: boolean
  anchorHp: number
  anchorMaxHp: number
}

export interface OfflineSignalWarfareSnapshot {
  state: 'clear' | 'jammed' | 'emp-window'
  activeJammerCount: number
  suppressedRelayCount: number
  visibleJammers: OfflineSignalJammerSnapshot[]
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
  mod: boolean
  decoy: boolean
  mine: boolean
  noise: boolean
  steel: boolean
  tripwire: boolean
  bulwark: boolean
  traverse: boolean
}

export interface BattleTankKitSnapshot {
  available: boolean
  bulwark: {
    active: boolean
    remaining: number
    capacity: number
    maxCapacity: number
    cooldown: number
    duration: number
    rechargeDuration: number
    ready: boolean
  }
  traverse: {
    active: boolean
    remaining: number
    cooldown: number
    duration: number
    rechargeDuration: number
    ready: boolean
    facing: Direction
  }
  label: string
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
  tutorialCompletedMissions: number[]
  selectedMajorMod: MajorModKind
  upgrades: UpgradeLevels
}

export interface SettingsState {
  volume: number
  muted: boolean
  colorSafe: boolean
  touchHandedness: TouchHandedness
}

export interface TouchJoystickSnapshot {
  active: boolean
  anchorX: number
  anchorY: number
  offsetX: number
  offsetY: number
  direction: Direction | null
}

export interface TouchOrientationGateSnapshot {
  active: boolean
  reason: 'tablet-portrait' | null
  onlineBattleLive: boolean
}

export interface TouchModConfirmationSnapshot {
  kind: Exclude<MajorModKind, 'overdrive'>
  progress: number
  duration: number
  remaining: number
  valid: boolean
  label: string
  cells: Vec[]
}

export interface TouchModSliderSnapshot {
  active: boolean
  progress: number
  activated: boolean
}

export interface TouchInteractionSnapshot {
  handedness: TouchHandedness
  joystick: TouchJoystickSnapshot
  orientationGate: TouchOrientationGateSnapshot
  relayProgress: number | null
  modConfirmation: TouchModConfirmationSnapshot | null
  modSlider: TouchModSliderSnapshot
}

export interface FeedbackNotice {
  id: string
  kind: FeedbackNoticeKind
  text: string
  age: number
  duration: number
  anchor: ArenaWorldPixelPoint | null
}

export interface FeedbackState {
  shake: number
  flash: number
  levelClearPause: number
  touchControlsVisible: boolean
  touch: TouchInteractionSnapshot
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
  wrecksSalvaged: number
  wreckShellsRecovered: number
  wreckHpRecovered: number
  wrecksCleared: number
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

export interface MajorModPresentation {
  kind: MajorModKind
  label: string
  selected: boolean
  status: 'ready' | 'active' | 'cooldown' | 'placed' | 'spent'
  description: string
  effect: string
  tradeoff: string
  bestUse: string
}

export interface TreadTrackSnapshot {
  id: string
  tankId: string
  col: number
  row: number
  dir: Direction
  team: Team
  weight: 'light' | 'medium' | 'heavy'
  age: number
  ttl: number
  visibility: number
  overdrive: boolean
  surface: TileKind
}

export type TerrainEvidenceKind = 'dust' | 'noise' | 'rustle' | 'metal' | 'echo' | 'ricochet'

export interface TerrainEvidenceSnapshot {
  id: string
  kind: TerrainEvidenceKind
  channel: 'physical' | 'signal'
  surface: TileKind
  col: number
  row: number
  dir?: Direction
  age: number
  ttl: number
  strength: number
  label: string
  audible: boolean
  sourcePrecision: 'exact' | 'directional'
  hearing: {
    direction: AcousticDirection
    distanceBand: AcousticDistanceBand
    occluded: boolean
  } | null
}

export interface HearingSnapshot {
  channel: 'physical'
  cues: AudibleAcousticCue[]
}

export interface HearingRangeTestSnapshot {
  active: true
  checkpointIndex: number
  checkpointCount: number
  checkpointId: string
  label: string
  instruction: string
  expectedVisual: 'exact' | 'strong' | 'medium' | 'faint' | 'none' | 'heard' | 'blocked' | 'heard-again' | 'inspect' | 'shot' | 'impact' | 'explosion'
  checkpointEnteredAt: number
  checkpointCell: Vec
  focusPatrolId: string | null
  focusLiveFireStationId: string | null
  expectedAudibleKinds: AcousticEventKind[]
  expectedSilentKinds: AcousticEventKind[]
  player: Vec
  patrols: Array<{
    id: string
    label: string
    col: number
    row: number
    moving: boolean
    routeIndex: number
    cellsTraversed: number
    pauseRemaining: number
    distanceCells: number
    visible: boolean
  }>
  liveFireStations: Array<{
    id: string
    label: string
    shooterId: string
    shooter: Vec
    targetKind: 'steel' | 'fragile-tank'
    target: Vec
    active: boolean
    projectileInFlight: boolean
    shooterPresent: boolean
    targetPresent: boolean
    shotsFired: number
    targetRespawns: number
    eventCounts: Record<AcousticEventKind, number>
  }>
  observed: {
    focusType: 'patrol' | 'live-fire'
    focusActive: boolean
    patrolMoving: boolean
    patrolCellsTraversed: number
    cuePresent: boolean
    cueObservedSinceEntry: boolean
    cueKind: AcousticEventKind | null
    cueKindsPresent: AcousticEventKind[]
    cueKindsObservedSinceEntry: AcousticEventKind[]
    cueGain: number | null
    cueDistanceBand: AcousticDistanceBand | null
    cueOccluded: boolean | null
    visualPresent: boolean
    visualStrength: number | null
    sourcePrecision: 'exact' | 'directional' | null
    mechanicEventCounts: Record<AcousticEventKind, number> | null
  }
  wallProof: {
    patrolId: string
    outsideHeard: boolean
    insideSilent: boolean
    exitHeard: boolean
  }
}

export interface PontoonBridgeSnapshot {
  active: boolean
  cells: Vec[]
  dir: Direction
  ownerTankId?: string
  owner?: CombatSide
  team?: Team
}

export interface HedgehogSnapshot {
  active: boolean
  spent: boolean
  col: number | null
  row: number | null
  hitsTaken: number
  hitsRequired: number
  hitsRemaining: number
  trappedTankId: string | null
  ownerTankId?: string
  owner?: CombatSide
  team?: Team
}

export interface EmpEmitterSnapshot {
  active: boolean
  col: number | null
  row: number | null
  radius: number
  nextPulseIn: number
  disrupting: boolean
  disruptingRemaining: number
  disruptionProgress: number
  visionFade: number
  ownerTankId?: string
  owner?: CombatSide
  team?: Team
}

export interface MajorModsSnapshot {
  selected: MajorModKind
  overdrive: {
    active: boolean
    remaining: number
    cooldown: number
    duration: number
    rechargeDuration: number
    ready: boolean
  }
  pontoon: PontoonBridgeSnapshot
  hedgehog: HedgehogSnapshot
  emp: EmpEmitterSnapshot
  tracks: TreadTrackSnapshot[]
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
  cue?: AudibleAcousticCue
}

export interface SavedTank {
  id: string
  faction: TankFaction
  classId?: TankClassId
  majorMod?: MajorModKind
  callSign?: TutorialSpeaker
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
  modActiveRemaining?: number
  bulwarkRemaining?: number
  bulwarkCapacity?: number
  bulwarkCooldown?: number
  traverseRemaining?: number
  traverseCooldown?: number
  scriptedBehavior?: LevelFriendlyLoadout['behavior']
  scriptedAnchorCol?: number
  scriptedStrafeDirection?: -1 | 1
  shells?: number
  shellCapacity?: number
  shellRechargeProgress?: number
  scriptedEquipmentUsed?: boolean
  scriptedNativeKitUsed?: boolean
  scriptedModUsed?: boolean
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
  ownerTankId?: string
  team?: Team
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
    droppedAt?: number
    dropped?: boolean
    signalPulse?: number | null
    transfer?: {
      dropCell: Vec
      receiveCell: Vec
      gateCells: Vec[]
      gateClosed: boolean
      trapCell?: Vec
      trapTriggered?: boolean
      complete: boolean
      activatesAfterCaptures?: number
      handoffActorId?: string
      handoffWaitCell?: Vec
    }
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
  friendlyRemaining?: number
  nextId: number
  time: number
  tiles: Tile[][]
  player: SavedTank
  enemies: SavedTank[]
  bullets: Bullet[]
  powerUps: PowerUp[]
  wrecks?: FieldSalvageWreck[]
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
  majorMods?: {
    selected?: MajorModKind
    overdrive?: {
      remaining?: number
      cooldown?: number
    }
    pontoon?: PontoonBridgeSnapshot
    hedgehog?: HedgehogSnapshot
    hedgehogSpent?: boolean
    emp?: EmpEmitterSnapshot
    tracks?: TreadTrackSnapshot[]
  }
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
  | 'flag-transfer'
  | 'assault-core'
  | 'battle-front'
  | 'training-zone'
  | 'ammo-station'
  | 'signal-jammer'
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
  allClassEquipmentForTesting?: boolean
  botDifficulty?: Partial<BotDifficultyConfig>
  enemySpawns?: Vec[]
  enemyTotal?: number
  levelDefinitions?: LevelDefinition[]
  levelRows?: string[]
  hearingRangeTestForTesting?: boolean
  openAllCampaignLevelsForTesting?: boolean
  playerSpawn?: Vec
  retranslators?: Vec[]
  saveStore?: SaveStore
  seed?: number
}

export interface GameSnapshot {
  coordinateSystem: string
  mode: GameMode
  runKind: RunKind
  tutorial: TutorialSnapshot
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
  activeEnemyCount: number
  friendlyRemaining: number
  activeFriendlyCount: number
  activeFriendlyLimit: number
  friendlyRosterTotal: number
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
  signalWarfare: OfflineSignalWarfareSnapshot
  hearing: HearingSnapshot
  hearingTest: HearingRangeTestSnapshot | null
  lastKnown: OfflineVisionMemory[]
  portableRelay: PortableRelaySnapshot
  deployables: OfflineDeployablesSnapshot
  battlefieldProps: BattlefieldPropsSnapshot
  softCover: SoftCoverSnapshot
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
      friendlyRosterTotal: number
      activeFriendlyLimit: number
      continuousEnemySpawns: boolean
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
    showcase: TankClassShowcaseSnapshot
  }
  garage: {
    selectedMod: MajorModPresentation | null
    mods: MajorModPresentation[]
  } | null
  majorMods: MajorModsSnapshot
  settings: SettingsState
  objective: SavedObjectiveState & {
    selectableLevels: number[]
    completedLevels: number[]
    friendlyRemaining: number
    friendlyRosterTotal: number
    activeFriendlyLimit: number
    activeFriendlyCount: number
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
    pivot: {
      active: boolean
      direction: Direction | null
      progress: number
      holdSeconds: number
      queued: boolean
    }
    shield: number
    rapid: number
    repairCharges: number
    shells: number
    shellCapacity: number
    shellRechargeProgress: number
    shellRechargeDuration: number
    onAmmoStation: boolean
    salvage: FieldSalvageTankSnapshot
    portableRelay: PortableRelaySnapshot
    deployables: OfflineDeployablesSnapshot
    battleKit: BattleTankKitSnapshot
  }
  enemies: Array<{
    id: string
    role: EnemyRole | null
    classId: TankClassId | null
    majorMod: MajorModKind | null
    callSign: TutorialSpeaker | null
    side: CombatSide
    team: Team
    col: number
    row: number
    x: number
    y: number
    dir: Direction
    hp: number
    maxHp: number
    reloadTime: number
    shield: number
    modActiveRemaining: number
    bulwarkRemaining: number
    bulwarkCapacity: number
    bulwarkCooldown: number
    traverseRemaining: number
    traverseCooldown: number
    shells: number | null
    shellCapacity: number | null
    moving: boolean
  }>
  bullets: Array<{
    owner: TankFaction
    classId?: TankClassId
    team: Team
    x: number
    y: number
    dir: Direction
    speed: number
    damage: number
    ttl: number
    splashDamage?: number
    splashRadius?: number
    ricochets?: number
  }>
  powerUps: Array<{
    kind: PowerUpKind
    x: number
    y: number
  }>
  wrecks: FieldSalvageWreckSnapshot[]
  terrain: {
    empty: number
    brick: number
    steel: number
    water: number
    trees: number
    base: number
    radio: number
    depot: number
    road: number
    ammo: number
    swamp: number
    ricochet: number
    metal: number
    dust: number
    echo: number
    reeds: number
    gravel: number
    snow: number
  }
  terrainEvidence: TerrainEvidenceSnapshot[]
  readability: LevelReadabilitySummary
  readableText: {
    screen: GameMode
    title: string
    menuOptions: string[]
    helper: string[]
    navigation: {
      backAvailable: boolean
      backControl: string
      fullscreenControl: string
    }
    hud: {
      team: string
      tankClass: string
      link: string
      score: string
      health: string
      lives: string
      enemies: string
      allies: string
      level: string
      credits: string
      objective: string
        shells: string
        recharge: string
        relay: string
        gear: string
        classKit: string
        mod: string
        alerts: string
        salvage: string
    }
    touch: {
      visible: boolean
      labels: string[]
      handedness: TouchHandedness
      joystick: TouchJoystickSnapshot
      orientationGate: TouchOrientationGateSnapshot
      relayProgress: number | null
      modConfirmation: TouchModConfirmationSnapshot | null
      modSlider: TouchModSliderSnapshot
    }
    levelMarkers: {
      visible: string[]
      offscreenPrimary: string[]
      labels: string[]
    }
    results: string[]
    tutorial: {
      mission: string
      speaker: string
      dialogue: string
      goal: string
      action: string
      camera: string
    }
    encyclopedia: {
      activeTopic: string | null
      entries: string[]
    }
  }
}

export interface RenderState {
  mode: GameMode
  runKind: RunKind
  tutorial: TutorialSnapshot
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
  friendlyRemaining: number
  activeFriendlyCount: number
  activeFriendlyLimit: number
  friendlyRosterTotal: number
  fog: OfflineFogSnapshot
  vision: OfflineVisionSnapshot
  retranslators: OfflineRetranslator[]
  signalWarfare: OfflineSignalWarfareSnapshot
  hearing: HearingSnapshot
  hearingTest: HearingRangeTestSnapshot | null
  signalContacts: OfflineVisionMemory[]
  portableRelay: PortableRelaySnapshot
  deployables: OfflineDeployablesSnapshot
  classEquipmentLabel: string | null
  battlefieldProps: BattlefieldPropsSnapshot
  softCover: SoftCoverSnapshot
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
    showcase: TankClassShowcaseSnapshot
  }
  garage: {
    selectedMod: MajorModPresentation | null
    mods: MajorModPresentation[]
  } | null
  majorMods: MajorModsSnapshot
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
  wrecks: FieldSalvageWreckSnapshot[]
  terrainEvidence: TerrainEvidenceSnapshot[]
}

export interface TankClassPresentation {
  id: TankClassId
  label: string
  shortLabel: string
  role: string
  description: string
  strategy: string
  strength: string
  caution: string
  selected: boolean
  active: boolean
  stats: string[]
  equipment: string[]
  deployables: OfflineDeployableKind[]
  portableRelayLimit: number
  performance: {
    speed: string
    reload: string
    damage: string
    defense: string
  }
  demonstration: {
    moveDuration: number
    reloadTime: number
    directDamage: number
    maxHp: number
    referenceEnemyHp: number
    referenceEnemyDamage: number
    referenceMoveDuration: number
    brickHp: number
    shieldPoints: number
    splashDamage: number
    splashRadius: number
    mineDamage: number
    mineSlowSeconds: number
    trapSeconds: number
  }
  projectile: {
    kind: `${TankClassId}-shell`
    label: string
    effect: string
  }
  nativeKit: Array<{
    kind: NativeClassKitActionKind | `${TankClassId}-shell`
    label: string
    key: string
    effect: string
  }>
}

export type TankClassShowcaseScene = 'shooting' | 'breach' | 'duel' | 'race' | 'class-kit'

export interface TankClassShowcaseSnapshot {
  displayed: TankClassId
  equipped: TankClassId
  scene: TankClassShowcaseScene
  sceneLabel: string
  sceneIndex: number
  sceneProgress: number
  elapsed: number
  sceneDuration: number
  loopDuration: number
  actionWindow: number
  resultHold: number
  paused: boolean
}
