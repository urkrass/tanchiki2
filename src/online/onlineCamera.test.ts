import { describe, expect, it } from 'vitest'
import type { MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'
import { createOnlineCameraState, getOnlineTargetCamera } from './onlineCamera.ts'

function snapshot(col: number, row: number): MultiplayerSnapshot {
  return {
    kind: 'multiplayer-snapshot',
    roomId: 'room-1',
    playerId: 'blue-1',
    team: 'blue',
    phase: 'playing',
    levelName: 'Relay Yard',
    time: 1,
    timeRemaining: 420,
    serverTick: 20,
    lastProcessedInputSeq: 3,
    scores: { blue: 0, red: 0 },
    winner: null,
    self: selfSnapshot(),
    visibleCells: [{ col, row }],
    visibleTerrain: [{ col, row, kind: 'empty' }],
    players: [
      {
        id: 'blue-1',
        name: 'Scout',
        team: 'blue',
        classId: 'scout',
        col,
        row,
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
      circles: [{ id: 'blue-1', kind: 'self', x: col + 0.5, y: row + 0.5, radius: 2.75 }],
    },
    fog: {
      shape: 'circular',
      visibleCellCount: 1,
      hiddenCellCount: 319,
      visibleRetranslatorCount: 0,
      visionCircleCount: 1,
      teamVisionMerged: false,
    },
  }
}

function selfSnapshot(): MultiplayerSnapshot['self'] {
  return {
    classId: 'scout', hp: 3, maxHp: 3, shield: 0, shells: 10, shellCapacity: 10,
    shellRechargeProgress: 0, onAmmoStation: false, reload: 0, reloadDuration: 0.6,
    equipment: [],
  }
}

function visual(col: number, row: number): InterpolatedOnlineSnapshot {
  const base = snapshot(5, 14)

  return {
    snapshot: base,
    players: [{ ...base.players[0], visualCol: col, visualRow: row }],
    bullets: [],
    animation: {
      snapshotBufferSize: 2,
      interpolationDelayMs: 75,
      localSelfExtrapolationMs: 0,
      renderAlpha: 0.5,
      visualTime: 1,
      continuousTileMovement: true,
      movingPlayerCount: 0,
      visualSelf: { id: 'blue-1', x: col, y: row },
      selfMove: null,
    },
  }
}

describe('online camera smoothing', () => {
  it('initializes immediately to the first target camera', () => {
    const state = createOnlineCameraState(null, { col: 7, row: 3 }, 0)

    expect(state?.current).toEqual({ col: 7, row: 3 })
    expect(state?.target).toEqual({ col: 7, row: 3 })
  })

  it('approaches the target over multiple steps without overshooting', () => {
    let state = createOnlineCameraState(null, { col: 0, row: 0 }, 0)
    state = createOnlineCameraState(state, { col: 7, row: 3 }, 0.09)
    const firstCol = state?.current.col ?? 0
    const firstRow = state?.current.row ?? 0

    expect(firstCol).toBeGreaterThan(0)
    expect(firstCol).toBeLessThan(7)
    expect(firstRow).toBeGreaterThan(0)
    expect(firstRow).toBeLessThan(3)

    state = createOnlineCameraState(state, { col: 7, row: 3 }, 0.09)

    expect(state?.current.col).toBeGreaterThan(firstCol)
    expect(state?.current.col).toBeLessThan(7)
    expect(state?.current.row).toBeGreaterThan(firstRow)
    expect(state?.current.row).toBeLessThan(3)
  })

  it('clamps target cameras at multiplayer map edges', () => {
    expect(getOnlineTargetCamera(snapshot(0, 0), null)).toEqual({ col: 0, row: 0 })
    expect(getOnlineTargetCamera(snapshot(19, 15), null)).toEqual({ col: 7, row: 3 })
  })

  it('targets interpolated visual self position when available', () => {
    expect(getOnlineTargetCamera(snapshot(5, 14), visual(10, 7))).toEqual({ col: 4, row: 1 })
  })
})
