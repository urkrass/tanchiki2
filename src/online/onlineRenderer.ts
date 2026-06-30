import { ARENA_X, ARENA_Y, HUD_X, HUD_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../game/constants.ts'
import {
  drawPixelGround,
  drawPixelLastKnown,
  drawPixelPing,
  drawPixelProjectile,
  drawPixelRelay,
  drawPixelTank,
  drawPixelTerrainTile,
  type PixelTeamPalette,
} from '../game/pixelArt.ts'
import type { AtlasTeamKey } from '../game/spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from '../game/uiAtlas.ts'
import type { OnlineBattleClient } from './onlineClient.ts'
import type { MultiplayerSnapshot, Team, TileKind } from '../../packages/shared/src/index.ts'

const MAP_COLS = 20
const MAP_ROWS = 16
const MAP_TILE = 20
const MAP_X = ARENA_X + 8
const MAP_Y = ARENA_Y + 32
const FONT = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
const SMALL_FONT = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
const TEAM_COLORS: Record<Team, PixelTeamPalette> = {
  blue: { body: '#66c8ff', trim: '#194f78', highlight: '#c6f0ff', bullet: '#bdeeff' },
  red: { body: '#f06243', trim: '#7d2419', highlight: '#ffd6c8', bullet: '#ffcfb7' },
}
const COLOR_SAFE_TEAM_COLORS: Record<Team, PixelTeamPalette> = {
  blue: { body: '#2fd4ff', trim: '#06364d', highlight: '#f3ffff', bullet: '#b9f3ff' },
  red: { body: '#ffb000', trim: '#553300', highlight: '#fff0bd', bullet: '#ffe0a3' },
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
    const state = this.client.getState()
    const ctx = this.context
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    this.drawFrame(ctx)

    if (!state.snapshot) {
      this.drawWaiting(ctx, state.connection, state.error)
      return
    }

    this.drawBattle(ctx, state.snapshot)
    this.drawHud(ctx, state.snapshot, state.connection, state.radioOpen, state.radioDraft)
  }

  private drawFrame(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#6a6964'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    ctx.fillStyle = '#050505'
    ctx.fillRect(ARENA_X, ARENA_Y, HUD_X, LOGICAL_HEIGHT - ARENA_Y)
    ctx.fillStyle = '#4f504c'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
  }

  private drawWaiting(ctx: CanvasRenderingContext2D, connection: string, error: string) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    drawUiSprite(ctx, 'menu.title', HUD_X / 2 - 104, 118, { width: 208, height: 34, sheet: 'ui32', alpha: 0.92 })
    ctx.font = '20px ui-monospace, Consolas, monospace'
    ctx.fillStyle = connection === 'error' ? '#f06243' : '#66c8ff'
    ctx.fillText(connection === 'error' ? 'ONLINE ERROR' : 'CONNECTING', HUD_X / 2, 132)
    drawUiSprite(ctx, connection === 'error' ? 'status.warn' : 'status.connection', HUD_X / 2 - 10, 158, {
      width: 20,
      height: 20,
      sheet: 'ui20',
    })
    ctx.font = FONT
    ctx.fillStyle = '#d8d4c8'
    ctx.fillText(connection === 'error' ? error : 'Joining Quick Match...', HUD_X / 2, 184)
    ctx.font = SMALL_FONT
    ctx.fillStyle = '#8f8a82'
    ctx.fillText('ESC BACK', HUD_X / 2, 374)
    ctx.textAlign = 'start'
  }

  private drawBattle(ctx: CanvasRenderingContext2D, snapshot: MultiplayerSnapshot) {
    const visible = new Set(snapshot.visibleCells.map((cell) => key(cell.col, cell.row)))

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        const x = MAP_X + col * MAP_TILE
        const y = MAP_Y + row * MAP_TILE
        if (!visible.has(key(col, row))) {
          ctx.fillStyle = '#030303'
          ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
        } else {
          drawPixelGround(ctx, x, y, MAP_TILE, col, row)
        }
      }
    }

    for (const tile of snapshot.visibleTerrain) {
      this.drawTile(ctx, tile.kind, MAP_X + tile.col * MAP_TILE, MAP_Y + tile.row * MAP_TILE, tile.col, tile.row, snapshot.timeRemaining)
    }

    for (const relay of snapshot.retranslators) {
      const x = MAP_X + relay.col * MAP_TILE
      const y = MAP_Y + relay.row * MAP_TILE
      drawPixelRelay(ctx, x, y, MAP_TILE, relay.owner ? this.getTeamColors(relay.owner) : null, relay.progress, {
        frame: Math.floor(snapshot.timeRemaining * 4),
        sheet: 'core20',
        teamKey: relay.owner ? this.getTeamKey(relay.owner) : 'neutral',
      })
    }

    for (const memory of snapshot.lastKnown) {
      const x = MAP_X + memory.col * MAP_TILE
      const y = MAP_Y + memory.row * MAP_TILE
      drawPixelLastKnown(ctx, x, y, MAP_TILE, this.getTeamColors(memory.team).highlight)
    }

    for (const bullet of snapshot.bullets) {
      drawPixelProjectile(
        ctx,
        MAP_X + bullet.x * MAP_TILE,
        MAP_Y + bullet.y * MAP_TILE,
        5,
        this.getTeamColors(bullet.team).bullet,
        bullet.dir,
        {
          frame: Math.floor(snapshot.timeRemaining * 14),
          sheet: 'core20',
          teamKey: this.getTeamKey(bullet.team),
        },
      )
    }

    for (const player of snapshot.players) {
      const colors = this.getTeamColors(player.team)
      const x = MAP_X + player.col * MAP_TILE
      const y = MAP_Y + player.row * MAP_TILE
      drawPixelTank(ctx, x + MAP_TILE / 2, y + MAP_TILE / 2, 18, player.dir, colors, {
        alive: player.alive,
        frame: Math.floor(snapshot.timeRemaining * 8),
        self: player.self,
        sheet: 'core20',
        teamKey: this.getTeamKey(player.team),
      })
    }

    for (const ping of snapshot.pings) {
      drawPixelPing(ctx, MAP_X + ping.col * MAP_TILE, MAP_Y + ping.row * MAP_TILE, MAP_TILE, this.getTeamColors(ping.team).highlight)
    }
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    connection: string,
    radioOpen: boolean,
    radioDraft: string,
  ) {
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
    if (drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui20' })) {
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

  private drawTile(ctx: CanvasRenderingContext2D, kind: TileKind, x: number, y: number, col: number, row: number, time: number) {
    drawPixelTerrainTile(ctx, kind, x, y, MAP_TILE, { col, row, hp: 2, sheet: 'core20', time })
  }

  private getTeamColors(team: Team) {
    return this.colorSafe() ? COLOR_SAFE_TEAM_COLORS[team] : TEAM_COLORS[team]
  }

  private getTeamKey(team: Team): AtlasTeamKey {
    if (this.colorSafe()) {
      return team === 'blue' ? 'blueSafe' : 'redSafe'
    }

    return team
  }
}

function key(col: number, row: number) {
  return `${col},${row}`
}
