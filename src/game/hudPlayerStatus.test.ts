import { describe, expect, it } from 'vitest'
import { getOverdriveHudModel } from './hudPlayerStatus.ts'
import type { MajorModsSnapshot } from './types.ts'

const READY_OVERDRIVE: MajorModsSnapshot['overdrive'] = {
  active: false,
  remaining: 0,
  cooldown: 0,
  duration: 4,
  rechargeDuration: 12,
  ready: true,
}

describe('player HUD Overdrive model', () => {
  it('shows a full ready bar without a countdown', () => {
    expect(getOverdriveHudModel(READY_OVERDRIVE)).toEqual({
      phase: 'ready',
      label: 'OVERDRIVE',
      value: 'RDY',
      progress: 1,
    })
  })

  it('drains against the class-specific active duration', () => {
    expect(getOverdriveHudModel({
      ...READY_OVERDRIVE,
      active: true,
      ready: false,
      remaining: 2.1,
      cooldown: 14.1,
    })).toEqual({
      phase: 'active',
      label: 'OVERDRIVE',
      value: '3s',
      progress: 0.525,
    })
  })

  it('fills through the regeneration window and clamps stale values', () => {
    expect(getOverdriveHudModel({
      ...READY_OVERDRIVE,
      ready: false,
      cooldown: 9,
    })).toEqual({
      phase: 'recharging',
      label: 'REGEN',
      value: '9s',
      progress: 0.25,
    })

    expect(getOverdriveHudModel({
      ...READY_OVERDRIVE,
      ready: false,
      cooldown: 20,
    }).progress).toBe(0)
  })
})
