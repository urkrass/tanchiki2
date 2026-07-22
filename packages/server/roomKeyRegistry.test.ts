import { describe, expect, it } from 'vitest'
import { ROOM_KEY_ALPHABET, ROOM_KEY_LENGTH } from '../shared/src/onlineProtocol.ts'
import { RoomKeyRegistry } from './roomKeyRegistry.mjs'

describe('RoomKeyRegistry', () => {
  it('creates case-insensitive ambiguity-free keys with a separate internal room id', () => {
    let index = 0
    const registry = new RoomKeyRegistry({
      alphabet: ROOM_KEY_ALPHABET,
      length: ROOM_KEY_LENGTH,
      randomIndex: () => index++ % ROOM_KEY_ALPHABET.length,
    })

    const key = registry.register('internal-room-id')
    expect(key).toHaveLength(6)
    expect([...key].every((character) => ROOM_KEY_ALPHABET.includes(character))).toBe(true)
    expect(registry.resolve(key.toLowerCase())).toBe('internal-room-id')
    expect(key).not.toContain('0')
    expect(key).not.toContain('O')
  })

  it('collision-checks generated keys and rotates atomically', () => {
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]
    const registry = new RoomKeyRegistry({ randomIndex: () => values.shift() ?? 3 })
    const first = registry.register('room-a')
    const second = registry.register('room-b')
    expect(first).not.toBe(second)

    const replacement = registry.rotate('room-a')
    expect(replacement).not.toBe(first)
    expect(registry.resolve(first)).toBeNull()
    expect(registry.resolve(replacement)).toBe('room-a')
    expect(registry.currentKey('room-a')).toBe(replacement)
  })

  it('removes both directions during disposal', () => {
    const registry = new RoomKeyRegistry({ randomIndex: () => 0 })
    const key = registry.register('room-a')
    expect(registry.deleteByRoom('room-a')).toBe(true)
    expect(registry.resolve(key)).toBeNull()
    expect(registry.currentKey('room-a')).toBeNull()
    expect(registry.size).toBe(0)
  })
})
