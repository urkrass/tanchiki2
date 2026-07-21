import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-ffa-relay-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  await verifyDesktopRelayLesson()
  await verifyTouchRelayCue()
} finally {
  await browser.close()
}

async function verifyDesktopRelayLesson() {
  const scenario = await openMission({ width: 1120, height: 928 })
  const { context, page, errors } = scenario
  await launchMissionFive(page)
  await advanceOpeningOrders(page)

  let state = await settleCurrentNarration(page, 'deploy-relay')
  assert(state.tutorial.actionCue?.label === 'DEPLOY RELAY', `Desktop: relay cue missing: ${JSON.stringify(state.tutorial.actionCue)}`)
  assert(state.tutorial.actionCue.keyboardKeys.join(',') === 'E', 'Desktop: relay cue did not identify E')
  assert(state.ai.activeBotCount === 0, 'Desktop: hostiles spawned before the protected relay lesson')
  assert(state.objective.targetScore === 4, `Desktop: expected four-kill target, received ${state.objective.targetScore}`)
  assert(state.level.difficulty.activeEnemyLimit === 5, 'Desktop: live FFA cap is not five')
  assert(state.level.difficulty.continuousEnemySpawns === true, 'Desktop: replenishing FFA flag is missing')
  await capture(page, 'desktop-deploy-relay', state, errors)

  await hold(page, 'KeyE', 1300)
  for (let index = 0; index < 12; index += 1) {
    state = await readState(page)
    if (state.tutorial.stepId === 'decoy-lesson') break
    await advance(page, 250)
  }
  assert(state.portableRelay.deployed === true, 'Desktop: portable relay was not deployed')
  assert(
    state.portableRelay.signalContacts.some((contact) => contact.kind === 'hostile' && contact.col === 10 && contact.row === 11),
    'Desktop: hidden decoy did not create the intended false hostile contact',
  )
  assert(state.tutorial.stepId === 'decoy-lesson', `Desktop: false contact did not enter its lesson: ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraLabel === 'False relay contact', `Desktop: wrong decoy camera label ${state.tutorial.cameraLabel}`)
  assert(state.tutorial.dialogue?.includes('Relays report echoes, not intentions'), 'Desktop: General Rook did not explain the false contact')
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.tutorial.dialogueComplete === true, 'Desktop: decoy explanation did not finish typing')
  await capture(page, 'desktop-decoy-discovered', state, errors)

  await press(page, 'Enter')
  for (let index = 0; index < 16 && state.tutorial.cameraControlled; index += 1) {
    await advance(page, 400)
    state = await readState(page)
  }
  assert(state.tutorial.stepId === 'decoy-lesson', 'Desktop: decoy inspection completed without player verification')
  await moveOneCell(page, 'ArrowUp')
  await moveOneCell(page, 'ArrowUp')
  await moveOneCell(page, 'ArrowUp')
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 12, `Desktop: marked inspection point was missed: ${state.player.col},${state.player.row}`)
  await advance(page, 100)
  state = await readState(page)
  assert(state.tutorial.stepId === 'recover-relay', `Desktop: expected relay recovery, received ${state.tutorial.stepId}`)
  state = await settleCurrentNarration(page, 'recover-relay')
  assert(state.tutorial.actionCue?.label === 'PICK UP RELAY', 'Desktop: recovery cue does not teach taking the relay back')
  await capture(page, 'desktop-recover-relay', state, errors)

  await moveOneCell(page, 'ArrowDown')
  await moveOneCell(page, 'ArrowDown')
  await hold(page, 'KeyE', 1000)
  state = await readState(page)
  assert(state.runStats.portableRelaysRecovered === 1, 'Desktop: relay recovery was not recorded')
  assert(state.portableRelay.deployed === false, 'Desktop: relay remained deployed after recovery')
  assert(state.tutorial.stepId === 'calibration-shot', `Desktop: expected calibration shot, received ${state.tutorial.stepId}`)

  await settleCurrentNarration(page, 'calibration-shot')
  await press(page, 'Space')
  state = await readState(page)
  assert(state.player.shells === 9, `Desktop: calibration shot did not consume a shell: ${state.player.shells}`)
  assert(state.tutorial.stepId === 'resupply', `Desktop: expected resupply lesson, received ${state.tutorial.stepId}`)
  state = await settleCurrentNarration(page, 'resupply')
  assert(state.tutorial.actionCue?.label === 'HOLD POSITION', 'Desktop: ammo station did not expose its hold cue')
  await capture(page, 'desktop-to-ammo', state, errors)

  await advance(page, 500)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 14, `Desktop: player missed ammo station: ${state.player.col},${state.player.row}`)
  assert(state.player.onAmmoStation === true, 'Desktop: yellow station did not register the player')
  assert(state.tutorial.actionCue?.label === 'HOLD POSITION', 'Desktop: station did not switch to the hold-position cue')
  await capture(page, 'desktop-ammo-recharging', state, errors)

  await advance(page, 1800)
  state = await readState(page)
  assert(state.runStats.shellsRecharged === 1, 'Desktop: ammo station did not replenish one shell')
  assert(state.player.shells === 10, `Desktop: shell rack did not refill: ${state.player.shells}`)
  assert(state.tutorial.stepId === 'priority', `Desktop: expected live FFA phase, received ${state.tutorial.stepId}`)
  await capture(page, 'desktop-live-ffa-start', state, errors)

  await settleCurrentNarration(page, 'priority')
  let maxActive = 0
  for (let index = 0; index < 18; index += 1) {
    await advance(page, 1000)
    state = await readState(page)
    assert(state.mode === 'playing', `Desktop: idle FFA left gameplay unexpectedly: ${state.mode}`)
    assert(state.ai.activeBotCount <= 5, `Desktop: live tank cap exceeded: ${state.ai.activeBotCount}`)
    maxActive = Math.max(maxActive, state.ai.activeBotCount)
    if (state.ai.activeBotCount === 5) {
      await capture(page, 'desktop-five-live-tanks', state, errors)
      break
    }
  }
  assert(maxActive >= 4, `Desktop: replenishing field never populated strategically: max ${maxActive}`)
  assert(state.readableText.hud.enemies.includes('/5'), `Desktop: readable state lost active cap: ${state.readableText.hud.enemies}`)
  if (state.ai.activeBotCount !== 5) {
    await capture(page, 'desktop-replenishing-ffa', state, errors)
  }

  writeErrors('desktop', errors)
  assert(errors.length === 0, `Desktop browser errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyTouchRelayCue() {
  const scenario = await openMission(
    { width: 390, height: 844 },
    { isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  )
  const { context, page, errors } = scenario
  await launchMissionFive(page)
  await advanceOpeningOrders(page)
  let state = await settleCurrentNarration(page, 'deploy-relay')
  assert(state.tutorial.actionCue?.touchKeys.join(',') === 'RELAY', 'Touch: relay cue does not use the semantic relay label')

  const box = await canvasBox(page)
  const relay = logicalToViewport(box, 308, 372)
  await pointer(page, 'pointerdown', 1, relay)
  await advance(page, 1300)
  await pointer(page, 'pointerup', 1, relay)
  await advance(page, 200)
  state = await readState(page)
  assert(state.feedback.touchControlsVisible === true, 'Touch: field controls did not become visible')
  assert(state.portableRelay.deployed === true, 'Touch: holding the relay control did not deploy it')
  await capture(page, 'touch-relay-deployed', state, errors)

  writeErrors('touch', errors)
  assert(errors.length === 0, `Touch browser errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function openMission(viewport, mobile = {}) {
  const context = await browser.newContext({ viewport, ...mobile })
  await context.addInitScript((save) => {
    localStorage.setItem('tanchiki.save.v1', JSON.stringify(save))
  }, createSave())
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

function createSave() {
  return {
    schemaVersion: 1,
    progression: {
      selectedTeam: 'blue',
      selectedTankClass: 'battle',
      bestScore: 0,
      xp: 0,
      credits: 0,
      unlockedStage: 1,
      completedLevels: [],
      tutorialCompletedMissions: [1, 2, 3, 4],
      selectedMajorMod: 'hedgehog',
      upgrades: { armor: 0, cannon: 0, engine: 0, repairKit: 0 },
    },
    settings: { volume: 0.7, muted: false, colorSafe: false },
    resumableRun: null,
  }
}

async function launchMissionFive(page) {
  await press(page, 'Enter')
  await press(page, 'Enter')
  let state = await readState(page)
  assert(state.mode === 'briefing' && state.tutorial.missionId === 5, 'Expected Mission 5 briefing')
  await press(page, 'Enter')
  await advance(page, 1300)
  await press(page, 'Enter')
  state = await readState(page)
  assert(state.mode === 'playing' && state.tutorial.missionId === 5, 'Expected Mission 5 gameplay')
}

async function advanceOpeningOrders(page) {
  let state = await readState(page)
  for (let index = 0; index < 12 && state.tutorial.stepId === 'welcome'; index += 1) {
    await press(page, 'Enter')
    state = await readState(page)
  }
  assert(state.tutorial.stepId === 'deploy-relay', `Opening orders did not reach relay lesson: ${state.tutorial.stepId}`)
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
  await page.keyboard.down(key)
  await advance(page, 160)
  await page.keyboard.up(key)
  await advance(page, 40)
}

async function hold(page, key, milliseconds) {
  await page.keyboard.down(key)
  await advance(page, milliseconds)
  await page.keyboard.up(key)
  await advance(page, 80)
}

async function moveOneCell(page, key) {
  await page.keyboard.down(key)
  await advance(page, 80)
  await page.keyboard.up(key)
  await advance(page, 520)
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
      isPrimary: true,
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
  const box = await page.locator('canvas').boundingBox()
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
  await page.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(state, null, 2))
  fs.writeFileSync(path.join(outputDir, `${name}-errors.json`), JSON.stringify(errors, null, 2))
}

function writeErrors(name, errors) {
  fs.writeFileSync(path.join(outputDir, `${name}-errors.json`), JSON.stringify(errors, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
