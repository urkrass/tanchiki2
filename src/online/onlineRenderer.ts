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
import type { AtlasTeamKey } from '../game/spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from '../game/uiAtlas.ts'
import { drawPixelText } from '../game/pixelText.ts'
import { drawTouchControlsOverlay } from '../game/touchControlsRender.ts'
import type { OnlineBattleClient } from './onlineClient.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'
import type { VisualOnlinePlayer } from './onlineInterpolation.ts'
import { ONLINE_MAP_COLS, ONLINE_MAP_ROWS, getOnlineTargetCamera, type OnlineCameraState } from './onlineCamera.ts'
import { ONLINE_MINIMAP_CELL_SIZE, ONLINE_MINIMAP_COLS, ONLINE_MINIMAP_ROWS, buildOnlineMinimapModel } from './onlineMinimap.ts'
import type { OnlineShotEffect } from './onlineShooting.ts'
import { getOnlineHudStatus, getOnlineWaitingCopy } from './onlineStatus.ts'
import type { TouchHandedness, TouchJoystickSnapshot, WaterNeighbors } from '../game/types.ts'
import type { Direction, MultiplayerSnapshot, Retranslator, Team, TileKind, VisionCircle } from '../../packages/shared/src/index.ts'
import { drawBackControl } from '../game/backControl.ts'
import {
  ONLINE_ENTRY_CREATE_ACTION_Y,
  ONLINE_ENTRY_JOIN_ACTION_Y,
  ONLINE_ENTRY_KEY_Y,
  ONLINE_ENTRY_NAME_Y,
} from './onlineEntryLayout.ts'

const TEXT_SCALE = 1
const TITLE_SCALE = 2
const HUD_INK = '#252820'
const FOG_SOFT_EDGE_TILES = 0.35

export function relayProgressTeam(relay: Pick<Retranslator, 'owner' | 'captureTeam' | 'progress'>): Team | null {
  if (relay.captureTeam && relay.progress > 0 && relay.progress < 1) {
    return relay.captureTeam
  }

  return relay.owner
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
      this.drawResults(ctx, state.result, state.connection)
      this.client.markResultRendered()
      drawBackControl(ctx)
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
    this.drawHud(ctx, state.snapshot, state.connection, state.radioOpen, state.radioDraft, state.camera)
    this.drawTouchControls(ctx, state.touchControlsVisible, state.input.held, state.touchJoystick)
    drawBackControl(ctx)
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
    drawPixelText(ctx, state.connection === 'reconnecting' ? 'RECONNECTING - INPUTS CLEARED' : 'RELAY YARD - TEAM BATTLE - FIRST TO 15', LOGICAL_WIDTH / 2, 70, {
      align: 'center', color: state.connection === 'reconnecting' ? '#f4a261' : '#9ca59a', scale: TEXT_SCALE,
    })
    if (host && lobby.roomKey) {
      drawPixelText(ctx, `ROOM ${lobby.roomKey}   C ${state.copyState === 'copied' ? 'COPIED' : 'COPY'}`, LOGICAL_WIDTH / 2, 86, {
        align: 'center', color: '#fff1a5', scale: TEXT_SCALE,
      })
    }

    ctx.fillStyle = '#343a32'
    ctx.fillRect(LOGICAL_WIDTH / 2, 118, 1, 154)
    drawPixelText(ctx, 'BLUE', 128, 120, { align: 'center', color: '#66c8ff', scale: TITLE_SCALE })
    drawPixelText(ctx, 'RED', 384, 120, { align: 'center', color: '#f06243', scale: TITLE_SCALE })
    this.drawTeamRoster(ctx, state, 'blue', 128)
    this.drawTeamRoster(ctx, state, 'red', 384)

    if (lobby.phase === 'LOBBY') {
      drawPixelText(ctx, '1 BLUE', 66, 314, { color: self?.team === 'blue' ? '#fff1a5' : '#66c8ff', scale: TEXT_SCALE })
      drawPixelText(ctx, '2 RED', 184, 314, { color: self?.team === 'red' ? '#fff1a5' : '#f06243', scale: TEXT_SCALE })
      drawPixelText(ctx, `R ${self?.ready ? 'NOT READY' : 'READY'}`, 302, 314, { color: '#fff1a5', scale: TEXT_SCALE })
      if (host) drawPixelText(ctx, 'ENTER START', 416, 314, { color: '#7ebc83', scale: TEXT_SCALE })
      if (host && lobby.players.length > 1) {
        drawPixelText(ctx, 'UP/DOWN SELECT PLAYER   K KICK', LOGICAL_WIDTH / 2, 344, {
          align: 'center', color: '#8f8a82', scale: TEXT_SCALE,
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
    } else {
      drawPixelText(ctx, 'READY REQUIRES EQUAL TEAMS AND EVERY PLAYER CONNECTED', LOGICAL_WIDTH / 2, 374, {
        align: 'center', color: '#777f75', maxWidth: LOGICAL_WIDTH - 70, scale: TEXT_SCALE,
      })
    }
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
      drawPixelText(ctx, `${player.ready ? 'READY' : player.connected ? 'NOT READY' : 'DISCONNECTED'} - ${player.quality.toUpperCase()}`, centerX, y + 20, {
        align: 'center', color: player.ready ? '#7ebc83' : '#777f75', maxWidth: 220, scale: TEXT_SCALE,
      })
    })
    if (players.length === 0) {
      drawPixelText(ctx, 'OPEN SEAT', centerX, 178, { align: 'center', color: '#4e554c', scale: TEXT_SCALE })
    }
  }

  private drawResults(ctx: CanvasRenderingContext2D, result: NonNullable<ReturnType<OnlineBattleClient['getState']>['result']>, connection: string) {
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
    drawPixelText(ctx, `FINAL SERVER TICK ${result.finalServerTick}`, LOGICAL_WIDTH / 2, 244, {
      align: 'center', color: '#777f75', scale: TEXT_SCALE,
    })
    const median = result.network.rttMedianMs === null ? 'MEASURING' : `${Math.round(result.network.rttMedianMs)} MS`
    drawPixelText(ctx, `NETWORK  RTT ${median}   RECONNECTS ${result.network.reconnectCount}`, LOGICAL_WIDTH / 2, 284, {
      align: 'center', color: '#7ebc83', maxWidth: LOGICAL_WIDTH - 80, scale: TEXT_SCALE,
    })
    drawPixelText(ctx, connection === 'disconnected' ? 'RESULT STORED - ROOM CLOSED' : 'RESULT STORED - CLEANING ROOM', LOGICAL_WIDTH / 2, 332, {
      align: 'center', color: '#fff1a5', scale: TEXT_SCALE,
    })
    drawPixelText(ctx, 'B BACK TO MAIN MENU', LOGICAL_WIDTH / 2, 382, {
      align: 'center', color: '#777f75', scale: TEXT_SCALE,
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
      drawBattlefieldProjectile(
        ctx,
        point.x,
        point.y,
        5,
        this.getTeamColors(bullet.team).bullet,
        bullet.dir,
        {
          frame: Math.floor(frameTime * 14),
          teamKey: this.getTeamKey(bullet.team),
        },
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

    for (const memory of snapshot.lastKnown) {
      drawBattlefieldLastKnown(ctx, camera, memory.col, memory.row, this.getTeamColors(memory.team).highlight)
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
    this.cutArenaVisionCircles(g, snapshot, visual?.players ?? [], camera, FOG_SOFT_EDGE_TILES)
    ctx.drawImage(layer, 0, 0)
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

  private drawHud(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    connection: string,
    radioOpen: boolean,
    radioDraft: string,
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

    this.drawHudIcon(ctx, 'hud.ping', HUD_X + 10, 247, 14, 'Q')
    drawPixelText(ctx, radioOpen ? 'ENTER SEND' : 'Q PING', HUD_X + 30, 250, { color: HUD_INK, maxWidth: 60, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, 'hud.radio', HUD_X + 10, 263, 14, 'T')
    drawPixelText(ctx, radioOpen ? 'BACK CANCEL' : 'T RADIO', HUD_X + 30, 266, { color: HUD_INK, maxWidth: 60, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, radioOpen ? 'status.radio' : 'status.off', HUD_X + 10, 279, 14, 'R')
    drawPixelText(ctx, radioOpen ? 'RADIO:' : 'BACK LEAVE', HUD_X + 30, 282, { color: HUD_INK, maxWidth: 60, scale: TEXT_SCALE, shadowColor: null })
    if (radioOpen) {
      drawPixelText(ctx, (radioDraft || '_').slice(0, 14), HUD_X + 18, 298, {
        color: this.getTeamColors(snapshot.team).highlight,
        maxWidth: 72,
        scale: TEXT_SCALE,
      })
    }

    const chatY = 318
    snapshot.chat.slice(-2).forEach((message, index) => {
      drawPixelText(ctx, `${message.name}:`, HUD_X + 8, chatY + index * 18, {
        color: this.getTeamColors(message.team).body,
        maxWidth: 80,
        scale: TEXT_SCALE,
      })
      drawPixelText(ctx, message.text.slice(0, 14), HUD_X + 8, chatY + index * 18 + 9, {
        color: HUD_INK,
        maxWidth: 80,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })

    if (camera) {
      this.drawMinimap(ctx, snapshot, camera.current)
    }
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

    for (const memory of model.lastKnown) {
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
      const soft = Math.max(1, FOG_SOFT_EDGE_TILES * ONLINE_MINIMAP_CELL_SIZE)
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
