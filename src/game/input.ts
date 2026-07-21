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
import { getClassEquipmentHudModel } from './classEquipmentHud.ts'
import { getClassEquipmentHudLayout } from './classEquipmentHudRender.ts'
import type { Direction, GameSnapshot, InputState, TouchHandedness, TouchJoystickSnapshot } from './types.ts'

export type Button = keyof InputState
type OfflineOnlyButton = 'relay' | 'mod' | 'decoy' | 'mine' | 'noise' | 'steel' | 'tripwire'
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
}

function isOnlineRoutableButton(button: Button): button is OnlineRoutableButton {
  return button !== 'relay' && button !== 'mod' && button !== 'decoy' && button !== 'mine' && button !== 'noise' && button !== 'steel' && button !== 'tripwire'
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
  anchorX: number
  anchorY: number
  direction: Direction | null
}

interface ButtonPointerSession {
  kind: 'button'
  button: Button
  active: boolean
}

type PointerSession = JoystickPointerSession | ButtonPointerSession

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
  private readonly handleKeyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly handleKeyUp = (event: KeyboardEvent) => this.onKeyUp(event)
  private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event)
  private readonly handlePointerMove = (event: PointerEvent) => this.onPointerMove(event)
  private readonly handlePointerUp = (event: PointerEvent) => this.onPointerUp(event)
  private readonly handleMouseDown = (event: MouseEvent) => this.onMouseDown(event)
  private readonly handleMouseMove = (event: MouseEvent) => this.onMouseMove(event)
  private readonly handleMouseUp = () => this.onMouseUp()
  private readonly handleContextMenu = (event: MouseEvent) => this.onContextMenu(event)
  private readonly handleWindowBlur = () => this.releaseControls()
  private readonly pointerButtons = new PointerButtonTracker()
  private readonly pointerSessions = new Map<number, PointerSession>()
  private lastPointerEventTime = 0
  private orientationBlocked = false

  constructor(canvas: HTMLCanvasElement, game: TanchikiGame, online: OnlineInputTarget | null = null) {
    this.canvas = canvas
    this.game = game
    this.online = online
    this.game.setTouchControlsVisible(globalThis.matchMedia?.('(pointer: coarse)').matches ?? false)
    this.publishJoystickState(null)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerUp)
    canvas.addEventListener('lostpointercapture', this.handlePointerUp)
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('contextmenu', this.handleContextMenu)
    window.addEventListener('mouseup', this.handleMouseUp)
    window.addEventListener('blur', this.handleWindowBlur)
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerUp)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('blur', this.handleWindowBlur)
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
        this.game.back()
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

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'fire' || action === 'relay' || action === 'mod' || action === 'decoy' || action === 'mine' || action === 'noise' || action === 'steel' || action === 'tripwire') {
      event.preventDefault()
      this.game.setButton(action, false, 'keyboard')
    }
  }

  private onPointerDown(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
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
    this.setTouchControlsVisible(event.pointerType !== 'mouse')
    this.canvas.setPointerCapture(event.pointerId)
    event.preventDefault()

    this.beginPointerAction(point.x, point.y, event.pointerId)
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
    this.beginPointerAction(point.x, point.y, -1)
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
    this.releaseControls()
  }

  private beginPointerAction(x: number, y: number, pointerId: number) {
    if (this.orientationBlocked) {
      return
    }

    if (this.isOnlineActive()) {
      const hit = this.touchHitAt(x, y, false)

      if (hit === 'pause') {
        this.online?.releaseControls()
        return
      }

      if (hit === 'joystick') {
        this.beginJoystickPointer(pointerId, x, y)
      } else if (hit) {
        this.beginButtonPointer(pointerId, hit)
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
      this.game.primaryAction()
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
      this.beginJoystickPointer(pointerId, x, y)
    } else if (hit) {
      this.beginButtonPointer(pointerId, hit)
    }
  }

  private beginJoystickPointer(pointerId: number, x: number, y: number) {
    const activeJoystick = [...this.pointerSessions.values()].some((session) => session.kind === 'joystick')
    if (activeJoystick) {
      return
    }

    const session: JoystickPointerSession = {
      kind: 'joystick',
      anchorX: x,
      anchorY: y,
      direction: null,
    }
    this.pointerSessions.set(pointerId, session)
    this.publishJoystickState(session, 0, 0)
  }

  private beginButtonPointer(pointerId: number, button: Button) {
    this.pointerSessions.set(pointerId, { kind: 'button', button, active: true })
    this.updatePointerButton(pointerId, button)
  }

  private updatePointerSession(pointerId: number, session: PointerSession, x: number, y: number) {
    if (session.kind === 'joystick') {
      const layout = this.getTouchLayout()
      const dx = x - session.anchorX
      const dy = y - session.anchorY
      const nextDirection = getJoystickDirection(dx, dy, session.direction, layout)
      const offset = clampJoystickOffset(dx, dy, layout.joystick.maxOffset)
      session.direction = nextDirection
      this.updatePointerButton(pointerId, nextDirection)
      this.publishJoystickState(session, offset.x, offset.y)
      return
    }

    if (!session.active) {
      return
    }

    const hit = this.touchHitAt(x, y, !this.isOnlineActive())
    if (hit === session.button) {
      return
    }

    session.active = false
    this.updatePointerButton(pointerId, null)
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
          anchorX: layout.joystick.defaultCenterX,
          anchorY: layout.joystick.defaultCenterY,
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
    }
  }

  private releaseControls() {
    const hadJoystick = [...this.pointerSessions.values()].some((session) => session.kind === 'joystick')
    this.pointerSessions.clear()
    this.pointerButtons.releaseAll((button, down) => this.setActiveButton(button, down))
    if (hadJoystick) {
      this.publishJoystickState(null)
    }
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
    const hit = getTouchControlAt(x, y, this.getTouchLayout(), { includeActions })
    if (hit) {
      return hit
    }

    if (!includeActions || typeof this.game.getSnapshot !== 'function') {
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

    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    return {
      x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
      y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
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

  private toggleFullscreen() {
    const documentElement = this.canvas.ownerDocument

    if (documentElement.fullscreenElement) {
      void documentElement.exitFullscreen()
      return
    }

    void this.canvas.requestFullscreen()
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
  })
  const slot = getClassEquipmentHudLayout(model, stripWidth).slots.find((candidate) =>
    x - stripX >= candidate.x && x - stripX <= candidate.x + candidate.width,
  )?.slot

  if (slot?.kind === 'decoy') return 'decoy'
  if (slot?.kind === 'tripwire') return 'tripwire'
  if (slot?.kind === 'mine') return 'mine'
  if (slot?.kind === 'steel-trap') return 'steel'
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
