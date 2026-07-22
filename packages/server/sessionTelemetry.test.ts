import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { JsonlSessionTelemetry, createSessionTelemetryFromEnv } from './sessionTelemetry.mjs'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('online session telemetry', () => {
  it('stays disabled until a log path is explicitly configured', () => {
    expect(createSessionTelemetryFromEnv({})).toBeNull()
  })

  it('writes compact JSONL while excluding sensitive fields by default', () => {
    const logPath = temporaryLogPath()
    const telemetry = new JsonlSessionTelemetry({
      logPath,
      now: () => Date.UTC(2026, 6, 22, 12, 0, 0),
      uuid: () => '12345678-1234-1234-1234-123456789abc',
    })
    const room = telemetry.startRoom()

    room.record('player_joined', { player: 'p1', team: 'blue' }, {
      roomKey: 'SECRET',
      name: 'Rookie',
      ip: '100.64.0.1',
    })

    expect(readEntries(logPath)).toEqual([{
      v: 1,
      ts: '2026-07-22T12:00:00.000Z',
      sid: 'room-123456781234',
      event: 'player_joined',
      player: 'p1',
      team: 'blue',
    }])
  })

  it('includes bounded identifiers for fixed radio commands only with the sensitive opt-in', () => {
    const logPath = temporaryLogPath()
    const telemetry = createSessionTelemetryFromEnv({
      ONLINE_TELEMETRY_LOG_PATH: logPath,
      ONLINE_TELEMETRY_INCLUDE_SENSITIVE: 'true',
    }, {
      now: () => Date.UTC(2026, 6, 22, 12, 1, 0),
      uuid: () => 'abcdefab-cdef-cdef-cdef-abcdefabcdef',
    })
    const room = telemetry?.startRoom()

    room?.record('radio_command', { player: 'p2', team: 'red', command: 'REGROUP' }, {
      roomKey: 'ABC234',
      name: 'G'.repeat(300),
      ip: '100.64.0.2',
    })

    const [entry] = readEntries(logPath)
    expect(entry).toMatchObject({
      event: 'radio_command',
      player: 'p2',
      command: 'REGROUP',
      roomKey: 'ABC234',
      ip: '100.64.0.2',
    })
    expect(String(entry?.name)).toHaveLength(256)
    expect(entry).not.toHaveProperty('text')
  })
})

function temporaryLogPath() {
  const directory = mkdtempSync(join(tmpdir(), 'tanchiki-telemetry-'))
  temporaryDirectories.push(directory)
  return join(directory, 'online-session.jsonl')
}

function readEntries(logPath: string) {
  return readFileSync(logPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}
