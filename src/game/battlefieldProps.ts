import manifestJson from './assets/battlefield-props.manifest.json'
import type {
  BattlefieldBiomeId,
  BattlefieldPropCategory,
  BattlefieldPropInstance,
  BattlefieldPropMechanicalRole,
  BattlefieldPropSnapshot,
  BattlefieldPropsSnapshot,
  Rect,
} from './types.ts'

export const BATTLEFIELD_BIOME_IDS = [
  'temperate',
  'swamp',
  'snow',
  'desert_dust',
  'industrial',
  'ruined_battlefield',
] as const satisfies readonly BattlefieldBiomeId[]

export const BATTLEFIELD_PROP_CATEGORIES = [
  'blocking_natural',
  'soft_cover_vegetation',
  'destructible_clutter',
  'battlefield_debris',
  'infrastructure_signal',
  'decoration',
] as const satisfies readonly BattlefieldPropCategory[]

export const BATTLEFIELD_PROP_MECHANICAL_ROLES = [
  'none',
  'blocking',
  'soft_cover',
  'destructible',
  'infrastructure',
  'decoration',
  'evidence_surface',
  'hazard',
] as const satisfies readonly BattlefieldPropMechanicalRole[]

export const BATTLEFIELD_PROP_EXAMPLE_IDS = [
  'tree_small',
  'tree_large',
  'pine',
  'palm',
  'stump',
  'fallen_log_horizontal',
  'fallen_log_vertical',
  'rock_small',
  'rock_large',
  'reeds_cluster',
  'bush',
  'dry_bush',
  'snow_bush',
  'crate_wood',
  'crate_metal',
  'fuel_barrel',
  'sandbags',
  'barbed_wire',
  'tank_wreck',
  'broken_turret',
  'crater_small',
  'crater_large',
  'rubble_pile',
  'roadblock',
  'czech_hedgehog',
  'relay_tower',
  'portable_relay',
  'broken_relay',
  'antenna_mast',
  'generator',
  'emp_emitter',
  'signal_jammer',
  'field_lamp',
  'warning_sign',
] as const

export type BattlefieldPropSpriteId = (typeof BATTLEFIELD_PROP_EXAMPLE_IDS)[number]

export interface BattlefieldPropAtlasDefinition {
  name: string
  path: string
  cellWidth: number
  cellHeight: number
  columns: number
  rows?: number
}

export interface BattlefieldPropSpriteDefinition {
  id: BattlefieldPropSpriteId
  atlas: string
  source: Rect
  dimensions: {
    w: number
    h: number
  }
  category: BattlefieldPropCategory
  biome: BattlefieldBiomeId
  mechanicalRole: BattlefieldPropMechanicalRole
  collisionHint?: string
  coverHint?: string
  tags?: string[]
}

export interface BattlefieldPropManifest {
  version: number
  atlases: BattlefieldPropAtlasDefinition[]
  sprites: BattlefieldPropSpriteDefinition[]
}

export type BattlefieldPropPlaceholderFamily =
  | 'tree'
  | 'palm'
  | 'log'
  | 'rock'
  | 'vegetation'
  | 'crate'
  | 'barrel'
  | 'fortification'
  | 'wire'
  | 'wreck'
  | 'crater'
  | 'infrastructure'
  | 'lamp'
  | 'sign'
  | 'missing'

export interface BattlefieldPropPlaceholderPlan {
  family: BattlefieldPropPlaceholderFamily
  fill: string
  accent: string
  shadow: string
  highlight: string
  outline: string
}

export const BATTLEFIELD_PROP_MANIFEST = manifestJson as BattlefieldPropManifest
export const BATTLEFIELD_PROP_MANIFEST_VERSION = BATTLEFIELD_PROP_MANIFEST.version

const BIOME_SET = new Set<string>(BATTLEFIELD_BIOME_IDS)
const CATEGORY_SET = new Set<string>(BATTLEFIELD_PROP_CATEGORIES)
const MECHANICAL_ROLE_SET = new Set<string>(BATTLEFIELD_PROP_MECHANICAL_ROLES)
const EXAMPLE_ID_SET = new Set<string>(BATTLEFIELD_PROP_EXAMPLE_IDS)
const PROP_LOOKUP = new Map(BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => [sprite.id, sprite]))

export function getBattlefieldPropDefinition(spriteId: string) {
  return PROP_LOOKUP.get(spriteId as BattlefieldPropSpriteId) ?? null
}

export function resolveBattlefieldPropInstance(instance: BattlefieldPropInstance): BattlefieldPropSnapshot | null {
  const definition = getBattlefieldPropDefinition(instance.spriteId)
  if (!definition) {
    return null
  }

  return {
    id: instance.id,
    spriteId: definition.id,
    x: instance.x,
    y: instance.y,
    rotation: instance.rotation ?? 0,
    variant: instance.variant ?? null,
    category: definition.category,
    biome: definition.biome,
    mechanicalRole: instance.mechanicalRole ?? definition.mechanicalRole,
    collisionHint: definition.collisionHint ?? null,
    coverHint: definition.coverHint ?? null,
    tags: [...(definition.tags ?? [])],
  }
}

export function createBattlefieldPropsSnapshot(
  biome: BattlefieldBiomeId | undefined,
  allInstances: BattlefieldPropInstance[] | undefined,
  visibleInstances: BattlefieldPropInstance[],
): BattlefieldPropsSnapshot {
  const categories = zeroCategoryCounts()
  const mechanicalRoles = zeroMechanicalRoleCounts()
  const visible = visibleInstances.flatMap((instance) => {
    const snapshot = resolveBattlefieldPropInstance(instance)
    if (!snapshot) {
      return []
    }
    categories[snapshot.category] += 1
    mechanicalRoles[snapshot.mechanicalRole] += 1
    return [snapshot]
  })

  return {
    manifestVersion: BATTLEFIELD_PROP_MANIFEST_VERSION,
    biome: biome ?? 'temperate',
    total: allInstances?.length ?? 0,
    visible,
    categories,
    mechanicalRoles,
  }
}

export function validateBattlefieldPropManifest(manifest: BattlefieldPropManifest = BATTLEFIELD_PROP_MANIFEST) {
  const errors: string[] = []
  const atlasNames = new Set<string>()
  const atlasByName = new Map<string, BattlefieldPropAtlasDefinition>()
  const sourceRectanglesByAtlas = new Map<string, Array<{ id: string; source: Rect }>>()
  const spriteIds = new Set<string>()

  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    errors.push('Manifest version must be a positive integer.')
  }

  for (const atlas of manifest.atlases) {
    if (atlasNames.has(atlas.name)) errors.push(`Duplicate atlas name: ${atlas.name}`)
    atlasNames.add(atlas.name)
    atlasByName.set(atlas.name, atlas)

    if (!atlas.name) errors.push('Atlas is missing a name.')
    if (!atlas.path) errors.push(`Atlas ${atlas.name || '<unknown>'} is missing a path.`)
    if (!Number.isInteger(atlas.cellWidth) || !Number.isInteger(atlas.cellHeight) || !Number.isInteger(atlas.columns)) {
      errors.push(`Atlas ${atlas.name} must use integer cell dimensions and columns.`)
    }
    if (atlas.cellWidth <= 0 || atlas.cellHeight <= 0 || atlas.columns <= 0) {
      errors.push(`Atlas ${atlas.name} must have positive cell dimensions and columns.`)
    }
    if (atlas.rows !== undefined && (!Number.isInteger(atlas.rows) || atlas.rows <= 0)) {
      errors.push(`Atlas ${atlas.name} must have a positive integer row count when rows are declared.`)
    }
  }

  for (const sprite of manifest.sprites) {
    if (spriteIds.has(sprite.id)) {
      errors.push(`Duplicate sprite id: ${sprite.id}`)
    }
    spriteIds.add(sprite.id)

    if (!EXAMPLE_ID_SET.has(sprite.id)) errors.push(`Unexpected sprite id outside initial taxonomy: ${sprite.id}`)
    if (!atlasNames.has(sprite.atlas)) errors.push(`Sprite ${sprite.id} references missing atlas: ${sprite.atlas}`)
    if (!CATEGORY_SET.has(sprite.category)) errors.push(`Sprite ${sprite.id} has invalid category: ${sprite.category}`)
    if (!BIOME_SET.has(sprite.biome)) errors.push(`Sprite ${sprite.id} has invalid biome: ${sprite.biome}`)
    if (!MECHANICAL_ROLE_SET.has(sprite.mechanicalRole)) {
      errors.push(`Sprite ${sprite.id} has invalid mechanical role: ${sprite.mechanicalRole}`)
    }
    if (sprite.source.w <= 0 || sprite.source.h <= 0 || sprite.dimensions.w <= 0 || sprite.dimensions.h <= 0) {
      errors.push(`Sprite ${sprite.id} must have positive source and display dimensions.`)
    }
    if (sprite.source.x < 0 || sprite.source.y < 0) {
      errors.push(`Sprite ${sprite.id} must not use a negative atlas source origin.`)
    }
    if (
      !Number.isInteger(sprite.source.x) ||
      !Number.isInteger(sprite.source.y) ||
      !Number.isInteger(sprite.source.w) ||
      !Number.isInteger(sprite.source.h) ||
      !Number.isInteger(sprite.dimensions.w) ||
      !Number.isInteger(sprite.dimensions.h)
    ) {
      errors.push(`Sprite ${sprite.id} must use integer source and display dimensions.`)
    }
    const atlas = atlasByName.get(sprite.atlas)
    if (atlas?.rows !== undefined && hasPositiveRect(sprite.source)) {
      const atlasWidth = atlas.columns * atlas.cellWidth
      const atlasHeight = atlas.rows * atlas.cellHeight
      if (sprite.source.x + sprite.source.w > atlasWidth || sprite.source.y + sprite.source.h > atlasHeight) {
        errors.push(`Sprite ${sprite.id} source rectangle exceeds atlas ${sprite.atlas} bounds.`)
      }
    }
    if (atlas && hasPositiveRect(sprite.source)) {
      const rectangles = sourceRectanglesByAtlas.get(sprite.atlas) ?? []
      rectangles.push({ id: sprite.id, source: sprite.source })
      sourceRectanglesByAtlas.set(sprite.atlas, rectangles)
    }
    if (sprite.category === 'decoration' && sprite.mechanicalRole !== 'decoration') {
      errors.push(`Decoration sprite ${sprite.id} must use mechanicalRole decoration.`)
    }
  }

  for (const [atlasName, rectangles] of sourceRectanglesByAtlas) {
    for (let leftIndex = 0; leftIndex < rectangles.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < rectangles.length; rightIndex += 1) {
        const left = rectangles[leftIndex]
        const right = rectangles[rightIndex]
        if (left && right && rectsOverlap(left.source, right.source)) {
          errors.push(`Sprites ${left.id} and ${right.id} overlap in atlas ${atlasName}.`)
        }
      }
    }
  }

  for (const id of BATTLEFIELD_PROP_EXAMPLE_IDS) {
    if (!spriteIds.has(id)) {
      errors.push(`Missing initial prop example: ${id}`)
    }
  }

  return errors
}

function hasPositiveRect(rect: Rect) {
  return rect.w > 0 && rect.h > 0
}

function rectsOverlap(left: Rect, right: Rect) {
  return left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y
}

export function validateBattlefieldPropInstances(
  instances: BattlefieldPropInstance[] | undefined,
  mapCols: number,
  mapRows: number,
) {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const instance of instances ?? []) {
    if (ids.has(instance.id)) {
      errors.push(`Duplicate prop instance id: ${instance.id}`)
    }
    ids.add(instance.id)

    if (!getBattlefieldPropDefinition(instance.spriteId)) {
      errors.push(`Prop instance ${instance.id} references missing sprite id: ${instance.spriteId}`)
    }
    if (instance.x < 0 || instance.x >= mapCols || instance.y < 0 || instance.y >= mapRows) {
      errors.push(`Prop instance ${instance.id} is outside map bounds at ${instance.x},${instance.y}`)
    }
    if (instance.mechanicalRole && !MECHANICAL_ROLE_SET.has(instance.mechanicalRole)) {
      errors.push(`Prop instance ${instance.id} has invalid mechanical role override: ${instance.mechanicalRole}`)
    }
  }

  return errors
}

export function getBattlefieldPropPlaceholderPlan(
  spriteId: string,
  definition: BattlefieldPropSpriteDefinition | null = getBattlefieldPropDefinition(spriteId),
): BattlefieldPropPlaceholderPlan {
  if (!definition) {
    return {
      family: 'missing',
      fill: '#9b2f7f',
      accent: '#ffd6f0',
      shadow: '#1c0d18',
      highlight: '#fff1a5',
      outline: '#050505',
    }
  }

  const family = placeholderFamily(spriteId)

  if (definition.biome === 'snow') {
    return { family, fill: '#d8edf0', accent: '#7fa7b5', shadow: '#233544', highlight: '#f8ffff', outline: '#111a20' }
  }

  if (definition.biome === 'swamp') {
    return { family, fill: '#263a20', accent: '#617446', shadow: '#0d1409', highlight: '#a3c47d', outline: '#050905' }
  }

  if (definition.biome === 'desert_dust') {
    return { family, fill: '#a97b45', accent: '#d2b16d', shadow: '#3d2a18', highlight: '#ead59a', outline: '#120d08' }
  }

  if (definition.biome === 'industrial') {
    return { family, fill: '#6f7875', accent: '#d4b243', shadow: '#171b1b', highlight: '#e9eeee', outline: '#070909' }
  }

  if (definition.biome === 'ruined_battlefield') {
    return { family, fill: '#4d3b2c', accent: '#8f6a43', shadow: '#16100c', highlight: '#c5b39a', outline: '#050403' }
  }

  return { family, fill: '#2f5c2f', accent: '#74a357', shadow: '#122014', highlight: '#b6d884', outline: '#050805' }
}

function placeholderFamily(spriteId: string): BattlefieldPropPlaceholderFamily {
  if (spriteId.includes('palm')) return 'palm'
  if (spriteId.includes('tree') || spriteId.includes('pine')) return 'tree'
  if (spriteId.includes('log') || spriteId === 'stump') return 'log'
  if (spriteId.includes('rock') || spriteId.includes('rubble')) return 'rock'
  if (spriteId.includes('bush') || spriteId.includes('reeds')) return 'vegetation'
  if (spriteId.includes('crate')) return 'crate'
  if (spriteId.includes('barrel')) return 'barrel'
  if (spriteId.includes('sandbag') || spriteId.includes('roadblock') || spriteId.includes('hedgehog')) return 'fortification'
  if (spriteId.includes('wire')) return 'wire'
  if (spriteId.includes('wreck') || spriteId.includes('turret')) return 'wreck'
  if (spriteId.includes('crater')) return 'crater'
  if (spriteId.includes('lamp')) return 'lamp'
  if (spriteId.includes('sign')) return 'sign'
  if (
    spriteId.includes('relay') ||
    spriteId.includes('antenna') ||
    spriteId.includes('generator') ||
    spriteId.includes('emitter') ||
    spriteId.includes('jammer')
  ) {
    return 'infrastructure'
  }
  return 'missing'
}

function zeroCategoryCounts() {
  return Object.fromEntries(BATTLEFIELD_PROP_CATEGORIES.map((category) => [category, 0])) as Record<BattlefieldPropCategory, number>
}

function zeroMechanicalRoleCounts() {
  return Object.fromEntries(BATTLEFIELD_PROP_MECHANICAL_ROLES.map((role) => [role, 0])) as Record<BattlefieldPropMechanicalRole, number>
}
