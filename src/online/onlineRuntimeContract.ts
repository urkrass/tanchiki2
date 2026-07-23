import type { OnlineBattleClient } from './onlineClient.ts'

export interface OnlineRuntimeOptions {
  canvas: HTMLCanvasElement
  entryInput: HTMLInputElement
  colorSafe: () => boolean
  touchHandedness: () => 'standard' | 'mirrored'
  touchSideRailsActive: () => boolean
}

export type OnlineRuntime = Pick<
  OnlineBattleClient,
  | 'back'
  | 'dispose'
  | 'drainAcousticCues'
  | 'getAccessibilityAnnouncement'
  | 'getEquipmentKinds'
  | 'getState'
  | 'handlePointerAction'
  | 'isActive'
  | 'isEntryEditing'
  | 'isGameplayLive'
  | 'openFieldBriefing'
  | 'releaseControls'
  | 'renderText'
  | 'setButton'
  | 'setTouchControlsVisible'
  | 'setTouchHandedness'
  | 'setTouchJoystickState'
  | 'setTouchOrientationGate'
  | 'update'
> & {
  render: () => void
}

export interface OnlineRuntimeModule {
  createOnlineRuntime: (options: OnlineRuntimeOptions) => OnlineRuntime
}
