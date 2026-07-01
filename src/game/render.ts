import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  BULLET_SIZE,
  HUD_WIDTH,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
  TANK_SIZE,
  TILE_SIZE,
  clamp,
  tankCenter,
} from './constants.ts'
import type { TanchikiGame } from './game.ts'
import { getWaterNeighbors } from './level.ts'
import type { Direction, LevelReadabilityMarker, PowerUpKind, RenderState, Tank, Team, TileKind } from './types.ts'
import {
  drawPixelEnemyMarker,
  drawPixelPowerUp,
  type PixelTeamPalette,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from './uiAtlas.ts'
import { drawPixelText, measurePixelText, wrapPixelText } from './pixelText.ts'
import {
  type BattlefieldCamera,
  drawBattlefieldFrame,
  drawBattlefieldGround,
  drawBattlefieldProjectile,
  drawBattlefieldTank,
  drawBattlefieldTerrainTile,
  getBattlefieldDrawRange,
  getBattlefieldTeamColors,
  getBattlefieldTeamKey,
  worldCellToScreen,
  worldPointToScreen,
} from './battlefield.ts'

const TEXT_SCALE = 1
const TITLE_SCALE = 2
const HUD_INK = '#252820'
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
    drawBattlefieldFrame(ctx)
  }

  private drawArena(ctx: CanvasRenderingContext2D, state: RenderState) {
    const camera = state.camera.current
    const range = getBattlefieldDrawRange(camera, state.map.cols, state.map.rows)

    ctx.save()
    ctx.beginPath()
    ctx.rect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.clip()

    for (let row = range.startRow; row < range.endRow; row += 1) {
      for (let col = range.startCol; col < range.endCol; col += 1) {
        const tile = state.tiles[row]?.[col]

        drawBattlefieldGround(ctx, camera, col, row)

        if (tile && tile.kind !== 'empty' && tile.kind !== 'trees') {
          this.drawTile(ctx, tile.kind, camera, col, row, tile.hp, state.time, state)
        }
      }
    }

    this.drawObjectiveMarkers(ctx, state, camera)
    this.drawTank(ctx, state.player, state, camera)
    this.drawPlayerReloadMeter(ctx, state, camera)

    for (const enemy of state.enemies) {
      this.drawTank(ctx, enemy, state, camera)
    }

    for (const bullet of state.bullets) {
      const point = this.worldPixelToScreen(camera, bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2)
      if (!this.isScreenPointNearArena(point.x, point.y, 12)) {
        continue
      }
      drawBattlefieldProjectile(
        ctx,
        Math.round(point.x),
        Math.round(point.y),
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
      this.drawPowerUp(ctx, camera, powerUp.kind, powerUp.x, powerUp.y, state.time)
    }

    for (let row = range.startRow; row < range.endRow; row += 1) {
      for (let col = range.startCol; col < range.endCol; col += 1) {
        const tile = state.tiles[row]?.[col]

        if (tile?.kind === 'trees') {
          this.drawTile(ctx, 'trees', camera, col, row, tile.hp, state.time, state)
        }
      }
    }

    for (const enemy of state.enemies) {
      if (enemy.side === 'player' && enemy.faction !== 'player') {
        this.drawTeammateHpBar(ctx, enemy, state, camera)
      }
    }

    for (const particle of state.particles) {
      const alpha = Math.max(0, Math.min(1, particle.life * 3))
      const point = this.worldPixelToScreen(camera, particle.x, particle.y)
      if (!this.isScreenPointNearArena(point.x, point.y, 8)) {
        continue
      }
      const px = Math.round(point.x)
      const py = Math.round(point.y)
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

    ctx.restore()
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    kind: TileKind,
    camera: BattlefieldCamera,
    col: number,
    row: number,
    hp: number,
    time: number,
    state: RenderState,
  ) {
    drawBattlefieldTerrainTile(
      ctx,
      kind,
      camera,
      col,
      row,
      hp,
      time,
      kind === 'water' ? getWaterNeighbors(state.tiles, col, row) : undefined,
    )
  }

  private drawTank(ctx: CanvasRenderingContext2D, tank: Tank, state: RenderState, camera: BattlefieldCamera) {
    const center = tankCenter(tank)
    const point = this.worldPixelToScreen(camera, center.x, center.y)
    if (!this.isScreenPointNearArena(point.x, point.y, TANK_SIZE)) {
      return
    }
    const colors = this.getTeamColors(state, tank.team)
    drawBattlefieldTank(ctx, point.x, point.y, TANK_SIZE + 2, tank.dir, colors, {
      armored: tank.maxHp > 1 && tank.faction === 'enemy',
      frame: tank.move ? Math.floor(state.time * 8) : 0,
      shield: tank.shield > 0,
      self: tank.faction === 'player',
      teamKey: this.getTeamKey(state, tank.team),
    })

  }

  private drawTeammateHpBar(ctx: CanvasRenderingContext2D, tank: Tank, state: RenderState, camera: BattlefieldCamera) {
    const width = 22
    const height = 3
    const point = this.worldPixelToScreen(camera, tank.x, tank.y)
    const x = clamp(Math.round(point.x + TANK_SIZE / 2 - width / 2), ARENA_X + 1, ARENA_X + ARENA_WIDTH - width - 1)
    const y = clamp(Math.round(point.y - 5), ARENA_Y + 1, ARENA_Y + ARENA_HEIGHT - height - 1)
    const fillWidth = clamp(Math.round((width * tank.hp) / Math.max(1, tank.maxHp)), 0, width)

    ctx.fillStyle = 'rgba(5, 7, 5, 0.92)'
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2)
    ctx.fillStyle = '#161c16'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = this.getTeamColors(state, tank.team).body
    ctx.fillRect(x, y, fillWidth, height)
  }

  private drawPlayerReloadMeter(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const reloadTime = Math.max(0.01, state.player.reloadTime)
    if (state.player.reload <= 0 || state.player.reload >= reloadTime) {
      return
    }

    const width = 24
    const height = 4
    const point = this.worldPixelToScreen(camera, state.player.x, state.player.y)
    const x = clamp(Math.round(point.x + TANK_SIZE / 2 - width / 2), ARENA_X + 1, ARENA_X + ARENA_WIDTH - width - 1)
    const y = clamp(Math.round(point.y - 7), ARENA_Y + 1, ARENA_Y + ARENA_HEIGHT - height - 1)
    const progress = clamp(1 - state.player.reload / reloadTime, 0, 1)
    const fillWidth = Math.max(2, Math.round(width * progress))
    const colors = this.getTeamColors(state, state.player.team)

    ctx.fillStyle = 'rgba(5, 7, 5, 0.92)'
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2)
    ctx.fillStyle = '#111610'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = progress > 0.78 ? '#fff1a5' : colors.trim
    ctx.fillRect(x, y, fillWidth, height)
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, kind: PowerUpKind, x: number, y: number, time: number) {
    const point = this.worldPixelToScreen(camera, x, y)
    if (!this.isScreenPointNearArena(point.x, point.y, 24)) {
      return
    }
    drawPixelPowerUp(ctx, kind, Math.round(point.x), Math.round(point.y), 20, time)
  }

  private drawObjectiveMarkers(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const visibleMarkers = state.readability.markers.filter((marker) => marker.visible)

    for (const marker of visibleMarkers.filter((candidate) => candidate.kind === 'critical-cover')) {
      this.drawCriticalCoverMarker(ctx, camera, marker)
    }

    for (const marker of visibleMarkers.filter((candidate) => this.isSpawnReadabilityMarker(candidate.kind))) {
      this.drawSpawnReadabilityMarker(ctx, state, camera, marker)
    }

    for (const marker of visibleMarkers.filter((candidate) => this.isObjectiveReadabilityMarker(candidate.kind))) {
      this.drawPrimaryObjectiveMarker(ctx, state, camera, marker)
    }

    for (const marker of state.readability.markers.filter((candidate) => candidate.priority === 'primary' && !candidate.visible)) {
      this.drawOffscreenObjectiveMarker(ctx, state, camera, marker)
    }
  }

  private drawCriticalCoverMarker(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, marker: LevelReadabilityMarker) {
    const point = worldCellToScreen(camera, marker.col, marker.row)
    const x = Math.round(point.x)
    const y = Math.round(point.y)

    ctx.save()
    ctx.globalAlpha = 0.78
    ctx.fillStyle = '#070807'
    ctx.fillRect(x + 4, y + 4, 10, 2)
    ctx.fillRect(x + 4, y + 4, 2, 10)
    ctx.fillRect(x + 18, y + 26, 10, 2)
    ctx.fillRect(x + 26, y + 18, 2, 10)
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(x + 5, y + 5, 8, 1)
    ctx.fillRect(x + 5, y + 5, 1, 8)
    ctx.fillRect(x + 19, y + 26, 8, 1)
    ctx.fillRect(x + 26, y + 19, 1, 8)
    ctx.restore()
  }

  private drawSpawnReadabilityMarker(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    camera: BattlefieldCamera,
    marker: LevelReadabilityMarker,
  ) {
    const point = worldCellToScreen(camera, marker.col, marker.row)
    const x = Math.round(point.x)
    const y = Math.round(point.y)
    const colors = this.getReadabilityColors(state, marker)
    const label = marker.kind === 'player-spawn' ? marker.label : marker.label.slice(0, 4)

    ctx.save()
    ctx.globalAlpha = marker.kind === 'player-spawn' ? 0.96 : 0.74
    ctx.fillStyle = '#070807'
    ctx.fillRect(x + 3, y + 25, 26, 3)
    ctx.fillRect(x + 3, y + 4, 2, 9)
    ctx.fillRect(x + 4, y + 3, 9, 2)
    ctx.fillRect(x + 27, y + 19, 2, 9)
    ctx.fillRect(x + 19, y + 27, 9, 2)
    ctx.fillStyle = colors.accent
    ctx.fillRect(x + 5, y + 25, 22, 2)
    ctx.fillRect(x + 5, y + 5, 7, 1)
    ctx.fillRect(x + 5, y + 5, 1, 7)
    ctx.fillRect(x + 20, y + 27, 7, 1)
    ctx.fillRect(x + 27, y + 20, 1, 7)

    if (marker.kind === 'player-spawn') {
      drawPixelText(ctx, label, x + 16, y + 29, {
        align: 'center',
        color: colors.label,
        maxWidth: 34,
        scale: TEXT_SCALE,
      })
    }
    ctx.restore()
  }

  private drawPrimaryObjectiveMarker(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    camera: BattlefieldCamera,
    marker: LevelReadabilityMarker,
  ) {
    const point = worldCellToScreen(camera, marker.col, marker.row)
    const x = Math.round(point.x)
    const y = Math.round(point.y)
    const colors = this.getReadabilityColors(state, marker)

    ctx.save()
    ctx.fillStyle = 'rgba(5, 7, 5, 0.82)'
    ctx.fillRect(x + 2, y + 2, 28, 28)
    ctx.fillStyle = colors.shadow
    ctx.fillRect(x + 4, y + 4, 24, 24)
    ctx.fillStyle = colors.accent
    ctx.fillRect(x + 5, y + 5, 22, 2)
    ctx.fillRect(x + 5, y + 25, 22, 2)
    ctx.fillRect(x + 5, y + 5, 2, 22)
    ctx.fillRect(x + 25, y + 5, 2, 22)

    if (marker.kind === 'flag-home' || marker.kind === 'flag-target') {
      ctx.fillStyle = '#070807'
      ctx.fillRect(x + 14, y + 7, 2, 17)
      ctx.fillStyle = colors.body
      ctx.fillRect(x + 16, y + 7, 10, 7)
      ctx.fillStyle = '#f7f3df'
      ctx.fillRect(x + 17, y + 8, 6, 1)
    } else if (marker.kind === 'assault-core') {
      ctx.fillStyle = '#9b1f1f'
      ctx.fillRect(x + 9, y + 8, 14, 14)
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(x + 12, y + 11, 8, 8)
      this.drawAssaultHpBar(ctx, state, x + 7, y + 24)
    } else {
      ctx.fillStyle = '#f7f3df'
      ctx.fillRect(x + 9, y + 8, 14, 14)
      ctx.fillStyle = colors.body
      ctx.fillRect(x + 12, y + 11, 8, 8)
    }

    ctx.fillStyle = 'rgba(5, 7, 5, 0.92)'
    ctx.fillRect(x + 1, y + 31, 30, 11)
    drawPixelText(ctx, marker.label.slice(0, 5), x + 16, y + 33, {
      align: 'center',
      color: colors.label,
      maxWidth: 28,
      scale: TEXT_SCALE,
    })
    ctx.restore()
  }

  private drawAssaultHpBar(ctx: CanvasRenderingContext2D, state: RenderState, x: number, y: number) {
    const assault = state.objective.assault
    if (!assault) {
      return
    }

    ctx.fillStyle = '#070807'
    ctx.fillRect(x, y, 18, 3)
    ctx.fillStyle = '#f7f3df'
    ctx.fillRect(x, y, Math.max(1, Math.round((18 * assault.hp) / Math.max(1, assault.maxHp))), 3)
  }

  private drawOffscreenObjectiveMarker(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    camera: BattlefieldCamera,
    marker: LevelReadabilityMarker,
  ) {
    const point = worldPointToScreen(camera, marker.col + 0.5, marker.row + 0.5)
    const arenaRight = ARENA_X + ARENA_WIDTH
    const arenaBottom = ARENA_Y + ARENA_HEIGHT
    const direction =
      point.y < ARENA_Y ? '^' :
      point.y > arenaBottom ? 'v' :
      point.x < ARENA_X ? '<' :
      '>'
    const label = `${marker.label.slice(0, 5)} ${direction}`
    const width = Math.min(58, Math.max(38, Math.ceil(measurePixelText(label, TEXT_SCALE)) + 12))
    const x = clamp(Math.round(point.x - width / 2), ARENA_X + 4, arenaRight - width - 4)
    const y = clamp(Math.round(point.y - 7), ARENA_Y + 6, arenaBottom - 20)
    const colors = this.getReadabilityColors(state, marker)

    ctx.save()
    ctx.fillStyle = 'rgba(5, 7, 5, 0.9)'
    ctx.fillRect(x, y, width, 14)
    ctx.fillStyle = colors.accent
    ctx.fillRect(x + 2, y + 2, width - 4, 2)
    drawPixelText(ctx, label, x + width / 2, y + 5, {
      align: 'center',
      color: colors.label,
      maxWidth: width - 6,
      scale: TEXT_SCALE,
    })
    ctx.restore()
  }

  private getReadabilityColors(state: RenderState, marker: LevelReadabilityMarker) {
    if (marker.team === 'neutral') {
      return { body: '#fff1a5', accent: '#ffd35a', label: '#fff1a5', shadow: '#342814' }
    }

    if (marker.kind === 'critical-cover' || marker.team === null) {
      return { body: '#f7f3df', accent: '#fff1a5', label: '#f7f3df', shadow: '#26231a' }
    }

    const colors = this.getTeamColors(state, marker.team)
    return {
      body: colors.body,
      accent: marker.priority === 'primary' ? colors.highlight : colors.body,
      label: marker.priority === 'primary' ? '#f7f3df' : colors.highlight,
      shadow: colors.trim,
    }
  }

  private isObjectiveReadabilityMarker(kind: LevelReadabilityMarker['kind']) {
    return kind === 'defense-base' || kind === 'flag-home' || kind === 'flag-target' || kind === 'assault-core'
  }

  private isSpawnReadabilityMarker(kind: LevelReadabilityMarker['kind']) {
    return kind === 'player-spawn' || kind === 'friendly-spawn' || kind === 'enemy-spawn' || kind === 'neutral-spawn'
  }

  private worldPixelToScreen(camera: BattlefieldCamera, x: number, y: number) {
    return worldPointToScreen(camera, (x - ARENA_X) / TILE_SIZE, (y - ARENA_Y) / TILE_SIZE)
  }

  private isScreenPointNearArena(x: number, y: number, margin: number) {
    return x >= ARENA_X - margin && x <= ARENA_X + ARENA_WIDTH + margin && y >= ARENA_Y - margin && y <= ARENA_Y + ARENA_HEIGHT + margin
  }

  private drawHud(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.textBaseline = 'top'

    const teamIcon = this.getUiTeamSprite(state, state.playerTeam)
    this.drawHudIcon(ctx, teamIcon, HUD_X + 12, 236, 20, state.playerTeam.toUpperCase())
    drawPixelText(ctx, state.playerTeam, HUD_X + 36, 241, {
      color: this.getTeamColors(state, state.playerTeam).trim,
      maxWidth: 54,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudIcon(ctx, 'hud.score', HUD_X + 12, 262, 20, '*')
    drawPixelText(ctx, String(state.score).padStart(5, '0'), HUD_X + 36, 267, {
      color: this.getTeamColors(state, state.playerTeam).body,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudIcon(ctx, 'hud.hp', HUD_X + 12, 296, 18, 'HP')
    this.drawHudPips(ctx, HUD_X + 40, 302, state.player.hp, Math.max(state.player.maxHp, state.player.hp), '#ffd35a')

    this.drawHudIcon(ctx, 'hud.lives', HUD_X + 12, 326, 18, 'L')
    drawPixelText(ctx, String(state.lives), HUD_X + 43, 330, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, 'hud.enemies', HUD_X + 12, 350, 18, 'E')
    drawPixelText(ctx, String(state.enemiesRemaining + state.enemies.filter((tank) => tank.side !== 'player').length).padStart(2, '0'), HUD_X + 43, 354, {
      color: HUD_INK,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    this.drawHudIcon(ctx, 'hud.level', HUD_X + 12, 374, 18, 'LV')
    drawPixelText(ctx, String(state.currentLevel), HUD_X + 43, 378, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    this.drawHudIcon(ctx, 'hud.credits', HUD_X + 12, 398, 18, '$')
    drawPixelText(ctx, String(state.progression.credits).slice(-4), HUD_X + 43, 402, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })

    for (let index = 0; index < Math.min(18, state.enemiesRemaining + state.enemies.filter((tank) => tank.side !== 'player').length); index += 1) {
      const col = index % 2
      const row = Math.floor(index / 2)
      this.drawEnemyMarker(ctx, HUD_X + 50 + col * 16, 34 + row * 20, state.enemyTeam, state)
    }

    this.drawHudIcon(ctx, 'hud.base', HUD_X + 12, 420, 18, 'BASE')
    if (state.baseHp <= 0) {
      ctx.globalAlpha = 0.64
      ctx.fillStyle = '#181511'
      ctx.fillRect(HUD_X + 12, 420, 18, 18)
      ctx.globalAlpha = 1
    }
    drawPixelText(ctx, state.objective.mode === 'defense' ? 'BASE' : 'OBJ', HUD_X + 36, 421, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })
    this.drawObjectivePips(ctx, state)
    drawPixelText(ctx, state.objective.label.slice(0, 11), HUD_X + 12, 22, { color: HUD_INK, maxWidth: 76, scale: TEXT_SCALE, shadowColor: null })
    drawPixelText(ctx, this.getObjectiveHudLine(state), HUD_X + 36, 434, { color: HUD_INK, maxWidth: 58, scale: TEXT_SCALE, shadowColor: null })
  }

  private drawHudPips(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, total: number, color: string) {
    const count = Math.min(8, Math.max(1, total))
    const active = Math.max(0, Math.min(value, count))
    for (let index = 0; index < count; index += 1) {
      const col = index % 5
      const row = Math.floor(index / 5)
      const px = x + col * 8
      const py = y + row * 9
      ctx.fillStyle = '#151515'
      ctx.fillRect(px, py, 7, 7)
      ctx.fillStyle = index < active ? color : '#403a2b'
      ctx.fillRect(px + 1, py + 1, 5, 5)
      ctx.fillStyle = index < active ? '#fff0a8' : '#171717'
      ctx.fillRect(px + 2, py + 1, 3, 1)
    }
  }

  private drawObjectivePips(ctx: CanvasRenderingContext2D, state: RenderState) {
    const assault = state.objective.assault
    const total = Math.max(1, assault ? assault.maxHp : state.baseMaxHp)
    const value = Math.max(0, assault ? assault.hp : state.baseHp)
    const startX = HUD_X + 68
    const y = 421

    for (let index = 0; index < Math.min(6, total); index += 1) {
      const x = startX + index * 7
      const active = index < value
      ctx.fillStyle = '#151515'
      ctx.fillRect(x, y, 6, 6)
      ctx.fillStyle = active ? '#ffd35a' : '#3a3428'
      ctx.fillRect(x + 1, y + 1, 4, 4)
      ctx.fillStyle = active ? '#fff0a8' : '#161616'
      ctx.fillRect(x + 2, y + 1, 2, 1)
    }
  }

  private getObjectiveHudLine(state: RenderState) {
    if (state.objective.mode === 'ctf' && state.objective.flag) {
      const carrier = state.objective.flag.carrierId ? 'CARRY' : 'FLAG'
      return `${carrier} ${state.objective.flag.captures}/${state.objective.flag.capturesToWin}`
    }
    if (state.objective.mode === 'ffa') {
      return `KILLS ${state.objective.playerScore}/${state.objective.targetScore}`
    }
    if (state.objective.mode === 'assault' && state.objective.assault) {
      return `CORE ${state.objective.assault.hp}/${state.objective.assault.maxHp}`
    }
    return `ENEMY ${state.enemiesRemaining + state.enemies.filter((tank) => tank.side === 'enemy').length}`
  }

  private drawHudIcon(ctx: CanvasRenderingContext2D, spriteId: UiSpriteId, x: number, y: number, size: number, fallback: string) {
    if (drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui32' })) {
      return
    }

    drawPixelText(ctx, fallback, x + 2, y + 5, { color: HUD_INK, maxWidth: size, scale: TEXT_SCALE, shadowColor: null })
  }

  private drawEnemyMarker(ctx: CanvasRenderingContext2D, x: number, y: number, team: Team, state: RenderState) {
    drawPixelEnemyMarker(ctx, x, y, this.getTeamColors(state, team))
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    if (state.mode === 'loading') {
      this.drawLoadingOverlay(ctx, state)
      return
    }

    ctx.fillStyle = 'rgba(5, 5, 5, 0.66)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const accent = state.mode === 'lost' ? '#f06b3b' : this.getTeamColors(state, state.playerTeam).body
    this.drawMenuPlaque(ctx, ARENA_WIDTH / 2 - 122, 64, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, state.menu.title, ARENA_WIDTH / 2, 81, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, ARENA_WIDTH / 2 - 76, 104, 152, '#7f8b72')

    const resultHelper = state.mode === 'level-complete' || state.mode === 'campaign-complete' || state.mode === 'lost'
    const helperStartY = resultHelper ? 108 : 112
    const helperMaxWidth = ARENA_WIDTH - 36
    const helperLines = state.menu.helper.flatMap((line) => wrapPixelText(line, helperMaxWidth, TEXT_SCALE))
    const helperStep = resultHelper || helperLines.length > state.menu.helper.length ? 13 : 16
    helperLines.forEach((line, index) => {
      this.drawCenteredText(ctx, line, ARENA_WIDTH / 2, helperStartY + index * helperStep, '#d8d4c8', TEXT_SCALE, helperMaxWidth)
    })

    state.menu.options.forEach((option, index) => {
      const selected = index === state.menu.selectedIndex
      const pressed = index === state.menu.pressedIndex
      const y = MENU_OPTION_Y + index * MENU_OPTION_STEP + (pressed ? 2 : 0)
      const color = pressed ? '#fff1a5' : selected ? '#f7f3df' : '#b7baae'
      this.drawMenuButton(ctx, MENU_OPTION_X, y, MENU_OPTION_WIDTH, MENU_OPTION_HEIGHT, {
        accent,
        pressed,
        selected,
      })

      if (selected) {
        drawUiSprite(ctx, pressed ? 'menu.selector.pressed' : 'menu.selector', MENU_OPTION_X - 24, y + 6, {
          width: 18,
          height: 18,
          sheet: 'ui32',
        })
      }

      this.drawCenteredMiddleText(ctx, option, MENU_OPTION_X + MENU_OPTION_WIDTH / 2, y + MENU_OPTION_HEIGHT / 2 + 1, color, TEXT_SCALE, MENU_OPTION_WIDTH - 28)

      if (state.mode === 'garage' && option !== 'Back') {
        this.drawUpgradeBar(ctx, option, MENU_OPTION_X + MENU_OPTION_WIDTH - 66, y + 11)
      }
    })

    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', ARENA_WIDTH / 2, 406, '#8f8a82', TEXT_SCALE, ARENA_WIDTH - 28)

    ctx.textAlign = 'start'
  }

  private drawMenuPlaque(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, accent: string) {
    ctx.fillStyle = 'rgba(5, 7, 5, 0.82)'
    ctx.fillRect(x, y + 3, width, height)
    ctx.fillStyle = '#050505'
    ctx.fillRect(x, y + height - 3, width, 3)
    ctx.fillStyle = 'rgba(37, 43, 35, 0.92)'
    ctx.fillRect(x + 2, y + 2, width - 4, height - 7)
    ctx.fillStyle = '#87927a'
    ctx.fillRect(x + 18, y + 6, width - 36, 2)
    ctx.fillStyle = accent
    ctx.fillRect(x + 18, y + height - 8, width - 36, 1)
  }

  private drawMenuRule(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) {
    ctx.fillStyle = '#050505'
    ctx.fillRect(x, y + 2, width, 2)
    ctx.fillStyle = color
    ctx.fillRect(x, y, width, 2)
  }

  private drawMenuButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    state: { accent: string; pressed: boolean; selected: boolean },
  ) {
    const body = state.pressed ? '#1a211b' : state.selected ? '#263023' : '#171c17'
    const top = state.pressed ? '#0b0d0a' : state.selected ? '#7e8d6b' : '#4d5748'
    const edge = state.selected ? '#d7e5b4' : '#63705f'

    ctx.fillStyle = 'rgba(0, 0, 0, 0.44)'
    ctx.fillRect(x + 3, y + height - 1, width - 6, 3)
    ctx.fillStyle = '#050505'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = body
    ctx.fillRect(x + 2, y + 2, width - 4, height - 5)
    ctx.fillStyle = top
    ctx.fillRect(x + 4, y + 4, width - 8, 2)
    ctx.fillStyle = '#070807'
    ctx.fillRect(x + 4, y + height - 5, width - 8, 2)

    if (state.selected) {
      ctx.fillStyle = state.accent
      ctx.fillRect(x + 4, y + 6, 4, height - 12)
      ctx.fillStyle = edge
      ctx.fillRect(x + width - 8, y + 6, 2, height - 12)
      ctx.fillStyle = '#fff1a5'
      ctx.fillRect(x + 12, y + 6, 16, 2)
    }

    if (!state.pressed) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.fillRect(x + 6, y + 7, width - 12, 1)
    }
  }

  private drawLoadingOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const loading = state.loading
    const progress = loading?.progress ?? 0
    const ready = loading?.readyToProceed ?? false
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
    this.drawCenteredText(ctx, `LOADING LEVEL ${targetLevel.id}`, ARENA_WIDTH / 2, 86, this.getTeamColors(state, state.playerTeam).body, TITLE_SCALE)
    this.drawCenteredText(ctx, targetLevel.name, ARENA_WIDTH / 2, 120, '#d8d4c8', TEXT_SCALE, ARENA_WIDTH - 48)

    const treadBob = Math.round(Math.sin(state.time * 9) * 2)
    drawUiSprite(ctx, 'loading.tread', ARENA_WIDTH / 2 - 22 + treadBob, 150, { width: 44, height: 44, sheet: 'ui32' })
    drawUiSprite(ctx, 'loading.spark', ARENA_WIDTH / 2 + 30 - treadBob, 154, { width: 22, height: 22, sheet: 'ui32', alpha: 0.85 })

    const tip = loading?.tip ?? 'Tightening pixel bolts.'
    this.drawCenteredText(ctx, tip, ARENA_WIDTH / 2, 204, '#f2ead7', TEXT_SCALE, ARENA_WIDTH - 48)

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
    if (ready) {
      drawUiSprite(ctx, 'loading.ready', ARENA_WIDTH / 2 - 16, 265, { width: 32, height: 32, sheet: 'ui32', alpha: 0.98 })
      this.drawCenteredText(ctx, 'READY', ARENA_WIDTH / 2, 300, '#fff1a5', TITLE_SCALE)
      this.drawCenteredText(ctx, 'PRESS ENTER / SPACE TO BEGIN', ARENA_WIDTH / 2, 322, '#f2ead7', TEXT_SCALE)
      this.drawCenteredText(ctx, 'ESC RETURNS TO BRIEFING', ARENA_WIDTH / 2, 340, '#8f8a82', TEXT_SCALE)
    } else {
      this.drawCenteredText(ctx, `${Math.round(progress * 100)}%`, ARENA_WIDTH / 2, 265, '#8f8a82', TEXT_SCALE)
    }

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
    scale = TEXT_SCALE,
    maxWidth?: number,
  ) {
    drawPixelText(ctx, text, x, y, {
      align: 'center',
      color,
      maxWidth,
      scale,
    })
  }

  private drawCenteredMiddleText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    scale = TEXT_SCALE,
    maxWidth?: number,
  ) {
    drawPixelText(ctx, text, Math.round(x), Math.round(y), {
      align: 'center',
      baseline: 'middle',
      color,
      maxWidth,
      scale,
    })
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
    return getBattlefieldTeamColors(team, state.settings.colorSafe)
  }

  private getTeamKey(state: RenderState, team: Team): AtlasTeamKey {
    return getBattlefieldTeamKey(team, state.settings.colorSafe)
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
    if (state.feedback.flash > 0) {
      ctx.globalAlpha = Math.min(0.28, state.feedback.flash)
      ctx.fillStyle = '#fff4b6'
      ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
      ctx.globalAlpha = 1
    }

    if (state.feedback.notices.length <= 0) {
      return
    }

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    state.feedback.notices.forEach((notice, index) => {
      const progress = Math.min(1, notice.age / Math.max(0.01, notice.duration))
      const alpha = Math.max(0, Math.min(1, progress < 0.75 ? 1 : (1 - progress) / 0.25))
      const x = Math.max(44, Math.min(ARENA_WIDTH - 44, notice.x ?? ARENA_WIDTH / 2))
      const y = Math.max(ARENA_Y + 18, Math.min(ARENA_Y + ARENA_HEIGHT - 24, (notice.y ?? 74) - progress * 18 - index * 13))
      const width = Math.min(180, Math.max(72, Math.ceil(measurePixelText(notice.text, TEXT_SCALE)) + 16))

      ctx.globalAlpha = alpha
      ctx.fillStyle = 'rgba(3, 5, 4, 0.86)'
      ctx.fillRect(Math.round(x - width / 2), Math.round(y - 7), width, 14)
      drawPixelText(ctx, notice.text, Math.round(x), Math.round(y), {
        align: 'center',
        baseline: 'middle',
        color: notice.kind === 'repair' ? '#bff0a2' : notice.kind === 'reward' ? '#fff1a5' : '#f2ead7',
        maxWidth: width - 8,
        scale: TEXT_SCALE,
      })
    })

    ctx.globalAlpha = 1
    ctx.restore()
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
