import type { Direction, PowerUpKind, TileKind, WaterNeighbors } from './types.ts'
import {
  drawAtlasSprite,
  type AtlasRelayKey,
  type AtlasTeamKey,
  type SpriteSheetId,
} from './spriteAtlas.ts'

export interface PixelTeamPalette {
  body: string
  trim: string
  highlight: string
  bullet: string
}

export interface TankSpriteOptions {
  armored?: boolean
  alive?: boolean
  frame?: number
  self?: boolean
  shield?: boolean
  sheet?: SpriteSheetId
  teamKey?: AtlasTeamKey
}

export interface TerrainOptions {
  col: number
  row: number
  hp?: number
  sheet?: SpriteSheetId
  time?: number
  waterNeighbors?: WaterNeighbors
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
  const atlasId = terrainSpriteId(kind, hp, options.time ?? options.col + options.row * 0.37)

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

  drawSprite(ctx, `tile:${kind}:${size}:${hp}:${options.col}:${options.row}${waterKey}`, x, y, size, (sprite) => {
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
      drawRoadTile(g, size)
      return
    }

    if (kind === 'ammo') {
      drawAmmoStationTile(g, size, options.time ?? 0)
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

  if (options.alive !== false && size >= 18) {
    const atlasDrawn = drawAtlasSprite(ctx, `tank.${teamKey}.${direction}.${frame}`, x - atlasSize / 2, y - atlasSize / 2, {
      sheet,
      width: atlasSize,
      height: atlasSize,
    })

    if (atlasDrawn) {
      drawTankAtlasOverlays(ctx, x, y, atlasSize, direction, palette, options)
      return
    }
  }

  const angle = directionAngle(direction)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)
  drawTankBody(ctx, size, palette, options)
  ctx.restore()
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

  if (drawAtlasSprite(ctx, `relay.${teamKey}.${frame}`, x, y, { sheet, width: size, height: size })) {
    drawRelayProgress(ctx, x, y, size, progressPalette, progress)
    return
  }

  const unit = pixelUnit(size)
  const owner = palette?.body ?? '#c8b982'
  const trim = palette?.trim ?? '#4c4634'
  const light = palette?.highlight ?? '#fff3b8'
  const cx = Math.round(x + size / 2)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(Math.round(x + size * 0.18), Math.round(y + size * 0.82), Math.round(size * 0.64), unit * 2)
  ctx.fillStyle = '#151515'
  ctx.fillRect(cx - unit, Math.round(y + size * 0.2), unit * 2, Math.round(size * 0.62))
  ctx.fillStyle = '#4b4b44'
  ctx.fillRect(cx - unit * 2, Math.round(y + size * 0.42), unit, Math.round(size * 0.34))
  ctx.fillRect(cx + unit, Math.round(y + size * 0.42), unit, Math.round(size * 0.34))
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.18), Math.round(y + size * 0.18), Math.round(size * 0.38), unit * 4)
  ctx.fillStyle = trim
  ctx.fillRect(Math.round(x + size * 0.22), Math.round(y + size * 0.24), Math.round(size * 0.28), unit)
  ctx.fillStyle = light
  ctx.fillRect(Math.round(x + size * 0.2), Math.round(y + size * 0.19), Math.round(size * 0.18), unit)
  ctx.fillStyle = '#2e2a24'
  ctx.fillRect(Math.round(x + size * 0.24), Math.round(y + size * 0.68), Math.round(size * 0.52), Math.round(size * 0.2))
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.29), Math.round(y + size * 0.72), Math.round(size * 0.42), unit * 2)
  ctx.fillStyle = light
  ctx.fillRect(Math.round(x + size * 0.34), Math.round(y + size * 0.75), unit * 2, unit)
  ctx.fillStyle = '#141414'
  ctx.fillRect(Math.round(x + size * 0.13), Math.round(y + size * 0.9), Math.round(size * 0.74), unit)
  ctx.fillStyle = progressPalette?.body ?? owner
  ctx.fillRect(Math.round(x + size * 0.13), Math.round(y + size * 0.9), Math.round(size * 0.74 * clamp(progress, 0, 1)), unit)
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
  const alive = hp > 0
  fill(g, alive ? '#4d3b23' : '#231d18', unit * 2, unit * 4, size - unit * 4, size - unit * 6)
  fill(g, alive ? '#b78b37' : '#5e554b', unit * 3, unit * 3, size - unit * 6, size - unit * 5)
  fill(g, alive ? '#ead488' : '#8b8275', unit * 4, unit * 4, size - unit * 8, size - unit * 8)
  fill(g, '#1c160d', unit * 4, size - unit * 5, size - unit * 8, unit * 3)

  if (alive) {
    const center = Math.round(size / 2)
    fill(g, '#fff1a9', center - unit, unit * 3, unit * 2, size - unit * 8)
    fill(g, '#fff1a9', Math.round(size * 0.24), Math.round(size * 0.44), Math.round(size * 0.52), unit * 2)
    fill(g, '#5b3215', center - unit * 2, Math.round(size * 0.3), unit * 4, unit * 2)
    fill(g, '#5b3215', Math.round(size * 0.28), Math.round(size * 0.54), Math.round(size * 0.18), unit * 2)
    fill(g, '#5b3215', Math.round(size * 0.54), Math.round(size * 0.54), Math.round(size * 0.18), unit * 2)
    fill(g, '#f8f0be', center - unit, Math.round(size * 0.25), unit * 2, unit)
  } else {
    drawCrater(g, size, Math.round(size * 0.54), Math.round(size * 0.46), Math.round(size * 0.24))
    for (let index = 0; index < 9; index += 1) {
      fill(
        g,
        index % 2 === 0 ? '#9b7b48' : '#211711',
        seededInt(col, row, 563 + index, size),
        seededInt(row, col, 571 + index, size),
        unit * 2,
        unit,
      )
    }
  }

  fill(g, 'rgba(0, 0, 0, 0.3)', unit * 2, size - unit * 3, size - unit * 4, unit * 2)
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

function drawRoadTile(g: CanvasRenderingContext2D, size: number) {
  const unit = pixelUnit(size)
  fill(g, '#5b5a50', 0, Math.round(size * 0.34), size, Math.round(size * 0.32))
  fill(g, '#87826d', unit * 2, Math.round(size * 0.44), Math.round(size * 0.22), unit)
  fill(g, '#87826d', Math.round(size * 0.42), Math.round(size * 0.44), Math.round(size * 0.18), unit)
  fill(g, '#87826d', Math.round(size * 0.72), Math.round(size * 0.44), Math.round(size * 0.22), unit)
  fill(g, '#9f987c', 0, Math.round(size * 0.31), size, unit)
  fill(g, '#34352f', 0, Math.round(size * 0.66), size, unit)
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

  if (options.shield) {
    ctx.strokeStyle = '#fff1a8'
    ctx.lineWidth = unit
    ctx.strokeRect(-half + unit, -half + unit, size - unit * 2, size - unit * 2)
    ctx.strokeStyle = palette.body
    ctx.strokeRect(-half + unit * 2, -half + unit * 2, size - unit * 4, size - unit * 4)
  }
  if (options.self) {
    ctx.strokeStyle = '#fff6a8'
    ctx.lineWidth = unit
    ctx.strokeRect(-half, -half, size, size)
    ctx.strokeStyle = palette.highlight
    ctx.strokeRect(-half + unit * 2, -half + unit * 2, size - unit * 4, size - unit * 4)
  }
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
  if (kind === 'road') return 'terrain.road'
  return null
}

function drawTankAtlasOverlays(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: Direction,
  palette: PixelTeamPalette,
  options: TankSpriteOptions,
) {
  const unit = pixelUnit(size)
  const half = Math.round(size / 2)

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

  if (options.shield) {
    ctx.strokeStyle = '#fff1a8'
    ctx.lineWidth = unit
    ctx.strokeRect(Math.round(x - half + unit), Math.round(y - half + unit), size - unit * 2, size - unit * 2)
    ctx.strokeStyle = palette.body
    ctx.strokeRect(Math.round(x - half + unit * 2), Math.round(y - half + unit * 2), size - unit * 4, size - unit * 4)
  }

  if (options.self) {
    ctx.strokeStyle = '#fff6a8'
    ctx.lineWidth = unit
    ctx.strokeRect(Math.round(x - half), Math.round(y - half), size, size)
    ctx.strokeStyle = palette.highlight
    ctx.strokeRect(Math.round(x - half + unit * 2), Math.round(y - half + unit * 2), size - unit * 4, size - unit * 4)
  }
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
