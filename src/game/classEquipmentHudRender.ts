import {
  type ClassEquipmentHudModel,
  type ClassEquipmentHudSlot,
  type ClassEquipmentHudSlotState,
} from './classEquipmentHud.ts'
import { drawClassEquipmentIcon } from './classEquipmentVisual.ts'
import { drawPixelText } from './pixelText.ts'

const HUD_INK = '#252820'
const HUD_DANGER = '#7b1e18'

export interface ClassEquipmentHudRenderOptions {
  time?: number
  teamColor?: string
  background?: string
}

export interface ClassEquipmentHudLayoutSlot {
  slot: ClassEquipmentHudSlot
  x: number
  width: number
}

export function getClassEquipmentHudLayout(model: ClassEquipmentHudModel, width: number) {
  const safeWidth = Math.max(240, Math.floor(width))
  const compact = model.slots.length > 4
  const ammoWidth = model.slots.length === 1
    ? safeWidth
    : compact
      ? Math.max(112, Math.min(132, safeWidth - 240))
      : model.slots.length <= 3
        ? Math.min(188, safeWidth - 180)
        : Math.min(154, safeWidth - 228)
  const equipmentWidth = (safeWidth - ammoWidth) / Math.max(1, model.slots.length - 1)
  const slots: ClassEquipmentHudLayoutSlot[] = model.slots.map((slot, index) => ({
    slot,
    x: index === 0 ? 0 : ammoWidth + (index - 1) * equipmentWidth,
    width: index === 0 ? ammoWidth : equipmentWidth,
  }))
  return { width: safeWidth, height: 28, compact, slots }
}

export function drawClassEquipmentHudStrip(
  ctx: CanvasRenderingContext2D,
  model: ClassEquipmentHudModel,
  x: number,
  y: number,
  width: number,
  options: ClassEquipmentHudRenderOptions = {},
) {
  const layout = getClassEquipmentHudLayout(model, width)

  ctx.save()
  ctx.fillStyle = options.background ?? '#5c5d58'
  ctx.fillRect(Math.round(x), Math.round(y), layout.width, layout.height)

  layout.slots.forEach(({ slot, x: relativeX, width: slotWidth }, index) => {
    const slotX = x + relativeX
    if (index > 0) {
      ctx.fillStyle = 'rgba(31, 34, 29, 0.28)'
      ctx.fillRect(Math.round(slotX), Math.round(y + 3), 1, 21)
    }
    if (index === 0) {
      drawAmmoSlot(ctx, slot, slotX, y, slotWidth, options, layout.compact)
    } else {
      drawEquipmentSlot(ctx, slot, slotX, y, slotWidth, options, layout.compact)
    }
  })
  ctx.restore()
}

function drawAmmoSlot(
  ctx: CanvasRenderingContext2D,
  slot: ClassEquipmentHudSlot,
  x: number,
  y: number,
  width: number,
  options: ClassEquipmentHudRenderOptions,
  compact: boolean,
) {
  const color = stateColor(slot.state)
  drawClassEquipmentIcon(
    ctx,
    slot.kind === 'he-shell' ? 'he-shell' : 'shell',
    x + 1,
    y + 2,
    24,
    { active: slot.count > 0, teamColor: options.teamColor ?? '#d8b247' },
  )
  drawPixelText(ctx, compact ? (slot.kind === 'he-shell' ? 'HE' : 'AMMO') : slot.label, x + 28, y + 2, {
    color: HUD_INK,
    maxWidth: compact ? 28 : 58,
    scale: 1,
    shadowColor: null,
  })
  drawPixelText(ctx, compact ? compactStateLabel(slot.state) : slot.state === 'recharging' ? 'RELOAD' : slot.state.toUpperCase(), x + width - 5, y + 2, {
    align: 'right',
    color,
    maxWidth: compact ? 34 : 54,
    scale: 1,
    shadowColor: null,
  })
  drawPixelText(ctx, `${slot.count}/${slot.capacity ?? slot.count}`, x + 28, y + 14, {
    color,
    maxWidth: 46,
    scale: 1,
    shadowColor: null,
  })
  const trayX = compact ? x + 54 : x + 79
  drawShellTray(
    ctx,
    trayX,
    y + 14,
    slot.count,
    slot.capacity ?? slot.count,
    Math.max(36, width - (trayX - x) - 5),
    slot.kind === 'he-shell',
  )
  drawSlotProgress(ctx, slot, x + 28, y + 24, width - 33)
}

function drawEquipmentSlot(
  ctx: CanvasRenderingContext2D,
  slot: ClassEquipmentHudSlot,
  x: number,
  y: number,
  width: number,
  options: ClassEquipmentHudRenderOptions,
  compact: boolean,
) {
  const active = slot.state !== 'out' && slot.state !== 'empty'
  const iconX = Math.round(x + (compact ? 1 : 3))
  const iconSize = compact ? 22 : 24
  const textX = Math.round(x + (compact ? 25 : 29))
  const textWidth = Math.max(compact ? 18 : 26, Math.floor(width - (compact ? 27 : 33)))
  const color = stateColor(slot.state)

  const visualKind = slot.kind === 'steel-trap' ? 'steel' : slot.kind
  drawClassEquipmentIcon(ctx, visualKind, iconX, y + 2, iconSize, {
    active,
    teamColor: options.teamColor ?? '#86f4ff',
  })

  drawPixelText(ctx, compact ? compactEquipmentLabel(slot) : slot.key ? `${slot.key} ${slot.label}` : slot.label, textX, y + 2, {
    color: HUD_INK,
    maxWidth: textWidth,
    scale: 1,
    shadowColor: null,
  })
  drawPixelText(ctx, compact ? `${slot.count} ${compactStateLabel(slot.state)}` : `${slot.count} ${slot.state.toUpperCase()}`, textX, y + 14, {
    color,
    maxWidth: textWidth,
    scale: 1,
    shadowColor: null,
  })
  drawSlotProgress(ctx, slot, textX, y + 24, textWidth)
}

function drawShellTray(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  capacity: number,
  width: number,
  heavy: boolean,
) {
  const count = Math.min(10, Math.max(1, capacity))
  const active = Math.max(0, Math.min(value, count))
  const pitch = Math.max(5, Math.min(14, Math.floor(width / count)))
  const roundWidth = Math.max(3, pitch - 3)
  const usedWidth = count * pitch - 3
  const startX = Math.round(x + Math.max(0, (width - usedWidth) / 2))

  for (let index = 0; index < count; index += 1) {
    const px = startX + index * pitch
    ctx.fillStyle = '#171717'
    ctx.fillRect(px, y, roundWidth, 9)
    if (index >= active) {
      ctx.fillStyle = '#35372f'
      ctx.fillRect(px + 1, y + 1, Math.max(1, roundWidth - 2), 7)
      continue
    }

    ctx.fillStyle = heavy ? '#69736a' : '#6b604d'
    ctx.fillRect(px + 1, y + 3, Math.max(1, roundWidth - 2), 5)
    ctx.fillStyle = '#d5a23a'
    ctx.fillRect(px + 1, y + 5, Math.max(1, roundWidth - 2), 2)
    ctx.fillStyle = heavy ? '#b44735' : '#d8b247'
    ctx.fillRect(px + 2, y + 1, Math.max(1, roundWidth - 4), 3)
    if (roundWidth >= 6) {
      ctx.fillStyle = '#f0ecd6'
      ctx.fillRect(px + 2, y + 1, Math.max(1, roundWidth - 5), 1)
    }
  }
}

function drawSlotProgress(ctx: CanvasRenderingContext2D, slot: ClassEquipmentHudSlot, x: number, y: number, width: number) {
  if (slot.progress === null) {
    return
  }
  const progress = Math.max(0, Math.min(1, slot.progress))
  ctx.fillStyle = '#171717'
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), 3)
  ctx.fillStyle = '#86f4ff'
  ctx.fillRect(Math.round(x + 1), Math.round(y + 1), Math.max(1, Math.round((width - 2) * progress)), 1)
}

function stateColor(state: ClassEquipmentHudSlotState) {
  if (state === 'empty' || state === 'low') return HUD_DANGER
  if (state === 'hold' || state === 'recharging') return '#1f4c4c'
  if (state === 'out') return '#5a3f1c'
  return '#284a2d'
}

function compactEquipmentLabel(slot: ClassEquipmentHudSlot) {
  if (slot.kind === 'decoy') return '1 D'
  if (slot.kind === 'tripwire') return '5 W'
  if (slot.kind === 'mine') return '2 M'
  if (slot.kind === 'steel-trap') return '4 T'
  if (slot.kind === 'shield') return 'SH'
  return slot.key ?? slot.label
}

function compactStateLabel(state: ClassEquipmentHudSlotState) {
  if (state === 'ready') return 'OK'
  if (state === 'recharging') return 'R'
  if (state === 'hold') return 'H'
  if (state === 'empty') return 'E'
  if (state === 'low') return 'LO'
  return 'X'
}
