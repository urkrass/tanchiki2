import type { TanchikiGame } from './game.ts'
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

  constructor(canvas: HTMLCanvasElement, game: TanchikiGame) {
    this.canvas = canvas
    this.game = game
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
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

  private toggleFullscreen() {
    const documentElement = this.canvas.ownerDocument

    if (documentElement.fullscreenElement) {
      void documentElement.exitFullscreen()
      return
    }

    void this.canvas.requestFullscreen()
  }
}
