import staticRelayManifestJson from './assets/static-relay-density.manifest.json'

export interface StaticRelayDensityManifest {
  version: number
  canonicalWidth: number
  canonicalHeight: number
  path: string
  cellWidth: number
  cellHeight: number
  columns: number
  rows: number
  frames: number
}

export const STATIC_RELAY_DENSITY_MANIFEST = staticRelayManifestJson as StaticRelayDensityManifest
export const STATIC_RELAY_RUNTIME_WIDTH = 32
export const STATIC_RELAY_RUNTIME_HEIGHT = 60

type StaticRelayAtlasStatus = 'idle' | 'loading' | 'ready' | 'error'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
const atlas = {
  image: null as HTMLImageElement | null,
  status: 'idle' as StaticRelayAtlasStatus,
  promise: null as Promise<void> | null,
}

export function loadStaticRelayAtlas() {
  return ensureStaticRelayAtlas()
}

export function isStaticRelayAtlasReady() {
  return atlas.status === 'ready'
}

export function getStaticRelaySpriteRect(frame: number) {
  const normalizedFrame = Math.abs(Math.floor(frame)) % STATIC_RELAY_DENSITY_MANIFEST.frames
  return {
    id: `static-relay.${normalizedFrame}`,
    x: (normalizedFrame % STATIC_RELAY_DENSITY_MANIFEST.columns) * STATIC_RELAY_DENSITY_MANIFEST.cellWidth,
    y: Math.floor(normalizedFrame / STATIC_RELAY_DENSITY_MANIFEST.columns) * STATIC_RELAY_DENSITY_MANIFEST.cellHeight,
    w: STATIC_RELAY_DENSITY_MANIFEST.cellWidth,
    h: STATIC_RELAY_DENSITY_MANIFEST.cellHeight,
  }
}

export function getStaticRelayRuntimeDimensions(requestedSize: number) {
  const size = Math.max(1, Math.round(requestedSize))
  if (size < STATIC_RELAY_RUNTIME_WIDTH) {
    return {
      width: size,
      height: Math.round(size * 1.5),
    }
  }
  return {
    width: STATIC_RELAY_RUNTIME_WIDTH,
    height: STATIC_RELAY_RUNTIME_HEIGHT,
  }
}

export function drawStaticRelayAtlasSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: number,
) {
  void ensureStaticRelayAtlas()
  if (atlas.status !== 'ready' || !atlas.image) {
    return false
  }

  const source = getStaticRelaySpriteRect(frame)
  const dimensions = getStaticRelayRuntimeDimensions(size)
  const destinationX = Math.round(x + (size - dimensions.width) / 2)
  const destinationY = Math.round(y + size - dimensions.height)
  const previousSmoothing = ctx.imageSmoothingEnabled

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    atlas.image,
    source.x,
    source.y,
    source.w,
    source.h,
    destinationX,
    destinationY,
    dimensions.width,
    dimensions.height,
  )
  ctx.imageSmoothingEnabled = previousSmoothing
  return true
}

export function validateStaticRelayDensityManifest(
  manifest: StaticRelayDensityManifest = STATIC_RELAY_DENSITY_MANIFEST,
) {
  const errors: string[] = []
  if (manifest.canonicalWidth !== 64 || manifest.canonicalHeight !== 120) {
    errors.push('Canonical static relay density must be 64 by 120.')
  }
  if (manifest.cellWidth !== manifest.canonicalWidth || manifest.cellHeight !== manifest.canonicalHeight) {
    errors.push('Static relay atlas cells must match the canonical density.')
  }
  if (manifest.columns * manifest.rows !== manifest.frames) {
    errors.push('Static relay atlas grid does not match the frame contract.')
  }
  if (manifest.frames !== 2) {
    errors.push('Static relay atlas must define two restrained signal frames.')
  }
  return errors
}

function ensureStaticRelayAtlas() {
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
      reject(new Error(`Unable to load static relay atlas: ${STATIC_RELAY_DENSITY_MANIFEST.path}`))
    }
    image.src = assetUrl(STATIC_RELAY_DENSITY_MANIFEST.path)
  }).catch(() => undefined)
  return atlas.promise
}
