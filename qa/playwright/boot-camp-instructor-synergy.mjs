import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-instructor-synergy'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1120, height: 928 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))

await page.addInitScript(() => {
  localStorage.setItem('tanchiki.save.v1', JSON.stringify({
    schemaVersion: 1,
    progression: {
      selectedTeam: 'blue',
      selectedTankClass: 'engineer',
      bestScore: 0,
      xp: 0,
      credits: 0,
      unlockedStage: 1,
      completedLevels: [],
      tutorialCompletedMissions: [1, 2],
      selectedMajorMod: 'overdrive',
      upgrades: { armor: 0, cannon: 0, engine: 0, repairKit: 0 },
    },
    settings: { volume: 0.7, muted: false, colorSafe: false },
    resumableRun: null,
  }))
})

await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => typeof window.advanceTime === 'function')

await press('Enter')
await press('Enter')
await press('Enter')
await advance(1300)
await press('Enter')
await advanceOpeningOrders()
await advance(500)

const state = await readState()
assert(state.mode === 'playing', `expected playing, received ${state.mode}`)
assert(state.tutorial.missionId === 3, `expected mission 3, received ${state.tutorial.missionId}`)
assert(state.tutorial.stepId === 'class-tactic', `expected class-tactic step, received ${state.tutorial.stepId}`)

const squad = Object.fromEntries(
  state.enemies.filter((tank) => tank.callSign).map((tank) => [tank.callSign, tank]),
)
assert(squad.Needle?.classId === 'scout', 'Needle is not using the Scout class')
assert(squad.Spanner?.classId === 'engineer', 'Spanner is not using the Engineer class')
assert(squad.Brick?.classId === 'battle', 'Brick is not using the Battle Tank class')
assert(squad.Brick?.shield === 1, 'Brick did not receive the Battle Tank shield')
assert(state.deployables.active.some((device) => device.ownerTankId === 'instructor-needle'), 'Needle equipment is missing')
assert(state.deployables.active.some((device) => device.ownerTankId === 'instructor-spanner'), 'Spanner equipment is missing')
assert(state.majorMods.hedgehog.ownerTankId === 'instructor-spanner', 'Spanner Hedgehog ownership is missing')
assert(state.majorMods.pontoon.ownerTankId === 'instructor-brick', 'Brick Pontoon ownership is missing')

await page.locator('canvas').screenshot({ path: path.join(outputDir, 'instructor-synergy.png') })
fs.writeFileSync(path.join(outputDir, 'instructor-synergy.json'), JSON.stringify(state, null, 2))
fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
assert(errors.length === 0, `browser errors: ${JSON.stringify(errors)}`)
await browser.close()

async function press(key) {
  await page.keyboard.down(key)
  await advance(160)
  await page.keyboard.up(key)
  await advance(40)
}

async function advance(milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function advanceOpeningOrders() {
  let state = await readState()
  for (let index = 0; index < 12 && state.tutorial.stepId === 'welcome'; index += 1) {
    await press('Enter')
    state = await readState()
  }
  assert(state.tutorial.stepId !== 'welcome', 'opening orders did not advance after typewriter fast-forward')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
