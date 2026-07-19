import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUTPUT_URL = new URL('../public/assets/sprites/tanchiki-vehicles-48.atlas.svg', import.meta.url)
const DENSITY = 48
const COLUMNS = 8
const CLASSES = ['scout', 'engineer', 'battle']
const TEAMS = ['blue', 'red', 'blueSafe', 'redSafe']
const PALETTES = {
  blue: { body: '#66c8ff', trim: '#194f78', highlight: '#ecfbff', signal: '#86f4ff' },
  red: { body: '#f06243', trim: '#7d2419', highlight: '#ffd6c8', signal: '#ffcfb7' },
  blueSafe: { body: '#2fd4ff', trim: '#06364d', highlight: '#f3ffff', signal: '#b9f3ff' },
  redSafe: { body: '#ffb000', trim: '#553300', highlight: '#fff0bd', signal: '#ffe0a3' },
}

const DARK = '#080b0a'
const TRACK = '#252a27'
const TRACK_LIGHT = '#4c5650'
const METAL = '#aeb9b5'

function rect(x, y, width, height, fill, layer) {
  return `    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" data-layer="${layer}"/>`
}

function trackRects(leftX, rightX, width, frame, palette) {
  const rows = []
  rows.push(rect(leftX, 8, width, 37, DARK, 'class-chassis'))
  rows.push(rect(rightX, 8, width, 37, DARK, 'class-chassis'))
  rows.push(rect(leftX + 2, 10, width - 4, 33, TRACK, 'class-chassis'))
  rows.push(rect(rightX + 2, 10, width - 4, 33, TRACK, 'class-chassis'))
  for (let y = 11 + frame * 2; y <= 39; y += 6) {
    rows.push(rect(leftX + 1, y, width - 2, 2, y % 12 === 1 ? palette.trim : TRACK_LIGHT, 'class-chassis'))
    rows.push(rect(rightX + 1, y, width - 2, 2, y % 12 === 1 ? palette.trim : TRACK_LIGHT, 'class-chassis'))
  }
  return rows
}

function scoutRects(frame, palette) {
  const rows = trackRects(7, 34, 7, frame, palette)
  rows.push(rect(12, 8, 24, 37, DARK, 'class-chassis'))
  rows.push(rect(14, 9, 20, 35, palette.highlight, 'team-rim'))
  rows.push(rect(16, 11, 16, 31, palette.body, 'team-fill'))
  rows.push(rect(16, 31, 16, 7, palette.trim, 'internal-detail'))
  rows.push(rect(18, 13, 3, 16, palette.trim, 'internal-detail'))
  rows.push(rect(27, 13, 3, 16, palette.trim, 'internal-detail'))
  rows.push(rect(16, 7, 16, 18, DARK, 'class-turret'))
  rows.push(rect(18, 8, 12, 15, palette.highlight, 'team-rim'))
  rows.push(rect(20, 10, 8, 11, palette.body, 'team-fill'))
  rows.push(rect(22, 0, 4, 15, DARK, 'class-turret'))
  rows.push(rect(23, 1, 2, 14, palette.trim, 'team-fill'))
  rows.push(rect(34, 3, 2, 14, DARK, 'equipment'))
  rows.push(rect(35, 4, 1, 12, palette.signal, 'equipment'))
  rows.push(rect(32, 3, 6, 2, palette.highlight, 'equipment'))
  rows.push(rect(35, 1, 2, 2, palette.signal, 'equipment'))
  rows.push(rect(18, 40, 4, 2, palette.highlight, 'internal-detail'))
  rows.push(rect(26, 40, 4, 2, palette.highlight, 'internal-detail'))
  return rows
}

function engineerRects(frame, palette) {
  const rows = trackRects(4, 35, 9, frame, palette)
  rows.push(rect(9, 7, 30, 38, DARK, 'class-chassis'))
  rows.push(rect(11, 8, 26, 36, palette.highlight, 'team-rim'))
  rows.push(rect(13, 10, 22, 32, palette.body, 'team-fill'))
  rows.push(rect(13, 31, 22, 9, palette.trim, 'internal-detail'))
  rows.push(rect(15, 13, 5, 15, palette.trim, 'internal-detail'))
  rows.push(rect(28, 13, 5, 15, palette.trim, 'internal-detail'))
  rows.push(rect(14, 6, 20, 20, DARK, 'class-turret'))
  rows.push(rect(16, 7, 16, 17, palette.highlight, 'team-rim'))
  rows.push(rect(18, 9, 12, 13, palette.body, 'team-fill'))
  rows.push(rect(22, 0, 4, 16, DARK, 'class-turret'))
  rows.push(rect(23, 1, 2, 15, palette.trim, 'team-fill'))
  rows.push(rect(2, 30, 12, 13, DARK, 'equipment'))
  rows.push(rect(4, 31, 8, 10, '#d9a833', 'equipment'))
  rows.push(rect(36, 30, 10, 13, DARK, 'equipment'))
  rows.push(rect(38, 31, 6, 10, METAL, 'equipment'))
  rows.push(rect(39, 15, 7, 3, DARK, 'equipment'))
  rows.push(rect(42, 11, 3, 9, palette.signal, 'equipment'))
  rows.push(rect(20, 35, 8, 4, '#18201c', 'internal-detail'))
  rows.push(rect(22, 36, 4, 2, palette.signal, 'equipment'))
  return rows
}

function battleRects(frame, palette) {
  const rows = trackRects(1, 37, 10, frame, palette)
  rows.push(rect(5, 6, 38, 40, DARK, 'class-chassis'))
  rows.push(rect(7, 7, 34, 38, palette.highlight, 'team-rim'))
  rows.push(rect(9, 9, 30, 34, palette.body, 'team-fill'))
  rows.push(rect(9, 30, 30, 11, palette.trim, 'internal-detail'))
  rows.push(rect(6, 15, 7, 24, DARK, 'armor-identity'))
  rows.push(rect(35, 15, 7, 24, DARK, 'armor-identity'))
  rows.push(rect(8, 17, 5, 20, METAL, 'armor-identity'))
  rows.push(rect(35, 17, 5, 20, METAL, 'armor-identity'))
  rows.push(rect(10, 4, 28, 24, DARK, 'class-turret'))
  rows.push(rect(12, 5, 24, 21, palette.highlight, 'team-rim'))
  rows.push(rect(14, 7, 20, 17, palette.body, 'team-fill'))
  rows.push(rect(20, 0, 8, 18, DARK, 'class-turret'))
  rows.push(rect(22, 1, 4, 17, palette.trim, 'team-fill'))
  rows.push(rect(15, 10, 5, 10, palette.trim, 'internal-detail'))
  rows.push(rect(28, 10, 5, 10, palette.trim, 'internal-detail'))
  rows.push(rect(14, 35, 20, 3, METAL, 'armor-identity'))
  rows.push(rect(18, 40, 12, 2, palette.highlight, 'internal-detail'))
  return rows
}

function spriteRects(tankClass, frame, palette) {
  if (tankClass === 'scout') return scoutRects(frame, palette)
  if (tankClass === 'engineer') return engineerRects(frame, palette)
  return battleRects(frame, palette)
}

export function buildVehicleAtlasSvg() {
  const width = COLUMNS * DENSITY
  const height = CLASSES.length * DENSITY
  const groups = []

  for (let classIndex = 0; classIndex < CLASSES.length; classIndex += 1) {
    const tankClass = CLASSES[classIndex]
    for (let teamIndex = 0; teamIndex < TEAMS.length; teamIndex += 1) {
      const team = TEAMS[teamIndex]
      for (let frame = 0; frame < 2; frame += 1) {
        const x = (teamIndex * 2 + frame) * DENSITY
        const y = classIndex * DENSITY
        groups.push(
          `  <g id="tank.${tankClass}.${team}.${frame}" transform="translate(${x} ${y})" data-density="${DENSITY}">\n` +
            `${spriteRects(tankClass, frame, PALETTES[team]).join('\n')}\n` +
            '  </g>',
        )
      }
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    `  <metadata>{"asset":"tanchiki-vehicles-48","canonicalDensity":${DENSITY},"columns":${COLUMNS},"rows":${CLASSES.length},"generated":true}</metadata>`,
    '  <rect width="100%" height="100%" fill="none"/>',
    ...groups,
    '</svg>',
    '',
  ].join('\n')
}

async function main() {
  const expected = buildVehicleAtlasSvg()
  if (process.argv.includes('--check')) {
    const actual = await readFile(OUTPUT_URL, 'utf8').catch(() => '')
    if (actual !== expected) {
      console.error(`VEHICLE_ATLAS_DRIFT ${fileURLToPath(OUTPUT_URL)}`)
      process.exitCode = 1
      return
    }
    console.log('VEHICLE_ATLAS_SYNCED density=48 sprites=24 dimensions=384x144')
    return
  }

  await writeFile(OUTPUT_URL, expected, 'utf8')
  console.log(`WROTE ${fileURLToPath(OUTPUT_URL)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`))) {
  await main()
}
