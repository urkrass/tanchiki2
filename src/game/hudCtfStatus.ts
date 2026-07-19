import type { SavedObjectiveState } from './types.ts'

type FlagState = NonNullable<SavedObjectiveState['flag']>

export interface CtfHudModel {
  captures: number
  target: number
  progress: number
  status: 'FLAG' | 'CARRY' | 'DROP'
  carriedByPlayer: boolean
}

export function getCtfHudModel(flag: FlagState, playerId: string): CtfHudModel {
  const target = Math.max(1, Math.round(flag.capturesToWin))
  const captures = Math.max(0, Math.min(target, Math.round(flag.captures)))
  const carriedByPlayer = flag.carrierId === playerId
  const atHome = flag.position.x === flag.enemyHome.x && flag.position.y === flag.enemyHome.y

  return {
    captures,
    target,
    progress: captures / target,
    status: flag.carrierId ? 'CARRY' : atHome ? 'FLAG' : 'DROP',
    carriedByPlayer,
  }
}
