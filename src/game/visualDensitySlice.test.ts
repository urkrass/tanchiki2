import { describe, expect, it } from 'vitest'
import { TanchikiGame } from './game.ts'
import { MemorySaveStore } from './save.ts'
import {
  validateVisualDensitySlice,
  VISUAL_DENSITY_SLICE_LEVEL,
  VISUAL_DENSITY_SLICE_LEVEL_ID,
  VISUAL_DENSITY_SLICE_LEVEL_SLUG,
} from './visualDensitySlice.ts'

describe('visual-density campaign vertical slice', () => {
  it('is rectangular, contract-valid, and keeps blocker props mechanically terrain-backed', () => {
    expect(VISUAL_DENSITY_SLICE_LEVEL_SLUG).toBe('visual_density_slice')
    expect(VISUAL_DENSITY_SLICE_LEVEL.id).toBe(VISUAL_DENSITY_SLICE_LEVEL_ID)
    expect(VISUAL_DENSITY_SLICE_LEVEL.rows).toHaveLength(17)
    expect(VISUAL_DENSITY_SLICE_LEVEL.rows.every((row) => row.length === 21)).toBe(true)
    expect(validateVisualDensitySlice()).toEqual([])
  })

  it('separates the live relay from inactive or broken signal artwork', () => {
    expect(VISUAL_DENSITY_SLICE_LEVEL.retranslators).toEqual([{ x: 10, y: 8 }])
    expect(VISUAL_DENSITY_SLICE_LEVEL.props).toContainEqual(
      expect.objectContaining({ id: 'slice-static-relay', spriteId: 'relay_tower', x: 10, y: 2 }),
    )
    expect(VISUAL_DENSITY_SLICE_LEVEL.props).toContainEqual(
      expect.objectContaining({ id: 'slice-broken-relay', spriteId: 'broken_relay' }),
    )
  })

  it('starts as one honest playable mission without changing save or online protocol structures', () => {
    const game = new TanchikiGame({
      levelDefinitions: [VISUAL_DENSITY_SLICE_LEVEL],
      saveStore: new MemorySaveStore(),
    })
    game.startGame(VISUAL_DENSITY_SLICE_LEVEL_ID)
    const snapshot = game.getSnapshot()
    expect(snapshot.level.name).toBe('Relay Scar')
    expect(snapshot.mode).toBe('playing')
    expect(snapshot.map).toMatchObject({ cols: 21, rows: 17, viewportCols: 13, viewportRows: 13 })
    expect(snapshot.fog.totalRetranslatorCount).toBe(1)
    expect(snapshot.fog.visibleRetranslatorCount).toBe(0)
    expect(snapshot.battlefieldProps.total).toBe(12)
    expect(snapshot.fog.shape).toBe('circular')
    expect(snapshot.fog.hiddenCellCount).toBeGreaterThan(0)
  })
})
