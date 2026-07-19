import type {
  TankClassId,
  TankClassShowcaseScene,
  TankClassShowcaseSnapshot,
} from './types.ts'

export const TANK_CLASS_SHOWCASE_SCENE_DURATION = 5

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
    paused,
  }
}

export function getTankClassShowcaseSceneTime(sceneProgress: number) {
  return Math.max(0, Math.min(1, sceneProgress)) *
    TANK_CLASS_SHOWCASE_SCENE_DURATION
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
