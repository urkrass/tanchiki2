export const PORTABLE_RELAY_ROTATION_FRAME_COUNT = 16
export const PORTABLE_RELAY_ROTATION_SECONDS = 2.4

export interface PortableRelayRotationFrame {
  index: number
  openness: number
  side: number
  frontFacing: boolean
}

export interface PortableRelayHubPalette {
  outer: string
  center: string
  glint: string
}

export function getPortableRelayRotationFrame(time: number, phaseOffset = 0): PortableRelayRotationFrame {
  const safeTime = Number.isFinite(time) ? time : 0
  const safeOffset = Number.isFinite(phaseOffset) ? phaseOffset : 0
  const wrapped = ((safeTime + safeOffset) % PORTABLE_RELAY_ROTATION_SECONDS + PORTABLE_RELAY_ROTATION_SECONDS)
    % PORTABLE_RELAY_ROTATION_SECONDS
  const frameDuration = PORTABLE_RELAY_ROTATION_SECONDS / PORTABLE_RELAY_ROTATION_FRAME_COUNT
  const index = Math.floor(wrapped / frameDuration + Number.EPSILON * 8)
    % PORTABLE_RELAY_ROTATION_FRAME_COUNT
  const angle = (index / PORTABLE_RELAY_ROTATION_FRAME_COUNT) * Math.PI * 2
  const facing = Math.cos(angle)

  return {
    index,
    openness: Math.abs(facing),
    side: Math.sin(angle),
    frontFacing: facing >= 0,
  }
}

export function getPortableRelayHubPalette(
  rotation: PortableRelayRotationFrame,
  active: boolean,
): PortableRelayHubPalette {
  if (rotation.frontFacing) {
    return {
      outer: '#131817',
      center: active ? '#86f4ff' : '#ffd35a',
      glint: active ? '#dffcff' : '#fff1a5',
    }
  }

  return {
    outer: '#0d1210',
    center: rotation.openness > 0.6 ? '#17201e' : '#293b36',
    glint: rotation.openness > 0.6 ? '#43534d' : '#596a63',
  }
}
