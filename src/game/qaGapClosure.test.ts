import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { createDefaultSaveData, MemorySaveStore } from './save.ts'
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
  '.............',
]

describe('I16 QA gap closure evidence', () => {
  it('keeps result readability diagnostics aligned with the expanded result copy', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      levelDefinitions: [makeEvidenceLevel()],
      saveStore: new MemorySaveStore(),
    })

    game.startGame(1)
    game.primaryAction()
    step(game, 0.08)

    const results = game.getSnapshot().readableText.results
    expect(results[0]).toMatch(/^Tactic .+: .+$/)
    expect(results.some((line) => /^Hit \d+%  Cover \d+  Salvage \d+HP\/\d+S$/.test(line))).toBe(true)
    expect(results.some((line) => line.startsWith('Earned +$'))).toBe(true)
  })

  it('does not expose fogged enemy objective cues in readable text evidence', () => {
    const save = createDefaultSaveData()
    save.progression.unlockedStage = 5
    save.progression.completedLevels = [1, 2, 3, 4]
    const game = new TanchikiGame({ saveStore: new MemorySaveStore(save) })

    game.startGame(5)

    const offscreenPrimary = game.getSnapshot().readableText.levelMarkers.offscreenPrimary
    expect(offscreenPrimary).toHaveLength(0)
    expect(JSON.stringify(game.getSnapshot().readableText)).not.toContain('CORE')
  })
})

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
    enemySpawns: [],
    enemyTotal: 0,
    activeEnemyLimit: 1,
    spawnInterval: 2,
    roleWeights: { base_attacker: 0.5, hunter: 0.3, wall_breaker: 0.2 },
    armoredEnemyRatio: 0,
    rewards: { credits: 10, xp: 5, score: 100 },
  }
}
