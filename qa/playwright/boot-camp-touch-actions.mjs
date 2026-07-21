import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-touch-actions'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  await verifyAdaptiveTouchActions()
  await verifyCtfTouchDrop()
} finally {
  await browser.close()
}

async function verifyAdaptiveTouchActions() {
  const scenario = await openMobile([1, 2], 'engineer', 'hedgehog')
  const { context, page, errors } = scenario
  await launchLatestMission(page)
  await advanceOpeningOrders(page)
  await advance(page, 300)

  const box = await canvasBox(page)
  const joystick = logicalToViewport(box, 128, 370)
  const up = logicalToViewport(box, 128, 330)
  for (let index = 0; index < 4; index += 1) {
    await pointer(page, 'pointerdown', 10 + index, joystick)
    await pointer(page, 'pointermove', 10 + index, up)
    await advance(page, 120)
    await pointer(page, 'pointerup', 10 + index, up)
    await advance(page, 700)
  }
  let state = await readState(page)
  assert(state.feedback.touchControlsVisible === true, 'Touch controls did not become visible')
  assert(state.player.col === 10 && state.player.row === 11, `Touch route missed the class tactic zone: ${state.player.col},${state.player.row}`)
  state = await settleCurrentNarration(page, 'class-tactic')
  assert(state.tutorial.stepId === 'class-tactic', `Touch narration did not settle on class training: ${state.tutorial.stepId}`)
  assert(state.tutorial.actionCue?.kind === 'deploy', `Touch deploy cue missing: ${JSON.stringify(state.tutorial.actionCue)}`)
  assert(state.tutorial.actionCue.touchKeys.join(',') === 'KIT 1,KIT 2', 'Touch deploy cue does not use semantic kit-slot labels')
  await capture(page, 'touch-adaptive-cue', state, errors)

  const mine = logicalToViewport(box, 300, 446)
  await pointer(page, 'pointerdown', 2, mine)
  await advance(page, 900)
  await pointer(page, 'pointerup', 2, mine)
  await advance(page, 250)
  state = await readState(page)
  assert(
    state.deployables.active.some((device) => device.kind === 'mine' && device.ownerTankId === 'player'),
    'Touch kit slot did not deploy the player mine',
  )
  assert(state.tutorial.stepId === 'mod-tactic', `Touch class goal did not advance, received ${state.tutorial.stepId}`)

  await pointer(page, 'pointerdown', 30, joystick)
  await pointer(page, 'pointermove', 30, up)
  await advance(page, 120)
  await pointer(page, 'pointerup', 30, up)
  await advance(page, 700)
  state = await settleCurrentNarration(page, 'mod-tactic')
  assert(state.player.row === 10, `Touch route missed the Hedgehog choke: ${state.player.row}`)
  assert(state.tutorial.actionCue?.touchKeys.join(',') === 'MOD SLIDER', 'Touch Mod cue did not point to the Mod slider')
  const mod = logicalToViewport(box, 492, 228)
  await pointer(page, 'pointerdown', 31, mod)
  await advance(page, 450)
  await pointer(page, 'pointerup', 31, mod)
  await advance(page, 220)
  state = await readState(page)
  assert(state.majorMods.hedgehog.active === true, 'Touch Mod target did not place Hedgehog')
  assert(state.tutorial.stepId === 'tickets', `Touch adaptive goal did not advance, received ${state.tutorial.stepId}`)
  assert(state.tutorial.activeGoal, 'Touch layout lost the current training goal')
  await capture(page, 'touch-adaptive-actions', state, errors)
  assert(errors.length === 0, `Touch adaptive errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyCtfTouchDrop() {
  const scenario = await openMobile([1, 2, 3], 'scout', 'pontoon')
  const { context, page, errors } = scenario
  await launchLatestMission(page)
  await advanceOpeningOrders(page)
  await advance(page, 250)
  await settleCurrentNarration(page, 'pickup')

  const box = await canvasBox(page)
  const joystick = logicalToViewport(box, 128, 370)
  const up = logicalToViewport(box, 128, 330)
  await pointer(page, 'pointerdown', 3, joystick)
  await pointer(page, 'pointermove', 3, up)
  await advance(page, 6200)
  await pointer(page, 'pointerup', 3, up)
  await advance(page, 250)
  let state = await readState(page)
  assert(state.objective.flag?.carrierId === 'player', `Touch CTF route did not pick up the first flag: ${JSON.stringify(state.objective.flag)}`)
  assert(state.objective.flag?.transfer?.gateClosed === false, 'Touch CTF first run was not clear')
  assert(state.tutorial.stepId === 'first-capture', `Touch CTF did not enter first return: ${state.tutorial.stepId}`)

  state = await settleCurrentNarration(page, 'first-capture')
  const down = logicalToViewport(box, 128, 410)
  await pointer(page, 'pointerdown', 4, joystick)
  await pointer(page, 'pointermove', 4, down)
  await advance(page, 6200)
  await pointer(page, 'pointerup', 4, down)
  await advance(page, 250)
  state = await readState(page)
  assert(state.objective.flag?.captures === 1, `Touch CTF first run did not score: ${state.objective.flag?.captures}`)
  assert(state.tutorial.stepId === 'second-pickup', `Touch CTF did not request a second flag: ${state.tutorial.stepId}`)

  state = await settleCurrentNarration(page, 'second-pickup')
  await pointer(page, 'pointerdown', 5, joystick)
  await pointer(page, 'pointermove', 5, up)
  await advance(page, 6200)
  await pointer(page, 'pointerup', 5, up)
  await advance(page, 250)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === 'player', `Touch CTF route did not pick up the second flag: ${JSON.stringify(state.objective.flag)}`)
  assert(state.tutorial.stepId === 'return-second', `Touch CTF route did not enter the unannounced return: ${state.tutorial.stepId}`)
  assert(
    state.tutorial.actionCue?.kind === 'drive',
    `Touch return-home cue missing: ${JSON.stringify(state.tutorial.actionCue)} player=${state.player.col},${state.player.row}`,
  )
  assert(state.tutorial.actionCue?.label === 'RETURN HOME', 'Touch return cue spoiled the surprise')

  await pointer(page, 'pointerdown', 6, joystick)
  await pointer(page, 'pointermove', 6, down)
  await advance(page, 3000)
  await pointer(page, 'pointerup', 6, down)
  await advance(page, 250)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 8, `Touch CTF route missed the permanent trap: ${state.player.col},${state.player.row}`)
  assert(state.objective.flag?.carrierId === 'player', 'Touch CTF lost the flag before the trap order')
  assert(state.objective.flag?.transfer?.trapTriggered === true, 'Touch CTF did not spring the trap')
  await settleCurrentNarration(page, 'trapped')
  state = await readState(page)
  assert(state.tutorial.actionCue?.kind === 'drop-flag', `Touch flag-drop cue missing: ${JSON.stringify(state.tutorial.actionCue)}`)
  assert(state.tutorial.actionCue.touchKeys.join(',') === 'FLAG', 'Touch flag-drop cue did not point to the flag action')
  await capture(page, 'touch-ctf-drop-cue', state, errors)

  const flagHud = logicalToViewport(box, 528, 54)
  await tap(page, 7, flagHud)
  await advance(page, 250)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === null && state.objective.flag?.dropped === true, 'Touch flag HUD did not drop the flag')
  assert(state.objective.flag?.transfer?.complete === true, 'Touch flag HUD did not complete the trap handoff')
  assert(state.objective.flag?.position?.y === 9, 'Trap handoff did not send the flag to Brick')
  assert(state.tutorial.stepId === 'handoff', `Touch transfer did not advance to allied handoff, received ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraFollowActorId === 'instructor-brick', 'Touch transfer did not start Brick camera follow')
  await capture(page, 'touch-ctf-transfer', state, errors)

  await advance(page, 900)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === 'instructor-brick', 'Touch handoff was not picked up by Brick')
  assert(errors.length === 0, `Touch CTF errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function openMobile(completed, selectedTankClass, selectedMajorMod) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
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
      tutorialCompletedMissions: completed,
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

async function launchLatestMission(page) {
  await press(page, 'Enter')
  await press(page, 'Enter')
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  const state = await readState(page)
  assert(state.mode === 'playing', `Expected playing, received ${state.mode}`)
}

async function advanceOpeningOrders(page) {
  let state = await readState(page)
  for (let index = 0; index < 12 && state.tutorial.stepId === 'welcome'; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  assert(state.tutorial.stepId !== 'welcome', 'Opening orders did not advance after typewriter fast-forward')
}

async function settleCurrentNarration(page, stepId) {
  let state = await readState(page)
  for (let index = 0; index < 8 && state.tutorial.stepId === stepId && state.tutorial.dialogue !== null; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  if (state.tutorial.stepId === stepId) {
    await advance(page, 100)
    state = await readState(page)
  }
  return state
}

async function press(page, key) {
  await page.keyboard.press(key)
  await advance(page, 180)
}

async function tap(page, pointerId, point) {
  await pointer(page, 'pointerdown', pointerId, point)
  await advance(page, 120)
  await pointer(page, 'pointerup', pointerId, point)
}

async function pointer(page, type, pointerId, point) {
  await page.evaluate(({ type, pointerId, x, y }) => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('Missing canvas')
    canvas.setPointerCapture = () => {}
    canvas.releasePointerCapture = () => {}
    canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      isPrimary: pointerId === 1,
    }))
  }, { type, pointerId, x: point.x, y: point.y })
}

async function advance(page, milliseconds) {
  await page.evaluate((ms) => window.advanceTime(ms), milliseconds)
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()))
}

async function canvasBox(page) {
  const box = await page.locator('.game-canvas').boundingBox()
  if (!box) throw new Error('Missing canvas box')
  return box
}

function logicalToViewport(box, x, y) {
  return {
    x: box.x + (x / 560) * box.width,
    y: box.y + (y / 464) * box.height,
  }
}

async function capture(page, name, state, errors) {
  await page.locator('.game-canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(state, null, 2))
  fs.writeFileSync(path.join(outputDir, `${name}-errors.json`), JSON.stringify(errors, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
