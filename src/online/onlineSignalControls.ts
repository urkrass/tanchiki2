import { TEAM_RADIO_COMMANDS, type TeamRadioCommand } from '../../packages/shared/src/index.ts'
import { ARENA_X, HUD_X } from '../game/constants.ts'

export const ONLINE_PING_BUTTON = Object.freeze({ x: HUD_X + 6, y: 242, width: 84, height: 38 })
export const ONLINE_RADIO_BUTTON = Object.freeze({ x: HUD_X + 6, y: 286, width: 84, height: 42 })
export const ONLINE_RADIO_PANEL = Object.freeze({ x: ARENA_X + 96, y: 90, width: 224, height: 260 })
export const ONLINE_RADIO_OPTION_HEIGHT = 32
export const ONLINE_RADIO_OPTION_GAP = 4
export const ONLINE_RADIO_OPTION_Y = ONLINE_RADIO_PANEL.y + 42

export type OnlineSignalControlHit = 'ping' | 'radio' | { command: TeamRadioCommand }

export function getOnlineRadioOptionRect(index: number) {
  return {
    x: ONLINE_RADIO_PANEL.x + 16,
    y: ONLINE_RADIO_OPTION_Y + index * (ONLINE_RADIO_OPTION_HEIGHT + ONLINE_RADIO_OPTION_GAP),
    width: ONLINE_RADIO_PANEL.width - 32,
    height: ONLINE_RADIO_OPTION_HEIGHT,
  }
}

export function getOnlineSignalControlHit(x: number, y: number, radioOpen: boolean): OnlineSignalControlHit | null {
  if (radioOpen) {
    for (let index = 0; index < TEAM_RADIO_COMMANDS.length; index += 1) {
      if (pointInRect(x, y, getOnlineRadioOptionRect(index))) {
        return { command: TEAM_RADIO_COMMANDS[index] }
      }
    }
    return null
  }

  if (pointInRect(x, y, ONLINE_PING_BUTTON)) return 'ping'
  if (pointInRect(x, y, ONLINE_RADIO_BUTTON)) return 'radio'
  return null
}

function pointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
