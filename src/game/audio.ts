import type { SettingsState, SoundEventKind } from './types.ts'

export class RetroAudio {
  private context: AudioContext | null = null

  resume() {
    const context = this.getContext()
    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }
  }

  play(kind: SoundEventKind, settings: SettingsState) {
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
    const gain = Math.max(0, Math.min(1, settings.volume)) * 0.08

    if (kind === 'menu') this.beep(context, now, 440, 0.045, gain)
    if (kind === 'fire') this.beep(context, now, 140, 0.075, gain * 1.15, 'sawtooth', 72)
    if (kind === 'hit') this.beep(context, now, 95, 0.055, gain, 'square')
    if (kind === 'brick') this.sequence(context, now, [220, 150], 0.05, gain)
    if (kind === 'enemy-destroyed') this.sequence(context, now, [330, 220, 110], 0.055, gain * 1.1)
    if (kind === 'powerup') this.sequence(context, now, [520, 780], 0.06, gain)
    if (kind === 'upgrade') this.sequence(context, now, [440, 660, 880], 0.05, gain)
    if (kind === 'level-clear') this.sequence(context, now, [392, 523, 659, 784], 0.08, gain)
    if (kind === 'game-over') this.sequence(context, now, [220, 174, 130], 0.11, gain * 1.1)
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

  private sequence(context: AudioContext, start: number, notes: number[], duration: number, gain: number) {
    notes.forEach((note, index) => this.beep(context, start + index * duration * 0.9, note, duration, gain))
  }

  private beep(
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = 'square',
    endFrequency = frequency,
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
    envelope.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }
}
