import type { Direction } from './types.ts'

export type SpriteSheetId = 'core32' | 'core20'
export type AtlasTeamKey = 'blue' | 'red' | 'blueSafe' | 'redSafe'
export type AtlasRelayKey = AtlasTeamKey | 'neutral'

export interface SpriteRect {
  x: number
  y: number
  w: number
  h: number
}

export interface DrawAtlasSpriteOptions {
  sheet?: SpriteSheetId
  width?: number
  height?: number
  alpha?: number
}

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left']
const TEAM_KEYS: AtlasTeamKey[] = ['blue', 'red', 'blueSafe', 'redSafe']
const RELAY_KEYS: AtlasRelayKey[] = ['neutral', 'blue', 'red', 'blueSafe', 'redSafe']
const RELAY_SPRITE_IDS = RELAY_KEYS.flatMap((team) => [0, 1].map((frame) => `relay.${team}.${frame}`))

export const SPRITE_IDS = [
  'terrain.brick',
  'terrain.brick.damaged',
  'terrain.steel',
  'terrain.water.0',
  'terrain.water.1',
  'terrain.water.2',
  'terrain.trees',
  'terrain.base.alive',
  'terrain.base.dead',
  ...TEAM_KEYS.flatMap((team) => DIRECTIONS.flatMap((direction) => [0, 1].map((frame) => `tank.${team}.${direction}.${frame}`))),
  ...TEAM_KEYS.flatMap((team) =>
    DIRECTIONS.flatMap((direction) => [0, 1].map((frame) => `projectile.${team}.${direction}.${frame}`)),
  ),
  ...RELAY_SPRITE_IDS,
  ...[0, 1, 2, 3].map((frame) => `effect.explosion.${frame}`),
  'effect.muzzle.0',
  'effect.muzzle.1',
  'marker.ping',
  'marker.lastKnown',
  'terrain.radio',
  'terrain.radio.damaged',
  'terrain.depot',
  'terrain.depot.damaged',
  'terrain.road',
] as const

export type AtlasSpriteId = (typeof SPRITE_IDS)[number]

interface SheetDefinition {
  url: string
  cellSize: number
  columns: number
}

interface LoadedSheet extends SheetDefinition {
  image: HTMLImageElement | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  promise: Promise<void> | null
  sprites: Record<string, SpriteRect>
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

const sheetDefinitions: Record<SpriteSheetId, SheetDefinition> = {
  core32: {
    url: assetUrl('assets/sprites/tanchiki-core-32.png?v=3'),
    cellSize: 32,
    columns: 16,
  },
  core20: {
    url: assetUrl('assets/sprites/tanchiki-core-20.png?v=3'),
    cellSize: 20,
    columns: 16,
  },
}

const sheets: Record<SpriteSheetId, LoadedSheet> = {
  core32: createSheet('core32'),
  core20: createSheet('core20'),
}

export function loadSpriteAtlas() {
  return Promise.all(Object.keys(sheets).map((sheet) => ensureSheet(sheet as SpriteSheetId))).then(() => undefined)
}

export function drawAtlasSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  x: number,
  y: number,
  options: DrawAtlasSpriteOptions = {},
) {
  const sheetId = options.sheet ?? 'core32'
  const sheet = sheets[sheetId]

  void ensureSheet(sheetId)

  if (sheet.status !== 'ready' || !sheet.image) {
    return false
  }

  const rect = sheet.sprites[spriteId]

  if (!rect) {
    return false
  }

  const width = options.width ?? rect.w
  const height = options.height ?? rect.h
  const previousSmoothing = ctx.imageSmoothingEnabled
  const previousAlpha = ctx.globalAlpha

  ctx.imageSmoothingEnabled = false
  if (options.alpha !== undefined) {
    ctx.globalAlpha = previousAlpha * options.alpha
  }

  ctx.drawImage(
    sheet.image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  )

  ctx.imageSmoothingEnabled = previousSmoothing
  ctx.globalAlpha = previousAlpha
  return true
}

export function isAtlasReady() {
  return Object.values(sheets).every((sheet) => sheet.status === 'ready')
}

function createSheet(sheetId: SpriteSheetId): LoadedSheet {
  const definition = sheetDefinitions[sheetId]

  return {
    ...definition,
    image: null,
    status: 'idle',
    promise: null,
    sprites: createManifest(definition.cellSize, definition.columns),
  }
}

function createManifest(cellSize: number, columns: number) {
  return Object.fromEntries(
    SPRITE_IDS.map((spriteId, index) => [
      spriteId,
      relayTowerRect(spriteId, cellSize) ?? {
        x: (index % columns) * cellSize,
        y: Math.floor(index / columns) * cellSize,
        w: cellSize,
        h: cellSize,
      },
    ]),
  )
}

function relayTowerRect(spriteId: string, cellSize: number): SpriteRect | null {
  if (!spriteId.startsWith('relay.')) {
    return null
  }

  const relayIndex = RELAY_SPRITE_IDS.indexOf(spriteId)
  if (relayIndex < 0) {
    return null
  }

  return {
    x: relayIndex * cellSize,
    y: cellSize * 6,
    w: cellSize,
    h: Math.round(cellSize * 1.5),
  }
}

function ensureSheet(sheetId: SpriteSheetId) {
  const sheet = sheets[sheetId]

  if (sheet.status === 'ready') {
    return Promise.resolve()
  }

  if (sheet.promise) {
    return sheet.promise
  }

  sheet.status = 'loading'
  sheet.promise = new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      sheet.image = image
      sheet.status = 'ready'
      resolve()
    }
    image.onerror = () => {
      sheet.status = 'error'
      reject(new Error(`Unable to load sprite sheet: ${sheet.url}`))
    }
    image.src = sheet.url
  }).catch(() => undefined)

  return sheet.promise
}
