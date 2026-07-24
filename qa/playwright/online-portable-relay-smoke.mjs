import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { createTanchikiServer } from '../../packages/server/server.mjs'

const webOrigin = 'http://127.0.0.1:5181'
const artifactDir = path.resolve('output/online-portable-relay')
fs.mkdirSync(artifactDir, { recursive: true })
const { server, registry } = createTanchikiServer({
  controllerConfig: {
    countdownMs: 100,
    roundDurationMs: 6_000,
    terminalMs: 2_000,
  },
})
const vite = spawn(
  process.execPath,
  [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5181'],
  { cwd: process.cwd(), stdio: 'ignore', windowsHide: true },
)
let browser
const contexts = []
const errors = []

try {
  await waitForHttp(`${webOrigin}/`, 15_000)
  await new Promise((resolve, reject) =>
    Promise.resolve(server.listen(0, '127.0.0.1', resolve)).catch(reject),
  )
  const address = server.address()
  assert(address && typeof address !== 'string')
  const endpoint = `http://127.0.0.1:${address.port}`
  const gameUrl = `${webOrigin}/?skipSplash=1&multiplayerUrl=${encodeURIComponent(endpoint)}`

  browser = await chromium.launch({ headless: true })
  const desktopContext = await browser.newContext({ viewport: { width: 960, height: 720 } })
  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    hasTouch: true,
    isMobile: true,
  })
  contexts.push(desktopContext, tabletContext)
  await desktopContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: webOrigin })
  const host = await desktopContext.newPage()
  const guest = await tabletContext.newPage()
  captureErrors(host, errors, 'desktop')
  captureErrors(guest, errors, 'tablet')

  await openEntry(host, gameUrl, 'create', 'Relay Host')
  await submitCreate(host)
  const roomKey = await copyDisplayedRoomKey(host)
  await openEntry(guest, gameUrl, 'join', 'Relay Guest')
  await submitJoin(guest, roomKey)
  await waitState(host, (state) => state.lobby?.players.length === 2)

  await press(host, 'KeyR')
  await press(guest, 'KeyR')
  await waitState(host, (state) => state.lobby?.players.every((player) => player.ready))
  await press(host, 'Enter')
  await Promise.all([
    waitState(host, (state) => state.lobby?.phase === 'PLAYING' && state.snapshot),
    waitState(guest, (state) => state.lobby?.phase === 'PLAYING' && state.snapshot),
  ])

  const hostStart = await readState(host)
  const hostSelf = hostStart.snapshot.players.find((player) => player.self)
  assert(hostSelf)
  await holdKey(host, 'KeyE', 1_300)
  const hostPlaced = await waitState(host, (state) =>
    state.snapshot?.self.portableRelay.activeCount === 1
    && state.snapshot.portableRelays.some((relay) =>
      relay.team === state.snapshot.team
      && relay.col === hostSelf.col
      && relay.row === hostSelf.row,
    ),
  )
  assert.equal(hostPlaced.snapshot.self.portableRelay.limit, 2)
  assert.equal(hostPlaced.snapshot.self.portableRelay.activeCount, 1)
  const hostPulse = await waitState(host, (state) => state.snapshot?.portableSignals.waves.length > 0)
  assert(hostPulse.snapshot.portableSignals.waves.every((wave) => wave.sourceTeam === 'blue'))
  await holdKey(host, 'ArrowUp', 120)
  const hostBesideRelay = await waitState(host, (state) => {
    const self = state.snapshot?.players.find((player) => player.self)
    return self
      && self.move === null
      && Math.abs(self.col - hostSelf.col) + Math.abs(self.row - hostSelf.row) === 1
      && state.snapshot.portableSignals.waves.length > 0
  })
  assert(hostBesideRelay.snapshot.portableRelays.some((relay) =>
    relay.col === hostSelf.col && relay.row === hostSelf.row,
  ))
  const guestBeforeRelay = await readState(guest)
  assert.equal(guestBeforeRelay.snapshot.portableSignals.waves.length, 0)
  assert.equal(
    guestBeforeRelay.snapshot.portableRelays.some((relay) => relay.team === 'blue'),
    false,
  )
  await host.locator('.game-canvas').screenshot({ path: path.join(artifactDir, 'desktop-relay-wave.png') })

  await holdTabletRelay(guest, 1_300)
  const guestPlaced = await waitState(guest, (state) =>
    state.snapshot?.self.portableRelay.activeCount === 1
    && state.snapshot.portableSignals.waves.some((wave) => wave.sourceTeam === 'red'),
  )
  assert.equal(guestPlaced.snapshot.self.portableRelay.activeCount, 1)
  assert(guestPlaced.touch.actions.includes('relay'))
  const hostAfterGuestRelay = await readState(host)
  assert(hostAfterGuestRelay.snapshot.portableSignals.waves.every((wave) => wave.sourceTeam === 'blue'))
  await guest.screenshot({ path: path.join(artifactDir, 'tablet-relay-control.png') })

  await holdKey(host, 'KeyE', 1_000)
  const hostRecovered = await waitState(host, (state) =>
    state.snapshot?.self.portableRelay.activeCount === 0,
  )
  assert.equal(hostRecovered.snapshot.self.portableRelay.available, true)

  const resultStates = await Promise.all([
    waitState(host, (state) => state.screen === 'results' && state.rematchStatus?.available, 10_000),
    waitState(guest, (state) => state.screen === 'results' && state.rematchStatus?.available, 10_000),
  ])
  assert(resultStates.every((state) => state.result.resultId === resultStates[0].result.resultId))
  await Promise.all([press(host, 'Enter'), press(guest, 'Enter')])
  await Promise.all([
    waitState(host, (state) => state.lobby?.phase === 'LOBBY' && !state.snapshot),
    waitState(guest, (state) => state.lobby?.phase === 'LOBBY' && !state.snapshot),
  ])

  await press(host, 'KeyR')
  await press(guest, 'KeyR')
  await press(host, 'Enter')
  const freshRound = await waitState(host, (state) =>
    state.lobby?.phase === 'PLAYING' && state.snapshot,
  )
  assert.equal(freshRound.snapshot.self.portableRelay.activeCount, 0)
  assert.deepEqual(freshRound.snapshot.portableRelays, [])
  assert.deepEqual(freshRound.snapshot.portableSignals.waves, [])
  assert.deepEqual(freshRound.snapshot.portableSignals.contacts, [])

  await press(host, 'KeyB')
  await press(host, 'KeyB')
  await waitFor(() => registry.size === 0, 4_000, 'portable relay room cleanup')
  assert.deepEqual(errors, [])

  fs.writeFileSync(
    path.join(artifactDir, 'summary.json'),
    `${JSON.stringify({
      ok: true,
      keyboardPlaceAndRecover: true,
      ownTilePlacement: true,
      relayBodyAfterMovement: true,
      tabletHold: true,
      teamSignalFiltering: true,
      hiddenEnemyRelayFiltered: true,
      rematchReset: true,
      cleanup: true,
      errors,
    }, null, 2)}\n`,
  )
  console.log('ONLINE_PORTABLE_RELAY_SMOKE_PASSED')
} finally {
  for (const context of contexts) await context.close().catch(() => {})
  await browser?.close().catch(() => {})
  await new Promise((resolve) => server.close(() => resolve()))
  vite.kill()
}

async function openEntry(page, url, intent, name) {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  for (let index = 0; index < 3; index += 1) await press(page, 'ArrowDown')
  await press(page, 'Enter')
  if (intent === 'join') await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await waitState(page, (state) => state.mode === 'online-battle' && state.screen === 'room-entry')
  await press(page, 'Enter')
  await page.keyboard.type(name)
  await press(page, 'Enter')
}

async function submitCreate(page) {
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await waitState(page, (state) => state.lobby?.phase === 'LOBBY')
}

async function submitJoin(page, roomKey) {
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await page.keyboard.type(roomKey)
  await press(page, 'Enter')
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await waitState(page, (state) => state.lobby?.phase === 'LOBBY')
}

async function copyDisplayedRoomKey(page) {
  await press(page, 'KeyC')
  await page.waitForTimeout(80)
  const roomKey = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(roomKey.length, 6)
  return roomKey
}

async function holdKey(page, key, durationMs) {
  await page.keyboard.down(key)
  await page.waitForTimeout(durationMs)
  await page.keyboard.up(key)
}

async function holdTabletRelay(page, durationMs) {
  const selector = '.touch-side-rail--left'
  const rail = page.locator(selector)
  await rail.waitFor({ state: 'visible' })
  const box = await rail.boundingBox()
  assert(box)
  const point = {
    x: box.x + 56 / 112 * box.width,
    y: box.y + 244 / 464 * box.height,
  }
  await dispatchRailPointer(page, 'pointerdown', 701, point, selector)
  await page.waitForTimeout(durationMs)
  await dispatchRailPointer(page, 'pointerup', 701, point, selector)
}

async function dispatchRailPointer(page, type, pointerId, point, selector) {
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

async function press(page, key) {
  await page.keyboard.press(key)
  await page.waitForTimeout(140)
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
  throw new Error(
    `Timed out waiting for relay state (${lastState?.screen ?? 'unknown'} / ${lastState?.errorCode ?? 'no-error'}).`,
  )
}

function captureErrors(page, target, label) {
  page.on('pageerror', (error) => target.push(`${label}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') target.push(`${label}: ${message.text()}`)
  })
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
