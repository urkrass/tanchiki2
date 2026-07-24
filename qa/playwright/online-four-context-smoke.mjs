import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { createTanchikiServer } from '../../packages/server/server.mjs'
import { ONLINE_PROTOCOL_VERSION } from '../../packages/shared/dist/index.js'

const webOrigin = 'http://127.0.0.1:5178'
const artifactDir = path.resolve('output/online-four-context')
fs.mkdirSync(artifactDir, { recursive: true })
const { server, registry } = createTanchikiServer({
  controllerConfig: { countdownMs: 3_000, roundDurationMs: 12_000, terminalMs: 1_500 },
})
const vite = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5178'], {
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
  const gameUrl = `${webOrigin}/?skipSplash=1&multiplayerUrl=${encodeURIComponent(endpoint)}`

  browser = await chromium.launch({ headless: true })
  const pages = []
  for (let index = 0; index < 4; index += 1) {
    const context = await browser.newContext({
      viewport: { width: 960, height: 720 },
      hasTouch: index === 3,
    })
    contexts.push(context)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: webOrigin })
    const page = await context.newPage()
    captureErrors(page, errors, `browser-${index + 1}`)
    pages.push(page)
  }

  await openEntry(pages[0], gameUrl, 'create', 'Alpha')
  await submitCreate(pages[0])
  const hostLobby = await waitState(pages[0], (state) => state.lobby?.players.length === 1 && state.lobby.roomKeyAvailable)
  assert.equal(hostLobby.lobby.isHost, true)
  const roomKey = await copyDisplayedRoomKey(pages[0])

  for (let index = 1; index < pages.length; index += 1) {
    await openEntry(pages[index], gameUrl, 'join', ['Bravo', 'Charlie', 'Delta'][index - 1])
    await submitJoin(pages[index], roomKey)
  }
  await waitState(pages[0], (state) => state.lobby?.players.length === 4)

  await press(pages[0], 'KeyX')
  await press(pages[1], 'KeyZ')
  await Promise.all([
    waitState(pages[0], (state) => state.lobby?.players.find((player) => player.self)?.classId === 'battle'),
    waitState(pages[1], (state) => state.lobby?.players.find((player) => player.self)?.classId === 'scout'),
  ])

  for (const page of pages) await press(page, 'KeyR')
  await waitState(pages[0], (state) => state.lobby?.players.every((player) => player.ready))
  await press(pages[0], 'Enter')
  await waitState(pages[0], (state) => state.lobby?.phase === 'COUNTDOWN')
  await press(pages[1], 'KeyR')
  await waitState(pages[0], (state) => state.lobby?.phase === 'LOBBY' && state.lobby.players.every((player) => !player.ready))

  for (const page of pages) await press(page, 'KeyR')
  await waitState(pages[0], (state) => state.lobby?.players.every((player) => player.ready))

  const probeContext = await browser.newContext({ viewport: { width: 960, height: 720 } })
  contexts.push(probeContext)
  const probePage = await probeContext.newPage()
  captureErrors(probePage, errors, 'locked-probe')
  await openEntry(probePage, gameUrl, 'join', 'Echo')
  await enterJoinKey(probePage, roomKey)

  await press(pages[0], 'Enter')
  await waitState(pages[0], (state) => state.lobby?.phase === 'COUNTDOWN')
  await press(probePage, 'ArrowDown')
  await press(probePage, 'Enter')
  await waitState(probePage, (state) => state.errorCode === 'ROOM_LOCKED', 3_000)

  await Promise.all(pages.map((page) => waitState(page, (state) => state.lobby?.phase === 'PLAYING' && state.snapshot)))

  const engineerPlacements = await Promise.all([
    placeEngineerDevice(pages[2], 1, 'mine'),
    placeEngineerDevice(pages[3], 2, 'steel'),
  ])
  assert(engineerPlacements.every((placement) => placement.ownCell), 'Engineer gear must deploy on the tank cell.')
  await pages[2].locator('.game-canvas').screenshot({ path: path.join(artifactDir, 'engineer-mine-canonical.png') })
  await pages[3].locator('.game-canvas').screenshot({ path: path.join(artifactDir, 'engineer-trap-canonical.png') })

  await press(pages[0], 'Digit1')
  await waitState(pages[0], (state) => state.snapshot?.self.equipment[0]?.state === 'active')

  await press(pages[0], 'KeyT')
  await waitState(pages[0], (state) => state.radio?.open && state.radio.selected === 'ATTACK')
  await press(pages[0], 'ArrowDown')
  await press(pages[0], 'ArrowDown')
  await press(pages[0], 'Enter')
  await waitState(pages[0], (state) => state.snapshot?.radio.some((message) => message.command === 'REGROUP'))
  await waitState(pages[2], (state) => state.snapshot?.radio.some((message) => message.command === 'REGROUP'))
  const redView = await readState(pages[1])
  assert.equal(redView.snapshot.radio.some((message) => message.command === 'REGROUP'), false)

  await tapLogical(pages[3], 512, 307)
  await waitState(pages[3], (state) => state.radio?.open)
  await pages[3].screenshot({ path: path.join(artifactDir, 'tablet-radio-selector.png') })
  fs.writeFileSync(
    path.join(artifactDir, 'tablet-radio-selector-state.json'),
    `${JSON.stringify(await readState(pages[3]), null, 2)}\n`,
  )
  await tapLogical(pages[3], 256, 256)
  await waitState(pages[3], (state) => state.snapshot?.radio.some((message) => message.command === 'HELP'))
  await waitState(pages[1], (state) => state.snapshot?.radio.some((message) => message.command === 'HELP'))
  const blueView = await readState(pages[0])
  assert.equal(blueView.snapshot.radio.some((message) => message.command === 'HELP'), false)

  const touchSelf = (await readState(pages[3])).snapshot.players.find((player) => player.self)
  assert(touchSelf)
  await tapLogical(pages[3], 512, 261)
  await waitState(
    pages[3],
    (state) => state.snapshot?.pings.some((ping) => ping.col === touchSelf.col && ping.row === touchSelf.row),
  )

  await Promise.all(pages.map(async (page, index) => {
    await page.keyboard.down(index % 2 === 0 ? 'ArrowRight' : 'ArrowLeft')
    await page.keyboard.down('Space')
    await page.waitForTimeout(700)
    await page.keyboard.up('Space')
    await page.keyboard.up(index % 2 === 0 ? 'ArrowRight' : 'ArrowLeft')
  }))

  const resultStates = await Promise.all(pages.map((page) => waitState(
    page,
    (state) => state.screen === 'results' && state.rematchStatus?.available === true,
    12_000,
  )))
  const core = resultStates.map((state) => JSON.stringify({
    matchId: state.result.matchId,
    resultId: state.result.resultId,
    finalServerTick: state.result.finalServerTick,
    scores: state.result.scores,
    winner: state.result.winner,
    reason: state.result.reason,
  }))
  assert(core.every((entry) => entry === core[0]), 'Four browser contexts observed divergent results.')
  assert(resultStates.every((state) => state.rematchStatus?.available === true))
  assert(resultStates.every((state) => state.rematchStatus?.required === 4))
  const expiredKeyResponse = await resolveRoomKey(endpoint, roomKey)
  assert.equal(expiredKeyResponse.status, 404)
  await pages[0].screenshot({ path: path.join(artifactDir, 'four-context-result.png') })

  await Promise.all([
    press(pages[0], 'Enter'),
    press(pages[1], 'Enter'),
    press(pages[2], 'Enter'),
    tapLogical(pages[3], 280, 346),
  ])
  const rematchLobbies = await Promise.all(pages.map((page) => waitState(
    page,
    (state) => state.screen === 'field-briefing'
      && state.lobby?.phase === 'LOBBY'
      && state.lobby.players.length === 4
      && state.lobby.players.every((player) => !player.ready),
  )))
  assert(rematchLobbies.every((state) => state.result === null))
  assert.equal(rematchLobbies[0].lobby.players.find((player) => player.self)?.classId, 'battle')
  assert.equal(rematchLobbies[1].lobby.players.find((player) => player.self)?.classId, 'scout')
  const rematchRoomKey = await copyDisplayedRoomKey(pages[0])
  assert.notEqual(rematchRoomKey, roomKey)
  assert.equal((await resolveRoomKey(endpoint, rematchRoomKey)).status, 200)
  await pages[0].screenshot({ path: path.join(artifactDir, 'four-context-rematch-lobby.png') })
  for (const page of pages) await press(page, 'KeyR')
  await waitState(pages[0], (state) => state.lobby?.players.every((player) => player.ready))
  await press(pages[0], 'KeyB')
  await waitFor(() => registry.size === 0, 4_000, 'rematch lobby cleanup')

  // A second focused room proves host kick, key rotation, and kicked-client rejection.
  await openEntry(pages[0], gameUrl, 'create', 'Kick Host')
  await submitCreate(pages[0])
  await waitState(pages[0], (state) => state.lobby?.roomKeyAvailable)
  const previousKey = await copyDisplayedRoomKey(pages[0])
  await openEntry(pages[1], gameUrl, 'join', 'Kick Guest')
  await submitJoin(pages[1], previousKey)
  await waitState(pages[0], (state) => state.lobby?.players.length === 2)
  await press(pages[0], 'KeyK')
  await waitState(pages[1], (state) => state.errorCode === 'PLAYER_KICKED')
  await waitState(pages[0], (state) => state.lobby?.players.length === 1)
  const replacementKey = await copyDisplayedRoomKey(pages[0])
  assert.notEqual(replacementKey, previousKey)
  assert.equal((await resolveRoomKey(endpoint, previousKey)).status, 404)
  assert.equal((await resolveRoomKey(endpoint, replacementKey)).status, 200)
  await press(pages[0], 'KeyB')
  await waitFor(() => registry.size === 0, 4_000, 'kicked room cleanup')

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    ok: true,
    contexts: 4,
    lifecycle: ['LOBBY', 'COUNTDOWN', 'LOBBY', 'COUNTDOWN', 'PLAYING', 'RESULTS', 'LOBBY', 'DESTROYED'],
    commonResult: true,
    unanimousRematch: true,
    rematchRosterPreserved: true,
    rematchClassesPreserved: true,
    rematchFreshHostKey: true,
    countdownCancellation: true,
    lockedRoster: true,
    fixedRadioKeyboardAndTouch: true,
    canonicalEngineerDeployables: ['mine', 'steel'],
    ownCellDeployablePlacement: true,
    touchPing: true,
    kickAndKeyRotation: true,
    cleanup: true,
  }))
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

async function enterJoinKey(page, roomKey) {
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await page.keyboard.type(roomKey)
  await press(page, 'Enter')
}

async function submitJoin(page, roomKey) {
  await enterJoinKey(page, roomKey)
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

async function resolveRoomKey(endpoint, roomKey) {
  return fetch(`${endpoint}/matchmake/room-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocolVersion: ONLINE_PROTOCOL_VERSION, roomKey }),
  })
}

async function press(page, key) {
  await page.keyboard.press(key)
  await page.waitForTimeout(180)
}

async function placeEngineerDevice(page, slot, kind) {
  const state = await readState(page)
  assert.equal(state.snapshot.self.classId, 'engineer')
  const self = state.snapshot.players.find((player) => player.self)
  assert(self)

  const equipmentKey = slot === 1 ? 'Digit1' : 'Digit2'
  await page.keyboard.down(equipmentKey)
  await page.waitForTimeout(1_050)
  await page.keyboard.up(equipmentKey)
  const placed = await waitState(page, (next) => next.snapshot?.deployables.some((deployable) =>
    deployable.kind === kind && deployable.col === self.col && deployable.row === self.row,
  ))
  const deployable = placed.snapshot.deployables.find((candidate) => candidate.kind === kind)
  return { col: deployable.col, row: deployable.row, ownCell: deployable.col === self.col && deployable.row === self.row }
}

async function tapLogical(page, logicalX, logicalY) {
  const box = await page.locator('.game-canvas').boundingBox()
  assert(box, 'Game canvas is unavailable for touch input.')
  await page.touchscreen.tap(
    box.x + logicalX / 560 * box.width,
    box.y + logicalY / 464 * box.height,
  )
  await page.waitForTimeout(180)
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
  throw new Error(`Timed out waiting for browser state (${lastState?.mode ?? 'unknown'} / ${lastState?.screen ?? 'unknown'} / ${lastState?.errorCode ?? 'no-error'} / ${lastState?.error || 'no-message'}).`)
}

function captureErrors(page, target, label) {
  page.on('pageerror', (error) => target.push(`${label}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (label === 'locked-probe' && message.text().includes('status of 522')) return
    target.push(`${label}: ${message.text()}`)
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
