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
import { loadUiAtlas } from './game/uiAtlas.ts'
import { loadVehicleAtlas } from './game/vehicleAtlas.ts'
import { normalizeVisualQaMode, VisualQaRenderer } from './game/visualQa.ts'
import {
  VISUAL_DENSITY_SLICE_LEVEL,
  VISUAL_DENSITY_SLICE_LEVEL_ID,
  VISUAL_DENSITY_SLICE_LEVEL_SLUG,
} from './game/visualDensitySlice.ts'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './game/constants.ts'
import { OnlineBattleClient } from './online/onlineClient.ts'
import { OnlineCanvasRenderer } from './online/onlineRenderer.ts'

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
const devLevelSlug = searchParams.get('devLevel')
const visualQaMode = normalizeVisualQaMode(searchParams.get('visualQa'))
const visualQa = visualQaMode ? new VisualQaRenderer(canvas, visualQaMode) : null
const terrainEvidenceDevLevel = devLevelSlug === TERRAIN_EVIDENCE_TEST_LEVEL_SLUG
const battlefieldBiomePropsDevLevel = devLevelSlug === BATTLEFIELD_BIOME_PROPS_TEST_LEVEL_SLUG
const softCoverVegetationDevLevel = devLevelSlug === SOFT_COVER_VEGETATION_TEST_LEVEL_SLUG
const visualDensitySliceDevLevel = devLevelSlug === VISUAL_DENSITY_SLICE_LEVEL_SLUG
const game = new TanchikiGame(
  terrainEvidenceDevLevel || battlefieldBiomePropsDevLevel || softCoverVegetationDevLevel || visualDensitySliceDevLevel
    ? {
        aiEnabled: visualDensitySliceDevLevel,
        levelDefinitions: [
          terrainEvidenceDevLevel
            ? TERRAIN_EVIDENCE_TEST_LEVEL
            : softCoverVegetationDevLevel
              ? SOFT_COVER_VEGETATION_TEST_LEVEL
              : visualDensitySliceDevLevel
                ? VISUAL_DENSITY_SLICE_LEVEL
                : BATTLEFIELD_BIOME_PROPS_TEST_LEVEL,
        ],
        saveStore: new MemorySaveStore(),
      }
    : undefined,
)
const online = new OnlineBattleClient()
const renderer = new CanvasRenderer(canvas, game)
const onlineRenderer = new OnlineCanvasRenderer(canvas, online, () => game.getSettings().colorSafe)
const audio = new RetroAudio()
const input = visualQa ? null : new InputController(canvas, game, online)
let lastFrame = performance.now()
let manualStepping = false
let statusAccumulator = 0

void loadSpriteAtlas()
void loadBattlefieldPropAtlas()
void loadUiAtlas()
void loadVehicleAtlas()

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

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now

  if (visualQa) {
    visualQa.advance(dt)
    visualQa.render()
    statusOutput.textContent = visualQa.renderText()
    requestAnimationFrame(frame)
    return
  }

  if (!manualStepping && online.isActive()) {
    online.update(dt)
  } else if (!manualStepping) {
    game.update(dt)
  }

  playQueuedSounds()
  if (!online.isActive() && game.consumeOnlineQuickMatchRequest()) {
    void online.connectQuickMatch()
  }

  if (online.isActive()) {
    onlineRenderer.render()
    statusAccumulator += dt

    if (statusAccumulator > 0.5) {
      statusAccumulator = 0
      statusOutput.textContent = online.renderText()
    }

    requestAnimationFrame(frame)
    return
  }

  renderer.render()
  statusAccumulator += dt

  if (statusAccumulator > 0.5) {
    statusAccumulator = 0
    statusOutput.textContent = game.renderText()
  }

  requestAnimationFrame(frame)
}

window.render_game_to_text = () => visualQa?.renderText() ?? (online.isActive() ? online.renderText() : game.renderText())
window.advanceTime = (ms: number) => {
  manualStepping = true
  if (visualQa) {
    visualQa.advance(ms / 1000)
    visualQa.render()
    statusOutput.textContent = visualQa.renderText()
    return visualQa.renderText()
  }
  if (online.isActive()) {
    online.update(ms / 1000)
    onlineRenderer.render()
    statusOutput.textContent = online.renderText()
    return online.renderText()
  }

  const steps = Math.max(1, Math.round(ms / (1000 / 60)))

  for (let step = 0; step < steps; step += 1) {
    game.update(1 / 60)
  }

  playQueuedSounds()
  renderer.render()
  statusOutput.textContent = game.renderText()
  return game.renderText()
}

canvas.addEventListener('click', () => {
  canvas.focus()
  audio.resume()
  playQueuedSounds()
})

window.addEventListener('pointerdown', () => audio.resume(), { passive: true })
window.addEventListener('keydown', () => audio.resume())

function playQueuedSounds() {
  const settings = game.getSettings()
  for (const event of game.drainSoundEvents()) {
    audio.play(event.kind, settings)
  }
}

window.addEventListener('beforeunload', () => {
  input?.dispose()
  online.dispose()
})
canvas.focus()
if (visualQa) {
  visualQa.render()
} else {
  renderer.render()
}
requestAnimationFrame(frame)
