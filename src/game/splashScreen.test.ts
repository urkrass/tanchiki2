import { describe, expect, it } from 'vitest'
import {
  getRelaySplashSnapshot,
  RELAY_SPLASH_DURATION_SECONDS,
  RELAY_SPLASH_MIN_SKIP_SECONDS,
  RelaySplashScreen,
} from './splashScreen.ts'

describe('relay splash screen', () => {
  it('moves through a deterministic dramatic sequence before handoff', () => {
    expect(getRelaySplashSnapshot(0)).toMatchObject({
      mode: 'splash',
      title: 'TANCHIKI',
      phase: 'power-up',
      skippable: false,
      complete: false,
      relay: { active: true, frameCount: 16 },
    })
    expect(getRelaySplashSnapshot(1.2).phase).toBe('signal-lock')
    expect(getRelaySplashSnapshot(2.4).phase).toBe('title-reveal')
    expect(getRelaySplashSnapshot(3.8).phase).toBe('handoff')
    expect(getRelaySplashSnapshot(RELAY_SPLASH_DURATION_SECONDS)).toMatchObject({
      progress: 1,
      complete: true,
    })
  })

  it('clamps invalid and out-of-range timing without changing relay state', () => {
    expect(getRelaySplashSnapshot(Number.NaN)).toEqual(getRelaySplashSnapshot(0))
    expect(getRelaySplashSnapshot(-10)).toEqual(getRelaySplashSnapshot(0))
    expect(getRelaySplashSnapshot(99)).toEqual(getRelaySplashSnapshot(RELAY_SPLASH_DURATION_SECONDS))
  })

  it('only permits deliberate skip after the protected opening beat', () => {
    const canvas = makeCanvas()
    const splash = new RelaySplashScreen(canvas)

    expect(splash.skip()).toBe(false)
    splash.advance(RELAY_SPLASH_MIN_SKIP_SECONDS)
    expect(splash.skip()).toBe(true)
    expect(splash.isComplete()).toBe(true)
  })
})

function makeCanvas() {
  const context = new Proxy<Record<string, unknown>>({}, {
    get: () => (..._args: unknown[]) => undefined,
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
  return {
    getContext: (kind: string) => kind === '2d' ? context : null,
  } as unknown as HTMLCanvasElement
}
