import type { Direction, MultiplayerSnapshot, PlayerCommand } from '../../packages/shared/src/index.ts'
import {
  BATTLEFIELD_TILE_SIZE,
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  centerBattlefieldCameraOnCell,
} from '../game/battlefield.ts'
import {
  appendSnapshotHistory,
  interpolateOnlineSnapshot,
  type InterpolatedOnlineSnapshot,
  type SnapshotHistoryEntry,
} from './onlineInterpolation.ts'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

const DEFAULT_SERVER_URL = 'http://127.0.0.1:8787'
const ONLINE_MAP_COLS = 20
const ONLINE_MAP_ROWS = 16

export class OnlineBattleClient {
  private serverUrl = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined) ?? DEFAULT_SERVER_URL
  private state: ConnectionState = 'idle'
  private roomId: string | null = null
  private playerId: string | null = null
  private team: string | null = null
  private snapshot: MultiplayerSnapshot | null = null
  private snapshotHistory: SnapshotHistoryEntry[] = []
  private error = ''
  private events: EventSource | null = null
  private command: PlayerCommand = {}
  private commandSeq = 0
  private commandAccumulator = 0
  private radioOpen = false
  private radioDraft = ''
  private readonly keyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly keyUp = (event: KeyboardEvent) => this.onKeyUp(event)

  constructor() {
    window.addEventListener('keydown', this.keyDown, true)
    window.addEventListener('keyup', this.keyUp, true)
  }

  dispose() {
    window.removeEventListener('keydown', this.keyDown, true)
    window.removeEventListener('keyup', this.keyUp, true)
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
    this.events?.close()
    this.events = null
    this.snapshot = null
    this.snapshotHistory = []
    this.roomId = null
    this.playerId = null
    this.team = null
    this.command = {}
    this.radioOpen = false
    this.radioDraft = ''
    this.state = 'idle'
  }

  update(dt: number) {
    if (this.state !== 'connected') {
      return
    }

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
    return {
      connection: this.state,
      roomId: this.roomId,
      playerId: this.playerId,
      team: this.team,
      snapshot: this.snapshot,
      visual: this.getVisualSnapshot(now),
      error: this.error,
      radioOpen: this.radioOpen,
      radioDraft: this.radioDraft,
    }
  }

  renderText() {
    const visual = this.getVisualSnapshot(performance.now())

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
      animation: visual?.animation ?? null,
      snapshot: this.snapshot,
    })
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
    this.commandSeq += 1
    await this.postJson(`/rooms/${this.roomId}/commands`, {
      playerId: this.playerId,
      command: { ...this.command, seq: this.commandSeq },
    }).catch(() => undefined)
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
    if (!this.snapshot) {
      return null
    }

    const self = this.snapshot.players.find((player) => player.self)
    const camera = centerBattlefieldCameraOnCell(self?.col ?? 0, self?.row ?? 0, ONLINE_MAP_COLS, ONLINE_MAP_ROWS)

    return {
      tileSize: BATTLEFIELD_TILE_SIZE,
      viewCols: BATTLEFIELD_VIEW_COLS,
      viewRows: BATTLEFIELD_VIEW_ROWS,
      cameraCol: camera.col,
      cameraRow: camera.row,
    }
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
      this.command = { up: false, down: false, left: false, right: false, fire: this.command.fire, [direction]: true }
    }

    if (event.code === 'Space') {
      event.preventDefault()
      this.command.fire = true
    }

    if (event.code === 'KeyQ' && this.snapshot) {
      event.preventDefault()
      const self = this.snapshot.players.find((player) => player.self)
      if (self) void this.sendPing(self.col, self.row)
    }

    if (event.code === 'KeyT') {
      event.preventDefault()
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
      this.command[direction] = false
    }

    if (event.code === 'Space') {
      event.preventDefault()
      this.command.fire = false
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
