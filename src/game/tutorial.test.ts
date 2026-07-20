import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { createTiles } from './level.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import { terrainDefinition } from './terrain.ts'
import { getTouchClassEquipmentButtonAt, isTouchFlagDropPoint } from './input.ts'
import {
  ARENA_HEIGHT,
  ARENA_X,
  ARENA_Y,
  HUD_X,
} from './constants.ts'
import {
  TUTORIAL_MISSIONS,
  getAdaptiveTutorialGoal,
  getTutorialActionCue,
  getUnlockedTutorialMissionIds,
} from './tutorial.ts'

describe('Boot Camp foundations', () => {
  it('uses a deliberate hostile cadence across all six drills', () => {
    expect(TUTORIAL_MISSIONS.map((mission) => mission.level.spawnInterval)).toEqual([6, 8, 5, 7, 2.5, 6])
  })

  it('makes First Gear a base-free tank hunt with a three-stop range tour', () => {
    const mission = TUTORIAL_MISSIONS[0]!
    const tour = mission.steps.find((step) => step.id === 'tour')

    expect(mission.level.objective).toMatchObject({
      label: 'Tank Hunt',
      winCondition: 'Take a short movement lap and destroy two enemy tanks.',
    })
    expect(mission.steps.map((step) => step.id)).toEqual(['welcome', 'tour', 'move', 'engage'])
    expect(mission.level.rows.some((row) => row.includes('E'))).toBe(false)
    expect(mission.actors).toEqual([])
    expect(mission.level.enemySpawns).toEqual([{ x: 5, y: 3 }, { x: 15, y: 3 }])
    expect(tour?.cameraCue?.waypoints?.map((waypoint) => waypoint.label)).toEqual([
      'Left hostile',
      'Obstacle lanes',
      'Right hostile',
    ])
  })

  it('aligns the graduation Assault marker with its destructible core tile', () => {
    const mission = TUTORIAL_MISSIONS[5]!
    const core = mission.level.objective.assault!.cell

    expect(mission.level.rows[core.y]![core.x]).toBe('E')
    expect(mission.steps.find((step) => step.id === 'reveal')?.cameraCue?.target).toEqual(core)
  })

  it('keeps the first CTF run open and makes the second a two-tank handoff', () => {
    const mission = TUTORIAL_MISSIONS[3]!
    const flag = mission.level.objective.flag!
    const transfer = flag.transfer!
    const gate = transfer.gateCells[0]!

    expect(mission.level.rows[transfer.dropCell.y]![transfer.dropCell.x]).toBe('A')
    expect(mission.level.rows[transfer.receiveCell.y]![transfer.receiveCell.x]).toBe('A')
    expect(mission.level.rows[gate.y]![gate.x]).toBe('.')
    expect(flag.capturesToWin).toBe(2)
    expect(transfer).toMatchObject({
      activatesAfterCaptures: 1,
      handoffActorId: 'instructor-brick',
      handoffWaitCell: { x: 11, y: 9 },
    })
    expect(mission.steps.map((step) => step.id)).toEqual([
      'welcome',
      'pickup',
      'first-capture',
      'second-pickup',
      'transfer',
      'handoff',
    ])
    expect(mission.steps.at(-1)?.cameraCue).toMatchObject({
      followActorId: 'instructor-brick',
      label: 'Brick flag run',
    })

    const openTiles = createTiles(mission.level.rows)
    expect(getReachableCells(openTiles, flag.enemyFlag).has(`${flag.playerBase.x},${flag.playerBase.y}`)).toBe(true)

    const closedRows = mission.level.rows.map((row, rowIndex) =>
      rowIndex === gate.y
        ? `${row.slice(0, gate.x)}S${row.slice(gate.x + 1)}`
        : row,
    )
    const closedTiles = createTiles(closedRows)
    expect(getReachableCells(closedTiles, flag.enemyFlag).has(`${flag.playerBase.x},${flag.playerBase.y}`)).toBe(false)
  })

  it('turns No Friendlies into a relay lesson with replenishing four-kill combat', () => {
    const mission = TUTORIAL_MISSIONS[4]!

    expect(mission.level.objective).toMatchObject({
      mode: 'ffa',
      neutralTotal: 5,
      targetScore: 4,
    })
    expect(mission.level).toMatchObject({
      activeEnemyLimit: 5,
      continuousEnemySpawns: true,
    })
    expect(mission.level.objective.neutralSpawns).toHaveLength(5)
    expect(mission.level.rows[14]?.[10]).toBe('A')
    expect(mission.scriptedDeployables).toContainEqual(expect.objectContaining({
      id: 'rook-decoy',
      kind: 'decoy',
      cell: { x: 10, y: 11 },
      owner: 'neutral',
    }))
    expect(mission.steps.map((step) => step.id)).toEqual([
      'welcome',
      'deploy-relay',
      'find-decoy',
      'decoy-lesson',
      'recover-relay',
      'calibration-shot',
      'resupply',
      'priority',
      'relocate-relay',
      'finish',
    ])
  })

  it('focuses Boot Camp for a new save while keeping Campaign selectable', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    let snapshot = game.getSnapshot()
    expect(snapshot.menu.options.slice(0, 2)).toEqual(['Boot Camp', 'Campaign'])
    expect(snapshot.menu.selectedIndex).toBe(0)
    expect(snapshot.runKind).toBe('campaign')

    game.navigateMenu(1)
    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('level-select')
    expect(snapshot.runKind).toBe('campaign')
  })

  it('normalizes old saves additively without changing schema or campaign state', () => {
    const oldSave = createDefaultSaveData()
    oldSave.progression.unlockedStage = 3
    oldSave.progression.completedLevels = [1, 2]
    delete (oldSave.progression as Partial<typeof oldSave.progression>).tutorialCompletedMissions

    const store = new MemorySaveStore(oldSave)
    const normalized = store.load()

    expect(normalized).toMatchObject({
      schemaVersion: 1,
      progression: {
        unlockedStage: 3,
        completedLevels: [1, 2],
        tutorialCompletedMissions: [],
      },
    })
  })

  it('unlocks Boot Camp sequentially and keeps completed drills replayable', () => {
    expect(getUnlockedTutorialMissionIds([])).toEqual([1])
    expect(getUnlockedTutorialMissionIds([1])).toEqual([1, 2])
    expect(getUnlockedTutorialMissionIds([1, 2, 3])).toEqual([1, 2, 3, 4])
    expect(getUnlockedTutorialMissionIds([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6])
    expect(getUnlockedTutorialMissionIds([0, 99])).toEqual([1])
  })

  it('opens a focused briefing with adaptive loadout context', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })

    pressMenu(game)
    let snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('tutorial-select')
    expect(snapshot.menu.options).toEqual(['1. First Gear', 'Back'])

    pressMenu(game)
    snapshot = game.getSnapshot()
    expect(snapshot.mode).toBe('briefing')
    expect(snapshot.runKind).toBe('tutorial')
    expect(snapshot.menu.options).toEqual(['Start Drill', 'Change Loadout', 'Back'])
    expect(snapshot.tutorial).toMatchObject({
      active: true,
      missionId: 1,
      missionName: 'First Gear',
      stepId: 'welcome',
      activeGoal: 'Confirm range-control instructions.',
      recommendedLoadout: {
        classId: 'engineer',
        majorMod: 'overdrive',
      },
      actualLoadout: {
        classId: 'engineer',
        majorMod: 'overdrive',
      },
    })
    expect(snapshot.readableText.tutorial.goal).toBe('Confirm range-control instructions.')
  })

  it('provides valid maps, zero rewards, and adaptive paths for every class and Major Mod', () => {
    expect(TUTORIAL_MISSIONS).toHaveLength(6)

    for (const mission of TUTORIAL_MISSIONS) {
      expect(mission.id).toBeGreaterThan(0)
      expect(mission.level.id).toBe(mission.id)
      expect(mission.level.rows).toHaveLength(17)
      expect(mission.level.rows.every((row) => row.length === 21)).toBe(true)
      expect(mission.level.rewards).toEqual({ credits: 0, xp: 0, score: 0 })
    }

    const classMission = TUTORIAL_MISSIONS[2]!
    const classStepIndex = classMission.steps.findIndex((step) => step.id === 'adaptive')
    for (const classId of ['scout', 'engineer', 'battle'] as const) {
      expect(getAdaptiveTutorialGoal(classMission, classId, 'overdrive', classStepIndex)?.classId).toBe(classId)
    }

    const modMission = TUTORIAL_MISSIONS[5]!
    const modStepIndex = modMission.steps.findIndex((step) => step.id === 'adaptive')
    for (const majorMod of ['overdrive', 'pontoon', 'hedgehog', 'emp'] as const) {
      expect(getAdaptiveTutorialGoal(modMission, 'engineer', majorMod, modStepIndex)?.majorMod).toBe(majorMod)
    }
  })

  it('maps each interactive drill trigger to a concise action cue', () => {
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[0]!, 'engineer', 'overdrive', 2)).toEqual({
      kind: 'move',
      label: 'MOVE',
      keyboardKeys: ['LEFT', 'UP', 'DOWN', 'RIGHT'],
      touchKeys: ['LEFT', 'UP', 'DOWN', 'RIGHT'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[0]!, 'engineer', 'overdrive', 3)).toMatchObject({
      kind: 'fire',
      keyboardKeys: ['SPACE'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[2]!, 'engineer', 'overdrive', 1)).toMatchObject({
      kind: 'deploy',
      label: 'PLACE KIT',
      keyboardKeys: ['1', '2'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[3]!, 'scout', 'pontoon', 4, { x: 10, y: 1 })).toMatchObject({
      kind: 'drive',
      label: 'TO XFER',
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[3]!, 'scout', 'pontoon', 4, { x: 10, y: 7 })).toMatchObject({
      kind: 'drop-flag',
      label: 'DROP FLAG',
      keyboardKeys: ['R'],
      touchKeys: ['FLAG'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[3]!, 'scout', 'pontoon', 5)).toBeNull()
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[4]!, 'battle', 'hedgehog', 1)).toMatchObject({
      kind: 'relay',
      label: 'DEPLOY RELAY',
      keyboardKeys: ['E'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[4]!, 'battle', 'hedgehog', 2)).toBeNull()
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[4]!, 'battle', 'hedgehog', 4)).toMatchObject({
      kind: 'relay',
      label: 'PICK UP RELAY',
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[4]!, 'battle', 'hedgehog', 6, { x: 10, y: 15 })).toMatchObject({
      kind: 'drive',
      label: 'TO AMMO',
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[4]!, 'battle', 'hedgehog', 6, { x: 10, y: 14 })).toEqual({
      kind: 'wait',
      label: 'HOLD POSITION',
      keyboardKeys: [],
      touchKeys: [],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[5]!, 'engineer', 'emp', 2)).toMatchObject({
      kind: 'mod',
      label: 'USE MOD',
      keyboardKeys: ['X'],
    })
    expect(getTutorialActionCue(TUTORIAL_MISSIONS[5]!, 'engineer', 'emp', 3)).toMatchObject({
      kind: 'fire',
      label: 'FIRE',
      keyboardKeys: ['SPACE'],
    })
  })

  it('keeps every mission spawn safe, its objective reachable, and a Pontoon route available', () => {
    for (const mission of TUTORIAL_MISSIONS) {
      const tiles = createTiles(mission.level.rows)
      const spawnCells = [
        mission.level.playerSpawn,
        ...mission.level.enemySpawns,
        ...(mission.level.objective.friendlySpawns ?? []),
        ...(mission.level.objective.neutralSpawns ?? []),
      ]
      for (const spawn of spawnCells) {
        expect(
          terrainDefinition(tiles[spawn.y]![spawn.x]!.kind).passable,
          `${mission.name} has an unsafe spawn at ${spawn.x},${spawn.y}`,
        ).toBe(true)
      }

      const reachable = getReachableCells(tiles, mission.level.playerSpawn)
      const targets = [
        ...(mission.level.objective.flag ? [mission.level.objective.flag.enemyFlag] : []),
        ...(mission.level.objective.assault ? neighbors(mission.level.objective.assault.cell) : []),
        ...mission.level.enemySpawns,
      ]
      expect(
        targets.some((target) => reachable.has(`${target.x},${target.y}`)),
        `${mission.name} has no reachable mission target`,
      ).toBe(true)
      expect(hasPontoonLine(tiles), `${mission.name} has no usable Pontoon line`).toBe(true)
    }
  })

  it('exposes calm touch paths for class gear, Mods, and the CTF manual drop', () => {
    const game = new TanchikiGame({ saveStore: new MemorySaveStore() })
    const snapshot = game.getSnapshot()
    expect(getTouchClassEquipmentButtonAt(
      ARENA_X + 6 + 250,
      ARENA_Y + ARENA_HEIGHT + 12,
      snapshot,
    )).toBe('mine')

    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = [1, 2, 3]
    const ctf = new TanchikiGame({ saveStore: new MemorySaveStore(save) })
    pressMenu(ctf)
    pressMenu(ctf)
    pressMenu(ctf)
    step(ctf, 1.25)
    ctf.primaryAction()
    const ctfSnapshot = ctf.getSnapshot()
    expect(ctfSnapshot.objective.flag).not.toBeNull()
    ctfSnapshot.objective.flag!.carrierId = 'player'
    expect(isTouchFlagDropPoint(HUD_X + 40, 52, ctfSnapshot)).toBe(true)
  })
})

function getReachableCells(tiles: ReturnType<typeof createTiles>, start: { x: number; y: number }) {
  const visited = new Set([`${start.x},${start.y}`])
  const queue = [{ ...start }]
  while (queue.length > 0) {
    const cell = queue.shift()!
    for (const next of neighbors(cell)) {
      const tile = tiles[next.y]?.[next.x]
      const key = `${next.x},${next.y}`
      if (!tile || visited.has(key)) continue
      const terrain = terrainDefinition(tile.kind)
      if (!terrain.passable && !terrain.destructible) continue
      visited.add(key)
      queue.push(next)
    }
  }
  return visited
}

function hasPontoonLine(tiles: ReturnType<typeof createTiles>) {
  const directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }]
  for (let row = 0; row < tiles.length; row += 1) {
    for (let col = 0; col < (tiles[row]?.length ?? 0); col += 1) {
      if (tiles[row]?.[col]?.kind !== 'water') continue
      for (const direction of directions) {
        const before = tiles[row - direction.y]?.[col - direction.x]
        if (!before || before.kind === 'water' || !terrainDefinition(before.kind).passable) continue
        let endCol = col
        let endRow = row
        while (tiles[endRow]?.[endCol]?.kind === 'water') {
          endCol += direction.x
          endRow += direction.y
        }
        const after = tiles[endRow]?.[endCol]
        if (after && terrainDefinition(after.kind).passable) {
          return true
        }
      }
    }
  }
  return false
}

function neighbors(cell: { x: number; y: number }) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ]
}

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
