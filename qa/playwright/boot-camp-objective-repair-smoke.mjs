import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-objective-repair-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  await verifyCtfTransferCheckpoint()
  await verifyCtfFastPlayerCannotOutrunDirector()
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
  assert(state.objective.flag?.capturesToWin === 2, `CTF: HUD target was not increased to two: ${state.objective.flag?.capturesToWin}`)
  assert(state.objective.flag?.carrierId === 'player', 'CTF: player did not take the first flag')
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: first flag run incorrectly sealed the checkpoint')
  assert(state.tutorial.stepId === 'first-capture', `CTF: expected first return, received ${state.tutorial.stepId}`)
  await settleCurrentNarration(page, 'first-capture')
  await hold(page, 'ArrowDown', 5200)

  state = await readState(page)
  assert(state.objective.flag?.captures === 1, `CTF: first clear run did not score: ${state.objective.flag?.captures}`)
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: route changed before the second theft')
  assert(state.tutorial.stepId === 'second-pickup', `CTF: expected second theft order, received ${state.tutorial.stepId}`)
  assert(!/trap|handoff|checkpoint|special second/i.test(state.tutorial.dialogue ?? ''), `CTF: second-run surprise was announced early: ${state.tutorial.dialogue}`)
  await capture(page, 'ctf-first-solo-capture')

  await settleCurrentNarration(page, 'second-pickup')
  await hold(page, 'ArrowUp', 5200)
  state = await readState(page)
  await capture(page, 'ctf-second-flag-approach')
  assert(state.objective.flag?.carrierId === 'player', 'CTF: player did not take the second flag')
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: second theft materialized a blocking wall')
  assert(state.objective.flag?.transfer?.trapTriggered === false, 'CTF: trap fired before the player reached the crossing')
  assert(state.tutorial.stepId === 'return-second', `CTF: expected an ordinary return order, received ${state.tutorial.stepId}`)
  assert(state.tutorial.actionCue?.label === 'RETURN HOME', `CTF: return cue spoiled the trap: ${JSON.stringify(state.tutorial.actionCue)}`)

  await hold(page, 'ArrowDown', 3000)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 8, `CTF: permanent trap did not stop the carrier in the crossing: ${state.player.col},${state.player.row}`)
  assert(state.objective.flag?.carrierId === 'player', 'CTF: trap removed the flag before the player chose to drop it')
  assert(state.objective.flag?.transfer?.trapTriggered === true, 'CTF: permanent trap state did not engage')
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: dramatic trap regressed to a blocking wall')
  assert(state.tutorial.stepId === 'trapped', `CTF: trap did not interrupt the return order: ${state.tutorial.stepId}`)
  assert(state.readableText.levelMarkers.labels.includes('DROP'), 'CTF: DROP marker was not exposed after the surprise')
  assert(!state.readableText.levelMarkers.labels.includes('XFER'), 'CTF: obsolete XFER marker survived the redesign')
  assert(state.deployables.active.some((device) => device.kind === 'steel' && device.col === 10 && device.row === 8), 'CTF: permanent trap sprite is missing from the crossing')
  await capture(page, 'ctf-permanent-trap-sprung')

  await hold(page, 'ArrowDown', 1400)
  state = await readState(page)
  assert(state.player.col === 10 && state.player.row === 8, 'CTF: player escaped the permanent trap without dropping the flag')
  await settleCurrentNarration(page, 'trapped')
  state = await readState(page)
  assert(state.tutorial.actionCue?.kind === 'drop-flag', `CTF: R drop hint did not appear at the trap: ${JSON.stringify(state.tutorial.actionCue)}`)
  assert(state.tutorial.actionCue?.keyboardKeys?.includes('R'), 'CTF: trap hint does not name R')
  await capture(page, 'ctf-trapped-drop-order')

  await press(page, 'KeyR')
  await advance(page, 200)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === null, 'CTF: transfer did not release the carried flag')
  assert(state.objective.flag?.position?.x === 10 && state.objective.flag?.position?.y === 9, 'CTF: flag did not arrive on the south pad')
  assert(state.objective.flag?.transfer?.complete === true, 'CTF: transfer did not complete')
  assert(state.objective.flag?.transfer?.gateClosed === false, 'CTF: handoff created an obsolete wall')
  assert(state.tutorial.stepId === 'handoff', `CTF: expected allied handoff, received ${state.tutorial.stepId}`)
  assert(state.tutorial.cameraControlled === true, 'CTF: handoff did not take camera control')
  assert(state.tutorial.cameraFollowActorId === 'instructor-brick', `CTF: camera did not follow Brick: ${state.tutorial.cameraFollowActorId}`)
  await capture(page, 'ctf-handoff-start')

  await advance(page, 900)
  state = await readState(page)
  assert(state.objective.flag?.carrierId === 'instructor-brick', `CTF: Brick did not pick up the passed flag: ${state.objective.flag?.carrierId}`)
  assert(state.tutorial.speaker === 'General Rook', `CTF: Rook did not explain the handoff: ${state.tutorial.speaker}`)
  assert(state.tutorial.dialogue?.includes("increases the operation's efficiency"), 'CTF: Rook did not explain the efficiency benefit')
  await capture(page, 'ctf-brick-carrying')

  for (let index = 0; index < 24 && (state.objective.flag?.captures ?? 0) < 2; index += 1) {
    assert(state.tutorial.cameraFollowActorId === 'instructor-brick', `CTF: camera released Brick before capture at ${state.objective.flag?.captures ?? 0}/2`)
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.objective.flag?.captures === 2, `CTF: Brick did not finish the second capture: ${state.objective.flag?.captures}`)
  assert(state.tutorial.cameraControlled === true, 'CTF: camera was not still controlled on the capture frame')
  await capture(page, 'ctf-second-allied-capture')

  for (let index = 0; index < 16 && state.tutorial.speaker === 'General Rook' && !state.tutorial.dialogueComplete; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.tutorial.dialogueComplete === true, 'CTF: Rook handoff explanation did not finish typing')
  await capture(page, 'ctf-rook-handoff-explained')

  await settleCurrentNarration(page, 'handoff')
  state = await readState(page)
  assert(state.mode === 'level-complete', `CTF: drill did not finish, received ${state.mode}`)
  await capture(page, 'ctf-drill-complete')

  writeErrors('ctf', errors)
  assert(errors.length === 0, `CTF browser errors: ${JSON.stringify(errors)}`)
  await context.close()
}

async function verifyCtfFastPlayerCannotOutrunDirector() {
  const scenario = await openMission([1, 2, 3], 'scout', 'pontoon')
  const { context, page, errors } = scenario

  await launchSelectedMission(page, 4)
  await advanceOpeningOrders(page)

  // Deliberately keep driving while every automatic line is still playing.
  // CTF progress must be state-based so a quick new player cannot miss an
  // event edge and strand the director on an obsolete instruction.
  await hold(page, 'ArrowUp', 5200)
  await hold(page, 'ArrowDown', 5200)
  await hold(page, 'ArrowUp', 5200)
  await hold(page, 'ArrowDown', 3000)

  let state = await readState(page)
  assert(state.objective.flag?.captures === 1, `CTF fast path lost the first capture: ${state.objective.flag?.captures}`)
  assert(state.objective.flag?.carrierId === 'player', 'CTF fast path lost the second carried flag')
  assert(state.objective.flag?.transfer?.trapTriggered === true, 'CTF fast path outran the permanent trap event')
  assert(state.tutorial.stepId === 'trapped', `CTF fast path stranded the director on ${state.tutorial.stepId}`)
  await capture(page, 'ctf-fast-player-trapped')

  await settleCurrentNarration(page, 'trapped')
  await press(page, 'KeyR')
  await advance(page, 200)
  state = await readState(page)
  assert(state.tutorial.cameraFollowActorId === 'instructor-brick', 'CTF fast path did not start Brick camera follow')

  for (let index = 0; index < 24 && (state.objective.flag?.captures ?? 0) < 2; index += 1) {
    await advance(page, 500)
    state = await readState(page)
  }
  assert(state.objective.flag?.captures === 2, 'CTF fast path did not complete Brick\'s capture')
  await settleCurrentNarration(page, 'handoff')
  state = await readState(page)
  assert(state.mode === 'level-complete', `CTF fast path did not finish: ${state.mode}`)
  await capture(page, 'ctf-fast-player-complete')

  writeErrors('ctf-fast-player', errors)
  assert(errors.length === 0, `CTF fast-player browser errors: ${JSON.stringify(errors)}`)
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
