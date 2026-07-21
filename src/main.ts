import './style.css'
import { RetroAudio } from './game/audio.ts'
import { TanchikiGame } from './game/game.ts'
import { InputController } from './game/input.ts'
import {
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL,
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID,
  BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG,
  SOFT_COVER_VEGETATION_TEST_LEVEL,
  SOFT_COVER_VEGETATION_TEST_LEVEL_ID,
  SOFT_COVER_VEGETATION_TEST_LEVEL_SLUG,
  TERRAIN_EVIDENCE_TEST_LEVEL,
  TERRAIN_EVIDENCE_TEST_LEVEL_ID,
  TERRAIN_EVIDENCE_TEST_LEVEL_SLUG,
} from './game/level.ts'
import { loadBattlefieldPropAtlas } from './game/battlefieldPropAtlas.ts'
import { CanvasRenderer } from './game/render.ts'
import { MemorySaveStore } from './game/save.ts'
import { loadSpriteAtlas } from './game/spriteAtlas.ts'
import { loadStaticRelayAtlas } from './game/staticRelayAtlas.ts'
import { loadUiAtlas } from './game/uiAtlas.ts'
import { loadVehicleAtlas } from './game/vehicleAtlas.ts'
import { normalizeVisualQaMode, VisualQaRenderer } from './game/visualQa.ts'
import { RelaySplashScreen } from './game/splashScreen.ts'
import {
  VISUAL_DENSITY_SLICE_LEVEL,
  VISUAL_DENSITY_SLICE_LEVEL_ID,
  VISUAL_DENSITY_SLICE_LEVEL_SLUG,
} from './game/visualDensitySlice.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './game/constants.ts'
import {
  QA_ALL_EQUIPMENT_LEVEL,
  QA_ALL_EQUIPMENT_LEVEL_ID,
  QA_ALL_EQUIPMENT_LEVEL_SLUG,
  QA_CLASS_KIT_LEVEL,
  QA_CLASS_KIT_LEVEL_ID,
  QA_CLASS_KIT_LEVEL_SLUG,
  QA_CTF_FLAG_LEVEL,
  QA_CTF_FLAG_LEVEL_ID,
  QA_CTF_FLAG_LEVEL_SLUG,
  QA_CTF_HUD_LEVEL,
  QA_CTF_HUD_LEVEL_ID,
  QA_CTF_HUD_LEVEL_SLUG,
} from './game/testing/qaIntegrationLevel.ts'
import { OnlineBattleClient } from './online/onlineClient.ts'
import { OnlineCanvasRenderer } from './online/onlineRenderer.ts'
import { getAccessibilityAnnouncement } from './game/accessibilityAnnouncements.ts'
import { drawOrientationGate, isTabletPortraitGateActive } from './game/orientationGate.ts'
import {
  TOUCH_RAIL_HEIGHT,
  TOUCH_RAIL_WIDTH,
  drawTouchSideRail,
  getTouchRailModState,
  getTouchRailControl,
  isTabletTouchSideRailActive,
  type TouchSideRailRenderState,
} from './game/touchSideRails.ts'

declare global {
  interface Window {
    advanceTime: (ms: number) => string
    render_game_to_text: () => string
  }
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root')
}

app.innerHTML = `
  <main class="game-shell" aria-label="Tanchiki retro tank game">
    <div class="game-stage">
      <canvas
        class="game-canvas"
        width="${LOGICAL_WIDTH}"
        height="${LOGICAL_HEIGHT}"
        tabindex="0"
        aria-label="Tanchiki game canvas"
      ></canvas>
      <canvas
        class="touch-side-rail touch-side-rail--left"
        width="${TOUCH_RAIL_WIDTH}"
        height="${TOUCH_RAIL_HEIGHT}"
        aria-label="Movement touch control"
      ></canvas>
      <canvas
        class="touch-side-rail touch-side-rail--right"
        width="${TOUCH_RAIL_WIDTH}"
        height="${TOUCH_RAIL_HEIGHT}"
        aria-label="Fire touch control"
      ></canvas>
    </div>
    <p class="visually-hidden" aria-live="polite" id="game-state"></p>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas')
const leftTouchRail = document.querySelector<HTMLCanvasElement>('.touch-side-rail--left')
const rightTouchRail = document.querySelector<HTMLCanvasElement>('.touch-side-rail--right')
const maybeStatusOutput = document.querySelector<HTMLParagraphElement>('#game-state')

if (!canvas || !leftTouchRail || !rightTouchRail || !maybeStatusOutput) {
  throw new Error('Game shell failed to initialize')
}

const appRoot = app
const leftTouchRailCanvas = leftTouchRail
const rightTouchRailCanvas = rightTouchRail
const statusOutput = maybeStatusOutput
const searchParams = new URLSearchParams(window.location.search)
const forceTouchControlsForTesting = import.meta.env.DEV && searchParams.get('touch') === '1'
const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
const isTouchSideRailActive = () => isTabletTouchSideRailActive(
  window.innerWidth,
  window.innerHeight,
  coarsePointerQuery.matches,
  forceTouchControlsForTesting,
)
const touchSideRailElements = {
  left: leftTouchRailCanvas,
  right: rightTouchRailCanvas,
  isActive: isTouchSideRailActive,
}
const devLevelSlug = searchParams.get('devLevel')
const devTankClass = searchParams.get('tankClass')
const devMajorMod = searchParams.get('majorMod')
const devTouchLayout = searchParams.get('touchLayout')
const openAllCampaignLevelsForTesting = import.meta.env.DEV && searchParams.get('campaign') === 'all'
const visualQaMode = normalizeVisualQaMode(searchParams.get('visualQa'))
const visualQa = visualQaMode ? new VisualQaRenderer(canvas, visualQaMode) : null
const terrainEvidenceDevLevel = devLevelSlug === TERRAIN_EVIDENCE_TEST_LEVEL_SLUG
const battlefieldBiomePropsDevLevel = devLevelSlug === BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG
const softCoverVegetationDevLevel = devLevelSlug === SOFT_COVER_VEGETATION_TEST_LEVEL_SLUG
const visualDensitySliceDevLevel = devLevelSlug === VISUAL_DENSITY_SLICE_LEVEL_SLUG
const ctfHudDevLevel = devLevelSlug === QA_CTF_HUD_LEVEL_SLUG
const ctfFlagDevLevel = devLevelSlug === QA_CTF_FLAG_LEVEL_SLUG
const classKitDevLevel = devLevelSlug === QA_CLASS_KIT_LEVEL_SLUG
const allEquipmentDevLevel = import.meta.env.DEV && devLevelSlug === QA_ALL_EQUIPMENT_LEVEL_SLUG
const customDevLevel =
  terrainEvidenceDevLevel ||
  battlefieldBiomePropsDevLevel ||
  softCoverVegetationDevLevel ||
  visualDensitySliceDevLevel ||
  ctfHudDevLevel ||
  ctfFlagDevLevel ||
  classKitDevLevel ||
  allEquipmentDevLevel
const game = new TanchikiGame(
  customDevLevel
    ? {
        aiEnabled: visualDensitySliceDevLevel,
        levelDefinitions: [
          terrainEvidenceDevLevel
            ? TERRAIN_EVIDENCE_TEST_LEVEL
            : softCoverVegetationDevLevel
              ? SOFT_COVER_VEGETATION_TEST_LEVEL
              : visualDensitySliceDevLevel
                ? VISUAL_DENSITY_SLICE_LEVEL
                : ctfHudDevLevel
                  ? QA_CTF_HUD_LEVEL
                  : ctfFlagDevLevel
                    ? QA_CTF_FLAG_LEVEL
                    : classKitDevLevel
                      ? QA_CLASS_KIT_LEVEL
                      : allEquipmentDevLevel
                        ? QA_ALL_EQUIPMENT_LEVEL
                        : BATTLEFIELD_BIOME_PROPS_TEST_LEVEL,
        ],
        allClassEquipmentForTesting: allEquipmentDevLevel,
        saveStore: new MemorySaveStore(),
      }
    : openAllCampaignLevelsForTesting
      ? {
          openAllCampaignLevelsForTesting: true,
          saveStore: new MemorySaveStore(),
        }
      : undefined,
)
if (import.meta.env.DEV && devTouchLayout === 'mirrored') {
  game.setTouchHandedness('mirrored')
}
const online = new OnlineBattleClient()
const renderer = new CanvasRenderer(canvas, game, isTouchSideRailActive)
const onlineRenderer = new OnlineCanvasRenderer(
  canvas,
  online,
  () => game.getSettings().colorSafe,
  () => game.getSettings().touchHandedness,
  isTouchSideRailActive,
)
const audio = new RetroAudio()
const splashEnabled = !visualQa && !customDevLevel && searchParams.get('skipSplash') !== '1'
const splash = splashEnabled ? new RelaySplashScreen(canvas) : null
let splashActive = Boolean(splash)
let input = visualQa || splashActive ? null : new InputController(canvas, game, online, touchSideRailElements)
if (forceTouchControlsForTesting) {
  game.setTouchControlsVisible(true)
  online.setTouchControlsVisible(true)
}
let lastFrame = performance.now()
let manualStepping = false
let statusAccumulator = 0
let lastAccessibilityKey = ''
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let orientationGateActive = false
let orientationGateOnlineLive = false
const syncReducedMotion = () => game.setReducedMotion(reducedMotionQuery.matches)
syncReducedMotion()
reducedMotionQuery.addEventListener?.('change', syncReducedMotion)

function syncOrientationGate() {
  const active = !visualQa && isTabletPortraitGateActive(
    window.innerWidth,
    window.innerHeight,
    coarsePointerQuery.matches,
  )
  const onlineLive = active && online.getState().connection === 'connected'
  if (active === orientationGateActive && onlineLive === orientationGateOnlineLive) {
    return
  }

  orientationGateActive = active
  orientationGateOnlineLive = onlineLive
  if (input) {
    input.setOrientationBlocked(active, onlineLive)
  } else {
    game.setTouchOrientationGate(active, onlineLive)
    online.setTouchOrientationGate(active, onlineLive)
  }
}

function syncTouchSideRailLayout() {
  appRoot.classList.toggle('touch-side-rails', isTouchSideRailActive())
}

function drawActiveOrientationGate() {
  const context = canvas?.getContext('2d')
  if (!context) return
  drawOrientationGate(context, {
    active: orientationGateActive,
    onlineBattleLive: orientationGateOnlineLive,
  })
}

syncOrientationGate()
syncTouchSideRailLayout()
window.addEventListener('resize', syncOrientationGate)
window.addEventListener('resize', syncTouchSideRailLayout)
window.addEventListener('orientationchange', syncOrientationGate)
window.addEventListener('orientationchange', syncTouchSideRailLayout)
coarsePointerQuery.addEventListener?.('change', syncOrientationGate)
coarsePointerQuery.addEventListener?.('change', syncTouchSideRailLayout)

function announceAccessibility(key: string, message: string) {
  if (key === lastAccessibilityKey) {
    return
  }
  lastAccessibilityKey = key
  statusOutput.textContent = message
}

function updateAccessibleGameStatus() {
  const announcement = getAccessibilityAnnouncement(game.getSnapshot())
  announceAccessibility(announcement.key, announcement.message)
}

void loadSpriteAtlas()
void loadBattlefieldPropAtlas()
void loadStaticRelayAtlas()
void loadUiAtlas()
void loadVehicleAtlas()

if (allEquipmentDevLevel) {
  game.setTankClass('battle')
} else if (
  customDevLevel &&
  (devTankClass === 'scout' || devTankClass === 'engineer' || devTankClass === 'battle')
) {
  game.setTankClass(devTankClass)
}

if (
  import.meta.env.DEV
  && (devMajorMod === 'overdrive' || devMajorMod === 'pontoon' || devMajorMod === 'hedgehog' || devMajorMod === 'emp')
) {
  game.setMajorMod(devMajorMod)
}

if (terrainEvidenceDevLevel) {
  game.startGame(TERRAIN_EVIDENCE_TEST_LEVEL_ID)
}

if (battlefieldBiomePropsDevLevel) {
  game.startGame(BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_ID)
}

if (softCoverVegetationDevLevel) {
  game.startGame(SOFT_COVER_VEGETATION_TEST_LEVEL_ID)
}

if (visualDensitySliceDevLevel) {
  game.startGame(VISUAL_DENSITY_SLICE_LEVEL_ID)
}

if (ctfHudDevLevel) {
  game.startGame(QA_CTF_HUD_LEVEL_ID)
}

if (ctfFlagDevLevel) {
  game.startGame(QA_CTF_FLAG_LEVEL_ID)
}

if (classKitDevLevel) {
  game.startGame(QA_CLASS_KIT_LEVEL_ID)
}

if (allEquipmentDevLevel) {
  game.startGame(QA_ALL_EQUIPMENT_LEVEL_ID)
}

function renderTouchSideRails() {
  const leftContext = leftTouchRailCanvas.getContext('2d')
  const rightContext = rightTouchRailCanvas.getContext('2d')
  if (!leftContext || !rightContext) return

  const layoutActive = isTouchSideRailActive()
  const offlineState = game.getSnapshot()
  const onlineState = online.isActive() ? online.getState(performance.now()) : null
  const visible = Boolean(
    layoutActive
    && !orientationGateActive
    && !visualQa
    && !splashActive
    && (onlineState
      ? onlineState.touchControlsVisible && onlineState.snapshot
      : offlineState.feedback.touchControlsVisible && offlineState.mode === 'playing'),
  )
  const state: TouchSideRailRenderState = {
    visible,
    handedness: onlineState?.touch.handedness ?? offlineState.settings.touchHandedness,
    joystick: onlineState?.touchJoystick ?? offlineState.feedback.touch.joystick,
    heldButtons: onlineState?.input.held ?? offlineState.feedback.heldButtons,
    confirmBriefing: Boolean(
      !onlineState
      && offlineState.tutorial.dialogue
      && offlineState.tutorial.playerControlHeld
    ),
    relay: onlineState
      ? null
      : {
          active: offlineState.feedback.heldButtons.relay,
          progress: offlineState.feedback.touch.relayProgress,
          remaining: Math.max(0, offlineState.portableRelay.limit - offlineState.portableRelay.activeCount),
        },
    mod: onlineState
      ? null
      : getTouchRailModState(
          offlineState.majorMods,
          offlineState.feedback.touch.modSlider,
        ),
  }

  for (const [side, rail] of [['left', leftTouchRailCanvas], ['right', rightTouchRailCanvas]] as const) {
    const control = getTouchRailControl(side, state.handedness)
    rail.setAttribute(
      'aria-label',
      control === 'joystick'
        ? state.confirmBriefing
          ? 'Relay and movement touch controls with briefing Next button'
          : state.relay
            ? 'Relay and movement touch controls'
            : 'Movement touch control'
        : state.mod
          ? 'Major Mod slider and Fire touch controls'
          : 'Fire touch control',
    )
  }
  appRoot.classList.toggle('touch-side-rails-visible', visible)
  drawTouchSideRail(leftContext, 'left', state)
  drawTouchSideRail(rightContext, 'right', state)
}

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  syncOrientationGate()

  if (visualQa) {
    visualQa.advance(dt)
    visualQa.render()
    announceAccessibility('visual-qa', 'Visual quality assurance scene.')
    renderTouchSideRails()
    requestAnimationFrame(frame)
    return
  }

  if (splashActive && splash) {
    if (!manualStepping) {
      splash.advance(dt)
    }
    finishSplashIfReady()
    if (splashActive) {
      splash.render()
      drawActiveOrientationGate()
      announceAccessibility('splash', 'Tanchiki introduction.')
      renderTouchSideRails()
      requestAnimationFrame(frame)
      return
    }
  }

  if (!manualStepping && online.isActive()) {
    online.update(dt)
  } else if (!manualStepping && !orientationGateActive) {
    game.update(dt)
  }

  playQueuedSounds()
  if (!online.isActive() && game.consumeOnlineQuickMatchRequest() && !orientationGateActive) {
    void online.connectQuickMatch().finally(syncOrientationGate)
  }

  if (online.isActive()) {
    onlineRenderer.render()
    drawActiveOrientationGate()
    renderTouchSideRails()
    statusAccumulator += dt

    if (statusAccumulator > 0.5) {
      statusAccumulator = 0
      announceAccessibility('online-battle', 'Online battle in progress.')
    }

    requestAnimationFrame(frame)
    return
  }

  renderer.render()
  drawActiveOrientationGate()
  renderTouchSideRails()
  statusAccumulator += dt

  if (statusAccumulator > 0.5) {
    statusAccumulator = 0
    updateAccessibleGameStatus()
  }

  requestAnimationFrame(frame)
}

window.render_game_to_text = () => {
  if (splashActive && splash) {
    return splash.renderText()
  }
  return visualQa?.renderText() ?? (online.isActive() ? online.renderText() : game.renderText())
}
window.advanceTime = (ms: number) => {
  manualStepping = true
  if (visualQa) {
    visualQa.advance(ms / 1000)
    visualQa.render()
    announceAccessibility('visual-qa', 'Visual quality assurance scene.')
    renderTouchSideRails()
    return visualQa.renderText()
  }
  if (splashActive && splash) {
    if (!orientationGateActive) {
      splash.advance(ms / 1000)
    }
    finishSplashIfReady()
    if (splashActive) {
      splash.render()
      drawActiveOrientationGate()
      announceAccessibility('splash', 'Tanchiki introduction.')
      renderTouchSideRails()
      return splash.renderText()
    }
    renderer.render()
    drawActiveOrientationGate()
    updateAccessibleGameStatus()
    renderTouchSideRails()
    return game.renderText()
  }
  if (online.isActive()) {
    online.update(ms / 1000)
    onlineRenderer.render()
    drawActiveOrientationGate()
    announceAccessibility('online-battle', 'Online battle in progress.')
    renderTouchSideRails()
    return online.renderText()
  }

  const steps = orientationGateActive ? 0 : Math.max(1, Math.round(ms / (1000 / 60)))

  for (let step = 0; step < steps; step += 1) {
    game.update(1 / 60)
  }

  playQueuedSounds()
  renderer.render()
  drawActiveOrientationGate()
  updateAccessibleGameStatus()
  renderTouchSideRails()
  return game.renderText()
}

canvas.addEventListener('click', () => {
  canvas.focus()
  audio.resume()
  skipSplash()
  playQueuedSounds()
})

window.addEventListener('pointerdown', () => audio.resume(), { passive: true })
window.addEventListener('keydown', (event) => {
  audio.resume()
  if (event.code === 'Enter' || event.code === 'Space' || event.code === 'Escape') {
    skipSplash()
  }
})

function skipSplash() {
  if (!splashActive || !splash || !splash.skip()) {
    return
  }
  finishSplashIfReady()
  renderer.render()
  updateAccessibleGameStatus()
}

function finishSplashIfReady() {
  if (!splashActive || !splash?.isComplete()) {
    return
  }
  splashActive = false
  if (!visualQa && !input) {
    input = new InputController(canvas!, game, online, touchSideRailElements)
    input.setOrientationBlocked(orientationGateActive, orientationGateOnlineLive)
    if (forceTouchControlsForTesting) {
      game.setTouchControlsVisible(true)
      online.setTouchControlsVisible(true)
    }
  }
}

function playQueuedSounds() {
  const settings = game.getSettings()
  for (const event of game.drainSoundEvents()) {
    audio.play(event.kind, settings)
  }
}

window.addEventListener('beforeunload', () => {
  input?.dispose()
  online.dispose()
  reducedMotionQuery.removeEventListener?.('change', syncReducedMotion)
  coarsePointerQuery.removeEventListener?.('change', syncOrientationGate)
  coarsePointerQuery.removeEventListener?.('change', syncTouchSideRailLayout)
  window.removeEventListener('resize', syncOrientationGate)
  window.removeEventListener('resize', syncTouchSideRailLayout)
  window.removeEventListener('orientationchange', syncOrientationGate)
  window.removeEventListener('orientationchange', syncTouchSideRailLayout)
})
canvas.focus()
if (visualQa) {
  visualQa.render()
} else if (splashActive && splash) {
  splash.render()
  announceAccessibility('splash', 'Tanchiki introduction.')
} else {
  renderer.render()
  drawActiveOrientationGate()
  updateAccessibleGameStatus()
}
renderTouchSideRails()
requestAnimationFrame(frame)
