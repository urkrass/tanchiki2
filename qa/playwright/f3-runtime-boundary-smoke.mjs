import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const port = 5700 + Math.floor(Math.random() * 300)
const baseUrl = `http://127.0.0.1:${port}/?skipSplash=1`
const outputRoot = 'output/f3-runtime-boundary'
const viteCli = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))
const preview = spawn(
  process.execPath,
  [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

let previewOutput = ''
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk.toString()
})
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk.toString()
})

try {
  await mkdir(outputRoot, { recursive: true })
  await waitForHttp(baseUrl)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } })
  const browserMessages = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserMessages.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => {
    browserMessages.push({ type: 'pageerror', text: error.message })
  })

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function')
    await page.locator('.game-canvas').focus()

    const initialState = await readState(page)
    const initialChunks = await loadedJavaScriptChunks(page)
    assert(initialState.readableText?.screen === 'main-menu', 'production boot did not reach the main menu')
    assert(initialChunks.length === 1, `offline boot loaded ${initialChunks.length} JavaScript chunks`)
    assert(
      initialChunks.every((file) => !file.startsWith('onlineRuntime-')),
      `offline boot requested the online runtime: ${initialChunks.join(', ')}`,
    )
    await page.screenshot({ path: `${outputRoot}/main-menu.png` })

    await moveSelection(page, initialState.menu.selectedIndex, 3)
    await confirm(page)
    await page.waitForFunction(
      () => performance.getEntriesByType('resource')
        .some((entry) => entry.name.split('/').at(-1)?.startsWith('onlineRuntime-')),
      null,
      { timeout: 5000 },
    )
    const onlineMenuState = await readState(page)
    const onlineMenuChunks = await loadedJavaScriptChunks(page)
    assert(onlineMenuState.readableText?.screen === 'online-menu', 'Online Battle menu did not open')
    assert(
      onlineMenuChunks.filter((file) => file.startsWith('onlineRuntime-')).length === 1,
      `online route did not load exactly one runtime chunk: ${onlineMenuChunks.join(', ')}`,
    )
    await page.screenshot({ path: `${outputRoot}/online-menu.png` })

    await confirm(page)
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text())
      return state.mode === 'online-battle' && state.screen === 'room-entry' && state.intent === 'create'
    })
    const roomEntryState = await readState(page)
    const roomEntryChunks = await loadedJavaScriptChunks(page)
    assert(roomEntryState.connection === 'idle', `unexpected room-entry connection ${roomEntryState.connection}`)
    assert(
      roomEntryChunks.length === onlineMenuChunks.length,
      'opening Field Briefing requested another JavaScript chunk',
    )
    assert(browserMessages.length === 0, `blocking browser messages: ${JSON.stringify(browserMessages)}`)
    await page.screenshot({ path: `${outputRoot}/field-briefing.png` })

    const summary = {
      status: 'F3_RUNTIME_BOUNDARY_SMOKE_PASSED',
      initial: {
        screen: initialState.readableText.screen,
        chunks: initialChunks,
      },
      onlineMenu: {
        screen: onlineMenuState.readableText.screen,
        chunks: onlineMenuChunks,
      },
      roomEntry: {
        screen: roomEntryState.screen,
        intent: roomEntryState.intent,
        connection: roomEntryState.connection,
        chunks: roomEntryChunks,
      },
      browserMessages,
    }
    await writeFile(`${outputRoot}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
    console.log(summary.status)
  } finally {
    await browser.close()
  }
} finally {
  preview.kill()
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function loadedJavaScriptChunks(page) {
  return page.evaluate(() => performance.getEntriesByType('resource')
    .filter((entry) => entry.name.endsWith('.js'))
    .map((entry) => entry.name.split('/').at(-1))
    .filter(Boolean)
    .sort())
}

async function moveSelection(page, currentIndex, targetIndex) {
  const optionCount = 6
  const downSteps = (targetIndex - currentIndex + optionCount) % optionCount
  const upSteps = (currentIndex - targetIndex + optionCount) % optionCount
  const key = downSteps <= upSteps ? 'ArrowDown' : 'ArrowUp'
  const steps = Math.min(downSteps, upSteps)
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press(key)
    await page.waitForTimeout(50)
  }
}

async function confirm(page) {
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)
}

async function waitForHttp(url) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      throw new Error(`Vite preview exited early (${preview.exitCode}):\n${previewOutput}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for ${url}\n${previewOutput}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
