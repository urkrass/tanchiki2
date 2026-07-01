import { MULTIPLAYER_TUNING, type Direction, type Team } from '../../packages/shared/src/index.ts'

export const ONLINE_LOCAL_SHOT_DURATION_MS = 220
export const ONLINE_BULLET_SMOOTHING_MODE = 'synthetic-first-seen' as const

export interface OnlineShotSource {
  id: string
  team: Team
  dir: Direction
  x: number
  y: number
  alive: boolean
}

export interface OnlineShotEffect {
  id: string
  sourceId: string
  team: Team
  dir: Direction
  originX: number
  originY: number
  muzzleX: number
  muzzleY: number
  startedAt: number
  durationMs: number
  progress: number
}

type StoredShotEffect = Omit<OnlineShotEffect, 'progress'>

export class OnlineShotFeedback {
  private effects: StoredShotEffect[] = []
  private lastShotAt = Number.NEGATIVE_INFINITY
  private nextId = 1
  private readonly cooldownMs: number
  private readonly durationMs: number

  constructor(cooldownMs = MULTIPLAYER_TUNING.reloadSeconds * 1000, durationMs = ONLINE_LOCAL_SHOT_DURATION_MS) {
    this.cooldownMs = cooldownMs
    this.durationMs = durationMs
  }

  trigger(source: OnlineShotSource, now: number) {
    if (!source.alive || now - this.lastShotAt < this.cooldownMs) {
      return null
    }

    const vector = vectorForDirection(source.dir)
    const effect: StoredShotEffect = {
      id: `local-shot-${this.nextId++}`,
      sourceId: source.id,
      team: source.team,
      dir: source.dir,
      originX: source.x,
      originY: source.y,
      muzzleX: source.x + vector.x * 0.48,
      muzzleY: source.y + vector.y * 0.48,
      startedAt: now,
      durationMs: this.durationMs,
    }

    this.lastShotAt = now
    this.effects.push(effect)
    return this.toPublicEffect(effect, now)
  }

  getActive(now: number) {
    this.effects = this.effects.filter((effect) => now - effect.startedAt <= effect.durationMs)
    return this.effects.map((effect) => this.toPublicEffect(effect, now))
  }

  clear() {
    this.effects = []
    this.lastShotAt = Number.NEGATIVE_INFINITY
  }

  getDebug(now: number) {
    const active = this.getActive(now)
    return {
      activeLocalShotEffects: active.length,
      localShotCooldownMs: this.cooldownMs,
      lastLocalShotAgeMs: Number.isFinite(this.lastShotAt) ? Math.max(0, Math.round(now - this.lastShotAt)) : null,
    }
  }

  private toPublicEffect(effect: StoredShotEffect, now: number): OnlineShotEffect {
    return {
      ...effect,
      progress: clamp((now - effect.startedAt) / effect.durationMs, 0, 1),
    }
  }
}

function vectorForDirection(direction: Direction) {
  if (direction === 'right') return { x: 1, y: 0 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 0, y: -1 }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
