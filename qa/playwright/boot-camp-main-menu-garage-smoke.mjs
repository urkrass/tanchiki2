import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-main-menu-garage-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1120, height: 928 } })
await context.addInitScript(() => localStorage.removeItem('tanchiki.save.v1'))
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))

try {
  await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')

  await press('ArrowDown')
  await press('Enter')
  await press('Enter')
  await press('Enter')
  await advance(1300)
  await press('Enter')
  assert((await readState()).mode === 'playing', 'Campaign did not launch')

  await press('Escape')
  await press('ArrowDown')
  await press('Enter')
  let state = await readState()
  assert(state.mode === 'main-menu', 'Save And Quit did not return to the main menu')
  assert(state.progression.hasSavedRun === true, 'Campaign resumable run was not created')

  await press('ArrowDown')
  await press('Enter')
  state = await readState()
  assert(state.mode === 'tutorial-select' && state.runKind === 'tutorial', 'Boot Camp did not set tutorial context')
  await press('Escape')

  await press('ArrowDown')
  await press('ArrowDown')
  await press('ArrowDown')
  await press('Enter')
  state = await readState()
  assert(state.mode === 'garage', 'Main-menu Garage did not open')
  assert(state.runKind === 'campaign', 'Main-menu Garage retained stale tutorial context')
  assert(state.progression.hasSavedRun === true, 'Opening Garage invalidated the run before a loadout change')

  await press('ArrowDown')
  await press('ArrowDown')
  await press('Enter')
  await press('ArrowRight')
  await press('Enter')
  state = await readState()
  assert(state.progression.selectedMajorMod === 'pontoon', 'Pontoon was not selected')
  assert(state.progression.hasSavedRun === false, 'Stale Campaign run survived a main-menu Mod change')
  const save = JSON.parse(await page.evaluate(() => localStorage.getItem('tanchiki.save.v1')))
  assert(save.resumableRun === null, 'Persisted Campaign run was not invalidated')

  await page.locator('canvas').screenshot({ path: path.join(outputDir, 'campaign-run-invalidated.png') })
  fs.writeFileSync(path.join(outputDir, 'state.json'), JSON.stringify(state, null, 2))
  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
} finally {
  await context.close()
  await browser.close()
}

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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
