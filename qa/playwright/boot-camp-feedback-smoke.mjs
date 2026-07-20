import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-feedback-smoke'
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
  assert(state.readableText.tutorial.speaker === 'General Rook', 'General Rook missing from readable briefing')
  assert(state.readableText.tutorial.dialogue.includes('movement'), 'Mission briefing missing from readable text')
  const closedMouth = await readPortraitMouth(page)
  await capture(page, 'general-rook-briefing-closed')

  await advance(page, 220)
  const openMouth = await readPortraitMouth(page)
  await capture(page, 'general-rook-briefing-speaking')
  assert(closedMouth !== openMouth, 'General Rook portrait mouth did not animate')

  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.mode === 'playing', `Expected playing, received ${state.mode}`)
  assert(state.tutorial.speaker === 'Actual', 'Opening radio did not start with Actual')

  await advance(page, 4500)
  state = await readState(page)
  assert(state.tutorial.speaker === 'Actual', 'Opening radio advanced before the slower reading beat')
  await capture(page, 'opening-radio-reading-beat')

  await advance(page, 1700)
  state = await readState(page)
  assert(state.tutorial.speaker === 'Spanner', 'Opening radio did not advance after six seconds')
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.stepId === 'move', `Expected move step, received ${state.tutorial.stepId}`)

  await advance(page, 5500)
  state = await readState(page)
  assert(
    state.enemiesRemaining === 2,
    `First hostile spawned before the six-second training delay: remaining=${state.enemiesRemaining}`,
  )
  await advance(page, 700)
  state = await readState(page)
  assert(
    state.enemiesRemaining === 1,
    `First hostile did not spawn after the deliberate delay: remaining=${state.enemiesRemaining}`,
  )
  await capture(page, 'first-hostile-delayed')

  fs.writeFileSync(path.join(outputDir, 'final-state.json'), JSON.stringify(state, null, 2))
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

async function readPortraitMouth(pageInstance) {
  return pageInstance.locator('canvas').evaluate((canvas) => {
    const context2d = canvas.getContext('2d')
    return Array.from(context2d.getImageData(88, 108, 8, 10).data).join(',')
  })
}

async function capture(pageInstance, name) {
  await pageInstance.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
