import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  validateOnlineReleaseInputs,
  verifyFrontendRollbackArtifact,
  verifyProductionBackend,
} from '../../scripts/validate-online-release-inputs.mjs'

const releaseSha = '2de4955041dfadc002666e27bef746a7b45a978e'
const rollbackSha = '740e8a6cd0ec40d60b96d2a914f9829fd9154e65'

function validInputs() {
  return {
    githubRef: 'refs/heads/main',
    githubSha: releaseSha,
    expectedSourceSha: releaseSha,
    multiplayerUrl: 'https://tanchiki2-online.onrender.com',
    frontendRollbackSha: rollbackSha,
    backendRollbackAction: 'DISABLE_INITIAL_SERVICE',
  }
}

describe('online production release input guard', () => {
  it('accepts one exact main head, Render origin, and independent rollback', () => {
    expect(validateOnlineReleaseInputs(validInputs())).toEqual({
      expectedSourceSha: releaseSha,
      publicMultiplayerUrl: 'https://tanchiki2-online.onrender.com',
      frontendRollbackSha: rollbackSha,
      backendRollbackAction: 'DISABLE_INITIAL_SERVICE',
    })
  })

  it('rejects branch, revision, URL, and rollback ambiguity', () => {
    expect(() => validateOnlineReleaseInputs({
      ...validInputs(),
      githubRef: 'refs/heads/codex/release',
      expectedSourceSha: rollbackSha,
      multiplayerUrl: 'http://127.0.0.1:8787/path?room=secret',
      frontendRollbackSha: rollbackSha,
      backendRollbackAction: `ROLLBACK_TO_SOURCE:${rollbackSha}`,
    })).toThrow(/refs\/heads\/main[\s\S]*exactly match GITHUB_SHA[\s\S]*Render-managed/)
  })

  it('rejects whitespace, credentials, non-Render hosts, and self rollback', () => {
    for (const multiplayerUrl of [
      ' https://tanchiki2-online.onrender.com',
      'https://user:pass@tanchiki2-online.onrender.com',
      'https://example.com',
      'https://tanchiki2-online.onrender.com:443',
      'https://tanchiki2-online.onrender.com/',
    ]) {
      expect(() => validateOnlineReleaseInputs({
        ...validInputs(),
        multiplayerUrl,
        frontendRollbackSha: releaseSha,
      })).toThrow('ONLINE_RELEASE_INPUTS_INVALID')
    }
  })

  it('requires an exact healthy drained backend response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      service: 'tanchiki-multiplayer',
      revision: releaseSha,
      privateRooms: 0,
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    await expect(verifyProductionBackend({
      multiplayerUrl: 'https://tanchiki2-online.onrender.com',
      expectedSourceSha: releaseSha,
      fetchImpl,
      signal: undefined,
    })).resolves.toMatchObject({ revision: releaseSha, privateRooms: 0 })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('rejects revision drift, active rooms, and expanded health payloads', async () => {
    for (const body of [
      { ok: true, service: 'tanchiki-multiplayer', revision: rollbackSha, privateRooms: 0 },
      { ok: true, service: 'tanchiki-multiplayer', revision: releaseSha, privateRooms: 1 },
      { ok: true, service: 'tanchiki-multiplayer', revision: releaseSha, privateRooms: 0, roomKeys: [] },
    ]) {
      await expect(verifyProductionBackend({
        multiplayerUrl: 'https://tanchiki2-online.onrender.com',
        expectedSourceSha: releaseSha,
        fetchImpl: async () => new Response(JSON.stringify(body), { status: 200 }),
        signal: undefined,
      })).rejects.toThrow(/PRODUCTION_BACKEND/)
    }
  })

  it('requires an unexpired rollback artifact from the named successful run', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [{
        id: 29852987783,
        head_sha: rollbackSha,
        conclusion: 'success',
        event: 'workflow_dispatch',
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ artifacts: [{
        id: 5001,
        name: 'github-pages',
        expired: false,
      }] }), { status: 200 }))

    await expect(verifyFrontendRollbackArtifact({
      repository: 'urkrass/tanchiki2',
      frontendRollbackSha: rollbackSha,
      githubToken: 'test-token',
      fetchImpl,
      signal: undefined,
    })).resolves.toEqual({ runId: 29852987783, artifactId: 5001 })
  })

  it('rejects an expired Pages rollback artifact', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [{
        id: 29852987783,
        head_sha: rollbackSha,
        conclusion: 'success',
        event: 'workflow_dispatch',
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ artifacts: [{
        id: 8504117857,
        name: 'github-pages',
        expired: true,
      }] }), { status: 200 }))

    await expect(verifyFrontendRollbackArtifact({
      repository: 'urkrass/tanchiki2',
      frontendRollbackSha: rollbackSha,
      githubToken: 'test-token',
      fetchImpl,
      signal: undefined,
    })).rejects.toThrow('no unexpired github-pages artifact')
  })

  it('locks the production-root workflow to the guarded online preflight', () => {
    const workflow = readFileSync(new URL('../../.github/workflows/deploy-github-pages.yml', import.meta.url), 'utf8')

    for (const input of [
      'expected_source_sha:',
      'multiplayer_url:',
      'frontend_rollback_sha:',
      'backend_rollback_action:',
    ]) expect(workflow).toContain(input)
    expect(workflow).toContain("if: ${{ inputs.preview_slug == '' && github.ref != 'refs/heads/main' }}")
    expect(workflow).toContain("if: ${{ inputs.preview_slug == '' && github.ref == 'refs/heads/main' }}")
    expect(workflow).toContain('node scripts/validate-online-release-inputs.mjs')
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}')
    expect(workflow).toContain('retention-days: 90')
  })
})
