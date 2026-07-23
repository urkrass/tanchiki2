import { OnlineBattleClient } from './onlineClient.ts'
import { OnlineCanvasRenderer } from './onlineRenderer.ts'
import type { OnlineRuntime, OnlineRuntimeOptions } from './onlineRuntimeContract.ts'

class BrowserOnlineRuntime implements OnlineRuntime {
  private readonly client: OnlineBattleClient
  private readonly renderer: OnlineCanvasRenderer

  constructor(options: OnlineRuntimeOptions) {
    this.client = new OnlineBattleClient(options.entryInput)
    this.renderer = new OnlineCanvasRenderer(
      options.canvas,
      this.client,
      options.colorSafe,
      options.touchHandedness,
      options.touchSideRailsActive,
    )
  }

  back = () => this.client.back()
  dispose = () => this.client.dispose()
  drainAcousticCues = () => this.client.drainAcousticCues()
  getAccessibilityAnnouncement = () => this.client.getAccessibilityAnnouncement()
  getEquipmentKinds = () => this.client.getEquipmentKinds()
  getState = (now?: number) => this.client.getState(now)
  handlePointerAction = (x: number, y: number) => this.client.handlePointerAction(x, y)
  isActive = () => this.client.isActive()
  isEntryEditing = () => this.client.isEntryEditing()
  isGameplayLive = () => this.client.isGameplayLive()
  openFieldBriefing = (intent: Parameters<OnlineBattleClient['openFieldBriefing']>[0]) => {
    this.client.openFieldBriefing(intent)
  }
  releaseControls = () => this.client.releaseControls()
  render = () => this.renderer.render()
  renderText = () => this.client.renderText()
  setButton = (...args: Parameters<OnlineBattleClient['setButton']>) => this.client.setButton(...args)
  setTouchControlsVisible = (visible: boolean) => this.client.setTouchControlsVisible(visible)
  setTouchHandedness = (...args: Parameters<OnlineBattleClient['setTouchHandedness']>) => {
    this.client.setTouchHandedness(...args)
  }
  setTouchJoystickState = (...args: Parameters<OnlineBattleClient['setTouchJoystickState']>) => {
    this.client.setTouchJoystickState(...args)
  }
  setTouchOrientationGate = (...args: Parameters<OnlineBattleClient['setTouchOrientationGate']>) => {
    this.client.setTouchOrientationGate(...args)
  }
  update = (dt: number) => this.client.update(dt)
}

export function createOnlineRuntime(options: OnlineRuntimeOptions): OnlineRuntime {
  return new BrowserOnlineRuntime(options)
}
