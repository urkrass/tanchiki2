import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6800 + Math.floor(Math.random() * 150)
const baseUrl = `http://127.0.0.1:${port}/`
const outRootIndex = process.argv.indexOf('--out-root')
const outRoot = outRootIndex >= 0
  ? process.argv[outRootIndex + 1]
  : 'output/stationary-pivot-smoke'
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

const browserErrors = []
let browser

try {
  await mkdir(outRoot, { recursive: true })
  await waitForHttp(baseUrl)
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 711 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserErrors.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', text: error.message }))

  await page.goto(`${baseUrl}?skipSplash=1&touch=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  await startCampaign(page)

  const initial = await readState(page)
  assert(initial.mode === 'playing', `Campaign did not start: ${initial.mode}`)
  assert(initial.player.dir === 'up', `Expected initial up facing, received ${initial.player.dir}`)
  const initialCell = { col: initial.player.col, row: initial.player.row }

  const rail = page.locator('.touch-side-rail--left')
  const railBox = await rail.boundingBox()
  if (!railBox) throw new Error('Movement rail bounds are unavailable')
  const cdp = await context.newCDPSession(page)
  const rightPoint = railClientPoint(railBox, 80, 354)
  const downPoint = railClientPoint(railBox, 56, 378)

  await touchStart(cdp, rightPoint)
  await advance(page, 90)
  const tapHeld = await readState(page)
  assert(tapHeld.player.dir === 'right', 'Touch tap did not pivot immediately')
  assert(tapHeld.player.moving === false, 'Touch tap moved before the hold threshold')
  assert(tapHeld.player.pivot.active === true, 'Touch tap did not expose active pivot progress')
  assert(tapHeld.player.pivot.progress > 0 && tapHeld.player.pivot.progress < 1, 'Pivot progress is not bounded')
  await page.screenshot({ path: `${outRoot}/tablet-pivot-held.png`, fullPage: true })
  await touchEnd(cdp)
  await advance(page, 35)

  const tapped = await readState(page)
  assert(tapped.player.dir === 'right', 'Released tap lost its new facing')
  assert(tapped.player.moving === false, 'Released tap forced movement')
  assert(tapped.player.pivot.active === false, 'Released tap retained transient pivot state')
  assert(tapped.player.col === initialCell.col && tapped.player.row === initialCell.row, 'Released tap changed cell')

  await touchStart(cdp, downPoint)
  await advance(page, 100)
  const beforeThreshold = await readState(page)
  assert(beforeThreshold.player.dir === 'down', 'Held direction did not pivot immediately')
  assert(beforeThreshold.player.moving === false, 'Held direction moved before 160ms')
  await advance(page, 80)
  const afterThreshold = await readState(page)
  assert(afterThreshold.player.moving === true, 'Held direction did not move after 160ms')
  assert(afterThreshold.player.pivot.active === false, 'Movement retained completed pivot state')
  await touchEnd(cdp)
  await advance(page, 520)

  const completed = await readState(page)
  assert(completed.player.col === initialCell.col, 'Vertical hold changed column')
  assert(completed.player.row === initialCell.row + 1, 'Vertical hold did not complete exactly one tile')
  assert(completed.player.moving === false, 'Released hold did not settle after one tile')

  await page.screenshot({ path: `${outRoot}/tablet-pivot-settled.png`, fullPage: true })
  await writeFile(`${outRoot}/tablet-pivot-state.json`, `${JSON.stringify({
    initial: initial.player,
    tapHeld: tapHeld.player,
    tapped: tapped.player,
    beforeThreshold: beforeThreshold.player,
    afterThreshold: afterThreshold.player,
    completed: completed.player,
  }, null, 2)}\n`)

  const blockingErrors = browserErrors.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const summary = {
    outcome: 'STATIONARY_PIVOT_TABLET_SMOKE_PASSED',
    thresholdSeconds: tapped.player.pivot.holdSeconds,
    initialCell,
    completedCell: { col: completed.player.col, row: completed.player.row },
    blockingErrors,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  assert(blockingErrors.length === 0, `Browser errors: ${JSON.stringify(blockingErrors)}`)
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

async function startCampaign(page) {
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
}

function railClientPoint(box, logicalX, logicalY) {
  return {
    x: box.x + logicalX / 112 * box.width,
    y: box.y + logicalY / 464 * box.height,
  }
}

async function touchStart(cdp, point) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...point, radiusX: 2, radiusY: 2, force: 1, id: 1 }],
  })
}

async function touchEnd(cdp) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function press(page, key) {
  await page.keyboard.press(key)
  await advance(page, 160)
}

async function advance(page, ms) {
  await page.evaluate((value) => window.advanceTime(value), ms)
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function waitForHttp(url) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Vite did not start at ${url}\n${serverOutput}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
