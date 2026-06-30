import { describe, expect, it } from 'vitest'
import { relayProgressTeam } from './onlineRenderer.ts'

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
