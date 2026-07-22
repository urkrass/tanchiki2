import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { createTanchikiServer } from '../../packages/server/server.mjs'
import { getSharedTankClassCombatStats } from '../../packages/shared/dist/index.js'

const port = 6800 + Math.floor(Math.random() * 200)
const webOrigin = `http://127.0.0.1:${port}`
const artifactDir = path.resolve('output/online-tablet-entry')
fs.mkdirSync(artifactDir, { recursive: true })
const { server, registry } = createTanchikiServer({
  controllerConfig: { reconnectMs: 1_500 },
})
const vite = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  windowsHide: true,
})
let browser
const contexts = []
const errors = []
const MAX_TABLET_INPUT_TO_VISIBLE_MS = 220
const MAX_TABLET_FIRST_TILE_VISUAL_MS = Math.ceil(
  getSharedTankClassCombatStats('battle').moveDuration * 1_000 + 200,
)

try {
  await waitForHttp(`${webOrigin}/`, 15_000)
  await new Promise((resolve, reject) => Promise.resolve(server.listen(0, '127.0.0.1', resolve)).catch(reject))
  const address = server.address()
  assert(address && typeof address !== 'string')
  const endpoint = `http://127.0.0.1:${address.port}`
  const gameUrl = `${webOrigin}/?skipSplash=1&touch=1&multiplayerUrl=${encodeURIComponent(endpoint)}`

  browser = await chromium.launch({ headless: true })
  const host = await openTabletPage('host')
  await openEntry(host, gameUrl, 'create')
  await editField(host, 'name', 'Tablet Host')
  await host.screenshot({ path: path.join(artifactDir, 'tablet-create-entry.png'), fullPage: true })
  await tapLogical(host, 280, 238)
  await waitState(host, (state) => state.lobby?.phase === 'LOBBY' && state.connection === 'connected')
  await screenshotCopyButton(host, path.join(artifactDir, 'tablet-copy-room-key.png'))
  const roomKey = await copyDisplayedRoomKey(host)
  await screenshotCopyButton(host, path.join(artifactDir, 'tablet-key-copied.png'))
  const hostSession = await host.context().newCDPSession(host)
  await hostSession.send('Page.setWebLifecycleState', { state: 'frozen' })

  const guest = await openTabletPage('guest')
  await openEntry(guest, gameUrl, 'join')
  await editField(guest, 'name', 'Tablet Guest')
  await guest.screenshot({ path: path.join(artifactDir, 'tablet-join-entry.png'), fullPage: true })
  await editField(guest, 'key', roomKey.toLowerCase())
  const completedGuestForm = await readState(guest)
  assert.equal(completedGuestForm.form.roomKeyLength, 6)
  await guest.waitForTimeout(4_000)
  await tapLogical(guest, 280, 274)
  await waitState(guest, (state) => state.lobby?.phase === 'LOBBY' && state.connection === 'connected')
  await hostSession.send('Page.setWebLifecycleState', { state: 'active' })
  await waitState(host, (state) => state.lobby?.players.length === 2)

  await tapLogical(host, 299, 295)
  await tapLogical(guest, 69, 295)
  await Promise.all([
    waitState(host, (state) => state.lobby?.players.find((player) => player.self)?.classId === 'battle'),
    waitState(guest, (state) => state.lobby?.players.find((player) => player.self)?.classId === 'scout'),
  ])
  await screenshotLobbyControls(host, path.join(artifactDir, 'tablet-class-selection.png'))
  await tapLogical(host, 274, 338)
  await tapLogical(guest, 274, 338)
  await waitState(host, (state) => state.lobby?.players.every((player) => player.ready))
  await screenshotLobbyControls(host, path.join(artifactDir, 'tablet-host-start-cta.png'))
  await tapLogical(host, 423, 333)
  await waitState(host, (state) => state.lobby?.phase === 'COUNTDOWN')
  await Promise.all([
    waitState(host, (state) => state.lobby?.phase === 'PLAYING' && state.snapshot && state.animation?.visualSelf),
    waitState(guest, (state) => state.lobby?.phase === 'PLAYING' && state.snapshot),
  ])

  const movementProbe = await measureTabletTouchMovement(host)
  assert(
    movementProbe.inputToVisibleMs <= MAX_TABLET_INPUT_TO_VISIBLE_MS,
    `Tablet input took ${movementProbe.inputToVisibleMs}ms to become visible (limit ${MAX_TABLET_INPUT_TO_VISIBLE_MS}ms).`,
  )
  assert(
    movementProbe.firstTileVisualDurationMs <= MAX_TABLET_FIRST_TILE_VISUAL_MS,
    `Tablet movement took ${movementProbe.firstTileVisualDurationMs}ms to cross one tile (limit ${MAX_TABLET_FIRST_TILE_VISUAL_MS}ms).`,
  )
  assert.equal(movementProbe.backtrackCount, 0, 'Tablet movement visually rewound during a held direction.')
  await activateTabletBattleKit(host)
  await host.screenshot({ path: path.join(artifactDir, 'tablet-live-class-kit.png'), fullPage: true })

  await tapLogical(host, 22, 444)
  const guardedBack = await waitState(host, (state) => state.leaveConfirmation?.active === true)
  assert.equal(guardedBack.connection, 'connected')
  assert.equal(guardedBack.lobby.phase, 'PLAYING')
  await host.screenshot({ path: path.join(artifactDir, 'tablet-leave-confirmation.png'), fullPage: true })
  await host.waitForTimeout(2_600)
  const afterGuardExpiry = await readState(host)
  assert.equal(afterGuardExpiry.connection, 'connected')
  assert.equal(afterGuardExpiry.lobby.phase, 'PLAYING')
  assert.equal(afterGuardExpiry.leaveConfirmation.active, false)

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    ok: true,
    touchContexts: 2,
    nativeInputFocused: true,
    callsignTyped: true,
    roomKeyTyped: true,
    roomKeyCopiedByTouch: true,
    hostSurvivedBackgroundFreeze: true,
    visibleActionsTapped: true,
    joinedLobbyPlayers: 2,
    viewportStayedPinned: true,
    tankClassesSelectedByTouch: ['battle', 'scout'],
    hostStartCtaTapped: true,
    countdownStarted: true,
    inputToVisibleMotionMs: movementProbe.inputToVisibleMs,
    firstTileVisualDurationMs: movementProbe.firstTileVisualDurationMs,
    movementBacktrackCount: movementProbe.backtrackCount,
    movementDirection: movementProbe.direction,
    responsivenessLimitMs: MAX_TABLET_INPUT_TO_VISIBLE_MS,
    battleKitActivatedByTouch: ['bulwark', 'traverse'],
    accidentalBackGuarded: true,
    browserErrors: errors.length,
  }))
} finally {
  for (const context of contexts) await context.close().catch(() => {})
  await browser?.close().catch(() => {})
  await waitFor(() => registry.size === 0, 4_000, 'tablet room cleanup').catch(() => {})
  await new Promise((resolve) => server.close(() => resolve()))
  vite.kill()
}

async function openTabletPage(label) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })
  contexts.push(context)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: webOrigin })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`)
  })
  return page
}

async function openEntry(page, url, intent) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitState(page, (state) => state.mode === 'main-menu')
  await tapLogical(page, 280, 278)
  await waitState(page, (state) => state.mode === 'online-menu')
  await tapLogical(page, 280, intent === 'create' ? 181 : 213)
  await waitState(page, (state) => state.mode === 'online-battle' && state.screen === 'room-entry')
}

async function editField(page, field, value) {
  await tapLogical(page, 300, field === 'name' ? 146 : 198)
  const input = page.locator('.online-entry-input')
  await input.waitFor({ state: 'attached' })
  assert.equal(await input.getAttribute('aria-label'), field === 'name' ? 'Callsign' : 'Six-character room key')
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('online-entry-input')), true)
  await assertViewportPinned(page)
  await input.fill(value)
  const editing = await readState(page)
  assert.equal(editing.form.editingField, field)
  if (field === 'name') assert.equal(editing.form.playerName, value)
  else assert.equal(editing.form.roomKeyLength, 6)
  await input.press('Enter')
  const completed = await readState(page)
  assert.equal(completed.form.editingField, null)
}

async function assertViewportPinned(page) {
  const viewport = await page.evaluate(() => {
    const input = document.querySelector('.online-entry-input')
    const meta = document.querySelector('meta[name="viewport"]')
    return {
      scrollY: window.scrollY,
      bodyOverflow: getComputedStyle(document.body).overflow,
      inputTop: input ? Number.parseFloat(getComputedStyle(input).top) : null,
      viewportContent: meta?.getAttribute('content') ?? '',
    }
  })
  assert.equal(viewport.scrollY, 0)
  assert.equal(viewport.bodyOverflow, 'hidden')
  assert.equal(viewport.inputTop, 8)
  assert.match(viewport.viewportContent, /interactive-widget=overlays-content/)
}

async function screenshotLobbyControls(page, screenshotPath) {
  const box = await page.locator('.game-canvas').boundingBox()
  assert(box)
  const top = box.y + 276 / 464 * box.height
  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: box.x,
      y: top,
      width: box.width,
      height: 116 / 464 * box.height,
    },
  })
}

async function screenshotCopyButton(page, screenshotPath) {
  const box = await page.locator('.game-canvas').boundingBox()
  assert(box)
  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: box.x + 340 / 560 * box.width,
      y: box.y + 72 / 464 * box.height,
      width: 180 / 560 * box.width,
      height: 40 / 464 * box.height,
    },
  })
}

async function tapLogical(page, logicalX, logicalY) {
  const box = await page.locator('.game-canvas').boundingBox()
  assert(box)
  await page.touchscreen.tap(
    box.x + logicalX / 560 * box.width,
    box.y + logicalY / 464 * box.height,
  )
  await page.waitForTimeout(180)
}

async function measureTabletTouchMovement(page) {
  const initial = await readState(page)
  const self = initial.snapshot.players.find((player) => player.self)
  const visualSelf = initial.animation?.visualSelf
  assert(self && visualSelf)
  const direction = chooseOpenDirection(initial.snapshot, self)
  const vector = directionVector(direction)
  const rail = page.locator('.touch-side-rail--left')
  await rail.waitFor({ state: 'visible' })
  const box = await rail.boundingBox()
  assert(box)
  const center = railPoint(box, 56, 354)
  const target = railPoint(box, 56 + vector.x * 32, 354 + vector.y * 32)

  await dispatchRailPointer(page, 'pointerdown', 91, center)
  const startedAt = Date.now()
  await dispatchRailPointer(page, 'pointermove', 91, target)

  let visibleAt = null
  let completedAt = null
  const samples = []
  const deadline = startedAt + 1_500
  while (Date.now() < deadline) {
    const sampledAt = Date.now()
    const state = await readState(page)
    const visual = state.animation?.visualSelf
    if (visual) {
      const projected = (visual.x - visualSelf.x) * vector.x + (visual.y - visualSelf.y) * vector.y
      samples.push({ sampledAt, projected })
      if (visibleAt === null && projected >= 0.01) visibleAt = sampledAt
      if (projected >= 0.99) {
        completedAt = sampledAt
        break
      }
    }
    await page.waitForTimeout(10)
  }
  await dispatchRailPointer(page, 'pointerup', 91, target)
  assert(visibleAt !== null, `Tablet movement in the ${direction} direction never became visible.`)
  assert(completedAt !== null, `Tablet movement in the ${direction} direction never completed one tile.`)
  const backtrackCount = samples.slice(1).filter((sample, index) =>
    sample.projected < samples[index].projected - 0.002,
  ).length

  return {
    direction,
    inputToVisibleMs: visibleAt - startedAt,
    firstTileVisualDurationMs: completedAt - visibleAt,
    backtrackCount,
  }
}

function chooseOpenDirection(snapshot, self) {
  const candidates = [self.dir, 'up', 'right', 'down', 'left'].filter((value, index, values) => values.indexOf(value) === index)
  const traversable = new Map(snapshot.visibleTerrain.map((tile) => [`${tile.col},${tile.row}`, tile.kind]))
  for (const direction of candidates) {
    const vector = directionVector(direction)
    const col = self.col + vector.x
    const row = self.row + vector.y
    const terrain = traversable.get(`${col},${row}`)
    if (col >= 0 && col < 20 && row >= 0 && row < 16 && terrain && !['brick', 'steel', 'water'].includes(terrain)) {
      return direction
    }
  }
  throw new Error('No visible open neighboring tile was available for the tablet responsiveness probe.')
}

function directionVector(direction) {
  if (direction === 'right') return { x: 1, y: 0 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 0, y: -1 }
}

function railPoint(box, logicalX, logicalY) {
  return {
    x: box.x + logicalX / 112 * box.width,
    y: box.y + logicalY / 464 * box.height,
  }
}

async function dispatchRailPointer(page, type, pointerId, point, selector = '.touch-side-rail--left') {
  await page.evaluate(({ type, pointerId, point, selector }) => {
    const rail = document.querySelector(selector)
    if (!rail) throw new Error(`Missing touch rail ${selector}`)
    rail.setPointerCapture = () => {}
    rail.releasePointerCapture = () => {}
    rail.dispatchEvent(new PointerEvent(type, {
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
  }, { type, pointerId, point, selector })
}

async function activateTabletBattleKit(page) {
  const selector = '.touch-side-rail--right'
  const rail = page.locator(selector)
  await rail.waitFor({ state: 'visible' })
  const box = await rail.boundingBox()
  assert(box)
  for (const [index, logicalX] of [30, 82].entries()) {
    const point = railPoint(box, logicalX, 244)
    const pointerId = 110 + index
    await dispatchRailPointer(page, 'pointerdown', pointerId, point, selector)
    await waitState(page, (state) => state.snapshot?.self.equipment[index]?.state === 'active')
    await dispatchRailPointer(page, 'pointerup', pointerId, point, selector)
  }
  const active = await readState(page)
  assert.equal(active.snapshot.self.shield, 3)
}

async function copyDisplayedRoomKey(page) {
  await tapLogical(page, 431, 91)
  const roomKey = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(roomKey.length, 6)
  return roomKey
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function waitState(page, predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs
  let lastState = null
  while (Date.now() < deadline) {
    lastState = await readState(page)
    if (predicate(lastState)) return lastState
    await page.waitForTimeout(50)
  }
  throw new Error(`Timed out waiting for tablet state (${lastState?.mode ?? 'unknown'} / ${lastState?.screen ?? 'unknown'} / ${lastState?.errorCode ?? 'no-error'}).`)
}

async function waitForHttp(url, timeoutMs) {
  await waitFor(async () => {
    try {
      return (await fetch(url)).ok
    } catch {
      return false
    }
  }, timeoutMs, 'Vite server')
}

async function waitFor(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out waiting for ${label}.`)
}
