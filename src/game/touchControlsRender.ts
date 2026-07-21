import { drawMajorModIcon } from './majorModVisual.ts'
import { drawPixelPortableRelay } from './pixelArt.ts'
import { drawPixelText } from './pixelText.ts'
import {
  resolveTouchControlLayout,
  type TouchCircle,
} from './touchControls.ts'
import { drawUiSprite } from './uiAtlas.ts'
import type {
  InputState,
  MajorModsSnapshot,
  PortableRelaySnapshot,
  TankClassId,
  TouchHandedness,
  TouchJoystickSnapshot,
  TouchModConfirmationSnapshot,
} from './types.ts'

type HeldButtons = Partial<InputState>

export interface TouchControlsRenderOptions {
  pause?: boolean
  handedness?: TouchHandedness
  joystick?: TouchJoystickSnapshot
  relay?: PortableRelaySnapshot
  majorMods?: MajorModsSnapshot
  modConfirmation?: TouchModConfirmationSnapshot | null
  playerClass?: TankClassId
  time?: number
  actions?: boolean
}

export function drawTouchControlsOverlay(
  ctx: CanvasRenderingContext2D,
  heldButtons: HeldButtons,
  options: TouchControlsRenderOptions = {},
) {
  const layout = resolveTouchControlLayout(options.handedness)
  const joystick = options.joystick ?? {
    active: false,
    anchorX: layout.joystick.defaultCenterX,
    anchorY: layout.joystick.defaultCenterY,
    offsetX: 0,
    offsetY: 0,
    direction: null,
  }
  const showActions = options.actions ?? true

  ctx.save()
  drawFloatingJoystick(ctx, layout.joystick.baseRadius, layout.joystick.knobRadius, joystick)
  drawFireButton(ctx, layout.fire, heldButtons.fire === true)

  if (showActions && options.relay && options.majorMods) {
    drawRelayButton(ctx, layout.relay, options.relay, heldButtons.relay === true, options.time ?? 0)
    drawModButton(
      ctx,
      layout.mod,
      options.majorMods,
      options.modConfirmation ?? null,
      heldButtons.mod === true,
      options.playerClass,
    )
  }

  if (options.pause) {
    drawPauseButton(ctx, layout.pause.iconX, layout.pause.iconY, layout.pause.iconSize)
  }
  ctx.restore()
}

function drawFloatingJoystick(
  ctx: CanvasRenderingContext2D,
  baseRadius: number,
  knobRadius: number,
  joystick: TouchJoystickSnapshot,
) {
  const x = joystick.anchorX
  const y = joystick.anchorY
  const knobX = x + joystick.offsetX
  const knobY = y + joystick.offsetY

  ctx.save()
  ctx.globalAlpha = joystick.active ? 0.72 : 0.5
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = joystick.active ? '#fff1a5' : '#c8c7bd'
  ctx.lineWidth = joystick.active ? 3 : 2
  ctx.setLineDash(joystick.active ? [] : [3, 3])
  ctx.beginPath()
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.setLineDash([])

  ctx.globalAlpha = joystick.active ? 0.82 : 0.38
  ctx.strokeStyle = joystick.active ? '#86f4ff' : '#7e827c'
  ctx.lineWidth = 2
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * (baseRadius - 10), y + Math.sin(angle) * (baseRadius - 10))
    ctx.lineTo(x + Math.cos(angle) * (baseRadius - 3), y + Math.sin(angle) * (baseRadius - 3))
    ctx.stroke()
  }

  ctx.globalAlpha = joystick.active ? 0.9 : 0.56
  ctx.fillStyle = joystick.active ? '#29312d' : '#202421'
  ctx.strokeStyle = joystick.active ? '#dffcff' : '#a6aaa3'
  ctx.lineWidth = joystick.active ? 3 : 2
  ctx.beginPath()
  ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = joystick.active ? '#86f4ff' : '#60655f'
  ctx.fillRect(Math.round(knobX - 3), Math.round(knobY - 3), 6, 6)
  ctx.globalAlpha = 0.88
  drawPixelText(ctx, joystick.active ? (joystick.direction?.toUpperCase() ?? 'DRAG') : 'MOVE', x, y + baseRadius - 2, {
    align: 'center',
    color: joystick.active ? '#fff1a5' : '#f2ead7',
    maxWidth: 68,
    scale: 1,
  })
  ctx.restore()
}

function drawFireButton(ctx: CanvasRenderingContext2D, circle: TouchCircle, active: boolean) {
  drawCircularPlate(ctx, circle, active, active ? '#ffd35a' : '#d8d4c8')
  ctx.save()
  ctx.globalAlpha = active ? 0.98 : 0.78
  const size = circle.iconSize
  const drew = drawUiSprite(ctx, 'touch.fire', circle.centerX - size / 2, circle.centerY - size / 2, {
    width: size,
    height: size,
    sheet: 'ui32',
  })
  if (!drew) {
    ctx.fillStyle = '#b63126'
    ctx.fillRect(circle.centerX - 19, circle.centerY - 19, 38, 38)
    ctx.fillStyle = '#f06243'
    ctx.fillRect(circle.centerX - 12, circle.centerY - 12, 24, 24)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(circle.centerX - 4, circle.centerY - 4, 8, 8)
  }
  ctx.restore()
  drawActionLabel(ctx, 'FIRE', circle.centerX, circle.centerY + circle.hitRadius - 1, active)
}

function drawRelayButton(
  ctx: CanvasRenderingContext2D,
  circle: TouchCircle,
  relay: PortableRelaySnapshot,
  active: boolean,
  time: number,
) {
  drawCircularPlate(ctx, circle, active, '#d8d4c8')
  const size = circle.iconSize
  drawPixelPortableRelay(
    ctx,
    circle.centerX - size / 2,
    circle.centerY - size / 2 - 1,
    size,
    relay.deployed,
    time,
  )
  if (relay.hold) {
    drawProgressRing(ctx, circle, relay.hold.progress, '#ffd35a')
  }
  drawPixelText(ctx, String(Math.max(0, relay.limit - relay.activeCount)), circle.centerX + 17, circle.centerY + 12, {
    align: 'center',
    color: '#bff0a2',
    maxWidth: 12,
    scale: 1,
  })
  drawActionLabel(ctx, 'RELAY', circle.centerX, circle.centerY + circle.hitRadius - 1, active)
}

function drawModButton(
  ctx: CanvasRenderingContext2D,
  circle: TouchCircle,
  majorMods: MajorModsSnapshot,
  confirmation: TouchModConfirmationSnapshot | null,
  active: boolean,
  playerClass?: TankClassId,
) {
  const ready = isSelectedModReady(majorMods)
  drawCircularPlate(ctx, circle, active, ready ? '#86f4ff' : '#8d938b')
  const size = circle.iconSize
  drawMajorModIcon(ctx, majorMods.selected, circle.centerX - size / 2, circle.centerY - size / 2, size, {
    focused: active || ready,
    tankClass: playerClass,
  })
  if (confirmation) {
    drawProgressRing(ctx, circle, confirmation.progress, confirmation.valid ? '#86f4ff' : '#f06243')
  } else if (!ready) {
    ctx.save()
    ctx.globalAlpha = 0.58
    ctx.strokeStyle = '#5a5d58'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(circle.centerX, circle.centerY, circle.hitRadius - 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  drawActionLabel(ctx, 'MOD', circle.centerX, circle.centerY + circle.hitRadius - 1, active)
}

function drawPauseButton(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.globalAlpha = 0.74
  ctx.fillStyle = '#050705'
  ctx.strokeStyle = '#d8d4c8'
  ctx.lineWidth = 2
  ctx.fillRect(x - 7, y - 7, size + 14, size + 14)
  ctx.strokeRect(x - 6.5, y - 6.5, size + 13, size + 13)
  const drew = drawUiSprite(ctx, 'touch.pause', x, y, { width: size, height: size, sheet: 'ui32' })
  if (!drew) {
    ctx.fillStyle = '#f2ead7'
    ctx.fillRect(x + 7, y + 7, 8, 24)
    ctx.fillRect(x + 25, y + 7, 8, 24)
  }
  drawPixelText(ctx, 'PAUSE', x + size / 2, y - 12, {
    align: 'center',
    color: '#f2ead7',
    maxWidth: 52,
    scale: 1,
  })
  ctx.restore()
}

function drawCircularPlate(ctx: CanvasRenderingContext2D, circle: TouchCircle, active: boolean, accent: string) {
  ctx.save()
  ctx.globalAlpha = active ? 0.75 : 0.5
  ctx.fillStyle = active ? '#564b24' : '#050705'
  ctx.strokeStyle = accent
  ctx.lineWidth = active ? 4 : 3
  ctx.beginPath()
  ctx.arc(circle.centerX, circle.centerY, circle.hitRadius - 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = active ? 0.76 : 0.34
  ctx.strokeStyle = '#050505'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(circle.centerX, circle.centerY, circle.hitRadius - 12, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawProgressRing(ctx: CanvasRenderingContext2D, circle: TouchCircle, progress: number, color: string) {
  ctx.save()
  ctx.globalAlpha = 0.96
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(
    circle.centerX,
    circle.centerY,
    circle.hitRadius - 2,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, progress)),
  )
  ctx.stroke()
  ctx.restore()
}

function drawActionLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, active: boolean) {
  ctx.save()
  ctx.globalAlpha = 0.9
  drawPixelText(ctx, label, x, y, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 58,
    scale: 1,
  })
  ctx.restore()
}

function isSelectedModReady(mods: MajorModsSnapshot) {
  if (mods.selected === 'overdrive') return mods.overdrive.ready
  if (mods.selected === 'pontoon') return !mods.pontoon.active
  if (mods.selected === 'hedgehog') return !mods.hedgehog.active && !mods.hedgehog.spent
  return !mods.emp.active
}
