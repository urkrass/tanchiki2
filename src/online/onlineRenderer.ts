import { ARENA_X, ARENA_Y, HUD_X, HUD_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../game/constants.ts'
import type { OnlineBattleClient } from './onlineClient.ts'
import type { MultiplayerSnapshot, Team, TileKind } from '../../packages/shared/src/index.ts'

const MAP_COLS = 20
const MAP_ROWS = 16
const MAP_TILE = 20
const MAP_X = ARENA_X + 8
const MAP_Y = ARENA_Y + 32
const FONT = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
const SMALL_FONT = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
const TEAM_COLORS: Record<Team, { body: string; trim: string; pale: string }> = {
  blue: { body: '#66c8ff', trim: '#194f78', pale: '#c6f0ff' },
  red: { body: '#f06243', trim: '#7d2419', pale: '#ffd6c8' },
}

export class OnlineCanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly client: OnlineBattleClient

  constructor(canvas: HTMLCanvasElement, client: OnlineBattleClient) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is required')
    this.context = context
    this.context.imageSmoothingEnabled = false
    this.client = client
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
          ctx.fillStyle = '#0b0b0b'
          ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
        }
      }
    }

    for (const tile of snapshot.visibleTerrain) {
      this.drawTile(ctx, tile.kind, MAP_X + tile.col * MAP_TILE, MAP_Y + tile.row * MAP_TILE)
    }

    for (const relay of snapshot.retranslators) {
      const x = MAP_X + relay.col * MAP_TILE
      const y = MAP_Y + relay.row * MAP_TILE
      ctx.fillStyle = relay.owner ? TEAM_COLORS[relay.owner].body : '#c8c0a8'
      ctx.fillRect(x + 4, y + 3, 12, 14)
      ctx.fillStyle = '#111'
      ctx.fillRect(x + 8, y + 1, 4, 18)
      if (relay.progress > 0 && relay.progress < 1) {
        ctx.fillStyle = relay.captureTeam ? TEAM_COLORS[relay.captureTeam].pale : '#fff'
        ctx.fillRect(x + 2, y + 18, Math.round(16 * relay.progress), 2)
      }
    }

    for (const memory of snapshot.lastKnown) {
      const x = MAP_X + memory.col * MAP_TILE
      const y = MAP_Y + memory.row * MAP_TILE
      ctx.strokeStyle = TEAM_COLORS[memory.team].pale
      ctx.strokeRect(x + 5, y + 5, 10, 10)
    }

    for (const bullet of snapshot.bullets) {
      ctx.fillStyle = TEAM_COLORS[bullet.team].pale
      ctx.fillRect(MAP_X + bullet.x * MAP_TILE - 2, MAP_Y + bullet.y * MAP_TILE - 2, 4, 4)
    }

    for (const player of snapshot.players) {
      const colors = TEAM_COLORS[player.team]
      const x = MAP_X + player.col * MAP_TILE
      const y = MAP_Y + player.row * MAP_TILE
      ctx.fillStyle = player.alive ? colors.body : '#555'
      ctx.fillRect(x + 3, y + 3, 14, 14)
      ctx.fillStyle = colors.trim
      ctx.fillRect(x + 7, y + 1, 6, 18)
      if (player.self) {
        ctx.strokeStyle = '#fff6a8'
        ctx.strokeRect(x + 1, y + 1, 18, 18)
      }
    }

    for (const ping of snapshot.pings) {
      const x = MAP_X + ping.col * MAP_TILE + 10
      const y = MAP_Y + ping.row * MAP_TILE + 10
      ctx.strokeStyle = TEAM_COLORS[ping.team].pale
      ctx.beginPath()
      ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.stroke()
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
    ctx.fillStyle = TEAM_COLORS[snapshot.team].body
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
      ctx.fillStyle = TEAM_COLORS[snapshot.team].pale
      ctx.fillText((radioDraft || '_').slice(0, 14), HUD_X + 18, 298)
    }

    const chatY = 318
    snapshot.chat.slice(-4).forEach((message, index) => {
      ctx.fillStyle = TEAM_COLORS[message.team].body
      ctx.fillText(`${message.name}:`, HUD_X + 8, chatY + index * 18)
      ctx.fillStyle = '#111'
      ctx.fillText(message.text.slice(0, 14), HUD_X + 8, chatY + index * 18 + 8)
    })
  }

  private drawTile(ctx: CanvasRenderingContext2D, kind: TileKind, x: number, y: number) {
    if (kind === 'empty') return
    if (kind === 'brick') {
      ctx.fillStyle = '#d44222'
      ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
      ctx.fillStyle = '#4a130e'
      ctx.fillRect(x, y + 8, MAP_TILE, 2)
      return
    }
    if (kind === 'steel') {
      ctx.fillStyle = '#cfd3d8'
      ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
      ctx.fillStyle = '#8f989b'
      ctx.fillRect(x + 3, y + 3, 6, 6)
      ctx.fillRect(x + 11, y + 11, 6, 6)
      return
    }
    if (kind === 'water') {
      ctx.fillStyle = '#164a6b'
      ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
      ctx.fillStyle = '#7ad7e6'
      ctx.fillRect(x + 4, y + 8, 12, 2)
      return
    }
    if (kind === 'trees') {
      ctx.fillStyle = '#2d6b3b'
      ctx.fillRect(x, y, MAP_TILE, MAP_TILE)
    }
  }
}

function key(col: number, row: number) {
  return `${col},${row}`
}
