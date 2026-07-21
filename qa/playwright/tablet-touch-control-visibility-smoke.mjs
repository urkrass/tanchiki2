import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 6600 + Math.floor(Math.random() * 200)
const baseUrl = `http://127.0.0.1:${port}/`
const outRootIndex = process.argv.indexOf('--out-root')
const outRoot = outRootIndex >= 0
  ? process.argv[outRootIndex + 1]
  : 'output/tablet-touch-control-visibility-smoke'
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
      consoleMessages.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: error.message }))

  await page.goto(`${baseUrl}?skipSplash=1&touch=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')

  // Create a resumable Campaign run.
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  assert((await readState(page)).mode === 'playing', 'Campaign did not start')
  await press(page, 'Escape')
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  assert((await readState(page)).mode === 'main-menu', 'Campaign did not save and quit')

  // Enter Boot Camp far enough to leave a live director, then resume Campaign.
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  const tutorial = await readState(page)
  assert(tutorial.mode === 'playing' && tutorial.runKind === 'tutorial', 'Boot Camp did not start')
  assert(tutorial.tutorial.playerControlHeld === true, 'Boot Camp did not retain its blocking opening order')
  await press(page, 'Escape')
  await press(page, 'ArrowDown')
  await press(page, 'Enter')
  await press(page, 'Escape')
  await press(page, 'Enter')

  const resumed = await readState(page)
  const rightRail = page.locator('.touch-side-rail--right')
  const labels = resumed.readableText.touch.labels
  assert(resumed.mode === 'playing' && resumed.runKind === 'campaign', 'Saved Campaign did not resume')
  assert(resumed.tutorial.active === false, 'Campaign retained an active tutorial snapshot')
  assert(resumed.tutorial.dialogue === null, 'Campaign retained stale tutorial dialogue')
  assert(resumed.tutorial.playerControlHeld === false, 'Campaign retained stale tutorial control hold')
  assert(await rightRail.getAttribute('aria-hidden') !== 'true', 'Fire rail stayed hidden after Campaign resume')
  assert(labels.includes('Fire with fire rail'), `Fire control missing: ${JSON.stringify(labels)}`)
  assert(labels.includes('Hold Relay above joystick'), `Relay control missing: ${JSON.stringify(labels)}`)
  assert(labels.includes('Slide Mod upward right of Fire'), `Major Mod control missing: ${JSON.stringify(labels)}`)

  await page.screenshot({ path: `${outRoot}/campaign-controls-restored.png`, fullPage: true })
  await writeFile(`${outRoot}/campaign-controls-restored-state.json`, `${JSON.stringify(resumed, null, 2)}\n`)
  const blockingConsoleMessages = consoleMessages.filter(
    (message) => !(message.type === 'warning' && message.text.includes('The AudioContext was not allowed to start')),
  )
  const evidence = {
    outcome: 'TABLET_TOUCH_CONTROL_VISIBILITY_SMOKE_PASSED',
    runKind: resumed.runKind,
    tutorial: resumed.tutorial,
    touchLabels: labels,
    rightRailAriaHidden: await rightRail.getAttribute('aria-hidden'),
    blockingConsoleMessages,
  }
  await writeFile(`${outRoot}/summary.json`, `${JSON.stringify(evidence, null, 2)}\n`)
  assert(blockingConsoleMessages.length === 0, `Browser errors: ${JSON.stringify(blockingConsoleMessages)}`)
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser?.close()
  server.kill()
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
