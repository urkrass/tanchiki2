import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_X, ARENA_Y, HUD_X, HUD_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH, TANK_SIZE } from '../game/constants.ts'
import {
  battlefieldCellKey,
  BATTLEFIELD_TILE_SIZE,
  drawBattlefieldFrame,
  drawBattlefieldGround,
  drawBattlefieldLastKnown,
  drawBattlefieldPing,
  drawBattlefieldProjectile,
  drawBattlefieldRelay,
  drawBattlefieldTank,
  drawBattlefieldTerrainTile,
  getBattlefieldDrawRange,
  getBattlefieldTeamColors,
  getBattlefieldTeamKey,
  isBattlefieldCellVisible,
  isWorldCellInCamera,
  worldPointToScreen,
  type BattlefieldCamera,
} from '../game/battlefield.ts'
import { isPresentableSignalContact } from '../game/lastKnownPresentation.ts'
import type { AtlasTeamKey } from '../game/spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from '../game/uiAtlas.ts'
import { drawPixelText } from '../game/pixelText.ts'
import { drawTouchControlsOverlay } from '../game/touchControlsRender.ts'
import { drawClassEquipmentHudStrip } from '../game/classEquipmentHudRender.ts'
import type { ClassEquipmentHudModel, ClassEquipmentHudSlot } from '../game/classEquipmentHud.ts'
import { drawClassShellProjectile } from '../game/classEquipmentVisual.ts'
import { drawPixelDeployable, drawPixelPortableRelay } from '../game/pixelArt.ts'
import type { OnlineBattleClient } from './onlineClient.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'
import type { VisualOnlinePlayer } from './onlineInterpolation.ts'
import { ONLINE_MAP_COLS, ONLINE_MAP_ROWS, getOnlineTargetCamera, type OnlineCameraState } from './onlineCamera.ts'
import { ONLINE_MINIMAP_CELL_SIZE, ONLINE_MINIMAP_COLS, ONLINE_MINIMAP_ROWS, buildOnlineMinimapModel } from './onlineMinimap.ts'
import type { OnlineShotEffect } from './onlineShooting.ts'
import { ONLINE_PREVIEW_SAFETY_NOTICE, getOnlineHudStatus, getOnlineWaitingCopy } from './onlineStatus.ts'
import type { TouchHandedness, TouchJoystickSnapshot, WaterNeighbors } from '../game/types.ts'
import { SHARED_TANK_CLASS_DEFINITIONS, TEAM_RADIO_COMMANDS, VISION_APERTURE_SOFT_EDGE_CELLS, type Direction, type MultiplayerSnapshot, type Retranslator, type TankClassId, type Team, type TileKind, type VisionCircle } from '../../packages/shared/src/index.ts'
import { drawBackControl } from '../game/backControl.ts'
import {
  ONLINE_ENTRY_CREATE_ACTION_Y,
  ONLINE_ENTRY_JOIN_ACTION_Y,
  ONLINE_ENTRY_KEY_Y,
  ONLINE_ENTRY_NAME_Y,
} from './onlineEntryLayout.ts'
import {
  ONLINE_LOBBY_CONTROLS,
  getOnlineLobbyStartState,
  type OnlineLobbyControlRect,
} from './onlineLobbyControls.ts'
import {
  ONLINE_PING_BUTTON,
  ONLINE_RADIO_BUTTON,
  ONLINE_RADIO_PANEL,
  getOnlineRadioOptionRect,
} from './onlineSignalControls.ts'
import { ONLINE_RESULT_CONTROLS } from './onlineResultControls.ts'

const TEXT_SCALE = 1
const TITLE_SCALE = 2
const HUD_INK = '#252820'

export function getOnlineDeployableSpriteRect(centerX: number, centerY: number) {
  return {
    x: Math.round(centerX - BATTLEFIELD_TILE_SIZE / 2),
    y: Math.round(centerY - BATTLEFIELD_TILE_SIZE / 2),
    size: BATTLEFIELD_TILE_SIZE,
  }
}

export function relayProgressTeam(relay: Pick<Retranslator, 'owner' | 'captureTeam' | 'progress'>): Team | null {
  if (relay.captureTeam && relay.progress > 0 && relay.progress < 1) {
    return relay.captureTeam
  }

  return relay.owner
}

function tankClassFromShell(shellKind: `${TankClassId}-shell`): TankClassId {
  if (shellKind === 'scout-shell') return 'scout'
  if (shellKind === 'battle-shell') return 'battle'
  return 'engineer'
}

export function getOnlineClassEquipmentModel(snapshot: MultiplayerSnapshot): ClassEquipmentHudModel {
  const self = snapshot.self
  const shellState: ClassEquipmentHudSlot['state'] = self.shells <= 0
    ? 'empty'
    : self.onAmmoStation && self.shells < self.shellCapacity
      ? 'recharging'
      : self.shells <= 2 ? 'low' : 'ready'
  const slots: ClassEquipmentHudSlot[] = [{
    kind: `${self.classId}-shell`,
    label: self.classId === 'battle' ? 'HE SHELL' : 'SHELLS',
    key: null,
    count: self.shells,
    capacity: self.shellCapacity,
    state: shellState,
    progress: self.onAmmoStation && self.shells < self.shellCapacity ? self.shellRechargeProgress : null,
    passive: false,
  }]
  for (const equipment of self.equipment) {
    slots.push({
      kind: equipment.kind === 'steel' ? 'steel-trap' : equipment.kind,
      label: equipment.kind === 'tripwire' ? 'WIRE' : equipment.kind === 'steel' ? 'TRAP' : equipment.kind.toUpperCase(),
      key: String(equipment.slot),
      count: equipment.count,
      capacity: equipment.kind === 'bulwark' ? 3 : equipment.kind === 'traverse' ? null : 1,
      state: equipment.state,
      progress: equipment.progress,
      passive: false,
    })
  }
  slots.push({
    kind: 'portable-relay',
    label: 'RELAY',
    key: 'E',
    count: Math.max(0, self.portableRelay.limit - self.portableRelay.activeCount),
    capacity: self.portableRelay.limit,
    state: self.portableRelay.state,
    progress: self.portableRelay.progress,
    passive: false,
  })
  const definition = SHARED_TANK_CLASS_DEFINITIONS[self.classId]
  return {
    tankClass: self.classId,
    classLabel: definition.shortLabel,
    slots,
    summary: `${definition.shortLabel} ONLINE KIT`,
  }
}

export class OnlineCanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly client: OnlineBattleClient
  private readonly colorSafe: () => boolean
  private readonly touchHandedness: () => TouchHandedness
  private readonly touchSideRailsActive: () => boolean
  private fogLayer: HTMLCanvasElement | null = null
  private minimapFogLayer: HTMLCanvasElement | null = null

  constructor(
    canvas: HTMLCanvasElement,
    client: OnlineBattleClient,
    colorSafe: () => boolean,
    touchHandedness: () => TouchHandedness = () => 'standard',
    touchSideRailsActive: () => boolean = () => false,
  ) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is required')
    this.context = context
    this.context.imageSmoothingEnabled = false
    this.client = client
    this.colorSafe = colorSafe
    this.touchHandedness = touchHandedness
    this.touchSideRailsActive = touchSideRailsActive
  }

  render() {
    const state = this.client.getState(performance.now())
    const ctx = this.context
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    if (state.result) {
      this.drawResults(ctx, state.result, state.rematchStatus, state.connection)
      this.client.markResultRendered()
      return
    }

    if (state.lobby?.phase !== 'PLAYING') {
      if (state.lobby) this.drawFieldBriefing(ctx, state)
      else this.drawRoomEntry(ctx, state)
      drawBackControl(ctx)
      return
    }

    this.drawFrame(ctx)
    if (!state.snapshot) {
      this.drawWaiting(ctx, state.connection, state.error)
      drawBackControl(ctx)
      return
    }

    const camera = state.camera?.current ?? this.getCamera(state.snapshot, state.visual)
    this.drawBattle(ctx, state.snapshot, state.visual, camera, state.shotEffects)
    this.drawHud(ctx, state.snapshot, state.connection, state.radioOpen, state.camera)
    this.drawHudTopHpLine(ctx, state.snapshot)
    this.drawClassEquipmentStrip(ctx, state.snapshot)
    this.drawTouchControls(ctx, state.touchControlsVisible, state.input.held, state.touchJoystick)
    if (state.radioOpen) this.drawRadioSelector(ctx, state.snapshot.team, state.radioSelection)
    if (state.leaveConfirmation.active) {
      ctx.fillStyle = 'rgba(20, 10, 8, 0.9)'
      ctx.fillRect(ARENA_X + 74, ARENA_Y + ARENA_HEIGHT - 34, ARENA_WIDTH - 148, 24)
      drawPixelText(ctx, 'TAP BACK AGAIN TO LEAVE MATCH', ARENA_X + ARENA_WIDTH / 2, ARENA_Y + ARENA_HEIGHT - 27, {
        align: 'center',
        color: '#fff1a5',
        maxWidth: ARENA_WIDTH - 170,
        scale: TEXT_SCALE,
      })
    }
    drawBackControl(ctx, state.leaveConfirmation.active)
  }

  private drawFrame(ctx: CanvasRenderingContext2D) {
    drawBattlefieldFrame(ctx)
  }

  private drawBriefingBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#10120f'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    ctx.fillStyle = '#191c17'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, 6)
    ctx.fillStyle = '#66c8ff'
    ctx.fillRect(42, 96, LOGICAL_WIDTH - 84, 1)
  }

  private drawRoomEntry(ctx: CanvasRenderingContext2D, state: ReturnType<OnlineBattleClient['getState']>) {
    this.drawBriefingBackground(ctx)
    const isJoin = state.intent === 'join'
    const form = state.form

    drawPixelText(ctx, 'FIELD BRIEFING', LOGICAL_WIDTH / 2, 48, {
      align: 'center', color: '#fff1a5', scale: TITLE_SCALE,
    })
    drawPixelText(ctx, isJoin ? 'JOIN A PRIVATE ROOM' : 'CREATE A PRIVATE ROOM', LOGICAL_WIDTH / 2, 76, {
      align: 'center', color: '#9ca59a', scale: TEXT_SCALE,
    })

    this.drawEntryField(ctx, 'CALLSIGN', form.playerName, ONLINE_ENTRY_NAME_Y, form.selection === 0, form.editingField === 'name')
    if (isJoin) {
      this.drawEntryField(ctx, 'ROOM KEY', form.roomKey.padEnd(6, '-'), ONLINE_ENTRY_KEY_Y, form.selection === 1, form.editingField === 'key')
    }

    const actionIndex = isJoin ? 2 : 1
    const actionY = isJoin ? ONLINE_ENTRY_JOIN_ACTION_Y : ONLINE_ENTRY_CREATE_ACTION_Y
    const selected = form.selection === actionIndex
    drawPixelText(ctx, `${selected ? '> ' : ''}${state.connection === 'connecting' ? 'CONNECTING...' : isJoin ? 'JOIN ROOM' : 'CREATE ROOM'}`, LOGICAL_WIDTH / 2, actionY, {
      align: 'center',
      color: selected ? '#fff1a5' : '#66c8ff',
      scale: TITLE_SCALE,
    })

    if (form.canResume) {
      drawPixelText(ctx, 'R  RESUME RECENT CONNECTION', LOGICAL_WIDTH / 2, actionY + 38, {
        align: 'center', color: '#7ebc83', scale: TEXT_SCALE,
      })
    }
    if (state.error) {
      drawPixelText(ctx, `${state.errorCode ? `${state.errorCode}  ` : ''}${state.error}`, LOGICAL_WIDTH / 2, 334, {
        align: 'center', color: '#f06243', maxWidth: LOGICAL_WIDTH - 80, scale: TEXT_SCALE,
      })
    }
    drawPixelText(ctx, ONLINE_PREVIEW_SAFETY_NOTICE, LOGICAL_WIDTH / 2, 360, {
      align: 'center', color: '#7f887d', maxWidth: LOGICAL_WIDTH - 72, scale: TEXT_SCALE,
    })
    drawPixelText(ctx, state.touchControlsVisible
      ? 'TAP FIELD TO TYPE   TAP ACTION TO CONTINUE'
      : 'UP/DOWN SELECT   ENTER EDIT / CONFIRM   B BACK', LOGICAL_WIDTH / 2, 384, {
      align: 'center', color: '#777f75', maxWidth: LOGICAL_WIDTH - 72, scale: TEXT_SCALE,
    })
  }

  private drawEntryField(
    ctx: CanvasRenderingContext2D,
    label: string,
    value: string,
    y: number,
    selected: boolean,
    editing: boolean,
  ) {
    drawPixelText(ctx, label, 110, y, { color: '#7f887d', scale: TEXT_SCALE })
    drawPixelText(ctx, `${selected ? '> ' : ''}${value}${editing ? '_' : ''}`, 232, y, {
      color: selected ? '#fff1a5' : '#d8d4c8',
      maxWidth: 220,
      scale: TEXT_SCALE,
    })
    ctx.fillStyle = selected ? '#66c8ff' : '#343a32'
    ctx.fillRect(225, y + 16, 208, 1)
  }

  private drawFieldBriefing(ctx: CanvasRenderingContext2D, state: ReturnType<OnlineBattleClient['getState']>) {
    this.drawBriefingBackground(ctx)
    const lobby = state.lobby
    if (!lobby) return
    const self = lobby.players.find((player) => player.playerId === lobby.selfPlayerId)
    const host = self?.host === true
    const countdown = lobby.countdownEndsAt === null ? null : Math.max(0, Math.ceil((lobby.countdownEndsAt - Date.now()) / 1000))

    drawPixelText(ctx, lobby.phase === 'COUNTDOWN' ? `DEPLOYING IN ${countdown}` : 'FIELD BRIEFING', LOGICAL_WIDTH / 2, 38, {
      align: 'center', color: lobby.phase === 'COUNTDOWN' ? '#fff1a5' : '#66c8ff', scale: TITLE_SCALE,
    })
    drawPixelText(ctx, state.connection === 'reconnecting' ? 'RECONNECTING - INPUTS CLEARED' : 'RELAY YARD - TEAM BATTLE - FIRST TO 15', LOGICAL_WIDTH / 2, host && lobby.roomKey ? 60 : 70, {
      align: 'center', color: state.connection === 'reconnecting' ? '#f4a261' : '#9ca59a', scale: TEXT_SCALE,
    })
    if (host && lobby.roomKey) {
      ctx.fillStyle = '#10120f'
      ctx.fillRect(42, 96, LOGICAL_WIDTH - 84, 2)
      ctx.fillStyle = '#66c8ff'
      ctx.fillRect(42, 112, LOGICAL_WIDTH - 84, 1)
      drawPixelText(ctx, 'ROOM KEY', 58, 86, { color: '#9ca59a', scale: TEXT_SCALE })
      drawPixelText(ctx, lobby.roomKey, 156, 80, { color: '#fff1a5', scale: 2 })
      if (lobby.phase === 'LOBBY') this.drawCopyKeyButton(ctx, state.copyState)
    }

    ctx.fillStyle = '#343a32'
    ctx.fillRect(LOGICAL_WIDTH / 2, 118, 1, 154)
    drawPixelText(ctx, 'BLUE', 128, 120, { align: 'center', color: '#66c8ff', scale: TITLE_SCALE })
    drawPixelText(ctx, 'RED', 384, 120, { align: 'center', color: '#f06243', scale: TITLE_SCALE })
    this.drawTeamRoster(ctx, state, 'blue', 128)
    this.drawTeamRoster(ctx, state, 'red', 384)

    if (lobby.phase === 'LOBBY') {
      const startState = getOnlineLobbyStartState(lobby)
      this.drawLobbyButton(ctx, ONLINE_LOBBY_CONTROLS.blue, '1 BLUE', self?.team === 'blue', '#66c8ff')
      this.drawLobbyButton(ctx, ONLINE_LOBBY_CONTROLS.red, '2 RED', self?.team === 'red', '#f06243')
      this.drawLobbyButton(ctx, ONLINE_LOBBY_CONTROLS.ready, self?.ready ? 'R WITHDRAW' : 'R READY', self?.ready === true, '#fff1a5')
      if (self) this.drawClassSelector(ctx, self.classId)
      if (host) this.drawStartButton(ctx, startState.enabled)
      if (host && lobby.players.length > 1) {
        drawPixelText(ctx, 'UP/DOWN SELECT PLAYER   K KICK', LOGICAL_WIDTH / 2, 382, {
          align: 'center', color: '#8f8a82', scale: TEXT_SCALE,
        })
      }
      if (!state.error) {
        drawPixelText(ctx, startState.detail, LOGICAL_WIDTH / 2, host && lobby.players.length > 1 ? 400 : 386, {
          align: 'center', color: startState.enabled ? '#fff1a5' : '#777f75', maxWidth: LOGICAL_WIDTH - 70, scale: TEXT_SCALE,
        })
      }
    } else {
      drawPixelText(ctx, 'R WITHDRAW READY TO CANCEL', LOGICAL_WIDTH / 2, 322, {
        align: 'center', color: '#fff1a5', scale: TEXT_SCALE,
      })
    }

    if (state.error) {
      drawPixelText(ctx, `${state.errorCode ? `${state.errorCode}  ` : ''}${state.error}`, LOGICAL_WIDTH / 2, 374, {
        align: 'center', color: '#f06243', maxWidth: LOGICAL_WIDTH - 70, scale: TEXT_SCALE,
      })
    } else if (lobby.phase !== 'LOBBY') {
      drawPixelText(ctx, 'READY REQUIRES EQUAL TEAMS AND EVERY PLAYER CONNECTED', LOGICAL_WIDTH / 2, 374, {
        align: 'center', color: '#777f75', maxWidth: LOGICAL_WIDTH - 70, scale: TEXT_SCALE,
      })
    }
  }

  private drawLobbyButton(
    ctx: CanvasRenderingContext2D,
    rect: OnlineLobbyControlRect,
    label: string,
    active: boolean,
    accent: string,
  ) {
    ctx.fillStyle = active ? '#2d342b' : '#171a17'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeStyle = active ? accent : '#4e554c'
    ctx.lineWidth = active ? 2 : 1
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1)
    drawPixelText(ctx, label, rect.x + rect.width / 2, rect.y + 14, {
      align: 'center', color: active ? accent : '#b5b7ad', scale: TEXT_SCALE,
    })
  }

  private drawStartButton(ctx: CanvasRenderingContext2D, enabled: boolean) {
    const rect = ONLINE_LOBBY_CONTROLS.start
    ctx.fillStyle = enabled ? '#42643d' : '#20251f'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeStyle = enabled ? '#b7e08c' : '#4e554c'
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
    drawPixelText(ctx, 'START BATTLE', rect.x + rect.width / 2, rect.y + 19, {
      align: 'center', color: enabled ? '#f4ffd8' : '#777f75', scale: 2,
    })
  }

  private drawClassSelector(ctx: CanvasRenderingContext2D, classId: TankClassId) {
    const previous = ONLINE_LOBBY_CONTROLS['class-prev']
    const next = ONLINE_LOBBY_CONTROLS['class-next']
    const definition = SHARED_TANK_CLASS_DEFINITIONS[classId]
    this.drawLobbyButton(ctx, previous, '<', false, '#fff1a5')
    this.drawLobbyButton(ctx, next, '>', false, '#fff1a5')
    drawPixelText(ctx, definition.shortLabel, (previous.x + previous.width + next.x) / 2, 280, {
      align: 'center', color: '#fff1a5', scale: 2, maxWidth: 172,
    })
    drawPixelText(ctx, `${definition.role}   Z / X`, (previous.x + previous.width + next.x) / 2, 301, {
      align: 'center', color: '#9ca59a', scale: TEXT_SCALE, maxWidth: 176,
    })
  }

  private drawCopyKeyButton(ctx: CanvasRenderingContext2D, copyState: 'idle' | 'copied' | 'failed') {
    const rect = ONLINE_LOBBY_CONTROLS.copy
    const copied = copyState === 'copied'
    const failed = copyState === 'failed'
    ctx.fillStyle = copied ? '#365b3c' : failed ? '#512b25' : '#213b4a'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeStyle = copied ? '#b7e08c' : failed ? '#f06243' : '#66c8ff'
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
    drawPixelText(ctx, copied ? 'KEY COPIED' : failed ? 'TRY COPY AGAIN' : 'COPY ROOM KEY', rect.x + rect.width / 2, rect.y + 12, {
      align: 'center', color: copied ? '#f4ffd8' : failed ? '#ffd0c4' : '#e2f4ff', scale: TEXT_SCALE,
    })
  }

  private drawTeamRoster(
    ctx: CanvasRenderingContext2D,
    state: ReturnType<OnlineBattleClient['getState']>,
    team: Team,
    centerX: number,
  ) {
    const lobby = state.lobby
    if (!lobby) return
    const players = lobby.players.filter((player) => player.team === team)
    const kickCandidates = lobby.players.filter((player) => player.playerId !== lobby.selfPlayerId)
    players.forEach((player, index) => {
      const y = 162 + index * 58
      const selectedForKick = kickCandidates[state.selectedRosterIndex]?.playerId === player.playerId
      const name = `${selectedForKick ? '> ' : ''}${player.name}${player.host ? ' [HOST]' : ''}`
      drawPixelText(ctx, name, centerX, y, {
        align: 'center', color: player.connected ? '#d8d4c8' : '#f06243', maxWidth: 210, scale: TEXT_SCALE,
      })
      drawPixelText(ctx, SHARED_TANK_CLASS_DEFINITIONS[player.classId].shortLabel, centerX, y + 14, {
        align: 'center', color: '#fff1a5', maxWidth: 180, scale: TEXT_SCALE,
      })
      drawPixelText(ctx, `${player.ready ? 'READY' : player.connected ? 'NOT READY' : 'DISCONNECTED'} - ${player.quality.toUpperCase()}`, centerX, y + 29, {
        align: 'center', color: player.ready ? '#7ebc83' : '#777f75', maxWidth: 220, scale: TEXT_SCALE,
      })
    })
    if (players.length === 0) {
      drawPixelText(ctx, 'OPEN SEAT', centerX, 178, { align: 'center', color: '#4e554c', scale: TEXT_SCALE })
    }
  }

  private drawResults(
    ctx: CanvasRenderingContext2D,
    result: NonNullable<ReturnType<OnlineBattleClient['getState']>['result']>,
    rematch: ReturnType<OnlineBattleClient['getState']>['rematchStatus'],
    connection: string,
  ) {
    this.drawBriefingBackground(ctx)
    const verdict = result.winner ? `${result.winner.toUpperCase()} VICTORY` : 'DRAW'
    drawPixelText(ctx, 'AFTER ACTION REPORT', LOGICAL_WIDTH / 2, 54, {
      align: 'center', color: '#66c8ff', scale: TITLE_SCALE,
    })
    drawPixelText(ctx, verdict, LOGICAL_WIDTH / 2, 116, {
      align: 'center', color: result.winner === 'red' ? '#f06243' : result.winner === 'blue' ? '#66c8ff' : '#fff1a5', scale: 3,
    })
    drawPixelText(ctx, `${result.scores.blue}  BLUE      RED  ${result.scores.red}`, LOGICAL_WIDTH / 2, 170, {
      align: 'center', color: '#d8d4c8', scale: TITLE_SCALE,
    })
    drawPixelText(ctx, result.reason.replaceAll('_', ' '), LOGICAL_WIDTH / 2, 210, {
      align: 'center', color: '#9ca59a', scale: TEXT_SCALE,
    })
    drawPixelText(ctx, `FINAL SERVER TICK ${result.finalServerTick}`, LOGICAL_WIDTH / 2, 232, {
      align: 'center', color: '#777f75', scale: TEXT_SCALE,
    })
    const median = result.network.rttMedianMs === null ? 'MEASURING' : `${Math.round(result.network.rttMedianMs)} MS`
    drawPixelText(ctx, `NETWORK  RTT ${median}   RECONNECTS ${result.network.reconnectCount}`, LOGICAL_WIDTH / 2, 266, {
      align: 'center', color: '#7ebc83', maxWidth: LOGICAL_WIDTH - 80, scale: TEXT_SCALE,
    })
    const available = connection === 'connected' && rematch?.available === true
    const voted = rematch?.selfVoted === true
    const status = connection === 'disconnected'
      ? 'ROOM CLOSED'
      : !rematch
        ? 'CHECKING ROSTER'
        : rematch.available
          ? `${rematch.votes}/${rematch.required} READY FOR REMATCH`
          : 'REMATCH UNAVAILABLE'
    drawPixelText(ctx, status, LOGICAL_WIDTH / 2, 294, {
      align: 'center', color: available ? '#fff1a5' : '#777f75', scale: TEXT_SCALE,
    })

    const rematchRect = ONLINE_RESULT_CONTROLS.rematch
    ctx.fillStyle = available && !voted ? '#42643d' : '#20251f'
    ctx.fillRect(rematchRect.x, rematchRect.y, rematchRect.width, rematchRect.height)
    ctx.strokeStyle = available && !voted ? '#b7e08c' : '#4e554c'
    ctx.lineWidth = 2
    ctx.strokeRect(rematchRect.x + 1, rematchRect.y + 1, rematchRect.width - 2, rematchRect.height - 2)
    drawPixelText(ctx, voted ? 'VOTE SENT' : 'PLAY AGAIN', rematchRect.x + rematchRect.width / 2, rematchRect.y + 20, {
      align: 'center', color: available ? '#f4ffd8' : '#777f75', scale: 2,
    })

    const closeRect = ONLINE_RESULT_CONTROLS.close
    ctx.fillStyle = '#171a17'
    ctx.fillRect(closeRect.x, closeRect.y, closeRect.width, closeRect.height)
    ctx.strokeStyle = '#4e554c'
    ctx.lineWidth = 1
    ctx.strokeRect(closeRect.x + 0.5, closeRect.y + 0.5, closeRect.width - 1, closeRect.height - 1)
    drawPixelText(ctx, 'B  MAIN MENU', closeRect.x + closeRect.width / 2, closeRect.y + 14, {
      align: 'center', color: '#8f8a82', scale: TEXT_SCALE,
    })
  }

  private drawWaiting(ctx: CanvasRenderingContext2D, connection: string, error: string) {
    const copy = getOnlineWaitingCopy(connection, error)
    const accent = copy.tone === 'error' ? '#f06243' : copy.tone === 'ready' ? '#fff1a5' : '#66c8ff'

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this.drawWaitingPlaque(ctx, HUD_X / 2 - 120, 112, 240, 42, accent)
    drawPixelText(ctx, copy.title, HUD_X / 2, 133, {
      align: 'center',
      baseline: 'middle',
      color: accent,
      maxWidth: 212,
      scale: TITLE_SCALE,
    })
    drawUiSprite(ctx, connection === 'error' ? 'status.warn' : 'status.connection', HUD_X / 2 - 10, 158, {
      width: 20,
      height: 20,
      sheet: 'ui20',
    })
    drawPixelText(ctx, copy.detail, HUD_X / 2, 184, {
      align: 'center',
      color: '#d8d4c8',
      maxWidth: ARENA_WIDTH - 48,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, copy.hint, HUD_X / 2, 204, {
      align: 'center',
      color: '#8f8a82',
      maxWidth: ARENA_WIDTH - 48,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, 'BACK BUTTON / B', HUD_X / 2, 374, {
      align: 'center',
      color: '#8f8a82',
      scale: TEXT_SCALE,
    })
    ctx.textAlign = 'start'
  }

  private drawBattle(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    visual: InterpolatedOnlineSnapshot | null,
    camera: BattlefieldCamera,
    shotEffects: OnlineShotEffect[],
  ) {
    const range = getBattlefieldDrawRange(camera, ONLINE_MAP_COLS, ONLINE_MAP_ROWS)
    const visible = new Set(snapshot.visibleCells.map((cell) => battlefieldCellKey(cell.col, cell.row)))
    const visibleWater = new Set(
      snapshot.visibleTerrain
        .filter((tile) => tile.kind === 'water' && visible.has(battlefieldCellKey(tile.col, tile.row)))
        .map((tile) => battlefieldCellKey(tile.col, tile.row)),
    )
    const frameTime = visual?.animation.visualTime ?? snapshot.time

    ctx.save()
    ctx.beginPath()
    ctx.rect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.clip()

    for (let row = range.startRow; row < range.endRow; row += 1) {
      for (let col = range.startCol; col < range.endCol; col += 1) {
        if (isBattlefieldCellVisible(visible, col, row)) {
          drawBattlefieldGround(ctx, camera, col, row)
        }
      }
    }

    for (const tile of snapshot.visibleTerrain) {
      this.drawTile(
        ctx,
        tile.kind,
        camera,
        tile.col,
        tile.row,
        frameTime,
        tile.kind === 'water' ? this.getVisibleWaterNeighbors(visibleWater, tile.col, tile.row) : undefined,
      )
    }

    for (const relay of snapshot.retranslators) {
      const progressTeam = relayProgressTeam(relay)
      drawBattlefieldRelay(ctx, camera, relay.col, relay.row, relay.owner ? this.getTeamColors(relay.owner) : null, relay.progress, {
        frame: Math.floor(frameTime * 4),
        progressPalette: progressTeam ? this.getTeamColors(progressTeam) : null,
        teamKey: relay.owner ? this.getTeamKey(relay.owner) : 'neutral',
      })
    }

    const bullets =
      visual?.bullets ?? snapshot.bullets.map((bullet) => ({ ...bullet, visualX: bullet.x, visualY: bullet.y }))
    for (const bullet of bullets) {
      if (!isWorldCellInCamera(camera, Math.floor(bullet.visualX), Math.floor(bullet.visualY))) {
        continue
      }

      const point = worldPointToScreen(camera, bullet.visualX, bullet.visualY)
      drawClassShellProjectile(
        ctx,
        point.x,
        point.y,
        bullet.dir,
        tankClassFromShell(bullet.shellKind),
        this.getTeamColors(bullet.team).bullet,
        Math.floor(frameTime * 14),
      )
    }

    for (const deployable of snapshot.deployables) {
      if (
        !visible.has(battlefieldCellKey(deployable.col, deployable.row))
        || !isWorldCellInCamera(camera, deployable.col, deployable.row)
      ) continue
      const point = worldPointToScreen(camera, deployable.col + 0.5, deployable.row + 0.5)
      const sprite = getOnlineDeployableSpriteRect(point.x, point.y)
      drawPixelDeployable(
        ctx,
        deployable.kind,
        sprite.x,
        sprite.y,
        sprite.size,
        frameTime % 0.8 < 0.4,
      )
    }

    for (const relay of snapshot.portableRelays) {
      if (
        !visible.has(battlefieldCellKey(relay.col, relay.row))
        || !isWorldCellInCamera(camera, relay.col, relay.row)
      ) continue
      const point = worldPointToScreen(camera, relay.col + 0.5, relay.row + 0.5)
      drawPixelPortableRelay(
        ctx,
        point.x - BATTLEFIELD_TILE_SIZE / 2,
        point.y - BATTLEFIELD_TILE_SIZE / 2,
        BATTLEFIELD_TILE_SIZE,
        snapshot.portableSignals.waves.some((wave) => wave.sourceTeam === relay.team),
        frameTime,
        relay.col * 0.11 + relay.row * 0.07,
      )
    }

    const players =
      visual?.players ?? snapshot.players.map((player) => ({ ...player, visualCol: player.col, visualRow: player.row }))
    for (const player of players) {
      if (!isWorldCellInCamera(camera, Math.floor(player.visualCol), Math.floor(player.visualRow))) {
        continue
      }

      const colors = this.getTeamColors(player.team)
      const point = worldPointToScreen(camera, player.visualCol + 0.5, player.visualRow + 0.5)
      drawBattlefieldTank(ctx, point.x, point.y, TANK_SIZE + 2, player.dir, colors, {
        alive: player.alive,
        frame: Math.floor(frameTime * 8),
        self: player.self,
        shield: player.self && snapshot.self.shield > 0,
        shieldPoints: player.self ? snapshot.self.shield : 0,
        tankClass: player.classId,
        teamKey: this.getTeamKey(player.team),
      })
    }

    for (const effect of shotEffects) {
      this.drawLocalShotEffect(ctx, camera, effect)
    }

    for (const ping of snapshot.pings) {
      drawBattlefieldPing(ctx, camera, ping.col, ping.row, this.getTeamColors(ping.team).highlight)
    }

    this.drawCircularFog(ctx, snapshot, visual, camera)
    this.drawPortableSignalWaves(ctx, snapshot, camera)
    this.drawPortableSignalContacts(ctx, snapshot, camera)
    this.drawPortableRelayHoldPrompt(ctx, snapshot, visual, camera)

    for (const memory of snapshot.lastKnown.filter(isPresentableSignalContact)) {
      drawBattlefieldLastKnown(ctx, camera, memory.col, memory.row, this.getTeamColors(memory.team).highlight)
    }
    for (const alert of snapshot.equipmentAlerts) {
      drawBattlefieldPing(ctx, camera, alert.col, alert.row, this.getTeamColors(alert.team).highlight)
    }

    ctx.restore()
  }

  private drawCircularFog(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    visual: InterpolatedOnlineSnapshot | null,
    camera: BattlefieldCamera,
  ) {
    const layer = this.getLayer('arena')
    const g = layer.getContext('2d')
    if (!g) return

    g.clearRect(0, 0, layer.width, layer.height)
    g.fillStyle = '#020202'
    g.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    this.cutArenaVisionCircles(g, snapshot, visual?.players ?? [], camera, VISION_APERTURE_SOFT_EDGE_CELLS)
    ctx.drawImage(layer, 0, 0)
  }

  private drawPortableSignalWaves(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    camera: BattlefieldCamera,
  ) {
    ctx.save()
    ctx.lineCap = 'square'
    for (const wave of snapshot.portableSignals.waves) {
      const progress = Math.max(0, Math.min(1, wave.age / Math.max(0.01, wave.ttl)))
      const alpha = Math.max(0, Math.min(0.42, (1 - progress) * wave.strength))
      if (alpha <= 0.03) continue
      const dx = wave.x - wave.previousX
      const dy = wave.y - wave.previousY
      const distance = Math.max(0.001, Math.hypot(dx, dy))
      const tailLength = (10 + Math.round(wave.strength * 8)) / BATTLEFIELD_TILE_SIZE
      const from = worldPointToScreen(
        camera,
        wave.x - (dx / distance) * tailLength,
        wave.y - (dy / distance) * tailLength,
      )
      const to = worldPointToScreen(camera, wave.x, wave.y)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = wave.bounces > 0 ? '#f7f2dd' : '#f2f5ee'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(from.x), Math.round(from.y))
      ctx.lineTo(Math.round(to.x), Math.round(to.y))
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawPortableSignalContacts(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    camera: BattlefieldCamera,
  ) {
    ctx.save()
    for (const contact of snapshot.portableSignals.contacts) {
      const progress = Math.max(0, Math.min(1, contact.age / Math.max(0.01, contact.ttl)))
      const maxAlpha = contact.kind === 'hostile' ? 0.86 : 0.64
      ctx.globalAlpha = Math.max(0, Math.min(maxAlpha, (1 - progress) * contact.strength))
      const point = worldPointToScreen(camera, contact.x, contact.y)
      this.drawPortableSignalContactGlyph(ctx, contact.kind, Math.round(point.x), Math.round(point.y))
    }
    ctx.restore()
  }

  private drawPortableSignalContactGlyph(
    ctx: CanvasRenderingContext2D,
    kind: 'hostile' | 'wall',
    cx: number,
    cy: number,
  ) {
    ctx.strokeStyle = kind === 'hostile' ? '#ff3346' : '#f2f5ee'
    ctx.lineWidth = 1
    if (kind === 'hostile') {
      for (let offset = -8; offset <= 8; offset += 4) {
        ctx.beginPath()
        ctx.moveTo(cx - 10, cy + offset - 4)
        ctx.lineTo(cx + 10, cy + offset + 4)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx - 10, cy + offset + 4)
        ctx.lineTo(cx + 10, cy + offset - 4)
        ctx.stroke()
      }
      return
    }
    ctx.beginPath()
    ctx.moveTo(cx - 7, cy)
    ctx.lineTo(cx - 2, cy)
    ctx.moveTo(cx + 2, cy)
    ctx.lineTo(cx + 7, cy)
    ctx.moveTo(cx, cy - 7)
    ctx.lineTo(cx, cy - 2)
    ctx.moveTo(cx, cy + 2)
    ctx.lineTo(cx, cy + 7)
    ctx.stroke()
  }

  private drawPortableRelayHoldPrompt(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    visual: InterpolatedOnlineSnapshot | null,
    camera: BattlefieldCamera,
  ) {
    const relay = snapshot.self.portableRelay
    if (relay.state !== 'hold' || relay.progress === null) return
    const visualSelf = visual?.players.find((player) => player.self)
    const snapshotSelf = snapshot.players.find((player) => player.self)
    const col = relay.action === 'recover'
      ? relay.targetCol
      : visualSelf?.visualCol ?? snapshotSelf?.col
    const row = relay.action === 'recover'
      ? relay.targetRow
      : visualSelf?.visualRow ?? snapshotSelf?.row
    if (col === null || col === undefined || row === null || row === undefined) return
    const point = worldPointToScreen(camera, col + 0.5, row + 0.5)
    const width = 64
    const height = 16
    const x = Math.max(ARENA_X + 2, Math.min(
      ARENA_X + ARENA_WIDTH - width - 2,
      Math.round(point.x - width / 2),
    ))
    const y = Math.max(ARENA_Y + 2, Math.min(
      ARENA_Y + ARENA_HEIGHT - height - 2,
      Math.round(point.y - 31),
    ))
    ctx.fillStyle = 'rgba(4, 7, 5, 0.88)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#151515'
    ctx.fillRect(x + 4, y + 10, width - 8, 3)
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(x + 4, y + 10, Math.max(2, Math.round((width - 8) * relay.progress)), 3)
    drawPixelText(ctx, relay.action === 'recover' ? 'HOLD E PICKUP' : 'HOLD E PLACE', x + width / 2, y + 3, {
      align: 'center',
      color: '#f2ead7',
      maxWidth: width - 6,
      scale: TEXT_SCALE,
    })
  }

  private cutArenaVisionCircles(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    visualPlayers: VisualOnlinePlayer[],
    camera: BattlefieldCamera,
    softEdgeTiles: number,
  ) {
    const circles = this.getVisualVisionCircles(snapshot, visualPlayers)
    const previousComposite = ctx.globalCompositeOperation

    ctx.globalCompositeOperation = 'destination-out'
    for (const circle of circles) {
      const screen = worldPointToScreen(camera, circle.x, circle.y)
      const x = screen.x
      const y = screen.y
      const radius = circle.radius * BATTLEFIELD_TILE_SIZE
      const soft = Math.max(1, softEdgeTiles * BATTLEFIELD_TILE_SIZE)
      const gradient = ctx.createRadialGradient(x, y, Math.max(0, radius - soft), x, y, radius + soft)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(0.64, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius + soft, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = previousComposite
  }

  private getVisualVisionCircles(snapshot: MultiplayerSnapshot, visualPlayers: VisualOnlinePlayer[]): VisionCircle[] {
    const visualById = new Map(visualPlayers.map((player) => [player.id, player]))

    return snapshot.vision.circles.map((circle) => {
      if (circle.kind === 'relay') {
        return circle
      }

      const player = visualById.get(circle.id)
      if (!player) {
        return circle
      }

      return {
        ...circle,
        x: player.visualCol + 0.5,
        y: player.visualRow + 0.5,
      }
    })
  }

  private getLayer(kind: 'arena' | 'minimap') {
    const width = kind === 'arena' ? LOGICAL_WIDTH : ONLINE_MINIMAP_COLS * ONLINE_MINIMAP_CELL_SIZE
    const height = kind === 'arena' ? LOGICAL_HEIGHT : ONLINE_MINIMAP_ROWS * ONLINE_MINIMAP_CELL_SIZE
    const current = kind === 'arena' ? this.fogLayer : this.minimapFogLayer

    if (current && current.width === width && current.height === height) {
      return current
    }

    const next = document.createElement('canvas')
    next.width = width
    next.height = height

    if (kind === 'arena') {
      this.fogLayer = next
    } else {
      this.minimapFogLayer = next
    }

    return next
  }

  private drawHudTopHpLine(ctx: CanvasRenderingContext2D, snapshot: MultiplayerSnapshot) {
    const self = snapshot.self
    const x = ARENA_X + 8
    const y = 4
    const hpBarX = x + 24
    const hpBarWidth = 120
    const hp = Math.max(0, Math.min(self.hp, Math.max(1, self.maxHp)))
    const hpFill = hp > 0 ? Math.max(1, Math.round((hpBarWidth - 2) * hp / self.maxHp)) : 0
    const danger = hp <= Math.ceil(self.maxHp / 3)
    drawPixelText(ctx, 'HP', x, y, { color: danger ? '#7b1e18' : HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    ctx.fillStyle = '#171717'
    ctx.fillRect(hpBarX, y + 3, hpBarWidth, 5)
    if (hpFill > 0) {
      ctx.fillStyle = danger ? '#f06243' : '#ffd35a'
      ctx.fillRect(hpBarX + 1, y + 4, hpFill, 3)
    }
    drawPixelText(ctx, `${hp}/${self.maxHp}`, hpBarX + hpBarWidth + 8, y, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })

    const shieldX = ARENA_X + 208
    const shieldBarX = shieldX + 54
    const shieldWidth = 96
    const shieldFill = self.shield > 0 ? Math.max(1, Math.round((shieldWidth - 2) * Math.min(1, self.shield / 3))) : 0
    drawPixelText(ctx, 'SHIELD', shieldX, y, { color: self.shield > 0 ? '#1f4c4c' : HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    ctx.fillStyle = '#171717'
    ctx.fillRect(shieldBarX, y + 3, shieldWidth, 5)
    if (shieldFill > 0) {
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(shieldBarX + 1, y + 4, shieldFill, 3)
    }
  }

  private drawClassEquipmentStrip(ctx: CanvasRenderingContext2D, snapshot: MultiplayerSnapshot) {
    const model = this.getClassEquipmentModel(snapshot)
    drawClassEquipmentHudStrip(
      ctx,
      model,
      ARENA_X + 6,
      ARENA_Y + ARENA_HEIGHT + 2,
      ARENA_WIDTH - 12,
      { time: snapshot.time, teamColor: this.getTeamColors(snapshot.team).trim },
    )
  }

  private getClassEquipmentModel(snapshot: MultiplayerSnapshot): ClassEquipmentHudModel {
    return getOnlineClassEquipmentModel(snapshot)
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    connection: string,
    radioOpen: boolean,
    camera: OnlineCameraState | null,
  ) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.textBaseline = 'top'
    const teamIcon = this.getUiTeamSprite(snapshot.team)
    this.drawHudIcon(ctx, teamIcon, HUD_X + 12, 55, 18, snapshot.team[0].toUpperCase())
    drawPixelText(ctx, snapshot.team, HUD_X + 36, 59, {
      color: this.getTeamColors(snapshot.team).body,
      maxWidth: 54,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudIcon(ctx, this.getUiBadgeSprite('blue'), HUD_X + 12, 93, 16, 'B')
    drawPixelText(ctx, String(snapshot.scores.blue), HUD_X + 36, 96, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, this.getUiBadgeSprite('red'), HUD_X + 12, 113, 16, 'R')
    drawPixelText(ctx, String(snapshot.scores.red), HUD_X + 36, 116, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, 'hud.timer', HUD_X + 12, 133, 16, 'T')
    drawPixelText(ctx, String(Math.ceil(snapshot.timeRemaining)), HUD_X + 36, 136, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })

    this.drawHudIcon(ctx, snapshot.teamVisionMerged ? 'hud.link.on' : 'hud.link.off', HUD_X + 12, 172, 18, 'LINK')
    drawPixelText(ctx, snapshot.teamVisionMerged ? 'LINK ON' : 'LINK OFF', HUD_X + 36, 176, { color: HUD_INK, maxWidth: 56, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, this.connectionSprite(connection), HUD_X + 12, 207, 18, 'NET')
    const status = getOnlineHudStatus(connection, snapshot)
    drawPixelText(ctx, status.label, HUD_X + 36, 212, { color: HUD_INK, maxWidth: 56, scale: TEXT_SCALE, shadowColor: null })
    drawPixelText(ctx, status.detail, HUD_X + 10, 229, {
      color: status.tone === 'error' ? '#5b1d16' : HUD_INK,
      maxWidth: 82,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawSignalButton(ctx, ONLINE_PING_BUTTON, 'hud.ping', 'PING', 'Q', false)
    this.drawSignalButton(ctx, ONLINE_RADIO_BUTTON, 'hud.radio', 'RADIO', 'T', radioOpen)

    drawPixelText(ctx, 'TEAM RADIO', HUD_X + 8, 337, {
      color: '#d8d4c8',
      maxWidth: 80,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    snapshot.radio.slice(-2).forEach((message, index) => {
      drawPixelText(ctx, `> ${message.command}`, HUD_X + 8, 349 + index * 13, {
        color: this.getTeamColors(message.team).highlight,
        maxWidth: 80,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })

    if (camera) {
      this.drawMinimap(ctx, snapshot, camera.current)
    }
  }

  private drawSignalButton(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
    spriteId: UiSpriteId,
    label: string,
    key: string,
    active: boolean,
  ) {
    ctx.fillStyle = active ? '#242a22' : '#454842'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeStyle = active ? '#fff1a5' : '#252820'
    ctx.lineWidth = active ? 2 : 1
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1)
    this.drawHudIcon(ctx, spriteId, rect.x + 7, rect.y + 10, 18, key)
    drawPixelText(ctx, label, rect.x + 31, rect.y + 15, {
      color: active ? '#fff1a5' : '#f2eee1',
      maxWidth: rect.width - 36,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
  }

  private drawRadioSelector(ctx: CanvasRenderingContext2D, team: Team, selectedIndex: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.fillStyle = '#11140f'
    ctx.fillRect(ONLINE_RADIO_PANEL.x, ONLINE_RADIO_PANEL.y, ONLINE_RADIO_PANEL.width, ONLINE_RADIO_PANEL.height)
    ctx.strokeStyle = this.getTeamColors(team).highlight
    ctx.lineWidth = 2
    ctx.strokeRect(
      ONLINE_RADIO_PANEL.x + 1,
      ONLINE_RADIO_PANEL.y + 1,
      ONLINE_RADIO_PANEL.width - 2,
      ONLINE_RADIO_PANEL.height - 2,
    )
    drawPixelText(ctx, 'TEAM RADIO', ONLINE_RADIO_PANEL.x + ONLINE_RADIO_PANEL.width / 2, ONLINE_RADIO_PANEL.y + 17, {
      align: 'center',
      color: '#fff1a5',
      scale: TEXT_SCALE,
    })

    TEAM_RADIO_COMMANDS.forEach((command, index) => {
      const rect = getOnlineRadioOptionRect(index)
      const selected = index === selectedIndex
      ctx.fillStyle = selected ? '#30372d' : '#1c201b'
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      if (selected) {
        ctx.strokeStyle = this.getTeamColors(team).highlight
        ctx.lineWidth = 2
        ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
      }
      drawPixelText(ctx, `${index + 1}  ${command}`, rect.x + 16, rect.y + 12, {
        color: selected ? '#fff1a5' : '#d8d4c8',
        maxWidth: rect.width - 24,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })

    drawPixelText(ctx, 'ARROWS + ENTER  /  TAP', ONLINE_RADIO_PANEL.x + ONLINE_RADIO_PANEL.width / 2, ONLINE_RADIO_PANEL.y + 238, {
      align: 'center',
      color: '#9ca59a',
      maxWidth: ONLINE_RADIO_PANEL.width - 24,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
  }

  private drawHudIcon(ctx: CanvasRenderingContext2D, spriteId: UiSpriteId, x: number, y: number, size: number, fallback: string) {
    if (drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui32' })) {
      return
    }

    drawPixelText(ctx, fallback, x + 1, y + 4, { color: HUD_INK, maxWidth: size, scale: TEXT_SCALE, shadowColor: null })
  }

  private connectionSprite(connection: string): UiSpriteId {
    if (connection === 'connected') {
      return 'status.ok'
    }

    if (connection === 'error') {
      return 'status.warn'
    }

    return 'status.connection'
  }

  private getUiTeamSprite(team: Team): UiSpriteId {
    if (this.colorSafe()) {
      return team === 'blue' ? 'hud.team.blue.safe' : 'hud.team.red.safe'
    }

    return team === 'blue' ? 'hud.team.blue' : 'hud.team.red'
  }

  private getUiBadgeSprite(team: Team): UiSpriteId {
    if (this.colorSafe()) {
      return team === 'blue' ? 'menu.badge.blue.safe' : 'menu.badge.red.safe'
    }

    return team === 'blue' ? 'menu.badge.blue' : 'menu.badge.red'
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    kind: TileKind,
    camera: BattlefieldCamera,
    col: number,
    row: number,
    time: number,
    waterNeighbors?: WaterNeighbors,
  ) {
    drawBattlefieldTerrainTile(ctx, kind, camera, col, row, 2, time, waterNeighbors)
  }

  private getVisibleWaterNeighbors(visibleWater: ReadonlySet<string>, col: number, row: number): WaterNeighbors {
    return {
      up: visibleWater.has(battlefieldCellKey(col, row - 1)),
      right: visibleWater.has(battlefieldCellKey(col + 1, row)),
      down: visibleWater.has(battlefieldCellKey(col, row + 1)),
      left: visibleWater.has(battlefieldCellKey(col - 1, row)),
    }
  }

  private drawLocalShotEffect(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, effect: OnlineShotEffect) {
    if (!isWorldCellInCamera(camera, Math.floor(effect.muzzleX), Math.floor(effect.muzzleY))) {
      return
    }

    const colors = this.getTeamColors(effect.team)
    const origin = worldPointToScreen(camera, effect.originX, effect.originY)
    const muzzle = worldPointToScreen(camera, effect.muzzleX, effect.muzzleY)
    const vector = this.vectorForDirection(effect.dir)
    const flash = {
      x: muzzle.x + vector.x * 7,
      y: muzzle.y + vector.y * 7,
    }
    const alpha = Math.max(0, 1 - effect.progress)
    const tailLength = 16 + Math.round((1 - effect.progress) * 10)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#070707'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(Math.round(origin.x), Math.round(origin.y))
    ctx.lineTo(Math.round(flash.x), Math.round(flash.y))
    ctx.stroke()
    ctx.fillStyle = colors.highlight
    for (let step = 0; step < tailLength; step += 4) {
      const x = flash.x - vector.x * step
      const y = flash.y - vector.y * step
      ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2)
    }
    ctx.fillStyle = '#ff9a35'
    ctx.fillRect(Math.round(flash.x - 6), Math.round(flash.y - 2), 12, 4)
    ctx.fillRect(Math.round(flash.x - 2), Math.round(flash.y - 6), 4, 12)
    ctx.fillStyle = '#fff4b0'
    ctx.fillRect(Math.round(flash.x - 3), Math.round(flash.y - 3), 6, 6)
    ctx.fillStyle = colors.bullet
    ctx.fillRect(Math.round(flash.x - 2), Math.round(flash.y - 2), 4, 4)
    drawBattlefieldProjectile(ctx, flash.x, flash.y, 6, colors.bullet, effect.dir, {
      frame: Math.floor(effect.progress * 4),
      teamKey: this.getTeamKey(effect.team),
    })
    ctx.restore()
  }

  private getTeamColors(team: Team) {
    return getBattlefieldTeamColors(team, this.colorSafe())
  }

  private getTeamKey(team: Team): AtlasTeamKey {
    return getBattlefieldTeamKey(team, this.colorSafe())
  }

  private getCamera(snapshot: MultiplayerSnapshot, visual: InterpolatedOnlineSnapshot | null) {
    return getOnlineTargetCamera(snapshot, visual) ?? { col: 0, row: 0 }
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, snapshot: MultiplayerSnapshot, camera: BattlefieldCamera) {
    const model = buildOnlineMinimapModel(snapshot, camera)
    const mapWidth = ONLINE_MINIMAP_COLS * ONLINE_MINIMAP_CELL_SIZE
    const mapHeight = ONLINE_MINIMAP_ROWS * ONLINE_MINIMAP_CELL_SIZE
    const pad = 3
    const x = HUD_X + HUD_WIDTH - mapWidth - pad * 2 - 8
    const y = LOGICAL_HEIGHT - mapHeight - pad * 2 - 8
    const mapX = x + pad
    const mapY = y + pad

    drawPixelText(ctx, 'MAP', mapX, y - 11, {
      color: '#d8d4c8',
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    ctx.fillStyle = '#090b08'
    ctx.fillRect(x, y, mapWidth + pad * 2, mapHeight + pad * 2)
    ctx.fillStyle = '#141712'
    ctx.fillRect(mapX, mapY, mapWidth, mapHeight)

    for (const cell of model.visibleCells) {
      ctx.fillStyle = '#233425'
      this.fillMiniCell(ctx, mapX, mapY, cell.col, cell.row)
    }

    for (const tile of model.terrain) {
      ctx.fillStyle = this.minimapTerrainColor(tile.kind)
      this.fillMiniCell(ctx, mapX, mapY, tile.col, tile.row)
    }

    for (const relay of model.retranslators) {
      ctx.fillStyle = relay.owner ? this.getTeamColors(relay.owner).highlight : '#d8d4c8'
      this.fillMiniPoint(ctx, mapX, mapY, relay.col, relay.row, 4)
    }

    for (const ping of model.pings) {
      ctx.fillStyle = this.getTeamColors(ping.team).bullet
      this.fillMiniPoint(ctx, mapX, mapY, ping.col, ping.row, 3)
    }

    for (const player of model.players) {
      ctx.fillStyle = player.self ? this.getTeamColors(player.team).highlight : this.getTeamColors(player.team).body
      this.fillMiniPoint(ctx, mapX, mapY, player.col, player.row, player.self ? 4 : 3)
    }

    this.drawMinimapCircularFog(ctx, model.visionCircles, mapX, mapY, mapWidth, mapHeight)

    for (const memory of model.signalContacts) {
      ctx.fillStyle = this.getTeamColors(memory.team).highlight
      this.fillMiniPoint(ctx, mapX, mapY, memory.col, memory.row, 2)
    }

    ctx.strokeStyle = '#d7d2a7'
    ctx.lineWidth = 1
    ctx.strokeRect(
      mapX + model.viewport.col * ONLINE_MINIMAP_CELL_SIZE + 0.5,
      mapY + model.viewport.row * ONLINE_MINIMAP_CELL_SIZE + 0.5,
      model.viewport.cols * ONLINE_MINIMAP_CELL_SIZE,
      model.viewport.rows * ONLINE_MINIMAP_CELL_SIZE,
    )
    ctx.strokeStyle = '#4b4d46'
    ctx.strokeRect(x + 0.5, y + 0.5, mapWidth + pad * 2 - 1, mapHeight + pad * 2 - 1)
  }

  private drawMinimapCircularFog(
    ctx: CanvasRenderingContext2D,
    circles: VisionCircle[],
    mapX: number,
    mapY: number,
    mapWidth: number,
    mapHeight: number,
  ) {
    const layer = this.getLayer('minimap')
    const g = layer.getContext('2d')
    if (!g) return

    g.clearRect(0, 0, layer.width, layer.height)
    g.fillStyle = '#050605'
    g.fillRect(0, 0, mapWidth, mapHeight)
    const previousComposite = g.globalCompositeOperation
    g.globalCompositeOperation = 'destination-out'
    for (const circle of circles) {
      const x = circle.x * ONLINE_MINIMAP_CELL_SIZE
      const y = circle.y * ONLINE_MINIMAP_CELL_SIZE
      const radius = circle.radius * ONLINE_MINIMAP_CELL_SIZE
      const soft = Math.max(1, VISION_APERTURE_SOFT_EDGE_CELLS * ONLINE_MINIMAP_CELL_SIZE)
      const gradient = g.createRadialGradient(x, y, Math.max(0, radius - soft), x, y, radius + soft)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      g.fillStyle = gradient
      g.beginPath()
      g.arc(x, y, radius + soft, 0, Math.PI * 2)
      g.fill()
    }
    g.globalCompositeOperation = previousComposite

    ctx.save()
    ctx.beginPath()
    ctx.rect(mapX, mapY, mapWidth, mapHeight)
    ctx.clip()
    ctx.drawImage(layer, mapX, mapY)
    ctx.strokeStyle = 'rgba(216, 212, 168, 0.62)'
    ctx.lineWidth = 1
    for (const circle of circles) {
      ctx.beginPath()
      ctx.arc(
        mapX + circle.x * ONLINE_MINIMAP_CELL_SIZE,
        mapY + circle.y * ONLINE_MINIMAP_CELL_SIZE,
        circle.radius * ONLINE_MINIMAP_CELL_SIZE,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
    ctx.restore()
  }

  private fillMiniCell(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, col: number, row: number) {
    ctx.fillRect(
      mapX + col * ONLINE_MINIMAP_CELL_SIZE,
      mapY + row * ONLINE_MINIMAP_CELL_SIZE,
      ONLINE_MINIMAP_CELL_SIZE,
      ONLINE_MINIMAP_CELL_SIZE,
    )
  }

  private fillMiniPoint(
    ctx: CanvasRenderingContext2D,
    mapX: number,
    mapY: number,
    col: number,
    row: number,
    size: number,
  ) {
    const offset = Math.floor((ONLINE_MINIMAP_CELL_SIZE - size) / 2)
    const x = mapX + col * ONLINE_MINIMAP_CELL_SIZE + offset
    const y = mapY + row * ONLINE_MINIMAP_CELL_SIZE + offset
    const color = ctx.fillStyle

    ctx.fillStyle = '#050605'
    ctx.fillRect(x - 1, y - 1, size + 2, size + 2)
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
  }

  private minimapTerrainColor(kind: TileKind) {
    if (kind === 'brick') return '#8b6536'
    if (kind === 'steel') return '#9ea59f'
    if (kind === 'water') return '#237aa6'
    if (kind === 'trees') return '#1f4a27'
    if (kind === 'base') return '#d9d098'
    if (kind === 'ammo') return '#d0a342'
    return '#2f5132'
  }

  private drawTouchControls(
    ctx: CanvasRenderingContext2D,
    visible: boolean,
    heldButtons: Record<'up' | 'right' | 'down' | 'left' | 'fire', boolean>,
    joystick: TouchJoystickSnapshot,
  ) {
    if (!visible) {
      return
    }

    drawTouchControlsOverlay(ctx, heldButtons, {
      handedness: this.touchHandedness(),
      joystick,
      primary: !this.touchSideRailsActive(),
    })
  }

  private vectorForDirection(direction: Direction) {
    if (direction === 'right') {
      return { x: 1, y: 0 }
    }
    if (direction === 'down') {
      return { x: 0, y: 1 }
    }
    if (direction === 'left') {
      return { x: -1, y: 0 }
    }
    return { x: 0, y: -1 }
  }

  private drawWaitingPlaque(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    accent: string,
  ) {
    ctx.fillStyle = 'rgba(5, 7, 5, 0.82)'
    ctx.fillRect(x, y + 3, width, height)
    ctx.fillStyle = '#050505'
    ctx.fillRect(x, y + height - 3, width, 3)
    ctx.fillStyle = 'rgba(37, 43, 35, 0.92)'
    ctx.fillRect(x + 2, y + 2, width - 4, height - 7)
    ctx.fillStyle = '#87927a'
    ctx.fillRect(x + 16, y + 6, width - 32, 2)
    ctx.fillStyle = accent
    ctx.fillRect(x + 16, y + height - 8, width - 32, 1)
  }
}
