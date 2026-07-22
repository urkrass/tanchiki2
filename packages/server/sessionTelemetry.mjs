import { randomUUID } from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MAX_EVENT_LENGTH = 48
const MAX_STRING_LENGTH = 256
const MAX_ARRAY_LENGTH = 16
const MAX_OBJECT_KEYS = 40

export function createSessionTelemetryFromEnv(env = process.env, overrides = {}) {
  const logPath = String(env.ONLINE_TELEMETRY_LOG_PATH ?? '').trim()
  if (!logPath) return null
  return new JsonlSessionTelemetry({
    logPath,
    includeSensitive: parseBoolean(env.ONLINE_TELEMETRY_INCLUDE_SENSITIVE),
    ...overrides,
  })
}

export class JsonlSessionTelemetry {
  #logPath
  #includeSensitive
  #now
  #uuid
  #onError
  #writeFailed = false

  constructor({
    logPath,
    includeSensitive = false,
    now = () => Date.now(),
    uuid = () => randomUUID(),
    onError = (error) => console.warn(`[online-telemetry] ${error.message}`),
  }) {
    const configuredPath = String(logPath ?? '').trim()
    if (!configuredPath) throw new Error('Telemetry logPath is required.')
    this.#logPath = resolve(configuredPath)
    this.#includeSensitive = includeSensitive === true
    this.#now = now
    this.#uuid = uuid
    this.#onError = onError
    mkdirSync(dirname(this.#logPath), { recursive: true })
  }

  get logPath() {
    return this.#logPath
  }

  get includesSensitiveData() {
    return this.#includeSensitive
  }

  startRoom() {
    const sessionId = `room-${String(this.#uuid()).replaceAll('-', '').slice(0, 12)}`
    return {
      sessionId,
      includesSensitiveData: this.#includeSensitive,
      record: (event, data = {}, sensitive = {}) => {
        this.#record(sessionId, event, data, sensitive)
      },
    }
  }

  #record(sessionId, event, data, sensitive) {
    const normalizedEvent = String(event ?? '').trim().toLowerCase()
    if (!/^[a-z][a-z0-9_]*$/.test(normalizedEvent) || normalizedEvent.length > MAX_EVENT_LENGTH) {
      throw new Error(`Invalid telemetry event: ${normalizedEvent || '(empty)'}`)
    }
    const payload = {
      v: 1,
      ts: new Date(this.#now()).toISOString(),
      sid: sessionId,
      event: normalizedEvent,
      ...sanitizeObject(data),
      ...(this.#includeSensitive ? sanitizeObject(sensitive) : {}),
    }
    try {
      appendFileSync(this.#logPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600 })
    } catch (error) {
      if (this.#writeFailed) return
      this.#writeFailed = true
      this.#onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

function sanitizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, entry]) => [key, sanitizeValue(entry, 0)]),
  )
}

function sanitizeValue(value, depth) {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH)
  if (depth >= 2) return null
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((entry) => sanitizeValue(entry, depth + 1))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, entry]) => [key, sanitizeValue(entry, depth + 1)]),
    )
  }
  return null
}

function parseBoolean(value) {
  return /^(1|true|yes|on)$/i.test(String(value ?? '').trim())
}
