import type { CombatSide, Direction, EnemyRole, ObjectiveMode, Team, TileKind, Vec } from '../types.ts'

export type BotRoleKind = 'basic' | 'scout' | 'breaker'
export type ContactBeliefKind = 'enemy' | 'noise' | 'decoy' | 'unknown' | 'objective' | 'retranslator'
export type ContactBeliefSource = 'vision' | 'sound' | 'radar' | 'teammate' | 'retranslator' | 'scripted'
export type BotIntention =
  | 'attack'
  | 'investigate'
  | 'pressureObjective'
  | 'defendObjective'
  | 'flank'
  | 'retreat'
  | 'breakWall'
  | 'ambush'
  | 'patrol'
export type BotBehaviorState =
  | 'idle'
  | 'patrol'
  | 'moveToObjective'
  | 'attack'
  | 'investigate'
  | 'flank'
  | 'retreat'
  | 'guard'
  | 'breakWall'
  | 'ambush'
  | 'huntSignal'
  | 'reloadOrResupply'

export interface ContactBelief {
  id: string
  kind: ContactBeliefKind
  position: Vec
  lastSeenAt: number
  confidence: number
  source: ContactBeliefSource
  side?: CombatSide
  team?: Team
  value?: number
  visible?: boolean
}

export interface BotRoleProfile {
  role: BotRoleKind
  label: 'Basic Tank' | 'Scout Tank' | 'Breaker Tank'
  attackWeight: number
  investigateWeight: number
  objectiveWeight: number
  breakWallWeight: number
  retreatWeight: number
  decoyResistance: number
  unknownTolerance: number
}

export interface BotDifficultyConfig {
  reactionDelayMs: number
  aimError: number
  confidenceThreshold: number
  decoySusceptibility: number
  aggression: number
  ammoConservation: number
  retreatHealthThreshold: number
  investigatePersistence: number
}

export interface BotActor {
  id: string
  role: EnemyRole | null
  side: CombatSide
  team: Team
  col: number
  row: number
  dir: Direction
  hp: number
  maxHp: number
  reload: number
}

export interface BotObjectiveInfo {
  mode: ObjectiveMode
  pressureTarget: Vec | null
  defendTarget: Vec | null
}

export interface BotUtilityInput {
  actor: BotActor
  role: BotRoleProfile
  beliefs: ContactBelief[]
  objective: BotObjectiveInfo
  difficulty: BotDifficultyConfig
  breakerWallUseful: boolean
}

export interface BotIntentionScore {
  intention: BotIntention
  score: number
  target: Vec | null
  beliefId?: string
  beliefKind?: ContactBeliefKind
  confidence?: number
}

export interface BotDecision {
  state: BotBehaviorState
  intention: BotIntention
  action: 'fire' | 'move' | 'breakWall' | 'idle'
  target: Vec | null
  nextStep: Vec | null
  breakWall: Vec | null
  scores: BotIntentionScore[]
}

export interface BotTileInfo {
  kind: TileKind
  hp: number
}

export interface BotPathGrid {
  cols: number
  rows: number
  tileAt: (cell: Vec) => BotTileInfo
  isOccupied?: (cell: Vec) => boolean
  unknownCells?: Set<string>
  dangerCells?: Set<string>
}

export interface BotPathOptions {
  allowDestructibleWalls?: boolean
  baseCost?: number
  destructibleWallCost?: number
  dangerPenalty?: number
  unknownPenalty?: number
  coverPreference?: number
  objectiveProximityWeight?: number
  tieTarget?: Vec
}

export interface BotPathResult {
  found: boolean
  steps: Vec[]
  cost: number
  breakWalls: Vec[]
}

export interface BotFireTarget {
  id: string
  position: Vec
  side?: CombatSide
  team?: Team
  confidence: number
  value: number
}

export interface BotFireControlInput {
  shooter: BotActor
  target: BotFireTarget
  difficulty: BotDifficultyConfig
  hasAmmo: boolean
  tileAt: (cell: Vec) => TileKind
  tankAt?: (cell: Vec) => { id: string; side: CombatSide; team: Team } | null
}

export interface BotFireDecision {
  shouldFire: boolean
  reason: 'clear' | 'no-ammo' | 'low-confidence' | 'not-aligned' | 'blocked' | 'friendly-fire' | 'conserve-ammo'
  direction: Direction | null
}

export const DEFAULT_BOT_DIFFICULTY: BotDifficultyConfig = {
  reactionDelayMs: 280,
  aimError: 0,
  confidenceThreshold: 0.62,
  decoySusceptibility: 0.55,
  aggression: 0.72,
  ammoConservation: 0.4,
  retreatHealthThreshold: 0.32,
  investigatePersistence: 3,
}

export const BOT_ROLE_PROFILES: Record<BotRoleKind, BotRoleProfile> = {
  basic: {
    role: 'basic',
    label: 'Basic Tank',
    attackWeight: 1,
    investigateWeight: 0.72,
    objectiveWeight: 0.86,
    breakWallWeight: 0.18,
    retreatWeight: 0.38,
    decoyResistance: 0.35,
    unknownTolerance: 0.48,
  },
  scout: {
    role: 'scout',
    label: 'Scout Tank',
    attackWeight: 0.88,
    investigateWeight: 1.05,
    objectiveWeight: 0.62,
    breakWallWeight: 0.1,
    retreatWeight: 0.72,
    decoyResistance: 0.78,
    unknownTolerance: 0.84,
  },
  breaker: {
    role: 'breaker',
    label: 'Breaker Tank',
    attackWeight: 0.72,
    investigateWeight: 0.45,
    objectiveWeight: 1,
    breakWallWeight: 1.15,
    retreatWeight: 0.3,
    decoyResistance: 0.52,
    unknownTolerance: 0.4,
  },
}

export function roleKindForEnemyRole(role: EnemyRole | null): BotRoleKind {
  if (role === 'hunter') return 'scout'
  if (role === 'wall_breaker') return 'breaker'
  return 'basic'
}

export function roleProfileForEnemyRole(role: EnemyRole | null): BotRoleProfile {
  return BOT_ROLE_PROFILES[roleKindForEnemyRole(role)]
}

export function normalizeBotDifficulty(value: Partial<BotDifficultyConfig> | undefined): BotDifficultyConfig {
  const source = value ?? {}
  return {
    reactionDelayMs: clampNumber(source.reactionDelayMs, DEFAULT_BOT_DIFFICULTY.reactionDelayMs, 0, 2_000),
    aimError: clampNumber(source.aimError, DEFAULT_BOT_DIFFICULTY.aimError, 0, 1),
    confidenceThreshold: clampNumber(source.confidenceThreshold, DEFAULT_BOT_DIFFICULTY.confidenceThreshold, 0, 1),
    decoySusceptibility: clampNumber(source.decoySusceptibility, DEFAULT_BOT_DIFFICULTY.decoySusceptibility, 0, 1),
    aggression: clampNumber(source.aggression, DEFAULT_BOT_DIFFICULTY.aggression, 0, 1),
    ammoConservation: clampNumber(source.ammoConservation, DEFAULT_BOT_DIFFICULTY.ammoConservation, 0, 1),
    retreatHealthThreshold: clampNumber(source.retreatHealthThreshold, DEFAULT_BOT_DIFFICULTY.retreatHealthThreshold, 0, 1),
    investigatePersistence: clampNumber(source.investigatePersistence, DEFAULT_BOT_DIFFICULTY.investigatePersistence, 0.2, 12),
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, number))
}
