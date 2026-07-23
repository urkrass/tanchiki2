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

  it('fails closed if session or sensitive telemetry is configured in production', () => {
    expect(() => createSessionTelemetryFromEnv({
      NODE_ENV: 'production',
      ONLINE_TELEMETRY_LOG_PATH: 'output/online-session.jsonl',
    })).toThrow('disabled for the public preview')
    expect(() => createSessionTelemetryFromEnv({
      NODE_ENV: 'production',
      ONLINE_TELEMETRY_INCLUDE_SENSITIVE: 'true',
    })).toThrow('disabled for the public preview')
    expect(createSessionTelemetryFromEnv({
      NODE_ENV: 'production',
      ONLINE_TELEMETRY_INCLUDE_SENSITIVE: 'false',
    })).toBeNull()
  })

  it('writes compact JSONL while excluding sensitive fields by default', () => {
    const logPath = temporaryLogPath()
    const telemetry = new JsonlSessionTelemetry({
      logPath,
      now: () => Date.UTC(2026, 6, 22, 12, 0, 0),
      uuid: () => '12345678-1234-1234-1234-123456789abc',
    })
    const room = telemetry.startRoom()

    room.record('player_joined', {
      player: 'p1',
      team: 'blue',
      roomKey: 'ACCIDENTAL-SECRET',
      name: 'Accidental callsign',
      arbitrary: 'not part of the schema',
    }, {
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

  it('rejects unregistered event names instead of accepting arbitrary payloads', () => {
    const telemetry = new JsonlSessionTelemetry({ logPath: temporaryLogPath() })
    const room = telemetry.startRoom()

    expect(() => room.record('debug_message', { text: 'free text' })).toThrow('Unsupported telemetry event')
    expect(() => room.record('constructor', { text: 'prototype key' })).toThrow('Unsupported telemetry event')
  })

  it('records bounded rematch lifecycle data without exposing identifiers by default', () => {
    const logPath = temporaryLogPath()
    const telemetry = new JsonlSessionTelemetry({
      logPath,
      now: () => Date.UTC(2026, 6, 23, 12, 0, 0),
      uuid: () => '12345678-1234-1234-1234-123456789abc',
    })
    const room = telemetry.startRoom()

    room.record('rematch_voted', { player: 'p1', votes: 1, required: 2 }, {
      playerId: 'private-player',
      resultId: 'private-result',
    })
    room.record('rematch_opened', { players: 2 }, {
      previousMatchId: 'private-match',
      previousResultId: 'private-result',
      roomKey: 'ABC234',
    })

    expect(readEntries(logPath)).toEqual([
      expect.objectContaining({ event: 'rematch_voted', player: 'p1', votes: 1, required: 2 }),
      expect.objectContaining({ event: 'rematch_opened', players: 2 }),
    ])
    expect(readFileSync(logPath, 'utf8')).not.toMatch(/private|ABC234/)
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
      ip: '100.64.0.2',
    })
    expect(String(entry?.name)).toHaveLength(256)
    expect(entry).not.toHaveProperty('roomKey')
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
