import type { Direction, OfflineDeployableKind, PowerUpKind, RoadNeighbors, TankClassId, TileKind, WaterNeighbors } from './types.ts'
import {
  drawAtlasSprite,
  type AtlasRelayKey,
  type AtlasTeamKey,
  type SpriteSheetId,
} from './spriteAtlas.ts'
import {
  drawVehicleAtlasSprite,
  getVehicleRuntimeSize,
} from './vehicleAtlas.ts'
import { getPortableRelayRotationFrame } from './portableRelayVisual.ts'
import {
  drawStaticRelayAtlasSprite,
  getStaticRelayRuntimeDimensions,
} from './staticRelayAtlas.ts'

export interface PixelTeamPalette {
  body: string
  trim: string
  highlight: string
  bullet: string
}

export interface TankSpriteOptions {
  armored?: boolean
  alive?: boolean
  cosmeticSkin?: TankCosmeticSkinId
  damage?: number
  deferStatus?: boolean
  frame?: number
  focused?: boolean
  self?: boolean
  shield?: boolean
  sheet?: SpriteSheetId
  tankClass?: TankClassId | null
  teamKey?: AtlasTeamKey
}

export type TankCosmeticSkinId = 'factory' | 'field-worn'

export const TANK_COSMETIC_SKIN_CONTRACT = {
  allowed: ['internal texture', 'camouflage', 'wear', 'decals', 'small non-critical details'],
  forbidden: ['class silhouette', 'team rim', 'class identifier', 'hit footprint', 'status indicators'],
} as const

export interface TerrainOptions {
  col: number
  row: number
  hp?: number
  sheet?: SpriteSheetId
  time?: number
  waterNeighbors?: WaterNeighbors
  roadNeighbors?: RoadNeighbors
}

export interface ProjectileSpriteOptions {
  frame?: number
  sheet?: SpriteSheetId
  teamKey?: AtlasTeamKey
}

export interface RelaySpriteOptions {
  frame?: number
  progressPalette?: PixelTeamPalette | null
  sheet?: SpriteSheetId
  teamKey?: AtlasRelayKey
}

const spriteCache = new Map<string, HTMLCanvasElement>()

export function drawPixelGround(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, col: number, row: number) {
  drawSprite(ctx, `ground:${size}:${col}:${row}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return
    const unit = pixelUnit(size)
    const coarse = Math.max(2, Math.round(size / 8))

    fill(g, '#203d24', 0, 0, size, size)
    fill(g, '#2c4d2c', 0, 0, size, unit)
    fill(g, '#152719', 0, size - unit, size, unit)

    for (let pass = 0; pass < 3; pass += 1) {
      for (let index = 0; index < 18; index += 1) {
        const px = seededInt(col, row, 11 + pass * 41 + index, size)
        const py = seededInt(row, col, 23 + pass * 53 + index, size)
        const length = unit * (1 + seededInt(col, row, 71 + index + pass, 3))
        g.fillStyle = pass === 0 ? '#335a33' : pass === 1 ? '#142719' : '#497044'
        if (seededInt(col, row, 89 + index + pass, 2) === 0) {
          g.fillRect(px, py, Math.min(length, size - px), unit)
        } else {
          g.fillRect(px, py, unit, Math.min(length, size - py))
        }
      }
    }

    for (let index = 0; index < 6; index += 1) {
      const px = seededInt(col, row, 131 + index, Math.max(1, size - coarse))
      const py = seededInt(row, col, 149 + index, Math.max(1, size - coarse))
      const w = coarse + seededInt(col, row, 163 + index, coarse)
      const h = unit + seededInt(row, col, 179 + index, coarse)
      g.fillStyle = index % 2 === 0 ? '#645f42' : '#443f2e'
      g.fillRect(px, py, Math.min(w, size - px), Math.min(h, size - py))
      g.fillStyle = 'rgba(255, 238, 168, 0.13)'
      g.fillRect(px, py, Math.min(Math.max(unit, w - unit), size - px), unit)
    }

    if (seededChance(col, row, 211, 7)) {
      drawCrater(g, size, seededInt(col, row, 213, size), seededInt(row, col, 215, size), Math.max(unit * 3, Math.round(size * 0.22)))
    }

    if (seededChance(col, row, 227, 5)) {
      drawTrackMarks(
        g,
        size,
        seededInt(col, row, 229, Math.max(1, size - coarse)),
        seededInt(row, col, 231, Math.max(1, size - coarse)),
        seededInt(col, row, 233, 2) === 0,
      )
    }

    if (seededChance(col, row, 241, 8)) {
      const sx = seededInt(col, row, 243, Math.max(1, size - unit * 8))
      const sy = seededInt(row, col, 245, Math.max(1, size - unit * 8))
      fill(g, '#111711', sx, sy + unit, unit * 7, unit)
      fill(g, '#2d2920', sx + unit, sy, unit * 5, unit * 3)
      fill(g, '#685134', sx + unit * 2, sy + unit, unit * 3, unit)
    }

    for (let index = 0; index < 10; index += 1) {
      const px = seededInt(col, row, 271 + index, size)
      const py = seededInt(row, col, 293 + index, size)
      g.fillStyle = index % 3 === 0 ? '#141812' : '#756e51'
      g.fillRect(px, py, unit, unit)
    }

    g.fillStyle = 'rgba(0, 0, 0, 0.12)'
    g.fillRect(0, size - unit, size, unit)
    g.fillRect(size - unit, 0, unit, size)
    g.fillStyle = 'rgba(255, 255, 255, 0.06)'
    g.fillRect(0, 0, size, unit)
    g.fillRect(0, 0, unit, size)
  })
}

export function drawPixelTerrainTile(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  size: number,
  options: TerrainOptions,
) {
  if (kind === 'empty') return
  const hp = clamp(Math.round(options.hp ?? 1), 0, 3)
  const sheet = options.sheet ?? spriteSheetForSize(size)
  // The base uses the procedural path so its denser silhouette stays crisp at
  // both battlefield and HUD sizes instead of inheriting the legacy atlas cell.
  const atlasId = kind === 'base' ? null : terrainSpriteId(kind, hp, options.time ?? options.col + options.row * 0.37)

  if (atlasId && drawAtlasSprite(ctx, atlasId, x, y, { sheet, width: size, height: size })) {
    if (kind === 'water') {
      ctx.save()
      ctx.translate(Math.round(x), Math.round(y))
      drawWaterConnectionOverlay(ctx, size, options.waterNeighbors)
      ctx.restore()
    }
    return
  }

  const waterKey =
    kind === 'water'
      ? `:${Number(Boolean(options.waterNeighbors?.up))}${Number(Boolean(options.waterNeighbors?.right))}${Number(Boolean(options.waterNeighbors?.down))}${Number(Boolean(options.waterNeighbors?.left))}`
      : ''
  const roadKey =
    kind === 'road'
      ? `:${Number(Boolean(options.roadNeighbors?.up))}${Number(Boolean(options.roadNeighbors?.right))}${Number(Boolean(options.roadNeighbors?.down))}${Number(Boolean(options.roadNeighbors?.left))}`
      : ''

  drawSprite(ctx, `tile:${kind}:${size}:${hp}:${options.col}:${options.row}${waterKey}${roadKey}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return

    if (kind === 'brick') {
      drawBrickTile(g, size, options.col, options.row, hp)
      return
    }

    if (kind === 'steel') {
      drawSteelTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'water') {
      drawWaterTile(g, size, options.col, options.row, options.waterNeighbors)
      return
    }

    if (kind === 'trees') {
      drawTreeTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'base') {
      drawBaseTile(g, size, options.col, options.row, hp)
      return
    }

    if (kind === 'radio') {
      drawRadioTile(g, size, hp)
      return
    }

    if (kind === 'depot') {
      drawDepotTile(g, size, hp)
      return
    }

    if (kind === 'road') {
      drawRoadTile(g, size, options.col, options.row, options.roadNeighbors)
      return
    }

    if (kind === 'ammo') {
      drawAmmoStationTile(g, size, options.time ?? 0)
      return
    }

    if (kind === 'swamp') {
      drawSwampTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'ricochet') {
      drawRicochetTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'metal') {
      drawMetalTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'dust') {
      drawDustTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'echo') {
      drawEchoTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'reeds') {
      drawReedsTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'gravel') {
      drawGravelTile(g, size, options.col, options.row)
      return
    }

    if (kind === 'snow') {
      drawSnowTile(g, size, options.col, options.row)
    }
  })
}

export function drawPixelTank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: Direction,
  palette: PixelTeamPalette,
  options: TankSpriteOptions = {},
) {
  const sheet = options.sheet ?? spriteSheetForSize(size)
  const atlasSize = sheet === 'core20' ? 20 : 32
  const teamKey = options.teamKey ?? inferTeamKey(palette)
  const frame = Math.abs(Math.floor(options.frame ?? 0)) % 2
  const vehicleSize = options.tankClass ? getVehicleRuntimeSize(size, options.tankClass) : size

  if (
    options.alive !== false &&
    options.tankClass &&
    size >= 18 &&
    drawVehicleAtlasSprite(ctx, x, y, vehicleSize, direction, options.tankClass, teamKey, frame)
  ) {
    drawTankAtlasPhysicalOverlays(ctx, x, y, vehicleSize, direction, palette, options, false)
    if (!options.deferStatus) {
      drawPixelTankStatusChannels(ctx, x, y, vehicleSize, palette, options)
    }
    return
  }

  if (options.alive !== false && size >= 18) {
    const atlasDrawn = drawAtlasSprite(ctx, `tank.${teamKey}.${direction}.${frame}`, x - atlasSize / 2, y - atlasSize / 2, {
      sheet,
      width: atlasSize,
      height: atlasSize,
    })

    if (atlasDrawn) {
      drawTankAtlasPhysicalOverlays(ctx, x, y, atlasSize, direction, palette, options, true)
      if (!options.deferStatus) {
        drawPixelTankStatusChannels(ctx, x, y, atlasSize, palette, options)
      }
      return
    }
  }

  const angle = directionAngle(direction)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)
  drawTankBody(ctx, size, palette, options)
  ctx.restore()
  if (!options.deferStatus) {
    drawPixelTankStatusChannels(ctx, x, y, size, palette, options)
  }
}

export function getTankVisualSize(size: number, options: Pick<TankSpriteOptions, 'alive' | 'tankClass'> = {}) {
  return options.alive !== false && options.tankClass ? getVehicleRuntimeSize(size, options.tankClass) : size
}

export function drawPixelTankStatusChannels(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: PixelTeamPalette,
  options: Pick<TankSpriteOptions, 'focused' | 'self' | 'shield'>,
) {
  const unit = Math.max(1, Math.round(size / 24))
  const half = Math.round(size / 2)
  const left = Math.round(x - half)
  const top = Math.round(y - half)
  const right = left + size
  const bottom = top + size

  if (options.shield) {
    const segment = Math.max(unit * 4, Math.round(size * 0.18))
    const inset = unit * 3
    ctx.fillStyle = '#10252a'
    ctx.fillRect(left + inset, top, segment, unit * 2)
    ctx.fillRect(right - inset - segment, top, segment, unit * 2)
    ctx.fillRect(left + inset, bottom - unit * 2, segment, unit * 2)
    ctx.fillRect(right - inset - segment, bottom - unit * 2, segment, unit * 2)
    ctx.fillRect(left, top + inset, unit * 2, segment)
    ctx.fillRect(left, bottom - inset - segment, unit * 2, segment)
    ctx.fillRect(right - unit * 2, top + inset, unit * 2, segment)
    ctx.fillRect(right - unit * 2, bottom - inset - segment, unit * 2, segment)
    ctx.fillStyle = '#8ff8ff'
    ctx.fillRect(left + inset + unit, top, segment - unit * 2, unit)
    ctx.fillRect(right - inset - segment + unit, top, segment - unit * 2, unit)
    ctx.fillRect(left + inset + unit, bottom - unit, segment - unit * 2, unit)
    ctx.fillRect(right - inset - segment + unit, bottom - unit, segment - unit * 2, unit)
    ctx.fillStyle = palette.highlight
    ctx.fillRect(left, top + inset + unit, unit, segment - unit * 2)
    ctx.fillRect(right - unit, bottom - inset - segment + unit, unit, segment - unit * 2)
  }

  if (options.focused) {
    const arm = unit * 5
    ctx.fillStyle = '#241b08'
    drawCornerBrackets(ctx, left, top, right, bottom, arm + unit, unit * 2)
    ctx.fillStyle = '#ffd35a'
    drawCornerBrackets(ctx, left, top, right, bottom, arm, unit)
  }

  if (options.self) {
    const chevronY = top
    ctx.fillStyle = '#171204'
    ctx.fillRect(Math.round(x - unit * 5), chevronY, unit * 10, unit * 2)
    ctx.fillRect(Math.round(x - unit * 3), chevronY + unit * 2, unit * 6, unit * 2)
    ctx.fillStyle = '#fff09a'
    ctx.fillRect(Math.round(x - unit * 4), chevronY, unit * 8, unit)
    ctx.fillRect(Math.round(x - unit * 2), chevronY + unit * 2, unit * 4, unit)
    ctx.fillStyle = palette.highlight
    ctx.fillRect(Math.round(x - unit), chevronY + unit * 4, unit * 2, unit * 2)
  }
}

export function drawPixelProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  direction: Direction = 'up',
  options: ProjectileSpriteOptions = {},
) {
  const sheet = options.sheet ?? 'core32'
  const atlasSize = sheet === 'core20' ? 20 : 32
  const teamKey = options.teamKey ?? inferProjectileTeamKey(color)
  const frame = Math.abs(Math.floor(options.frame ?? 0)) % 2

  if (
    drawAtlasSprite(ctx, `projectile.${teamKey}.${direction}.${frame}`, x - atlasSize / 2, y - atlasSize / 2, {
      sheet,
      width: atlasSize,
      height: atlasSize,
    })
  ) {
    return
  }

  const unit = Math.max(1, Math.round(size / 4))
  const length = Math.max(unit * 5, size * 2)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(directionAngle(direction))
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(-unit, Math.round(length * 0.1), unit * 2, Math.round(length * 0.46))
  ctx.fillStyle = color
  ctx.fillRect(-unit, -Math.round(length * 0.15), unit * 2, Math.round(length * 0.45))
  ctx.fillStyle = '#fff6bc'
  ctx.fillRect(-unit, -Math.round(length * 0.3), unit * 2, unit * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, -Math.round(length * 0.28), unit, unit)
  ctx.restore()
}

export function drawPixelPowerUp(ctx: CanvasRenderingContext2D, kind: PowerUpKind, x: number, y: number, size: number, time: number) {
  const flash = Math.floor(time * 8) % 2 === 0
  drawSprite(ctx, `power:${kind}:${size}:${flash ? 1 : 0}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return
    const unit = pixelUnit(size)
    const rim = flash ? '#fff0a5' : '#d0792f'
    const body = kind === 'repair' ? '#e9f4d9' : kind === 'rapid' ? '#ffe56d' : '#a6f3ff'

    fill(g, '#1b1914', unit, unit * 2, size - unit * 2, size - unit * 4)
    fill(g, rim, unit * 2, unit, size - unit * 4, size - unit * 2)
    fill(g, '#70371b', unit * 3, unit * 2, size - unit * 6, size - unit * 4)
    fill(g, body, unit * 4, unit * 3, size - unit * 8, size - unit * 6)
    fill(g, 'rgba(255,255,255,0.45)', unit * 4, unit * 3, size - unit * 10, unit)
    fill(g, '#171311', unit * 2, size - unit * 3, size - unit * 4, unit * 2)

    if (kind === 'repair') {
      fill(g, '#1a1a16', Math.round(size * 0.43), Math.round(size * 0.2), unit * 2, Math.round(size * 0.6))
      fill(g, '#1a1a16', Math.round(size * 0.22), Math.round(size * 0.43), Math.round(size * 0.56), unit * 2)
      fill(g, '#e23f2f', Math.round(size * 0.45), Math.round(size * 0.24), unit, Math.round(size * 0.52))
      fill(g, '#e23f2f', Math.round(size * 0.26), Math.round(size * 0.45), Math.round(size * 0.48), unit)
    } else if (kind === 'rapid') {
      fill(g, '#1a1a16', Math.round(size * 0.22), Math.round(size * 0.2), unit * 2, Math.round(size * 0.6))
      fill(g, '#1a1a16', Math.round(size * 0.58), Math.round(size * 0.2), unit * 2, Math.round(size * 0.6))
      fill(g, '#fff6be', Math.round(size * 0.18), Math.round(size * 0.14), unit * 3, unit)
      fill(g, '#fff6be', Math.round(size * 0.54), Math.round(size * 0.14), unit * 3, unit)
      fill(g, '#6d300e', Math.round(size * 0.37), Math.round(size * 0.36), Math.round(size * 0.26), unit * 2)
    } else {
      fill(g, '#1a1a16', Math.round(size * 0.2), Math.round(size * 0.24), Math.round(size * 0.6), unit * 2)
      fill(g, '#1a1a16', Math.round(size * 0.3), Math.round(size * 0.4), Math.round(size * 0.4), Math.round(size * 0.34))
      fill(g, '#fff6be', Math.round(size * 0.37), Math.round(size * 0.48), Math.round(size * 0.25), unit)
      fill(g, '#39b9ff', Math.round(size * 0.34), Math.round(size * 0.58), Math.round(size * 0.32), unit)
    }

    for (let index = 0; index < 5; index += 1) {
      g.fillStyle = flash ? '#fff8cc' : '#ffcf67'
      g.fillRect(seededInt(size, index, 3, size), seededInt(index, size, 7, size), unit, unit)
    }
  })
}

export function drawPixelFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: PixelTeamPalette,
  carried = false,
  grounded = true,
) {
  const unit = Math.max(1, Math.round(size / 16))
  const poleX = Math.round(x + size * 0.25)
  const top = Math.round(y + size * 0.06)
  const clothX = poleX + unit * 3
  const clothY = top + unit
  const clothWidth = Math.max(unit * 7, Math.round(size * 0.56))
  const clothHeight = unit * 7
  const baseY = Math.round(y + size * 0.88)

  if (grounded) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(Math.round(x + size * 0.08), baseY + unit, Math.round(size * 0.58), unit)
  }

  ctx.fillStyle = '#111716'
  ctx.fillRect(poleX, top, unit * 3, baseY - top + unit)
  ctx.fillStyle = '#f4eee0'
  ctx.fillRect(poleX + unit, top + unit, unit, baseY - top - unit)
  ctx.fillStyle = '#111716'
  ctx.fillRect(poleX - unit, top - unit, unit * 5, unit * 3)
  ctx.fillStyle = carried ? palette.highlight : '#ffd35a'
  ctx.fillRect(poleX, top, unit * 3, unit)

  ctx.fillStyle = '#111716'
  ctx.fillRect(clothX, clothY, clothWidth, clothHeight)
  ctx.fillRect(clothX + clothWidth - unit * 2, clothY + unit, unit * 3, clothHeight - unit * 2)
  ctx.fillStyle = palette.body
  ctx.fillRect(clothX + unit, clothY + unit, clothWidth - unit * 2, clothHeight - unit * 2)
  ctx.fillRect(clothX + clothWidth - unit, clothY + unit * 2, unit, clothHeight - unit * 4)
  ctx.fillStyle = palette.trim
  ctx.fillRect(clothX + unit, clothY + clothHeight - unit * 2, clothWidth - unit, unit)
  ctx.fillStyle = palette.highlight
  ctx.fillRect(clothX + unit * 2, clothY + unit * 2, clothWidth - unit * 5, unit)
  ctx.fillRect(clothX + unit * 3, clothY + unit * 3, unit, unit * 2)
  ctx.fillRect(clothX + unit * 2, clothY + unit * 4, unit * 3, unit)

  if (grounded) {
    ctx.fillStyle = '#111716'
    ctx.fillRect(poleX - unit * 2, baseY, unit * 7, unit * 3)
    ctx.fillStyle = palette.trim
    ctx.fillRect(poleX - unit, baseY, unit * 5, unit)
  }
}

export function drawPixelRelay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: PixelTeamPalette | null,
  progress: number,
  options: RelaySpriteOptions = {},
) {
  const sheet = options.sheet ?? spriteSheetForSize(size)
  const teamKey = options.teamKey ?? (palette ? inferTeamKey(palette) : 'neutral')
  const frame = Math.abs(Math.floor(options.frame ?? (progress > 0 && progress < 1 ? 1 : 0))) % 2
  const progressPalette = options.progressPalette ?? palette

  if (drawStaticRelayAtlasSprite(ctx, x, y, size, frame)) {
    const dimensions = getStaticRelayRuntimeDimensions(size)
    const towerX = Math.round(x + (size - dimensions.width) / 2)
    const towerY = Math.round(y + size - dimensions.height)
    const bandX = Math.round(towerX + dimensions.width * 0.3125)
    const bandY = Math.round(towerY + dimensions.height * (88 / 120))
    const bandWidth = Math.max(2, Math.round(dimensions.width * 0.375))
    const bandHeight = Math.max(1, Math.round(dimensions.height * 0.05))

    ctx.fillStyle = palette?.body ?? '#c8b982'
    ctx.fillRect(bandX, bandY, bandWidth, bandHeight)
    if (palette) {
      ctx.fillStyle = palette.highlight
      ctx.fillRect(bandX, bandY, bandWidth, 1)
    }
    drawRelayProgress(ctx, x, y, size, progressPalette, progress)
    return
  }

  const towerHeight = Math.round(size * 1.5)
  const towerY = Math.round(y - size * 0.5)

  if (drawAtlasSprite(ctx, `relay.${teamKey}.${frame}`, x, towerY, { sheet, width: size, height: towerHeight })) {
    drawRelayProgress(ctx, x, y, size, progressPalette, progress)
    return
  }

  const unit = pixelUnit(size)
  const owner = palette?.body ?? '#c8b982'
  const cx = Math.round(x + size / 2)
  const top = towerY

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(Math.round(x + size * 0.18), Math.round(y + size * 0.82), Math.round(size * 0.64), unit * 2)
  ctx.fillStyle = '#c83a32'
  ctx.fillRect(cx - unit * 2, top, unit * 4, Math.round(size * 0.18))
  ctx.fillRect(Math.round(x + size * 0.16), Math.round(y + size * 0.82), Math.round(size * 0.68), unit * 3)
  ctx.fillStyle = '#f4eee0'
  ctx.fillRect(Math.round(x + size * 0.3), Math.round(y - size * 0.18), unit * 2, Math.round(size * 0.98))
  ctx.fillRect(Math.round(x + size * 0.64), Math.round(y - size * 0.18), unit * 2, Math.round(size * 0.98))
  ctx.fillRect(Math.round(x + size * 0.32), Math.round(y + size * 0.12), Math.round(size * 0.36), unit)
  ctx.fillRect(Math.round(x + size * 0.26), Math.round(y + size * 0.38), Math.round(size * 0.48), unit)
  ctx.fillStyle = '#c83a32'
  ctx.fillRect(Math.round(x + size * 0.22), Math.round(y + size * 0.06), unit * 2, Math.round(size * 0.24))
  ctx.fillRect(Math.round(x + size * 0.72), Math.round(y + size * 0.3), unit * 2, Math.round(size * 0.24))
  ctx.fillRect(Math.round(x + size * 0.38), Math.round(y + size * 0.2), unit * 2, Math.round(size * 0.2))
  ctx.fillRect(Math.round(x + size * 0.56), Math.round(y + size * 0.48), unit * 2, Math.round(size * 0.2))
  ctx.fillStyle = '#151515'
  ctx.fillRect(cx - unit, top + unit, unit * 2, Math.round(size * 1.22))
  ctx.fillStyle = '#fff8e8'
  ctx.beginPath()
  ctx.ellipse(Math.round(x + size * 0.18), Math.round(y + size * 0.18), unit * 3, unit * 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(Math.round(x + size * 0.82), Math.round(y + size * 0.38), unit * 4, unit * 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#141414'
  ctx.fillRect(Math.round(x + size * 0.05), Math.round(y + size * 0.92), Math.round(size * 0.9), unit)
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.3), Math.round(y + size * 0.74), Math.round(size * 0.4), unit * 3)
  ctx.fillStyle = palette?.trim ?? '#4c4634'
  ctx.fillRect(Math.round(x + size * 0.34), Math.round(y + size * 0.79), Math.round(size * 0.32), unit)
  ctx.fillStyle = palette?.highlight ?? '#fff3b8'
  ctx.fillRect(cx - unit, top, unit * 2, unit)
  ctx.fillStyle = progressPalette?.body ?? owner
  ctx.fillRect(Math.round(x + size * 0.13), Math.round(y + size * 0.9), Math.round(size * 0.74 * clamp(progress, 0, 1)), unit)
}

export function drawPixelPortableRelay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  active: boolean,
  time = 0,
  phaseOffset = 0,
) {
  const unit = pixelUnit(size)
  const detail = Math.max(1, Math.round(size / 32))
  const cx = Math.round(x + size / 2)
  const baseY = Math.round(y + size * 0.72)
  const rotation = getPortableRelayRotationFrame(time, phaseOffset)
  const dishHalfWidth = Math.max(detail * 3, Math.round(size * (0.085 + rotation.openness * 0.205)))
  const dishHalfHeight = Math.max(detail * 6, Math.round(size * 0.24))
  const dishY = Math.round(y + size * 0.31)
  const feedOffset = Math.round(rotation.side * size * 0.19)
  const signalColor = active ? '#86f4ff' : '#ffd35a'
  const signalHighlight = active ? '#dffcff' : '#fff1a5'
  const cabinetX = Math.round(x + size * 0.16)
  const cabinetWidth = Math.round(size * 0.68)
  const cabinetHeight = Math.round(size * 0.2)
  const cabinetBottom = baseY + cabinetHeight

  const drawPixelSegment = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    thickness = detail,
  ) => {
    const dx = toX - fromX
    const dy = toY - fromY
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1)
    ctx.fillStyle = color
    for (let step = 0; step <= steps; step += 1) {
      ctx.fillRect(
        Math.round(fromX + (dx * step) / steps),
        Math.round(fromY + (dy * step) / steps),
        thickness,
        thickness,
      )
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)'
  ctx.fillRect(Math.round(x + size * 0.08), Math.round(y + size * 0.93), Math.round(size * 0.84), detail * 2)

  // The mast, rotating collar, rear cable, cabinet, and stabilizers stay fixed.
  const mastTop = dishY + detail * 2
  ctx.fillStyle = '#131817'
  ctx.fillRect(cx - unit, mastTop, unit * 2, Math.max(unit, baseY - mastTop + detail))
  ctx.fillStyle = '#dbe3de'
  ctx.fillRect(cx - detail, mastTop + detail, detail * 2, Math.max(detail, baseY - mastTop - detail))
  ctx.fillStyle = '#75847e'
  ctx.fillRect(cx, mastTop + detail, detail, Math.max(detail, baseY - mastTop - detail))
  drawPixelSegment(cx + unit, dishY + unit * 2, cabinetX + cabinetWidth - unit, baseY + unit, '#17201e', detail * 2)
  drawPixelSegment(cx + unit, dishY + unit * 2, cabinetX + cabinetWidth - unit, baseY + unit, '#3a615d')

  ctx.fillStyle = '#131817'
  ctx.fillRect(cx - unit * 3, baseY - unit * 2, unit * 6, unit * 2)
  ctx.fillStyle = '#52635d'
  ctx.fillRect(cx - unit * 2, baseY - unit, unit * 4, detail)
  ctx.fillStyle = signalColor
  ctx.fillRect(cx - detail, baseY - unit - detail, detail * 2, detail)

  ctx.fillStyle = '#131817'
  ctx.fillRect(Math.round(x + size * 0.08), cabinetBottom - detail, Math.round(size * 0.24), unit * 2)
  ctx.fillRect(Math.round(x + size * 0.68), cabinetBottom - detail, Math.round(size * 0.24), unit * 2)
  ctx.fillStyle = '#53615d'
  ctx.fillRect(Math.round(x + size * 0.12), cabinetBottom, Math.round(size * 0.14), detail)
  ctx.fillRect(Math.round(x + size * 0.74), cabinetBottom, Math.round(size * 0.14), detail)

  // Cabinet shell and top carry handles.
  ctx.fillStyle = '#131817'
  ctx.fillRect(cabinetX, baseY, cabinetWidth, cabinetHeight)
  ctx.fillRect(cabinetX - detail, baseY - detail, cabinetWidth + detail * 2, detail * 2)
  ctx.fillRect(cabinetX + unit, baseY - unit * 2, unit * 3, unit * 2)
  ctx.fillRect(cabinetX + cabinetWidth - unit * 4, baseY - unit * 2, unit * 3, unit * 2)
  ctx.fillStyle = '#6d7c76'
  ctx.fillRect(cabinetX + unit * 2, baseY - unit, unit, unit)
  ctx.fillRect(cabinetX + cabinetWidth - unit * 3, baseY - unit, unit, unit)
  ctx.fillStyle = '#3e504a'
  ctx.fillRect(cabinetX + detail, baseY + detail, cabinetWidth - detail * 2, cabinetHeight - detail * 2)
  ctx.fillStyle = '#73857e'
  ctx.fillRect(cabinetX + detail * 2, baseY + detail, cabinetWidth - detail * 4, detail)
  ctx.fillStyle = '#202b28'
  ctx.fillRect(cx - detail, baseY + detail, detail * 2, cabinetHeight - detail * 2)

  // Left diagnostics screen, right switch bank, lower vents, and rivets use a
  // one-pixel detail grid at gameplay size.
  ctx.fillStyle = '#17201e'
  ctx.fillRect(cabinetX + detail * 3, baseY + detail * 2, detail * 7, detail * 2)
  ctx.fillStyle = '#3e9995'
  ctx.fillRect(cabinetX + detail * 4, baseY + detail * 3, detail * 5, detail)
  ctx.fillStyle = signalHighlight
  ctx.fillRect(cabinetX + detail * 5, baseY + detail * 3, detail * 2, detail)
  ctx.fillStyle = signalColor
  ctx.fillRect(cx + detail * 2, baseY + detail * 2, detail * 2, detail * 2)
  ctx.fillStyle = '#d84a3f'
  ctx.fillRect(cx + detail * 5, baseY + detail * 2, detail * 2, detail * 2)
  ctx.fillStyle = '#d5b45a'
  ctx.fillRect(cx + detail * 8, baseY + detail * 2, detail * 2, detail * 2)
  ctx.fillStyle = '#18221f'
  for (let vent = 0; vent < 3; vent += 1) {
    ctx.fillRect(cabinetX + detail * (3 + vent * 3), cabinetBottom - detail * 2, detail * 2, detail)
  }
  for (let vent = 0; vent < 2; vent += 1) {
    ctx.fillRect(cx + detail * (3 + vent * 3), cabinetBottom - detail * 2, detail * 2, detail)
  }
  ctx.fillStyle = '#aebbb5'
  ctx.fillRect(cabinetX + detail, baseY + detail, detail, detail)
  ctx.fillRect(cabinetX + cabinetWidth - detail * 2, baseY + detail, detail, detail)
  ctx.fillRect(cabinetX + detail, cabinetBottom - detail, detail, detail)
  ctx.fillRect(cabinetX + cabinetWidth - detail * 2, cabinetBottom - detail, detail, detail)

  const feedX = cx + feedOffset
  const feedY = dishY - dishHalfHeight - detail
  const drawFeedAssembly = () => {
    drawPixelSegment(cx, dishY + detail * 2, feedX, feedY + detail * 2, '#131817', detail * 2)
    drawPixelSegment(cx, dishY + detail * 2, feedX, feedY + detail * 2, '#aebbb5')
    ctx.fillStyle = '#131817'
    ctx.fillRect(feedX - detail * 2, feedY, detail * 4, detail * 3)
    ctx.fillStyle = signalHighlight
    ctx.fillRect(feedX - detail, feedY + detail, detail * 2, detail)
  }

  if (!rotation.frontFacing) {
    drawFeedAssembly()
  }

  // Layered rim, concave face, facet marks, and rear braces make the dish read
  // as radio hardware instead of a flat icon while it narrows edge-on.
  ctx.fillStyle = '#131817'
  ctx.beginPath()
  ctx.ellipse(cx, dishY, dishHalfWidth + detail * 2, dishHalfHeight + detail, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rotation.frontFacing ? '#d9e2dc' : '#7a8882'
  ctx.beginPath()
  ctx.ellipse(cx, dishY, dishHalfWidth + detail, dishHalfHeight, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rotation.frontFacing ? '#687b74' : '#46534f'
  ctx.beginPath()
  ctx.ellipse(cx, dishY + detail, Math.max(detail, dishHalfWidth - detail), Math.max(detail * 2, dishHalfHeight - detail), 0, 0, Math.PI * 2)
  ctx.fill()

  if (dishHalfWidth >= detail * 4) {
    if (rotation.frontFacing) {
      ctx.fillStyle = '#9aaba4'
      ctx.fillRect(cx - dishHalfWidth + detail * 2, dishY - detail * 2, Math.max(detail, dishHalfWidth - detail * 2), detail)
      ctx.fillStyle = '#3c4b47'
      ctx.fillRect(cx + detail, dishY + detail * 2, Math.max(detail, dishHalfWidth - detail * 2), detail)
      ctx.fillStyle = '#52655e'
      ctx.fillRect(cx - detail, dishY - dishHalfHeight + detail * 2, detail, dishHalfHeight - detail)
    } else {
      drawPixelSegment(cx - dishHalfWidth + detail * 2, dishY - detail * 2, cx + dishHalfWidth - detail * 2, dishY + detail * 2, '#aebbb5')
      drawPixelSegment(cx - dishHalfWidth + detail * 2, dishY + detail * 2, cx + dishHalfWidth - detail * 2, dishY - detail * 2, '#aebbb5')
    }
  }

  ctx.fillStyle = '#131817'
  ctx.fillRect(cx - unit, dishY - unit, unit * 2, unit * 2)
  ctx.fillStyle = signalColor
  ctx.fillRect(cx - detail, dishY - detail, detail * 2, detail * 2)

  if (rotation.frontFacing) {
    drawFeedAssembly()
  }
}

export function drawPixelDeployable(ctx: CanvasRenderingContext2D, kind: OfflineDeployableKind, x: number, y: number, size: number, active: boolean) {
  const unit = pixelUnit(size)
  const cx = Math.round(x + size / 2)
  const cy = Math.round(y + size / 2)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)'
  ctx.fillRect(Math.round(x + size * 0.24), Math.round(y + size * 0.72), Math.round(size * 0.52), unit * 2)

  if (kind === 'decoy') {
    ctx.fillStyle = '#151515'
    ctx.fillRect(Math.round(x + size * 0.24), Math.round(y + size * 0.36), Math.round(size * 0.52), Math.round(size * 0.28))
    ctx.fillStyle = '#6b4f30'
    ctx.fillRect(Math.round(x + size * 0.3), Math.round(y + size * 0.3), Math.round(size * 0.4), Math.round(size * 0.26))
    ctx.fillStyle = active ? '#ff3346' : '#fff1a5'
    ctx.fillRect(cx - unit, Math.round(y + size * 0.38), unit * 2, unit * 2)
    ctx.fillStyle = '#2a2218'
    ctx.fillRect(Math.round(x + size * 0.18), cy, Math.round(size * 0.64), unit * 2)
    return
  }

  if (kind === 'mine') {
    ctx.fillStyle = '#151515'
    ctx.beginPath()
    ctx.ellipse(cx, cy, Math.round(size * 0.24), Math.round(size * 0.18), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4c5754'
    ctx.fillRect(cx - unit * 4, cy - unit, unit * 8, unit * 2)
    ctx.fillStyle = active ? '#ffd35a' : '#8f552b'
    ctx.fillRect(cx - unit, cy - unit, unit * 2, unit * 2)
    return
  }

  if (kind === 'noise') {
    ctx.fillStyle = '#151515'
    ctx.fillRect(cx - unit * 4, cy - unit * 3, unit * 8, unit * 7)
    ctx.fillStyle = '#4e5b58'
    ctx.fillRect(cx - unit * 3, cy - unit * 2, unit * 6, unit * 5)
    ctx.strokeStyle = active ? '#86f4ff' : '#ffd35a'
    ctx.lineWidth = unit
    for (let radius = 4; radius <= 10; radius += 3) {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, -0.8, 0.8)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, radius, Math.PI - 0.8, Math.PI + 0.8)
      ctx.stroke()
    }
    return
  }

  if (kind === 'steel') {
    ctx.fillStyle = '#151515'
    ctx.fillRect(Math.round(x + size * 0.22), cy - unit, Math.round(size * 0.56), unit * 3)
    ctx.fillStyle = '#8b9692'
    ctx.fillRect(Math.round(x + size * 0.2), cy - unit * 5, unit * 5, unit * 6)
    ctx.fillRect(Math.round(x + size * 0.64), cy - unit * 5, unit * 5, unit * 6)
    ctx.fillStyle = active ? '#f2f5ee' : '#4c5754'
    ctx.fillRect(Math.round(x + size * 0.34), cy - unit * 2, Math.round(size * 0.32), unit)
    return
  }

  ctx.strokeStyle = '#151515'
  ctx.lineWidth = unit * 2
  ctx.beginPath()
  ctx.moveTo(Math.round(x + size * 0.18), cy)
  ctx.lineTo(Math.round(x + size * 0.82), cy)
  ctx.stroke()
  ctx.strokeStyle = active ? '#86f4ff' : '#f2f5ee'
  ctx.lineWidth = unit
  ctx.beginPath()
  ctx.moveTo(Math.round(x + size * 0.2), cy)
  ctx.lineTo(Math.round(x + size * 0.8), cy)
  ctx.stroke()
  ctx.fillStyle = '#6b4f30'
  ctx.fillRect(Math.round(x + size * 0.18), cy - unit * 3, unit * 3, unit * 6)
  ctx.fillRect(Math.round(x + size * 0.72), cy - unit * 3, unit * 3, unit * 6)
}

export function drawPixelPing(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const sheet = spriteSheetForSize(size)

  if (drawAtlasSprite(ctx, 'marker.ping', x, y, { sheet, width: size, height: size })) {
    const unit = pixelUnit(size)
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + size / 2 - unit), unit * 2, unit * 2)
    return
  }

  const unit = pixelUnit(size)
  const inset = unit * 2
  ctx.strokeStyle = '#101010'
  ctx.lineWidth = unit * 2
  ctx.strokeRect(Math.round(x + inset), Math.round(y + inset), size - inset * 2, size - inset * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = unit
  ctx.strokeRect(Math.round(x + inset), Math.round(y + inset), size - inset * 2, size - inset * 2)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + size / 2 - unit), unit * 2, unit * 2)
  ctx.fillRect(Math.round(x + size / 2 - unit * 3), Math.round(y + size / 2), unit * 2, unit)
  ctx.fillRect(Math.round(x + size / 2 + unit), Math.round(y + size / 2), unit * 2, unit)
}

export function drawPixelLastKnown(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const sheet = spriteSheetForSize(size)

  if (drawAtlasSprite(ctx, 'marker.lastKnown', x, y, { sheet, width: size, height: size })) {
    const unit = pixelUnit(size)
    ctx.strokeStyle = color
    ctx.lineWidth = unit
    ctx.strokeRect(Math.round(x + unit * 3), Math.round(y + unit * 3), size - unit * 6, size - unit * 6)
    return
  }

  const unit = pixelUnit(size)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth = unit * 2
  ctx.strokeRect(Math.round(x + unit * 3), Math.round(y + unit * 3), size - unit * 6, size - unit * 6)
  ctx.strokeStyle = color
  ctx.lineWidth = unit
  ctx.strokeRect(Math.round(x + unit * 3), Math.round(y + unit * 3), size - unit * 6, size - unit * 6)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + unit * 2), unit * 2, unit * 3)
  ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + size - unit * 5), unit * 2, unit * 3)
}

export function drawPixelEnemyMarker(ctx: CanvasRenderingContext2D, x: number, y: number, palette: PixelTeamPalette) {
  drawPixelTank(ctx, x + 8, y + 8, 16, 'up', palette, { armored: false })
}

function drawBrickTile(g: CanvasRenderingContext2D, size: number, col: number, row: number, hp: number) {
  const unit = pixelUnit(size)
  const damage = hp <= 1
  fill(g, '#3a210f', unit, unit, size - unit * 2, size - unit * 2)

  const courses = 5
  for (let course = 0; course < courses; course += 1) {
    const y = Math.round((course * size) / courses)
    const h = Math.ceil(size / courses) - unit
    const offset = course % 2 === 0 ? 0 : Math.round(size * 0.2)
    for (let brick = -1; brick < 4; brick += 1) {
      const bx = brick * Math.round(size * 0.38) - offset
      const bw = Math.round(size * 0.34)
      g.fillStyle = damage ? '#7b4521' : brick % 2 === 0 ? '#a76534' : '#8f552b'
      g.fillRect(bx + unit, y + unit, bw, h)
      g.fillStyle = damage ? '#a06132' : '#ce9452'
      g.fillRect(bx + unit * 2, y + unit, Math.max(unit, bw - unit * 4), unit)
      g.fillStyle = '#42230f'
      g.fillRect(bx + unit, y + h, bw, unit)
    }
  }

  for (let index = 0; index < 12; index += 1) {
    const px = seededInt(col, row, 313 + index, Math.max(1, size - unit * 2)) + unit
    const py = seededInt(row, col, 331 + index, Math.max(1, size - unit * 2)) + unit
    g.fillStyle = index % 3 === 0 ? '#2d1709' : '#d09a5b'
    g.fillRect(px, py, unit, unit)
  }

  const crackX = Math.round(size * (0.3 + seededInt(col, row, 353, 4) * 0.1))
  g.fillStyle = '#1d1008'
  g.fillRect(crackX, Math.round(size * 0.14), unit, Math.round(size * 0.34))
  g.fillRect(crackX - unit, Math.round(size * 0.36), unit * 3, unit)
  g.fillRect(crackX + unit, Math.round(size * 0.46), unit, Math.round(size * 0.24))

  if (damage) {
    drawDamageBite(g, size, unit, 'top-left')
    drawDamageBite(g, size, unit, 'bottom-right')
    for (let index = 0; index < 8; index += 1) {
      const px = seededInt(col, row, 379 + index, size)
      const py = seededInt(row, col, 383 + index, size)
      g.fillStyle = index % 2 === 0 ? '#c48645' : '#2c180b'
      g.fillRect(px, py, unit * 2, unit)
    }
  }

  g.fillStyle = 'rgba(0, 0, 0, 0.28)'
  g.fillRect(0, size - unit, size, unit)
  g.fillRect(size - unit, 0, unit, size)
}

function drawSteelTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#303836', 0, 0, size, size)
  fill(g, '#6f7a77', unit, unit, size - unit * 2, size - unit * 2)
  fill(g, '#b7c1be', unit * 2, unit * 2, size - unit * 5, unit * 2)
  fill(g, '#43504d', unit * 2, size - unit * 4, size - unit * 4, unit * 2)

  const half = Math.round(size / 2)
  fill(g, '#1f2523', half - Math.ceil(unit / 2), unit * 2, unit, size - unit * 4)
  fill(g, '#1f2523', unit * 2, half - Math.ceil(unit / 2), size - unit * 4, unit)

  const plates = [
    [unit * 3, unit * 3],
    [half + unit, unit * 3],
    [unit * 3, half + unit],
    [half + unit, half + unit],
  ]
  for (const [px, py] of plates) {
    const pw = half - unit * 4
    g.fillStyle = '#889390'
    g.fillRect(px, py, pw, pw)
    g.fillStyle = '#cbd5d1'
    g.fillRect(px + unit, py + unit, Math.max(unit, pw - unit * 3), unit)
    g.fillStyle = '#4c5754'
    g.fillRect(px + pw - unit, py, unit, pw)
    g.fillRect(px, py + pw - unit, pw, unit)
  }

  const boltSpots = [
    [unit * 3, unit * 3],
    [size - unit * 4, unit * 3],
    [unit * 3, size - unit * 4],
    [size - unit * 4, size - unit * 4],
  ]
  for (const [bx, by] of boltSpots) {
    fill(g, '#202826', bx, by, unit * 2, unit * 2)
    fill(g, '#e2ebe7', bx, by, unit, unit)
  }

  for (let index = 0; index < 5; index += 1) {
    const sx = seededInt(col, row, 401 + index, Math.max(1, size - unit * 3))
    const sy = seededInt(row, col, 409 + index, Math.max(1, size - unit * 3))
    fill(g, '#242c2a', sx, sy, unit * 3, unit)
  }
}

function drawWaterTile(g: CanvasRenderingContext2D, size: number, col: number, row: number, neighbors?: WaterNeighbors) {
  const unit = pixelUnit(size)
  fill(g, '#09243a', 0, 0, size, size)
  fill(g, '#123e59', 0, unit, size, size - unit * 2)

  for (let band = 0; band < 6; band += 1) {
    const yy = Math.round(size * (0.1 + band * 0.15))
    const phase = seededInt(col, row, 431 + band, Math.max(1, size / 3))
    g.fillStyle = band % 3 === 0 ? '#65d1e2' : band % 2 === 0 ? '#2e7ba0' : '#1d5778'
    g.fillRect(phase, yy, Math.round(size * 0.42), unit)
    g.fillRect(Math.max(0, phase - Math.round(size * 0.5)), yy + unit * 2, Math.round(size * 0.3), unit)
  }

  for (let index = 0; index < 7; index += 1) {
    const px = seededInt(col, row, 449 + index, size)
    const py = seededInt(row, col, 457 + index, size)
    fill(g, index % 2 === 0 ? '#9ff0f2' : '#071b2d', px, py, unit * 2, unit)
  }

  fill(g, 'rgba(0, 0, 0, 0.24)', 0, size - unit * 2, size, unit * 2)
  drawWaterConnectionOverlay(g, size, neighbors)
}

function drawWaterConnectionOverlay(g: CanvasRenderingContext2D, size: number, neighbors?: WaterNeighbors) {
  const unit = pixelUnit(size)
  const up = Boolean(neighbors?.up)
  const right = Boolean(neighbors?.right)
  const down = Boolean(neighbors?.down)
  const left = Boolean(neighbors?.left)

  if (left || right) {
    fill(g, '#0f3650', 0, Math.round(size * 0.43), size, unit * 3)
    fill(g, '#58c7d9', left ? 0 : unit * 2, Math.round(size * 0.45), size - (left ? 0 : unit * 2) - (right ? 0 : unit * 2), unit)
  }

  if (up || down) {
    fill(g, '#0b2f49', Math.round(size * 0.43), 0, unit * 3, size)
    fill(g, '#2b7fa0', Math.round(size * 0.46), up ? 0 : unit * 2, unit, size - (up ? 0 : unit * 2) - (down ? 0 : unit * 2))
  }

  if (!up) {
    fill(g, '#1a2b1b', 0, 0, size, unit * 2)
    fill(g, '#5f623e', unit, unit, size - unit * 2, unit)
  }

  if (!down) {
    fill(g, '#071711', 0, size - unit * 2, size, unit * 2)
    fill(g, '#3e432b', unit, size - unit * 2, size - unit * 2, unit)
  }

  if (!left) {
    fill(g, '#112414', 0, 0, unit * 2, size)
    fill(g, '#5b5d39', unit, unit * 2, unit, size - unit * 4)
  }

  if (!right) {
    fill(g, '#071711', size - unit * 2, 0, unit * 2, size)
    fill(g, '#3e432b', size - unit * 2, unit * 2, unit, size - unit * 4)
  }

  if (up && right) fill(g, '#1c5a78', Math.round(size * 0.46), 0, Math.round(size * 0.38), unit * 2)
  if (right && down) fill(g, '#1c5a78', Math.round(size * 0.46), size - unit * 2, Math.round(size * 0.38), unit * 2)
  if (down && left) fill(g, '#1c5a78', 0, size - unit * 2, Math.round(size * 0.54), unit * 2)
  if (left && up) fill(g, '#1c5a78', 0, 0, Math.round(size * 0.54), unit * 2)
}

function drawTreeTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, 'rgba(8, 18, 10, 0.78)', 0, 0, size, size)

  for (let cluster = 0; cluster < 12; cluster += 1) {
    const px = seededInt(col, row, 467 + cluster, Math.max(1, size - unit * 7))
    const py = seededInt(row, col, 487 + cluster, Math.max(1, size - unit * 7))
    const w = unit * (4 + seededInt(col, row, 499 + cluster, 3))
    const h = unit * (3 + seededInt(row, col, 503 + cluster, 3))
    g.fillStyle = cluster % 4 === 0 ? '#4a9048' : cluster % 3 === 0 ? '#0f341c' : '#25602f'
    g.fillRect(px, py, w, h)
    g.fillStyle = '#72b45e'
    g.fillRect(px + unit, py, Math.max(unit, w - unit * 3), unit)
    g.fillStyle = '#07140b'
    g.fillRect(px, py + h - unit, w, unit)
  }

  for (let trunk = 0; trunk < 3; trunk += 1) {
    const tx = seededInt(col, row, 521 + trunk, Math.max(1, size - unit * 3))
    const ty = seededInt(row, col, 541 + trunk, Math.max(1, size - unit * 4))
    fill(g, '#4b321c', tx, ty, unit * 2, unit * 4)
  }
}

function drawBaseTile(g: CanvasRenderingContext2D, size: number, col: number, row: number, hp: number) {
  const unit = pixelUnit(size)
  const spriteSize = unit * 16
  const offset = Math.round((size - spriteSize) / 2)
  const alive = hp > 0
  const damaged = hp === 1
  const block = (color: string, x: number, y: number, width: number, height: number, alpha?: number) => {
    fill(g, color, offset + x * unit, offset + y * unit, width * unit, height * unit, alpha)
  }

  block('rgba(0, 0, 0, 0.34)', 1, 14, 14, 2)

  if (alive) {
    // Reinforced foundation and flanking armor.
    block('#17130d', 1, 6, 14, 9)
    block('#4c3a24', 2, 7, 12, 7)
    block('#8a6a32', 2, 8, 3, 5)
    block('#8a6a32', 11, 8, 3, 5)
    block('#d3b85e', 3, 8, 1, 4)
    block('#d3b85e', 12, 8, 1, 4)
    block('#2d2920', 2, 13, 12, 1)
    block('#b08a3a', 2, 14, 3, 1)
    block('#b08a3a', 6, 14, 4, 1)
    block('#b08a3a', 11, 14, 3, 1)

    // Stepped command roof with a small illuminated beacon.
    block('#17130d', 7, 0, 2, 1)
    block('#ffd35a', 7, 0, 2, 1)
    block('#17130d', 6, 1, 4, 1)
    block('#fff1a5', 7, 1, 2, 1)
    block('#17130d', 5, 2, 6, 1)
    block('#b78b37', 6, 2, 4, 1)
    block('#17130d', 4, 3, 8, 3)
    block('#d3b85e', 5, 3, 6, 1)
    block('#8a6a32', 5, 4, 6, 1)

    // Concrete bunker face with an eagle-like wing crest.
    block('#17130d', 4, 5, 8, 9)
    block(damaged ? '#8a8f84' : '#aeb6a5', 5, 6, 6, 7)
    block(damaged ? '#b9b49a' : '#e7e2ba', 5, 6, 6, 1)
    block('#5c675f', 5, 12, 6, 1)
    block('#ffd35a', 7, 7, 2, 1)
    block('#d3b85e', 6, 8, 4, 1)
    block('#d3b85e', 5, 8, 1, 1)
    block('#d3b85e', 10, 8, 1, 1)
    block('#fff1a5', 7, 8, 2, 1)
    block('#8a6a32', 6, 9, 1, 1)
    block('#8a6a32', 9, 9, 1, 1)

    // Armored entrance, observation slit, and side status lights.
    block('#252923', 7, 10, 2, 4)
    block('#050706', 7, 11, 2, 1)
    block('#86f4ff', 7, 11, 1, 1)
    block('#151515', 3, 9, 1, 2)
    block(damaged ? '#f06243' : '#86f4ff', 3, 9, 1, 1)
    block('#151515', 12, 9, 1, 2)
    block(damaged ? '#f06243' : '#86f4ff', 12, 9, 1, 1)

    // Rivets keep the broad armor plates from reading as flat rectangles.
    block('#f2d77a', 2, 7, 1, 1)
    block('#f2d77a', 13, 7, 1, 1)
    block('#3b2b1a', 2, 12, 1, 1)
    block('#3b2b1a', 13, 12, 1, 1)

    if (damaged) {
      // A broken roof corner, soot, and a branching facade crack make critical
      // base health readable on the battlefield before the HUD is consulted.
      block('#17130d', 10, 3, 2, 1)
      block('#3b2b24', 10, 4, 1, 2)
      block('#4c4137', 5, 6, 1, 2)
      block('#2a2119', 6, 8, 1, 1)
      block('#2a2119', 7, 9, 1, 1)
      block('#2a2119', 6, 10, 1, 1)
      block('#f06243', 8, 11, 1, 1)
    }
  } else {
    // The destroyed state keeps the same footprint but collapses the command
    // roof and exposes a hot crater instead of becoming an unrelated icon.
    block('#17130d', 1, 10, 14, 5)
    block('#3f3429', 2, 11, 12, 3)
    block('#75634c', 2, 9, 4, 3)
    block('#75634c', 10, 10, 4, 3)
    block('#9b7b48', 3, 8, 3, 2)
    block('#9b7b48', 10, 8, 2, 2)
    block('#211711', 5, 7, 6, 6)
    block('#3b2118', 6, 8, 4, 4)
    block('#f06243', 7, 9, 2, 1)
    block('#ffd35a', 8, 9, 1, 1)
    block('#5e554b', 5, 4, 3, 3)
    block('#8b8275', 8, 5, 3, 2)
    block('#d3b85e', 7, 3, 2, 2)
    block('#2a2119', 7, 12, 2, 2)

    for (let index = 0; index < 6; index += 1) {
      const debrisX = 1 + seededInt(col, row, 563 + index, 14)
      const debrisY = 6 + seededInt(row, col, 571 + index, 8)
      block(index % 2 === 0 ? '#b08a3a' : '#2a2119', debrisX, debrisY, 1, 1)
    }
  }
}

function drawRadioTile(g: CanvasRenderingContext2D, size: number, hp: number) {
  const unit = pixelUnit(size)
  const damaged = hp <= 1
  fill(g, 'rgba(21, 18, 14, 0.7)', unit * 2, size - unit * 5, size - unit * 4, unit * 2)
  fill(g, damaged ? '#5e6870' : '#9fb5bc', Math.round(size * 0.47), unit * 2, unit * 2, size - unit * 8)
  fill(g, '#26323a', Math.round(size * 0.54), unit * 3, unit * 2, size - unit * 10)
  fill(g, '#2e3a40', Math.round(size * 0.28), size - unit * 9, unit * 5, unit * 2)
  fill(g, '#2e3a40', Math.round(size * 0.57), size - unit * 9, unit * 5, unit * 2)
  fill(g, damaged ? '#6c7c80' : '#66c8ff', Math.round(size * 0.34), Math.round(size * 0.22), Math.round(size * 0.32), unit * 3)
  fill(g, '#ecfbff', Math.round(size * 0.4), Math.round(size * 0.28), Math.round(size * 0.2), unit, damaged ? 0.45 : 0.85)
  fill(g, '#bdeeff', Math.round(size * 0.22), unit * 2, unit * 3, unit, damaged ? 0.35 : 0.95)
  fill(g, '#bdeeff', Math.round(size * 0.69), unit * 2, unit * 3, unit, damaged ? 0.2 : 0.75)

  if (damaged) {
    fill(g, '#2a1712', Math.round(size * 0.4), Math.round(size * 0.44), Math.round(size * 0.22), unit * 2)
    fill(g, '#ffd35a', Math.round(size * 0.62), Math.round(size * 0.38), unit * 3, unit)
  }
}

function drawDepotTile(g: CanvasRenderingContext2D, size: number, hp: number) {
  const unit = pixelUnit(size)
  const damaged = hp <= 1
  fill(g, 'rgba(21, 18, 14, 0.7)', unit * 2, size - unit * 5, size - unit * 4, unit * 2)
  fill(g, damaged ? '#5f4427' : '#8f552b', Math.round(size * 0.2), Math.round(size * 0.3), Math.round(size * 0.62), Math.round(size * 0.47))
  fill(g, damaged ? '#7b4521' : '#a76534', Math.round(size * 0.13), Math.round(size * 0.43), Math.round(size * 0.7), Math.round(size * 0.38))
  fill(g, '#ce9452', Math.round(size * 0.22), Math.round(size * 0.25), Math.round(size * 0.56), unit * 2)
  fill(g, '#3a2518', Math.round(size * 0.25), Math.round(size * 0.43), unit * 2, Math.round(size * 0.38))
  fill(g, '#3a2518', Math.round(size * 0.6), Math.round(size * 0.43), unit * 2, Math.round(size * 0.38))
  fill(g, '#ffd35a', Math.round(size * 0.42), Math.round(size * 0.53), unit * 3, unit * 2, damaged ? 0.35 : 0.8)

  if (damaged) {
    fill(g, '#20140f', Math.round(size * 0.31), Math.round(size * 0.57), Math.round(size * 0.25), unit * 3)
    fill(g, '#c47b3e', Math.round(size * 0.68), Math.round(size * 0.34), unit * 3, unit * 2)
  }
}

function drawRoadTile(g: CanvasRenderingContext2D, size: number, col: number, row: number, neighbors?: RoadNeighbors) {
  const unit = pixelUnit(size)
  const roadWidth = Math.min(size, Math.max(unit * 10, Math.round(size * 0.72)))
  const start = Math.floor((size - roadWidth) / 2)
  const end = start + roadWidth
  const center = Math.round(size / 2)
  const connected = {
    up: Boolean(neighbors?.up),
    right: Boolean(neighbors?.right),
    down: Boolean(neighbors?.down),
    left: Boolean(neighbors?.left),
  }
  const hasHorizontal = connected.left || connected.right
  const hasVertical = connected.up || connected.down
  const left = connected.left ? 0 : start
  const right = connected.right ? size : end
  const top = connected.up ? 0 : start
  const bottom = connected.down ? size : end
  const dark = '#272c27'
  const base = '#5f665c'
  const surface = '#767867'
  const light = '#8d8a72'

  fill(g, dark, left, start, right - left, roadWidth)
  fill(g, dark, start, top, roadWidth, bottom - top)
  fill(g, base, left, start + unit, right - left, Math.max(unit, roadWidth - unit * 2))
  fill(g, base, start + unit, top, Math.max(unit, roadWidth - unit * 2), bottom - top)
  fill(g, surface, left, start + unit * 2, right - left, Math.max(unit, roadWidth - unit * 4))
  fill(g, surface, start + unit * 2, top, Math.max(unit, roadWidth - unit * 4), bottom - top)

  if (!connected.up) {
    fill(g, '#454a43', left, start, right - left, unit)
  }
  if (!connected.down) {
    fill(g, '#30352f', left, end - unit, right - left, unit)
  }
  if (!connected.left) {
    fill(g, '#202520', start, top, unit, bottom - top)
  }
  if (!connected.right) {
    fill(g, '#202520', end - unit, top, unit, bottom - top)
  }

  for (let index = 0; index < 6; index += 1) {
    const px = start + unit * 2 + seededInt(col, row, 701 + index, Math.max(1, roadWidth - unit * 5))
    const py = start + unit * 2 + seededInt(row, col, 719 + index, Math.max(1, roadWidth - unit * 5))
    const color = index % 2 === 0 ? light : '#4b5048'
    fill(g, color, px, py, unit * (1 + seededInt(col, row, 733 + index, 3)), unit, index % 2 === 0 ? 0.75 : 1)
  }

  if (hasHorizontal && !hasVertical) {
    const y = center - Math.max(1, Math.floor(unit / 2))
    const minX = connected.left ? unit * 2 : start + unit * 2
    const maxX = connected.right ? size - unit * 2 : end - unit * 2

    for (let x = minX; x + unit * 3 <= maxX; x += unit * 7) {
      fill(g, '#9b967a', x, y, unit * 3, unit)
    }
  } else if (hasVertical && !hasHorizontal) {
    const x = center - Math.max(1, Math.floor(unit / 2))
    const minY = connected.up ? unit * 2 : start + unit * 2
    const maxY = connected.down ? size - unit * 2 : end - unit * 2

    for (let y = minY; y + unit * 3 <= maxY; y += unit * 7) {
      fill(g, '#9b967a', x, y, unit, unit * 3)
    }
  } else if (hasHorizontal || hasVertical) {
    fill(g, '#9b967a', center - unit * 2, center - unit, unit * 4, unit)
    fill(g, '#9b967a', center - unit, center - unit * 2, unit, unit * 4)
  }
}

function drawAmmoStationTile(g: CanvasRenderingContext2D, size: number, time: number) {
  const unit = pixelUnit(size)
  const pulse = Math.floor(time * 4) % 2 === 0
  const center = Math.round(size / 2)

  fill(g, 'rgba(9, 12, 10, 0.5)', unit * 2, size - unit * 5, size - unit * 4, unit * 3)
  fill(g, '#1d241e', unit * 3, unit * 4, size - unit * 6, size - unit * 8)
  fill(g, '#4e5b47', unit * 4, unit * 3, size - unit * 8, size - unit * 7)
  fill(g, '#121812', unit * 5, unit * 5, size - unit * 10, size - unit * 10)
  fill(g, pulse ? '#fff0a5' : '#d7b55b', center - unit, unit * 5, unit * 2, size - unit * 10)
  fill(g, pulse ? '#fff0a5' : '#d7b55b', unit * 5, center - unit, size - unit * 10, unit * 2)
  fill(g, '#6c7c58', unit * 3, size - unit * 5, size - unit * 6, unit * 2)
  fill(g, '#22281f', unit * 4, size - unit * 7, unit * 3, unit * 2)
  fill(g, '#22281f', size - unit * 7, size - unit * 7, unit * 3, unit * 2)
  fill(g, '#bdeeff', unit * 5, unit * 3, unit * 2, unit, pulse ? 0.8 : 0.35)
  fill(g, '#bdeeff', size - unit * 7, unit * 3, unit * 2, unit, pulse ? 0.5 : 0.25)
}

function drawSwampTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#23351f', 0, 0, size, size)
  fill(g, '#304d2c', unit, unit, size - unit * 2, size - unit * 2)
  for (let index = 0; index < 12; index += 1) {
    const x = seededInt(col, row, 901 + index, size)
    const y = seededInt(row, col, 917 + index, size)
    fill(g, index % 3 === 0 ? '#182915' : '#4b6b39', x, y, unit * (2 + seededInt(col, row, 929 + index, 4)), unit)
  }
  for (let index = 0; index < 5; index += 1) {
    const x = seededInt(col, row, 941 + index, Math.max(1, size - unit * 6))
    const y = seededInt(row, col, 953 + index, Math.max(1, size - unit * 4))
    fill(g, '#19251b', x, y, unit * 6, unit * 3, 0.72)
    fill(g, '#607a4c', x + unit, y + unit, unit * 3, unit, 0.75)
  }
}

function drawRicochetTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  const slash = (col + row) % 2 === 0
  fill(g, '#171717', unit * 2, unit * 2, size - unit * 4, size - unit * 4)
  fill(g, '#6f7672', unit * 3, unit * 3, size - unit * 6, size - unit * 6)
  fill(g, '#c9c7b6', unit * 4, unit * 4, size - unit * 8, unit * 2)
  fill(g, '#3f4542', unit * 4, size - unit * 6, size - unit * 8, unit * 2)
  g.strokeStyle = '#fff1a5'
  g.lineWidth = Math.max(1, unit)
  g.beginPath()
  if (slash) {
    g.moveTo(unit * 6, size - unit * 6)
    g.lineTo(size - unit * 6, unit * 6)
  } else {
    g.moveTo(unit * 6, unit * 6)
    g.lineTo(size - unit * 6, size - unit * 6)
  }
  g.stroke()
}

function drawMetalTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#29343a', 0, 0, size, size)
  fill(g, '#53636a', unit * 2, unit * 2, size - unit * 4, size - unit * 4)
  for (let y = unit * 3; y < size - unit * 2; y += unit * 5) {
    fill(g, '#718187', unit * 2, y, size - unit * 4, unit)
    fill(g, '#222b30', unit * 2, y + unit * 2, size - unit * 4, unit)
  }
  for (let index = 0; index < 5; index += 1) {
    const x = unit * 3 + seededInt(col, row, 971 + index, Math.max(1, size - unit * 8))
    const y = unit * 3 + seededInt(row, col, 983 + index, Math.max(1, size - unit * 8))
    fill(g, '#d9f0f0', x, y, unit, unit, 0.75)
  }
}

function drawDustTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#6f5433', 0, 0, size, size)
  fill(g, '#9a7142', unit * 2, unit * 2, size - unit * 4, size - unit * 4)
  fill(g, '#5c4329', 0, unit, size, unit)
  fill(g, '#b98a52', unit * 3, unit * 4, size - unit * 6, unit)
  fill(g, '#b98a52', unit * 2, size - unit * 5, size - unit * 4, unit, 0.6)
  for (let index = 0; index < 18; index += 1) {
    const x = seededInt(col, row, 991 + index, size)
    const y = seededInt(row, col, 997 + index, size)
    fill(g, index % 2 === 0 ? '#c69a61' : '#4d3924', x, y, unit, unit)
  }
}

function drawEchoTile(g: CanvasRenderingContext2D, size: number, _col: number, _row: number) {
  const unit = pixelUnit(size)
  const cx = Math.round(size / 2)
  const cy = Math.round(size / 2)
  fill(g, '#20383f', 0, 0, size, size)
  fill(g, '#2f5964', unit * 2, unit * 2, size - unit * 4, size - unit * 4)
  g.strokeStyle = '#86f4ff'
  g.lineWidth = Math.max(1, unit)
  g.lineCap = 'square'
  g.lineJoin = 'miter'
  const radius = Math.max(unit * 3, Math.round(size * 0.36))
  const left = cx - radius
  const right = cx + radius
  const top = cy - radius
  const bottom = cy + radius
  const arm = Math.max(unit * 2, Math.round(radius * 0.38))
  g.beginPath()
  g.moveTo(left + arm, top)
  g.lineTo(left, top)
  g.lineTo(left, bottom)
  g.lineTo(left + arm, bottom)
  g.moveTo(right - arm, top)
  g.lineTo(right, top)
  g.lineTo(right, bottom)
  g.lineTo(right - arm, bottom)
  g.stroke()
  fill(g, '#163039', unit * 2, unit * 2, size - unit * 4, unit * 2, 0.55)
}

function drawReedsTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#263b20', 0, 0, size, size)
  fill(g, '#344d27', unit, unit, size - unit * 2, size - unit * 2)
  for (let index = 0; index < 18; index += 1) {
    const x = seededInt(col, row, 1021 + index, size)
    const base = size - unit * (2 + seededInt(row, col, 1031 + index, 4))
    const height = unit * (5 + seededInt(col, row, 1039 + index, 7))
    fill(g, index % 3 === 0 ? '#c5aa54' : '#7ca04d', x, Math.max(unit, base - height), unit, height)
  }
  fill(g, '#172216', 0, size - unit * 3, size, unit * 3, 0.68)
}

function drawGravelTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#4d4a42', 0, 0, size, size)
  fill(g, '#6d6659', unit, unit, size - unit * 2, size - unit * 2)
  for (let index = 0; index < 28; index += 1) {
    const x = seededInt(col, row, 1051 + index, size)
    const y = seededInt(row, col, 1061 + index, size)
    const color = index % 4 === 0 ? '#a69b83' : index % 3 === 0 ? '#2d2b27' : '#7e7668'
    fill(g, color, x, y, unit * (1 + seededInt(col, row, 1069 + index, 2)), unit)
  }
}

function drawSnowTile(g: CanvasRenderingContext2D, size: number, col: number, row: number) {
  const unit = pixelUnit(size)
  fill(g, '#9eb8b2', 0, 0, size, size)
  fill(g, '#d9eee8', unit, unit, size - unit * 2, size - unit * 2)
  fill(g, '#f7fffb', unit * 2, unit * 2, size - unit * 5, unit * 2, 0.82)
  fill(g, '#90aaa5', unit * 2, size - unit * 5, size - unit * 4, unit, 0.7)
  for (let index = 0; index < 12; index += 1) {
    const x = seededInt(col, row, 1087 + index, size)
    const y = seededInt(row, col, 1093 + index, size)
    fill(g, index % 3 === 0 ? '#f7fffb' : '#b7d0ca', x, y, unit, unit)
  }
}

function drawTankBody(ctx: CanvasRenderingContext2D, size: number, palette: PixelTeamPalette, options: TankSpriteOptions) {
  const unit = pixelUnit(size)
  const half = Math.round(size / 2)
  const trackW = Math.max(unit * 4, Math.round(size * 0.24))
  const trackH = Math.max(unit * 12, Math.round(size * 0.78))
  const bodyW = Math.max(unit * 8, Math.round(size * 0.56))
  const bodyH = Math.max(unit * 10, Math.round(size * 0.62))
  const turretW = Math.max(unit * 6, Math.round(size * 0.38))
  const turretH = Math.max(unit * 5, Math.round(size * 0.32))
  const body = options.alive === false ? '#64625e' : options.armored ? '#cbd7dc' : palette.body
  const trim = options.alive === false ? '#30302e' : palette.trim
  const highlight = options.alive === false ? '#918e87' : palette.highlight
  const shadow = options.alive === false ? '#171717' : '#0c1110'

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)'
  ctx.fillRect(-half + unit * 2, -Math.round(trackH / 2) + unit * 2, size - unit * 3, trackH)

  ctx.fillStyle = shadow
  ctx.fillRect(-half + unit, -Math.round(trackH / 2), trackW, trackH)
  ctx.fillRect(half - trackW - unit, -Math.round(trackH / 2), trackW, trackH)
  ctx.fillStyle = '#2b2d28'
  ctx.fillRect(-half + unit * 2, -Math.round(trackH / 2) + unit, trackW - unit * 2, trackH - unit * 2)
  ctx.fillRect(half - trackW, -Math.round(trackH / 2) + unit, trackW - unit * 2, trackH - unit * 2)

  for (let yy = -Math.round(trackH / 2) + unit; yy < Math.round(trackH / 2) - unit; yy += unit * 2) {
    ctx.fillStyle = yy % (unit * 4) === 0 ? '#0d0f0d' : trim
    ctx.fillRect(-half + unit * 2, yy, trackW - unit * 2, unit)
    ctx.fillRect(half - trackW, yy, trackW - unit * 2, unit)
  }

  ctx.fillStyle = '#11120f'
  ctx.fillRect(-Math.round(bodyW / 2) - unit, -Math.round(bodyH / 2), bodyW + unit * 2, bodyH + unit)
  ctx.fillStyle = body
  ctx.fillRect(-Math.round(bodyW / 2), -Math.round(bodyH / 2), bodyW, bodyH)
  ctx.fillStyle = trim
  ctx.fillRect(-Math.round(bodyW / 2), -Math.round(bodyH / 2), unit * 2, bodyH)
  ctx.fillRect(Math.round(bodyW / 2) - unit * 2, -Math.round(bodyH / 2), unit * 2, bodyH)
  ctx.fillRect(-Math.round(bodyW / 2), Math.round(bodyH / 2) - unit * 2, bodyW, unit * 2)
  ctx.fillStyle = highlight
  ctx.fillRect(-Math.round(bodyW / 2) + unit * 2, -Math.round(bodyH / 2) + unit, bodyW - unit * 4, unit)
  ctx.fillRect(-Math.round(bodyW / 2) + unit * 3, -Math.round(bodyH / 2) + unit * 3, unit * 2, unit)
  ctx.fillRect(Math.round(bodyW / 2) - unit * 5, -Math.round(bodyH / 2) + unit * 3, unit * 2, unit)

  ctx.fillStyle = trim
  ctx.fillRect(-Math.round(bodyW * 0.25), -Math.round(bodyH * 0.1), Math.round(bodyW * 0.5), unit)
  ctx.fillRect(-unit, Math.round(bodyH * 0.1), unit * 2, Math.round(bodyH * 0.24))
  ctx.fillStyle = '#11120f'
  ctx.fillRect(-unit, -Math.round(size * 0.79), unit * 2, Math.round(size * 0.34))
  ctx.fillStyle = trim
  ctx.fillRect(-unit, -Math.round(size * 0.82), unit * 2, Math.round(size * 0.4))
  ctx.fillStyle = highlight
  ctx.fillRect(0, -Math.round(size * 0.8), unit, Math.round(size * 0.22))

  ctx.fillStyle = '#11120f'
  ctx.fillRect(-Math.round(turretW / 2) - unit, -Math.round(size * 0.5), turretW + unit * 2, turretH + unit * 2)
  ctx.fillStyle = body
  ctx.fillRect(-Math.round(turretW / 2), -Math.round(size * 0.5) + unit, turretW, turretH)
  ctx.fillStyle = trim
  ctx.fillRect(-Math.round(turretW / 2), -Math.round(size * 0.5) + turretH, turretW, unit * 2)
  ctx.fillRect(-Math.round(turretW / 2), -Math.round(size * 0.5) + unit, unit * 2, turretH)
  ctx.fillStyle = highlight
  ctx.fillRect(-Math.round(turretW / 2) + unit * 2, -Math.round(size * 0.5) + unit * 2, turretW - unit * 4, unit)
  ctx.fillStyle = '#1a1b17'
  ctx.fillRect(-unit * 2, -Math.round(size * 0.35), unit * 4, unit * 3)
  ctx.fillStyle = highlight
  ctx.fillRect(-unit, -Math.round(size * 0.34), unit * 2, unit)

  if (options.armored && options.alive !== false) {
    ctx.fillStyle = '#eef8f6'
    ctx.fillRect(-Math.round(bodyW / 2) + unit * 2, Math.round(bodyH / 2) - unit * 4, bodyW - unit * 4, unit)
    ctx.fillStyle = '#81919a'
    ctx.fillRect(-Math.round(bodyW / 2) + unit * 3, Math.round(bodyH / 2) - unit * 7, bodyW - unit * 6, unit)
  }

  drawTankClassMarks(ctx, size, palette, options)
  drawTankSurfaceDetail(ctx, size, options)
}

function terrainSpriteId(kind: TileKind, hp: number, time: number) {
  if (kind === 'brick') {
    return hp <= 1 ? 'terrain.brick.damaged' : 'terrain.brick'
  }
  if (kind === 'steel') return 'terrain.steel'
  if (kind === 'water') return `terrain.water.${Math.abs(Math.floor(time * 4)) % 3}`
  if (kind === 'trees') return 'terrain.trees'
  if (kind === 'base') return hp <= 0 ? 'terrain.base.dead' : 'terrain.base.alive'
  if (kind === 'radio') return hp <= 1 ? 'terrain.radio.damaged' : 'terrain.radio'
  if (kind === 'depot') return hp <= 1 ? 'terrain.depot.damaged' : 'terrain.depot'
  return null
}

function drawTankAtlasPhysicalOverlays(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: Direction,
  palette: PixelTeamPalette,
  options: TankSpriteOptions,
  includeClassMarks: boolean,
) {
  const unit = pixelUnit(size)

  if (options.armored) {
    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    ctx.rotate(directionAngle(direction))
    ctx.fillStyle = '#f1fbfb'
    ctx.fillRect(-Math.round(size * 0.2), Math.round(size * 0.22), Math.round(size * 0.4), unit)
    ctx.fillStyle = '#6f8187'
    ctx.fillRect(-Math.round(size * 0.18), Math.round(size * 0.14), Math.round(size * 0.36), unit)
    ctx.restore()
  }

  if (includeClassMarks && options.tankClass) {
    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    ctx.rotate(directionAngle(direction))
    drawTankClassMarks(ctx, size, palette, options)
    ctx.restore()
  }

  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(directionAngle(direction))
  drawTankSurfaceDetail(ctx, size, options)
  ctx.restore()
}

function drawTankSurfaceDetail(ctx: CanvasRenderingContext2D, size: number, options: TankSpriteOptions) {
  const unit = pixelUnit(size)
  const damage = Math.max(0, Math.min(1, options.damage ?? 0))

  if (options.cosmeticSkin === 'field-worn' && options.alive !== false) {
    ctx.fillStyle = 'rgba(31, 34, 28, 0.72)'
    ctx.fillRect(-Math.round(size * 0.18), Math.round(size * 0.08), unit * 2, unit)
    ctx.fillRect(Math.round(size * 0.08), Math.round(size * 0.22), unit * 3, unit)
    ctx.fillStyle = 'rgba(235, 220, 171, 0.58)'
    ctx.fillRect(-Math.round(size * 0.12), -Math.round(size * 0.18), unit, unit)
  }

  if (damage > 0.18 && options.alive !== false) {
    ctx.fillStyle = '#17130f'
    ctx.fillRect(-Math.round(size * 0.22), -unit, unit * 3, unit * 2)
    ctx.fillRect(Math.round(size * 0.08), Math.round(size * 0.2), unit * 2, unit * 2)
  }
  if (damage > 0.48 && options.alive !== false) {
    ctx.fillStyle = '#d16f32'
    ctx.fillRect(Math.round(size * 0.16), -Math.round(size * 0.18), unit, unit * 2)
    ctx.fillStyle = '#4b3a2b'
    ctx.fillRect(-Math.round(size * 0.3), Math.round(size * 0.28), unit * 4, unit)
  }
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  arm: number,
  thickness: number,
) {
  ctx.fillRect(left, top, arm, thickness)
  ctx.fillRect(left, top, thickness, arm)
  ctx.fillRect(right - arm, top, arm, thickness)
  ctx.fillRect(right - thickness, top, thickness, arm)
  ctx.fillRect(left, bottom - thickness, arm, thickness)
  ctx.fillRect(left, bottom - arm, thickness, arm)
  ctx.fillRect(right - arm, bottom - thickness, arm, thickness)
  ctx.fillRect(right - thickness, bottom - arm, thickness, arm)
}

function drawTankClassMarks(ctx: CanvasRenderingContext2D, size: number, palette: PixelTeamPalette, options: TankSpriteOptions) {
  if (!options.tankClass || options.alive === false) {
    return
  }

  const unit = pixelUnit(size)
  const half = Math.round(size / 2)

  if (options.tankClass === 'scout') {
    ctx.fillStyle = '#dffcff'
    ctx.fillRect(-unit, -Math.round(size * 0.36), unit * 2, Math.round(size * 0.42))
    ctx.fillStyle = palette.highlight
    ctx.fillRect(-Math.round(size * 0.28), -Math.round(size * 0.18), unit * 2, Math.round(size * 0.52))
    ctx.fillRect(Math.round(size * 0.18), -Math.round(size * 0.18), unit * 2, Math.round(size * 0.52))
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(Math.round(size * 0.2), -half + unit * 2, unit, unit * 5)
    ctx.fillRect(Math.round(size * 0.2) + unit, -half + unit * 2, unit * 2, unit)
    return
  }

  if (options.tankClass === 'engineer') {
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(-Math.round(size * 0.36), Math.round(size * 0.14), unit * 4, unit * 4)
    ctx.fillRect(Math.round(size * 0.18), Math.round(size * 0.14), unit * 4, unit * 4)
    ctx.fillStyle = '#1a211b'
    ctx.fillRect(-Math.round(size * 0.36) + unit, Math.round(size * 0.14) + unit, unit * 2, unit)
    ctx.fillRect(Math.round(size * 0.18) + unit, Math.round(size * 0.14) + unit, unit * 2, unit)
    ctx.fillStyle = '#bdeeff'
    ctx.fillRect(-unit, Math.round(size * 0.25), unit * 2, unit * 3)
    return
  }

  ctx.fillStyle = '#11120f'
  ctx.fillRect(-unit * 2, -Math.round(size * 0.88), unit * 4, Math.round(size * 0.42))
  ctx.fillStyle = '#f7f3df'
  ctx.fillRect(-unit, -Math.round(size * 0.86), unit * 2, Math.round(size * 0.34))
  ctx.fillStyle = '#cfd3d8'
  ctx.fillRect(-Math.round(size * 0.36), -Math.round(size * 0.06), unit * 4, Math.round(size * 0.48))
  ctx.fillRect(Math.round(size * 0.18), -Math.round(size * 0.06), unit * 4, Math.round(size * 0.48))
  ctx.fillStyle = '#6f8187'
  ctx.fillRect(-Math.round(size * 0.32), Math.round(size * 0.2), Math.round(size * 0.64), unit)
}

function drawRelayProgress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: PixelTeamPalette | null,
  progress: number,
) {
  const unit = pixelUnit(size)
  const owner = palette?.body ?? '#c8b982'

  ctx.fillStyle = '#141414'
  ctx.fillRect(Math.round(x + size * 0.13), Math.round(y + size * 0.9), Math.round(size * 0.74), unit)
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.13), Math.round(y + size * 0.9), Math.round(size * 0.74 * clamp(progress, 0, 1)), unit)
}

function drawCrater(g: CanvasRenderingContext2D, size: number, x: number, y: number, radius: number) {
  const unit = pixelUnit(size)
  const cx = clamp(x, radius, size - radius)
  const cy = clamp(y, radius, size - radius)
  fill(g, '#121310', cx - radius, cy, radius * 2, unit * 2)
  fill(g, '#1a1a15', cx - radius + unit, cy - unit * 2, radius * 2 - unit * 2, radius)
  fill(g, '#3a3224', cx - radius + unit * 2, cy - unit, radius * 2 - unit * 4, unit * 3)
  fill(g, '#776a4c', cx - radius + unit * 2, cy - radius + unit, radius, unit)
  fill(g, '#0b0d0b', cx - unit * 2, cy - unit, unit * 4, unit * 2)
}

function drawTrackMarks(g: CanvasRenderingContext2D, size: number, x: number, y: number, vertical: boolean) {
  const unit = pixelUnit(size)
  const length = Math.round(size * 0.62)
  const gap = unit * 3
  g.fillStyle = 'rgba(10, 13, 9, 0.45)'
  if (vertical) {
    for (let step = 0; step < length; step += unit * 3) {
      g.fillRect(x, y + step, unit * 2, unit)
      g.fillRect(x + gap, y + step, unit * 2, unit)
    }
  } else {
    for (let step = 0; step < length; step += unit * 3) {
      g.fillRect(x + step, y, unit, unit * 2)
      g.fillRect(x + step, y + gap, unit, unit * 2)
    }
  }
}

function drawDamageBite(g: CanvasRenderingContext2D, size: number, unit: number, corner: 'top-left' | 'bottom-right') {
  g.clearRect(corner === 'top-left' ? 0 : size - unit * 5, corner === 'top-left' ? 0 : size - unit * 5, unit * 5, unit * 5)
  g.fillStyle = '#2a170a'
  if (corner === 'top-left') {
    g.fillRect(unit * 2, 0, unit * 4, unit)
    g.fillRect(0, unit * 2, unit, unit * 4)
  } else {
    g.fillRect(size - unit * 6, size - unit, unit * 4, unit)
    g.fillRect(size - unit, size - unit * 6, unit, unit * 4)
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  draw: (sprite: HTMLCanvasElement) => void,
) {
  let sprite = spriteCache.get(key)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = size
    sprite.height = size
    draw(sprite)
    spriteCache.set(key, sprite)
  }
  ctx.drawImage(sprite, Math.round(x), Math.round(y))
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, alpha = 1) {
  const previousAlpha = ctx.globalAlpha
  ctx.globalAlpha = previousAlpha * alpha
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
  ctx.globalAlpha = previousAlpha
}

function pixelUnit(size: number) {
  return Math.max(1, Math.round(size / 16))
}

function spriteSheetForSize(size: number): SpriteSheetId {
  return size <= 20 ? 'core20' : 'core32'
}

function inferTeamKey(palette: PixelTeamPalette): AtlasTeamKey {
  const body = palette.body.toLowerCase()
  if (body === '#2fd4ff') return 'blueSafe'
  if (body === '#ffb000') return 'redSafe'
  if (body === '#f06243' || body === '#f05d42') return 'red'
  return 'blue'
}

function inferProjectileTeamKey(color: string): AtlasTeamKey {
  const value = color.toLowerCase()
  if (value === '#ffe0a3' || value === '#fff0bf') return 'redSafe'
  if (value === '#b9f3ff' || value === '#d9fbff') return 'blueSafe'
  if (value === '#ffcfb7' || value === '#ffe0d2') return 'red'
  return 'blue'
}

function seededChance(a: number, b: number, c: number, oneIn: number) {
  return seededInt(a, b, c, oneIn) === 0
}

function seededInt(a: number, b: number, c: number, max: number) {
  const safeMax = Math.max(1, Math.floor(max))
  const seed = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791)
  return Math.abs(seed) % safeMax
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function directionAngle(direction: Direction) {
  if (direction === 'right') return Math.PI / 2
  if (direction === 'down') return Math.PI
  if (direction === 'left') return -Math.PI / 2
  return 0
}
