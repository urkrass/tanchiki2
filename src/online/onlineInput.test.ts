import { describe, expect, it } from 'vitest'
import { OnlineInputTracker } from './onlineInput.ts'

describe('online input tracker', () => {
  it('restores the previous held direction when the active direction is released', () => {
    const input = new OnlineInputTracker()

    expect(input.setButton('up', true)).toBe(true)
    expect(input.setButton('right', true)).toBe(true)
    expect(input.getDebugState().activeDirection).toBe('right')
    expect(input.getCommand()).toMatchObject({ up: false, right: true, down: false, left: false })

    expect(input.setButton('right', false)).toBe(true)

    expect(input.getDebugState().activeDirection).toBe('up')
    expect(input.getCommand()).toMatchObject({ up: true, right: false, down: false, left: false })
  })

  it('keeps fire independent from the active movement direction', () => {
    const input = new OnlineInputTracker()

    input.setButton('left', true)
    input.setButton('fire', true)

    expect(input.getDebugState()).toMatchObject({
      activeDirection: 'left',
      fire: true,
      held: { left: true, fire: true },
    })
    expect(input.getCommand()).toMatchObject({ left: true, fire: true })
  })

  it('sends no movement after the final held direction is released', () => {
    const input = new OnlineInputTracker()

    input.setButton('down', true)
    input.setButton('down', false)

    expect(input.getDebugState().activeDirection).toBeNull()
    expect(input.getCommand()).toMatchObject({
      up: false,
      right: false,
      down: false,
      left: false,
      fire: false,
    })
  })

  it('releaseAll clears movement and fire only when input was held', () => {
    const input = new OnlineInputTracker()

    expect(input.releaseAll()).toBe(false)
    input.setButton('up', true)
    input.setButton('fire', true)

    expect(input.releaseAll()).toBe(true)
    expect(input.getDebugState()).toMatchObject({
      activeDirection: null,
      fire: false,
      held: { up: false, fire: false },
    })
  })
})

