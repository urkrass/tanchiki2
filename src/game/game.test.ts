import { describe, expect, it } from 'vitest'
import { CAMPAIGN_LEVELS } from './level.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import { TanchikiGame } from './game.ts'
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
  '.............',
  '......E......',
]

function step(game: TanchikiGame, seconds: number) {
  const frames = Math.ceil(seconds * 60)

  for (let index = 0; index < frames; index += 1) {
    game.update(1 / 60)
  }
}

function makeTestLevel(id: number, rewards = { credits: 10 * id, xp: 5 * id, score: 100 * id }): LevelDefinition {
  return {
    id,
    name: `Test ${id}`,
    briefing: `Test briefing ${id}`,
    rows: EMPTY_LEVEL,
    playerSpawn: { x: 4, y: 11 },
    enemySpawns: [{ x: 0, y: 0 }],
    enemyTotal: 0,
    activeEnemyLimit: 1,
    spawnInterval: 2,
    roleWeights: { base_attacker: 0.5, hunter: 0.3, wall_breaker: 0.2 },
    armoredEnemyRatio: 0.2,
    rewards,
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

  it('applies upgrade-assisted run stats from saved garage progression', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.upgrades = { armor: 2, cannon: 3, engine: 2, repairKit: 1 }
    const game = new TanchikiGame({
      enemyTotal: 0,
      levelRows: EMPTY_LEVEL,
      saveStore: new MemorySaveStore(saveData),
    })

    game.startGame()
    const snapshot = game.getSnapshot()

    expect(snapshot.progression.upgradeStats.maxHp).toBe(5)
    expect(snapshot.progression.upgradeStats.bulletDamage).toBe(2)
    expect(snapshot.progression.upgradeStats.moveDuration).toBeLessThan(0.22)
    expect(snapshot.player).toMatchObject({ hp: 5, repairCharges: 1 })
  })

  it('persists settings and color-safe preference through local save', () => {
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ saveStore: store })

    game.navigateMenu(3)
    game.primaryAction()
    expect(game.getSnapshot().mode).toBe('settings')

    game.primaryAction()
    game.navigateMenu(1)
    game.primaryAction()
    game.navigateMenu(1)
    game.primaryAction()

    const reloaded = new TanchikiGame({ saveStore: store })
    const snapshot = reloaded.getSnapshot()
    expect(snapshot.settings.volume).toBe(1)
    expect(snapshot.settings.muted).toBe(true)
    expect(snapshot.settings.colorSafe).toBe(true)
  })

  it('queues sound events and deterministic feedback for player actions', () => {
    const levels = [makeTestLevel(1), makeTestLevel(2)]
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore() })

    game.startGame(1)
    game.primaryAction()
    expect(game.drainSoundEvents().map((event) => event.kind)).toContain('fire')

    step(game, 0.02)
    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.feedback.shake).toBeGreaterThan(0)
    expect(snapshot.feedback.levelClearPause).toBeGreaterThan(0)
    expect(game.drainSoundEvents().map((event) => event.kind)).toContain('level-clear')
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

  it('starts a new game from the highest unlocked campaign level', () => {
    const saveData = createDefaultSaveData()
    saveData.progression.unlockedStage = 3
    const game = new TanchikiGame({ saveStore: new MemorySaveStore(saveData) })

    expect(game.getSnapshot().level.current).toBe(3)
    expect(game.getSnapshot().enemiesRemaining).toBe(CAMPAIGN_LEVELS[2].enemyTotal)
    game.startGame()

    const snapshot = game.getSnapshot()
    expect(snapshot.level.current).toBe(3)
    expect(snapshot.level.name).toBe(CAMPAIGN_LEVELS[2].name)
  })

  it('clearing a level awards rewards, unlocks the next level, and enters level-complete', () => {
    const levels = [makeTestLevel(1, { credits: 77, xp: 33, score: 444 }), makeTestLevel(2)]
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: store })

    game.startGame(1)
    step(game, 0.02)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-complete')
    expect(snapshot.score).toBe(444)
    expect(snapshot.progression.credits).toBe(77)
    expect(snapshot.progression.xp).toBe(33)
    expect(snapshot.progression.unlockedStage).toBe(2)
    expect(snapshot.progression.hasSavedRun).toBe(false)
  })

  it('clearing the final campaign level enters campaign-complete', () => {
    const levels = Array.from({ length: 8 }, (_, index) => makeTestLevel(index + 1))
    const saveData = createDefaultSaveData()
    saveData.progression.unlockedStage = 8
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: new MemorySaveStore(saveData) })

    game.startGame(8)
    step(game, 0.02)

    const snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('campaign-complete')
    expect(snapshot.level.campaignComplete).toBe(true)
    expect(snapshot.progression.unlockedStage).toBe(8)
  })

  it('continues a saved run on the saved level definition', () => {
    const levels = [makeTestLevel(1), makeTestLevel(2)]
    const store = new MemorySaveStore()
    const game = new TanchikiGame({ levelDefinitions: levels, saveStore: store })

    game.startGame(2)
    game.togglePause()
    game.saveAndQuit()

    const reloaded = new TanchikiGame({ levelDefinitions: levels, saveStore: store })
    expect(reloaded.continueSavedRun()).toBe(true)
    expect(reloaded.getSnapshot().level).toMatchObject({ current: 2, name: 'Test 2' })
  })

  it('ramps campaign difficulty across handcrafted levels', () => {
    const first = CAMPAIGN_LEVELS[0]
    const final = CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1]

    expect(CAMPAIGN_LEVELS.map((level) => level.enemyTotal)).toEqual([6, 8, 10, 12, 14, 16, 18, 20])
    expect(final.enemyTotal).toBeGreaterThan(first.enemyTotal)
    expect(final.activeEnemyLimit).toBeGreaterThanOrEqual(first.activeEnemyLimit)
    expect(final.spawnInterval).toBeLessThan(first.spawnInterval)
    expect(final.armoredEnemyRatio).toBeGreaterThan(first.armoredEnemyRatio)
    expect(final.roleWeights.hunter + final.roleWeights.wall_breaker).toBeGreaterThan(
      first.roleWeights.hunter + first.roleWeights.wall_breaker,
    )
  })
})
