import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore, createDefaultSaveData } from './save.ts'
import type {
  Bullet,
  OfflineDeployableKind,
  SavedTank,
  Tank,
} from './types.ts'

interface ActorMechanicsInternals {
  enemies: Tank[]
  bullets: Bullet[]
  deployables: Array<{
    id: string
    kind: OfflineDeployableKind
    col: number
    row: number
    owner: 'player' | 'enemy' | 'neutral'
    ownerTankId: string
    team: 'blue' | 'red'
  }>
  fire(tank: Tank): void
  createFriendlyBot(spawn: { x: number; y: number }): Tank | null
  findDeployableTriggerTarget(deployable: ActorMechanicsInternals['deployables'][number]): Tank | null
  serializeTank(tank: Tank): SavedTank
  restoreTank(tank: SavedTank): Tank
}

describe('Boot Camp actor-aware mechanics', () => {
  it('spawns the instructor squad with real class stats, equipment, and owner-scoped Mods', () => {
    const game = launchMissionThree()
    const internals = game as unknown as ActorMechanicsInternals

    confirmOpeningOrders(game)
    step(game, 0.2)

    const actors = Object.fromEntries(
      internals.enemies
        .filter((tank) => tank.callSign)
        .map((tank) => [tank.callSign, tank]),
    ) as Record<'Needle' | 'Spanner' | 'Brick', Tank>

    expect(actors.Needle).toMatchObject({
      id: 'instructor-needle',
      classId: 'scout',
      majorMod: 'overdrive',
      side: 'player',
    })
    expect(actors.Spanner).toMatchObject({
      id: 'instructor-spanner',
      classId: 'engineer',
      majorMod: 'hedgehog',
      side: 'player',
    })
    expect(actors.Brick).toMatchObject({
      id: 'instructor-brick',
      classId: 'battle',
      majorMod: 'pontoon',
      side: 'player',
      shield: 1,
    })
    expect(actors.Needle.reloadTime).toBeLessThan(actors.Spanner.reloadTime)

    expect(internals.deployables.map((deployable) => deployable.kind).sort()).toEqual([
      'decoy',
      'mine',
      'steel',
      'tripwire',
    ])
    expect(internals.deployables.every((deployable) =>
      deployable.owner === 'player'
      && deployable.team === 'blue'
      && deployable.ownerTankId.startsWith('instructor-'),
    )).toBe(true)

    const spannerMine = internals.deployables.find((deployable) =>
      deployable.kind === 'mine' && deployable.ownerTankId === actors.Spanner.id,
    )!
    actors.Needle.col = spannerMine.col
    actors.Needle.row = spannerMine.row
    expect(internals.findDeployableTriggerTarget(spannerMine)).toBeNull()

    expect(game.getSnapshot().majorMods).toMatchObject({
      hedgehog: {
        active: true,
        ownerTankId: 'instructor-spanner',
        owner: 'player',
        team: 'blue',
      },
      pontoon: {
        active: true,
        ownerTankId: 'instructor-brick',
        owner: 'player',
        team: 'blue',
      },
    })
  })

  it('uses class shells for instructors and preserves actor loadouts through tank serialization', () => {
    const game = launchMissionThree()
    const internals = game as unknown as ActorMechanicsInternals
    const brick = internals.enemies.find((tank) => tank.callSign === 'Brick')!
    brick.reload = 0

    internals.fire(brick)
    expect(internals.bullets.at(-1)).toMatchObject({
      ownerId: 'instructor-brick',
      classId: 'battle',
      side: 'player',
      team: 'blue',
      damage: 3,
      splashDamage: 1,
    })

    const restored = internals.restoreTank(internals.serializeTank(brick))
    expect(restored).toMatchObject({
      id: 'instructor-brick',
      classId: 'battle',
      majorMod: 'pontoon',
      callSign: 'Brick',
      shield: 1,
    })
  })

  it('keeps ordinary Campaign friendly bot composition classless', () => {
    const game = new TanchikiGame({
      aiEnabled: false,
      saveStore: new MemorySaveStore(),
    })
    const internals = game as unknown as ActorMechanicsInternals
    const campaignAlly = internals.createFriendlyBot({ x: 7, y: 14 })

    expect(campaignAlly).toMatchObject({
      classId: null,
      majorMod: null,
      callSign: null,
      shield: 0,
    })
  })

  it('keeps the Mission 4 flag reserved for the player while instructors escort', () => {
    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = [1, 2, 3]
    const game = new TanchikiGame({
      aiEnabled: false,
      saveStore: new MemorySaveStore(save),
    })
    pressMenu(game)
    pressMenu(game)
    pressMenu(game)
    step(game, 1.25)
    game.primaryAction()
    game.primaryAction()

    const internals = game as unknown as ActorMechanicsInternals & {
      player: Tank
      objectiveState: { flag: { position: { x: number; y: number }; carrierId: string | null } | null }
      updateFlagState(): void
    }
    const flag = internals.objectiveState.flag!
    const needle = internals.enemies.find((tank) => tank.callSign === 'Needle')!
    needle.col = flag.position.x
    needle.row = flag.position.y
    internals.updateFlagState()
    expect(flag.carrierId).toBeNull()

    internals.player.col = flag.position.x
    internals.player.row = flag.position.y
    internals.updateFlagState()
    expect(flag.carrierId).toBe('player')
  })

  it('keeps the first CTF capture clear, then hands the second flag to Brick', () => {
    const save = createDefaultSaveData()
    save.progression.tutorialCompletedMissions = [1, 2, 3]
    const game = new TanchikiGame({
      aiEnabled: false,
      saveStore: new MemorySaveStore(save),
    })
    pressMenu(game)
    pressMenu(game)
    pressMenu(game)
    step(game, 1.25)
    game.primaryAction()

    const internals = game as unknown as ActorMechanicsInternals & {
      player: Tank
      objectiveState: {
        flag: {
          enemyHome: { x: number; y: number }
          playerBase: { x: number; y: number }
          position: { x: number; y: number }
          carrierId: string | null
          captures: number
          capturesToWin: number
          transfer: {
            dropCell: { x: number; y: number }
            receiveCell: { x: number; y: number }
            gateCells: Array<{ x: number; y: number }>
            gateClosed: boolean
            complete: boolean
          }
        } | null
      }
      updateFlagState(): void
      getReadabilitySnapshot(): {
        markers: Array<{ kind: string; label: string; col: number; row: number }>
      }
    }
    const flag = internals.objectiveState.flag!
    const transfer = flag.transfer
    const gate = transfer.gateCells[0]!

    internals.player.col = flag.enemyHome.x
    internals.player.row = flag.enemyHome.y
    flag.position = { ...flag.enemyHome }
    internals.updateFlagState()

    expect(flag.carrierId).toBe('player')
    expect(flag.capturesToWin).toBe(2)
    expect(transfer.gateClosed).toBe(false)
    expect(game.getTile(gate.x, gate.y)?.kind).toBe('empty')

    internals.player.col = flag.playerBase.x
    internals.player.row = flag.playerBase.y
    internals.updateFlagState()
    expect(flag).toMatchObject({
      captures: 1,
      carrierId: null,
      position: flag.enemyHome,
    })

    internals.player.col = flag.enemyHome.x
    internals.player.row = flag.enemyHome.y
    internals.updateFlagState()
    expect(flag.carrierId).toBe('player')
    expect(transfer.gateClosed).toBe(true)
    expect(game.getTile(gate.x, gate.y)?.kind).toBe('steel')

    expect(game.dropCarriedFlag()).toBe(false)
    expect(flag.carrierId).toBe('player')

    internals.player.col = transfer.dropCell.x
    internals.player.row = transfer.dropCell.y
    expect(internals.getReadabilitySnapshot().markers).toContainEqual(expect.objectContaining({
      kind: 'flag-transfer',
      label: 'XFER',
      col: transfer.dropCell.x,
      row: transfer.dropCell.y,
    }))
    expect(game.dropCarriedFlag()).toBe(true)
    expect(flag).toMatchObject({
      carrierId: null,
      position: transfer.receiveCell,
      transfer: {
        gateClosed: true,
        complete: true,
      },
    })
    expect(game.getTile(gate.x, gate.y)?.kind).toBe('steel')

    const brick = internals.enemies.find((tank) => tank.id === 'instructor-brick')!
    internals.updateFlagState()
    brick.col = transfer.receiveCell.x
    brick.row = transfer.receiveCell.y
    internals.updateFlagState()
    expect(flag.carrierId).toBe('instructor-brick')

    brick.col = flag.playerBase.x
    brick.row = flag.playerBase.y
    internals.updateFlagState()
    expect(flag).toMatchObject({
      captures: 2,
      capturesToWin: 2,
      carrierId: null,
      position: flag.enemyHome,
    })
  })

  it('creates the false relay contact and continuously replenishes at most five FFA tanks', () => {
    const game = launchMissionFive()
    const internals = game as unknown as ActorMechanicsInternals & {
      enemiesRemaining: number
      spawnTimer: number
      tutorialDirector: unknown
      updateSpawning(dt: number): void
    }

    let snapshot = game.getSnapshot()
    expect(snapshot).toMatchObject({
      tutorial: { missionId: 5, stepId: 'welcome' },
      objective: { mode: 'ffa', targetScore: 4 },
      level: {
        difficulty: {
          activeEnemyLimit: 5,
          continuousEnemySpawns: true,
        },
      },
    })
    expect(snapshot.deployables.active).toContainEqual(expect.objectContaining({
      kind: 'decoy',
      col: 10,
      row: 11,
      owner: 'neutral',
    }))
    expect(internals.deployables).toContainEqual(expect.objectContaining({ id: 'rook-decoy' }))
    expect(game.getTile(10, 14)?.kind).toBe('ammo')

    confirmWelcome(game)
    expect(game.getSnapshot().tutorial).toMatchObject({ stepId: 'deploy-relay' })
    game.setInput({ relay: true })
    step(game, 1.22)
    game.setInput({ relay: false })
    step(game, 1.3)
    snapshot = game.getSnapshot()
    expect(snapshot.portableRelay).toMatchObject({ deployed: true, col: 10, row: 15 })
    expect(snapshot.portableRelay.signalContacts).toContainEqual(expect.objectContaining({
      kind: 'hostile',
      col: 10,
      row: 11,
    }))
    expect(internals.enemies).toHaveLength(0)

    internals.tutorialDirector = null
    internals.enemiesRemaining = 0
    internals.spawnTimer = 0
    for (let index = 0; index < 8; index += 1) {
      internals.updateSpawning(3.6)
    }
    expect(internals.enemies).toHaveLength(5)
    expect(internals.enemies.every((tank) => tank.side === 'neutral' && tank.maxHp === 4)).toBe(true)

    internals.enemies.splice(0, 2)
    internals.updateSpawning(3.6)
    internals.updateSpawning(3.6)
    expect(internals.enemies).toHaveLength(5)
  })
})

function launchMissionThree() {
  const save = createDefaultSaveData()
  save.progression.tutorialCompletedMissions = [1, 2]
  const game = new TanchikiGame({
    aiEnabled: false,
    saveStore: new MemorySaveStore(save),
  })

  pressMenu(game)
  pressMenu(game)
  pressMenu(game)
  step(game, 1.25)
  game.primaryAction()
  expect(game.getSnapshot()).toMatchObject({
    mode: 'playing',
    runKind: 'tutorial',
    tutorial: { missionId: 3, stepId: 'welcome' },
  })
  return game
}

function launchMissionFive() {
  const save = createDefaultSaveData()
  save.progression.tutorialCompletedMissions = [1, 2, 3, 4]
  const game = new TanchikiGame({
    aiEnabled: false,
    saveStore: new MemorySaveStore(save),
  })

  pressMenu(game)
  pressMenu(game)
  pressMenu(game)
  step(game, 1.25)
  game.primaryAction()
  expect(game.getSnapshot()).toMatchObject({
    mode: 'playing',
    runKind: 'tutorial',
    tutorial: { missionId: 5, stepId: 'welcome' },
  })
  return game
}

function confirmOpeningOrders(game: TanchikiGame) {
  for (let index = 0; index < 8 && game.getSnapshot().tutorial.stepId === 'welcome'; index += 1) {
    game.primaryAction()
  }
  expect(game.getSnapshot().tutorial.stepId).toBe('adaptive')
}

function confirmWelcome(game: TanchikiGame) {
  for (let index = 0; index < 8 && game.getSnapshot().tutorial.stepId === 'welcome'; index += 1) {
    game.primaryAction()
  }
  expect(game.getSnapshot().tutorial.stepId).not.toBe('welcome')
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
