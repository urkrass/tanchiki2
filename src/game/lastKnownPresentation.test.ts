import { describe, expect, it } from 'vitest'
import { isPresentableSignalContact } from './lastKnownPresentation.ts'

describe('last-known position presentation policy', () => {
  it('never presents remembered enemy tank positions', () => {
    expect(isPresentableSignalContact({ id: 'enemy-tank-3' })).toBe(false)
  })

  it('preserves explicit equipment and radar contacts', () => {
    expect(isPresentableSignalContact({ id: 'device-decoy-2' })).toBe(true)
    expect(isPresentableSignalContact({ id: 'tripwire-contact', alert: true })).toBe(true)
  })
})
