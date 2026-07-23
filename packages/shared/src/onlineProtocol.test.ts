import { describe, expect, it } from 'vitest'
import {
  MAX_CLIENT_MESSAGE_BYTES,
  ONLINE_PROTOCOL_VERSION,
  estimateMessageBytes,
  isRoomKey,
  normalizeRoomKey,
  sanitizePlayerName,
  validateClientRoomMessage,
  validateJoinRoomOptions,
} from './onlineProtocol.ts'

describe('online room protocol', () => {
  it('normalizes only ambiguity-free six-character room keys', () => {
    expect(normalizeRoomKey(' ab2z9h ')).toBe('AB2Z9H')
    expect(isRoomKey('ab2z9h')).toBe(true)
    expect(isRoomKey('ABOZ9H')).toBe(false)
    expect(isRoomKey('AB2Z9')).toBe(false)
  })

  it('sanitizes anonymous player names without trusting markup', () => {
    expect(sanitizePlayerName('  Rook<script>  ')).toBe('Rookscript')
    expect(sanitizePlayerName('')).toBe('Rookie')
    expect(sanitizePlayerName('Дальний разведчик')).toBe('Дальний разведчик')
    expect(sanitizePlayerName('Ｒｏｏｋ\u202e\u200b  隊')).toBe('Rook 隊')
    expect([...sanitizePlayerName('𐐀'.repeat(30))]).toHaveLength(18)
  })

  it('requires the current protocol and a key for joins', () => {
    expect(validateJoinRoomOptions({ protocolVersion: ONLINE_PROTOCOL_VERSION, name: 'Blue', create: true, classId: 'battle' })).toMatchObject({
      ok: true,
      value: { classId: 'battle' },
    })
    expect(validateJoinRoomOptions({ protocolVersion: ONLINE_PROTOCOL_VERSION, name: 'Red', roomKey: 'ab2z9h' })).toMatchObject({
      ok: true,
      value: { roomKey: 'AB2Z9H' },
    })
    expect(validateJoinRoomOptions({ protocolVersion: 0, name: 'Old', roomKey: 'AB2Z9H' })).toMatchObject({
      ok: false,
      code: 'PROTOCOL_VERSION_UNSUPPORTED',
    })
  })

  it('rejects malformed, conflicting, and oversized client data', () => {
    expect(validateClientRoomMessage({
      type: 'input',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      inputSeq: 4,
      up: true,
      left: true,
    })).toMatchObject({ ok: false, code: 'MESSAGE_INVALID' })
    expect(validateClientRoomMessage({
      type: 'ping',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      col: 20,
      row: 4,
    })).toMatchObject({ ok: false, code: 'MESSAGE_INVALID' })
    expect(estimateMessageBytes({ text: 'x'.repeat(MAX_CLIENT_MESSAGE_BYTES + 1) })).toBeGreaterThan(MAX_CLIENT_MESSAGE_BYTES)
  })

  it('accepts bounded gameplay and heartbeat messages', () => {
    expect(validateClientRoomMessage({
      type: 'input',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      inputSeq: 5,
      right: true,
      fire: true,
    })).toMatchObject({ ok: true, value: { inputSeq: 5, right: true, fire: true } })
    expect(validateClientRoomMessage({
      type: 'class',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      classId: 'scout',
    })).toMatchObject({ ok: true, value: { classId: 'scout' } })
    expect(validateClientRoomMessage({
      type: 'equipment',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      equipmentSeq: 3,
      slot: 2,
      down: true,
    })).toMatchObject({ ok: true, value: { equipmentSeq: 3, slot: 2, down: true } })
    expect(validateClientRoomMessage({
      type: 'radio',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      command: 'REGROUP',
    })).toMatchObject({ ok: true, value: { command: 'REGROUP' } })
    expect(validateClientRoomMessage({
      type: 'heartbeat',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      heartbeatSeq: 2,
      clientSentAt: 123.4,
      pageVisible: true,
      fps: 60,
      longFrames: 1,
    })).toMatchObject({ ok: true })
    expect(validateClientRoomMessage({
      type: 'result_choice',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      resultId: 'result-1',
      choice: 'rematch',
    })).toMatchObject({ ok: true, value: { resultId: 'result-1', choice: 'rematch' } })
    expect(validateClientRoomMessage({
      type: 'result_choice',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      resultId: 'result-1',
      choice: 'again',
    })).toMatchObject({ ok: false, code: 'MESSAGE_INVALID' })
  })

  it('rejects arbitrary and legacy free-text radio messages', () => {
    expect(validateClientRoomMessage({
      type: 'radio',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      command: 'write anything here',
    })).toMatchObject({ ok: false, code: 'MESSAGE_INVALID' })
    expect(validateClientRoomMessage({
      type: 'chat',
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      text: 'legacy free text',
    })).toMatchObject({ ok: false, code: 'MESSAGE_INVALID' })
  })
})
