import { describe, expect, it } from 'vitest'
import { parseFaultLabArgs, parseSyntheticLabArgs, readCliValue } from './cli-args.mjs'

describe('online QA CLI arguments', () => {
  it('returns undefined when a flag is absent or has no value', () => {
    expect(readCliValue(['--progress'], '--matches')).toBeUndefined()
    expect(readCliValue(['--matches'], '--matches')).toBeUndefined()
  })

  it('keeps synthetic-lab defaults when only a boolean flag is supplied', () => {
    expect(parseSyntheticLabArgs(['--progress'])).toEqual({
      matches: 3,
      seed: null,
      mode: 'scripted',
      realtime: false,
      progress: true,
    })
  })

  it('keeps fault-lab defaults when flags are omitted independently', () => {
    expect(parseFaultLabArgs(['--matches', '2'])).toEqual({
      profile: 'mixed',
      matches: 2,
      seed: 20260722,
    })
    expect(parseFaultLabArgs([])).toEqual({
      profile: 'mixed',
      matches: 1,
      seed: 20260722,
    })
  })
})
