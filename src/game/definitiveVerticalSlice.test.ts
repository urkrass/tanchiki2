import { describe, expect, it } from 'vitest'
import { gridToTankPosition } from './constants.ts'
import { TanchikiGame } from './game.ts'
import {
  CAMPAIGN_LEVELS,
  SIGNAL_SCAR_LEVEL,
  SIGNAL_SCAR_LEVEL_ID,
  createTiles,
} from './level.ts'
import { validateBattlefieldPropInstances } from './battlefieldProps.ts'
import { MemorySaveStore } from './save.ts'
import type {
  OfflineRetranslator,
  Tank,
  Tile,
} from './types.ts'

interface SignalScarInternals {
  player: Tank
  tiles: Tile[][]
  retranslators: OfflineRetranslator[]
  enemies: Tank[]
  deployables: Array<{
    ownerTankId?: string
    kind: string
  }>
  majorMods: {
    emp: {
      col: number
      row: number
      nextPulseIn: number
      disruptingUntil: number
      ownerTankId: string
      owner: 'player' | 'enemy' | 'neutral'
      team: 'blue' | 'red'
    } | null
    hedgehog: {
      col: number
      row: number
      ownerTankId: string
      owner: 'player' | 'enemy' | 'neutral'
      team: 'blue' | 'red'
    } | null
  }
}

describe('Signal Scar definitive vertical slice', () => {
  it('is the final campaign mission and composes the intended tactical systems', () => {
    expect(CAMPAIGN_LEVELS.at(-1)).toBe(SIGNAL_SCAR_LEVEL)
    expect(SIGNAL_SCAR_LEVEL.id).toBe(SIGNAL_SCAR_LEVEL_ID)
    expect(SIGNAL_SCAR_LEVEL.rows).toHaveLength(17)
    expect(SIGNAL_SCAR_LEVEL.rows.every((row) => row.length === 21)).toBe(true)
    expect(SIGNAL_SCAR_LEVEL.rows.join('').match(/A/g)).toHaveLength(2)

    const tiles = createTiles(SIGNAL_SCAR_LEVEL.rows)
    const terrainKinds = new Set(tiles.flat().map((tile) => tile.kind))
    for (const kind of ['dust', 'echo', 'gravel', 'reeds', 'swamp']) {
      expect(terrainKinds.has(kind as Tile['kind']), kind).toBe(true)
    }

    expect(SIGNAL_SCAR_LEVEL.retranslators).toHaveLength(3)
    expect(SIGNAL_SCAR_LEVEL.signalJammers).toEqual([
      expect.objectContaining({
        id: 'north-jammer',
        cell: { x: 10, y: 5 },
        side: 'enemy',
      }),
    ])
    expect(tiles[5]?.[10]).toMatchObject({ kind: 'brick', hp: 2 })
    expect(SIGNAL_SCAR_LEVEL.props).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'signal-scar-jammer', spriteId: 'signal_jammer' }),
      expect.objectContaining({ spriteId: 'bush' }),
      expect.objectContaining({ spriteId: 'reeds_cluster' }),
    ]))
    expect(validateBattlefieldPropInstances(SIGNAL_SCAR_LEVEL.props, 21, 17)).toEqual([])
    expect(SIGNAL_SCAR_LEVEL.friendlyLoadouts?.map((actor) => [actor.classId, actor.behavior])).toEqual([
      ['scout', 'recon-screen'],
      ['engineer', 'signal-support'],
      ['battle', 'battle-battery'],
    ])
  })

  it('suppresses a captured relay until EMP opens a window or the jammer anchor is destroyed', () => {
    const game = startSignalScar(false)
    const internals = game as unknown as SignalScarInternals
    const centralRelay = internals.retranslators.find((relay) => relay.col === 10 && relay.row === 9)
    expect(centralRelay).toBeDefined()
    if (!centralRelay) return
    centralRelay.owner = 'player'
    centralRelay.captureSide = 'player'
    centralRelay.progress = 1

    let snapshot = game.getSnapshot()
    expect(snapshot.signalWarfare).toMatchObject({
      state: 'jammed',
      activeJammerCount: 1,
      suppressedRelayCount: 1,
    })
    expect(snapshot.fog.ownedRetranslatorCount).toBe(0)
    expect(snapshot.vision.circles.some((circle) => circle.kind === 'relay' && circle.id === centralRelay.id)).toBe(false)

    internals.majorMods.emp = {
      col: 6,
      row: 5,
      nextPulseIn: 15,
      disruptingUntil: 3,
      ownerTankId: 'signal-scar-engineer',
      owner: 'player',
      team: 'blue',
    }

    snapshot = game.getSnapshot()
    expect(snapshot.signalWarfare).toMatchObject({
      state: 'emp-window',
      activeJammerCount: 1,
      suppressedRelayCount: 0,
    })
    expect(snapshot.fog.ownedRetranslatorCount).toBe(1)
    expect(snapshot.vision.circles).toContainEqual(expect.objectContaining({
      kind: 'relay',
      id: centralRelay.id,
    }))

    internals.majorMods.emp = null
    internals.tiles[5]![10] = { kind: 'empty', hp: 0 }
    snapshot = game.getSnapshot()
    expect(snapshot.signalWarfare).toMatchObject({
      state: 'clear',
      activeJammerCount: 0,
      suppressedRelayCount: 0,
    })
    expect(snapshot.fog.ownedRetranslatorCount).toBe(1)
  })

  it('deploys the Scout screen, Engineer EMP support, and Battle Tank battery through normal actors', () => {
    const game = startSignalScar(true)
    game.update(1 / 60)

    const internals = game as unknown as SignalScarInternals
    const allies = internals.enemies.filter((tank) => tank.side === 'player')
    expect(allies.map((tank) => [tank.id, tank.classId, tank.scriptedBehavior])).toEqual([
      ['signal-scar-scout', 'scout', 'recon-screen'],
      ['signal-scar-engineer', 'engineer', 'signal-support'],
      ['signal-scar-battle', 'battle', 'battle-battery'],
    ])
    expect(internals.deployables).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerTankId: 'signal-scar-scout', kind: 'decoy' }),
      expect.objectContaining({ ownerTankId: 'signal-scar-scout', kind: 'tripwire' }),
      expect.objectContaining({ ownerTankId: 'signal-scar-engineer', kind: 'mine' }),
      expect.objectContaining({ ownerTankId: 'signal-scar-engineer', kind: 'steel' }),
    ]))
    expect(internals.majorMods.emp).toMatchObject({
      col: 6,
      row: 5,
      ownerTankId: 'signal-scar-engineer',
      owner: 'player',
    })
    expect(internals.majorMods.hedgehog).toMatchObject({
      ownerTankId: 'signal-scar-battle',
      owner: 'player',
      team: 'blue',
    })

    const position = gridToTankPosition(9, 5)
    internals.player.col = 9
    internals.player.row = 5
    internals.player.x = position.x
    internals.player.y = position.y
    expect(game.getSnapshot().signalWarfare.visibleJammers).toContainEqual(expect.objectContaining({
      id: 'north-jammer',
      active: true,
      empDisabled: true,
    }))
  })
})

function startSignalScar(aiEnabled: boolean) {
  const game = new TanchikiGame({
    aiEnabled,
    levelDefinitions: [SIGNAL_SCAR_LEVEL],
    saveStore: new MemorySaveStore(),
  })
  game.startGame(SIGNAL_SCAR_LEVEL_ID)
  return game
}
