import type { TileKind } from './types.ts'

export interface TerrainDefinition {
  id: TileKind
  label: string
  char: string
  passable: boolean
  blocksProjectiles: boolean
  destructible: boolean
  movement: {
    speedMultiplier: number
  }
  tracks: {
    persistenceMultiplier: number
    visibilityMultiplier: number
    suppress: boolean
  }
  noise: {
    multiplier: number
    marker: boolean
    label: string
  }
  visibility: {
    stationaryMultiplier: number
  }
  control: {
    slideOnStop: boolean
  }
  projectile: {
    ricochet: boolean
  }
  evidence: {
    dustTrail: boolean
    rustle: boolean
    echoDistortion: boolean
  }
  render: {
    hint: string
  }
}

const BASE_TERRAIN: TerrainDefinition = {
  id: 'empty',
  label: 'Open Ground',
  char: '.',
  passable: true,
  blocksProjectiles: false,
  destructible: false,
  movement: { speedMultiplier: 1 },
  tracks: { persistenceMultiplier: 1, visibilityMultiplier: 1, suppress: false },
  noise: { multiplier: 1, marker: false, label: 'GROUND' },
  visibility: { stationaryMultiplier: 1 },
  control: { slideOnStop: false },
  projectile: { ricochet: false },
  evidence: { dustTrail: false, rustle: false, echoDistortion: false },
  render: { hint: 'ground' },
}

function terrain(overrides: Partial<TerrainDefinition> & Pick<TerrainDefinition, 'id' | 'label' | 'char'>): TerrainDefinition {
  return {
    ...BASE_TERRAIN,
    ...overrides,
    movement: { ...BASE_TERRAIN.movement, ...overrides.movement },
    tracks: { ...BASE_TERRAIN.tracks, ...overrides.tracks },
    noise: { ...BASE_TERRAIN.noise, ...overrides.noise },
    visibility: { ...BASE_TERRAIN.visibility, ...overrides.visibility },
    control: { ...BASE_TERRAIN.control, ...overrides.control },
    projectile: { ...BASE_TERRAIN.projectile, ...overrides.projectile },
    evidence: { ...BASE_TERRAIN.evidence, ...overrides.evidence },
    render: { ...BASE_TERRAIN.render, ...overrides.render },
  }
}

export const TERRAIN_DEFINITIONS: Record<TileKind, TerrainDefinition> = {
  empty: BASE_TERRAIN,
  brick: terrain({
    id: 'brick',
    label: 'Brick',
    char: 'B',
    passable: false,
    blocksProjectiles: true,
    destructible: true,
    render: { hint: 'breakable wall' },
  }),
  steel: terrain({
    id: 'steel',
    label: 'Steel',
    char: 'S',
    passable: false,
    blocksProjectiles: true,
    render: { hint: 'hard wall' },
  }),
  water: terrain({
    id: 'water',
    label: 'Water',
    char: 'W',
    passable: false,
    blocksProjectiles: false,
    tracks: { persistenceMultiplier: 0, visibilityMultiplier: 0, suppress: true },
    render: { hint: 'water obstacle' },
  }),
  trees: terrain({
    id: 'trees',
    label: 'Trees',
    char: 'T',
    visibility: { stationaryMultiplier: 0.78 },
    render: { hint: 'soft concealment' },
  }),
  base: terrain({
    id: 'base',
    label: 'Base',
    char: 'E',
    passable: false,
    blocksProjectiles: true,
    render: { hint: 'objective' },
  }),
  radio: terrain({
    id: 'radio',
    label: 'Radio Tower',
    char: 'R',
    passable: false,
    blocksProjectiles: true,
    destructible: true,
    render: { hint: 'relay prop' },
  }),
  depot: terrain({
    id: 'depot',
    label: 'Depot',
    char: 'D',
    passable: false,
    blocksProjectiles: true,
    destructible: true,
    render: { hint: 'supply prop' },
  }),
  road: terrain({
    id: 'road',
    label: 'Road',
    char: '=',
    tracks: { persistenceMultiplier: 0.75, visibilityMultiplier: 0.9, suppress: false },
    render: { hint: 'road' },
  }),
  ammo: terrain({
    id: 'ammo',
    label: 'Ammo Station',
    char: 'A',
    tracks: { persistenceMultiplier: 0.75, visibilityMultiplier: 0.9, suppress: false },
    render: { hint: 'ammo station' },
  }),
  swamp: terrain({
    id: 'swamp',
    label: 'Swamp',
    char: 's',
    movement: { speedMultiplier: 1.45 },
    tracks: { persistenceMultiplier: 1.8, visibilityMultiplier: 1.25, suppress: false },
    noise: { multiplier: 1.25, marker: true, label: 'MUD' },
    render: { hint: 'muddy trace amplifier' },
  }),
  ricochet: terrain({
    id: 'ricochet',
    label: 'Ricochet Block',
    char: 'x',
    passable: false,
    blocksProjectiles: true,
    projectile: { ricochet: true },
    render: { hint: 'angled shell deflector' },
  }),
  metal: terrain({
    id: 'metal',
    label: 'Metal Floor',
    char: 'm',
    tracks: { persistenceMultiplier: 0, visibilityMultiplier: 0, suppress: true },
    noise: { multiplier: 1.35, marker: true, label: 'METAL' },
    control: { slideOnStop: true },
    render: { hint: 'slippery hard floor' },
  }),
  dust: terrain({
    id: 'dust',
    label: 'Dust Road',
    char: 'd',
    tracks: { persistenceMultiplier: 0.45, visibilityMultiplier: 0.8, suppress: false },
    noise: { multiplier: 0.9, marker: false, label: 'DUST' },
    evidence: { dustTrail: true, rustle: false, echoDistortion: false },
    render: { hint: 'short-lived trail surface' },
  }),
  echo: terrain({
    id: 'echo',
    label: 'Echo Corridor',
    char: 'h',
    noise: { multiplier: 1.1, marker: true, label: 'ECHO' },
    evidence: { dustTrail: false, rustle: false, echoDistortion: true },
    render: { hint: 'sound distortion corridor' },
  }),
  reeds: terrain({
    id: 'reeds',
    label: 'Reeds',
    char: 'r',
    tracks: { persistenceMultiplier: 1.15, visibilityMultiplier: 1.05, suppress: false },
    noise: { multiplier: 1.15, marker: true, label: 'RUSTLE' },
    visibility: { stationaryMultiplier: 0.62 },
    evidence: { dustTrail: false, rustle: true, echoDistortion: false },
    render: { hint: 'movement-punishing concealment' },
  }),
  gravel: terrain({
    id: 'gravel',
    label: 'Gravel',
    char: 'g',
    noise: { multiplier: 1.65, marker: true, label: 'GRAVEL' },
    tracks: { persistenceMultiplier: 0.8, visibilityMultiplier: 0.8, suppress: false },
    render: { hint: 'sound-heavy ground' },
  }),
  snow: terrain({
    id: 'snow',
    label: 'Snow',
    char: 'n',
    movement: { speedMultiplier: 1.08 },
    tracks: { persistenceMultiplier: 2.25, visibilityMultiplier: 1.35, suppress: false },
    noise: { multiplier: 0.85, marker: false, label: 'SNOW' },
    render: { hint: 'long-memory surface' },
  }),
}

export const TERRAIN_TYPE_IDS = Object.keys(TERRAIN_DEFINITIONS) as TileKind[]
export const SELECTED_TERRAIN_EVIDENCE_IDS: TileKind[] = [
  'swamp',
  'ricochet',
  'metal',
  'dust',
  'echo',
  'reeds',
  'gravel',
  'snow',
]

export function terrainDefinition(kind: TileKind): TerrainDefinition {
  return TERRAIN_DEFINITIONS[kind] ?? TERRAIN_DEFINITIONS.empty
}

export function isPassableTerrain(kind: TileKind) {
  return terrainDefinition(kind).passable
}

export function isProjectileBlockingTerrain(kind: TileKind) {
  return terrainDefinition(kind).blocksProjectiles
}

export function terrainCharMap(): Record<string, TileKind> {
  return Object.fromEntries(TERRAIN_TYPE_IDS.map((id) => [TERRAIN_DEFINITIONS[id].char, id])) as Record<string, TileKind>
}
