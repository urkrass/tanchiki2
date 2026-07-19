import type { Direction, OfflineDeployableKind, TankClassId } from './types.ts'

export const CLASS_EQUIPMENT_CANONICAL_SIZE = 48

export type ClassShellVisualKind = `${TankClassId}-shell`

export type ClassEquipmentVisualKind =
  | Exclude<OfflineDeployableKind, 'noise'>
  | ClassShellVisualKind
  | 'shield'

export interface ClassShellVisualProfile {
  id: ClassShellVisualKind
  tankClass: TankClassId
  body: string
  casing: string
  band: string
  nose: string
  highlight: string
  trail: string
}

export const CLASS_SHELL_VISUAL_PROFILES: Record<TankClassId, ClassShellVisualProfile> = {
  scout: {
    id: 'scout-shell',
    tankClass: 'scout',
    body: '#7b8985',
    casing: '#756548',
    band: '#4f8992',
    nose: '#c8d8d3',
    highlight: '#e4ece8',
    trail: '#82918d',
  },
  engineer: {
    id: 'engineer-shell',
    tankClass: 'engineer',
    body: '#65705d',
    casing: '#8a7145',
    band: '#d0a342',
    nose: '#aab29f',
    highlight: '#e0d6af',
    trail: '#777a68',
  },
  battle: {
    id: 'battle-shell',
    tankClass: 'battle',
    body: '#5d675e',
    casing: '#9b793e',
    band: '#b44735',
    nose: '#c8cec4',
    highlight: '#e0d8bb',
    trail: '#6b6d64',
  },
}

export interface ClassEquipmentVisualEntry {
  id: ClassEquipmentVisualKind
  bounds: { x: number; y: number; w: number; h: number }
  militaryDetails: readonly string[]
}

export const CLASS_EQUIPMENT_VISUAL_CONTRACT: readonly ClassEquipmentVisualEntry[] = [
  {
    id: 'decoy',
    bounds: { x: 4, y: 5, w: 40, h: 39 },
    militaryDetails: ['folding hull', 'stabilizers', 'antenna', 'team lamp'],
  },
  {
    id: 'tripwire',
    bounds: { x: 3, y: 8, w: 42, h: 35 },
    militaryDetails: ['stakes', 'insulators', 'tension wire', 'trigger box'],
  },
  {
    id: 'mine',
    bounds: { x: 4, y: 14, w: 40, h: 27 },
    militaryDetails: ['pressure plate', 'segmented rim', 'arming cap', 'safety lamp'],
  },
  {
    id: 'steel',
    bounds: { x: 3, y: 9, w: 42, h: 35 },
    militaryDetails: ['jaws', 'springs', 'crossbar', 'anchor chain'],
  },
  {
    id: 'scout-shell',
    bounds: { x: 3, y: 15, w: 42, h: 18 },
    militaryDetails: ['light casing', 'blue recognition band', 'long ballistic nose'],
  },
  {
    id: 'engineer-shell',
    bounds: { x: 3, y: 12, w: 42, h: 24 },
    militaryDetails: ['reinforced casing', 'utility band', 'impact cap'],
  },
  {
    id: 'battle-shell',
    bounds: { x: 3, y: 10, w: 42, h: 28 },
    militaryDetails: ['heavy casing', 'warning band', 'fuse', 'stencil'],
  },
  {
    id: 'shield',
    bounds: { x: 5, y: 5, w: 38, h: 39 },
    militaryDetails: ['armored module', 'emitter coils', 'segmented field'],
  },
] as const

export function validateClassEquipmentVisualContract(
  entries: readonly ClassEquipmentVisualEntry[] = CLASS_EQUIPMENT_VISUAL_CONTRACT,
) {
  const errors: string[] = []
  const expected = ['decoy', 'tripwire', 'mine', 'steel', 'scout-shell', 'engineer-shell', 'battle-shell', 'shield']
  if (CLASS_EQUIPMENT_CANONICAL_SIZE !== 48) {
    errors.push('Class equipment canonical density must remain 48 units.')
  }
  if (entries.map((entry) => entry.id).join(',') !== expected.join(',')) {
    errors.push('Class equipment visual IDs do not match the canonical kit.')
  }
  for (const entry of entries) {
    const { x, y, w, h } = entry.bounds
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 48 || y + h > 48) {
      errors.push(`${entry.id} exceeds its canonical 48-unit bounds.`)
    }
    if (entry.militaryDetails.length < 3) {
      errors.push(`${entry.id} lacks the required military construction detail.`)
    }
  }
  return errors
}

export interface ClassEquipmentIconOptions {
  active?: boolean
  teamColor?: string
  time?: number
}

export function drawClassEquipmentIcon(
  ctx: CanvasRenderingContext2D,
  kind: ClassEquipmentVisualKind,
  x: number,
  y: number,
  size: number,
  options: ClassEquipmentIconOptions = {},
) {
  const scale = Math.max(1, size) / CLASS_EQUIPMENT_CANONICAL_SIZE
  const active = options.active !== false
  const signal = active ? options.teamColor ?? '#d8b247' : '#6e6856'

  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = false
  drawEquipmentShadow(ctx)

  if (kind === 'decoy') {
    drawDecoy(ctx, signal, active)
  } else if (kind === 'tripwire') {
    drawTripwire(ctx, signal, active)
  } else if (kind === 'mine') {
    drawMine(ctx, signal, active)
  } else if (kind === 'steel') {
    drawSteelTrap(ctx, signal, active)
  } else if (kind === 'shield') {
    drawShieldModule(ctx, signal, active)
  } else {
    drawShell(ctx, getClassShellVisualProfile(kind), signal, active)
  }
  ctx.restore()
}

export function getClassShellVisualKind(tankClass: TankClassId): ClassShellVisualKind {
  return CLASS_SHELL_VISUAL_PROFILES[tankClass].id
}

export function getClassShellVisualProfile(kind: ClassShellVisualKind) {
  if (kind === 'scout-shell') return CLASS_SHELL_VISUAL_PROFILES.scout
  if (kind === 'battle-shell') return CLASS_SHELL_VISUAL_PROFILES.battle
  return CLASS_SHELL_VISUAL_PROFILES.engineer
}

export function drawClassShellProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  tankClass: TankClassId,
  teamColor: string,
  frame = 0,
) {
  const profile = CLASS_SHELL_VISUAL_PROFILES[tankClass]
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(directionAngle(direction))

  const pulse = Math.abs(Math.floor(frame)) % 2
  const projectileWidth = tankClass === 'scout' ? 2 : tankClass === 'engineer' ? 4 : 6
  const projectileLeft = -projectileWidth / 2
  ctx.fillStyle = 'rgba(24, 20, 13, 0.55)'
  ctx.fillRect(projectileLeft, 5, projectileWidth, 8)
  ctx.fillStyle = '#171916'
  if (tankClass === 'scout') {
    ctx.fillRect(-2, -8, 4, 16)
    ctx.fillStyle = profile.body
    ctx.fillRect(-1, -6, 2, 11)
    ctx.fillStyle = profile.nose
    ctx.fillRect(-1, -8, 2, 3)
  } else if (tankClass === 'engineer') {
    ctx.fillRect(-3, -7, 6, 15)
    ctx.fillStyle = profile.body
    ctx.fillRect(-2, -5, 4, 11)
    ctx.fillStyle = profile.nose
    ctx.fillRect(-2, -7, 4, 3)
  } else {
    ctx.fillRect(-4, -7, 8, 15)
    ctx.fillStyle = profile.body
    ctx.fillRect(-3, -5, 6, 10)
    ctx.fillStyle = profile.nose
    ctx.fillRect(-2, -7, 4, 3)
  }
  ctx.fillStyle = profile.band
  ctx.fillRect(projectileLeft, -2, projectileWidth, tankClass === 'scout' ? 2 : 3)
  ctx.fillStyle = teamColor
  ctx.fillRect(-1, tankClass === 'scout' ? 3 : 2, 2, 2)
  ctx.fillStyle = profile.highlight
  ctx.fillRect(-1, tankClass === 'scout' ? -7 : -6, 1, 2)
  ctx.fillStyle = pulse ? profile.trail : '#4f544f'
  ctx.fillRect(-1, 7, 2, 3)
  ctx.fillStyle = `${profile.trail}90`
  ctx.fillRect(-1, 11, 2, 3)
  ctx.restore()
}

function drawEquipmentShadow(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(8, 9, 8, 0.38)'
  ctx.fillRect(7, 39, 34, 4)
  ctx.fillRect(12, 43, 24, 1)
}

function drawDecoy(ctx: CanvasRenderingContext2D, signal: string, active: boolean) {
  ctx.fillStyle = '#151816'
  ctx.fillRect(8, 20, 32, 17)
  ctx.fillRect(12, 13, 24, 10)
  ctx.fillRect(6, 34, 6, 4)
  ctx.fillRect(36, 34, 6, 4)
  ctx.fillStyle = '#5d634f'
  ctx.fillRect(10, 21, 28, 13)
  ctx.fillStyle = '#7a7355'
  ctx.fillRect(14, 15, 20, 7)
  ctx.fillStyle = '#343a31'
  ctx.fillRect(12, 27, 24, 3)
  ctx.fillStyle = '#a9a58b'
  ctx.fillRect(15, 17, 8, 2)
  ctx.fillRect(25, 17, 6, 2)
  ctx.fillStyle = '#272b25'
  ctx.fillRect(7, 36, 4, 7)
  ctx.fillRect(37, 36, 4, 7)
  ctx.fillRect(21, 34, 6, 8)
  ctx.fillStyle = '#151816'
  ctx.fillRect(35, 6, 2, 14)
  ctx.fillRect(32, 5, 8, 2)
  ctx.fillStyle = active ? signal : '#625c4b'
  ctx.fillRect(34, 8, 4, 4)
  ctx.fillStyle = '#e7e2c8'
  ctx.fillRect(35, 8, 2, 1)
}

function drawTripwire(ctx: CanvasRenderingContext2D, signal: string, active: boolean) {
  ctx.fillStyle = '#171917'
  ctx.fillRect(5, 10, 7, 31)
  ctx.fillRect(36, 8, 7, 33)
  ctx.fillStyle = '#665b42'
  ctx.fillRect(7, 12, 3, 28)
  ctx.fillRect(38, 10, 3, 30)
  ctx.fillStyle = '#cbc7b3'
  ctx.fillRect(10, 17, 5, 3)
  ctx.fillRect(33, 15, 5, 3)
  ctx.fillRect(10, 29, 5, 3)
  ctx.fillRect(33, 27, 5, 3)
  ctx.strokeStyle = '#171917'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(13, 19)
  ctx.lineTo(36, 17)
  ctx.moveTo(13, 31)
  ctx.lineTo(36, 29)
  ctx.stroke()
  ctx.strokeStyle = active ? '#b7c2b7' : '#686c63'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(13, 19)
  ctx.lineTo(36, 17)
  ctx.moveTo(13, 31)
  ctx.lineTo(36, 29)
  ctx.stroke()
  ctx.fillStyle = '#20241f'
  ctx.fillRect(19, 24, 12, 12)
  ctx.fillStyle = '#59605a'
  ctx.fillRect(21, 26, 8, 8)
  ctx.fillStyle = signal
  ctx.fillRect(23, 27, 4, 2)
  ctx.fillStyle = '#d8d4bd'
  ctx.fillRect(23, 31, 4, 1)
}

function drawMine(ctx: CanvasRenderingContext2D, signal: string, active: boolean) {
  ctx.fillStyle = '#151816'
  ctx.beginPath()
  ctx.ellipse(24, 31, 20, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4d564c'
  ctx.beginPath()
  ctx.ellipse(24, 29, 17, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#737b6c'
  ctx.fillRect(10, 27, 28, 5)
  ctx.fillStyle = '#2d332d'
  ctx.fillRect(12, 28, 5, 7)
  ctx.fillRect(21, 27, 6, 9)
  ctx.fillRect(31, 28, 5, 7)
  ctx.fillStyle = '#a5a996'
  ctx.fillRect(13, 26, 4, 2)
  ctx.fillRect(31, 26, 4, 2)
  ctx.fillStyle = '#171917'
  ctx.fillRect(19, 18, 10, 10)
  ctx.fillStyle = '#7d765d'
  ctx.fillRect(21, 20, 6, 6)
  ctx.fillStyle = active ? signal : '#655f50'
  ctx.fillRect(23, 21, 2, 2)
  ctx.fillStyle = '#d7d2b9'
  ctx.fillRect(23, 24, 2, 1)
}

function drawSteelTrap(ctx: CanvasRenderingContext2D, signal: string, active: boolean) {
  ctx.fillStyle = '#151817'
  ctx.fillRect(5, 31, 36, 7)
  ctx.fillRect(9, 15, 8, 19)
  ctx.fillRect(31, 15, 8, 19)
  ctx.fillStyle = '#737e7a'
  ctx.fillRect(7, 32, 32, 4)
  ctx.fillRect(11, 18, 4, 15)
  ctx.fillRect(33, 18, 4, 15)
  ctx.fillStyle = '#b6bfba'
  for (let index = 0; index < 4; index += 1) {
    const y = 13 + index * 5
    ctx.fillRect(15, y, 5, 3)
    ctx.fillRect(28, y, 5, 3)
  }
  ctx.fillStyle = '#262b29'
  ctx.fillRect(18, 25, 12, 10)
  ctx.fillStyle = active ? signal : '#5f655f'
  ctx.fillRect(20, 27, 8, 4)
  ctx.strokeStyle = '#171917'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(11, 38, 5, 0, Math.PI * 1.6)
  ctx.arc(5, 40, 3, 0, Math.PI * 1.6)
  ctx.stroke()
  ctx.fillStyle = '#d4d8d2'
  ctx.fillRect(9, 22, 3, 3)
  ctx.fillRect(36, 22, 3, 3)
}

function drawShell(
  ctx: CanvasRenderingContext2D,
  profile: ClassShellVisualProfile,
  signal: string,
  active: boolean,
) {
  const tankClass = profile.tankClass
  const heavy = tankClass === 'battle'
  const scout = tankClass === 'scout'
  const top = scout ? 17 : heavy ? 13 : 15
  const height = scout ? 14 : heavy ? 22 : 18
  ctx.fillStyle = '#151816'
  ctx.fillRect(5, top, 34, height)
  ctx.fillRect(39, top + 3, 5, height - 6)
  ctx.fillStyle = profile.body
  ctx.fillRect(7, top + 2, 27, height - 4)
  ctx.fillStyle = profile.casing
  ctx.fillRect(9, top + 2, scout ? 4 : 5, height - 4)
  ctx.fillStyle = profile.highlight
  ctx.fillRect(10, top + 4, 2, height - 8)
  ctx.fillStyle = active ? profile.band : '#655f50'
  ctx.fillRect(scout ? 29 : 27, top + 2, scout ? 3 : heavy ? 5 : 4, height - 4)
  ctx.fillStyle = '#252a26'
  ctx.beginPath()
  ctx.moveTo(34, top + 2)
  ctx.lineTo(44, 24)
  ctx.lineTo(34, top + height - 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = profile.nose
  ctx.fillRect(35, scout ? 22 : 21, 5, scout ? 4 : 3)
  ctx.fillStyle = signal
  ctx.fillRect(15, top + height - 5, 3, 2)
  if (heavy) {
    ctx.fillStyle = profile.highlight
    ctx.fillRect(17, 19, 7, 2)
    ctx.fillRect(17, 23, 2, 6)
    ctx.fillRect(22, 23, 2, 6)
    ctx.fillRect(19, 25, 3, 2)
  } else if (tankClass === 'engineer') {
    ctx.fillStyle = '#30382f'
    ctx.fillRect(20, 19, 5, 2)
    ctx.fillRect(20, 27, 5, 2)
  }
}

function drawShieldModule(ctx: CanvasRenderingContext2D, signal: string, active: boolean) {
  ctx.fillStyle = '#151817'
  ctx.fillRect(11, 8, 26, 32)
  ctx.fillRect(7, 13, 34, 22)
  ctx.fillStyle = '#4e5a56'
  ctx.fillRect(13, 10, 22, 28)
  ctx.fillStyle = '#798681'
  ctx.fillRect(9, 16, 30, 16)
  ctx.fillStyle = '#252c29'
  ctx.fillRect(15, 14, 18, 20)
  ctx.fillStyle = '#aab6b0'
  ctx.fillRect(17, 16, 14, 3)
  ctx.fillRect(17, 29, 14, 3)
  ctx.fillStyle = active ? signal : '#66716d'
  ctx.fillRect(20, 21, 8, 7)
  ctx.fillStyle = '#dffcff'
  ctx.fillRect(22, 21, 4, 2)
  ctx.fillStyle = '#202523'
  ctx.fillRect(5, 18, 5, 12)
  ctx.fillRect(38, 18, 5, 12)
  ctx.fillStyle = active ? '#86f4ff' : '#66716d'
  ctx.fillRect(6, 20, 3, 8)
  ctx.fillRect(39, 20, 3, 8)
  ctx.fillRect(16, 6, 5, 4)
  ctx.fillRect(27, 6, 5, 4)
  ctx.fillRect(16, 38, 5, 5)
  ctx.fillRect(27, 38, 5, 5)
}

function directionAngle(direction: Direction) {
  if (direction === 'right') return Math.PI / 2
  if (direction === 'down') return Math.PI
  if (direction === 'left') return -Math.PI / 2
  return 0
}
