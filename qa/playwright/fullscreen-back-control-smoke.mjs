import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?skipSplash=1'
const outputDir = path.resolve(process.argv[3] ?? 'output/fullscreen-back-control-smoke')
const logicalSize = { width: 560, height: 464 }
const backControl = { x: 3, y: 428, width: 42, height: 32 }
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
  await openTankSelect()

  await page.keyboard.press('f')
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  let state = await readState()
  assert(state.mode === 'tank-select', `expected Tank Select, received ${state.mode}`)
  assert(state.readableText.navigation.backAvailable === true, 'text state did not expose Back availability')
  await page.screenshot({ path: path.join(outputDir, 'fullscreen-back-button.png'), fullPage: true })

  await clickLogical(
    backControl.x + backControl.width / 2,
    backControl.y + backControl.height / 2,
  )
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'garage')
  state = await readState()
  assert(await isFullscreen(), 'in-canvas Back button unexpectedly exited fullscreen')
  assert(state.mode === 'garage', `Back button did not return to Garage: ${state.mode}`)
  await page.screenshot({ path: path.join(outputDir, 'fullscreen-back-result.png'), fullPage: true })

  await openTankSelectFromGarage()
  await page.keyboard.press('Backspace')
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'garage')
  state = await readState()
  assert(await isFullscreen(), 'Backspace unexpectedly exited fullscreen')
  assert(state.mode === 'garage', `Backspace did not return to Garage: ${state.mode}`)

  await openTankSelectFromGarage()
  await page.evaluate(() => document.exitFullscreen())
  await page.waitForFunction(() => !document.fullscreenElement)
  state = await readState()
  assert(state.mode === 'tank-select', `browser fullscreen exit unexpectedly changed mode: ${state.mode}`)
  const fullscreenExitResultMode = state.mode

  const gameplayUrl = new URL(baseUrl)
  gameplayUrl.searchParams.set('devLevel', 'class_kit_test')
  await page.goto(gameplayUrl.toString(), { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()
  state = await readState()
  assert(state.mode === 'playing', `expected live gameplay, received ${state.mode}`)
  await page.keyboard.press('f')
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  await page.screenshot({ path: path.join(outputDir, 'fullscreen-gameplay-back-button.png'), fullPage: true })
  await clickLogical(
    backControl.x + backControl.width / 2,
    backControl.y + backControl.height / 2,
  )
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'paused')
  state = await readState()
  assert(await isFullscreen(), 'gameplay Back button unexpectedly exited fullscreen')
  assert(state.mode === 'paused', `gameplay Back button did not open Pause: ${state.mode}`)
  await page.screenshot({ path: path.join(outputDir, 'fullscreen-gameplay-back-result.png'), fullPage: true })

  const result = {
    outcome: 'FULLSCREEN_BACK_CONTROL_SMOKE_PASSED',
    buttonResultMode: 'garage',
    backspaceResultMode: 'garage',
    fullscreenExitResultMode,
    gameplayButtonResultMode: state.mode,
    fullscreen: await isFullscreen(),
    navigation: state.readableText.navigation,
    errors,
  }
  fs.writeFileSync(path.join(outputDir, 'state.json'), `${JSON.stringify({ result, state }, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, 'errors.json'), `${JSON.stringify(errors, null, 2)}\n`)
  assert(errors.length === 0, `browser errors: ${JSON.stringify(errors)}`)
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}

async function openTankSelect() {
  await selectIndex(2)
  await confirm()
  await openTankSelectFromGarage()
}

async function openTankSelectFromGarage() {
  await selectIndex(1)
  await confirm()
  const state = await readState()
  assert(state.mode === 'tank-select', `could not open Tank Select: ${state.mode}`)
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

async function clickLogical(x, y) {
  const box = await page.locator('.game-canvas').boundingBox()
  assert(box, 'game canvas is not visible')
  const fullscreen = await isFullscreen()
  const scale = fullscreen
    ? Math.min(box.width / logicalSize.width, box.height / logicalSize.height)
    : null
  const contentWidth = scale ? logicalSize.width * scale : box.width
  const contentHeight = scale ? logicalSize.height * scale : box.height
  const contentX = box.x + (box.width - contentWidth) / 2
  const contentY = box.y + (box.height - contentHeight) / 2
  await page.mouse.click(
    contentX + x / logicalSize.width * contentWidth,
    contentY + y / logicalSize.height * contentHeight,
  )
  await page.evaluate(() => window.advanceTime(80))
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
