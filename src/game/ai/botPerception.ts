import type { BotActor, BotObjectiveInfo, ContactBelief } from './botTypes.ts'

export interface VisibleBotContact {
  id: string
  col: number
  row: number
  side: BotActor['side']
  team: BotActor['team']
  hp?: number
  maxHp?: number
  value?: number
}

export interface AlertBotContact {
  id: string
  col: number
  row: number
  side: BotActor['side']
  team: BotActor['team']
  source?: ContactBelief['source']
  kind?: ContactBelief['kind']
  confidence?: number
  value?: number
}

export interface BotPerceptionInput {
  actor: BotActor
  now: number
  visibleHostiles: VisibleBotContact[]
  alerts: AlertBotContact[]
  objective: BotObjectiveInfo
}

export function buildBotPercepts(input: BotPerceptionInput): ContactBelief[] {
  const beliefs: ContactBelief[] = []

  for (const hostile of input.visibleHostiles) {
    beliefs.push({
      id: hostile.id,
      kind: 'enemy',
      position: { x: hostile.col, y: hostile.row },
      lastSeenAt: input.now,
      confidence: 1,
      source: 'vision',
      side: hostile.side,
      team: hostile.team,
      value: hostile.value ?? contactValue(hostile.hp, hostile.maxHp),
      visible: true,
    })
  }

  for (const alert of input.alerts) {
    beliefs.push({
      id: alert.id,
      kind: alert.kind ?? 'noise',
      position: { x: alert.col, y: alert.row },
      lastSeenAt: input.now,
      confidence: alert.confidence ?? 0.72,
      source: alert.source ?? 'sound',
      side: alert.side,
      team: alert.team,
      value: alert.value ?? 0.45,
      visible: false,
    })
  }

  if (input.objective.pressureTarget) {
    beliefs.push({
      id: `objective-pressure-${input.actor.side}`,
      kind: 'objective',
      position: { ...input.objective.pressureTarget },
      lastSeenAt: input.now,
      confidence: 1,
      source: 'scripted',
      side: input.actor.side === 'player' ? 'enemy' : 'player',
      value: 0.85,
      visible: true,
    })
  }

  if (input.objective.defendTarget) {
    beliefs.push({
      id: `objective-defend-${input.actor.side}`,
      kind: 'objective',
      position: { ...input.objective.defendTarget },
      lastSeenAt: input.now,
      confidence: 1,
      source: 'scripted',
      side: input.actor.side,
      team: input.actor.team,
      value: 0.55,
      visible: true,
    })
  }

  return beliefs
}

function contactValue(hp = 1, maxHp = hp) {
  const durability = Math.max(1, maxHp)
  return Math.max(0.35, Math.min(1, 0.45 + durability * 0.12 + Math.max(0, hp - 1) * 0.04))
}
