import { describe, expect, it } from 'vitest'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
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

describe('TanchikiGame real-game upgrade', () => {
  it('moves the player exactly one 32px tile at a time', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.03)
    game.setInput({ right: false })

    let snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 11, moving: true })

    step(game, 0.35)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 5, row: 11, moving: false })
    expect(snapshot.player.x).toBe(163)
  })

  it('turns on blocked movement without drifting into a wall', () => {
    const blockedLevel = [
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
      '.....B.......',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: blockedLevel,
      playerSpawn: { x: 4, y: 10 },
      saveStore: new MemorySaveStore(),
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.45)

    const snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ col: 4, row: 10, dir: 'right', moving: false })
    expect(snapshot.player.x).toBe(131)
  })

  it('uses grid-aware enemy AI to route toward objectives', () => {
    const mazeLevel = [
      '.............',
      '.....S.......',
      '.....S.......',
      '.....S.......',
      '.....S.......',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '......E......',
    ]
    const game = new TanchikiGame({
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: mazeLevel,
      playerSpawn: { x: 12, y: 11 },
      saveStore: new MemorySaveStore(),
      seed: 2,
    })

    game.startGame()
    const before = game.getSnapshot().enemies[0]
    step(game, 1.2)
    const after = game.getSnapshot().enemies[0]

    expect(after).toBeDefined()
    expect(after.col + after.row).toBeGreaterThan(before.col + before.row)
  })

  it('persists selected team and flips the opposing team', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ saveStore: store })

    game.setTeam('red')

    const reloaded = new TanchikiGame({ saveStore: store })
    const snapshot = reloaded.getSnapshot()
    expect(snapshot.team).toEqual({ player: 'red', enemy: 'blue' })
    expect(snapshot.progression.selectedTeam).toBe('red')
  })

  it('buys garage upgrades, persists them, and applies upgraded stats', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.credits = 500
    const store = new MemorySaveStore(saveData)
    const game = new TanchikiGame({
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })

    expect(game.buyUpgrade('armor')).toBe(true)
    expect(game.buyUpgrade('engine')).toBe(true)

    const reloaded = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })
    reloaded.startGame()
    const snapshot = reloaded.getSnapshot()

    expect(snapshot.progression.upgrades).toMatchObject({ armor: 1, engine: 1 })
    expect(snapshot.progression.upgradeStats.maxHp).toBe(4)
    expect(snapshot.progression.upgradeStats.moveDuration).toBeLessThan(0.26)
    expect(snapshot.player.hp).toBe(4)
  })

  it('saves and continues a run from local storage', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      playerSpawn: { x: 4, y: 11 },
      saveStore: store,
    })

    game.startGame()
    game.setInput({ right: true })
    step(game, 0.03)
    game.setInput({ right: false })
    step(game, 0.35)
    game.togglePause()
    game.saveAndQuit()

    const menuSnapshot = game.getSnapshot()
    expect(menuSnapshot.mode).toBe('main-menu')
    expect(menuSnapshot.progression.hasSavedRun).toBe(true)

    const reloaded = new TanchikiGame({
      aiEnabled: false,
      enemySpawns: [{ x: 0, y: 0 }],
      enemyTotal: 1,
      levelRows: EMPTY_LEVEL,
      saveStore: store,
    })
    expect(reloaded.continueSavedRun()).toBe(true)
    const continued = reloaded.getSnapshot()

    expect(continued.mode).toBe('playing')
    expect(continued.player).toMatchObject({ col: 5, row: 11 })
  })
})
