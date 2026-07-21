import {
  type ClassEquipmentHudModel,
  type ClassEquipmentHudSlot,
  type ClassEquipmentHudSlotState,
} from './classEquipmentHud.ts'
import {
  drawClassEquipmentIcon,
  getClassShellVisualProfile,
  type ClassShellVisualKind,
} from './classEquipmentVisual.ts'
import { drawPixelText } from './pixelText.ts'

const HUD_INK = '#252820'
const HUD_DANGER = '#7b1e18'
const HUD_SURFACE = '#5c5d58'
const EQUIPMENT_KEY_GLYPHS: Record<string, readonly string[]> = {
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '110', '001', '110'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '110', '001', '110'],
  E: ['111', '100', '110', '100', '111'],
  X: ['101', '101', '010', '101', '101'],
}
const EQUIPMENT_NAME_GLYPHS: Record<string, readonly string[]> = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  R: ['11110', '10001', '11110', '10100', '10010'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  W: ['10001', '10001', '10101', '10101', '01010'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
}

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
  const ammoWidth = compact
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
  ctx.fillStyle = options.background ?? HUD_SURFACE
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
      drawEquipmentSlot(ctx, slot, slotX, y, slotWidth, options)
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
  const shellKind = getShellVisualKind(slot.kind)
  drawClassEquipmentIcon(
    ctx,
    shellKind,
    x + 1,
    y + 2,
    24,
    { active: slot.count > 0, teamColor: options.teamColor ?? '#d8b247' },
  )
  drawPixelText(ctx, compact ? (shellKind === 'battle-shell' ? 'HE' : 'AMMO') : slot.label, x + 28, y + 2, {
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
    shellKind,
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
) {
  const active = slot.state !== 'out' && slot.state !== 'empty' && slot.state !== 'cooldown'
  const iconColumnWidth = Math.min(34, Math.max(28, Math.floor(width * 0.48)))
  const iconCenterX = Math.round(x + iconColumnWidth / 2)
  const iconSize = 20
  const countAreaX = x + iconColumnWidth
  const countAreaWidth = Math.max(24, width - iconColumnWidth)
  const countCenterX = Math.round(countAreaX + countAreaWidth / 2)
  const color = stateColor(slot.state)

  const visualKind = slot.kind === 'steel-trap' ? 'steel' : slot.kind
  const iconX = iconCenterX - iconSize / 2
  drawClassEquipmentIcon(ctx, visualKind, iconX, y + 1, iconSize, {
    active,
    teamColor: options.teamColor ?? '#86f4ff',
  })
  if (slot.key) {
    drawEquipmentKeycap(ctx, slot.key, iconX - 2, y)
  }

  drawSmallEquipmentName(ctx, equipmentName(slot), iconCenterX, y + 21, iconColumnWidth - 2)
  drawPixelText(ctx, String(slot.count), countCenterX, y + 13, {
    align: 'center',
    baseline: 'middle',
    color,
    maxWidth: countAreaWidth - 4,
    scale: 2,
    shadowColor: null,
  })
  drawSlotProgress(ctx, slot, countAreaX + 2, y + 24, countAreaWidth - 4)
}

function drawSmallEquipmentName(
  ctx: CanvasRenderingContext2D,
  name: string,
  centerX: number,
  y: number,
  maxWidth: number,
) {
  const glyphs = [...name].map((letter) => EQUIPMENT_NAME_GLYPHS[letter]).filter((glyph) => glyph !== undefined)
  const letterSpacing = 1
  const textWidth = glyphs.reduce((width, glyph) => width + glyph[0].length, 0)
    + Math.max(0, glyphs.length - 1) * letterSpacing
  if (glyphs.length !== name.length || textWidth > maxWidth) return

  let cursorX = Math.round(centerX - textWidth / 2)
  const top = Math.round(y)
  ctx.fillStyle = HUD_INK
  glyphs.forEach((glyph) => {
    glyph.forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col += 1) {
        if (row[col] === '1') {
          ctx.fillRect(cursorX + col, top + rowIndex, 1, 1)
        }
      }
    })
    cursorX += glyph[0].length + letterSpacing
  })
}

export function drawEquipmentKeycap(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  surfaceColor = HUD_SURFACE,
) {
  const glyph = EQUIPMENT_KEY_GLYPHS[key]
  if (!glyph) return

  const badgeX = Math.round(x)
  const badgeY = Math.round(y)
  ctx.fillStyle = surfaceColor
  ctx.fillRect(badgeX - 1, badgeY - 1, 11, 11)
  ctx.fillStyle = '#171717'
  ctx.fillRect(badgeX, badgeY, 9, 9)
  ctx.fillStyle = '#d8d0a2'
  ctx.fillRect(badgeX + 1, badgeY + 1, 7, 7)
  ctx.fillStyle = '#8f896b'
  ctx.fillRect(badgeX + 1, badgeY + 7, 7, 1)
  ctx.fillStyle = HUD_INK
  glyph.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col += 1) {
      if (row[col] === '1') {
        ctx.fillRect(badgeX + 3 + col, badgeY + 2 + rowIndex, 1, 1)
      }
    }
  })
}

function drawShellTray(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  capacity: number,
  width: number,
  shellKind: ClassShellVisualKind,
) {
  const profile = getClassShellVisualProfile(shellKind)
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

    const inset = shellKind === 'scout-shell' ? 2 : 1
    const shellWidth = Math.max(1, roundWidth - inset * 2)
    ctx.fillStyle = profile.body
    ctx.fillRect(px + inset, y + 3, shellWidth, 5)
    ctx.fillStyle = profile.band
    ctx.fillRect(px + inset, y + 5, shellWidth, 2)
    ctx.fillStyle = profile.nose
    if (shellKind === 'scout-shell') {
      ctx.fillRect(px + inset + 1, y + 1, Math.max(1, shellWidth - 2), 2)
      ctx.fillRect(px + inset + 2, y, Math.max(1, shellWidth - 4), 1)
    } else if (shellKind === 'engineer-shell') {
      ctx.fillRect(px + inset, y + 1, shellWidth, 3)
      ctx.fillStyle = profile.highlight
      ctx.fillRect(px + inset + 1, y + 1, Math.max(1, shellWidth - 2), 1)
    } else {
      ctx.fillRect(px + inset + 1, y + 1, Math.max(1, shellWidth - 2), 3)
      ctx.fillStyle = profile.highlight
      ctx.fillRect(px + inset + 1, y + 1, Math.max(1, shellWidth - 3), 1)
    }
  }
}

function getShellVisualKind(kind: ClassEquipmentHudSlot['kind']): ClassShellVisualKind {
  if (kind === 'scout-shell' || kind === 'engineer-shell' || kind === 'battle-shell') {
    return kind
  }
  return 'engineer-shell'
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
  if (state === 'active') return '#0d6670'
  if (state === 'cooldown') return '#5a3f1c'
  if (state === 'out') return '#5a3f1c'
  return '#284a2d'
}

function equipmentName(slot: ClassEquipmentHudSlot) {
  if (slot.kind === 'steel-trap') return 'TRAP'
  if (slot.kind === 'bulwark') return 'FLD'
  if (slot.kind === 'traverse') return 'LAT'
  return slot.label
}

function compactStateLabel(state: ClassEquipmentHudSlotState) {
  if (state === 'ready') return 'OK'
  if (state === 'recharging') return 'R'
  if (state === 'active') return 'ON'
  if (state === 'cooldown') return 'CD'
  if (state === 'hold') return 'H'
  if (state === 'empty') return 'E'
  if (state === 'low') return 'LO'
  return 'X'
}
