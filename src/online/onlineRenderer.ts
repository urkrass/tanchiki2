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
    ctx.font = '20px ui-monospace, Consolas, monospace'
    ctx.fillStyle = connection === 'error' ? '#f06243' : '#66c8ff'
    ctx.fillText(connection === 'error' ? 'ONLINE ERROR' : 'CONNECTING', HUD_X / 2, 132)
    ctx.font = FONT
    ctx.fillStyle = '#d8d4c8'
    ctx.fillText(connection === 'error' ? error : 'Joining Quick Match...', HUD_X / 2, 174)
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
      this.drawTile(ctx, tile.kind, MAP_X + tile.col * MAP_TILE, MAP_Y + tile.row * MAP_TILE, tile.col, tile.row)
    }

    for (const relay of snapshot.retranslators) {
      const x = MAP_X + relay.col * MAP_TILE
      const y = MAP_Y + relay.row * MAP_TILE
      drawPixelRelay(ctx, x, y, MAP_TILE, relay.owner ? this.getTeamColors(relay.owner) : null, relay.progress)
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
      )
    }

    for (const player of snapshot.players) {
      const colors = this.getTeamColors(player.team)
      const x = MAP_X + player.col * MAP_TILE
      const y = MAP_Y + player.row * MAP_TILE
      drawPixelTank(ctx, x + MAP_TILE / 2, y + MAP_TILE / 2, 18, player.dir, colors, { alive: player.alive, self: player.self })
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
    ctx.fillStyle = this.getTeamColors(snapshot.team).body
    ctx.fillText(snapshot.team.toUpperCase(), HUD_X + 18, 58)
    ctx.fillStyle = '#111'
    ctx.fillText(`B ${snapshot.scores.blue}`, HUD_X + 18, 96)
    ctx.fillText(`R ${snapshot.scores.red}`, HUD_X + 18, 116)
    ctx.fillText(`T ${Math.ceil(snapshot.timeRemaining)}`, HUD_X + 18, 136)
    ctx.fillText(snapshot.teamVisionMerged ? 'LINK ON' : 'LINK OFF', HUD_X + 18, 176)
    ctx.fillText(connection.toUpperCase(), HUD_X + 18, 212)

    ctx.font = SMALL_FONT
    ctx.fillStyle = '#161616'
    ctx.fillText(radioOpen ? 'ENTER SEND' : 'Q PING', HUD_X + 18, 250)
    ctx.fillText(radioOpen ? 'ESC CANCEL' : 'T RADIO', HUD_X + 18, 266)
    ctx.fillText(radioOpen ? 'RADIO:' : 'ESC LEAVE', HUD_X + 18, 282)
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

  private drawTile(ctx: CanvasRenderingContext2D, kind: TileKind, x: number, y: number, col: number, row: number) {
    drawPixelTerrainTile(ctx, kind, x, y, MAP_TILE, { col, row, hp: 2 })
  }

  private getTeamColors(team: Team) {
    return this.colorSafe() ? COLOR_SAFE_TEAM_COLORS[team] : TEAM_COLORS[team]
  }
}

function key(col: number, row: number) {
  return `${col},${row}`
}
