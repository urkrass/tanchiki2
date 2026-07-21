import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?skipSplash=1'
const outputDir = path.resolve(process.argv[3] ?? 'output/fullscreen-escape-smoke')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 720 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()
  await selectIndex(2)
  await confirm()
  await selectIndex(1)
  await confirm()

  let state = await readState()
  assert(state.mode === 'tank-select', `expected Tank Select, received ${state.mode}`)

  await page.keyboard.press('f')
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  assert(await isFullscreen(), 'F did not enter fullscreen')

  await page.keyboard.press('Escape')
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'garage')
  state = await readState()
  assert(state.mode === 'garage', `delivered fullscreen Escape did not navigate Back: ${state.mode}`)
  if (await isFullscreen()) {
    await page.keyboard.press('f')
    await page.waitForFunction(() => !document.fullscreenElement)
  }

  await selectIndex(1)
  await confirm()
  state = await readState()
  assert(state.mode === 'tank-select', `could not reopen Tank Select: ${state.mode}`)
  await page.keyboard.press('f')
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  await page.evaluate(() => document.exitFullscreen())
  await page.waitForFunction(() => !document.fullscreenElement)
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'garage')
  state = await readState()
  assert(state.mode === 'garage', `browser-consumed fullscreen exit did not navigate Back: ${state.mode}`)
  await page.screenshot({ path: path.join(outputDir, 'fullscreen-escape-back.png'), fullPage: true })

  await page.keyboard.press('f')
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  await page.keyboard.press('f')
  await page.waitForFunction(() => !document.fullscreenElement)
  state = await readState()
  assert(state.mode === 'garage', `explicit F exit unexpectedly navigated Back: ${state.mode}`)

  const result = {
    outcome: 'FULLSCREEN_ESCAPE_SMOKE_PASSED',
    deliveredEscapeResultMode: 'garage',
    consumedEscapeResultMode: 'garage',
    explicitToggleResultMode: state.mode,
    fullscreen: await isFullscreen(),
    errors,
  }
  fs.writeFileSync(path.join(outputDir, 'state.json'), `${JSON.stringify({ result, state }, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, 'errors.json'), `${JSON.stringify(errors, null, 2)}\n`)
  assert(errors.length === 0, `browser errors: ${JSON.stringify(errors)}`)
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}

async function press(key) {
  await page.keyboard.press(key)
  await page.evaluate(() => window.advanceTime(80))
}

async function confirm() {
  await page.keyboard.press('Enter')
  await page.evaluate(() => window.advanceTime(180))
}

async function selectIndex(target) {
  const state = await readState()
  const count = state.menu.options.length
  let delta = (target - state.menu.selectedIndex + count) % count
  while (delta > 0) {
    await press('ArrowDown')
    delta -= 1
  }
}

async function readState() {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function isFullscreen() {
  return page.evaluate(() => Boolean(document.fullscreenElement))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
