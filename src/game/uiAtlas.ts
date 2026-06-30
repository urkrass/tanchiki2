export type UiSheetId = 'ui32' | 'ui20'

export interface UiSpriteRect {
  x: number
  y: number
  w: number
  h: number
}

export interface DrawUiSpriteOptions {
  sheet?: UiSheetId
  width?: number
  height?: number
  alpha?: number
}

export const UI_SPRITE_IDS = [
  'hud.hp',
  'hud.lives',
  'hud.enemies',
  'hud.level',
  'hud.credits',
  'hud.base',
  'hud.score',
  'hud.timer',
  'hud.link.on',
  'hud.link.off',
  'hud.radio',
  'hud.ping',
  'hud.connection',
  'hud.team.blue',
  'hud.team.red',
  'hud.enemy',
  'menu.title',
  'menu.selector',
  'menu.highlight',
  'menu.divider',
  'menu.upgrade.empty',
  'menu.upgrade.fill',
  'menu.badge.blue',
  'menu.badge.red',
  'touch.up',
  'touch.down',
  'touch.left',
  'touch.right',
  'touch.fire',
  'touch.pause',
  'status.ok',
  'status.warn',
  'status.off',
  'status.radio',
  'status.ping',
  'status.link.on',
  'status.link.off',
  'status.connection',
  'menu.corner',
  'menu.scanline',
  'hud.team.blue.safe',
  'hud.team.red.safe',
  'menu.badge.blue.safe',
  'menu.badge.red.safe',
  'menu.highlight.pressed',
  'menu.selector.pressed',
  'loading.plaque',
  'loading.bar.empty',
  'loading.bar.fill',
  'loading.spark',
  'loading.tread',
] as const

export type UiSpriteId = (typeof UI_SPRITE_IDS)[number]

interface SheetDefinition {
  url: string
  cellSize: number
  columns: number
}

interface LoadedUiSheet extends SheetDefinition {
  image: HTMLImageElement | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  promise: Promise<void> | null
  sprites: Record<string, UiSpriteRect>
}

const sheetDefinitions: Record<UiSheetId, SheetDefinition> = {
  ui32: {
    url: '/assets/sprites/tanchiki-ui-32.png?v=3',
    cellSize: 32,
    columns: 8,
  },
  ui20: {
    url: '/assets/sprites/tanchiki-ui-20.png?v=3',
    cellSize: 20,
    columns: 8,
  },
}

const sheets: Record<UiSheetId, LoadedUiSheet> = {
  ui32: createSheet('ui32'),
  ui20: createSheet('ui20'),
}

export function loadUiAtlas() {
  return Promise.all(Object.keys(sheets).map((sheet) => ensureSheet(sheet as UiSheetId))).then(() => undefined)
}

export function drawUiSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: UiSpriteId,
  x: number,
  y: number,
  options: DrawUiSpriteOptions = {},
) {
  const sheetId = options.sheet ?? 'ui32'
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

export function isUiAtlasReady() {
  return Object.values(sheets).every((sheet) => sheet.status === 'ready')
}

function createSheet(sheetId: UiSheetId): LoadedUiSheet {
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
    UI_SPRITE_IDS.map((spriteId, index) => [
      spriteId,
      {
        x: (index % columns) * cellSize,
        y: Math.floor(index / columns) * cellSize,
        w: cellSize,
        h: cellSize,
      },
    ]),
  )
}

function ensureSheet(sheetId: UiSheetId) {
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
      reject(new Error(`Unable to load UI sprite sheet: ${sheet.url}`))
    }
    image.src = sheet.url
  }).catch(() => undefined)

  return sheet.promise
}
