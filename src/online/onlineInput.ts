import type { Direction, PlayerCommand } from '../../packages/shared/src/index.ts'

export type OnlineInputButton = Direction | 'fire'

export interface OnlineInputDebugState {
  held: Record<OnlineInputButton, boolean>
  activeDirection: Direction | null
  fire: boolean
}

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']

export class OnlineInputTracker {
  private readonly held: Record<OnlineInputButton, boolean> = {
    up: false,
    right: false,
    down: false,
    left: false,
    fire: false,
  }
  private directionStack: Direction[] = []

  setButton(button: OnlineInputButton, down: boolean) {
    if (button === 'fire') {
      if (this.held.fire === down) {
        return false
      }

      this.held.fire = down
      return true
    }

    if (this.held[button] === down) {
      return false
    }

    this.held[button] = down
    this.directionStack = this.directionStack.filter((direction) => direction !== button)

    if (down) {
      this.directionStack.push(button)
    }

    return true
  }

  releaseAll() {
    const hadInput = Object.values(this.held).some(Boolean)

    for (const button of [...DIRECTIONS, 'fire'] as OnlineInputButton[]) {
      this.held[button] = false
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
      fire: this.held.fire,
    }
  }

  getDebugState(): OnlineInputDebugState {
    return {
      held: { ...this.held },
      activeDirection: this.getActiveDirection(),
      fire: this.held.fire,
    }
  }

  private getActiveDirection(): Direction | null {
    return this.directionStack[this.directionStack.length - 1] ?? null
  }
}

