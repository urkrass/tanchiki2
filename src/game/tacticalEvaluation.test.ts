import { describe, expect, it } from 'vitest'
import { evaluateTacticalVictory } from './tacticalEvaluation.ts'
import type { LevelRewards, ObjectiveMode, RunStats, SavedObjectiveState } from './types.ts'

const rewards: LevelRewards = { credits: 100, xp: 60, score: 500 }

function stats(overrides: Partial<RunStats> = {}): RunStats {
  return {
    duration: 45,
    shotsFired: 10,
    tankHits: 7,
    bricksDestroyed: 1,
    playerKills: 4,
    armoredKills: 0,
    livesLost: 0,
    repairKitUses: 0,
    baseDamageTaken: 0,
    criticalCoverDestroyed: 0,
    objectiveRelevantPowerUps: 0,
    friendlyTotal: 0,
    friendlySurvivors: 0,
    powerUps: { repair: 0, rapid: 0, shield: 0 },
    ctfCaptures: 0,
    assaultDamage: 0,
    rewards: {
      killScore: 0,
      killCredits: 0,
      killXp: 0,
      pickupScore: 0,
      objectiveScore: 0,
      missionScore: 0,
      missionCredits: 0,
      missionXp: 0,
      tacticalCredits: 0,
      tacticalXp: 0,
      totalScore: 0,
      totalCredits: 0,
      totalXp: 0,
    },
    ...overrides,
  }
}

function objective(mode: ObjectiveMode, overrides: Partial<SavedObjectiveState> = {}): SavedObjectiveState {
  return {
    mode,
    label: mode,
    winCondition: 'Test condition.',
    playerScore: 0,
    enemyScore: 0,
    neutralScore: 0,
    targetScore: 0,
    flag: null,
    assault: null,
    ...overrides,
  }
}

describe('tactical evaluation', () => {
  it('labels high accuracy with low destruction as Surgeon', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'defense',
      objective: objective('defense'),
      stats: stats({ shotsFired: 8, tankHits: 7, bricksDestroyed: 1 }),
      baseHp: 3,
      baseMaxHp: 3,
      lives: 3,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory',
    })

    expect(evaluation).toMatchObject({
      style: 'Fortress',
      quality: 'Clean Win',
      rewardModifier: { creditsBonus: 15, xpBonus: 9 },
    })
    expect(evaluation.reasons.join(' ')).toContain('Objective stayed secure')
  })

  it('labels precise non-defense play as Surgeon', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'ffa',
      objective: objective('ffa', { playerScore: 4, targetScore: 4 }),
      stats: stats({ shotsFired: 6, tankHits: 5, bricksDestroyed: 0 }),
      baseHp: 3,
      baseMaxHp: 3,
      lives: 3,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory',
    })

    expect(evaluation.style).toBe('Surgeon')
    expect(evaluation.quality).toBe('Clean Win')
  })

  it('labels strong defense with intact objective as Fortress', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'defense',
      objective: objective('defense'),
      stats: stats({ tankHits: 3, shotsFired: 7, bricksDestroyed: 2, criticalCoverDestroyed: 0 }),
      baseHp: 3,
      baseMaxHp: 3,
      lives: 3,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory',
    })

    expect(evaluation.style).toBe('Fortress')
    expect(evaluation.metrics.objectiveIntegrity).toBe(1)
  })

  it('labels high destruction as Pyrrhic Victory when the route is damaged', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'defense',
      objective: objective('defense'),
      stats: stats({ bricksDestroyed: 8, criticalCoverDestroyed: 4, livesLost: 1 }),
      baseHp: 2,
      baseMaxHp: 3,
      lives: 2,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory',
    })

    expect(evaluation.style).toBe('Pyrrhic Victory')
    expect(evaluation.quality).toBe('Pyrrhic Victory')
    expect(evaluation.rewardModifier.creditsBonus).toBe(0)
  })

  it('labels clean assault pressure as Raider', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'assault',
      objective: objective('assault', { assault: { cell: { x: 5, y: 10 }, hp: 0, maxHp: 4 } }),
      stats: stats({ assaultDamage: 4, bricksDestroyed: 2, shotsFired: 9, tankHits: 4 }),
      baseHp: 3,
      baseMaxHp: 3,
      lives: 3,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory',
    })

    expect(evaluation.style).toBe('Raider')
    expect(evaluation.metrics.objectivePressure).toBe(1)
  })

  it('labels objective loss as Failed Defense', () => {
    const evaluation = evaluateTacticalVictory({
      objectiveMode: 'defense',
      objective: objective('defense'),
      stats: stats({ baseDamageTaken: 3, criticalCoverDestroyed: 3 }),
      baseHp: 0,
      baseMaxHp: 3,
      lives: 2,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'defeat',
    })

    expect(evaluation.style).toBe('Failed Defense')
    expect(evaluation.quality).toBe('Failed Defense')
  })

  it('is deterministic for identical input', () => {
    const input = {
      objectiveMode: 'ctf' as const,
      objective: objective('ctf', {
        flag: {
          playerBase: { x: 4, y: 11 },
          enemyHome: { x: 4, y: 2 },
          position: { x: 4, y: 11 },
          carrierId: null,
          captures: 1,
          capturesToWin: 1,
        },
      }),
      stats: stats({ ctfCaptures: 1, objectiveRelevantPowerUps: 1, powerUps: { repair: 0, rapid: 1, shield: 0 } }),
      baseHp: 3,
      baseMaxHp: 3,
      lives: 3,
      startingLives: 3,
      missionRewards: rewards,
      outcome: 'victory' as const,
    }

    expect(evaluateTacticalVictory(input)).toEqual(evaluateTacticalVictory(input))
  })
})
