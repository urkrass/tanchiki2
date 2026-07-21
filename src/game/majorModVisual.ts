import { drawBattlefieldTank } from './battlefield.ts'
import type { PixelTeamPalette } from './pixelArt.ts'
import type { MajorModKind, TankClassId } from './types.ts'

const DEFAULT_PALETTE: PixelTeamPalette = {
  body: '#2f8fcb',
  trim: '#8ed8ff',
  highlight: '#dff8ff',
  bullet: '#ffd35a',
}

export interface MajorModIconOptions {
  focused?: boolean
  palette?: PixelTeamPalette
  tankClass?: TankClassId
  symbolOnly?: boolean
}

export function drawMajorModIcon(
  ctx: CanvasRenderingContext2D,
  kind: MajorModKind,
  x: number,
  y: number,
  size: number,
  options: MajorModIconOptions = {},
) {
  const focused = options.focused ?? false
  const symbolOnly = options.symbolOnly ?? false
  const palette = options.palette ?? DEFAULT_PALETTE
  const scale = size / 52
  const centerX = 26
  const centerY = 26

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)

  if (kind === 'overdrive') {
    if (symbolOnly) {
      ctx.fillStyle = focused ? '#ffd35a' : '#8b7a42'
      ctx.fillRect(7, 12, 19, 4)
      ctx.fillRect(12, 20, 18, 4)
      ctx.fillRect(7, 28, 19, 4)
      ctx.fillRect(26, 15, 7, 7)
      ctx.fillRect(30, 21, 7, 8)
      ctx.fillRect(26, 28, 7, 7)
      ctx.fillStyle = focused ? '#fff1a5' : '#d5b45a'
      ctx.fillRect(35, 10, 7, 14)
      ctx.fillRect(31, 20, 7, 8)
      ctx.fillRect(27, 26, 7, 14)
    } else {
      ctx.fillStyle = focused ? '#ffd35a' : '#8b7a42'
      ctx.fillRect(3, 13, 22, 2)
      ctx.fillRect(7, 20, 18, 2)
      ctx.fillRect(2, 27, 24, 2)
      drawBattlefieldTank(ctx, centerX + 8, centerY + 2, 32, 'right', palette, {
        focused,
        self: true,
        tankClass: options.tankClass ?? 'scout',
      })
    }
  } else if (kind === 'pontoon') {
    ctx.fillStyle = '#243d47'
    ctx.fillRect(centerX - 20, centerY - 17, 40, 34)
    ctx.fillStyle = '#355966'
    ctx.fillRect(centerX - 18, centerY - 12, 36, 2)
    ctx.fillRect(centerX - 18, centerY + 10, 36, 2)
    ctx.fillStyle = '#8c7143'
    for (let plank = 0; plank < 5; plank += 1) {
      ctx.fillRect(centerX - 16 + plank * 7, centerY - 18, 5, 36)
    }
    ctx.fillStyle = '#d8bd74'
    ctx.fillRect(centerX - 18, centerY - 12, 36, 2)
    ctx.fillRect(centerX - 18, centerY + 10, 36, 2)
  } else if (kind === 'hedgehog') {
    ctx.fillStyle = '#151918'
    for (let step = -8; step <= 8; step += 1) {
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
    ctx.arc(centerX, centerY - 3, 21, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(centerX, centerY - 3, 14, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#111716'
    ctx.fillRect(centerX - 14, centerY - 13, 28, 29)
    ctx.fillStyle = '#536761'
    ctx.fillRect(centerX - 10, centerY - 9, 20, 21)
    ctx.fillStyle = '#86f4ff'
    ctx.fillRect(centerX - 4, centerY - 6, 8, 8)
    ctx.fillStyle = '#d84a3f'
    ctx.fillRect(centerX + 6, centerY + 6, 3, 3)
    ctx.fillStyle = '#151918'
    ctx.fillRect(centerX - 18, centerY + 13, 36, 4)
  }

  ctx.restore()
}
