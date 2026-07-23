import type { AudibleAcousticCue } from '../../packages/shared/src/index.ts'

export const ONLINE_HEARD_CUE_HISTORY_LIMIT = 160
export const ONLINE_PENDING_CUE_LIMIT = 24

export function ingestOnlineAcousticCues(
  seenIds: readonly string[],
  incoming: readonly AudibleAcousticCue[],
) {
  const seen = new Set(seenIds)
  const newlyHeard: AudibleAcousticCue[] = []

  for (const cue of incoming) {
    if (!cue.id || seen.has(cue.id)) {
      continue
    }
    seen.add(cue.id)
    newlyHeard.push(withoutHiddenSource(cue))
  }

  return {
    seenIds: [...seen].slice(-ONLINE_HEARD_CUE_HISTORY_LIMIT),
    newlyHeard: newlyHeard.slice(-ONLINE_PENDING_CUE_LIMIT),
  }
}

function withoutHiddenSource(cue: AudibleAcousticCue): AudibleAcousticCue {
  if (cue.sourcePrecision === 'exact') {
    return {
      ...cue,
      source: cue.source ? { ...cue.source } : undefined,
    }
  }
  const { source: _source, ...safeCue } = cue
  return safeCue
}
