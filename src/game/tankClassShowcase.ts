import type {
  TankClassId,
  TankClassShowcaseScene,
  TankClassShowcaseSnapshot,
} from './types.ts'
import {
  DEPLOYABLE_PLACE_SECONDS,
  ENEMY_BULLET_SPEED,
  MINE_SLOW_MULTIPLIER,
} from './constants.ts'

export const TANK_CLASS_SHOWCASE_ACTION_WINDOW = 5.5
export const TANK_CLASS_SHOWCASE_RESULT_HOLD = 1.75
export const TANK_CLASS_SHOWCASE_SCENE_DURATION =
  TANK_CLASS_SHOWCASE_ACTION_WINDOW + TANK_CLASS_SHOWCASE_RESULT_HOLD

export const TANK_CLASS_SHOWCASE_SCENES: ReadonlyArray<{
  id: TankClassShowcaseScene
  label: string
}> = [
  { id: 'shooting', label: 'LIVE FIRE' },
  { id: 'breach', label: 'BREAKTHROUGH' },
  { id: 'duel', label: 'DUEL' },
  { id: 'race', label: 'RACE' },
  { id: 'class-kit', label: 'FIELD KIT' },
]

export const TANK_CLASS_SHOWCASE_LOOP_DURATION =
  TANK_CLASS_SHOWCASE_SCENES.length * TANK_CLASS_SHOWCASE_SCENE_DURATION

export const SCOUT_DECOY_SHOWCASE_TIMING = {
  placementEndsAt: DEPLOYABLE_PLACE_SECONDS,
  relayAppearsAt: 1.45,
  fogStartsAt: 1.75,
  falseContactAt: 2.1,
  enemyPovStartsAt: 2.45,
  enemyFiresAt: 2.75,
  enemyShotDistance: 95,
  enemyShotImpactAt: 2.75 + 95 / ENEMY_BULLET_SPEED,
  wireStartsAt: 3.95,
} as const

export const SCOUT_WIRE_SHOWCASE_TIMING = {
  enemyStartsAt: 0.1,
  triggerDistance: 64,
  exitDistance: 120,
} as const

export const ENGINEER_KIT_SHOWCASE_TIMING = {
  enemyStartsAt: 0.25,
  mineDistance: 54,
  trapDistance: 132,
} as const

export type TankClassShowcaseDeviceMotion = {
  distance: number
  mineTriggered: boolean
  trapTriggered: boolean
  mineTriggeredAt: number
  trapTriggeredAt: number
}

export type ScoutDecoyShowcasePhase =
  | 'placing'
  | 'withdrawing'
  | 'relay'
  | 'fog'
  | 'false-contact'
  | 'enemy-pov'
  | 'enemy-fire'
  | 'enemy-impact'
  | 'wire'

export function getScoutDecoyShowcasePhase(
  sceneTime: number,
): ScoutDecoyShowcasePhase {
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.placementEndsAt) {
    return 'placing'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.relayAppearsAt) {
    return 'withdrawing'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.fogStartsAt) {
    return 'relay'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.falseContactAt) {
    return 'fog'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.enemyPovStartsAt) {
    return 'false-contact'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.enemyFiresAt) {
    return 'enemy-pov'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.enemyShotImpactAt) {
    return 'enemy-fire'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt) {
    return 'enemy-impact'
  }
  return 'wire'
}

export function getScoutWireShowcaseMotion(
  sceneTime: number,
  moveDurationPerTile: number,
  tileSize: number,
) {
  const speed = Math.max(1, tileSize) / Math.max(0.001, moveDurationPerTile)
  const localTime = Math.max(
    0,
    sceneTime - SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt,
  )
  const triggerAt =
    SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt +
    SCOUT_WIRE_SHOWCASE_TIMING.enemyStartsAt +
    SCOUT_WIRE_SHOWCASE_TIMING.triggerDistance / speed
  const distance = Math.min(
    SCOUT_WIRE_SHOWCASE_TIMING.exitDistance,
    Math.max(
      0,
      localTime - SCOUT_WIRE_SHOWCASE_TIMING.enemyStartsAt,
    ) * speed,
  )

  return {
    distance,
    triggered: distance >= SCOUT_WIRE_SHOWCASE_TIMING.triggerDistance,
    triggeredAt: triggerAt,
  }
}

export function getEngineerKitShowcaseMotion(
  sceneTime: number,
  moveDurationPerTile: number,
  tileSize: number,
): TankClassShowcaseDeviceMotion {
  const baseSpeed = Math.max(1, tileSize) /
    Math.max(0.001, moveDurationPerTile)
  const slowedSpeed = baseSpeed / MINE_SLOW_MULTIPLIER
  const mineTriggeredAt =
    ENGINEER_KIT_SHOWCASE_TIMING.enemyStartsAt +
    ENGINEER_KIT_SHOWCASE_TIMING.mineDistance / baseSpeed
  const trapTriggeredAt =
    mineTriggeredAt +
    (ENGINEER_KIT_SHOWCASE_TIMING.trapDistance -
      ENGINEER_KIT_SHOWCASE_TIMING.mineDistance) /
      slowedSpeed

  let distance = Math.max(
    0,
    sceneTime - ENGINEER_KIT_SHOWCASE_TIMING.enemyStartsAt,
  ) * baseSpeed
  if (sceneTime >= mineTriggeredAt) {
    distance =
      ENGINEER_KIT_SHOWCASE_TIMING.mineDistance +
      (sceneTime - mineTriggeredAt) * slowedSpeed
  }
  distance = Math.min(ENGINEER_KIT_SHOWCASE_TIMING.trapDistance, distance)

  return {
    distance,
    mineTriggered: sceneTime >= mineTriggeredAt,
    trapTriggered: sceneTime >= trapTriggeredAt,
    mineTriggeredAt,
    trapTriggeredAt,
  }
}

export function getTankClassShowcaseSnapshot(
  displayed: TankClassId,
  equipped: TankClassId,
  time: number,
  startedAt: number,
  paused = false,
): TankClassShowcaseSnapshot {
  const elapsedSinceStart = Math.max(0, time - startedAt)
  const elapsed = elapsedSinceStart % TANK_CLASS_SHOWCASE_LOOP_DURATION
  const sceneIndex = Math.min(
    TANK_CLASS_SHOWCASE_SCENES.length - 1,
    Math.floor(elapsed / TANK_CLASS_SHOWCASE_SCENE_DURATION),
  )
  const scene = TANK_CLASS_SHOWCASE_SCENES[sceneIndex] ?? TANK_CLASS_SHOWCASE_SCENES[0]

  return {
    displayed,
    equipped,
    scene: scene.id,
    sceneLabel: scene.label,
    sceneIndex,
    sceneProgress: Number(
      ((elapsed - sceneIndex * TANK_CLASS_SHOWCASE_SCENE_DURATION) /
        TANK_CLASS_SHOWCASE_SCENE_DURATION).toFixed(3),
    ),
    elapsed: Number(elapsed.toFixed(3)),
    sceneDuration: TANK_CLASS_SHOWCASE_SCENE_DURATION,
    loopDuration: TANK_CLASS_SHOWCASE_LOOP_DURATION,
    actionWindow: TANK_CLASS_SHOWCASE_ACTION_WINDOW,
    resultHold: TANK_CLASS_SHOWCASE_RESULT_HOLD,
    paused,
  }
}

export function getTankClassShowcaseSceneTime(
  sceneProgress: number,
  sceneDuration = TANK_CLASS_SHOWCASE_SCENE_DURATION,
) {
  return Math.max(0, Math.min(1, sceneProgress)) *
    sceneDuration
}

export function getTankClassShowcaseTimedProgress(
  sceneTime: number,
  startsAt: number,
  duration: number,
) {
  return Math.max(
    0,
    Math.min(
      1,
      (sceneTime - startsAt) / Math.max(0.001, duration),
    ),
  )
}

export function getTankClassShowcaseTravelDuration(
  distance: number,
  speed: number,
) {
  return Math.max(0, distance) / Math.max(0.001, speed)
}

export function getTankClassShowcaseMovementDuration(
  distance: number,
  moveDurationPerTile: number,
  tileSize: number,
) {
  return (
    (Math.max(0, distance) / Math.max(1, tileSize)) *
    Math.max(0, moveDurationPerTile)
  )
}
