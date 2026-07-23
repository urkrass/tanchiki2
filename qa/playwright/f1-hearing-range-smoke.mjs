import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6800 + Math.floor(Math.random() * 200)
const baseUrl = `http://127.0.0.1:${port}/`
const outRoot = 'output/f1-hearing-range/smoke'
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
  await openRange(desktopPage)

  const opening = await readState(desktopPage)
  assert(opening.level.name === 'Acoustic Range', `Unexpected level: ${opening.level.name}`)
  assert(opening.mode === 'playing', `Range did not autostart: ${opening.mode}`)
  assert(opening.hearingTest?.active === true, 'Structured hearing test state is missing')
  assert(opening.hearingTest.phaseCount === 7, `Expected seven stations, got ${opening.hearingTest.phaseCount}`)
  assert(opening.player.col === opening.hearingTest.listener.x, 'Listener did not start at the station landmark')
  assert(opening.player.row === opening.hearingTest.listener.y, 'Listener row did not match the station')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-opening.png`, fullPage: true })

  const nearEast = await hearAutomaticPulse(desktopPage, 0)
  assertCue(nearEast, { kind: 'shot', direction: 'east', audible: true, occluded: false })
  const nearEastGain = nearEast.hearing.cues.at(-1).gain

  const nearWest = await hearAutomaticPulse(desktopPage, 1)
  assertCue(nearWest, { kind: 'shot', direction: 'west', audible: true, occluded: false })
  assert(nearWest.hearing.cues.at(-1).pan < 0, 'West station did not pan left')

  const farShot = await hearAutomaticPulse(desktopPage, 2)
  assertCue(farShot, { kind: 'shot', audible: false })

  const farExplosion = await hearAutomaticPulse(desktopPage, 3)
  assertCue(farExplosion, { kind: 'explosion', direction: 'east', audible: true, occluded: false })

  const wallShot = await hearAutomaticPulse(desktopPage, 4)
  assertCue(wallShot, { kind: 'shot', direction: 'east', audible: true, occluded: true })
  assert(wallShot.hearing.cues.at(-1).gain < nearEastGain, 'Wall did not reduce the shot gain')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-wall-station.png`, fullPage: true })

  const nearRustle = await hearAutomaticPulse(desktopPage, 5)
  assertCue(nearRustle, { kind: 'rustle', direction: 'east', audible: true, occluded: false })

  const farRustle = await hearAutomaticPulse(desktopPage, 6)
  assertCue(farRustle, { kind: 'rustle', audible: false })
  const manualCount = farRustle.hearingTest.pulseCount
  await desktopPage.keyboard.down('Space')
  await advance(desktopPage, 30)
  await desktopPage.keyboard.up('Space')
  const manualSilent = await readState(desktopPage)
  assert(manualSilent.hearingTest.pulseCount === manualCount + 1, 'Space did not replay the current station')
  assert(manualSilent.bullets.length === 0, 'Range replay fired a gameplay shell')
  assert(manualSilent.hearing.cues.length === 0, 'Silent station became audible on manual replay')

  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tabletPage = await tabletContext.newPage()
  attachConsoleCapture(tabletPage, 'tablet')
  await openRange(tabletPage, true)
  const tabletOpening = await readState(tabletPage)
  assert(tabletOpening.feedback.touchControlsVisible === true, 'Tablet action rails are not visible')
  const rightRail = await boundingBox(tabletPage, '.touch-side-rail--right')
  const firePoint = railToViewport(rightRail, 30, 354)
  await dispatchPointer(tabletPage, 'pointerdown', 31, firePoint, '.touch-side-rail--right')
  await advance(tabletPage, 40)
  await dispatchPointer(tabletPage, 'pointerup', 31, firePoint, '.touch-side-rail--right')
  const tabletReplay = await readState(tabletPage)
  assert(tabletReplay.hearingTest.pulseCount === 1, 'Tablet Fire did not replay the station')
  assert(tabletReplay.bullets.length === 0, 'Tablet replay fired a gameplay shell')
  assertCue(tabletReplay, { kind: 'shot', direction: 'east', audible: true, occluded: false })

  const tabletWall = await hearAutomaticPulse(tabletPage, 4)
  assertCue(tabletWall, { kind: 'shot', direction: 'east', audible: true, occluded: true })
  await tabletPage.screenshot({ path: `${outRoot}/tablet-wall-station.png`, fullPage: true })

  const blockingBrowserMessages = browserMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const summary = {
    outcome: 'F1_HEARING_RANGE_SMOKE_PASSED',
    stations: [
      summarizeStation(nearEast),
      summarizeStation(nearWest),
      summarizeStation(farShot),
      summarizeStation(farExplosion),
      summarizeStation(wallShot),
      summarizeStation(nearRustle),
      summarizeStation(farRustle),
    ],
    manualReplay: {
      desktopSilentPulseCount: manualSilent.hearingTest.pulseCount,
      tabletPulseCount: tabletReplay.hearingTest.pulseCount,
      shellsCreated: manualSilent.bullets.length + tabletReplay.bullets.length,
    },
    tablet: {
      viewport: { width: 1280, height: 711 },
      controlsVisible: tabletReplay.feedback.touchControlsVisible,
      wallOccluded: tabletWall.hearing.cues.at(-1)?.occluded === true,
    },
    blockingBrowserMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-wall-state.json`, `${JSON.stringify(wallShot, null, 2)}\n`)
  await writeFile(`${outRoot}/tablet-wall-state.json`, `${JSON.stringify(tabletWall, null, 2)}\n`)
  assert(blockingBrowserMessages.length === 0, `Browser errors: ${JSON.stringify(blockingBrowserMessages)}`)
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function openRange(page, touch = false) {
  const touchParam = touch ? '&touch=1' : ''
  await page.goto(
    `${baseUrl}?devLevel=acoustic_range&autostart=1&skipSplash=1${touchParam}`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForFunction(() => typeof window.advanceTime === 'function' && typeof window.render_game_to_text === 'function')
  await advance(page, 50)
}

async function hearAutomaticPulse(page, phaseIndex) {
  let state = await enterPhase(page, phaseIndex)
  const waitMs = Math.max(30, Math.ceil((1.3 - state.hearingTest.elapsed) * 1000))
  await advance(page, waitMs)
  state = await readState(page)
  assert(state.hearingTest.phaseIndex === phaseIndex, `Station ${phaseIndex + 1} advanced before its first pulse`)
  assert(state.hearingTest.pulseCount >= 1, `Station ${phaseIndex + 1} did not pulse`)
  return state
}

async function enterPhase(page, phaseIndex) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await readState(page)
    if (state.hearingTest?.phaseIndex === phaseIndex) {
      return state
    }
    await advance(page, 200)
  }
  throw new Error(`Range did not reach station ${phaseIndex + 1}`)
}

function assertCue(state, expected) {
  const cue = state.hearing.cues.at(-1)
  if (!expected.audible) {
    assert(!cue, `${state.hearingTest.label} should be silent, got ${JSON.stringify(cue)}`)
    return
  }
  assert(cue, `${state.hearingTest.label} should be audible`)
  assert(cue.kind === expected.kind, `${state.hearingTest.label} kind ${cue.kind} !== ${expected.kind}`)
  assert(cue.direction === expected.direction, `${state.hearingTest.label} direction ${cue.direction} !== ${expected.direction}`)
  assert(cue.occluded === expected.occluded, `${state.hearingTest.label} occlusion mismatch`)
}

function summarizeStation(state) {
  const cue = state.hearing.cues.at(-1)
  return {
    phase: state.hearingTest.phaseIndex + 1,
    label: state.hearingTest.label,
    expectation: state.hearingTest.expectation,
    audible: Boolean(cue),
    kind: cue?.kind ?? state.hearingTest.kind,
    direction: cue?.direction ?? null,
    gain: cue?.gain ?? 0,
    pan: cue?.pan ?? 0,
    occluded: cue?.occluded ?? false,
  }
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
      isPrimary: true,
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
