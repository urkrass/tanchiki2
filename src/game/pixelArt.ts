import type { Direction, PowerUpKind, TileKind } from './types.ts'

export interface PixelTeamPalette {
  body: string
  trim: string
  highlight: string
  bullet: string
}

export interface TankSpriteOptions {
  armored?: boolean
  alive?: boolean
  self?: boolean
  shield?: boolean
}

export interface TerrainOptions {
  col: number
  row: number
  hp?: number
}

const spriteCache = new Map<string, HTMLCanvasElement>()

export function drawPixelGround(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, col: number, row: number) {
  drawSprite(ctx, `ground:${size}:${col % 8}:${row % 8}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return
    const unit = Math.max(1, Math.round(size / 16))
    g.fillStyle = '#223d25'
    g.fillRect(0, 0, size, size)

    for (let index = 0; index < 34; index += 1) {
      const px = seededInt(col, row, index, size)
      const py = seededInt(row, col, index + 17, size)
      g.fillStyle = index % 5 === 0 ? '#395938' : index % 3 === 0 ? '#172b1b' : '#2b492b'
      g.fillRect(px, py, unit, unit)
    }

    if ((col * 11 + row * 7) % 9 === 0) {
      g.fillStyle = '#6b6548'
      g.fillRect(Math.round(size * 0.18), Math.round(size * 0.56), Math.round(size * 0.42), unit)
      g.fillStyle = '#514b35'
      g.fillRect(Math.round(size * 0.26), Math.round(size * 0.64), Math.round(size * 0.34), unit)
    }

    if ((col * 5 + row * 13) % 17 === 0) {
      const cx = Math.round(size * 0.56)
      const cy = Math.round(size * 0.36)
      g.fillStyle = '#161a14'
      g.fillRect(cx - unit * 2, cy, unit * 4, unit)
      g.fillRect(cx - unit, cy - unit, unit * 2, unit * 3)
      g.fillStyle = '#3b3324'
      g.fillRect(cx - unit, cy, unit * 2, unit)
    }

    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(0, 0, size, unit)
    g.fillRect(0, 0, unit, size)
    g.fillStyle = 'rgba(0,0,0,0.18)'
    g.fillRect(0, size - unit, size, unit)
    g.fillRect(size - unit, 0, unit, size)
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
  const hp = options.hp ?? 1
  drawSprite(ctx, `tile:${kind}:${size}:${Math.max(0, Math.min(3, hp))}:${options.col % 4}:${options.row % 4}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return
    const unit = Math.max(1, Math.round(size / 16))

    if (kind === 'brick') {
      g.fillStyle = hp > 1 ? '#a66b37' : '#794421'
      g.fillRect(0, 0, size, size)
      g.fillStyle = '#d1a05b'
      g.fillRect(unit, unit, size - unit * 2, unit)
      g.fillStyle = '#37210f'
      g.fillRect(0, size - unit * 2, size, unit * 2)
      for (let row = 0; row < 4; row += 1) {
        const yBand = Math.round((row * size) / 4)
        g.fillStyle = '#40240f'
        g.fillRect(0, yBand, size, unit)
        const split = row % 2 === 0 ? Math.round(size * 0.42) : Math.round(size * 0.68)
        g.fillRect(split, yBand, unit, Math.round(size / 4))
      }
      g.fillStyle = hp > 1 ? '#c58c48' : '#8e5529'
      for (let index = 0; index < 7; index += 1) {
        g.fillRect(seededInt(options.col, options.row, index, size - unit), seededInt(options.row, options.col, index, size - unit), unit, unit)
      }
      return
    }

    if (kind === 'steel') {
      g.fillStyle = '#6f7c79'
      g.fillRect(0, 0, size, size)
      g.fillStyle = '#c9d2cf'
      g.fillRect(unit, unit, size - unit * 2, size - unit * 2)
      g.fillStyle = '#87918e'
      const block = Math.round(size * 0.36)
      g.fillRect(unit * 2, unit * 2, block, block)
      g.fillRect(size - block - unit * 2, unit * 2, block, block)
      g.fillRect(unit * 2, size - block - unit * 2, block, block)
      g.fillRect(size - block - unit * 2, size - block - unit * 2, block, block)
      g.fillStyle = '#eef8f4'
      g.fillRect(unit * 3, unit * 3, Math.max(unit * 3, block - unit * 3), unit)
      g.fillStyle = '#4b5654'
      g.fillRect(0, size - unit * 2, size, unit * 2)
      g.fillRect(size - unit * 2, 0, unit * 2, size)
      return
    }

    if (kind === 'water') {
      g.fillStyle = '#12364d'
      g.fillRect(0, 0, size, size)
      for (let band = 0; band < 4; band += 1) {
        const yy = Math.round(size * (0.2 + band * 0.2))
        g.fillStyle = band % 2 === 0 ? '#2e7fa1' : '#78d7e6'
        g.fillRect(unit * (band + 1), yy, Math.round(size * 0.55), unit)
      }
      g.fillStyle = '#0a2538'
      g.fillRect(0, size - unit * 2, size, unit * 2)
      return
    }

    if (kind === 'trees') {
      g.fillStyle = 'rgba(11, 28, 13, 0.88)'
      g.fillRect(0, 0, size, size)
      for (let index = 0; index < 9; index += 1) {
        const px = seededInt(options.col, options.row, index + 31, Math.max(1, size - unit * 5))
        const py = seededInt(options.row, options.col, index + 43, Math.max(1, size - unit * 5))
        g.fillStyle = index % 2 === 0 ? '#2f6a35' : '#163f22'
        g.fillRect(px, py, unit * 4, unit * 3)
        g.fillStyle = '#49904a'
        g.fillRect(px + unit, py, unit, unit)
      }
      return
    }

    if (kind === 'base') {
      g.fillStyle = hp > 0 ? '#c99d3c' : '#5d5348'
      g.fillRect(unit * 2, unit * 3, size - unit * 4, size - unit * 5)
      g.fillStyle = hp > 0 ? '#3e2713' : '#282420'
      g.fillRect(unit * 4, unit * 5, size - unit * 8, size - unit * 9)
      g.fillStyle = hp > 0 ? '#fff0a8' : '#9d9589'
      g.fillRect(Math.round(size * 0.45), unit, unit * 2, size - unit * 4)
      g.fillRect(Math.round(size * 0.28), Math.round(size * 0.44), Math.round(size * 0.44), unit * 2)
      g.fillStyle = '#2b1b0d'
      g.fillRect(unit * 2, size - unit * 3, size - unit * 4, unit * 2)
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
  const angle = directionAngle(direction)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)
  drawTankBody(ctx, size, palette, options)
  ctx.restore()
}

export function drawPixelProjectile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const unit = Math.max(1, Math.round(size / 5))
  ctx.fillStyle = '#fff6c1'
  ctx.fillRect(Math.round(x - unit), Math.round(y - unit), unit * 2, unit * 2)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x - unit * 2), Math.round(y), unit * 4, unit)
  ctx.fillRect(Math.round(x), Math.round(y - unit * 2), unit, unit * 4)
}

export function drawPixelPowerUp(ctx: CanvasRenderingContext2D, kind: PowerUpKind, x: number, y: number, size: number, time: number) {
  const flash = Math.floor(time * 8) % 2 === 0
  drawSprite(ctx, `power:${kind}:${size}:${flash ? 1 : 0}`, x, y, size, (sprite) => {
    const g = sprite.getContext('2d')
    if (!g) return
    const unit = Math.max(1, Math.round(size / 10))
    g.fillStyle = flash ? '#fff2a3' : '#c75a29'
    g.fillRect(0, 0, size, size)
    g.fillStyle = '#683018'
    g.fillRect(0, size - unit * 2, size, unit * 2)
    g.fillRect(size - unit * 2, 0, unit * 2, size)
    g.fillStyle = '#131313'
    if (kind === 'repair') {
      g.fillRect(Math.round(size * 0.42), Math.round(size * 0.18), unit * 2, Math.round(size * 0.62))
      g.fillRect(Math.round(size * 0.18), Math.round(size * 0.42), Math.round(size * 0.62), unit * 2)
    } else if (kind === 'rapid') {
      g.fillRect(Math.round(size * 0.25), Math.round(size * 0.2), unit * 2, Math.round(size * 0.6))
      g.fillRect(Math.round(size * 0.58), Math.round(size * 0.2), unit * 2, Math.round(size * 0.6))
      g.fillStyle = '#fff8ce'
      g.fillRect(Math.round(size * 0.22), Math.round(size * 0.12), unit * 2, unit)
      g.fillRect(Math.round(size * 0.55), Math.round(size * 0.12), unit * 2, unit)
    } else {
      g.fillRect(Math.round(size * 0.2), Math.round(size * 0.24), Math.round(size * 0.6), unit * 2)
      g.fillRect(Math.round(size * 0.3), Math.round(size * 0.4), Math.round(size * 0.4), Math.round(size * 0.36))
      g.fillStyle = '#fff8ce'
      g.fillRect(Math.round(size * 0.38), Math.round(size * 0.48), Math.round(size * 0.24), unit)
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
) {
  const unit = Math.max(1, Math.round(size / 14))
  const owner = palette?.body ?? '#c5b98c'
  ctx.fillStyle = '#181818'
  ctx.fillRect(Math.round(x + size * 0.44), y + unit, unit * 2, size - unit * 2)
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.24), Math.round(y + size * 0.2), Math.round(size * 0.38), unit * 3)
  ctx.fillStyle = palette?.highlight ?? '#fff5c8'
  ctx.fillRect(Math.round(x + size * 0.24), Math.round(y + size * 0.2), Math.round(size * 0.2), unit)
  ctx.fillStyle = '#2b2b2b'
  ctx.fillRect(Math.round(x + size * 0.18), Math.round(y + size * 0.75), Math.round(size * 0.64), unit * 2)
  ctx.fillStyle = owner
  ctx.fillRect(Math.round(x + size * 0.14), Math.round(y + size * 0.88), Math.round(size * 0.72 * progress), unit)
}

export function drawPixelPing(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const unit = Math.max(1, Math.round(size / 12))
  ctx.strokeStyle = color
  ctx.lineWidth = unit
  ctx.strokeRect(Math.round(x + unit * 2), Math.round(y + unit * 2), size - unit * 4, size - unit * 4)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + size / 2 - unit), unit * 2, unit * 2)
}

export function drawPixelLastKnown(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const unit = Math.max(1, Math.round(size / 12))
  ctx.strokeStyle = color
  ctx.lineWidth = unit
  ctx.strokeRect(Math.round(x + unit * 3), Math.round(y + unit * 3), size - unit * 6, size - unit * 6)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x + size / 2 - unit), Math.round(y + unit * 2), unit * 2, unit * 2)
}

export function drawPixelEnemyMarker(ctx: CanvasRenderingContext2D, x: number, y: number, palette: PixelTeamPalette) {
  drawPixelTank(ctx, x + 8, y + 8, 16, 'up', palette, { armored: false })
}

function drawTankBody(ctx: CanvasRenderingContext2D, size: number, palette: PixelTeamPalette, options: TankSpriteOptions) {
  const unit = Math.max(1, Math.round(size / 16))
  const half = Math.round(size / 2)
  const trackW = Math.max(unit * 3, Math.round(size * 0.22))
  const trackH = Math.max(unit * 10, Math.round(size * 0.72))
  const bodyW = Math.max(unit * 8, Math.round(size * 0.5))
  const bodyH = Math.max(unit * 9, Math.round(size * 0.56))
  const turret = Math.max(unit * 5, Math.round(size * 0.34))
  const body = options.alive === false ? '#62625e' : options.armored ? '#cbd7dc' : palette.body
  const trim = options.alive === false ? '#30302e' : palette.trim
  const highlight = options.alive === false ? '#898985' : palette.highlight

  ctx.fillStyle = '#101010'
  ctx.fillRect(-half + unit, -Math.round(trackH / 2), trackW, trackH)
  ctx.fillRect(half - trackW - unit, -Math.round(trackH / 2), trackW, trackH)
  ctx.fillStyle = trim
  for (let yy = -Math.round(trackH / 2) + unit; yy < Math.round(trackH / 2) - unit; yy += unit * 3) {
    ctx.fillRect(-half + unit * 2, yy, trackW - unit * 2, unit)
    ctx.fillRect(half - trackW, yy, trackW - unit * 2, unit)
  }

  ctx.fillStyle = body
  ctx.fillRect(-Math.round(bodyW / 2), -Math.round(bodyH / 2), bodyW, bodyH)
  ctx.fillStyle = trim
  ctx.fillRect(-Math.round(bodyW / 2), Math.round(bodyH / 2) - unit * 2, bodyW, unit * 2)
  ctx.fillRect(-Math.round(bodyW / 2), -Math.round(bodyH / 2), unit * 2, bodyH)
  ctx.fillStyle = highlight
  ctx.fillRect(-Math.round(bodyW / 2) + unit * 2, -Math.round(bodyH / 2) + unit * 2, bodyW - unit * 4, unit)

  ctx.fillStyle = body
  ctx.fillRect(-Math.round(turret / 2), -Math.round(size * 0.44), turret, Math.round(size * 0.34))
  ctx.fillStyle = trim
  ctx.fillRect(-unit, -Math.round(size * 0.72), unit * 2, Math.round(size * 0.36))
  ctx.fillStyle = highlight
  ctx.fillRect(-Math.round(turret / 2) + unit, -Math.round(size * 0.38), turret - unit * 2, unit)

  if (options.shield) {
    ctx.strokeStyle = '#fff1a8'
    ctx.lineWidth = unit
    ctx.strokeRect(-half + unit, -half + unit, size - unit * 2, size - unit * 2)
  }
  if (options.self) {
    ctx.strokeStyle = '#fff6a8'
    ctx.lineWidth = unit
    ctx.strokeRect(-half, -half, size, size)
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
  const cacheKey = `${key}:${size}`
  let sprite = spriteCache.get(cacheKey)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = size
    sprite.height = size
    draw(sprite)
    spriteCache.set(cacheKey, sprite)
  }
  ctx.drawImage(sprite, Math.round(x), Math.round(y))
}

function seededInt(a: number, b: number, c: number, max: number) {
  const safeMax = Math.max(1, Math.floor(max))
  const seed = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791)
  return Math.abs(seed) % safeMax
}

function directionAngle(direction: Direction) {
  if (direction === 'right') return Math.PI / 2
  if (direction === 'down') return Math.PI
  if (direction === 'left') return -Math.PI / 2
  return 0
}
