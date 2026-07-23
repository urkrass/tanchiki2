import { clamp } from './constants.ts'
import { terrainDefinition } from './terrain.ts'
import {
  createAcousticEvent,
  projectAcousticEventForListener,
  type AcousticCell,
  type AcousticEventKind,
} from '../../packages/shared/src/spatialHearing.ts'
import type {
  CombatSide,
  Direction,
  Team,
  TerrainEvidenceKind,
  TerrainEvidenceSnapshot,
  TileKind,
  TreadTrackSnapshot,
} from './types.ts'

export const MAX_TERRAIN_EVIDENCE = 90

export interface TerrainEvidenceState {
  id: string
  kind: TerrainEvidenceKind
  surface: TileKind
  side: CombatSide
  sourceTeam: Team
  col: number
  row: number
  sourceCol: number
  sourceRow: number
  dir?: Direction
  age: number
  ttl: number
  strength: number
  label: string
}

export interface PlannedTerrainEvidence {
  kind: TerrainEvidenceKind
  ttl: number
  strength: number
  label: string
}

export interface MovementTerrainEvidencePlan {
  echoPulse: boolean
  emissions: PlannedTerrainEvidence[]
}

export function planMovementTerrainEvidence(
  surface: TileKind,
  weight: TreadTrackSnapshot['weight'],
  overdriveActive: boolean,
): MovementTerrainEvidencePlan {
  const definition = terrainDefinition(surface)
  const weightMultiplier = weight === 'heavy' ? 1.25 : weight === 'light' ? 0.82 : 1
  const overdriveMultiplier = overdriveActive ? 1.3 : 1
  const strength = clamp(definition.noise.multiplier * weightMultiplier * overdriveMultiplier, 0.15, 1.5)
  const emissions: PlannedTerrainEvidence[] = []

  if (definition.evidence.dustTrail) {
    emissions.push({
      kind: 'dust',
      ttl: 1.05,
      strength: clamp(strength, 0.25, 1.1),
      label: 'DUST',
    })
  }

  if (definition.evidence.echoDistortion) {
    return { echoPulse: true, emissions }
  }

  if (definition.evidence.rustle) {
    emissions.push({
      kind: 'rustle',
      ttl: 1.9,
      strength: clamp(strength, 0.25, 1.2),
      label: definition.noise.label,
    })
    return { echoPulse: false, emissions }
  }

  if (definition.control.slideOnStop) {
    emissions.push({
      kind: 'metal',
      ttl: 1.5,
      strength: clamp(strength, 0.3, 1.2),
      label: definition.noise.label,
    })
    return { echoPulse: false, emissions }
  }

  if (definition.noise.marker) {
    emissions.push({
      kind: 'noise',
      ttl: 1.8,
      strength: clamp(strength, 0.2, 1.2),
      label: definition.noise.label,
    })
  }

  return { echoPulse: false, emissions }
}

export function advanceTerrainEvidence(
  evidence: readonly TerrainEvidenceState[],
  dt: number,
): TerrainEvidenceState[] {
  return evidence
    .map((item) => ({ ...item, age: item.age + dt }))
    .filter((item) => item.age < item.ttl)
}

export function appendTerrainEvidence(
  evidence: readonly TerrainEvidenceState[],
  item: TerrainEvidenceState,
  limit = MAX_TERRAIN_EVIDENCE,
): TerrainEvidenceState[] {
  const next = [...evidence, item]
  return next.length > limit ? next.slice(next.length - limit) : next
}

export function projectTerrainEvidenceForSide(
  evidence: readonly TerrainEvidenceState[],
  options: {
    listener: AcousticCell
    now: number
    isCellVisible: (col: number, row: number) => boolean
    isOccludingCell?: (col: number, row: number) => boolean
  },
): TerrainEvidenceSnapshot[] {
  return evidence.flatMap((item) => {
    const source = { col: item.sourceCol, row: item.sourceRow }
    const sourceVisible = options.isCellVisible(source.col, source.row)
    const acousticKind = terrainEvidenceAcousticKind(item.kind)
    const cue = acousticKind
      ? projectAcousticEventForListener({
          event: createAcousticEvent({
            id: item.id,
            kind: acousticKind,
            source,
            emittedAt: options.now - item.age,
            intensity: item.strength,
          }),
          listener: options.listener,
          now: options.now,
          sourceVisible,
          isOccludingCell: options.isOccludingCell,
        })
      : null

    if (!sourceVisible && !cue) {
      return []
    }

    const projectedStrength = sourceVisible || !cue
      ? item.strength
      : item.strength * cue.gain

    return [{
      id: item.id,
      kind: item.kind,
      channel: acousticKind ? 'physical' as const : 'signal' as const,
      surface: item.surface,
      col: sourceVisible ? source.col : item.col,
      row: sourceVisible ? source.row : item.row,
      dir: item.dir,
      age: Number(item.age.toFixed(2)),
      ttl: Number(item.ttl.toFixed(2)),
      strength: Number(projectedStrength.toFixed(2)),
      label: item.label,
      audible: cue !== null,
      sourcePrecision: sourceVisible ? 'exact' as const : 'directional' as const,
      hearing: cue
        ? {
            direction: cue.direction,
            distanceBand: cue.distanceBand,
            occluded: cue.occluded,
          }
        : null,
    }]
  })
}

export function terrainEvidenceAcousticKind(
  kind: TerrainEvidenceKind,
): AcousticEventKind | null {
  if (kind === 'rustle') return 'rustle'
  if (kind === 'ricochet') return 'impact'
  if (kind === 'dust' || kind === 'noise' || kind === 'metal') return 'tracks'
  return null
}

export function distortEchoEvidenceCell(
  col: number,
  row: number,
  mapCols: number,
  mapRows: number,
) {
  const horizontal = row % 2 === 0 ? 1 : -1
  const vertical = col % 2 === 0 ? -1 : 1
  return {
    x: Math.floor(clamp(col + horizontal, 0, Math.max(0, mapCols - 1))),
    y: Math.floor(clamp(row + vertical, 0, Math.max(0, mapRows - 1))),
  }
}

export function distortHiddenEvidenceCell(options: {
  col: number
  row: number
  salt: string
  mapCols: number
  mapRows: number
}) {
  const offsets = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ]
  const hash = hiddenEvidenceHash(options.col, options.row, options.salt)

  for (let attempt = 0; attempt < offsets.length; attempt += 1) {
    const offset = offsets[Math.abs(hash + attempt) % offsets.length]
    if (!offset) continue
    const nextCol = options.col + offset.x
    const nextRow = options.row + offset.y
    if (isInBounds(nextCol, nextRow, options.mapCols, options.mapRows)) {
      return { x: nextCol, y: nextRow }
    }
  }

  return distortEchoEvidenceCell(
    options.col,
    options.row,
    options.mapCols,
    options.mapRows,
  )
}

export function distortHiddenEchoPulseCell(options: {
  col: number
  row: number
  dir: Direction
  salt: string
  mapCols: number
  mapRows: number
  isSolid: (col: number, row: number) => boolean
}) {
  const forward = directionVector(options.dir)
  const offsets = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ].filter((offset) => offset.x * forward.x + offset.y * forward.y <= 0)
  const hash = hiddenEvidenceHash(options.col, options.row, options.salt)

  for (const allowSolid of [false, true]) {
    for (let attempt = 0; attempt < offsets.length; attempt += 1) {
      const offset = offsets[Math.abs(hash + attempt) % offsets.length]
      if (!offset) continue
      const nextCol = options.col + offset.x
      const nextRow = options.row + offset.y
      if (!isInBounds(nextCol, nextRow, options.mapCols, options.mapRows)) {
        continue
      }
      if (!allowSolid && options.isSolid(nextCol, nextRow)) {
        continue
      }
      return { x: nextCol, y: nextRow }
    }
  }

  return { x: options.col, y: options.row }
}

export function hiddenEvidenceHash(col: number, row: number, salt: string) {
  let hash = col * 73856093 ^ row * 19349663
  for (let index = 0; index < salt.length; index += 1) {
    hash = Math.imul(hash ^ salt.charCodeAt(index), 16777619)
  }
  return hash
}

function isInBounds(col: number, row: number, mapCols: number, mapRows: number) {
  return col >= 0 && row >= 0 && col < mapCols && row < mapRows
}

function directionVector(direction: Direction) {
  if (direction === 'right') return { x: 1, y: 0 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 0, y: -1 }
}
