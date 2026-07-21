import type { TanchikiGame } from './game.ts'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  HUD_WIDTH,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
} from './constants.ts'
import {
  clampJoystickOffset,
  getJoystickDirection,
  getTouchControlAt,
  resolveTouchControlLayout,
  type TouchControlHit,
} from './touchControls.ts'
import {
  TOUCH_RAIL_CONTROL_X,
  TOUCH_RAIL_CONTROL_Y,
  TOUCH_RAIL_HEIGHT,
  TOUCH_RAIL_JOYSTICK_MAX_OFFSET,
  TOUCH_RAIL_WIDTH,
  getTouchRailGearKindAt,
  getTouchRailModSliderProgress,
  getTouchRailControl,
  isTouchRailFirePoint,
  isTouchRailConfirmPoint,
  isTouchRailModSliderStartPoint,
  isTouchRailRelayPoint,
  pulseTouchRailConfirm,
  type TouchRailSide,
} from './touchSideRails.ts'
import { getClassEquipmentHudModel } from './classEquipmentHud.ts'
import { getClassEquipmentHudLayout } from './classEquipmentHudRender.ts'
import { isBackControlAvailable, isBackControlPoint } from './backControl.ts'
import type { Direction, GameSnapshot, InputState, NativeClassKitActionKind, TouchHandedness, TouchJoystickSnapshot } from './types.ts'

export type Button = keyof InputState
type OfflineOnlyButton = 'relay' | 'mod' | 'decoy' | 'mine' | 'noise' | 'steel' | 'tripwire' | 'bulwark' | 'traverse'
type OnlineRoutableButton = Exclude<Button, OfflineOnlyButton>
type ClassEquipmentAction = 'equipment-1' | 'equipment-2' | 'equipment-3' | 'equipment-4'
type Action = Button | ClassEquipmentAction | 'back' | 'drop-flag' | 'fullscreen' | 'pause' | 'start'

type ButtonEmitter = (button: Button, down: boolean) => void
interface ButtonTarget {
  setButton: (button: Button, down: boolean, source?: 'keyboard' | 'pointer' | 'program') => void
}
interface OnlineInputTarget {
  setButton: (button: OnlineRoutableButton, down: boolean, source?: 'keyboard' | 'pointer' | 'program') => void
  isActive: () => boolean
  releaseControls: () => void
  setTouchControlsVisible: (visible: boolean) => void
  setTouchHandedness?: (handedness: TouchHandedness) => void
  setTouchJoystickState?: (state: TouchJoystickSnapshot) => void
  setTouchOrientationGate?: (active: boolean, onlineBattleLive?: boolean) => void
  back?: () => boolean
}

export interface TouchSideRailElements {
  left: HTMLCanvasElement
  right: HTMLCanvasElement
  isActive: () => boolean
}

function isOnlineRoutableButton(button: Button): button is OnlineRoutableButton {
  return button !== 'relay' && button !== 'mod' && button !== 'decoy' && button !== 'mine' && button !== 'noise' && button !== 'steel' && button !== 'tripwire' && button !== 'bulwark' && button !== 'traverse'
}

export function routeInputButton(
  button: Button,
  down: boolean,
  offline: ButtonTarget,
  online: OnlineInputTarget | null = null,
  source: 'keyboard' | 'pointer' | 'program' = 'program',
) {
  if (online?.isActive()) {
    if (isOnlineRoutableButton(button)) {
      online.setButton(button, down, source)
      return 'online'
    }
    return 'ignored-online'
  }

  offline.setButton(button, down, source)
  return 'offline'
}

export class PointerButtonTracker {
  private readonly buttonsByPointer = new Map<number, Button>()

  has(pointerId: number) {
    return this.buttonsByPointer.has(pointerId)
  }

  set(pointerId: number, nextButton: Button | null, emit: ButtonEmitter) {
    const previousButton = this.buttonsByPointer.get(pointerId) ?? null

    if (previousButton === nextButton) {
      return
    }

    if (previousButton) {
      this.buttonsByPointer.delete(pointerId)
      if (!this.isHeld(previousButton)) {
        emit(previousButton, false)
      }
    }

    if (nextButton) {
      const alreadyHeld = this.isHeld(nextButton)
      this.buttonsByPointer.set(pointerId, nextButton)
      if (!alreadyHeld) {
        emit(nextButton, true)
      }
    }
  }

  clear(pointerId: number, emit: ButtonEmitter) {
    this.set(pointerId, null, emit)
  }

  releaseAll(emit: ButtonEmitter) {
    const heldButtons = new Set(this.buttonsByPointer.values())
    this.buttonsByPointer.clear()
    for (const button of heldButtons) {
      emit(button, false)
    }
  }

  private isHeld(button: Button) {
    for (const held of this.buttonsByPointer.values()) {
      if (held === button) {
        return true
      }
    }

    return false
  }
}

interface JoystickPointerSession {
  kind: 'joystick'
  pointerType: string
  anchorX: number
  anchorY: number
  maxOffset: number
  direction: Direction | null
}

interface ButtonPointerSession {
  kind: 'button'
  pointerType: string
  button: Button
  active: boolean
  surface: 'canvas' | 'rail-relay' | 'rail-gear'
}

interface ModSliderPointerSession {
  kind: 'mod-slider'
  pointerType: string
  progress: number
  completed: boolean
  activated: boolean
}

type PointerSession = JoystickPointerSession | ButtonPointerSession | ModSliderPointerSession

export function getMenuPointerIndex(x: number, y: number) {
  if (x < MENU_OPTION_X || x > MENU_OPTION_X + MENU_OPTION_WIDTH) {
    return null
  }

  const relativeY = y - MENU_OPTION_Y

  if (relativeY < 0) {
    return null
  }

  const optionIndex = Math.floor(relativeY / MENU_OPTION_STEP)
  const rowY = relativeY - optionIndex * MENU_OPTION_STEP

  if (rowY < 0 || rowY > MENU_OPTION_HEIGHT) {
    return null
  }

  return optionIndex
}

export function mapClientPointToLogicalCanvas(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  contained = false,
) {
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  let left = rect.left
  let top = rect.top
  let width = rect.width
  let height = rect.height

  if (contained) {
    const scale = Math.min(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT)
    width = LOGICAL_WIDTH * scale
    height = LOGICAL_HEIGHT * scale
    left += (rect.width - width) / 2
    top += (rect.height - height) / 2
  }

  if (clientX < left || clientX > left + width || clientY < top || clientY > top + height) {
    return null
  }

  return {
    x: ((clientX - left) / width) * LOGICAL_WIDTH,
    y: ((clientY - top) / height) * LOGICAL_HEIGHT,
  }
}

const KEY_BINDINGS: Record<string, Action> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyB: 'back',
  Backspace: 'back',
  Space: 'fire',
  KeyE: 'relay',
  KeyX: 'mod',
  Digit1: 'equipment-1',
  Numpad1: 'equipment-1',
  Digit2: 'equipment-2',
  Numpad2: 'equipment-2',
  Digit3: 'equipment-3',
  Numpad3: 'equipment-3',
  Digit4: 'equipment-4',
  Numpad4: 'equipment-4',
  Enter: 'start',
  Escape: 'back',
  KeyP: 'pause',
  KeyR: 'drop-flag',
  KeyF: 'fullscreen',
}

export class InputController {
  private readonly canvas: HTMLCanvasElement
  private readonly game: TanchikiGame
  private readonly online: OnlineInputTarget | null
  private readonly touchSideRails: TouchSideRailElements | null
  private readonly handleKeyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly handleKeyUp = (event: KeyboardEvent) => this.onKeyUp(event)
  private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event)
  private readonly handlePointerMove = (event: PointerEvent) => this.onPointerMove(event)
  private readonly handlePointerUp = (event: PointerEvent) => this.onPointerUp(event)
  private readonly handleClick = (event: MouseEvent) => this.onClick(event)
  private readonly handleMouseDown = (event: MouseEvent) => this.onMouseDown(event)
  private readonly handleMouseMove = (event: MouseEvent) => this.onMouseMove(event)
  private readonly handleMouseUp = () => this.onMouseUp()
  private readonly handleContextMenu = (event: MouseEvent) => this.onContextMenu(event)
  private readonly handleWindowBlur = () => this.releaseControls()
  private readonly handleLeftRailPointerDown = (event: PointerEvent) => this.onRailPointerDown('left', event)
  private readonly handleRightRailPointerDown = (event: PointerEvent) => this.onRailPointerDown('right', event)
  private readonly handleLeftRailPointerMove = (event: PointerEvent) => this.onRailPointerMove('left', event)
  private readonly handleRightRailPointerMove = (event: PointerEvent) => this.onRailPointerMove('right', event)
  private readonly handleRailPointerUp = (event: PointerEvent) => this.onRailPointerUp(event)
  private readonly pointerButtons = new PointerButtonTracker()
  private readonly pointerSessions = new Map<number, PointerSession>()
  private lastPointerEventTime = 0
  private lastTutorialRadioPointerActionTime = Number.NEGATIVE_INFINITY
  private orientationBlocked = false
  private modSliderResetTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    canvas: HTMLCanvasElement,
    game: TanchikiGame,
    online: OnlineInputTarget | null = null,
    touchSideRails: TouchSideRailElements | null = null,
  ) {
    this.canvas = canvas
    this.game = game
    this.online = online
    this.touchSideRails = touchSideRails
    this.game.setTouchControlsVisible(globalThis.matchMedia?.('(pointer: coarse)').matches ?? false)
    this.publishJoystickState(null)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerUp)
    canvas.addEventListener('lostpointercapture', this.handlePointerUp)
    canvas.addEventListener('click', this.handleClick)
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('contextmenu', this.handleContextMenu)
    window.addEventListener('mouseup', this.handleMouseUp)
    window.addEventListener('blur', this.handleWindowBlur)
    this.bindTouchSideRailListeners()
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerUp)
    this.canvas.removeEventListener('click', this.handleClick)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('blur', this.handleWindowBlur)
    this.unbindTouchSideRailListeners()
    this.clearModSliderResetTimer()
  }

  private onKeyDown(event: KeyboardEvent) {
    const action = KEY_BINDINGS[event.code]

    if (!action) {
      return
    }

    if (this.orientationBlocked) {
      event.preventDefault()
      return
    }

    event.preventDefault()

    if (action === 'back') {
      if (!event.repeat) {
        this.performBackAction()
      }
      return
    }

    if (action === 'start') {
      if (!event.repeat) {
        this.game.primaryAction()
      }
      return
    }

    if (action === 'pause') {
      if (!event.repeat) {
        this.game.togglePause()
      }
      return
    }

    if (action === 'drop-flag') {
      if (!event.repeat) {
        if (this.game.getMode() === 'playing') {
          if (!this.online?.isActive()) {
            this.game.dropCarriedFlag()
          }
        } else {
          this.game.restart()
        }
      }
      return
    }

    if (action === 'fullscreen') {
      if (!event.repeat) {
        this.toggleFullscreen()
      }
      return
    }

    if (this.game.getMode() !== 'playing') {
      if (!event.repeat && (action === 'up' || action === 'down' || action === 'left' || action === 'right')) {
        this.game.navigateMenuDirection(action)
      } else if (!event.repeat && action === 'fire') {
        this.game.primaryAction()
      }
      return
    }

    if (isClassEquipmentAction(action)) {
      this.game.setClassEquipmentSlot(getClassEquipmentSlot(action), true, 'keyboard')
      return
    }

    this.game.setButton(action, true, 'keyboard')
  }

  private onKeyUp(event: KeyboardEvent) {
    const action = KEY_BINDINGS[event.code]

    if (action && isClassEquipmentAction(action)) {
      event.preventDefault()
      this.game.setClassEquipmentSlot(getClassEquipmentSlot(action), false, 'keyboard')
      return
    }

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'fire' || action === 'relay' || action === 'mod' || action === 'decoy' || action === 'mine' || action === 'noise' || action === 'steel' || action === 'tripwire' || action === 'bulwark' || action === 'traverse') {
      event.preventDefault()
      this.game.setButton(action, false, 'keyboard')
    }
  }

  private onPointerDown(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    if (event.pointerType === 'mouse' && event.button !== 0) {
      this.canvas.focus()
      event.preventDefault()
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)

    if (!point || this.orientationBlocked) {
      return
    }

    this.canvas.focus()
    this.setTouchControlsVisible(event.pointerType !== 'mouse')
    this.canvas.setPointerCapture(event.pointerId)
    event.preventDefault()

    this.beginPointerAction(point.x, point.y, event.pointerId, event.pointerType)
  }

  private onClick(event: MouseEvent) {
    if (this.orientationBlocked || this.isOnlineActive() || this.game.getMode() !== 'playing') {
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    if (
      !point
      || typeof this.game.isTutorialRadioPoint !== 'function'
      || !this.game.isTutorialRadioPoint(point.x, point.y)
      || performance.now() - this.lastTutorialRadioPointerActionTime < 500
    ) {
      return
    }

    this.canvas.focus()
    event.preventDefault()
    this.triggerTutorialRadioAction('click')
  }

  private onPointerMove(event: PointerEvent) {
    const session = this.pointerSessions.get(event.pointerId)
    if (!session || this.orientationBlocked || (!this.isOnlineActive() && this.game.getMode() !== 'playing')) {
      return
    }

    this.lastPointerEventTime = performance.now()
    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }
    this.updatePointerSession(event.pointerId, session, point.x, point.y)
  }

  private onPointerUp(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    this.clearPointerAction(event.pointerId)
  }

  private onRailPointerDown(side: TouchRailSide, event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    if (
      (event.pointerType === 'mouse' && event.button !== 0)
      || this.orientationBlocked
      || !this.isTouchSideRailActive()
      || (!this.isOnlineActive() && this.game.getMode() !== 'playing')
    ) {
      return
    }

    const point = this.toRailPoint(side, event.clientX, event.clientY)
    if (!point) return

    const rail = this.getTouchRail(side)
    this.canvas.focus()
    this.setTouchControlsVisible(event.pointerType !== 'mouse')
    rail?.setPointerCapture(event.pointerId)
    event.preventDefault()

    const control = getTouchRailControl(side, this.getTouchLayout().handedness)
    const briefingOnly = !this.isOnlineActive() && this.game.hasBlockingTutorialRadioDialogue?.()
    if (briefingOnly) {
      if (control === 'joystick' && isTouchRailConfirmPoint(point.x, point.y)) {
        pulseTouchRailConfirm()
        this.vibrate(14, event.pointerType)
        this.triggerTutorialRadioAction('pointer')
      }
      return
    }

    if (control === 'joystick') {
      if (!this.isOnlineActive() && isTouchRailRelayPoint(point.x, point.y)) {
        this.beginButtonPointer(event.pointerId, 'relay', event.pointerType, 'rail-relay')
        return
      }
      this.beginJoystickPointer(
        event.pointerId,
        TOUCH_RAIL_CONTROL_X,
        TOUCH_RAIL_CONTROL_Y,
        TOUCH_RAIL_JOYSTICK_MAX_OFFSET,
        event.pointerType,
      )
      const session = this.pointerSessions.get(event.pointerId)
      if (session?.kind === 'joystick') {
        this.updatePointerSession(event.pointerId, session, point.x, point.y)
      }
    } else {
      if (!this.isOnlineActive()) {
        const gearKind = getTouchRailGearKindAt(
          point.x,
          point.y,
          this.getAvailableClassKitActions(),
        )
        if (gearKind) {
          this.beginButtonPointer(event.pointerId, gearKind, event.pointerType, 'rail-gear')
          return
        }
        if (isTouchRailModSliderStartPoint(point.x, point.y)) {
          this.beginModSliderPointer(event.pointerId, event.pointerType)
          return
        }
      }
      if (isTouchRailFirePoint(point.x, point.y)) {
        this.beginButtonPointer(event.pointerId, 'fire', event.pointerType)
      }
    }
  }

  private onRailPointerMove(side: TouchRailSide, event: PointerEvent) {
    const session = this.pointerSessions.get(event.pointerId)
    if (
      !session
      || this.orientationBlocked
      || !this.isTouchSideRailActive()
      || (!this.isOnlineActive() && this.game.getMode() !== 'playing')
    ) {
      return
    }

    const point = this.toRailPoint(side, event.clientX, event.clientY)
    if (!point) return
    this.lastPointerEventTime = performance.now()
    event.preventDefault()
    if (session.kind === 'button') {
      if (session.surface === 'rail-relay' && session.active && !isTouchRailRelayPoint(point.x, point.y, true)) {
        session.active = false
        this.updatePointerButton(event.pointerId, null)
      } else if (
        session.surface === 'rail-gear'
        && session.active
        && getTouchRailGearKindAt(
          point.x,
          point.y,
          this.getAvailableClassKitActions(),
          true,
        ) !== session.button
      ) {
        session.active = false
        this.updatePointerButton(event.pointerId, null)
      }
      return
    }
    if (session.kind === 'mod-slider') {
      this.updateModSliderPointer(session, point.y)
      return
    }
    this.updatePointerSession(event.pointerId, session, point.x, point.y)
  }

  private onRailPointerUp(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    this.clearPointerAction(event.pointerId)
  }

  private onMouseDown(event: MouseEvent) {
    if (performance.now() - this.lastPointerEventTime < 80) {
      return
    }

    if (event.button !== 0) {
      this.canvas.focus()
      event.preventDefault()
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    if (!point || this.orientationBlocked) {
      return
    }

    this.canvas.focus()
    this.setTouchControlsVisible(false)
    event.preventDefault()
    this.beginPointerAction(point.x, point.y, -1, 'mouse')
  }

  private onMouseMove(event: MouseEvent) {
    const session = this.pointerSessions.get(-1)
    if (!session || this.orientationBlocked || (!this.isOnlineActive() && this.game.getMode() !== 'playing')) {
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    if (point) {
      this.updatePointerSession(-1, session, point.x, point.y)
    }
  }

  private onMouseUp() {
    this.clearPointerAction(-1)
  }

  private onContextMenu(event: MouseEvent) {
    event.preventDefault()
    this.canvas.focus()
    const activeTouchHold = [...this.pointerSessions.values()]
      .some((session) => session.pointerType !== 'mouse')
    if (!activeTouchHold) {
      this.releaseControls()
    }
  }

  private beginPointerAction(x: number, y: number, pointerId: number, pointerType: string) {
    if (this.orientationBlocked) {
      return
    }

    if (
      isBackControlPoint(x, y)
      && (this.isOnlineActive() || isBackControlAvailable(this.game.getMode()))
    ) {
      this.releaseControls()
      this.performBackAction()
      return
    }

    if (this.isOnlineActive()) {
      const hit = this.touchHitAt(x, y, false)

      if (hit === 'pause') {
        this.online?.releaseControls()
        return
      }

      if (hit === 'joystick') {
        this.beginJoystickPointer(pointerId, x, y, undefined, pointerType)
      } else if (hit) {
        this.beginButtonPointer(pointerId, hit, pointerType)
      }
      return
    }

    if (this.game.getMode() !== 'playing') {
      if (this.game.getMode() === 'loading') {
        if (x >= ARENA_X && x < ARENA_X + ARENA_WIDTH && y >= ARENA_Y && y <= ARENA_Y + ARENA_HEIGHT) {
          this.game.primaryAction()
        }
        return
      }

      this.handleMenuPointer(x, y)
      return
    }

    if (
      typeof this.game.isTutorialRadioPoint === 'function'
      && this.game.isTutorialRadioPoint(x, y)
    ) {
      this.triggerTutorialRadioAction('pointer')
      return
    }

    const snapshot = typeof this.game.getSnapshot === 'function'
      ? this.game.getSnapshot()
      : null
    if (snapshot && isTouchFlagDropPoint(x, y, snapshot)) {
      this.game.dropCarriedFlag()
      return
    }

    const hit = this.touchHitAt(x, y, true)

    if (hit === 'pause') {
      this.game.togglePause()
      return
    }

    if (hit === 'joystick') {
      this.beginJoystickPointer(pointerId, x, y, undefined, pointerType)
    } else if (hit) {
      this.beginButtonPointer(pointerId, hit, pointerType)
    }
  }

  private triggerTutorialRadioAction(source: 'pointer' | 'click') {
    if (source === 'pointer') {
      this.lastTutorialRadioPointerActionTime = performance.now()
    }
    this.game.primaryAction()
  }

  private beginJoystickPointer(
    pointerId: number,
    x: number,
    y: number,
    maxOffset: number | undefined = this.getTouchLayout().joystick.maxOffset,
    pointerType = 'mouse',
  ) {
    const activeJoystick = [...this.pointerSessions.values()].some((session) => session.kind === 'joystick')
    if (activeJoystick) {
      return
    }

    const session: JoystickPointerSession = {
      kind: 'joystick',
      pointerType,
      anchorX: x,
      anchorY: y,
      maxOffset,
      direction: null,
    }
    this.pointerSessions.set(pointerId, session)
    this.publishJoystickState(session, 0, 0)
  }

  private beginButtonPointer(
    pointerId: number,
    button: Button,
    pointerType = 'mouse',
    surface: ButtonPointerSession['surface'] = 'canvas',
  ) {
    this.pointerSessions.set(pointerId, { kind: 'button', pointerType, button, active: true, surface })
    this.updatePointerButton(pointerId, button)
  }

  private beginModSliderPointer(pointerId: number, pointerType: string) {
    this.clearModSliderResetTimer()
    const session: ModSliderPointerSession = {
      kind: 'mod-slider',
      pointerType,
      progress: 0,
      completed: false,
      activated: false,
    }
    this.pointerSessions.set(pointerId, session)
    this.publishModSliderState(session)
  }

  private updateModSliderPointer(session: ModSliderPointerSession, y: number) {
    session.progress = getTouchRailModSliderProgress(y)
    if (!session.completed && session.progress >= 1) {
      session.completed = true
      session.activated = this.game.activateTouchMajorModFromSlider?.() === true
      this.vibrate(24, session.pointerType)
    }
    this.publishModSliderState(session)
  }

  private updatePointerSession(pointerId: number, session: PointerSession, x: number, y: number) {
    if (session.kind === 'mod-slider') {
      return
    }
    if (session.kind === 'joystick') {
      const layout = this.getTouchLayout()
      const dx = x - session.anchorX
      const dy = y - session.anchorY
      const nextDirection = getJoystickDirection(dx, dy, session.direction, layout)
      const offset = clampJoystickOffset(dx, dy, session.maxOffset)
      session.direction = nextDirection
      this.updatePointerButton(pointerId, nextDirection)
      this.publishJoystickState(session, offset.x, offset.y)
      return
    }

    if (!session.active) {
      return
    }

    if (session.surface === 'canvas' && this.isCanvasActionContinuation(session.button, x, y)) {
      return
    }

    const hit = this.touchHitAt(x, y, !this.isOnlineActive())
    if (hit === session.button) {
      return
    }

    session.active = false
    this.updatePointerButton(pointerId, null)
  }

  private isCanvasActionContinuation(button: Button, x: number, y: number) {
    if (button !== 'relay' && button !== 'mod') {
      return false
    }
    const target = button === 'relay' ? this.getTouchLayout().relay : this.getTouchLayout().mod
    return Math.hypot(x - target.centerX, y - target.centerY) <= target.hitRadius + 14
  }

  private publishJoystickState(session: JoystickPointerSession | null, offsetX = 0, offsetY = 0) {
    const layout = this.getTouchLayout()
    this.online?.setTouchHandedness?.(layout.handedness)
    const state: TouchJoystickSnapshot = session
      ? {
          active: true,
          anchorX: session.anchorX,
          anchorY: session.anchorY,
          offsetX,
          offsetY,
          direction: session.direction,
        }
      : {
          active: false,
          anchorX: this.isTouchSideRailActive() ? TOUCH_RAIL_CONTROL_X : layout.joystick.defaultCenterX,
          anchorY: this.isTouchSideRailActive() ? TOUCH_RAIL_CONTROL_Y : layout.joystick.defaultCenterY,
          offsetX: 0,
          offsetY: 0,
          direction: null,
        }
    if (typeof this.game.setTouchJoystickState === 'function') {
      this.game.setTouchJoystickState(state)
    }
    this.online?.setTouchJoystickState?.(state)
  }

  private updatePointerButton(pointerId: number, nextButton: Button | null) {
    this.pointerButtons.set(pointerId, nextButton, (button, down) => this.setActiveButton(button, down))
  }

  private clearPointerAction(pointerId: number) {
    const session = this.pointerSessions.get(pointerId)
    this.pointerSessions.delete(pointerId)
    this.pointerButtons.clear(pointerId, (button, down) => this.setActiveButton(button, down))
    if (session?.kind === 'joystick') {
      this.publishJoystickState(null)
    } else if (session?.kind === 'mod-slider') {
      this.finishModSlider(session)
    }
  }

  private publishModSliderState(session: ModSliderPointerSession | null) {
    this.game.setTouchModSliderState?.(session
      ? { active: true, progress: session.progress, activated: session.activated }
      : { active: false, progress: 0, activated: false })
  }

  private finishModSlider(session: ModSliderPointerSession) {
    this.clearModSliderResetTimer()
    if (!session.completed) {
      this.publishModSliderState(null)
      return
    }
    this.game.setTouchModSliderState?.({ active: false, progress: 1, activated: session.activated })
    this.modSliderResetTimer = setTimeout(() => {
      this.modSliderResetTimer = null
      this.publishModSliderState(null)
    }, 180)
  }

  private clearModSliderResetTimer() {
    if (this.modSliderResetTimer !== null) {
      clearTimeout(this.modSliderResetTimer)
      this.modSliderResetTimer = null
    }
  }

  private releaseControls() {
    const hadJoystick = [...this.pointerSessions.values()].some((session) => session.kind === 'joystick')
    this.clearModSliderResetTimer()
    this.pointerSessions.clear()
    this.pointerButtons.releaseAll((button, down) => this.setActiveButton(button, down))
    if (hadJoystick) {
      this.publishJoystickState(null)
    }
    this.publishModSliderState(null)
    if (this.isOnlineActive()) {
      this.online?.releaseControls()
      return
    }

    this.game.releaseControls()
  }

  setOrientationBlocked(active: boolean, onlineBattleLive = false) {
    if (active && !this.orientationBlocked) {
      this.releaseControls()
    }
    this.orientationBlocked = active
    if (typeof this.game.setTouchOrientationGate === 'function') {
      this.game.setTouchOrientationGate(active, onlineBattleLive)
    }
    this.online?.setTouchOrientationGate?.(active, onlineBattleLive)
  }

  private handleMenuPointer(x: number, y: number) {
    const tankSelectPlaybackControl = this.game.getTankSelectPlaybackControl(x, y)
    if (tankSelectPlaybackControl) {
      this.game.controlTankClassShowcase(tankSelectPlaybackControl)
      return
    }

    const tankSelectDirection = this.game.getTankSelectPointerDirection(x, y)
    if (tankSelectDirection) {
      this.game.navigateMenuDirection(tankSelectDirection)
      return
    }

    const customOptionIndex = this.game.getMenuPointerIndex(x, y)
    const customMenuLayout =
      this.game.getMode() === 'garage' ||
      this.game.getMode() === 'garage-mods' ||
      this.game.getMode() === 'tank-select' ||
      this.game.getMode() === 'level-select' ||
      this.game.getMode() === 'tutorial-select'
    const optionIndex = customOptionIndex ?? (customMenuLayout ? null : getMenuPointerIndex(x, y))

    if (optionIndex === null) {
      return
    }

    this.game.selectMenuIndex(optionIndex)
    this.game.primaryAction()
  }

  private touchHitAt(x: number, y: number, includeActions: boolean): TouchControlHit | null {
    let hit = getTouchControlAt(x, y, this.getTouchLayout(), {
      includeActions,
      includePrimary: !this.isTouchSideRailActive(),
    })
    if ((hit === 'relay' || hit === 'mod') && this.isTouchSideRailActive()) {
      hit = null
    }
    if (hit) {
      return hit
    }

    if (!includeActions || typeof this.game.getSnapshot !== 'function') {
      return null
    }
    if (this.isTouchSideRailActive()) {
      return null
    }
    return getTouchClassEquipmentButtonAt(x, y, this.game.getSnapshot())
  }

  private getTouchLayout() {
    const handedness = typeof this.game.getSettings === 'function'
      ? this.game.getSettings().touchHandedness
      : 'standard'
    return resolveTouchControlLayout(handedness)
  }

  private toLogicalClientPoint(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    return mapClientPointToLogicalCanvas(
      clientX,
      clientY,
      rect,
      this.canvas.ownerDocument.fullscreenElement === this.canvas,
    )
  }

  private toRailPoint(side: TouchRailSide, clientX: number, clientY: number) {
    const rail = this.getTouchRail(side)
    if (!rail) return null
    const rect = rail.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      x: ((clientX - rect.left) / rect.width) * TOUCH_RAIL_WIDTH,
      y: ((clientY - rect.top) / rect.height) * TOUCH_RAIL_HEIGHT,
    }
  }

  private isTouchSideRailActive() {
    return this.touchSideRails?.isActive() ?? false
  }

  private getTouchRail(side: TouchRailSide) {
    return this.touchSideRails?.[side] ?? null
  }

  private bindTouchSideRailListeners() {
    const left = this.touchSideRails?.left
    const right = this.touchSideRails?.right
    if (!left || !right) return
    left.addEventListener('pointerdown', this.handleLeftRailPointerDown)
    right.addEventListener('pointerdown', this.handleRightRailPointerDown)
    left.addEventListener('pointermove', this.handleLeftRailPointerMove)
    right.addEventListener('pointermove', this.handleRightRailPointerMove)
    for (const rail of [left, right]) {
      rail.addEventListener('contextmenu', this.handleContextMenu)
      rail.addEventListener('pointerup', this.handleRailPointerUp)
      rail.addEventListener('pointercancel', this.handleRailPointerUp)
      rail.addEventListener('lostpointercapture', this.handleRailPointerUp)
    }
  }

  private unbindTouchSideRailListeners() {
    const left = this.touchSideRails?.left
    const right = this.touchSideRails?.right
    if (!left || !right) return
    left.removeEventListener('pointerdown', this.handleLeftRailPointerDown)
    right.removeEventListener('pointerdown', this.handleRightRailPointerDown)
    left.removeEventListener('pointermove', this.handleLeftRailPointerMove)
    right.removeEventListener('pointermove', this.handleRightRailPointerMove)
    for (const rail of [left, right]) {
      rail.removeEventListener('contextmenu', this.handleContextMenu)
      rail.removeEventListener('pointerup', this.handleRailPointerUp)
      rail.removeEventListener('pointercancel', this.handleRailPointerUp)
      rail.removeEventListener('lostpointercapture', this.handleRailPointerUp)
    }
  }

  private isOnlineActive() {
    return this.online?.isActive() ?? false
  }

  private setActiveButton(button: Button, down: boolean) {
    routeInputButton(button, down, this.game, this.online, 'pointer')
  }

  private setTouchControlsVisible(visible: boolean) {
    if (this.isOnlineActive()) {
      this.online?.setTouchControlsVisible(visible)
      return
    }

    this.game.setTouchControlsVisible(visible)
  }

  private getAvailableClassKitActions(): NativeClassKitActionKind[] {
    if (typeof this.game.getSnapshot !== 'function') {
      return []
    }
    const snapshot = this.game.getSnapshot()
    return snapshot.player.battleKit?.available
      ? ['bulwark', 'traverse']
      : snapshot.deployables.available.filter((kind): kind is Exclude<typeof kind, 'noise'> => kind !== 'noise')
  }

  private vibrate(milliseconds: number, pointerType: string) {
    if (pointerType === 'mouse') return
    globalThis.navigator?.vibrate?.(milliseconds)
  }

  private toggleFullscreen() {
    const documentElement = this.canvas.ownerDocument

    if (documentElement.fullscreenElement) {
      void documentElement.exitFullscreen()
      return
    }

    void this.canvas.requestFullscreen()
  }

  private performBackAction() {
    if (this.online?.isActive() && this.online.back?.()) {
      return
    }
    this.game.back()
  }
}

export function getTouchClassEquipmentButtonAt(x: number, y: number, state: GameSnapshot): Button | null {
  const stripX = ARENA_X + 6
  const stripY = ARENA_Y + ARENA_HEIGHT + 2
  const stripWidth = ARENA_WIDTH - 12
  if (x < stripX || x > stripX + stripWidth || y < stripY || y > stripY + 28) {
    return null
  }

  const model = getClassEquipmentHudModel({
    tankClass: state.player.classId,
    shells: state.player.shells,
    shellCapacity: state.player.shellCapacity,
    shellRechargeProgress: state.player.shellRechargeProgress,
    onAmmoStation: state.player.onAmmoStation,
    shield: state.player.shield,
    deployables: state.deployables,
    battleKit: state.player.battleKit,
  })
  const slot = getClassEquipmentHudLayout(model, stripWidth).slots.find((candidate) =>
    x - stripX >= candidate.x && x - stripX <= candidate.x + candidate.width,
  )?.slot

  if (slot?.kind === 'decoy') return 'decoy'
  if (slot?.kind === 'tripwire') return 'tripwire'
  if (slot?.kind === 'mine') return 'mine'
  if (slot?.kind === 'steel-trap') return 'steel'
  if (slot?.kind === 'bulwark') return 'bulwark'
  if (slot?.kind === 'traverse') return 'traverse'
  return null
}

export function isTouchFlagDropPoint(x: number, y: number, state: GameSnapshot) {
  return Boolean(
    state.objective.mode === 'ctf'
    && state.objective.flag?.carrierId === 'player'
    && x >= HUD_X
    && x <= HUD_X + HUD_WIDTH
    && y >= 36
    && y <= 92,
  )
}

function isClassEquipmentAction(action: Action): action is ClassEquipmentAction {
  return action === 'equipment-1'
    || action === 'equipment-2'
    || action === 'equipment-3'
    || action === 'equipment-4'
}

function getClassEquipmentSlot(action: ClassEquipmentAction): number {
  switch (action) {
    case 'equipment-1':
      return 1
    case 'equipment-2':
      return 2
    case 'equipment-3':
      return 3
    case 'equipment-4':
      return 4
  }
}
