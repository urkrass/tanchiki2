import {
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  clampBattlefieldCameraFractional,
  type BattlefieldCamera,
} from '../game/battlefield.ts'
import type { MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'

export const ONLINE_MAP_COLS = 20
export const ONLINE_MAP_ROWS = 16
export const ONLINE_CAMERA_SMOOTHING_MS = 180

export interface OnlineCameraState {
  current: BattlefieldCamera
  target: BattlefieldCamera
  smoothingMs: number
}

export function getOnlineTargetCamera(
  snapshot: MultiplayerSnapshot,
  visual: InterpolatedOnlineSnapshot | null,
  mapCols = ONLINE_MAP_COLS,
  mapRows = ONLINE_MAP_ROWS,
): BattlefieldCamera | null {
  const visualSelf = visual?.players.find((player) => player.self)
  const snapshotSelf = snapshot.players.find((player) => player.self)
  const col = visualSelf?.visualCol ?? snapshotSelf?.col
  const row = visualSelf?.visualRow ?? snapshotSelf?.row

  if (col === undefined || row === undefined) {
    return null
  }

  return clampBattlefieldCameraFractional(
    {
      col: col - Math.floor(BATTLEFIELD_VIEW_COLS / 2),
      row: row - Math.floor(BATTLEFIELD_VIEW_ROWS / 2),
    },
    mapCols,
    mapRows,
  )
}

export function stepOnlineCamera(
  current: BattlefieldCamera,
  target: BattlefieldCamera,
  dt: number,
  smoothingMs = ONLINE_CAMERA_SMOOTHING_MS,
): BattlefieldCamera {
  const safeDt = Math.max(0, dt)
  const smoothingSeconds = Math.max(0.001, smoothingMs / 1000)
  const alpha = 1 - Math.exp(-safeDt / smoothingSeconds)
  const next = {
    col: lerp(current.col, target.col, alpha),
    row: lerp(current.row, target.row, alpha),
  }

  return {
    col: snapNear(next.col, target.col),
    row: snapNear(next.row, target.row),
  }
}

export function createOnlineCameraState(
  previous: OnlineCameraState | null,
  target: BattlefieldCamera | null,
  dt: number,
  smoothingMs = ONLINE_CAMERA_SMOOTHING_MS,
): OnlineCameraState | null {
  if (!target) {
    return null
  }

  if (!previous) {
    return { current: target, target, smoothingMs }
  }

  return {
    current: stepOnlineCamera(previous.current, target, dt, smoothingMs),
    target,
    smoothingMs,
  }
}

function lerp(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha
}

function snapNear(value: number, target: number) {
  return Math.abs(value - target) < 0.001 ? target : value
}
