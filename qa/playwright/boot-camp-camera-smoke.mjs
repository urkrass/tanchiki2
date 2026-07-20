import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-camera-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1120, height: 928 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))

await page.addInitScript(() => {
  localStorage.setItem('tanchiki.save.v1', JSON.stringify({
    schemaVersion: 1,
    progression: {
      selectedTeam: 'blue',
      selectedTankClass: 'scout',
      bestScore: 0,
      xp: 0,
      credits: 0,
      unlockedStage: 1,
      completedLevels: [],
      tutorialCompletedMissions: [1],
      selectedMajorMod: 'emp',
      upgrades: { armor: 0, cannon: 0, engine: 0, repairKit: 0 },
    },
    settings: { volume: 0.7, muted: false, colorSafe: false },
    resumableRun: null,
  }))
})

await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => typeof window.advanceTime === 'function')

await press('Enter')
await press('Enter')
await press('Enter')
await advance(1300)
await press('Enter')
await press('Enter')

let state = await readState()
assert(state.mode === 'playing', `expected playing, received ${state.mode}`)
assert(state.tutorial.missionId === 2, `expected mission 2, received ${state.tutorial.missionId}`)
assert(state.tutorial.stepId === 'tour', `expected tour, received ${state.tutorial.stepId}`)
assert(state.tutorial.cameraControlled === true, 'camera should be controlled during the objective tour')
await capture('camera-tour')

await advance(900)
state = await readState()
assert(state.tutorial.cameraControlled === true, 'camera tour ended before its configured duration')
assert(state.player.hp === 3, 'player took damage while range control held danger')

await advance(3200)
state = await readState()
assert(state.tutorial.stepId === 'relay', `expected relay step after return, received ${state.tutorial.stepId}`)
assert(state.tutorial.cameraControlled === false, 'camera did not return to player follow')
await capture('camera-return')

fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
assert(errors.length === 0, `browser errors: ${JSON.stringify(errors)}`)
await browser.close()

async function press(key) {
  await page.keyboard.down(key)
  await advance(160)
  await page.keyboard.up(key)
  await advance(40)
}

async function advance(milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function capture(name) {
  await page.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), await page.evaluate(() => window.render_game_to_text()))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
