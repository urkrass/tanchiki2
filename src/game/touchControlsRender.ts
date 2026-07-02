import { drawPixelText } from './pixelText.ts'
import { drawUiSprite, type UiSpriteId } from './uiAtlas.ts'
import {
  TOUCH_DPAD,
  TOUCH_FIRE,
  TOUCH_PAUSE,
  TOUCH_RELAY,
  type TouchControlButton,
} from './touchControls.ts'
import type { Direction, InputState } from './types.ts'

type HeldButtons = Partial<Pick<InputState, TouchControlButton>>

interface TouchControlsRenderOptions {
  pause?: boolean
}

export function drawTouchControlsOverlay(
  ctx: CanvasRenderingContext2D,
  heldButtons: HeldButtons,
  options: TouchControlsRenderOptions = {},
) {
  const showPause = options.pause ?? false

  ctx.save()
  drawDpadPlates(ctx, heldButtons)
  drawFirePlate(ctx, heldButtons.fire === true)
  drawRelayPlate(ctx, heldButtons.relay === true)
  if (showPause) {
    drawPausePlate(ctx)
  }

  const drewSprites = drawTouchSprites(ctx, heldButtons, showPause)
  if (!drewSprites) {
    drawFallbackControls(ctx, showPause)
  }

  drawTouchLabels(ctx, heldButtons, showPause)
  ctx.restore()
}

function drawDpadPlates(ctx: CanvasRenderingContext2D, heldButtons: HeldButtons) {
  drawTouchPlate(ctx, TOUCH_DPAD.up.x - 4, TOUCH_DPAD.up.y - 4, 50, 50, heldButtons.up === true)
  drawTouchPlate(ctx, TOUCH_DPAD.down.x - 4, TOUCH_DPAD.down.y - 4, 50, 50, heldButtons.down === true)
  drawTouchPlate(ctx, TOUCH_DPAD.left.x - 4, TOUCH_DPAD.left.y - 4, 50, 50, heldButtons.left === true)
  drawTouchPlate(ctx, TOUCH_DPAD.right.x - 4, TOUCH_DPAD.right.y - 4, 50, 50, heldButtons.right === true)
}

function drawFirePlate(ctx: CanvasRenderingContext2D, active: boolean) {
  ctx.save()
  ctx.globalAlpha = active ? 0.74 : 0.46
  ctx.fillStyle = active ? '#ffd35a' : '#050705'
  ctx.strokeStyle = active ? '#fff1a5' : '#d8d4c8'
  ctx.lineWidth = active ? 4 : 3
  ctx.beginPath()
  ctx.arc(TOUCH_FIRE.centerX, TOUCH_FIRE.centerY, active ? 43 : 40, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = active ? 0.92 : 0.42
  ctx.strokeStyle = '#050505'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(TOUCH_FIRE.centerX, TOUCH_FIRE.centerY, 31, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawRelayPlate(ctx: CanvasRenderingContext2D, active: boolean) {
  drawTouchPlate(
    ctx,
    TOUCH_RELAY.iconX - 4,
    TOUCH_RELAY.iconY - 4,
    TOUCH_RELAY.iconSize + 8,
    TOUCH_RELAY.iconSize + 8,
    active,
  )
}

function drawPausePlate(ctx: CanvasRenderingContext2D) {
  drawTouchPlate(ctx, TOUCH_PAUSE.iconX - 7, TOUCH_PAUSE.iconY - 7, TOUCH_PAUSE.iconSize + 14, TOUCH_PAUSE.iconSize + 14, false)
}

function drawTouchPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
) {
  ctx.save()
  ctx.globalAlpha = active ? 0.68 : 0.4
  ctx.fillStyle = active ? '#ffd35a' : '#050705'
  ctx.fillRect(x, y, width, height)
  ctx.globalAlpha = active ? 0.9 : 0.48
  ctx.strokeStyle = active ? '#fff1a5' : '#d8d4c8'
  ctx.lineWidth = active ? 3 : 2
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)

  if (active) {
    ctx.fillStyle = '#fff1a5'
    ctx.fillRect(x + 6, y + 6, width - 12, 3)
  }

  ctx.restore()
}

function drawTouchSprites(ctx: CanvasRenderingContext2D, heldButtons: HeldButtons, showPause: boolean) {
  const drewDpad =
    drawTouchSprite(ctx, 'touch.up', TOUCH_DPAD.up.x, TOUCH_DPAD.up.y, TOUCH_DPAD.iconSize, heldButtons.up === true) &&
    drawTouchSprite(ctx, 'touch.down', TOUCH_DPAD.down.x, TOUCH_DPAD.down.y, TOUCH_DPAD.iconSize, heldButtons.down === true) &&
    drawTouchSprite(ctx, 'touch.left', TOUCH_DPAD.left.x, TOUCH_DPAD.left.y, TOUCH_DPAD.iconSize, heldButtons.left === true) &&
    drawTouchSprite(ctx, 'touch.right', TOUCH_DPAD.right.x, TOUCH_DPAD.right.y, TOUCH_DPAD.iconSize, heldButtons.right === true)
  const drewFire = drawTouchSprite(ctx, 'touch.fire', TOUCH_FIRE.iconX, TOUCH_FIRE.iconY, TOUCH_FIRE.iconSize, heldButtons.fire === true)
  const drewPause = !showPause || drawTouchSprite(ctx, 'touch.pause', TOUCH_PAUSE.iconX, TOUCH_PAUSE.iconY, TOUCH_PAUSE.iconSize, false)

  drawRelayIcon(ctx, heldButtons.relay === true)

  return drewDpad && drewFire && drewPause
}

function drawTouchSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: UiSpriteId,
  x: number,
  y: number,
  size: number,
  active: boolean,
) {
  ctx.save()
  ctx.globalAlpha = active ? 0.96 : 0.7
  const drew = drawUiSprite(ctx, spriteId, x, y, { width: size, height: size, sheet: 'ui32' })
  ctx.restore()

  return drew
}

function drawFallbackControls(ctx: CanvasRenderingContext2D, showPause: boolean) {
  ctx.save()
  ctx.fillStyle = '#f2ead7'
  ctx.strokeStyle = '#050505'
  ctx.lineWidth = 2
  drawTouchArrow(ctx, TOUCH_DPAD.up.centerX, TOUCH_DPAD.up.centerY, 'up')
  drawTouchArrow(ctx, TOUCH_DPAD.down.centerX, TOUCH_DPAD.down.centerY, 'down')
  drawTouchArrow(ctx, TOUCH_DPAD.left.centerX, TOUCH_DPAD.left.centerY, 'left')
  drawTouchArrow(ctx, TOUCH_DPAD.right.centerX, TOUCH_DPAD.right.centerY, 'right')
  ctx.beginPath()
  ctx.arc(TOUCH_FIRE.centerX, TOUCH_FIRE.centerY, 31, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#050505'
  ctx.fillRect(TOUCH_FIRE.centerX - 9, TOUCH_FIRE.centerY - 4, 18, 8)
  drawRelayIcon(ctx, false)

  if (showPause) {
    ctx.fillStyle = '#f2ead7'
    ctx.fillRect(TOUCH_PAUSE.iconX + 6, TOUCH_PAUSE.iconY + 4, 10, 24)
    ctx.fillRect(TOUCH_PAUSE.iconX + 24, TOUCH_PAUSE.iconY + 4, 10, 24)
  }

  ctx.restore()
}

function drawTouchLabels(ctx: CanvasRenderingContext2D, heldButtons: HeldButtons, showPause: boolean) {
  ctx.save()
  ctx.globalAlpha = 0.82
  drawPixelText(ctx, 'MOVE', TOUCH_DPAD.centerX, TOUCH_DPAD.hitY + TOUCH_DPAD.hitHeight - 2, {
    align: 'center',
    color: heldButtons.up || heldButtons.down || heldButtons.left || heldButtons.right ? '#fff1a5' : '#f2ead7',
    maxWidth: 56,
    scale: 1,
  })
  drawPixelText(ctx, 'FIRE', TOUCH_FIRE.centerX, TOUCH_FIRE.centerY + 39, {
    align: 'center',
    color: heldButtons.fire ? '#fff1a5' : '#f2ead7',
    maxWidth: 52,
    scale: 1,
  })
  drawPixelText(ctx, 'RELAY', TOUCH_RELAY.centerX, TOUCH_RELAY.centerY + 31, {
    align: 'center',
    color: heldButtons.relay ? '#fff1a5' : '#f2ead7',
    maxWidth: 58,
    scale: 1,
  })
  if (showPause) {
    drawPixelText(ctx, 'PAUSE', TOUCH_PAUSE.iconX + TOUCH_PAUSE.iconSize / 2, TOUCH_PAUSE.hitY + 2, {
      align: 'center',
      color: '#f2ead7',
      maxWidth: 52,
      scale: 1,
    })
  }
  ctx.restore()
}

function drawRelayIcon(ctx: CanvasRenderingContext2D, active: boolean) {
  const x = TOUCH_RELAY.iconX
  const y = TOUCH_RELAY.iconY
  ctx.save()
  ctx.globalAlpha = active ? 0.96 : 0.74
  ctx.fillStyle = '#f2ead7'
  ctx.strokeStyle = '#050505'
  ctx.lineWidth = 2
  ctx.fillRect(x + 19, y + 28, 10, 9)
  ctx.strokeRect(x + 18, y + 27, 12, 11)
  ctx.fillRect(x + 23, y + 12, 3, 17)
  ctx.beginPath()
  ctx.arc(x + 24, y + 13, 8, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + 24, y + 13, 15, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()
  ctx.fillStyle = active ? '#fff1a5' : '#ffd35a'
  ctx.fillRect(x + 22, y + 30, 4, 4)
  ctx.restore()
}

function drawTouchArrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(directionAngle(direction))
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

function directionAngle(direction: Direction) {
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
