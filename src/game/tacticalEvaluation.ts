import type {
  LevelRewards,
  ObjectiveMode,
  RunStats,
  SavedObjectiveState,
  TacticalEvaluation,
  TacticalStyle,
  VictoryQuality,
} from './types.ts'

export interface TacticalEvaluationInput {
  objectiveMode: ObjectiveMode
  objective: SavedObjectiveState
  stats: RunStats
  baseHp: number
  baseMaxHp: number
  lives: number
  startingLives: number
  missionRewards: LevelRewards
  outcome: 'victory' | 'defeat'
}

export function evaluateTacticalVictory(input: TacticalEvaluationInput): TacticalEvaluation {
  const metrics = getTacticalMetrics(input)
  const style = chooseStyle(input, metrics)
  const quality = chooseQuality(input, metrics)
  const multiplier = getRewardMultiplier(quality)
  const creditsBonus = Math.round(input.missionRewards.credits * multiplier)
  const xpBonus = Math.round(input.missionRewards.xp * multiplier)

  return {
    style,
    quality,
    reasons: getReasons(input, metrics, style, quality).slice(0, 4),
    metrics,
    objectiveInterpretation: getObjectiveInterpretation(input, style, quality),
    rewardModifier: {
      creditsMultiplier: multiplier,
      xpMultiplier: multiplier,
      creditsBonus,
      xpBonus,
      explanation: multiplier > 0 ? `${quality} tactical bonus` : `${quality} has no tactical bonus`,
    },
  }
}

function getTacticalMetrics(input: TacticalEvaluationInput): TacticalEvaluation['metrics'] {
  const stats = input.stats
  const legacyPowerUpTotal = stats.powerUps.repair + stats.powerUps.rapid + stats.powerUps.shield
  const fieldRecoveryTotal = stats.wrecksSalvaged
  const recoveryTotal = legacyPowerUpTotal + fieldRecoveryTotal
  const objectiveRecoveryTotal = stats.objectiveRelevantPowerUps + fieldRecoveryTotal
  const accuracy = stats.shotsFired > 0
    ? stats.tankHits / stats.shotsFired
    : stats.playerKills > 0 ? 1 : 0
  const friendlySurvival = stats.friendlyTotal > 0 ? stats.friendlySurvivors / stats.friendlyTotal : null

  return {
    accuracy: roundMetric(accuracy),
    structuralDamage: stats.bricksDestroyed,
    criticalCoverDestroyed: stats.criticalCoverDestroyed,
    objectiveIntegrity: roundMetric(getObjectiveIntegrity(input)),
    survivalCost: roundMetric(input.startingLives > 0 ? stats.livesLost / input.startingLives : 0),
    // Keep the v1 metric key stable for saved/result consumers while Field
    // Salvage supersedes random pickups in new runs.
    powerupRelevance: roundMetric(recoveryTotal > 0 ? objectiveRecoveryTotal / recoveryTotal : 0),
    friendlySurvival: friendlySurvival === null ? null : roundMetric(friendlySurvival),
    objectivePressure: roundMetric(getObjectivePressure(input)),
  }
}

function chooseStyle(input: TacticalEvaluationInput, metrics: TacticalEvaluation['metrics']): TacticalStyle {
  const stats = input.stats

  if (input.outcome === 'defeat' || (input.objectiveMode === 'defense' && input.baseHp <= 0)) {
    return 'Failed Defense'
  }

  if (metrics.objectiveIntegrity <= 0.34 && input.outcome === 'victory') {
    return 'Last Wall'
  }

  if (metrics.criticalCoverDestroyed >= 4 || (metrics.survivalCost >= 0.67 && metrics.structuralDamage >= 4)) {
    return 'Pyrrhic Victory'
  }

  if (stats.playerKills >= 4 && (metrics.criticalCoverDestroyed >= 2 || metrics.survivalCost >= 0.67)) {
    return 'Reckless Victory'
  }

  if ((input.objectiveMode === 'ctf' || input.objectiveMode === 'assault') && metrics.objectivePressure >= 1 && metrics.structuralDamage <= 5) {
    return 'Raider'
  }

  if ((input.objectiveMode === 'defense' || input.objectiveMode === 'team-battle') && metrics.objectiveIntegrity >= 1 && metrics.criticalCoverDestroyed <= 1 && stats.livesLost === 0) {
    return 'Fortress'
  }

  if (metrics.friendlySurvival !== null && metrics.friendlySurvival >= 0.75 && stats.livesLost <= 1) {
    return 'Guardian'
  }

  if (metrics.accuracy >= 0.65 && metrics.structuralDamage <= 2 && metrics.criticalCoverDestroyed === 0) {
    return 'Surgeon'
  }

  if (metrics.accuracy >= 0.5 && stats.tankHits >= 3 && metrics.structuralDamage <= 4) {
    return 'Sniper'
  }

  if ((stats.objectiveRelevantPowerUps > 0 || stats.wrecksSalvaged > 0) && metrics.powerupRelevance >= 0.5) {
    return 'Opportunist'
  }

  if (metrics.structuralDamage >= 6 || (input.objectiveMode === 'assault' && stats.assaultDamage > 0)) {
    return 'Bulldozer'
  }

  return input.objectiveMode === 'ctf' || input.objectiveMode === 'assault' ? 'Raider' : 'Fortress'
}

function chooseQuality(input: TacticalEvaluationInput, metrics: TacticalEvaluation['metrics']): VictoryQuality {
  if (input.outcome === 'defeat' || (input.objectiveMode === 'defense' && input.baseHp <= 0)) {
    return 'Failed Defense'
  }

  if (metrics.criticalCoverDestroyed >= 4 || (metrics.survivalCost >= 0.67 && metrics.structuralDamage >= 4)) {
    return 'Pyrrhic Victory'
  }

  if (metrics.objectiveIntegrity <= 0.34) {
    return 'Last Wall'
  }

  if (metrics.survivalCost >= 0.34 || metrics.criticalCoverDestroyed >= 2 || metrics.structuralDamage >= 6) {
    return 'Costly Win'
  }

  if (metrics.accuracy >= 0.6 && metrics.objectiveIntegrity >= 0.8 && metrics.criticalCoverDestroyed <= 1) {
    return 'Clean Win'
  }

  return 'Controlled Win'
}

function getRewardMultiplier(quality: VictoryQuality) {
  if (quality === 'Clean Win') return 0.15
  if (quality === 'Controlled Win') return 0.1
  if (quality === 'Costly Win' || quality === 'Last Wall') return 0.05
  return 0
}

function getReasons(
  input: TacticalEvaluationInput,
  metrics: TacticalEvaluation['metrics'],
  style: TacticalStyle,
  quality: VictoryQuality,
) {
  const reasons: string[] = []

  if (style === 'Failed Defense') reasons.push('Objective failed after map control collapsed.')
  if (style === 'Fortress') reasons.push('Objective stayed secure behind intact cover.')
  if (style === 'Surgeon') reasons.push('High shell efficiency with low structural damage.')
  if (style === 'Sniper') reasons.push('Controlled hits converted shots into kills.')
  if (style === 'Bulldozer') reasons.push('Heavy breakthrough pressure opened the route.')
  if (style === 'Raider') reasons.push('Objective pressure decided the mission.')
  if (style === 'Guardian') reasons.push('Friendly units survived the engagement.')
  if (style === 'Opportunist') reasons.push('Field salvage was used where it mattered.')
  if (style === 'Last Wall') reasons.push('Victory came with the objective barely standing.')
  if (style === 'Pyrrhic Victory') reasons.push('Mission success came at heavy structural cost.')
  if (style === 'Reckless Victory') reasons.push('High aggression outweighed objective care.')

  if (metrics.accuracy >= 0.6) reasons.push(`Shell efficiency ${(metrics.accuracy * 100).toFixed(0)}%.`)
  if (metrics.criticalCoverDestroyed > 0) reasons.push(`Critical cover lost: ${metrics.criticalCoverDestroyed}.`)
  if (metrics.structuralDamage <= 2) reasons.push('Low terrain destruction preserved future cover.')
  if (input.stats.baseDamageTaken > 0) reasons.push(`Objective absorbed ${input.stats.baseDamageTaken} damage.`)
  if (metrics.powerupRelevance > 0) reasons.push('Recovery timing supported the objective.')
  if (quality === 'Clean Win') reasons.push('Clean execution earned the best tactical bonus.')
  if (quality === 'Pyrrhic Victory') reasons.push('No tactical bonus for costly success.')

  return [...new Set(reasons)]
}

function getObjectiveInterpretation(input: TacticalEvaluationInput, style: TacticalStyle, quality: VictoryQuality) {
  if (input.outcome === 'defeat') {
    return 'The procedure failed: destruction no longer served the objective.'
  }

  if (input.objectiveMode === 'defense') {
    return `${style} defense: the base ended at ${input.baseHp}/${input.baseMaxHp} HP with ${quality.toLowerCase()} consequences.`
  }

  if (input.objectiveMode === 'team-battle') {
    return `${style} battle: team survival and controlled elimination shaped the result.`
  }

  if (input.objectiveMode === 'ctf') {
    const captures = input.objective.flag?.captures ?? input.stats.ctfCaptures
    const required = input.objective.flag?.capturesToWin ?? 1
    return `${style} capture: flag pressure reached ${captures}/${required} while preserving the route.`
  }

  if (input.objectiveMode === 'ffa') {
    return `${style} free-for-all: dominance is measured by efficient survival, not kills alone.`
  }

  return `${style} assault: breakthrough cost and objective pressure define the win.`
}

function getObjectiveIntegrity(input: TacticalEvaluationInput) {
  if (input.objectiveMode === 'defense') {
    return ratio(input.baseHp, input.baseMaxHp)
  }

  if (input.objectiveMode === 'team-battle' && input.stats.friendlyTotal > 0) {
    return ratio(input.stats.friendlySurvivors, input.stats.friendlyTotal)
  }

  return ratio(input.lives, input.startingLives)
}

function getObjectivePressure(input: TacticalEvaluationInput) {
  if (input.objectiveMode === 'ctf') {
    return ratio(input.objective.flag?.captures ?? input.stats.ctfCaptures, input.objective.flag?.capturesToWin ?? 1)
  }

  if (input.objectiveMode === 'assault') {
    return ratio(input.stats.assaultDamage, input.objective.assault?.maxHp ?? input.stats.assaultDamage)
  }

  if (input.objectiveMode === 'ffa') {
    return ratio(input.objective.playerScore, input.objective.targetScore || Math.max(1, input.objective.playerScore))
  }

  if (input.objectiveMode === 'team-battle') {
    return ratio(input.objective.playerScore, Math.max(1, input.objective.playerScore + input.objective.enemyScore))
  }

  return ratio(input.baseHp, input.baseMaxHp)
}

function ratio(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0
  }

  return Math.max(0, Math.min(1, value / total))
}

function roundMetric(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}
