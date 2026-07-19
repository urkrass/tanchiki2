import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/'
const outputDir = path.resolve(process.argv[3] ?? 'output/class-equipment-smoke')
const mobileViewport = process.argv[4] === 'mobile'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: mobileViewport ? { width: 390, height: 844 } : { width: 960, height: 720 },
  deviceScaleFactor: 2,
  hasTouch: mobileViewport,
})
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  for (const scenario of [
    { tankClass: 'scout', key: 'Digit1', kind: 'decoy', slot: '1' },
    { tankClass: 'scout', key: 'Digit2', kind: 'tripwire', slot: '2' },
    { tankClass: 'engineer', key: 'Digit1', kind: 'mine', slot: '1' },
    { tankClass: 'engineer', key: 'Digit2', kind: 'steel', slot: '2' },
  ]) {
    await openClassRange(scenario.tankClass)
    await page.keyboard.down(scenario.key)
    await page.evaluate(() => window.advanceTime(450))
    const holdState = await readState()
    assert(
      holdState.deployables.hold?.kind === scenario.kind,
      `${scenario.tankClass} ${scenario.kind} did not enter its hold state`,
    )
    await capture(`${scenario.tankClass}-${scenario.kind}-hold`)

    await page.evaluate(() => window.advanceTime(600))
    await page.keyboard.up(scenario.key)
    await page.evaluate(() => window.advanceTime(80))
    const placedState = await readState()
    assert(
      placedState.deployables.active.some((deployable) => deployable.kind === scenario.kind),
      `${scenario.tankClass} ${scenario.kind} was not placed`,
    )
    assert(
      placedState.readableText.hud.classKit.includes(`${scenario.slot} ${kitLabel(scenario.kind)} 0/1 OUT`),
      `${scenario.tankClass} ${scenario.kind} remaining count did not switch to OUT`,
    )
    await moveOneCell('ArrowRight')
    await capture(`${scenario.tankClass}-${scenario.kind}-placed`)

    await page.keyboard.down(scenario.key)
    await page.evaluate(() => window.advanceTime(760))
    await page.keyboard.up(scenario.key)
    await page.evaluate(() => window.advanceTime(80))
    const recoveredState = await readState()
    assert(
      !recoveredState.deployables.active.some((deployable) => deployable.kind === scenario.kind),
      `${scenario.tankClass} ${scenario.kind} was not recovered`,
    )
    assert(
      recoveredState.readableText.hud.classKit.includes(`${scenario.slot} ${kitLabel(scenario.kind)} 1/1 READY`),
      `${scenario.tankClass} ${scenario.kind} remaining count did not return to READY`,
    )
    await capture(`${scenario.tankClass}-${scenario.kind}-recovered`)
  }

  await openClassRange('engineer')
  await page.keyboard.down('KeyE')
  await page.evaluate(() => window.advanceTime(650))
  const relayHold = await readState()
  assert(relayHold.portableRelay.hold?.action === 'place', 'portable relay did not enter its hold state')
  await capture('engineer-relay-hold')
  await page.evaluate(() => window.advanceTime(700))
  await page.keyboard.up('KeyE')
  await page.evaluate(() => window.advanceTime(80))
  const relayPlaced = await readState()
  assert(relayPlaced.portableRelay.activeCount === 1, 'portable relay was not placed')
  assert(relayPlaced.portableRelay.limit - relayPlaced.portableRelay.activeCount === 1, 'relay remaining count did not decrement')
  assert(!relayPlaced.readableText.hud.classKit.includes('RELAY'), 'universal relay leaked into the class strip')
  await moveOneCell('ArrowRight')
  await capture('engineer-relay-placed')

  for (const tankClass of ['scout', 'engineer', 'battle']) {
    await openClassRange(tankClass)
    const ready = await readState()
    assert(
      ready.readableText.hud.classKit.includes(tankClass === 'battle' ? 'HE SHELL 10/10 READY' : 'SHELLS 10/10 READY'),
      `${tankClass} shell slot is missing`,
    )
    if (tankClass === 'battle') {
      assert(ready.player.shield === 1, 'Battle Tank did not retain its existing shield point')
    }
    await capture(`${tankClass}-shell-ready`)

    await page.keyboard.down('Space')
    await page.evaluate(() => window.advanceTime(20))
    await page.keyboard.up('Space')
    await page.evaluate(() => window.advanceTime(45))
    const fired = await readState()
    assert(fired.player.shells === 9, `${tankClass} fire did not use the existing shell count`)
    assert(fired.bullets.length === 1, `${tankClass} projectile was not visible in flight`)
    if (tankClass === 'battle') {
      assert(
        fired.bullets.some((bullet) => bullet.splashDamage === 1 && bullet.splashRadius === 40),
        'Battle projectile lost its splash mechanics',
      )
    } else {
      assert(
        fired.bullets.every((bullet) => !bullet.splashDamage && !bullet.splashRadius),
        `${tankClass} projectile incorrectly gained splash mechanics`,
      )
    }
    await capture(`${tankClass}-shell-projectile`)

    if (tankClass === 'battle') {
      await page.evaluate(() => window.advanceTime(190))
      const impact = await readState()
      assert(impact.bullets.length === 0, 'HE projectile did not resolve against the visual-range wall')
      await capture('battle-he-impact')
    }
  }

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
}

async function openClassRange(tankClass) {
  const url = new URL(baseUrl)
  url.searchParams.set('devLevel', 'class_kit_test')
  url.searchParams.set('tankClass', tankClass)
  await page.goto(url.toString(), { waitUntil: 'networkidle' })
  await page.locator('canvas').focus()
  await page.evaluate(() => window.advanceTime(80))
  const state = await readState()
  assert(state.mode === 'playing', `${tankClass} class range did not start in play`)
  assert(state.player.classId === tankClass, `${tankClass} class range selected ${state.player.classId}`)
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

function kitLabel(kind) {
  if (kind === 'steel') return 'TRAP'
  if (kind === 'tripwire') return 'WIRE'
  return kind.toUpperCase()
}
