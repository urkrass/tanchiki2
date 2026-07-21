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
    <canvas
      class="game-canvas"
      width="${LOGICAL_WIDTH}"
      height="${LOGICAL_HEIGHT}"
      tabindex="0"
      aria-label="Tanchiki game canvas"
    ></canvas>
    <p class="visually-hidden" aria-live="polite" id="game-state"></p>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('.game-canvas')
const maybeStatusOutput = document.querySelector<HTMLParagraphElement>('#game-state')

if (!canvas || !maybeStatusOutput) {
  throw new Error('Game shell failed to initialize')
}

const statusOutput = maybeStatusOutput
const searchParams = new URLSearchParams(window.location.search)
const forceTouchControlsForTesting = import.meta.env.DEV && searchParams.get('touch') === '1'
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
const renderer = new CanvasRenderer(canvas, game)
const onlineRenderer = new OnlineCanvasRenderer(
  canvas,
  online,
  () => game.getSettings().colorSafe,
  () => game.getSettings().touchHandedness,
)
const audio = new RetroAudio()
const splashEnabled = !visualQa && !customDevLevel && searchParams.get('skipSplash') !== '1'
const splash = splashEnabled ? new RelaySplashScreen(canvas) : null
let splashActive = Boolean(splash)
let input = visualQa || splashActive ? null : new InputController(canvas, game, online)
if (forceTouchControlsForTesting) {
  game.setTouchControlsVisible(true)
  online.setTouchControlsVisible(true)
}
let lastFrame = performance.now()
let manualStepping = false
let statusAccumulator = 0
let lastAccessibilityKey = ''
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
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

function drawActiveOrientationGate() {
  const context = canvas?.getContext('2d')
  if (!context) return
  drawOrientationGate(context, {
    active: orientationGateActive,
    onlineBattleLive: orientationGateOnlineLive,
  })
}

syncOrientationGate()
window.addEventListener('resize', syncOrientationGate)
window.addEventListener('orientationchange', syncOrientationGate)
coarsePointerQuery.addEventListener?.('change', syncOrientationGate)

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

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  syncOrientationGate()

  if (visualQa) {
    visualQa.advance(dt)
    visualQa.render()
    announceAccessibility('visual-qa', 'Visual quality assurance scene.')
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
      return splash.renderText()
    }
    renderer.render()
    drawActiveOrientationGate()
    updateAccessibleGameStatus()
    return game.renderText()
  }
  if (online.isActive()) {
    online.update(ms / 1000)
    onlineRenderer.render()
    drawActiveOrientationGate()
    announceAccessibility('online-battle', 'Online battle in progress.')
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
    input = new InputController(canvas!, game, online)
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
  window.removeEventListener('resize', syncOrientationGate)
  window.removeEventListener('orientationchange', syncOrientationGate)
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
requestAnimationFrame(frame)
