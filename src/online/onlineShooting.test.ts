import { describe, expect, it } from 'vitest'
import { MULTIPLAYER_TUNING } from '../../packages/shared/src/index.ts'
import { ONLINE_BULLET_SMOOTHING_MODE, ONLINE_LOCAL_SHOT_DURATION_MS, OnlineShotFeedback } from './onlineShooting.ts'

describe('online shooting feedback', () => {
  it('emits a short cosmetic muzzle effect on a valid local shot', () => {
    const feedback = new OnlineShotFeedback()
    const effect = feedback.trigger(
      {
        id: 'blue-1',
        team: 'blue',
        dir: 'right',
        x: 5.5,
        y: 14.5,
        alive: true,
      },
      1000,
    )

    expect(effect).toMatchObject({
      sourceId: 'blue-1',
      team: 'blue',
      dir: 'right',
      originX: 5.5,
      originY: 14.5,
      muzzleX: 5.98,
      muzzleY: 14.5,
      durationMs: ONLINE_LOCAL_SHOT_DURATION_MS,
      progress: 0,
    })
    expect(feedback.getActive(1110)[0].progress).toBeCloseTo(0.5)
    expect(feedback.getActive(1250)).toEqual([])
  })

  it('rate-limits cosmetic local shots to the online reload tempo', () => {
    const feedback = new OnlineShotFeedback()
    const source = {
      id: 'blue-1',
      team: 'blue' as const,
      dir: 'up' as const,
      x: 5.5,
      y: 14.5,
      alive: true,
    }

    expect(feedback.trigger(source, 1000)?.id).toBe('local-shot-1')
    expect(feedback.trigger(source, 1000 + MULTIPLAYER_TUNING.reloadSeconds * 1000 - 1)).toBeNull()
    expect(feedback.trigger(source, 1000 + MULTIPLAYER_TUNING.reloadSeconds * 1000)?.id).toBe('local-shot-2')
    expect(feedback.getDebug(1600)).toMatchObject({
      activeLocalShotEffects: 1,
      localShotCooldownMs: MULTIPLAYER_TUNING.reloadSeconds * 1000,
      lastLocalShotAgeMs: 0,
    })
  })

  it('does not emit effects for dead local tanks and exposes the smoothing mode', () => {
    const feedback = new OnlineShotFeedback()

    expect(
      feedback.trigger(
        {
          id: 'blue-1',
          team: 'blue',
          dir: 'right',
          x: 5.5,
          y: 14.5,
          alive: false,
        },
        1000,
      ),
    ).toBeNull()
    expect(ONLINE_BULLET_SMOOTHING_MODE).toBe('synthetic-first-seen')
  })
})
