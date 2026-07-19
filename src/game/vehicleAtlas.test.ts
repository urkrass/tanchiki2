import vehicleAtlasSvg from '../../public/assets/sprites/tanchiki-vehicles-48.atlas.svg?raw'
import { describe, expect, it } from 'vitest'
import {
  CANONICAL_VEHICLE_DENSITY,
  getVehicleRuntimeSize,
  getVehicleSpriteRect,
  MAX_VEHICLE_RUNTIME_SIZE,
  STANDARD_VEHICLE_RUNTIME_SIZE,
  validateVehicleDensityManifest,
  VEHICLE_DENSITY_MANIFEST,
} from './vehicleAtlas.ts'

describe('canonical vehicle density atlas', () => {
  it('locks the accepted 48px class, team, and movement-frame contract', () => {
    expect(validateVehicleDensityManifest()).toEqual([])
    expect(CANONICAL_VEHICLE_DENSITY).toBe(48)
    expect(VEHICLE_DENSITY_MANIFEST).toMatchObject({
      path: 'assets/sprites/tanchiki-vehicles-48.atlas.svg?v=2',
      cellWidth: 48,
      cellHeight: 48,
      columns: 8,
      rows: 3,
      classes: ['scout', 'engineer', 'battle'],
      teams: ['blue', 'red', 'blueSafe', 'redSafe'],
      frames: 2,
    })
  })

  it('addresses 24 unique integer cells inside the generated 384 by 144 sheet', () => {
    const rectangles = VEHICLE_DENSITY_MANIFEST.classes.flatMap((tankClass) =>
      VEHICLE_DENSITY_MANIFEST.teams.flatMap((team) =>
        [0, 1].map((frame) => getVehicleSpriteRect(tankClass, team, frame)),
      ),
    )

    expect(rectangles).toHaveLength(24)
    expect(rectangles.every(Boolean)).toBe(true)
    expect(new Set(rectangles.map((rect) => `${rect?.x},${rect?.y},${rect?.w},${rect?.h}`)).size).toBe(24)
    for (const rect of rectangles) {
      expect(rect?.x).toBeGreaterThanOrEqual(0)
      expect(rect?.y).toBeGreaterThanOrEqual(0)
      expect((rect?.x ?? 0) + (rect?.w ?? 0)).toBeLessThanOrEqual(384)
      expect((rect?.y ?? 0) + (rect?.h ?? 0)).toBeLessThanOrEqual(144)
      expect(rect?.w).toBe(48)
      expect(rect?.h).toBe(48)
    }
  })

  it('separates authored source density from the one-tile runtime footprint', () => {
    expect(CANONICAL_VEHICLE_DENSITY).toBe(48)
    expect(STANDARD_VEHICLE_RUNTIME_SIZE).toBe(28)
    expect(MAX_VEHICLE_RUNTIME_SIZE).toBe(32)
    expect(getVehicleRuntimeSize(28, 'scout')).toBe(28)
    expect(getVehicleRuntimeSize(28, 'engineer')).toBe(28)
    expect(getVehicleRuntimeSize(28, 'battle')).toBe(32)
    expect(getVehicleRuntimeSize(64, 'scout')).toBe(28)
    expect(getVehicleRuntimeSize(64, 'engineer')).toBe(28)
    expect(getVehicleRuntimeSize(64, 'battle')).toBe(32)
  })

  it('keeps class structure, team identity, armor, and equipment as separate authored layers', () => {
    expect(vehicleAtlasSvg).toContain('width="384"')
    expect(vehicleAtlasSvg).toContain('height="144"')
    expect(vehicleAtlasSvg).toContain('viewBox="0 0 384 144"')
    expect(vehicleAtlasSvg).toContain('shape-rendering="crispEdges"')
    expect(vehicleAtlasSvg).toContain('data-layer="class-chassis"')
    expect(vehicleAtlasSvg).toContain('data-layer="class-turret"')
    expect(vehicleAtlasSvg).toContain('data-layer="team-rim"')
    expect(vehicleAtlasSvg).toContain('data-layer="team-fill"')
    expect(vehicleAtlasSvg).toContain('data-layer="armor-identity"')
    expect(vehicleAtlasSvg).toContain('data-layer="equipment"')
    expect(vehicleAtlasSvg).toContain('data-layer="track-detail"')
    expect(vehicleAtlasSvg).toContain('data-layer="panel-seam"')
    expect(vehicleAtlasSvg).toContain('data-layer="engine-detail"')
    expect(vehicleAtlasSvg).toContain('data-layer="hatch-detail"')
    expect(vehicleAtlasSvg).toContain('data-layer="optics"')
    expect(vehicleAtlasSvg).toContain('data-layer="rivet-detail"')

    for (const tankClass of VEHICLE_DENSITY_MANIFEST.classes) {
      for (const team of VEHICLE_DENSITY_MANIFEST.teams) {
        for (const frame of [0, 1]) {
          expect(vehicleAtlasSvg).toContain(`id="tank.${tankClass}.${team}.${frame}"`)
          const spriteGroup = vehicleAtlasSvg.match(
            new RegExp(`id="tank\\.${tankClass}\\.${team}\\.${frame}"[\\s\\S]*?</g>`),
          )?.[0]
          expect(spriteGroup?.match(/<rect /g)?.length ?? 0).toBeGreaterThanOrEqual(60)
        }
      }
    }
  })

  it('rejects density and grid drift', () => {
    expect(validateVehicleDensityManifest({ ...VEHICLE_DENSITY_MANIFEST, canonicalDensity: 64 })).toContain(
      'Canonical vehicle density must be 48.',
    )
    expect(validateVehicleDensityManifest({ ...VEHICLE_DENSITY_MANIFEST, columns: 7 })).toContain(
      'Vehicle atlas grid does not match the class/team/frame contract.',
    )
  })
})
