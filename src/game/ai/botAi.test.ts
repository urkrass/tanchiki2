import { describe, expect, it } from 'vitest'
import { chooseBotBehavior } from './botBehaviors.ts'
import { decayBotBeliefs } from './botMemory.ts'
import { buildBotPercepts } from './botPerception.ts'
import { scoreBotIntentions } from './botUtility.ts'
import { evaluateFireControl } from './fireControl.ts'
import { findWeightedPath, isBreakerWallPlanUseful } from './pathfinding.ts'
import {
  DEFAULT_BOT_DIFFICULTY,
  roleProfileForEnemyRole,
  type BotActor,
  type BotDifficultyConfig,
  type BotPathGrid,
  type ContactBelief,
} from './botTypes.ts'
import type { TileKind, Vec } from '../types.ts'

const BASIC_ACTOR: BotActor = {
  id: 'bot-basic',
  role: 'base_attacker',
  side: 'enemy',
  team: 'red',
  col: 1,
  row: 1,
  dir: 'right',
  hp: 2,
  maxHp: 2,
  reload: 0,
}

describe('bot AI architecture modules', () => {
  it('routes around hard obstacles with stable weighted A* paths', () => {
    const grid = gridFromRows([
      '.....',
      '.SSS.',
      '.....',
    ])
    const first = findWeightedPath(grid, { x: 0, y: 1 }, [{ x: 4, y: 1 }])
    const second = findWeightedPath(grid, { x: 0, y: 1 }, [{ x: 4, y: 1 }])

    expect(first.found).toBe(true)
    expect(first.steps).toEqual(second.steps)
    expect(first.steps.some((cell) => grid.tileAt(cell).kind === 'steel')).toBe(false)
    expect(first.steps.at(-1)).toEqual({ x: 4, y: 1 })
  })

  it('identifies useful breaker wall plans without treating every wall as worth shooting', () => {
    const usefulGrid = gridFromRows([
      'SSSSS',
      '.B...',
      'SSSSS',
    ])
    const breakerPath = findWeightedPath(usefulGrid, { x: 0, y: 1 }, [{ x: 4, y: 1 }], {
      allowDestructibleWalls: true,
      destructibleWallCost: 2,
    })
    const directPath = findWeightedPath(usefulGrid, { x: 0, y: 1 }, [{ x: 4, y: 1 }])

    expect(breakerPath.breakWalls).toEqual([{ x: 1, y: 1 }])
    expect(isBreakerWallPlanUseful(breakerPath, directPath)).toBe(true)

    const openPath = findWeightedPath(gridFromRows(['.....']), { x: 0, y: 0 }, [{ x: 4, y: 0 }], {
      allowDestructibleWalls: true,
    })
    expect(isBreakerWallPlanUseful(openPath, null)).toBe(false)
  })

  it('scores scout investigation above passive objective pressure for suspicious contacts', () => {
    const actor: BotActor = { ...BASIC_ACTOR, id: 'bot-scout', role: 'hunter' }
    const beliefs = [belief('noise-1', 'noise', { x: 5, y: 1 }, 0.86, false)]
    const scores = scoreBotIntentions({
      actor,
      role: roleProfileForEnemyRole('hunter'),
      beliefs,
      objective: { mode: 'team-battle', pressureTarget: null, defendTarget: null },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      breakerWallUseful: false,
    })

    expect(scores[0]).toMatchObject({ intention: 'investigate', target: { x: 5, y: 1 } })
  })

  it('lets a basic tank attack a visible aligned enemy through behavior and fire control', () => {
    const beliefs = [belief('player', 'enemy', { x: 4, y: 1 }, 1, true)]
    const scores = scoreBotIntentions({
      actor: BASIC_ACTOR,
      role: roleProfileForEnemyRole('base_attacker'),
      beliefs,
      objective: { mode: 'defense', pressureTarget: { x: 8, y: 1 }, defendTarget: null },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      breakerWallUseful: false,
    })
    const fire = evaluateFireControl({
      shooter: BASIC_ACTOR,
      target: { id: 'player', position: { x: 4, y: 1 }, confidence: 1, value: 1, side: 'player', team: 'blue' },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      hasAmmo: true,
      tileAt: () => 'empty',
    })
    const decision = chooseBotBehavior({
      scores,
      fire,
      movePath: null,
      breakerPath: null,
      fallbackTarget: null,
    })

    expect(scores[0]?.intention).toBe('attack')
    expect(fire).toMatchObject({ shouldFire: true, direction: 'right' })
    expect(decision).toMatchObject({ state: 'attack', action: 'fire', target: { x: 4, y: 1 } })
  })

  it('decays confidence and keeps low-confidence contacts out of confirmed attack scoring', () => {
    const decayed = decayBotBeliefs([belief('stale-player', 'enemy', { x: 3, y: 1 }, 0.8, true, 0)], 2, DEFAULT_BOT_DIFFICULTY)
    const scores = scoreBotIntentions({
      actor: BASIC_ACTOR,
      role: roleProfileForEnemyRole('base_attacker'),
      beliefs: decayed,
      objective: { mode: 'team-battle', pressureTarget: null, defendTarget: null },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      breakerWallUseful: false,
    })

    expect(decayed[0]?.confidence).toBeLessThan(DEFAULT_BOT_DIFFICULTY.confidenceThreshold)
    expect(scores[0]?.intention).not.toBe('attack')
  })

  it('keeps utility scoring deterministic for identical percept input', () => {
    const percepts = buildBotPercepts({
      actor: BASIC_ACTOR,
      now: 12,
      visibleHostiles: [{ id: 'player', col: 3, row: 1, side: 'player', team: 'blue', hp: 4, maxHp: 4 }],
      alerts: [{ id: 'noise', col: 2, row: 2, side: 'player', team: 'blue', confidence: 0.7 }],
      objective: { mode: 'defense', pressureTarget: { x: 8, y: 1 }, defendTarget: null },
    })
    const input = {
      actor: BASIC_ACTOR,
      role: roleProfileForEnemyRole('base_attacker'),
      beliefs: percepts,
      objective: { mode: 'defense' as const, pressureTarget: { x: 8, y: 1 }, defendTarget: null },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      breakerWallUseful: false,
    }

    expect(scoreBotIntentions(input)).toEqual(scoreBotIntentions(input))
  })

  it('refuses blocked, unaligned, and friendly-fire shots', () => {
    expect(evaluateFireControl({
      shooter: BASIC_ACTOR,
      target: { id: 'player', position: { x: 4, y: 4 }, confidence: 1, value: 1 },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      hasAmmo: true,
      tileAt: () => 'empty',
    })).toMatchObject({ shouldFire: false, reason: 'not-aligned' })

    expect(evaluateFireControl({
      shooter: BASIC_ACTOR,
      target: { id: 'player', position: { x: 4, y: 1 }, confidence: 1, value: 1 },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      hasAmmo: true,
      tileAt: (cell) => (cell.x === 2 && cell.y === 1 ? 'brick' : 'empty'),
    })).toMatchObject({ shouldFire: false, reason: 'blocked' })

    expect(evaluateFireControl({
      shooter: BASIC_ACTOR,
      target: { id: 'player', position: { x: 4, y: 1 }, confidence: 1, value: 1 },
      difficulty: DEFAULT_BOT_DIFFICULTY,
      hasAmmo: true,
      tileAt: () => 'empty',
      tankAt: (cell) => cell.x === 2 && cell.y === 1 ? { id: 'ally', side: 'enemy', team: 'red' } : null,
    })).toMatchObject({ shouldFire: false, reason: 'friendly-fire' })
  })

  it('conserves ammo against low-value uncertain targets when tuned to be thrifty', () => {
    const thrifty: BotDifficultyConfig = {
      ...DEFAULT_BOT_DIFFICULTY,
      ammoConservation: 0.8,
    }

    expect(evaluateFireControl({
      shooter: BASIC_ACTOR,
      target: { id: 'weak-contact', position: { x: 4, y: 1 }, confidence: 0.68, value: 0.3 },
      difficulty: thrifty,
      hasAmmo: true,
      tileAt: () => 'empty',
    })).toMatchObject({ shouldFire: false, reason: 'conserve-ammo' })
  })
})

function belief(
  id: string,
  kind: ContactBelief['kind'],
  position: Vec,
  confidence: number,
  visible: boolean,
  lastSeenAt = 0,
): ContactBelief {
  return {
    id,
    kind,
    position,
    lastSeenAt,
    confidence,
    source: visible ? 'vision' : 'sound',
    side: 'player',
    team: 'blue',
    value: kind === 'enemy' ? 0.85 : 0.5,
    visible,
  }
}

function gridFromRows(rows: string[]): BotPathGrid {
  const tiles = rows.map((row) => [...row])
  return {
    cols: tiles[0]?.length ?? 0,
    rows: tiles.length,
    tileAt: (cell) => ({
      kind: tileKind(tiles[cell.y]?.[cell.x] ?? 'S'),
      hp: 1,
    }),
  }
}

function tileKind(value: string): TileKind {
  if (value === 'S') return 'steel'
  if (value === 'B') return 'brick'
  return 'empty'
}
