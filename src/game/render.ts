import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  BULLET_SIZE,
  GRID_COLS,
  GRID_ROWS,
  HUD_WIDTH,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  TILE_SIZE,
  tankCenter,
} from './constants.ts'
import type { TanchikiGame } from './game.ts'
import type { Direction, PowerUpKind, RenderState, Tank, Team, TileKind } from './types.ts'

const FONT = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
const SMALL_FONT = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
const TEAM_COLORS: Record<Team, { body: string; trim: string; highlight: string; bullet: string }> = {
  blue: {
    body: '#66c8ff',
    trim: '#194f78',
    highlight: '#ecfbff',
    bullet: '#bdeeff',
  },
  red: {
    body: '#f06243',
    trim: '#7d2419',
    highlight: '#ffd6c8',
    bullet: '#ffcfb7',
  },
}
const COLOR_SAFE_TEAM_COLORS: Record<Team, { body: string; trim: string; highlight: string; bullet: string }> = {
  blue: {
    body: '#2fd4ff',
    trim: '#06364d',
    highlight: '#f3ffff',
    bullet: '#b9f3ff',
  },
  red: {
    body: '#ffb000',
    trim: '#553300',
    highlight: '#fff0bd',
    bullet: '#ffe0a3',
  },
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly game: TanchikiGame

  constructor(canvas: HTMLCanvasElement, game: TanchikiGame) {
    this.game = game
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context is required')
    }

    this.context = context
    this.context.imageSmoothingEnabled = false
  }

  render() {
    const state = this.game.getRenderState()
    const ctx = this.context
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    this.drawFrame(ctx)
    const shake = this.getShakeOffset(state)
    ctx.save()
    ctx.translate(shake.x, shake.y)
    this.drawArena(ctx, state)
    ctx.restore()
    this.drawHud(ctx, state)
    this.drawFeedback(ctx, state)
    this.drawTouchControls(ctx, state)

    if (state.mode !== 'playing') {
      this.drawOverlay(ctx, state)
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#6a6964'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    ctx.fillStyle = '#050505'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.fillStyle = '#4f504c'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
  }

  private drawArena(ctx: CanvasRenderingContext2D, state: RenderState) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const tile = state.tiles[row]?.[col]

        if (tile && tile.kind !== 'empty' && tile.kind !== 'trees') {
          this.drawTile(ctx, tile.kind, col * TILE_SIZE, ARENA_Y + row * TILE_SIZE, tile.hp)
        }
      }
    }

    this.drawTank(ctx, state.player, state)

    for (const enemy of state.enemies) {
      this.drawTank(ctx, enemy, state)
    }

    for (const bullet of state.bullets) {
      ctx.fillStyle = this.getTeamColors(state, bullet.team).bullet
      ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y), BULLET_SIZE, BULLET_SIZE)
    }

    for (const powerUp of state.powerUps) {
      this.drawPowerUp(ctx, powerUp.kind, powerUp.x, powerUp.y, state.time)
    }

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const tile = state.tiles[row]?.[col]

        if (tile?.kind === 'trees') {
          this.drawTile(ctx, 'trees', col * TILE_SIZE, ARENA_Y + row * TILE_SIZE, tile.hp)
        }
      }
    }

    for (const particle of state.particles) {
      ctx.fillStyle = particle.color
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 3))
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 3, 3)
      ctx.globalAlpha = 1
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, kind: TileKind, x: number, y: number, hp: number) {
    if (kind === 'brick') {
      ctx.fillStyle = hp > 1 ? '#d44222' : '#8d2a1d'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = '#f07a37'

      for (let band = 3; band < TILE_SIZE; band += 8) {
        ctx.fillRect(x, y + band, TILE_SIZE, 2)
      }

      ctx.fillStyle = '#4a130e'
      for (let row = 0; row < 4; row += 1) {
        const offset = row % 2 === 0 ? 7 : 19
        ctx.fillRect(x + offset, y + row * 8, 2, 8)
      }
      return
    }

    if (kind === 'steel') {
      ctx.fillStyle = '#d9dedf'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = '#8f989b'
      ctx.fillRect(x + 2, y + 2, 12, 12)
      ctx.fillRect(x + 18, y + 2, 12, 12)
      ctx.fillRect(x + 2, y + 18, 12, 12)
      ctx.fillRect(x + 18, y + 18, 12, 12)
      ctx.fillStyle = '#f7ffff'
      ctx.fillRect(x + 4, y + 4, 7, 3)
      ctx.fillRect(x + 20, y + 20, 7, 3)
      return
    }

    if (kind === 'water') {
      ctx.fillStyle = '#164a6b'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = '#7ad7e6'
      ctx.fillRect(x + 4, y + 9, 18, 3)
      ctx.fillRect(x + 10, y + 20, 18, 3)
      return
    }

    if (kind === 'trees') {
      ctx.fillStyle = '#2d6b3b'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = '#163f22'
      ctx.fillRect(x + 4, y + 5, 8, 22)
      ctx.fillRect(x + 19, y + 2, 9, 24)
      return
    }

    if (kind === 'base') {
      ctx.fillStyle = hp > 0 ? '#f5c246' : '#70665b'
      ctx.fillRect(x + 4, y + 6, 24, 20)
      ctx.fillStyle = hp > 0 ? '#4d2c10' : '#2f2b27'
      ctx.fillRect(x + 8, y + 10, 16, 12)
      ctx.fillStyle = hp > 0 ? '#fff1ad' : '#9a9288'
      ctx.fillRect(x + 14, y + 2, 4, 24)
      ctx.fillRect(x + 9, y + 13, 14, 3)
    }
  }

  private drawTank(ctx: CanvasRenderingContext2D, tank: Tank, state: RenderState) {
    const center = tankCenter(tank)
    const angle = this.directionAngle(tank.dir)
    ctx.save()
    ctx.translate(Math.round(center.x), Math.round(center.y))
    ctx.rotate(angle)

    const colors = this.getTeamColors(state, tank.team)
    const body = tank.maxHp > 1 && tank.faction === 'enemy' ? '#d8e5ef' : colors.body
    const trim = colors.trim
    const highlight = colors.highlight

    ctx.fillStyle = trim
    ctx.fillRect(-13, -12, 6, 24)
    ctx.fillRect(7, -12, 6, 24)
    ctx.fillStyle = body
    ctx.fillRect(-9, -10, 18, 20)
    ctx.fillRect(-5, -16, 10, 12)
    ctx.fillStyle = trim
    ctx.fillRect(-2, -22, 4, 14)
    ctx.fillStyle = highlight
    ctx.fillRect(-6, -7, 12, 4)

    if (tank.shield > 0) {
      ctx.strokeStyle = '#fff6a8'
      ctx.lineWidth = 2
      ctx.strokeRect(-15, -15, 30, 30)
    }

    ctx.restore()
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, kind: PowerUpKind, x: number, y: number, time: number) {
    const flash = Math.floor(time * 8) % 2 === 0
    ctx.fillStyle = flash ? '#fff6a8' : '#e86f3a'
    ctx.fillRect(Math.round(x), Math.round(y), 20, 20)
    ctx.fillStyle = '#111'

    if (kind === 'repair') {
      ctx.fillRect(x + 8, y + 4, 4, 12)
      ctx.fillRect(x + 4, y + 8, 12, 4)
    } else if (kind === 'rapid') {
      ctx.fillRect(x + 5, y + 4, 4, 12)
      ctx.fillRect(x + 11, y + 4, 4, 12)
    } else {
      ctx.fillRect(x + 4, y + 5, 12, 3)
      ctx.fillRect(x + 6, y + 8, 8, 8)
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.font = FONT
    ctx.textBaseline = 'top'
    ctx.fillStyle = this.getTeamColors(state, state.playerTeam).trim
    ctx.fillText(state.playerTeam.toUpperCase(), HUD_X + 17, 240)
    ctx.fillStyle = this.getTeamColors(state, state.playerTeam).body
    ctx.fillText(String(state.score).padStart(5, '0'), HUD_X + 18, 266)

    ctx.fillStyle = '#161616'
    ctx.fillText('HP', HUD_X + 18, 306)
    for (let index = 0; index < state.player.hp; index += 1) {
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(HUD_X + 43 + index * 10, 307, 7, 9)
    }

    ctx.fillStyle = '#161616'
    ctx.fillText('L', HUD_X + 18, 326)
    ctx.fillText(String(state.lives), HUD_X + 43, 326)
    ctx.fillText('E', HUD_X + 18, 346)
    ctx.fillText(String(state.enemiesRemaining + state.enemies.length).padStart(2, '0'), HUD_X + 43, 346)
    ctx.fillText('LV', HUD_X + 18, 366)
    ctx.fillText(String(state.currentLevel), HUD_X + 43, 366)
    ctx.fillText('$', HUD_X + 18, 386)
    ctx.fillText(String(state.progression.credits).slice(-4), HUD_X + 43, 386)

    for (let index = 0; index < Math.min(18, state.enemiesRemaining + state.enemies.length); index += 1) {
      const col = index % 2
      const row = Math.floor(index / 2)
      this.drawEnemyMarker(ctx, HUD_X + 50 + col * 16, 34 + row * 20, state.enemyTeam, state)
    }

    ctx.fillStyle = state.baseHp > 0 ? this.getTeamColors(state, state.playerTeam).body : '#27231f'
    ctx.fillRect(HUD_X + 50, 352, 28, 17)
    ctx.fillStyle = '#1b1b1b'
    ctx.fillRect(HUD_X + 47, 350, 3, 30)
    ctx.font = SMALL_FONT
    ctx.fillText('BASE', HUD_X + 35, 410)
  }

  private drawEnemyMarker(ctx: CanvasRenderingContext2D, x: number, y: number, team: Team, state: RenderState) {
    ctx.fillStyle = '#111'
    ctx.fillRect(x + 1, y, 4, 16)
    ctx.fillRect(x + 11, y, 4, 16)
    ctx.fillStyle = this.getTeamColors(state, team).body
    ctx.fillRect(x + 5, y + 3, 6, 10)
    ctx.fillRect(x + 7, y - 2, 2, 6)
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.72)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const accent = state.mode === 'lost' ? '#f06b3b' : this.getTeamColors(state, state.playerTeam).body
    this.drawCenteredText(ctx, state.menu.title.toUpperCase(), ARENA_WIDTH / 2, 72, accent, '20px ui-monospace, Consolas, monospace')

    state.menu.helper.forEach((line, index) => {
      this.drawCenteredText(ctx, line, ARENA_WIDTH / 2, 112 + index * 16, '#d8d4c8', SMALL_FONT)
    })

    state.menu.options.forEach((option, index) => {
      const selected = index === state.menu.selectedIndex
      const marker = selected ? '> ' : '  '
      const color = selected ? '#ffffff' : '#bbb5aa'
      this.drawCenteredText(ctx, `${marker}${option}`, ARENA_WIDTH / 2, 192 + index * 22, color, FONT)
    })

    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', ARENA_WIDTH / 2, 374, '#8f8a82', SMALL_FONT)

    ctx.textAlign = 'start'
  }

  private drawCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    font: string,
  ) {
    ctx.font = font
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

  private directionAngle(direction: Direction) {
    if (direction === 'right') {
      return Math.PI / 2
    }
    if (direction === 'down') {
      return Math.PI
    }
    if (direction === 'left') {
      return -Math.PI / 2
    }
    return 0
  }

  private getTeamColors(state: RenderState, team: Team) {
    return state.settings.colorSafe ? COLOR_SAFE_TEAM_COLORS[team] : TEAM_COLORS[team]
  }

  private getShakeOffset(state: RenderState) {
    if (state.feedback.shake <= 0) {
      return { x: 0, y: 0 }
    }

    const amount = Math.ceil(state.feedback.shake * 10)
    return {
      x: Math.round(Math.sin(state.time * 97) * amount),
      y: Math.round(Math.cos(state.time * 83) * amount),
    }
  }

  private drawFeedback(ctx: CanvasRenderingContext2D, state: RenderState) {
    if (state.feedback.flash <= 0) {
      return
    }

    ctx.globalAlpha = Math.min(0.28, state.feedback.flash)
    ctx.fillStyle = '#fff4b6'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.globalAlpha = 1
  }

  private drawTouchControls(ctx: CanvasRenderingContext2D, state: RenderState) {
    if (state.mode !== 'playing' || !state.feedback.touchControlsVisible) {
      return
    }

    ctx.save()
    ctx.globalAlpha = 0.34
    ctx.fillStyle = '#f2ead7'
    ctx.strokeStyle = '#050505'
    ctx.lineWidth = 2
    this.drawTouchArrow(ctx, 80, 346, 'up')
    this.drawTouchArrow(ctx, 80, 398, 'down')
    this.drawTouchArrow(ctx, 54, 372, 'left')
    this.drawTouchArrow(ctx, 106, 372, 'right')
    ctx.beginPath()
    ctx.arc(356, 372, 31, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#050505'
    ctx.fillRect(347, 368, 18, 8)
    ctx.fillStyle = '#f2ead7'
    ctx.fillRect(HUD_X + 34, 204, 10, 24)
    ctx.fillRect(HUD_X + 52, 204, 10, 24)
    ctx.restore()
  }

  private drawTouchArrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.directionAngle(direction))
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(18, 12)
    ctx.lineTo(6, 12)
    ctx.lineTo(6, 22)
    ctx.lineTo(-6, 22)
    ctx.lineTo(-6, 12)
    ctx.lineTo(-18, 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}
