import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-review-accessibility'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
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
  const box = await page.locator('.game-canvas').boundingBox()
  if (!box) throw new Error('Missing canvas')

  await tapLogical(page, box, 280, 180, 1)
  await advance(page, 220)
  await tapLogical(page, box, 280, 180, 2)
  await advance(page, 220)
  await tapLogical(page, box, 280, 180, 3)
  await advance(page, 1350)
  await tapLogical(page, box, 280, 230, 4)
  await advance(page, 120)

  let state = await readState(page)
  assert(state.mode === 'playing', `Expected playing, received ${state.mode}`)
  assert(state.tutorial.stepId === 'welcome', `Expected welcome, received ${state.tutorial.stepId}`)
  assert(state.tutorial.reducedMotion === true, 'Reduced-motion preference was not mirrored into tutorial state')
  assert(state.tutorial.dialogueComplete === true, 'Reduced motion did not suppress typewriting')
  await capture(page, 'touch-visible-radio', state)

  // Use the visible radio panel itself. This regression intentionally uses no keyboard input.
  await tapLogical(page, box, 250, 60, 5)
  await advance(page, 120)
  state = await readState(page)
  assert(state.tutorial.stepId === 'welcome', 'First panel tap did not advance to the second order')
  assert(state.tutorial.dialogueComplete === true, 'Second reduced-motion order was not immediately readable')
  await tapLogical(page, box, 250, 60, 6)
  await advance(page, 120)
  state = await readState(page)
  assert(state.tutorial.stepId === 'tour', `Visible panel tap did not confirm the order: ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraControlled === true, 'Reduced-motion tour did not begin')

  const liveText = (await page.locator('#game-state').textContent())?.trim() ?? ''
  assert(liveText.length > 0 && !liveText.startsWith('{'), `Live region contains automation JSON: ${liveText.slice(0, 80)}`)
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  await capture(page, 'touch-panel-confirmed-tour', state)
  fs.writeFileSync(path.join(outputDir, 'live-region.txt'), liveText)
  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
} finally {
  await context.close()
  await browser.close()
}

async function tapLogical(page, box, x, y, pointerId) {
  const point = {
    x: box.x + (x / 560) * box.width,
    y: box.y + (y / 464) * box.height,
  }
  for (const type of ['pointerdown', 'pointerup']) {
    await page.evaluate(({ type, pointerId, point }) => {
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('Missing canvas')
      canvas.setPointerCapture = () => {}
      canvas.releasePointerCapture = () => {}
      canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'touch',
        clientX: point.x,
        clientY: point.y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        isPrimary: true,
      }))
    }, { type, pointerId, point })
    await advance(page, 90)
  }
}

async function advance(page, milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function capture(page, name, state) {
  await page.locator('.game-canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(state, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
