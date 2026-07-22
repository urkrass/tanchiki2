import { describe, expect, it } from 'vitest'
import { TEAM_RADIO_COMMANDS } from '../../packages/shared/src/index.ts'
import {
  ONLINE_PING_BUTTON,
  ONLINE_RADIO_BUTTON,
  getOnlineRadioOptionRect,
  getOnlineSignalControlHit,
} from './onlineSignalControls.ts'

describe('online signal controls', () => {
  it('provides separate large ping and radio touch targets during play', () => {
    expect(ONLINE_PING_BUTTON.width * ONLINE_PING_BUTTON.height).toBeGreaterThan(3_000)
    expect(ONLINE_RADIO_BUTTON.width * ONLINE_RADIO_BUTTON.height).toBeGreaterThan(3_000)
    expect(getOnlineSignalControlHit(ONLINE_PING_BUTTON.x + 10, ONLINE_PING_BUTTON.y + 10, false)).toBe('ping')
    expect(getOnlineSignalControlHit(ONLINE_RADIO_BUTTON.x + 10, ONLINE_RADIO_BUTTON.y + 10, false)).toBe('radio')
  })

  it('maps every open selector row to one fixed command and consumes no free text', () => {
    expect(TEAM_RADIO_COMMANDS.map((_, index) => {
      const rect = getOnlineRadioOptionRect(index)
      return getOnlineSignalControlHit(rect.x + rect.width / 2, rect.y + rect.height / 2, true)
    })).toEqual(TEAM_RADIO_COMMANDS.map((command) => ({ command })))
    expect(getOnlineSignalControlHit(ONLINE_RADIO_BUTTON.x + 10, ONLINE_RADIO_BUTTON.y + 10, true)).toBeNull()
  })
})
