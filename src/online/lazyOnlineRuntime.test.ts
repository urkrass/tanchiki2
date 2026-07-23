import { describe, expect, it, vi } from 'vitest'
import { LazyOnlineRuntime } from './lazyOnlineRuntime.ts'
import type {
  OnlineRuntime,
  OnlineRuntimeModule,
  OnlineRuntimeOptions,
} from './onlineRuntimeContract.ts'

function createOptions(): OnlineRuntimeOptions {
  return {
    canvas: {} as HTMLCanvasElement,
    entryInput: {} as HTMLInputElement,
    colorSafe: () => false,
    touchHandedness: () => 'standard',
    touchSideRailsActive: () => false,
  }
}

function createRuntime() {
  return {
    back: vi.fn(() => false),
    dispose: vi.fn(),
    drainAcousticCues: vi.fn(() => []),
    getAccessibilityAnnouncement: vi.fn(() => ({ key: 'online-ready', message: 'Ready.' })),
    getEquipmentKinds: vi.fn(() => []),
    getState: vi.fn(() => ({ connection: 'idle' })),
    handlePointerAction: vi.fn(() => false),
    isActive: vi.fn(() => false),
    isEntryEditing: vi.fn(() => false),
    isGameplayLive: vi.fn(() => false),
    openFieldBriefing: vi.fn(),
    releaseControls: vi.fn(),
    render: vi.fn(),
    renderText: vi.fn(() => '{"mode":"online-battle"}'),
    setButton: vi.fn(),
    setTouchControlsVisible: vi.fn(),
    setTouchHandedness: vi.fn(),
    setTouchJoystickState: vi.fn(),
    setTouchOrientationGate: vi.fn(),
    update: vi.fn(),
  } as unknown as OnlineRuntime
}

describe('LazyOnlineRuntime', () => {
  it('does not load network code until the online route is preloaded', async () => {
    const runtime = createRuntime()
    const createOnlineRuntime = vi.fn(() => runtime)
    const loader = vi.fn(async (): Promise<OnlineRuntimeModule> => ({ createOnlineRuntime }))
    const online = new LazyOnlineRuntime(createOptions(), loader)

    expect(loader).not.toHaveBeenCalled()
    expect(online.isActive()).toBe(false)

    await online.preload()
    await online.preload()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(createOnlineRuntime).toHaveBeenCalledTimes(1)
    expect(online.isActive()).toBe(false)
  })

  it('keeps a deterministic loading state until the requested briefing can open', async () => {
    const runtime = createRuntime()
    let resolveModule!: (module: OnlineRuntimeModule) => void
    const loader = vi.fn(() => new Promise<OnlineRuntimeModule>((resolve) => {
      resolveModule = resolve
    }))
    const online = new LazyOnlineRuntime(createOptions(), loader)

    online.openFieldBriefing('create')

    expect(online.isActive()).toBe(true)
    expect(JSON.parse(online.renderText())).toMatchObject({
      screen: 'runtime-loading',
      connection: 'loading',
      intent: 'create',
    })

    resolveModule({ createOnlineRuntime: () => runtime })
    await vi.waitFor(() => expect(runtime.openFieldBriefing).toHaveBeenCalledWith('create'))

    expect(online.isActive()).toBe(false)
  })

  it('applies touch state captured before the runtime finishes loading', async () => {
    const runtime = createRuntime()
    const loader = vi.fn(async (): Promise<OnlineRuntimeModule> => ({
      createOnlineRuntime: () => runtime,
    }))
    const online = new LazyOnlineRuntime(createOptions(), loader)
    const joystick = {
      active: true,
      anchorX: 10,
      anchorY: 20,
      offsetX: 2,
      offsetY: -2,
      direction: 'up' as const,
    }

    online.setTouchControlsVisible(true)
    online.setTouchHandedness('mirrored')
    online.setTouchJoystickState(joystick)
    online.setTouchOrientationGate(true, true)
    await online.preload()

    expect(runtime.setTouchControlsVisible).toHaveBeenCalledWith(true)
    expect(runtime.setTouchHandedness).toHaveBeenCalledWith('mirrored')
    expect(runtime.setTouchJoystickState).toHaveBeenCalledWith(joystick)
    expect(runtime.setTouchOrientationGate).toHaveBeenCalledWith(true, true)
  })

  it('surfaces a bounded route error and lets Back return to the offline menu', async () => {
    const loader = vi.fn(async (): Promise<OnlineRuntimeModule> => {
      throw new Error('online chunk unavailable')
    })
    const online = new LazyOnlineRuntime(createOptions(), loader)

    online.openFieldBriefing('join')
    await vi.waitFor(() => expect(JSON.parse(online.renderText()).screen).toBe('runtime-error'))

    expect(online.getAccessibilityAnnouncement()).toEqual({
      key: 'online-runtime-error',
      message: 'Online Battle could not load. Press Back to return.',
    })
    expect(online.back()).toBe(true)
    expect(online.isActive()).toBe(false)
  })

  it('disposes a runtime that finishes loading after the page unloads', async () => {
    const runtime = createRuntime()
    let resolveModule!: (module: OnlineRuntimeModule) => void
    const loader = vi.fn(() => new Promise<OnlineRuntimeModule>((resolve) => {
      resolveModule = resolve
    }))
    const online = new LazyOnlineRuntime(createOptions(), loader)

    const preload = online.preload()
    online.dispose()
    resolveModule({ createOnlineRuntime: () => runtime })
    await preload

    expect(runtime.dispose).toHaveBeenCalledTimes(1)
    expect(online.isActive()).toBe(false)
  })
})
