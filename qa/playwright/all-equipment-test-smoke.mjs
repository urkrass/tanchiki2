import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/'
const outputDir = path.resolve(process.argv[3] ?? 'output/all-equipment-test-smoke')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  const url = new URL(baseUrl)
  url.searchParams.set('devLevel', 'all_mods_test')
  await page.goto(url.toString(), { waitUntil: 'networkidle' })
  await page.locator('canvas').focus()
  await page.evaluate(() => window.advanceTime(80))

  const ready = await readState()
  assert(ready.mode === 'playing', 'All Equipment Test Range did not start in play')
  assert(ready.level.name === 'All Equipment Test Range', `Unexpected level: ${ready.level.name}`)
  assert(ready.player.classId === 'battle', `Test Tank must use the heavy tank shell profile, got ${ready.player.classId}`)
  assert(ready.player.shield === 3, `Test Tank must start with three visible shield points, got ${ready.player.shield}`)
  assert(
    ready.deployables.available.join(',') === 'decoy,tripwire,mine,steel',
    `Test Tank equipment mismatch: ${ready.deployables.available.join(',')}`,
  )
  assert(ready.portableRelay.limit === 2, `Test Tank relay limit must be 2, got ${ready.portableRelay.limit}`)
  assert(ready.readableText.hud.classKit.startsWith('TEST TANK KIT'), 'Test Tank HUD label is missing')
  assert(
    ready.readableText.hud.classKit.includes('1 DECOY 1/1 READY | 2 WIRE 1/1 READY | 3 MINE 1/1 READY | 4 TRAP 1/1 READY'),
    `Test Tank slot order is incorrect: ${ready.readableText.hud.classKit}`,
  )
  await capture('ready-all-equipment')

  for (const scenario of [
    { key: 'Digit1', kind: 'decoy' },
    { key: 'Digit2', kind: 'tripwire' },
    { key: 'Digit3', kind: 'mine' },
    { key: 'Digit4', kind: 'steel' },
  ]) {
    await page.keyboard.down(scenario.key)
    await page.evaluate(() => window.advanceTime(430))
    const holding = await readState()
    assert(holding.deployables.hold?.kind === scenario.kind, `${scenario.kind} did not enter HOLD`)
    await page.evaluate(() => window.advanceTime(620))
    await page.keyboard.up(scenario.key)
    await page.evaluate(() => window.advanceTime(80))
    const placed = await readState()
    assert(
      placed.deployables.active.some((deployable) => deployable.kind === scenario.kind),
      `${scenario.kind} was not placed`,
    )
    await moveOneCell('ArrowRight')
  }

  const allPlaced = await readState()
  assert(allPlaced.deployables.active.length === 4, `Expected four placed equipment objects, got ${allPlaced.deployables.active.length}`)
  await capture('all-deployables-placed')

  await page.keyboard.down('KeyE')
  await page.evaluate(() => window.advanceTime(620))
  const relayHolding = await readState()
  assert(relayHolding.portableRelay.hold?.action === 'place', 'Relay did not enter HOLD')
  await page.evaluate(() => window.advanceTime(720))
  await page.keyboard.up('KeyE')
  await page.evaluate(() => window.advanceTime(80))
  const relayPlaced = await readState()
  assert(relayPlaced.portableRelay.activeCount === 1, 'Relay was not placed')
  assert(relayPlaced.portableRelay.limit - relayPlaced.portableRelay.activeCount === 1, 'Relay remaining quantity is incorrect')
  assert(!relayPlaced.readableText.hud.classKit.includes('RELAY'), 'Universal Relay leaked into the class strip')
  await capture('all-equipment-and-relay')

  await page.keyboard.down('Space')
  await page.evaluate(() => window.advanceTime(20))
  await page.keyboard.up('Space')
  await page.evaluate(() => window.advanceTime(45))
  const fired = await readState()
  assert(fired.player.shells === 9, 'HE fire did not consume the shared shell count')
  assert(
    fired.bullets.some((bullet) => bullet.splashDamage === 1 && bullet.splashRadius === 40),
    'Test Tank projectile lost the Battle Tank HE behavior',
  )
  await capture('he-projectile')
  await page.evaluate(() => window.advanceTime(210))
  await capture('he-impact')

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
}

async function moveOneCell(key) {
  await page.keyboard.down(key)
  await page.evaluate(() => window.advanceTime(20))
  await page.keyboard.up(key)
  await page.evaluate(() => window.advanceTime(520))
}

async function capture(name) {
  await page.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), await page.evaluate(() => window.render_game_to_text()))
}

async function readState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
