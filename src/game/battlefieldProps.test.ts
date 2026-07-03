import { describe, expect, it } from 'vitest'
import {
  BATTLEFIELD_BIOME_IDS,
  BATTLEFIELD_PROP_CATEGORIES,
  BATTLEFIELD_PROP_EXAMPLE_IDS,
  BATTLEFIELD_PROP_MANIFEST,
  BATTLEFIELD_PROP_MECHANICAL_ROLES,
  getBattlefieldPropDefinition,
  getBattlefieldPropPlaceholderPlan,
  validateBattlefieldPropInstances,
  validateBattlefieldPropManifest,
} from './battlefieldProps.ts'
import { TanchikiGame } from './game.ts'
import {
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL,
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID,
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG,
  CAMPAIGN_MAP_COLS,
  CAMPAIGN_MAP_ROWS,
  createTiles,
} from './level.ts'
import { MemorySaveStore } from './save.ts'

describe('battlefield biome prop manifest', () => {
  it('is valid, uniquely keyed, and covers every requested initial prop example', () => {
    expect(validateBattlefieldPropManifest()).toEqual([])

    const spriteIds = BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => sprite.id)
    expect(new Set(spriteIds).size).toBe(spriteIds.length)
    expect([...BATTLEFIELD_PROP_EXAMPLE_IDS].sort()).toEqual([...spriteIds].sort())
  })

  it('covers all required biomes, prop categories, and mechanical roles used by the foundation', () => {
    const biomes = new Set(BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => sprite.biome))
    const categories = new Set(BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => sprite.category))
    const mechanicalRoles = new Set(BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => sprite.mechanicalRole))

    for (const biome of BATTLEFIELD_BIOME_IDS) {
      expect(biomes.has(biome), `missing biome ${biome}`).toBe(true)
    }
    for (const category of BATTLEFIELD_PROP_CATEGORIES) {
      expect(categories.has(category), `missing category ${category}`).toBe(true)
    }
    for (const role of BATTLEFIELD_PROP_MECHANICAL_ROLES.filter((role) => role !== 'none')) {
      expect(mechanicalRoles.has(role), `missing mechanical role ${role}`).toBe(true)
    }
  })

  it('exposes a procedural placeholder plan for missing or unloaded prop art', () => {
    expect(getBattlefieldPropPlaceholderPlan('tree_small').family).toBe('tree')
    expect(getBattlefieldPropPlaceholderPlan('relay_tower').family).toBe('infrastructure')
    expect(getBattlefieldPropPlaceholderPlan('missing_sprite', null)).toMatchObject({
      family: 'missing',
      fill: '#9b2f7f',
    })
  })
})

describe('battlefield biome prop showcase level', () => {
  it('keeps the dev showcase rectangular and references only manifest sprite ids', () => {
    const level = BATTLEFIELD_BIOME_PROPS_TEST_LEVEL
    const rows = level.rows

    expect(BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG).toBe('battlefield_biomes_props')
    expect(level.id).toBe(BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID)
    expect(rows).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(rows.every((row) => row.length === CAMPAIGN_MAP_COLS)).toBe(true)
    expect(createTiles(rows)).toHaveLength(CAMPAIGN_MAP_ROWS)
    expect(validateBattlefieldPropInstances(level.props, CAMPAIGN_MAP_COLS, CAMPAIGN_MAP_ROWS)).toEqual([])

    const referenced = new Set(level.props?.map((prop) => prop.spriteId))
    for (const spriteId of referenced) {
      expect(getBattlefieldPropDefinition(spriteId)).toBeDefined()
    }
  })

  it('shows every initial prop example in the dev showcase snapshot for visual QA', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [BATTLEFIELD_BIOME_PROPS_TEST_LEVEL],
      saveStore: new MemorySaveStore(),
    })

    game.startGame(BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID)
    const snapshot = game.getSnapshot()
    const visibleSpriteIds = new Set(snapshot.battlefieldProps.visible.map((prop) => prop.spriteId))

    expect(snapshot.level.name).toBe('Battlefield Biome Props Test')
    expect(snapshot.battlefieldProps.manifestVersion).toBe(BATTLEFIELD_PROP_MANIFEST.version)
    expect(snapshot.battlefieldProps.total).toBe(BATTLEFIELD_PROP_EXAMPLE_IDS.length)
    expect(snapshot.battlefieldProps.visible).toHaveLength(BATTLEFIELD_PROP_EXAMPLE_IDS.length)
    for (const spriteId of BATTLEFIELD_PROP_EXAMPLE_IDS) {
      expect(visibleSpriteIds.has(spriteId), `showcase missing ${spriteId}`).toBe(true)
    }
    for (const category of BATTLEFIELD_PROP_CATEGORIES) {
      expect(snapshot.battlefieldProps.categories[category], `showcase missing category ${category}`).toBeGreaterThan(0)
    }
  })
})
