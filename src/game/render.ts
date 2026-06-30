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
  TANK_SIZE,
  TILE_SIZE,
  tankCenter,
} from './constants.ts'
import type { TanchikiGame } from './game.ts'
import type { Direction, PowerUpKind, RenderState, Tank, Team, TileKind } from './types.ts'
import {
  drawPixelEnemyMarker,
  drawPixelGround,
  drawPixelPowerUp,
  drawPixelProjectile,
  drawPixelTank,
  drawPixelTerrainTile,
  type PixelTeamPalette,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from './uiAtlas.ts'

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

        drawPixelGround(ctx, col * TILE_SIZE, ARENA_Y + row * TILE_SIZE, TILE_SIZE, col, row)

        if (tile && tile.kind !== 'empty' && tile.kind !== 'trees') {
          this.drawTile(ctx, tile.kind, col * TILE_SIZE, ARENA_Y + row * TILE_SIZE, TILE_SIZE, col, row, tile.hp, state.time)
        }
      }
    }

    this.drawTank(ctx, state.player, state)

    for (const enemy of state.enemies) {
      this.drawTank(ctx, enemy, state)
    }

    for (const bullet of state.bullets) {
      drawPixelProjectile(
        ctx,
        Math.round(bullet.x + BULLET_SIZE / 2),
        Math.round(bullet.y + BULLET_SIZE / 2),
        BULLET_SIZE,
        this.getTeamColors(state, bullet.team).bullet,
        bullet.dir,
        {
          frame: Math.floor(state.time * 14),
          sheet: 'core32',
          teamKey: this.getTeamKey(state, bullet.team),
        },
      )
    }

    for (const powerUp of state.powerUps) {
      this.drawPowerUp(ctx, powerUp.kind, powerUp.x, powerUp.y, state.time)
    }

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const tile = state.tiles[row]?.[col]

        if (tile?.kind === 'trees') {
          this.drawTile(ctx, 'trees', col * TILE_SIZE, ARENA_Y + row * TILE_SIZE, TILE_SIZE, col, row, tile.hp, state.time)
        }
      }
    }

    for (const particle of state.particles) {
      const alpha = Math.max(0, Math.min(1, particle.life * 3))
      const px = Math.round(particle.x)
      const py = Math.round(particle.y)
      ctx.globalAlpha = alpha * 0.45
      ctx.fillStyle = '#15120e'
      ctx.fillRect(px - 2, py + 1, 6, 3)
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.fillRect(px, py, 4, 4)
      ctx.fillStyle = '#fff0a8'
      ctx.fillRect(px + 1, py, 2, 1)
      ctx.globalAlpha = 1
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    kind: TileKind,
    x: number,
    y: number,
    size: number,
    col: number,
    row: number,
    hp: number,
    time: number,
  ) {
    drawPixelTerrainTile(ctx, kind, x, y, size, { col, row, hp, sheet: 'core32', time })
  }

  private drawTank(ctx: CanvasRenderingContext2D, tank: Tank, state: RenderState) {
    const center = tankCenter(tank)
    const colors = this.getTeamColors(state, tank.team)
    drawPixelTank(ctx, center.x, center.y, TANK_SIZE + 2, tank.dir, colors, {
      armored: tank.maxHp > 1 && tank.faction === 'enemy',
      frame: tank.move ? Math.floor(state.time * 8) : 0,
      shield: tank.shield > 0,
      sheet: 'core32',
      self: tank.faction === 'player',
      teamKey: this.getTeamKey(state, tank.team),
    })
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, kind: PowerUpKind, x: number, y: number, time: number) {
    drawPixelPowerUp(ctx, kind, Math.round(x), Math.round(y), 20, time)
  }

  private drawHud(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.font = FONT
    ctx.textBaseline = 'top'

    const teamIcon = this.getUiTeamSprite(state, state.playerTeam)
    this.drawHudIcon(ctx, teamIcon, HUD_X + 12, 236, 20, state.playerTeam.toUpperCase())
    ctx.fillStyle = this.getTeamColors(state, state.playerTeam).trim
    ctx.fillText(state.playerTeam.toUpperCase(), HUD_X + 36, 241)

    this.drawHudIcon(ctx, 'hud.score', HUD_X + 12, 262, 20, '*')
    ctx.fillStyle = this.getTeamColors(state, state.playerTeam).body
    ctx.fillText(String(state.score).padStart(5, '0'), HUD_X + 36, 267)

    this.drawHudIcon(ctx, 'hud.hp', HUD_X + 12, 300, 18, 'HP')
    for (let index = 0; index < state.player.hp; index += 1) {
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(HUD_X + 39 + index * 10, 305, 7, 9)
      ctx.fillStyle = '#fff4b6'
      ctx.fillRect(HUD_X + 40 + index * 10, 306, 5, 2)
    }

    this.drawHudIcon(ctx, 'hud.lives', HUD_X + 12, 322, 18, 'L')
    ctx.fillStyle = '#161616'
    ctx.fillText(String(state.lives), HUD_X + 43, 326)
    this.drawHudIcon(ctx, 'hud.enemies', HUD_X + 12, 342, 18, 'E')
    ctx.fillText(String(state.enemiesRemaining + state.enemies.length).padStart(2, '0'), HUD_X + 43, 346)
    this.drawHudIcon(ctx, 'hud.level', HUD_X + 12, 362, 18, 'LV')
    ctx.fillText(String(state.currentLevel), HUD_X + 43, 366)
    this.drawHudIcon(ctx, 'hud.credits', HUD_X + 12, 382, 18, '$')
    ctx.fillText(String(state.progression.credits).slice(-4), HUD_X + 43, 386)

    for (let index = 0; index < Math.min(18, state.enemiesRemaining + state.enemies.length); index += 1) {
      const col = index % 2
      const row = Math.floor(index / 2)
      this.drawEnemyMarker(ctx, HUD_X + 50 + col * 16, 34 + row * 20, state.enemyTeam, state)
    }

    this.drawHudIcon(ctx, 'hud.base', HUD_X + 49, 351, 25, 'BASE')
    if (state.baseHp <= 0) {
      ctx.globalAlpha = 0.64
      ctx.fillStyle = '#181511'
      ctx.fillRect(HUD_X + 50, 352, 24, 20)
      ctx.globalAlpha = 1
    }
    ctx.font = SMALL_FONT
    ctx.fillStyle = '#161616'
    ctx.fillText('BASE', HUD_X + 35, 410)
  }

  private drawHudIcon(ctx: CanvasRenderingContext2D, spriteId: UiSpriteId, x: number, y: number, size: number, fallback: string) {
    if (drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui32' })) {
      return
    }

    ctx.font = SMALL_FONT
    ctx.fillStyle = '#161616'
    ctx.fillText(fallback, x + 2, y + 5)
  }

  private drawEnemyMarker(ctx: CanvasRenderingContext2D, x: number, y: number, team: Team, state: RenderState) {
    drawPixelEnemyMarker(ctx, x, y, this.getTeamColors(state, team))
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    if (state.mode === 'loading') {
      this.drawLoadingOverlay(ctx, state)
      return
    }

    ctx.fillStyle = 'rgba(5, 5, 5, 0.72)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const accent = state.mode === 'lost' ? '#f06b3b' : this.getTeamColors(state, state.playerTeam).body
    drawUiSprite(ctx, 'menu.title', ARENA_WIDTH / 2 - 114, 60, { width: 228, height: 34, sheet: 'ui32', alpha: 0.92 })
    this.drawCenteredText(ctx, state.menu.title.toUpperCase(), ARENA_WIDTH / 2, 72, accent, '20px ui-monospace, Consolas, monospace')
    drawUiSprite(ctx, 'menu.divider', ARENA_WIDTH / 2 - 92, 101, { width: 184, height: 10, sheet: 'ui32', alpha: 0.84 })

    state.menu.helper.forEach((line, index) => {
      this.drawCenteredText(ctx, line, ARENA_WIDTH / 2, 112 + index * 16, '#d8d4c8', SMALL_FONT)
    })

    state.menu.options.forEach((option, index) => {
      const selected = index === state.menu.selectedIndex
      const pressed = index === state.menu.pressedIndex
      const y = 192 + index * 22 + (pressed ? 2 : 0)
      const color = pressed ? '#fff1a5' : selected ? '#ffffff' : '#bbb5aa'

      if (selected) {
        const highlighted = drawUiSprite(ctx, pressed ? 'menu.highlight.pressed' : 'menu.highlight', ARENA_WIDTH / 2 - 136, y - 5, {
          width: 272,
          height: 20,
          sheet: 'ui32',
          alpha: 0.88,
        })
        const selectedText = highlighted ? option : `> ${option}`
        drawUiSprite(ctx, pressed ? 'menu.selector.pressed' : 'menu.selector', ARENA_WIDTH / 2 - 124, y - 8, {
          width: 18,
          height: 18,
          sheet: 'ui32',
        })
        this.drawCenteredText(ctx, selectedText, ARENA_WIDTH / 2, y, color, FONT)
      } else {
        this.drawCenteredText(ctx, option, ARENA_WIDTH / 2, y, color, FONT)
      }

      if (state.mode === 'garage' && option !== 'Back') {
        this.drawUpgradeBar(ctx, option, ARENA_WIDTH / 2 + 92, y + 1)
      }
    })

    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', ARENA_WIDTH / 2, 374, '#8f8a82', SMALL_FONT)

    ctx.textAlign = 'start'
  }

  private drawLoadingOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const loading = state.loading
    const progress = loading?.progress ?? 0
    const targetLevel = loading?.targetLevel ?? state.level
    const barX = ARENA_WIDTH / 2 - 112
    const barY = 238
    const barWidth = 224
    const barHeight = 18

    ctx.fillStyle = 'rgba(5, 5, 5, 0.78)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    drawUiSprite(ctx, 'loading.plaque', ARENA_WIDTH / 2 - 118, 74, { width: 236, height: 42, sheet: 'ui32', alpha: 0.94 })
    this.drawCenteredText(ctx, `LOADING LEVEL ${targetLevel.id}`, ARENA_WIDTH / 2, 86, this.getTeamColors(state, state.playerTeam).body, '20px ui-monospace, Consolas, monospace')
    this.drawCenteredText(ctx, targetLevel.name.toUpperCase(), ARENA_WIDTH / 2, 120, '#d8d4c8', FONT)

    const treadBob = Math.round(Math.sin(state.time * 9) * 2)
    drawUiSprite(ctx, 'loading.tread', ARENA_WIDTH / 2 - 22 + treadBob, 150, { width: 44, height: 44, sheet: 'ui32' })
    drawUiSprite(ctx, 'loading.spark', ARENA_WIDTH / 2 + 30 - treadBob, 154, { width: 22, height: 22, sheet: 'ui32', alpha: 0.85 })

    const tip = loading?.tip ?? 'Tightening pixel bolts.'
    this.drawCenteredText(ctx, tip, ARENA_WIDTH / 2, 204, '#f2ead7', FONT)

    const drewBar = drawUiSprite(ctx, 'loading.bar.empty', barX, barY, { width: barWidth, height: barHeight, sheet: 'ui32' })
    if (drewBar) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(barX, barY, Math.max(1, Math.round(barWidth * progress)), barHeight)
      ctx.clip()
      drawUiSprite(ctx, 'loading.bar.fill', barX, barY, { width: barWidth, height: barHeight, sheet: 'ui32' })
      ctx.restore()
    } else {
      ctx.fillStyle = '#151915'
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.fillStyle = '#72d35c'
      ctx.fillRect(barX + 2, barY + 4, Math.max(1, Math.round((barWidth - 4) * progress)), barHeight - 8)
    }

    const sparkX = barX + Math.max(0, Math.round((barWidth - 18) * progress))
    drawUiSprite(ctx, 'loading.spark', sparkX, barY - 8, { width: 18, height: 18, sheet: 'ui32', alpha: 0.9 })
    this.drawCenteredText(ctx, `${Math.round(progress * 100)}%`, ARENA_WIDTH / 2, 265, '#8f8a82', SMALL_FONT)

    ctx.textAlign = 'start'
  }

  private drawUpgradeBar(ctx: CanvasRenderingContext2D, option: string, x: number, y: number) {
    const levelMatch = option.match(/ L([0-5]) /)

    if (!levelMatch) {
      return
    }

    const level = Number(levelMatch[1])
    const width = 52
    drawUiSprite(ctx, 'menu.upgrade.empty', x, y, { width, height: 8, sheet: 'ui32', alpha: 0.9 })
    if (level <= 0) {
      return
    }

    drawUiSprite(ctx, 'menu.upgrade.fill', x, y, { width: Math.max(8, Math.round((width * level) / 5)), height: 8, sheet: 'ui32' })
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

  private getTeamColors(state: RenderState, team: Team): PixelTeamPalette {
    return state.settings.colorSafe ? COLOR_SAFE_TEAM_COLORS[team] : TEAM_COLORS[team]
  }

  private getTeamKey(state: RenderState, team: Team): AtlasTeamKey {
    if (state.settings.colorSafe) {
      return team === 'blue' ? 'blueSafe' : 'redSafe'
    }

    return team
  }

  private getUiTeamSprite(state: RenderState, team: Team): UiSpriteId {
    if (state.settings.colorSafe) {
      return team === 'blue' ? 'hud.team.blue.safe' : 'hud.team.red.safe'
    }

    return team === 'blue' ? 'hud.team.blue' : 'hud.team.red'
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
    ctx.globalAlpha = 0.42
    const drewSprites =
      drawUiSprite(ctx, 'touch.up', 59, 325, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.down', 59, 377, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.left', 33, 351, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.right', 85, 351, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.fire', 324, 340, { width: 64, height: 64, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.pause', HUD_X + 28, 200, { width: 40, height: 40, sheet: 'ui32' })

    if (!drewSprites) {
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
    }

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
