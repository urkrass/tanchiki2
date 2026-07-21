import { drawMajorModIcon } from './majorModVisual.ts'
import { drawPixelDeployable, drawPixelPortableRelay } from './pixelArt.ts'
import type {
  InputState,
  MajorModKind,
  MajorModsSnapshot,
  OfflineDeployableKind,
  OfflineDeployablesSnapshot,
  RunKind,
  TouchHandedness,
  TouchJoystickSnapshot,
  TouchModSliderSnapshot,
  TutorialSnapshot,
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
export const TOUCH_RAIL_FIRE_X = 34
export const TOUCH_RAIL_FIRE_RADIUS = 38
export const TOUCH_RAIL_MOD_SLIDER_X = 84
export const TOUCH_RAIL_MOD_SLIDER_TOP_Y = 322
export const TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y = 376
export const TOUCH_RAIL_MOD_SLIDER_KNOB_RADIUS = 16
export const TOUCH_RAIL_MOD_SLIDER_START_RADIUS = 22
export const TOUCH_RAIL_GEAR_Y = 244
export const TOUCH_RAIL_GEAR_X = [15, 53] as const
export const TOUCH_RAIL_GEAR_RADIUS = 18
export const TOUCH_RAIL_GEAR_CONTINUATION_RADIUS = 26

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
    kind: MajorModKind
    status: 'ready' | 'active' | 'cooldown' | 'placed' | 'spent'
    statusRemaining: number
    cooldownProgress: number
    slider: TouchModSliderSnapshot
  } | null
  gear: Array<{
    kind: OfflineDeployableKind
    label: string
    state: 'ready' | 'hold' | 'out'
    progress: number | null
    pressed: boolean
  }>
}

const TOUCH_RAIL_GEAR_LABELS: Partial<Record<OfflineDeployableKind, string>> = {
  decoy: 'DECOY',
  mine: 'MINE',
  steel: 'TRAP',
  tripwire: 'WIRE',
}

export function getTouchRailGearState(
  deployables: OfflineDeployablesSnapshot,
  heldButtons: Partial<InputState>,
): TouchSideRailRenderState['gear'] {
  return getDisplayedTouchRailGearKinds(deployables.available).map((kind) => {
    const label = TOUCH_RAIL_GEAR_LABELS[kind]
    const hold = deployables.hold?.kind === kind ? deployables.hold : null
    const deployed = deployables.active.some((deployable) => deployable.kind === kind)
    return {
      kind,
      label: label ?? kind.toUpperCase(),
      state: hold ? 'hold' : deployed ? 'out' : 'ready',
      progress: hold ? Math.max(0, Math.min(1, hold.progress)) : null,
      pressed: heldButtons[kind] === true,
    }
  })
}

export function getTouchRailModState(
  mods: MajorModsSnapshot,
  slider: TouchModSliderSnapshot,
): NonNullable<TouchSideRailRenderState['mod']> {
  const kind = mods.selected
  if (kind === 'overdrive') {
    const status = mods.overdrive.active
      ? 'active'
      : mods.overdrive.cooldown > 0
        ? 'cooldown'
        : 'ready'
    return {
      kind,
      status,
      statusRemaining: status === 'active' ? mods.overdrive.remaining : mods.overdrive.cooldown,
      cooldownProgress: status === 'cooldown'
        ? Math.max(0, Math.min(1, 1 - mods.overdrive.cooldown / mods.overdrive.rechargeDuration))
        : status === 'ready' ? 1 : 0,
      slider,
    }
  }

  if (kind === 'pontoon') {
    return {
      kind,
      status: mods.pontoon.active ? 'placed' : 'ready',
      statusRemaining: 0,
      cooldownProgress: mods.pontoon.active ? 1 : 0,
      slider,
    }
  }

  if (kind === 'hedgehog') {
    const status = mods.hedgehog.active ? 'placed' : mods.hedgehog.spent ? 'spent' : 'ready'
    return {
      kind,
      status,
      statusRemaining: 0,
      cooldownProgress: status === 'ready' ? 0 : 1,
      slider,
    }
  }

  return {
    kind,
    status: mods.emp.active ? 'placed' : 'ready',
    statusRemaining: 0,
    cooldownProgress: mods.emp.active ? 1 : 0,
    slider,
  }
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

export function isTouchRailBriefingOnly(
  runKind: RunKind,
  tutorial: Pick<TutorialSnapshot, 'active' | 'dialogue' | 'playerControlHeld'>,
) {
  return runKind === 'tutorial'
    && tutorial.active
    && Boolean(tutorial.dialogue)
    && tutorial.playerControlHeld
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
    if (state.gear.length > 0) {
      drawRailGear(ctx, state.gear)
    }
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

export function getTouchRailGearKindAt(
  x: number,
  y: number,
  kinds: readonly OfflineDeployableKind[],
  continuation = false,
) {
  const radius = continuation ? TOUCH_RAIL_GEAR_CONTINUATION_RADIUS : TOUCH_RAIL_GEAR_RADIUS
  const displayedKinds = getDisplayedTouchRailGearKinds(kinds)
  for (let index = 0; index < displayedKinds.length; index += 1) {
    if (isPointInCircle(x, y, TOUCH_RAIL_GEAR_X[index], TOUCH_RAIL_GEAR_Y, radius)) {
      return displayedKinds[index]
    }
  }
  return null
}

function getDisplayedTouchRailGearKinds(kinds: readonly OfflineDeployableKind[]) {
  return kinds
    .filter((kind) => TOUCH_RAIL_GEAR_LABELS[kind] !== undefined)
    .slice(0, TOUCH_RAIL_GEAR_X.length)
}

export function isTouchRailModSliderStartPoint(x: number, y: number) {
  return isPointInCircle(
    x,
    y,
    TOUCH_RAIL_MOD_SLIDER_X,
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
  return isPointInCircle(x, y, TOUCH_RAIL_FIRE_X, TOUCH_RAIL_CONTROL_Y, TOUCH_RAIL_FIRE_RADIUS)
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
  const centerX = TOUCH_RAIL_MOD_SLIDER_X
  const gestureProgress = Math.max(0, Math.min(1, mod.slider.progress))
  const showingGesture = mod.slider.active || gestureProgress > 0
  const runtimeFill = mod.status === 'cooldown'
    ? mod.cooldownProgress
    : mod.status === 'active' || mod.status === 'placed' || mod.status === 'spent'
      ? 1
      : 0
  const fillProgress = showingGesture ? gestureProgress : runtimeFill
  const knobProgress = showingGesture
    ? gestureProgress
    : mod.status === 'active' || mod.status === 'placed' || mod.status === 'spent'
      ? 1
      : 0
  const knobY = TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - (
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y
  ) * knobProgress
  const fillY = TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - (
    TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y
  ) * fillProgress
  const blocked = showingGesture && gestureProgress >= 1 && !mod.slider.activated
  const accent = mod.slider.activated
    ? '#fff1a5'
    : blocked
      ? '#f06243'
      : mod.status === 'active'
        ? '#ffd35a'
        : mod.status === 'placed'
          ? '#9bea83'
          : mod.status === 'spent'
            ? '#7e827c'
            : '#86f4ff'

  ctx.globalAlpha = 0.82
  ctx.fillStyle = '#080b09'
  ctx.strokeStyle = '#7e827c'
  ctx.lineWidth = 2
  ctx.fillRect(centerX - 7, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 2, 14, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y + 4)
  ctx.strokeRect(centerX - 7.5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 2.5, 15, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - TOUCH_RAIL_MOD_SLIDER_TOP_Y + 5)
  ctx.fillStyle = accent
  ctx.fillRect(centerX - 3, fillY, 6, TOUCH_RAIL_MOD_SLIDER_BOTTOM_Y - fillY)

  ctx.globalAlpha = mod.slider.active || mod.slider.activated ? 0.96 : 0.72
  ctx.strokeStyle = accent
  ctx.lineWidth = mod.slider.active || mod.slider.activated ? 4 : 3
  ctx.fillStyle = mod.slider.activated ? '#4b421f' : '#080b09'
  ctx.beginPath()
  ctx.arc(centerX, knobY, TOUCH_RAIL_MOD_SLIDER_KNOB_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = mod.slider.active || mod.slider.activated ? 1 : 0.88
  drawMajorModIcon(
    ctx,
    mod.kind,
    centerX - 16,
    knobY - 16,
    32,
    { focused: mod.status === 'ready' || mod.slider.active, symbolOnly: true },
  )

  const seconds = Math.max(1, Math.ceil(mod.statusRemaining))
  const label = blocked
    ? 'BLOCKED'
    : mod.status === 'active'
      ? `ACTIVE ${seconds}s`
      : mod.status === 'cooldown'
        ? `CD ${seconds}s`
        : mod.status === 'placed'
          ? 'DEPLOYED'
          : mod.status === 'spent'
            ? 'SPENT'
            : 'SLIDE UP'
  ctx.globalAlpha = 0.96
  drawPixelText(ctx, label, centerX, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 21, {
    align: 'center',
    color: accent,
    maxWidth: 58,
    scale: 1,
  })
  if (mod.status === 'ready' || mod.slider.active) {
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.moveTo(centerX, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 14)
    ctx.lineTo(centerX - 5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 7)
    ctx.lineTo(centerX + 5, TOUCH_RAIL_MOD_SLIDER_TOP_Y - 7)
    ctx.closePath()
    ctx.fill()
  }
}

function drawRailGear(
  ctx: CanvasRenderingContext2D,
  gear: TouchSideRailRenderState['gear'],
) {
  ctx.globalAlpha = 0.9
  drawPixelText(ctx, 'CLASS KIT', TOUCH_RAIL_FIRE_X, 204, {
    align: 'center',
    color: '#f2ead7',
    maxWidth: 66,
    scale: 1,
  })

  gear.forEach((item, index) => {
    const centerX = TOUCH_RAIL_GEAR_X[index]
    const active = item.pressed || item.state === 'hold'
    const accent = active ? '#fff1a5' : item.state === 'out' ? '#7e827c' : '#86f4ff'
    ctx.globalAlpha = active ? 0.96 : 0.76
    ctx.fillStyle = active ? '#4b421f' : '#080b09'
    ctx.strokeStyle = accent
    ctx.lineWidth = active ? 4 : 3
    ctx.beginPath()
    ctx.arc(centerX, TOUCH_RAIL_GEAR_Y, TOUCH_RAIL_GEAR_RADIUS - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.globalAlpha = item.state === 'out' ? 0.48 : 0.94
    drawPixelDeployable(
      ctx,
      item.kind,
      centerX - 16,
      TOUCH_RAIL_GEAR_Y - 16,
      32,
      item.state !== 'out',
    )

    if (item.progress !== null) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#fff1a5'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(
        centerX,
        TOUCH_RAIL_GEAR_Y,
        TOUCH_RAIL_GEAR_RADIUS + 2,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * item.progress,
      )
      ctx.stroke()
    }

    ctx.globalAlpha = 0.96
    drawPixelText(ctx, item.label, centerX, TOUCH_RAIL_GEAR_Y + 29, {
      align: 'center',
      color: accent,
      maxWidth: 48,
      scale: 1,
    })
    drawPixelText(ctx, item.state === 'out' ? 'OUT' : item.state === 'hold' ? 'HOLD' : 'READY', centerX, TOUCH_RAIL_GEAR_Y + 41, {
      align: 'center',
      color: item.state === 'out' ? '#a6aaa3' : '#f2ead7',
      maxWidth: 44,
      scale: 1,
    })
  })
}

function drawRailFire(ctx: CanvasRenderingContext2D, active: boolean) {
  const centerX = TOUCH_RAIL_FIRE_X
  const centerY = TOUCH_RAIL_CONTROL_Y
  ctx.globalAlpha = active ? 0.9 : 0.74
  ctx.fillStyle = active ? '#564b24' : '#050705'
  ctx.strokeStyle = active ? '#ffd35a' : '#d8d4c8'
  ctx.lineWidth = active ? 4 : 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = active ? 1 : 0.86
  const size = 42
  const drew = drawUiSprite(ctx, 'touch.fire', centerX - size / 2, centerY - size / 2, {
    width: size,
    height: size,
    sheet: 'ui32',
  })
  if (!drew) {
    ctx.fillStyle = '#b63126'
    ctx.fillRect(centerX - 16, centerY - 16, 32, 32)
    ctx.fillStyle = '#f06243'
    ctx.fillRect(centerX - 10, centerY - 10, 20, 20)
    ctx.fillStyle = '#ffd35a'
    ctx.fillRect(centerX - 4, centerY - 4, 8, 8)
  }

  ctx.globalAlpha = 0.96
  drawPixelText(ctx, 'FIRE', centerX, centerY + 42, {
    align: 'center',
    color: active ? '#fff1a5' : '#f2ead7',
    maxWidth: 64,
    scale: 1,
  })
}

function isPointInCircle(x: number, y: number, centerX: number, centerY: number, radius: number) {
  return Math.hypot(x - centerX, y - centerY) <= radius
}
