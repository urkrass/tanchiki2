import type { Vec } from '../types.ts'
import type { BotDecision, BotFireDecision, BotIntentionScore, BotPathResult } from './botTypes.ts'

export interface BotBehaviorInput {
  scores: BotIntentionScore[]
  fire: BotFireDecision | null
  movePath: BotPathResult | null
  breakerPath: BotPathResult | null
  fallbackTarget: Vec | null
}

export function chooseBotBehavior(input: BotBehaviorInput): BotDecision {
  const top = input.scores[0]
  if (!top) {
    return idleDecision([])
  }

  if (top.intention === 'attack' && input.fire?.shouldFire) {
    return {
      state: 'attack',
      intention: 'attack',
      action: 'fire',
      target: top.target,
      nextStep: null,
      breakWall: null,
      scores: input.scores,
    }
  }

  if (top.intention === 'attack' && input.fire?.reason === 'no-ammo') {
    return {
      state: 'reloadOrResupply',
      intention: 'attack',
      action: 'idle',
      target: top.target,
      nextStep: null,
      breakWall: null,
      scores: input.scores,
    }
  }

  if (top.intention === 'breakWall' && input.breakerPath?.found && input.breakerPath.breakWalls.length > 0) {
    return {
      state: 'breakWall',
      intention: 'breakWall',
      action: 'breakWall',
      target: top.target,
      nextStep: input.breakerPath.steps[0] ?? null,
      breakWall: input.breakerPath.breakWalls[0] ?? null,
      scores: input.scores,
    }
  }

  const path = input.movePath?.found ? input.movePath : null
  if (path && path.steps.length > 0) {
    return {
      state: stateForIntention(top.intention),
      intention: top.intention,
      action: 'move',
      target: top.target,
      nextStep: path.steps[0] ?? null,
      breakWall: null,
      scores: input.scores,
    }
  }

  if (input.fallbackTarget) {
    return {
      state: 'patrol',
      intention: 'patrol',
      action: 'move',
      target: input.fallbackTarget,
      nextStep: input.fallbackTarget,
      breakWall: null,
      scores: input.scores,
    }
  }

  return idleDecision(input.scores)
}

function stateForIntention(intention: BotIntentionScore['intention']): BotDecision['state'] {
  if (intention === 'attack') return 'attack'
  if (intention === 'breakWall') return 'breakWall'
  if (intention === 'pressureObjective') return 'moveToObjective'
  if (intention === 'defendObjective') return 'guard'
  if (intention === 'investigate') return 'investigate'
  if (intention === 'retreat') return 'retreat'
  if (intention === 'ambush') return 'ambush'
  return 'patrol'
}

function idleDecision(scores: BotIntentionScore[]): BotDecision {
  return {
    state: 'idle',
    intention: 'patrol',
    action: 'idle',
    target: null,
    nextStep: null,
    breakWall: null,
    scores,
  }
}
