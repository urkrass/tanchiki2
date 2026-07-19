import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:5175/?devLevel=ctf_flag_test'
const outputDir = path.resolve(process.argv[3] ?? 'output/ctf-flag-visual-smoke')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('canvas').focus()
  await page.evaluate(() => window.advanceTime(80))

  await page.keyboard.down('ArrowRight')
  await page.evaluate(() => window.advanceTime(170))
  await page.keyboard.up('ArrowRight')
  await page.screenshot({ path: path.join(outputDir, 'carried.png') })
  fs.writeFileSync(path.join(outputDir, 'carried-state.json'), await page.evaluate(() => window.render_game_to_text()))

  await page.keyboard.down('ArrowRight')
  await page.evaluate(() => window.advanceTime(240))
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
