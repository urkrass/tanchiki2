import { describe, expect, it } from 'vitest'
import {
  TANK_CLASS_MECHANICS,
  getClassDeployableInteraction,
  getSharedTankClassCombatStats,
  isTraverseMovementDirection,
  lateralDirection,
} from './tankClasses.ts'

describe('shared tank class mechanics', () => {
  it('defines the one combat contract consumed by offline and online battles', () => {
    expect(TANK_CLASS_MECHANICS).toMatchObject({
      grid: { tileSize: 32, stationaryPivotHoldSeconds: 0.16 },
      movement: {
        baseDurationSeconds: 0.38,
        minimumDurationSeconds: 0.22,
        mineSlowMultiplier: 1.7,
        traverseDurationMultiplier: 1.25,
      },
      weapon: {
        baseDamage: 2,
        baseReloadSeconds: 1.6,
        projectileSpeedPixelsPerSecond: 240,
        projectileTtlSeconds: 2.05,
        shellCapacity: 10,
        shellRechargeSeconds: 2,
        battleSplashDamage: 1,
        battleSplashRadiusPixels: 40,
      },
      deployable: {
        placeSeconds: 0.9,
        recoverSeconds: 0.7,
        recoverRangeCells: 1,
        mineTriggerRangeCells: 1,
        mineDamage: 2,
        mineSlowSeconds: 10,
        steelTrapSeconds: 5,
        decoyContactTtlSeconds: 1,
      },
      bulwark: { durationSeconds: 5, capacity: 3, rechargeSeconds: 12 },
      traverse: { durationSeconds: 4, rechargeSeconds: 10 },
    })
    expect(getSharedTankClassCombatStats('scout')).toMatchObject({
      moveDuration: 0.312,
      reloadDuration: 1.6,
      damage: 1,
      splashDamage: 0,
    })
    expect(getSharedTankClassCombatStats('engineer')).toMatchObject({
      moveDuration: 0.38,
      reloadDuration: 1.92,
      damage: 2,
      splashDamage: 0,
    })
    expect(getSharedTankClassCombatStats('battle')).toMatchObject({
      moveDuration: 0.464,
      reloadDuration: 1.6,
      damage: 3,
      splashDamage: 1,
      splashRadiusPixels: 40,
    })
  })

  it('places on the tank cell and recovers from the same or an adjacent cell', () => {
    expect(getClassDeployableInteraction({ col: 8, row: 6 }, null)).toEqual({
      action: 'place', col: 8, row: 6,
    })
    expect(getClassDeployableInteraction({ col: 8, row: 6 }, { col: 8, row: 6 })).toEqual({
      action: 'recover', col: 8, row: 6,
    })
    expect(getClassDeployableInteraction({ col: 8, row: 6 }, { col: 9, row: 6 })).toEqual({
      action: 'recover', col: 9, row: 6,
    })
    expect(getClassDeployableInteraction({ col: 8, row: 6 }, { col: 9, row: 7 })).toBeNull()
  })

  it('keeps Traverse lateral to a fixed hull facing', () => {
    expect(lateralDirection('right', 'left')).toBe('up')
    expect(lateralDirection('right', 'right')).toBe('down')
    expect(isTraverseMovementDirection('right', 'up')).toBe(true)
    expect(isTraverseMovementDirection('right', 'down')).toBe(true)
    expect(isTraverseMovementDirection('right', 'right')).toBe(false)
    expect(isTraverseMovementDirection('right', 'left')).toBe(false)
  })
})
