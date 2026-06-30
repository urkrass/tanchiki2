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
import type { OnlineBattleClient } from './onlineClient.ts'
import type { InterpolatedOnlineSnapshot } from './onlineInterpolation.ts'
import type { VisualOnlinePlayer } from './onlineInterpolation.ts'
import { ONLINE_MAP_COLS, ONLINE_MAP_ROWS, getOnlineTargetCamera, type OnlineCameraState } from './onlineCamera.ts'
import { ONLINE_MINIMAP_CELL_SIZE, ONLINE_MINIMAP_COLS, ONLINE_MINIMAP_ROWS, buildOnlineMinimapModel } from './onlineMinimap.ts'
import type { WaterNeighbors } from '../game/types.ts'
import type { Direction, MultiplayerSnapshot, Retranslator, Team, TileKind, VisionCircle } from '../../packages/shared/src/index.ts'

const FONT = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
const SMALL_FONT = '8px ui-monospace, SFMono-Regular, Consolas, monospace'
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
  private fogLayer: HTMLCanvasElement | null = null
  private minimapFogLayer: HTMLCanvasElement | null = null

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

    const camera = state.camera?.current ?? this.getCamera(state.snapshot, state.visual)
    this.drawBattle(ctx, state.snapshot, state.visual, camera)
    this.drawHud(ctx, state.snapshot, state.connection, state.radioOpen, state.radioDraft, state.camera)
    this.drawTouchControls(ctx, state.touchControlsVisible)
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

  private drawBattle(
    ctx: CanvasRenderingContext2D,
    snapshot: MultiplayerSnapshot,
    visual: InterpolatedOnlineSnapshot | null,
    camera: BattlefieldCamera,
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
    snapshot.chat.slice(-2).forEach((message, index) => {
      ctx.fillStyle = this.getTeamColors(message.team).body
      ctx.fillText(`${message.name}:`, HUD_X + 8, chatY + index * 18)
      ctx.fillStyle = '#111'
      ctx.fillText(message.text.slice(0, 14), HUD_X + 8, chatY + index * 18 + 8)
    })

    if (camera) {
      this.drawMinimap(ctx, snapshot, camera.current)
    }
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
      this.fillMiniPoint(ctx, mapX, mapY, relay.col, relay.row, 3)
    }

    for (const ping of model.pings) {
      ctx.fillStyle = this.getTeamColors(ping.team).bullet
      this.fillMiniPoint(ctx, mapX, mapY, ping.col, ping.row, 2)
    }

    for (const player of model.players) {
      ctx.fillStyle = player.self ? this.getTeamColors(player.team).highlight : this.getTeamColors(player.team).body
      this.fillMiniPoint(ctx, mapX, mapY, player.col, player.row, player.self ? 3 : 2)
    }

    this.drawMinimapCircularFog(ctx, model.visionCircles, mapX, mapY, mapWidth, mapHeight)

    for (const memory of model.lastKnown) {
      ctx.fillStyle = this.getTeamColors(memory.team).highlight
      this.fillMiniPoint(ctx, mapX, mapY, memory.col, memory.row, 1)
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
    ctx.fillRect(
      mapX + col * ONLINE_MINIMAP_CELL_SIZE + offset,
      mapY + row * ONLINE_MINIMAP_CELL_SIZE + offset,
      size,
      size,
    )
  }

  private minimapTerrainColor(kind: TileKind) {
    if (kind === 'brick') return '#8b6536'
    if (kind === 'steel') return '#9ea59f'
    if (kind === 'water') return '#237aa6'
    if (kind === 'trees') return '#1f4a27'
    if (kind === 'base') return '#d9d098'
    return '#2f5132'
  }

  private drawTouchControls(ctx: CanvasRenderingContext2D, visible: boolean) {
    if (!visible) {
      return
    }

    ctx.save()
    ctx.globalAlpha = 0.42
    const drewSprites =
      drawUiSprite(ctx, 'touch.up', 59, 325, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.down', 59, 377, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.left', 33, 351, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.right', 85, 351, { width: 42, height: 42, sheet: 'ui32' }) &&
      drawUiSprite(ctx, 'touch.fire', 324, 340, { width: 64, height: 64, sheet: 'ui32' })

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
