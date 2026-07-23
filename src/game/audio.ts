import type { SettingsState, SoundEvent } from './types.ts'
import type { AcousticEventKind, AudibleAcousticCue } from '../../packages/shared/src/spatialHearing.ts'

export class RetroAudio {
  private context: AudioContext | null = null

  resume() {
    const context = this.getContext()
    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }
  }

  play(event: SoundEvent, settings: SettingsState) {
    if (settings.muted || settings.volume <= 0) {
      return
    }

    const context = this.getContext()
    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }

    const now = context.currentTime
    const kind = event.kind
    const gain = Math.max(0, Math.min(1, settings.volume))
      * 0.08
      * (event.cue?.gain ?? 1)
    const pan = event.cue?.pan ?? 0

    if (kind === 'menu') this.beep(context, now, 440, 0.045, gain, 'square', 440, pan)
    if (kind === 'fire') this.beep(context, now, 140, 0.075, gain * 1.15, 'sawtooth', 72, pan)
    if (kind === 'hit') this.beep(context, now, 95, 0.055, gain, 'square', 95, pan)
    if (kind === 'brick') this.sequence(context, now, [220, 150], 0.05, gain, pan)
    if (kind === 'enemy-destroyed') this.sequence(context, now, [330, 220, 110], 0.055, gain * 1.1, pan)
    if (kind === 'tracks') this.beep(context, now, 70, 0.04, gain * 0.45, 'triangle', 54, pan)
    if (kind === 'rustle') this.beep(context, now, 210, 0.055, gain * 0.34, 'triangle', 165, pan)
    if (kind === 'trap') this.sequence(context, now, [260, 120], 0.045, gain * 0.8, pan)
    if (kind === 'environment') this.beep(context, now, 110, 0.06, gain * 0.55, 'sine', 82, pan)
    if (kind === 'powerup') this.sequence(context, now, [520, 780], 0.06, gain, pan)
    if (kind === 'upgrade') this.sequence(context, now, [440, 660, 880], 0.05, gain, pan)
    if (kind === 'level-clear') this.sequence(context, now, [392, 523, 659, 784], 0.08, gain, pan)
    if (kind === 'game-over') this.sequence(context, now, [220, 174, 130], 0.11, gain * 1.1, pan)
  }

  private getContext() {
    if (this.context) {
      return this.context
    }

    const AudioContextConstructor = globalThis.AudioContext

    if (!AudioContextConstructor) {
      return null
    }

    this.context = new AudioContextConstructor()
    return this.context
  }

  private sequence(
    context: AudioContext,
    start: number,
    notes: number[],
    duration: number,
    gain: number,
    pan: number,
  ) {
    notes.forEach((note, index) =>
      this.beep(context, start + index * duration * 0.9, note, duration, gain, 'square', note, pan))
  }

  playAcousticCue(cue: AudibleAcousticCue, settings: SettingsState) {
    this.play({
      kind: acousticSoundKind(cue.kind),
      cue,
    }, settings)
  }

  private beep(
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'square',
    endFrequency = frequency,
    pan = 0,
  ) {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.linearRampToValueAtTime(gain, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(envelope)
    if (typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner()
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), start)
      envelope.connect(panner)
      panner.connect(context.destination)
    } else {
      envelope.connect(context.destination)
    }
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }
}

function acousticSoundKind(kind: AcousticEventKind): SoundEvent['kind'] {
  if (kind === 'shot') return 'fire'
  if (kind === 'impact') return 'hit'
  if (kind === 'explosion') return 'enemy-destroyed'
  return kind
}
