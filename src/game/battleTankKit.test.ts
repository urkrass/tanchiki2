import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import {
  BULWARK_CAPACITY,
  BULWARK_DURATION_SECONDS,
  BULWARK_RECHARGE_SECONDS,
  TRAVERSE_DURATION_SECONDS,
  TRAVERSE_RECHARGE_SECONDS,
} from './battleTankKit.ts'
import { TANK_SIZE } from './constants.ts'
import {
  BATTLE_TANK_BATTERY_LEVEL,
  BATTLE_TANK_BATTERY_LEVEL_ID,
} from './testing/qaIntegrationLevel.ts'

const EMPTY_ROWS = Array.from({ length: 17 }, () => '.'.repeat(21))

describe('Battle Tank active native kit', () => {
  it('runs Bulwark for five seconds, absorbs three damage, then recharges for twelve seconds', () => {
    const game = createBattleGame()
    const internals = game as unknown as {
      player: { spawnGrace: number }
      damagePlayer: (damage: number) => void
    }

    expect(game.getSnapshot().player).toMatchObject({ shield: 0 })
    expect(game.getSnapshot().player.battleKit.bulwark).toMatchObject({
      ready: true,
      maxCapacity: BULWARK_CAPACITY,
      duration: BULWARK_DURATION_SECONDS,
      rechargeDuration: BULWARK_RECHARGE_SECONDS,
    })

    expect(game.setClassEquipmentSlot(1, true)).toBe(true)
    game.setClassEquipmentSlot(1, false)
    step(game, 1)
    const activeRemaining = game.getSnapshot().player.battleKit.bulwark.remaining
    expect(game.setClassEquipmentSlot(1, true)).toBe(true)
    game.setClassEquipmentSlot(1, false)
    expect(game.getSnapshot().player.battleKit.bulwark).toMatchObject({
      active: true,
      remaining: activeRemaining,
      capacity: BULWARK_CAPACITY,
    })
    internals.player.spawnGrace = 0
    internals.damagePlayer(2)
    expect(game.getSnapshot().player.battleKit.bulwark).toMatchObject({ active: true, capacity: 1 })
    internals.player.spawnGrace = 0
    internals.damagePlayer(2)
    expect(game.getSnapshot().player).toMatchObject({ hp: 2, shield: 0 })
    expect(game.getSnapshot().player.battleKit.bulwark).toMatchObject({ active: false, capacity: 0 })

    step(game, BULWARK_RECHARGE_SECONDS - 0.5)
    expect(game.getSnapshot().player.battleKit.bulwark.ready).toBe(false)
    step(game, 0.6)
    expect(game.getSnapshot().player.battleKit.bulwark.ready).toBe(true)
  })

  it('keeps the hull facing fixed while Left and Right strafe perpendicular during Traverse', () => {
    const game = createBattleGame()
    const initial = game.getSnapshot().player

    expect(game.setClassEquipmentSlot(2, true)).toBe(true)
    game.setClassEquipmentSlot(2, false)
    game.setButton('right', true)
    step(game, 0.5)
    expect(game.getSnapshot().player).toMatchObject({
      dir: 'up',
      col: initial.col,
      row: initial.row,
      moving: true,
    })
    game.setButton('right', false)
    step(game, 0.2)

    let snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ dir: 'up', col: initial.col + 1, row: initial.row })
    expect(snapshot.player.battleKit.traverse).toMatchObject({
      active: true,
      duration: TRAVERSE_DURATION_SECONDS,
      rechargeDuration: TRAVERSE_RECHARGE_SECONDS,
    })

    game.setButton('up', true)
    step(game, 0.7)
    game.setButton('up', false)
    snapshot = game.getSnapshot()
    expect(snapshot.player).toMatchObject({ dir: 'up', col: initial.col + 1, row: initial.row })

    game.setClassEquipmentSlot(2, true)
    game.setClassEquipmentSlot(2, false)
    expect(game.getSnapshot().player.battleKit.traverse).toMatchObject({
      active: false,
      cooldown: TRAVERSE_RECHARGE_SECONDS,
    })
  })

  it('keeps the short Bulwark absorption halo anchored to a moving tank', () => {
    const game = createBattleGame()
    const internals = game as unknown as {
      player: { id: string; x: number; spawnGrace: number }
      particles: Array<{ x: number; life: number; visual?: string; anchorTankId?: string }>
      damagePlayer: (damage: number) => void
    }

    game.setClassEquipmentSlot(1, true)
    game.setClassEquipmentSlot(1, false)
    game.setButton('right', true)
    step(game, 0.08)
    internals.player.spawnGrace = 0
    internals.damagePlayer(1)

    const impact = internals.particles.find((particle) => particle.visual === 'shield-impact')!
    const impactX = impact.x
    expect(impact.anchorTankId).toBe(internals.player.id)

    step(game, 0.18)
    expect(impact.life).toBeGreaterThan(0)
    expect(impact.x).toBeCloseTo(internals.player.x + TANK_SIZE / 2)
    expect(impact.x).toBeGreaterThan(impactX)
  })

  it('reveals the whole battery range and gives each allied heavy its own real kit and finite magazine', () => {
    const save = createDefaultSaveData()
    save.progression.selectedTankClass = 'battle'
    const game = new TanchikiGame({
      aiEnabled: true,
      levelDefinitions: [BATTLE_TANK_BATTERY_LEVEL],
      saveStore: new MemorySaveStore(save),
      seed: 42,
    })
    game.startGame(BATTLE_TANK_BATTERY_LEVEL_ID)
    step(game, 1.1)

    const snapshot = game.getSnapshot()
    const battery = snapshot.enemies.filter((tank) => tank.id.startsWith('battery-'))
    expect(snapshot.level.name).toBe('Heavy Battery Proving Ground')
    expect(snapshot.fog.hiddenCellCount).toBe(0)
    expect(snapshot.vision.visibleCells).toHaveLength(21 * 17)
    expect(battery).toHaveLength(3)
    expect(battery.every((tank) => tank.classId === 'battle' && tank.dir === 'up')).toBe(true)
    expect(battery.every((tank) => tank.bulwarkRemaining > 0 && tank.bulwarkCapacity === 3)).toBe(true)
    expect(battery.every((tank) => tank.traverseRemaining > 0)).toBe(true)
    expect(battery.some((tank) => tank.moving)).toBe(true)
    expect(battery.every((tank) => tank.shellCapacity === 8 && tank.shells !== null && tank.shells < 8)).toBe(true)
  })
})

function createBattleGame() {
  const save = createDefaultSaveData()
  save.progression.selectedTankClass = 'battle'
  const game = new TanchikiGame({
    aiEnabled: false,
    enemyTotal: 1,
    levelRows: EMPTY_ROWS,
    playerSpawn: { x: 10, y: 12 },
    saveStore: new MemorySaveStore(save),
  })
  game.startGame()
  return game
}

function step(game: TanchikiGame, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    game.update(1 / 60)
  }
}
