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
  await openLab(desktopPage)

  const opening = await readState(desktopPage)
  assert(opening.level.name === 'Acoustic Lab', `Unexpected level: ${opening.level.name}`)
  assert(opening.mode === 'playing', `Lab did not autostart: ${opening.mode}`)
  assert(opening.hearingTest?.active === true, 'Structured hearing lab state is missing')
  assert(opening.hearingTest.stationCount === 5, `Expected five stations, got ${opening.hearingTest.stationCount}`)
  assert(opening.hearingTest.stationId === 'visible-reference', `Unexpected opening station: ${opening.hearingTest.stationId}`)
  assert(opening.fog.hiddenCellCount > 0, 'The visual hearing lab must use real fog of war')
  assert(opening.player.col === opening.hearingTest.listener.x, 'Listener did not start at the fixed booth')
  assert(opening.player.row === opening.hearingTest.listener.y, 'Listener row did not match the fixed booth')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-opening.png`, fullPage: true })

  const visible = await playCurrentStation(desktopPage)
  assertVisual(visible, {
    id: 'visible-reference',
    present: true,
    precision: 'exact',
    strength: 1.5,
  })
  await desktopPage.screenshot({ path: `${outRoot}/desktop-visible-reference.png`, fullPage: true })

  const near = await selectAndPlay(desktopPage, 1)
  assertVisual(near, {
    id: 'lab-near',
    present: true,
    precision: 'directional',
    strength: 0.75,
  })
  await desktopPage.screenshot({ path: `${outRoot}/desktop-hidden-near.png`, fullPage: true })

  const mid = await selectAndPlay(desktopPage, 2)
  assertVisual(mid, {
    id: 'lab-mid',
    present: true,
    precision: 'directional',
    strength: 0.38,
  })

  const edge = await selectAndPlay(desktopPage, 3)
  assertVisual(edge, {
    id: 'lab-edge',
    present: true,
    precision: 'directional',
    strength: 0.18,
  })
  await desktopPage.screenshot({ path: `${outRoot}/desktop-hidden-edge.png`, fullPage: true })

  assert(
    near.terrainEvidence[0].strength > mid.terrainEvidence[0].strength
      && mid.terrainEvidence[0].strength > edge.terrainEvidence[0].strength,
    'Hidden visual evidence did not fade monotonically with distance',
  )

  const outOfRange = await selectAndPlay(desktopPage, 4)
  assertVisual(outOfRange, {
    id: 'lab-out',
    present: false,
  })
  assert(outOfRange.terrainEvidence.length === 0, 'Out-of-range rustle cluttered the map')
  assert(outOfRange.hearing.cues.length === 0, 'Out-of-range rustle remained audible')
  assert(outOfRange.bullets.length === 0, 'Playing a lab cue fired a gameplay shell')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-out-of-range.png`, fullPage: true })

  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tabletPage = await tabletContext.newPage()
  attachConsoleCapture(tabletPage, 'tablet')
  await openLab(tabletPage, true)
  const tabletOpening = await readState(tabletPage)
  assert(tabletOpening.feedback.touchControlsVisible === true, 'Tablet action rails are not visible')

  await selectTabletStationRight(tabletPage)
  await selectTabletStationRight(tabletPage)
  const tabletSelected = await readState(tabletPage)
  assert(tabletSelected.hearingTest.stationId === 'lab-mid', 'Tablet selector did not reach the hidden mid station')
  assert(tabletSelected.player.col === opening.player.col && tabletSelected.player.row === opening.player.row, 'Tablet station selection moved the listener')

  await playTabletCue(tabletPage)
  const tabletMid = await readState(tabletPage)
  assertVisual(tabletMid, {
    id: 'lab-mid',
    present: true,
    precision: 'directional',
    strength: 0.38,
  })
  assert(tabletMid.bullets.length === 0, 'Tablet Play Cue fired a gameplay shell')
  await tabletPage.screenshot({ path: `${outRoot}/tablet-hidden-mid.png`, fullPage: true })

  const blockingBrowserMessages = browserMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const summary = {
    outcome: 'F1_VISUAL_HEARING_LAB_SMOKE_PASSED',
    fixedListener: {
      col: opening.player.col,
      row: opening.player.row,
    },
    stations: [visible, near, mid, edge, outOfRange].map(summarizeStation),
    distanceAttenuation: {
      visible: visible.hearingTest.observedVisual.strength,
      near: near.hearingTest.observedVisual.strength,
      mid: mid.hearingTest.observedVisual.strength,
      edge: edge.hearingTest.observedVisual.strength,
      outOfRange: outOfRange.hearingTest.observedVisual.strength,
    },
    tablet: {
      viewport: { width: 1280, height: 711 },
      controlsVisible: tabletMid.feedback.touchControlsVisible,
      selectedStation: tabletMid.hearingTest.stationId,
      observedVisual: tabletMid.hearingTest.observedVisual,
    },
    blockingBrowserMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-hidden-near-state.json`, `${JSON.stringify(near, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-out-of-range-state.json`, `${JSON.stringify(outOfRange, null, 2)}\n`)
  await writeFile(`${outRoot}/tablet-hidden-mid-state.json`, `${JSON.stringify(tabletMid, null, 2)}\n`)
  assert(blockingBrowserMessages.length === 0, `Browser errors: ${JSON.stringify(blockingBrowserMessages)}`)
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function openLab(page, touch = false) {
  const touchParam = touch ? '&touch=1' : ''
  await page.goto(
    `${baseUrl}?devLevel=acoustic_range&autostart=1&skipSplash=1${touchParam}`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForFunction(() => typeof window.advanceTime === 'function' && typeof window.render_game_to_text === 'function')
  await advance(page, 50)
}

async function selectAndPlay(page, stationIndex) {
  const before = await readState(page)
  while (before.hearingTest.stationIndex !== stationIndex) {
    await tapKey(page, 'ArrowRight')
    const selected = await readState(page)
    if (selected.hearingTest.stationIndex === stationIndex) break
    before.hearingTest.stationIndex = selected.hearingTest.stationIndex
  }
  return playCurrentStation(page)
}

async function playCurrentStation(page) {
  await tapKey(page, 'Space')
  await advance(page, 40)
  return readState(page)
}

async function tapKey(page, key) {
  await page.keyboard.down(key)
  await advance(page, 16)
  await page.keyboard.up(key)
}

async function selectTabletStationRight(page) {
  const rail = await boundingBox(page, '.touch-side-rail--left')
  const point = railToViewport(rail, 96, 354)
  await dispatchPointer(page, 'pointerdown', 41, point, '.touch-side-rail--left')
  await advance(page, 24)
  await dispatchPointer(page, 'pointerup', 41, point, '.touch-side-rail--left')
}

async function playTabletCue(page) {
  const rail = await boundingBox(page, '.touch-side-rail--right')
  const point = railToViewport(rail, 30, 354)
  await dispatchPointer(page, 'pointerdown', 51, point, '.touch-side-rail--right')
  await advance(page, 40)
  await dispatchPointer(page, 'pointerup', 51, point, '.touch-side-rail--right')
}

function assertVisual(state, expected) {
  assert(state.hearingTest.stationId === expected.id, `Expected ${expected.id}, got ${state.hearingTest.stationId}`)
  assert(state.hearingTest.observedVisual?.present === expected.present, `${expected.id} visual presence mismatch`)
  if (!expected.present) {
    assert(state.hearingTest.observedVisual?.strength === null, `${expected.id} should not report visual strength`)
    return
  }
  const evidence = state.terrainEvidence[0]
  assert(evidence, `${expected.id} did not project terrain evidence`)
  assert(evidence.kind === 'rustle', `${expected.id} projected ${evidence.kind}, not rustle`)
  assert(evidence.sourcePrecision === expected.precision, `${expected.id} precision mismatch`)
  assert(evidence.strength === expected.strength, `${expected.id} strength ${evidence.strength} !== ${expected.strength}`)
}

function summarizeStation(state) {
  return {
    station: state.hearingTest.stationIndex + 1,
    id: state.hearingTest.stationId,
    label: state.hearingTest.label,
    distanceCells: state.hearingTest.distanceCells,
    expectedVisual: state.hearingTest.expectedVisual,
    observedVisual: state.hearingTest.observedVisual,
    cue: state.hearing.cues.at(-1) ?? null,
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
