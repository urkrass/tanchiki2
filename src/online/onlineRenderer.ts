import { HUD_X, HUD_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH, TANK_SIZE } from '../game/constants.ts'
import {
  BATTLEFIELD_VIEW_COLS,
  BATTLEFIELD_VIEW_ROWS,
  battlefieldCellKey,
  centerBattlefieldCameraOnCell,
  drawBattlefieldFrame,
  drawBattlefieldGround,
  drawBattlefieldHiddenCell,
  drawBattlefieldLastKnown,
  drawBattlefieldPing,
  drawBattlefieldProjectile,
  drawBattlefieldRelay,
  drawBattlefieldTank,
  drawBattlefieldTerrainTile,
  getBattlefieldTeamColors,
  getBattlefieldTeamKey,
  isBattlefieldCellVisible,
  isWorldCellInCamera,
  worldPointToScreen,
  type BattlefieldCamera,
} from '../game/battlefield.ts'
import type { AtlasTeamKey } from '../game/spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from '../game/uiAtlas.ts'
import type { OnlineBattleClient } from './onlineClient.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'
import type { MultiplayerSnapshot, Retranslator, Team, TileKind } from '../../packages/shared/src/index.ts'

const ONLINE_MAP_COLS = 20
const ONLINE_MAP_ROWS = 16
const FONT = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
const SMALL_FONT = '8px ui-monospace, SFMono-Regular, Consolas, monospace'

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

  constructor(canvas: HTMLCanvasElement, client: OnlineBattleClient, colorSafe: () => boolean) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is required')
    this.context = context
    this.context.imageSmoothingEnabled = false
    this.client = client
    this.colorSafe = colorSafe
  }

  render() {
    const state = this.client.getState(performance.now())
    const ctx = this.context
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    this.drawFrame(ctx)

    if (!state.snapshot) {
      this.drawWaiting(ctx, state.connection, state.error)
      return
    }

    this.drawBattle(ctx, state.snapshot, state.visual)
    this.drawHud(ctx, state.snapshot, state.connection, state.radioOpen, state.radioDraft)
  }

  private drawFrame(ctx: CanvasRenderingContext2D) {
    drawBattlefieldFrame(ctx)
  }

  private drawWaiting(ctx: CanvasRenderingContext2D, connection: string, error: string) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this.drawWaitingPlaque(ctx, HUD_X / 2 - 104, 118, 208, 34, connection === 'error' ? '#f06243' : '#66c8ff')
    ctx.font = '20px ui-monospace, Consolas, monospace'
    ctx.fillStyle = connection === 'error' ? '#f06243' : '#66c8ff'
    ctx.fillText(connection === 'error' ? 'ONLINE ERROR' : 'CONNECTING', HUD_X / 2, 135)
    drawUiSprite(ctx, connection === 'error' ? 'status.warn' : 'status.connection', HUD_X / 2 - 10, 158, {
      width: 20,
      height: 20,
      sheet: 'ui20',
    })
    ctx.textBaseline = 'top'
    ctx.font = FONT
    ctx.fillStyle = '#d8d4c8'
    ctx.fillText(connection === 'error' ? error : 'Joining Quick Match...', HUD_X / 2, 184)
    ctx.font = SMALL_FONT
    ctx.fillStyle = '#8f8a82'
    ctx.fillText('ESC BACK', HUD_X / 2, 374)
    ctx.textAlign = 'start'
  }

  private drawBattle(ctx: CanvasRenderingContext2D, snapshot: MultiplayerSnapshot, visual: InterpolatedOnlineSnapshot | null) {
    const camera = this.getCamera(snapshot)
    const visible = new Set(snapshot.visibleCells.map((cell) => battlefieldCellKey(cell.col, cell.row)))
    const frameTime = visual?.animation.visualTime ?? snapshot.time

    for (let row = camera.row; row < camera.row + BATTLEFIELD_VIEW_ROWS; row += 1) {
      for (let col = camera.col; col < camera.col + BATTLEFIELD_VIEW_COLS; col += 1) {
        if (!isBattlefieldCellVisible(visible, col, row)) {
          drawBattlefieldHiddenCell(ctx, camera, col, row)
        } else {
          drawBattlefieldGround(ctx, camera, col, row)
        }
      }
    }

    for (const tile of snapshot.visibleTerrain) {
      this.drawTile(ctx, tile.kind, camera, tile.col, tile.row, frameTime)
    }

    for (const relay of snapshot.retranslators) {
      const progressTeam = relayProgressTeam(relay)
      drawBattlefieldRelay(ctx, camera, relay.col, relay.row, relay.owner ? this.getTeamColors(relay.owner) : null, relay.progress, {
        frame: Math.floor(frameTime * 4),
        progressPalette: progressTeam ? this.getTeamColors(progressTeam) : null,
        teamKey: relay.owner ? this.getTeamKey(relay.owner) : 'neutral',
      })
    }

    for (const memory of snapshot.lastKnown) {
      drawBattlefieldLastKnown(ctx, camera, memory.col, memory.row, this.getTeamColors(memory.team).highlight)
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

    for (const ping of snapshot.pings) {
      drawBattlefieldPing(ctx, camera, ping.col, ping.row, this.getTeamColors(ping.team).highlight)
    }
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    connection: string,
    radioOpen: boolean,
    radioDraft: string,
  ) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.font = FONT
    ctx.textBaseline = 'top'
    const teamIcon = this.getUiTeamSprite(snapshot.team)
    this.drawHudIcon(ctx, teamIcon, HUD_X + 12, 55, 18, snapshot.team[0].toUpperCase())
    ctx.fillStyle = this.getTeamColors(snapshot.team).body
    ctx.fillText(snapshot.team.toUpperCase(), HUD_X + 36, 59)

    ctx.fillStyle = '#111'
    this.drawHudIcon(ctx, this.getUiBadgeSprite('blue'), HUD_X + 12, 93, 16, 'B')
    ctx.fillText(String(snapshot.scores.blue), HUD_X + 36, 96)
    this.drawHudIcon(ctx, this.getUiBadgeSprite('red'), HUD_X + 12, 113, 16, 'R')
    ctx.fillText(String(snapshot.scores.red), HUD_X + 36, 116)
    this.drawHudIcon(ctx, 'hud.timer', HUD_X + 12, 133, 16, 'T')
    ctx.fillText(String(Math.ceil(snapshot.timeRemaining)), HUD_X + 36, 136)

    this.drawHudIcon(ctx, snapshot.teamVisionMerged ? 'hud.link.on' : 'hud.link.off', HUD_X + 12, 172, 18, 'LINK')
    ctx.fillText(snapshot.teamVisionMerged ? 'LINK ON' : 'LINK OFF', HUD_X + 36, 176)
    this.drawHudIcon(ctx, this.connectionSprite(connection), HUD_X + 12, 207, 18, 'NET')
    ctx.fillText(connection.toUpperCase(), HUD_X + 36, 212)

    ctx.font = SMALL_FONT
    ctx.fillStyle = '#161616'
    this.drawHudIcon(ctx, 'hud.ping', HUD_X + 10, 247, 14, 'Q')
    ctx.fillText(radioOpen ? 'ENTER SEND' : 'Q PING', HUD_X + 30, 250)
    this.drawHudIcon(ctx, 'hud.radio', HUD_X + 10, 263, 14, 'T')
    ctx.fillText(radioOpen ? 'ESC CANCEL' : 'T RADIO', HUD_X + 30, 266)
    this.drawHudIcon(ctx, radioOpen ? 'status.radio' : 'status.off', HUD_X + 10, 279, 14, 'R')
    ctx.fillText(radioOpen ? 'RADIO:' : 'ESC LEAVE', HUD_X + 30, 282)
    if (radioOpen) {
      ctx.fillStyle = this.getTeamColors(snapshot.team).highlight
      ctx.fillText((radioDraft || '_').slice(0, 14), HUD_X + 18, 298)
    }

    const chatY = 318
    snapshot.chat.slice(-4).forEach((message, index) => {
      ctx.fillStyle = this.getTeamColors(message.team).body
      ctx.fillText(`${message.name}:`, HUD_X + 8, chatY + index * 18)
      ctx.fillStyle = '#111'
      ctx.fillText(message.text.slice(0, 14), HUD_X + 8, chatY + index * 18 + 8)
    })
  }

  private drawHudIcon(ctx: CanvasRenderingContext2D, spriteId: UiSpriteId, x: number, y: number, size: number, fallback: string) {
    if (drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui32' })) {
      return
    }

    ctx.font = SMALL_FONT
    ctx.fillStyle = '#161616'
    ctx.fillText(fallback, x + 1, y + 4)
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

  private drawTile(ctx: CanvasRenderingContext2D, kind: TileKind, camera: BattlefieldCamera, col: number, row: number, time: number) {
    drawBattlefieldTerrainTile(ctx, kind, camera, col, row, 2, time)
  }

  private getTeamColors(team: Team) {
    return getBattlefieldTeamColors(team, this.colorSafe())
  }

  private getTeamKey(team: Team): AtlasTeamKey {
    return getBattlefieldTeamKey(team, this.colorSafe())
  }

  private getCamera(snapshot: MultiplayerSnapshot) {
    const self = snapshot.players.find((player) => player.self)
    return centerBattlefieldCameraOnCell(self?.col ?? 0, self?.row ?? 0, ONLINE_MAP_COLS, ONLINE_MAP_ROWS)
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
