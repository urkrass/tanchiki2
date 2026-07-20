import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-rook-tour-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1120, height: 928 } })
await context.addInitScript(() => {
  localStorage.removeItem('tanchiki.save.v1')
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))

try {
  await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  await press(page, 'Enter')
  await press(page, 'Enter')

  let state = await readState(page)
  assert(state.mode === 'briefing', `Expected briefing, received ${state.mode}`)
  assert(state.readableText.tutorial.speaker === 'General Rook', 'General Rook missing from briefing')
  await capture(page, 'mission-1-briefing')

  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.mode === 'playing', `Expected playing, received ${state.mode}`)
  assert(state.tutorial.speaker === 'General Rook', 'Mission did not open with General Rook')
  assert(state.enemiesRemaining === 0, 'Both Mission 1 hostiles were not preloaded for the tour')
  assert(state.onboarding.objective === 'Objective: destroy all 2 enemies.', 'Mission 1 still reports a base objective')
  assert(state.readableText.hud.objective === 'Tank hunt: enemies remaining 2.', 'Mission 1 HUD still reports a base')
  assert(!state.readableText.levelMarkers.labels.includes('BASE'), 'Mission 1 still exposes a base marker')

  await advance(page, 900)
  state = await readState(page)
  assert(state.tutorial.dialogueVisibleCharacters > 0, 'Typewriter did not reveal any characters')
  assert(
    state.tutorial.dialogueVisibleCharacters < state.tutorial.dialogue.length,
    'Opening instruction rendered instantly instead of typing',
  )
  assert(state.tutorial.dialogueComplete === false, 'Opening instruction completed too early')
  const mouthFrameA = await readLivePortraitMouth(page)
  await capture(page, 'rook-typewriter-speaking-a')
  await advance(page, 220)
  const mouthFrameB = await readLivePortraitMouth(page)
  await capture(page, 'rook-typewriter-speaking-b')
  assert(mouthFrameA !== mouthFrameB, 'General Rook did not animate while the instruction typed')
  state = await readState(page)
  const firstSentenceCharacters = state.tutorial.dialogue.indexOf('.') + 1
  assert(
    state.tutorial.dialogueVisibleCharacters === firstSentenceCharacters,
    'Typewriter did not pause after Rook’s first sentence',
  )
  await advance(page, 300)
  state = await readState(page)
  assert(
    state.tutorial.dialogueVisibleCharacters === firstSentenceCharacters,
    'Rook’s between-sentence pause was too short to follow',
  )
  await captureState(page, 'rook-between-sentences')
  await advance(page, 400)
  state = await readState(page)
  assert(
    state.tutorial.dialogueVisibleCharacters > firstSentenceCharacters,
    'Typewriter did not resume after Rook’s between-sentence pause',
  )

  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.dialogueComplete === true, 'First Enter did not finish the current instruction')
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.stepId === 'welcome', 'Second instruction did not remain in the opening step')
  assert(state.tutorial.dialogueComplete === false, 'Second instruction rendered instantly')
  await press(page, 'Enter')
  await press(page, 'Enter')

  state = await readState(page)
  assert(state.tutorial.stepId === 'tour', `Expected camera tour, received ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraControlled === true, 'Range control did not take the camera')
  assert(state.tutorial.cameraWaypointCount === 3, 'Mission 1 camera tour does not cover three map stops')
  assert(state.tutorial.cameraLabel === 'Left hostile', `Unexpected first tour stop: ${state.tutorial.cameraLabel}`)
  await advance(page, 1000)
  await captureState(page, 'tour-1-left-hostile')

  await advance(page, 2400)
  state = await readState(page)
  assert(state.tutorial.cameraWaypointIndex === 1, 'Camera did not advance to the obstacle lanes')
  assert(state.tutorial.cameraLabel === 'Obstacle lanes', `Unexpected second tour stop: ${state.tutorial.cameraLabel}`)
  await advance(page, 1000)
  await captureState(page, 'tour-2-obstacle-lanes')

  await advance(page, 1400)
  state = await readState(page)
  for (let index = 0; index < 5 && !state.tutorial.dialogueComplete; index += 1) {
    await advance(page, 200)
    state = await readState(page)
  }
  assert(state.tutorial.dialogueComplete === true, 'The complete tour instruction was never held on screen')
  await captureState(page, 'tour-instruction-complete')

  await advance(page, 800)
  state = await readState(page)
  assert(state.tutorial.cameraWaypointIndex === 2, 'Camera did not advance to the right hostile')
  assert(state.tutorial.cameraLabel === 'Right hostile', `Unexpected third tour stop: ${state.tutorial.cameraLabel}`)
  await advance(page, 1000)
  state = await readState(page)
  assert(state.tutorial.dialogue === null, 'Finished briefing text did not collapse')
  await captureState(page, 'tour-3-right-hostile-face-only')

  for (let index = 0; index < 12 && state.tutorial.cameraControlled; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.tutorial.cameraControlled === false, 'Camera did not return to player follow')
  assert(state.tutorial.stepId === 'move', `Expected movement lesson after tour, received ${state.tutorial.stepId}`)
  await captureState(page, 'player-follow-restored')

  const movementOrigin = { ...state.player }
  await advance(page, 500)
  await page.keyboard.down('ArrowRight')
  await advance(page, 1800)
  await page.keyboard.up('ArrowRight')
  await advance(page, 100)
  state = await readState(page)
  const movementDistance = Math.abs(state.player.col - movementOrigin.col) + Math.abs(state.player.row - movementOrigin.row)
  assert(movementDistance >= 3, `Expected a three-cell movement lap, received ${movementDistance}`)
  assert(state.tutorial.stepId === 'move', 'The easy movement goal interrupted Rook before he finished the order')
  assert(state.tutorial.dialogue !== null, 'Rook disappeared before finishing the movement order')
  await captureState(page, 'movement-complete-narration-held')

  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.dialogueComplete === true, 'Enter did not finish the movement instruction')
  await advance(page, 1200)
  state = await readState(page)
  assert(state.tutorial.stepId === 'move', 'The next order ignored Rook’s post-sentence breathing beat')
  await captureState(page, 'movement-order-breathing-beat')

  await advance(page, 400)
  state = await readState(page)
  assert(state.tutorial.stepId === 'engage', `Expected the engagement order after the pause, received ${state.tutorial.stepId}`)
  assert(
    state.tutorial.activeGoal === 'Use cover and destroy both enemy tanks.',
    `Unexpected engagement goal: ${state.tutorial.activeGoal}`,
  )
  assert(state.tutorial.dialogueVisibleCharacters < state.tutorial.dialogue.length, 'Engagement order rendered instantly')
  await captureState(page, 'engagement-order-begins')

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
} finally {
  await context.close()
  await browser.close()
}

async function press(pageInstance, key) {
  await pageInstance.keyboard.down(key)
  await advance(pageInstance, 160)
  await pageInstance.keyboard.up(key)
  await advance(pageInstance, 40)
}

async function advance(pageInstance, milliseconds) {
  await pageInstance.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState(pageInstance) {
  return JSON.parse(await pageInstance.evaluate(() => window.render_game_to_text()))
}

async function readLivePortraitMouth(pageInstance) {
  return pageInstance.locator('canvas').evaluate((canvas) => {
    const context2d = canvas.getContext('2d')
    return Array.from(context2d.getImageData(73, 61, 8, 8).data).join(',')
  })
}

async function capture(pageInstance, name) {
  await pageInstance.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
}

async function captureState(pageInstance, name) {
  await capture(pageInstance, name)
  const state = await readState(pageInstance)
  fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(state, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
