import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  isAllowedHttpOrigin,
  resolveCorsOrigin,
  resolveServerRuntimeConfig,
} from './serverRuntimeConfig.mjs'

describe('server production runtime configuration', () => {
  it('fails fast when a production browser origin is absent or insecure', () => {
    expect(() => resolveServerRuntimeConfig({ NODE_ENV: 'production', PORT: '10000' })).toThrow(
      'ALLOWED_ORIGIN is required',
    )
    expect(() => resolveServerRuntimeConfig({
      NODE_ENV: 'production',
      PORT: '10000',
      ALLOWED_ORIGIN: 'http://urkrass.github.io',
    })).toThrow('must use https')
  })

  it('accepts the exact GitHub Pages origin and reports the deployed revision', () => {
    const revision = 'eed90b852681d5d9917f2a7c9d86b36ccc3c3beb'
    expect(resolveServerRuntimeConfig({
      NODE_ENV: 'production',
      PORT: '10000',
      ALLOWED_ORIGIN: 'https://urkrass.github.io',
      RENDER_GIT_COMMIT: revision,
    })).toEqual({
      allowedOrigin: 'https://urkrass.github.io',
      host: '0.0.0.0',
      port: 10000,
      production: true,
      revision,
    })
  })

  it('rejects ambiguous origins and malformed ports', () => {
    for (const origin of [
      'https://urkrass.github.io/tanchiki2/',
      'https://urkrass.github.io?preview=1',
      'https://user:pass@urkrass.github.io',
    ]) {
      expect(() => resolveServerRuntimeConfig({ ALLOWED_ORIGIN: origin })).toThrow('only scheme, host')
    }
    for (const port of ['0', '65536', '10000abc', '-1']) {
      expect(() => resolveServerRuntimeConfig({ PORT: port })).toThrow('PORT must be an integer')
    }
  })

  it('keeps local development defaults without inventing a deployment revision', () => {
    expect(resolveServerRuntimeConfig({})).toEqual({
      allowedOrigin: null,
      host: '0.0.0.0',
      port: 8787,
      production: false,
      revision: 'local',
    })
  })

  it('never reflects a foreign production Origin through Colyseus HTTP CORS', () => {
    const production = {
      NODE_ENV: 'production',
      ALLOWED_ORIGIN: 'https://urkrass.github.io',
    }
    expect(resolveCorsOrigin('https://urkrass.github.io', production)).toBe('https://urkrass.github.io')
    expect(resolveCorsOrigin('https://example.invalid', production)).toBe('https://urkrass.github.io')
    expect(isAllowedHttpOrigin('https://urkrass.github.io', production)).toBe(true)
    expect(isAllowedHttpOrigin('https://example.invalid', production)).toBe(false)
    expect(isAllowedHttpOrigin(undefined, production)).toBe(false)
  })

  it('preserves permissive local CORS for browser QA', () => {
    expect(resolveCorsOrigin('http://127.0.0.1:5173', {})).toBe('http://127.0.0.1:5173')
    expect(isAllowedHttpOrigin(undefined, {})).toBe(true)
  })

  it('keeps the production Blueprint bounded and non-activating', () => {
    const blueprint = readFileSync(new URL('../../render.yaml', import.meta.url), 'utf8')

    expect(blueprint.match(/^\s+- type: web$/gm)).toHaveLength(1)
    expect(blueprint).toContain('region: frankfurt')
    expect(blueprint).toContain('plan: starter')
    expect(blueprint).toContain('numInstances: 1')
    expect(blueprint).toContain('autoDeployTrigger: "off"')
    expect(blueprint).toContain('buildCommand: npm ci --include=dev && npm run build:shared && npm prune --omit=dev')
    expect(blueprint).toContain('healthCheckPath: /health')
    expect(blueprint).toContain('value: https://urkrass.github.io')
    expect(blueprint).toContain('key: ONLINE_TELEMETRY_INCLUDE_SENSITIVE')
    expect(blueprint).not.toContain('ONLINE_TELEMETRY_LOG_PATH')
  })
})
