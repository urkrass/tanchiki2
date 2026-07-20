import type {
  TankClassId,
  TankClassShowcaseScene,
  TankClassShowcaseSnapshot,
} from './types.ts'
import {
  DEPLOYABLE_PLACE_SECONDS,
  ENEMY_BULLET_SPEED,
  MINE_SLOW_MULTIPLIER,
  PORTABLE_RELAY_PULSE_PERIOD,
  PORTABLE_RELAY_RAY_COUNT,
  PORTABLE_RELAY_SIGNAL_STRENGTH,
  PORTABLE_RELAY_WAVE_SPEED,
  PORTABLE_RELAY_WAVE_TTL,
} from './constants.ts'

export const TANK_CLASS_SHOWCASE_ACTION_WINDOW = 5.5
export const TANK_CLASS_SHOWCASE_CLASS_KIT_ACTION_WINDOW = 16.5
export const TANK_CLASS_SHOWCASE_RESULT_HOLD = 1.75
export const TANK_CLASS_SHOWCASE_SCENE_DURATION =
  TANK_CLASS_SHOWCASE_ACTION_WINDOW + TANK_CLASS_SHOWCASE_RESULT_HOLD
export const TANK_CLASS_SHOWCASE_CLASS_KIT_DURATION =
  TANK_CLASS_SHOWCASE_CLASS_KIT_ACTION_WINDOW +
  TANK_CLASS_SHOWCASE_RESULT_HOLD

export const TANK_CLASS_SHOWCASE_SCENES: ReadonlyArray<{
  id: TankClassShowcaseScene
  label: string
  actionWindow: number
}> = [
  {
    id: 'shooting',
    label: 'LIVE FIRE',
    actionWindow: TANK_CLASS_SHOWCASE_ACTION_WINDOW,
  },
  {
    id: 'breach',
    label: 'BREAKTHROUGH',
    actionWindow: TANK_CLASS_SHOWCASE_ACTION_WINDOW,
  },
  {
    id: 'duel',
    label: 'DUEL',
    actionWindow: TANK_CLASS_SHOWCASE_ACTION_WINDOW,
  },
  {
    id: 'race',
    label: 'RACE',
    actionWindow: TANK_CLASS_SHOWCASE_ACTION_WINDOW,
  },
  {
    id: 'class-kit',
    label: 'FIELD KIT',
    actionWindow: TANK_CLASS_SHOWCASE_CLASS_KIT_ACTION_WINDOW,
  },
]

export const TANK_CLASS_SHOWCASE_LOOP_DURATION =
  TANK_CLASS_SHOWCASE_SCENES.reduce(
    (duration, scene) =>
      duration + scene.actionWindow + TANK_CLASS_SHOWCASE_RESULT_HOLD,
    0,
  )

export const SCOUT_DECOY_SHOWCASE_TIMING = {
  placementEndsAt: DEPLOYABLE_PLACE_SECONDS,
  withdrawalStartsAt: 1.55,
  enemyApproachStartsAt: 2.75,
  enemyApproachDistance: 60,
  relayFocusAt: 2.85,
  relayPulsePhaseSeconds: 0.75,
  fogStartsAt: 3.85,
  falseContactAt: 4.45,
  enemyPovStartsAt: 5.2,
  enemyFiresAt: 6.35,
  enemyShotDistance: 95,
  enemyShotImpactAt: 6.35 + 95 / ENEMY_BULLET_SPEED,
  wireStartsAt: 8.6,
} as const

export const SCOUT_WIRE_SHOWCASE_TIMING = {
  placementEndsAt: DEPLOYABLE_PLACE_SECONDS,
  withdrawalStartsAt: 1.55,
  enemyStartsAt: 2.8,
  fogStartsAt: 4.15,
  triggerDistance: 179,
  exitDistance: 227,
  signalWaveCount: 3,
  signalWaveInterval: 0.22,
  signalWavePeriod: 1.1,
  signalWaveMinRadius: 6,
  signalWaveMaxRadius: 44,
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
  | 'armed-hold'
  | 'withdrawing'
  | 'relay-focus'
  | 'fog'
  | 'false-contact'
  | 'enemy-pov'
  | 'enemy-fire'
  | 'enemy-impact'
  | 'wire'

export type ScoutWireShowcasePhase =
  | 'placing'
  | 'armed-hold'
  | 'withdrawing'
  | 'enemy-approach'
  | 'fog'
  | 'alert'

export type ScoutWireSignalWave = {
  radius: number
  alpha: number
}

export type ScoutDecoyRelayPulseWave = {
  angle: number
  age: number
  ttl: number
  strength: number
  radius: number
}

export type ScoutDecoyRelayPresentation = {
  visible: true
  active: true
  waves: ScoutDecoyRelayPulseWave[]
}

export function getScoutDecoyShowcasePhase(
  sceneTime: number,
): ScoutDecoyShowcasePhase {
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.placementEndsAt) {
    return 'placing'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.withdrawalStartsAt) {
    return 'armed-hold'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.relayFocusAt) {
    return 'withdrawing'
  }
  if (sceneTime < SCOUT_DECOY_SHOWCASE_TIMING.fogStartsAt) {
    return 'relay-focus'
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

export function getScoutDecoyRelayPulseWaves(
  sceneTime: number,
): ScoutDecoyRelayPulseWave[] {
  const pulseClock =
    Math.max(0, sceneTime) +
    SCOUT_DECOY_SHOWCASE_TIMING.relayPulsePhaseSeconds
  const latestPulseIndex = Math.floor(
    pulseClock / PORTABLE_RELAY_PULSE_PERIOD,
  )
  const earliestPulseIndex = Math.max(
    0,
    Math.ceil(
      (pulseClock - PORTABLE_RELAY_WAVE_TTL) /
        PORTABLE_RELAY_PULSE_PERIOD,
    ),
  )
  const waves: ScoutDecoyRelayPulseWave[] = []

  for (
    let pulseIndex = earliestPulseIndex;
    pulseIndex <= latestPulseIndex;
    pulseIndex += 1
  ) {
    const age =
      pulseClock -
      pulseIndex * PORTABLE_RELAY_PULSE_PERIOD
    if (age < 0 || age >= PORTABLE_RELAY_WAVE_TTL) {
      continue
    }

    for (
      let rayIndex = 0;
      rayIndex < PORTABLE_RELAY_RAY_COUNT;
      rayIndex += 1
    ) {
      waves.push({
        angle:
          (Math.PI * 2 * rayIndex) /
          PORTABLE_RELAY_RAY_COUNT,
        age,
        ttl: PORTABLE_RELAY_WAVE_TTL,
        strength: PORTABLE_RELAY_SIGNAL_STRENGTH,
        radius: age * PORTABLE_RELAY_WAVE_SPEED,
      })
    }
  }

  return waves
}

export function getScoutDecoyRelayPresentation(
  sceneTime: number,
): ScoutDecoyRelayPresentation {
  return {
    visible: true,
    active: true,
    waves: getScoutDecoyRelayPulseWaves(sceneTime),
  }
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

export function getScoutDecoyEnemyApproachMotion(
  sceneTime: number,
  moveDurationPerTile: number,
  tileSize: number,
) {
  const speed = Math.max(1, tileSize) / Math.max(0.001, moveDurationPerTile)
  const distance = Math.min(
    SCOUT_DECOY_SHOWCASE_TIMING.enemyApproachDistance,
    Math.max(
      0,
      sceneTime - SCOUT_DECOY_SHOWCASE_TIMING.enemyApproachStartsAt,
    ) * speed,
  )

  return {
    distance,
    entered: distance > 0,
    complete:
      distance >= SCOUT_DECOY_SHOWCASE_TIMING.enemyApproachDistance,
  }
}

export function getScoutWireShowcasePhase(
  sceneTime: number,
  moveDurationPerTile: number,
  tileSize: number,
): ScoutWireShowcasePhase {
  const localTime = Math.max(
    0,
    sceneTime - SCOUT_DECOY_SHOWCASE_TIMING.wireStartsAt,
  )
  if (localTime < SCOUT_WIRE_SHOWCASE_TIMING.placementEndsAt) {
    return 'placing'
  }
  if (localTime < SCOUT_WIRE_SHOWCASE_TIMING.withdrawalStartsAt) {
    return 'armed-hold'
  }
  if (localTime < SCOUT_WIRE_SHOWCASE_TIMING.enemyStartsAt) {
    return 'withdrawing'
  }
  const motion = getScoutWireShowcaseMotion(
    sceneTime,
    moveDurationPerTile,
    tileSize,
  )
  if (motion.triggered) {
    return 'alert'
  }
  return localTime < SCOUT_WIRE_SHOWCASE_TIMING.fogStartsAt
    ? 'enemy-approach'
    : 'fog'
}

export function getScoutWireSignalWaves(
  alertElapsed: number,
): ScoutWireSignalWave[] {
  const safeElapsed = Math.max(0, alertElapsed)
  const radiusRange =
    SCOUT_WIRE_SHOWCASE_TIMING.signalWaveMaxRadius -
    SCOUT_WIRE_SHOWCASE_TIMING.signalWaveMinRadius
  const waves: ScoutWireSignalWave[] = []

  for (
    let index = 0;
    index < SCOUT_WIRE_SHOWCASE_TIMING.signalWaveCount;
    index += 1
  ) {
    const startsAt =
      index * SCOUT_WIRE_SHOWCASE_TIMING.signalWaveInterval
    if (safeElapsed < startsAt) {
      continue
    }
    const cycle =
      (safeElapsed - startsAt) %
      SCOUT_WIRE_SHOWCASE_TIMING.signalWavePeriod
    const progress =
      cycle / SCOUT_WIRE_SHOWCASE_TIMING.signalWavePeriod
    waves.push({
      radius:
        SCOUT_WIRE_SHOWCASE_TIMING.signalWaveMinRadius +
        radiusRange * progress,
      alpha: Math.max(0, (1 - progress) * 0.82),
    })
  }

  return waves
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
  let sceneIndex = 0
  let sceneStart = 0
  for (
    let index = 0;
    index < TANK_CLASS_SHOWCASE_SCENES.length;
    index += 1
  ) {
    const duration = getTankClassShowcaseSceneDuration(index)
    if (elapsed < sceneStart + duration) {
      sceneIndex = index
      break
    }
    sceneStart += duration
  }
  const scene = TANK_CLASS_SHOWCASE_SCENES[sceneIndex] ?? TANK_CLASS_SHOWCASE_SCENES[0]
  const sceneDuration =
    scene.actionWindow + TANK_CLASS_SHOWCASE_RESULT_HOLD

  return {
    displayed,
    equipped,
    scene: scene.id,
    sceneLabel: scene.label,
    sceneIndex,
    sceneProgress: Number(
      ((elapsed - sceneStart) / sceneDuration).toFixed(3),
    ),
    elapsed: Number(elapsed.toFixed(3)),
    sceneDuration,
    loopDuration: TANK_CLASS_SHOWCASE_LOOP_DURATION,
    actionWindow: scene.actionWindow,
    resultHold: TANK_CLASS_SHOWCASE_RESULT_HOLD,
    paused,
  }
}

export function getTankClassShowcaseSceneDuration(sceneIndex: number) {
  const scene =
    TANK_CLASS_SHOWCASE_SCENES[sceneIndex] ??
    TANK_CLASS_SHOWCASE_SCENES[0]
  return scene.actionWindow + TANK_CLASS_SHOWCASE_RESULT_HOLD
}

export function getTankClassShowcaseSceneStart(sceneIndex: number) {
  let offset = 0
  const boundedIndex = Math.max(
    0,
    Math.min(sceneIndex, TANK_CLASS_SHOWCASE_SCENES.length),
  )
  for (let index = 0; index < boundedIndex; index += 1) {
    offset += getTankClassShowcaseSceneDuration(index)
  }
  return offset
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
