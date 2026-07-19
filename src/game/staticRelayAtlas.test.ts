import staticRelayAtlasSvg from '../../public/assets/sprites/tanchiki-static-relay-64x120.atlas.svg?raw'
import { describe, expect, it } from 'vitest'
import {
  getStaticRelayRuntimeDimensions,
  getStaticRelaySpriteRect,
  STATIC_RELAY_DENSITY_MANIFEST,
  STATIC_RELAY_RUNTIME_HEIGHT,
  STATIC_RELAY_RUNTIME_WIDTH,
  validateStaticRelayDensityManifest,
} from './staticRelayAtlas.ts'

describe('static relay density atlas', () => {
  it('uses a taller authored source and a larger battlefield footprint', () => {
    expect(validateStaticRelayDensityManifest()).toEqual([])
    expect(STATIC_RELAY_DENSITY_MANIFEST).toMatchObject({
      path: 'assets/sprites/tanchiki-static-relay-64x120.atlas.svg?v=1',
      canonicalWidth: 64,
      canonicalHeight: 120,
      cellWidth: 64,
      cellHeight: 120,
      columns: 2,
      rows: 1,
      frames: 2,
    })
    expect(STATIC_RELAY_RUNTIME_WIDTH).toBe(32)
    expect(STATIC_RELAY_RUNTIME_HEIGHT).toBe(60)
    expect(getStaticRelayRuntimeDimensions(32)).toEqual({ width: 32, height: 60 })
    expect(getStaticRelayRuntimeDimensions(24)).toEqual({ width: 24, height: 36 })
  })

  it('addresses both restrained signal frames inside the atlas', () => {
    expect(getStaticRelaySpriteRect(0)).toEqual({ id: 'static-relay.0', x: 0, y: 0, w: 64, h: 120 })
    expect(getStaticRelaySpriteRect(1)).toEqual({ id: 'static-relay.1', x: 64, y: 0, w: 64, h: 120 })
    expect(getStaticRelaySpriteRect(3)).toEqual({ id: 'static-relay.1', x: 64, y: 0, w: 64, h: 120 })
  })

  it('keeps detail coherent with four structural colors and one dish', () => {
    expect(staticRelayAtlasSvg).toContain('width="128"')
    expect(staticRelayAtlasSvg).toContain('height="120"')
    expect(staticRelayAtlasSvg).toContain('viewBox="0 0 128 120"')
    expect(staticRelayAtlasSvg).toContain('shape-rendering="crispEdges"')
    expect(staticRelayAtlasSvg).toContain('data-layer="red-white-structure"')
    expect(staticRelayAtlasSvg).toContain('data-layer="single-dish"')
    expect(staticRelayAtlasSvg).toContain('data-layer="ownership-plaque"')
    expect(staticRelayAtlasSvg.match(/data-layer="single-dish"/g)).toHaveLength(1)

    const colors = new Set(
      [...staticRelayAtlasSvg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((match) => match[1].toUpperCase()),
    )
    expect(colors).toEqual(new Set(['#111716', '#C83A32', '#F4EEE0', '#B8BEB8']))
  })

  it('rejects density and frame-grid drift', () => {
    expect(
      validateStaticRelayDensityManifest({ ...STATIC_RELAY_DENSITY_MANIFEST, canonicalHeight: 96 }),
    ).toContain('Canonical static relay density must be 64 by 120.')
    expect(
      validateStaticRelayDensityManifest({ ...STATIC_RELAY_DENSITY_MANIFEST, columns: 3 }),
    ).toContain('Static relay atlas grid does not match the frame contract.')
  })
})
