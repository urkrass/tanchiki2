import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-six-mission-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const missionModes = ['defense', 'defense', 'team-battle', 'ctf', 'ffa', 'assault']
const loadouts = [
  ['engineer', 'overdrive'],
  ['scout', 'emp'],
  ['battle', 'overdrive'],
  ['scout', 'pontoon'],
  ['battle', 'hedgehog'],
  ['engineer', 'emp'],
]

const browser = await chromium.launch({ headless: true })
const summary = []

try {
  for (let missionId = 1; missionId <= 6; missionId += 1) {
    const [selectedTankClass, selectedMajorMod] = loadouts[missionId - 1]
    const context = await browser.newContext({ viewport: { width: 1120, height: 928 } })
    await context.addInitScript((save) => {
      localStorage.setItem('tanchiki.save.v1', JSON.stringify(save))
    }, createSave(
      Array.from({ length: missionId - 1 }, (_, index) => index + 1),
      selectedTankClass,
      selectedMajorMod,
    ))
    const page = await context.newPage()
    const errors = collectErrors(page)
    await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => typeof window.advanceTime === 'function')

    await press(page, 'Enter')
    await press(page, 'Enter')
    let state = await readState(page)
    assert(state.mode === 'briefing', `Mission ${missionId}: expected briefing, received ${state.mode}`)
    assert(state.tutorial.missionId === missionId, `Mission ${missionId}: selected ${state.tutorial.missionId}`)
    await capture(page, `mission-${missionId}-briefing`)

    await press(page, 'Enter')
    await advance(page, 1300)
    await press(page, 'Enter')
    state = await readState(page)
    assert(state.mode === 'playing', `Mission ${missionId}: expected playing, received ${state.mode}`)
    assert(state.objective.mode === missionModes[missionId - 1], `Mission ${missionId}: wrong mode ${state.objective.mode}`)

    await advanceOpeningOrders(page)
    await advance(page, missionId === 1 || missionId === 2 || missionId === 6 ? 700 : 450)
    state = await readState(page)
    assert(state.tutorial.activeGoal, `Mission ${missionId}: missing current training goal`)
    if (missionId === 1 || missionId === 2 || missionId === 6) {
      assert(state.tutorial.cameraControlled === true, `Mission ${missionId}: camera tour did not start`)
    }
    if (missionId === 3 || missionId === 6) {
      assert(state.tutorial.instructorLoadouts.length === 3, `Mission ${missionId}: instructor squad missing`)
    }
    await capture(page, `mission-${missionId}-playing`)

    fs.writeFileSync(path.join(outputDir, `mission-${missionId}-errors.json`), JSON.stringify(errors, null, 2))
    assert(errors.length === 0, `Mission ${missionId}: browser errors ${JSON.stringify(errors)}`)
    summary.push({
      missionId,
      mode: state.objective.mode,
      stepId: state.tutorial.stepId,
      goal: state.tutorial.activeGoal,
      cameraControlled: state.tutorial.cameraControlled,
    })
    await context.close()
  }

  const replay = await openWithSave(browser, createSave([1, 2, 3, 4, 5, 6], 'engineer', 'emp'))
  await press(replay.page, 'Enter')
  const replayState = await readState(replay.page)
  assert(replayState.mode === 'tutorial-select', 'Replay: Boot Camp selection did not open')
  assert(replayState.menu.options.length === 7, `Replay: expected six drills plus Back, received ${replayState.menu.options.length}`)
  await capture(replay.page, 'replay-selection')
  assert(replay.errors.length === 0, `Replay: browser errors ${JSON.stringify(replay.errors)}`)
  await replay.context.close()

  const campaign = await openWithSave(browser, createSave([], 'engineer', 'overdrive'))
  await press(campaign.page, 'ArrowDown')
  await press(campaign.page, 'Enter')
  const campaignState = await readState(campaign.page)
  assert(campaignState.mode === 'level-select', `Campaign skip: expected level-select, received ${campaignState.mode}`)
  assert(campaignState.runKind === 'campaign', `Campaign skip: expected campaign, received ${campaignState.runKind}`)
  await capture(campaign.page, 'campaign-skip')
  assert(campaign.errors.length === 0, `Campaign skip: browser errors ${JSON.stringify(campaign.errors)}`)
  await campaign.context.close()

  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
} finally {
  await browser.close()
}

async function openWithSave(browserInstance, save) {
  const context = await browserInstance.newContext({ viewport: { width: 1120, height: 928 } })
  await context.addInitScript((value) => {
    localStorage.setItem('tanchiki.save.v1', JSON.stringify(value))
  }, save)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  return { context, page, errors }
}

function createSave(tutorialCompletedMissions, selectedTankClass, selectedMajorMod) {
  return {
    schemaVersion: 1,
    progression: {
      selectedTeam: 'blue',
      selectedTankClass,
      bestScore: 0,
      xp: 0,
      credits: 0,
      unlockedStage: 1,
      completedLevels: [],
      tutorialCompletedMissions,
      selectedMajorMod,
      upgrades: { armor: 0, cannon: 0, engine: 0, repairKit: 0 },
    },
    settings: { volume: 0.7, muted: false, colorSafe: false },
    resumableRun: null,
  }
}

function collectErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
  })
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))
  return errors
}

async function press(page, key) {
  await page.keyboard.down(key)
  await advance(page, 160)
  await page.keyboard.up(key)
  await advance(page, 40)
}

async function advanceOpeningOrders(page) {
  let state = await readState(page)
  for (let index = 0; index < 12 && state.tutorial.stepId === 'welcome'; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  assert(state.tutorial.stepId !== 'welcome', 'Opening orders did not advance after typewriter fast-forward')
}

async function advance(page, milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function capture(page, name) {
  await page.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), await page.evaluate(() => window.render_game_to_text()))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
