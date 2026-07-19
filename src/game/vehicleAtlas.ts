import vehicleManifestJson from './assets/vehicle-density.manifest.json'
import type { Direction, TankClassId } from './types.ts'
import type { AtlasTeamKey } from './spriteAtlas.ts'

export interface VehicleDensityManifest {
  version: number
  canonicalDensity: number
  path: string
  cellWidth: number
  cellHeight: number
  columns: number
  rows: number
  classes: TankClassId[]
  teams: AtlasTeamKey[]
  frames: number
}

export const VEHICLE_DENSITY_MANIFEST = vehicleManifestJson as VehicleDensityManifest
export const CANONICAL_VEHICLE_DENSITY = VEHICLE_DENSITY_MANIFEST.canonicalDensity

type VehicleAtlasStatus = 'idle' | 'loading' | 'ready' | 'error'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
const atlas = {
  image: null as HTMLImageElement | null,
  status: 'idle' as VehicleAtlasStatus,
  promise: null as Promise<void> | null,
}

export function loadVehicleAtlas() {
  return ensureVehicleAtlas()
}

export function isVehicleAtlasReady() {
  return atlas.status === 'ready'
}

export function getVehicleSpriteRect(tankClass: TankClassId, team: AtlasTeamKey, frame: number) {
  const classIndex = VEHICLE_DENSITY_MANIFEST.classes.indexOf(tankClass)
  const teamIndex = VEHICLE_DENSITY_MANIFEST.teams.indexOf(team)
  if (classIndex < 0 || teamIndex < 0) {
    return null
  }
  const normalizedFrame = Math.abs(Math.floor(frame)) % VEHICLE_DENSITY_MANIFEST.frames
  const spriteIndex = classIndex * VEHICLE_DENSITY_MANIFEST.teams.length * VEHICLE_DENSITY_MANIFEST.frames
    + teamIndex * VEHICLE_DENSITY_MANIFEST.frames
    + normalizedFrame
  return {
    id: `tank.${tankClass}.${team}.${normalizedFrame}`,
    x: (spriteIndex % VEHICLE_DENSITY_MANIFEST.columns) * VEHICLE_DENSITY_MANIFEST.cellWidth,
    y: Math.floor(spriteIndex / VEHICLE_DENSITY_MANIFEST.columns) * VEHICLE_DENSITY_MANIFEST.cellHeight,
    w: VEHICLE_DENSITY_MANIFEST.cellWidth,
    h: VEHICLE_DENSITY_MANIFEST.cellHeight,
  }
}

export function drawVehicleAtlasSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  tankClass: TankClassId,
  team: AtlasTeamKey,
  frame: number,
) {
  void ensureVehicleAtlas()
  if (atlas.status !== 'ready' || !atlas.image) {
    return false
  }

  const source = getVehicleSpriteRect(tankClass, team, frame)
  if (!source) {
    return false
  }

  const previousSmoothing = ctx.imageSmoothingEnabled
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(directionAngle(direction))
  ctx.drawImage(
    atlas.image,
    source.x,
    source.y,
    source.w,
    source.h,
    -CANONICAL_VEHICLE_DENSITY / 2,
    -CANONICAL_VEHICLE_DENSITY / 2,
    CANONICAL_VEHICLE_DENSITY,
    CANONICAL_VEHICLE_DENSITY,
  )
  ctx.restore()
  ctx.imageSmoothingEnabled = previousSmoothing
  return true
}

export function validateVehicleDensityManifest(manifest: VehicleDensityManifest = VEHICLE_DENSITY_MANIFEST) {
  const errors: string[] = []
  if (manifest.canonicalDensity !== 48) errors.push('Canonical vehicle density must be 48.')
  if (manifest.cellWidth !== manifest.canonicalDensity || manifest.cellHeight !== manifest.canonicalDensity) {
    errors.push('Vehicle atlas cells must match the canonical density.')
  }
  if (manifest.columns * manifest.rows !== manifest.classes.length * manifest.teams.length * manifest.frames) {
    errors.push('Vehicle atlas grid does not match the class/team/frame contract.')
  }
  if (new Set(manifest.classes).size !== 3) errors.push('Vehicle atlas must define three unique classes.')
  if (new Set(manifest.teams).size !== 4) errors.push('Vehicle atlas must define four unique team palettes.')
  if (manifest.frames !== 2) errors.push('Vehicle atlas must define idle and movement frames.')
  return errors
}

function ensureVehicleAtlas() {
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
      reject(new Error(`Unable to load vehicle atlas: ${VEHICLE_DENSITY_MANIFEST.path}`))
    }
    image.src = assetUrl(VEHICLE_DENSITY_MANIFEST.path)
  }).catch(() => undefined)
  return atlas.promise
}

function directionAngle(direction: Direction) {
  if (direction === 'right') return Math.PI / 2
  if (direction === 'down') return Math.PI
  if (direction === 'left') return -Math.PI / 2
  return 0
}
