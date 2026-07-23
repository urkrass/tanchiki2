import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../game/constants.ts'
import { drawPixelText } from '../game/pixelText.ts'
import type {
  OnlineRuntime,
  OnlineRuntimeModule,
  OnlineRuntimeOptions,
} from './onlineRuntimeContract.ts'

type RuntimeLoader = () => Promise<OnlineRuntimeModule>
type TouchControlsVisibleArgs = Parameters<OnlineRuntime['setTouchControlsVisible']>
type TouchHandednessArgs = Parameters<OnlineRuntime['setTouchHandedness']>
type TouchJoystickArgs = Parameters<OnlineRuntime['setTouchJoystickState']>
type TouchOrientationArgs = Parameters<OnlineRuntime['setTouchOrientationGate']>

const loadBrowserOnlineRuntime: RuntimeLoader = () => import('./onlineRuntime.ts')

function describeLoadError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 160)
  }
  return 'The online runtime could not be loaded.'
}

export class LazyOnlineRuntime {
  private readonly options: OnlineRuntimeOptions
  private readonly loadRuntimeModule: RuntimeLoader
  private runtime: OnlineRuntime | null = null
  private runtimePromise: Promise<OnlineRuntime> | null = null
  private activationIntent: Parameters<OnlineRuntime['openFieldBriefing']>[0] | null = null
  private activationError = ''
  private activationGeneration = 0
  private disposed = false
  private preloadAttempted = false
  private touchControlsVisibleArgs: TouchControlsVisibleArgs | null = null
  private touchHandednessArgs: TouchHandednessArgs | null = null
  private touchJoystickArgs: TouchJoystickArgs | null = null
  private touchOrientationArgs: TouchOrientationArgs | null = null

  constructor(
    options: OnlineRuntimeOptions,
    loadRuntimeModule: RuntimeLoader = loadBrowserOnlineRuntime,
  ) {
    this.options = options
    this.loadRuntimeModule = loadRuntimeModule
  }

  preload() {
    if (this.disposed) {
      return Promise.resolve(null)
    }
    if (this.runtime || this.runtimePromise || this.preloadAttempted) {
      return this.runtimePromise ?? Promise.resolve(this.runtime)
    }
    this.preloadAttempted = true
    return this.ensureRuntime().catch(() => null)
  }

  openFieldBriefing(intent: Parameters<OnlineRuntime['openFieldBriefing']>[0]) {
    if (this.disposed) {
      return
    }
    const generation = ++this.activationGeneration
    this.activationIntent = intent
    this.activationError = ''

    void this.ensureRuntime(true)
      .then((runtime) => {
        if (generation !== this.activationGeneration || this.activationIntent !== intent) {
          return
        }
        runtime.openFieldBriefing(intent)
        this.activationIntent = null
      })
      .catch((error: unknown) => {
        if (generation !== this.activationGeneration) {
          return
        }
        this.activationError = describeLoadError(error)
      })
  }

  isActive() {
    return Boolean(this.activationIntent || this.activationError || this.runtime?.isActive())
  }

  isGameplayLive() {
    return this.runtime?.isGameplayLive() ?? false
  }

  isEntryEditing() {
    return this.runtime?.isEntryEditing() ?? false
  }

  getState(...args: Parameters<OnlineRuntime['getState']>): ReturnType<OnlineRuntime['getState']> | null {
    return this.runtime?.getState(...args) ?? null
  }

  update(dt: number) {
    this.runtime?.update(dt)
  }

  render() {
    if (this.runtime?.isActive()) {
      this.runtime.render()
      return
    }
    this.renderBoundaryState()
  }

  renderText() {
    if (this.runtime?.isActive()) {
      return this.runtime.renderText()
    }
    return JSON.stringify({
      mode: 'online-battle',
      screen: this.activationError ? 'runtime-error' : 'runtime-loading',
      connection: this.activationError ? 'error' : 'loading',
      intent: this.activationIntent,
      error: this.activationError || null,
    })
  }

  getAccessibilityAnnouncement(): ReturnType<OnlineRuntime['getAccessibilityAnnouncement']> {
    if (this.runtime?.isActive()) {
      return this.runtime.getAccessibilityAnnouncement()
    }
    return this.activationError
      ? {
          key: 'online-runtime-error',
          message: 'Online Battle could not load. Press Back to return.',
        }
      : {
          key: 'online-runtime-loading',
          message: 'Loading Online Battle.',
        }
  }

  drainAcousticCues(): ReturnType<OnlineRuntime['drainAcousticCues']> {
    return this.runtime?.drainAcousticCues() ?? []
  }

  setButton(...args: Parameters<OnlineRuntime['setButton']>) {
    this.runtime?.setButton(...args)
  }

  releaseControls() {
    this.runtime?.releaseControls()
  }

  handlePointerAction(...args: Parameters<OnlineRuntime['handlePointerAction']>) {
    return this.runtime?.handlePointerAction(...args) ?? false
  }

  getEquipmentKinds(): ReturnType<OnlineRuntime['getEquipmentKinds']> {
    return this.runtime?.getEquipmentKinds() ?? []
  }

  setTouchControlsVisible(...args: TouchControlsVisibleArgs) {
    this.touchControlsVisibleArgs = args
    this.runtime?.setTouchControlsVisible(...args)
  }

  setTouchHandedness(...args: TouchHandednessArgs) {
    this.touchHandednessArgs = args
    this.runtime?.setTouchHandedness(...args)
  }

  setTouchJoystickState(...args: TouchJoystickArgs) {
    this.touchJoystickArgs = args
    this.runtime?.setTouchJoystickState(...args)
  }

  setTouchOrientationGate(...args: TouchOrientationArgs) {
    this.touchOrientationArgs = args
    this.runtime?.setTouchOrientationGate(...args)
  }

  back() {
    if (this.activationIntent || this.activationError) {
      this.activationGeneration += 1
      this.activationIntent = null
      this.activationError = ''
      return true
    }
    return this.runtime?.back() ?? false
  }

  dispose() {
    this.disposed = true
    this.activationGeneration += 1
    this.activationIntent = null
    this.activationError = ''
    this.runtime?.dispose()
  }

  private ensureRuntime(retryAfterPreloadFailure = false) {
    if (this.runtime) {
      return Promise.resolve(this.runtime)
    }
    if (this.runtimePromise) {
      return this.runtimePromise
    }
    if (retryAfterPreloadFailure) {
      this.preloadAttempted = true
    }

    this.runtimePromise = this.loadRuntimeModule()
      .then((module) => {
        const runtime = module.createOnlineRuntime(this.options)
        if (this.disposed) {
          runtime.dispose()
          throw new Error('Online runtime disposed before loading completed.')
        }
        this.runtime = runtime
        this.applyPendingSettings(runtime)
        return runtime
      })
      .finally(() => {
        this.runtimePromise = null
      })

    return this.runtimePromise
  }

  private applyPendingSettings(runtime: OnlineRuntime) {
    if (this.touchControlsVisibleArgs) runtime.setTouchControlsVisible(...this.touchControlsVisibleArgs)
    if (this.touchHandednessArgs) runtime.setTouchHandedness(...this.touchHandednessArgs)
    if (this.touchJoystickArgs) runtime.setTouchJoystickState(...this.touchJoystickArgs)
    if (this.touchOrientationArgs) runtime.setTouchOrientationGate(...this.touchOrientationArgs)
  }

  private renderBoundaryState() {
    const context = this.options.canvas.getContext('2d')
    if (!context) return

    context.imageSmoothingEnabled = false
    context.fillStyle = '#111612'
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    context.fillStyle = '#243028'
    context.fillRect(0, Math.floor(LOGICAL_HEIGHT / 2) - 1, LOGICAL_WIDTH, 2)

    drawPixelText(
      context,
      this.activationError ? 'ONLINE BATTLE UNAVAILABLE' : 'PREPARING ONLINE BATTLE',
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2 - 30,
      {
        color: this.activationError ? '#ff6b5f' : '#73d7ff',
        scale: 3,
        align: 'center',
      },
    )
    drawPixelText(
      context,
      this.activationError ? 'PRESS BACK TO RETURN' : 'LOADING NETWORK CODE',
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2 + 14,
      {
        color: '#d7d6bd',
        scale: 2,
        align: 'center',
      },
    )
  }
}
