import { clamp } from '../constants.ts'
import type { BotDifficultyConfig, BotRoleProfile, ContactBelief } from './botTypes.ts'

export function updateBotBeliefs(
  previous: ContactBelief[],
  percepts: ContactBelief[],
  now: number,
  difficulty: BotDifficultyConfig,
  role: BotRoleProfile,
): ContactBelief[] {
  const next = new Map<string, ContactBelief>()
  for (const belief of decayBotBeliefs(previous, now, difficulty)) {
    next.set(belief.id, belief)
  }

  for (const percept of percepts) {
    const existing = next.get(percept.id)
    const confidence = adjustedConfidence(percept, difficulty, role)
    if (existing?.visible && !percept.visible && confidence <= existing.confidence) {
      continue
    }
    if (!existing || confidence >= existing.confidence || percept.lastSeenAt >= existing.lastSeenAt) {
      next.set(percept.id, {
        ...existing,
        ...percept,
        confidence,
        position: { ...percept.position },
        lastSeenAt: now,
      })
    }
  }

  return [...next.values()].sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
}

export function decayBotBeliefs(
  beliefs: ContactBelief[],
  now: number,
  difficulty: BotDifficultyConfig,
): ContactBelief[] {
  return beliefs
    .map((belief) => {
      const elapsed = Math.max(0, now - belief.lastSeenAt)
      const stillVisible = belief.visible === true && elapsed === 0
      const persistence = stillVisible ? difficulty.investigatePersistence * 1.4 : difficulty.investigatePersistence
      const confidence = clamp(belief.confidence * Math.max(0, 1 - elapsed / persistence), 0, 1)
      return {
        ...belief,
        position: { ...belief.position },
        visible: stillVisible,
        confidence: Number(confidence.toFixed(4)),
      }
    })
    .filter((belief) => belief.confidence >= 0.05)
}

function adjustedConfidence(
  percept: ContactBelief,
  difficulty: BotDifficultyConfig,
  role: BotRoleProfile,
) {
  let confidence = percept.confidence

  if (percept.kind === 'decoy') {
    confidence *= difficulty.decoySusceptibility * (1 - role.decoyResistance * 0.55)
  }

  if (percept.kind === 'unknown' || percept.kind === 'noise') {
    confidence *= 0.7 + role.unknownTolerance * 0.3
  }

  return Number(clamp(confidence, 0, 1).toFixed(4))
}
