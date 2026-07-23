import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6600 + Math.floor(Math.random() * 200)
const baseUrl = `http://127.0.0.1:${port}/`
const outRootIndex = process.argv.indexOf('--out-root')
const outRoot = outRootIndex >= 0 ? process.argv[outRootIndex + 1] : 'output/p7-signal-scar/smoke'
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

const browserMessages = []
let browser

try {
  await mkdir(outRoot, { recursive: true })
  await waitForHttp(baseUrl)
  browser = await chromium.launch({ headless: true })

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const desktopPage = await desktopContext.newPage()
  attachConsoleCapture(desktopPage, 'desktop')
  await openSignalScar(desktopPage, 'scout', 'emp')

  const initialDesktop = await readState(desktopPage)
  assert(initialDesktop.level.name === 'Signal Scar', `Unexpected mission: ${initialDesktop.level.name}`)
  assert(initialDesktop.objective.label === 'Signal', `Objective label is not compact: ${initialDesktop.objective.label}`)
  assert(initialDesktop.signalWarfare.state === 'jammed', `Expected active jammer: ${initialDesktop.signalWarfare.state}`)
  assert(initialDesktop.signalWarfare.activeJammerCount === 1, 'Signal Scar did not start with one active jammer')
  assert(initialDesktop.majorMods.emp.active === false, 'Engineer consumed the EMP lane selected by the player')
  assert(initialDesktop.deployables.active.length === 4, 'Scout and Engineer support kits did not deploy')
  assert(initialDesktop.ai.hiddenCoordinateLeak === false, 'Fog-safe AI exposed hidden coordinates')
  assert(initialDesktop.hearing.channel === 'physical', 'Physical hearing is not a distinct state channel')
  assertSafeHearing(initialDesktop, 'desktop opening')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-opening.png`, fullPage: true })

  await desktopPage.keyboard.down('ArrowUp')
  let breachApproach = initialDesktop
  for (let index = 0; index < 20 && breachApproach.player.row > 6; index += 1) {
    await advance(desktopPage, 320)
    breachApproach = await readState(desktopPage)
  }
  await desktopPage.keyboard.up('ArrowUp')
  assert(breachApproach.player.row <= 6, `Player could not reach the jammer wall: row ${breachApproach.player.row}`)
  assert(
    breachApproach.readability.markers.some((marker) => marker.kind === 'signal-jammer' && marker.visible),
    'The jammer did not become readable when approached',
  )

  let desktopHeardShot = false
  for (let index = 0; index < 3; index += 1) {
    const beforeShot = await readState(desktopPage)
    if (beforeShot.signalWarfare.activeJammerCount === 0) break
    await desktopPage.keyboard.down('Space')
    await advance(desktopPage, 80)
    await desktopPage.keyboard.up('Space')
    const shotState = await readState(desktopPage)
    desktopHeardShot ||= shotState.hearing.cues.some((cue) => cue.kind === 'shot')
    assertSafeHearing(shotState, `desktop shot ${index + 1}`)
    await advance(desktopPage, 1700)
  }
  const breachedDesktop = await readState(desktopPage)
  assert(breachedDesktop.signalWarfare.state === 'clear', `Jammer breach failed: ${breachedDesktop.signalWarfare.state}`)
  assert(breachedDesktop.signalWarfare.activeJammerCount === 0, 'Destroyed jammer still affects relay ownership')
  assert(breachedDesktop.ai.hiddenCoordinateLeak === false, 'Fog-safe AI leaked coordinates after the breach')
  assert(desktopHeardShot, 'Desktop firing did not produce a local physical hearing cue')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-jammer-breached.png`, fullPage: true })

  const supportPage = await desktopContext.newPage()
  attachConsoleCapture(supportPage, 'support')
  await openSignalScar(supportPage, 'battle', 'hedgehog')
  await advance(supportPage, 800)
  const supportState = await readState(supportPage)
  assert(supportState.signalWarfare.state === 'emp-window', `Engineer EMP window missing: ${supportState.signalWarfare.state}`)
  assert(supportState.majorMods.emp.ownerTankId === 'signal-scar-engineer', 'Engineer does not own the support EMP')
  assert(supportState.deployables.active.length === 4, 'Class cooperation did not seed four support devices')
  assert(supportState.activeFriendlyCount === 3, `Expected three active allies, got ${supportState.activeFriendlyCount}`)

  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tabletPage = await tabletContext.newPage()
  attachConsoleCapture(tabletPage, 'tablet')
  await openSignalScar(tabletPage, 'battle', 'hedgehog')
  const tabletStart = await readState(tabletPage)
  assert(tabletStart.feedback.touchControlsVisible === true, 'Tablet touch controls are not visible')
  assert(
    await tabletPage.locator('.touch-side-rail--left').getAttribute('aria-hidden') !== 'true',
    'Tablet movement rail is hidden',
  )
  assert(
    await tabletPage.locator('.touch-side-rail--right').getAttribute('aria-hidden') !== 'true',
    'Tablet action rail is hidden',
  )

  const leftRail = await boundingBox(tabletPage, '.touch-side-rail--left')
  const joystickCenter = railToViewport(leftRail, 56, 354)
  const joystickUp = railToViewport(leftRail, 56, 324)
  await dispatchPointer(tabletPage, 'pointerdown', 21, joystickCenter, '.touch-side-rail--left')
  await dispatchPointer(tabletPage, 'pointermove', 21, joystickUp, '.touch-side-rail--left')
  await advance(tabletPage, 900)
  const tabletMoving = await readState(tabletPage)
  await dispatchPointer(tabletPage, 'pointerup', 21, joystickUp, '.touch-side-rail--left')
  assert(
    tabletMoving.player.moving || tabletMoving.player.row < tabletStart.player.row,
    `Tablet joystick did not move the tank: ${tabletStart.player.row} -> ${tabletMoving.player.row}`,
  )

  const rightRail = await boundingBox(tabletPage, '.touch-side-rail--right')
  const firePoint = railToViewport(rightRail, 30, 354)
  const shotsBefore = tabletMoving.runStats.shotsFired
  await dispatchPointer(tabletPage, 'pointerdown', 22, firePoint, '.touch-side-rail--right')
  await advance(tabletPage, 120)
  await dispatchPointer(tabletPage, 'pointerup', 22, firePoint, '.touch-side-rail--right')
  await advance(tabletPage, 100)
  const tabletFired = await readState(tabletPage)
  assert(tabletFired.runStats.shotsFired > shotsBefore, 'Tablet fire control did not fire a shell')
  assert(tabletFired.ai.hiddenCoordinateLeak === false, 'Tablet run exposed hidden AI coordinates')
  assert(tabletFired.hearing.cues.some((cue) => cue.kind === 'shot'), 'Tablet firing did not produce a physical hearing cue')
  assertSafeHearing(tabletFired, 'tablet firing')
  await tabletPage.screenshot({ path: `${outRoot}/tablet-signal-scar.png`, fullPage: true })

  const blockingBrowserMessages = browserMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const summary = {
    outcome: 'P7_SIGNAL_SCAR_SMOKE_PASSED',
    desktop: {
      initialSignalState: initialDesktop.signalWarfare.state,
      approachRow: breachApproach.player.row,
      finalSignalState: breachedDesktop.signalWarfare.state,
      activeJammers: breachedDesktop.signalWarfare.activeJammerCount,
      hiddenCoordinateLeak: breachedDesktop.ai.hiddenCoordinateLeak,
    },
    cooperation: {
      signalState: supportState.signalWarfare.state,
      empOwner: supportState.majorMods.emp.ownerTankId,
      activeAllies: supportState.activeFriendlyCount,
      deployedSupportDevices: supportState.deployables.active.map((device) => device.kind),
    },
    hearing: {
      channel: initialDesktop.hearing.channel,
      desktopHeardShot,
      tabletCueKinds: tabletFired.hearing.cues.map((cue) => cue.kind),
      signalChannelSeparate: initialDesktop.signalWarfare.state === 'jammed',
      hiddenExactSourceLeak: false,
    },
    tablet: {
      viewport: { width: 1280, height: 711 },
      startRow: tabletStart.player.row,
      movedRow: tabletMoving.player.row,
      shotsBefore,
      shotsAfter: tabletFired.runStats.shotsFired,
      controlsVisible: tabletFired.feedback.touchControlsVisible,
    },
    blockingBrowserMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-state.json`, `${JSON.stringify(breachedDesktop, null, 2)}\n`)
  await writeFile(`${outRoot}/tablet-state.json`, `${JSON.stringify(tabletFired, null, 2)}\n`)
  assert(blockingBrowserMessages.length === 0, `Browser errors: ${JSON.stringify(blockingBrowserMessages)}`)
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function openSignalScar(page, tankClass, majorMod) {
  await page.goto(
    `${baseUrl}?devLevel=signal_scar&autostart=1&tankClass=${tankClass}&majorMod=${majorMod}&skipSplash=1`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForFunction(() => typeof window.advanceTime === 'function' && typeof window.render_game_to_text === 'function')
  await advance(page, 50)
}

function attachConsoleCapture(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserMessages.push({ label, type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => browserMessages.push({ label, type: 'pageerror', text: error.message }))
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

function railToViewport(box, x, y) {
  return { x: box.x + (x / 112) * box.width, y: box.y + (y / 464) * box.height }
}

async function dispatchPointer(page, type, pointerId, point, selector) {
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
      isPrimary: id === 21,
    }))
  }, { eventType: type, id: pointerId, x: point.x, y: point.y, targetSelector: selector })
}

async function waitForHttp(url) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
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

function assertSafeHearing(state, label) {
  for (const cue of state.hearing.cues) {
    assert(cue.channel === 'physical', `${label}: non-physical event entered hearing`)
    if (cue.sourcePrecision === 'directional') {
      assert(!Object.hasOwn(cue, 'source'), `${label}: directional cue leaked an exact source`)
    }
  }
}
