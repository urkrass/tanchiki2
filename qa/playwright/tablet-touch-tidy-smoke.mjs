import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6400 + Math.floor(Math.random() * 200)
const baseUrl = `http://127.0.0.1:${port}/`
const outRootIndex = process.argv.indexOf('--out-root')
const outRoot = outRootIndex >= 0 ? process.argv[outRootIndex + 1] : 'output/tablet-touch-tidy-smoke'
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

const consoleMessages = []
let browser

try {
  await mkdir(outRoot, { recursive: true })
  await waitForHttp(baseUrl)
  browser = await chromium.launch({ headless: true })

  const tutorialContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tutorialPage = await tutorialContext.newPage()
  attachConsoleCapture(tutorialPage, 'tutorial')
  await tutorialPage.goto(`${baseUrl}?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await tutorialPage.waitForFunction(() => typeof window.advanceTime === 'function')
  const tutorialCanvas = await boundingBox(tutorialPage, '.game-canvas')

  await tapLogical(tutorialPage, tutorialCanvas, 280, 180)
  await advance(tutorialPage, 220)
  await tapLogical(tutorialPage, tutorialCanvas, 280, 180)
  await advance(tutorialPage, 220)
  await tapLogical(tutorialPage, tutorialCanvas, 280, 180)
  await advance(tutorialPage, 1350)
  await tapLogical(tutorialPage, tutorialCanvas, 280, 230)
  await advance(tutorialPage, 120)

  let tutorialState = await readState(tutorialPage)
  assert(tutorialState.mode === 'playing', `Expected tutorial gameplay, got ${tutorialState.mode}`)
  assert(tutorialState.tutorial.stepId === 'welcome', `Expected welcome, got ${tutorialState.tutorial.stepId}`)
  assert(tutorialState.tutorial.dialogueComplete === true, 'Reduced-motion briefing was not ready to confirm')
  await tutorialPage.screenshot({ path: `${outRoot}/tablet-briefing-before-tap.png`, fullPage: true })

  await tapLogical(tutorialPage, tutorialCanvas, 250, 60)
  await advance(tutorialPage, 120)
  tutorialState = await readState(tutorialPage)
  assert(tutorialState.tutorial.stepId === 'welcome', 'One physical tap skipped more than one briefing order')
  assert(tutorialState.tutorial.dialogueComplete === true, 'Second briefing order is not ready')

  await tapLogical(tutorialPage, tutorialCanvas, 250, 60)
  await advance(tutorialPage, 120)
  tutorialState = await readState(tutorialPage)
  assert(tutorialState.tutorial.stepId === 'tour', `Physical briefing tap did not confirm: ${tutorialState.tutorial.stepId}`)
  assert(tutorialState.tutorial.cameraControlled === true, 'Confirmed briefing did not start the camera tour')
  await tutorialPage.screenshot({ path: `${outRoot}/tablet-briefing-confirmed.png`, fullPage: true })

  const controlContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })
  const controlPage = await controlContext.newPage()
  attachConsoleCapture(controlPage, 'controls')
  await controlPage.goto(`${baseUrl}?skipSplash=1&devLevel=all_mods_test&majorMod=hedgehog`, { waitUntil: 'domcontentloaded' })
  await controlPage.waitForFunction(() => typeof window.advanceTime === 'function')
  const controlCanvas = await boundingBox(controlPage, '.game-canvas')
  const leftRail = await boundingBox(controlPage, '.touch-side-rail--left')

  await dispatchPointer(controlPage, 'pointerdown', 11, railToViewport(leftRail, 8, 354), '.touch-side-rail--left')
  await advance(controlPage, 120)
  const joystickState = await readState(controlPage)
  assert(joystickState.feedback.touch.joystick.anchorX === 56, 'Joystick base moved away from the rail center')
  assert(joystickState.feedback.touch.joystick.anchorY === 354, 'Joystick base moved vertically')
  assert(joystickState.feedback.touch.joystick.offsetX === -24, 'Joystick knob did not use the compact clamp')
  assert(joystickState.feedback.touch.joystick.direction === 'left', 'Off-center touch did not steer left')
  assert(
    Math.hypot(joystickState.feedback.touch.joystick.offsetX, joystickState.feedback.touch.joystick.offsetY) + 15 < 44,
    'Joystick knob reaches outside the base ring',
  )
  await controlPage.screenshot({ path: `${outRoot}/tablet-fixed-joystick.png`, fullPage: true })
  await dispatchPointer(controlPage, 'pointerup', 11, railToViewport(leftRail, 8, 354), '.touch-side-rail--left')

  const modPoint = logicalToViewport(controlCanvas, 492, 228)
  await dispatchPointer(controlPage, 'pointerdown', 12, modPoint)
  await advance(controlPage, 200)
  const modState = await readState(controlPage)
  assert(modState.feedback.touch.modConfirmation?.progress === 0.5, 'Tank portrait Mod hold timing drifted')
  await controlPage.screenshot({ path: `${outRoot}/tablet-tidy-mod-target.png`, fullPage: true })
  await dispatchPointer(controlPage, 'pointerup', 12, modPoint)

  const blockingConsoleMessages = consoleMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const evidence = {
    outcome: 'TABLET_TOUCH_TIDY_SMOKE_PASSED',
    viewport: { width: 1280, height: 711 },
    tutorial: {
      physicalTapConfirmed: tutorialState.tutorial.stepId === 'tour',
      cameraControlled: tutorialState.tutorial.cameraControlled,
    },
    joystick: joystickState.feedback.touch.joystick,
    modProgress: modState.feedback.touch.modConfirmation?.progress,
    blockingConsoleMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(evidence, null, 2)}\n`)
  await writeFile(`${outRoot}/tutorial-state.json`, `${JSON.stringify(tutorialState, null, 2)}\n`)
  await writeFile(`${outRoot}/controls-state.json`, `${JSON.stringify(modState, null, 2)}\n`)
  assert(blockingConsoleMessages.length === 0, `Browser errors: ${JSON.stringify(blockingConsoleMessages)}`)
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

function attachConsoleCapture(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ label, type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => consoleMessages.push({ label, type: 'pageerror', text: error.message }))
}

async function tapLogical(page, box, x, y) {
  const point = logicalToViewport(box, x, y)
  await page.touchscreen.tap(point.x, point.y)
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function advance(page, ms) {
  await page.evaluate((value) => window.advanceTime(value), ms)
}

async function boundingBox(page, selector) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`Missing ${selector}`)
  return box
}

function logicalToViewport(box, x, y) {
  return { x: box.x + (x / 560) * box.width, y: box.y + (y / 464) * box.height }
}

function railToViewport(box, x, y) {
  return { x: box.x + (x / 112) * box.width, y: box.y + (y / 464) * box.height }
}

async function dispatchPointer(page, type, pointerId, point, selector = '.game-canvas') {
  await page.evaluate(({ eventType, id, x, y, targetSelector }) => {
    const target = document.querySelector(targetSelector)
    if (!target) throw new Error(`Missing ${targetSelector}`)
    target.setPointerCapture = () => {}
    target.releasePointerCapture = () => {}
    target.dispatchEvent(new PointerEvent(eventType, {
      bubbles: true,
      cancelable: true,
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      button: 0,
      buttons: eventType === 'pointerup' ? 0 : 1,
      isPrimary: id === 11,
    }))
  }, { eventType: type, id: pointerId, x: point.x, y: point.y, targetSelector: selector })
}

async function waitForHttp(url) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }
  throw new Error(`Timed out waiting for Vite at ${url}\n${serverOutput}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
