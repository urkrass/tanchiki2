import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  BULLET_SIZE,
  DEPLOYABLE_ALERT_TTL,
  DEPLOYABLE_PLACE_SECONDS,
  GARAGE_BACK_Y,
  GARAGE_DESCRIPTION_HEIGHT,
  GARAGE_DESCRIPTION_WIDTH,
  GARAGE_DESCRIPTION_X,
  GARAGE_DESCRIPTION_Y,
  GARAGE_MOD_TAB_GAP,
  GARAGE_MOD_TAB_SIZE,
  GARAGE_MOD_TAB_X,
  GARAGE_MOD_TAB_Y,
  GARAGE_OVERVIEW_HEIGHT,
  GARAGE_OVERVIEW_STEP,
  GARAGE_OVERVIEW_WIDTH,
  GARAGE_OVERVIEW_X,
  GARAGE_OVERVIEW_Y,
  HUD_WIDTH,
  HUD_X,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  LEVEL_SELECT_OPTION_HEIGHT,
  LEVEL_SELECT_OPTION_STEP,
  LEVEL_SELECT_OPTION_Y,
  MENU_OPTION_HEIGHT,
  MENU_OPTION_STEP,
  MENU_OPTION_WIDTH,
  MENU_OPTION_X,
  MENU_OPTION_Y,
  ENEMY_BULLET_SPEED,
  PLAYER_BULLET_SPEED,
  TANK_SIZE,
  TANK_SELECT_ARROW_HEIGHT,
  TANK_SELECT_ARROW_WIDTH,
  TANK_SELECT_ARROW_Y,
  TANK_SELECT_BACK_Y,
  TANK_SELECT_CONTENT_WIDTH,
  TANK_SELECT_CONTENT_X,
  TANK_SELECT_DESCRIPTION_HEIGHT,
  TANK_SELECT_DESCRIPTION_Y,
  TANK_SELECT_LEFT_ARROW_X,
  TANK_SELECT_PLAYBACK_CONTROL_GAP,
  TANK_SELECT_PLAYBACK_CONTROL_SIZE,
  TANK_SELECT_PLAYBACK_CONTROL_X,
  TANK_SELECT_PLAYBACK_CONTROL_Y,
  TANK_SELECT_RIGHT_ARROW_X,
  TANK_SELECT_THEATER_HEIGHT,
  TANK_SELECT_THEATER_FOG_HEIGHT,
  TANK_SELECT_THEATER_FOG_WIDTH,
  TANK_SELECT_THEATER_FOG_X,
  TANK_SELECT_THEATER_FOG_Y,
  TANK_SELECT_THEATER_Y,
  TILE_SIZE,
  clamp,
  tankCenter,
} from './constants.ts'
import type { TanchikiGame } from './game.ts'
import type {
  BattlefieldPropSnapshot,
  EncyclopediaVisualKind,
  LevelReadabilityMarker,
  MajorModKind,
  MajorModPresentation,
  OfflineVisionCircle,
  PowerUpKind,
  RenderState,
  RoadNeighbors,
  Tank,
  TankClassPresentation,
  Team,
  TileKind,
  TreadTrackSnapshot,
  TutorialSpeaker,
  WaterNeighbors,
} from './types.ts'
import {
  drawPixelDeployable,
  drawPixelEnemyMarker,
  drawPixelFlag,
  drawPixelGround,
  drawPixelPowerUp,
  drawPixelPortableRelay,
  drawPixelRelay,
  drawPixelTankStatusChannels,
  drawPixelTerrainTile,
  getTankVisualSize,
  type PixelTeamPalette,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import { drawUiSprite, type UiSpriteId } from './uiAtlas.ts'
import { drawTouchControlsOverlay } from './touchControlsRender.ts'
import { drawPixelText, measurePixelText, wrapPixelText } from './pixelText.ts'
import { drawBattlefieldPropAtlasSprite } from './battlefieldPropAtlas.ts'
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
import {
  getBattlefieldPropFogClipCells,
  getBattlefieldPropDefinition,
  getBattlefieldPropPlaceholderPlan,
  getBattlefieldPropRenderBounds,
  type BattlefieldPropPlaceholderPlan,
} from './battlefieldProps.ts'
import { getBattlefieldPropAffordance } from './battlefieldPropAffordances.ts'
import { terrainDefinition } from './terrain.ts'
import { getCtfHudModel } from './hudCtfStatus.ts'
import { getOverdriveHudModel } from './hudPlayerStatus.ts'
import { getCarriedFlagPlacement } from './ctfFlag.ts'
import { TUTORIAL_BRIEFING_OFFICER } from './tutorial.ts'
import { TUTORIAL_RADIO_PANEL } from './tutorialRadio.ts'
import { getClassEquipmentHudModel, getUniversalRelayHudModel } from './classEquipmentHud.ts'
import { drawClassEquipmentHudStrip, drawEquipmentKeycap } from './classEquipmentHudRender.ts'
import {
  drawClassEquipmentIcon,
  drawClassShellProjectile,
} from './classEquipmentVisual.ts'
import {
  ENGINEER_KIT_SHOWCASE_TIMING,
  SCOUT_DECOY_SHOWCASE_TIMING,
  SCOUT_WIRE_SHOWCASE_TIMING,
  getEngineerKitShowcaseMotion,
  getScoutDecoyEnemyApproachMotion,
  getScoutDecoyRelayPresentation,
  getScoutDecoyShowcasePhase,
  getScoutWireSignalWaves,
  getScoutWireShowcasePhase,
  getScoutWireShowcaseMotion,
  getTankClassShowcaseFireCadence,
  getTankClassShowcaseDuelOutcome,
  getTankClassShowcaseMovementDuration,
  getTankClassShowcaseSceneTime,
  getTankClassShowcaseSplashOutcome,
  getTankClassShowcaseTimedProgress,
  getTankClassShowcaseTravelDuration,
} from './tankClassShowcase.ts'
import { getTankClassDescriptionModel } from './tankClassDescription.ts'

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
  private readonly touchSideRailsActive: () => boolean
  private fogLayer: HTMLCanvasElement | null = null
  private lastRelayVisionCircles: OfflineVisionCircle[] = []

  constructor(canvas: HTMLCanvasElement, game: TanchikiGame, touchSideRailsActive: () => boolean = () => false) {
    this.game = game
    this.touchSideRailsActive = touchSideRailsActive
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
    this.drawTutorialPresentation(ctx, state)
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
    this.drawBattlefieldProps(ctx, state, camera)
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
    this.drawMajorModPlacementPreview(ctx, state, camera)
    this.drawCarriedFlag(ctx, state, camera)

    this.drawTank(ctx, state.player, state, camera)
    this.drawPlayerReloadMeter(ctx, state, camera)

    for (const enemy of state.enemies) {
      this.drawTank(ctx, enemy, state, camera)
    }

    this.drawSoftCoverTankOverlays(ctx, state, camera)
    this.drawTankStatusChannels(ctx, state, camera)

    for (const bullet of state.bullets) {
      const point = this.worldPixelToScreen(camera, bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2)
      if (!this.isScreenPointNearArena(point.x, point.y, 12)) {
        continue
      }
      if (bullet.classId) {
        drawClassShellProjectile(
          ctx,
          Math.round(point.x),
          Math.round(point.y),
          bullet.dir,
          bullet.classId,
          this.getTeamColors(state, bullet.team).bullet,
          Math.floor(state.time * 14),
        )
      } else {
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
      if (particle.visual === 'shield-impact') {
        const progress = 1 - clamp(particle.life / 0.48, 0, 1)
        const radius = 15 + Math.round(progress * 5)
        const fade = clamp(particle.life / 0.18, 0, 1)
        ctx.globalAlpha = fade * 0.78
        ctx.strokeStyle = '#173d46'
        ctx.lineWidth = 3
        for (let segment = 0; segment < 4; segment += 1) {
          const start = segment * Math.PI / 2 + 0.18
          ctx.beginPath()
          ctx.arc(px, py, radius, start, start + Math.PI / 2 - 0.36)
          ctx.stroke()
        }
        ctx.globalAlpha = fade
        ctx.strokeStyle = particle.color
        ctx.lineWidth = 1
        for (let segment = 0; segment < 4; segment += 1) {
          const start = segment * Math.PI / 2 + 0.18
          ctx.beginPath()
          ctx.arc(px, py, radius, start, start + Math.PI / 2 - 0.36)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        continue
      }
      if (particle.visual === 'smoke') {
        ctx.globalAlpha = alpha * 0.42
        ctx.fillStyle = '#242824'
        ctx.fillRect(px - 3, py - 2, 7, 6)
        ctx.fillStyle = particle.color
        ctx.fillRect(px - 2, py - 3, 4, 4)
        ctx.globalAlpha = 1
        continue
      }
      if (particle.visual === 'dust') {
        ctx.globalAlpha = alpha * 0.62
        ctx.fillStyle = '#3c3327'
        ctx.fillRect(px - 3, py, 7, 3)
        ctx.fillStyle = particle.color
        ctx.fillRect(px - 1, py - 2, 5, 3)
        ctx.globalAlpha = 1
        continue
      }
      if (particle.visual === 'he-fragment') {
        const length = 7
        const magnitude = Math.max(1, Math.hypot(particle.vx, particle.vy))
        const dx = Math.round((particle.vx / magnitude) * length)
        const dy = Math.round((particle.vy / magnitude) * length)
        ctx.globalAlpha = alpha * 0.55
        ctx.strokeStyle = '#17130c'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(px - dx, py - dy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = particle.color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px - dx, py - dy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.fillStyle = '#fff1b0'
        ctx.fillRect(px - 1, py - 1, 2, 2)
        ctx.globalAlpha = 1
        continue
      }
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

    this.drawDroppedFlagSignal(ctx, state, camera)
    this.drawTerrainEvidence(ctx, state, camera)
    this.drawPortableSignalWaves(ctx, state, camera)
    this.drawPortableSignalContacts(ctx, state, camera)
    this.drawDeployableAlerts(ctx, state, camera)

    for (const memory of state.lastKnown) {
      drawBattlefieldLastKnown(ctx, camera, memory.col, memory.row, this.getTeamColors(state, memory.team).highlight)
    }

    this.drawPortableRelayHoldPrompt(ctx, state, camera)
    this.drawDeployableHoldPrompt(ctx, state, camera)
    this.drawTutorialActionCue(ctx, state, camera)

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

      const hostileSource = wave.sourceTeam && wave.sourceTeam !== state.playerTeam
      this.drawPortableSignalWaveTrail(
        ctx,
        from.x,
        from.y,
        to.x,
        to.y,
        alpha,
        Boolean(hostileSource),
        wave.bounces,
      )
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawPortableSignalWaveTrail(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    alpha: number,
    hostileSource: boolean,
    bounces: number,
  ) {
    ctx.globalAlpha = hostileSource
      ? Math.min(0.62, alpha + 0.12)
      : alpha
    ctx.strokeStyle = hostileSource
      ? '#ff5c6c'
      : bounces > 0
        ? '#f7f2dd'
        : '#f2f5ee'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(fromX), Math.round(fromY))
    ctx.lineTo(Math.round(toX), Math.round(toY))
    ctx.stroke()
  }

  private drawPortableRelay(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera, visible: Set<string>) {
    for (const relay of state.portableRelay.relays) {
      if (!visible.has(battlefieldCellKey(relay.col, relay.row))) {
        continue
      }

      const point = worldCellToScreen(camera, relay.col, relay.row)
      drawPixelPortableRelay(
        ctx,
        point.x,
        point.y,
        BATTLEFIELD_TILE_SIZE,
        state.portableRelay.waveCount > 0,
        state.time,
        relay.col * 0.11 + relay.row * 0.07,
      )
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
      const cx = Math.round(point.x)
      const cy = Math.round(point.y)
      this.drawPortableSignalContactGlyph(ctx, contact.kind, cx, cy)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawPortableSignalContactGlyph(
    ctx: CanvasRenderingContext2D,
    kind: 'hostile' | 'wall',
    cx: number,
    cy: number,
  ) {
    ctx.strokeStyle = kind === 'hostile' ? '#ff3346' : '#f2f5ee'
    ctx.lineWidth = 1
    if (kind === 'hostile') {
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
      return
    }

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

      this.drawDeployableAlertGlyph(
        ctx,
        cx,
        cy,
        alert.kind,
        alpha,
      )
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawDeployableAlertGlyph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    kind: 'noise' | 'steel' | 'tripwire',
    alpha: number,
  ) {
    ctx.globalAlpha = alpha
    ctx.strokeStyle = kind === 'steel' ? '#ff3346' : '#ffd35a'
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

  private drawTerrainEvidence(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.terrainEvidence.length === 0) {
      return
    }

    ctx.save()
    ctx.lineWidth = 1
    for (const evidence of state.terrainEvidence) {
      const point = worldCellToScreen(camera, evidence.col, evidence.row)
      const cx = Math.round(point.x + BATTLEFIELD_TILE_SIZE / 2)
      const cy = Math.round(point.y + BATTLEFIELD_TILE_SIZE / 2)
      if (!this.isScreenPointNearArena(cx, cy, 24)) {
        continue
      }

      const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
      const alpha = clamp((1 - progress) * evidence.strength, 0, 0.82)
      if (alpha <= 0.04) {
        continue
      }

      if (evidence.kind === 'echo') {
        this.drawEchoEvidenceWave(ctx, evidence, cx, cy, alpha)
        continue
      }

      const color = this.getTerrainEvidenceColor(evidence.kind)
      const radius = evidence.kind === 'ricochet' ? 9 : 7
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#050505'
      ctx.strokeRect(cx - radius - 1, cy - radius - 1, radius * 2 + 2, radius * 2 + 2)
      ctx.strokeStyle = color

      if (evidence.kind === 'dust') {
        this.drawDirectionalEvidenceTrail(ctx, evidence, cx, cy, color)
      } else if (evidence.kind === 'ricochet') {
        ctx.beginPath()
        ctx.moveTo(cx - radius, cy - radius)
        ctx.lineTo(cx + radius, cy + radius)
        ctx.moveTo(cx + radius, cy - radius)
        ctx.lineTo(cx - radius, cy + radius)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(cx - radius, cy)
        ctx.lineTo(cx - 3, cy)
        ctx.moveTo(cx + 3, cy)
        ctx.lineTo(cx + radius, cy)
        ctx.moveTo(cx, cy - radius)
        ctx.lineTo(cx, cy - 3)
        ctx.moveTo(cx, cy + 3)
        ctx.lineTo(cx, cy + radius)
        ctx.stroke()
      }

      if (alpha > 0.36) {
        drawPixelText(ctx, evidence.label, cx, cy + radius + 4, {
          align: 'center',
          color,
          maxWidth: 46,
          scale: TEXT_SCALE,
          shadowColor: '#050505',
        })
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawEchoEvidenceWave(
    ctx: CanvasRenderingContext2D,
    evidence: RenderState['terrainEvidence'][number],
    cx: number,
    cy: number,
    alpha: number,
  ) {
    const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
    const maxRadius = 58 + evidence.strength * 24

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineWidth = 1
    for (const phase of [0, 0.18, 0.36]) {
      const ringProgress = progress - phase
      if (ringProgress < 0 || ringProgress > 1) {
        continue
      }

      const radius = 5 + ringProgress * maxRadius
      const ringAlpha = clamp(alpha * (1 - ringProgress) * (phase === 0 ? 0.72 : 0.48), 0, 0.62)
      if (ringAlpha <= 0.03) {
        continue
      }

      this.drawSegmentedEchoRing(ctx, cx, cy, radius, ringAlpha, phase === 0 ? '#dffcff' : '#86f4ff')
    }
    ctx.restore()
  }

  private drawSegmentedEchoRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    alpha: number,
    color: string,
  ) {
    const segments = radius > 42 ? 10 : radius > 22 ? 8 : 6
    const step = (Math.PI * 2) / segments
    const arc = step * 0.58
    const rotation = radius * 0.013

    ctx.globalAlpha = alpha * 0.44
    ctx.strokeStyle = '#050505'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let index = 0; index < segments; index += 1) {
      const start = rotation + index * step
      ctx.arc(cx, cy, radius, start, start + arc)
    }
    ctx.stroke()

    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = radius > 48 ? 1.4 : 1.2
    ctx.beginPath()
    for (let index = 0; index < segments; index += 1) {
      const start = rotation + index * step
      ctx.arc(cx, cy, radius, start, start + arc)
    }
    ctx.stroke()
  }

  private drawDirectionalEvidenceTrail(
    ctx: CanvasRenderingContext2D,
    evidence: RenderState['terrainEvidence'][number],
    cx: number,
    cy: number,
    color: string,
  ) {
    const vector = evidence.dir ? this.traceDirectionVector(evidence.dir) : { x: 0, y: -1 }
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx - vector.x * 12, cy - vector.y * 12)
    ctx.stroke()
    ctx.fillStyle = color
    for (let index = 0; index < 4; index += 1) {
      const offset = 4 + index * 3
      ctx.fillRect(Math.round(cx - vector.x * offset - 1), Math.round(cy - vector.y * offset - 1), 2, 2)
    }
  }

  private getTerrainEvidenceColor(kind: RenderState['terrainEvidence'][number]['kind']) {
    switch (kind) {
      case 'dust':
        return '#d8a45a'
      case 'rustle':
        return '#b8e38c'
      case 'metal':
        return '#d9f0f0'
      case 'echo':
        return '#86f4ff'
      case 'ricochet':
        return '#fff1a5'
      case 'noise':
      default:
        return '#f2f5ee'
    }
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

  private drawBattlefieldProps(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    if (state.battlefieldProps.visible.length === 0) {
      return
    }

    for (const prop of state.battlefieldProps.visible) {
      const point = worldCellToScreen(camera, prop.x, prop.y)
      const definition = getBattlefieldPropDefinition(prop.spriteId)
      const bounds = getBattlefieldPropRenderBounds(definition)
      if (!this.isScreenPointNearArena(point.x + BATTLEFIELD_TILE_SIZE / 2, point.y + BATTLEFIELD_TILE_SIZE / 2, bounds.cullMargin)) {
        continue
      }

      const plan = getBattlefieldPropPlaceholderPlan(prop.spriteId, definition)
      ctx.save()
      ctx.beginPath()
      const fogClipCells = getBattlefieldPropFogClipCells(prop.x, prop.y, definition, state.map.cols, state.map.rows)
        .filter((cell) => this.isVisibleCell(state, cell.col, cell.row))
      for (const cell of fogClipCells) {
        const clipPoint = worldCellToScreen(camera, cell.col, cell.row)
        ctx.rect(clipPoint.x, clipPoint.y, BATTLEFIELD_TILE_SIZE, BATTLEFIELD_TILE_SIZE)
      }
      ctx.clip()
      ctx.translate(Math.round(point.x + BATTLEFIELD_TILE_SIZE / 2), Math.round(point.y + BATTLEFIELD_TILE_SIZE / 2))
      if (prop.rotation) {
        ctx.rotate((prop.rotation * Math.PI) / 180)
      }
      if (prop.mechanicalRole === 'decoration') {
        ctx.globalAlpha *= 0.72
      }
      const drewAtlasSprite = drawBattlefieldPropAtlasSprite(ctx, definition, bounds.x, bounds.y, {
        width: bounds.w,
        height: bounds.h,
        variant: prop.variant,
      })
      if (!drewAtlasSprite) {
        ctx.save()
        ctx.translate(Math.round(bounds.x + bounds.w / 2), Math.round(bounds.y + bounds.h / 2))
        this.drawBattlefieldPropPlaceholder(ctx, plan, Math.max(bounds.w, bounds.h))
        ctx.restore()
      }
      this.drawBattlefieldPropRoleCue(ctx, prop, plan, BATTLEFIELD_TILE_SIZE, state)
      this.drawSoftCoverPropDisturbance(ctx, prop, state, BATTLEFIELD_TILE_SIZE)
      ctx.restore()
    }
  }

  private drawSoftCoverPropDisturbance(
    ctx: CanvasRenderingContext2D,
    prop: BattlefieldPropSnapshot,
    state: RenderState,
    size: number,
  ) {
    if (prop.category !== 'soft_cover_vegetation') {
      return
    }

    const disturbance = state.softCover.disturbances
      .filter((candidate) => candidate.propId === prop.id)
      .sort((left, right) => right.strength - left.strength)[0]
    if (!disturbance) {
      return
    }

    const progress = clamp(disturbance.age / Math.max(0.01, disturbance.ttl), 0, 1)
    const alpha = clamp((1 - progress) * disturbance.strength, 0, disturbance.reason === 'firing' ? 0.8 : 0.52)
    if (alpha <= 0.04) {
      return
    }

    const half = size / 2
    const phase = Math.floor((state.time + disturbance.age) * 16) % 4
    const color = disturbance.spriteId === 'snow_bush'
      ? '#e8ffff'
      : disturbance.spriteId === 'dry_bush'
        ? '#e5c06e'
        : disturbance.spriteId === 'reeds_cluster'
          ? '#b8e38c'
          : '#d1f0a0'

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#050805'
    ctx.lineWidth = 3
    for (let index = -2; index <= 2; index += 1) {
      const x = index * 5 + ((phase + index) % 2 === 0 ? 1 : -1)
      ctx.beginPath()
      ctx.moveTo(x, half - 6)
      ctx.lineTo(x + (index % 2 === 0 ? -4 : 4), -half + 8)
      ctx.stroke()
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    for (let index = -2; index <= 2; index += 1) {
      const x = index * 5 + ((phase + index) % 2 === 0 ? 1 : -1)
      ctx.beginPath()
      ctx.moveTo(x, half - 6)
      ctx.lineTo(x + (index % 2 === 0 ? -4 : 4), -half + 8)
      ctx.stroke()
    }
    if (disturbance.reason === 'firing') {
      ctx.strokeStyle = '#fff1a5'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-half + 7, -half + 7)
      ctx.lineTo(-half + 15, -half + 15)
      ctx.moveTo(half - 15, -half + 7)
      ctx.lineTo(half - 7, -half + 15)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawBattlefieldPropPlaceholder(
    ctx: CanvasRenderingContext2D,
    plan: BattlefieldPropPlaceholderPlan,
    size: number,
  ) {
    const half = size / 2
    const unit = Math.max(2, Math.round(size / 16))
    this.drawBattlefieldPropShadow(ctx, size)

    switch (plan.family) {
      case 'tree':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 2, -unit, unit * 4, unit * 9)
        ctx.fillStyle = plan.fill
        ctx.beginPath()
        ctx.arc(-unit * 2, -unit * 3, unit * 5, 0, Math.PI * 2)
        ctx.arc(unit * 3, -unit * 2, unit * 5, 0, Math.PI * 2)
        ctx.arc(0, -unit * 6, unit * 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = plan.highlight
        ctx.fillRect(-unit * 4, -unit * 7, unit * 3, unit)
        return
      case 'palm':
        ctx.strokeStyle = plan.shadow
        ctx.lineWidth = unit * 2
        ctx.beginPath()
        ctx.moveTo(-unit * 2, unit * 8)
        ctx.lineTo(unit, -unit * 4)
        ctx.stroke()
        ctx.strokeStyle = plan.fill
        ctx.lineWidth = unit
        ctx.beginPath()
        ctx.moveTo(-unit * 7, -unit * 5)
        ctx.lineTo(unit, -unit * 4)
        ctx.lineTo(unit * 8, -unit * 7)
        ctx.moveTo(unit, -unit * 4)
        ctx.lineTo(unit * 6, unit)
        ctx.moveTo(unit, -unit * 4)
        ctx.lineTo(-unit * 4, unit)
        ctx.stroke()
        return
      case 'log':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-half + unit * 2, -unit * 4, size - unit * 4, unit * 8)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-half + unit * 3, -unit * 3, size - unit * 6, unit * 6)
        ctx.fillStyle = plan.accent
        ctx.fillRect(-half + unit * 5, -unit, size - unit * 10, unit * 2)
        ctx.strokeStyle = plan.highlight
        ctx.strokeRect(-half + unit * 4, -unit * 3, unit * 5, unit * 6)
        return
      case 'rock':
        ctx.fillStyle = plan.shadow
        ctx.beginPath()
        ctx.ellipse(0, unit * 3, half - unit * 3, unit * 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = plan.fill
        ctx.beginPath()
        ctx.ellipse(-unit * 2, unit, half - unit * 5, unit * 6, -0.2, 0, Math.PI * 2)
        ctx.ellipse(unit * 5, unit * 2, unit * 5, unit * 5, 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = plan.highlight
        ctx.fillRect(-unit * 5, -unit * 2, unit * 5, unit)
        return
      case 'vegetation':
        ctx.strokeStyle = plan.shadow
        ctx.lineWidth = unit
        for (let index = -5; index <= 5; index += 2) {
          ctx.beginPath()
          ctx.moveTo(index * unit, unit * 7)
          ctx.lineTo(index * unit + (index % 4 === 0 ? unit * 2 : -unit), -unit * 5)
          ctx.stroke()
        }
        ctx.strokeStyle = plan.highlight
        ctx.lineWidth = 1
        for (let index = -4; index <= 4; index += 2) {
          ctx.beginPath()
          ctx.moveTo(index * unit, unit * 6)
          ctx.lineTo(index * unit + unit, -unit * 4)
          ctx.stroke()
        }
        return
      case 'crate':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 7, -unit * 5, unit * 14, unit * 12)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 6, -unit * 4, unit * 12, unit * 10)
        ctx.strokeStyle = plan.accent
        ctx.lineWidth = unit
        ctx.strokeRect(-unit * 6, -unit * 4, unit * 12, unit * 10)
        ctx.beginPath()
        ctx.moveTo(-unit * 6, -unit * 4)
        ctx.lineTo(unit * 6, unit * 6)
        ctx.moveTo(unit * 6, -unit * 4)
        ctx.lineTo(-unit * 6, unit * 6)
        ctx.stroke()
        return
      case 'barrel':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 5, -unit * 6, unit * 10, unit * 13)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 4, -unit * 5, unit * 8, unit * 11)
        ctx.fillStyle = plan.accent
        ctx.fillRect(-unit * 4, -unit * 3, unit * 8, unit)
        ctx.fillRect(-unit * 4, unit * 3, unit * 8, unit)
        ctx.fillStyle = plan.highlight
        ctx.fillRect(unit, -unit * 4, unit, unit * 8)
        return
      case 'fortification':
        ctx.strokeStyle = plan.outline
        ctx.lineWidth = unit * 2
        ctx.beginPath()
        ctx.moveTo(-unit * 8, unit * 5)
        ctx.lineTo(unit * 8, -unit * 5)
        ctx.moveTo(-unit * 8, -unit * 5)
        ctx.lineTo(unit * 8, unit * 5)
        ctx.stroke()
        ctx.strokeStyle = plan.highlight
        ctx.lineWidth = unit
        ctx.stroke()
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 7, unit * 5, unit * 14, unit * 3)
        return
      case 'wire':
        ctx.strokeStyle = plan.outline
        ctx.lineWidth = unit * 2
        ctx.beginPath()
        ctx.moveTo(-half + unit * 2, 0)
        ctx.lineTo(half - unit * 2, 0)
        ctx.stroke()
        ctx.strokeStyle = plan.highlight
        ctx.lineWidth = 1
        for (let x = -unit * 7; x <= unit * 7; x += unit * 3) {
          ctx.beginPath()
          ctx.moveTo(x - unit, -unit * 3)
          ctx.lineTo(x + unit, unit * 3)
          ctx.moveTo(x + unit, -unit * 3)
          ctx.lineTo(x - unit, unit * 3)
          ctx.stroke()
        }
        return
      case 'wreck':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 8, -unit * 4, unit * 16, unit * 10)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 7, -unit * 3, unit * 13, unit * 8)
        ctx.fillStyle = plan.accent
        ctx.fillRect(-unit * 3, -unit * 6, unit * 7, unit * 4)
        ctx.fillRect(unit * 2, -unit * 7, unit * 8, unit)
        ctx.fillStyle = plan.highlight
        ctx.fillRect(-unit * 6, unit * 3, unit * 4, unit)
        return
      case 'crater':
        ctx.strokeStyle = plan.shadow
        ctx.lineWidth = unit * 2
        ctx.beginPath()
        ctx.ellipse(0, unit, half - unit * 4, unit * 7, -0.15, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = plan.accent
        ctx.lineWidth = unit
        ctx.stroke()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.beginPath()
        ctx.ellipse(0, unit, half - unit * 7, unit * 4, -0.15, 0, Math.PI * 2)
        ctx.fill()
        return
      case 'infrastructure':
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 6, unit * 2, unit * 12, unit * 7)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 5, unit * 3, unit * 10, unit * 5)
        ctx.fillStyle = plan.accent
        ctx.fillRect(-unit * 4, unit * 4, unit * 3, unit)
        ctx.fillRect(unit, unit * 4, unit * 3, unit)
        ctx.strokeStyle = plan.highlight
        ctx.lineWidth = unit
        ctx.beginPath()
        ctx.moveTo(0, unit * 2)
        ctx.lineTo(0, -unit * 8)
        ctx.moveTo(-unit * 4, -unit * 5)
        ctx.lineTo(unit * 4, -unit * 5)
        ctx.stroke()
        return
      case 'lamp':
        ctx.strokeStyle = plan.shadow
        ctx.lineWidth = unit
        ctx.beginPath()
        ctx.moveTo(0, unit * 8)
        ctx.lineTo(0, -unit * 6)
        ctx.stroke()
        ctx.fillStyle = plan.highlight
        ctx.fillRect(-unit * 3, -unit * 7, unit * 6, unit * 4)
        ctx.fillStyle = 'rgba(255, 241, 165, 0.2)'
        ctx.fillRect(-unit * 6, -unit * 3, unit * 12, unit * 8)
        return
      case 'sign':
        ctx.strokeStyle = plan.shadow
        ctx.lineWidth = unit
        ctx.beginPath()
        ctx.moveTo(0, unit * 8)
        ctx.lineTo(0, -unit * 5)
        ctx.stroke()
        ctx.fillStyle = plan.accent
        ctx.fillRect(-unit * 6, -unit * 7, unit * 12, unit * 7)
        ctx.fillStyle = plan.outline
        ctx.fillRect(-unit * 4, -unit * 5, unit * 8, unit)
        return
      case 'missing':
      default:
        ctx.fillStyle = plan.shadow
        ctx.fillRect(-unit * 7, -unit * 7, unit * 14, unit * 14)
        ctx.fillStyle = plan.fill
        ctx.fillRect(-unit * 6, -unit * 6, unit * 12, unit * 12)
        ctx.strokeStyle = plan.highlight
        ctx.lineWidth = unit
        ctx.beginPath()
        ctx.moveTo(-unit * 5, -unit * 5)
        ctx.lineTo(unit * 5, unit * 5)
        ctx.moveTo(unit * 5, -unit * 5)
        ctx.lineTo(-unit * 5, unit * 5)
        ctx.stroke()
        return
    }
  }

  private drawBattlefieldPropShadow(ctx: CanvasRenderingContext2D, size: number) {
    const unit = Math.max(2, Math.round(size / 16))
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
    ctx.fillRect(Math.round(-size * 0.34), Math.round(size * 0.28), Math.round(size * 0.68), unit * 2)
  }

  private drawBattlefieldPropRoleCue(
    ctx: CanvasRenderingContext2D,
    prop: BattlefieldPropSnapshot,
    plan: BattlefieldPropPlaceholderPlan,
    size: number,
    state: RenderState,
  ) {
    const unit = Math.max(2, Math.round(size / 16))
    const y = Math.round(size * 0.34)
    const affordance = getBattlefieldPropAffordance(prop.spriteId)

    if (!affordance || affordance.cue === 'decorative' || affordance.cue === 'historical') {
      ctx.fillStyle = 'rgba(242, 245, 238, 0.28)'
      ctx.fillRect(-unit * 4, y, unit * 8, unit)
      return
    }

    if (affordance.cue === 'terrain_backed_blocker') {
      const terrain = terrainDefinition(state.tiles[prop.y]?.[prop.x]?.kind ?? 'empty')
      if (terrain.passable || !terrain.blocksProjectiles) {
        return
      }
      ctx.fillStyle = plan.outline
      ctx.fillRect(-unit * 7, y, unit * 14, unit * 2)
      ctx.fillStyle = plan.highlight
      ctx.fillRect(-unit * 6, y, unit * 4, unit)
      ctx.fillRect(unit * 2, y, unit * 4, unit)
      return
    }

    if (affordance.cue === 'soft_cover') {
      ctx.fillStyle = plan.highlight
      ctx.fillRect(-unit * 6, y, unit * 2, unit)
      ctx.fillRect(-unit, y, unit * 2, unit)
      ctx.fillRect(unit * 4, y, unit * 2, unit)
      return
    }

    if (affordance.cue === 'broken') {
      ctx.strokeStyle = '#7f8983'
      ctx.lineWidth = unit
      ctx.beginPath()
      ctx.moveTo(-unit * 4, y - unit)
      ctx.lineTo(unit * 4, y + unit)
      ctx.moveTo(-unit * 4, y + unit)
      ctx.lineTo(unit * 4, y - unit)
      ctx.stroke()
      return
    }

    if (affordance.cue === 'inactive') {
      ctx.strokeStyle = '#6f7772'
      ctx.lineWidth = unit
      ctx.beginPath()
      ctx.moveTo(-unit * 5, y)
      ctx.lineTo(unit * 5, y)
      ctx.moveTo(unit * 2, y - unit * 2)
      ctx.lineTo(-unit * 2, y + unit * 2)
      ctx.stroke()
      return
    }

    ctx.fillStyle = plan.accent
    ctx.fillRect(-unit * 5, y, unit * 10, unit)
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
      damage: 1 - tank.hp / Math.max(1, tank.maxHp),
      deferStatus: true,
      frame: tank.move ? Math.floor(state.time * 8) : 0,
      shield: tank.shield > 0,
      self: tank.faction === 'player',
      tankClass: tank.classId,
      teamKey: this.getTeamKey(state, tank.team),
    })

    if (tank.callSign) {
      drawPixelText(ctx, tank.callSign.toUpperCase(), point.x, point.y - 25, {
        align: 'center',
        color: '#b9f5ff',
        maxWidth: 48,
        scale: 1,
      })
    }
  }

  private drawTutorialActionCue(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    camera: BattlefieldCamera,
  ) {
    const cue = state.tutorial.actionCue
    if (
      state.mode !== 'playing'
      || !state.tutorial.active
      || state.tutorial.cameraControlled
      || !cue
      || state.player.hp <= 0
    ) {
      return
    }

    const center = tankCenter(state.player)
    const point = this.worldPixelToScreen(camera, center.x, center.y)
    if (!this.isScreenPointNearArena(point.x, point.y, 44)) {
      return
    }

    const keys = state.feedback.touchControlsVisible ? cue.touchKeys : cue.keyboardKeys
    const keyGap = 3
    const keyWidths = keys.map((key) => this.isTutorialDirectionKey(key)
      ? 15
      : Math.max(11, Math.ceil(measurePixelText(key, TEXT_SCALE)) + 6))
    const keysWidth = keyWidths.reduce((total, width) => total + width, 0)
      + Math.max(0, keys.length - 1) * keyGap
    const labelWidth = Math.ceil(measurePixelText(cue.label, TEXT_SCALE))
    const width = Math.max(54, keysWidth + labelWidth + 15)
    const height = 22
    const x = clamp(
      Math.round(point.x - width / 2),
      ARENA_X + 4,
      ARENA_X + ARENA_WIDTH - width - 4,
    )
    const aboveY = Math.round(point.y - 48)
    const belowY = Math.round(point.y + 23)
    const aboveAvailable = aboveY >= ARENA_Y + 4
    const belowAvailable = belowY <= ARENA_Y + ARENA_HEIGHT - height - 4
    const aboveBlocked = aboveAvailable && this.isTutorialCueOverTank(state, camera, x, aboveY, width, height)
    const belowBlocked = belowAvailable && this.isTutorialCueOverTank(state, camera, x, belowY, width, height)
    const y = aboveAvailable && (!aboveBlocked || !belowAvailable || belowBlocked)
      ? aboveY
      : belowAvailable
        ? belowY
        : clamp(aboveY, ARENA_Y + 4, ARENA_Y + ARENA_HEIGHT - height - 4)
    const pulse = state.tutorial.reducedMotion || Math.floor(state.time * 4) % 2 === 0
    const stemX = clamp(Math.round(point.x), x + 8, x + width - 8)

    ctx.save()
    ctx.fillStyle = 'rgba(3, 6, 4, 0.9)'
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4)
    ctx.fillStyle = pulse ? '#ffd35a' : '#86f4ff'
    ctx.fillRect(x, y, width, 2)
    ctx.fillStyle = 'rgba(31, 42, 32, 0.96)'
    ctx.fillRect(x, y + 2, width, height - 2)

    const stemY = y < point.y ? y + height : y - 5
    ctx.fillStyle = pulse ? '#ffd35a' : '#86f4ff'
    ctx.fillRect(stemX - 1, stemY, 3, 5)

    let keyX = x + 5
    keys.forEach((key, index) => {
      const keyWidth = keyWidths[index]!
      this.drawTutorialActionKeycap(ctx, key, keyX, y + 5, keyWidth, pulse)
      keyX += keyWidth + keyGap
    })

    drawPixelText(ctx, cue.label, x + width - 5, y + 8, {
      align: 'right',
      color: '#f7f3df',
      maxWidth: labelWidth + 2,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    ctx.restore()
  }

  private isTutorialCueOverTank(
    state: RenderState,
    camera: BattlefieldCamera,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    return state.enemies.some((tank) => {
      if (tank.hp <= 0) {
        return false
      }
      const center = tankCenter(tank)
      const point = this.worldPixelToScreen(camera, center.x, center.y)
      return point.x >= x - 18
        && point.x <= x + width + 18
        && point.y >= y - 18
        && point.y <= y + height + 18
    })
  }

  private drawTutorialActionKeycap(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    width: number,
    pulse: boolean,
  ) {
    ctx.fillStyle = pulse ? '#fff1a5' : '#c8edf0'
    ctx.fillRect(x, y, width, 13)
    ctx.fillStyle = '#f7f4c5'
    ctx.fillRect(x + 1, y + 1, width - 2, 1)
    ctx.fillStyle = '#8f896b'
    ctx.fillRect(x + 1, y + 11, width - 2, 1)
    if (this.isTutorialDirectionKey(key)) {
      this.drawTutorialDirectionIcon(ctx, key, x, y, width)
      return
    }
    drawPixelText(ctx, key, x + Math.floor(width / 2), y + 2, {
      align: 'center',
      color: '#252820',
      maxWidth: width - 4,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
  }

  private isTutorialDirectionKey(key: string): key is 'LEFT' | 'UP' | 'DOWN' | 'RIGHT' {
    return key === 'LEFT' || key === 'UP' || key === 'DOWN' || key === 'RIGHT'
  }

  private drawTutorialDirectionIcon(
    ctx: CanvasRenderingContext2D,
    direction: 'LEFT' | 'UP' | 'DOWN' | 'RIGHT',
    x: number,
    y: number,
    width: number,
  ) {
    const centerX = x + Math.floor(width / 2)
    ctx.fillStyle = '#1d251d'

    if (direction === 'UP') {
      ctx.fillRect(centerX - 1, y + 2, 3, 1)
      ctx.fillRect(centerX - 2, y + 3, 5, 1)
      ctx.fillRect(centerX - 3, y + 4, 7, 2)
      ctx.fillRect(centerX - 1, y + 5, 3, 6)
      return
    }
    if (direction === 'DOWN') {
      ctx.fillRect(centerX - 1, y + 2, 3, 6)
      ctx.fillRect(centerX - 3, y + 7, 7, 2)
      ctx.fillRect(centerX - 2, y + 9, 5, 1)
      ctx.fillRect(centerX - 1, y + 10, 3, 1)
      return
    }
    if (direction === 'LEFT') {
      ctx.fillRect(centerX - 4, y + 5, 1, 3)
      ctx.fillRect(centerX - 3, y + 4, 1, 5)
      ctx.fillRect(centerX - 2, y + 3, 2, 7)
      ctx.fillRect(centerX - 1, y + 5, 6, 3)
      return
    }
    ctx.fillRect(centerX + 3, y + 5, 1, 3)
    ctx.fillRect(centerX + 2, y + 4, 1, 5)
    ctx.fillRect(centerX, y + 3, 2, 7)
    ctx.fillRect(centerX - 4, y + 5, 6, 3)
  }

  private drawSoftCoverTankOverlays(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    for (const cover of state.softCover.active) {
      if (!cover.concealed) {
        continue
      }

      const tank = cover.tankId === state.player.id
        ? state.player
        : state.enemies.find((candidate) => candidate.id === cover.tankId)
      if (!tank) {
        continue
      }

      const center = tankCenter(tank)
      const point = this.worldPixelToScreen(camera, center.x, center.y)
      const visualSize = getTankVisualSize(TANK_SIZE + 2, { alive: tank.hp > 0, tankClass: tank.classId })
      if (!this.isScreenPointNearArena(point.x, point.y, visualSize)) {
        continue
      }

      const palette = cover.spriteId === 'snow_bush'
        ? { dark: '#34505f', light: '#e8ffff' }
        : cover.spriteId === 'dry_bush'
          ? { dark: '#5b3b1e', light: '#d8a45a' }
          : cover.spriteId === 'reeds_cluster'
            ? { dark: '#14240f', light: '#9ccf6c' }
            : { dark: '#173416', light: '#9ac46f' }
      const x = Math.round(point.x - visualSize / 2)
      const y = Math.round(point.y - visualSize / 2)
      const edge = Math.max(4, Math.round(visualSize * 0.16))
      const inset = Math.max(3, Math.round(visualSize * 0.2))

      ctx.save()
      ctx.globalAlpha = 0.42
      ctx.fillStyle = palette.dark
      ctx.fillRect(x + 2, y + inset, edge, visualSize - inset * 2)
      ctx.fillRect(x + visualSize - edge - 2, y + inset + 2, edge, visualSize - inset * 2 - 2)
      ctx.fillRect(x + inset, y + 2, visualSize - inset * 2, edge)
      ctx.globalAlpha = 0.34
      ctx.fillStyle = palette.light
      ctx.fillRect(x + 4, y + inset + 1, 2, visualSize - inset * 2 - 2)
      ctx.fillRect(x + visualSize - edge, y + inset + 4, 2, visualSize - inset * 2 - 6)
      ctx.fillRect(x + inset + 3, y + 3, visualSize - inset * 2 - 6, 2)
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  private drawTankStatusChannels(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    for (const tank of [state.player, ...state.enemies]) {
      const center = tankCenter(tank)
      const point = this.worldPixelToScreen(camera, center.x, center.y)
      const visualSize = getTankVisualSize(TANK_SIZE + 2, { alive: tank.hp > 0, tankClass: tank.classId })
      if (!this.isScreenPointNearArena(point.x, point.y, visualSize)) {
        continue
      }
      drawPixelTankStatusChannels(ctx, point.x, point.y, visualSize, this.getTeamColors(state, tank.team), {
        self: tank.faction === 'player',
        shield: tank.shield > 0,
        shieldPoints: tank.shield,
      })
    }
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
    if (marker.kind === 'flag-target' || marker.kind === 'flag-home') {
      const flagTeam = marker.kind === 'flag-home' ? state.playerTeam : state.enemyTeam
      drawPixelFlag(ctx, x + 2, y + 1, 28, this.getTeamColors(state, flagTeam), false, false)
      ctx.restore()
      return
    }

    ctx.fillStyle = 'rgba(5, 7, 5, 0.82)'
    ctx.fillRect(x + 2, y + 2, 28, 28)
    ctx.fillStyle = colors.shadow
    ctx.fillRect(x + 4, y + 4, 24, 24)
    ctx.fillStyle = colors.accent
    ctx.fillRect(x + 5, y + 5, 22, 2)
    ctx.fillRect(x + 5, y + 25, 22, 2)
    ctx.fillRect(x + 5, y + 5, 2, 22)
    ctx.fillRect(x + 25, y + 5, 2, 22)

    if (marker.kind === 'assault-core') {
      ctx.fillStyle = '#9b1f1f'
      ctx.fillRect(x + 9, y + 8, 14, 14)
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(x + 12, y + 11, 8, 8)
      this.drawAssaultHpBar(ctx, state, x + 7, y + 24)
    } else if (marker.kind === 'flag-transfer') {
      ctx.fillStyle = '#342814'
      ctx.fillRect(x + 8, y + 8, 16, 14)
      ctx.fillStyle = '#ffd35a'
      ctx.fillRect(x + 10, y + 11, 5, 8)
      ctx.fillRect(x + 17, y + 11, 5, 8)
      ctx.fillRect(x + 14, y + 13, 4, 4)
      ctx.fillStyle = '#fff1a5'
      ctx.fillRect(x + 11, y + 9, 3, 2)
      ctx.fillRect(x + 18, y + 20, 3, 2)
    } else if (marker.kind === 'ammo-station') {
      ctx.fillStyle = '#342814'
      ctx.fillRect(x + 8, y + 7, 16, 17)
      ctx.fillStyle = '#fff1a5'
      ctx.fillRect(x + 10, y + 9, 12, 3)
      ctx.fillRect(x + 10, y + 14, 8, 3)
      ctx.fillRect(x + 10, y + 19, 12, 3)
    } else if (marker.kind === 'training-zone') {
      ctx.fillStyle = '#163b3c'
      ctx.fillRect(x + 8, y + 8, 16, 16)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(x + 10, y + 10, 12, 2)
      ctx.fillRect(x + 10, y + 20, 12, 2)
      ctx.fillRect(x + 10, y + 10, 2, 12)
      ctx.fillRect(x + 20, y + 10, 2, 12)
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

  private drawCarriedFlag(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const carrierId = state.objective.flag?.carrierId
    if (!carrierId) {
      return
    }

    const carrier = carrierId === state.player.id
      ? state.player
      : state.enemies.find((tank) => tank.id === carrierId)
    if (!carrier) {
      return
    }

    const placement = getCarriedFlagPlacement(carrier)
    const point = this.worldPixelToScreen(camera, placement.x, placement.y)
    if (!this.isScreenPointNearArena(point.x, point.y, placement.size)) {
      return
    }

    drawPixelFlag(
      ctx,
      Math.round(point.x),
      Math.round(point.y),
      placement.size,
      this.getTeamColors(state, state.enemyTeam),
      true,
      false,
      placement.mirrorX,
      placement.rotationQuarterTurns,
    )
  }

  private drawDroppedFlagSignal(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const flag = state.objective.flag
    if (!flag?.dropped || flag.signalPulse === null || flag.signalPulse === undefined) {
      return
    }

    const point = worldPointToScreen(camera, flag.position.x + 0.5, flag.position.y + 0.5)
    if (!this.isScreenPointNearArena(point.x, point.y, TILE_SIZE * 4)) {
      return
    }

    const pulse = clamp(flag.signalPulse, 0, 1)
    const colors = this.getTeamColors(state, state.enemyTeam)
    ctx.save()
    ctx.strokeStyle = colors.highlight
    ctx.lineCap = 'square'
    for (let index = 0; index < 3; index += 1) {
      const progress = clamp(pulse - index * 0.16, 0, 1)
      if (progress <= 0 && pulse > 0) {
        continue
      }

      ctx.globalAlpha = clamp((1 - progress) * (0.34 - index * 0.07), 0.05, 0.34)
      ctx.lineWidth = index === 0 ? 2 : 1
      ctx.beginPath()
      ctx.arc(
        Math.round(point.x),
        Math.round(point.y),
        (0.45 + progress * 3.3) * TILE_SIZE,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
    ctx.globalAlpha = clamp((1 - pulse) * 0.78, 0.18, 0.78)
    ctx.fillStyle = colors.highlight
    ctx.fillRect(Math.round(point.x) - 2, Math.round(point.y) - 2, 5, 5)
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
    return kind === 'defense-base'
      || kind === 'flag-home'
      || kind === 'flag-target'
      || kind === 'flag-transfer'
      || kind === 'assault-core'
      || kind === 'training-zone'
      || kind === 'ammo-station'
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
    this.drawHudPortableRelayItem(ctx, state)
    this.drawHudTopHpLine(ctx, state)
    this.drawHudClassEquipmentStatus(ctx, state)
    this.drawHudRightStatus(ctx, state)
  }

  private drawTutorialPresentation(ctx: CanvasRenderingContext2D, state: RenderState) {
    if (!state.tutorial.active || state.mode !== 'playing') {
      return
    }

    const goal = state.tutorial.activeGoal
    if (goal) {
      const goalX = HUD_X + 10
      const goalY = 126
      drawPixelText(ctx, 'TRAINING', goalX, goalY, {
        color: '#1f4c4c',
        maxWidth: HUD_WIDTH - 20,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
      const goalLines = wrapPixelText(goal, HUD_WIDTH - 20, TEXT_SCALE).slice(0, 4)
      goalLines.forEach((line, index) => {
        drawPixelText(ctx, line, goalX, goalY + 16 + index * 12, {
          color: HUD_INK,
          maxWidth: HUD_WIDTH - 20,
          scale: TEXT_SCALE,
          shadowColor: null,
        })
      })
    }

    const panelX = TUTORIAL_RADIO_PANEL.x
    const panelY = TUTORIAL_RADIO_PANEL.y
    if (!state.tutorial.dialogue || !state.tutorial.speaker) {
      ctx.save()
      ctx.fillStyle = 'rgba(9, 13, 10, 0.86)'
      ctx.fillRect(panelX, panelY, 42, 52)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(panelX, panelY, 42, 2)
      this.drawTutorialGeneralPortrait(ctx, panelX + 5, panelY + 5, state.tutorial.reducedMotion ? 0 : state.time, 1, false)
      ctx.restore()
      return
    }

    const panelWidth = TUTORIAL_RADIO_PANEL.width
    const panelHeight = TUTORIAL_RADIO_PANEL.height
    const portraitX = panelX + 6
    const portraitY = panelY + 15
    const textX = panelX + 46
    const textWidth = panelWidth - 54
    const visibleCharacters = Math.max(0, state.tutorial.dialogueVisibleCharacters)
    const dialogueLines = wrapPixelText(state.tutorial.dialogue, textWidth, TEXT_SCALE).slice(0, 3)
    const speakerSpeaking = !state.tutorial.reducedMotion && !state.tutorial.dialogueComplete
    ctx.save()
    ctx.fillStyle = 'rgba(9, 13, 10, 0.84)'
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight)
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(panelX, panelY, panelWidth, 2)
    this.drawTutorialSpeakerPortrait(
      ctx,
      state.tutorial.speaker,
      portraitX,
      portraitY,
      state.tutorial.reducedMotion ? 0 : state.time,
      1,
      speakerSpeaking,
    )

    const speakerLabel = state.tutorial.speaker === TUTORIAL_BRIEFING_OFFICER
      ? TUTORIAL_BRIEFING_OFFICER.toUpperCase()
      : `${state.tutorial.speaker.toUpperCase()} / RANGE NET`
    drawPixelText(ctx, speakerLabel, textX, panelY + 7, {
      color: '#86f4ff',
      maxWidth: textWidth,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    let searchFrom = 0
    dialogueLines.forEach((line, index) => {
      const lineStart = state.tutorial.dialogue!.indexOf(line, searchFrom)
      const safeLineStart = lineStart >= 0 ? lineStart : searchFrom
      const revealedLength = Math.max(0, Math.min(line.length, visibleCharacters - safeLineStart))
      searchFrom = safeLineStart + line.length
      drawPixelText(ctx, line.slice(0, revealedLength), textX, panelY + 21 + index * 12, {
        color: '#f7f3df',
        maxWidth: textWidth,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })
    const advanceLabel = state.feedback.touchControlsVisible
      ? 'TAP BRIEFING TO ADVANCE'
      : 'ENTER TO ADVANCE'
    drawPixelText(ctx, state.tutorial.dialogueComplete ? advanceLabel : 'RECEIVING...', textX, panelY + 62, {
      color: '#9ba699',
      maxWidth: textWidth,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    ctx.restore()
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
    const total = this.getDisplayedEnemyTotal(state)
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

  private drawHudPortableRelayItem(ctx: CanvasRenderingContext2D, state: RenderState) {
    const model = getUniversalRelayHudModel(state.portableRelay)
    const x = 6
    const y = 338

    drawPixelText(ctx, 'RELAY', x, y, {
      color: HUD_INK,
      maxWidth: 36,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelPortableRelay(ctx, x, y + 14, 36, model.state === 'out', state.time)
    if (state.feedback.touchControlsVisible && !this.touchSideRailsActive()) {
      this.drawTouchHudActionRing(
        ctx,
        24,
        370,
        24,
        state.feedback.heldButtons.relay,
        model.progress,
        '#86f4ff',
      )
      drawPixelText(ctx, 'TAP', 24, y + 17, {
        align: 'center',
        color: state.feedback.heldButtons.relay ? '#fff1a5' : '#f2ead7',
        maxWidth: 28,
        scale: 1,
        shadowColor: null,
      })
    } else if (!state.feedback.touchControlsVisible) {
      drawEquipmentKeycap(ctx, 'E', x - 2, y + 12)
    }
    drawPixelText(ctx, String(model.remaining), 24, y + 57, {
      align: 'center',
      color: model.state === 'out' ? '#5a3f1c' : model.state === 'hold' ? '#1f4c4c' : '#284a2d',
      maxWidth: 32,
      scale: 3,
      shadowColor: null,
    })

    if (model.progress !== null) {
      ctx.fillStyle = '#171717'
      ctx.fillRect(x, y + 78, 36, 3)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(x + 1, y + 79, Math.max(1, Math.round(34 * model.progress)), 1)
    }
  }

  private drawHudRightStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = '#5c5d58'
    ctx.fillRect(HUD_X, 0, HUD_WIDTH, LOGICAL_HEIGHT)
    ctx.textBaseline = 'top'

    const briefingTutorial = state.runKind === 'tutorial' && state.mode === 'briefing'
    const objectiveMode = briefingTutorial ? state.level.objective.mode : state.objective.mode
    const objectiveLabel = briefingTutorial ? state.level.objective.label : state.objective.label
    drawPixelText(
      ctx,
      objectiveMode === 'ctf' ? 'CAPTURE FLAG' : objectiveLabel.slice(0, 11),
      HUD_X + 12,
      22,
      {
        color: HUD_INK,
        maxWidth: 76,
        scale: TEXT_SCALE,
        shadowColor: null,
      },
    )

    const defenseHasBase = objectiveMode === 'defense'
      && state.level.rows.some((row) => row.includes('E'))
    const scoreY = defenseHasBase || objectiveMode === 'ctf' ? 94 : 78
    if (defenseHasBase) {
      this.drawHudBaseHealth(ctx, state)
    } else if (objectiveMode === 'ctf' && state.objective.flag) {
      this.drawHudCtfStatus(ctx, state)
    } else {
      drawPixelText(ctx, this.getObjectiveHudLine(state), HUD_X + 12, 42, {
        color: HUD_INK,
        maxWidth: 76,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
      if (objectiveMode !== 'defense') {
        this.drawObjectivePips(ctx, state, HUD_X + 12, 60)
      }
    }

    this.drawHudIcon(ctx, 'hud.score', HUD_X + 12, scoreY, 18, '*')
    drawPixelText(ctx, String(state.score).padStart(5, '0'), HUD_X + 36, scoreY + 5, {
      color: this.getTeamColors(state, state.playerTeam).body,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    this.drawHudPlayerStatus(ctx, state, 204)

    this.drawHudMinimap(ctx, state, 374)
  }

  private drawHudBaseHealth(ctx: CanvasRenderingContext2D, state: RenderState) {
    const x = HUD_X + 10
    const y = 40
    const maxHp = Math.max(1, state.baseMaxHp)
    const hp = clamp(state.baseHp, 0, maxHp)
    const danger = hp <= Math.ceil(maxHp / 3)
    const barWidth = HUD_WIDTH - 20
    const fillWidth = hp > 0 ? Math.max(1, Math.round((barWidth - 2) * (hp / maxHp))) : 0

    drawPixelTerrainTile(ctx, 'base', x, y, 32, {
      col: 0,
      row: 0,
      hp,
      time: state.time,
    })
    drawPixelText(ctx, 'BASE', x + 42, y + 2, {
      color: HUD_INK,
      maxWidth: 34,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, `${hp}/${maxHp}`, x + 42, y + 14, {
      color: danger ? '#7b1e18' : '#5a3f1c',
      maxWidth: 34,
      scale: 2,
      shadowColor: null,
    })

    ctx.fillStyle = '#171717'
    ctx.fillRect(x, y + 38, barWidth, 7)
    if (fillWidth > 0) {
      ctx.fillStyle = danger ? '#f06243' : '#ffd35a'
      ctx.fillRect(x + 1, y + 39, fillWidth, 5)
      ctx.fillStyle = danger ? '#ffd6c8' : '#fff1a5'
      ctx.fillRect(x + 2, y + 39, Math.max(1, Math.min(fillWidth - 1, Math.round(fillWidth * 0.42))), 1)
    }
    for (let index = 1; index < maxHp; index += 1) {
      const markerX = x + Math.round((barWidth * index) / maxHp)
      ctx.fillStyle = '#171717'
      ctx.fillRect(markerX, y + 38, 1, 7)
    }
  }

  private drawHudCtfStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    const flag = state.objective.flag
    if (!flag) return

    const x = HUD_X + 10
    const y = 40
    const model = getCtfHudModel(flag, state.player.id)
    const flagColors = this.getTeamColors(state, state.enemyTeam)
    const progressColors = this.getTeamColors(state, state.playerTeam)
    const barWidth = HUD_WIDTH - 20
    const fillWidth = model.progress > 0 ? Math.max(1, Math.round((barWidth - 2) * model.progress)) : 0

    drawPixelFlag(ctx, x, y, 32, flagColors, model.carriedByPlayer)
    drawPixelText(ctx, model.carriedByPlayer ? (state.feedback.touchControlsVisible ? 'DROP' : 'R DROP') : model.status, x + 42, y + 2, {
      color: model.carriedByPlayer ? progressColors.trim : HUD_INK,
      maxWidth: 34,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, `${model.captures}/${model.target}`, x + 42, y + 14, {
      color: progressColors.body,
      maxWidth: 34,
      scale: 2,
      shadowColor: null,
    })
    ctx.fillStyle = '#171717'
    ctx.fillRect(x, y + 38, barWidth, 7)
    if (fillWidth > 0) {
      ctx.fillStyle = progressColors.body
      ctx.fillRect(x + 1, y + 39, fillWidth, 5)
      ctx.fillStyle = progressColors.highlight
      ctx.fillRect(x + 2, y + 39, Math.max(1, Math.min(fillWidth - 1, Math.round(fillWidth * 0.42))), 1)
    }
    for (let index = 1; index < model.target; index += 1) {
      const markerX = x + Math.round((barWidth * index) / model.target)
      ctx.fillStyle = '#171717'
      ctx.fillRect(markerX, y + 38, 1, 7)
    }
  }

  private drawHudPlayerStatus(ctx: CanvasRenderingContext2D, state: RenderState, y: number) {
    const x = HUD_X + 10
    const colors = this.getTeamColors(state, state.playerTeam)

    drawBattlefieldTank(ctx, x + 18, y + 24, TANK_SIZE + 2, 'up', colors, {
      frame: Math.floor(state.time * 4),
      tankClass: state.player.classId,
      teamKey: this.getTeamKey(state, state.playerTeam),
    })

    if (state.feedback.touchControlsVisible && !this.touchSideRailsActive()) {
      const confirmation = state.feedback.touch.modConfirmation
      this.drawTouchHudActionRing(
        ctx,
        x + 18,
        y + 24,
        18,
        state.feedback.heldButtons.mod,
        confirmation?.progress ?? null,
        confirmation && !confirmation.valid ? '#f06243' : '#86f4ff',
      )
    }

    drawPixelText(ctx, 'LIVES', x + 42, y + 3, {
      color: HUD_INK,
      maxWidth: 34,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, String(state.lives), x + 44, y + 15, {
      color: colors.trim,
      maxWidth: 32,
      scale: 3,
      shadowColor: null,
    })

    if (state.majorMods.selected === 'overdrive') {
      this.drawHudOverdriveStatus(ctx, state, x, y + 48)
      return
    }

    this.drawHudMajorModStatus(ctx, state, x, y + 48)
  }

  private drawHudOverdriveStatus(ctx: CanvasRenderingContext2D, state: RenderState, x: number, y: number) {
    const model = getOverdriveHudModel(state.majorMods.overdrive)
    const barWidth = HUD_WIDTH - 20
    const meterX = x + 11
    const meterWidth = barWidth - 11
    const fillWidth = Math.round((meterWidth - 2) * model.progress)
    const textColor = model.phase === 'active'
      ? '#1f4c4c'
      : model.phase === 'ready'
        ? '#1f4c2e'
        : '#5a3f1c'
    const fillColor = model.phase === 'active'
      ? '#86f4ff'
      : model.phase === 'ready'
        ? '#9bea83'
        : '#ffd35a'

    drawPixelText(ctx, model.label, x, y, {
      color: textColor,
      maxWidth: 56,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, model.value, x + barWidth, y, {
      align: 'right',
      color: textColor,
      maxWidth: 22,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    ctx.fillStyle = '#171717'
    ctx.fillRect(meterX, y + 12, meterWidth, 7)
    if (fillWidth > 0) {
      ctx.fillStyle = fillColor
      ctx.fillRect(meterX + 1, y + 13, fillWidth, 5)
      if (fillWidth > 1) {
        ctx.fillStyle = model.phase === 'active' ? '#dffcff' : '#fff1a5'
        ctx.fillRect(meterX + 2, y + 13, Math.max(1, Math.min(fillWidth - 1, Math.round(fillWidth * 0.42))), 1)
      }
    }
    if (!state.feedback.touchControlsVisible) {
      drawEquipmentKeycap(ctx, 'X', x, y + 11)
    }
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

    const linkMode = state.fog.teamVisionMode === 'linked' ? 'TEAM' : 'SOLO'
    const linkColor = state.fog.teamVisionMerged ? '#1f4c2e' : '#5a3f1c'

    drawPixelText(ctx, 'MAP', HUD_X + 10, y, {
      color: HUD_INK,
      maxWidth: 28,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, linkMode, HUD_X + HUD_WIDTH - 10, y, {
      align: 'right',
      color: linkColor,
      maxWidth: 42,
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

    const flag = state.objective.flag
    if (flag?.dropped && flag.signalPulse !== null && flag.signalPulse !== undefined) {
      const pulse = clamp(flag.signalPulse, 0, 1)
      const flagX = x + (flag.position.x + 0.5) * scale
      const flagY = mapY + (flag.position.y + 0.5) * scale
      const radius = Math.max(2.5, scale * (1.2 + pulse * 2.4))
      ctx.globalAlpha = clamp(0.85 - pulse * 0.55, 0.3, 0.85)
      ctx.strokeStyle = this.getTeamColors(state, state.enemyTeam).highlight
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(flagX, flagY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      this.drawMinimapMarker(ctx, x, mapY, scale, flag.position.x, flag.position.y, '#fff1a5', 2)
    }

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
      case 'swamp':
        return '#36563a'
      case 'ricochet':
        return '#b8b1a1'
      case 'metal':
        return '#6f8187'
      case 'dust':
        return '#8f7049'
      case 'echo':
        return '#3b7180'
      case 'reeds':
        return '#55713c'
      case 'gravel':
        return '#746f64'
      case 'snow':
        return '#d9eee8'
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

  private drawHudClassEquipmentStatus(ctx: CanvasRenderingContext2D, state: RenderState) {
    const model = getClassEquipmentHudModel({
      tankClass: state.player.classId ?? state.tankClasses.active,
      classLabel: state.classEquipmentLabel ?? undefined,
      shells: state.playerShells,
      shellCapacity: state.playerShellCapacity,
      shellRechargeProgress: state.playerShellRechargeProgress,
      onAmmoStation: state.playerOnAmmoStation,
      shield: state.player.shield,
      deployables: state.deployables,
    })
    drawClassEquipmentHudStrip(
      ctx,
      model,
      ARENA_X + 6,
      ARENA_Y + ARENA_HEIGHT + 2,
      ARENA_WIDTH - 12,
      {
        time: state.time,
        teamColor: this.getTeamColors(state, state.playerTeam).trim,
      },
    )
  }

  private drawHudMajorModStatus(ctx: CanvasRenderingContext2D, state: RenderState, x: number, y: number) {
    const selected = state.majorMods.selected
    const label = selected === 'pontoon'
      ? state.majorMods.pontoon.active ? 'MOD BRDG' : 'MOD X'
        : selected === 'hedgehog'
          ? state.majorMods.hedgehog.active
            ? `MOD H${state.majorMods.hedgehog.hitsRemaining}`
            : state.majorMods.hedgehog.spent ? 'MOD SPNT' : 'MOD X'
          : state.majorMods.emp.active
            ? state.majorMods.emp.disrupting ? 'MOD EMP' : `MOD ${Math.ceil(state.majorMods.emp.nextPulseIn)}s`
            : 'MOD X'

    if (state.feedback.touchControlsVisible) {
      drawPixelText(ctx, label, x, y, {
        color: HUD_INK,
        maxWidth: 76,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
      return
    }

    ctx.fillStyle = '#151515'
    ctx.fillRect(x, y, 18, 12)
    ctx.fillStyle = state.majorMods.emp.disrupting ? '#86f4ff' : '#ffd35a'
    ctx.fillRect(x + 4, y + 3, 10, 6)
    drawEquipmentKeycap(ctx, 'X', x - 2, y - 2)
    drawPixelText(ctx, label, x + 22, y, {
      color: HUD_INK,
      maxWidth: 54,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
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
    const hasDefenseBase = state.level.rows.some((row) => row.includes('E'))
    if (state.objective.mode === 'defense' && !hasDefenseBase) {
      return `DESTROY ${this.getDisplayedEnemyTotal(state)}`
    }
    return `BASE ${state.baseHp}/${state.baseMaxHp}`
  }

  private getDisplayedEnemyTotal(state: RenderState) {
    if (state.runKind === 'tutorial' && state.mode === 'briefing') {
      return state.level.enemyTotal
    }
    if (state.objective.mode === 'ffa') {
      return state.activeEnemyCount
    }
    return state.enemiesRemaining + state.activeEnemyCount
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

    if (state.mode === 'garage') {
      this.drawGarageOverlay(ctx, state)
      return
    }

    if (state.mode === 'garage-mods') {
      this.drawGarageModsOverlay(ctx, state)
      return
    }

    if (state.mode === 'briefing' && state.runKind === 'tutorial') {
      this.drawTutorialBriefingOverlay(ctx, state)
      return
    }

    const brightStartMenu = state.mode === 'main-menu'
    ctx.fillStyle = brightStartMenu ? 'rgba(17, 20, 15, 0.54)' : 'rgba(5, 5, 5, 0.66)'
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

    const compactLevelSelect =
      (state.mode === 'level-select' || state.mode === 'tutorial-select')
      && state.menu.options.length > 6
    const optionStartY = compactLevelSelect ? LEVEL_SELECT_OPTION_Y : MENU_OPTION_Y
    const optionStep = compactLevelSelect ? LEVEL_SELECT_OPTION_STEP : MENU_OPTION_STEP
    const optionHeight = compactLevelSelect ? LEVEL_SELECT_OPTION_HEIGHT : MENU_OPTION_HEIGHT

    state.menu.options.forEach((option, index) => {
      const selected = index === state.menu.selectedIndex
      const pressed = index === state.menu.pressedIndex
      const y = optionStartY + index * optionStep + (pressed ? 2 : 0)
      const color = pressed ? '#fff1a5' : selected ? '#f7f3df' : '#b7baae'
      this.drawMenuButton(ctx, MENU_OPTION_X, y, MENU_OPTION_WIDTH, optionHeight, {
        accent,
        bright: brightStartMenu,
        pressed,
        selected,
      })

      if (selected) {
        drawUiSprite(ctx, pressed ? 'menu.selector.pressed' : 'menu.selector', MENU_OPTION_X - 24, y + Math.round((optionHeight - 18) / 2), {
          width: 18,
          height: 18,
          sheet: 'ui32',
        })
      }

      this.drawCenteredMiddleText(ctx, option, MENU_OPTION_X + MENU_OPTION_WIDTH / 2, y + optionHeight / 2 + 1, color, TEXT_SCALE, MENU_OPTION_WIDTH - 28)

      if (state.mode === 'garage' && option.endsWith(' *')) {
        this.drawEquippedModMark(ctx, MENU_OPTION_X + MENU_OPTION_WIDTH - 48, y + 10)
      }
    })

    this.drawCenteredText(ctx, 'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN', arenaCenterX, 406, '#8f8a82', TEXT_SCALE, ARENA_WIDTH - 28)

    ctx.textAlign = 'start'
  }

  private drawTutorialBriefingOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const accent = this.getTeamColors(state, state.playerTeam).body
    const portraitX = ARENA_X + 10
    const portraitY = 58
    const textX = ARENA_X + 80
    const textWidth = ARENA_WIDTH - 96

    ctx.fillStyle = 'rgba(5, 7, 5, 0.84)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'top'

    this.drawTutorialGeneralPortrait(ctx, portraitX, portraitY, state.time)
    drawPixelText(ctx, TUTORIAL_BRIEFING_OFFICER.toUpperCase(), textX, 55, {
      color: '#86f4ff',
      maxWidth: textWidth,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    drawPixelText(ctx, 'RANGE COMMANDER', textX, 67, {
      color: '#89957d',
      maxWidth: textWidth,
      scale: TEXT_SCALE,
      shadowColor: null,
    })

    const titleLines = wrapPixelText(state.menu.title.toUpperCase(), textWidth, TITLE_SCALE).slice(0, 2)
    titleLines.forEach((line, index) => {
      drawPixelText(ctx, line, textX, 82 + index * 17, {
        color: accent,
        maxWidth: textWidth,
        scale: TITLE_SCALE,
        shadowColor: '#102a2a',
      })
    })

    const briefingY = 84 + titleLines.length * 17
    const briefingLines = wrapPixelText(state.menu.helper[0] ?? '', textWidth, TEXT_SCALE).slice(0, 3)
    briefingLines.forEach((line, index) => {
      drawPixelText(ctx, line, textX, briefingY + index * 11, {
        color: '#d8d4c8',
        maxWidth: textWidth,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })

    ctx.fillStyle = '#687463'
    ctx.fillRect(textX, 151, textWidth, 1)

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
        drawUiSprite(ctx, pressed ? 'menu.selector.pressed' : 'menu.selector', MENU_OPTION_X - 24, y + 5, {
          width: 18,
          height: 18,
          sheet: 'ui32',
        })
      }
      this.drawCenteredMiddleText(
        ctx,
        option,
        MENU_OPTION_X + MENU_OPTION_WIDTH / 2,
        y + MENU_OPTION_HEIGHT / 2 + 1,
        color,
        TEXT_SCALE,
        MENU_OPTION_WIDTH - 28,
      )
    })

    const recommendation = state.menu.helper[1] ?? ''
    const equipped = state.menu.helper[2] ?? ''
    drawPixelText(ctx, recommendation.toUpperCase(), MENU_OPTION_X, 282, {
      color: '#d8d4c8',
      maxWidth: MENU_OPTION_WIDTH,
      scale: TEXT_SCALE,
      shadowColor: null,
    })
    wrapPixelText(equipped.toUpperCase(), MENU_OPTION_WIDTH, TEXT_SCALE).slice(0, 2).forEach((line, index) => {
      drawPixelText(ctx, line, MENU_OPTION_X, 298 + index * 11, {
        color: '#9fb5aa',
        maxWidth: MENU_OPTION_WIDTH,
        scale: TEXT_SCALE,
        shadowColor: null,
      })
    })

    this.drawCenteredText(
      ctx,
      'ENTER/SPACE SELECT  ESC BACK  F FULLSCREEN',
      ARENA_X + ARENA_WIDTH / 2,
      406,
      '#8f8a82',
      TEXT_SCALE,
      ARENA_WIDTH - 28,
    )
    ctx.textAlign = 'start'
  }

  private drawTutorialGeneralPortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    scale = 2,
    speaking = true,
  ) {
    const talking = speaking && Math.floor(time * 5) % 2 === 0
    const blinking = time % 4.2 > 4

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)

    ctx.fillStyle = '#141914'
    ctx.fillRect(0, 0, 32, 44)
    ctx.fillStyle = '#66705a'
    ctx.fillRect(1, 1, 30, 42)
    ctx.fillStyle = '#20261f'
    ctx.fillRect(3, 3, 26, 38)

    ctx.fillStyle = '#35422e'
    ctx.fillRect(4, 3, 24, 7)
    ctx.fillStyle = '#536245'
    ctx.fillRect(7, 1, 18, 6)
    ctx.fillStyle = '#1a2018'
    ctx.fillRect(3, 9, 26, 3)
    ctx.fillStyle = '#d5b55a'
    ctx.fillRect(14, 3, 4, 3)

    ctx.fillStyle = '#8d684d'
    ctx.fillRect(7, 12, 18, 17)
    ctx.fillRect(5, 17, 3, 7)
    ctx.fillRect(24, 17, 3, 7)
    ctx.fillStyle = '#bd8b64'
    ctx.fillRect(9, 12, 14, 18)
    ctx.fillStyle = '#d8a077'
    ctx.fillRect(11, 14, 10, 11)

    ctx.fillStyle = '#d1d0c2'
    ctx.fillRect(7, 13, 3, 9)
    ctx.fillRect(22, 13, 3, 9)
    ctx.fillStyle = blinking ? '#6d4a38' : '#171717'
    ctx.fillRect(11, 18, 3, blinking ? 1 : 2)
    ctx.fillRect(18, 18, 3, blinking ? 1 : 2)
    ctx.fillStyle = '#8d6048'
    ctx.fillRect(15, 19, 3, 5)
    ctx.fillStyle = '#d1d0c2'
    ctx.fillRect(11, 24, 4, 2)
    ctx.fillRect(18, 24, 4, 2)
    ctx.fillStyle = '#4a2d27'
    ctx.fillRect(15, 26, 3, talking ? 3 : 1)
    if (talking) {
      ctx.fillStyle = '#ead7b6'
      ctx.fillRect(15, 26, 3, 1)
    }

    ctx.fillStyle = '#35422e'
    ctx.fillRect(3, 31, 26, 11)
    ctx.fillStyle = '#536245'
    ctx.fillRect(8, 29, 16, 13)
    ctx.fillStyle = '#1b2219'
    ctx.fillRect(14, 30, 4, 12)
    ctx.fillStyle = '#c7a349'
    ctx.fillRect(7, 34, 3, 2)
    ctx.fillRect(11, 34, 2, 2)
    ctx.fillStyle = '#b64a3c'
    ctx.fillRect(22, 33, 3, 3)
    ctx.fillStyle = '#d5b55a'
    ctx.fillRect(22, 37, 4, 2)

    ctx.fillStyle = talking ? '#86f4ff' : '#52635b'
    ctx.fillRect(29, 18, 2, 2)
    ctx.fillRect(30, 22, talking ? 2 : 1, 1)
    ctx.restore()
  }

  private drawTutorialSpeakerPortrait(
    ctx: CanvasRenderingContext2D,
    speaker: TutorialSpeaker,
    x: number,
    y: number,
    time: number,
    scale = 1,
    speaking = true,
  ) {
    if (speaker === 'Needle') {
      this.drawTutorialNeedlePortrait(ctx, x, y, time, scale, speaking)
      return
    }
    if (speaker === 'Spanner') {
      this.drawTutorialSpannerPortrait(ctx, x, y, time, scale, speaking)
      return
    }
    if (speaker === 'Brick') {
      this.drawTutorialBrickPortrait(ctx, x, y, time, scale, speaking)
      return
    }
    this.drawTutorialGeneralPortrait(ctx, x, y, time, scale, speaking)
  }

  private drawTutorialNeedlePortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    scale = 1,
    speaking = true,
  ) {
    const talking = speaking && Math.floor(time * 6) % 2 === 0
    const blinking = time % 3.7 > 3.52

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)

    ctx.fillStyle = '#10191a'
    ctx.fillRect(0, 0, 32, 44)
    ctx.fillStyle = '#3f6f6c'
    ctx.fillRect(1, 1, 30, 42)
    ctx.fillStyle = '#152526'
    ctx.fillRect(3, 3, 26, 38)

    ctx.fillStyle = '#284c4e'
    ctx.fillRect(6, 3, 20, 7)
    ctx.fillStyle = '#5c8983'
    ctx.fillRect(9, 1, 14, 5)
    ctx.fillStyle = '#8ed9d1'
    ctx.fillRect(8, 8, 16, 3)
    ctx.fillStyle = '#1a2d30'
    ctx.fillRect(4, 10, 24, 2)

    ctx.fillStyle = '#9a6847'
    ctx.fillRect(8, 12, 16, 16)
    ctx.fillStyle = '#c98c62'
    ctx.fillRect(10, 13, 12, 15)
    ctx.fillStyle = '#dfa57b'
    ctx.fillRect(12, 14, 8, 10)
    ctx.fillStyle = '#203638'
    ctx.fillRect(7, 16, 4, 5)
    ctx.fillRect(21, 16, 4, 5)
    ctx.fillStyle = blinking ? '#76513d' : '#11191b'
    ctx.fillRect(11, 18, 3, blinking ? 1 : 2)
    ctx.fillRect(18, 18, 3, blinking ? 1 : 2)
    ctx.fillStyle = '#88563e'
    ctx.fillRect(15, 20, 2, 4)
    ctx.fillStyle = '#4a2a27'
    ctx.fillRect(14, 25, 4, talking ? 3 : 1)
    if (talking) {
      ctx.fillStyle = '#efd0aa'
      ctx.fillRect(15, 25, 2, 1)
    }

    ctx.fillStyle = '#203b3c'
    ctx.fillRect(6, 29, 20, 4)
    ctx.fillStyle = '#2c5b59'
    ctx.fillRect(4, 33, 24, 9)
    ctx.fillStyle = '#74aaa3'
    ctx.fillRect(12, 30, 8, 12)
    ctx.fillStyle = '#132627'
    ctx.fillRect(15, 33, 2, 9)
    ctx.fillStyle = '#8ed9d1'
    ctx.fillRect(7, 36, 3, 2)
    ctx.fillRect(22, 36, 3, 2)
    ctx.fillStyle = talking ? '#86f4ff' : '#426a68'
    ctx.fillRect(27, 17, 2, 2)
    ctx.fillRect(29, 19, 2, 5)
    ctx.restore()
  }

  private drawTutorialSpannerPortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    scale = 1,
    speaking = true,
  ) {
    const talking = speaking && Math.floor(time * 5) % 2 === 0
    const blinking = time % 4.5 > 4.32

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)

    ctx.fillStyle = '#19170f'
    ctx.fillRect(0, 0, 32, 44)
    ctx.fillStyle = '#796b38'
    ctx.fillRect(1, 1, 30, 42)
    ctx.fillStyle = '#292616'
    ctx.fillRect(3, 3, 26, 38)

    ctx.fillStyle = '#b78b2f'
    ctx.fillRect(6, 3, 20, 7)
    ctx.fillStyle = '#e1b84f'
    ctx.fillRect(9, 1, 14, 6)
    ctx.fillStyle = '#5f491e'
    ctx.fillRect(4, 9, 24, 3)
    ctx.fillStyle = '#ede0ac'
    ctx.fillRect(14, 3, 4, 3)

    ctx.fillStyle = '#86583d'
    ctx.fillRect(7, 12, 18, 17)
    ctx.fillStyle = '#b97a55'
    ctx.fillRect(9, 13, 14, 17)
    ctx.fillStyle = '#d69a70'
    ctx.fillRect(11, 14, 10, 11)
    ctx.fillStyle = '#d7c78a'
    ctx.fillRect(9, 17, 6, 4)
    ctx.fillRect(17, 17, 6, 4)
    ctx.fillStyle = '#46391e'
    ctx.fillRect(15, 18, 2, 1)
    ctx.fillStyle = blinking ? '#78513d' : '#171512'
    ctx.fillRect(11, 18, 3, blinking ? 1 : 2)
    ctx.fillRect(18, 18, 3, blinking ? 1 : 2)
    ctx.fillStyle = '#7a4b36'
    ctx.fillRect(15, 21, 3, 4)
    ctx.fillStyle = '#36201d'
    ctx.fillRect(14, 26, 5, talking ? 3 : 1)
    if (talking) {
      ctx.fillStyle = '#f0cf9d'
      ctx.fillRect(15, 26, 3, 1)
    }
    ctx.fillStyle = '#372d1b'
    ctx.fillRect(21, 23, 2, 2)

    ctx.fillStyle = '#4e4b29'
    ctx.fillRect(4, 31, 24, 11)
    ctx.fillStyle = '#7f783b'
    ctx.fillRect(9, 29, 14, 13)
    ctx.fillStyle = '#252317'
    ctx.fillRect(15, 30, 3, 12)
    ctx.fillStyle = '#e1b84f'
    ctx.fillRect(7, 35, 4, 2)
    ctx.fillRect(22, 35, 3, 2)
    ctx.fillStyle = talking ? '#ffe077' : '#75652f'
    ctx.fillRect(28, 18, 2, 2)
    ctx.fillRect(29, 22, 2, 4)
    ctx.restore()
  }

  private drawTutorialBrickPortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    scale = 1,
    speaking = true,
  ) {
    const talking = speaking && Math.floor(time * 4) % 2 === 0
    const blinking = time % 5.1 > 4.92

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)

    ctx.fillStyle = '#1d1110'
    ctx.fillRect(0, 0, 32, 44)
    ctx.fillStyle = '#7b4941'
    ctx.fillRect(1, 1, 30, 42)
    ctx.fillStyle = '#2b1918'
    ctx.fillRect(3, 3, 26, 38)

    ctx.fillStyle = '#54302d'
    ctx.fillRect(3, 4, 26, 8)
    ctx.fillStyle = '#74443d'
    ctx.fillRect(7, 2, 18, 6)
    ctx.fillStyle = '#241716'
    ctx.fillRect(2, 10, 28, 3)
    ctx.fillStyle = '#c28945'
    ctx.fillRect(14, 4, 4, 3)

    ctx.fillStyle = '#744731'
    ctx.fillRect(5, 13, 22, 15)
    ctx.fillStyle = '#a76b4d'
    ctx.fillRect(7, 13, 18, 17)
    ctx.fillStyle = '#c48662'
    ctx.fillRect(10, 14, 12, 12)
    ctx.fillStyle = '#3a2420'
    ctx.fillRect(7, 16, 5, 3)
    ctx.fillRect(20, 16, 5, 3)
    ctx.fillStyle = blinking ? '#684336' : '#151313'
    ctx.fillRect(11, 18, 3, blinking ? 1 : 2)
    ctx.fillRect(18, 18, 3, blinking ? 1 : 2)
    ctx.fillStyle = '#784733'
    ctx.fillRect(15, 20, 3, 5)
    ctx.fillStyle = '#e0c5a1'
    ctx.fillRect(20, 20, 1, 5)
    ctx.fillStyle = '#36201f'
    ctx.fillRect(12, 26, 8, talking ? 3 : 2)
    if (talking) {
      ctx.fillStyle = '#edc39d'
      ctx.fillRect(14, 26, 4, 1)
    }

    ctx.fillStyle = '#4b2c29'
    ctx.fillRect(2, 32, 28, 10)
    ctx.fillStyle = '#70413b'
    ctx.fillRect(7, 29, 18, 13)
    ctx.fillStyle = '#261918'
    ctx.fillRect(14, 30, 5, 12)
    ctx.fillStyle = '#c28945'
    ctx.fillRect(6, 35, 4, 3)
    ctx.fillRect(23, 35, 4, 3)
    ctx.fillStyle = talking ? '#ff9b79' : '#72423b'
    ctx.fillRect(28, 18, 2, 2)
    ctx.fillRect(29, 22, 2, 4)
    ctx.restore()
  }

  private drawGarageOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const garage = state.garage
    if (!garage) {
      return
    }

    ctx.fillStyle = 'rgba(14, 17, 13, 0.76)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const accent = this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    this.drawMenuPlaque(ctx, arenaCenterX - 122, 48, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, 'Garage', arenaCenterX, 65, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, arenaCenterX - 76, 88, 152, '#89957d')

    const tankLabel = state.tankClasses.options.find((option) => option.selected)?.shortLabel ?? state.tankClasses.selected.toUpperCase()
    const overviewLabels = [
      `TEAM: ${state.playerTeam.toUpperCase()}`,
      `TANK: ${tankLabel}`,
      `MODS: ${garage.mods.find((mod) => mod.selected)?.label.toUpperCase() ?? 'NONE'}`,
    ]

    overviewLabels.forEach((label, index) => {
      const focused = state.menu.selectedIndex === index
      const pressed = state.menu.pressedIndex === index
      const y = GARAGE_OVERVIEW_Y + index * GARAGE_OVERVIEW_STEP + (pressed ? 2 : 0)
      this.drawMenuButton(ctx, GARAGE_OVERVIEW_X, y, GARAGE_OVERVIEW_WIDTH, GARAGE_OVERVIEW_HEIGHT, {
        accent,
        bright: true,
        pressed,
        selected: focused,
      })
      this.drawCenteredMiddleText(
        ctx,
        label,
        GARAGE_OVERVIEW_X + GARAGE_OVERVIEW_WIDTH / 2,
        y + GARAGE_OVERVIEW_HEIGHT / 2 + 1,
        pressed ? '#fff1a5' : focused ? '#f7f3df' : '#c8ccbf',
        TEXT_SCALE,
        GARAGE_OVERVIEW_WIDTH - 32,
      )
    })

    const backIndex = 3
    const backPressed = state.menu.pressedIndex === backIndex
    const backFocused = state.menu.selectedIndex === backIndex
    const backY = GARAGE_BACK_Y + (backPressed ? 2 : 0)
    this.drawMenuButton(ctx, MENU_OPTION_X, backY, MENU_OPTION_WIDTH, MENU_OPTION_HEIGHT, {
      accent,
      bright: true,
      pressed: backPressed,
      selected: backFocused,
    })
    this.drawCenteredMiddleText(
      ctx,
      'Back',
      MENU_OPTION_X + MENU_OPTION_WIDTH / 2,
      backY + MENU_OPTION_HEIGHT / 2 + 1,
      backPressed ? '#fff1a5' : backFocused ? '#f7f3df' : '#bfc4b8',
      TEXT_SCALE,
      MENU_OPTION_WIDTH - 28,
    )
    this.drawCenteredText(ctx, 'ENTER OPEN  ESC BACK', arenaCenterX, 406, '#99958a', TEXT_SCALE, ARENA_WIDTH - 28)
    ctx.textAlign = 'start'
  }

  private drawGarageModsOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    const garage = state.garage
    if (!garage) {
      return
    }

    ctx.fillStyle = 'rgba(14, 17, 13, 0.8)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const accent = this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    this.drawMenuPlaque(ctx, arenaCenterX - 122, 48, 244, 32, accent)
    this.drawCenteredMiddleText(ctx, 'Garage / Mods', arenaCenterX, 65, accent, TITLE_SCALE)
    this.drawMenuRule(ctx, arenaCenterX - 76, 88, 152, '#89957d')
    drawPixelText(ctx, 'CHOOSE ONE MOD:', GARAGE_MOD_TAB_X, 106, {
      align: 'left',
      color: '#d8d4c8',
      scale: TEXT_SCALE,
    })
    ctx.fillStyle = '#6f7c68'
    ctx.fillRect(GARAGE_MOD_TAB_X + 106, 110, 54, 1)

    garage.mods.forEach((mod, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = GARAGE_MOD_TAB_X + column * (GARAGE_MOD_TAB_SIZE + GARAGE_MOD_TAB_GAP)
      const baseY = GARAGE_MOD_TAB_Y + row * (GARAGE_MOD_TAB_SIZE + GARAGE_MOD_TAB_GAP)
      const focused = state.menu.selectedIndex === index
      const pressed = state.menu.pressedIndex === index
      const y = baseY + (pressed ? 2 : 0)

      this.drawMenuButton(ctx, x, y, GARAGE_MOD_TAB_SIZE, GARAGE_MOD_TAB_SIZE, {
        accent,
        bright: true,
        pressed,
        selected: focused,
      })
      this.drawGarageModIcon(ctx, state, mod.kind, x, y, focused)
      drawPixelText(ctx, this.getGarageModShortLabel(mod.kind), x + GARAGE_MOD_TAB_SIZE / 2, y + 61, {
        align: 'center',
        color: mod.selected ? '#fff1a5' : focused ? '#f7f3df' : '#bfc4b8',
        maxWidth: GARAGE_MOD_TAB_SIZE - 10,
        scale: TEXT_SCALE,
      })

      if (mod.selected) {
        ctx.fillStyle = '#111511'
        ctx.fillRect(x + GARAGE_MOD_TAB_SIZE - 22, y + 7, 15, 10)
        drawPixelText(ctx, 'ON', x + GARAGE_MOD_TAB_SIZE - 15, y + 9, {
          align: 'center',
          color: '#fff1a5',
          scale: TEXT_SCALE,
        })
      }
    })

    const focusedMod = garage.selectedMod ?? garage.mods.find((mod) => mod.selected) ?? garage.mods[0]
    if (focusedMod) {
      this.drawGarageModDescription(ctx, focusedMod, accent)
    }

    const backIndex = garage.mods.length
    const backPressed = state.menu.pressedIndex === backIndex
    const backFocused = state.menu.selectedIndex === backIndex
    const backY = GARAGE_BACK_Y + (backPressed ? 2 : 0)
    this.drawMenuButton(ctx, MENU_OPTION_X, backY, MENU_OPTION_WIDTH, MENU_OPTION_HEIGHT, {
      accent,
      bright: true,
      pressed: backPressed,
      selected: backFocused,
    })
    this.drawCenteredMiddleText(
      ctx,
      'Back To Garage',
      MENU_OPTION_X + MENU_OPTION_WIDTH / 2,
      backY + MENU_OPTION_HEIGHT / 2 + 1,
      backPressed ? '#fff1a5' : backFocused ? '#f7f3df' : '#bfc4b8',
      TEXT_SCALE,
      MENU_OPTION_WIDTH - 28,
    )
    this.drawCenteredText(ctx, 'ARROWS FOCUS  ENTER EQUIP  ESC GARAGE', arenaCenterX, 406, '#99958a', TEXT_SCALE, ARENA_WIDTH - 28)
    ctx.textAlign = 'start'
  }

  private drawGarageModDescription(
    ctx: CanvasRenderingContext2D,
    mod: MajorModPresentation,
    accent: string,
  ) {
    const x = GARAGE_DESCRIPTION_X
    const y = GARAGE_DESCRIPTION_Y
    const width = GARAGE_DESCRIPTION_WIDTH
    const height = GARAGE_DESCRIPTION_HEIGHT
    const textX = x + 12
    const textWidth = width - 24

    ctx.fillStyle = '#070907'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#20271f'
    ctx.fillRect(x + 2, y + 2, width - 4, height - 5)
    ctx.fillStyle = '#74806d'
    ctx.fillRect(x + 7, y + 7, width - 14, 2)
    ctx.fillStyle = accent
    ctx.fillRect(x + 7, y + height - 8, width - 14, 2)

    drawPixelText(ctx, mod.label.toUpperCase(), textX, y + 14, {
      align: 'left',
      color: '#f7f3df',
      maxWidth: textWidth,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, mod.selected ? 'EQUIPPED' : 'ENTER TO EQUIP', x + width - 12, y + 14, {
      align: 'right',
      color: mod.selected ? '#fff1a5' : '#9da796',
      maxWidth: 92,
      scale: TEXT_SCALE,
    })

    this.drawGarageDescriptionLines(ctx, mod.description, textX, y + 30, textWidth, 3, '#c8ccbf')
    drawPixelText(ctx, 'HOW TO USE', textX, y + 64, {
      align: 'left',
      color: '#89957d',
      scale: TEXT_SCALE,
    })
    this.drawGarageDescriptionLines(ctx, mod.effect, textX, y + 76, textWidth, 3, '#e0dccf')
    drawPixelText(ctx, 'BEST USE', textX, y + 112, {
      align: 'left',
      color: '#89957d',
      scale: TEXT_SCALE,
    })
    this.drawGarageDescriptionLines(ctx, mod.bestUse, textX, y + 124, textWidth, 3, '#c8ccbf')
    drawPixelText(ctx, 'TRADEOFF', textX, y + 160, {
      align: 'left',
      color: '#89957d',
      scale: TEXT_SCALE,
    })
    this.drawGarageDescriptionLines(ctx, mod.tradeoff, textX, y + 172, textWidth, 2, '#c8ccbf')
  }

  private drawGarageDescriptionLines(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    width: number,
    maximum: number,
    color: string,
  ) {
    wrapPixelText(value, width, TEXT_SCALE).slice(0, maximum).forEach((line, index) => {
      drawPixelText(ctx, line, x, y + index * 10, {
        align: 'left',
        color,
        maxWidth: width,
        scale: TEXT_SCALE,
      })
    })
  }

  private drawGarageModIcon(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    kind: MajorModKind,
    x: number,
    y: number,
    focused: boolean,
  ) {
    const centerX = x + GARAGE_MOD_TAB_SIZE / 2
    const centerY = y + 32
    const colors = this.getTeamColors(state, state.playerTeam)

    ctx.save()
    if (kind === 'overdrive') {
      ctx.fillStyle = focused ? '#ffd35a' : '#8b7a42'
      ctx.fillRect(x + 10, y + 20, 20, 2)
      ctx.fillRect(x + 14, y + 27, 14, 2)
      ctx.fillRect(x + 9, y + 34, 23, 2)
      drawBattlefieldTank(ctx, centerX + 8, centerY, 34, 'right', colors, {
        focused,
        self: true,
        tankClass: state.tankClasses.selected,
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
    } else if (kind === 'pontoon') {
      ctx.fillStyle = '#243d47'
      ctx.fillRect(centerX - 23, centerY - 17, 46, 34)
      ctx.fillStyle = '#355966'
      ctx.fillRect(centerX - 20, centerY - 12, 40, 2)
      ctx.fillRect(centerX - 18, centerY + 9, 36, 2)
      ctx.fillStyle = '#8c7143'
      for (let plank = 0; plank < 5; plank += 1) {
        ctx.fillRect(centerX - 17 + plank * 7, centerY - 18, 5, 36)
      }
      ctx.fillStyle = '#d8bd74'
      ctx.fillRect(centerX - 18, centerY - 12, 36, 2)
      ctx.fillRect(centerX - 18, centerY + 10, 36, 2)
    } else if (kind === 'hedgehog') {
      ctx.fillStyle = '#151918'
      for (let step = -9; step <= 9; step += 1) {
        ctx.fillRect(centerX + step * 2 - 2, centerY + step - 2, 5, 5)
        ctx.fillRect(centerX + step * 2 - 2, centerY - step - 2, 5, 5)
      }
      ctx.fillStyle = '#aeb8b4'
      for (let step = -8; step <= 8; step += 2) {
        ctx.fillRect(centerX + step * 2 - 1, centerY + step - 1, 3, 3)
        ctx.fillRect(centerX + step * 2 - 1, centerY - step - 1, 3, 3)
      }
      ctx.fillStyle = '#d5b45a'
      ctx.fillRect(centerX - 3, centerY - 3, 6, 6)
    } else {
      ctx.strokeStyle = focused ? '#86f4ff' : '#4e8a8d'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY - 3, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX, centerY - 3, 15, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#111716'
      ctx.fillRect(centerX - 15, centerY - 13, 30, 29)
      ctx.fillStyle = '#536761'
      ctx.fillRect(centerX - 11, centerY - 9, 22, 21)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(centerX - 4, centerY - 6, 8, 8)
      ctx.fillStyle = '#d84a3f'
      ctx.fillRect(centerX + 6, centerY + 6, 3, 3)
      ctx.fillStyle = '#151918'
      ctx.fillRect(centerX - 18, centerY + 13, 36, 4)
    }
    ctx.restore()
  }

  private getGarageModShortLabel(kind: MajorModKind) {
    if (kind === 'overdrive') return 'OVERDRIVE'
    if (kind === 'pontoon') return 'PONTOON'
    if (kind === 'hedgehog') return 'HEDGEHOG'
    return 'EMP'
  }

  private drawTankSelectOverlay(ctx: CanvasRenderingContext2D, state: RenderState) {
    ctx.fillStyle = 'rgba(5, 7, 5, 0.82)'
    ctx.fillRect(ARENA_X, ARENA_Y, ARENA_WIDTH, ARENA_HEIGHT)
    const accent = this.getTeamColors(state, state.playerTeam).body
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    const displayed = state.tankClasses.options.find(
      (option) => option.id === state.tankClasses.showcase.displayed,
    ) ?? state.tankClasses.options.find((option) => option.selected)

    if (!displayed) {
      return
    }

    const displayedIndex = state.tankClasses.options.findIndex((option) => option.id === displayed.id)
    const previous = state.tankClasses.options[
      (displayedIndex - 1 + state.tankClasses.options.length) % state.tankClasses.options.length
    ]
    const next = state.tankClasses.options[(displayedIndex + 1) % state.tankClasses.options.length]

    this.drawTankClassShowcaseTheater(ctx, state, displayed, accent)
    this.drawTankClassDescription(ctx, state, displayed, accent)
    this.drawTankClassCarouselArrow(ctx, 'left', previous.id === 'engineer' ? 'ENGR' : previous.shortLabel, accent)
    this.drawTankClassCarouselArrow(ctx, 'right', next.id === 'engineer' ? 'ENGR' : next.shortLabel, accent)

    const backPressed = state.menu.pressedIndex === state.tankClasses.options.length
    const backY = TANK_SELECT_BACK_Y + (backPressed ? 2 : 0)
    this.drawMenuButton(ctx, MENU_OPTION_X, backY, MENU_OPTION_WIDTH, 24, {
      accent,
      pressed: backPressed,
      selected: state.menu.selectedIndex === state.tankClasses.options.length,
    })
    this.drawCenteredMiddleText(
      ctx,
      'Back',
      MENU_OPTION_X + MENU_OPTION_WIDTH / 2,
      backY + 13,
      backPressed ? '#fff1a5' : '#f7f3df',
      TEXT_SCALE,
      MENU_OPTION_WIDTH - 28,
    )

    this.drawCenteredText(ctx, 'LEFT/RIGHT PREVIEW  ENTER EQUIP  ESC GARAGE', arenaCenterX, 410, '#99958a', TEXT_SCALE, ARENA_WIDTH - 18)
    ctx.textAlign = 'start'
  }

  private drawTankClassShowcaseTheater(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    accent: string,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const width = TANK_SELECT_CONTENT_WIDTH
    const height = TANK_SELECT_THEATER_HEIGHT
    const showcase = state.tankClasses.showcase

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.clip()

    ctx.fillStyle = '#0e130f'
    ctx.fillRect(x, y, width, height)
    this.drawShowcaseBattlefieldGround(ctx, x + 3, y + 22, width - 6, height - 40)

    drawPixelText(ctx, tankClass.label.toUpperCase(), x + 8, y + 7, {
      color: '#f7f3df',
      scale: TEXT_SCALE,
      maxWidth: width * 0.58,
    })
    drawPixelText(ctx, showcase.sceneLabel, TANK_SELECT_PLAYBACK_CONTROL_X - 5, y + 7, {
      align: 'right',
      color: accent,
      scale: TEXT_SCALE,
      maxWidth: 94,
    })
    this.drawTankClassPlaybackControls(ctx, showcase.paused, accent)

    const sceneTime = Math.min(
      showcase.actionWindow,
      getTankClassShowcaseSceneTime(
        showcase.sceneProgress,
        showcase.sceneDuration,
      ),
    )

    if (showcase.scene === 'shooting') {
      this.drawTankClassShootingScene(ctx, state, tankClass, sceneTime)
    } else if (showcase.scene === 'breach') {
      this.drawTankClassBreachScene(ctx, state, tankClass, sceneTime)
    } else if (showcase.scene === 'duel') {
      this.drawTankClassDuelScene(ctx, state, tankClass, sceneTime)
    } else if (showcase.scene === 'race') {
      this.drawTankClassRaceScene(ctx, state, tankClass, sceneTime)
    } else {
      this.drawTankClassKitScene(ctx, state, tankClass, sceneTime)
    }

    const segmentY = y + height - 12
    const segmentGap = 3
    const segmentWidth = Math.floor((width - 16 - segmentGap * 4) / 5)
    for (let index = 0; index < 5; index += 1) {
      const segmentX = x + 8 + index * (segmentWidth + segmentGap)
      ctx.fillStyle = '#151916'
      ctx.fillRect(segmentX, segmentY, segmentWidth, 5)
      if (index < showcase.sceneIndex) {
        ctx.fillStyle = '#7f8b72'
        ctx.fillRect(segmentX + 1, segmentY + 1, segmentWidth - 2, 3)
      } else if (index === showcase.sceneIndex) {
        ctx.fillStyle = accent
        ctx.fillRect(
          segmentX + 1,
          segmentY + 1,
          Math.max(2, Math.floor((segmentWidth - 2) * showcase.sceneProgress)),
          3,
        )
      }
    }
    ctx.restore()

    ctx.strokeStyle = '#6f7868'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
    ctx.strokeStyle = '#151916'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 4, y + 4, width - 8, height - 8)
  }

  private drawTankClassPlaybackControls(
    ctx: CanvasRenderingContext2D,
    paused: boolean,
    accent: string,
  ) {
    for (let index = 0; index < 3; index += 1) {
      const x =
        TANK_SELECT_PLAYBACK_CONTROL_X +
        index *
          (TANK_SELECT_PLAYBACK_CONTROL_SIZE +
            TANK_SELECT_PLAYBACK_CONTROL_GAP)
      const y = TANK_SELECT_PLAYBACK_CONTROL_Y
      ctx.fillStyle = '#111611'
      ctx.fillRect(
        x,
        y,
        TANK_SELECT_PLAYBACK_CONTROL_SIZE,
        TANK_SELECT_PLAYBACK_CONTROL_SIZE,
      )
      ctx.strokeStyle = index === 1 && paused ? accent : '#667061'
      ctx.lineWidth = 1
      ctx.strokeRect(
        x + 0.5,
        y + 0.5,
        TANK_SELECT_PLAYBACK_CONTROL_SIZE - 1,
        TANK_SELECT_PLAYBACK_CONTROL_SIZE - 1,
      )
      ctx.fillStyle = index === 1 && paused ? accent : '#d8d4c8'

      if (index === 0) {
        ctx.fillRect(x + 3, y + 3, 1, 7)
        ctx.beginPath()
        ctx.moveTo(x + 4, y + 6.5)
        ctx.lineTo(x + 9, y + 3)
        ctx.lineTo(x + 9, y + 10)
        ctx.closePath()
        ctx.fill()
      } else if (index === 2) {
        ctx.fillRect(x + 9, y + 3, 1, 7)
        ctx.beginPath()
        ctx.moveTo(x + 9, y + 6.5)
        ctx.lineTo(x + 4, y + 3)
        ctx.lineTo(x + 4, y + 10)
        ctx.closePath()
        ctx.fill()
      } else if (paused) {
        ctx.beginPath()
        ctx.moveTo(x + 5, y + 3)
        ctx.lineTo(x + 10, y + 6.5)
        ctx.lineTo(x + 5, y + 10)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillRect(x + 4, y + 3, 2, 7)
        ctx.fillRect(x + 8, y + 3, 2, 7)
      }
    }
  }

  private drawTankClassShootingScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const projectileDistance = 150
    const projectileDuration = getTankClassShowcaseTravelDuration(
      projectileDistance,
      PLAYER_BULLET_SPEED,
    )
    const engineer =
      state.tankClasses.options.find(
        (option) => option.id === 'engineer',
      ) ?? tankClass
    const playerColors = this.getTeamColors(
      state,
      state.playerTeam,
    )
    const enemyColors = this.getTeamColors(
      state,
      state.enemyTeam,
    )
    const lanes = [
      {
        presentation: tankClass,
        y: y + 73,
        accent: '#78d4ff',
        primary: true,
      },
      {
        presentation: engineer,
        y: y + 125,
        accent: '#d8d4c8',
        primary: false,
      },
    ] as const

    this.drawShowcaseRoad(ctx, x + 7, y + 57, 9, 41)
    this.drawShowcaseRoad(ctx, x + 7, y + 109, 9, 42)

    lanes.forEach((lane) => {
      const cadence = getTankClassShowcaseFireCadence(
        sceneTime,
        lane.presentation.demonstration.reloadTime,
        projectileDuration,
      )
      const targetX = x + 252
      const shellStartX = x + 82

      drawBattlefieldTank(
        ctx,
        x + 54,
        lane.y,
        42,
        'right',
        playerColors,
        {
          self: lane.primary,
          tankClass: lane.presentation.id,
          teamKey: this.getTeamKey(state, state.playerTeam),
        },
      )
      if (lane.primary) {
        this.drawShowcaseClassPointer(
          ctx,
          x + 38,
          lane.y,
          lane.accent,
        )
      }
      drawBattlefieldTank(
        ctx,
        targetX,
        lane.y,
        40,
        'left',
        enemyColors,
        {
          damage: 0,
          tankClass: 'engineer',
          teamKey: this.getTeamKey(state, state.enemyTeam),
        },
      )
      this.drawShowcaseHealthBar(
        ctx,
        x + 224,
        lane.y - 19,
        54,
        1,
        1,
        '#f06b4c',
        4,
      )
      drawPixelText(
        ctx,
        String(cadence.shotsFired),
        targetX - 27,
        lane.y - 7,
        {
          align: 'right',
          baseline: 'middle',
          color: lane.accent,
          scale: 2,
        },
      )

      if (cadence.projectileVisible) {
        drawClassShellProjectile(
          ctx,
          shellStartX +
            cadence.projectileProgress *
              projectileDistance,
          lane.y,
          'right',
          lane.presentation.id,
          playerColors.body,
          Math.floor(sceneTime * 12),
        )
      }
      if (cadence.muzzleFlashVisible) {
        this.drawShowcaseMuzzleFlash(
          ctx,
          x + 83,
          lane.y,
        )
      }
      if (cadence.impactVisible) {
        this.drawShowcaseImpactParticles(
          ctx,
          x + 228,
          lane.y,
          lane.presentation.demonstration.splashDamage > 0
            ? 'he'
            : 'direct',
          cadence.impactProgress,
        )
      }

      ctx.fillStyle = '#151916'
      ctx.fillRect(x + 91, lane.y + 10, 132, 4)
      ctx.fillStyle = lane.accent
      ctx.fillRect(
        x + 92,
        lane.y + 11,
        Math.round(130 * cadence.reloadProgress),
        2,
      )
    })
  }

  private drawShowcaseClassPointer(
    ctx: CanvasRenderingContext2D,
    tipX: number,
    y: number,
    color: string,
  ) {
    ctx.fillStyle = '#111611'
    ctx.fillRect(tipX - 12, y - 3, 7, 7)
    ctx.beginPath()
    ctx.moveTo(tipX - 6, y - 5)
    ctx.lineTo(tipX + 1, y)
    ctx.lineTo(tipX - 6, y + 5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = color
    ctx.fillRect(tipX - 11, y - 1, 6, 3)
    ctx.beginPath()
    ctx.moveTo(tipX - 6, y - 3)
    ctx.lineTo(tipX, y)
    ctx.lineTo(tipX - 6, y + 3)
    ctx.closePath()
    ctx.fill()
  }

  private drawTankClassBreachScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const needsSecondHit =
      tankClass.demonstration.directDamage <
      tankClass.demonstration.brickHp
    const projectileDistance = 116
    const projectileDuration = getTankClassShowcaseTravelDuration(
      projectileDistance,
      PLAYER_BULLET_SPEED,
    )
    const firstShotStart = 0.72
    const firstImpactAt = firstShotStart + projectileDuration
    const secondShotStart =
      firstShotStart + tankClass.demonstration.reloadTime
    const secondImpactAt = secondShotStart + projectileDuration
    const destroyed =
      sceneTime >= (needsSecondHit ? secondImpactAt : firstImpactAt)
    const firstImpact = sceneTime >= firstImpactAt
    const splashOutcome = getTankClassShowcaseSplashOutcome(
      tankClass,
      tankClass.demonstration.brickHp,
      tankClass.demonstration.brickHp,
      destroyed,
    )
    const adjacentHp = splashOutcome.nearbyHp
    const targetHp = destroyed
      ? 0
      : firstImpact
        ? Math.max(
            0,
            tankClass.demonstration.brickHp -
              tankClass.demonstration.directDamage,
          )
        : tankClass.demonstration.brickHp
    this.drawShowcaseRoad(ctx, x + 7, y + 88, 9, 53)
    drawBattlefieldTank(ctx, x + 55, y + 105, 48, 'right', this.getTeamColors(state, state.playerTeam), {
      self: true,
      tankClass: tankClass.id,
      teamKey: this.getTeamKey(state, state.playerTeam),
    })

    for (let row = 0; row < 3; row += 1) {
      const brickX = x + 208
      const brickY = y + 55 + row * 32
      if (row === 1 && destroyed) {
        this.drawShowcaseFieldProp(ctx, 'rubble_pile', brickX + 2, brickY + 7, 28, 22)
      } else {
        drawPixelTerrainTile(ctx, 'brick', brickX, brickY, 32, {
          col: 34,
          row: 20 + row,
          hp:
            row === 1
              ? targetHp
              : adjacentHp,
          time: sceneTime,
        })
      }
    }
    drawBattlefieldTank(ctx, x + 274, y + 105, 42, 'left', this.getTeamColors(state, state.enemyTeam), {
      tankClass: 'engineer',
      teamKey: this.getTeamKey(state, state.enemyTeam),
    })
    this.drawShowcaseFieldProp(ctx, 'sandbags', x + 258, y + 126, 48, 24)

    if (sceneTime >= firstShotStart && sceneTime < firstImpactAt) {
      drawClassShellProjectile(
        ctx,
        x +
          82 +
          getTankClassShowcaseTimedProgress(
            sceneTime,
            firstShotStart,
            projectileDuration,
          ) *
            116,
        y + 105,
        'right',
        tankClass.id,
        this.getTeamColors(state, state.playerTeam).body,
        Math.floor(sceneTime * 12),
      )
    }
    if (
      needsSecondHit &&
      sceneTime >= secondShotStart &&
      sceneTime < secondImpactAt
    ) {
      drawClassShellProjectile(
        ctx,
        x +
          82 +
          getTankClassShowcaseTimedProgress(
            sceneTime,
            secondShotStart,
            projectileDuration,
          ) *
            116,
        y + 105,
        'right',
        tankClass.id,
        this.getTeamColors(state, state.playerTeam).body,
        Math.floor(sceneTime * 12),
      )
    }
    if (
      firstImpact &&
      (!needsSecondHit || sceneTime < secondShotStart)
    ) {
      this.drawShowcaseImpactParticles(
        ctx,
        x + 208,
        y + 105,
        tankClass.demonstration.splashDamage > 0 ? 'he' : 'direct',
        getTankClassShowcaseTimedProgress(sceneTime, firstImpactAt, 0.7),
      )
    }
    if (needsSecondHit && destroyed) {
      this.drawShowcaseImpactParticles(
        ctx,
        x + 208,
        y + 105,
        'direct',
        getTankClassShowcaseTimedProgress(sceneTime, secondImpactAt, 0.7),
      )
    }

    const breachLabel =
      tankClass.demonstration.splashDamage > 0 && destroyed
        ? `HE / FOCUS DESTROYED / ADJACENT -${tankClass.demonstration.splashDamage}`
        : needsSecondHit
          ? destroyed
            ? '2 LIGHT AP HITS BREAK 2 HP BRICK'
            : firstImpact
              ? 'FIRST HIT / BRICK 1 HP'
              : 'SCOUT AP / BRICK 2 HP'
          : `DIRECT ${tankClass.demonstration.directDamage} BREAKS 2 HP BRICK`
    drawPixelText(ctx, breachLabel, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 292,
      scale: TEXT_SCALE,
    })
  }

  private drawTankClassDuelScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const projectileDistance = 125
    const playerFireAt = 0.7
    const playerShotDuration = getTankClassShowcaseTravelDuration(
      projectileDistance,
      PLAYER_BULLET_SPEED,
    )
    const playerImpactAt = playerFireAt + playerShotDuration
    const enemyFireAt = 1.75
    const enemyShotDuration = getTankClassShowcaseTravelDuration(
      projectileDistance,
      ENEMY_BULLET_SPEED,
    )
    const enemyImpactAt = enemyFireAt + enemyShotDuration
    const outgoingLanded = sceneTime >= playerImpactAt
    const incomingLanded = sceneTime >= enemyImpactAt
    const duel = getTankClassShowcaseDuelOutcome(
      tankClass,
      outgoingLanded,
      incomingLanded,
    )

    this.drawShowcaseRoad(ctx, x + 7, y + 88, 9, 61)
    this.drawShowcaseFieldProp(ctx, 'crate_metal', x + 142, y + 58, 28, 28)
    this.drawShowcaseFieldProp(ctx, 'fuel_barrel', x + 171, y + 121, 22, 30)

    drawBattlefieldTank(ctx, x + 68, y + 104, 50, 'right', this.getTeamColors(state, state.playerTeam), {
      self: true,
      shield:
        tankClass.demonstration.shieldPoints > 0 &&
        !incomingLanded,
      shieldPoints: tankClass.demonstration.shieldPoints,
      tankClass: tankClass.id,
      teamKey: this.getTeamKey(state, state.playerTeam),
    })
    drawBattlefieldTank(ctx, x + 252, y + 104, duel.symmetric ? 50 : 46, 'left', this.getTeamColors(state, state.enemyTeam), {
      tankClass: 'engineer',
      teamKey: this.getTeamKey(state, state.enemyTeam),
    })
    this.drawShowcaseHealthBar(
      ctx,
      x + 40,
      y + 63,
      58,
      duel.playerHp,
      tankClass.demonstration.maxHp,
      '#8ad27d',
    )
    this.drawShowcaseHealthBar(
      ctx,
      x + 224,
      y + 63,
      58,
      duel.enemyHp,
      duel.enemyMaxHp,
      '#f06b4c',
    )
    if (tankClass.demonstration.shieldPoints > 0) {
      this.drawShowcaseHealthBar(
        ctx,
        x + 40,
        y + 71,
        58,
        duel.shield,
        tankClass.demonstration.shieldPoints,
        '#86f4ff',
        4,
      )
    }

    if (sceneTime >= playerFireAt && sceneTime < playerImpactAt) {
      drawClassShellProjectile(
        ctx,
        x + 94 + getTankClassShowcaseTimedProgress(
          sceneTime,
          playerFireAt,
          playerShotDuration,
        ) * projectileDistance,
        y + 104,
        'right',
        tankClass.id,
        this.getTeamColors(state, state.playerTeam).body,
      )
    }
    if (sceneTime >= enemyFireAt && sceneTime < enemyImpactAt) {
      drawClassShellProjectile(
        ctx,
        x + 226 - getTankClassShowcaseTimedProgress(
          sceneTime,
          enemyFireAt,
          enemyShotDuration,
        ) * projectileDistance,
        y + 104,
        'left',
        'engineer',
        this.getTeamColors(state, state.enemyTeam).body,
      )
    }
    if (
      incomingLanded &&
      tankClass.demonstration.shieldPoints > 0
    ) {
      this.drawShowcaseShieldAbsorption(
        ctx,
        x + 68,
        y + 104,
        sceneTime - enemyImpactAt,
      )
    }
    if (sceneTime >= playerImpactAt) {
      this.drawShowcaseImpactParticles(
        ctx,
        x + 232,
        y + 104,
        tankClass.demonstration.splashDamage > 0 ? 'he' : 'direct',
        getTankClassShowcaseTimedProgress(sceneTime, playerImpactAt, 0.7),
      )
    }
    if (
      incomingLanded &&
      tankClass.demonstration.shieldPoints <= 0
    ) {
      this.drawShowcaseImpactParticles(
        ctx,
        x + 88,
        y + 104,
        'direct',
        getTankClassShowcaseTimedProgress(sceneTime, enemyImpactAt, 0.7),
      )
    }

    const duelLabel =
      duel.symmetric && outgoingLanded && incomingLanded
        ? `ENGINEER DUEL / HP ${duel.playerHp}/${tankClass.demonstration.maxHp} EACH`
        : `VS ENGINEER / HP ${duel.playerHp}/${tankClass.demonstration.maxHp}`
    drawPixelText(ctx, duelLabel, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 292,
      scale: TEXT_SCALE,
    })
  }

  private drawTankClassRaceScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const courseLength = 208
    const engineerMoveDuration = tankClass.demonstration.referenceMoveDuration
    const raceStartsAt = 0.55
    const playerDuration = getTankClassShowcaseMovementDuration(
      courseLength,
      tankClass.demonstration.moveDuration,
      TILE_SIZE,
    )
    const engineerDuration = getTankClassShowcaseMovementDuration(
      courseLength,
      engineerMoveDuration,
      TILE_SIZE,
    )
    const playerProgress = getTankClassShowcaseTimedProgress(
      sceneTime,
      raceStartsAt,
      playerDuration,
    )
    const engineerProgress = getTankClassShowcaseTimedProgress(
      sceneTime,
      raceStartsAt,
      engineerDuration,
    )

    this.drawShowcaseRoad(ctx, x + 7, y + 54, 9, 71)
    this.drawShowcaseRoad(ctx, x + 7, y + 118, 9, 73)
    this.drawShowcaseFieldProp(ctx, 'warning_sign', x + 274, y + 84, 24, 34)
    ctx.fillStyle = '#f2ead7'
    for (let row = 0; row < 8; row += 1) {
      ctx.fillRect(x + 262 + (row % 2) * 4, y + 48 + row * 15, 4, 8)
    }
    drawBattlefieldTank(ctx, x + 43 + playerProgress * courseLength, y + 74, 38, 'right', this.getTeamColors(state, state.playerTeam), {
      self: true,
      tankClass: tankClass.id,
      teamKey: this.getTeamKey(state, state.playerTeam),
    })
    drawBattlefieldTank(ctx, x + 43 + engineerProgress * courseLength, y + 133, 38, 'right', this.getTeamColors(state, state.enemyTeam), {
      tankClass: 'engineer',
      teamKey: this.getTeamKey(state, state.enemyTeam),
    })
    drawPixelText(ctx, `${tankClass.shortLabel} ${tankClass.performance.speed}`, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 150,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, `ENGINEER ${engineerMoveDuration.toFixed(2)}S / TILE`, x + 308, y + 148, {
      align: 'right',
      color: '#bfc4b8',
      maxWidth: 150,
      scale: TEXT_SCALE,
    })
  }

  private drawTankClassKitScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    this.drawShowcaseRoad(ctx, x + 7, y + 88, 9, 83)

    if (tankClass.id === 'scout') {
      this.drawScoutKitFieldScene(ctx, state, tankClass, sceneTime)
    } else if (tankClass.id === 'engineer') {
      this.drawEngineerKitFieldScene(ctx, state, tankClass, sceneTime)
    } else {
      this.drawBattleKitFieldScene(ctx, state, tankClass, sceneTime)
    }
  }

  private drawScoutKitFieldScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const playerColors = this.getTeamColors(state, state.playerTeam)
    const enemyColors = this.getTeamColors(state, state.enemyTeam)
    const phase = getScoutDecoyShowcasePhase(sceneTime)
    const wireScene = phase === 'wire'

    if (!wireScene) {
      const decoyX = x + 142
      const decoyY = y + 82
      const enemyApproach = getScoutDecoyEnemyApproachMotion(
        sceneTime,
        tankClass.demonstration.referenceMoveDuration,
        TILE_SIZE,
      )
      const enemyX =
        x +
        340 -
        enemyApproach.distance
      const relayX = x + 224
      const relayY = y + 52
      const relayPresentation =
        getScoutDecoyRelayPresentation(sceneTime)
      const placementTankX = decoyX + 21
      const retreatDistance = 88
      const retreatDuration = getTankClassShowcaseMovementDuration(
        retreatDistance,
        tankClass.demonstration.moveDuration,
        TILE_SIZE,
      )
      const retreatProgress = getTankClassShowcaseTimedProgress(
        sceneTime,
        SCOUT_DECOY_SHOWCASE_TIMING.withdrawalStartsAt,
        retreatDuration,
      )
      const scoutX = placementTankX - retreatProgress * retreatDistance
      const enemyPerspective =
        phase === 'enemy-pov' ||
        phase === 'enemy-fire' ||
        phase === 'enemy-impact'

      if (phase !== 'placing') {
        drawPixelDeployable(ctx, 'decoy', decoyX, decoyY, 42, true)
      }
      drawBattlefieldTank(ctx, scoutX, y + 105, 42, 'left', playerColors, {
        self: true,
        tankClass: 'scout',
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
      drawBattlefieldTank(ctx, enemyX, y + 105, 40, 'left', enemyColors, {
        self: enemyPerspective,
        tankClass: 'engineer',
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
      if (relayPresentation.visible) {
        drawPixelPortableRelay(
          ctx,
          relayX,
          relayY,
          BATTLEFIELD_TILE_SIZE,
          relayPresentation.active,
          sceneTime,
        )
      }

      if (phase === 'placing') {
        this.drawShowcaseDeployablePlacement(
          ctx,
          placementTankX - 42,
          y + 56,
          sceneTime / DEPLOYABLE_PLACE_SECONDS,
          'HOLD 1 DECOY',
        )
      }

      if (phase === 'fog' || phase === 'false-contact') {
        const fogProgress = getTankClassShowcaseTimedProgress(
          sceneTime,
          SCOUT_DECOY_SHOWCASE_TIMING.fogStartsAt,
          SCOUT_DECOY_SHOWCASE_TIMING.falseContactAt -
            SCOUT_DECOY_SHOWCASE_TIMING.fogStartsAt,
        )
        this.drawShowcaseFogOfWar(
          ctx,
          TANK_SELECT_THEATER_FOG_X,
          TANK_SELECT_THEATER_FOG_Y,
          TANK_SELECT_THEATER_FOG_WIDTH,
          TANK_SELECT_THEATER_FOG_HEIGHT,
          fogProgress,
          scoutX,
          y + 105,
          42,
        )
      }

      if (enemyPerspective) {
        this.drawShowcaseFogOfWar(
          ctx,
          TANK_SELECT_THEATER_FOG_X,
          TANK_SELECT_THEATER_FOG_Y,
          TANK_SELECT_THEATER_FOG_WIDTH,
          TANK_SELECT_THEATER_FOG_HEIGHT,
          1,
          enemyX,
          y + 105,
          54,
        )
      }

      this.drawShowcasePortableRelayPulseWaves(
        ctx,
        relayX + BATTLEFIELD_TILE_SIZE / 2,
        relayY + BATTLEFIELD_TILE_SIZE / 2,
        relayPresentation.waves,
      )

      if (phase === 'false-contact' || enemyPerspective) {
        ctx.save()
        ctx.globalAlpha = 0.88
        this.drawPortableSignalContactGlyph(
          ctx,
          'hostile',
          decoyX + 21,
          decoyY + 21,
        )
        ctx.restore()
      }

      if (phase === 'enemy-fire') {
        const shotProgress = getTankClassShowcaseTimedProgress(
          sceneTime,
          SCOUT_DECOY_SHOWCASE_TIMING.enemyFiresAt,
          SCOUT_DECOY_SHOWCASE_TIMING.enemyShotImpactAt -
            SCOUT_DECOY_SHOWCASE_TIMING.enemyFiresAt,
        )
        drawClassShellProjectile(
          ctx,
          enemyX -
            23 -
            shotProgress *
              SCOUT_DECOY_SHOWCASE_TIMING.enemyShotDistance,
          y + 105,
          'left',
          'engineer',
          enemyColors.body,
          Math.floor(sceneTime * 12),
        )
        if (
          sceneTime <
          SCOUT_DECOY_SHOWCASE_TIMING.enemyFiresAt + 0.12
        ) {
          this.drawShowcaseMuzzleFlash(
            ctx,
            enemyX - 24,
            y + 105,
            'left',
          )
        }
      }

      if (
        phase === 'enemy-impact' &&
        sceneTime <
          SCOUT_DECOY_SHOWCASE_TIMING.enemyShotImpactAt + 0.75
      ) {
        this.drawShowcaseImpactParticles(
          ctx,
          decoyX + 21,
          decoyY + 23,
          'direct',
          getTankClassShowcaseTimedProgress(
            sceneTime,
            SCOUT_DECOY_SHOWCASE_TIMING.enemyShotImpactAt,
            0.75,
          ),
        )
      }

      const label =
        phase === 'placing'
          ? 'HOLD 1 / PLACE DECOY'
          : phase === 'armed-hold'
            ? 'DECOY ARMED / HOLD POSITION'
            : phase === 'withdrawing'
              ? 'DECOY ARMED / SCOUT WITHDRAWS'
              : phase === 'relay-focus'
                ? enemyApproach.complete
                  ? 'SCOUT POV / ENEMY ENTERS THE LANE'
                  : 'SCOUT POV / CONTACT FROM MAP EDGE'
                : phase === 'fog'
                  ? 'SCOUT POV / ENEMY LOST IN FOG'
                  : phase === 'false-contact'
                    ? 'DECOY / RELAY REPORTS FALSE HOSTILE'
                    : phase === 'enemy-pov'
                      ? 'ENEMY POV / RELAY FLAGS DECOY'
                      : phase === 'enemy-fire'
                        ? 'ENEMY POV / FIRING ON FALSE CONTACT'
                        : 'DECOY DRAWS ENEMY FIRE'
      drawPixelText(ctx, label, x + 12, y + 148, {
        color: '#f2ead7',
        maxWidth: 292,
        scale: TEXT_SCALE,
      })
      return
    }

    const wireX = x + 142
    const wireY = y + 82
    const placementTankX = wireX + 21
    const retreatDistance = 88
    const retreatDuration = getTankClassShowcaseMovementDuration(
      retreatDistance,
      tankClass.demonstration.moveDuration,
      TILE_SIZE,
    )
    const withdrawalStartsAt =
      SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt +
      SCOUT_WIRE_SHOWCASE_TIMING.withdrawalStartsAt
    const retreatProgress = getTankClassShowcaseTimedProgress(
      sceneTime,
      withdrawalStartsAt,
      retreatDuration,
    )
    const scoutX = placementTankX - retreatProgress * retreatDistance
    const motion = getScoutWireShowcaseMotion(
      sceneTime,
      tankClass.demonstration.referenceMoveDuration,
      TILE_SIZE,
    )
    const wirePhase = getScoutWireShowcasePhase(
      sceneTime,
      tankClass.demonstration.referenceMoveDuration,
      TILE_SIZE,
    )
    const enemyX = x + 342 - motion.distance

    if (wirePhase !== 'placing' && wirePhase !== 'alert') {
      drawPixelDeployable(ctx, 'tripwire', wireX, wireY, 42, true)
    }
    drawBattlefieldTank(ctx, scoutX, y + 105, 42, 'left', playerColors, {
      self: true,
      tankClass: 'scout',
      teamKey: this.getTeamKey(state, state.playerTeam),
    })
    if (wirePhase === 'enemy-approach' || wirePhase === 'fog') {
      drawBattlefieldTank(ctx, enemyX, y + 105, 38, 'left', enemyColors, {
        tankClass: 'engineer',
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
    }

    if (wirePhase === 'placing') {
      const localTime =
        sceneTime - SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt
      this.drawShowcaseDeployablePlacement(
        ctx,
        placementTankX - 42,
        y + 56,
        localTime / DEPLOYABLE_PLACE_SECONDS,
        'HOLD 2 WIRE',
      )
    }

    if (wirePhase === 'fog') {
      const fogStartsAt =
        SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt +
        SCOUT_WIRE_SHOWCASE_TIMING.fogStartsAt
      const fogProgress = getTankClassShowcaseTimedProgress(
        sceneTime,
        fogStartsAt,
        motion.triggeredAt - fogStartsAt,
      )
      this.drawShowcaseFogOfWar(
        ctx,
        TANK_SELECT_THEATER_FOG_X,
        TANK_SELECT_THEATER_FOG_Y,
        TANK_SELECT_THEATER_FOG_WIDTH,
        TANK_SELECT_THEATER_FOG_HEIGHT,
        fogProgress,
        scoutX,
        y + 105,
        42,
      )
    }

    if (wirePhase === 'alert') {
      this.drawShowcaseFogOfWar(
        ctx,
        TANK_SELECT_THEATER_FOG_X,
        TANK_SELECT_THEATER_FOG_Y,
        TANK_SELECT_THEATER_FOG_WIDTH,
        TANK_SELECT_THEATER_FOG_HEIGHT,
        1,
        scoutX,
        y + 105,
        42,
      )
      const alertElapsed = Math.max(0, sceneTime - motion.triggeredAt)
      if (alertElapsed < DEPLOYABLE_ALERT_TTL) {
        this.drawShowcaseTripwireSignalWaves(
          ctx,
          wireX + 21,
          wireY + 21,
          alertElapsed,
        )
      }
    }

    const label =
      wirePhase === 'placing'
        ? 'HOLD 2 / PLACE WIRE'
        : wirePhase === 'armed-hold'
          ? 'WIRE ARMED / HOLD POSITION'
          : wirePhase === 'withdrawing'
            ? 'WIRE ARMED / SCOUT TAKES COVER'
            : wirePhase === 'enemy-approach'
              ? 'SCOUT POV / ENEMY ENTERS FROM EDGE'
              : wirePhase === 'fog'
                ? 'SCOUT POV / ENEMY VANISHES IN FOG'
                : 'WIRE CONTACT / RADIAL ALERT'
    drawPixelText(ctx, label, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 292,
      scale: TEXT_SCALE,
    })
  }

  private drawEngineerKitFieldScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const playerColors = this.getTeamColors(state, state.playerTeam)
    const enemyColors = this.getTeamColors(state, state.enemyTeam)
    const mineX = x + 205
    const trapX = x + 127
    const trapSize = 42
    const trapCenterY = y + 102
    const motion = getEngineerKitShowcaseMotion(
      sceneTime,
      tankClass.demonstration.referenceMoveDuration,
      TILE_SIZE,
    )
    const enemyX =
      x +
      ENGINEER_KIT_SHOWCASE_TIMING.enemyStartOffset -
      motion.distance

    if (!motion.minePlaced || !motion.mineTriggered) {
      ctx.save()
      if (!motion.minePlaced) {
        ctx.globalAlpha =
          0.35 + motion.minePlacementProgress * 0.55
      }
      drawPixelDeployable(
        ctx,
        'mine',
        mineX,
        y + 82,
        42,
        motion.minePlaced,
      )
      ctx.restore()
    } else {
      this.drawShowcaseFieldProp(ctx, 'crater_small', mineX + 6, y + 91, 30, 24)
    }
    if (
      (sceneTime >= motion.trapPlacementStartsAt ||
        motion.trapPlaced) &&
      !motion.trapTriggered
    ) {
      ctx.save()
      if (!motion.trapPlaced) {
        ctx.globalAlpha =
          0.35 + motion.trapPlacementProgress * 0.55
      }
      drawPixelDeployable(
        ctx,
        'steel',
        trapX,
        trapCenterY - trapSize / 2,
        trapSize,
        motion.trapPlaced && !motion.trapTriggered,
      )
      ctx.restore()
    }

    const engineerDirection =
      motion.phase === 'moving-to-trap' ||
      motion.phase === 'withdrawing'
        ? 'left'
        : 'right'
    drawBattlefieldTank(
      ctx,
      x + motion.engineerOffset,
      y + 105,
      42,
      engineerDirection,
      playerColors,
      {
        self: true,
        tankClass: 'engineer',
        teamKey: this.getTeamKey(state, state.playerTeam),
      },
    )

    if (
      motion.phase === 'placing-mine' ||
      motion.phase === 'placing-trap'
    ) {
      const progress =
        motion.phase === 'placing-mine'
          ? motion.minePlacementProgress
          : motion.trapPlacementProgress
      this.drawShowcaseHealthBar(
        ctx,
        x + motion.engineerOffset - 21,
        y + 70,
        42,
        progress,
        1,
        '#ffd35a',
        4,
      )
    }

    if (motion.enemyVisible) {
      drawBattlefieldTank(ctx, enemyX, y + 105, 40, 'left', enemyColors, {
        damage: motion.mineTriggered
          ? tankClass.demonstration.mineDamage /
            tankClass.demonstration.referenceEnemyHp
          : 0,
        tankClass: 'engineer',
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
      this.drawShowcaseHealthBar(
        ctx,
        enemyX - 20,
        y + 64,
        40,
        motion.mineTriggered
          ? tankClass.demonstration.referenceEnemyHp -
            tankClass.demonstration.mineDamage
          : tankClass.demonstration.referenceEnemyHp,
        tankClass.demonstration.referenceEnemyHp,
        '#f06b4c',
      )
    }

    const mineImpactElapsed = sceneTime - motion.mineTriggeredAt
    if (
      motion.mineTriggered &&
      mineImpactElapsed >= 0 &&
      mineImpactElapsed < 0.65
    ) {
      this.drawShowcaseImpactParticles(
        ctx,
        mineX + 21,
        y + 105,
        'mine',
        getTankClassShowcaseTimedProgress(
          sceneTime,
          motion.mineTriggeredAt,
          0.65,
        ),
      )
    }

    if (motion.trapActive) {
      const jawAdvance = Math.round(
        motion.trapClosureProgress * 8,
      )
      const jawTop = trapCenterY - 7
      const trapBaseTop = trapCenterY + 4
      const trapRailY = trapCenterY + 6
      const leftJawX = enemyX - 25 + jawAdvance
      const rightJawX = enemyX + 20 - jawAdvance

      ctx.fillStyle = '#151817'
      ctx.fillRect(enemyX - 22, trapBaseTop, 44, 6)
      ctx.fillRect(leftJawX - 2, jawTop - 2, 7, 16)
      ctx.fillRect(rightJawX - 3, jawTop - 2, 7, 16)
      ctx.fillStyle = '#737e7a'
      ctx.fillRect(enemyX - 20, trapRailY, 40, 2)
      ctx.fillRect(leftJawX, jawTop, 3, 12)
      ctx.fillRect(rightJawX - 1, jawTop, 3, 12)
      ctx.fillStyle = '#d8d4c8'
      for (let tooth = 0; tooth < 3; tooth += 1) {
        const toothY = jawTop + 1 + tooth * 4
        ctx.fillRect(leftJawX + 3, toothY, 5, 2)
        ctx.fillRect(rightJawX - 6, toothY, 5, 2)
      }
      if (motion.trapSettled) {
        ctx.fillStyle = '#ffd35a'
        ctx.fillRect(enemyX - 3, trapRailY, 6, 2)
      }
      this.drawShowcaseHealthBar(
        ctx,
        enemyX - 20,
        trapCenterY + 13,
        40,
        motion.trapRemainingSeconds,
        tankClass.demonstration.trapSeconds,
        '#ffd35a',
        4,
      )
    }

    const label =
      motion.phase === 'placing-mine'
        ? 'HOLD 1 / PLACING MINE'
        : motion.phase === 'mine-armed'
          ? 'MINE ARMED / MOVE TO SECOND POSITION'
          : motion.phase === 'moving-to-trap'
            ? 'ENGINEER REPOSITIONS BEHIND MINE'
            : motion.phase === 'placing-trap'
              ? 'HOLD 2 / PLACING STEEL TRAP'
              : motion.phase === 'trap-armed'
                ? 'MINE + TRAP ARMED / WITHDRAW'
                : motion.phase === 'withdrawing'
                  ? 'ENGINEER CLEARS THE PREPARED LANE'
                  : motion.phase === 'enemy-approach'
                    ? 'ENEMY ENTERS FROM MAP EDGE'
                    : motion.phase === 'mine-triggered'
                      ? '1 MINE / HIT + 10S SLOW'
                      : motion.phase === 'trap-closing'
                        ? '2 TRAP / STEEL JAWS CLOSING'
                        : motion.phase === 'trap-locked'
                          ? `2 TRAP / IMMOBILIZED ${motion.trapRemainingSeconds.toFixed(1)}S`
                          : 'TRAP EXPIRED / ENEMY MOVES AGAIN'
    drawPixelText(ctx, label, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 292,
      scale: TEXT_SCALE,
    })
  }

  private drawBattleKitFieldScene(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    sceneTime: number,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_THEATER_Y
    const playerColors = this.getTeamColors(state, state.playerTeam)
    const enemyColors = this.getTeamColors(state, state.enemyTeam)
    const beatDuration = 2.3
    const secondKit = sceneTime >= beatDuration
    const localTime = secondKit ? sceneTime - beatDuration : sceneTime

    if (!secondKit) {
      const projectileDistance = 128
      const fireAt = 0.45
      const projectileDuration = getTankClassShowcaseTravelDuration(
        projectileDistance,
        ENEMY_BULLET_SPEED,
      )
      const impactAt = fireAt + projectileDuration
      const landed = localTime >= impactAt
      drawBattlefieldTank(ctx, x + 75, y + 105, 50, 'right', playerColors, {
        self: true,
        shield: !landed,
        shieldPoints: 1,
        tankClass: 'battle',
        teamKey: this.getTeamKey(state, state.playerTeam),
      })
      drawBattlefieldTank(ctx, x + 262, y + 105, 42, 'left', enemyColors, {
        tankClass: 'engineer',
        teamKey: this.getTeamKey(state, state.enemyTeam),
      })
      if (localTime >= fireAt && localTime < impactAt) {
        drawClassShellProjectile(
          ctx,
          x + 235 - getTankClassShowcaseTimedProgress(
            localTime,
            fireAt,
            projectileDuration,
          ) * projectileDistance,
          y + 105,
          'left',
          'engineer',
          enemyColors.body,
        )
      }
      if (landed) {
        this.drawShowcaseShieldAbsorption(
          ctx,
          x + 75,
          y + 105,
          localTime - impactAt,
        )
      }
      const absorbed = landed
        ? Math.min(
            tankClass.demonstration.shieldPoints,
            tankClass.demonstration.referenceEnemyDamage,
          )
        : 0
      const hp = landed
        ? tankClass.demonstration.maxHp -
          (tankClass.demonstration.referenceEnemyDamage - absorbed)
        : tankClass.demonstration.maxHp
      const shield = landed
        ? tankClass.demonstration.shieldPoints - absorbed
        : tankClass.demonstration.shieldPoints
      this.drawShowcaseHealthBar(
        ctx,
        x + 47,
        y + 62,
        58,
        hp,
        tankClass.demonstration.maxHp,
        '#8ad27d',
      )
      this.drawShowcaseHealthBar(
        ctx,
        x + 47,
        y + 70,
        58,
        shield,
        tankClass.demonstration.shieldPoints,
        '#86f4ff',
        4,
      )
      drawPixelText(ctx, landed
        ? `SHIELD -${absorbed} / HP -${tankClass.demonstration.referenceEnemyDamage - absorbed}`
        : `AUTO SHIELD / INCOMING ${tankClass.demonstration.referenceEnemyDamage} DAMAGE`, x + 12, y + 148, {
        color: '#f2ead7',
        maxWidth: 292,
        scale: TEXT_SCALE,
      })
      return
    }

    drawBattlefieldTank(ctx, x + 48, y + 105, 46, 'right', playerColors, {
      self: true,
      tankClass: 'battle',
      teamKey: this.getTeamKey(state, state.playerTeam),
    })
    const enemyPositions = [
      { x: x + 232, y: y + 82 },
      { x: x + 266, y: y + 105 },
      { x: x + 232, y: y + 132 },
    ]
    const projectileDistance = 166
    const fireAt = 0.45
    const projectileDuration = getTankClassShowcaseTravelDuration(
      projectileDistance,
      PLAYER_BULLET_SPEED,
    )
    const impactAt = fireAt + projectileDuration
    const exploded = localTime >= impactAt
    const focusedInitialHp = Math.min(
      tankClass.demonstration.referenceEnemyHp,
      tankClass.demonstration.directDamage,
    )
    const splashOutcome = getTankClassShowcaseSplashOutcome(
      tankClass,
      focusedInitialHp,
      tankClass.demonstration.referenceEnemyHp,
      exploded,
    )
    enemyPositions.forEach((position, index) => {
      const focused = index === 1
      const damage = focused
        ? splashOutcome.focusedDamage
        : splashOutcome.nearbyDamage
      const hp = focused
        ? splashOutcome.focusedHp
        : splashOutcome.nearbyHp
      if (!focused || !exploded) {
        drawBattlefieldTank(ctx, position.x, position.y, 32, 'left', enemyColors, {
          damage:
            damage / tankClass.demonstration.referenceEnemyHp,
          focused,
          tankClass: 'engineer',
          teamKey: this.getTeamKey(state, state.enemyTeam),
        })
      }
      if (!focused || !splashOutcome.focusedDestroyed) {
        this.drawShowcaseHealthBar(
          ctx,
          position.x - 14,
          position.y - 23,
          28,
          hp,
          tankClass.demonstration.referenceEnemyHp,
          '#f06b4c',
          4,
        )
      }
    })
    if (localTime >= fireAt && localTime < impactAt) {
      drawClassShellProjectile(
        ctx,
        x + 74 + getTankClassShowcaseTimedProgress(
          localTime,
          fireAt,
          projectileDuration,
        ) * projectileDistance,
        y + 105,
        'right',
        'battle',
        playerColors.body,
      )
    }
    if (exploded) {
      this.drawShowcaseImpactParticles(
        ctx,
        x + 256,
        y + 105,
        'he',
        getTankClassShowcaseTimedProgress(
          localTime,
          impactAt,
          0.8,
        ),
      )
    }
    drawPixelText(ctx, exploded
      ? `FOCUS DESTROYED / SPLASH -${tankClass.demonstration.splashDamage}`
      : `FIRE HE / FOCUS ${focusedInitialHp} HP + 2 NEARBY`, x + 12, y + 148, {
      color: '#f2ead7',
      maxWidth: 292,
      scale: TEXT_SCALE,
    })
  }

  private drawTankClassDescription(
    ctx: CanvasRenderingContext2D,
    state: RenderState,
    tankClass: TankClassPresentation,
    accent: string,
  ) {
    const x = TANK_SELECT_CONTENT_X
    const y = TANK_SELECT_DESCRIPTION_Y
    const width = TANK_SELECT_CONTENT_WIDTH
    const height = TANK_SELECT_DESCRIPTION_HEIGHT
    const equipped = tankClass.selected
    const description = getTankClassDescriptionModel(tankClass)

    ctx.fillStyle = 'rgba(18, 22, 17, 0.96)'
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = equipped ? accent : '#667061'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    drawPixelText(ctx, `${tankClass.label.toUpperCase()} / ${tankClass.role.toUpperCase()}`, x + 8, y + 7, {
      color: '#f7f3df',
      maxWidth: 205,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, equipped ? 'EQUIPPED' : 'ENTER TO SELECT', x + width - 8, y + 7, {
      align: 'right',
      color: equipped ? '#8ad27d' : '#fff1a5',
      maxWidth: 104,
      scale: TEXT_SCALE,
    })

    drawPixelText(ctx, description.strategy, x + 8, y + 22, {
      color: '#c8c9bd',
      letterSpacing: 0,
      maxWidth: width - 16,
      scale: TEXT_SCALE,
    })

    drawPixelText(ctx, description.performance, x + 8, y + 37, {
      color: accent,
      letterSpacing: 0,
      maxWidth: 220,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, description.relay, x + width - 8, y + 37, {
      align: 'right',
      color: '#86cbd4',
      letterSpacing: 0,
      maxWidth: 78,
      scale: TEXT_SCALE,
    })
    ctx.fillStyle = '#586153'
    ctx.fillRect(x + 8, y + 50, width - 16, 1)

    drawClassEquipmentIcon(ctx, tankClass.projectile.kind, x + 8, y + 57, 28, {
      teamColor: accent,
      time: state.time,
    })
    drawPixelText(ctx, description.projectile.label, x + 40, y + 58, {
      color: '#f2ead7',
      letterSpacing: 0,
      maxWidth: 98,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, description.projectile.effect, x + 42, y + 72, {
      color: '#aeb4a7',
      letterSpacing: 0,
      maxWidth: 98,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, description.projectile.reload, x + 42, y + 81, {
      color: '#86cbd4',
      letterSpacing: 0,
      maxWidth: 98,
      scale: TEXT_SCALE,
    })

    description.nativeKit.forEach((item, index) => {
      const itemY = y + 55 + index * 27
      drawClassEquipmentIcon(ctx, item.kind, x + 156, itemY, 24, {
        teamColor: accent,
        time: state.time,
      })
      drawPixelText(ctx, `${item.key} ${item.label}`, x + 184, itemY + 2, {
        color: '#f2ead7',
        letterSpacing: 0,
        maxWidth: 126,
        scale: TEXT_SCALE,
      })
      drawPixelText(ctx, item.effect, x + 184, itemY + 13, {
        color: '#aeb4a7',
        letterSpacing: 0,
        maxWidth: 126,
        scale: TEXT_SCALE,
      })
    })

    ctx.fillStyle = '#465044'
    ctx.fillRect(x + 8, y + 103, width - 16, 1)
    drawPixelText(ctx, description.strength, x + 8, y + 111, {
      color: '#9bd18e',
      letterSpacing: 0,
      maxWidth: 146,
      scale: TEXT_SCALE,
    })
    drawPixelText(ctx, description.caution, x + 164, y + 111, {
      color: '#d8b477',
      letterSpacing: 0,
      maxWidth: 148,
      scale: TEXT_SCALE,
    })
  }

  private drawTankClassCarouselArrow(
    ctx: CanvasRenderingContext2D,
    direction: 'left' | 'right',
    label: string,
    accent: string,
  ) {
    const x = direction === 'left' ? TANK_SELECT_LEFT_ARROW_X : TANK_SELECT_RIGHT_ARROW_X
    const y = TANK_SELECT_ARROW_Y
    const centerX = x + TANK_SELECT_ARROW_WIDTH / 2
    const centerY = y + TANK_SELECT_ARROW_HEIGHT / 2

    drawPixelText(ctx, label, centerX, y + 7, {
      align: 'center',
      color: '#d8d4c8',
      maxWidth: TANK_SELECT_ARROW_WIDTH - 2,
      scale: TEXT_SCALE,
      letterSpacing: 0,
    })
    ctx.fillStyle = 'rgba(17, 22, 17, 0.88)'
    ctx.fillRect(x + 2, centerY - 24, TANK_SELECT_ARROW_WIDTH - 4, 48)
    ctx.strokeStyle = '#5f685a'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 3, centerY - 23, TANK_SELECT_ARROW_WIDTH - 6, 46)
    ctx.fillStyle = accent
    ctx.beginPath()
    if (direction === 'left') {
      ctx.moveTo(centerX - 10, centerY)
      ctx.lineTo(centerX + 8, centerY - 14)
      ctx.lineTo(centerX + 8, centerY + 14)
    } else {
      ctx.moveTo(centerX + 10, centerY)
      ctx.lineTo(centerX - 8, centerY - 14)
      ctx.lineTo(centerX - 8, centerY + 14)
    }
    ctx.closePath()
    ctx.fill()
  }

  private drawShowcaseBattlefieldGround(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const tileSize = 32
    const columns = Math.ceil(width / tileSize)
    const rows = Math.ceil(height / tileSize)
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        drawPixelGround(ctx, x + column * tileSize, y + row * tileSize, tileSize, 40 + column, 70 + row)
      }
    }
    ctx.fillStyle = 'rgba(4, 8, 5, 0.18)'
    ctx.fillRect(x, y, width, height)
  }

  private drawShowcaseRoad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    columns: number,
    row: number,
  ) {
    for (let column = 0; column < columns; column += 1) {
      drawPixelTerrainTile(ctx, 'road', x + column * 32, y, 32, {
        col: column,
        row,
        hp: 1,
        time: 0,
        roadNeighbors: {
          up: false,
          right: column < columns - 1,
          down: false,
          left: column > 0,
        },
      })
    }
  }

  private drawShowcaseFieldProp(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const definition = getBattlefieldPropDefinition(spriteId)
    if (drawBattlefieldPropAtlasSprite(ctx, definition, x, y, { width, height })) {
      return
    }

    const plan = getBattlefieldPropPlaceholderPlan(spriteId, definition)
    ctx.save()
    ctx.translate(Math.round(x + width / 2), Math.round(y + height / 2))
    this.drawBattlefieldPropPlaceholder(ctx, plan, Math.max(width, height))
    ctx.restore()
  }

  private drawShowcaseHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    value: number,
    capacity: number,
    color: string,
    height = 6,
  ) {
    const safeCapacity = Math.max(1, capacity)
    const fill = clamp(value / safeCapacity, 0, 1)
    ctx.fillStyle = '#111411'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#3f443d'
    ctx.fillRect(x + 1, y + 1, width - 2, Math.max(1, height - 2))
    if (fill > 0) {
      ctx.fillStyle = color
      ctx.fillRect(
        x + 1,
        y + 1,
        Math.max(1, Math.round((width - 2) * fill)),
        Math.max(1, height - 2),
      )
    }
  }

  private drawShowcaseDeployablePlacement(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    label: string,
  ) {
    const width = 84
    ctx.fillStyle = 'rgba(4, 7, 5, 0.88)'
    ctx.fillRect(x, y, width, 16)
    ctx.fillStyle = '#151515'
    ctx.fillRect(x + 4, y + 10, width - 8, 3)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(
      x + 4,
      y + 10,
      Math.max(2, Math.round((width - 8) * clamp(progress, 0, 1))),
      3,
    )
    drawPixelText(ctx, label, x + width / 2, y + 3, {
      align: 'center',
      color: '#f2ead7',
      maxWidth: width - 6,
      scale: TEXT_SCALE,
    })
  }

  private drawShowcaseFogOfWar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    progress: number,
    visionX: number,
    visionY: number,
    visionRadius: number,
  ) {
    const layer = this.getFogLayer()
    const fog = layer.getContext('2d')
    if (!fog) {
      return
    }

    fog.clearRect(0, 0, layer.width, layer.height)
    fog.fillStyle = `rgba(2, 2, 2, ${clamp(progress, 0, 1)})`
    fog.fillRect(x, y, width, height)
    fog.globalCompositeOperation = 'destination-out'
    const soft = 10
    const gradient = fog.createRadialGradient(
      visionX,
      visionY,
      Math.max(0, visionRadius - soft),
      visionX,
      visionY,
      visionRadius + soft,
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(0.64, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    fog.fillStyle = gradient
    fog.beginPath()
    fog.arc(visionX, visionY, visionRadius + soft, 0, Math.PI * 2)
    fog.fill()
    fog.globalCompositeOperation = 'source-over'
    ctx.drawImage(layer, 0, 0)
  }

  private drawShowcaseTripwireSignalWaves(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    alertElapsed: number,
  ) {
    const waves = getScoutWireSignalWaves(alertElapsed)
    ctx.save()
    ctx.lineWidth = 2
    for (const wave of waves) {
      ctx.globalAlpha = wave.alpha
      ctx.strokeStyle = '#ffd35a'
      ctx.beginPath()
      ctx.arc(x, y, wave.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#f2f5ee'
    ctx.fillRect(x - 2, y - 2, 4, 4)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(x - 1, y - 1, 2, 2)
    ctx.restore()
  }

  private drawShowcasePortableRelayPulseWaves(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    waves: ReturnType<
      typeof getScoutDecoyRelayPresentation
    >['waves'],
  ) {
    if (waves.length === 0) {
      return
    }

    ctx.save()
    ctx.lineCap = 'square'
    for (const wave of waves) {
      const progress = clamp(
        wave.age / Math.max(0.01, wave.ttl),
        0,
        1,
      )
      const alpha = clamp(
        (1 - progress) * wave.strength,
        0,
        0.42,
      )
      if (alpha <= 0.03) {
        continue
      }

      const tailLength = 10 + Math.round(wave.strength * 8)
      const fromRadius = Math.max(0, wave.radius - tailLength)
      this.drawPortableSignalWaveTrail(
        ctx,
        x + Math.cos(wave.angle) * fromRadius,
        y + Math.sin(wave.angle) * fromRadius,
        x + Math.cos(wave.angle) * wave.radius,
        y + Math.sin(wave.angle) * wave.radius,
        alpha,
        false,
        0,
      )
    }
    ctx.restore()
  }

  private drawShowcaseMuzzleFlash(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: 'left' | 'right' = 'right',
  ) {
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(direction === 'left' ? x - 6 : x - 1, y - 2, 7, 4)
    ctx.fillStyle = '#d6d0b5'
    ctx.fillRect(direction === 'left' ? x - 9 : x + 5, y - 1, 4, 2)
    ctx.fillStyle = '#6f746b'
    ctx.fillRect(direction === 'left' ? x - 11 : x + 8, y, 3, 1)
  }

  private drawShowcaseShieldAbsorption(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    elapsed: number,
  ) {
    const duration = 0.9
    const progress = clamp(elapsed / duration, 0, 1)
    if (elapsed < 0 || progress >= 1) {
      return
    }

    const eased = 1 - (1 - progress) ** 2
    const alpha = 0.84 * (1 - progress)
    const outerRadius = 28 + eased * 5
    const innerRadius = 24 + eased * 3

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#86f4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(
      x,
      y,
      outerRadius,
      -Math.PI * 0.42,
      Math.PI * 0.42,
    )
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.48
    ctx.strokeStyle = '#dffcff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(
      x,
      y,
      innerRadius,
      -Math.PI * 0.34,
      Math.PI * 0.34,
    )
    ctx.stroke()

    const impactX = Math.round(x + outerRadius)
    ctx.globalAlpha = alpha * 0.78
    ctx.fillStyle = '#dffcff'
    ctx.fillRect(impactX - 2, y - 2, 4, 4)
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(
      Math.round(impactX + 3 + eased * 7),
      Math.round(y - 5 - eased * 5),
      3,
      2,
    )
    ctx.fillRect(
      Math.round(impactX + 4 + eased * 9),
      Math.round(y + 4 + eased * 4),
      2,
      2,
    )
    ctx.restore()
  }

  private drawShowcaseImpactParticles(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    kind: 'direct' | 'he' | 'mine',
    age: number,
  ) {
    const progress = clamp(age, 0, 1)
    const alpha = Math.max(0, 1 - progress)
    if (alpha <= 0) {
      return
    }

    const count = kind === 'he' ? 12 : kind === 'mine' ? 9 : 6
    const radius =
      (kind === 'he' ? 5 + progress * 35 : kind === 'mine' ? 4 + progress * 21 : 3 + progress * 8)
    ctx.save()
    ctx.globalAlpha = alpha

    if (progress < 0.34) {
      ctx.fillStyle = kind === 'direct' ? '#d6d0b5' : '#ffd35a'
      ctx.fillRect(x - 4, y - 4, 8, 8)
      ctx.fillStyle = '#fff1b0'
      ctx.fillRect(x - 2, y - 2, 4, 4)
    }

    for (let index = 0; index < count; index += 1) {
      const angle =
        ((index / count) * Math.PI * 2) +
        (kind === 'he' ? Math.PI / 12 : Math.PI / 8)
      const distance = radius * (0.68 + (index % 3) * 0.16)
      const px = Math.round(x + Math.cos(angle) * distance)
      const py = Math.round(y + Math.sin(angle) * distance)
      if (kind === 'he') {
        const tail = 5
        ctx.strokeStyle = '#17130c'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(
          px - Math.round(Math.cos(angle) * tail),
          py - Math.round(Math.sin(angle) * tail),
        )
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.strokeStyle = index % 2 === 0 ? '#ffd35a' : '#d6d0b5'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(
          px - Math.round(Math.cos(angle) * tail),
          py - Math.round(Math.sin(angle) * tail),
        )
        ctx.lineTo(px, py)
        ctx.stroke()
      } else {
        ctx.fillStyle =
          kind === 'mine'
            ? index % 2 === 0
              ? '#ffd35a'
              : '#9a805d'
            : index % 2 === 0
              ? '#d6d0b5'
              : '#78786e'
        ctx.fillRect(px - 1, py - 1, 2, 2)
      }
    }

    if (kind !== 'direct' && progress > 0.16) {
      ctx.globalAlpha = alpha * 0.52
      ctx.fillStyle = '#242824'
      ctx.fillRect(
        Math.round(x - 5 - progress * 5),
        Math.round(y - 4 - progress * 8),
        9,
        6,
      )
      ctx.fillStyle = '#9a805d'
      ctx.fillRect(
        Math.round(x + 2 + progress * 4),
        Math.round(y - 2 - progress * 5),
        7,
        4,
      )
    }
    ctx.restore()
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
      drawPixelPortableRelay(ctx, x + 3, y + 2, 28, true, state.time)
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
      visual === 'ammo' ||
      visual === 'swamp' ||
      visual === 'ricochet' ||
      visual === 'metal' ||
      visual === 'dust' ||
      visual === 'echo' ||
      visual === 'reeds' ||
      visual === 'gravel' ||
      visual === 'snow'
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
    state: { accent: string; bright?: boolean; pressed: boolean; selected: boolean },
  ) {
    const body = state.pressed
      ? '#1a211b'
      : state.selected
        ? state.bright ? '#30392c' : '#263023'
        : state.bright ? '#20261f' : '#171c17'
    const top = state.pressed
      ? '#0b0d0a'
      : state.selected
        ? state.bright ? '#909e7c' : '#7e8d6b'
        : state.bright ? '#606b59' : '#4d5748'
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
    const tutorialLoading = state.runKind === 'tutorial'
    const arenaCenterX = ARENA_X + ARENA_WIDTH / 2
    const loadingCenterX = tutorialLoading ? LOGICAL_WIDTH / 2 : arenaCenterX
    const barX = loadingCenterX - 112
    const barY = 238
    const barWidth = 224
    const barHeight = 18

    ctx.fillStyle = tutorialLoading ? '#050505' : 'rgba(5, 5, 5, 0.78)'
    ctx.fillRect(
      tutorialLoading ? 0 : ARENA_X,
      tutorialLoading ? 0 : ARENA_Y,
      tutorialLoading ? LOGICAL_WIDTH : ARENA_WIDTH,
      tutorialLoading ? LOGICAL_HEIGHT : ARENA_HEIGHT,
    )
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    drawUiSprite(ctx, 'loading.plaque', loadingCenterX - 118, 74, { width: 236, height: 42, sheet: 'ui32', alpha: 0.94 })
    this.drawCenteredText(
      ctx,
      `${tutorialLoading ? 'READYING DRILL' : 'LOADING LEVEL'} ${targetLevel.id}`,
      loadingCenterX,
      86,
      this.getTeamColors(state, state.playerTeam).body,
      TITLE_SCALE,
    )
    this.drawCenteredText(ctx, targetLevel.name, loadingCenterX, 120, '#d8d4c8', TEXT_SCALE, ARENA_WIDTH - 48)

    const treadBob = Math.round(Math.sin(state.time * 9) * 2)
    drawUiSprite(ctx, 'loading.tread', loadingCenterX - 22 + treadBob, 150, { width: 44, height: 44, sheet: 'ui32' })
    drawUiSprite(ctx, 'loading.spark', loadingCenterX + 30 - treadBob, 154, { width: 22, height: 22, sheet: 'ui32', alpha: 0.85 })

    const tip = loading?.tip ?? 'Tightening pixel bolts.'
    this.drawCenteredText(ctx, tip, loadingCenterX, 204, '#f2ead7', TEXT_SCALE, ARENA_WIDTH - 48)

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
      drawUiSprite(ctx, 'loading.ready', loadingCenterX - 16, 265, { width: 32, height: 32, sheet: 'ui32', alpha: 0.98 })
      this.drawCenteredText(ctx, 'READY', loadingCenterX, 300, '#fff1a5', TITLE_SCALE)
      this.drawCenteredText(ctx, 'PRESS ENTER / SPACE TO BEGIN', loadingCenterX, 322, '#f2ead7', TEXT_SCALE)
      this.drawCenteredText(ctx, 'ESC RETURNS TO BRIEFING', loadingCenterX, 340, '#8f8a82', TEXT_SCALE)
    } else {
      this.drawCenteredText(ctx, `${Math.round(progress * 100)}%`, loadingCenterX, 265, '#8f8a82', TEXT_SCALE)
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

    this.drawTreadTraceSpan(ctx, startX, startY, endX, endY, first.weight, alpha, first.overdrive, seed, 'round', true, first.surface)
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
    const sourceSurface = state.tiles[move.fromRow]?.[move.fromCol]?.kind ?? 'empty'
    const surface = state.tiles[move.toRow]?.[move.toCol]?.kind ?? 'empty'
    if (sourceSurface === 'metal' || surface === 'metal' || sourceSurface === 'water' || surface === 'water') {
      return null
    }
    const alpha = overdrive ? 0.86 : 0.76
    const seed = `live:${tank.id}:${move.fromCol}:${move.fromRow}:${direction}`

    this.drawTreadTraceSpan(ctx, startX, startY, endX, endY, weight, alpha, overdrive, seed, 'butt', false, surface)

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
      surface,
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
    surface: TileKind = 'empty',
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
    const palette = this.getTreadTracePalette(surface, overdrive)

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(Math.atan2(endY - startY, endX - startX))
    this.drawTreadTraceDust(ctx, treadLength, treadWidth, treadOffset, alpha, palette.dust, seed, includeEndDust)
    this.drawTreadTraceBelt(ctx, -treadOffset, treadLength, treadWidth, alpha, palette.base, palette.edge, palette.lug, seed, 0, cap)
    this.drawTreadTraceBelt(ctx, treadOffset, treadLength, treadWidth, alpha, palette.base, palette.edge, palette.lug, seed, 1, cap)
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
    const palette = this.getTreadTracePalette(track.surface, track.overdrive)
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
      ctx.strokeStyle = palette.edge
      ctx.lineWidth = width + 5
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(controlX, controlY, endX, endY)
      ctx.stroke()

      ctx.globalAlpha = alpha * 0.74
      ctx.strokeStyle = palette.base
      ctx.lineWidth = width + 2
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(controlX, controlY, endX, endY)
      ctx.stroke()

      this.drawTreadTurnLugs(ctx, startX, startY, controlX, controlY, endX, endY, width, alpha, palette.lug)
    }

    ctx.globalAlpha = alpha * 0.36
    ctx.fillStyle = palette.dust
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
    color: string,
    seed: string,
    includeEndDust = true,
  ) {
    const half = length / 2
    const lengthFactor = Math.max(1, length / TILE_SIZE)
    const speckCount = Math.round(24 * lengthFactor)
    const dustMargin = includeEndDust ? 4 : 0
    ctx.globalAlpha = alpha * 0.46
    ctx.fillStyle = color
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

  private getTreadTracePalette(surface: TileKind, overdrive: boolean) {
    if (overdrive) {
      return { base: '#4f3e20', edge: '#1d1407', lug: '#ba8c3d', dust: '#916d2d' }
    }

    if (surface === 'swamp') {
      return { base: '#222819', edge: '#0d1309', lug: '#637348', dust: '#4d5e36' }
    }

    if (surface === 'snow') {
      return { base: '#8c9c96', edge: '#53645f', lug: '#d7eee7', dust: '#e4f5ef' }
    }

    if (surface === 'dust') {
      return { base: '#5b4931', edge: '#2b2116', lug: '#b58a55', dust: '#ba8b52' }
    }

    if (surface === 'gravel') {
      return { base: '#3d3b35', edge: '#181814', lug: '#8a8375', dust: '#777064' }
    }

    return { base: '#343127', edge: '#15130d', lug: '#8f8763', dust: '#675f45' }
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

    drawTouchControlsOverlay(ctx, state.feedback.heldButtons, {
      pause: true,
      handedness: state.settings.touchHandedness,
      joystick: state.feedback.touch.joystick,
      primary: !this.touchSideRailsActive(),
    })
  }

  private drawTouchHudActionRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    active: boolean,
    progress: number | null,
    accent: string,
  ) {
    ctx.save()
    ctx.globalAlpha = active ? 0.96 : 0.72
    ctx.strokeStyle = active ? '#fff1a5' : accent
    ctx.lineWidth = active ? 3 : 2
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    if (progress !== null) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = accent
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(x, y, radius + 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(progress, 0, 1))
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawMajorModPlacementPreview(ctx: CanvasRenderingContext2D, state: RenderState, camera: BattlefieldCamera) {
    const confirmation = state.feedback.touch.modConfirmation
    if (!confirmation || confirmation.cells.length === 0) {
      return
    }

    const color = confirmation.valid ? '#86f4ff' : '#f06243'
    ctx.save()
    for (const cell of confirmation.cells) {
      const point = worldCellToScreen(camera, cell.x, cell.y)
      ctx.globalAlpha = confirmation.valid ? 0.34 : 0.46
      ctx.fillStyle = color
      ctx.fillRect(point.x + 3, point.y + 3, TILE_SIZE - 6, TILE_SIZE - 6)
      ctx.globalAlpha = 0.88
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(point.x + 3.5, point.y + 3.5, TILE_SIZE - 7, TILE_SIZE - 7)
      ctx.fillStyle = color
      ctx.fillRect(
        point.x + 5,
        point.y + TILE_SIZE - 7,
        Math.round((TILE_SIZE - 10) * confirmation.progress),
        3,
      )
    }
    ctx.restore()
  }
}
