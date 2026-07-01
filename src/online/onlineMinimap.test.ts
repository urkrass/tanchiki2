import { describe, expect, it } from 'vitest'
import type { MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import { ONLINE_MINIMAP_FOG_POLICY, buildOnlineMinimapModel } from './onlineMinimap.ts'

function snapshot(): MultiplayerSnapshot {
  return {
    kind: 'multiplayer-snapshot',
    roomId: 'room-1',
    playerId: 'blue-1',
    team: 'blue',
    phase: 'playing',
    levelName: 'Relay Yard',
    time: 1,
    timeRemaining: 420,
    scores: { blue: 0, red: 0 },
    winner: null,
    visibleCells: [
      { col: 5, row: 14 },
      { col: 6, row: 14 },
    ],
    visibleTerrain: [
      { col: 5, row: 14, kind: 'empty' },
      { col: 6, row: 14, kind: 'brick' },
      { col: 10, row: 7, kind: 'steel' },
    ],
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
        move: null,
      },
      {
        id: 'red-1',
        name: 'Raider',
        team: 'red',
        col: 10,
        row: 7,
        dir: 'down',
        hp: 3,
        alive: true,
        self: false,
        move: null,
      },
    ],
    bullets: [{ id: 'bullet-1', team: 'red', x: 10.5, y: 7.5, dir: 'down' }],
    retranslators: [
      { id: 'relay-visible', col: 6, row: 14, owner: 'blue', captureTeam: 'blue', progress: 1 },
      { id: 'relay-hidden', col: 10, row: 7, owner: null, captureTeam: null, progress: 0 },
    ],
    lastKnown: [{ id: 'red-1', team: 'red', col: 10, row: 7, seenAt: 0.5 }],
    chat: [],
    pings: [
      { id: 'ping-visible', team: 'blue', playerId: 'blue-1', col: 6, row: 14, at: 1 },
      { id: 'ping-hidden', team: 'blue', playerId: 'blue-1', col: 10, row: 7, at: 1 },
    ],
    teamVisionMerged: false,
    vision: {
      circles: [{ id: 'blue-1', kind: 'self', x: 5.5, y: 14.5, radius: 2.75 }],
    },
    fog: {
      shape: 'circular',
      visibleCellCount: 2,
      hiddenCellCount: 318,
      visibleRetranslatorCount: 1,
      visionCircleCount: 1,
      teamVisionMerged: false,
    },
  }
}

describe('online minimap model', () => {
  it('uses only visible snapshot cells for terrain, players, relays, and pings', () => {
    const model = buildOnlineMinimapModel(snapshot(), { col: 1.25, row: 2.5 })

    expect(model.fogPolicy).toBe(ONLINE_MINIMAP_FOG_POLICY)
    expect(model.terrain.map((tile) => `${tile.col},${tile.row}`)).toEqual(['5,14', '6,14'])
    expect(model.players.map((player) => player.id)).toEqual(['blue-1'])
    expect(model.retranslators.map((relay) => relay.id)).toEqual(['relay-visible'])
    expect(model.pings.map((ping) => ping.id)).toEqual(['ping-visible'])
  })

  it('reports compact debug values and the current smoothed viewport', () => {
    const model = buildOnlineMinimapModel(snapshot(), { col: 1.25, row: 2.5 })

    expect(model).toMatchObject({
      enabled: true,
      fogPolicy: 'circular-live-vision-only',
      visibleCellCount: 2,
      visibleRetranslatorCount: 1,
      visionCircles: [{ id: 'blue-1', kind: 'self', x: 5.5, y: 14.5, radius: 2.75 }],
      viewport: { col: 1.25, row: 2.5, cols: 13, rows: 13 },
    })
  })
})
