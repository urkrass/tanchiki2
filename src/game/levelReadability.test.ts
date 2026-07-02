import { describe, expect, it } from 'vitest'
import { buildLevelReadabilitySummary } from './levelReadability.ts'
import { CAMPAIGN_LEVELS } from './level.ts'
import { createDefaultSaveData, MemorySaveStore } from './save.ts'
import { TanchikiGame } from './game.ts'
import type { LevelDefinition, SavedObjectiveState } from './types.ts'

describe('level readability markers', () => {
  it('covers every campaign level with objective, spawn, and in-bounds marker evidence', () => {
    for (const level of CAMPAIGN_LEVELS) {
      const summary = buildLevelReadabilitySummary(level, objectiveStateFor(level), { col: 0, row: 0 }, 'blue', 'red')

      expect(summary.objectiveMarkerCount, `${level.name} objective markers`).toBeGreaterThan(0)
      expect(summary.spawnMarkerCount, `${level.name} spawn markers`).toBeGreaterThan(level.enemySpawns.length)
      expect(summary.markers.some((marker) => marker.kind === 'player-spawn')).toBe(true)
      expect(summary.markers.filter((marker) => marker.kind === 'enemy-spawn')).toHaveLength(level.enemySpawns.length)

      for (const marker of summary.markers) {
        expect(marker.col, `${level.name} ${marker.kind} col`).toBeGreaterThanOrEqual(0)
        expect(marker.row, `${level.name} ${marker.kind} row`).toBeGreaterThanOrEqual(0)
        expect(marker.col, `${level.name} ${marker.kind} col`).toBeLessThan(level.rows[0]?.length ?? 0)
        expect(marker.row, `${level.name} ${marker.kind} row`).toBeLessThan(level.rows.length)
      }
    }
  })

  it('marks base cover and the defense objective from the starting camera', () => {
    const level = CAMPAIGN_LEVELS[0]
    const summary = buildLevelReadabilitySummary(level, objectiveStateFor(level), { col: 2, row: 4 }, 'blue', 'red')

    expect(summary.markers).toContainEqual(expect.objectContaining({ kind: 'defense-base', label: 'BASE', visible: true }))
    expect(summary.criticalCoverCount).toBeGreaterThanOrEqual(3)
    expect(summary.markers.filter((marker) => marker.kind === 'critical-cover' && marker.visible)).toHaveLength(summary.criticalCoverCount)
  })

  it('hides fogged enemy primary objectives from the rendered evidence summary', () => {
    const save = createDefaultSaveData()
    save.progression.unlockedStage = 5
    save.progression.completedLevels = [1, 2, 3, 4]
    const game = new TanchikiGame({ saveStore: new MemorySaveStore(save) })
    game.startGame(5)

    const summary = game.getSnapshot().readability
    expect(summary.markers).not.toContainEqual(expect.objectContaining({ kind: 'assault-core', label: 'CORE' }))
    expect(game.getSnapshot().fog.hiddenCellCount).toBeGreaterThan(0)
  })

  it('tracks a moved CTF flag marker instead of only the home cell', () => {
    const level = CAMPAIGN_LEVELS[2]
    const objective = objectiveStateFor(level)

    if (!objective.flag) {
      throw new Error('Level 3 should define a CTF objective')
    }

    objective.flag.position = { x: level.playerSpawn.x, y: level.playerSpawn.y }
    const summary = buildLevelReadabilitySummary(level, objective, { col: 2, row: 4 }, 'blue', 'red')

    expect(summary.markers).toContainEqual(expect.objectContaining({
      kind: 'flag-target',
      label: 'FLAG',
      col: level.playerSpawn.x,
      row: level.playerSpawn.y,
      visible: true,
    }))
  })
})

function objectiveStateFor(level: LevelDefinition): SavedObjectiveState {
  const objective = level.objective
  return {
    mode: objective.mode,
    label: objective.label,
    winCondition: objective.winCondition,
    playerScore: 0,
    enemyScore: 0,
    neutralScore: 0,
    targetScore: objective.targetScore ?? objective.flag?.capturesToWin ?? 0,
    flag: objective.flag
      ? {
          playerBase: { ...objective.flag.playerBase },
          enemyHome: { ...objective.flag.enemyFlag },
          position: { ...objective.flag.enemyFlag },
          carrierId: null,
          captures: 0,
          capturesToWin: objective.flag.capturesToWin,
        }
      : null,
    assault: objective.assault
      ? {
          cell: { ...objective.assault.cell },
          hp: objective.assault.hp,
          maxHp: objective.assault.hp,
        }
      : null,
  }
}
