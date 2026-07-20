import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.TANCHIKI_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.TANCHIKI_OUTPUT_DIR ?? 'output/boot-camp-speaker-portraits-smoke'
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1120, height: 928 } })
await context.addInitScript(() => {
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
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console.error', text: message.text() })
})
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: String(error) }))

try {
  await page.goto(`${baseUrl}/?skipSplash=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.advanceTime === 'function')
  await press('Enter')
  await press('Enter')
  await press('Enter')
  await advance(1300)
  await press('Enter')

  const signatures = {}
  const expectedColors = {
    Needle: [142, 217, 209, 255],
    Spanner: [225, 184, 79, 255],
    Brick: [194, 137, 69, 255],
  }

  for (const speaker of ['Needle', 'Spanner', 'Brick']) {
    await advance(speaker === 'Needle' ? 650 : 100)
    const state = await readState()
    assert(state.tutorial.speaker === speaker, `Expected ${speaker}, received ${state.tutorial.speaker}`)
    assert(state.tutorial.dialogueComplete === false, `${speaker}'s instruction did not type letter by letter`)
    signatures[speaker] = await readPortraitSignature(expectedColors[speaker])
    assert(signatures[speaker].hasExpectedColor, `${speaker}'s portrait palette was not rendered`)
    await captureState(speaker.toLowerCase())
    await press('Enter')
    if (speaker !== 'Brick') {
      await press('Enter')
    }
  }

  assert(new Set(Object.values(signatures).map((entry) => entry.hash)).size === 3, 'Instructor portraits are not visually distinct')

  await advance(45_000)
  let state = await readState()
  assert(state.tutorial.stepId === 'welcome', 'Final briefing advanced without player confirmation')
  assert(state.tutorial.speaker === 'Brick', 'The final briefing speaker disappeared')
  assert(state.tutorial.dialogueComplete === true, 'The final briefing did not finish typing')
  assert(state.tutorial.dialogue?.includes('I make it shorter.'), 'The final briefing text disappeared')
  assert(state.tutorial.actionCue?.kind === 'confirm', 'The confirmation cue did not recur after prolonged inactivity')
  assert(state.readableText.tutorial.action === 'ENTER: CONFIRM', 'Readable state did not mirror the recurring confirmation cue')

  const origin = { col: state.player.col, row: state.player.row }
  await page.keyboard.down('ArrowRight')
  await advance(1200)
  await page.keyboard.up('ArrowRight')
  state = await readState()
  assert(state.player.col === origin.col && state.player.row === origin.row, 'Player control unlocked before confirmation')
  await captureState('brick-awaiting-confirmation')

  await press('Enter')
  state = await readState()
  assert(state.tutorial.stepId === 'class-tactic', 'Enter did not release the confirmed briefing')

  fs.writeFileSync(path.join(outputDir, 'portrait-signatures.json'), JSON.stringify(signatures, null, 2))
  fs.writeFileSync(path.join(outputDir, 'errors.json'), JSON.stringify(errors, null, 2))
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
} finally {
  await context.close()
  await browser.close()
}

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

async function readPortraitSignature(expectedColor) {
  return page.locator('canvas').evaluate((canvas, color) => {
    const data = canvas.getContext('2d').getImageData(60, 37, 32, 44).data
    let hash = 2166136261
    let hasExpectedColor = false
    for (let index = 0; index < data.length; index += 1) {
      hash = Math.imul(hash ^ data[index], 16777619) >>> 0
      if (
        index % 4 === 0
        && data[index] === color[0]
        && data[index + 1] === color[1]
        && data[index + 2] === color[2]
        && data[index + 3] === color[3]
      ) {
        hasExpectedColor = true
      }
    }
    return { hash, hasExpectedColor }
  }, expectedColor)
}

async function captureState(name) {
  await page.locator('canvas').screenshot({ path: path.join(outputDir, `${name}.png`) })
  fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(await readState(), null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
