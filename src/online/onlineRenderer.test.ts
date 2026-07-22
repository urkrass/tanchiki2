import { describe, expect, it } from 'vitest'
import { BATTLEFIELD_TILE_SIZE } from '../game/battlefield.ts'
import { getOnlineDeployableSpriteRect, relayProgressTeam } from './onlineRenderer.ts'

describe('online relay progress coloring', () => {
  it('uses the capturing team while a neutral relay is in progress', () => {
    expect(relayProgressTeam({ owner: null, captureTeam: 'blue', progress: 0.5 })).toBe('blue')
  })

  it('uses the capturing team while an owned relay is being taken over', () => {
    expect(relayProgressTeam({ owner: 'red', captureTeam: 'blue', progress: 0.5 })).toBe('blue')
  })

  it('uses owner or neutral state when no capture is in progress', () => {
    expect(relayProgressTeam({ owner: 'red', captureTeam: 'blue', progress: 1 })).toBe('red')
    expect(relayProgressTeam({ owner: null, captureTeam: 'blue', progress: 0 })).toBeNull()
  })
})

describe('online deployed-equipment visuals', () => {
  it('centers the full canonical battlefield sprite on its authoritative cell', () => {
    expect(getOnlineDeployableSpriteRect(216, 168)).toEqual({
      x: 216 - BATTLEFIELD_TILE_SIZE / 2,
      y: 168 - BATTLEFIELD_TILE_SIZE / 2,
      size: BATTLEFIELD_TILE_SIZE,
    })
  })
})
