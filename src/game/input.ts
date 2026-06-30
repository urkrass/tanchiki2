import type { TanchikiGame } from './game.ts'
import { HUD_X, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts'
import type { InputState } from './types.ts'

type Button = keyof InputState
type Action = Button | 'back' | 'fullscreen' | 'pause' | 'restart' | 'start'

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
  Enter: 'start',
  Escape: 'back',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyF: 'fullscreen',
}

export class InputController {
  private readonly canvas: HTMLCanvasElement
  private readonly game: TanchikiGame
  private readonly handleKeyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly handleKeyUp = (event: KeyboardEvent) => this.onKeyUp(event)
  private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event)
  private readonly handlePointerMove = (event: PointerEvent) => this.onPointerMove(event)
  private readonly handlePointerUp = (event: PointerEvent) => this.onPointerUp(event)
  private readonly handleMouseDown = (event: MouseEvent) => this.onMouseDown(event)
  private readonly handleMouseMove = (event: MouseEvent) => this.onMouseMove(event)
  private readonly handleMouseUp = () => this.onMouseUp()
  private activePointerId: number | null = null
  private activeTouchButton: Button | null = null
  private lastPointerEventTime = 0

  constructor(canvas: HTMLCanvasElement, game: TanchikiGame) {
    this.canvas = canvas
    this.game = game
    this.game.setTouchControlsVisible(globalThis.matchMedia?.('(pointer: coarse)').matches ?? false)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerUp)
    canvas.addEventListener('lostpointercapture', this.handlePointerUp)
    canvas.addEventListener('mousedown', this.handleMouseDown)
    canvas.addEventListener('mousemove', this.handleMouseMove)
    window.addEventListener('mouseup', this.handleMouseUp)
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
    window.removeEventListener('mouseup', this.handleMouseUp)
  }

  private onKeyDown(event: KeyboardEvent) {
    const action = KEY_BINDINGS[event.code]

    if (!action) {
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

    if (action === 'restart') {
      if (!event.repeat) {
        this.game.restart()
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
      if (!event.repeat && (action === 'up' || action === 'left')) {
        this.game.navigateMenu(-1)
      } else if (!event.repeat && (action === 'down' || action === 'right')) {
        this.game.navigateMenu(1)
      } else if (!event.repeat && action === 'fire') {
        this.game.primaryAction()
      }
      return
    }

    this.game.setButton(action, true)
  }

  private onKeyUp(event: KeyboardEvent) {
    const action = KEY_BINDINGS[event.code]

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'fire') {
      event.preventDefault()
      this.game.setButton(action, false)
    }
  }

  private onPointerDown(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    const point = this.toLogicalClientPoint(event.clientX, event.clientY)

    if (!point) {
      return
    }

    this.canvas.focus()
    this.game.setTouchControlsVisible(event.pointerType !== 'mouse')
    this.canvas.setPointerCapture(event.pointerId)
    event.preventDefault()

    this.beginPointerAction(point.x, point.y, event.pointerId)
  }

  private onPointerMove(event: PointerEvent) {
    if (this.activePointerId !== event.pointerId || this.game.getMode() !== 'playing') {
      return
    }

    this.lastPointerEventTime = performance.now()
    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    const nextButton = point ? this.touchButtonAt(point.x, point.y) : null

    if (nextButton === 'pause' || nextButton === this.activeTouchButton) {
      return
    }

    if (this.activeTouchButton) {
      this.game.setButton(this.activeTouchButton, false)
    }

    if (nextButton) {
      this.activeTouchButton = nextButton
      this.game.setButton(nextButton, true)
    } else {
      this.activeTouchButton = null
    }
  }

  private onPointerUp(event: PointerEvent) {
    this.lastPointerEventTime = performance.now()
    if (this.activePointerId !== null && this.activePointerId !== event.pointerId) {
      return
    }

    this.clearPointerAction()
  }

  private onMouseDown(event: MouseEvent) {
    if (performance.now() - this.lastPointerEventTime < 80) {
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }

    this.canvas.focus()
    this.game.setTouchControlsVisible(false)
    event.preventDefault()
    this.beginPointerAction(point.x, point.y, -1)
  }

  private onMouseMove(event: MouseEvent) {
    if (this.activePointerId !== -1 || this.game.getMode() !== 'playing') {
      return
    }

    const point = this.toLogicalClientPoint(event.clientX, event.clientY)
    const nextButton = point ? this.touchButtonAt(point.x, point.y) : null
    this.updateActiveTouchButton(nextButton)
  }

  private onMouseUp() {
    if (this.activePointerId === -1) {
      this.clearPointerAction()
    }
  }

  private beginPointerAction(x: number, y: number, pointerId: number) {
    if (this.game.getMode() !== 'playing') {
      this.handleMenuPointer(y)
      return
    }

    const button = this.touchButtonAt(x, y)

    if (button === 'pause') {
      this.game.togglePause()
      return
    }

    if (button) {
      this.activePointerId = pointerId
      this.activeTouchButton = button
      this.game.setButton(button, true)
    }
  }

  private updateActiveTouchButton(nextButton: Button | 'pause' | null) {
    if (nextButton === 'pause' || nextButton === this.activeTouchButton) {
      return
    }

    if (this.activeTouchButton) {
      this.game.setButton(this.activeTouchButton, false)
    }

    if (nextButton) {
      this.activeTouchButton = nextButton
      this.game.setButton(nextButton, true)
    } else {
      this.activeTouchButton = null
    }
  }

  private clearPointerAction() {
    if (this.activeTouchButton) {
      this.game.setButton(this.activeTouchButton, false)
    }

    this.activePointerId = null
    this.activeTouchButton = null
  }

  private handleMenuPointer(y: number) {
    const optionIndex = Math.floor((y - 184) / 22)

    if (optionIndex < 0) {
      return
    }

    this.game.selectMenuIndex(optionIndex)
    this.game.primaryAction()
  }

  private touchButtonAt(x: number, y: number): Button | 'pause' | null {
    if (x >= HUD_X && y >= 188 && y <= 236) {
      return 'pause'
    }

    const fireDx = x - 356
    const fireDy = y - 372
    if (fireDx * fireDx + fireDy * fireDy <= 48 * 48) {
      return 'fire'
    }

    if (x < 26 || x > 136 || y < 314 || y > 426) {
      return null
    }

    const dx = x - 80
    const dy = y - 372
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? 'left' : 'right'
    }

    return dy < 0 ? 'up' : 'down'
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

  private toggleFullscreen() {
    const documentElement = this.canvas.ownerDocument

    if (documentElement.fullscreenElement) {
      void documentElement.exitFullscreen()
      return
    }

    void this.canvas.requestFullscreen()
  }
}
