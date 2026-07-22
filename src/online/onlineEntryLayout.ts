import type { FieldBriefingIntent } from './onlineClient.ts'

export type OnlineEntryField = 'name' | 'key'
export type OnlineEntryHit = OnlineEntryField | 'action' | null

export const ONLINE_ENTRY_NAME_Y = 132
export const ONLINE_ENTRY_KEY_Y = 190
export const ONLINE_ENTRY_CREATE_ACTION_Y = 238
export const ONLINE_ENTRY_JOIN_ACTION_Y = 274

export function getOnlineEntryHit(intent: FieldBriefingIntent, y: number): OnlineEntryHit {
  if (y >= 128 && y <= 164) return 'name'
  if (intent === 'join' && y >= 180 && y <= 216) return 'key'

  const actionY = intent === 'join'
    ? ONLINE_ENTRY_JOIN_ACTION_Y
    : ONLINE_ENTRY_CREATE_ACTION_Y
  return y >= actionY - 20 && y <= actionY + 20 ? 'action' : null
}

export function normalizeOnlineEntryValue(field: OnlineEntryField, value: string) {
  if (field === 'key') {
    return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6)
  }
  return [...value]
    .filter((character) => /[\p{L}\p{N}_ -]/u.test(character))
    .join('')
    .slice(0, 18)
}
