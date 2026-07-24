import { classCellDistance, type TankClassId } from './tankClasses.js'

export const PORTABLE_RELAY_TUNING = {
  placeSeconds: 1.2,
  recoverSeconds: 0.9,
  recoverRangeCells: 1,
  pulsePeriodSeconds: 1.5,
  waveTtlSeconds: 1.8,
  waveSpeedCellsPerSecond: 110 / 32,
  rayCount: 32,
  signalStrength: 1,
  maxBounces: 2,
  bounceStrength: 0.55,
  minimumStrength: 0.18,
  contactTtlSeconds: 1,
  probeRadiusCells: 2 / 32,
  decoyInsetCells: 6 / 32,
} as const

export const PORTABLE_RELAY_LIMITS: Record<TankClassId, number> = {
  scout: 1,
  engineer: 2,
  battle: 1,
}

export interface PortableRelayCell {
  col: number
  row: number
}

export interface PortableRelayUnit extends PortableRelayCell {
  id: string
}

export type PortableRelayInteraction =
  | { action: 'place'; col: number; row: number; duration: number }
  | { action: 'recover'; col: number; row: number; duration: number; relayId: string }

export interface PortableSignalWave {
  id: string
  x: number
  y: number
  previousX: number
  previousY: number
  sourceTeam?: 'blue' | 'red'
  sourceId?: string
  detectsHostiles: boolean
  vx: number
  vy: number
  age: number
  ttl: number
  strength: number
  bounces: number
}

export interface PortableSignalContact {
  id: string
  kind: 'wall' | 'hostile'
  col: number
  row: number
  x: number
  y: number
  age: number
  ttl: number
  strength: number
  sourceTeam?: 'blue' | 'red'
  sourceId?: string
  targetId?: string
  team?: 'blue' | 'red'
}

export interface PortableSignalTarget extends PortableRelayCell {
  id: string
  team?: 'blue' | 'red'
  x: number
  y: number
  width: number
  height: number
}

export interface PortableSignalEnvironment {
  cols: number
  rows: number
  cellSize: number
  originX?: number
  originY?: number
  isSolidCell: (col: number, row: number) => boolean
  hostileTargets?: readonly PortableSignalTarget[]
  decoyTargets?: readonly PortableSignalTarget[]
}

export interface CreatePortableSignalPulseOptions {
  idPrefix: string
  center: { x: number; y: number }
  cellSize: number
  sourceTeam?: 'blue' | 'red'
  sourceId?: string
  detectsHostiles?: boolean
  startRadiusCells?: number
  rayCount?: number
}

export interface AdvancePortableSignalFieldOptions {
  waves: readonly PortableSignalWave[]
  contacts: readonly PortableSignalContact[]
  dt: number
  environment: PortableSignalEnvironment
}

export function getPortableRelayLimit(classId: TankClassId) {
  return PORTABLE_RELAY_LIMITS[classId]
}

export function getPortableRelayInteraction(
  player: PortableRelayCell,
  relays: readonly PortableRelayUnit[],
  limit: number,
): PortableRelayInteraction | null {
  const recoverable = relays.find((relay) =>
    classCellDistance(player, relay) <= PORTABLE_RELAY_TUNING.recoverRangeCells,
  )
  if (recoverable) {
    return {
      action: 'recover',
      col: recoverable.col,
      row: recoverable.row,
      duration: PORTABLE_RELAY_TUNING.recoverSeconds,
      relayId: recoverable.id,
    }
  }
  if (relays.length >= limit) return null
  return {
    action: 'place',
    col: player.col,
    row: player.row,
    duration: PORTABLE_RELAY_TUNING.placeSeconds,
  }
}

export function createPortableSignalPulse(options: CreatePortableSignalPulseOptions) {
  const rayCount = options.rayCount ?? PORTABLE_RELAY_TUNING.rayCount
  const startRadius = Math.max(0, options.startRadiusCells ?? 0) * options.cellSize
  const waves: PortableSignalWave[] = []
  for (let index = 0; index < rayCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rayCount
    const ringOffset = Math.max(
      0,
      startRadius + (startRadius > 0 ? (index % 4) * (3 / 32) * options.cellSize : 0),
    )
    const previousOffset = Math.max(0, ringOffset - (7 / 32) * options.cellSize)
    const vx = Math.cos(angle)
    const vy = Math.sin(angle)
    waves.push({
      id: `${options.idPrefix}-${index}`,
      x: options.center.x + vx * ringOffset,
      y: options.center.y + vy * ringOffset,
      previousX: options.center.x + vx * previousOffset,
      previousY: options.center.y + vy * previousOffset,
      sourceTeam: options.sourceTeam,
      sourceId: options.sourceId,
      detectsHostiles: options.detectsHostiles ?? true,
      vx,
      vy,
      age: 0,
      ttl: PORTABLE_RELAY_TUNING.waveTtlSeconds,
      strength: PORTABLE_RELAY_TUNING.signalStrength,
      bounces: 0,
    })
  }
  return waves
}

export function advancePortableSignalField(options: AdvancePortableSignalFieldOptions) {
  const dt = Math.max(0, options.dt)
  const environment = options.environment
  const contacts = options.contacts
    .map((contact) => ({ ...contact, age: contact.age + dt }))
    .filter((contact) => contact.age < contact.ttl)
  const waves: PortableSignalWave[] = []
  let newContactCount = 0

  for (const sourceWave of options.waves) {
    const wave = { ...sourceWave, age: sourceWave.age + dt }
    if (wave.age >= wave.ttl || wave.strength < PORTABLE_RELAY_TUNING.minimumStrength) continue

    wave.previousX = wave.x
    wave.previousY = wave.y
    const travel = PORTABLE_RELAY_TUNING.waveSpeedCellsPerSecond * environment.cellSize * dt
    const nextX = wave.x + wave.vx * travel
    const nextY = wave.y + wave.vy * travel
    const wallBounce = getWallBounce(environment, wave, nextX, nextY)

    if (wallBounce) {
      bounceWave(wave, wallBounce.flipX, wallBounce.flipY)
      newContactCount += upsertContact(contacts, {
        id: `portable-contact-wall-${wallBounce.col}-${wallBounce.row}`,
        kind: 'wall',
        col: wallBounce.col,
        row: wallBounce.row,
        x: nextX,
        y: nextY,
        age: 0,
        ttl: PORTABLE_RELAY_TUNING.contactTtlSeconds,
        strength: wave.strength,
        sourceTeam: wave.sourceTeam,
        sourceId: wave.sourceId,
      })
      waves.push(wave)
      continue
    }

    if (wave.detectsHostiles) {
      const target = findEnteringTarget(environment, wave, nextX, nextY)
      if (target) {
        reflectWaveFromPoint(
          wave,
          target.x + target.width / 2,
          target.y + target.height / 2,
        )
        newContactCount += upsertContact(contacts, {
          id: `portable-contact-${target.id}`,
          kind: 'hostile',
          col: target.col,
          row: target.row,
          x: nextX,
          y: nextY,
          age: 0,
          ttl: PORTABLE_RELAY_TUNING.contactTtlSeconds,
          strength: wave.strength,
          sourceTeam: wave.sourceTeam,
          sourceId: wave.sourceId,
          targetId: target.id,
          team: target.team,
        })
        waves.push(wave)
        continue
      }
    }

    wave.x = nextX
    wave.y = nextY
    waves.push(wave)
  }

  return { waves, contacts, newContactCount }
}

function findEnteringTarget(
  environment: PortableSignalEnvironment,
  wave: PortableSignalWave,
  nextX: number,
  nextY: number,
) {
  const targets = [...(environment.decoyTargets ?? []), ...(environment.hostileTargets ?? [])]
  const radius = PORTABLE_RELAY_TUNING.probeRadiusCells * environment.cellSize
  const nextProbe = { x: nextX - radius, y: nextY - radius, width: radius * 2, height: radius * 2 }
  const previousProbe = { x: wave.x - radius, y: wave.y - radius, width: radius * 2, height: radius * 2 }
  return targets.find((target) =>
    (wave.sourceTeam === undefined || target.team === undefined || target.team !== wave.sourceTeam)
    && rectanglesIntersect(nextProbe, target)
    && !rectanglesIntersect(previousProbe, target),
  )
}

function getWallBounce(
  environment: PortableSignalEnvironment,
  wave: PortableSignalWave,
  nextX: number,
  nextY: number,
) {
  const next = getSignalCell(environment, nextX, nextY)
  if (!next || environment.isSolidCell(next.col, next.row)) {
    const fallback = clampSignalCell(
      environment,
      next?.col ?? getSignalCol(environment, nextX),
      next?.row ?? getSignalRow(environment, nextY),
    )
    return { ...fallback, flipX: true, flipY: true }
  }

  const horizontalCell = getSignalCell(environment, nextX, wave.y)
  const verticalCell = getSignalCell(environment, wave.x, nextY)
  const hitHorizontal = !horizontalCell || environment.isSolidCell(horizontalCell.col, horizontalCell.row)
  const hitVertical = !verticalCell || environment.isSolidCell(verticalCell.col, verticalCell.row)
  if (!hitHorizontal && !hitVertical) return null

  const contact = clampSignalCell(
    environment,
    (hitHorizontal ? horizontalCell?.col : verticalCell?.col) ?? next.col,
    (hitVertical ? verticalCell?.row : horizontalCell?.row) ?? next.row,
  )
  return {
    ...contact,
    flipX: hitHorizontal || !hitVertical,
    flipY: hitVertical || !hitHorizontal,
  }
}

function bounceWave(wave: PortableSignalWave, flipX: boolean, flipY: boolean) {
  if (flipX) wave.vx *= -1
  if (flipY) wave.vy *= -1
  weakenReflectedWave(wave)
}

function reflectWaveFromPoint(wave: PortableSignalWave, centerX: number, centerY: number) {
  let nx = wave.x - centerX
  let ny = wave.y - centerY
  const length = Math.hypot(nx, ny) || 1
  nx /= length
  ny /= length
  const dot = wave.vx * nx + wave.vy * ny
  wave.vx -= 2 * dot * nx
  wave.vy -= 2 * dot * ny
  weakenReflectedWave(wave)
}

function weakenReflectedWave(wave: PortableSignalWave) {
  wave.bounces += 1
  wave.strength *= PORTABLE_RELAY_TUNING.bounceStrength
  if (wave.bounces > PORTABLE_RELAY_TUNING.maxBounces) wave.age = wave.ttl
}

function upsertContact(contacts: PortableSignalContact[], next: PortableSignalContact) {
  const index = next.targetId
    ? contacts.findIndex((contact) =>
        contact.targetId === next.targetId && contact.sourceTeam === next.sourceTeam,
      )
    : contacts.findIndex((contact) =>
        contact.kind === next.kind
        && contact.col === next.col
        && contact.row === next.row
        && contact.sourceTeam === next.sourceTeam,
      )
  if (index >= 0) {
    contacts[index] = next
    return 0
  }
  contacts.push(next)
  return 1
}

function getSignalCell(environment: PortableSignalEnvironment, x: number, y: number) {
  const col = getSignalCol(environment, x)
  const row = getSignalRow(environment, y)
  if (col < 0 || row < 0 || col >= environment.cols || row >= environment.rows) return null
  return { col, row }
}

function getSignalCol(environment: PortableSignalEnvironment, x: number) {
  return Math.floor((x - (environment.originX ?? 0)) / environment.cellSize)
}

function getSignalRow(environment: PortableSignalEnvironment, y: number) {
  return Math.floor((y - (environment.originY ?? 0)) / environment.cellSize)
}

function clampSignalCell(environment: PortableSignalEnvironment, col: number, row: number) {
  return {
    col: Math.floor(clampNumber(col, 0, Math.max(0, environment.cols - 1))),
    row: Math.floor(clampNumber(row, 0, Math.max(0, environment.rows - 1))),
  }
}

function rectanglesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  )
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
