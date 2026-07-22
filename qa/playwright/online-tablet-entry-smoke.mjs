import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { createTanchikiServer } from '../../packages/server/server.mjs'

const port = 6800 + Math.floor(Math.random() * 200)
const webOrigin = `http://127.0.0.1:${port}`
const artifactDir = path.resolve('output/online-tablet-entry')
fs.mkdirSync(artifactDir, { recursive: true })
const { server, registry } = createTanchikiServer({
  controllerConfig: { idleLobbyMs: 15_000, reconnectMs: 1_500 },
})
const vite = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  windowsHide: true,
})
let browser
const contexts = []
const errors = []

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
  const roomKey = await copyDisplayedRoomKey(host)

  const guest = await openTabletPage('guest')
  await openEntry(guest, gameUrl, 'join')
  await editField(guest, 'name', 'Tablet Guest')
  await guest.screenshot({ path: path.join(artifactDir, 'tablet-join-entry.png'), fullPage: true })
  await editField(guest, 'key', roomKey.toLowerCase())
  const completedGuestForm = await readState(guest)
  assert.equal(completedGuestForm.form.roomKeyLength, 6)
  await tapLogical(guest, 280, 274)
  await waitState(guest, (state) => state.lobby?.phase === 'LOBBY' && state.connection === 'connected')
  await waitState(host, (state) => state.lobby?.players.length === 2)

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    ok: true,
    touchContexts: 2,
    nativeInputFocused: true,
    callsignTyped: true,
    roomKeyTyped: true,
    visibleActionsTapped: true,
    joinedLobbyPlayers: 2,
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
  await input.fill(value)
  const editing = await readState(page)
  assert.equal(editing.form.editingField, field)
  if (field === 'name') assert.equal(editing.form.playerName, value)
  else assert.equal(editing.form.roomKeyLength, 6)
  await input.press('Enter')
  const completed = await readState(page)
  assert.equal(completed.form.editingField, null)
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

async function copyDisplayedRoomKey(page) {
  await page.keyboard.press('KeyC')
  await page.waitForTimeout(100)
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
