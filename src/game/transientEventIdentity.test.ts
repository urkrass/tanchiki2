import { describe, expect, it } from 'vitest'
import { MonotonicTransientId } from './transientEventIdentity.ts'

describe('monotonic transient identity', () => {
  it('never reuses an active id when earlier events expire out of order', () => {
    const ids = new MonotonicTransientId('notice')
    const first = ids.next()
    const second = ids.next()
    const stillActive = [second]
    const third = ids.next()

    expect(first).toBe('notice-1')
    expect(stillActive).toEqual(['notice-2'])
    expect(third).toBe('notice-3')
    expect(stillActive).not.toContain(third)
  })

  it('resets only at an explicit lifecycle boundary', () => {
    const ids = new MonotonicTransientId('cue')
    ids.next()
    ids.reset()
    expect(ids.next()).toBe('cue-1')
  })
})
