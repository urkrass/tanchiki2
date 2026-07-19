import {
  COLOR_SAFE_TEAM_COLORS,
  TEAM_COLORS,
} from './battlefield.ts'
import { drawBattlefieldPropAtlasSprite } from './battlefieldPropAtlas.ts'
import {
  getBattlefieldPropDefinition,
  getBattlefieldPropPlaceholderPlan,
  getBattlefieldPropRenderBounds,
  type BattlefieldPropSpriteId,
} from './battlefieldProps.ts'
import { BATTLEFIELD_PROP_AFFORDANCE_CONTRACT, type BattlefieldPropAffordance } from './battlefieldPropAffordances.ts'
import {
  drawPixelProjectile,
  drawPixelTank,
  drawPixelTankStatusChannels,
  type PixelTeamPalette,
} from './pixelArt.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'
import type { TankClassId } from './types.ts'
import {
  CANONICAL_VEHICLE_DENSITY,
  getVehicleRuntimeSize,
  MAX_VEHICLE_RUNTIME_SIZE,
  STANDARD_VEHICLE_RUNTIME_SIZE,
} from './vehicleAtlas.ts'
import { getClassEquipmentHudModel, type ClassEquipmentHudInput } from './classEquipmentHud.ts'
import { drawClassEquipmentHudStrip } from './classEquipmentHudRender.ts'
import {
  CLASS_EQUIPMENT_VISUAL_CONTRACT,
  drawClassEquipmentIcon,
  type ClassEquipmentVisualKind,
} from './classEquipmentVisual.ts'

export const VISUAL_QA_MODES = [
  'pixel_density_comparison',
  'player_combat_matrix',
  'prop_affordance_board',
  'class_equipment_board',
] as const

export type VisualQaMode = (typeof VISUAL_QA_MODES)[number]

export function normalizeVisualQaMode(value: string | null): VisualQaMode | null {
  return VISUAL_QA_MODES.includes(value as VisualQaMode) ? value as VisualQaMode : null
}

export class VisualQaRenderer {
  private time = 0
  private readonly ctx: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement
  readonly mode: VisualQaMode

  constructor(canvas: HTMLCanvasElement, mode: VisualQaMode) {
    this.canvas = canvas
    this.mode = mode
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Visual QA canvas is unavailable')
    }
    this.ctx = context
    const dimensions = mode === 'player_combat_matrix'
      ? { width: 1560, height: 1420 }
      : mode === 'prop_affordance_board'
        ? { width: 1560, height: 1320 }
        : mode === 'class_equipment_board'
          ? { width: 1280, height: 900 }
        : { width: 1280, height: 820 }
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    canvas.classList.add('visual-qa-canvas')
    document.querySelector('#app')?.classList.add('visual-qa-app')
  }

  advance(dt: number) {
    this.time += Math.max(0, dt)
  }

  render() {
    this.ctx.imageSmoothingEnabled = false
    if (this.mode === 'pixel_density_comparison') {
      this.drawDensityComparison()
      return
    }
    if (this.mode === 'player_combat_matrix') {
      this.drawPlayerCombatMatrix()
      return
    }
    if (this.mode === 'class_equipment_board') {
      this.drawClassEquipmentBoard()
      return
    }
    this.drawPropAffordanceBoard()
  }

  renderText() {
    return JSON.stringify({
      mode: this.mode,
      artifact: this.mode === 'player_combat_matrix'
        ? 'Player Combat Matrix'
        : this.mode === 'prop_affordance_board'
          ? 'Prop Affordance Board'
          : this.mode === 'class_equipment_board'
            ? 'Class Equipment Board'
          : 'Pixel Density Runtime Comparison',
      coordinateSystem: 'canvas origin top-left, x right, y down; all sprite destinations use integer coordinates',
      sourceDensity: CANONICAL_VEHICLE_DENSITY,
      runtimeFootprints: {
        scout: STANDARD_VEHICLE_RUNTIME_SIZE,
        engineer: STANDARD_VEHICLE_RUNTIME_SIZE,
        battle: MAX_VEHICLE_RUNTIME_SIZE,
      },
      runtimeSizeCap: MAX_VEHICLE_RUNTIME_SIZE,
      candidates: [48, 64],
      sourcePolicy: 'repository SVG, manifests, and deterministic generators are canonical; Figma is scenario review only',
      smoothing: this.ctx.imageSmoothingEnabled,
      classEquipment: this.mode === 'class_equipment_board'
        ? this.getClassEquipmentQaModels().map((model) => model.summary)
        : undefined,
      time: Number(this.time.toFixed(3)),
    })
  }

  private drawClassEquipmentBoard() {
    this.drawBoardBackground('#111511')
    this.drawTitle('CLASS EQUIPMENT BOARD', 'Actual 416x28 HUD strips · 48-unit military equipment sources · existing state only')
    const models = this.getClassEquipmentQaModels()
    const teamColors = ['#86f4ff', '#d7b64a', '#f1c457']

    models.forEach((model, index) => {
      const rowY = 126 + index * 246
      this.ctx.fillStyle = '#dfe3dc'
      this.ctx.font = '700 18px ui-monospace, SFMono-Regular, Consolas, monospace'
      this.ctx.fillText(`${model.classLabel} KIT`, 48, rowY)
      this.ctx.fillStyle = '#89958c'
      this.ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace'
      this.ctx.fillText(model.summary, 190, rowY + 1)

      this.ctx.fillStyle = '#5c5d58'
      this.ctx.fillRect(48, rowY + 28, 416, 32)
      drawClassEquipmentHudStrip(this.ctx, model, 54, rowY + 30, 404, {
        time: this.time,
        teamColor: teamColors[index],
        background: '#5c5d58',
      })

      const visibleKinds = model.slots.map<ClassEquipmentVisualKind>((slot) =>
        slot.kind === 'steel-trap' ? 'steel' : slot.kind
      )
      if (model.tankClass === 'battle') {
        visibleKinds.push('shield')
      }
      visibleKinds.forEach((kind, iconIndex) => {
        const iconX = 590 + iconIndex * 132
        this.ctx.fillStyle = '#202720'
        this.ctx.fillRect(iconX - 10, rowY + 16, 104, 104)
        drawClassEquipmentIcon(this.ctx, kind, iconX + 10, rowY + 36, 64, {
          active: model.slots[iconIndex]?.state !== 'out' && model.slots[iconIndex]?.state !== 'empty',
          teamColor: teamColors[index],
        })
        this.ctx.fillStyle = '#cfd5cd'
        this.ctx.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace'
        this.ctx.fillText(kind === 'shield' ? 'SHIELD · ARCHIVED' : kind.toUpperCase(), iconX, rowY + 136)
      })

      this.ctx.fillStyle = '#718077'
      this.ctx.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace'
      this.ctx.fillText('HUD 1X', 48, rowY + 78)
      this.ctx.fillText('SOURCE INSPECTION', 590, rowY + 150)
      this.ctx.fillStyle = '#283129'
      this.ctx.fillRect(48, rowY + 178, 1184, 1)
    })

    this.ctx.fillStyle = '#8b968e'
    this.ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace'
    this.ctx.fillText(
      `${CLASS_EQUIPMENT_VISUAL_CONTRACT.length} canonical equipment silhouettes · portable relay reuses the live rotating field unit`,
      48,
      874,
    )
  }

  private getClassEquipmentQaModels() {
    const states: ClassEquipmentHudInput[] = [
      {
        tankClass: 'scout',
        shells: 10,
        shellCapacity: 10,
        shellRechargeProgress: 0,
        onAmmoStation: false,
        shield: 0,
        deployables: {
          active: [],
          available: ['decoy', 'tripwire'],
          hold: {
            kind: 'decoy',
            action: 'place',
            key: '1',
            col: 0,
            row: 0,
            progress: 0.58,
            duration: 0.9,
            remaining: 0.38,
            label: 'HOLD 1 DECOY',
          },
          alerts: [],
          label: 'DECOY 58%',
        },
      },
      {
        tankClass: 'engineer',
        shells: 6,
        shellCapacity: 10,
        shellRechargeProgress: 0,
        onAmmoStation: false,
        shield: 0,
        deployables: {
          active: [
            { id: 'qa-mine', kind: 'mine', col: 0, row: 0, owner: 'player', label: '2 MINE' },
            { id: 'qa-trap', kind: 'steel', col: 1, row: 0, owner: 'player', label: '4 TRAP' },
          ],
          available: ['mine', 'steel'],
          hold: null,
          alerts: [],
          label: 'GEAR 2/2',
        },
      },
      {
        tankClass: 'battle',
        shells: 2,
        shellCapacity: 10,
        shellRechargeProgress: 0.44,
        onAmmoStation: true,
        shield: 0,
        deployables: {
          active: [],
          available: [],
          hold: null,
          alerts: [],
          label: 'GEAR NONE',
        },
      },
    ]
    return states.map(getClassEquipmentHudModel)
  }

  private drawDensityComparison() {
    const ctx = this.ctx
    this.drawBoardBackground('#111511')
    this.drawTitle('PIXEL DENSITY RUNTIME COMPARISON', '48px and 64px sources · Scout/Engineer 28px · sanctioned Battle Tank 32px')

    ctx.font = '700 17px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillStyle = '#f4e5a5'
    ctx.fillText('CANDIDATE A · 48px', 350, 126)
    ctx.fillStyle = '#d7d8d2'
    ctx.fillText('CANDIDATE B · 64px', 790, 126)
    ctx.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillStyle = '#93a197'
    ctx.fillText('source 48 → class-sized runtime · one-tile footprint', 350, 150)
    ctx.fillText('source 64 → class-sized runtime · same boundary', 790, 150)

    const rows: Array<
      | { kind: 'tank'; label: string; tankClass: TankClassId }
      | { kind: 'prop'; label: string; spriteId: BattlefieldPropSpriteId; prototype: 'blocker' | 'cover' | 'signal' }
    > = [
      { kind: 'tank', label: 'SCOUT', tankClass: 'scout' },
      { kind: 'tank', label: 'ENGINEER', tankClass: 'engineer' },
      { kind: 'tank', label: 'BATTLE TANK', tankClass: 'battle' },
      { kind: 'prop', label: 'LARGE BLOCKER', spriteId: 'rock_large', prototype: 'blocker' },
      { kind: 'prop', label: 'SOFT COVER', spriteId: 'bush', prototype: 'cover' },
      { kind: 'prop', label: 'SIGNAL OBJECT', spriteId: 'relay_tower', prototype: 'signal' },
    ]

    rows.forEach((row, index) => {
      const y = 208 + index * 96
      ctx.font = '700 14px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.fillStyle = '#d8ddd6'
      ctx.fillText(row.label, 48, y + 42)
      this.drawRuntimeCell(320, y, 280, 78, index % 2 === 0 ? 'open' : 'busy')
      this.drawRuntimeCell(760, y, 280, 78, index % 2 === 0 ? 'open' : 'busy')

      if (row.kind === 'tank') {
        const palette = index === 1 ? COLOR_SAFE_TEAM_COLORS.red : TEAM_COLORS.blue
        const teamKey: AtlasTeamKey = index === 1 ? 'redSafe' : 'blue'
        const runtimeSize = getVehicleRuntimeSize(28, row.tankClass)
        drawPixelTank(ctx, 460, y + 39, 28, 'up', palette, {
          frame: Math.floor(this.time * 6),
          tankClass: row.tankClass,
          teamKey,
          cosmeticSkin: 'field-worn',
        })
        this.drawCandidateTank(ctx, 900, y + 39, 64, runtimeSize, row.tankClass, palette, Math.floor(this.time * 6) % 2)
        this.drawTileFootprint(460, y + 39)
        this.drawTileFootprint(900, y + 39)
        this.drawTankInspection(460, y + 39, 512, y + 7)
        this.drawTankInspection(900, y + 39, 952, y + 7)
      } else {
        this.drawActualProp(row.spriteId, 460, y + 39)
        this.drawCandidateProp(ctx, 900, y + 39, 64, row.prototype)
      }

      ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.fillStyle = '#7f8a82'
      const comparisonNote = row.kind === 'tank'
        ? '1x tile + 2x inspection · smoothing off'
        : 'authored prop bounds · smoothing off'
      ctx.fillText(comparisonNote, 328, y + 73)
      ctx.fillText(comparisonNote, 768, y + 73)
    })

    ctx.fillStyle = '#1c241e'
    ctx.fillRect(48, 788, 1184, 1)
    ctx.font = '13px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillStyle = '#aeb9b0'
    ctx.fillText('Decision evidence: Battle Tank uses the full 32px tile; Scout and Engineer retain 2px clearance on each side.', 48, 812)
  }

  private drawRuntimeCell(x: number, y: number, width: number, height: number, terrain: 'open' | 'busy') {
    const ctx = this.ctx
    ctx.fillStyle = terrain === 'open' ? '#2d4c2c' : '#334231'
    ctx.fillRect(x, y, width, height)
    for (let px = x; px < x + width; px += 16) {
      for (let py = y; py < y + height; py += 16) {
        if (((px + py) / 16) % 3 === 0) {
          ctx.fillStyle = terrain === 'open' ? '#385b35' : '#566148'
          ctx.fillRect(px + 3, py + 5, 3, 3)
        }
      }
    }
    ctx.strokeStyle = '#0a0d0a'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
  }

  private drawActualProp(spriteId: BattlefieldPropSpriteId, x: number, y: number) {
    const definition = getBattlefieldPropDefinition(spriteId)
    const bounds = getBattlefieldPropRenderBounds(definition)
    this.ctx.save()
    this.ctx.translate(Math.round(x), Math.round(y))
    const drawn = drawBattlefieldPropAtlasSprite(this.ctx, definition, bounds.x, bounds.y, {
      width: bounds.w,
      height: bounds.h,
    })
    if (!drawn) {
      this.drawCandidateProp(this.ctx, 0, 0, 48, spriteId === 'bush' ? 'cover' : spriteId === 'relay_tower' ? 'signal' : 'blocker')
    }
    this.ctx.restore()
  }

  private drawCandidateTank(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    sourceSize: number,
    runtimeSize: number,
    tankClass: TankClassId,
    palette: PixelTeamPalette,
    frame: number,
  ) {
    const unit = sourceSize === 64 ? 4 : 3
    const half = sourceSize / 2
    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    ctx.scale(runtimeSize / sourceSize, runtimeSize / sourceSize)
    const trackWidth = tankClass === 'scout' ? unit * 3 : tankClass === 'engineer' ? unit * 4 : unit * 5
    const bodyWidth = tankClass === 'scout' ? unit * 7 : tankClass === 'engineer' ? unit * 9 : unit * 12
    const bodyHeight = tankClass === 'battle' ? unit * 11 : unit * 10
    const trackHeight = unit * 12
    ctx.fillStyle = '#070a08'
    ctx.fillRect(-half + unit, -trackHeight / 2, trackWidth, trackHeight)
    ctx.fillRect(half - unit - trackWidth, -trackHeight / 2, trackWidth, trackHeight)
    ctx.fillStyle = '#343b36'
    ctx.fillRect(-half + unit * 2, -trackHeight / 2 + unit, trackWidth - unit, trackHeight - unit * 2)
    ctx.fillRect(half - trackWidth - unit, -trackHeight / 2 + unit, trackWidth - unit, trackHeight - unit * 2)
    for (let ty = -trackHeight / 2 + unit + frame * unit; ty < trackHeight / 2 - unit; ty += unit * 2) {
      ctx.fillStyle = palette.trim
      ctx.fillRect(-half + unit, ty, trackWidth, unit)
      ctx.fillRect(half - unit - trackWidth, ty, trackWidth, unit)
    }
    ctx.fillStyle = '#070a08'
    ctx.fillRect(-bodyWidth / 2 - unit, -bodyHeight / 2 - unit, bodyWidth + unit * 2, bodyHeight + unit * 2)
    ctx.fillStyle = palette.highlight
    ctx.fillRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight)
    ctx.fillStyle = palette.body
    ctx.fillRect(-bodyWidth / 2 + unit, -bodyHeight / 2 + unit, bodyWidth - unit * 2, bodyHeight - unit * 2)
    ctx.fillStyle = palette.trim
    ctx.fillRect(-bodyWidth / 2 + unit * 2, bodyHeight / 2 - unit * 3, bodyWidth - unit * 4, unit * 2)
    const turretWidth = tankClass === 'scout' ? unit * 5 : tankClass === 'engineer' ? unit * 7 : unit * 9
    ctx.fillStyle = '#070a08'
    ctx.fillRect(-turretWidth / 2 - unit, -bodyHeight / 2 - unit * 2, turretWidth + unit * 2, unit * 6)
    ctx.fillStyle = palette.body
    ctx.fillRect(-turretWidth / 2, -bodyHeight / 2 - unit, turretWidth, unit * 4)
    ctx.fillStyle = '#070a08'
    ctx.fillRect(-unit, -half, unit * 2, half - bodyHeight / 4)
    ctx.fillStyle = palette.trim
    ctx.fillRect(0, -half + unit, unit, half - bodyHeight / 4 - unit)
    if (tankClass === 'scout') {
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(bodyWidth / 2 + unit, -half + unit, unit, unit * 6)
      ctx.fillRect(bodyWidth / 2, -half + unit, unit * 3, unit)
    } else if (tankClass === 'engineer') {
      ctx.fillStyle = '#d9a833'
      ctx.fillRect(-bodyWidth / 2 - unit * 2, bodyHeight / 4, unit * 3, unit * 4)
      ctx.fillStyle = '#aeb9b5'
      ctx.fillRect(bodyWidth / 2 - unit, bodyHeight / 4, unit * 3, unit * 4)
    } else {
      ctx.fillStyle = '#aeb9b5'
      ctx.fillRect(-bodyWidth / 2 - unit, -bodyHeight / 4, unit * 2, bodyHeight / 2)
      ctx.fillRect(bodyWidth / 2 - unit, -bodyHeight / 4, unit * 2, bodyHeight / 2)
    }
    ctx.restore()
  }

  private drawTileFootprint(x: number, y: number) {
    this.ctx.save()
    this.ctx.strokeStyle = 'rgba(255, 240, 154, 0.72)'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(Math.round(x - 16) + 0.5, Math.round(y - 16) + 0.5, 31, 31)
    this.ctx.restore()
  }

  private drawTankInspection(x: number, y: number, destinationX: number, destinationY: number) {
    this.ctx.save()
    this.ctx.imageSmoothingEnabled = false
    this.ctx.drawImage(this.canvas, Math.round(x - 16), Math.round(y - 16), 32, 32, destinationX, destinationY, 64, 64)
    this.ctx.strokeStyle = '#0a0d0a'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(destinationX, destinationY, 64, 64)
    this.ctx.restore()
  }

  private drawCandidateProp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    kind: 'blocker' | 'cover' | 'signal',
  ) {
    const unit = Math.max(2, Math.round(size / 16))
    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    if (kind === 'blocker') {
      ctx.fillStyle = '#101312'
      ctx.fillRect(-size / 2 + unit, -size / 3, size - unit * 2, Math.round(size * 0.58))
      ctx.fillStyle = '#697570'
      ctx.fillRect(-size / 2 + unit * 2, -size / 3 + unit, size - unit * 5, Math.round(size * 0.42))
      ctx.fillStyle = '#9aa59e'
      ctx.fillRect(-size / 4, -size / 3 + unit * 2, size / 3, unit * 3)
      ctx.fillStyle = '#3d4642'
      ctx.fillRect(0, -unit, size / 3, unit * 4)
    } else if (kind === 'cover') {
      ctx.fillStyle = '#10170e'
      for (let index = -4; index <= 4; index += 1) {
        const height = size / 3 + (Math.abs(index) % 3) * unit * 2
        ctx.fillRect(index * unit * 2 - unit, size / 3 - height, unit * 3, height)
      }
      ctx.fillStyle = '#5f8b45'
      for (let index = -4; index <= 4; index += 2) {
        ctx.fillRect(index * unit * 2, -size / 4 + (Math.abs(index) % 3) * unit, unit * 3, unit * 5)
      }
      ctx.fillStyle = '#a8cf75'
      ctx.fillRect(-size / 4, -size / 5, size / 2, unit * 2)
    } else {
      ctx.fillStyle = '#0b1010'
      ctx.fillRect(-size / 3, size / 5, Math.round(size * 0.66), Math.round(size * 0.28))
      ctx.fillRect(-unit, -size / 2, unit * 2, Math.round(size * 0.72))
      ctx.fillStyle = '#77827f'
      ctx.fillRect(-size / 3 + unit, size / 5 + unit, Math.round(size * 0.66) - unit * 2, Math.round(size * 0.28) - unit * 2)
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(-unit, -size / 2 + unit, unit, Math.round(size * 0.55))
      ctx.fillRect(-size / 5, -size / 3, Math.round(size * 0.4), unit * 2)
      ctx.fillStyle = '#d7b64a'
      ctx.fillRect(-unit * 2, size / 4, unit * 4, unit * 2)
    }
    ctx.restore()
  }

  private drawPlayerCombatMatrix() {
    this.drawBoardBackground('#111511')
    this.drawTitle('PLAYER COMBAT MATRIX', '48px authored source · Scout/Engineer 28px · Battle Tank 32px')
    this.ctx.fillStyle = '#8e9b92'
    this.ctx.font = '18px ui-monospace, SFMono-Regular, Consolas, monospace'
    this.ctx.fillText('Matrix scaffold active', 48, 150)
    this.drawPlayerCombatMatrixGrid()
  }

  private drawPlayerCombatMatrixGrid() {
    this.drawBoardBackground('#111511')
    this.drawTitle('PLAYER COMBAT MATRIX', '48 actual 1x scenarios · class-relative one-tile sizes · 3 classes × 4 directions × 4 state rows')
    const ctx = this.ctx
    const classes: TankClassId[] = ['scout', 'engineer', 'battle']
    const directions = ['up', 'right', 'down', 'left'] as const
    const rowProfiles: Array<{
      label: string
      palette: PixelTeamPalette
      teamKey: AtlasTeamKey
      state: 'self' | 'shield' | 'armor_damage' | 'combined'
    }> = [
      { label: 'BLUE · SELF', palette: TEAM_COLORS.blue, teamKey: 'blue', state: 'self' },
      { label: 'RED · SHIELD', palette: TEAM_COLORS.red, teamKey: 'red', state: 'shield' },
      { label: 'CYAN · ARMOR/DAMAGE', palette: COLOR_SAFE_TEAM_COLORS.blue, teamKey: 'blueSafe', state: 'armor_damage' },
      { label: 'AMBER · COMBINED', palette: COLOR_SAFE_TEAM_COLORS.red, teamKey: 'redSafe', state: 'combined' },
    ]
    const environments = ['open', 'grass', 'industrial', 'snow', 'fog edge', 'soft cover'] as const
    const cellWidth = 120
    const cellHeight = 300
    const originX = 48
    const originY = 148

    for (const [classIndex, tankClass] of classes.entries()) {
      for (const [directionIndex, direction] of directions.entries()) {
        const column = classIndex * directions.length + directionIndex
        const x = originX + column * cellWidth
        ctx.fillStyle = '#d9ddd7'
        ctx.font = '700 12px ui-monospace, SFMono-Regular, Consolas, monospace'
        ctx.fillText(`${tankClass.toUpperCase()} ${direction.toUpperCase()}`, x + 7, 126)
      }
    }

    rowProfiles.forEach((profile, rowIndex) => {
      const rowY = originY + rowIndex * cellHeight
      ctx.fillStyle = '#9eaaa1'
      ctx.font = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.fillText(profile.label, originX + 7, rowY + 18)

      classes.forEach((tankClass, classIndex) => {
        directions.forEach((direction, directionIndex) => {
          const scenarioIndex = rowIndex * 12 + classIndex * 4 + directionIndex
          const environment = environments[scenarioIndex % environments.length]
          const x = originX + (classIndex * 4 + directionIndex) * cellWidth
          const y = rowY + 26
          this.drawCombatMatrixCell(
            x,
            y,
            cellWidth - 4,
            cellHeight - 32,
            tankClass,
            direction,
            profile.palette,
            profile.teamKey,
            profile.state,
            environment,
            scenarioIndex,
          )
        })
      })
    })
  }

  private drawCombatMatrixCell(
    x: number,
    y: number,
    width: number,
    height: number,
    tankClass: TankClassId,
    direction: 'up' | 'right' | 'down' | 'left',
    palette: PixelTeamPalette,
    teamKey: AtlasTeamKey,
    state: 'self' | 'shield' | 'armor_damage' | 'combined',
    environment: 'open' | 'grass' | 'industrial' | 'snow' | 'fog edge' | 'soft cover',
    scenarioIndex: number,
  ) {
    const ctx = this.ctx
    const background = environment === 'snow'
      ? '#71858a'
      : environment === 'industrial'
        ? '#414b47'
        : environment === 'grass' || environment === 'soft cover'
          ? '#2d4c2c'
          : '#354534'
    ctx.fillStyle = background
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = '#080b08'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)

    for (let px = x + 8; px < x + width; px += 18) {
      for (let py = y + 8; py < y + height; py += 24) {
        ctx.fillStyle = environment === 'snow' ? '#b8c8ca' : environment === 'industrial' ? '#66716c' : '#53724d'
        ctx.fillRect(px, py, 3, 3)
      }
    }

    const centerX = Math.round(x + width / 2)
    const centerY = Math.round(y + 105)
    const runtimeSize = getVehicleRuntimeSize(28, tankClass)
    const runtimeHalf = Math.round(runtimeSize / 2)
    const combined = state === 'combined'
    const options = {
      armored: state === 'armor_damage' || (combined && scenarioIndex % 3 === 0),
      cosmeticSkin: scenarioIndex % 2 === 0 ? 'factory' as const : 'field-worn' as const,
      damage: state === 'armor_damage' ? 0.65 : combined ? 0.34 : 0,
      deferStatus: true,
      frame: scenarioIndex % 2,
      focused: combined || direction === 'left',
      self: state === 'self' || (combined && scenarioIndex % 2 === 0),
      shield: state === 'shield' || (combined && scenarioIndex % 3 === 1),
      tankClass,
      teamKey,
    }
    drawPixelTank(ctx, centerX, centerY, 28, direction, palette, options)
    this.drawTileFootprint(centerX, centerY)

    if (environment === 'soft cover') {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#173416'
      ctx.fillRect(centerX - runtimeHalf, centerY - runtimeHalf, 5, runtimeSize)
      ctx.fillRect(centerX + runtimeHalf - 5, centerY - runtimeHalf + 2, 5, runtimeSize - 3)
      ctx.fillStyle = '#9ac46f'
      ctx.fillRect(centerX - runtimeHalf + 2, centerY - runtimeHalf + 2, 2, runtimeSize - 4)
      ctx.fillRect(centerX + runtimeHalf - 4, centerY - runtimeHalf + 4, 2, runtimeSize - 7)
      ctx.globalAlpha = 1
    }
    if (environment === 'fog edge') {
      ctx.fillStyle = 'rgba(3, 3, 3, 0.84)'
      ctx.fillRect(centerX + 16, y + 1, Math.max(0, x + width - centerX - 17), height - 2)
    }

    drawPixelTankStatusChannels(ctx, centerX, centerY, runtimeSize, palette, options)

    if (scenarioIndex % 4 === 0) {
      drawPixelProjectile(ctx, centerX + 36, centerY - 28, 5, palette.bullet, 'up', { teamKey })
    } else if (scenarioIndex % 4 === 1) {
      ctx.fillStyle = '#fff6bc'
      ctx.fillRect(centerX - 4, centerY - 38, 8, 4)
      ctx.fillRect(centerX - 2, centerY - 44, 4, 6)
    } else if (scenarioIndex % 4 === 2) {
      ctx.fillStyle = '#f5d76a'
      ctx.fillRect(centerX + 25, centerY - 5, 7, 3)
      ctx.fillStyle = '#f06c3c'
      ctx.fillRect(centerX + 27, centerY - 2, 3, 7)
    } else {
      ctx.fillStyle = '#86f4ff'
      ctx.fillRect(centerX + 34, centerY - 24, 2, 42)
      ctx.fillRect(centerX + 29, centerY - 24, 12, 2)
    }

    const reload = (scenarioIndex % 5) / 4
    ctx.fillStyle = '#101410'
    ctx.fillRect(x + 16, y + 176, width - 32, 6)
    ctx.fillStyle = reload >= 1 ? '#86f4ff' : '#ffd35a'
    ctx.fillRect(x + 17, y + 177, Math.round((width - 34) * reload), 4)
    ctx.fillStyle = '#d7dcd6'
    ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillText(environment.toUpperCase(), x + 8, y + 207)
    const statuses = [
      options.self ? 'SELF' : '',
      options.shield ? 'SHIELD' : '',
      options.armored ? 'ARMOR' : '',
      options.focused ? 'FOCUS' : '',
      options.damage ? 'DAMAGE' : '',
    ].filter(Boolean)
    ctx.fillStyle = '#9eaaa1'
    ctx.fillText(statuses.join(' · ') || 'IDLE', x + 8, y + 226)
    ctx.fillStyle = '#7d8981'
    ctx.fillText(`RELOAD ${Math.round(reload * 100)}%`, x + 8, y + 245)
  }

  private drawPropAffordanceBoard() {
    this.drawBoardBackground('#111511')
    this.drawTitle('PROP AFFORDANCE BOARD', 'Repository-canonical behavior contract · full board follows the affordance package')
    const plan = getBattlefieldPropPlaceholderPlan('relay_tower')
    this.ctx.fillStyle = plan.highlight
    this.ctx.font = '18px ui-monospace, SFMono-Regular, Consolas, monospace'
    this.ctx.fillText('Affordance board scaffold active', 48, 150)
    this.drawPropAffordanceGrid()
  }

  private drawPropAffordanceGrid() {
    this.drawBoardBackground('#111511')
    this.drawTitle('PROP AFFORDANCE BOARD', '34 stable IDs · explicit runtime truth · no accidental collision, hazard, signal, or online claims')
    const columns = 6
    const cellWidth = 244
    const cellHeight = 190
    const originX = 48
    const originY = 122

    BATTLEFIELD_PROP_AFFORDANCE_CONTRACT.entries.forEach((entry, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      this.drawPropAffordanceCell(
        originX + column * cellWidth,
        originY + row * cellHeight,
        cellWidth - 8,
        cellHeight - 8,
        entry,
      )
    })
  }

  private drawPropAffordanceCell(x: number, y: number, width: number, height: number, entry: BattlefieldPropAffordance) {
    const ctx = this.ctx
    const cueColor = entry.cue === 'soft_cover'
      ? '#789b61'
      : entry.cue === 'terrain_backed_blocker'
        ? '#6e7974'
        : entry.cue === 'inactive'
          ? '#6f6550'
          : entry.cue === 'broken'
            ? '#765b56'
            : '#4b554f'
    ctx.fillStyle = '#1a211c'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = cueColor
    ctx.fillRect(x, y, 4, height)
    ctx.strokeStyle = '#080b09'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, width, height)

    this.drawActualProp(entry.id, x + 56, y + 68)
    ctx.fillStyle = '#e0e4dc'
    ctx.font = '700 12px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillText(entry.id.toUpperCase(), x + 96, y + 30)
    ctx.fillStyle = '#aeb8b0'
    ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
    ctx.fillText(this.affordanceLabel(entry), x + 96, y + 52)
    ctx.fillText(`MOVE ${entry.movementCollision.toUpperCase()}`, x + 96, y + 70)
    ctx.fillText(`SHOT ${entry.projectileCollision.toUpperCase()}`, x + 96, y + 86)
    ctx.fillText('FOG VISIBLE CELLS', x + 96, y + 102)

    ctx.fillStyle = entry.signal === 'inactive' || entry.hazard === 'inactive' ? '#d6bd79' : '#819087'
    ctx.fillText(`SIGNAL ${entry.signal.toUpperCase()}`, x + 12, y + 132)
    ctx.fillText(`HAZARD ${entry.hazard.toUpperCase()}`, x + 12, y + 148)
    ctx.fillStyle = entry.concealment === 'soft_cover' ? '#b7dc91' : '#819087'
    ctx.fillText(`COVER ${entry.concealment.toUpperCase()}`, x + 12, y + 164)
    ctx.fillStyle = '#6f7b73'
    ctx.fillText('ONLINE UNSUPPORTED', x + 110, y + 164)
  }

  private affordanceLabel(entry: BattlefieldPropAffordance) {
    if (entry.cue === 'terrain_backed_blocker') return 'TERRAIN-BACKED HARD COVER'
    if (entry.cue === 'soft_cover') return 'ACTIVE SOFT COVER'
    if (entry.cue === 'inactive') return 'INACTIVE STATIC ART'
    if (entry.cue === 'broken') return 'BROKEN / NON-FUNCTIONAL'
    if (entry.cue === 'historical') return 'HISTORICAL SURFACE'
    return 'DECORATIVE ONLY'
  }

  private drawBoardBackground(color: string) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private drawTitle(title: string, subtitle: string) {
    this.ctx.fillStyle = '#e8e3d2'
    this.ctx.font = '700 25px ui-monospace, SFMono-Regular, Consolas, monospace'
    this.ctx.fillText(title, 48, 52)
    this.ctx.fillStyle = '#95a098'
    this.ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace'
    this.ctx.fillText(subtitle, 48, 80)
    this.ctx.fillStyle = '#d3ae44'
    this.ctx.fillRect(48, 96, this.canvas.width - 96, 2)
  }
}
