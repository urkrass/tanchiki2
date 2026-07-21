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
  TANK_SELECT_PLAYBACK_CONTROL_SIZE,
  TANK_SELECT_PLAYBACK_CONTROL_X,
  TANK_SELECT_PLAYBACK_CONTROL_Y,
} from './constants.ts'
import { InputController, PointerButtonTracker, getMenuPointerIndex, routeInputButton } from './input.ts'
import { getJoystickDirection, getTouchControlAt, resolveTouchControlLayout } from './touchControls.ts'
import { TOUCH_RAIL_CONTROL_X, TOUCH_RAIL_CONTROL_Y, TOUCH_RAIL_HEIGHT, TOUCH_RAIL_WIDTH } from './touchSideRails.ts'
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
  private readonly width: number
  private readonly height: number

  constructor(width = LOGICAL_WIDTH, height = LOGICAL_HEIGHT) {
    super()
    this.width = width
    this.height = height
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
    }
  }
}

class FakeGame {
  readonly buttonEvents: string[] = []
  readonly classEquipmentSlotEvents: string[] = []
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
  tankSelectPointerDirection: 'left' | 'right' | null = null
  tankSelectPlaybackControl: 'previous' | 'toggle-pause' | 'next' | null = null
  readonly selectedMenuIndices: number[] = []
  primaryActionCount = 0
  readonly menuDirections: string[] = []
  readonly playbackControls: string[] = []
  private mode = 'playing'
  touchHandedness: 'standard' | 'mirrored' = 'standard'
  readonly touchJoystickStates: unknown[] = []
  readonly orientationStates: unknown[] = []
  tutorialRadioActive = false

  getSettings() {
    return { touchHandedness: this.touchHandedness }
  }

  setTouchJoystickState(state: unknown) {
    this.touchJoystickStates.push(state)
  }
  setTouchOrientationGate(active: boolean, onlineBattleLive: boolean) {
    this.orientationStates.push({ active, onlineBattleLive })
  }

  setMode(mode: string) {
    this.mode = mode
  }

  getMode() {
    return this.mode
  }

  isTutorialRadioPoint() {
    return this.tutorialRadioActive
  }

  setButton(button: keyof InputState, down: boolean) {
    this.heldButtons[button] = down
    this.buttonEvents.push(`${button}:${down}`)
  }

  setClassEquipmentSlot(slot: number, down: boolean) {
    this.classEquipmentSlotEvents.push(`${slot}:${down}`)
    return true
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
  navigateMenuDirection(direction: string) {
    this.menuDirections.push(direction)
  }
  back() {}
  getMenuPointerIndex() {
    return this.menuPointerIndex
  }
  getTankSelectPointerDirection() {
    return this.tankSelectPointerDirection
  }
  getTankSelectPlaybackControl() {
    return this.tankSelectPlaybackControl
  }
  controlTankClassShowcase(control: string) {
    this.playbackControls.push(control)
    return true
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

function createControllerHarness(onlineActive = false, sideRailsActive = false) {
  const fakeWindow = new FakeEventTarget()
  const restoreWindow = installFakeWindow(fakeWindow)
  const canvas = new FakeCanvas()
  const leftRail = new FakeCanvas(TOUCH_RAIL_WIDTH, TOUCH_RAIL_HEIGHT)
  const rightRail = new FakeCanvas(TOUCH_RAIL_WIDTH, TOUCH_RAIL_HEIGHT)
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
    sideRailsActive
      ? {
          left: leftRail as unknown as HTMLCanvasElement,
          right: rightRail as unknown as HTMLCanvasElement,
          isActive: () => true,
        }
      : null,
  )

  return { canvas, controller, fakeWindow, game, leftRail, online, onlineEvents, restoreWindow, rightRail }
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
  it('keeps primary fallback controls mirrored while HUD action targets stay fixed', () => {
    const standard = resolveTouchControlLayout('standard')
    const mirrored = resolveTouchControlLayout('mirrored')
    expect(getTouchControlAt(standard.joystick.defaultCenterX, standard.joystick.defaultCenterY, standard)).toBe('joystick')
    expect(getTouchControlAt(standard.relay.centerX, standard.relay.centerY, standard)).toBe('relay')
    expect(getTouchControlAt(standard.mod.centerX, standard.mod.centerY, standard)).toBe('mod')
    expect(getTouchControlAt(standard.fire.centerX, standard.fire.centerY, standard)).toBe('fire')
    expect(getTouchControlAt(mirrored.joystick.defaultCenterX, mirrored.joystick.defaultCenterY, mirrored)).toBe('joystick')
    expect(getTouchControlAt(mirrored.relay.centerX, mirrored.relay.centerY, mirrored)).toBe('relay')
    expect(getTouchControlAt(mirrored.mod.centerX, mirrored.mod.centerY, mirrored)).toBe('mod')
    expect(getTouchControlAt(mirrored.fire.centerX, mirrored.fire.centerY, mirrored)).toBe('fire')
    expect(mirrored.joystick.defaultCenterX).toBeGreaterThan(standard.joystick.defaultCenterX)
    expect(mirrored.fire.centerX).toBeLessThan(standard.fire.centerX)
    expect(mirrored.relay).toEqual(standard.relay)
    expect(mirrored.mod).toEqual(standard.mod)
    expect(getTouchControlAt(HUD_X + 48, 220)).toBe('mod')
    expect(getTouchControlAt(HUD_X + 48, 334)).toBe('pause')
    expect(getTouchControlAt(20, 430)).toBeNull()
  })

  it('uses a deadzone and axis hysteresis without emitting diagonals', () => {
    const layout = resolveTouchControlLayout()
    expect(getJoystickDirection(5, 4, null, layout)).toBeNull()
    expect(getJoystickDirection(24, 20, null, layout)).toBe('right')
    expect(getJoystickDirection(20, 24, 'right', layout)).toBe('right')
    expect(getJoystickDirection(20, 27, 'right', layout)).toBe('down')
    expect(getJoystickDirection(-30, 4, 'right', layout)).toBe('left')
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
  it('keeps the side-rail joystick fixed and fully clamped when touch begins off-center', () => {
    const harness = createControllerHarness(false, true)
    try {
      harness.leftRail.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 20,
        pointerType: 'touch',
        clientX: 8,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))

      expect(harness.game.touchJoystickStates.at(-1)).toMatchObject({
        active: true,
        anchorX: TOUCH_RAIL_CONTROL_X,
        anchorY: TOUCH_RAIL_CONTROL_Y,
        offsetX: -24,
        offsetY: 0,
        direction: 'left',
      })
      expect(harness.game.buttonEvents).toEqual(['left:true'])
      harness.leftRail.dispatch('pointerup', createPreventableEvent({ pointerId: 20 }))
      expect(harness.game.buttonEvents).toEqual(['left:true', 'left:false'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('uses click as a deduplicated fallback for tutorial briefing taps', () => {
    const harness = createControllerHarness()
    harness.game.tutorialRadioActive = true
    try {
      harness.canvas.dispatch('click', createPreventableEvent({ clientX: 220, clientY: 50 }))
      expect(harness.game.primaryActionCount).toBe(1)
      harness.canvas.dispatch('click', createPreventableEvent({ clientX: 220, clientY: 50 }))
      expect(harness.game.primaryActionCount).toBe(2)

      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 19,
        pointerType: 'touch',
        clientX: 220,
        clientY: 50,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 19 }))
      harness.canvas.dispatch('click', createPreventableEvent({ clientX: 220, clientY: 50 }))
      expect(harness.game.primaryActionCount).toBe(3)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('keeps the side-rail joystick pointer owned while a second finger fires', () => {
    const harness = createControllerHarness(false, true)
    try {
      harness.leftRail.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 21,
        pointerType: 'touch',
        clientX: TOUCH_RAIL_CONTROL_X,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))
      harness.leftRail.dispatch('pointermove', createPreventableEvent({
        pointerId: 21,
        clientX: TOUCH_RAIL_CONTROL_X + 30,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))
      harness.rightRail.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 22,
        pointerType: 'touch',
        clientX: TOUCH_RAIL_CONTROL_X,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))
      harness.rightRail.dispatch('pointerup', createPreventableEvent({ pointerId: 22 }))
      harness.leftRail.dispatch('pointerup', createPreventableEvent({ pointerId: 21 }))

      expect(harness.game.buttonEvents).toEqual(['right:true', 'fire:true', 'fire:false', 'right:false'])
      expect(harness.game.touchJoystickStates.at(-1)).toMatchObject({ active: false, direction: null })
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('does not route invisible battlefield primary controls while side rails are active', () => {
    const harness = createControllerHarness(false, true)
    const layout = resolveTouchControlLayout()
    try {
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 26,
        pointerType: 'touch',
        clientX: layout.fire.centerX,
        clientY: layout.fire.centerY,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 26 }))
      expect(harness.game.buttonEvents).toEqual([])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('swaps the two primary side rails in mirrored mode', () => {
    const harness = createControllerHarness(false, true)
    harness.game.touchHandedness = 'mirrored'
    try {
      harness.leftRail.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 27,
        pointerType: 'touch',
        clientX: TOUCH_RAIL_CONTROL_X,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))
      harness.rightRail.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 28,
        pointerType: 'touch',
        clientX: TOUCH_RAIL_CONTROL_X,
        clientY: TOUCH_RAIL_CONTROL_Y,
      }))
      harness.rightRail.dispatch('pointermove', createPreventableEvent({
        pointerId: 28,
        clientX: TOUCH_RAIL_CONTROL_X,
        clientY: TOUCH_RAIL_CONTROL_Y - 30,
      }))
      harness.leftRail.dispatch('pointerup', createPreventableEvent({ pointerId: 27 }))
      harness.rightRail.dispatch('pointerup', createPreventableEvent({ pointerId: 28 }))
      expect(harness.game.buttonEvents).toEqual(['fire:true', 'up:true', 'fire:false', 'up:false'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('cancels Relay when its finger drags away without retargeting the Mod', () => {
    const harness = createControllerHarness()
    const layout = resolveTouchControlLayout()
    try {
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 23,
        pointerType: 'touch',
        clientX: layout.relay.centerX,
        clientY: layout.relay.centerY,
      }))
      harness.canvas.dispatch('pointermove', createPreventableEvent({
        pointerId: 23,
        clientX: layout.mod.centerX,
        clientY: layout.mod.centerY,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 23 }))

      expect(harness.game.buttonEvents).toEqual(['relay:true', 'relay:false'])
      expect(harness.game.heldButtons.mod).toBe(false)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('releases controls and ignores new touches while the orientation gate is active', () => {
    const harness = createControllerHarness()
    const layout = resolveTouchControlLayout()
    try {
      harness.controller.setOrientationBlocked(true, false)
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 24,
        pointerType: 'touch',
        clientX: layout.fire.centerX,
        clientY: layout.fire.centerY,
      }))
      expect(harness.game.buttonEvents).toEqual([])

      harness.controller.setOrientationBlocked(false, false)
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 25,
        pointerType: 'touch',
        clientX: layout.fire.centerX,
        clientY: layout.fire.centerY,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 25 }))
      expect(harness.game.buttonEvents).toEqual(['fire:true', 'fire:false'])
      expect(harness.game.orientationStates).toEqual([
        { active: true, onlineBattleLive: false },
        { active: false, onlineBattleLive: false },
      ])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('preserves arrow direction while navigating non-gameplay menus', () => {
    const harness = createControllerHarness()
    try {
      harness.game.setMode('garage-mods')
      harness.fakeWindow.dispatch('keydown', createPreventableEvent({ code: 'ArrowUp' }))
      harness.fakeWindow.dispatch('keydown', createPreventableEvent({ code: 'ArrowRight' }))
      harness.fakeWindow.dispatch('keydown', createPreventableEvent({ code: 'ArrowDown' }))
      harness.fakeWindow.dispatch('keydown', createPreventableEvent({ code: 'ArrowLeft' }))

      expect(harness.game.menuDirections).toEqual(['up', 'right', 'down', 'left'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

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
        clientY: 370,
      })
      harness.canvas.dispatch('pointerdown', leftDown)
      harness.canvas.dispatch('pointermove', createPreventableEvent({
        pointerId: 7,
        clientX: ARENA_X + 80,
        clientY: 330,
      }))
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

  it('does not fall back to standard menu rows when custom Garage layouts miss', () => {
    const harness = createControllerHarness()
    try {
      harness.game.setMode('garage')
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 10,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.selectedMenuIndices).toEqual([])
      expect(harness.game.primaryActionCount).toBe(0)

      harness.game.menuPointerIndex = 2
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 11,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.selectedMenuIndices).toEqual([2])
      expect(harness.game.primaryActionCount).toBe(1)

      harness.game.setMode('garage-mods')
      harness.game.menuPointerIndex = null
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 12,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.selectedMenuIndices).toEqual([2])
      expect(harness.game.primaryActionCount).toBe(1)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('uses Tank Select arrow hit regions to preview without equipping', () => {
    const harness = createControllerHarness()
    try {
      harness.game.setMode('tank-select')
      harness.game.tankSelectPointerDirection = 'right'
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 13,
        pointerType: 'mouse',
        clientX: MENU_OPTION_X + 12,
        clientY: MENU_OPTION_Y + 12,
      }))

      expect(harness.game.menuDirections).toEqual(['right'])
      expect(harness.game.selectedMenuIndices).toEqual([])
      expect(harness.game.primaryActionCount).toBe(0)
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })

  it('routes Tank Select theater playback controls before carousel arrows', () => {
    const harness = createControllerHarness()
    try {
      harness.game.setMode('tank-select')
      harness.game.tankSelectPlaybackControl = 'toggle-pause'
      harness.game.tankSelectPointerDirection = 'right'
      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 14,
        pointerType: 'mouse',
        clientX: TANK_SELECT_PLAYBACK_CONTROL_X + TANK_SELECT_PLAYBACK_CONTROL_SIZE / 2,
        clientY: TANK_SELECT_PLAYBACK_CONTROL_Y + TANK_SELECT_PLAYBACK_CONTROL_SIZE / 2,
      }))

      expect(harness.game.playbackControls).toEqual(['toggle-pause'])
      expect(harness.game.menuDirections).toEqual([])
      expect(harness.game.primaryActionCount).toBe(0)
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

  it('routes number keys through class-local equipment slots and leaves 5 unbound', () => {
    const harness = createControllerHarness()
    try {
      const slotOneDown = createPreventableEvent({ code: 'Digit1' })
      const slotOneUp = createPreventableEvent({ code: 'Digit1' })
      const slotFourDown = createPreventableEvent({ code: 'Numpad4' })
      const slotFourUp = createPreventableEvent({ code: 'Numpad4' })
      const legacyFive = createPreventableEvent({ code: 'Digit5' })

      harness.fakeWindow.dispatch('keydown', slotOneDown)
      harness.fakeWindow.dispatch('keyup', slotOneUp)
      harness.fakeWindow.dispatch('keydown', slotFourDown)
      harness.fakeWindow.dispatch('keyup', slotFourUp)
      harness.fakeWindow.dispatch('keydown', legacyFive)

      expect(slotOneDown.preventDefault).toHaveBeenCalled()
      expect(slotOneUp.preventDefault).toHaveBeenCalled()
      expect(slotFourDown.preventDefault).toHaveBeenCalled()
      expect(slotFourUp.preventDefault).toHaveBeenCalled()
      expect(legacyFive.preventDefault).not.toHaveBeenCalled()
      expect(harness.game.classEquipmentSlotEvents).toEqual(['1:true', '1:false', '4:true', '4:false'])
      expect(harness.game.buttonEvents).toEqual([])
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
        clientY: 370,
      }))
      harness.canvas.dispatch('pointermove', createPreventableEvent({
        pointerId: 3,
        clientX: ARENA_X + 80,
        clientY: 330,
      }))
      expect(harness.game.heldButtons.up).toBe(true)

      harness.canvas.dispatch('contextmenu', createPreventableEvent({ clientX: ARENA_X + 80, clientY: 330 }))

      expect(harness.game.heldButtons.up).toBe(false)
      expect(harness.game.buttonEvents).toEqual(['up:true', 'up:false'])

      harness.canvas.dispatch('pointerdown', createPreventableEvent({
        button: 0,
        pointerId: 4,
        pointerType: 'mouse',
        clientX: ARENA_X + 80,
        clientY: 370,
      }))
      harness.canvas.dispatch('pointermove', createPreventableEvent({
        pointerId: 4,
        clientX: ARENA_X + 80,
        clientY: 330,
      }))
      harness.canvas.dispatch('pointerup', createPreventableEvent({ pointerId: 4 }))

      expect(harness.game.buttonEvents).toEqual(['up:true', 'up:false', 'up:true', 'up:false'])
    } finally {
      harness.controller.dispose()
      harness.restoreWindow()
    }
  })
})
