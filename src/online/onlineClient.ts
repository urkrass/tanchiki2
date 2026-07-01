import { MULTIPLAYER_TUNING, type Direction, type MultiplayerSnapshot } from '../../packages/shared/src/index.ts'
import {
  BATTLEFIELD_TILE_SIZE,
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
} from '../game/battlefield.ts'
import {
  appendSnapshotHistory,
  interpolateOnlineSnapshot,
  type InterpolatedOnlineSnapshot,
  type SnapshotHistoryEntry,
} from './onlineInterpolation.ts'
import {
  ONLINE_CAMERA_SMOOTHING_MS,
  createOnlineCameraState,
  getOnlineTargetCamera,
  type OnlineCameraState,
} from './onlineCamera.ts'
import { OnlineInputTracker, type OnlineInputButton } from './onlineInput.ts'
import { buildOnlineMinimapModel } from './onlineMinimap.ts'
import { ONLINE_BULLET_SMOOTHING_MODE, OnlineShotFeedback } from './onlineShooting.ts'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

const DEFAULT_SERVER_URL = 'http://127.0.0.1:8787'

export class OnlineBattleClient {
  private serverUrl = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined) ?? DEFAULT_SERVER_URL
  private state: ConnectionState = 'idle'
  private roomId: string | null = null
  private playerId: string | null = null
  private team: string | null = null
  private snapshot: MultiplayerSnapshot | null = null
  private snapshotHistory: SnapshotHistoryEntry[] = []
  private camera: OnlineCameraState | null = null
  private readonly input = new OnlineInputTracker()
  private readonly shotFeedback = new OnlineShotFeedback()
  private error = ''
  private events: EventSource | null = null
  private commandSeq = 0
  private lastSentSeq = 0
  private sendErrorCount = 0
  private commandAccumulator = 0
  private radioOpen = false
  private radioDraft = ''
  private touchControlsVisible = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
  private readonly keyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly keyUp = (event: KeyboardEvent) => this.onKeyUp(event)
  private readonly windowBlur = () => this.releaseControls()

  constructor() {
    window.addEventListener('keydown', this.keyDown, true)
    window.addEventListener('keyup', this.keyUp, true)
    window.addEventListener('blur', this.windowBlur)
  }

  dispose() {
    window.removeEventListener('keydown', this.keyDown, true)
    window.removeEventListener('keyup', this.keyUp, true)
    window.removeEventListener('blur', this.windowBlur)
    this.disconnect()
  }

  async connectQuickMatch(name = 'Rookie') {
    if (this.state === 'connecting' || this.state === 'connected') {
      return
    }

    this.state = 'connecting'
    this.error = ''

    try {
      const joined = await this.postJson<{ roomId: string; playerId: string; team: string }>('/rooms/quick/join', { name })
      this.roomId = joined.roomId
      this.playerId = joined.playerId
      this.team = joined.team
      this.openEvents()
      this.state = 'connected'
    } catch (error) {
      this.state = 'error'
      this.error = error instanceof Error ? error.message : 'Unable to connect'
    }
  }

  disconnect() {
    this.releaseControls()
    this.events?.close()
    this.events = null
    this.snapshot = null
    this.snapshotHistory = []
    this.camera = null
    this.shotFeedback.clear()
    this.roomId = null
    this.playerId = null
    this.team = null
    this.radioOpen = false
    this.radioDraft = ''
    this.state = 'idle'
  }

  update(dt: number) {
    if (this.state !== 'connected') {
      this.camera = null
      return
    }

    const visual = this.getVisualSnapshot(performance.now())
    this.shotFeedback.getActive(performance.now())
    this.updateCamera(dt, visual)

    this.commandAccumulator += dt
    if (this.commandAccumulator >= 0.05) {
      this.commandAccumulator = 0
      void this.sendCommand()
    }
  }

  isActive() {
    return this.state === 'connecting' || this.state === 'connected' || this.state === 'error'
  }

  getState(now = performance.now()) {
    const visual = this.getVisualSnapshot(now)
    this.ensureCamera(visual)

    return {
      connection: this.state,
      roomId: this.roomId,
      playerId: this.playerId,
      team: this.team,
      snapshot: this.snapshot,
      visual,
      camera: this.camera,
      error: this.error,
      radioOpen: this.radioOpen,
      radioDraft: this.radioDraft,
      touchControlsVisible: this.touchControlsVisible,
      shotEffects: this.shotFeedback.getActive(now),
    }
  }

  renderText() {
    const visual = this.getVisualSnapshot(performance.now())
    this.ensureCamera(visual)

    return JSON.stringify({
      mode: 'online-battle',
      connection: this.state,
      roomId: this.roomId,
      playerId: this.playerId,
      team: this.team,
      error: this.error,
      radio: {
        open: this.radioOpen,
        draft: this.radioDraft,
      },
      fog: this.snapshot?.fog ?? null,
      view: this.getViewSummary(),
      minimap: this.getMinimapSummary(),
      animation: visual?.animation ?? null,
      tempo: this.getTempoSummary(),
      shooting: this.getShootingSummary(performance.now()),
      input: this.getInputSummary(),
      snapshot: this.snapshot,
    })
  }

  setButton(button: OnlineInputButton, down: boolean, source: 'keyboard' | 'pointer' | 'program' = 'program') {
    if (this.radioOpen && down) {
      return
    }

    if (this.input.setButton(button, down, source)) {
      if (button === 'fire' && down) {
        this.triggerLocalShotEffect(performance.now())
      }
      this.sendImmediateCommand()
    }
  }

  releaseControls() {
    if (this.input.releaseAll()) {
      this.sendImmediateCommand()
    }
  }

  setTouchControlsVisible(visible: boolean) {
    this.touchControlsVisible = visible
  }

  async sendChat(text: string) {
    if (!this.roomId || !this.playerId) return
    await this.postJson(`/rooms/${this.roomId}/chat`, { playerId: this.playerId, text })
  }

  async sendPing(col: number, row: number) {
    if (!this.roomId || !this.playerId) return
    await this.postJson(`/rooms/${this.roomId}/pings`, { playerId: this.playerId, col, row })
  }

  getVisualSnapshot(now = performance.now()): InterpolatedOnlineSnapshot | null {
    return interpolateOnlineSnapshot(this.snapshotHistory, now)
  }

  private openEvents() {
    if (!this.roomId || !this.playerId) return
    this.events?.close()
    this.events = new EventSource(`${this.serverUrl}/rooms/${this.roomId}/events?playerId=${encodeURIComponent(this.playerId)}`)
    this.events.addEventListener('snapshot', (event) => {
      const snapshot = JSON.parse((event as MessageEvent).data) as MultiplayerSnapshot
      this.snapshot = snapshot
      this.snapshotHistory = appendSnapshotHistory(this.snapshotHistory, snapshot, performance.now())
    })
    this.events.addEventListener('close', () => {
      this.state = 'error'
      this.error = 'Server closed the room stream'
      this.events?.close()
      this.events = null
    })
    this.events.onerror = () => {
      if (this.state === 'connected') {
        this.state = 'error'
        this.error = 'Lost connection to multiplayer server'
      }
    }
  }

  private async sendCommand() {
    if (!this.roomId || !this.playerId) return
    const seq = this.commandSeq + 1
    this.commandSeq = seq
    this.lastSentSeq = seq
    await this.postJson(`/rooms/${this.roomId}/commands`, {
      playerId: this.playerId,
      command: { ...this.input.getCommand(), seq },
    }).catch(() => {
      this.sendErrorCount += 1
    })
  }

  private sendImmediateCommand() {
    if (this.state !== 'connected') {
      return
    }

    this.commandAccumulator = 0
    void this.sendCommand()
  }

  private async postJson<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed: ${response.status}`)
    }
    return payload as T
  }

  private getViewSummary() {
    if (!this.snapshot || !this.camera) {
      return null
    }

    return {
      tileSize: BATTLEFIELD_TILE_SIZE,
      viewCols: BATTLEFIELD_VIEW_COLS,
      viewRows: BATTLEFIELD_VIEW_ROWS,
      cameraCol: round(this.camera.current.col),
      cameraRow: round(this.camera.current.row),
      targetCameraCol: round(this.camera.target.col),
      targetCameraRow: round(this.camera.target.row),
      cameraSmoothingMs: ONLINE_CAMERA_SMOOTHING_MS,
    }
  }

  private getMinimapSummary() {
    if (!this.snapshot || !this.camera) {
      return null
    }

    const model = buildOnlineMinimapModel(this.snapshot, this.camera.current)

    return {
      enabled: model.enabled,
      fogPolicy: model.fogPolicy,
      visibleCellCount: model.visibleCellCount,
      visibleRetranslatorCount: model.visibleRetranslatorCount,
      visionCircleCount: model.visionCircles.length,
    }
  }

  private getInputSummary() {
    const debug = this.input.getDebugState()

    return {
      held: debug.held,
      activeDirection: debug.activeDirection,
      fire: debug.fire,
      commandSeq: this.commandSeq,
      lastSentSeq: this.lastSentSeq,
      sendErrorCount: this.sendErrorCount,
      touchControlsVisible: this.touchControlsVisible,
    }
  }

  private getTempoSummary() {
    return {
      moveCooldown: MULTIPLAYER_TUNING.moveCooldown,
      reloadSeconds: MULTIPLAYER_TUNING.reloadSeconds,
      bulletSpeed: MULTIPLAYER_TUNING.bulletSpeed,
      captureSeconds: MULTIPLAYER_TUNING.captureSeconds,
    }
  }

  private getShootingSummary(now: number) {
    return {
      ...this.shotFeedback.getDebug(now),
      bulletSmoothing: ONLINE_BULLET_SMOOTHING_MODE,
    }
  }

  private triggerLocalShotEffect(now: number) {
    const visual = this.getVisualSnapshot(now)
    const visualSelf = visual?.players.find((player) => player.self)
    const snapshotSelf = this.snapshot?.players.find((player) => player.self)
    const self = visualSelf ?? snapshotSelf

    if (!self) {
      return
    }

    const x = visualSelf ? visualSelf.visualCol + 0.5 : self.col + 0.5
    const y = visualSelf ? visualSelf.visualRow + 0.5 : self.row + 0.5

    this.shotFeedback.trigger(
      {
        id: self.id,
        team: self.team,
        dir: self.dir,
        x,
        y,
        alive: self.alive,
      },
      now,
    )
  }

  private ensureCamera(visual: InterpolatedOnlineSnapshot | null) {
    if (!this.camera) {
      this.updateCamera(0, visual)
    }
  }

  private updateCamera(dt: number, visual: InterpolatedOnlineSnapshot | null) {
    const target = this.snapshot ? getOnlineTargetCamera(this.snapshot, visual) : null
    this.camera = createOnlineCameraState(this.camera, target, dt, ONLINE_CAMERA_SMOOTHING_MS)
  }

  private onKeyDown(event: KeyboardEvent) {
    if (!this.isActive()) return
    event.stopImmediatePropagation()

    if (event.code === 'Escape') {
      event.preventDefault()
      if (this.radioOpen) {
        this.radioOpen = false
        this.radioDraft = ''
        return
      }
      this.disconnect()
      return
    }

    if (this.radioOpen) {
      this.handleRadioDraft(event)
      return
    }

    const direction = this.directionForKey(event.code)
    if (direction) {
      event.preventDefault()
      this.setButton(direction, true, 'keyboard')
    }

    if (event.code === 'Space') {
      event.preventDefault()
      this.setButton('fire', true, 'keyboard')
    }

    if (event.code === 'KeyQ' && this.snapshot) {
      event.preventDefault()
      const self = this.snapshot.players.find((player) => player.self)
      if (self) void this.sendPing(self.col, self.row)
    }

    if (event.code === 'KeyT') {
      event.preventDefault()
      this.releaseControls()
      this.radioOpen = true
      this.radioDraft = ''
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    if (!this.isActive()) return
    event.stopImmediatePropagation()

    const direction = this.directionForKey(event.code)
    if (direction) {
      event.preventDefault()
      this.setButton(direction, false, 'keyboard')
    }

    if (event.code === 'Space') {
      event.preventDefault()
      this.setButton('fire', false, 'keyboard')
    }
  }

  private directionForKey(code: string): Direction | null {
    if (code === 'ArrowUp' || code === 'KeyW') return 'up'
    if (code === 'ArrowDown' || code === 'KeyS') return 'down'
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left'
    if (code === 'ArrowRight' || code === 'KeyD') return 'right'
    return null
  }

  private handleRadioDraft(event: KeyboardEvent) {
    event.preventDefault()

    if (event.code === 'Enter') {
      const message = this.radioDraft.trim()
      this.radioOpen = false
      this.radioDraft = ''
      if (message) void this.sendChat(message)
      return
    }

    if (event.code === 'Backspace') {
      this.radioDraft = this.radioDraft.slice(0, -1)
      return
    }

    if (event.key.length === 1 && this.radioDraft.length < 72) {
      this.radioDraft += event.key
    }
  }
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}
