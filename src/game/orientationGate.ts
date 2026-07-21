import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts'
import { drawPixelText, wrapPixelText } from './pixelText.ts'

export interface OrientationGateState {
  active: boolean
  onlineBattleLive: boolean
}

export function isTabletPortraitGateActive(
  width: number,
  height: number,
  coarsePointer: boolean,
  minimumTabletWidth = 600,
) {
  return coarsePointer && width >= minimumTabletWidth && height > width
}

export function drawOrientationGate(ctx: CanvasRenderingContext2D, state: OrientationGateState) {
  if (!state.active) {
    return
  }

  ctx.save()
  ctx.globalAlpha = 0.94
  ctx.fillStyle = '#050705'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#2b302b'
  ctx.fillRect(18, 18, LOGICAL_WIDTH - 36, LOGICAL_HEIGHT - 36)
  ctx.fillStyle = '#0b0e0b'
  ctx.fillRect(22, 22, LOGICAL_WIDTH - 44, LOGICAL_HEIGHT - 44)
  ctx.strokeStyle = '#ffd35a'
  ctx.lineWidth = 2
  ctx.strokeRect(25, 25, LOGICAL_WIDTH - 50, LOGICAL_HEIGHT - 50)

  drawPixelText(ctx, 'ROTATE TABLET', LOGICAL_WIDTH / 2, 158, {
    align: 'center',
    color: '#fff1a5',
    maxWidth: LOGICAL_WIDTH - 90,
    scale: 3,
  })
  drawPixelText(ctx, state.onlineBattleLive ? 'BATTLE STILL LIVE' : 'ACTION PAUSED', LOGICAL_WIDTH / 2, 208, {
    align: 'center',
    color: state.onlineBattleLive ? '#f06243' : '#86f4ff',
    maxWidth: LOGICAL_WIDTH - 90,
    scale: 2,
  })

  const detail = state.onlineBattleLive
    ? 'CONTROLS ARE RELEASED. TURN TO LANDSCAPE TO REJOIN THE FIGHT.'
    : 'TURN TO LANDSCAPE TO CONTINUE. YOUR DRILL HAS NOT MOVED.'
  wrapPixelText(detail, LOGICAL_WIDTH - 140, 1).forEach((line, index) => {
    drawPixelText(ctx, line, LOGICAL_WIDTH / 2, 260 + index * 12, {
      align: 'center',
      color: '#d8d4c8',
      maxWidth: LOGICAL_WIDTH - 140,
      scale: 1,
    })
  })
  ctx.restore()
}
