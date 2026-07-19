import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import {
  QA_ALL_EQUIPMENT_LEVEL,
  QA_ALL_EQUIPMENT_LEVEL_ID,
  QA_ALL_EQUIPMENT_LEVEL_SLUG,
  QA_CLASS_KIT_LEVEL,
  QA_CLASS_KIT_LEVEL_ID,
  QA_CLASS_KIT_LEVEL_SLUG,
} from './testing/qaIntegrationLevel.ts'
import type { Particle, TankClassId } from './types.ts'

describe('class equipment presentation integration', () => {
  it.each([
    ['scout', 'SCOUT KIT | SPACE SHELLS 10/10 READY | 1 DECOY 1/1 READY | 5 WIRE 1/1 READY | E RELAY 1/1 READY'],
    ['engineer', 'ENGINEER KIT | SPACE SHELLS 10/10 READY | 2 MINE 1/1 READY | 4 TRAP 1/1 READY | E RELAY 2/2 READY'],
    ['battle', 'BATTLE KIT | SPACE HE SHELL 10/10 READY | SHIELD 1 READY | E RELAY 1/1 READY'],
  ] satisfies Array<[TankClassId, string]>)('exposes the %s HUD kit in readable game state', (tankClass, expected) => {
    const game = startClassRange(tankClass)
    expect(game.getSnapshot().readableText.hud.classKit).toBe(expected)
  })

  it('keeps the hidden visual range outside the Campaign list', () => {
    expect(QA_CLASS_KIT_LEVEL_SLUG).toBe('class_kit_test')
    expect(QA_ALL_EQUIPMENT_LEVEL_SLUG).toBe('all_mods_test')
    const defaultGame = new TanchikiGame({ saveStore: new MemorySaveStore() })
    expect(defaultGame.getSnapshot().objective.selectableLevels).not.toContain(QA_CLASS_KIT_LEVEL_ID)
    expect(defaultGame.getSnapshot().objective.selectableLevels).not.toContain(QA_ALL_EQUIPMENT_LEVEL_ID)
    expect(defaultGame.renderText()).not.toContain(QA_CLASS_KIT_LEVEL.name)
    expect(defaultGame.renderText()).not.toContain(QA_ALL_EQUIPMENT_LEVEL.name)
  })

  it('gives the development Test Tank every visualized class kit without changing normal classes', () => {
    const save = createDefaultSaveData()
    save.progression.selectedTankClass = 'battle'
    const game = new TanchikiGame({
      aiEnabled: false,
      allClassEquipmentForTesting: true,
      levelDefinitions: [QA_ALL_EQUIPMENT_LEVEL],
      saveStore: new MemorySaveStore(save),
      seed: 42,
    })
    game.startGame(QA_ALL_EQUIPMENT_LEVEL_ID)
    const snapshot = game.getSnapshot()

    expect(snapshot.level.name).toBe('All Equipment Test Range')
    expect(snapshot.player.classId).toBe('battle')
    expect(snapshot.player.shield).toBe(3)
    expect(snapshot.progression.upgradeStats).toMatchObject({ shield: 3, splashDamage: 1, splashRadius: 40 })
    expect(snapshot.deployables.available).toEqual(['decoy', 'tripwire', 'mine', 'steel'])
    expect(snapshot.portableRelay).toMatchObject({ activeCount: 0, limit: 2 })
    expect(snapshot.readableText.hud.classKit).toBe(
      'TEST TANK KIT | SPACE HE SHELL 10/10 READY | 1 DECOY 1/1 READY | 5 WIRE 1/1 READY | 2 MINE 1/1 READY | 4 TRAP 1/1 READY | SHIELD 3 READY | E RELAY 2/2 READY',
    )

    const normalBattle = startClassRange('battle').getSnapshot()
    expect(normalBattle.deployables.available).toEqual([])
    expect(normalBattle.player.shield).toBe(1)
  })

  it('adds HE fragments and dust at an impact even without a secondary target', () => {
    const game = startClassRange('battle')
    const internals = game as unknown as { bullets: unknown[]; particles: Particle[] }

    game.primaryAction()
    expect(game.getSnapshot().bullets[0]).toMatchObject({ splashDamage: 1, splashRadius: 40 })
    step(game, 0.28)

    expect(internals.bullets).toHaveLength(0)
    expect(internals.particles.some((particle) => particle.visual === 'he-fragment')).toBe(true)
    expect(internals.particles.some((particle) => particle.visual === 'dust' || particle.visual === 'smoke')).toBe(true)
    expect(game.getSnapshot().runStats.shrapnelHits).toBe(0)
  })
})

function startClassRange(tankClass: TankClassId) {
  const save = createDefaultSaveData()
  save.progression.selectedTankClass = tankClass
  const game = new TanchikiGame({
    aiEnabled: false,
    levelDefinitions: [QA_CLASS_KIT_LEVEL],
    saveStore: new MemorySaveStore(save),
    seed: 42,
  })
  game.startGame(QA_CLASS_KIT_LEVEL_ID)
  return game
}

function step(game: TanchikiGame, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame += 1) {
    game.update(1 / 60)
  }
}
