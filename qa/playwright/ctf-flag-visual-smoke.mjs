import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:5175/?devLevel=ctf_flag_test'
const outputDir = path.resolve(process.argv[3] ?? 'output/ctf-flag-visual-smoke')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  for (const [direction, key] of [
    ['up', 'ArrowUp'],
    ['right', 'ArrowRight'],
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
  ]) {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('.game-canvas').focus()
    await page.evaluate(() => window.advanceTime(80))
    await page.keyboard.down(key)
    await page.evaluate(() => window.advanceTime(170))
    await page.keyboard.up(key)
    const stateText = await page.evaluate(() => window.render_game_to_text())
    const state = JSON.parse(stateText)
    await page.screenshot({ path: path.join(outputDir, `carried-${direction}.png`) })
    fs.writeFileSync(path.join(outputDir, `carried-${direction}-state.json`), stateText)

    const canvasBox = await page.locator('.game-canvas').boundingBox()
    if (!canvasBox) throw new Error('Missing canvas bounds')
    const canvasSize = await page.locator('.game-canvas').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
    }))
    const scaleX = canvasBox.width / canvasSize.width
    const scaleY = canvasBox.height / canvasSize.height
    const playerScreenX = state.player.x - state.camera.current.col * 32 + 13
    const playerScreenY = state.player.y - state.camera.current.row * 32 + 13
    const closeWidth = 92 * scaleX
    const closeHeight = 92 * scaleY
    await page.screenshot({
      path: path.join(outputDir, `carried-${direction}-close.png`),
      clip: {
        x: canvasBox.x + playerScreenX * scaleX - closeWidth / 2,
        y: canvasBox.y + playerScreenY * scaleY - closeHeight / 2,
        width: closeWidth,
        height: closeHeight,
      },
    })
  }

  const homeState = JSON.parse(await page.evaluate(() => window.render_game_to_text()))
  const homeCanvasBox = await page.locator('.game-canvas').boundingBox()
  if (!homeCanvasBox) throw new Error('Missing canvas bounds')
  const homeCanvasSize = await page.locator('.game-canvas').evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }))
  const homeScaleX = homeCanvasBox.width / homeCanvasSize.width
  const homeScaleY = homeCanvasBox.height / homeCanvasSize.height
  const homeCell = homeState.objective.flag.playerBase
  const homeScreenX = 48 + (homeCell.x - homeState.camera.current.col + 0.5) * 32
  const homeScreenY = 16 + (homeCell.y - homeState.camera.current.row + 0.5) * 32
  const homeCloseWidth = 64 * homeScaleX
  const homeCloseHeight = 64 * homeScaleY
  await page.screenshot({
    path: path.join(outputDir, 'home-flag-close.png'),
    clip: {
      x: homeCanvasBox.x + homeScreenX * homeScaleX - homeCloseWidth / 2,
      y: homeCanvasBox.y + homeScreenY * homeScaleY - homeCloseHeight / 2,
      width: homeCloseWidth,
      height: homeCloseHeight,
    },
  })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('.game-canvas').focus()
  await page.evaluate(() => window.advanceTime(80))
  await page.keyboard.down('ArrowRight')
  await page.evaluate(() => window.advanceTime(410))
  await page.keyboard.up('ArrowRight')
  await page.keyboard.press('KeyR')
  await page.keyboard.down('ArrowRight')
  await page.evaluate(() => window.advanceTime(480))
  await page.keyboard.up('ArrowRight')
  await page.screenshot({ path: path.join(outputDir, 'dropped-signal.png') })
  fs.writeFileSync(path.join(outputDir, 'dropped-state.json'), await page.evaluate(() => window.render_game_to_text()))

  await page.evaluate(() => window.advanceTime(2200))
  await page.screenshot({ path: path.join(outputDir, 'dropped-quiet.png') })
  fs.writeFileSync(path.join(outputDir, 'quiet-state.json'), await page.evaluate(() => window.render_game_to_text()))

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
}
