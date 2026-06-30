import { describe, expect, it } from 'vitest'
import type { MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import {
  ONLINE_INTERPOLATION_DELAY_MS,
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
    scores: { blue: 0, red: 0 },
    winner: null,
    visibleCells: [{ col: 5, row: 14 }],
    visibleTerrain: [{ col: 5, row: 14, kind: 'empty' }],
    players: [
      {
        id: 'blue-1',
        name: 'Scout',
        team: 'blue',
        col: 5,
        row: 14,
        dir: 'right',
        hp: 3,
        alive: true,
        self: true,
      },
    ],
    bullets: [],
    retranslators: [],
    lastKnown: [],
    chat: [],
    pings: [],
    teamVisionMerged: false,
    fog: {
      visibleCellCount: 1,
      hiddenCellCount: 319,
      visibleRetranslatorCount: 0,
      teamVisionMerged: false,
    },
    ...overrides,
  }
}

describe('online snapshot interpolation', () => {
  it('keeps only the newest snapshot history entries', () => {
    let history: SnapshotHistoryEntry[] = []

    for (let index = 0; index < 8; index += 1) {
      history = appendSnapshotHistory(history, snapshot(index), 1000 + index, 6)
    }

    expect(history).toHaveLength(6)
    expect(history[0].snapshot.time).toBe(2)
    expect(history[5].snapshot.time).toBe(7)
  })

  it('interpolates player and bullet positions between authoritative snapshots', () => {
    const history: SnapshotHistoryEntry[] = [
      {
        snapshot: snapshot(1, {
          players: [
            {
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              alive: true,
              self: true,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'blue', x: 5.2, y: 14.5, dir: 'right' }],
        }),
        receivedAt: 1000,
      },
      {
        snapshot: snapshot(1.1, {
          players: [
            {
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              col: 6,
              row: 14,
              dir: 'right',
              hp: 3,
              alive: true,
              self: true,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'blue', x: 6.2, y: 14.5, dir: 'right' }],
        }),
        receivedAt: 1100,
      },
    ]

    const visual = interpolateOnlineSnapshot(history, 1170, ONLINE_INTERPOLATION_DELAY_MS)

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
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              alive: true,
              self: true,
            },
            {
              id: 'red-1',
              name: 'Raider',
              team: 'red',
              col: 5,
              row: 12,
              dir: 'down',
              hp: 3,
              alive: true,
              self: false,
            },
          ],
          bullets: [{ id: 'bullet-1', team: 'red', x: 5.5, y: 12.8, dir: 'down' }],
        }),
        receivedAt: 1000,
      },
      {
        snapshot: snapshot(1.1, {
          players: [
            {
              id: 'blue-1',
              name: 'Scout',
              team: 'blue',
              col: 5,
              row: 14,
              dir: 'right',
              hp: 3,
              alive: true,
              self: true,
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

  it('reports animation diagnostics for render_game_to_text', () => {
    const history: SnapshotHistoryEntry[] = [
      { snapshot: snapshot(1), receivedAt: 1000 },
      { snapshot: snapshot(1.1, { players: [{ ...snapshot(1).players[0], col: 6 }] }), receivedAt: 1100 },
    ]

    const visual = interpolateOnlineSnapshot(history, 1170)

    expect(visual?.animation).toMatchObject({
      snapshotBufferSize: 2,
      interpolationDelayMs: 120,
      renderAlpha: 0.5,
      visualSelf: { id: 'blue-1', x: 5.5, y: 14 },
    })
  })
})
