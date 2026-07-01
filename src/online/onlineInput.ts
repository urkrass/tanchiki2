import type { Direction, PlayerCommand } from '../../packages/shared/src/index.ts'

export type OnlineInputButton = Direction | 'fire'
export type OnlineInputSource = 'keyboard' | 'pointer' | 'program'

export interface OnlineInputDebugState {
  held: Record<OnlineInputButton, boolean>
  activeDirection: Direction | null
  fire: boolean
}

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

export class OnlineInputTracker {
  private readonly heldBySource: Record<OnlineInputButton, Set<OnlineInputSource>> = {
    up: new Set(),
    right: new Set(),
    down: new Set(),
    left: new Set(),
    fire: new Set(),
  }
  private directionStack: Array<{ direction: Direction; source: OnlineInputSource }> = []

  setButton(button: OnlineInputButton, down: boolean, source: OnlineInputSource = 'program') {
    if (button === 'fire') {
      return this.setHeldSource(button, source, down)
    }

    if (!this.setHeldSource(button, source, down)) {
      return false
    }

    this.directionStack = this.directionStack.filter((entry) => entry.direction !== button || entry.source !== source)

    if (down) {
      this.directionStack.push({ direction: button, source })
    }

    return true
  }

  releaseAll() {
    const hadInput = Object.values(this.heldBySource).some((sources) => sources.size > 0)

    for (const button of [...DIRECTIONS, 'fire'] as OnlineInputButton[]) {
      this.heldBySource[button].clear()
    }
    this.directionStack = []

    return hadInput
  }

  getCommand(): PlayerCommand {
    const activeDirection = this.getActiveDirection()

    return {
      up: activeDirection === 'up',
      down: activeDirection === 'down',
      left: activeDirection === 'left',
      right: activeDirection === 'right',
      fire: this.isHeld('fire'),
    }
  }

  getDebugState(): OnlineInputDebugState {
    return {
      held: {
        up: this.isHeld('up'),
        right: this.isHeld('right'),
        down: this.isHeld('down'),
        left: this.isHeld('left'),
        fire: this.isHeld('fire'),
      },
      activeDirection: this.getActiveDirection(),
      fire: this.isHeld('fire'),
    }
  }

  private getActiveDirection(): Direction | null {
    for (let index = this.directionStack.length - 1; index >= 0; index -= 1) {
      const entry = this.directionStack[index]
      if (entry && this.heldBySource[entry.direction].has(entry.source)) {
        return entry.direction
      }
    }

    return null
  }

  private setHeldSource(button: OnlineInputButton, source: OnlineInputSource, down: boolean) {
    const sources = this.heldBySource[button]
    const wasHeld = sources.size > 0
    const hadSource = sources.has(source)

    if (down) {
      sources.add(source)
    } else {
      sources.delete(source)
    }

    return hadSource !== down || wasHeld !== sources.size > 0
  }

  private isHeld(button: OnlineInputButton) {
    return this.heldBySource[button].size > 0
  }
}
