import { clamp, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts'
import { drawPixelPortableRelay } from './pixelArt.ts'
import { drawPixelText } from './pixelText.ts'
import {
  getPortableRelayRotationFrame,
  PORTABLE_RELAY_ROTATION_FRAME_COUNT,
} from './portableRelayVisual.ts'

export const RELAY_SPLASH_DURATION_SECONDS = 4.2
export const RELAY_SPLASH_MIN_SKIP_SECONDS = 0.7

export type RelaySplashPhase = 'power-up' | 'signal-lock' | 'title-reveal' | 'handoff'

export interface RelaySplashSnapshot {
  mode: 'splash'
  title: 'TANCHIKI'
  phase: RelaySplashPhase
  elapsed: number
  duration: number
  progress: number
  skippable: boolean
  complete: boolean
  relay: {
    active: true
    frame: number
    frameCount: number
  }
}

export class RelaySplashScreen {
  private readonly context: CanvasRenderingContext2D
  private elapsed = 0

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is required for the relay splash screen')
    }
    this.context = context
    this.context.imageSmoothingEnabled = false
  }

  advance(dt: number) {
    const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0
    this.elapsed = Math.min(RELAY_SPLASH_DURATION_SECONDS, this.elapsed + safeDt)
  }

  skip() {
    if (this.elapsed < RELAY_SPLASH_MIN_SKIP_SECONDS) {
      return false
    }
    this.elapsed = RELAY_SPLASH_DURATION_SECONDS
    return true
  }

  isComplete() {
    return this.elapsed >= RELAY_SPLASH_DURATION_SECONDS
  }

  getSnapshot() {
    return getRelaySplashSnapshot(this.elapsed)
  }

  render() {
    drawRelaySplash(this.context, this.getSnapshot())
  }

  renderText() {
    return JSON.stringify({
      coordinateSystem: 'canvas origin top-left, x right, y down',
      ...this.getSnapshot(),
    })
  }
}

export function getRelaySplashSnapshot(elapsed: number): RelaySplashSnapshot {
  const safeElapsed = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, RELAY_SPLASH_DURATION_SECONDS)
  const progress = safeElapsed / RELAY_SPLASH_DURATION_SECONDS
  const phase: RelaySplashPhase = safeElapsed < 0.9
    ? 'power-up'
    : safeElapsed < 2
      ? 'signal-lock'
      : safeElapsed < 3.55
        ? 'title-reveal'
        : 'handoff'

  return {
    mode: 'splash',
    title: 'TANCHIKI',
    phase,
    elapsed: Number(safeElapsed.toFixed(3)),
    duration: RELAY_SPLASH_DURATION_SECONDS,
    progress: Number(progress.toFixed(3)),
    skippable: safeElapsed >= RELAY_SPLASH_MIN_SKIP_SECONDS,
    complete: safeElapsed >= RELAY_SPLASH_DURATION_SECONDS,
    relay: {
      active: true,
      frame: getPortableRelayRotationFrame(safeElapsed * 1.15).index,
      frameCount: PORTABLE_RELAY_ROTATION_FRAME_COUNT,
    },
  }
}

export function drawRelaySplash(ctx: CanvasRenderingContext2D, state: RelaySplashSnapshot) {
  const time = state.elapsed
  const intro = smoothstep(0.05, 0.75, time)
  const titleReveal = smoothstep(1.55, 2.3, time)
  const handoff = smoothstep(3.62, RELAY_SPLASH_DURATION_SECONDS, time)
  const centerX = Math.round(LOGICAL_WIDTH / 2)
  const relaySize = Math.round(138 + intro * 52)
  const relayX = Math.round(centerX - relaySize / 2)
  const relayY = Math.round(86 + (1 - intro) * 16)

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.fillStyle = '#050705'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  drawSignalField(ctx, centerX, 214, time, intro)
  drawHorizon(ctx, time, intro)

  ctx.globalAlpha = clamp(0.18 + intro * 0.82, 0, 1)
  drawRelayHalo(ctx, centerX, relayY + relaySize * 0.46, time, intro)
  drawPixelPortableRelay(ctx, relayX, relayY, relaySize, true, time * 1.15, 0, {
    presentation: 'splash',
  })

  const groundY = 304
  ctx.fillStyle = 'rgba(0, 0, 0, 0.66)'
  ctx.fillRect(centerX - 98, groundY, 196, 7)
  ctx.fillStyle = '#1a211c'
  ctx.fillRect(centerX - 66, groundY + 2, 132, 3)

  ctx.globalAlpha = titleReveal
  drawPixelText(ctx, 'TANCHIKI', centerX + 3, 361, {
    align: 'center',
    color: '#242015',
    letterSpacing: 2,
    scale: 4,
    shadowColor: null,
  })
  drawPixelText(ctx, 'TANCHIKI', centerX, 358, {
    align: 'center',
    color: '#f3e4a5',
    letterSpacing: 2,
    scale: 4,
    shadowColor: '#080906',
    shadowOffset: 2,
  })
  ctx.fillStyle = '#8b7a42'
  ctx.fillRect(centerX - Math.round(102 * titleReveal), 395, Math.round(204 * titleReveal), 2)
  ctx.fillStyle = '#d8bd58'
  ctx.fillRect(centerX - Math.round(54 * titleReveal), 395, Math.round(108 * titleReveal), 1)

  if (handoff > 0) {
    ctx.globalAlpha = handoff
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  }

  ctx.restore()
}

function drawSignalField(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  time: number,
  intensity: number,
) {
  ctx.save()
  ctx.globalAlpha = intensity
  const maxRadius = 236
  for (let ring = 0; ring < 4; ring += 1) {
    const progress = ((time * 0.42 + ring * 0.25) % 1 + 1) % 1
    const radius = 28 + progress * maxRadius
    ctx.strokeStyle = ring % 2 === 0 ? `rgba(134, 244, 255, ${0.22 * (1 - progress)})` : `rgba(255, 211, 90, ${0.14 * (1 - progress)})`
    ctx.lineWidth = progress < 0.5 ? 2 : 1
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  for (let ray = 0; ray < 16; ray += 1) {
    const angle = (ray / 16) * Math.PI * 2 + time * 0.08
    const inner = 86 + (ray % 3) * 7
    const outer = inner + 9 + (ray % 2) * 7
    ctx.strokeStyle = ray % 4 === 0 ? 'rgba(255, 211, 90, 0.28)' : 'rgba(134, 244, 255, 0.16)'
    ctx.lineWidth = ray % 4 === 0 ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner)
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer)
    ctx.stroke()
  }
  ctx.restore()
}

function drawHorizon(ctx: CanvasRenderingContext2D, time: number, intensity: number) {
  ctx.save()
  ctx.globalAlpha = intensity * 0.45
  ctx.fillStyle = '#121712'
  ctx.fillRect(0, 300, LOGICAL_WIDTH, LOGICAL_HEIGHT - 300)
  ctx.fillStyle = '#232c24'
  for (let x = -28; x < LOGICAL_WIDTH + 28; x += 28) {
    const drift = Math.round((time * 6) % 28)
    ctx.fillRect(x + drift, 312, 1, 102)
  }
  for (let y = 312; y < LOGICAL_HEIGHT; y += 18) {
    ctx.fillRect(0, y, LOGICAL_WIDTH, 1)
  }
  ctx.fillStyle = '#090b09'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 18)
  ctx.fillRect(0, LOGICAL_HEIGHT - 18, LOGICAL_WIDTH, 18)
  ctx.restore()
}

function drawRelayHalo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  time: number,
  intensity: number,
) {
  const pulse = 0.62 + Math.sin(time * 8) * 0.12
  ctx.save()
  ctx.globalAlpha = intensity
  ctx.fillStyle = `rgba(134, 244, 255, ${0.07 * pulse})`
  ctx.beginPath()
  ctx.arc(centerX, centerY, 86, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(255, 241, 165, ${0.34 * pulse})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, 76 + Math.sin(time * 5) * 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function smoothstep(start: number, end: number, value: number) {
  const progress = clamp((value - start) / Math.max(0.001, end - start), 0, 1)
  return progress * progress * (3 - 2 * progress)
}
