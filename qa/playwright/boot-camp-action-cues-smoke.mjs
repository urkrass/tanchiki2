import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-action-cues-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  await verifyMovementAndFireCues()
  await verifyClassKitCue()
  await verifyFlagTransferCues()
  await verifyMajorModAndCoreCues()
} finally {
  await browser.close()
}

async function verifyMovementAndFireCues() {
  const scenario = await openMission([], 'engineer', 'overdrive')
  const { context, page, errors } = scenario
  await launchSelectedMission(page, 1)

  await press(page, 'Enter')
  await press(page, 'Enter')
  await press(page, 'Enter')
  let state = await readState(page)
  assert(state.tutorial.stepId === 'welcome', 'First Gear left its welcome before confirmation')
  assert(state.tutorial.dialogueComplete === true, 'First Gear confirmation line did not finish')
  assertActionCue(state, 'confirm', ['ENTER'], 'CONFIRM')
  await capture(page, 'confirm-cue')

  await advance(page, 9_400)
  state = await readState(page)
  assertActionCue(state, 'confirm', ['ENTER'], 'CONFIRM')
  await advance(page, 800)
  state = await readState(page)
  assert(state.tutorial.actionCue === null, 'Contextual cue remained visible beyond ten seconds')
  assert(state.tutorial.dialogueComplete === true, 'Cue expiry removed the persistent radio instruction')
  assert(state.tutorial.activeGoal === 'Confirm range-control instructions.', 'Cue expiry removed the HUD goal')
  assert(state.readableText.tutorial.action === 'No action cue', 'Readable state did not mirror cue expiry')
  await capture(page, 'confirm-cue-expired')

  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.stepId === 'tour' && state.tutorial.cameraControlled, 'First Gear camera tour did not begin')
  assert(state.tutorial.actionCue === null, 'Action cue remained visible while range control held the camera')
  for (let index = 0; index < 28 && state.tutorial.stepId === 'tour'; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.tutorial.stepId === 'move', `First Gear did not reach movement training: ${state.tutorial.stepId}`)

  await settleCurrentNarration(page, 'move')
  state = await readState(page)
  assertActionCue(state, 'move', ['LEFT', 'UP', 'DOWN', 'RIGHT'], 'MOVE')
  assert(state.readableText.tutorial.action === 'LEFT + UP + DOWN + RIGHT: MOVE', 'Movement cue missing from readable text')
  await capture(page, 'movement-cue')

  await hold(page, 'ArrowRight', 1800)
  state = await readState(page)
  assert(state.tutorial.stepId === 'engage', `Movement cue action did not advance the drill: ${state.tutorial.stepId}`)
  await settleCurrentNarration(page, 'engage')
  state = await readState(page)
  assertActionCue(state, 'fire', ['SPACE'], 'FIRE')
  await capture(page, 'fire-cue')

  const shotsBefore = state.runStats.shotsFired
  await press(page, 'Space')
  state = await readState(page)
  assert(state.runStats.shotsFired > shotsBefore, 'Fire cue did not correspond to a working fire action')
  writeErrors('first-gear', errors)
  assert(errors.length === 0, `First Gear cue errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyClassKitCue() {
  const scenario = await openMission([1, 2], 'engineer', 'overdrive')
  const { context, page, errors } = scenario
  await launchSelectedMission(page, 3)
  await advanceOpeningOrders(page)
  await driveTo(page, 10, 11)
  await settleCurrentNarration(page, 'class-tactic')

  let state = await readState(page)
  assertActionCue(state, 'deploy', ['1', '2'], 'PLACE KIT')
  await capture(page, 'class-kit-cue')

  await page.keyboard.down('Digit1')
  await advance(page, 900)
  await page.keyboard.up('Digit1')
  await advance(page, 200)
  state = await readState(page)
  assert(
    state.deployables.active.some((device) => device.ownerTankId === 'player'),
    'Class-kit cue did not correspond to a working placement action',
  )
  writeErrors('class-kit', errors)
  assert(errors.length === 0, `Class-kit cue errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyFlagTransferCues() {
  const scenario = await openMission([1, 2, 3], 'scout', 'pontoon')
  const { context, page, errors } = scenario
  await launchSelectedMission(page, 4)
  await advanceOpeningOrders(page)
  await settleCurrentNarration(page, 'pickup')
  await hold(page, 'ArrowUp', 5200)

  let state = await readState(page)
  assert(state.tutorial.stepId === 'first-capture', `CTF did not enter the first return: ${state.tutorial.stepId}`)
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF first run was not clear')
  await settleCurrentNarration(page, 'first-capture')
  await hold(page, 'ArrowDown', 5200)
  state = await readState(page)
  assert(state.objective.flag?.captures === 1, `CTF first run did not score: ${state.objective.flag?.captures}`)
  assert(state.tutorial.stepId === 'second-pickup', `CTF did not request the second flag: ${state.tutorial.stepId}`)

  await settleCurrentNarration(page, 'second-pickup')
  await hold(page, 'ArrowUp', 5200)
  state = await readState(page)
  assert(state.tutorial.stepId === 'return-second', `CTF did not enter the unannounced return: ${state.tutorial.stepId}`)
  assertActionCue(state, 'drive', ['LEFT', 'UP', 'DOWN', 'RIGHT'], 'RETURN HOME', state.player)
  await capture(page, 'flag-return-home-cue')

  await hold(page, 'ArrowDown', 3000)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 8, `CTF carrier missed the permanent trap: ${state.player.col},${state.player.row}`)
  assert(state.objective.flag?.transfer?.trapTriggered === true, 'CTF trap cue sequence did not spring the trap')
  await settleCurrentNarration(page, 'trapped')
  state = await readState(page)
  assertActionCue(state, 'drop-flag', ['R'], 'DROP FLAG')
  await capture(page, 'flag-drop-cue')

  await press(page, 'KeyR')
  await advance(page, 200)
  state = await readState(page)
  assert(state.objective.flag?.transfer?.complete === true, 'Flag-drop cue did not complete the transfer')
  assert(state.tutorial.stepId === 'handoff', `Flag-drop cue did not advance to the allied handoff: ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraFollowActorId === 'instructor-brick', 'Flag-drop cue did not start Brick camera follow')
  writeErrors('ctf', errors)
  assert(errors.length === 0, `CTF cue errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyMajorModAndCoreCues() {
  const scenario = await openMission([1, 2, 3, 4, 5], 'engineer', 'emp')
  const { context, page, errors } = scenario
  await launchSelectedMission(page, 6)
  await advanceOpeningOrders(page)

  let state = await readState(page)
  for (let index = 0; index < 20 && state.tutorial.stepId === 'reveal'; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  if (state.tutorial.stepId === 'reveal') {
    await settleCurrentNarration(page, 'reveal')
  }
  await driveTo(page, 13, 8)
  await settleCurrentNarration(page, 'adaptive')
  state = await readState(page)
  assertActionCue(state, 'mod', ['X'], 'USE MOD')
  await capture(page, 'major-mod-cue')

  await press(page, 'KeyX')
  state = await readState(page)
  assert(state.tutorial.stepId === 'core', `Major Mod cue did not advance to the core: ${state.tutorial.stepId}`)
  await settleCurrentNarration(page, 'core')
  state = await readState(page)
  assertActionCue(state, 'fire', ['SPACE'], 'FIRE')
  await capture(page, 'core-fire-cue')

  writeErrors('assault', errors)
  assert(errors.length === 0, `Assault cue errors: ${JSON.stringify(errors)}`)
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

async function driveTo(page, targetCol, targetRow) {
  for (let index = 0; index < 40; index += 1) {
    const state = await readState(page)
    if (state.player.col === targetCol && state.player.row === targetRow) return
    const key = state.player.row > targetRow
      ? 'ArrowUp'
      : state.player.row < targetRow
        ? 'ArrowDown'
        : state.player.col > targetCol
          ? 'ArrowLeft'
          : 'ArrowRight'
    await press(page, key)
    await advance(page, 600)
  }
  const state = await readState(page)
  throw new Error(`Could not drive to ${targetCol},${targetRow}; stopped at ${state.player.col},${state.player.row}`)
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

function assertActionCue(state, kind, keys, label, context = null) {
  assert(
    state.tutorial.actionCue?.kind === kind,
    `Expected ${kind} cue, received ${JSON.stringify(state.tutorial.actionCue)} context=${JSON.stringify(context)}`,
  )
  assert(JSON.stringify(state.tutorial.actionCue.keyboardKeys) === JSON.stringify(keys), `Unexpected ${kind} keys`)
  assert(state.tutorial.actionCue.label === label, `Unexpected ${kind} label: ${state.tutorial.actionCue.label}`)
}

function writeErrors(name, errors) {
  fs.writeFileSync(path.join(outputDir, `${name}-errors.json`), JSON.stringify(errors, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
