import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?campaign=all'
const outputDir = path.resolve(process.argv[3] ?? 'output/relay-splash-smoke')
const mobile = process.argv[4] === 'mobile'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 720 },
  deviceScaleFactor: 2,
  hasTouch: mobile,
})
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()

  const opening = await readState()
  assert(opening.mode === 'splash', 'startup did not begin on the relay splash')
  assert(opening.phase === 'power-up', `unexpected opening phase: ${opening.phase}`)
  assert(opening.relay.frameCount === 16, 'relay splash did not expose the expanded frame count')
  await capture('power-up')

  await page.evaluate(() => window.advanceTime(2200))
  const title = await readState()
  assert(title.mode === 'splash', 'splash ended before the title reveal')
  assert(title.phase === 'title-reveal', `unexpected title phase: ${title.phase}`)
  assert(title.title === 'TANCHIKI', 'splash title is missing')
  await capture('title-reveal')

  await page.evaluate((milliseconds) => window.advanceTime(milliseconds), Math.max(0, (3.13 - title.elapsed) * 1000))
  const rearFacing = await readState()
  assert(rearFacing.mode === 'splash', 'rear-facing relay frame ended the splash early')
  assert(
    rearFacing.relay.frame >= 7 && rearFacing.relay.frame <= 9,
    `expected rear-facing relay frame, received ${rearFacing.relay.frame}`,
  )
  await capture('rear-facing')

  if (mobile) {
    await page.locator('.game-canvas').tap({ position: { x: 187, y: 155 } })
  } else {
    await page.keyboard.press('Enter')
  }
  await page.evaluate(() => window.advanceTime(20))
  const menu = await readState()
  assert(menu.mode === 'main-menu', 'deliberate splash skip did not hand off to the main menu')
  assert(menu.menu.selectedIndex === 0, 'skip input leaked into the main-menu selection')
  await capture('main-menu-handoff')

  await page.keyboard.press('Enter')
  await page.evaluate(() => window.advanceTime(220))
  const selected = await readState()
  assert(selected.mode === 'level-select', `first post-splash menu input opened ${selected.mode}`)
  await capture('campaign-selected')

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
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
