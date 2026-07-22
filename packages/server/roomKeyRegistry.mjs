import { randomInt } from 'node:crypto'

const DEFAULT_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const DEFAULT_LENGTH = 6

export class RoomKeyRegistry {
  #keyToRoom = new Map()
  #roomToKey = new Map()
  #alphabet
  #length
  #randomIndex

  constructor({ alphabet = DEFAULT_ALPHABET, length = DEFAULT_LENGTH, randomIndex = (max) => randomInt(max) } = {}) {
    if (typeof alphabet !== 'string' || new Set(alphabet).size !== alphabet.length || alphabet.length < 2) {
      throw new Error('Room-key alphabet must contain unique characters.')
    }
    if (!Number.isSafeInteger(length) || length < 1 || length > 32) {
      throw new Error('Room-key length must be between 1 and 32.')
    }
    this.#alphabet = alphabet
    this.#length = length
    this.#randomIndex = randomIndex
  }

  register(roomId) {
    const normalizedRoomId = requireRoomId(roomId)
    if (this.#roomToKey.has(normalizedRoomId)) {
      throw new Error(`Room ${normalizedRoomId} already has a key.`)
    }
    return this.#assignFreshKey(normalizedRoomId)
  }

  resolve(roomKey) {
    return this.#keyToRoom.get(normalize(roomKey)) ?? null
  }

  currentKey(roomId) {
    return this.#roomToKey.get(requireRoomId(roomId)) ?? null
  }

  rotate(roomId) {
    const normalizedRoomId = requireRoomId(roomId)
    const previousKey = this.#roomToKey.get(normalizedRoomId)
    if (!previousKey) throw new Error(`Room ${normalizedRoomId} is not registered.`)
    this.#keyToRoom.delete(previousKey)
    this.#roomToKey.delete(normalizedRoomId)
    return this.#assignFreshKey(normalizedRoomId)
  }

  deleteByRoom(roomId) {
    const normalizedRoomId = requireRoomId(roomId)
    const key = this.#roomToKey.get(normalizedRoomId)
    if (!key) return false
    this.#roomToKey.delete(normalizedRoomId)
    this.#keyToRoom.delete(key)
    return true
  }

  get size() {
    return this.#roomToKey.size
  }

  #assignFreshKey(roomId) {
    const maximumAttempts = Math.min(10_000, this.#alphabet.length ** this.#length)
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      let key = ''
      for (let index = 0; index < this.#length; index += 1) {
        const randomIndex = this.#randomIndex(this.#alphabet.length)
        if (!Number.isSafeInteger(randomIndex) || randomIndex < 0 || randomIndex >= this.#alphabet.length) {
          throw new Error('Room-key random source returned an invalid index.')
        }
        key += this.#alphabet[randomIndex]
      }
      if (this.#keyToRoom.has(key)) continue
      this.#keyToRoom.set(key, roomId)
      this.#roomToKey.set(roomId, key)
      return key
    }
    throw new Error('Unable to allocate a collision-free room key.')
  }
}

function normalize(value) {
  return String(value ?? '').trim().toUpperCase()
}

function requireRoomId(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) throw new Error('Room id is required.')
  return normalized
}
