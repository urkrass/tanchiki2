import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_X,
  ARENA_Y,
  clamp,
} from './constants.ts'
import {
  BATTLEFIELD_TILE_SIZE,
  type BattlefieldCamera,
  worldCellToScreen,
} from './battlefield.ts'
import type {
  Direction,
  OfflineSignalJammerSnapshot,
  TerrainEvidenceSnapshot,
} from './types.ts'

export function selectStrongestTerrainEvidenceByCell(
  evidenceItems: readonly TerrainEvidenceSnapshot[],
) {
  const strongestByCell = new Map<string, TerrainEvidenceSnapshot>()
  for (const evidence of evidenceItems) {
    const key = `${evidence.col},${evidence.row}`
    const current = strongestByCell.get(key)
    const remainingStrength = getRemainingEvidenceStrength(evidence)
    const currentStrength = current ? getRemainingEvidenceStrength(current) : -1
    if (!current || remainingStrength > currentStrength) {
      strongestByCell.set(key, evidence)
    }
  }
  return [...strongestByCell.values()]
}

export function drawTerrainEvidence(
  ctx: CanvasRenderingContext2D,
  evidenceItems: readonly TerrainEvidenceSnapshot[],
  camera: BattlefieldCamera,
) {
  if (evidenceItems.length === 0) {
    return
  }

  ctx.save()
  ctx.lineWidth = 1
  for (const evidence of selectStrongestTerrainEvidenceByCell(evidenceItems)) {
    const point = worldCellToScreen(camera, evidence.col, evidence.row)
    const cx = Math.round(point.x + BATTLEFIELD_TILE_SIZE / 2)
    const cy = Math.round(point.y + BATTLEFIELD_TILE_SIZE / 2)
    if (!isScreenPointNearArena(cx, cy, 24)) {
      continue
    }

    const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
    const alpha = clamp((1 - progress) * evidence.strength, 0, 0.82)
    if (alpha <= 0.04) {
      continue
    }

    if (evidence.kind === 'echo') {
      drawEchoEvidenceWave(ctx, evidence, cx, cy, alpha)
      continue
    }

    if (evidence.kind === 'dust') {
      drawDustEvidence(ctx, evidence, cx, cy, alpha)
    } else if (evidence.kind === 'rustle') {
      drawRustleEvidence(ctx, evidence, cx, cy, alpha)
    } else if (evidence.kind === 'metal') {
      drawMetalEvidence(ctx, evidence, cx, cy, alpha)
    } else if (evidence.kind === 'ricochet') {
      drawRicochetEvidence(ctx, evidence, cx, cy, alpha)
    } else if (evidence.surface === 'swamp') {
      drawSwampEvidence(ctx, evidence, cx, cy, alpha)
    } else {
      drawGravelEvidence(ctx, evidence, cx, cy, alpha)
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

export function drawSignalJammerStatus(
  ctx: CanvasRenderingContext2D,
  jammers: readonly OfflineSignalJammerSnapshot[],
  time: number,
  camera: BattlefieldCamera,
) {
  for (const jammer of jammers) {
    const point = worldCellToScreen(camera, jammer.col, jammer.row)
    const x = Math.round(point.x + BATTLEFIELD_TILE_SIZE / 2)
    const y = Math.round(point.y + BATTLEFIELD_TILE_SIZE / 2)
    if (!isScreenPointNearArena(x, y, BATTLEFIELD_TILE_SIZE)) {
      continue
    }

    const color = jammer.empDisabled ? '#86f4ff' : jammer.active ? '#ff6b74' : '#89928c'
    const pulse = jammer.active ? (time * 3) % 1 : 0
    ctx.save()
    ctx.globalAlpha = jammer.active ? 0.72 - pulse * 0.28 : 0.62
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 12 + pulse * 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    if (jammer.active && jammer.empDisabled) {
      const flicker = Math.floor(time * 12) % 4
      ctx.strokeStyle = '#dffcff'
      ctx.lineWidth = 1
      for (let index = 0; index < 4; index += 1) {
        const angle = (Math.PI * 2 * index) / 4 + flicker * 0.2
        const inner = 7 + (index % 2) * 2
        const outer = 14 + ((index + flicker) % 3)
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
        ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
        ctx.stroke()
      }
    } else if (jammer.active) {
      const staticPhase = Math.floor(time * 10) % 3
      ctx.fillStyle = '#ff6b74'
      for (let index = -2; index <= 2; index += 1) {
        const width = 4 + ((index + staticPhase + 4) % 3) * 3
        const offset = 13 + Math.abs(index) * 2
        ctx.globalAlpha = 0.82 - Math.abs(index) * 0.12
        ctx.fillRect(Math.round(x - offset - width), y + index * 4 - 1, width, 2)
        ctx.fillRect(Math.round(x + offset), y - index * 4 - 1, width, 2)
      }
      ctx.globalAlpha = 1
    } else {
      ctx.beginPath()
      ctx.moveTo(x - 9, y - 9)
      ctx.lineTo(x + 9, y + 9)
      ctx.moveTo(x + 9, y - 9)
      ctx.lineTo(x - 9, y + 9)
      ctx.stroke()
      for (let index = 0; index < 3; index += 1) {
        const age = (time * 0.55 + index * 0.31) % 1
        const smokeX = Math.round(x - 4 + index * 4 + Math.sin(time * 2 + index) * 2)
        const smokeY = Math.round(y - 5 - age * 15)
        ctx.globalAlpha = (1 - age) * 0.34
        ctx.fillStyle = index % 2 === 0 ? '#89928c' : '#4d5550'
        ctx.fillRect(smokeX - 1, smokeY - 1, 3, 3)
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }
}

function getRemainingEvidenceStrength(evidence: TerrainEvidenceSnapshot) {
  return evidence.strength * (1 - clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1))
}

function isScreenPointNearArena(x: number, y: number, margin: number) {
  return x >= ARENA_X - margin
    && x <= ARENA_X + ARENA_WIDTH + margin
    && y >= ARENA_Y - margin
    && y <= ARENA_Y + ARENA_HEIGHT + margin
}

function drawEchoEvidenceWave(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const maxRadius = 58 + evidence.strength * 24

  ctx.save()
  ctx.lineCap = 'square'
  ctx.lineWidth = 1
  for (const phase of [0, 0.18, 0.36]) {
    const ringProgress = progress - phase
    if (ringProgress < 0 || ringProgress > 1) {
      continue
    }

    const radius = 5 + ringProgress * maxRadius
    const ringAlpha = clamp(alpha * (1 - ringProgress) * (phase === 0 ? 0.72 : 0.48), 0, 0.62)
    if (ringAlpha <= 0.03) {
      continue
    }

    drawSegmentedEchoRing(ctx, cx, cy, radius, ringAlpha, phase === 0 ? '#dffcff' : '#86f4ff')
  }
  ctx.restore()
}

function drawSegmentedEchoRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  color: string,
) {
  const segments = radius > 42 ? 10 : radius > 22 ? 8 : 6
  const step = (Math.PI * 2) / segments
  const arc = step * 0.58
  const rotation = radius * 0.013

  ctx.globalAlpha = alpha * 0.44
  ctx.strokeStyle = '#050505'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let index = 0; index < segments; index += 1) {
    const start = rotation + index * step
    ctx.arc(cx, cy, radius, start, start + arc)
  }
  ctx.stroke()

  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = radius > 48 ? 1.4 : 1.2
  ctx.beginPath()
  for (let index = 0; index < segments; index += 1) {
    const start = rotation + index * step
    ctx.arc(cx, cy, radius, start, start + arc)
  }
  ctx.stroke()
}

function drawDustEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const vector = evidence.dir ? directionVector(evidence.dir) : { x: 0, y: -1 }
  const perpendicular = { x: -vector.y, y: vector.x }
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)

  ctx.save()
  for (let index = 0; index < 6; index += 1) {
    const drift = 3 + progress * 9 + index * 2.2
    const spread = (index % 3 - 1) * 3 + Math.sin(evidence.age * 13 + index * 1.7) * 1.5
    const x = Math.round(cx - vector.x * drift + perpendicular.x * spread)
    const y = Math.round(cy - vector.y * drift + perpendicular.y * spread)
    const size = index % 2 === 0 ? 2 : 1
    ctx.globalAlpha = alpha * (0.92 - index * 0.1)
    ctx.fillStyle = index % 3 === 0 ? '#f0c276' : '#b67d42'
    ctx.fillRect(x - size, y - size, size * 2, size * 2)
  }
  ctx.restore()
}

function drawRustleEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const direction = evidence.dir ? directionVector(evidence.dir) : { x: 0, y: -1 }
  const perpendicular = { x: -direction.y, y: direction.x }

  ctx.save()
  for (let index = 0; index < 6; index += 1) {
    const lane = index - 2.5
    const lift = 2 + progress * (7 + index % 3)
    const sway = Math.sin(evidence.age * 16 + index * 1.9) * 2.5
    const x = Math.round(cx + perpendicular.x * (lane * 3 + sway) - direction.x * lift)
    const y = Math.round(cy + perpendicular.y * (lane * 3 + sway) - direction.y * lift)
    ctx.globalAlpha = alpha * (0.9 - index * 0.08)
    ctx.fillStyle = index % 2 === 0 ? '#d1f0a0' : '#7fb45b'
    ctx.fillRect(x - 1, y - 2, 3, 2)
    ctx.fillStyle = '#26361f'
    ctx.fillRect(x, y, 1, 2)
  }
  ctx.restore()
}

function drawSwampEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const pulse = Math.sin(progress * Math.PI)

  ctx.save()
  ctx.lineWidth = 1
  for (let index = 0; index < 2; index += 1) {
    const phase = clamp(progress - index * 0.18, 0, 1)
    if (phase <= 0) continue
    const radius = 3 + phase * 11
    ctx.globalAlpha = alpha * (1 - phase) * 0.9
    ctx.strokeStyle = index === 0 ? '#b8c878' : '#6e7746'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 5, radius, Math.max(2, radius * 0.38), 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let index = -1; index <= 1; index += 1) {
    const x = Math.round(cx + index * 5)
    const y = Math.round(cy + 3 - pulse * (4 + Math.abs(index) * 2))
    ctx.globalAlpha = alpha * 0.78
    ctx.fillStyle = index === 0 ? '#9e8550' : '#66583d'
    ctx.fillRect(x - 1, y - 1, 3, 3)
  }
  ctx.restore()
}

function drawGravelEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const hop = Math.sin(progress * Math.PI)
  const rotation = evidence.age * 2.2

  ctx.save()
  for (let index = 0; index < 7; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / 7
    const travel = 3 + hop * (4 + index % 3)
    const x = Math.round(cx + Math.cos(angle) * travel)
    const y = Math.round(cy + Math.sin(angle) * travel - hop * (index % 2 === 0 ? 3 : 1))
    ctx.globalAlpha = alpha * (0.92 - index * 0.07)
    ctx.fillStyle = '#151713'
    ctx.fillRect(x - 2, y - 1, 4, 3)
    ctx.fillStyle = index % 2 === 0 ? '#d7c695' : '#8e8b73'
    ctx.fillRect(x - 1, y - 1, 2, 2)
  }
  ctx.restore()
}

function drawMetalEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const burst = Math.sin(progress * Math.PI)
  const direction = evidence.dir ? directionVector(evidence.dir) : { x: 0, y: -1 }
  const perpendicular = { x: -direction.y, y: direction.x }

  ctx.save()
  ctx.lineWidth = 1
  for (let index = -2; index <= 2; index += 1) {
    const spread = index * 0.45
    const dx = direction.x + perpendicular.x * spread
    const dy = direction.y + perpendicular.y * spread
    const inner = 3 + Math.abs(index)
    const outer = inner + burst * (5 + (index & 1))
    ctx.globalAlpha = alpha * (1 - Math.abs(index) * 0.12)
    ctx.strokeStyle = index === 0 ? '#fff1a5' : '#d9f0f0'
    ctx.beginPath()
    ctx.moveTo(Math.round(cx + dx * inner), Math.round(cy + dy * inner))
    ctx.lineTo(Math.round(cx + dx * outer), Math.round(cy + dy * outer))
    ctx.stroke()
  }
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - 1, cy - 1, 3, 3)
  ctx.restore()
}

function drawRicochetEvidence(
  ctx: CanvasRenderingContext2D,
  evidence: TerrainEvidenceSnapshot,
  cx: number,
  cy: number,
  alpha: number,
) {
  const progress = clamp(evidence.age / Math.max(0.01, evidence.ttl), 0, 1)
  const burst = Math.sin(progress * Math.PI)
  const direction = evidence.dir ? directionVector(evidence.dir) : { x: 0, y: -1 }
  const perpendicular = { x: -direction.y, y: direction.x }

  ctx.save()
  ctx.lineWidth = 2
  for (let index = -2; index <= 2; index += 1) {
    const spread = index * 0.7
    const dx = -direction.x + perpendicular.x * spread
    const dy = -direction.y + perpendicular.y * spread
    const inner = 2
    const outer = 4 + burst * (7 - Math.abs(index))
    ctx.globalAlpha = alpha * (0.92 - Math.abs(index) * 0.12)
    ctx.strokeStyle = index === 0 ? '#ffffff' : '#ffd35a'
    ctx.beginPath()
    ctx.moveTo(Math.round(cx + dx * inner), Math.round(cy + dy * inner))
    ctx.lineTo(Math.round(cx + dx * outer), Math.round(cy + dy * outer))
    ctx.stroke()
  }
  ctx.restore()
}

function directionVector(direction: Direction) {
  if (direction === 'right') return { x: 1, y: 0 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 0, y: -1 }
}
