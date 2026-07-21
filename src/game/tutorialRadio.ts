import { ARENA_WIDTH, ARENA_X, ARENA_Y } from './constants.ts'

export const TUTORIAL_RADIO_PANEL = Object.freeze({
  x: ARENA_X + 6,
  y: ARENA_Y + 6,
  width: ARENA_WIDTH - 12,
  height: 76,
})

export function isTutorialRadioPanelPoint(x: number, y: number) {
  return x >= TUTORIAL_RADIO_PANEL.x
    && x <= TUTORIAL_RADIO_PANEL.x + TUTORIAL_RADIO_PANEL.width
    && y >= TUTORIAL_RADIO_PANEL.y
    && y <= TUTORIAL_RADIO_PANEL.y + TUTORIAL_RADIO_PANEL.height
}
