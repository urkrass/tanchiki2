import battlefieldPropAtlasSvg from '../../public/assets/sprites/battlefield-props.atlas.svg?raw'
import { describe, expect, it } from 'vitest'
import { canDrawBattlefieldPropAtlasSprite, drawBattlefieldPropAtlasSprite } from './battlefieldPropAtlas.ts'
import {
  BATTLEFIELD_BIOME_IDS,
  BATTLEFIELD_PROP_CATEGORIES,
  BATTLEFIELD_PROP_EXAMPLE_IDS,
  BATTLEFIELD_PROP_MANIFEST,
  BATTLEFIELD_PROP_MECHANICAL_ROLES,
  getBattlefieldPropDefinition,
  getBattlefieldPropPlaceholderPlan,
  getBattlefieldPropRenderBounds,
  getBattlefieldPropVariantSource,
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

function extractAtlasGroup(spriteId: string) {
  const match = battlefieldPropAtlasSvg.match(new RegExp(`<g id="${spriteId}"[^>]*>[\\s\\S]*?<\\/g>`))
  expect(match, `missing atlas group for ${spriteId}`).toBeTruthy()
  return match?.[0] ?? ''
}

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

  it('points every prop at the committed battlefield prop atlas asset', () => {
    const atlas = BATTLEFIELD_PROP_MANIFEST.atlases.find((entry) => entry.name === 'battlefield-props-placeholder')

    expect(atlas).toBeDefined()
    expect(atlas?.path).toBe('assets/sprites/battlefield-props.atlas.svg?v=17')
    expect(atlas?.cellWidth).toBe(32)
    expect(atlas?.cellHeight).toBe(32)
    expect(atlas?.columns).toBe(8)
    expect(atlas?.rows).toBe(8)
    expect(battlefieldPropAtlasSvg).toContain('<svg')
    expect(battlefieldPropAtlasSvg).toContain('width="256"')
    expect(battlefieldPropAtlasSvg).toContain('height="256"')
    expect(battlefieldPropAtlasSvg).toContain('viewBox="0 0 256 256"')

    for (const sprite of BATTLEFIELD_PROP_MANIFEST.sprites) {
      expect(battlefieldPropAtlasSvg).toContain(`id="${sprite.id}"`)
      expect(battlefieldPropAtlasSvg).toContain(`id="${sprite.id}" transform="translate(${sprite.source.x} ${sprite.source.y})"`)
      expect(sprite.atlas).toBe(atlas?.name)
      expect(canDrawBattlefieldPropAtlasSprite(sprite), `${sprite.id} should be atlas-addressable`).toBe(true)
    }
  })

  it('keeps atlas source rectangles positive, bounded, and non-overlapping', () => {
    const occupied = new Set<string>()

    expect(validateBattlefieldPropManifest()).toEqual([])

    for (const sprite of BATTLEFIELD_PROP_MANIFEST.sprites) {
      expect(sprite.source.x).toBeGreaterThanOrEqual(0)
      expect(sprite.source.y).toBeGreaterThanOrEqual(0)
      expect(sprite.source.w).toBeGreaterThan(0)
      expect(sprite.source.h).toBeGreaterThan(0)

      const key = `${sprite.atlas}:${sprite.source.x},${sprite.source.y},${sprite.source.w},${sprite.source.h}`
      expect(occupied.has(key), `duplicate atlas slot for ${sprite.id}`).toBe(false)
      occupied.add(key)
    }
  })

  it('separates stable atlas source slots from larger visual render bounds', () => {
    const denseSourcePropIds = new Set(['tree_small', 'tree_large', 'pine', 'palm'])
    const scaledPropIds = new Set([
      'tree_small',
      'tree_large',
      'pine',
      'palm',
      'fallen_log_horizontal',
      'fallen_log_vertical',
      'rock_large',
      'reeds_cluster',
      'bush',
      'dry_bush',
      'snow_bush',
      'tank_wreck',
      'rubble_pile',
      'roadblock',
      'relay_tower',
      'antenna_mast',
      'generator',
      'emp_emitter',
      'signal_jammer',
    ])
    const tileSizedPropIds = new Set([
      'stump',
      'rock_small',
      'crate_wood',
      'crate_metal',
      'fuel_barrel',
      'sandbags',
      'barbed_wire',
      'broken_turret',
      'crater_small',
      'crater_large',
      'czech_hedgehog',
      'portable_relay',
      'broken_relay',
      'field_lamp',
      'warning_sign',
    ])

    for (const sprite of BATTLEFIELD_PROP_MANIFEST.sprites) {
      if (denseSourcePropIds.has(sprite.id)) {
        expect(Math.max(sprite.source.w, sprite.source.h), `${sprite.id} should use a high-density atlas source`).toBeGreaterThan(32)
      } else {
        expect(sprite.source.w).toBe(32)
        expect(sprite.source.h).toBe(32)
      }

      const bounds = getBattlefieldPropRenderBounds(sprite)
      expect(Number.isInteger(bounds.x)).toBe(true)
      expect(Number.isInteger(bounds.y)).toBe(true)
      expect(bounds.w).toBe(sprite.dimensions.w)
      expect(bounds.h).toBe(sprite.dimensions.h)

      if (scaledPropIds.has(sprite.id)) {
        expect(Math.max(sprite.dimensions.w, sprite.dimensions.h), `${sprite.id} should render larger than its source slot`).toBeGreaterThan(32)
        expect(sprite.renderOffset, `${sprite.id} should declare an explicit overhang offset`).toBeDefined()
      }
      if (tileSizedPropIds.has(sprite.id)) {
        expect(sprite.dimensions, `${sprite.id} should remain tile-sized`).toEqual({ w: 32, h: 32 })
        expect(sprite.renderOffset, `${sprite.id} should not overhang its occupied tile`).toBeUndefined()
      }
    }
  })

  it('keeps tree-class blockers visually larger than ordinary tile props', () => {
    expect(getBattlefieldPropDefinition('tree_small')).toMatchObject({
      source: { x: 0, y: 160, w: 48, h: 72 },
      dimensions: { w: 54, h: 70 },
    })
    expect(getBattlefieldPropDefinition('tree_large')).toMatchObject({
      source: { x: 48, y: 160, w: 72, h: 88 },
      dimensions: { w: 72, h: 86 },
    })
    expect(getBattlefieldPropDefinition('pine')).toMatchObject({
      source: { x: 120, y: 160, w: 56, h: 88 },
      dimensions: { w: 58, h: 82 },
    })
    expect(getBattlefieldPropDefinition('palm')).toMatchObject({
      source: { x: 176, y: 160, w: 80, h: 96 },
      dimensions: { w: 76, h: 92 },
    })
  })

  it('keeps dense tree highlights and pine snow as organic patches instead of bars', () => {
    const treeSmall = extractAtlasGroup('tree_small')
    const treeLarge = extractAtlasGroup('tree_large')
    const pine = extractAtlasGroup('pine')

    expect(treeSmall).not.toMatch(/<rect class="leaf3"/)
    expect(treeLarge).not.toMatch(/<rect class="leaf3"/)
    expect(pine).not.toMatch(/<rect class="snow[0-2]"/)
    expect(treeSmall).toMatch(/<polygon class="leaf3"/)
    expect(treeLarge).toMatch(/<polygon class="leaf3"/)
    expect(pine).toMatch(/<polygon class="snow[0-2]"/)
  })

  it('keeps rock sprites faceted instead of plain mound shapes', () => {
    const rockSmall = extractAtlasGroup('rock_small')
    const rockLarge = extractAtlasGroup('rock_large')

    expect(rockSmall.match(/<polygon/g)?.length ?? 0).toBeGreaterThanOrEqual(8)
    expect(rockLarge.match(/<polygon/g)?.length ?? 0).toBeGreaterThanOrEqual(10)
    expect(rockSmall).not.toContain('class="lineDark"')
    expect(rockLarge).not.toContain('class="lineDark"')
  })

  it('keeps rock visual variants available without adding new prop ids', () => {
    const expectedVariants = ['cracked', 'moss', 'snow', 'angled']
    const rockSmall = getBattlefieldPropDefinition('rock_small')
    const rockLarge = getBattlefieldPropDefinition('rock_large')

    expect(new Set(BATTLEFIELD_PROP_MANIFEST.sprites.map((sprite) => sprite.id))).toEqual(new Set(BATTLEFIELD_PROP_EXAMPLE_IDS))
    expect(rockSmall?.variants?.map((variant) => variant.id)).toEqual(expectedVariants)
    expect(rockLarge?.variants?.map((variant) => variant.id)).toEqual(expectedVariants)
    for (const variant of expectedVariants) {
      expect(getBattlefieldPropVariantSource(rockSmall, variant), `missing small rock ${variant} variant source`).toBeTruthy()
      expect(getBattlefieldPropVariantSource(rockLarge, variant), `missing large rock ${variant} variant source`).toBeTruthy()
      expect(battlefieldPropAtlasSvg).toContain(`id="rock_small_${variant}"`)
      expect(battlefieldPropAtlasSvg).toContain(`id="rock_large_${variant}"`)
    }
  })

  it('keeps cracked stone treatment specific to cracked rock variants', () => {
    const crackedVariantGroupIds = ['rock_small_cracked', 'rock_large_cracked']
    const intactVariantGroupIds = [
      'rock_small_moss',
      'rock_small_snow',
      'rock_small_angled',
      'rock_large_moss',
      'rock_large_snow',
      'rock_large_angled',
    ]

    for (const groupId of crackedVariantGroupIds) {
      expect(extractAtlasGroup(groupId), `${groupId} should visibly prove the cracked variant`).toContain('class="lineDark"')
    }
    for (const groupId of intactVariantGroupIds) {
      expect(extractAtlasGroup(groupId), `${groupId} should stay intact, not broken`).not.toContain('class="lineDark"')
    }
  })

  it('rejects invalid atlas source data', () => {
    const zeroWidth = cloneManifest()
    zeroWidth.sprites[0].source.w = 0
    expect(validateBattlefieldPropManifest(zeroWidth)).toContain(`Sprite ${zeroWidth.sprites[0].id} must have positive source and display dimensions.`)

    const overlapping = cloneManifest()
    overlapping.sprites[1].source = { ...overlapping.sprites[0].source }
    expect(validateBattlefieldPropManifest(overlapping).some((error) => error.includes('overlap in atlas'))).toBe(true)

    const fractionalOffset = cloneManifest()
    fractionalOffset.sprites[0].renderOffset = { x: 0.5, y: -6 }
    expect(validateBattlefieldPropManifest(fractionalOffset)).toContain(`Sprite ${fractionalOffset.sprites[0].id} renderOffset must use integer x and y values.`)

    const invalidVariant = cloneManifest()
    invalidVariant.sprites[7].variants = [{ id: 'bad', source: { x: 300, y: 0, w: 32, h: 32 } }]
    expect(validateBattlefieldPropManifest(invalidVariant)).toContain(`Sprite ${invalidVariant.sprites[7].id} variant bad source rectangle exceeds atlas ${invalidVariant.sprites[7].atlas} bounds.`)
  })

  it('keeps procedural fallback available when atlas data cannot resolve', () => {
    const definition = getBattlefieldPropDefinition('tree_small')
    const fakeContext = {} as CanvasRenderingContext2D

    expect(definition).toBeDefined()
    expect(drawBattlefieldPropAtlasSprite(fakeContext, null, 0, 0)).toBe(false)
    expect(drawBattlefieldPropAtlasSprite(fakeContext, definition, 0, 0)).toBe(false)
    expect(drawBattlefieldPropAtlasSprite(fakeContext, definition ? { ...definition, atlas: 'missing-atlas' } : null, 0, 0)).toBe(false)
    expect(
      drawBattlefieldPropAtlasSprite(fakeContext, definition ? { ...definition, source: { ...definition.source, w: 0 } } : null, 0, 0),
    ).toBe(false)
    expect(getBattlefieldPropPlaceholderPlan('tree_small', definition)).toMatchObject({ family: 'tree' })
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

    const verticalLog = level.props?.find((prop) => prop.spriteId === 'fallen_log_vertical')
    expect(verticalLog, 'showcase should include an unrotated vertical log proof sprite').toBeDefined()
    expect(verticalLog?.rotation ?? 0).toBe(0)

    const rockVariants = new Set(level.props?.filter((prop) => prop.spriteId === 'rock_small' || prop.spriteId === 'rock_large').map((prop) => prop.variant).filter(Boolean))
    expect(rockVariants).toEqual(new Set(['cracked', 'moss', 'snow', 'angled']))
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
    const showcasePropCount = BATTLEFIELD_BIOME_PROPS_TEST_LEVEL.props?.length ?? 0

    expect(snapshot.level.name).toBe('Battlefield Biome Props Test')
    expect(snapshot.battlefieldProps.manifestVersion).toBe(BATTLEFIELD_PROP_MANIFEST.version)
    expect(snapshot.battlefieldProps.total).toBe(showcasePropCount)
    expect(snapshot.battlefieldProps.visible).toHaveLength(showcasePropCount)
    for (const spriteId of BATTLEFIELD_PROP_EXAMPLE_IDS) {
      expect(visibleSpriteIds.has(spriteId), `showcase missing ${spriteId}`).toBe(true)
    }
    expect(snapshot.battlefieldProps.visible.filter((prop) => prop.variant).map((prop) => `${prop.spriteId}:${prop.variant}`).sort()).toEqual([
      'rock_large:angled',
      'rock_large:cracked',
      'rock_large:moss',
      'rock_large:snow',
      'rock_small:angled',
      'rock_small:cracked',
      'rock_small:moss',
      'rock_small:snow',
    ])
    for (const category of BATTLEFIELD_PROP_CATEGORIES) {
      expect(snapshot.battlefieldProps.categories[category], `showcase missing category ${category}`).toBeGreaterThan(0)
    }
  })
})

function cloneManifest() {
  return JSON.parse(JSON.stringify(BATTLEFIELD_PROP_MANIFEST)) as typeof BATTLEFIELD_PROP_MANIFEST
}
