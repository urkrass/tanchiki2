import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-objective-repair-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  await verifyCtfTransferCheckpoint()
  await verifyGraduationCoreCompletion()
} finally {
  await browser.close()
}

async function verifyCtfTransferCheckpoint() {
  const scenario = await openMission([1, 2, 3], 'scout', 'pontoon')
  const { context, page, errors } = scenario

  await launchSelectedMission(page, 4)
  await advanceOpeningOrders(page)
  await settleCurrentNarration(page, 'pickup')
  await hold(page, 'ArrowUp', 5200)

  let state = await readState(page)
  assert(state.objective.flag?.carrierId === 'player', 'CTF: player did not take the enemy flag')
  assert(state.objective.flag?.transfer?.gateClosed === true, 'CTF: theft did not seal the checkpoint')
  assert(state.tutorial.stepId === 'transfer', `CTF: expected transfer lesson, received ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraLabel === 'Flag transfer gate', `CTF: wrong camera target ${state.tutorial.cameraLabel}`)

  for (let index = 0; index < 16 && state.tutorial.cameraControlled; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.tutorial.cameraControlled === false, 'CTF: transfer camera did not return to player follow')
  await settleCurrentNarration(page, 'transfer')

  await press(page, 'KeyR')
  state = await readState(page)
  assert(state.objective.flag?.carrierId === 'player', 'CTF: flag could be transferred away from the marked pad')

  await hold(page, 'ArrowDown', 3000)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 7, `CTF: checkpoint did not stop the carrier at the north pad: ${state.player.col},${state.player.row}`)
  assert(state.readableText.levelMarkers.labels.includes('XFER'), 'CTF: XFER marker was not exposed in readable state')
  await capture(page, 'ctf-north-transfer-pad')

  await press(page, 'KeyR')
  await advance(page, 200)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === null, 'CTF: transfer did not release the carried flag')
  assert(state.objective.flag?.position?.x === 10 && state.objective.flag?.position?.y === 9, 'CTF: flag did not arrive on the south pad')
  assert(state.objective.flag?.transfer?.complete === true, 'CTF: transfer did not complete')
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: checkpoint did not reopen')
  assert(state.tutorial.stepId === 'recover', `CTF: expected recovery lesson, received ${state.tutorial.stepId}`)
  await capture(page, 'ctf-flag-through-checkpoint')

  await settleCurrentNarration(page, 'recover')
  await hold(page, 'ArrowDown', 1200)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === 'player', 'CTF: player did not recover the transferred flag')
  assert(state.tutorial.stepId === 'capture', `CTF: recovery did not advance to capture, received ${state.tutorial.stepId}`)

  await settleCurrentNarration(page, 'capture')
  await hold(page, 'ArrowDown', 3200)
  state = await readState(page)
  assert(state.objective.flag?.captures === 1, `CTF: expected one capture, received ${state.objective.flag?.captures}`)
  await settleCurrentNarration(page, 'capture')
  state = await readState(page)
  assert(state.mode === 'level-complete', `CTF: drill did not finish, received ${state.mode}`)
  await capture(page, 'ctf-drill-complete')

  writeErrors('ctf', errors)
  assert(errors.length === 0, `CTF browser errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyGraduationCoreCompletion() {
  const scenario = await openMission([1, 2, 3, 4, 5], 'engineer', 'emp')
  const { context, page, errors } = scenario

  await launchSelectedMission(page, 6)
  await advanceOpeningOrders(page)

  let state = await readState(page)
  for (let index = 0; index < 16 && state.tutorial.stepId === 'reveal'; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  if (state.tutorial.stepId === 'reveal') {
    await settleCurrentNarration(page, 'reveal')
  }
  state = await readState(page)
  assert(state.tutorial.stepId === 'adaptive', `Assault: expected adaptive lesson, received ${state.tutorial.stepId}`)

  await settleCurrentNarration(page, 'adaptive')
  await press(page, 'KeyX')
  await advance(page, 200)
  state = await readState(page)
  assert(state.tutorial.stepId === 'core', `Assault: expected core objective, received ${state.tutorial.stepId}`)

  await hold(page, 'ArrowLeft', 300)
  await hold(page, 'ArrowUp', 5600)
  await hold(page, 'ArrowRight', 300)
  state = await readState(page)
  await capture(page, 'assault-core-approach')
  assert(state.player.col === 10 && state.player.row === 3, `Assault: core approach ended at ${state.player.col},${state.player.row}`)
  assert(state.objective.assault?.cell?.x === 10 && state.objective.assault?.cell?.y === 2, 'Assault: marker is not aligned with the core tile')
  for (let index = 0; index < 3 && (state.objective.assault?.hp ?? 0) > 0; index += 1) {
    const previousHp = state.objective.assault.hp
    await press(page, 'Space')
    await advance(page, 350)
    state = await readState(page)
    assert(state.objective.assault?.hp < previousHp, `Assault: shell did not damage the core: ${state.objective.assault?.hp}`)
    if ((state.objective.assault?.hp ?? 0) > 0) {
      await advance(page, 2100)
    }
  }
  assert(state.objective.assault?.hp === 0, `Assault: command core remained at ${state.objective.assault?.hp} HP`)
  await capture(page, 'assault-core-destroyed')

  await settleCurrentNarration(page, 'core')
  state = await readState(page)
  assert(state.mode === 'tutorial-complete', `Assault: graduation did not finish, received ${state.mode}`)
  await capture(page, 'assault-graduation-complete')

  writeErrors('assault', errors)
  assert(errors.length === 0, `Assault browser errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function openMission(completedMissions, selectedTankClass, selectedMajorMod) {
  const context = await browser.newContext({ viewport: { width: 1120, height: 928 } })
  await context.addInitScript((save) => {
    localStorage.setItem('tanchiki.save.v1', JSON.stringify(save))
  }, {
    schemaVersion: 1,
    progression: {
      selectedTeam: 'blue',
      selectedTankClass,
      bestScore: 0,
      xp: 0,
      credits: 0,
      unlockedStage: 1,
      completedLevels: [],
      tutorialCompletedMissions: completedMissions,
      selectedMajorMod,
      upgrades: { armor: 0, cannon: 0, engine: 0, repairKit: 0 },
    },
    settings: { volume: 0.7, muted: false, colorSafe: false },
    resumableRun: null,
  })
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
  })
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))
  await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  return { context, page, errors }
}

async function launchSelectedMission(page, missionId) {
  await press(page, 'Enter')
  await press(page, 'Enter')
  let state = await readState(page)
  assert(state.mode === 'briefing' && state.tutorial.missionId === missionId, `Expected Mission ${missionId} briefing`)
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.mode === 'playing' && state.tutorial.missionId === missionId, `Expected Mission ${missionId} gameplay`)
}

async function advanceOpeningOrders(page) {
  let state = await readState(page)
  for (let index = 0; index < 12 && state.tutorial.stepId === 'welcome'; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  assert(state.tutorial.stepId !== 'welcome', 'Opening orders did not advance')
}

async function settleCurrentNarration(page, stepId) {
  let state = await readState(page)
  for (let index = 0; index < 12 && state.mode === 'playing' && state.tutorial.stepId === stepId && state.tutorial.dialogue !== null; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  if (state.mode === 'playing' && state.tutorial.stepId === stepId) {
    await advance(page, 100)
  }
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key)
  await advance(page, milliseconds)
  await page.keyboard.up(key)
  await advance(page, 120)
}

async function press(page, key) {
  await page.keyboard.down(key)
  await advance(page, 160)
  await page.keyboard.up(key)
  await advance(page, 40)
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

function writeErrors(name, errors) {
  fs.writeFileSync(path.join(outputDir, `${name}-errors.json`), JSON.stringify(errors, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
