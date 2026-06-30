import { describe, expect, it } from 'vitest'
import { ARENA_Y, TILE_SIZE } from './constants.ts'
import { TanchikiGame } from './game.ts'

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
  '.............',
  '......E......',
]

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)

  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

describe('TanchikiGame', () => {
  it('starts from the menu into a playable wave', () => {
    const game = new TanchikiGame({ levelRows: EMPTY_LEVEL, enemyTotal: 3, seed: 4 })

    expect(game.getMode()).toBe('menu')
    game.startGame()

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.lives).toBe(3)
    expect(snapshot.baseHp).toBe(1)
    expect(snapshot.enemies.length).toBe(1)
    expect(snapshot.enemiesRemaining).toBe(2)
  })

  it('lets player fire destroy a passive enemy and win the wave', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 6 * TILE_SIZE + 3, y: ARENA_Y + 2 * TILE_SIZE + 3 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 6 * TILE_SIZE + 3, y: ARENA_Y + 10 * TILE_SIZE + 3 },
      seed: 12,
    })

    game.startGame()
    game.setInput({ fire: true })
    step(game, 1.4)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('won')
    expect(snapshot.score).toBe(250)
    expect(snapshot.enemies).toHaveLength(0)
  })

  it('chips and removes brick tiles with repeated shots', () => {
    const brickLevel = [
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......B......',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0 * TILE_SIZE + 3, y: ARENA_Y + 0 * TILE_SIZE + 3 }],
      enemyTotal: 1,
      levelRows: brickLevel,
      playerSpawn: { x: 6 * TILE_SIZE + 3, y: ARENA_Y + 10 * TILE_SIZE + 3 },
      seed: 7,
    })

    game.startGame()
    game.setInput({ fire: true })
    step(game, 0.05)
    game.setInput({ fire: false })
    step(game, 0.45)
    expect(game.getTile(6, 8)?.kind).toBe('brick')
    expect(game.getTile(6, 8)?.hp).toBe(1)

    game.setInput({ fire: true })
    step(game, 0.05)
    game.setInput({ fire: false })
    step(game, 0.45)
    expect(game.getTile(6, 8)?.kind).toBe('empty')
  })

  it('emits concise text state for automation', () => {
    const game = new TanchikiGame({ levelRows: EMPTY_LEVEL, enemyTotal: 1 })
    game.startGame()
    const text = game.renderText()
    const parsed = JSON.parse(text)

    expect(parsed.coordinateSystem).toContain('origin top-left')
    expect(parsed.player).toMatchObject({ dir: 'up', hp: 3 })
    expect(parsed.terrain.base).toBe(1)
  })
})
