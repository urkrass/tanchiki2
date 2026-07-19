import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?skipSplash=1'
const outputDir = path.resolve(process.argv[3] ?? 'output/tank-class-carousel-smoke')
const mobile = process.argv[4] === 'mobile'
const LOGICAL_WIDTH = 560
const LOGICAL_HEIGHT = 464
const SCENES = ['shooting', 'breach', 'duel', 'race', 'class-kit']
const SCENE_LABELS = ['LIVE FIRE', 'BREAKTHROUGH', 'DUEL', 'RACE', 'FIELD KIT']
const SCENE_CAPTURE_SECONDS = [2.2, 3.25, 3.1, 3.9, 4.35]
const SCENE_DURATION_MS = 5000
const CLASS_SEQUENCE = ['engineer', 'battle', 'scout']
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
  await page.keyboard.press('ArrowDown')
  await confirm()
  await page.keyboard.press('ArrowDown')
  await confirm()

  let state = await readState()
  assert(state.mode === 'tank-select', `Tank Select opened ${state.mode}`)
  assert(state.tankClasses.showcase.displayed === 'engineer', 'Tank Select did not open on the equipped Engineer')
  assert(state.tankClasses.showcase.equipped === 'engineer', 'Engineer was not reported as equipped')
  assert(state.tankClasses.showcase.loopDuration === 25, 'showcase loop is not 25 seconds')
  assert(state.tankClasses.showcase.sceneDuration === 5, 'showcase scenes are not 5 seconds')
  assert(state.tankClasses.showcase.paused === false, 'showcase unexpectedly opened paused')

  await advance(1800)
  state = await readState()
  await tapLogical(388, 46)
  const paused = await readState()
  assert(paused.tankClasses.showcase.paused === true, 'pause control did not freeze the theater')
  await advance(1200)
  state = await readState()
  assert(state.tankClasses.showcase.elapsed === paused.tankClasses.showcase.elapsed, 'paused theater elapsed time changed')
  await capture('engineer-playback-paused')

  await tapLogical(403, 46)
  state = await readState()
  assert(state.tankClasses.showcase.scene === 'breach', 'next playback control did not step one scene')
  assert(state.tankClasses.showcase.paused === true, 'next playback control resumed a paused theater')
  await tapLogical(373, 46)
  state = await readState()
  assert(state.tankClasses.showcase.scene === 'shooting', 'previous playback control did not step one scene')
  await tapLogical(388, 46)
  state = await readState()
  assert(state.tankClasses.showcase.paused === false, 'resume control did not restart playback')

  for (let classIndex = 0; classIndex < CLASS_SEQUENCE.length; classIndex += 1) {
    const tankClass = CLASS_SEQUENCE[classIndex]
    state = await readState()
    assert(state.tankClasses.showcase.displayed === tankClass, `expected ${tankClass}, received ${state.tankClasses.showcase.displayed}`)

    const presentation = state.tankClasses.options.find((option) => option.id === tankClass)
    assert(presentation, `${tankClass} presentation is missing`)
    assert(presentation.strategy.length > 30, `${tankClass} strategy is incomplete`)
    assert(presentation.strength.length > 10, `${tankClass} strength is incomplete`)
    assert(presentation.caution.length > 10, `${tankClass} caution is incomplete`)
    assert(presentation.nativeKit.length === 2, `${tankClass} native kit does not expose two capabilities`)
    assert(presentation.projectile.effect.includes('DIRECT'), `${tankClass} projectile effect is incomplete`)
    assert(presentation.demonstration.referenceEnemyHp === 4, `${tankClass} does not use the live normal-enemy health`)
    assert(presentation.demonstration.brickHp === 2, `${tankClass} does not use the live brick health`)
    if (tankClass !== 'battle') {
      assert(presentation.demonstration.splashDamage === 0, `${tankClass} incorrectly exposes splash damage`)
    }

    for (let sceneIndex = 0; sceneIndex < SCENES.length; sceneIndex += 1) {
      state = await readState()
      const scene = SCENES[sceneIndex]
      assert(state.tankClasses.showcase.scene === scene, `${tankClass} expected ${scene}, received ${state.tankClasses.showcase.scene}`)
      assert(state.tankClasses.showcase.sceneIndex === sceneIndex, `${tankClass} ${scene} has the wrong timeline index`)
      assert(state.tankClasses.showcase.sceneLabel === SCENE_LABELS[sceneIndex], `${tankClass} ${scene} has the wrong scene label`)
      if (scene === 'class-kit') {
        const primaryProgress = timelineProgressAt(2.15)
        if (state.tankClasses.showcase.sceneProgress < primaryProgress) {
          await advance((primaryProgress - state.tankClasses.showcase.sceneProgress) * SCENE_DURATION_MS)
          state = await readState()
        }
        await capture(`${tankClass}-field-kit-primary`)
      }
      const targetProgress = timelineProgressAt(SCENE_CAPTURE_SECONDS[sceneIndex])
      if (state.tankClasses.showcase.sceneProgress < targetProgress) {
        await advance((targetProgress - state.tankClasses.showcase.sceneProgress) * SCENE_DURATION_MS)
        state = await readState()
      }
      await capture(`${tankClass}-${scene}`)
      if (sceneIndex < SCENES.length - 1) {
        await advance((1 - state.tankClasses.showcase.sceneProgress) * SCENE_DURATION_MS + 50)
      }
    }

    if (classIndex < CLASS_SEQUENCE.length - 1) {
      await page.keyboard.press('ArrowRight')
      await advance(40)
      state = await readState()
      assert(state.tankClasses.showcase.scene === 'shooting', 'keyboard class change did not restart Shooting')
      assert(state.tankClasses.showcase.equipped === 'engineer', 'previewing changed the equipped class')
    }
  }

  await tapLogical(441, 181)
  await advance(40)
  state = await readState()
  assert(state.tankClasses.showcase.displayed === 'engineer', 'right pointer arrow did not wrap Scout to Engineer')
  assert(state.tankClasses.showcase.equipped === 'engineer', 'right pointer arrow equipped a preview')
  assert(state.tankClasses.showcase.scene === 'shooting', 'pointer class change did not restart Shooting')

  await tapLogical(71, 181)
  await advance(40)
  state = await readState()
  assert(state.tankClasses.showcase.displayed === 'scout', 'left pointer arrow did not wrap Engineer to Scout')
  await confirm()
  state = await readState()
  assert(state.tankClasses.showcase.equipped === 'scout', 'Enter did not equip the displayed Scout')
  assert(state.menu.helper[0].includes('Equipped'), 'description state did not report the equipped class')
  await capture('scout-equipped')

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('canvas').focus()
  state = await readState()
  assert(state.progression.selectedTankClass === 'scout', 'equipped class did not persist after reload')
  await page.keyboard.press('ArrowDown')
  await confirm()
  await page.keyboard.press('ArrowDown')
  await confirm()
  state = await readState()
  assert(state.tankClasses.showcase.displayed === 'scout', 'reopened carousel did not focus the persisted class')

  await tapLogical(280, 388)
  await advance(180)
  state = await readState()
  assert(state.mode === 'garage', `Back pointer returned to ${state.mode}`)

  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  if (errors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(errors)}`)
  }
} finally {
  await browser.close()
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

function timelineProgressAt(seconds) {
  return seconds / (SCENE_DURATION_MS / 1000)
}
