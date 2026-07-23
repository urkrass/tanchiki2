export interface PositionMemoryPresentationProbe {
  id: string
  alert?: boolean
}

/**
 * Enemy tank history is simulation memory, not a player-facing map marker.
 * Explicit equipment/radar contacts remain presentable because they are live
 * signals produced by a player action rather than remembered tank positions.
 */
export function isPresentableSignalContact(memory: PositionMemoryPresentationProbe) {
  return memory.alert === true || memory.id.startsWith('device-')
}
