export type AcousticEventKind =
  | 'shot'
  | 'impact'
  | 'explosion'
  | 'tracks'
  | 'rustle'
  | 'trap'
  | 'environment'

export type AcousticLoudness = 'quiet' | 'normal' | 'loud' | 'shock'
export type AcousticDistanceBand = 'here' | 'near' | 'mid' | 'far'
export type AcousticDirection =
  | 'here'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west'

export interface AcousticCell {
  col: number
  row: number
}

export interface AcousticEvent {
  id: string
  kind: AcousticEventKind
  loudness: AcousticLoudness
  source: AcousticCell
  emittedAt: number
  lifetime: number
  intensity: number
}

export interface AudibleAcousticCue {
  id: string
  channel: 'physical'
  kind: AcousticEventKind
  loudness: AcousticLoudness
  age: number
  lifetime: number
  direction: AcousticDirection
  distanceBand: AcousticDistanceBand
  gain: number
  pan: number
  occluded: boolean
  sourcePrecision: 'exact' | 'directional'
  source?: AcousticCell
}

export interface AcousticEventRule {
  loudness: AcousticLoudness
  rangeCells: number
  lifetime: number
}

export const ACOUSTIC_EVENT_RULES: Readonly<Record<AcousticEventKind, AcousticEventRule>> = {
  shot: { loudness: 'loud', rangeCells: 9, lifetime: 0.5 },
  impact: { loudness: 'normal', rangeCells: 6, lifetime: 0.45 },
  explosion: { loudness: 'shock', rangeCells: 12, lifetime: 0.9 },
  tracks: { loudness: 'quiet', rangeCells: 3.25, lifetime: 0.55 },
  rustle: { loudness: 'quiet', rangeCells: 4, lifetime: 0.8 },
  trap: { loudness: 'normal', rangeCells: 6.5, lifetime: 0.75 },
  environment: { loudness: 'normal', rangeCells: 5.5, lifetime: 0.7 },
}

export const MAX_ACTIVE_ACOUSTIC_EVENTS = 48
const OCCLUSION_DISTANCE_PENALTY = 2

export function createAcousticEvent(options: {
  id: string
  kind: AcousticEventKind
  source: AcousticCell
  emittedAt: number
  intensity?: number
  loudness?: AcousticLoudness
  lifetime?: number
}): AcousticEvent {
  const rule = ACOUSTIC_EVENT_RULES[options.kind]
  return {
    id: options.id,
    kind: options.kind,
    loudness: options.loudness ?? rule.loudness,
    source: {
      col: finiteNumber(options.source.col),
      row: finiteNumber(options.source.row),
    },
    emittedAt: finiteNumber(options.emittedAt),
    lifetime: Math.max(0.05, finiteNumber(options.lifetime ?? rule.lifetime)),
    intensity: clamp(finiteNumber(options.intensity ?? 1), 0.5, 1.5),
  }
}

export function projectAcousticEventForListener(options: {
  event: AcousticEvent
  listener: AcousticCell
  now: number
  sourceVisible?: boolean
  isOccludingCell?: (col: number, row: number) => boolean
}): AudibleAcousticCue | null {
  const event = options.event
  const age = Math.max(0, finiteNumber(options.now) - event.emittedAt)
  if (age >= event.lifetime) {
    return null
  }

  const deltaCol = event.source.col - options.listener.col
  const deltaRow = event.source.row - options.listener.row
  const distance = Math.hypot(deltaCol, deltaRow)
  const occluderCount = options.isOccludingCell
    ? countOccludingCells(options.listener, event.source, options.isOccludingCell)
    : 0
  const effectiveDistance = distance + occluderCount * OCCLUSION_DISTANCE_PENALTY
  const maxDistance = ACOUSTIC_EVENT_RULES[event.kind].rangeCells * event.intensity
  if (effectiveDistance > maxDistance) {
    return null
  }

  const sourceVisible = options.sourceVisible === true
  const normalizedDistance = maxDistance <= 0 ? 1 : clamp(effectiveDistance / maxDistance, 0, 1)
  const cue: AudibleAcousticCue = {
    id: event.id,
    channel: 'physical',
    kind: event.kind,
    loudness: event.loudness,
    age: round(age),
    lifetime: round(event.lifetime),
    direction: acousticDirection(deltaCol, deltaRow),
    distanceBand: acousticDistanceBand(distance, maxDistance),
    gain: round(clamp((1 - normalizedDistance) * event.intensity, 0.12, 1)),
    pan: round(clamp(deltaCol / Math.max(1, maxDistance * 0.65), -1, 1)),
    occluded: occluderCount > 0,
    sourcePrecision: sourceVisible ? 'exact' : 'directional',
  }
  if (sourceVisible) {
    cue.source = { ...event.source }
  }
  return cue
}

export function projectAcousticEventsForListener(options: {
  events: readonly AcousticEvent[]
  listener: AcousticCell
  now: number
  isSourceVisible?: (source: AcousticCell) => boolean
  isOccludingCell?: (col: number, row: number) => boolean
}): AudibleAcousticCue[] {
  return options.events.flatMap((event) => {
    const cue = projectAcousticEventForListener({
      event,
      listener: options.listener,
      now: options.now,
      sourceVisible: options.isSourceVisible?.(event.source) ?? false,
      isOccludingCell: options.isOccludingCell,
    })
    return cue ? [cue] : []
  })
}

export function pruneAcousticEvents(
  events: readonly AcousticEvent[],
  now: number,
  limit = MAX_ACTIVE_ACOUSTIC_EVENTS,
): AcousticEvent[] {
  const active = events.filter((event) => finiteNumber(now) - event.emittedAt < event.lifetime)
  return active.slice(Math.max(0, active.length - Math.max(1, limit)))
}

export function describeAudibleAcousticCue(cue: AudibleAcousticCue) {
  const source = cue.kind === 'shot'
    ? 'Gunfire'
    : cue.kind === 'impact'
      ? 'Impact'
      : cue.kind === 'explosion'
        ? 'Explosion'
        : cue.kind === 'tracks'
          ? 'Tank tracks'
          : cue.kind === 'rustle'
            ? 'Foliage rustle'
            : cue.kind === 'trap'
              ? 'Trap'
              : 'Battlefield noise'
  if (cue.direction === 'here') {
    return `${source} at your position.`
  }
  return `${source} ${cue.distanceBand} to the ${cue.direction}.`
}

function countOccludingCells(
  listener: AcousticCell,
  source: AcousticCell,
  isOccludingCell: (col: number, row: number) => boolean,
) {
  const startCol = Math.round(listener.col)
  const startRow = Math.round(listener.row)
  const endCol = Math.round(source.col)
  const endRow = Math.round(source.row)
  const deltaCol = Math.abs(endCol - startCol)
  const deltaRow = Math.abs(endRow - startRow)
  const stepCol = startCol < endCol ? 1 : -1
  const stepRow = startRow < endRow ? 1 : -1
  let error = deltaCol - deltaRow
  let col = startCol
  let row = startRow
  let count = 0

  while (col !== endCol || row !== endRow) {
    const twiceError = error * 2
    if (twiceError > -deltaRow) {
      error -= deltaRow
      col += stepCol
    }
    if (twiceError < deltaCol) {
      error += deltaCol
      row += stepRow
    }
    if ((col !== endCol || row !== endRow) && isOccludingCell(col, row)) {
      count += 1
    }
  }

  return count
}

function acousticDirection(deltaCol: number, deltaRow: number): AcousticDirection {
  if (Math.hypot(deltaCol, deltaRow) < 0.5) {
    return 'here'
  }
  const sectors: AcousticDirection[] = [
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west',
    'north',
    'north-east',
  ]
  const angle = Math.atan2(deltaRow, deltaCol)
  const index = Math.round(angle / (Math.PI / 4) + 8) % 8
  return sectors[index] ?? 'here'
}

function acousticDistanceBand(distance: number, maxDistance: number): AcousticDistanceBand {
  if (distance < 0.5) return 'here'
  const ratio = maxDistance <= 0 ? 1 : distance / maxDistance
  if (ratio <= 0.34) return 'near'
  if (ratio <= 0.67) return 'mid'
  return 'far'
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}
