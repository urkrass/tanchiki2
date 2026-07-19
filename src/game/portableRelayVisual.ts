export const PORTABLE_RELAY_ROTATION_FRAME_COUNT = 8
export const PORTABLE_RELAY_ROTATION_SECONDS = 2.4

export interface PortableRelayRotationFrame {
  index: number
  openness: number
  side: number
  frontFacing: boolean
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
