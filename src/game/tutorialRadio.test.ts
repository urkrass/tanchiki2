import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore } from './save.ts'
import { TUTORIAL_RADIO_PANEL, isTutorialRadioPanelPoint } from './tutorialRadio.ts'

describe('tutorial radio panel geometry', () => {
  it('uses the rendered panel bounds for tutorial pointer confirmation', () => {
    expect(isTutorialRadioPanelPoint(
      TUTORIAL_RADIO_PANEL.x + TUTORIAL_RADIO_PANEL.width / 2,
      TUTORIAL_RADIO_PANEL.y + TUTORIAL_RADIO_PANEL.height / 2,
    )).toBe(true)
    expect(isTutorialRadioPanelPoint(TUTORIAL_RADIO_PANEL.x - 1, TUTORIAL_RADIO_PANEL.y)).toBe(false)

    const game = new TanchikiGame({ aiEnabled: false, saveStore: new MemorySaveStore() })
    for (let index = 0; index < 3; index += 1) {
      game.primaryAction()
      for (let frame = 0; frame < 9; frame += 1) game.update(1 / 60)
    }
    for (let frame = 0; frame < 75; frame += 1) game.update(1 / 60)
    game.primaryAction()
    expect(game.isTutorialRadioPoint(
      TUTORIAL_RADIO_PANEL.x + TUTORIAL_RADIO_PANEL.width / 2,
      TUTORIAL_RADIO_PANEL.y + TUTORIAL_RADIO_PANEL.height / 2,
    )).toBe(true)
  })
})
