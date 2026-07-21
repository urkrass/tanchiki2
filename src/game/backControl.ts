import { drawPixelText } from './pixelText.ts'
import type { GameMode } from './types.ts'

export const BACK_CONTROL_BOUNDS = {
  x: 3,
  y: 428,
  width: 42,
  height: 32,
} as const

export function isBackControlAvailable(mode: GameMode) {
  return mode !== 'main-menu'
}

export function isBackControlPoint(x: number, y: number) {
  return x >= BACK_CONTROL_BOUNDS.x
    && x <= BACK_CONTROL_BOUNDS.x + BACK_CONTROL_BOUNDS.width
    && y >= BACK_CONTROL_BOUNDS.y
    && y <= BACK_CONTROL_BOUNDS.y + BACK_CONTROL_BOUNDS.height
}

export function drawBackControl(ctx: CanvasRenderingContext2D) {
  const { x, y, width, height } = BACK_CONTROL_BOUNDS
  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.fillStyle = '#090b09'
  ctx.strokeStyle = '#d8d4c8'
  ctx.lineWidth = 2
  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)

  ctx.strokeStyle = '#fff1a5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 9, y + 10)
  ctx.lineTo(x + 5, y + 16)
  ctx.lineTo(x + 9, y + 22)
  ctx.stroke()

  drawPixelText(ctx, 'BACK', x + 25, y + 16, {
    align: 'center',
    baseline: 'middle',
    color: '#f2ead7',
    maxWidth: 28,
    scale: 1,
  })
  ctx.restore()
}
