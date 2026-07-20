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

export const TUTORIAL_DIALOGUE_SECONDS = 6
export const TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND = 20
export const TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS = 0.65
export const TUTORIAL_SENTENCE_HOLD_SECONDS = 1.5

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
  dialogueVisibleCharacters: number
  dialogueComplete: boolean
  missionComplete: boolean
  cameraControlled: boolean
  cameraTarget: TutorialCameraCue['target'] | null
  cameraLabel: string | null
  cameraWaypointIndex: number
  cameraWaypointCount: number
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
  private showingCompletionDialogue = false
  private baseline: StepBaseline
  private previousProbe: TutorialDirectorProbe
  private cameraPhase: 'tour' | 'return' | null = null
  private cameraElapsed = 0
  private cameraWaypointIndex = 0
  private missionComplete = false
  private triggerSatisfied = false
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

    this.updateDialogue(dt, probe)
    this.updateCamera(dt, probe)

    const step = this.currentStep
    if (step && !this.showingCompletionDialogue) {
      this.triggerSatisfied ||= this.isTriggerComplete(step, probe)
      if (this.triggerSatisfied && !this.dialogueVisible) {
        if (step.completionDialogue?.length) {
          this.showingCompletionDialogue = true
          this.dialogueIndex = 0
          this.dialogueElapsed = 0
          this.dialogueVisible = true
        } else {
          this.advanceStep(probe)
        }
      }
    }

    this.previousProbe = cloneProbe(probe)
  }

  advanceDialogue(probe: TutorialDirectorProbe) {
    const step = this.currentStep
    if (!step) {
      return false
    }

    const lines = step.dialogue
    const activeLines = this.showingCompletionDialogue
      ? step.completionDialogue ?? []
      : lines
    const line = this.dialogueVisible ? activeLines[this.dialogueIndex] ?? null : null
    if (line && !this.isDialogueComplete(line.text)) {
      this.dialogueElapsed = Math.max(
        this.dialogueElapsed,
        getDialogueTypingSeconds(line.text),
      )
      return true
    }

    if (this.dialogueVisible && this.dialogueIndex < activeLines.length - 1) {
      this.dialogueIndex += 1
      this.dialogueElapsed = 0
      return true
    }

    if (this.showingCompletionDialogue) {
      this.advanceStep(probe)
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
    const activeLines = this.showingCompletionDialogue
      ? step?.completionDialogue ?? []
      : step?.dialogue ?? []
    const line = this.dialogueVisible ? activeLines[this.dialogueIndex] ?? null : null
    const visibleCharacters = line
      ? getDialogueVisibleCharacters(line.text, this.dialogueElapsed)
      : 0
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
      dialogueVisibleCharacters: visibleCharacters,
      dialogueComplete: Boolean(line && visibleCharacters >= line.text.length),
      missionComplete: this.missionComplete,
      cameraControlled: this.cameraPhase !== null,
      cameraTarget: this.cameraPhase === 'tour' ? this.currentCameraWaypoint?.target ?? null : null,
      cameraLabel: this.cameraPhase !== null ? this.currentCameraWaypoint?.label ?? step?.cameraCue?.label ?? null : null,
      cameraWaypointIndex: this.cameraWaypointIndex,
      cameraWaypointCount: step?.cameraCue?.waypoints?.length ?? (step?.cameraCue ? 1 : 0),
      dangerHeld: this.isDangerHeld(),
      playerControlHeld: this.isPlayerControlHeld(),
    }
  }

  private get currentStep() {
    return this.mission.steps[this.stepIndex] ?? null
  }

  private get currentCameraWaypoint() {
    const cue = this.currentStep?.cameraCue
    if (!cue) {
      return null
    }
    return cue.waypoints?.[this.cameraWaypointIndex] ?? cue
  }

  private enterStep(probe: TutorialDirectorProbe) {
    this.baseline = createBaseline(probe)
    this.dialogueIndex = 0
    this.dialogueElapsed = 0
    this.dialogueVisible = Boolean(this.currentStep?.dialogue.length)
    this.showingCompletionDialogue = false
    this.cameraElapsed = 0
    this.cameraWaypointIndex = 0
    this.cameraPhase = this.currentStep?.cameraCue ? 'tour' : null
    this.triggerSatisfied = false
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

  private updateDialogue(dt: number, probe: TutorialDirectorProbe) {
    const step = this.currentStep
    const lines = this.showingCompletionDialogue
      ? step?.completionDialogue ?? []
      : step?.dialogue ?? []
    const line = lines[this.dialogueIndex]
    if (!line || !this.dialogueVisible) {
      return
    }

    this.dialogueElapsed += dt
    const typingSeconds = getDialogueTypingSeconds(line.text)
    const duration = Math.max(
      2.4,
      line.duration ?? TUTORIAL_DIALOGUE_SECONDS,
      typingSeconds + TUTORIAL_SENTENCE_HOLD_SECONDS,
    )
    if (this.dialogueElapsed < duration) {
      return
    }

    if (this.dialogueIndex < lines.length - 1) {
      this.dialogueIndex += 1
      this.dialogueElapsed = 0
    } else if (this.showingCompletionDialogue) {
      this.advanceStep(probe)
    } else {
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
      const waypoint = this.currentCameraWaypoint
      if (!waypoint) {
        this.cameraPhase = 'return'
        return
      }
      this.cameraElapsed += dt
      if (this.cameraElapsed >= waypoint.duration) {
        const waypointCount = cue.waypoints?.length ?? 1
        if (this.cameraWaypointIndex < waypointCount - 1) {
          this.cameraWaypointIndex += 1
          this.cameraElapsed = 0
          return
        }
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

  private isDialogueComplete(text: string) {
    return getDialogueVisibleCharacters(text, this.dialogueElapsed) >= text.length
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
      if (trigger.target === 'squad') {
        return defeated >= count
      }
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

function getDialogueTypingSeconds(text: string) {
  return (
    text.length / TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND
    + getInterSentencePauseCount(text) * TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS
  )
}

function getDialogueVisibleCharacters(text: string, elapsed: number) {
  let remaining = elapsed
  for (let index = 0; index < text.length; index += 1) {
    const characterSeconds = 1 / TUTORIAL_TYPEWRITER_CHARACTERS_PER_SECOND
    if (remaining + 1e-9 < characterSeconds) {
      return index
    }
    remaining -= characterSeconds
    if (isInterSentenceBoundary(text, index)) {
      if (remaining + 1e-9 < TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS) {
        return index + 1
      }
      remaining -= TUTORIAL_INTER_SENTENCE_PAUSE_SECONDS
    }
  }
  return text.length
}

function getInterSentencePauseCount(text: string) {
  let count = 0
  for (let index = 0; index < text.length; index += 1) {
    if (isInterSentenceBoundary(text, index)) {
      count += 1
    }
  }
  return count
}

function isInterSentenceBoundary(text: string, index: number) {
  if (!'.!?'.includes(text[index] ?? '')) {
    return false
  }
  if ('.!?'.includes(text[index + 1] ?? '')) {
    return false
  }

  let nextIndex = index + 1
  while (nextIndex < text.length && '"\'’”)]}'.includes(text[nextIndex] ?? '')) {
    nextIndex += 1
  }
  while (nextIndex < text.length && /\s/.test(text[nextIndex] ?? '')) {
    nextIndex += 1
  }
  return nextIndex < text.length
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
