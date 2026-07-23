export interface OnlineResultControlRect {
  x: number
  y: number
  width: number
  height: number
}

export type OnlineResultControl = 'rematch' | 'close'

export const ONLINE_RESULT_CONTROLS: Record<OnlineResultControl, OnlineResultControlRect> = {
  rematch: { x: 164, y: 314, width: 232, height: 64 },
  close: { x: 202, y: 394, width: 156, height: 40 },
}

export function getOnlineResultControlHit(x: number, y: number): OnlineResultControl | null {
  return (['rematch', 'close'] as const).find((control) => pointInRect(x, y, ONLINE_RESULT_CONTROLS[control])) ?? null
}

function pointInRect(x: number, y: number, rect: OnlineResultControlRect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
