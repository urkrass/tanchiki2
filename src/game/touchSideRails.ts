import type { InputState, TouchHandedness, TouchJoystickSnapshot } from './types.ts'
import { drawPixelText } from './pixelText.ts'
import { drawUiSprite } from './uiAtlas.ts'

export const TOUCH_RAIL_WIDTH = 112
export const TOUCH_RAIL_HEIGHT = 464
export const TOUCH_RAIL_CONTROL_X = TOUCH_RAIL_WIDTH / 2
export const TOUCH_RAIL_CONTROL_Y = 354
export const TOUCH_RAIL_JOYSTICK_MAX_OFFSET = 32

export type TouchRailSide = 'left' | 'right'
export type TouchRailControl = 'joystick' | 'fire'

export interface TouchSideRailRenderState {
  visible: boolean
  handedness: TouchHandedness
  joystick: TouchJoystickSnapshot
  heldButtons: Partial<InputState>
}

export function isTabletTouchSideRailActive(
  width: number,
  height: number,
  coarsePointer: boolean,
  force = false,
  minimumTabletWidth = 600,
) {
  return (coarsePointer || force) && width >= minimumTabletWidth && width >= height
}

export function getTouchRailControl(side: TouchRailSide, handedness: TouchHandedness): TouchRailControl {
  if (handedness === 'mirrored') {
    return side === 'left' ? 'fire' : 'joystick'
  }
  return side === 'left' ? 'joystick' : 'fire'
}

export function drawTouchSideRail(
  ctx: CanvasRenderingContext2D,
  side: TouchRailSide,
  state: TouchSideRailRenderState,
) {
  ctx.clearRect(0, 0, TOUCH_RAIL_WIDTH, TOUCH_RAIL_HEIGHT)
  if (!state.visible) return

  ctx.save()
  ctx.imageSmoothingEnabled = false
  const control = getTouchRailControl(side, state.handedness)
  if (control === 'joystick') {
    drawRailJoystick(ctx, state.joystick)
  } else {
    drawRailFire(ctx, state.heldButtons.fire === true)
  }
  ctx.restore()
}

function drawRailJoystick(ctx: CanvasRenderingContext2D, joystick: TouchJoystickSnapshot) {
  const anchorX = joystick.active ? joystick.anchorX : TOUCH_RAIL_CONTROL_X
  const anchorY = joystick.active ? joystick.anchorY : TOUCH_RAIL_CONTROL_Y
  const knobX = anchorX + joystick.offsetX
  const knobY = anchorY + joystick.offsetY
  const active = joystick.active

  ctx.globalAlpha = active ? 0.88 : 0.72
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = active ? '#fff1a5' : '#c8c7bd'
  ctx.lineWidth = active ? 4 : 3
  ctx.setLineDash(active ? [] : [4, 4])
  ctx.beginPath()
  ctx.arc(anchorX, anchorY, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.setLineDash([])

  ctx.globalAlpha = active ? 0.88 : 0.58
  ctx.strokeStyle = active ? '#86f4ff' : '#7e827c'
  ctx.lineWidth = 2
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath()
    ctx.moveTo(anchorX + Math.cos(angle) * 36, anchorY + Math.sin(angle) * 36)
    ctx.lineTo(anchorX + Math.cos(angle) * 46, anchorY + Math.sin(angle) * 46)
    ctx.stroke()
  }

  ctx.globalAlpha = active ? 0.96 : 0.72
  ctx.fillStyle = active ? '#29312d' : '#202421'
  ctx.strokeStyle = active ? '#dffcff' : '#a6aaa3'
  ctx.lineWidth = active ? 3 : 2
  ctx.beginPath()
  ctx.arc(knobX, knobY, 21, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = active ? '#86f4ff' : '#60655f'
  ctx.fillRect(Math.round(knobX - 3), Math.round(knobY - 3), 6, 6)

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, active ? (joystick.direction?.toUpperCase() ?? 'DRAG') : 'MOVE', anchorX, anchorY + 53, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 72,
    scale: 1,
  })
}

function drawRailFire(ctx: CanvasRenderingContext2D, active: boolean) {
  const centerX = TOUCH_RAIL_CONTROL_X
  const centerY = TOUCH_RAIL_CONTROL_Y
  ctx.globalAlpha = active ? 0.9 : 0.74
  ctx.fillStyle = active ? '#564b24' : '#050705'
  ctx.strokeStyle = active ? '#ffd35a' : '#d8d4c8'
  ctx.lineWidth = active ? 4 : 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, 46, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = active ? 1 : 0.86
  const size = 64
  const drew = drawUiSprite(ctx, 'touch.fire', centerX - size / 2, centerY - size / 2, {
    width: size,
    height: size,
    sheet: 'ui32',
  })
  if (!drew) {
    ctx.fillStyle = '#b63126'
    ctx.fillRect(centerX - 19, centerY - 19, 38, 38)
    ctx.fillStyle = '#f06243'
    ctx.fillRect(centerX - 12, centerY - 12, 24, 24)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(centerX - 4, centerY - 4, 8, 8)
  }

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, 'FIRE', centerX, centerY + 47, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 64,
    scale: 1,
  })
}
