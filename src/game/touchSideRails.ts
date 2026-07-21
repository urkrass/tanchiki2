import { drawBattlefieldTank, getBattlefieldTeamColors, getBattlefieldTeamKey } from './battlefield.ts'
import { drawPixelPortableRelay } from './pixelArt.ts'
import type {
  InputState,
  TankClassId,
  Team,
  TouchHandedness,
  TouchJoystickSnapshot,
  TouchModSliderSnapshot,
} from './types.ts'
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
export const TOUCH_RAIL_RELAY_Y = 244
export const TOUCH_RAIL_RELAY_RADIUS = 30
export const TOUCH_RAIL_RELAY_CONTINUATION_RADIUS = 40
export const TOUCH_RAIL_MOD_SLIDER_TOP_Y = 210
export const TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y = 278
export const TOUCH_RAIL_MOD_SLIDER_KNOB_RADIUS = 21
export const TOUCH_RAIL_MOD_SLIDER_START_RADIUS = 29
export const TOUCH_RAIL_FIRE_RADIUS = 50

const TOUCH_RAIL_CONFIRM_PULSE_MS = 220
let touchRailConfirmPulseStartedAt = Number.NEGATIVE_INFINITY

export type TouchRailSide = 'left' | 'right'
export type TouchRailControl = 'joystick' | 'fire'

export interface TouchSideRailRenderState {
  visible: boolean
  handedness: TouchHandedness
  joystick: TouchJoystickSnapshot
  heldButtons: Partial<InputState>
  confirmBriefing: boolean
  relay: {
    active: boolean
    progress: number | null
    remaining: number
  } | null
  mod: {
    tankClass: TankClassId
    team: Team
    colorSafe: boolean
    slider: TouchModSliderSnapshot
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
    if (state.relay) {
      drawRailRelay(ctx, state.relay)
    }
    drawRailJoystick(ctx, state.joystick, state.confirmBriefing)
  } else {
    if (state.mod) {
      drawRailModSlider(ctx, state.mod)
    }
    drawRailFire(ctx, state.heldButtons.fire === true)
  }
  ctx.restore()
}

export function isTouchRailConfirmPoint(x: number, y: number) {
  return isPointInCircle(x, y, TOUCH_RAIL_CONTROL_X, TOUCH_RAIL_CONTROL_Y, TOUCH_RAIL_CONFIRM_RADIUS)
}

export function pulseTouchRailConfirm() {
  touchRailConfirmPulseStartedAt = performance.now()
}

export function isTouchRailRelayPoint(x: number, y: number, continuation = false) {
  return isPointInCircle(
    x,
    y,
    TOUCH_RAIL_CONTROL_X,
    TOUCH_RAIL_RELAY_Y,
    continuation ? TOUCH_RAIL_RELAY_CONTINUATION_RADIUS : TOUCH_RAIL_RELAY_RADIUS,
  )
}

export function isTouchRailModSliderStartPoint(x: number, y: number) {
  return isPointInCircle(
    x,
    y,
    TOUCH_RAIL_CONTROL_X,
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y,
    TOUCH_RAIL_MOD_SLIDER_START_RADIUS,
  )
}

export function getTouchRailModSliderProgress(y: number) {
  return Math.max(0, Math.min(1, (
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - y
  ) / (
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y
  )))
}

export function isTouchRailFirePoint(x: number, y: number) {
  return isPointInCircle(x, y, TOUCH_RAIL_CONTROL_X, TOUCH_RAIL_CONTROL_Y, TOUCH_RAIL_FIRE_RADIUS)
}

function drawRailJoystick(
  ctx: CanvasRenderingContext2D,
  joystick: TouchJoystickSnapshot,
  confirmBriefing: boolean,
) {
  const confirmPulse = confirmBriefing
    ? Math.max(0, Math.min(1, (performance.now() - touchRailConfirmPulseStartedAt) / TOUCH_RAIL_CONFIRM_PULSE_MS))
    : 1
  const confirmPressDepth = confirmPulse < 1 ? Math.sin(confirmPulse * Math.PI) : 0
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
  if (confirmBriefing && confirmPulse < 1) {
    ctx.save()
    ctx.globalAlpha = (1 - confirmPulse) * 0.7
    ctx.strokeStyle = '#86f4ff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(anchorX, anchorY, TOUCH_RAIL_CONFIRM_RADIUS + 5 + confirmPulse * 9, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    ctx.beginPath()
  }
  ctx.arc(
    confirmBriefing ? anchorX : knobX,
    confirmBriefing ? anchorY : knobY,
    confirmBriefing
      ? TOUCH_RAIL_CONFIRM_RADIUS - confirmPressDepth * 4
      : TOUCH_RAIL_JOYSTICK_KNOB_RADIUS,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.stroke()
  if (confirmBriefing) {
    drawPixelText(ctx, 'NEXT', anchorX, anchorY, {
      align: 'center',
      baseline: 'middle',
      color: confirmPressDepth > 0.15 ? '#ffffff' : '#fff1a5',
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

function drawRailRelay(
  ctx: CanvasRenderingContext2D,
  relay: NonNullable<TouchSideRailRenderState['relay']>,
) {
  const centerX = TOUCH_RAIL_CONTROL_X
  const centerY = TOUCH_RAIL_RELAY_Y
  ctx.globalAlpha = relay.active ? 0.96 : 0.78
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = relay.active ? '#fff1a5' : '#86f4ff'
  ctx.lineWidth = relay.active ? 4 : 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, TOUCH_RAIL_RELAY_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = relay.remaining > 0 ? 0.96 : 0.5
  drawPixelPortableRelay(ctx, centerX - 18, centerY - 18, 36, relay.remaining === 0, performance.now() / 1000)

  if (relay.progress !== null) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#fff1a5'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(
      centerX,
      centerY,
      TOUCH_RAIL_RELAY_RADIUS + 3,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, relay.progress)),
    )
    ctx.stroke()
  }

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, 'RELAY', centerX, centerY + 35, {
    align: 'center',
    color: relay.active ? '#fff1a5' : '#f2ead7',
    maxWidth: 64,
    scale: 1,
  })
}

function drawRailModSlider(
  ctx: CanvasRenderingContext2D,
  mod: NonNullable<TouchSideRailRenderState['mod']>,
) {
  const centerX = TOUCH_RAIL_CONTROL_X
  const progress = Math.max(0, Math.min(1, mod.slider.progress))
  const knobY = TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - (
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y
  ) * progress
  const blocked = progress >= 1 && !mod.slider.activated
  const accent = mod.slider.activated ? '#fff1a5' : blocked ? '#f06243' : '#86f4ff'

  ctx.globalAlpha = 0.82
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = '#7e827c'
  ctx.lineWidth = 2
  ctx.fillRect(centerX - 7, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 2, 14, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y + 4)
  ctx.strokeRect(centerX - 7.5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 2.5, 15, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y + 5)
  ctx.fillStyle = accent
  ctx.fillRect(centerX - 3, knobY, 6, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - knobY)

  ctx.globalAlpha = mod.slider.active || mod.slider.activated ? 0.96 : 0.72
  ctx.strokeStyle = accent
  ctx.lineWidth = mod.slider.active || mod.slider.activated ? 4 : 3
  ctx.fillStyle = mod.slider.activated ? '#4b421f' : '#080b09'
  ctx.beginPath()
  ctx.arc(centerX, knobY, TOUCH_RAIL_MOD_SLIDER_KNOB_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = mod.slider.active || mod.slider.activated ? 1 : 0.88
  drawBattlefieldTank(
    ctx,
    centerX - 16,
    knobY - 16,
    32,
    'up',
    getBattlefieldTeamColors(mod.team, mod.colorSafe),
    {
      frame: Math.floor(performance.now() / 220),
      tankClass: mod.tankClass,
      teamKey: getBattlefieldTeamKey(mod.team, mod.colorSafe),
    },
  )

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, mod.slider.activated ? 'ENGAGED' : blocked ? 'BLOCKED' : 'SLIDE UP', centerX, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 38, {
    align: 'center',
    color: mod.slider.activated ? '#fff1a5' : '#f2ead7',
    maxWidth: 72,
    scale: 1,
  })
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(centerX, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 28)
  ctx.lineTo(centerX - 5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 21)
  ctx.lineTo(centerX + 5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 21)
  ctx.closePath()
  ctx.fill()
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
