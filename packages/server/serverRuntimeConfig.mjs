const DEFAULT_PORT = 8787
const DEFAULT_HOST = '0.0.0.0'

export function resolveServerRuntimeConfig(env = process.env) {
  const production = env.NODE_ENV === 'production'
  const port = parsePort(env.PORT)
  const allowedOrigin = parseAllowedOrigin(env.ALLOWED_ORIGIN, production)
  const revision = parseRevision(env.RENDER_GIT_COMMIT ?? env.GITHUB_SHA)

  return {
    allowedOrigin,
    host: DEFAULT_HOST,
    port,
    production,
    revision,
  }
}

export function resolveCorsOrigin(requestOrigin, env = process.env) {
  const allowedOrigin = String(env.ALLOWED_ORIGIN ?? '').trim()
  if (allowedOrigin) return allowedOrigin
  if (env.NODE_ENV !== 'production' && requestOrigin) return requestOrigin
  return 'null'
}

export function isAllowedHttpOrigin(requestOrigin, env = process.env) {
  if (env.NODE_ENV !== 'production') return true
  const allowedOrigin = String(env.ALLOWED_ORIGIN ?? '').trim()
  return Boolean(allowedOrigin && requestOrigin === allowedOrigin)
}

function parsePort(value) {
  if (value === undefined || value === '') return DEFAULT_PORT
  if (!/^\d+$/.test(value)) throw new Error('PORT must be an integer between 1 and 65535.')
  const port = Number(value)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }
  return port
}

function parseAllowedOrigin(value, production) {
  const text = String(value ?? '').trim()
  if (!text) {
    if (production) throw new Error('ALLOWED_ORIGIN is required when NODE_ENV=production.')
    return null
  }

  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error('ALLOWED_ORIGIN must be one absolute browser origin.')
  }

  if (url.origin !== text || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('ALLOWED_ORIGIN must contain only scheme, host, and optional port.')
  }
  if (production && url.protocol !== 'https:') {
    throw new Error('ALLOWED_ORIGIN must use https in production.')
  }
  return url.origin
}

function parseRevision(value) {
  const text = String(value ?? '').trim().toLowerCase()
  return /^[0-9a-f]{40}$/.test(text) ? text : 'local'
}
