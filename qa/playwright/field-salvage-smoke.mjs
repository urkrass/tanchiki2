import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4179'
const outputDir = path.resolve(process.argv[3] ?? 'output/field-salvage/smoke')
const url = `${baseUrl}/?devLevel=field_salvage_test&tankClass=battle`

fs.mkdirSync(outputDir, { recursive: true })

const errors = []
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1120, height: 928 } })
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`page: ${String(error)}`))

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')

  await destroyTarget(page)
  let state = await readState(page)
  assert(state.runStats.playerKills === 1, 'target destruction did not register')
  assert(state.wrecks.length === 1 && state.wrecks[0].phase === 'salvageable', 'fresh wreck missing')
  await capture(page, '01-fresh-wreck.png', state)

  await page.keyboard.down('ArrowUp')
  await advance(page, 1200)
  await page.keyboard.up('ArrowUp')
  await advance(page, 1900)
  state = await readState(page)
  assert(state.player.col === 4 && state.player.row === 12, 'wreck did not block the player at salvage distance')
  assert(state.player.salvage.active === true, 'adjacent stationary player did not begin salvage')
  assert(state.readableText.hud.salvage.startsWith('SALVAGING'), 'text snapshot omitted active salvage')
  await capture(page, '02-active-salvage.png', state)

  await advance(page, 1800)
  state = await readState(page)
  assert(state.player.shells === 9, 'slow wreck ammunition recovery did not complete')
  assert(state.runStats.wreckShellsRecovered === 1, 'salvage shell stat did not register')
  await capture(page, '03-shell-recovered.png', state)

  await advance(page, 17000)
  state = await readState(page)
  assert(state.wrecks.length === 1 && state.wrecks[0].phase === 'burned', 'wreck did not enter burned blocking phase')
  await capture(page, '04-burned-wreck.png', state)

  await advance(page, 8000)
  state = await readState(page)
  assert(state.wrecks.length === 0, 'burned wreck did not decay away')
  await capture(page, '05-decayed-route.png', state)

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  await destroyTarget(page)
  await advance(page, 1700)
  await press(page, 'Space')
  await advance(page, 500)
  state = await readState(page)
  assert(state.wrecks.length === 0, 'direct denial fire did not clear the wreck')
  assert(state.runStats.wrecksCleared === 1, 'wreck clear stat did not register')
  assert(state.score === 100, 'wreck denial incorrectly awarded score')
  await capture(page, '06-denial-fire.png', state)

  if (errors.length > 0) {
    throw new Error(`Browser errors:\n${errors.join('\n')}`)
  }
  fs.writeFileSync(path.join(outputDir, 'errors.json'), '[]\n')
  process.stdout.write(`${JSON.stringify({ ok: true, captures: 6, errors: 0 })}\n`)
} catch (error) {
  fs.writeFileSync(path.join(outputDir, 'errors.json'), `${JSON.stringify(errors, null, 2)}\n`)
  throw error
} finally {
  await browser.close()
}

async function destroyTarget(targetPage) {
  await press(targetPage, 'Space')
  await advance(targetPage, 1750)
  await press(targetPage, 'Space')
  await advance(targetPage, 250)
}

async function press(targetPage, key) {
  await targetPage.keyboard.down(key)
  await advance(targetPage, 20)
  await targetPage.keyboard.up(key)
  await advance(targetPage, 20)
}

async function advance(targetPage, milliseconds) {
  await targetPage.evaluate((duration) => window.advanceTime(duration), milliseconds)
}

async function readState(targetPage) {
  return JSON.parse(await targetPage.evaluate(() => window.render_game_to_text()))
}

async function capture(targetPage, filename, state) {
  const canvas = targetPage.locator('.game-canvas')
  await canvas.screenshot({ path: path.join(outputDir, filename) })
  fs.writeFileSync(
    path.join(outputDir, filename.replace(/\.png$/, '.json')),
    `${JSON.stringify(state, null, 2)}\n`,
  )
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
