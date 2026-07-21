import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/'
const outputDir = path.resolve(process.argv[3] ?? 'output/tank-class-gameplay-sync')
const LOGICAL_WIDTH = 560
const LOGICAL_HEIGHT = 464
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 960, height: 720 },
  deviceScaleFactor: 2,
})
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  await page.goto(withParams({ skipSplash: '1' }), { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()

  await press('ArrowDown')
  await press('Enter')
  await press('ArrowDown')
  await press('Enter')
  let state = await readState()
  assert(state.mode === 'tank-select', `Tank Select opened ${state.mode}`)
  assert(state.tankClasses.showcase.displayed === 'engineer', 'Tank Select did not open on Engineer')

  // Exercise the newly enlarged theater-edge mouse target, not the center of
  // the painted arrow button.
  await clickLogical(418, 181)
  await advance(40)
  state = await readState()
  assert(state.tankClasses.showcase.displayed === 'battle', 'mouse did not switch the carousel to Battle Tank')
  assert(state.tankClasses.showcase.equipped === 'engineer', 'mouse preview unexpectedly equipped Battle Tank')

  await press('Enter')
  state = await readState()
  assert(state.tankClasses.showcase.equipped === 'battle', 'Enter did not equip the mouse-previewed Battle Tank')
  await clickLogical(280, 388)
  await advance(180)
  assert((await readState()).mode === 'garage', 'Tank Select Back target did not return to Garage')

  await press('Escape')
  await press('Enter')
  await press('Enter')
  await press('Enter')
  await advance(1600)
  await press('Enter')
  state = await readState()
  assert(state.mode === 'playing', `campaign launch ended in ${state.mode}`)
  assert(state.player.classId === 'battle', `campaign launched ${state.player.classId}`)
  assert(state.player.hp === 3 && state.player.shield === 1, 'Battle Tank did not enter real play with 3 HP + 1 shield')
  await capture('battle-real-game-shield-ready')

  let absorbed = false
  for (let index = 0; index < 120; index += 1) {
    await advance(100)
    state = await readState()
    if (state.mode === 'playing' && state.player.shield === 0) {
      assert(state.player.hp === 3, 'opening enemy hit bypassed the Battle Tank shield')
      absorbed = true
      await capture('battle-real-game-shield-absorbed')
      break
    }
  }
  assert(absorbed, 'an enemy opening hit did not activate and consume the Battle Tank shield')

  await page.goto(withParams({
    devLevel: 'class_kit_test',
    tankClass: 'battle',
  }), { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()
  await advance(80)
  const wallReady = await readState()
  assert(wallReady.mode === 'playing', `class range opened ${wallReady.mode}`)
  assert(wallReady.player.classId === 'battle', 'class range did not use Battle Tank')
  const readyBrickCount = wallReady.terrain.brick

  await page.keyboard.down('Space')
  await advance(20)
  await page.keyboard.up('Space')
  await advance(240)
  state = await readState()
  assert(state.runStats.bricksDestroyed === 1, 'HE shell did not destroy the focused wall tile')
  assert(state.terrain.brick === readyBrickCount - 1, 'HE splash incorrectly destroyed an adjacent wall tile')
  await capture('battle-real-game-wall-splash')

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
}

function withParams(params) {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

async function press(key) {
  await page.keyboard.press(key)
  await advance(180)
}

async function clickLogical(logicalX, logicalY) {
  const box = await page.locator('.game-canvas').boundingBox()
  if (!box) throw new Error('canvas bounds are unavailable')
  await page.mouse.click(
    box.x + (logicalX / LOGICAL_WIDTH) * box.width,
    box.y + (logicalY / LOGICAL_HEIGHT) * box.height,
  )
}

async function advance(milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function capture(name) {
  await page.locator('.game-canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), await page.evaluate(() => window.render_game_to_text()))
}

async function readState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
