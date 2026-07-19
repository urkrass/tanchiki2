import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?skipSplash=1'
const outputDir = path.resolve(process.argv[3] ?? 'output/start-menu-garage-smoke')
const mobile = process.argv[4] === 'mobile'
const LOGICAL_WIDTH = 560
const LOGICAL_HEIGHT = 464
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 720 },
  deviceScaleFactor: 2,
  hasTouch: mobile,
})
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }))

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('canvas').focus()

  let state = await readState()
  assert(state.mode === 'main-menu', `expected main menu, received ${state.mode}`)
  assert(
    JSON.stringify(state.menu.options) === JSON.stringify([
      'Campaign',
      'Garage',
      'Online Battle',
      'Settings',
      'Encyclopedia',
    ]),
    `unexpected main-menu options: ${JSON.stringify(state.menu.options)}`,
  )
  assert(!state.menu.options.some((option) => option.startsWith('Tank:') || option.startsWith('Team:')), 'loadout entries remain on the start menu')
  await capture('main-menu')

  await selectIndex(1)
  await confirm()
  state = await readState()
  assert(state.mode === 'garage', `Garage selection opened ${state.mode}`)
  assert(state.menu.options[0] === 'Team: BLUE', 'Garage is missing the Team selector')
  assert(state.menu.options[1] === 'Tank Class: Engineer', 'Garage is missing the Tank selector')
  assert(state.menu.options[2] === 'Mods: Overdrive', 'Garage is missing its dedicated Mods entry')
  assert(state.garage.mods.length === 4, 'Garage does not expose all four Mod tabs')
  await capture('garage-overview')

  await confirm()
  state = await readState()
  assert(state.mode === 'team-select', `Team selector opened ${state.mode}`)
  await selectIndex(1)
  await confirm()
  assert((await readState()).progression.selectedTeam === 'red', 'red Team selection did not persist')
  await page.keyboard.press('Escape')
  await advance(40)

  await selectIndex(1)
  await confirm()
  state = await readState()
  assert(state.mode === 'tank-select', `Tank selector opened ${state.mode}`)
  await selectIndex(2)
  await confirm()
  assert((await readState()).progression.selectedTankClass === 'battle', 'Battle Tank selection did not persist')
  await page.keyboard.press('Escape')
  await advance(40)

  await selectIndex(2)
  await confirm()
  state = await readState()
  assert(state.mode === 'garage-mods', `Mods entry opened ${state.mode}`)

  for (const [index, name] of [[0, 'overdrive'], [1, 'pontoon'], [2, 'hedgehog'], [3, 'emp']]) {
    await selectIndex(index)
    state = await readState()
    assert(state.garage.selectedMod.kind === name, `${name} description did not follow focus`)
    assert(state.garage.selectedMod.bestUse.length > 20, `${name} is missing Best Use guidance`)
    await capture(`garage-${name}-focused`)
  }

  await confirm()
  state = await readState()
  assert(state.progression.selectedMajorMod === 'emp', 'Enter did not equip the focused EMP Mod')
  assert(state.garage.mods.filter((mod) => mod.selected).length === 1, 'Garage equipped more than one Mod')
  await capture('garage-emp-equipped')

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('canvas').focus()
  state = await readState()
  assert(state.progression.selectedTeam === 'red', 'Team selection did not survive reload')
  assert(state.progression.selectedTankClass === 'battle', 'Tank selection did not survive reload')
  assert(state.progression.selectedMajorMod === 'emp', 'Mod selection did not survive reload')
  await selectIndex(1)
  await confirm()
  await selectIndex(2)
  await confirm()

  await tapLogical(186, 168)
  await advance(180)
  state = await readState()
  assert(state.mode === 'garage-mods', 'Mod pointer selection left the Mods screen')
  assert(state.progression.selectedMajorMod === 'pontoon', 'square Pontoon tab did not equip through pointer input')
  assert(state.garage.mods.filter((mod) => mod.selected).length === 1, 'pointer selection equipped more than one Mod')
  await capture('garage-pontoon-pointer')

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
}

async function selectIndex(targetIndex) {
  const state = await readState()
  const count = state.menu.options.length
  let delta = (targetIndex - state.menu.selectedIndex + count) % count
  while (delta > 0) {
    await page.keyboard.press('ArrowDown')
    delta -= 1
  }
  await advance(20)
}

async function confirm() {
  await page.keyboard.press('Enter')
  await advance(180)
}

async function tapLogical(logicalX, logicalY) {
  const box = await page.locator('canvas').boundingBox()
  if (!box) throw new Error('canvas bounds are unavailable')
  const clientX = box.x + (logicalX / LOGICAL_WIDTH) * box.width
  const clientY = box.y + (logicalY / LOGICAL_HEIGHT) * box.height
  if (mobile) {
    await page.touchscreen.tap(clientX, clientY)
  } else {
    await page.mouse.click(clientX, clientY)
  }
}

async function advance(milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
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
