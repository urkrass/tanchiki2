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
  TANK_SELECT_BACK_Y,
  TANK_SELECT_TAB_GAP,
  TANK_SELECT_TAB_HEIGHT,
  TANK_SELECT_TAB_WIDTH,
  TANK_SELECT_TAB_X,
  TANK_SELECT_TAB_Y,
  TILE_SIZE,
  clamp,
  tankCenter,
} from './constants.ts'
import type { TanchikiGame } from './game.ts'
import type {
  EncyclopediaVisualKind,
  LevelReadabilityMarker,
  OfflineVisionCircle,
  PowerUpKind,
  RenderState,
  RoadNeighbors,
  Tank,
  Team,
  TileKind,
  TreadTrackSnapshot,
  WaterNeighbors,
} from './types.ts'
import {
  drawPixelDeployable,
  drawPixelEnemyMarker,
  drawPixelGround,
  drawPixelPowerUp,
  drawPixelPortableRelay,
  drawPixelRelay,
  drawPixelTerrainTile,
  type PixelTeamPalette,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from './uiAtlas.ts'
import { drawTouchControlsOverlay } from './touchControlsRender.ts'
import { drawPixelText, measurePixelText, wrapPixelText } from './pixelText.ts'
import {
  BATTLEFIELD_TILE_SIZE,
  type BattlefieldCamera,
  battlefieldCellKey,
  drawBattlefieldFrame,
  drawBattlefieldGround,
  drawBattlefieldLastKnown,
  drawBattlefieldProjectile,
  drawBattlefieldRelay,
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
const FOG_SOFT_EDGE_TILES = 0.35

type TreadTrackRun = {
  tracks: TreadTrackSnapshot[]
  order: number
}

type TreadTrackEntry = {
  track: TreadTrackSnapshot
  order: number
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly game: TanchikiGame
  private fogLayer: HTMLCanvasElement | null = null
  private lastRelayVisionCircles: OfflineVisionCircle[] = []

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
    const visible = new Set(state.vision.visibleCells.map((cell) => battlefieldCellKey(cell.col, cell.row)))

    ctx.save()
    ctx.beginPath()
    ctx.rect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.clip()

    for (let row = range.startRow; row < range.endRow; row += 1) {
      for (let col = range.startCol; col < range.endCol; col += 1) {
        if (!visible.has(battlefieldCellKey(col, row))) {
          continue
        }

        const tile = state.tiles[row]?.[col]

        drawBattlefieldGround(ctx, camera, col, row)

        if (tile && tile.kind !== 'empty' && tile.kind !== 'trees') {
          this.drawTile(ctx, tile.kind, camera, col, row, tile.hp, state.time, state)
        }
      }
    }

    this.drawTreadTracks(ctx, state, camera)
    this.drawObjectiveMarkers(ctx, state, camera)

    for (const relay of state.retranslators) {
      const progressSide = relay.captureSide && relay.progress > 0 && relay.progress < 1 ? relay.captureSide : relay.owner
      drawBattlefieldRelay(ctx, camera, relay.col, relay.row, relay.owner ? this.getSideColors(state, relay.owner) : null, relay.progress, {
        frame: Math.floor(state.time * 4),
        progressPalette: progressSide ? this.getSideColors(state, progressSide) : null,
        teamKey: relay.owner ? this.getSideTeamKey(state, relay.owner) : 'neutral',
      })
    }

    this.drawPortableRelay(ctx, state, camera, visible)
    this.drawDeployables(ctx, state, camera)
    this.drawMajorModStructures(ctx, state, camera)

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
        if (!visible.has(battlefieldCellKey(col, row))) {
          continue
        }

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

    this.drawCircularFog(ctx, state, camera)

    this.drawPortableSignalWaves(ctx, state, camera)
    this.drawPortableSignalContacts(ctx, state, camera)
    this.drawDeployableAlerts(ctx, state, camera)

    for (const memory of state.lastKnown) {
      drawBattlefieldLastKnown(ctx, camera, memory.col, memory.row, this.getTeamColors(state, memory.team).highlight)
    }

    this.drawPortableRelayHoldPrompt(ctx, state, camera)
    this.drawDeployableHoldPrompt(ctx, state, camera)

    ctx.restore()
  }

  private drawPortableSignalWaves(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.portableRelay.waves.length === 0) {
      return
    }

    ctx.save()
    ctx.lineCap = 'square'
    for (const wave of state.portableRelay.waves) {
      const progress = clamp(wave.age / Math.max(0.01, wave.ttl), 0, 1)
      const alpha = clamp((1 - progress) * wave.strength, 0, 0.42)
      if (alpha <= 0.03) {
        continue
      }

      const dx = wave.x - wave.previousX
      const dy = wave.y - wave.previousY
      const distance = Math.max(1, Math.hypot(dx, dy))
      const tailLength = 10 + Math.round(wave.strength * 8)
      const tailX = wave.x - (dx / distance) * tailLength
      const tailY = wave.y - (dy / distance) * tailLength
      const from = this.worldPixelToScreen(camera, tailX, tailY)
      const to = this.worldPixelToScreen(camera, wave.x, wave.y)
      if (!this.isScreenPointNearArena(to.x, to.y, 18) && !this.isScreenPointNearArena(from.x, from.y, 18)) {
        continue
      }

      ctx.globalAlpha = alpha
      ctx.strokeStyle = wave.bounces > 0 ? '#f7f2dd' : '#f2f5ee'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(from.x), Math.round(from.y))
      ctx.lineTo(Math.round(to.x), Math.round(to.y))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawPortableRelay(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera, visible: Set<string>) {
    for (const relay of state.portableRelay.relays) {
      if (!visible.has(battlefieldCellKey(relay.col, relay.row))) {
        continue
      }

      const point = worldCellToScreen(camera, relay.col, relay.row)
      drawPixelPortableRelay(ctx, point.x, point.y, BATTLEFIELD_TILE_SIZE, state.portableRelay.waveCount > 0)
    }
  }

  private drawDeployables(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.deployables.active.length === 0) {
      return
    }

    for (const deployable of state.deployables.active) {
      const point = worldCellToScreen(camera, deployable.col, deployable.row)
      if (!this.isScreenPointNearArena(point.x, point.y, BATTLEFIELD_TILE_SIZE)) {
        continue
      }
      drawPixelDeployable(ctx, deployable.kind, point.x, point.y, BATTLEFIELD_TILE_SIZE, state.time % 0.8 < 0.4)
    }
  }

  private drawPortableRelayHoldPrompt(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const hold = state.portableRelay.hold
    if (!hold) {
      return
    }

    const target = hold.action === 'place' ? state.player : { x: ARENA_X + hold.col * TILE_SIZE + 3, y: ARENA_Y + hold.row * TILE_SIZE + 3 }
    const point = this.worldPixelToScreen(camera, target.x, target.y)
    const width = 64
    const height = 16
    const x = clamp(Math.round(point.x + TANK_SIZE / 2 - width / 2), ARENA_X + 2, ARENA_X + ARENA_WIDTH - width - 2)
    const y = clamp(Math.round(point.y - 23), ARENA_Y + 2, ARENA_Y + ARENA_HEIGHT - height - 2)
    const progress = clamp(hold.progress, 0, 1)

    ctx.save()
    ctx.fillStyle = 'rgba(4, 7, 5, 0.88)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#151515'
    ctx.fillRect(x + 4, y + 10, width - 8, 3)
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(x + 4, y + 10, Math.max(2, Math.round((width - 8) * progress)), 3)
    drawPixelText(ctx, hold.label, x + width / 2, y + 3, {
      align: 'center',
      color: '#f2ead7',
      maxWidth: width - 6,
      scale: TEXT_SCALE,
    })
    ctx.restore()
  }

  private drawDeployableHoldPrompt(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const hold = state.deployables.hold
    if (!hold) {
      return
    }

    const target = hold.action === 'place' ? state.player : { x: ARENA_X + hold.col * TILE_SIZE + 3, y: ARENA_Y + hold.row * TILE_SIZE + 3 }
    const point = this.worldPixelToScreen(camera, target.x, target.y)
    const width = 68
    const height = 16
    const x = clamp(Math.round(point.x + TANK_SIZE / 2 - width / 2), ARENA_X + 2, ARENA_X + ARENA_WIDTH - width - 2)
    const y = clamp(Math.round(point.y - 42), ARENA_Y + 2, ARENA_Y + ARENA_HEIGHT - height - 2)
    const progress = clamp(hold.progress, 0, 1)

    ctx.save()
    ctx.fillStyle = 'rgba(4, 7, 5, 0.88)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#151515'
    ctx.fillRect(x + 4, y + 10, width - 8, 3)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(x + 4, y + 10, Math.max(2, Math.round((width - 8) * progress)), 3)
    drawPixelText(ctx, hold.label, x + width / 2, y + 3, {
      align: 'center',
      color: '#f2ead7',
      maxWidth: width - 6,
      scale: TEXT_SCALE,
    })
    ctx.restore()
  }

  private drawPortableSignalContacts(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.portableRelay.signalContacts.length === 0) {
      return
    }

    ctx.save()
    for (const contact of state.portableRelay.signalContacts) {
      const progress = clamp(contact.age / Math.max(0.01, contact.ttl), 0, 1)
      const alpha = clamp((1 - progress) * contact.strength, 0, contact.kind === 'hostile' ? 0.86 : 0.64)
      const point = this.worldPixelToScreen(camera, contact.x, contact.y)
      if (!this.isScreenPointNearArena(point.x, point.y, 18)) {
        continue
      }

      ctx.globalAlpha = alpha
      ctx.strokeStyle = contact.kind === 'hostile' ? '#ff3346' : '#f2f5ee'
      ctx.lineWidth = 1
      const cx = Math.round(point.x)
      const cy = Math.round(point.y)
      if (contact.kind === 'hostile') {
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
      } else {
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
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawDeployableAlerts(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.deployables.alerts.length === 0) {
      return
    }

    ctx.save()
    ctx.lineWidth = 1
    for (const alert of state.deployables.alerts) {
      const progress = clamp(alert.age / Math.max(0.01, alert.ttl), 0, 1)
      const alpha = clamp((1 - progress) * alert.strength, 0, 0.78)
      const point = worldCellToScreen(camera, alert.col, alert.row)
      const cx = Math.round(point.x + BATTLEFIELD_TILE_SIZE / 2)
      const cy = Math.round(point.y + BATTLEFIELD_TILE_SIZE / 2)
      if (!this.isScreenPointNearArena(cx, cy, 18)) {
        continue
      }

      ctx.globalAlpha = alpha
      ctx.strokeStyle = alert.kind === 'steel' ? '#ff3346' : '#ffd35a'
      ctx.beginPath()
      ctx.moveTo(cx - 10, cy)
      ctx.lineTo(cx - 4, cy)
      ctx.moveTo(cx + 4, cy)
      ctx.lineTo(cx + 10, cy)
      ctx.moveTo(cx, cy - 10)
      ctx.lineTo(cx, cy - 4)
      ctx.moveTo(cx, cy + 4)
      ctx.lineTo(cx, cy + 10)
      ctx.stroke()
      ctx.strokeStyle = '#f2f5ee'
      ctx.strokeRect(cx - 3, cy - 3, 6, 6)
    }
    ctx.globalAlpha = 1
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
      kind === 'water' ? this.getVisibleWaterNeighbors(state, col, row) : undefined,
      kind === 'road' ? this.getVisibleRoadNeighbors(state, col, row) : undefined,
    )
  }

  private drawCircularFog(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const layer = this.getFogLayer()
    const g = layer.getContext('2d')
    if (!g) return

    g.clearRect(0, 0, layer.width, layer.height)
    g.fillStyle = '#020202'
    g.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)

    const previousComposite = g.globalCompositeOperation
    g.globalCompositeOperation = 'destination-out'
    for (const circle of state.vision.circles) {
      this.carveVisionCircle(g, camera, circle, 1)
    }

    const currentRelayCircles = state.vision.circles.filter((circle) => circle.kind === 'relay')
    if (state.majorMods.emp.disrupting && state.majorMods.emp.visionFade > 0) {
      for (const circle of this.lastRelayVisionCircles) {
        this.carveVisionCircle(g, camera, circle, state.majorMods.emp.visionFade)
      }
    } else {
      this.lastRelayVisionCircles = currentRelayCircles.map((circle) => ({ ...circle }))
    }

    for (const cell of state.vision.alwaysVisibleCells) {
      const screen = worldPointToScreen(camera, cell.col, cell.row)
      g.fillStyle = '#000'
      g.fillRect(screen.x, screen.y, BATTLEFIELD_TILE_SIZE, BATTLEFIELD_TILE_SIZE)
    }
    g.globalCompositeOperation = previousComposite
    ctx.drawImage(layer, 0, 0)
  }

  private carveVisionCircle(ctx: CanvasRenderingContext2D, camera: BattlefieldCamera, circle: OfflineVisionCircle, alpha: number) {
    const screen = worldPointToScreen(camera, circle.x, circle.y)
    const radius = circle.radius * BATTLEFIELD_TILE_SIZE
    const soft = Math.max(1, FOG_SOFT_EDGE_TILES * BATTLEFIELD_TILE_SIZE)
    const gradient = ctx.createRadialGradient(screen.x, screen.y, Math.max(0, radius - soft), screen.x, screen.y, radius + soft)
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`)
    gradient.addColorStop(0.64, `rgba(0, 0, 0, ${alpha})`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius + soft, 0, Math.PI * 2)
    ctx.fill()
  }

  private getFogLayer() {
    if (this.fogLayer && this.fogLayer.width === LOGICAL_WIDTH && this.fogLayer.height === LOGICAL_HEIGHT) {
      return this.fogLayer
    }

    const next = document.createElement('canvas')
    next.width = LOGICAL_WIDTH
    next.height = LOGICAL_HEIGHT
    this.fogLayer = next
    return next
  }

  private getVisibleWaterNeighbors(state: RenderState, col: number, row: number): WaterNeighbors {
    return {
      up: this.isVisibleTerrainKind(state, col, row - 1, 'water'),
      right: this.isVisibleTerrainKind(state, col + 1, row, 'water'),
      down: this.isVisibleTerrainKind(state, col, row + 1, 'water'),
      left: this.isVisibleTerrainKind(state, col - 1, row, 'water'),
    }
  }

  private getVisibleRoadNeighbors(state: RenderState, col: number, row: number): RoadNeighbors {
    return {
      up: this.isVisibleRoadConnection(state, col, row - 1),
      right: this.isVisibleRoadConnection(state, col + 1, row),
      down: this.isVisibleRoadConnection(state, col, row + 1),
      left: this.isVisibleRoadConnection(state, col - 1, row),
    }
  }

  private isVisibleRoadConnection(state: RenderState, col: number, row: number) {
    const kind = state.tiles[row]?.[col]?.kind
    return (kind === 'road' || kind === 'ammo') && this.isVisibleCell(state, col, row)
  }

  private isVisibleTerrainKind(state: RenderState, col: number, row: number, kind: TileKind) {
    return state.tiles[row]?.[col]?.kind === kind && this.isVisibleCell(state, col, row)
  }

  private isVisibleCell(state: RenderState, col: number, row: number) {
    return state.vision.visibleCells.some((cell) => cell.col === col && cell.row === row)
  }

  private getSideColors(state: RenderState, side: 'player' | 'enemy' | 'neutral'): PixelTeamPalette {
    if (side === 'neutral') {
      return { body: '#fff1a5', trim: '#5c4a1d', highlight: '#fff7c7', bullet: '#fff1a5' }
    }

    return this.getTeamColors(state, side === 'player' ? state.playerTeam : state.enemyTeam)
  }

  private getSideTeamKey(state: RenderState, side: 'player' | 'enemy' | 'neutral'): AtlasTeamKey | 'neutral' {
    if (side === 'neutral') {
      return 'neutral'
    }

    return this.getTeamKey(state, side === 'player' ? state.playerTeam : state.enemyTeam)
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
      tankClass: tank.classId,
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
      point.y < ARENA_Y ? 'UP' :
      point.y > arenaBottom ? 'DOWN' :
      point.x < ARENA_X ? 'LEFT' :
      'RIGHT'
    const label = `${marker.label.slice(0, 5)} ${direction}`
    const width = Math.min(78, Math.max(44, Math.ceil(measurePixelText(label, TEXT_SCALE)) + 12))
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
    ctx.textBaseline = 'top'

    this.drawHudEnemyStatus(ctx, state)
    this.drawHudTopHpLine(ctx, state)
    this.drawHudShellStatus(ctx, state)
    this.drawHudRightStatus(ctx, state)
  }

  private drawHudTopHpLine(ctx: CanvasRenderingContext2D, state: RenderState) {
    const x = ARENA_X + 8
    const y = 4
    const barX = x + 24
    const barY = y + 3
    const barWidth = 120
    const barHeight = 5
    const maxHp = Math.max(1, state.player.maxHp)
    const hp = Math.max(0, Math.min(state.player.hp, maxHp))
    const fillWidth = hp > 0 ? Math.max(1, Math.round((barWidth - 2) * (hp / maxHp))) : 0
    const danger = hp <= Math.ceil(maxHp / 3)
    const shieldX = ARENA_X + 208
    const shieldBarX = shieldX + 54
    const shieldBarWidth = 96
    const shield = clamp(state.player.shield, 0, 6)
    const shieldFillWidth = shield > 0 ? Math.max(1, Math.round((shieldBarWidth - 2) * (shield / 6))) : 0

    drawPixelText(ctx, 'HP', x, y, {
      color: danger ? '#7b1e18' : HUD_INK,
      maxWidth: 18,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    ctx.fillStyle = '#171717'
    ctx.fillRect(barX, barY, barWidth, barHeight)
    ctx.fillStyle = danger ? '#f06243' : '#ffd35a'
    if (fillWidth > 0) {
      ctx.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2)
    }
    ctx.fillStyle = danger ? '#ffd6c8' : '#fff1a5'
    if (fillWidth > 1) {
      ctx.fillRect(barX + 2, barY + 1, Math.max(1, Math.min(fillWidth - 1, Math.round(fillWidth * 0.45))), 1)
    }
    drawPixelText(ctx, `${hp}/${maxHp}`, barX + barWidth + 8, y, {
      color: HUD_INK,
      maxWidth: 36,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    drawPixelText(ctx, 'SHIELD', shieldX, y, {
      color: shield > 0 ? '#1f4c4c' : HUD_INK,
      maxWidth: 48,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    ctx.fillStyle = '#171717'
    ctx.fillRect(shieldBarX, barY, shieldBarWidth, barHeight)
    if (shieldFillWidth > 0) {
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(shieldBarX + 1, barY + 1, shieldFillWidth, barHeight - 2)
      ctx.fillStyle = '#dffcff'
      ctx.fillRect(shieldBarX + 2, barY + 1, Math.max(1, Math.min(shieldFillWidth - 1, Math.round(shieldFillWidth * 0.42))), 1)
    }
  }

  private drawHudEnemyStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    const total = state.enemiesRemaining + state.activeEnemyCount
    drawPixelText(ctx, 'ENEMY', 7, 24, {
      color: HUD_INK,
      maxWidth: 36,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, String(total).padStart(2, '0'), 13, 44, {
      color: this.getTeamColors(state, state.enemyTeam).trim,
      maxWidth: 28,
      scale: TITLE_SCALE,
      shadowColor: null,
    })

    const markerCount = Math.min(20, total)
    for (let index = 0; index < markerCount; index += 1) {
      const col = index % 2
      const row = Math.floor(index / 2)
      this.drawEnemyMarker(ctx, 4 + col * 20, 74 + row * 18, state.enemyTeam, state)
    }
  }

  private drawHudRightStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.textBaseline = 'top'

    drawPixelText(ctx, state.objective.label.slice(0, 11), HUD_X + 12, 22, {
      color: HUD_INK,
      maxWidth: 76,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, this.getObjectiveHudLine(state), HUD_X + 12, 42, {
      color: HUD_INK,
      maxWidth: 76,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    this.drawObjectivePips(ctx, state, HUD_X + 12, 60)

    this.drawHudLinkStatus(ctx, state, 112)
    this.drawHudPortableRelayStatus(ctx, state, 166)
    this.drawHudMajorModStatus(ctx, state, 210)

    const teamIcon = this.getUiTeamSprite(state, state.playerTeam)
    this.drawHudIcon(ctx, teamIcon, HUD_X + 12, 236, 20, state.playerTeam.toUpperCase())
    drawPixelText(ctx, state.playerTeam, HUD_X + 36, 241, {
      color: this.getTeamColors(state, state.playerTeam).trim,
      maxWidth: 54,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudIcon(ctx, 'hud.score', HUD_X + 12, 286, 20, '*')
    drawPixelText(ctx, String(state.score).padStart(5, '0'), HUD_X + 36, 291, {
      color: this.getTeamColors(state, state.playerTeam).body,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudIcon(ctx, 'hud.lives', HUD_X + 12, 340, 18, 'L')
    drawPixelText(ctx, String(state.lives), HUD_X + 43, 344, { color: HUD_INK, scale: TEXT_SCALE, shadowColor: null })

    this.drawHudMinimap(ctx, state, 374)
  }

  private drawHudMinimap(ctx: CanvasRenderingContext2D, state: RenderState, y: number) {
    if (state.mode !== 'playing' || state.map.cols <= 0 || state.map.rows <= 0) {
      return
    }

    const maxWidth = HUD_WIDTH - 20
    const maxHeight = LOGICAL_HEIGHT - y - 18
    const scale = Math.min(4, maxWidth / state.map.cols, maxHeight / state.map.rows)

    if (scale <= 0) {
      return
    }

    const mapWidth = state.map.cols * scale
    const mapHeight = state.map.rows * scale
    const x = HUD_X + Math.round((HUD_WIDTH - mapWidth) / 2)
    const mapY = y + 12
    const knownCells = this.getMinimapKnownCells(state)

    drawPixelText(ctx, 'MAP', HUD_X + 12, y, {
      color: HUD_INK,
      maxWidth: 28,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    ctx.save()
    ctx.fillStyle = '#141414'
    ctx.fillRect(Math.floor(x) - 2, mapY - 2, Math.ceil(mapWidth) + 4, Math.ceil(mapHeight) + 4)
    ctx.fillStyle = '#050505'
    ctx.fillRect(x, mapY, mapWidth, mapHeight)

    for (let row = 0; row < state.map.rows; row += 1) {
      for (let col = 0; col < state.map.cols; col += 1) {
        if (!knownCells.has(battlefieldCellKey(col, row))) {
          continue
        }

        const tile = state.tiles[row]?.[col]
        ctx.fillStyle = this.getMinimapTileColor(tile?.kind ?? 'empty')
        ctx.fillRect(x + col * scale, mapY + row * scale, scale + 0.2, scale + 0.2)
      }
    }

    for (const relay of state.retranslators) {
      this.drawMinimapMarker(ctx, x, mapY, scale, relay.col, relay.row, relay.owner ? '#86f4ff' : '#fff1a5', 1.7)
    }

    for (const powerUp of state.powerUps) {
      const col = Math.floor((powerUp.x + 10 - ARENA_X) / TILE_SIZE)
      const row = Math.floor((powerUp.y + 10 - ARENA_Y) / TILE_SIZE)
      if (knownCells.has(battlefieldCellKey(col, row))) {
        this.drawMinimapMarker(ctx, x, mapY, scale, col, row, '#ffd35a', 1.5)
      }
    }

    for (const tank of state.enemies) {
      const color = tank.side === 'player' ? this.getTeamColors(state, state.playerTeam).body : this.getTeamColors(state, tank.team).body
      this.drawMinimapMarker(ctx, x, mapY, scale, tank.col, tank.row, color, 1.8)
    }
    this.drawMinimapMarker(ctx, x, mapY, scale, state.player.col, state.player.row, '#dffcff', 2.1)

    ctx.strokeStyle = '#f4e58b'
    ctx.lineWidth = 1
    ctx.strokeRect(
      Math.round(x + state.camera.current.col * scale) + 0.5,
      Math.round(mapY + state.camera.current.row * scale) + 0.5,
      Math.max(1, state.map.viewportCols * scale),
      Math.max(1, state.map.viewportRows * scale),
    )
    ctx.strokeStyle = '#252820'
    ctx.strokeRect(Math.floor(x) - 2.5, mapY - 2.5, Math.ceil(mapWidth) + 4, Math.ceil(mapHeight) + 4)
    ctx.restore()
  }

  private getMinimapKnownCells(state: RenderState) {
    const cells = new Set<string>()
    for (const cell of state.vision.visibleCells) {
      cells.add(battlefieldCellKey(cell.col, cell.row))
    }
    for (const cell of state.vision.alwaysVisibleCells) {
      cells.add(battlefieldCellKey(cell.col, cell.row))
    }
    return cells
  }

  private getMinimapTileColor(kind: TileKind) {
    switch (kind) {
      case 'brick':
        return '#8a5a32'
      case 'steel':
        return '#9b9d91'
      case 'water':
        return '#236875'
      case 'trees':
        return '#244128'
      case 'base':
        return '#d8d0ac'
      case 'radio':
        return '#86f4ff'
      case 'depot':
        return '#d5a238'
      case 'road':
        return '#747466'
      case 'ammo':
        return '#f0d15a'
      case 'empty':
      default:
        return '#2d3d2d'
    }
  }

  private drawMinimapMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    col: number,
    row: number,
    color: string,
    radius: number,
  ) {
    const cx = x + (col + 0.5) * scale
    const cy = y + (row + 0.5) * scale
    ctx.fillStyle = '#090909'
    ctx.beginPath()
    ctx.arc(cx, cy, radius + 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawHudShellStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    const x = ARENA_X + 14
    const y = ARENA_Y + ARENA_HEIGHT + 6
    this.drawHudShellIcon(ctx, x, y)
    drawPixelText(ctx, `${state.playerShells}/${state.playerShellCapacity}`, x + 30, y + 5, {
      color: state.playerShells <= 2 ? '#7b1e18' : HUD_INK,
      maxWidth: 44,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    this.drawHudShellPips(ctx, x + 82, y + 6, state.playerShells, state.playerShellCapacity)
    this.drawHudGearStrip(ctx, state, ARENA_X + 278, y - 1)

    if (!state.playerOnAmmoStation || state.playerShells >= state.playerShellCapacity) {
      return
    }

    const width = 100
    const progress = clamp(state.playerShellRechargeProgress, 0, 1)
    ctx.fillStyle = '#171717'
    ctx.fillRect(x + 82, y + 21, width, 3)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(x + 83, y + 22, Math.max(1, Math.round((width - 2) * progress)), 1)
  }

  private drawHudPortableRelayStatus(ctx: CanvasRenderingContext2D, state: RenderState, y: number) {
    const x = HUD_X + 12
    const active = state.portableRelay.deployed || Boolean(state.portableRelay.hold)
    ctx.fillStyle = '#151515'
    ctx.fillRect(x, y + 4, 18, 12)
    ctx.fillStyle = active ? '#86f4ff' : '#6b4f30'
    ctx.fillRect(x + 3, y + 8, 12, 5)
    ctx.fillStyle = active ? '#dffcff' : '#fff1a5'
    ctx.fillRect(x + 8, y + 2, 2, 7)
    ctx.fillRect(x + 5, y + 4, 8, 1)
    drawPixelText(ctx, state.portableRelay.label, HUD_X + 34, y + 4, {
      color: active ? '#1f4c4c' : HUD_INK,
      maxWidth: 58,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
  }

  private drawHudMajorModStatus(ctx: CanvasRenderingContext2D, state: RenderState, y: number) {
    const selected = state.majorMods.selected
    const label = selected === 'overdrive'
      ? state.majorMods.overdrive.active ? `MOD ${Math.ceil(state.majorMods.overdrive.remaining)}s` : state.majorMods.overdrive.ready ? 'MOD X' : `MOD ${Math.ceil(state.majorMods.overdrive.cooldown)}s`
      : selected === 'pontoon'
        ? state.majorMods.pontoon.active ? 'MOD BRDG' : 'MOD X'
        : selected === 'hedgehog'
          ? state.majorMods.hedgehog.active
            ? `MOD H${state.majorMods.hedgehog.hitsRemaining}`
            : state.majorMods.hedgehog.spent ? 'MOD SPNT' : 'MOD X'
          : state.majorMods.emp.active
            ? state.majorMods.emp.disrupting ? 'MOD EMP' : `MOD ${Math.ceil(state.majorMods.emp.nextPulseIn)}s`
            : 'MOD X'

    ctx.fillStyle = '#151515'
    ctx.fillRect(HUD_X + 12, y + 4, 18, 12)
    ctx.fillStyle = state.majorMods.overdrive.active || state.majorMods.emp.disrupting ? '#86f4ff' : '#ffd35a'
    ctx.fillRect(HUD_X + 16, y + 7, 10, 6)
    drawPixelText(ctx, label, HUD_X + 34, y + 4, {
      color: HUD_INK,
      maxWidth: 58,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
  }

  private drawHudGearStrip(ctx: CanvasRenderingContext2D, state: RenderState, x: number, y: number) {
    const activeKinds = new Set(state.deployables.active.map((deployable) => deployable.kind))
    const hold = state.deployables.hold
    const iconSize = 18
    const gap = 22

    state.deployables.available.forEach((kind, index) => {
      const iconX = x + index * gap
      const active = activeKinds.has(kind)
      const held = hold?.kind === kind
      ctx.globalAlpha = active ? 1 : held ? 0.9 : 0.62
      drawPixelDeployable(ctx, kind, iconX, y, iconSize, active || held)
      ctx.globalAlpha = 1

      if (!held) {
        return
      }

      const progress = clamp(hold.progress, 0, 1)
      ctx.fillStyle = '#171717'
      ctx.fillRect(iconX, y + iconSize + 1, iconSize, 3)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(iconX + 1, y + iconSize + 2, Math.max(1, Math.round((iconSize - 2) * progress)), 1)
    })
  }

  private drawHudShellIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#151515'
    ctx.fillRect(x, y + 5, 20, 9)
    ctx.fillStyle = '#6b4f30'
    ctx.fillRect(x + 2, y + 7, 11, 5)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(x + 13, y + 6, 5, 7)
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(x + 14, y + 7, 3, 2)
  }

  private drawHudShellPips(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, total: number) {
    const count = Math.min(10, Math.max(1, total))
    const active = Math.max(0, Math.min(value, count))
    for (let index = 0; index < count; index += 1) {
      const px = x + index * 10
      ctx.fillStyle = '#171717'
      ctx.fillRect(px, y, 8, 9)
      ctx.fillStyle = index < active ? '#ffd35a' : '#403a2b'
      ctx.fillRect(px + 2, y + 2, 4, 5)
      ctx.fillStyle = index < active ? '#fff1a5' : '#171717'
      ctx.fillRect(px + 5, y + 1, 2, 7)
    }
  }

  private drawObjectivePips(ctx: CanvasRenderingContext2D, state: RenderState, startX: number, y: number) {
    const assault = state.objective.assault
    const total = Math.max(1, assault ? assault.maxHp : state.baseMaxHp)
    const value = Math.max(0, assault ? assault.hp : state.baseHp)

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
    if (state.objective.mode === 'team-battle') {
      return `SCORE ${state.objective.playerScore}/${state.objective.targetScore}`
    }
    if (state.objective.mode === 'assault' && state.objective.assault) {
      return `CORE ${state.objective.assault.hp}/${state.objective.assault.maxHp}`
    }
    return `BASE ${state.baseHp}/${state.baseMaxHp}`
  }

  private drawHudLinkStatus(ctx: CanvasRenderingContext2D, state: RenderState, y: number) {
    const status = state.fog.teamVisionMode === 'linked' ? 'TEAM' : 'SOLO'
    const statusColor = state.fog.teamVisionMerged ? '#1f4c2e' : '#5a3f1c'

    this.drawHudIcon(ctx, state.fog.teamVisionMerged ? 'hud.link.on' : 'hud.link.off', HUD_X + 12, y, 18, 'LINK')
    drawPixelText(ctx, `${state.fog.ownedRetranslatorCount}/${state.fog.totalRetranslatorCount}`, HUD_X + 43, y + 4, {
      color: state.fog.teamVisionMerged ? '#1f4c2e' : HUD_INK,
      maxWidth: 38,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, status, HUD_X + 43, y + 14, {
      color: statusColor,
      maxWidth: 38,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
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

    if (state.mode === 'encyclopedia' && state.encyclopedia?.activeTopic) {
      this.drawEncyclopediaDetailOverlay(ctx, state)
      return
    }

    if (state.mode === 'tank-select') {
      this.drawTankSelectOverlay(ctx, state)
      return
    }

    ctx.fillStyle = 'rgba(5, 5, 5, 0.66)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const accent = state.mode === 'lost' ? '#f06b3b' : this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    this.drawMenuPlaque(ctx, arenaCenterX - 122, 64, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, state.menu.title, arenaCenterX, 81, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, arenaCenterX - 76, 104, 152, '#7f8b72')

    const resultHelper = state.mode === 'level-complete' || state.mode === 'campaign-complete' || state.mode === 'lost'
    const helperStartY = resultHelper ? 108 : 112
    const helperMaxWidth = ARENA_WIDTH - 36
    const helperLines = state.menu.helper.flatMap((line) => wrapPixelText(line, helperMaxWidth, TEXT_SCALE))
    const helperStep = resultHelper || helperLines.length > state.menu.helper.length ? 13 : 16
    helperLines.forEach((line, index) => {
      this.drawCenteredText(ctx, line, arenaCenterX, helperStartY + index * helperStep, '#d8d4c8', TEXT_SCALE, helperMaxWidth)
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

      if (state.mode === 'garage' && option.endsWith(' *')) {
        this.drawEquippedModMark(ctx, MENU_OPTION_X + MENU_OPTION_WIDTH - 48, y + 10)
      }
    })

    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', arenaCenterX, 406, '#8f8a82', TEXT_SCALE, ARENA_WIDTH - 28)

    ctx.textAlign = 'start'
  }

  private drawTankSelectOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.78)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const accent = this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    this.drawMenuPlaque(ctx, arenaCenterX - 122, 58, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, 'Tank Select', arenaCenterX, 75, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, arenaCenterX - 76, 98, 152, '#7f8b72')

    const selected = state.tankClasses.options[state.menu.selectedIndex] ?? state.tankClasses.options.find((option) => option.selected)
    if (selected) {
      this.drawCenteredText(ctx, selected.description, arenaCenterX, 112, '#d8d4c8', TEXT_SCALE, ARENA_WIDTH - 44)
    }

    state.tankClasses.options.forEach((option, index) => {
      const x = TANK_SELECT_TAB_X + index * (TANK_SELECT_TAB_WIDTH + TANK_SELECT_TAB_GAP)
      const y = TANK_SELECT_TAB_Y + (state.menu.pressedIndex === index ? 2 : 0)
      const isSelected = option.selected
      const isFocused = state.menu.selectedIndex === index
      const pressed = state.menu.pressedIndex === index
      this.drawMenuButton(ctx, x, y, TANK_SELECT_TAB_WIDTH, TANK_SELECT_TAB_HEIGHT, {
        accent,
        pressed,
        selected: isFocused || isSelected,
      })

      drawBattlefieldTank(ctx, x + TANK_SELECT_TAB_WIDTH / 2, y + 30, 38, 'up', this.getTeamColors(state, state.playerTeam), {
        self: isSelected,
        tankClass: option.id,
        teamKey: this.getTeamKey(state, state.playerTeam),
      })

      drawPixelText(ctx, option.shortLabel, x + TANK_SELECT_TAB_WIDTH / 2, y + 58, {
        align: 'center',
        color: isSelected ? '#fff1a5' : '#f7f3df',
        maxWidth: TANK_SELECT_TAB_WIDTH - 12,
        scale: TEXT_SCALE,
      })
      drawPixelText(ctx, option.role.toUpperCase(), x + TANK_SELECT_TAB_WIDTH / 2, y + 70, {
        align: 'center',
        color: '#bfc4b8',
        maxWidth: TANK_SELECT_TAB_WIDTH - 12,
        scale: TEXT_SCALE,
      })

      const statLines = option.stats.slice(0, 2)
      statLines.forEach((line, lineIndex) => {
        drawPixelText(ctx, line.toUpperCase(), x + TANK_SELECT_TAB_WIDTH / 2, y + 84 + lineIndex * 10, {
          align: 'center',
          color: '#d8d4c8',
          maxWidth: TANK_SELECT_TAB_WIDTH - 10,
          scale: TEXT_SCALE,
        })
      })
    })

    if (selected) {
      this.drawCenteredText(ctx, `EQUIPMENT: ${selected.equipment.join(' / ').toUpperCase()}`, arenaCenterX, 270, '#f2ead7', TEXT_SCALE, ARENA_WIDTH - 44)
      this.drawCenteredText(ctx, selected.stats.slice(2).join('  ').toUpperCase(), arenaCenterX, 286, '#bfc4b8', TEXT_SCALE, ARENA_WIDTH - 44)
    }

    const backPressed = state.menu.pressedIndex === state.tankClasses.options.length
    this.drawMenuButton(ctx, MENU_OPTION_X, TANK_SELECT_BACK_Y + (backPressed ? 2 : 0), MENU_OPTION_WIDTH, MENU_OPTION_HEIGHT, {
      accent,
      pressed: backPressed,
      selected: state.menu.selectedIndex === state.tankClasses.options.length,
    })
    this.drawCenteredMiddleText(
      ctx,
      'Back',
      MENU_OPTION_X + MENU_OPTION_WIDTH / 2,
      TANK_SELECT_BACK_Y + MENU_OPTION_HEIGHT / 2 + 1 + (backPressed ? 2 : 0),
      backPressed ? '#fff1a5' : '#f7f3df',
      TEXT_SCALE,
      MENU_OPTION_WIDTH - 28,
    )

    this.drawCenteredText(ctx, 'ENTER SELECT  ESC BACK', arenaCenterX, 406, '#8f8a82', TEXT_SCALE, ARENA_WIDTH - 28)
    ctx.textAlign = 'start'
  }

  private drawEncyclopediaDetailOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const encyclopedia = state.encyclopedia
    if (!encyclopedia) {
      return
    }

    ctx.fillStyle = 'rgba(5, 5, 5, 0.88)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const accent = this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    this.drawMenuPlaque(ctx, arenaCenterX - 122, 64, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, encyclopedia.title, arenaCenterX, 81, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, arenaCenterX - 76, 104, 152, '#7f8b72')

    const summaryMaxWidth = ARENA_WIDTH - 52
    const summaryLines = encyclopedia.summary.flatMap((line) => wrapPixelText(line, summaryMaxWidth, TEXT_SCALE))
    summaryLines.forEach((line, index) => {
      this.drawCenteredText(ctx, line, arenaCenterX, 114 + index * 13, '#d8d4c8', TEXT_SCALE, summaryMaxWidth)
    })

    this.drawEncyclopediaEntries(ctx, state, 148 + Math.max(0, summaryLines.length - 1) * 9)
    this.drawEncyclopediaBackButton(ctx, state, accent)
    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', arenaCenterX, 406, '#8f8a82', TEXT_SCALE, ARENA_WIDTH - 28)

    ctx.textAlign = 'start'
  }

  private drawEncyclopediaEntries(ctx: CanvasRenderingContext2D, state: RenderState, startY: number) {
    const entries = state.encyclopedia?.entries ?? []
    const columnWidth = 176
    const columnGap = 22
    const leftX = ARENA_X + 40
    const rowStep = entries.length > 6 ? 42 : 50
    const entryHeight = rowStep - 6

    entries.forEach((entry, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = leftX + column * (columnWidth + columnGap)
      const y = startY + row * rowStep

      this.drawEncyclopediaVisual(ctx, state, entry.visual, x, y + 1)

      const textX = x + 42
      const textWidth = columnWidth - 46
      drawPixelText(ctx, entry.label.toUpperCase(), textX, y, {
        align: 'left',
        color: '#f7f3df',
        maxWidth: textWidth,
        scale: TEXT_SCALE,
      })

      const descriptionLines = wrapPixelText(entry.description, textWidth, TEXT_SCALE).slice(0, 2)
      descriptionLines.forEach((line, lineIndex) => {
        drawPixelText(ctx, line, textX, y + 12 + lineIndex * 11, {
          align: 'left',
          color: '#bfc4b8',
          maxWidth: textWidth,
          scale: TEXT_SCALE,
        })
      })

      ctx.fillStyle = 'rgba(255, 241, 165, 0.12)'
      ctx.fillRect(x + 42, y + entryHeight, Math.min(textWidth, 92), 1)
    })
  }

  private drawEncyclopediaBackButton(ctx: CanvasRenderingContext2D, state: RenderState, accent: string) {
    const y = 366 + (state.menu.pressedIndex === 0 ? 2 : 0)
    const color = state.menu.pressedIndex === 0 ? '#fff1a5' : '#f7f3df'

    this.drawMenuButton(ctx, MENU_OPTION_X, y, MENU_OPTION_WIDTH, MENU_OPTION_HEIGHT, {
      accent,
      pressed: state.menu.pressedIndex === 0,
      selected: true,
    })
    drawUiSprite(ctx, state.menu.pressedIndex === 0 ? 'menu.selector.pressed' : 'menu.selector', MENU_OPTION_X - 24, y + 6, {
      width: 18,
      height: 18,
      sheet: 'ui32',
    })
    this.drawCenteredMiddleText(ctx, 'Back', MENU_OPTION_X + MENU_OPTION_WIDTH / 2, y + MENU_OPTION_HEIGHT / 2 + 1, color, TEXT_SCALE, MENU_OPTION_WIDTH - 28)
  }

  private drawEncyclopediaVisual(ctx: CanvasRenderingContext2D, state: RenderState, visual: EncyclopediaVisualKind, x: number, y: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(5, 7, 5, 0.7)'
    ctx.fillRect(x + 2, y + 27, 28, 4)

    if (visual === 'player-tank') {
      drawBattlefieldTank(ctx, x + 16, y + 16, 34, 'up', this.getTeamColors(state, state.playerTeam), {
        self: true,
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
    } else if (visual === 'basic-tank' || visual === 'scout-tank' || visual === 'breaker-tank' || visual === 'armored-tank') {
      const direction = visual === 'scout-tank' ? 'right' : visual === 'breaker-tank' ? 'down' : 'left'
      drawBattlefieldTank(ctx, x + 16, y + 16, visual === 'armored-tank' ? 36 : 32, direction, this.getTeamColors(state, state.enemyTeam), {
        armored: visual === 'armored-tank',
        frame: visual === 'scout-tank' ? 1 : 0,
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
    } else if (visual === 'repair' || visual === 'rapid' || visual === 'shield') {
      drawPixelPowerUp(ctx, visual, x + 5, y + 5, 24, state.time)
    } else if (visual === 'relay') {
      drawPixelRelay(ctx, x + 4, y + 12, 24, this.getTeamColors(state, state.playerTeam), 1, {
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
    } else if (visual === 'portable-relay') {
      drawPixelPortableRelay(ctx, x + 3, y + 2, 28, true)
    } else if (visual === 'decoy' || visual === 'mine' || visual === 'noise' || visual === 'tripwire') {
      drawPixelDeployable(ctx, visual, x + 3, y + 4, 28, true)
    } else if (visual === 'steel-trap') {
      drawPixelDeployable(ctx, 'steel', x + 3, y + 4, 28, true)
    } else if (this.isTerrainVisual(visual)) {
      this.drawEncyclopediaTerrainVisual(ctx, visual, x, y, state.time)
    } else {
      this.drawEncyclopediaSymbolVisual(ctx, state, visual, x, y)
    }

    ctx.restore()
  }

  private drawEncyclopediaTerrainVisual(
    ctx: CanvasRenderingContext2D,
    visual: Extract<EncyclopediaVisualKind, TileKind>,
    x: number,
    y: number,
    time: number,
  ) {
    drawPixelGround(ctx, x, y, 32, 0, 0)
    drawPixelTerrainTile(ctx, visual, x, y, 32, {
      col: 0,
      row: 0,
      hp: visual === 'brick' || visual === 'base' || visual === 'radio' || visual === 'depot' ? 3 : 1,
      time,
      waterNeighbors: visual === 'water' ? { up: false, right: false, down: false, left: false } : undefined,
      roadNeighbors: visual === 'road' || visual === 'ammo' ? { up: true, right: true, down: true, left: true } : undefined,
    })
  }

  private drawEncyclopediaSymbolVisual(ctx: CanvasRenderingContext2D, state: RenderState, visual: EncyclopediaVisualKind, x: number, y: number) {
    if (visual === 'campaign') {
      this.drawEncyclopediaTerrainVisual(ctx, 'base', x, y, state.time)
      drawBattlefieldTank(ctx, x + 23, y + 22, 20, 'up', this.getTeamColors(state, state.playerTeam), {
        self: true,
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
      return
    }

    if (visual === 'online' || visual === 'team-battle') {
      drawBattlefieldTank(ctx, x + 11, y + 18, 22, 'right', this.getTeamColors(state, state.playerTeam), {
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
      drawBattlefieldTank(ctx, x + 23, y + 14, 22, 'left', this.getTeamColors(state, state.enemyTeam), {
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
      return
    }

    if (visual === 'defense-base') {
      this.drawEncyclopediaTerrainVisual(ctx, 'base', x, y, state.time)
      return
    }

    if (visual === 'ctf-flag') {
      const colors = this.getTeamColors(state, state.enemyTeam)
      ctx.fillStyle = '#f7f3df'
      ctx.fillRect(x + 12, y + 5, 2, 23)
      ctx.fillStyle = colors.body
      ctx.fillRect(x + 14, y + 6, 14, 9)
      ctx.fillStyle = colors.highlight
      ctx.fillRect(x + 16, y + 8, 8, 2)
      ctx.fillStyle = '#070807'
      ctx.fillRect(x + 9, y + 28, 12, 3)
      return
    }

    if (visual === 'ffa-star') {
      this.drawPixelStar(ctx, x + 16, y + 15, '#ffd35a')
      return
    }

    if (visual === 'assault-core') {
      ctx.fillStyle = '#070807'
      ctx.fillRect(x + 5, y + 5, 22, 22)
      ctx.fillStyle = '#9b1f1f'
      ctx.fillRect(x + 8, y + 8, 16, 16)
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(x + 11, y + 11, 10, 10)
      ctx.fillStyle = '#f7f3df'
      ctx.fillRect(x + 13, y + 13, 6, 6)
      return
    }

    if (visual === 'controls') {
      ctx.fillStyle = '#263023'
      ctx.fillRect(x + 5, y + 7, 22, 18)
      ctx.fillStyle = '#f7f3df'
      ctx.fillRect(x + 15, y + 9, 3, 5)
      ctx.fillRect(x + 15, y + 18, 3, 5)
      ctx.fillRect(x + 9, y + 15, 5, 3)
      ctx.fillRect(x + 19, y + 15, 5, 3)
      ctx.fillStyle = '#fff1a5'
      ctx.fillRect(x + 25, y + 8, 4, 4)
    }
  }

  private drawPixelStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
    ctx.fillStyle = '#070807'
    ctx.fillRect(cx - 2, cy - 11, 4, 22)
    ctx.fillRect(cx - 10, cy - 2, 20, 4)
    ctx.fillStyle = color
    ctx.fillRect(cx - 1, cy - 10, 2, 20)
    ctx.fillRect(cx - 9, cy - 1, 18, 2)
    ctx.fillRect(cx - 5, cy - 5, 10, 10)
    ctx.fillStyle = '#fff7c7'
    ctx.fillRect(cx - 2, cy - 3, 4, 4)
  }

  private isTerrainVisual(visual: EncyclopediaVisualKind): visual is Extract<EncyclopediaVisualKind, TileKind> {
    return visual === 'brick' ||
      visual === 'steel' ||
      visual === 'water' ||
      visual === 'trees' ||
      visual === 'base' ||
      visual === 'radio' ||
      visual === 'depot' ||
      visual === 'road' ||
      visual === 'ammo'
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
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    const barX = arenaCenterX - 112
    const barY = 238
    const barWidth = 224
    const barHeight = 18

    ctx.fillStyle = 'rgba(5, 5, 5, 0.78)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    drawUiSprite(ctx, 'loading.plaque', arenaCenterX - 118, 74, { width: 236, height: 42, sheet: 'ui32', alpha: 0.94 })
    this.drawCenteredText(ctx, `LOADING LEVEL ${targetLevel.id}`, arenaCenterX, 86, this.getTeamColors(state, state.playerTeam).body, TITLE_SCALE)
    this.drawCenteredText(ctx, targetLevel.name, arenaCenterX, 120, '#d8d4c8', TEXT_SCALE, ARENA_WIDTH - 48)

    const treadBob = Math.round(Math.sin(state.time * 9) * 2)
    drawUiSprite(ctx, 'loading.tread', arenaCenterX - 22 + treadBob, 150, { width: 44, height: 44, sheet: 'ui32' })
    drawUiSprite(ctx, 'loading.spark', arenaCenterX + 30 - treadBob, 154, { width: 22, height: 22, sheet: 'ui32', alpha: 0.85 })

    const tip = loading?.tip ?? 'Tightening pixel bolts.'
    this.drawCenteredText(ctx, tip, arenaCenterX, 204, '#f2ead7', TEXT_SCALE, ARENA_WIDTH - 48)

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
      drawUiSprite(ctx, 'loading.ready', arenaCenterX - 16, 265, { width: 32, height: 32, sheet: 'ui32', alpha: 0.98 })
      this.drawCenteredText(ctx, 'READY', arenaCenterX, 300, '#fff1a5', TITLE_SCALE)
      this.drawCenteredText(ctx, 'PRESS ENTER / SPACE TO BEGIN', arenaCenterX, 322, '#f2ead7', TEXT_SCALE)
      this.drawCenteredText(ctx, 'ESC RETURNS TO BRIEFING', arenaCenterX, 340, '#8f8a82', TEXT_SCALE)
    } else {
      this.drawCenteredText(ctx, `${Math.round(progress * 100)}%`, arenaCenterX, 265, '#8f8a82', TEXT_SCALE)
    }

    ctx.textAlign = 'start'
  }

  private drawEquippedModMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save()
    ctx.fillStyle = '#171717'
    ctx.fillRect(x, y, 28, 10)
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(x + 3, y + 4, 6, 2)
    ctx.fillRect(x + 7, y + 6, 2, 2)
    ctx.fillRect(x + 10, y + 2, 15, 2)
    ctx.restore()
  }

  private drawTreadTracks(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    for (const run of this.buildTreadTrackRuns(state.majorMods.tracks)) {
      this.drawTreadTrackRun(ctx, run, camera)
    }

    const latestTrackByTank = new Map<string, TreadTrackSnapshot>()
    const previousByTank = new Map<string, TreadTrackSnapshot>()
    for (const track of state.majorMods.tracks) {
      if (!track.tankId) {
        continue
      }

      const previous = previousByTank.get(track.tankId)
      if (previous) {
        this.drawTreadTurnTrace(ctx, previous, track, camera)
      }
      previousByTank.set(track.tankId, track)
      latestTrackByTank.set(track.tankId, track)
    }

    for (const tank of [state.player, ...state.enemies]) {
      const liveTrack = this.drawLiveTreadTrack(ctx, tank, state, camera)
      const previous = liveTrack?.tankId ? latestTrackByTank.get(liveTrack.tankId) : null
      if (liveTrack && previous) {
        this.drawTreadTurnTrace(ctx, previous, liveTrack, camera)
      }
    }
  }

  private buildTreadTrackRuns(tracks: TreadTrackSnapshot[]) {
    const byTrail = new Map<string, TreadTrackEntry[]>()

    tracks.forEach((track, index) => {
      const key = track.tankId ? `${track.team}:${track.tankId}` : track.id
      const trail = byTrail.get(key)
      if (trail) {
        trail.push({ track, order: index })
      } else {
        byTrail.set(key, [{ track, order: index }])
      }
    })

    const runs: TreadTrackRun[] = []
    for (const trail of byTrail.values()) {
      let current: TreadTrackEntry[] = []
      for (const entry of trail) {
        const previous = current.at(-1)?.track
        if (previous && this.canExtendTreadTrackRun(previous, entry.track)) {
          current.push(entry)
          continue
        }

        if (current.length > 0) {
          runs.push({ tracks: current.map((item) => item.track), order: current[0]?.order ?? 0 })
        }
        current = [entry]
      }

      if (current.length > 0) {
        runs.push({ tracks: current.map((item) => item.track), order: current[0]?.order ?? 0 })
      }
    }

    return runs.sort((a, b) => a.order - b.order)
  }

  private canExtendTreadTrackRun(previous: TreadTrackSnapshot, track: TreadTrackSnapshot) {
    if (
      !previous.tankId ||
      previous.tankId !== track.tankId ||
      previous.dir !== track.dir ||
      previous.team !== track.team ||
      previous.weight !== track.weight ||
      previous.overdrive !== track.overdrive
    ) {
      return false
    }

    const direction = this.traceDirectionVector(previous.dir)
    return previous.col + direction.x === track.col && previous.row + direction.y === track.row
  }

  private drawTreadTrackRun(ctx: CanvasRenderingContext2D, run: TreadTrackRun, camera: BattlefieldCamera) {
    const first = run.tracks[0]
    const last = run.tracks.at(-1)
    if (!first || !last) {
      return
    }

    const direction = this.traceDirectionVector(first.dir)
    const start = worldCellToScreen(camera, first.col, first.row)
    const end = worldCellToScreen(camera, last.col + direction.x, last.row + direction.y)
    const startX = start.x + TILE_SIZE / 2
    const startY = start.y + TILE_SIZE / 2
    const endX = end.x + TILE_SIZE / 2
    const endY = end.y + TILE_SIZE / 2
    const alpha = run.tracks.reduce((total, track) => total + this.getTreadTraceAlpha(track), 0) / run.tracks.length
    const seed = `${first.tankId || first.id}:${first.col}:${first.row}:${first.dir}:run:${run.tracks.length}`

    this.drawTreadTraceSpan(ctx, startX, startY, endX, endY, first.weight, alpha, first.overdrive, seed)
  }

  private drawLiveTreadTrack(
    ctx: CanvasRenderingContext2D,
    tank: Tank,
    state: RenderState,
    camera: BattlefieldCamera,
  ): TreadTrackSnapshot | null {
    const move = tank.move
    if (!move || tank.hp <= 0) {
      return null
    }

    const direction = this.liveTreadTrackDirection(move)
    if (!direction) {
      return null
    }

    const source = worldCellToScreen(camera, move.fromCol, move.fromRow)
    const center = tankCenter(tank)
    const current = this.worldPixelToScreen(camera, center.x, center.y)
    const vector = this.traceDirectionVector(direction)
    const rearOffset = Math.max(6, TANK_SIZE / 2 - 5)
    const startX = source.x + TILE_SIZE / 2 - vector.x * rearOffset
    const startY = source.y + TILE_SIZE / 2 - vector.y * rearOffset
    const endX = current.x - vector.x * rearOffset
    const endY = current.y - vector.y * rearOffset
    const length = Math.hypot(endX - startX, endY - startY)
    if (length < 6) {
      return null
    }

    const weight = this.getTreadTraceWeightForTank(tank)
    const overdrive = tank.faction === 'player' && state.majorMods.overdrive.active
    const alpha = overdrive ? 0.86 : 0.76
    const seed = `live:${tank.id}:${move.fromCol}:${move.fromRow}:${direction}`

    this.drawTreadTraceSpan(ctx, startX, startY, endX, endY, weight, alpha, overdrive, seed, 'butt', false)

    return {
      id: `live-${tank.id}`,
      tankId: tank.id,
      col: move.fromCol,
      row: move.fromRow,
      dir: direction,
      team: tank.team,
      weight,
      age: 0,
      ttl: 1,
      visibility: 1,
      overdrive,
    }
  }

  private liveTreadTrackDirection(move: Tank['move']) {
    if (!move) return null
    if (move.toCol > move.fromCol) return 'right'
    if (move.toCol < move.fromCol) return 'left'
    if (move.toRow > move.fromRow) return 'down'
    if (move.toRow < move.fromRow) return 'up'
    return null
  }

  private getTreadTraceWeightForTank(tank: Tank): TreadTrackSnapshot['weight'] {
    if (tank.classId === 'scout') return 'light'
    if (tank.classId === 'battle' || tank.maxHp >= 5) return 'heavy'
    return 'medium'
  }

  private drawTreadTraceSpan(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    weight: TreadTrackSnapshot['weight'],
    alpha: number,
    overdrive: boolean,
    seed: string,
    cap: CanvasLineCap = 'round',
    includeEndDust = true,
  ) {
    const centerX = (startX + endX) / 2
    const centerY = (startY + endY) / 2
    if (
      !this.isScreenPointNearArena(startX, startY, TILE_SIZE) &&
      !this.isScreenPointNearArena(endX, endY, TILE_SIZE) &&
      !this.isScreenPointNearArena(centerX, centerY, TILE_SIZE)
    ) {
      return
    }

    const treadLength = Math.hypot(endX - startX, endY - startY)
    if (treadLength < 4) {
      return
    }

    const heavy = weight === 'heavy'
    const light = weight === 'light'
    const treadWidth = heavy ? 7 : light ? 5 : 6
    const treadOffset = heavy ? 8 : light ? 6 : 7
    const baseColor = overdrive ? '#4f3e20' : '#343127'
    const edgeColor = overdrive ? '#1d1407' : '#15130d'
    const lugColor = overdrive ? '#ba8c3d' : '#8f8763'

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(Math.atan2(endY - startY, endX - startX))
    this.drawTreadTraceDust(ctx, treadLength, treadWidth, treadOffset, alpha, overdrive, seed, includeEndDust)
    this.drawTreadTraceBelt(ctx, -treadOffset, treadLength, treadWidth, alpha, baseColor, edgeColor, lugColor, seed, 0, cap)
    this.drawTreadTraceBelt(ctx, treadOffset, treadLength, treadWidth, alpha, baseColor, edgeColor, lugColor, seed, 1, cap)
    ctx.restore()
  }

  private drawTreadTurnTrace(
    ctx: CanvasRenderingContext2D,
    previous: TreadTrackSnapshot,
    track: TreadTrackSnapshot,
    camera: BattlefieldCamera,
  ) {
    const previousVector = this.traceDirectionVector(previous.dir)
    const currentVector = this.traceDirectionVector(track.dir)
    if (
      previous.col + previousVector.x !== track.col ||
      previous.row + previousVector.y !== track.row ||
      previousVector.x * currentVector.x + previousVector.y * currentVector.y !== 0
    ) {
      return
    }

    const point = worldCellToScreen(camera, track.col, track.row)
    if (!this.isScreenPointNearArena(point.x + TILE_SIZE / 2, point.y + TILE_SIZE / 2, TILE_SIZE)) {
      return
    }

    const alpha = Math.min(this.getTreadTraceAlpha(previous), this.getTreadTraceAlpha(track))
    const heavy = track.weight === 'heavy'
    const light = track.weight === 'light'
    const width = heavy ? 7 : light ? 5 : 6
    const offset = heavy ? 8 : light ? 6 : 7
    const reach = heavy ? 19 : light ? 15 : 17
    const baseColor = track.overdrive ? '#4f3e20' : '#343127'
    const edgeColor = track.overdrive ? '#1d1407' : '#15130d'
    const lugColor = track.overdrive ? '#ba8c3d' : '#8f8763'
    const dustColor = track.overdrive ? '#916d2d' : '#675f45'
    const seed = `${previous.id}:${track.id}:turn`
    const previousNormal = { x: -previousVector.y, y: previousVector.x }
    const currentNormal = { x: -currentVector.y, y: currentVector.x }

    ctx.save()
    ctx.translate(point.x + TILE_SIZE / 2, point.y + TILE_SIZE / 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const side of [-1, 1]) {
      const startX = -previousVector.x * reach + previousNormal.x * side * offset
      const startY = -previousVector.y * reach + previousNormal.y * side * offset
      const endX = currentVector.x * reach + currentNormal.x * side * offset
      const endY = currentVector.y * reach + currentNormal.y * side * offset
      const controlX = (previousNormal.x + currentNormal.x) * side * offset * 0.55
      const controlY = (previousNormal.y + currentNormal.y) * side * offset * 0.55

      ctx.globalAlpha = alpha * 0.52
      ctx.strokeStyle = edgeColor
      ctx.lineWidth = width + 5
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(controlX, controlY, endX, endY)
      ctx.stroke()

      ctx.globalAlpha = alpha * 0.74
      ctx.strokeStyle = baseColor
      ctx.lineWidth = width + 2
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(controlX, controlY, endX, endY)
      ctx.stroke()

      this.drawTreadTurnLugs(ctx, startX, startY, controlX, controlY, endX, endY, width, alpha, lugColor)
    }

    ctx.globalAlpha = alpha * 0.36
    ctx.fillStyle = dustColor
    for (let i = 0; i < 22; i++) {
      const x = Math.round(-reach - 2 + this.traceNoise(seed, i) * (reach * 2 + 4))
      const y = Math.round(-reach - 2 + this.traceNoise(seed, i + 40) * (reach * 2 + 4))
      const speckWidth = this.traceNoise(seed, i + 80) > 0.7 ? 2 : 1
      ctx.fillRect(x, y, speckWidth, 1)
    }
    ctx.restore()
  }

  private drawTreadTurnLugs(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    controlX: number,
    controlY: number,
    endX: number,
    endY: number,
    width: number,
    alpha: number,
    color: string,
  ) {
    ctx.globalAlpha = alpha * 0.68
    ctx.strokeStyle = color
    ctx.lineWidth = 1.1
    ctx.lineCap = 'square'
    for (const t of [0.24, 0.5, 0.76]) {
      const inv = 1 - t
      const x = inv * inv * startX + 2 * inv * t * controlX + t * t * endX
      const y = inv * inv * startY + 2 * inv * t * controlY + t * t * endY
      const tangentX = 2 * inv * (controlX - startX) + 2 * t * (endX - controlX)
      const tangentY = 2 * inv * (controlY - startY) + 2 * t * (endY - controlY)
      const length = Math.hypot(tangentX, tangentY) || 1
      const normalX = -tangentY / length
      const normalY = tangentX / length
      const lugHalf = Math.max(2, width / 2 - 1)
      ctx.beginPath()
      ctx.moveTo(x - normalX * lugHalf, y - normalY * lugHalf)
      ctx.lineTo(x + normalX * lugHalf, y + normalY * lugHalf)
      ctx.stroke()
    }
  }

  private getTreadTraceAlpha(track: TreadTrackSnapshot) {
    return clamp(1 - track.age / Math.max(0.01, track.ttl), 0, 1) * clamp(track.visibility, 0, 1) * (track.overdrive ? 0.96 : 0.86)
  }

  private traceDirectionVector(direction: Tank['dir']) {
    if (direction === 'right') return { x: 1, y: 0 }
    if (direction === 'down') return { x: 0, y: 1 }
    if (direction === 'left') return { x: -1, y: 0 }
    return { x: 0, y: -1 }
  }

  private drawTreadTraceBelt(
    ctx: CanvasRenderingContext2D,
    yCenter: number,
    length: number,
    width: number,
    alpha: number,
    baseColor: string,
    edgeColor: string,
    lugColor: string,
    seed: string,
    beltIndex: number,
    cap: CanvasLineCap = 'round',
  ) {
    const half = length / 2
    const top = Math.round(yCenter - width / 2)
    ctx.lineCap = cap
    ctx.lineJoin = 'round'
    ctx.globalAlpha = alpha * 0.7
    ctx.strokeStyle = edgeColor
    ctx.lineWidth = width + 4
    ctx.beginPath()
    ctx.moveTo(-half, yCenter)
    ctx.lineTo(half, yCenter)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.92
    ctx.strokeStyle = baseColor
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(-half, yCenter)
    ctx.lineTo(half, yCenter)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.56
    ctx.strokeStyle = edgeColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-half + 2, top)
    ctx.lineTo(half - 2, top)
    ctx.moveTo(-half + 2, top + width - 1)
    ctx.lineTo(half - 2, top + width - 1)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = lugColor
    ctx.lineWidth = 1.15
    ctx.lineCap = 'square'
    const phase = beltIndex === 0 ? 0 : 2
    for (let x = Math.round(-half + 2 + phase); x <= half - 2; x += 5) {
      const jitter = Math.round(this.traceNoise(seed, beltIndex * 100 + x) - 0.5)
      const x0 = x + jitter
      ctx.beginPath()
      ctx.moveTo(x0 - 3, top + width - 1)
      ctx.lineTo(x0 + 1, top + 1)
      ctx.moveTo(x0 + 1, top + 1)
      ctx.lineTo(x0 + 5, top + width - 1)
      ctx.stroke()
    }

    ctx.globalAlpha = alpha * 0.38
    ctx.fillStyle = edgeColor
    for (let x = Math.round(-half + 4 + phase); x <= half - 4; x += 10) {
      ctx.fillRect(x, top + 1, 1, width - 2)
    }
  }

  private drawTreadTraceDust(
    ctx: CanvasRenderingContext2D,
    length: number,
    width: number,
    offset: number,
    alpha: number,
    overdrive: boolean,
    seed: string,
    includeEndDust = true,
  ) {
    const half = length / 2
    const lengthFactor = Math.max(1, length / TILE_SIZE)
    const speckCount = Math.round(24 * lengthFactor)
    const dustMargin = includeEndDust ? 4 : 0
    ctx.globalAlpha = alpha * 0.46
    ctx.fillStyle = overdrive ? '#916d2d' : '#675f45'
    for (let i = 0; i < speckCount; i++) {
      const x = Math.round(-half - dustMargin + this.traceNoise(seed, i) * (length + dustMargin * 2))
      const side = this.traceNoise(seed, i + 40) < 0.5 ? -1 : 1
      const y = Math.round(side * (offset + width / 2 + this.traceNoise(seed, i + 80) * 4))
      const speckWidth = this.traceNoise(seed, i + 120) > 0.72 ? 2 : 1
      ctx.fillRect(x, y, speckWidth, 1)
    }

    if (!includeEndDust) {
      return
    }

    ctx.globalAlpha = alpha * 0.28
    for (let i = 0; i < 10; i++) {
      const end = this.traceNoise(seed, i + 160) < 0.5 ? -1 : 1
      const x = Math.round(end * (half - this.traceNoise(seed, i + 200) * 5))
      const y = Math.round((this.traceNoise(seed, i + 240) - 0.5) * (offset * 2 + width))
      ctx.fillRect(x, y, this.traceNoise(seed, i + 280) > 0.62 ? 2 : 1, 1)
    }
  }

  private traceNoise(seed: string, index: number) {
    let hash = 2166136261 ^ index
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i) + index * 31
      hash = Math.imul(hash, 16777619)
    }
    hash ^= hash >>> 13
    hash = Math.imul(hash, 1274126177)
    return ((hash >>> 0) % 1000) / 1000
  }

  private drawMajorModStructures(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    this.drawPontoonBridge(ctx, state, camera)
    this.drawHedgehog(ctx, state, camera)
    this.drawEmpEmitter(ctx, state, camera)
  }

  private drawPontoonBridge(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (!state.majorMods.pontoon.active) {
      return
    }

    ctx.save()
    for (const cell of state.majorMods.pontoon.cells) {
      if (!this.isVisibleCell(state, cell.x, cell.y)) {
        continue
      }
      const point = worldCellToScreen(camera, cell.x, cell.y)
      ctx.save()
      ctx.translate(point.x + TILE_SIZE / 2, point.y + TILE_SIZE / 2)
      ctx.rotate(state.majorMods.pontoon.dir === 'left' || state.majorMods.pontoon.dir === 'right' ? Math.PI / 2 : 0)
      ctx.fillStyle = 'rgba(9, 16, 18, 0.7)'
      ctx.fillRect(-12, -15, 24, 30)
      ctx.fillStyle = '#4b3a23'
      ctx.fillRect(-13, -12, 5, 24)
      ctx.fillRect(8, -12, 5, 24)
      ctx.fillStyle = '#9a7040'
      for (let y = -10; y <= 10; y += 5) {
        ctx.fillRect(-10, y, 20, 3)
      }
      ctx.fillStyle = '#e0b46d'
      ctx.fillRect(-8, -9, 16, 1)
      ctx.fillRect(-8, 6, 16, 1)
      ctx.restore()
    }
    ctx.restore()
  }

  private drawHedgehog(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const hedgehog = state.majorMods.hedgehog
    if (!hedgehog.active || hedgehog.col === null || hedgehog.row === null) {
      return
    }
    if (!this.isVisibleCell(state, hedgehog.col, hedgehog.row)) {
      return
    }

    const point = worldCellToScreen(camera, hedgehog.col, hedgehog.row)
    const cx = point.x + TILE_SIZE / 2
    const cy = point.y + TILE_SIZE / 2
    ctx.save()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#171717'
    ctx.beginPath()
    ctx.moveTo(cx - 11, cy - 11)
    ctx.lineTo(cx + 11, cy + 11)
    ctx.moveTo(cx + 11, cy - 11)
    ctx.lineTo(cx - 11, cy + 11)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = hedgehog.trappedTankId ? '#fff1a5' : '#cfd3d8'
    ctx.beginPath()
    ctx.moveTo(cx - 11, cy - 11)
    ctx.lineTo(cx + 11, cy + 11)
    ctx.moveTo(cx + 11, cy - 11)
    ctx.lineTo(cx - 11, cy + 11)
    ctx.stroke()
    for (let index = 0; index < hedgehog.hitsRequired; index += 1) {
      ctx.fillStyle = '#171717'
      ctx.fillRect(point.x + 5 + index * 4, point.y + 27, 3, 3)
      ctx.fillStyle = index < hedgehog.hitsRemaining ? '#ffd35a' : '#4f4b43'
      ctx.fillRect(point.x + 6 + index * 4, point.y + 28, 1, 1)
    }
    ctx.restore()
  }

  private drawEmpEmitter(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const emitter = state.majorMods.emp
    if (!emitter.active || emitter.col === null || emitter.row === null) {
      return
    }
    if (!this.isVisibleCell(state, emitter.col, emitter.row)) {
      return
    }

    const point = worldCellToScreen(camera, emitter.col, emitter.row)
    const cx = point.x + TILE_SIZE / 2
    const cy = point.y + TILE_SIZE / 2
    ctx.save()
    const idlePhase = (state.time * 0.7) % 1
    ctx.globalAlpha = 0.1 + (1 - idlePhase) * 0.12
    ctx.strokeStyle = '#86f4ff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, (0.8 + idlePhase * 0.9) * TILE_SIZE, 0, Math.PI * 2)
    ctx.stroke()

    if (emitter.disrupting) {
      const pulse = clamp(emitter.disruptionProgress, 0, 1)
      for (let index = 0; index < 3; index += 1) {
        const offset = index / 3
        const progress = (pulse + offset) % 1
        ctx.globalAlpha = clamp((1 - progress) * 0.34, 0, 0.34)
        ctx.strokeStyle = index === 0 ? '#dffcff' : '#86f4ff'
        ctx.lineWidth = index === 0 ? 2 : 1
        ctx.beginPath()
        ctx.arc(cx, cy, (0.4 + progress * emitter.radius) * TILE_SIZE, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#101515'
    ctx.fillRect(point.x + 10, point.y + 10, 12, 12)
    ctx.fillStyle = emitter.disrupting ? '#dffcff' : '#86f4ff'
    ctx.fillRect(point.x + 13, point.y + 5, 6, 10)
    ctx.fillRect(point.x + 13, point.y + 17, 6, 8)
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(point.x + 14, point.y + 13, 4, 4)
    ctx.restore()
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
      const x = Math.max(ARENA_X + 44, Math.min(ARENA_X + ARENA_WIDTH - 44, notice.x ?? ARENA_X + ARENA_WIDTH / 2))
      const y = Math.max(ARENA_Y + 18, Math.min(ARENA_Y + ARENA_HEIGHT - 24, (notice.y ?? 74) - progress * 18 - index * 13))
      const width = Math.min(180, Math.max(72, Math.ceil(measurePixelText(notice.text, TEXT_SCALE)) + 16))

      ctx.globalAlpha = alpha
      ctx.fillStyle = 'rgba(3, 5, 4, 0.86)'
      ctx.fillRect(Math.round(x - width / 2), Math.round(y - 7), width, 14)
      drawPixelText(ctx, notice.text, Math.round(x), Math.round(y), {
        align: 'center',
        baseline: 'middle',
        color: notice.kind === 'repair' ? '#bff0a2' : notice.kind === 'reward' || notice.kind === 'ammo' ? '#fff1a5' : '#f2ead7',
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

    drawTouchControlsOverlay(ctx, state.feedback.heldButtons, { pause: true })
  }
}
