import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6100 + Math.floor(Math.random() * 300)
const baseUrl = `http://127.0.0.1:${port}/`
const outRootIndex = process.argv.indexOf('--out-root')
const outRoot = outRootIndex >= 0 ? process.argv[outRootIndex + 1] : 'output/tablet-touch-controls-smoke'
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

  const standard = await createTouchPage(browser, { width: 1280, height: 800 }, 'hedgehog')
  const standardMoveRailBox = await railBox(standard.page, 'left')
  const standardFireRailBox = await railBox(standard.page, 'right')
  await standard.page.screenshot({ path: `${outRoot}/tablet-standard-idle.png` })

  await dispatchPointer(standard.page, 'pointerdown', 1, railToViewport(standardMoveRailBox, 56, 354), '.touch-side-rail--left')
  await dispatchPointer(standard.page, 'pointermove', 1, railToViewport(standardMoveRailBox, 86, 354), '.touch-side-rail--left')
  await dispatchPointer(standard.page, 'pointerdown', 2, railToViewport(standardFireRailBox, 34, 354), '.touch-side-rail--right')
  await advance(standard.page, 120)
  const multiTouch = await readState(standard.page)
  await standard.page.screenshot({ path: `${outRoot}/tablet-standard-multitouch.png` })
  await dispatchPointer(standard.page, 'pointerup', 2, railToViewport(standardFireRailBox, 34, 354), '.touch-side-rail--right')
  await dispatchPointer(standard.page, 'pointerup', 1, railToViewport(standardMoveRailBox, 86, 354), '.touch-side-rail--left')
  await advance(standard.page, 600)

  const relayPoint = railToViewport(standardMoveRailBox, 56, 244)
  const modStart = railToViewport(standardFireRailBox, 84, 376)
  const modHalfPoint = railToViewport(standardFireRailBox, 84, 349)
  const modEnd = railToViewport(standardFireRailBox, 84, 322)
  await dispatchPointer(standard.page, 'pointerdown', 3, relayPoint, '.touch-side-rail--left')
  await advance(standard.page, 600)
  const relayHalf = await readState(standard.page)
  await standard.page.screenshot({ path: `${outRoot}/tablet-relay-progress.png` })
  await dispatchPointer(standard.page, 'pointermove', 3, railToViewport(standardMoveRailBox, 56, 354), '.touch-side-rail--left')
  await advance(standard.page, 80)
  const relayCancelled = await readState(standard.page)
  await dispatchPointer(standard.page, 'pointerup', 3, railToViewport(standardMoveRailBox, 56, 354), '.touch-side-rail--left')

  await dispatchPointer(standard.page, 'pointerdown', 4, relayPoint, '.touch-side-rail--left')
  await advance(standard.page, 1250)
  await dispatchPointer(standard.page, 'pointerup', 4, relayPoint, '.touch-side-rail--left')
  const relayPlaced = await readState(standard.page)
  await dispatchPointer(standard.page, 'pointerdown', 5, relayPoint, '.touch-side-rail--left')
  await advance(standard.page, 950)
  await dispatchPointer(standard.page, 'pointerup', 5, relayPoint, '.touch-side-rail--left')
  const relayRecovered = await readState(standard.page)

  await dispatchPointer(standard.page, 'pointerdown', 6, modStart, '.touch-side-rail--right')
  await dispatchPointer(standard.page, 'pointermove', 6, modHalfPoint, '.touch-side-rail--right')
  await advance(standard.page, 30)
  const modHalf = await readState(standard.page)
  await standard.page.screenshot({ path: `${outRoot}/tablet-mod-confirmation.png` })
  await dispatchPointer(standard.page, 'pointerup', 6, modHalfPoint, '.touch-side-rail--right')
  await advance(standard.page, 220)
  const modCancelled = await readState(standard.page)
  await dispatchPointer(standard.page, 'pointerdown', 7, modStart, '.touch-side-rail--right')
  await dispatchPointer(standard.page, 'pointermove', 7, modEnd, '.touch-side-rail--right')
  await advance(standard.page, 30)
  await dispatchPointer(standard.page, 'pointerup', 7, modEnd, '.touch-side-rail--right')
  const hedgehogPlaced = await readState(standard.page)

  const mirrored = await createTouchPage(browser, { width: 1280, height: 800 }, 'emp', 'mirrored')
  const mirroredState = await readState(mirrored.page)
  await mirrored.page.screenshot({ path: `${outRoot}/tablet-mirrored-idle.png` })
  const mirroredFireRailBox = await railBox(mirrored.page, 'left')
  const mirroredModStart = railToViewport(mirroredFireRailBox, 84, 376)
  const mirroredModEnd = railToViewport(mirroredFireRailBox, 84, 322)
  await dispatchPointer(mirrored.page, 'pointerdown', 8, mirroredModStart, '.touch-side-rail--left')
  await dispatchPointer(mirrored.page, 'pointermove', 8, mirroredModEnd, '.touch-side-rail--left')
  await advance(mirrored.page, 30)
  await dispatchPointer(mirrored.page, 'pointerup', 8, mirroredModEnd, '.touch-side-rail--left')
  const empPlaced = await readState(mirrored.page)

  const overdrive = await createTouchPage(browser, { width: 1280, height: 800 }, 'overdrive')
  const overdriveFireRail = await railBox(overdrive.page, 'right')
  const overdriveModStart = railToViewport(overdriveFireRail, 84, 376)
  const overdriveModEnd = railToViewport(overdriveFireRail, 84, 322)
  await dispatchPointer(overdrive.page, 'pointerdown', 9, overdriveModStart, '.touch-side-rail--right')
  await dispatchPointer(overdrive.page, 'pointermove', 9, overdriveModEnd, '.touch-side-rail--right')
  await advance(overdrive.page, 30)
  await dispatchPointer(overdrive.page, 'pointerup', 9, overdriveModEnd, '.touch-side-rail--right')
  const overdriveActive = await readState(overdrive.page)
  await advance(overdrive.page, 4200)
  await overdrive.page.waitForTimeout(220)
  await advance(overdrive.page, 30)
  const overdriveCooldown = await readState(overdrive.page)
  await overdrive.page.screenshot({ path: `${outRoot}/tablet-overdrive-cooldown.png` })

  const pontoon = await createTouchPage(browser, { width: 1280, height: 800 }, 'pontoon')
  const pontoonFireRail = await railBox(pontoon.page, 'right')
  const pontoonModStart = railToViewport(pontoonFireRail, 84, 376)
  const pontoonModEnd = railToViewport(pontoonFireRail, 84, 322)
  await dispatchPointer(pontoon.page, 'pointerdown', 10, pontoonModStart, '.touch-side-rail--right')
  await dispatchPointer(pontoon.page, 'pointermove', 10, pontoonModEnd, '.touch-side-rail--right')
  await advance(pontoon.page, 30)
  const pontoonInvalid = await readState(pontoon.page)
  await pontoon.page.screenshot({ path: `${outRoot}/tablet-pontoon-invalid.png` })
  await dispatchPointer(pontoon.page, 'pointerup', 10, pontoonModEnd, '.touch-side-rail--right')

  const tabletPortrait = await createTouchPage(browser, { width: 1280, height: 800 }, 'overdrive')
  const beforePortrait = await readState(tabletPortrait.page)
  await tabletPortrait.page.setViewportSize({ width: 800, height: 1280 })
  await tabletPortrait.page.waitForTimeout(80)
  const portraitGate = await readState(tabletPortrait.page)
  await advance(tabletPortrait.page, 1000)
  const portraitFrozen = await readState(tabletPortrait.page)
  await tabletPortrait.page.screenshot({ path: `${outRoot}/tablet-portrait-gate.png` })

  const quickMatchContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })
  const quickMatchPage = await quickMatchContext.newPage()
  attachConsoleCapture(quickMatchPage, 'quick-match')
  const quickMatchRequests = []
  quickMatchPage.on('request', (request) => {
    if (request.url().includes('/rooms/quick/join')) quickMatchRequests.push(request.url())
  })
  await quickMatchPage.goto(`${baseUrl}?skipSplash=1`)
  await quickMatchPage.waitForLoadState('domcontentloaded')
  for (let index = 0; index < 3; index += 1) await press(quickMatchPage, 'ArrowDown', 80)
  await press(quickMatchPage, 'Enter', 180)
  await quickMatchPage.setViewportSize({ width: 800, height: 1280 })
  await quickMatchPage.waitForTimeout(80)
  await press(quickMatchPage, 'Enter', 180)
  const portraitQuickMatch = await readState(quickMatchPage)

  const phone = await createTouchPage(browser, { width: 390, height: 844 }, 'overdrive')
  const phoneState = await readState(phone.page)
  await phone.page.screenshot({ path: `${outRoot}/phone-portrait-playable.png` })

  const evidence = {
    standard: {
      handedness: multiTouch.feedback.touch.handedness,
      joystickDirection: multiTouch.feedback.touch.joystick.direction,
      joystickOffset: {
        x: multiTouch.feedback.touch.joystick.offsetX,
        y: multiTouch.feedback.touch.joystick.offsetY,
      },
      fireHeld: multiTouch.feedback.heldButtons.fire,
    },
    relay: {
      halfProgress: relayHalf.feedback.touch.relayProgress,
      cancelled: relayCancelled.portableRelay.hold === null,
      placed: relayPlaced.portableRelay.deployed,
      recovered: !relayRecovered.portableRelay.deployed,
    },
    mods: {
      halfProgress: modHalf.feedback.touch.modSlider.progress,
      cancelled: modCancelled.feedback.touch.modSlider.active === false && !modCancelled.majorMods.hedgehog.active,
      hedgehogPlaced: hedgehogPlaced.majorMods.hedgehog.active,
      empPlaced: empPlaced.majorMods.emp.active,
      overdriveImmediate: overdriveActive.majorMods.overdrive.active,
      overdriveCooldownRemaining: overdriveCooldown.majorMods.overdrive.cooldown,
      overdriveCooldownText: overdriveCooldown.readableText.hud.mod,
      pontoonInvalid: pontoonInvalid.feedback.notices.some((notice) => notice.text === 'NO BRIDGE LINE'),
      pontoonSliderActivated: pontoonInvalid.feedback.touch.modSlider.activated,
    },
    mirrored: {
      handedness: mirroredState.feedback.touch.handedness,
      joystickAnchorX: mirroredState.feedback.touch.joystick.anchorX,
    },
    orientation: {
      tabletGate: portraitGate.feedback.touch.orientationGate,
      offlineFrozen: portraitFrozen.runStats.duration === portraitGate.runStats.duration,
      quickMatchMode: portraitQuickMatch.mode,
      quickMatchRequests: quickMatchRequests.length,
      phoneGateActive: phoneState.feedback.touch.orientationGate.active,
      phoneMode: phoneState.mode,
      beforePortraitDuration: beforePortrait.runStats.duration,
    },
  }

  const blockingConsoleMessages = consoleMessages.filter((message) => !isBrowserAutoplayWarning(message))
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify({ evidence, consoleMessages, blockingConsoleMessages }, null, 2)}\n`)

  assert(evidence.standard.handedness === 'standard', 'Standard handedness missing')
  assert(evidence.standard.joystickDirection === 'right', 'Joystick did not resolve right')
  assert(Math.hypot(evidence.standard.joystickOffset.x, evidence.standard.joystickOffset.y) <= 24.01, 'Joystick knob escaped clamp')
  assert(evidence.standard.fireHeld === true, 'Fire did not remain available during movement')
  assert(evidence.relay.halfProgress >= 0.45 && evidence.relay.halfProgress <= 0.55, 'Relay progress ring timing drifted')
  assert(evidence.relay.cancelled && evidence.relay.placed && evidence.relay.recovered, 'Relay place/recover flow failed')
  assert(evidence.mods.halfProgress >= 0.45 && evidence.mods.halfProgress <= 0.55, 'Mod confirmation timing drifted')
  assert(evidence.mods.cancelled && evidence.mods.hedgehogPlaced && evidence.mods.empPlaced, 'Placement Mod flow failed')
  assert(evidence.mods.overdriveImmediate, 'Overdrive should activate on tap')
  assert(
    evidence.mods.overdriveCooldownRemaining > 0
      && evidence.mods.overdriveCooldownText.includes('cooling'),
    'Overdrive cooldown was not exposed on the shared slider state',
  )
  assert(evidence.mods.pontoonInvalid, 'Pontoon invalid placement feedback missing')
  assert(evidence.mods.pontoonSliderActivated === false, 'Invalid Pontoon gesture was shown as successfully activated')
  assert(evidence.mirrored.handedness === 'mirrored' && evidence.mirrored.joystickAnchorX === 56, 'Mirrored side rail did not initialize')
  assert(evidence.orientation.tabletGate.active === true, 'Portrait tablet gate missing')
  assert(evidence.orientation.offlineFrozen, 'Portrait tablet did not freeze offline simulation')
  assert(evidence.orientation.quickMatchMode === 'online-menu' && evidence.orientation.quickMatchRequests === 0, 'Portrait Quick Match connected')
  assert(evidence.orientation.phoneGateActive === false && evidence.orientation.phoneMode === 'playing', 'Portrait phone should remain playable')
  assert(blockingConsoleMessages.length === 0, `Console warnings/errors observed: ${JSON.stringify(blockingConsoleMessages)}`)

  console.log(JSON.stringify({ outcome: 'TABLET_TOUCH_CONTROLS_SMOKE_PASSED', outRoot, evidence }, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function createTouchPage(browserInstance, viewport, majorMod, handedness = 'standard') {
  const context = await browserInstance.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  const page = await context.newPage()
  attachConsoleCapture(page, `${majorMod}-${handedness}-${viewport.width}x${viewport.height}`)
  const params = new URLSearchParams({
    skipSplash: '1',
    devLevel: 'all_mods_test',
    majorMod,
  })
  if (handedness === 'mirrored') params.set('touchLayout', 'mirrored')
  await page.goto(`${baseUrl}?${params}`)
  await page.waitForLoadState('domcontentloaded')
  const state = await readState(page)
  assert(state.mode === 'playing', `Expected dev gameplay for ${majorMod}, got ${state.mode}`)
  return { context, page }
}

function attachConsoleCapture(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ label, type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => consoleMessages.push({ label, type: 'pageerror', text: error.message }))
}

function isBrowserAutoplayWarning(message) {
  return message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function advance(page, ms) {
  return JSON.parse(await page.evaluate((value) => window.advanceTime(value), ms))
}

async function press(page, key, ms) {
  await page.keyboard.press(key)
  await advance(page, ms)
}

async function railBox(page, side) {
  const box = await page.locator(`.touch-side-rail--${side}`).boundingBox()
  if (!box) throw new Error(`Missing ${side} touch rail box`)
  return box
}

function railToViewport(box, x, y) {
  return {
    x: box.x + (x / 112) * box.width,
    y: box.y + (y / 464) * box.height,
  }
}

async function dispatchPointer(page, type, pointerId, point, selector = '.game-canvas') {
  await page.evaluate(({ eventType, id, x, y, targetSelector }) => {
    const canvas = document.querySelector(targetSelector)
    if (!canvas) throw new Error('Missing canvas')
    canvas.setPointerCapture = () => {}
    canvas.releasePointerCapture = () => {}
    canvas.dispatchEvent(new PointerEvent(eventType, {
      bubbles: true,
      cancelable: true,
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      button: 0,
      buttons: eventType === 'pointerup' ? 0 : 1,
      isPrimary: id === 1,
    }))
  }, { eventType: type, id: pointerId, x: point.x, y: point.y, targetSelector: selector })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
