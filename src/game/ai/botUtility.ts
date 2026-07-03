import type { Vec } from '../types.ts'
import type { BotIntentionScore, BotUtilityInput, ContactBelief } from './botTypes.ts'

export function scoreBotIntentions(input: BotUtilityInput): BotIntentionScore[] {
  const scores: BotIntentionScore[] = []
  const bestAttack = bestBelief(input.beliefs, (belief) =>
    belief.kind === 'enemy' &&
    belief.visible === true &&
    belief.confidence >= input.difficulty.confidenceThreshold,
  )
  const bestUncertain = bestBelief(input.beliefs, (belief) =>
    isUncertainContact(belief) &&
    belief.confidence >= input.difficulty.confidenceThreshold * 0.42,
  )
  const bestInvestigate = bestInvestigateBelief(input)

  if (bestAttack) {
    const attackBias = 0.65 + input.difficulty.aggression * 0.55
    scores.push({
      intention: 'attack',
      score: roundScore(input.role.attackWeight * attackBias * bestAttack.confidence * (bestAttack.value ?? 0.65)),
      target: { ...bestAttack.position },
      beliefId: bestAttack.id,
      beliefKind: bestAttack.kind,
      confidence: bestAttack.confidence,
    })
  }

  if (bestInvestigate) {
    scores.push({
      intention: 'investigate',
      score: roundScore(investigationScore(input, bestInvestigate)),
      target: { ...bestInvestigate.position },
      beliefId: bestInvestigate.id,
      beliefKind: bestInvestigate.kind,
      confidence: bestInvestigate.confidence,
    })
  }

  if (input.objective.pressureTarget) {
    const uncertaintyBrake = bestUncertain ? Math.max(0.58, 1 - bestUncertain.confidence * 0.34) : 1
    scores.push({
      intention: 'pressureObjective',
      score: roundScore(input.role.objectiveWeight * objectivePressureBias(input.objective.pressureTarget, input.actor) * uncertaintyBrake),
      target: { ...input.objective.pressureTarget },
    })
  }

  if (input.objective.defendTarget) {
    scores.push({
      intention: 'defendObjective',
      score: roundScore(0.42 + input.role.objectiveWeight * 0.28),
      target: { ...input.objective.defendTarget },
    })
  }

  if (input.breakerWallUseful) {
    scores.push({
      intention: 'breakWall',
      score: roundScore(input.role.breakWallWeight * (input.role.role === 'breaker' ? 1 : 0.32)),
      target: input.objective.pressureTarget ? { ...input.objective.pressureTarget } : bestInvestigate ? { ...bestInvestigate.position } : null,
    })
  }

  const healthRatio = input.actor.hp / Math.max(1, input.actor.maxHp)
  if (healthRatio <= input.difficulty.retreatHealthThreshold) {
    scores.push({
      intention: 'retreat',
      score: roundScore(input.role.retreatWeight * (1 - healthRatio)),
      target: input.objective.defendTarget ? { ...input.objective.defendTarget } : null,
    })
  }

  scores.push({
    intention: 'patrol',
    score: roundScore(0.08 + input.role.unknownTolerance * 0.08),
    target: null,
  })

  return scores.sort((a, b) =>
    b.score - a.score ||
    intentionRank(a.intention) - intentionRank(b.intention) ||
    (a.beliefId ?? '').localeCompare(b.beliefId ?? ''),
  )
}

function isUncertainContact(belief: ContactBelief) {
  return belief.kind !== 'objective' && belief.visible !== true
}

function bestBelief(beliefs: ContactBelief[], predicate: (belief: ContactBelief) => boolean) {
  return beliefs
    .filter(predicate)
    .sort((a, b) =>
      (b.confidence * (b.value ?? 0.5)) - (a.confidence * (a.value ?? 0.5)) ||
      b.lastSeenAt - a.lastSeenAt ||
      a.id.localeCompare(b.id),
    )[0] ?? null
}

function bestInvestigateBelief(input: BotUtilityInput) {
  return input.beliefs
    .filter((belief) =>
      belief.kind !== 'objective' &&
      belief.confidence >= input.difficulty.confidenceThreshold * 0.45,
    )
    .sort((a, b) =>
      investigationScore(input, b) - investigationScore(input, a) ||
      b.lastSeenAt - a.lastSeenAt ||
      a.id.localeCompare(b.id),
    )[0] ?? null
}

function investigationScore(input: BotUtilityInput, belief: ContactBelief) {
  const sourceBias = belief.source === 'sound' || belief.source === 'teammate' ? 1.16 : 1
  const visiblePenalty = belief.visible ? 0.62 : 1
  const uncertaintyBias = isUncertainContact(belief) ? 1.12 : 1
  const distanceBias = investigationDistanceBias(manhattan(input.actor, belief.position), input.role.unknownTolerance)
  return input.role.investigateWeight * belief.confidence * sourceBias * visiblePenalty * uncertaintyBias * distanceBias
}

function objectivePressureBias(target: Vec, actor: { col: number; row: number }) {
  const distance = Math.abs(target.x - actor.col) + Math.abs(target.y - actor.row)
  return Math.max(0.55, Math.min(1, 1 - distance * 0.012))
}

function investigationDistanceBias(distance: number, unknownTolerance: number) {
  if (distance <= 3) {
    return 1
  }

  const usefulRange = 7 + unknownTolerance * 12
  const falloff = (distance - 3) / usefulRange
  return Math.max(0.32, 1 - falloff * 0.35)
}

function manhattan(from: { col: number; row: number }, to: Vec) {
  return Math.abs(to.x - from.col) + Math.abs(to.y - from.row)
}

function intentionRank(intention: BotIntentionScore['intention']) {
  return ['attack', 'breakWall', 'investigate', 'pressureObjective', 'defendObjective', 'retreat', 'ambush', 'patrol'].indexOf(intention)
}

function roundScore(value: number) {
  return Number(Math.max(0, value).toFixed(4))
}
