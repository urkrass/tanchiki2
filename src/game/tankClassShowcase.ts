import type {
  TankClassId,
  TankClassShowcaseScene,
  TankClassShowcaseSnapshot,
} from './types.ts'

export const TANK_CLASS_SHOWCASE_SCENE_DURATION = 3

export const TANK_CLASS_SHOWCASE_SCENES: ReadonlyArray<{
  id: TankClassShowcaseScene
  label: string
}> = [
  { id: 'shooting', label: 'SHOOTING' },
  { id: 'breach', label: 'BREACH' },
  { id: 'duel', label: 'DUEL' },
  { id: 'race', label: 'RACE' },
  { id: 'class-kit', label: 'CLASS KIT' },
]

export const TANK_CLASS_SHOWCASE_LOOP_DURATION =
  TANK_CLASS_SHOWCASE_SCENES.length * TANK_CLASS_SHOWCASE_SCENE_DURATION

export function getTankClassShowcaseSnapshot(
  displayed: TankClassId,
  equipped: TankClassId,
  time: number,
  startedAt: number,
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
  }
}
