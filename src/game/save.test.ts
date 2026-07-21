import { describe, expect, it } from 'vitest'
import { createDefaultSaveData, normalizeSaveData, SAVE_KEY } from './save.ts'

describe('touch settings save compatibility', () => {
  it('keeps the v1 key and supplies Standard layout to existing saves', () => {
    const oldSave = createDefaultSaveData()
    delete (oldSave.settings as Partial<typeof oldSave.settings>).touchHandedness

    const normalized = normalizeSaveData(oldSave)

    expect(SAVE_KEY).toBe('tanchiki.save.v1')
    expect(normalized.schemaVersion).toBe(1)
    expect(normalized.settings.touchHandedness).toBe('standard')
  })

  it('persists only supported handedness values', () => {
    const mirrored = createDefaultSaveData()
    mirrored.settings.touchHandedness = 'mirrored'
    expect(normalizeSaveData(mirrored).settings.touchHandedness).toBe('mirrored')

    const invalid = createDefaultSaveData() as unknown as { settings: { touchHandedness: string } }
    invalid.settings.touchHandedness = 'ambidextrous'
    expect(normalizeSaveData(invalid).settings.touchHandedness).toBe('standard')
  })
})
