import { describe, expect, it } from 'vitest'
import { getCtfHudModel } from './hudCtfStatus.ts'
import type { SavedObjectiveState } from './types.ts'

const FLAG: NonNullable<SavedObjectiveState['flag']> = {
  playerBase: { x: 3, y: 15 },
  enemyHome: { x: 18, y: 1 },
  position: { x: 18, y: 1 },
  carrierId: null,
  captures: 0,
  capturesToWin: 2,
}

describe('CTF HUD model', () => {
  it('shows capture progress instead of unrelated base health', () => {
    expect(getCtfHudModel(FLAG, 'player')).toEqual({
      captures: 0,
      target: 2,
      progress: 0,
      status: 'FLAG',
      carriedByPlayer: false,
    })
  })

  it('shows when the player is carrying the flag', () => {
    expect(getCtfHudModel({ ...FLAG, carrierId: 'player', position: { x: 10, y: 8 } }, 'player')).toMatchObject({
      status: 'CARRY',
      carriedByPlayer: true,
    })
  })

  it('distinguishes a dropped flag and clamps completed progress', () => {
    expect(getCtfHudModel({ ...FLAG, position: { x: 9, y: 7 } }, 'player').status).toBe('DROP')
    expect(getCtfHudModel({ ...FLAG, captures: 5 }, 'player')).toMatchObject({
      captures: 2,
      target: 2,
      progress: 1,
    })
  })
})
