import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { CAMPAIGN_LEVELS } from './level.ts'
import { MemorySaveStore } from './save.ts'
import type { LevelDefinition } from './types.ts'

const EMPTY_LEVEL = [
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '....P........',
  '.....E.......',
]

describe('accessibility readability evidence', () => {
  it('exposes readable menu, HUD, pause, and touch labels through render text', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    let snapshot = game.getSnapshot()
    expect(snapshot.readableText).toMatchObject({
      screen: 'main-menu',
      title: 'Tanchiki',
      hud: {
        team: 'Team blue',
        score: 'Score 0',
        health: 'Health 3/3',
        lives: 'Lives 3',
        level: 'Level 1: Outer Blocks',
        credits: 'Credits 0',
        shells: 'Shells 10/10',
        recharge: 'Recharge full.',
      },
    })
    expect(snapshot.readableText.menuOptions).toContain('Campaign')
    expect(snapshot.readableText.levelMarkers.labels).toContain('BASE')

    pressMenu(game)
    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('briefing')
    expect(snapshot.readableText.helper).toContain('Controls: WASD/Arrows move, Space fires, P opens Pause.')

    game.startGame()
    game.togglePause()
    game.setTouchControlsVisible(true)
    snapshot = JSON.parse(game.renderText())
    expect(snapshot.readableText).toMatchObject({
      screen: 'paused',
      title: 'Paused',
      touch: {
        visible: true,
        labels: ['Move', 'Fire', 'Pause'],
      },
    })
    expect(snapshot.readableText.helper[0]).toContain('Tap Resume')
  })

  it('uses full readable marker labels instead of ambiguous spawn abbreviations', () => {
    const ffaLevel = CAMPAIGN_LEVELS.find((level) => level.objective.mode === 'ffa')
    if (!ffaLevel) throw new Error('Campaign should include a Free For All level')

    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })
    game.startGame(ffaLevel.id)

    const snapshot = game.getSnapshot()
    expect(snapshot.readability.markers.some((marker) => marker.label === 'HOST')).toBe(false)
    expect(snapshot.readability.markers.some((marker) => marker.label === 'WILD')).toBe(false)
    expect(snapshot.readableText.levelMarkers.labels).not.toContain('ENEMY')
    expect(snapshot.readableText.levelMarkers.labels).not.toContain('NEUTRAL')
    expect(snapshot.readableText.levelMarkers.visible.join(' ')).toContain('START blue player-spawn visible')
  })

  it('keeps result recovery copy short enough for the focused result surface', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [makeEvidenceLevel()],
      saveStore: new MemorySaveStore(),
    })

    game.startGame(1)
    game.primaryAction()
    step(game, 0.08)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('campaign-complete')
    expect(snapshot.menu.helper).toContain('Retry: Campaign reopens briefing; credits stay.')
    expect(snapshot.menu.helper.every((line) => line.length <= 62)).toBe(true)
    expect(snapshot.readableText.results.join(' ')).toContain('Earned +$')
  })
})

function pressMenu(game: TanchikiGame) {
  game.primaryAction()
  step(game, 0.14)
}

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)
  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function makeEvidenceLevel(): LevelDefinition {
  return {
    id: 1,
    name: 'Evidence Yard',
    briefing: 'Browser evidence level.',
    objective: {
      mode: 'defense',
      label: 'Defense',
      briefing: 'Protect the base.',
      winCondition: 'Clear enemies.',
    },
    rows: EMPTY_LEVEL,
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: [{ x: 0, y: 0 }],
    enemyTotal: 0,
    activeEnemyLimit: 1,
    spawnInterval: 2,
    roleWeights: { base_attacker: 0.5, hunter: 0.3, wall_breaker: 0.2 },
    armoredEnemyRatio: 0,
    rewards: { credits: 10, xp: 5, score: 100 },
  }
}
