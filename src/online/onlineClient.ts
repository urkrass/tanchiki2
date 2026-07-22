import { Client, type Room } from '@colyseus/sdk'
import {
  MULTIPLAYER_TUNING,
  ONLINE_PROTOCOL_VERSION,
  ClientNetworkDiagnostics,
  type ClientRoomMessage,
  type Direction,
  type LobbyView,
  type MatchResult,
  type MultiplayerSnapshot,
  type Team,
} from '../../packages/shared/src/index.ts'
import {
  BATTLEFIELD_TILE_SIZE,
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
} from '../game/battlefield.ts'
import type { TouchHandedness, TouchJoystickSnapshot, TouchOrientationGateSnapshot } from '../game/types.ts'
import {
  ONLINE_CAMERA_SMOOTHING_MS,
  createOnlineCameraState,
  getOnlineTargetCamera,
  type OnlineCameraState,
} from './onlineCamera.ts'
import { OnlineInputTracker, type OnlineInputButton } from './onlineInput.ts'
import {
  appendSnapshotHistory,
  interpolateOnlineSnapshot,
  type InterpolatedOnlineSnapshot,
  type SnapshotHistoryEntry,
} from './onlineInterpolation.ts'
import { buildOnlineMinimapModel } from './onlineMinimap.ts'
import { ONLINE_BULLET_SMOOTHING_MODE, OnlineShotFeedback } from './onlineShooting.ts'
import { getOnlineReadableText, getOnlineRenderedStatus } from './onlineStatus.ts'
import {
  getOnlineEntryHit,
  normalizeOnlineEntryValue,
  type OnlineEntryField,
} from './onlineEntryLayout.ts'
import { getOnlineLobbyControlHit, getOnlineLobbyStartState } from './onlineLobbyControls.ts'

export type OnlineConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
export type FieldBriefingIntent = 'create' | 'join'

const DEFAULT_SERVER_URL = 'http://127.0.0.1:8787'
const RECONNECTION_SESSION_KEY = 'tanchiki.online.reconnection.v1'
const PLAYER_NAME_SESSION_KEY = 'tanchiki.online.player-name.v1'

export class OnlineBattleClient {
  private serverUrl = getMultiplayerServerUrl()
  private state: OnlineConnectionState = 'idle'
  private intent: FieldBriefingIntent | null = null
  private room: Room | null = null
  private roomId: string | null = null
  private playerId: string | null = null
  private team: Team | null = null
  private lobby: LobbyView | null = null
  private result: MatchResult | null = null
  private resultRendered = false
  private snapshot: MultiplayerSnapshot | null = null
  private snapshotHistory: SnapshotHistoryEntry[] = []
  private camera: OnlineCameraState | null = null
  private readonly input = new OnlineInputTracker()
  private readonly shotFeedback = new OnlineShotFeedback()
  private error = ''
  private errorCode = ''
  private commandSeq = 0
  private lastSentSeq = 0
  private sendErrorCount = 0
  private commandAccumulator = 0
  private heartbeatAccumulator = 0
  private heartbeatSeq = 0
  private readonly diagnostics = new ClientNetworkDiagnostics()
  private radioOpen = false
  private radioDraft = ''
  private playerName = readSessionText(PLAYER_NAME_SESSION_KEY, 'Rookie', 18)
  private roomKeyDraft = ''
  private formSelection = 0
  private editingField: OnlineEntryField | null = null
  private replaceFieldOnType = false
  private selectedRosterIndex = 0
  private copyState: 'idle' | 'copied' | 'failed' = 'idle'
  private touchControlsVisible = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
  private touchHandedness: TouchHandedness = 'standard'
  private touchJoystick: TouchJoystickSnapshot = {
    active: false,
    anchorX: 128,
    anchorY: 370,
    offsetX: 0,
    offsetY: 0,
    direction: null,
  }
  private touchOrientationGate: TouchOrientationGateSnapshot = {
    active: false,
    reason: null,
    onlineBattleLive: false,
  }
  private readonly keyDown = (event: KeyboardEvent) => this.onKeyDown(event)
  private readonly keyUp = (event: KeyboardEvent) => this.onKeyUp(event)
  private readonly windowBlur = () => this.releaseControls()
  private readonly entryInput: HTMLInputElement | null
  private readonly entryInputEvent = () => this.handleNativeEntryInput()
  private readonly entryInputKeyDown = (event: KeyboardEvent) => this.handleNativeEntryKeyDown(event)
  private readonly entryInputBlur = () => this.finishEditing()

  constructor(entryInput: HTMLInputElement | null = null) {
    this.entryInput = entryInput
    window.addEventListener('keydown', this.keyDown, true)
    window.addEventListener('keyup', this.keyUp, true)
    window.addEventListener('blur', this.windowBlur)
    this.entryInput?.addEventListener('input', this.entryInputEvent)
    this.entryInput?.addEventListener('keydown', this.entryInputKeyDown)
    this.entryInput?.addEventListener('blur', this.entryInputBlur)
  }

  dispose() {
    window.removeEventListener('keydown', this.keyDown, true)
    window.removeEventListener('keyup', this.keyUp, true)
    window.removeEventListener('blur', this.windowBlur)
    this.entryInput?.removeEventListener('input', this.entryInputEvent)
    this.entryInput?.removeEventListener('keydown', this.entryInputKeyDown)
    this.entryInput?.removeEventListener('blur', this.entryInputBlur)
    this.disconnect()
  }

  openFieldBriefing(intent: FieldBriefingIntent) {
    if (this.isActive()) return
    this.intent = intent
    this.state = 'idle'
    this.error = ''
    this.errorCode = ''
    this.roomKeyDraft = ''
    this.formSelection = 0
    this.finishEditing()
    this.copyState = 'idle'
  }

  async createRoom() {
    if (this.state === 'connecting' || this.room) return
    this.state = 'connecting'
    this.error = ''
    this.errorCode = ''
    try {
      const sdk = new Client(this.serverUrl)
      const room = await sdk.create('team_battle', {
        protocolVersion: ONLINE_PROTOCOL_VERSION,
        name: this.playerName,
        create: true,
      })
      this.attachRoom(room)
    } catch (error) {
      this.failConnection(error)
    }
  }

  async joinRoom() {
    if (this.state === 'connecting' || this.room) return
    this.state = 'connecting'
    this.error = ''
    this.errorCode = ''
    try {
      const resolution = await this.postJson<{ ok: true; roomId: string }>('/matchmake/room-key', {
        protocolVersion: ONLINE_PROTOCOL_VERSION,
        roomKey: this.roomKeyDraft,
      })
      const sdk = new Client(this.serverUrl)
      const room = await sdk.joinById(resolution.roomId, {
        protocolVersion: ONLINE_PROTOCOL_VERSION,
        name: this.playerName,
        roomKey: this.roomKeyDraft,
      })
      this.attachRoom(room)
      this.roomKeyDraft = ''
    } catch (error) {
      this.failConnection(error)
    }
  }

  async resumeSavedConnection() {
    const token = readReconnectionToken()
    if (!token || this.room || this.state === 'connecting') return false
    this.state = 'connecting'
    this.error = ''
    this.errorCode = ''
    try {
      const sdk = new Client(this.serverUrl)
      const room = await sdk.reconnect(token)
      this.attachRoom(room)
      return true
    } catch (error) {
      clearReconnectionToken()
      this.failConnection(error)
      return false
    }
  }

  disconnect() {
    this.releaseControls()
    const room = this.room
    this.room = null
    if (room) void room.leave(true).catch(() => {})
    clearReconnectionToken()
    this.resetOnlineState()
  }

  back() {
    if (!this.isActive()) return false
    if (this.radioOpen) {
      this.radioOpen = false
      this.radioDraft = ''
      return true
    }
    if (this.editingField) {
      this.finishEditing()
      return true
    }
    this.disconnect()
    return true
  }

  update(dt: number) {
    const now = performance.now()
    this.diagnostics.recordFrame(dt, now)
    if (this.room && this.state === 'connected') {
      this.heartbeatAccumulator += dt
      if (this.heartbeatAccumulator >= 1) {
        this.heartbeatAccumulator %= 1
        this.sendHeartbeat(now)
      }
    }
    if (this.state !== 'connected' || this.lobby?.phase !== 'PLAYING') {
      if (this.lobby?.phase !== 'PLAYING') this.camera = null
      return
    }
    const visual = this.getVisualSnapshot(performance.now())
    this.shotFeedback.getActive(performance.now())
    this.updateCamera(dt, visual)
    this.commandAccumulator += dt
    if (this.commandAccumulator >= 0.05) {
      this.commandAccumulator = 0
      this.sendInputCommand()
    }
  }

  isActive() {
    return this.intent !== null || this.room !== null || this.state !== 'idle'
  }

  isGameplayLive() {
    return this.state === 'connected' && this.lobby?.phase === 'PLAYING' && Boolean(this.snapshot)
  }

  getAccessibilityAnnouncement() {
    if (this.result) {
      const winner = this.result.winner
        ? `${this.result.winner === 'blue' ? 'Blue' : 'Red'} team wins.`
        : 'The round is a draw.'
      return {
        key: `online-results-${this.result.resultId}`,
        message: `Round complete. ${winner} Final score: Blue ${this.result.scores.blue}, Red ${this.result.scores.red}.`,
      }
    }

    if (this.state === 'reconnecting') {
      return { key: 'online-reconnecting', message: 'Connection interrupted. Rejoining the battle.' }
    }

    if (this.state === 'error' || this.error) {
      return { key: `online-error-${this.errorCode || 'unknown'}`, message: 'Online battle needs attention. Review the message on screen.' }
    }

    if (!this.lobby) {
      const action = this.intent === 'join' ? 'Enter your name and room key to join.' : 'Enter your name to create a private room.'
      return { key: `online-entry-${this.intent}-${this.state}`, message: `Online Field Briefing. ${action}` }
    }

    if (this.lobby.phase === 'COUNTDOWN') {
      const seconds = this.lobby.countdownEndsAt
        ? Math.max(0, Math.ceil((this.lobby.countdownEndsAt - Date.now()) / 1000))
        : 0
      return { key: `online-countdown-${seconds}`, message: `Deployment begins in ${seconds} seconds.` }
    }

    if (this.lobby.phase === 'LOBBY') {
      const ready = this.lobby.players.filter((player) => player.ready && player.connected).length
      const keyStatus = this.lobby.roomKey ? ' The private room key is available through the copy action.' : ''
      return {
        key: `online-lobby-${this.lobby.version}`,
        message: `Field Briefing. ${this.lobby.players.length} players joined; ${ready} ready.${keyStatus}`,
      }
    }

    if (this.lobby.phase === 'PLAYING') {
      return { key: 'online-playing', message: 'Relay Yard battle in progress.' }
    }

    return { key: `online-${this.lobby.phase.toLowerCase()}`, message: 'Online battle is closing.' }
  }

  getState(now = performance.now()) {
    const visual = this.getVisualSnapshot(now)
    this.ensureCamera(visual)
    return {
      connection: this.state,
      intent: this.intent,
      roomId: this.roomId,
      playerId: this.playerId,
      team: this.team,
      lobby: this.lobby,
      result: this.result,
      snapshot: this.snapshot,
      visual,
      camera: this.camera,
      error: this.error,
      errorCode: this.errorCode,
      form: {
        playerName: this.playerName,
        roomKey: this.roomKeyDraft,
        selection: this.formSelection,
        editingField: this.editingField,
        canResume: !this.room && Boolean(readReconnectionToken()),
      },
      selectedRosterIndex: this.selectedRosterIndex,
      copyState: this.copyState,
      radioOpen: this.radioOpen,
      radioDraft: this.radioDraft,
      touchControlsVisible: this.touchControlsVisible,
      touchJoystick: { ...this.touchJoystick },
      touchOrientationGate: { ...this.touchOrientationGate },
      input: this.getInputSummary(),
      touch: {
        handedness: this.touchHandedness,
        joystick: { ...this.touchJoystick },
        orientationGate: { ...this.touchOrientationGate },
        actions: ['joystick', 'fire', 'pause'],
      },
      shotEffects: this.shotFeedback.getActive(now),
      diagnostics: this.diagnostics.summary(this.state === 'connected'),
      connectionQuality: this.diagnostics.quality(this.state === 'connected'),
    }
  }

  renderText() {
    const visual = this.getVisualSnapshot(performance.now())
    this.ensureCamera(visual)
    return JSON.stringify({
      mode: 'online-battle',
      screen: this.result ? 'results' : this.lobby ? 'field-briefing' : 'room-entry',
      connection: this.state,
      intent: this.intent,
      error: this.error,
      errorCode: this.errorCode || null,
      identity: {
        roomAssigned: Boolean(this.roomId),
        playerAssigned: Boolean(this.playerId),
        team: this.team,
      },
      form: {
        playerName: this.playerName,
        roomKeyLength: this.roomKeyDraft.length,
        selection: this.formSelection,
        editingField: this.editingField,
        canResume: !this.room && Boolean(readReconnectionToken()),
      },
      lobby: this.lobby ? sanitizeLobbyForText(this.lobby) : null,
      result: this.result,
      diagnostics: this.diagnostics.summary(this.state === 'connected'),
      connectionQuality: this.diagnostics.quality(this.state === 'connected'),
      status: getOnlineRenderedStatus({
        connection: this.state,
        error: this.error,
        snapshot: this.snapshot,
        roomId: this.roomId,
        playerId: this.playerId,
        team: this.team,
      }),
      readableText: getOnlineReadableText({
        connection: this.state,
        error: this.error,
        snapshot: this.snapshot,
        roomId: this.roomId,
        playerId: this.playerId,
        team: this.team,
        touchControlsVisible: this.touchControlsVisible,
      }),
      radio: { open: this.radioOpen, draft: this.radioDraft },
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
    if (!this.isGameplayLive() || (this.radioOpen && down)) return
    if (this.input.setButton(button, down, source)) {
      if (button === 'fire' && down) this.triggerLocalShotEffect(performance.now())
      this.sendImmediateCommand()
    }
  }

  handlePointerAction(x: number, y: number) {
    if (!this.room) return this.handleEntryPointer(x, y)
    if (this.lobby?.phase !== 'LOBBY') return false
    const hit = getOnlineLobbyControlHit(x, y, this.lobby.selfPlayerId === this.lobby.hostPlayerId)
    if (hit === 'copy') void this.copyRoomKey()
    else if (hit === 'blue') this.chooseTeam('blue')
    else if (hit === 'red') this.chooseTeam('red')
    else if (hit === 'ready') this.toggleReady()
    else if (hit === 'start') this.startDeployment()
    return hit !== null
  }

  releaseControls() {
    if (this.input.releaseAll()) this.sendImmediateCommand()
  }

  setTouchControlsVisible(visible: boolean) {
    this.touchControlsVisible = visible
  }

  setTouchJoystickState(state: TouchJoystickSnapshot) {
    this.touchJoystick = { ...state }
  }

  setTouchHandedness(handedness: TouchHandedness) {
    this.touchHandedness = handedness
  }

  setTouchOrientationGate(active: boolean, onlineBattleLive = false) {
    this.touchOrientationGate = {
      active,
      reason: active ? 'tablet-portrait' : null,
      onlineBattleLive: active && onlineBattleLive,
    }
  }

  chooseTeam(team: Team) {
    this.sendRoomCommand({ type: 'team', protocolVersion: ONLINE_PROTOCOL_VERSION, team })
  }

  toggleReady() {
    const self = this.lobby?.players.find((player) => player.playerId === this.playerId)
    if (!self) return
    this.sendRoomCommand({ type: 'ready', protocolVersion: ONLINE_PROTOCOL_VERSION, ready: !self.ready })
  }

  startDeployment() {
    if (!this.lobby || !getOnlineLobbyStartState(this.lobby).enabled) return
    this.sendRoomCommand({ type: 'start', protocolVersion: ONLINE_PROTOCOL_VERSION })
  }

  kickSelectedPlayer() {
    const candidates = this.lobby?.players.filter((player) => player.playerId !== this.playerId) ?? []
    const target = candidates[this.selectedRosterIndex]
    if (!target) return
    this.sendRoomCommand({ type: 'kick', protocolVersion: ONLINE_PROTOCOL_VERSION, playerId: target.playerId })
  }

  async copyRoomKey() {
    const roomKey = this.lobby?.roomKey
    if (!roomKey) return false
    try {
      await navigator.clipboard.writeText(roomKey)
      this.copyState = 'copied'
      return true
    } catch {
      this.copyState = 'failed'
      return false
    }
  }

  markResultRendered() {
    if (!this.result || this.resultRendered) return
    this.resultRendered = true
    this.sendRoomCommand({
      type: 'result_ack',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      resultId: this.result.resultId,
    })
  }

  sendChat(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    this.sendRoomCommand({ type: 'chat', protocolVersion: ONLINE_PROTOCOL_VERSION, text: trimmed })
  }

  sendPing(col: number, row: number) {
    this.sendRoomCommand({ type: 'ping', protocolVersion: ONLINE_PROTOCOL_VERSION, col, row })
  }

  getVisualSnapshot(now = performance.now()): InterpolatedOnlineSnapshot | null {
    return interpolateOnlineSnapshot(this.snapshotHistory, now)
  }

  private attachRoom(room: Room) {
    this.room = room
    this.roomId = room.roomId
    this.state = 'connected'
    this.intent ??= 'join'
    this.error = ''
    this.errorCode = ''
    this.persistPlayerName()
    saveReconnectionToken(room.reconnectionToken)

    room.onMessage<{ type: 'lobby'; lobby: LobbyView }>('lobby', (payload) => {
      this.lobby = payload.lobby
      this.playerId = payload.lobby.selfPlayerId
      const self = payload.lobby.players.find((player) => player.playerId === this.playerId)
      this.team = self?.team ?? null
      this.selectedRosterIndex = Math.min(this.selectedRosterIndex, Math.max(0, payload.lobby.players.length - 2))
      this.copyState = 'idle'
    })
    room.onMessage<{ type: 'snapshot'; snapshot: MultiplayerSnapshot }>('snapshot', (payload) => {
      this.snapshot = payload.snapshot
      this.playerId = payload.snapshot.playerId
      this.team = payload.snapshot.team
      this.snapshotHistory = appendSnapshotHistory(this.snapshotHistory, payload.snapshot, performance.now())
      this.diagnostics.recordSnapshot(payload.snapshot.lastProcessedInputSeq, performance.now())
    })
    room.onMessage<{ type: 'result'; result: MatchResult }>('result', (payload) => {
      this.result = payload.result
      this.resultRendered = false
      this.releaseControls()
    })
    room.onMessage<{ code: string; message: string }>('error', (payload) => {
      this.errorCode = payload.code
      this.error = payload.message
    })
    room.onMessage<{ roomKey: string }>('room_key', (payload) => {
      if (this.lobby) this.lobby = { ...this.lobby, roomKey: payload.roomKey }
      this.copyState = 'idle'
    })
    room.onMessage<{ heartbeatSeq: number }>('heartbeat_ack', (payload) => {
      this.diagnostics.recordHeartbeatAck(payload.heartbeatSeq, performance.now())
    })
    room.onDrop(() => {
      this.state = 'reconnecting'
      this.diagnostics.recordDrop(performance.now())
      this.releaseControls()
    })
    room.onReconnect(() => {
      this.state = 'connected'
      this.diagnostics.recordReconnect(performance.now())
      this.error = ''
      this.errorCode = ''
      saveReconnectionToken(room.reconnectionToken)
    })
    room.onError((_code, message) => {
      this.errorCode = parseMachineCode(message ?? '')
      this.error = readableProtocolError(message ?? 'Room connection failed.')
    })
    room.onLeave((code, reason) => {
      if (this.state === 'reconnecting') this.diagnostics.recordReconnectFailure()
      this.room = null
      clearReconnectionToken()
      if (this.result) {
        this.state = 'disconnected'
        return
      }
      this.state = code === 4403 ? 'error' : 'disconnected'
      this.errorCode = code === 4403 ? 'PLAYER_KICKED' : this.errorCode
      this.error = code === 4403 ? 'You were removed from this room.' : readableProtocolError(reason || 'The room closed.')
      this.releaseControls()
    })
  }

  private resetOnlineState() {
    this.finishEditing()
    this.snapshot = null
    this.snapshotHistory = []
    this.camera = null
    this.shotFeedback.clear()
    this.lobby = null
    this.result = null
    this.resultRendered = false
    this.roomId = null
    this.playerId = null
    this.team = null
    this.radioOpen = false
    this.radioDraft = ''
    this.intent = null
    this.error = ''
    this.errorCode = ''
    this.state = 'idle'
  }

  private failConnection(error: unknown) {
    const raw = error instanceof Error ? error.message : 'Unable to connect.'
    this.state = 'error'
    this.errorCode = parseMachineCode(raw)
    this.error = readableProtocolError(raw)
  }

  private sendRoomCommand(message: ClientRoomMessage) {
    if (!this.room || (this.state !== 'connected' && message.type !== 'result_ack')) return
    this.room.send('command', message)
  }

  private sendInputCommand() {
    if (!this.isGameplayLive()) return
    const inputSeq = this.commandSeq + 1
    this.commandSeq = inputSeq
    this.lastSentSeq = inputSeq
    this.diagnostics.recordInputSent(inputSeq, performance.now())
    this.sendRoomCommand({
      type: 'input',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      inputSeq,
      ...this.input.getCommand(),
    })
  }

  private sendImmediateCommand() {
    if (!this.isGameplayLive()) return
    this.commandAccumulator = 0
    this.sendInputCommand()
  }

  private sendHeartbeat(now: number) {
    const heartbeatSeq = this.heartbeatSeq + 1
    this.heartbeatSeq = heartbeatSeq
    const summary = this.diagnostics.summary(true)
    const pageVisible = document.visibilityState === 'visible'
    this.diagnostics.recordHeartbeatSent(heartbeatSeq, now, pageVisible)
    this.sendRoomCommand({
      type: 'heartbeat',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      heartbeatSeq,
      clientSentAt: Date.now(),
      pageVisible,
      fps: summary.clientFpsMedian ?? undefined,
      longFrames: summary.clientLongFrames,
      rttMs: summary.rttMedianMs ?? undefined,
      inputAckMs: summary.inputAckMedianMs ?? undefined,
      snapshotGapMs: summary.snapshotGapP95Ms ?? undefined,
      quality: this.diagnostics.quality(true),
    })
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(`${payload?.code ?? payload?.error ?? 'REQUEST_FAILED'}:${response.status}`)
    return payload as T
  }

  private handleEntryPointer(_x: number, y: number) {
    if (!this.intent || this.state === 'connecting') return false
    const hit = getOnlineEntryHit(this.intent, y)
    if (hit === 'name') {
      this.formSelection = 0
      this.beginEditing('name')
      return true
    }
    if (hit === 'key') {
      this.formSelection = 1
      this.beginEditing('key')
      return true
    }
    if (hit === 'action') {
      this.formSelection = this.intent === 'join' ? 2 : 1
      this.submitEntryForm()
      return true
    }
    return false
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.target === this.entryInput) return
    if (!this.isActive()) return
    event.stopImmediatePropagation()

    if (this.editingField) {
      this.handleFormDraft(event)
      return
    }
    if (event.code === 'Escape' || event.code === 'KeyB' || event.code === 'Backspace') {
      event.preventDefault()
      this.back()
      return
    }
    if (!this.room) {
      this.handleEntryKey(event)
      return
    }
    if (this.result) {
      if (event.code === 'Enter') {
        event.preventDefault()
        this.markResultRendered()
      }
      return
    }
    if (this.lobby?.phase === 'LOBBY') {
      this.handleLobbyKey(event)
      return
    }
    if (this.lobby?.phase === 'COUNTDOWN') {
      if (event.code === 'KeyR') {
        event.preventDefault()
        this.toggleReady()
      }
      return
    }
    if (!this.isGameplayLive()) return
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
      if (self) this.sendPing(self.col, self.row)
    }
    if (event.code === 'KeyT') {
      event.preventDefault()
      this.releaseControls()
      this.radioOpen = true
      this.radioDraft = ''
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    if (event.target === this.entryInput) return
    if (!this.isGameplayLive() || this.radioOpen) return
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

  private handleEntryKey(event: KeyboardEvent) {
    if (!this.intent || this.state === 'connecting') return
    const count = this.intent === 'join' ? 3 : 2
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || event.code === 'Tab') {
      event.preventDefault()
      const delta = event.code === 'ArrowUp' || (event.code === 'Tab' && event.shiftKey) ? -1 : 1
      this.formSelection = (this.formSelection + delta + count) % count
      return
    }
    if (event.code === 'Enter') {
      event.preventDefault()
      const keyFieldIndex = this.intent === 'join' ? 1 : -1
      const actionIndex = count - 1
      if (this.formSelection === 0) this.beginEditing('name')
      else if (this.formSelection === keyFieldIndex) this.beginEditing('key')
      else if (this.formSelection === actionIndex) this.submitEntryForm()
      return
    }
    if (event.code === 'KeyR' && readReconnectionToken()) {
      event.preventDefault()
      void this.resumeSavedConnection()
    }
  }

  private handleLobbyKey(event: KeyboardEvent) {
    if (event.code === 'Digit1' || event.code === 'Numpad1') {
      event.preventDefault()
      this.chooseTeam('blue')
    } else if (event.code === 'Digit2' || event.code === 'Numpad2') {
      event.preventDefault()
      this.chooseTeam('red')
    } else if (event.code === 'KeyR') {
      event.preventDefault()
      this.toggleReady()
    } else if (event.code === 'Enter') {
      event.preventDefault()
      this.startDeployment()
    } else if (event.code === 'KeyC') {
      event.preventDefault()
      void this.copyRoomKey()
    } else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault()
      const candidates = this.lobby?.players.filter((player) => player.playerId !== this.playerId) ?? []
      if (candidates.length > 0) {
        const delta = event.code === 'ArrowUp' ? -1 : 1
        this.selectedRosterIndex = (this.selectedRosterIndex + delta + candidates.length) % candidates.length
      }
    } else if (event.code === 'Delete' || event.code === 'KeyK') {
      event.preventDefault()
      this.kickSelectedPlayer()
    }
  }

  isEntryEditing() {
    return this.editingField !== null
  }

  private beginEditing(field: OnlineEntryField) {
    this.editingField = field
    this.replaceFieldOnType = true
    if (!this.entryInput) return

    this.entryInput.value = field === 'name' ? this.playerName : this.roomKeyDraft
    this.entryInput.maxLength = field === 'name' ? 18 : 6
    this.entryInput.inputMode = 'text'
    this.entryInput.setAttribute('autocomplete', field === 'name' ? 'nickname' : 'off')
    this.entryInput.setAttribute('aria-label', field === 'name' ? 'Callsign' : 'Six-character room key')
    this.entryInput.setAttribute('autocapitalize', field === 'name' ? 'words' : 'characters')
    this.entryInput.setAttribute('enterkeyhint', 'done')
    this.entryInput.spellcheck = false
    this.entryInput.focus({ preventScroll: true })
    this.entryInput.select()
  }

  private handleNativeEntryInput() {
    if (!this.entryInput || !this.editingField) return
    const normalized = normalizeOnlineEntryValue(this.editingField, this.entryInput.value)
    if (this.editingField === 'name') this.playerName = normalized
    else this.roomKeyDraft = normalized
    this.replaceFieldOnType = false
    if (this.entryInput.value !== normalized) {
      this.entryInput.value = normalized
      this.entryInput.setSelectionRange(normalized.length, normalized.length)
    }
  }

  private handleNativeEntryKeyDown(event: KeyboardEvent) {
    event.stopPropagation()
    if (event.code !== 'Enter' && event.code !== 'Escape' && event.code !== 'Tab') return
    event.preventDefault()
    this.finishEditing()
  }

  private finishEditing() {
    this.editingField = null
    this.replaceFieldOnType = false
    if (this.entryInput && document.activeElement === this.entryInput) {
      this.entryInput.blur()
    }
  }

  private handleFormDraft(event: KeyboardEvent) {
    event.stopImmediatePropagation()
    if (event.code === 'Escape') {
      event.preventDefault()
      this.finishEditing()
      return
    }
    if (event.code === 'Enter' || event.code === 'Tab') {
      event.preventDefault()
      this.finishEditing()
      return
    }
    if (event.code === 'Backspace') {
      event.preventDefault()
      if (this.editingField === 'name') this.playerName = this.playerName.slice(0, -1)
      else this.roomKeyDraft = this.roomKeyDraft.slice(0, -1)
      this.replaceFieldOnType = false
      return
    }
    if (event.key.length !== 1) return
    event.preventDefault()
    if (this.editingField === 'name' && /[\p{L}\p{N}_ -]/u.test(event.key)) {
      this.playerName = `${this.replaceFieldOnType ? '' : this.playerName}${event.key}`.slice(0, 18)
    } else if (this.editingField === 'key' && /[a-z0-9]/i.test(event.key)) {
      this.roomKeyDraft = `${this.replaceFieldOnType ? '' : this.roomKeyDraft}${event.key}`.toUpperCase().slice(0, 6)
    }
    this.replaceFieldOnType = false
  }

  private submitEntryForm() {
    this.playerName = this.playerName.trim() || 'Rookie'
    this.persistPlayerName()
    if (this.intent === 'create') void this.createRoom()
    else if (this.roomKeyDraft.length === 6) void this.joinRoom()
    else {
      this.errorCode = 'ROOM_KEY_INVALID'
      this.error = 'Enter the six-character room key.'
    }
  }

  private persistPlayerName() {
    try {
      sessionStorage.setItem(PLAYER_NAME_SESSION_KEY, this.playerName)
    } catch {}
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
      if (message) this.sendChat(message)
      return
    }
    if (event.code === 'Backspace') {
      this.radioDraft = this.radioDraft.slice(0, -1)
      return
    }
    if (event.key.length === 1 && this.radioDraft.length < 120) this.radioDraft += event.key
  }

  private getViewSummary() {
    if (!this.snapshot || !this.camera) return null
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
    if (!this.snapshot || !this.camera) return null
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
      lastProcessedInputSeq: this.snapshot?.lastProcessedInputSeq ?? 0,
      sendErrorCount: this.sendErrorCount,
      touchControlsVisible: this.touchControlsVisible,
      handedness: this.touchHandedness,
      joystick: { ...this.touchJoystick },
      orientationGate: { ...this.touchOrientationGate },
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
    return { ...this.shotFeedback.getDebug(now), bulletSmoothing: ONLINE_BULLET_SMOOTHING_MODE }
  }

  private triggerLocalShotEffect(now: number) {
    const visual = this.getVisualSnapshot(now)
    const visualSelf = visual?.players.find((player) => player.self)
    const snapshotSelf = this.snapshot?.players.find((player) => player.self)
    const self = visualSelf ?? snapshotSelf
    if (!self) return
    this.shotFeedback.trigger({
      id: self.id,
      team: self.team,
      dir: self.dir,
      x: visualSelf ? visualSelf.visualCol + 0.5 : self.col + 0.5,
      y: visualSelf ? visualSelf.visualRow + 0.5 : self.row + 0.5,
      alive: self.alive,
    }, now)
  }

  private ensureCamera(visual: InterpolatedOnlineSnapshot | null) {
    if (!this.camera && this.lobby?.phase === 'PLAYING') this.updateCamera(0, visual)
  }

  private updateCamera(dt: number, visual: InterpolatedOnlineSnapshot | null) {
    const target = this.snapshot ? getOnlineTargetCamera(this.snapshot, visual) : null
    this.camera = createOnlineCameraState(this.camera, target, dt, ONLINE_CAMERA_SMOOTHING_MS)
  }
}

function sanitizeLobbyForText(lobby: LobbyView) {
  return {
    phase: lobby.phase,
    version: lobby.version,
    isHost: lobby.selfPlayerId === lobby.hostPlayerId,
    roomKeyAvailable: Boolean(lobby.roomKey),
    countdownEndsAt: lobby.countdownEndsAt,
    players: lobby.players.map((player) => ({
      name: player.name,
      team: player.team,
      ready: player.ready,
      connected: player.connected,
      host: player.host,
      connectionEpoch: player.connectionEpoch,
      quality: player.quality,
      self: player.playerId === lobby.selfPlayerId,
    })),
  }
}

function readableProtocolError(raw: string) {
  const normalized = raw.toLowerCase()
  if (normalized.includes(' is locked') || normalized.includes('room_locked')) return 'Deployment has already started.'
  if (normalized.includes('room is full') || normalized.includes('room_full')) return 'This room already has four players.'
  if (normalized.includes('room_key_not_found') || normalized.includes('not found')) return 'No open room matches that key. Check it and try again.'
  if (normalized.includes('player_kicked')) return 'You were removed from this room.'
  const [possibleCode, ...rest] = raw.split(':')
  const message = rest.join(':').trim()
  if (/^[A-Z][A-Z0-9_]+$/.test(possibleCode) && message) return message
  if (normalized.includes('failed to fetch')) return 'Multiplayer server not reached.'
  return raw.trim() || 'Unable to connect.'
}

function parseMachineCode(raw: string) {
  const normalized = raw.toLowerCase()
  if (normalized.includes(' is locked')) return 'ROOM_LOCKED'
  if (normalized.includes('room is full')) return 'ROOM_FULL'
  if (normalized.includes('not found')) return 'ROOM_KEY_NOT_FOUND'
  return raw.match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0] ?? ''
}

function saveReconnectionToken(token: string) {
  if (!token) return
  try {
    sessionStorage.setItem(RECONNECTION_SESSION_KEY, JSON.stringify({ token, savedAt: Date.now() }))
  } catch {}
}

function readReconnectionToken() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RECONNECTION_SESSION_KEY) ?? 'null')
    if (!parsed || typeof parsed.token !== 'string' || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > 45_000) {
      clearReconnectionToken()
      return null
    }
    return parsed.token
  } catch {
    return null
  }
}

function clearReconnectionToken() {
  try {
    sessionStorage.removeItem(RECONNECTION_SESSION_KEY)
  } catch {}
}

function readSessionText(key: string, fallback: string, maxLength: number) {
  try {
    return (sessionStorage.getItem(key) ?? fallback).trim().slice(0, maxLength) || fallback
  } catch {
    return fallback
  }
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

function getMultiplayerServerUrl() {
  const configured = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined) ?? DEFAULT_SERVER_URL
  if (!import.meta.env.DEV) return configured
  const override = new URLSearchParams(window.location.search).get('multiplayerUrl')
  return override && /^https?:\/\/127\.0\.0\.1:\d+$/.test(override) ? override : configured
}
