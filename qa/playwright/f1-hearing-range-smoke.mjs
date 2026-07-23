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
  await openCourse(desktopPage)

  const opening = await readState(desktopPage)
  assert(opening.level.name === 'Acoustic Field Course', `Unexpected level: ${opening.level.name}`)
  assert(opening.mode === 'playing', `Course did not autostart: ${opening.mode}`)
  assert(opening.hearingTest?.active === true, 'Structured field-course diagnostics are missing')
  assert(opening.hearingTest.checkpointCount === 12, `Expected twelve checkpoints, got ${opening.hearingTest.checkpointCount}`)
  assert(opening.hearingTest.patrols.length === 7, `Expected seven patrols, got ${opening.hearingTest.patrols.length}`)
  assert(opening.hearingTest.liveFireStations.length === 3, `Expected three live-fire stations, got ${opening.hearingTest.liveFireStations.length}`)
  assert(opening.fog.hiddenCellCount > 0, 'The field course must use real fog of war')
  assert(opening.player.col === 2 && opening.player.row === 8, 'Player did not start at the west end of the course')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-opening.png`, fullPage: true })

  await advance(desktopPage, 200)
  const stillPaused = await readState(desktopPage)
  assert(stillPaused.hearingTest.patrols.every((patrol) => patrol.cellsTraversed === 0), 'A paused patrol moved before its route delay')
  assert(stillPaused.hearing.cues.length === 0, 'The course synthesized a cue before any patrol moved')

  await advance(desktopPage, 1400)
  const patrolsMoving = await readState(desktopPage)
  assert(patrolsMoving.hearingTest.patrols.some((patrol) => patrol.cellsTraversed > 0), 'No real patrol crossed a grid cell')

  await desktopPage.keyboard.press('Space')
  await advance(desktopPage, 100)
  assert((await readState(desktopPage)).bullets.length === 0, 'Disabled course weapon fired a shell')

  const observations = []
  for (const target of [
    { id: 'visible-reference', col: 8, seconds: 4 },
    { id: 'hidden-near', col: 20, seconds: 5 },
    { id: 'hidden-mid', col: 32, seconds: 5 },
    { id: 'hidden-edge', col: 44, seconds: 5 },
    { id: 'out-of-range', col: 56, seconds: 5 },
  ]) {
    await driveKeyboardEastTo(desktopPage, target.col)
    const result = await observeCheckpoint(desktopPage, target.seconds)
    assert(result.state.hearingTest.checkpointId === target.id, `Expected ${target.id}, got ${result.state.hearingTest.checkpointId}`)
    observations.push({ id: target.id, ...result })
    if (target.id === 'visible-reference') {
      await desktopPage.screenshot({ path: `${outRoot}/desktop-visible-reference.png`, fullPage: true })
    }
    if (target.id === 'hidden-edge') {
      await desktopPage.screenshot({ path: `${outRoot}/desktop-hidden-edge.png`, fullPage: true })
    }
    if (target.id === 'out-of-range') {
      await desktopPage.screenshot({ path: `${outRoot}/desktop-out-of-range.png`, fullPage: true })
    }
  }

  const [visible, near, mid, edge, outOfRange] = observations
  assert(visible.cueSeen && visible.visualSeen, 'Visible reference did not produce a real cue and marker')
  assert(visible.precisions.includes('exact'), 'Visible reference was not source-exact')
  assert(near.cueSeen && mid.cueSeen && edge.cueSeen, 'One of the hidden in-range patrols was not heard')
  assert(
    near.maxCueGain > mid.maxCueGain && mid.maxCueGain > edge.maxCueGain,
    `Cue gain did not fall with distance: ${near.maxCueGain}, ${mid.maxCueGain}, ${edge.maxCueGain}`,
  )
  assert(
    near.maxVisualStrength > mid.maxVisualStrength && mid.maxVisualStrength > edge.maxVisualStrength,
    `Visual strength did not fall with distance: ${near.maxVisualStrength}, ${mid.maxVisualStrength}, ${edge.maxVisualStrength}`,
  )
  assert(outOfRange.state.hearingTest.observed.patrolCellsTraversed > 0, 'Out-of-range patrol did not actually move')
  assert(!outOfRange.cueSeen && !outOfRange.visualSeen, 'Out-of-range movement cluttered the battlefield')

  await driveKeyboardEastTo(desktopPage, 65)
  const wallOutside = await observeCheckpoint(desktopPage, 12)
  assert(wallOutside.cueSeen, 'Shared gravel patrol was not heard before the steel screen')

  await driveKeyboardEastTo(desktopPage, 72)
  const wallInside = await observeCheckpoint(desktopPage, 6)
  assert(wallInside.state.hearingTest.checkpointId === 'wall-inside', 'Did not enter the steel-screen checkpoint')
  assert(wallInside.state.hearingTest.observed.patrolCellsTraversed >= 2, 'Shared patrol did not move behind the steel screen')
  assert(!wallInside.cueSeen && !wallInside.visualSeen, 'Steel screen did not remove the shared patrol cue')
  assert(wallInside.state.hearingTest.wallProof.insideSilent, 'Steel-screen silence proof was not recorded')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-steel-screen.png`, fullPage: true })

  await driveKeyboardEastTo(desktopPage, 79)
  const wallExit = await observeCheckpoint(desktopPage, 12)
  assert(wallExit.cueSeen, 'Shared gravel patrol did not return after the steel screen')
  assert(
    wallExit.state.hearingTest.wallProof.outsideHeard
      && wallExit.state.hearingTest.wallProof.insideSilent
      && wallExit.state.hearingTest.wallProof.exitHeard,
    `Wall proof is incomplete: ${JSON.stringify(wallExit.state.hearingTest.wallProof)}`,
  )

  await driveKeyboardEastTo(desktopPage, 88)
  await driveKeyboardNorthTo(desktopPage, 6)
  const inspection = await readState(desktopPage)
  const inspectionPatrol = inspection.hearingTest.patrols.find((patrol) => patrol.id === 'hearing-patrol-inspect')
  assert(inspection.hearingTest.checkpointId === 'inspection-yard', 'Inspection yard did not activate')
  assert(inspectionPatrol?.visible === true, 'Approaching the inspection patrol did not reveal the ordinary tank entity')
  assert(inspection.enemies.some((enemy) => enemy.id === 'hearing-patrol-inspect'), 'Inspection patrol is not present in normal visible-enemy state')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-inspection-yard.png`, fullPage: true })

  await driveKeyboardSouthTo(desktopPage, 8)
  const playerHpBeforeLiveFire = (await readState(desktopPage)).player.hp

  await driveKeyboardEastTo(desktopPage, 99)
  const distantGunfire = await observeCheckpoint(desktopPage, 8)
  assert(distantGunfire.state.hearingTest.checkpointId === 'distant-gunfire', 'Distant-gunfire checkpoint did not activate')
  assert(
    distantGunfire.state.hearingTest.observed.cueKindsObservedSinceEntry.includes('shot'),
    'The real southern gunshot was not heard',
  )
  assert(
    !distantGunfire.state.hearingTest.observed.cueKindsObservedSinceEntry.includes('impact'),
    'The deliberately distant steel impact cluttered the listener view',
  )
  assert(
    distantGunfire.state.hearingTest.observed.mechanicEventCounts.impact > 0,
    'No ordinary projectile-to-steel impact occurred at the distant-gunfire station',
  )
  await desktopPage.screenshot({ path: `${outRoot}/desktop-distant-gunfire.png`, fullPage: true })

  await driveKeyboardEastTo(desktopPage, 114)
  const shotAndImpact = await observeCheckpoint(desktopPage, 8)
  assert(shotAndImpact.state.hearingTest.checkpointId === 'shot-and-impact', 'Shot-and-impact checkpoint did not activate')
  assert(
    ['shot', 'impact'].every((kind) => shotAndImpact.state.hearingTest.observed.cueKindsObservedSinceEntry.includes(kind)),
    `Shot/impact pair was incomplete: ${JSON.stringify(shotAndImpact.state.hearingTest.observed.cueKindsObservedSinceEntry)}`,
  )
  assert(
    shotAndImpact.state.hearingTest.observed.mechanicEventCounts.impact > 0,
    'The real shell never reached the steel target',
  )
  await desktopPage.screenshot({ path: `${outRoot}/desktop-shot-and-impact.png`, fullPage: true })

  await driveKeyboardEastTo(desktopPage, 127)
  const distantExplosion = await observeCheckpoint(desktopPage, 12)
  assert(distantExplosion.state.hearingTest.checkpointId === 'distant-explosion', 'Distant-explosion checkpoint did not activate')
  assert(
    ['impact', 'explosion'].every((kind) => distantExplosion.state.hearingTest.observed.cueKindsObservedSinceEntry.includes(kind)),
    `Impact/explosion pair was incomplete: ${JSON.stringify(distantExplosion.state.hearingTest.observed.cueKindsObservedSinceEntry)}`,
  )
  assert(
    !distantExplosion.state.hearingTest.observed.cueKindsObservedSinceEntry.includes('shot'),
    'The out-of-range firing tank added a distant shot marker',
  )
  assert(
    distantExplosion.state.hearingTest.observed.mechanicEventCounts.shot > 0
      && distantExplosion.state.hearingTest.observed.mechanicEventCounts.explosion > 0,
    'The explosion station did not complete an ordinary fire/hit/destroy cycle',
  )
  const explosionStation = distantExplosion.state.hearingTest.liveFireStations
    .find((station) => station.id === 'hearing-live-fire-explosion')
  assert(explosionStation.targetRespawns > 0, 'The real fragile target did not cycle after destruction')
  assert(distantExplosion.state.player.hp === playerHpBeforeLiveFire, 'The isolated live-fire line damaged the player')
  await desktopPage.screenshot({ path: `${outRoot}/desktop-distant-explosion.png`, fullPage: true })

  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tabletPage = await tabletContext.newPage()
  attachConsoleCapture(tabletPage, 'tablet')
  await openCourse(tabletPage, true)
  const tabletOpening = await readState(tabletPage)
  assert(tabletOpening.feedback.touchControlsVisible === true, 'Tablet movement rails are not visible')
  await driveTabletEastTo(tabletPage, 20)
  const tabletNear = await observeCheckpoint(tabletPage, 5)
  assert(tabletNear.state.player.col === 20, `Tablet stopped at ${tabletNear.state.player.col}, not the checkpoint sign`)
  assert(tabletNear.state.hearingTest.checkpointId === 'hidden-near', 'Tablet did not reach the hidden-near checkpoint')
  assert(tabletNear.cueSeen, 'Tablet listener did not receive the real near-patrol cue')
  await tabletPage.screenshot({ path: `${outRoot}/tablet-hidden-near.png`, fullPage: true })

  const blockingBrowserMessages = browserMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const summary = {
    outcome: 'F1_ACOUSTIC_FIELD_COURSE_SMOKE_PASSED',
    route: {
      checkpoints: opening.hearingTest.checkpointCount,
      patrols: opening.hearingTest.patrols.length,
      liveFireStations: opening.hearingTest.liveFireStations.length,
      playerStart: { col: opening.player.col, row: opening.player.row },
      inspectionApproach: { col: inspection.player.col, row: inspection.player.row, patrolVisible: inspectionPatrol.visible },
    },
    distance: Object.fromEntries(observations.map((observation) => [
      observation.id,
      {
        cueSeen: observation.cueSeen,
        visualSeen: observation.visualSeen,
        maxCueGain: observation.maxCueGain,
        maxVisualStrength: observation.maxVisualStrength,
        patrolCellsTraversed: observation.state.hearingTest.observed.patrolCellsTraversed,
      },
    ])),
    wallProof: wallExit.state.hearingTest.wallProof,
    liveFire: {
      distantGunfire: {
        heard: distantGunfire.state.hearingTest.observed.cueKindsObservedSinceEntry,
        mechanics: distantGunfire.state.hearingTest.observed.mechanicEventCounts,
      },
      shotAndImpact: {
        heard: shotAndImpact.state.hearingTest.observed.cueKindsObservedSinceEntry,
        mechanics: shotAndImpact.state.hearingTest.observed.mechanicEventCounts,
      },
      distantExplosion: {
        heard: distantExplosion.state.hearingTest.observed.cueKindsObservedSinceEntry,
        mechanics: distantExplosion.state.hearingTest.observed.mechanicEventCounts,
        targetRespawns: explosionStation.targetRespawns,
      },
    },
    tablet: {
      viewport: { width: 1280, height: 711 },
      controlsVisible: tabletNear.state.feedback.touchControlsVisible,
      checkpoint: tabletNear.state.hearingTest.checkpointId,
      player: { col: tabletNear.state.player.col, row: tabletNear.state.player.row },
      cueSeen: tabletNear.cueSeen,
    },
    blockingBrowserMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-steel-screen-state.json`, `${JSON.stringify(wallInside.state, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-inspection-state.json`, `${JSON.stringify(inspection, null, 2)}\n`)
  await writeFile(`${outRoot}/desktop-live-fire-state.json`, `${JSON.stringify(distantExplosion.state, null, 2)}\n`)
  await writeFile(`${outRoot}/tablet-hidden-near-state.json`, `${JSON.stringify(tabletNear.state, null, 2)}\n`)
  assert(blockingBrowserMessages.length === 0, `Browser errors: ${JSON.stringify(blockingBrowserMessages)}`)
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function openCourse(page, touch = false) {
  const touchParam = touch ? '&touch=1' : ''
  await page.goto(
    `${baseUrl}?devLevel=acoustic_range&autostart=1&skipSplash=1${touchParam}`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForFunction(() => typeof window.advanceTime === 'function' && typeof window.render_game_to_text === 'function')
  await advance(page, 50)
}

async function driveKeyboardEastTo(page, targetCol) {
  await page.keyboard.down('ArrowRight')
  for (let frame = 0; frame < 10_000; frame += 1) {
    await advance(page, 16)
    if ((await readState(page)).player.col >= targetCol - 1) break
  }
  await page.keyboard.up('ArrowRight')
  await settleMove(page)
  const state = await readState(page)
  assert(state.player.col === targetCol, `Keyboard stopped at col ${state.player.col}, expected ${targetCol}`)
}

async function driveKeyboardNorthTo(page, targetRow) {
  await page.keyboard.down('ArrowUp')
  for (let frame = 0; frame < 2_000; frame += 1) {
    await advance(page, 16)
    if ((await readState(page)).player.row <= targetRow + 1) break
  }
  await page.keyboard.up('ArrowUp')
  await settleMove(page)
  const state = await readState(page)
  assert(state.player.row === targetRow, `Keyboard stopped at row ${state.player.row}, expected ${targetRow}`)
}

async function driveKeyboardSouthTo(page, targetRow) {
  await page.keyboard.down('ArrowDown')
  for (let frame = 0; frame < 2_000; frame += 1) {
    await advance(page, 16)
    if ((await readState(page)).player.row >= targetRow - 1) break
  }
  await page.keyboard.up('ArrowDown')
  await settleMove(page)
  const state = await readState(page)
  assert(state.player.row === targetRow, `Keyboard stopped at row ${state.player.row}, expected ${targetRow}`)
}

async function driveTabletEastTo(page, targetCol) {
  const rail = await boundingBox(page, '.touch-side-rail--left')
  const point = railToViewport(rail, 96, 354)
  await dispatchPointer(page, 'pointerdown', 41, point, '.touch-side-rail--left')
  for (let frame = 0; frame < 10_000; frame += 1) {
    await advance(page, 16)
    if ((await readState(page)).player.col >= targetCol - 1) break
  }
  await dispatchPointer(page, 'pointerup', 41, point, '.touch-side-rail--left')
  await settleMove(page)
}

async function settleMove(page) {
  for (let frame = 0; frame < 300; frame += 1) {
    const state = await readState(page)
    if (!state.player.moving) return
    await advance(page, 16)
  }
  throw new Error('Player movement did not settle')
}

async function observeCheckpoint(page, seconds) {
  let maxCueGain = 0
  let maxVisualStrength = 0
  let cueSeen = false
  let visualSeen = false
  const precisions = []
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += 50) {
    await advance(page, 50)
    const state = await readState(page)
    const observed = state.hearingTest.observed
    cueSeen ||= observed.cuePresent
    visualSeen ||= observed.visualPresent
    maxCueGain = Math.max(maxCueGain, observed.cueGain ?? 0)
    maxVisualStrength = Math.max(maxVisualStrength, observed.visualStrength ?? 0)
    if (observed.sourcePrecision) precisions.push(observed.sourcePrecision)
  }
  return {
    state: await readState(page),
    cueSeen,
    visualSeen,
    maxCueGain,
    maxVisualStrength,
    precisions: [...new Set(precisions)],
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
