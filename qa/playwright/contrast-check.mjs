import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 5300 + Math.floor(Math.random() * 400)
const url = `http://127.0.0.1:${port}/`
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''
server.stdout.on('data', (chunk) => {
  output += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  output += chunk.toString()
})

try {
  await waitForHttp(url)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } })
  await page.goto(url)
  await page.locator('canvas').click()
  await page.waitForTimeout(350)

  await reachGameplay(page)

  await page.evaluate(() => window.advanceTime(500))
  const state = await readState(page)

  if (state.mode !== 'playing') {
    throw new Error(`Unable to reach gameplay for contrast check, current mode: ${state.mode}`)
  }

  const metrics = await page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text())
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('Missing game canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Missing 2D context')

    const player = state.player
    const camera = state.camera?.current ?? { col: 0, row: 0 }
    const centerX = Math.round(player.x + 13 - camera.col * 32)
    const centerY = Math.round(player.y + 13 - camera.row * 32)
    const box = {
      x: Math.max(0, centerX - 16),
      y: Math.max(0, centerY - 16),
      w: 32,
      h: 32,
    }
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)

    function sampleRect(rect, skipInner) {
      let count = 0
      let luminance = 0
      let chroma = 0
      let dark = 0

      for (let y = rect.y; y < Math.min(canvas.height, rect.y + rect.h); y += 1) {
        for (let x = rect.x; x < Math.min(canvas.width, rect.x + rect.w); x += 1) {
          if (
            skipInner &&
            x >= box.x &&
            x < box.x + box.w &&
            y >= box.y &&
            y < box.y + box.h
          ) {
            continue
          }
          const offset = (y * canvas.width + x) * 4
          const r = image.data[offset]
          const g = image.data[offset + 1]
          const b = image.data[offset + 2]
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
          const c = Math.max(r, g, b) - Math.min(r, g, b)
          luminance += l
          chroma += c
          if (l < 36) dark += 1
          count += 1
        }
      }

      return {
        chroma: chroma / count,
        darkFraction: dark / count,
        luminance: luminance / count,
      }
    }

    const tank = sampleRect(box, false)
    const ring = sampleRect({ x: box.x - 5, y: box.y - 5, w: box.w + 10, h: box.h + 10 }, true)
    const hudIcon = sampleRect({ x: 435, y: 306, w: 7, h: 7 }, false)
    const hudSurface = sampleRect({ x: 418, y: 300, w: 8, h: 18 }, false)

    return {
      box,
      chromaDelta: tank.chroma - ring.chroma,
      darkOutlineFraction: tank.darkFraction,
      hud: {
        chromaDelta: hudIcon.chroma - hudSurface.chroma,
        darkOutlineFraction: hudIcon.darkFraction,
        icon: hudIcon,
        luminanceDelta: Math.abs(hudIcon.luminance - hudSurface.luminance),
        surface: hudSurface,
      },
      luminanceDelta: Math.abs(tank.luminance - ring.luminance),
      ring,
      tank,
    }
  })

  await mkdir('qa/artifacts', { recursive: true })
  await page.screenshot({ path: 'qa/artifacts/contrast-check.png' })
  await browser.close()

  const readable =
    metrics.darkOutlineFraction >= 0.07 &&
    (metrics.luminanceDelta >= 18 || metrics.chromaDelta >= 18)
  const hudReadable =
    metrics.hud.darkOutlineFraction >= 0.12 ||
    metrics.hud.luminanceDelta >= 24 ||
    metrics.hud.chromaDelta >= 32

  if (!readable || !hudReadable) {
    throw new Error(`Visual contrast too low: ${JSON.stringify({ tankReadable: readable, hudReadable, metrics })}`)
  }

  console.log(`contrast ok ${JSON.stringify(metrics)}`)
} finally {
  server.kill()
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function reachGameplay(page) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const state = await readState(page)
    if (state.mode === 'playing') return

    if (state.mode === 'loading') {
      if (state.loading?.readyToProceed) {
        await page.keyboard.press('Enter')
      }
      await page.evaluate(() => window.advanceTime(220))
      continue
    }

    if (['garage', 'settings', 'team-select', 'how-to-play', 'online-menu'].includes(state.mode)) {
      await page.keyboard.press('Escape')
      await page.evaluate(() => window.advanceTime(160))
      continue
    }

    const options = state.menu?.options ?? []
    if (state.mode === 'main-menu' && options.length > 0) {
      const targetIndex = options.findIndex((option) => option.toLowerCase().includes('new game'))
      if (targetIndex >= 0) {
        await moveSelection(page, state.menu.selectedIndex, targetIndex)
      }
    }

    await page.keyboard.press('Enter')
    await page.evaluate(() => window.advanceTime(180))
  }
}

async function moveSelection(page, fromIndex, toIndex) {
  const key = toIndex > fromIndex ? 'ArrowDown' : 'ArrowUp'
  for (let step = 0; step < Math.abs(toIndex - fromIndex); step += 1) {
    await page.keyboard.press(key)
    await page.evaluate(() => window.advanceTime(80))
  }
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

  throw new Error(`Timed out waiting for Vite at ${targetUrl}\n${output}`)
}
