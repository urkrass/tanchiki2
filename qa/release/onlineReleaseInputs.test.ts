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
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'skipped' }],
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'skipped' }],
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
    })).rejects.toThrow('no unexpired production-root github-pages artifact')
  })

  it('rejects a preview artifact as a production-root rollback', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [{
        id: 29852987783,
        head_sha: rollbackSha,
        conclusion: 'success',
        event: 'workflow_dispatch',
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'success' }],
      }] }), { status: 200 }))

    await expect(verifyFrontendRollbackArtifact({
      repository: 'urkrass/tanchiki2',
      frontendRollbackSha: rollbackSha,
      githubToken: 'test-token',
      fetchImpl,
      signal: undefined,
    })).rejects.toThrow('has no production-root deployment')
  })

  it('skips a newer preview run when an older production-root rollback is valid', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [
        { id: 3002, head_sha: rollbackSha, conclusion: 'success', event: 'workflow_dispatch' },
        { id: 3001, head_sha: rollbackSha, conclusion: 'success', event: 'workflow_dispatch' },
      ] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'success' }],
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'skipped' }],
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
    })).resolves.toEqual({ runId: 3001, artifactId: 5001 })
  })

  it('follows workflow-run pagination to find an older production-root rollback', async () => {
    const secondPage = 'https://api.github.com/repos/urkrass/tanchiki2/actions/workflows/deploy-github-pages.yml/runs?branch=main&status=success&event=workflow_dispatch&per_page=100&page=2'
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), {
        status: 200,
        headers: { link: `<${secondPage}>; rel="next"` },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [{
        id: 3001,
        head_sha: rollbackSha,
        conclusion: 'success',
        event: 'workflow_dispatch',
      }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{
        name: 'Build static site',
        steps: [{ name: 'Preserve production root and add preview', conclusion: 'skipped' }],
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
    })).resolves.toEqual({ runId: 3001, artifactId: 5001 })
    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe(secondPage)
  })

  it('rejects a pagination link that could forward the GitHub token off-origin', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ workflow_runs: [] }), {
      status: 200,
      headers: {
        link: '<https://attacker.example/runs?branch=main&status=success&event=workflow_dispatch&per_page=100&page=2>; rel="next"',
      },
    }))

    await expect(verifyFrontendRollbackArtifact({
      repository: 'urkrass/tanchiki2',
      frontendRollbackSha: rollbackSha,
      githubToken: 'test-token',
      fetchImpl,
      signal: undefined,
    })).rejects.toThrow('invalid workflow-run pagination link')
    expect(fetchImpl).toHaveBeenCalledOnce()
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

  it('rechecks backend revision and drain immediately before production deployment', () => {
    const workflow = readFileSync(new URL('../../.github/workflows/deploy-github-pages.yml', import.meta.url), 'utf8')
    const deployJob = workflow.slice(workflow.indexOf('\n  deploy:'))
    const payloadIndex = deployJob.indexOf('payload="$(PAGES_ARTIFACT_ID=')
    const recheckIndex = deployJob.indexOf('PRODUCTION_BACKEND_NOT_DRAINED_AT_DEPLOY')
    const deploymentIndex = deployJob.indexOf('deployment_json="$(curl')

    expect(payloadIndex).toBeGreaterThan(-1)
    expect(recheckIndex).toBeGreaterThan(payloadIndex)
    expect(deploymentIndex).toBeGreaterThan(recheckIndex)
    expect(deployJob).toContain('PREVIEW_SLUG: ${{ inputs.preview_slug }}')
    expect(deployJob).toContain('EXPECTED_SOURCE_SHA: ${{ inputs.expected_source_sha }}')
    expect(deployJob).toContain('body["revision"] != os.environ["EXPECTED_SOURCE_SHA"]')
    expect(deployJob).toContain('body["privateRooms"] != 0')
  })
})
