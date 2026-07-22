import { describe, expect, it } from 'vitest'
import {
  ONLINE_ENTRY_CREATE_ACTION_Y,
  ONLINE_ENTRY_JOIN_ACTION_Y,
  getOnlineEntryHit,
  normalizeOnlineEntryValue,
} from './onlineEntryLayout.ts'

describe('online room entry layout', () => {
  it('keeps the visible create and join actions inside their touch hit targets', () => {
    expect(getOnlineEntryHit('create', ONLINE_ENTRY_CREATE_ACTION_Y)).toBe('action')
    expect(getOnlineEntryHit('join', ONLINE_ENTRY_JOIN_ACTION_Y)).toBe('action')
    expect(getOnlineEntryHit('create', ONLINE_ENTRY_JOIN_ACTION_Y)).toBeNull()
  })

  it('targets the callsign and join-key fields independently', () => {
    expect(getOnlineEntryHit('create', 146)).toBe('name')
    expect(getOnlineEntryHit('create', 198)).toBeNull()
    expect(getOnlineEntryHit('join', 198)).toBe('key')
  })

  it('normalizes native mobile input with the protocol limits', () => {
    expect(normalizeOnlineEntryValue('name', '  Tänk🚀_42  ')).toBe('  Tänk_42  ')
    expect(normalizeOnlineEntryValue('name', 'Ｒｏｏｋ\u202e\u200b 隊')).toBe('Rook 隊')
    expect(normalizeOnlineEntryValue('name', 'abcdefghijklmnopqrs')).toBe('abcdefghijklmnopqr')
    expect([...normalizeOnlineEntryValue('name', '𐐀'.repeat(30))]).toHaveLength(18)
    expect(normalizeOnlineEntryValue('key', 'ab-c 12z9')).toBe('ABC12Z')
  })
})
