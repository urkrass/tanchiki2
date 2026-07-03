import {
  BATTLEFIELD_PROP_MANIFEST,
  type BattlefieldPropAtlasDefinition,
  type BattlefieldPropSpriteDefinition,
} from './battlefieldProps.ts'

export interface DrawBattlefieldPropAtlasSpriteOptions {
  width?: number
  height?: number
  alpha?: number
}

type BattlefieldPropAtlasStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable'

interface LoadedBattlefieldPropAtlas extends BattlefieldPropAtlasDefinition {
  image: HTMLImageElement | null
  status: BattlefieldPropAtlasStatus
  promise: Promise<void> | null
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

const atlases = new Map<string, LoadedBattlefieldPropAtlas>(
  BATTLEFIELD_PROP_MANIFEST.atlases.map((atlas) => [
    atlas.name,
    {
      ...atlas,
      image: null,
      status: atlas.path.startsWith('procedural:') ? 'unavailable' : 'idle',
      promise: null,
    },
  ]),
)

export function loadBattlefieldPropAtlas() {
  return Promise.all([...atlases.keys()].map((atlasName) => ensureBattlefieldPropAtlas(atlasName))).then(() => undefined)
}

export function isBattlefieldPropAtlasReady() {
  return [...atlases.values()].filter((atlas) => !atlas.path.startsWith('procedural:')).every((atlas) => atlas.status === 'ready')
}

export function getBattlefieldPropAtlasStatus(atlasName: string) {
  return atlases.get(atlasName)?.status ?? 'unavailable'
}

export function canDrawBattlefieldPropAtlasSprite(definition: BattlefieldPropSpriteDefinition | null | undefined) {
  if (!definition || !hasPositiveSource(definition)) {
    return false
  }

  const atlas = atlases.get(definition.atlas)
  return Boolean(atlas && !atlas.path.startsWith('procedural:'))
}

export function drawBattlefieldPropAtlasSprite(
  ctx: CanvasRenderingContext2D,
  definition: BattlefieldPropSpriteDefinition | null,
  x: number,
  y: number,
  options: DrawBattlefieldPropAtlasSpriteOptions = {},
) {
  if (!canDrawBattlefieldPropAtlasSprite(definition)) {
    return false
  }

  const sprite = definition as BattlefieldPropSpriteDefinition
  const atlas = atlases.get(sprite.atlas)

  if (!atlas) {
    return false
  }

  void ensureBattlefieldPropAtlas(sprite.atlas)

  if (atlas.status !== 'ready' || !atlas.image) {
    return false
  }

  const width = options.width ?? sprite.dimensions.w
  const height = options.height ?? sprite.dimensions.h
  const previousSmoothing = ctx.imageSmoothingEnabled
  const previousAlpha = ctx.globalAlpha

  ctx.imageSmoothingEnabled = false
  if (options.alpha !== undefined) {
    ctx.globalAlpha = previousAlpha * options.alpha
  }

  ctx.drawImage(
    atlas.image,
    sprite.source.x,
    sprite.source.y,
    sprite.source.w,
    sprite.source.h,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  )

  ctx.imageSmoothingEnabled = previousSmoothing
  ctx.globalAlpha = previousAlpha
  return true
}

function ensureBattlefieldPropAtlas(atlasName: string) {
  const atlas = atlases.get(atlasName)

  if (!atlas || atlas.path.startsWith('procedural:')) {
    return Promise.resolve()
  }

  if (atlas.status === 'ready') {
    return Promise.resolve()
  }

  if (atlas.promise) {
    return atlas.promise
  }

  if (typeof Image === 'undefined') {
    atlas.status = 'error'
    return Promise.resolve()
  }

  atlas.status = 'loading'
  atlas.promise = new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      atlas.image = image
      atlas.status = 'ready'
      resolve()
    }
    image.onerror = () => {
      atlas.status = 'error'
      reject(new Error(`Unable to load battlefield prop atlas: ${atlas.path}`))
    }
    image.src = assetUrl(atlas.path)
  }).catch(() => undefined)

  return atlas.promise
}

function hasPositiveSource(definition: BattlefieldPropSpriteDefinition) {
  return definition.source.w > 0 && definition.source.h > 0 && definition.dimensions.w > 0 && definition.dimensions.h > 0
}
