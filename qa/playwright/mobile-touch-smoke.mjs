import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const phase = readArg('--phase') ?? 'after'
const port = 5700 + Math.floor(Math.random() * 300)
const url = `http://127.0.0.1:${port}/`
const outRoot = readArg('--out-root') ?? `output/i14-mobile-touch-polish/${phase}`
const gameplayDir = `${outRoot}/mobile-touch-gameplay`
const pauseDir = `${outRoot}/mobile-pause-restart`
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

let browser

try {
  await mkdir(gameplayDir, { recursive: true })
  await mkdir(pauseDir, { recursive: true })
  await waitForHttp(url)

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const consoleMessages = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => {
    consoleMessages.push({ type: 'pageerror', text: error.message })
  })

  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('canvas').click({ position: { x: 12, y: 12 } })

  const gameplay = await reachGameplay(page)
  const box = await page.locator('canvas').boundingBox()
  if (!box) throw new Error('Missing canvas box')

  const up = logicalToViewport(box, 128, 346)
  const fire = logicalToViewport(box, 404, 372)
  const pause = logicalToViewport(box, 512, 334)

  await dispatchPointer(page, 'pointerdown', 1, up)
  await advance(page, 180)
  const heldUp = await readState(page)
  await dispatchPointer(page, 'pointerdown', 2, fire)
  await advance(page, 120)
  const multiHeld = await readState(page)
  await page.screenshot({ path: `${gameplayDir}/shot-0.png` })
  await dispatchPointer(page, 'pointerup', 2, fire)
  await advance(page, 100)
  const afterFireRelease = await readState(page)
  await dispatchPointer(page, 'pointerup', 1, up)
  await advance(page, 120)
  const released = await readState(page)

  await dispatchPointer(page, 'pointerdown', 3, pause)
  await dispatchPointer(page, 'pointerup', 3, pause)
  await advance(page, 140)
  await page.keyboard.press('ArrowDown')
  await advance(page, 80)
  await page.keyboard.press('ArrowDown')
  await advance(page, 80)
  const pauseRestart = await readState(page)
  await page.screenshot({ path: `${pauseDir}/shot-0.png` })

  const evidence = {
    reachedNormalPlay: gameplay.mode === 'playing',
    touchControlsVisible: multiHeld.feedback?.touchControlsVisible === true,
    heldFeedback: {
      up: multiHeld.feedback?.heldButtons?.up === true,
      fire: multiHeld.feedback?.heldButtons?.fire === true,
    },
    multiTouchPreserved:
      afterFireRelease.feedback?.heldButtons?.up === true &&
      afterFireRelease.feedback?.heldButtons?.fire === false &&
      released.feedback?.heldButtons?.up === false,
    fireTriggered: multiHeld.runStats?.shotsFired > gameplay.runStats?.shotsFired,
    pauseRestartCopy: pauseRestart.menu?.helper?.[0] ?? '',
  }

  await writeFile(
    `${gameplayDir}/state-0.json`,
    `${JSON.stringify({ gameplay, heldUp, multiHeld, afterFireRelease, released, evidence, consoleMessages }, null, 2)}\n`,
  )
  await writeFile(
    `${pauseDir}/state-0.json`,
    `${JSON.stringify({ pauseRestart, evidence: { pauseRestartCopy: evidence.pauseRestartCopy }, consoleMessages }, null, 2)}\n`,
  )

  if (consoleMessages.length > 0) {
    throw new Error(`Console warnings/errors observed: ${JSON.stringify(consoleMessages)}`)
  }
  if (!evidence.reachedNormalPlay) {
    throw new Error(`Expected normal gameplay, got ${gameplay.mode}`)
  }
  if (!evidence.touchControlsVisible) {
    throw new Error('Expected touch controls to be visible in mobile context')
  }
  if (!evidence.heldFeedback.up || !evidence.heldFeedback.fire) {
    throw new Error(`Expected held up+fire feedback, got ${JSON.stringify(multiHeld.feedback?.heldButtons)}`)
  }
  if (!evidence.multiTouchPreserved) {
    throw new Error(`Multi-touch release semantics changed: ${JSON.stringify({ afterFireRelease, released })}`)
  }
  if (!evidence.fireTriggered) {
    throw new Error('Expected held fire touch to trigger gameplay fire')
  }
  if (!evidence.pauseRestartCopy.includes('Tap Restart')) {
    throw new Error(`Expected touch-specific restart copy, got: ${evidence.pauseRestartCopy}`)
  }

  console.log(JSON.stringify({
    outcome: 'MOBILE_TOUCH_SMOKE_PASSED',
    phase,
    screenshots: [`${gameplayDir}/shot-0.png`, `${pauseDir}/shot-0.png`],
    states: [`${gameplayDir}/state-0.json`, `${pauseDir}/state-0.json`],
    evidence,
  }, null, 2))
} finally {
  await browser?.close()
  server.kill()
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  return process.argv[index + 1] ?? null
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function advance(page, ms) {
  return JSON.parse(await page.evaluate((value) => window.advanceTime(value), ms))
}

async function press(page, key, ms = 180) {
  await page.keyboard.press(key)
  await advance(page, ms)
}

async function reachGameplay(page) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const current = await readState(page)
    if (current.mode === 'playing') return current

    if (current.mode === 'loading') {
      await advance(page, 1300)
      const loaded = await readState(page)
      if (loaded.loading?.readyToProceed) {
        await press(page, 'Enter', 180)
      }
      continue
    }

    await press(page, 'Enter', 220)
  }

  const current = await readState(page)
  throw new Error(`Unable to reach gameplay, current mode: ${current.mode}`)
}

function logicalToViewport(box, x, y) {
  return {
    x: box.x + (x / 560) * box.width,
    y: box.y + (y / 464) * box.height,
  }
}

async function dispatchPointer(page, type, pointerId, point) {
  await page.evaluate(({ type, pointerId, x, y }) => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('Missing canvas')
    canvas.setPointerCapture = () => {}
    canvas.releasePointerCapture = () => {}
    canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      isPrimary: pointerId === 1,
    }))
  }, { type, pointerId, x: point.x, y: point.y })
}

async function waitForHttp(targetUrl) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error(`Timed out waiting for Vite at ${targetUrl}\n${serverOutput}`)
}
