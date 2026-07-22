import { describe, expect, it } from 'vitest'
import { MULTIPLAYER_TUNING, type MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import {
  ONLINE_INTERPOLATION_DELAY_MS,
  ONLINE_SNAPSHOT_HISTORY_LIMIT,
  appendSnapshotHistory,
  interpolateOnlineSnapshot,
  type SnapshotHistoryEntry,
} from './onlineInterpolation.ts'

function snapshot(time: number, overrides: Partial<MultiplayerSnapshot> = {}): MultiplayerSnapshot {
  return {
    kind: 'multiplayer-snapshot',
    roomId: 'room-1',
    playerId: 'blue-1',
    team: 'blue',
    phase: 'playing',
    levelName: 'Relay Yard',
    time,
    timeRemaining: 420,
    serverTick: Math.round(time * 20),
    lastProcessedInputSeq: 3,
    scores: { blue: 0, red: 0 },
    winner: null,
    self: {
      classId: 'scout', hp: 3, maxHp: 3, shield: 0, shells: 10, shellCapacity: 10,
      shellRechargeProgress: 0, onAmmoStation: false, reload: 0, reloadDuration: 0.6,
      equipment: [],
    },
    visibleCells: [{ col: 5, row: 14 }],
    visibleTerrain: [{ col: 5, row: 14, kind: 'empty' }],
    players: [
      {
        id: 'blue-1',
        name: 'Scout',
        team: 'blue',
        classId: 'scout',
        col: 5,
        row: 14,
        dir: 'right',
        hp: 3,
        maxHp: 3,
        alive: true,
        self: true,
        move: null,
      },
    ],
    bullets: [],
    deployables: [],
    equipmentAlerts: [],
    retranslators: [],
    lastKnown: [],
    radio: [],
    pings: [],
    teamVisionMerged: false,
    vision: {
      circles: [{ id: 'blue-1', kind: 'self', x: 5.5, y: 14.5, radius: 2.75 }],
    },
    fog: {
      shape: 'circular',
      visibleCellCount: 1,
      hiddenCellCount: 319,
      visibleRetranslatorCount: 0,
      visionCircleCount: 1,
      teamVisionMerged: false,
    },
    ...overrides,
  }
}

describe('online snapshot interpolation', () => {
  it('keeps only the newest snapshot history entries', () => {
    let history: SnapshotHistoryEntry[] = []

    for (let index = 0; index < 26; index += 1) {
      history = appendSnapshotHistory(history, snapshot(index), 1000 + index)
    }

    expect(history).toHaveLength(ONLINE_SNAPSHOT_HISTORY_LIMIT)
    expect(history[0].snapshot.time).toBe(2)
    expect(history[ONLINE_SNAPSHOT_HISTORY_LIMIT - 1].snapshot.time).toBe(25)
  })

  it('interpolates player and bullet positions between authoritative snapshots', () => {
    const history: SnapshotHistoryEntry[] = [
      {
        snapshot: snapshot(1, {
          players: [
            {
              ...snapshot(1).players[0],
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              classId: 'scout',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              maxHp: 3,
              alive: true,
              self: false,
              move: null,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'blue', shellKind: 'scout-shell', x: 5.2, y: 14.5, dir: 'right' }],
        }),
        receivedAt: 1000,
      },
      {
        snapshot: snapshot(1.1, {
          players: [
            {
              ...snapshot(1).players[0],
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              classId: 'scout',
              col: 6,
              row: 14,
              dir: 'right',
              hp: 3,
              maxHp: 3,
              alive: true,
              self: false,
              move: null,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'blue', shellKind: 'scout-shell', x: 6.2, y: 14.5, dir: 'right' }],
        }),
        receivedAt: 1100,
      },
    ]

    const visual = interpolateOnlineSnapshot(history, 1125, ONLINE_INTERPOLATION_DELAY_MS)

    expect(visual?.players[0].visualCol).toBeCloseTo(5.5)
    expect(visual?.players[0].visualRow).toBeCloseTo(14)
    expect(visual?.bullets[0].visualX).toBeCloseTo(5.7)
    expect(visual?.bullets[0].visualY).toBeCloseTo(14.5)
  })

  it('does not interpolate hidden or disappeared entities absent from the latest filtered snapshot', () => {
    const history: SnapshotHistoryEntry[] = [
      {
        snapshot: snapshot(1, {
          players: [
            {
              ...snapshot(1).players[0],
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              classId: 'scout',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              maxHp: 3,
              alive: true,
              self: true,
              move: null,
            },
            {
              ...snapshot(1).players[0],
              id: 'red-1',
              name: 'Raider',
              team: 'red',
              classId: 'battle',
              col: 5,
              row: 12,
              dir: 'down',
              hp: 3,
              maxHp: 3,
              alive: true,
              self: false,
              move: null,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'red', shellKind: 'battle-shell', x: 5.5, y: 12.8, dir: 'down' }],
        }),
        receivedAt: 1000,
      },
      {
        snapshot: snapshot(1.1, {
          players: [
            {
              ...snapshot(1).players[0],
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              classId: 'scout',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              maxHp: 3,
              alive: true,
              self: true,
              move: null,
            },
          ],
          bullets: [],
        }),
        receivedAt: 1100,
      },
    ]

    const visual = interpolateOnlineSnapshot(history, 1170)

    expect(visual?.players.map((player) => player.id)).toEqual(['blue-1'])
    expect(visual?.bullets).toEqual([])
  })

  it('derives online player visuals from continuous tile movement metadata', () => {
    const movingPlayer = (progress: number) => ({
      id: 'blue-1',
      name: 'Scout',
      team: 'blue' as const,
      classId: 'scout' as const,
      col: 6,
      row: 14,
      dir: 'right' as const,
      hp: 3,
      maxHp: 3,
      alive: true,
      self: true,
      move: {
        fromCol: 5,
        fromRow: 14,
        toCol: 6,
        toRow: 14,
        progress,
        duration: MULTIPLAYER_TUNING.moveCooldown,
      },
    })
    const history: SnapshotHistoryEntry[] = [
      { snapshot: snapshot(1, { players: [movingPlayer(0)] }), receivedAt: 1000 },
      { snapshot: snapshot(1.1, { players: [movingPlayer(0.5)] }), receivedAt: 1100 },
    ]

    const visual = interpolateOnlineSnapshot(history, 1170, ONLINE_INTERPOLATION_DELAY_MS)

    expect(visual?.players[0].visualCol).toBeCloseTo(
      5 + 0.5 + 0.07 / MULTIPLAYER_TUNING.moveCooldown,
    )
    expect(visual?.players[0].visualRow).toBeCloseTo(14)
    expect(visual?.animation).toMatchObject({
      continuousTileMovement: true,
      movingPlayerCount: 1,
      localSelfExtrapolationMs: 70,
      selfMove: {
        from: { col: 5, row: 14 },
        to: { col: 6, row: 14 },
        progress: 0.5,
        duration: MULTIPLAYER_TUNING.moveCooldown,
      },
    })

    const staleVisual = interpolateOnlineSnapshot(history, 1500, ONLINE_INTERPOLATION_DELAY_MS)
    expect(staleVisual?.players[0].visualCol).toBe(6)
    expect(staleVisual?.animation.localSelfExtrapolationMs).toBe(
      MULTIPLAYER_TUNING.moveCooldown * 500,
    )
  })

  it('does not rewind an authorized local move when a delayed snapshot arrives', () => {
    const movingPlayer = (progress: number) => ({
      ...snapshot(1).players[0],
      col: 6,
      move: {
        fromCol: 5,
        fromRow: 14,
        toCol: 6,
        toRow: 14,
        progress,
        duration: MULTIPLAYER_TUNING.moveCooldown,
      },
    })
    const first: SnapshotHistoryEntry = {
      snapshot: snapshot(1, { players: [movingPlayer(0)] }),
      receivedAt: 1000,
    }
    const beforeDelayedSnapshot = interpolateOnlineSnapshot([first], 1090)
    const afterDelayedSnapshot = interpolateOnlineSnapshot([
      first,
      {
        snapshot: snapshot(1.05, { players: [movingPlayer(0.1)] }),
        receivedAt: 1100,
      },
    ], 1100)

    expect(afterDelayedSnapshot?.players[0].visualCol).toBeGreaterThanOrEqual(
      beforeDelayedSnapshot?.players[0].visualCol ?? 0,
    )
    expect(afterDelayedSnapshot?.players[0].visualCol).toBeCloseTo(5 + 0.1 / MULTIPLAYER_TUNING.moveCooldown)
  })

  it('retains a local move anchor across the former six-snapshot eviction boundary', () => {
    const duration = 0.464
    let history: SnapshotHistoryEntry[] = []
    for (let index = 0; index < 6; index += 1) {
      const progress = index * 0.05 / duration
      history = appendSnapshotHistory(history, snapshot(1 + index * 0.05, {
        players: [{
          ...snapshot(1).players[0],
          col: 6,
          move: {
            fromCol: 5,
            fromRow: 14,
            toCol: 6,
            toRow: 14,
            progress,
            duration,
          },
        }],
      }), 1_000 + index * 50 + (index === 0 ? 0 : 20))
    }
    const beforeNextSnapshot = interpolateOnlineSnapshot(history, 1_319)
    history = appendSnapshotHistory(history, snapshot(1.3, {
      players: [{
        ...snapshot(1).players[0],
        col: 6,
        move: {
          fromCol: 5,
          fromRow: 14,
          toCol: 6,
          toRow: 14,
          progress: 0.3 / duration,
          duration,
        },
      }],
    }), 1_320)
    const afterNextSnapshot = interpolateOnlineSnapshot(history, 1_320)

    expect(history).toHaveLength(7)
    expect(afterNextSnapshot?.players[0].visualCol).toBeGreaterThanOrEqual(
      beforeNextSnapshot?.players[0].visualCol ?? 0,
    )
  })

  it('does not rewind local presentation when an authoritative move completes', () => {
    const movingPlayer = {
      ...snapshot(1).players[0],
      col: 6,
      move: {
        fromCol: 5,
        fromRow: 14,
        toCol: 6,
        toRow: 14,
        progress: 0.5,
        duration: MULTIPLAYER_TUNING.moveCooldown,
      },
    }
    const moving: SnapshotHistoryEntry = {
      snapshot: snapshot(1, { players: [movingPlayer] }),
      receivedAt: 1_000,
    }
    const beforeCompletion = interpolateOnlineSnapshot([moving], 1_250)
    const afterCompletion = interpolateOnlineSnapshot([
      moving,
      {
        snapshot: snapshot(1.2, {
          players: [{ ...snapshot(1).players[0], col: 6, move: null }],
        }),
        receivedAt: 1_260,
      },
    ], 1_260)

    expect(beforeCompletion?.players[0].visualCol).toBe(6)
    expect(afterCompletion?.players[0].visualCol).toBeGreaterThanOrEqual(
      beforeCompletion?.players[0].visualCol ?? 0,
    )
    expect(afterCompletion?.players[0].visualCol).toBe(6)
  })

  it('snaps player visuals across respawn state changes and teleport-sized jumps', () => {
    const deadAtKillCell = {
      ...snapshot(1).players[0],
      col: 13,
      row: 2,
      alive: false,
    }
    const respawned = {
      ...snapshot(1).players[0],
      col: 5,
      row: 14,
      alive: true,
    }
    const history: SnapshotHistoryEntry[] = [
      { snapshot: snapshot(1, { players: [deadAtKillCell] }), receivedAt: 1000 },
      { snapshot: snapshot(1.1, { players: [respawned] }), receivedAt: 1100 },
    ]

    const visual = interpolateOnlineSnapshot(history, 1125, ONLINE_INTERPOLATION_DELAY_MS)

    expect(visual?.players[0]).toMatchObject({
      visualCol: 5,
      visualRow: 14,
      alive: true,
    })
  })

  it('smooths first-seen bullets from a synthetic previous position', () => {
    const history: SnapshotHistoryEntry[] = [
      { snapshot: snapshot(1, { bullets: [] }), receivedAt: 1000 },
      {
        snapshot: snapshot(1.1, {
          bullets: [{ id: 'bullet-1', team: 'blue', shellKind: 'scout-shell', x: 6.2, y: 14.5, dir: 'right' }],
        }),
        receivedAt: 1100,
      },
    ]

    const visual = interpolateOnlineSnapshot(history, 1125, ONLINE_INTERPOLATION_DELAY_MS)
    const syntheticPreviousX = 6.2 - MULTIPLAYER_TUNING.bulletSpeed * 0.1

    expect(visual?.bullets[0].visualX).toBeGreaterThan(syntheticPreviousX)
    expect(visual?.bullets[0].visualX).toBeLessThan(6.2)
    expect(visual?.bullets[0].visualX).toBeCloseTo((syntheticPreviousX + 6.2) / 2)
    expect(visual?.bullets[0].visualY).toBeCloseTo(14.5)
  })

  it('reports animation diagnostics for render_game_to_text', () => {
    const history: SnapshotHistoryEntry[] = [
      { snapshot: snapshot(1), receivedAt: 1000 },
      { snapshot: snapshot(1.1, { players: [{ ...snapshot(1).players[0], col: 6 }] }), receivedAt: 1100 },
    ]

    const visual = interpolateOnlineSnapshot(history, 1125)

    expect(visual?.animation).toMatchObject({
      snapshotBufferSize: 2,
      interpolationDelayMs: 75,
      localSelfExtrapolationMs: 0,
      renderAlpha: 0.5,
      visualSelf: { id: 'blue-1', x: 6, y: 14 },
    })
  })
})
