import { getBattlefieldPropAffordance } from './battlefieldPropAffordances.ts'
import { validateBattlefieldPropInstances } from './battlefieldProps.ts'
import { createTiles } from './level.ts'
import { terrainDefinition } from './terrain.ts'
import type { LevelDefinition } from './types.ts'

export const VISUAL_DENSITY_SLICE_LEVEL_ID = 9005
export const VISUAL_DENSITY_SLICE_LEVEL_SLUG = 'visual_density_slice'

export const VISUAL_DENSITY_SLICE_LEVEL: LevelDefinition = {
  id: VISUAL_DENSITY_SLICE_LEVEL_ID,
  name: 'Relay Scar',
  briefing: 'Cross the scar, read the ruined signal site, and hold the live relay under strict fog.',
  objective: {
    mode: 'defense',
    label: 'Relay Scar',
    briefing: 'Use soft cover and hard terrain to hold the live central relay. Static signal wreckage is not functional.',
    winCondition: 'Clear the hostile patrol while keeping the eagle base intact.',
  },
  biome: 'ruined_battlefield',
  rows: [
    'SSSSSSSSSSSSSSSSSSSSS',
    'S....B.........B....S',
    'S....B....R....B....S',
    'S....B.........B....S',
    'S....BBBB...BBBB....S',
    'S...................S',
    'S..TTT.........TTT..S',
    'S..T.............T..S',
    'S..T......=......T..S',
    'S..T......=......T..S',
    'S..TTT....=....TTT..S',
    'S.........=.........S',
    'S....BBB..=..BBB....S',
    'S.........=.........S',
    'S.........=.........S',
    'S.........E.........S',
    'SSSSSSSSSSSSSSSSSSSSS',
  ],
  props: [
    { id: 'slice-static-relay', spriteId: 'relay_tower', x: 10, y: 2 },
    { id: 'slice-rock', spriteId: 'rock_large', x: 5, y: 4, variant: 'angled' },
    { id: 'slice-tree', spriteId: 'tree_large', x: 6, y: 4 },
    { id: 'slice-rubble', spriteId: 'rubble_pile', x: 13, y: 4 },
    { id: 'slice-roadblock', spriteId: 'roadblock', x: 14, y: 4 },
    { id: 'slice-west-cover', spriteId: 'dry_bush', x: 7, y: 13 },
    { id: 'slice-player-cover', spriteId: 'bush', x: 10, y: 14 },
    { id: 'slice-east-cover', spriteId: 'reeds_cluster', x: 13, y: 13 },
    { id: 'slice-broken-relay', spriteId: 'broken_relay', x: 7, y: 14 },
    { id: 'slice-inactive-barrel', spriteId: 'fuel_barrel', x: 13, y: 14 },
    { id: 'slice-crater', spriteId: 'crater_large', x: 12, y: 14 },
    { id: 'slice-warning', spriteId: 'warning_sign', x: 8, y: 14 },
  ],
  playerSpawn: { x: 10, y: 14 },
  enemySpawns: [
    { x: 4, y: 1 },
    { x: 10, y: 1 },
    { x: 16, y: 1 },
  ],
  retranslators: [{ x: 10, y: 8 }],
  enemyTotal: 5,
  activeEnemyLimit: 2,
  spawnInterval: 1.8,
  roleWeights: { base_attacker: 0.3, hunter: 0.5, wall_breaker: 0.2 },
  armoredEnemyRatio: 0.2,
  rewards: { credits: 0, xp: 0, score: 0 },
}

export function validateVisualDensitySlice(level: LevelDefinition = VISUAL_DENSITY_SLICE_LEVEL) {
  const errors = validateBattlefieldPropInstances(level.props, level.rows[0]?.length ?? 0, level.rows.length)
  const tiles = createTiles(level.rows)

  for (const prop of level.props ?? []) {
    const affordance = getBattlefieldPropAffordance(prop.spriteId)
    if (!affordance) {
      errors.push(`Slice prop ${prop.id} is missing an affordance contract.`)
      continue
    }
    if (affordance.cue === 'terrain_backed_blocker') {
      const terrain = terrainDefinition(tiles[prop.y]?.[prop.x]?.kind ?? 'empty')
      if (terrain.passable || !terrain.blocksProjectiles) {
        errors.push(`Slice prop ${prop.id} must anchor to impassable projectile-blocking terrain.`)
      }
    }
    if (affordance.signal !== 'none') {
      const duplicatesFunctionalRelay = (level.retranslators ?? []).some((relay) => relay.x === prop.x && relay.y === prop.y)
      if (duplicatesFunctionalRelay) {
        errors.push(`Static signal prop ${prop.id} must not overlap a functional retranslator.`)
      }
    }
  }
  return errors
}
