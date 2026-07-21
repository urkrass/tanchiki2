import { drawBattlefieldTank, getBattlefieldTeamColors, getBattlefieldTeamKey } from './battlefield.ts'
import type { InputState, TankClassId, Team, TouchHandedness, TouchJoystickSnapshot } from './types.ts'
import { drawPixelText } from './pixelText.ts'
import { drawUiSprite } from './uiAtlas.ts'

export const TOUCH_RAIL_WIDTH = 112
export const TOUCH_RAIL_HEIGHT = 464
export const TOUCH_RAIL_CONTROL_X = TOUCH_RAIL_WIDTH / 2
export const TOUCH_RAIL_CONTROL_Y = 354
export const TOUCH_RAIL_JOYSTICK_BASE_RADIUS = 44
export const TOUCH_RAIL_JOYSTICK_KNOB_RADIUS = 15
export const TOUCH_RAIL_JOYSTICK_MAX_OFFSET = 24
export const TOUCH_RAIL_CONFIRM_RADIUS = 25
export const TOUCH_RAIL_MOD_Y = 244
export const TOUCH_RAIL_MOD_RADIUS = 30
export const TOUCH_RAIL_MOD_CONTINUATION_RADIUS = 40

export type TouchRailSide = 'left' | 'right'
export type TouchRailControl = 'joystick' | 'fire'

export interface TouchSideRailRenderState {
  visible: boolean
  handedness: TouchHandedness
  joystick: TouchJoystickSnapshot
  heldButtons: Partial<InputState>
  confirmBriefing: boolean
  mod: {
    tankClass: TankClassId
    team: Team
    colorSafe: boolean
    progress: number | null
    valid: boolean
  } | null
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
    drawRailJoystick(ctx, state.joystick, state.confirmBriefing)
  } else {
    if (state.mod) {
      drawRailMod(ctx, state.mod, state.heldButtons.mod === true)
    }
    drawRailFire(ctx, state.heldButtons.fire === true)
  }
  ctx.restore()
}

export function isTouchRailConfirmPoint(x: number, y: number) {
  return isPointInCircle(x, y, TOUCH_RAIL_CONTROL_X, TOUCH_RAIL_CONTROL_Y, TOUCH_RAIL_CONFIRM_RADIUS)
}

export function isTouchRailModPoint(x: number, y: number, continuation = false) {
  return isPointInCircle(
    x,
    y,
    TOUCH_RAIL_CONTROL_X,
    TOUCH_RAIL_MOD_Y,
    continuation ? TOUCH_RAIL_MOD_CONTINUATION_RADIUS : TOUCH_RAIL_MOD_RADIUS,
  )
}

function drawRailJoystick(
  ctx: CanvasRenderingContext2D,
  joystick: TouchJoystickSnapshot,
  confirmBriefing: boolean,
) {
  const active = joystick.active && !confirmBriefing
  const anchorX = active ? joystick.anchorX : TOUCH_RAIL_CONTROL_X
  const anchorY = active ? joystick.anchorY : TOUCH_RAIL_CONTROL_Y
  const knobX = anchorX + joystick.offsetX
  const knobY = anchorY + joystick.offsetY

  ctx.globalAlpha = active || confirmBriefing ? 0.9 : 0.72
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = active || confirmBriefing ? '#fff1a5' : '#c8c7bd'
  ctx.lineWidth = active || confirmBriefing ? 4 : 3
  ctx.setLineDash(active || confirmBriefing ? [] : [4, 4])
  ctx.beginPath()
  ctx.arc(anchorX, anchorY, TOUCH_RAIL_JOYSTICK_BASE_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.setLineDash([])

  ctx.globalAlpha = active ? 0.88 : 0.58
  ctx.strokeStyle = active ? '#86f4ff' : '#7e827c'
  ctx.lineWidth = 2
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath()
    ctx.moveTo(anchorX + Math.cos(angle) * 31, anchorY + Math.sin(angle) * 31)
    ctx.lineTo(anchorX + Math.cos(angle) * 39, anchorY + Math.sin(angle) * 39)
    ctx.stroke()
  }

  ctx.globalAlpha = active || confirmBriefing ? 0.96 : 0.72
  ctx.fillStyle = confirmBriefing ? '#4b421f' : active ? '#29312d' : '#202421'
  ctx.strokeStyle = confirmBriefing ? '#fff1a5' : active ? '#dffcff' : '#a6aaa3'
  ctx.lineWidth = active || confirmBriefing ? 3 : 2
  ctx.beginPath()
  ctx.arc(
    confirmBriefing ? anchorX : knobX,
    confirmBriefing ? anchorY : knobY,
    confirmBriefing ? TOUCH_RAIL_CONFIRM_RADIUS : TOUCH_RAIL_JOYSTICK_KNOB_RADIUS,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.stroke()
  if (confirmBriefing) {
    drawPixelText(ctx, 'NEXT', anchorX, anchorY, {
      align: 'center',
      baseline: 'middle',
      color: '#fff1a5',
      maxWidth: 38,
      scale: 1,
    })
  } else {
    ctx.fillStyle = active ? '#86f4ff' : '#60655f'
    ctx.fillRect(Math.round(knobX - 3), Math.round(knobY - 3), 6, 6)
  }

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, confirmBriefing ? 'CONFIRM' : active ? (joystick.direction?.toUpperCase() ?? 'DRAG') : 'MOVE', anchorX, anchorY + 47, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 72,
    scale: 1,
  })
}

function drawRailMod(
  ctx: CanvasRenderingContext2D,
  mod: NonNullable<TouchSideRailRenderState['mod']>,
  active: boolean,
) {
  const centerX = TOUCH_RAIL_CONTROL_X
  const centerY = TOUCH_RAIL_MOD_Y
  const accent = mod.valid ? '#86f4ff' : '#f06243'
  ctx.globalAlpha = active ? 0.94 : 0.78
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = active ? '#fff1a5' : accent
  ctx.lineWidth = active ? 4 : 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, TOUCH_RAIL_MOD_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = active ? 1 : 0.9
  drawBattlefieldTank(
    ctx,
    centerX - 16,
    centerY - 16,
    32,
    'up',
    getBattlefieldTeamColors(mod.team, mod.colorSafe),
    {
      frame: Math.floor(performance.now() / 220),
      tankClass: mod.tankClass,
      teamKey: getBattlefieldTeamKey(mod.team, mod.colorSafe),
    },
  )

  if (mod.progress !== null) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = accent
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(
      centerX,
      centerY,
      TOUCH_RAIL_MOD_RADIUS + 3,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, mod.progress)),
    )
    ctx.stroke()
  }

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, 'MOD', centerX, centerY + 35, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 56,
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
  ctx.arc(centerX, centerY, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = active ? 1 : 0.86
  const size = 56
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
  drawPixelText(ctx, 'FIRE', centerX, centerY + 45, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 64,
    scale: 1,
  })
}

function isPointInCircle(x: number, y: number, centerX: number, centerY: number, radius: number) {
  return Math.hypot(x - centerX, y - centerY) <= radius
}
