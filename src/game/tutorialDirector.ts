import { getAdaptiveTutorialGoal } from './tutorial.ts'
import type {
  Direction,
  MajorModKind,
  TankClassId,
  TutorialCameraCue,
  TutorialMissionDefinition,
  TutorialStepDefinition,
  TutorialTriggerDefinition,
} from './types.ts'

const DEFAULT_DIALOGUE_SECONDS = 3.8

export interface TutorialDirectorProbe {
  elapsed: number
  player: {
    col: number
    row: number
    dir: Direction
  }
  shotsFired: number
  playerKills: number
  hostilesDefeated: number
  relayActions: number
  deployableActions: number
  selectedClass: TankClassId
  selectedMod: MajorModKind
  activeMod: MajorModKind | null
  flag: {
    carrierId: string | null
    playerId: string
    dropped: boolean
    captures: number
  } | null
  assaultHp: number | null
  cameraAtPlayer: boolean
}

export interface TutorialDirectorState {
  stepIndex: number
  stepId: string | null
  goal: string | null
  speaker: TutorialMissionDefinition['steps'][number]['dialogue'][number]['speaker'] | null
  dialogue: string | null
  missionComplete: boolean
  cameraControlled: boolean
  cameraTarget: TutorialCameraCue['target'] | null
  cameraLabel: string | null
  dangerHeld: boolean
  playerControlHeld: boolean
}

interface StepBaseline {
  elapsed: number
  col: number
  row: number
  dir: Direction
  shotsFired: number
  playerKills: number
  hostilesDefeated: number
  relayActions: number
  deployableActions: number
  activeMod: MajorModKind | null
  flagCarrierId: string | null
  flagDropped: boolean
  flagCaptures: number
}

export class TutorialDirector {
  private stepIndex = 0
  private dialogueIndex = 0
  private dialogueElapsed = 0
  private dialogueVisible = true
  private baseline: StepBaseline
  private previousProbe: TutorialDirectorProbe
  private cameraPhase: 'tour' | 'return' | null = null
  private cameraElapsed = 0
  private missionComplete = false
  private readonly mission: TutorialMissionDefinition

  constructor(mission: TutorialMissionDefinition, initialProbe: TutorialDirectorProbe) {
    this.mission = mission
    this.baseline = createBaseline(initialProbe)
    this.previousProbe = cloneProbe(initialProbe)
    this.enterStep(initialProbe)
  }

  update(dt: number, probe: TutorialDirectorProbe) {
    if (this.missionComplete) {
      this.previousProbe = cloneProbe(probe)
      return
    }

    this.updateDialogue(dt)
    this.updateCamera(dt, probe)

    const step = this.currentStep
    if (step && this.isTriggerComplete(step, probe)) {
      this.advanceStep(probe)
    }

    this.previousProbe = cloneProbe(probe)
  }

  advanceDialogue(probe: TutorialDirectorProbe) {
    const step = this.currentStep
    if (!step) {
      return false
    }

    const lines = step.dialogue
    if (this.dialogueVisible && this.dialogueIndex < lines.length - 1) {
      this.dialogueIndex += 1
      this.dialogueElapsed = 0
      return true
    }

    if (step.trigger.kind === 'confirm') {
      this.advanceStep(probe)
      return true
    }

    if (this.dialogueVisible) {
      this.dialogueVisible = false
      this.dialogueElapsed = 0
      return true
    }

    return false
  }

  getState(): TutorialDirectorState {
    const step = this.currentStep
    const line = this.dialogueVisible ? step?.dialogue[this.dialogueIndex] ?? null : null
    const adaptive = step
      ? getAdaptiveTutorialGoal(
          this.mission,
          this.previousProbe.selectedClass,
          this.previousProbe.selectedMod,
          this.stepIndex,
        )
      : null

    return {
      stepIndex: this.stepIndex,
      stepId: step?.id ?? null,
      goal: adaptive?.goal ?? step?.goal ?? null,
      speaker: line?.speaker ?? null,
      dialogue: line?.text ?? null,
      missionComplete: this.missionComplete,
      cameraControlled: this.cameraPhase !== null,
      cameraTarget: this.cameraPhase === 'tour' ? step?.cameraCue?.target ?? null : null,
      cameraLabel: this.cameraPhase !== null ? step?.cameraCue?.label ?? null : null,
      dangerHeld: this.isDangerHeld(),
      playerControlHeld: this.isPlayerControlHeld(),
    }
  }

  private get currentStep() {
    return this.mission.steps[this.stepIndex] ?? null
  }

  private enterStep(probe: TutorialDirectorProbe) {
    this.baseline = createBaseline(probe)
    this.dialogueIndex = 0
    this.dialogueElapsed = 0
    this.dialogueVisible = Boolean(this.currentStep?.dialogue.length)
    this.cameraElapsed = 0
    this.cameraPhase = this.currentStep?.cameraCue ? 'tour' : null
  }

  private advanceStep(probe: TutorialDirectorProbe) {
    this.stepIndex += 1
    if (this.stepIndex >= this.mission.steps.length) {
      this.missionComplete = true
      this.dialogueVisible = false
      this.cameraPhase = null
      return
    }
    this.enterStep(probe)
  }

  private updateDialogue(dt: number) {
    const step = this.currentStep
    const line = step?.dialogue[this.dialogueIndex]
    if (!line || !this.dialogueVisible) {
      return
    }

    this.dialogueElapsed += dt
    const duration = Math.max(1.2, line.duration ?? DEFAULT_DIALOGUE_SECONDS)
    if (this.dialogueElapsed < duration) {
      return
    }

    if (this.dialogueIndex < (step?.dialogue.length ?? 0) - 1) {
      this.dialogueIndex += 1
      this.dialogueElapsed = 0
    } else if (step?.trigger.kind !== 'confirm') {
      this.dialogueVisible = false
      this.dialogueElapsed = 0
    }
  }

  private updateCamera(dt: number, probe: TutorialDirectorProbe) {
    const cue = this.currentStep?.cameraCue
    if (!cue || !this.cameraPhase) {
      return
    }

    if (this.cameraPhase === 'tour') {
      this.cameraElapsed += dt
      if (this.cameraElapsed >= cue.duration) {
        this.cameraPhase = 'return'
      }
      return
    }

    if (probe.cameraAtPlayer) {
      this.cameraPhase = null
    }
  }

  private isTriggerComplete(step: TutorialStepDefinition, probe: TutorialDirectorProbe) {
    if (step.trigger.kind === 'confirm') {
      return false
    }
    if (step.trigger.kind === 'camera-complete') {
      return this.cameraPhase === null
    }
    if (step.trigger.kind === 'objective' && step.trigger.target === 'adaptive-tactic') {
      const adaptive = getAdaptiveTutorialGoal(
        this.mission,
        probe.selectedClass,
        probe.selectedMod,
        this.stepIndex,
      )
      return adaptive ? this.evaluateTrigger(adaptive.trigger, probe) : false
    }
    if (step.trigger.kind === 'objective' && step.trigger.target === 'assault-core') {
      return probe.assaultHp !== null && probe.assaultHp <= 0
    }
    return this.evaluateTrigger(step.trigger, probe)
  }

  private evaluateTrigger(trigger: TutorialTriggerDefinition, probe: TutorialDirectorProbe) {
    const count = Math.max(1, trigger.count ?? 1)
    if (trigger.kind === 'elapsed') {
      return probe.elapsed - this.baseline.elapsed >= (trigger.seconds ?? 1)
    }
    if (trigger.kind === 'move') {
      return Math.abs(probe.player.col - this.baseline.col) + Math.abs(probe.player.row - this.baseline.row) >= count
    }
    if (trigger.kind === 'turn') {
      return probe.player.dir !== this.baseline.dir
    }
    if (trigger.kind === 'fire') {
      return probe.shotsFired - this.baseline.shotsFired >= count
    }
    if (trigger.kind === 'destroy') {
      const defeated = trigger.target === 'squad' ? probe.hostilesDefeated : probe.playerKills
      const baseline = trigger.target === 'squad' ? this.baseline.hostilesDefeated : this.baseline.playerKills
      return defeated - baseline >= count
    }
    if (trigger.kind === 'relay') {
      return probe.relayActions - this.baseline.relayActions >= count
    }
    if (trigger.kind === 'deploy') {
      return probe.deployableActions - this.baseline.deployableActions >= count
    }
    if (trigger.kind === 'mod') {
      return probe.activeMod === trigger.target && this.baseline.activeMod !== trigger.target
    }
    if (trigger.kind === 'flag-pickup') {
      return probe.flag?.carrierId === probe.flag?.playerId
        && this.previousProbe.flag?.carrierId !== probe.flag?.playerId
    }
    if (trigger.kind === 'flag-drop') {
      return Boolean(
        probe.flag?.dropped
        && probe.flag.carrierId === null
        && this.previousProbe.flag?.carrierId === probe.flag?.playerId,
      )
    }
    if (trigger.kind === 'flag-capture') {
      return (probe.flag?.captures ?? 0) - this.baseline.flagCaptures >= count
    }
    return false
  }

  private isDangerHeld() {
    const step = this.currentStep
    return Boolean(
      step?.trigger.kind === 'confirm'
      || (this.cameraPhase !== null && step?.cameraCue?.holdDanger),
    )
  }

  private isPlayerControlHeld() {
    return Boolean(this.currentStep?.trigger.kind === 'confirm' || this.cameraPhase !== null)
  }
}

function createBaseline(probe: TutorialDirectorProbe): StepBaseline {
  return {
    elapsed: probe.elapsed,
    col: probe.player.col,
    row: probe.player.row,
    dir: probe.player.dir,
    shotsFired: probe.shotsFired,
    playerKills: probe.playerKills,
    hostilesDefeated: probe.hostilesDefeated,
    relayActions: probe.relayActions,
    deployableActions: probe.deployableActions,
    activeMod: probe.activeMod,
    flagCarrierId: probe.flag?.carrierId ?? null,
    flagDropped: probe.flag?.dropped ?? false,
    flagCaptures: probe.flag?.captures ?? 0,
  }
}

function cloneProbe(probe: TutorialDirectorProbe): TutorialDirectorProbe {
  return {
    ...probe,
    player: { ...probe.player },
    flag: probe.flag ? { ...probe.flag } : null,
  }
}
