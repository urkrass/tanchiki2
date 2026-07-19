import { describe, expect, it, vi } from 'vitest'
import {
  ARENA_X,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
} from './constants.ts'
import { InputController, PointerButtonTracker, getMenuPointerIndex, routeInputButton } from './input.ts'
import { getTouchControlAt } from './touchControls.ts'
import type { TanchikiGame } from './game.ts'
import type { InputState } from './types.ts'

type Listener = (event: any) => void

class FakeEventTarget {
  private readonly listeners = new Map<string, Listener[]>()

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? []
    this.listeners.set(type, listeners.filter((entry) => entry !== listener))
  }

  dispatch(type: string, event: Record<string, unknown>) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

class FakeCanvas extends FakeEventTarget {
  readonly focus = vi.fn()
  readonly setPointerCapture = vi.fn()
  readonly ownerDocument = { fullscreenElement: null }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
    }
  }
}

class FakeGame {
  readonly buttonEvents: string[] = []
  readonly heldButtons: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    relay: false,
    mod: false,
    decoy: false,
    mine: false,
    noise: false,
    steel: false,
    tripwire: false,
  }
  releaseCount = 0
  dropFlagCount = 0
  restartCount = 0
  menuPointerIndex: number | null = null
  readonly selectedMenuIndices: number[] = []
  primaryActionCount = 0
  private mode = 'playing'

  setMode(mode: string) {
    this.mode = mode
  }

  getMode() {
    return this.mode
  }

  setButton(button: keyof InputState, down: boolean) {
    this.heldButtons[button] = down
    this.buttonEvents.push(`${button}:${down}`)
  }

  releaseControls() {
    this.releaseCount += 1
    for (const button of Object.keys(this.heldButtons) as Array<keyof InputState>) {
      this.heldButtons[button] = false
    }
  }

  setTouchControlsVisible() {}
  primaryAction() {
    this.primaryActionCount += 1
  }
  togglePause() {}
  selectMenuIndex(index: number) {
    this.selectedMenuIndices.push(index)
  }
  navigateMenu() {}
  back() {}
  getMenuPointerIndex() {
    return this.menuPointerIndex
  }
  dropCarriedFlag() {
    this.dropFlagCount += 1
  }
  restart() {
    this.restartCount += 1
  }
}

function createPreventableEvent(fields: Record<string, unknown>) {
  return {
    ...fields,
    preventDefault: vi.fn(),
    repeat: false,
  }
}

function installFakeWindow(fakeWindow: FakeEventTarget) {
  const globals = globalThis as unknown as { window?: unknown }
  const previousWindow = globals.window
  globals.window = fakeWindow

  return () => {
    if (previousWindow === undefined) {
      delete globals.window
      return
    }

    globals.window = previousWindow
  }
}

function createControllerHarness(onlineActive = false) {
  const fakeWindow = new FakeEventTarget()
  const restoreWindow = installFakeWindow(fakeWindow)
  const canvas = new FakeCanvas()
  const game = new FakeGame()
  const onlineEvents: string[] = []
  const online = {
    active: onlineActive,
    releaseCount: 0,
    isActive() {
      return this.active
    },
    releaseControls() {
      this.releaseCount += 1
    },
    setButton(button: string, down: boolean) {
      onlineEvents.push(`${button}:${down}`)
    },
    setTouchControlsVisible() {},
  }
  const controller = new InputController(
    canvas as unknown as HTMLCanvasElement,
    game as unknown as TanchikiGame,
    online,
  )

  return { canvas, controller, fakeWindow, game, online, onlineEvents, restoreWindow }
}

describe('menu pointer hit testing', () => {
  it('matches the enlarged visible button rows', () => {
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y + 12)).toBe(0)
    expect(getMenuPointerIndex(MENU_OPTION_X + MENU_OPTION_WIDTH - 2, MENU_OPTION_Y + MENU_OPTION_STEP + 14)).toBe(1)
  })

  it('ignores misses outside button bounds and row gaps', () => {
    expect(getMenuPointerIndex(MENU_OPTION_X - 1, MENU_OPTION_Y + 12)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + MENU_OPTION_WIDTH + 1, MENU_OPTION_Y + 12)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y - 1)).toBeNull()
    expect(getMenuPointerIndex(MENU_OPTION_X + 12, MENU_OPTION_Y + MENU_OPTION_HEIGHT + 1)).toBeNull()
  })
})

describe('touch pointer button tracking', () => {
  it('keeps the existing touch hit map aligned with the visible controls', () => {
    expect(getTouchControlAt(ARENA_X + 80, 346)).toBe('up')
    expect(getTouchControlAt(ARENA_X + 80, 398)).toBe('down')
    expect(getTouchControlAt(ARENA_X + 54, 372)).toBe('left')
    expect(getTouchControlAt(ARENA_X + 106, 372)).toBe('right')
    expect(getTouchControlAt(ARENA_X + 260, 372)).toBe('relay')
    expect(getTouchControlAt(ARENA_X + 356, 372)).toBe('fire')
    expect(getTouchControlAt(HUD_X + 48, 220)).toBeNull()
    expect(getTouchControlAt(HUD_X + 48, 334)).toBe('pause')
    expect(getTouchControlAt(20, 430)).toBeNull()
  })

  it('keeps the first held touch active when another touch presses fire', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'up', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'fire', (button, down) => events.push(`${button}:${down}`))
    tracker.clear(1, (button, down) => events.push(`${button}:${down}`))
    tracker.clear(2, (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['up:true', 'fire:true', 'up:false', 'fire:false'])
  })

  it('does not release a button until every pointer holding that button is lifted', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'right', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'right', (button, down) => events.push(`${button}:${down}`))
    tracker.clear(1, (button, down) => events.push(`${button}:${down}`))
    tracker.clear(2, (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['right:true', 'right:false'])
  })

  it('switches only the moved pointer while preserving other held buttons', () => {
    const tracker = new PointerButtonTracker()
    const events: string[] = []

    tracker.set(1, 'left', (button, down) => events.push(`${button}:${down}`))
    tracker.set(2, 'fire', (button, down) => events.push(`${button}:${down}`))
    tracker.set(1, 'up', (button, down) => events.push(`${button}:${down}`))

    expect(events).toEqual(['left:true', 'fire:true', 'left:false', 'up:true'])
  })
})

describe('input target routing', () => {
  it('routes pointer buttons to online controls only while online is active', () => {
    const offlineEvents: string[] = []
    const onlineEvents: string[] = []
    const offline = {
      setButton: (button: string, down: boolean) => offlineEvents.push(`${button}:${down}`),
    }
    const online = {
      active: true,
      isActive() {
        return this.active
      },
      releaseControls() {},
      setButton: (button: string, down: boolean) => onlineEvents.push(`${button}:${down}`),
      setTouchControlsVisible() {},
    }

    expect(routeInputButton('up', true, offline, online)).toBe('online')
    expect(routeInputButton('relay', true, offline, online)).toBe('ignored-online')
    expect(routeInputButton('decoy', true, offline, online)).toBe('ignored-online')
    expect(routeInputButton('mine', true, offline, online)).toBe('ignored-online')
    expect(routeInputButton('noise', true, offline, online)).toBe('ignored-online')
    expect(routeInputButton('steel', true, offline, online)).toBe('ignored-online')
    expect(routeInputButton('tripwire', true, offline, online)).toBe('ignored-online')
    online.active = false
    expect(routeInputButton('fire', true, offline, online)).toBe('offline')
    expect(routeInputButton('tripwire', true, offline, online)).toBe('offline')

    expect(onlineEvents).toEqual(['up:true'])
    expect(offlineEvents).toEqual(['fire:true', 'tripwire:true'])
  })

  it('prevents right-click context menus without routing offline gameplay buttons', () => {
    const harness = createControllerHarness()
    try {
      const rightDown = createPreventableEvent({
        button: 2,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: ARENA_X + 80,
        clientY: 346,
      })
      harness.canvas.dispatch('pointerdown', rightDown)
      const contextMenu = createPreventableEvent({ clientX: ARENA_X + 80, clientY: 346 })
      harness.canvas.dispatch('contextmenu', contextMenu)

      expect(rightDown.preventDefault).toHaveBeenCalled()
      expect(contextMenu.preventDefault).toHaveBeenCalled()
      expect(harness.canvas.focus).toHaveBeenCalled()
      expect(harness.game.buttonEvents).toEqual([])
      expect(harness.game.releaseCount).toBe(1)
      expect(harness.game.heldButtons.up).toBe(false)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('prevents right-click context menus without routing online gameplay buttons', () => {
    const harness = createControllerHarness(true)
    try {
      const rightDown = createPreventableEvent({
        button: 2,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: ARENA_X + 356,
        clientY: 372,
      })
      harness.canvas.dispatch('pointerdown', rightDown)
      const contextMenu = createPreventableEvent({ clientX: ARENA_X + 356, clientY: 372 })
      harness.canvas.dispatch('contextmenu', contextMenu)

      expect(rightDown.preventDefault).toHaveBeenCalled()
      expect(contextMenu.preventDefault).toHaveBeenCalled()
      expect(harness.onlineEvents).toEqual([])
      expect(harness.online.releaseCount).toBe(1)
      expect(harness.game.releaseCount).toBe(0)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('keeps left-click touch-control routing working after the context-menu guard', () => {
    const harness = createControllerHarness()
    try {
      const leftDown = createPreventableEvent({
        button: 0,
        pointerId: 7,
        pointerType: 'mouse',
        clientX: ARENA_X + 80,
        clientY: 346,
      })
      harness.canvas.dispatch('pointerdown', leftDown)
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 7 }))

      expect(leftDown.preventDefault).toHaveBeenCalled()
      expect(harness.game.buttonEvents).toEqual(['up:true', 'up:false'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('does not fall back to standard menu rows when the level-select layout misses', () => {
    const harness = createControllerHarness()
    try {
      harness.game.setMode('level-select')
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 8,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.selectedMenuIndices).toEqual([])
      expect(harness.game.primaryActionCount).toBe(0)

      harness.game.menuPointerIndex = 7
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 9,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.selectedMenuIndices).toEqual([7])
      expect(harness.game.primaryActionCount).toBe(1)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('releases offline held keyboard controls on window blur', () => {
    const harness = createControllerHarness()
    try {
      const keyDown = createPreventableEvent({ code: 'KeyW' })
      harness.fakeWindow.dispatch('keydown', keyDown)

      expect(keyDown.preventDefault).toHaveBeenCalled()
      expect(harness.game.heldButtons.up).toBe(true)

      harness.fakeWindow.dispatch('blur', {})

      expect(harness.game.releaseCount).toBe(1)
      expect(harness.game.heldButtons.up).toBe(false)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('uses R to drop a carried flag during play and preserves restart outside play', () => {
    const harness = createControllerHarness()
    try {
      const drop = createPreventableEvent({ code: 'KeyR' })
      harness.fakeWindow.dispatch('keydown', drop)
      expect(drop.preventDefault).toHaveBeenCalled()
      expect(harness.game.dropFlagCount).toBe(1)
      expect(harness.game.restartCount).toBe(0)

      harness.game.setMode('paused')
      harness.fakeWindow.dispatch('keydown', createPreventableEvent({ code: 'KeyR' }))
      expect(harness.game.dropFlagCount).toBe(1)
      expect(harness.game.restartCount).toBe(1)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('clears active pointer controls on context menu and accepts fresh input afterward', () => {
    const harness = createControllerHarness()
    try {
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 3,
        pointerType: 'mouse',
        clientX: ARENA_X + 80,
        clientY: 346,
      }))
      expect(harness.game.heldButtons.up).toBe(true)

      harness.canvas.dispatch('contextmenu', createPreventableEvent({ clientX: ARENA_X + 80, clientY: 346 }))

      expect(harness.game.heldButtons.up).toBe(false)
      expect(harness.game.buttonEvents).toEqual(['up:true', 'up:false'])

      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 4,
        pointerType: 'mouse',
        clientX: ARENA_X + 80,
        clientY: 346,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 4 }))

      expect(harness.game.buttonEvents).toEqual(['up:true', 'up:false', 'up:true', 'up:false'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })
})
