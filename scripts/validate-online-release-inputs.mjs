import { appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const EXACT_SHA = /^[0-9a-f]{40}$/
const RENDER_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com$/
const HEALTH_KEYS = ['ok', 'privateRooms', 'revision', 'service']

export function validateOnlineReleaseInputs({
  githubRef,
  githubSha,
  expectedSourceSha,
  multiplayerUrl,
  frontendRollbackSha,
  backendRollbackAction,
}) {
  const errors = []
  const currentSha = exactSha('GITHUB_SHA', githubSha, errors)
  const expectedSha = exactSha('expected_source_sha', expectedSourceSha, errors)
  const rollbackSha = exactSha('frontend_rollback_sha', frontendRollbackSha, errors)
  const rawUrl = exactText('multiplayer_url', multiplayerUrl, errors)
  const rollbackAction = exactText('backend_rollback_action', backendRollbackAction, errors)

  if (githubRef !== 'refs/heads/main') {
    errors.push('Production Pages deployment must run from refs/heads/main.')
  }
  if (currentSha && expectedSha && currentSha !== expectedSha) {
    errors.push('expected_source_sha must exactly match GITHUB_SHA.')
  }
  if (rollbackSha && expectedSha && rollbackSha === expectedSha) {
    errors.push('frontend_rollback_sha must identify a different previously successful source.')
  }

  let publicMultiplayerUrl = ''
  if (rawUrl) {
    try {
      const url = new URL(rawUrl)
      if (url.protocol !== 'https:') errors.push('multiplayer_url must use https.')
      if (!RENDER_HOST.test(url.hostname)) {
        errors.push('multiplayer_url must use one Render-managed *.onrender.com hostname.')
      }
      if (url.username || url.password) errors.push('multiplayer_url must not contain credentials.')
      if (url.port || url.pathname !== '/' || url.search || url.hash) {
        errors.push('multiplayer_url must contain only scheme and hostname.')
      }
      publicMultiplayerUrl = url.origin
      if (rawUrl !== publicMultiplayerUrl) {
        errors.push('multiplayer_url must use its canonical origin without a trailing slash or explicit default port.')
      }
    } catch {
      errors.push('multiplayer_url must be a valid absolute URL.')
    }
  }

  if (rollbackAction && rollbackAction !== 'DISABLE_INITIAL_SERVICE'
    && !/^ROLLBACK_TO_SOURCE:[0-9a-f]{40}$/.test(rollbackAction)) {
    errors.push('backend_rollback_action must be DISABLE_INITIAL_SERVICE or ROLLBACK_TO_SOURCE:<40-character-sha>.')
  }
  if (rollbackAction === `ROLLBACK_TO_SOURCE:${expectedSha}`) {
    errors.push('backend_rollback_action must not point to the release source itself.')
  }

  if (errors.length > 0) {
    throw new Error(`ONLINE_RELEASE_INPUTS_INVALID\n- ${errors.join('\n- ')}`)
  }

  return {
    expectedSourceSha: expectedSha,
    publicMultiplayerUrl,
    frontendRollbackSha: rollbackSha,
    backendRollbackAction: rollbackAction,
  }
}

export async function verifyProductionBackend({
  multiplayerUrl,
  expectedSourceSha,
  fetchImpl = fetch,
  signal = AbortSignal.timeout(10_000),
}) {
  const healthUrl = new URL('/health', multiplayerUrl)
  const response = await fetchImpl(healthUrl, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal,
  })
  if (!response.ok) throw new Error(`PRODUCTION_BACKEND_UNHEALTHY status=${response.status}`)
  if (response.redirected) throw new Error('PRODUCTION_BACKEND_UNHEALTHY redirected health response')

  const body = await response.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('PRODUCTION_BACKEND_UNHEALTHY invalid health response body')
  }
  const keys = Object.keys(body).sort()
  if (JSON.stringify(keys) !== JSON.stringify(HEALTH_KEYS)) {
    throw new Error('PRODUCTION_BACKEND_UNHEALTHY unexpected health response fields')
  }
  if (body.ok !== true || body.service !== 'tanchiki-multiplayer') {
    throw new Error('PRODUCTION_BACKEND_UNHEALTHY invalid service identity')
  }
  if (body.revision !== expectedSourceSha) {
    throw new Error(`PRODUCTION_BACKEND_REVISION_MISMATCH expected=${expectedSourceSha} actual=${String(body.revision)}`)
  }
  if (body.privateRooms !== 0) {
    throw new Error(`PRODUCTION_BACKEND_NOT_DRAINED privateRooms=${String(body.privateRooms)}`)
  }

  return { healthUrl: healthUrl.href, revision: body.revision, privateRooms: body.privateRooms }
}

export async function verifyFrontendRollbackArtifact({
  repository,
  frontendRollbackSha,
  githubToken,
  githubApiUrl = 'https://api.github.com',
  workflow = 'deploy-github-pages.yml',
  fetchImpl = fetch,
  signal = AbortSignal.timeout(10_000),
}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) {
    throw new Error('FRONTEND_ROLLBACK_UNVERIFIED invalid GitHub repository')
  }
  if (!githubToken) throw new Error('FRONTEND_ROLLBACK_UNVERIFIED missing GitHub token')

  const apiBase = new URL(githubApiUrl)
  const runsUrl = new URL(
    `/repos/${repository}/actions/workflows/${workflow}/runs?branch=main&status=success&event=workflow_dispatch&per_page=100`,
    apiBase,
  )
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${githubToken}`,
    'x-github-api-version': '2022-11-28',
  }
  const candidateRuns = []
  const visitedRunsPages = new Set()
  let nextRunsUrl = runsUrl
  while (nextRunsUrl) {
    if (visitedRunsPages.has(nextRunsUrl.href)) {
      throw new Error('FRONTEND_ROLLBACK_UNVERIFIED cyclic workflow-run pagination')
    }
    visitedRunsPages.add(nextRunsUrl.href)

    const runsResponse = await fetchImpl(nextRunsUrl, { headers, signal })
    if (!runsResponse.ok) throw new Error(`FRONTEND_ROLLBACK_UNVERIFIED runs status=${runsResponse.status}`)
    const runs = await runsResponse.json()
    candidateRuns.push(...(runs.workflow_runs?.filter((candidate) =>
      candidate.head_sha === frontendRollbackSha
        && candidate.conclusion === 'success'
        && candidate.event === 'workflow_dispatch') ?? []))
    nextRunsUrl = githubNextRunsPage(runsResponse.headers.get('link'), { apiBase, runsUrl })
  }
  if (candidateRuns.length === 0) {
    throw new Error('FRONTEND_ROLLBACK_UNVERIFIED no successful workflow run for requested source')
  }

  let productionRootRunFound = false
  for (const run of candidateRuns) {
    const jobsUrl = new URL(`/repos/${repository}/actions/runs/${run.id}/jobs`, apiBase)
    const jobsResponse = await fetchImpl(jobsUrl, { headers, signal })
    if (!jobsResponse.ok) throw new Error(`FRONTEND_ROLLBACK_UNVERIFIED jobs status=${jobsResponse.status}`)
    const jobs = await jobsResponse.json()
    const buildJob = jobs.jobs?.find((candidate) => candidate.name === 'Build static site')
    const preservePreviewStep = buildJob?.steps?.find((step) =>
      step.name === 'Preserve production root and add preview')
    if (preservePreviewStep?.conclusion !== 'skipped') continue
    productionRootRunFound = true

    const artifactsUrl = new URL(`/repos/${repository}/actions/runs/${run.id}/artifacts`, apiBase)
    const artifactsResponse = await fetchImpl(artifactsUrl, { headers, signal })
    if (!artifactsResponse.ok) {
      throw new Error(`FRONTEND_ROLLBACK_UNVERIFIED artifacts status=${artifactsResponse.status}`)
    }
    const artifacts = await artifactsResponse.json()
    const artifact = artifacts.artifacts?.find((candidate) =>
      candidate.name === 'github-pages' && candidate.expired === false)
    if (artifact) return { runId: run.id, artifactId: artifact.id }
  }

  if (!productionRootRunFound) {
    throw new Error('FRONTEND_ROLLBACK_UNVERIFIED requested source has no production-root deployment')
  }
  throw new Error('FRONTEND_ROLLBACK_UNVERIFIED no unexpired production-root github-pages artifact')
}

export async function main(env = process.env) {
  const inputs = validateOnlineReleaseInputs({
    githubRef: env.GITHUB_REF,
    githubSha: env.GITHUB_SHA,
    expectedSourceSha: env.EXPECTED_SOURCE_SHA,
    multiplayerUrl: env.MULTIPLAYER_URL,
    frontendRollbackSha: env.FRONTEND_ROLLBACK_SHA,
    backendRollbackAction: env.BACKEND_ROLLBACK_ACTION,
  })
  const backend = await verifyProductionBackend({
    multiplayerUrl: inputs.publicMultiplayerUrl,
    expectedSourceSha: inputs.expectedSourceSha,
  })
  const frontendRollback = await verifyFrontendRollbackArtifact({
    repository: env.GITHUB_REPOSITORY,
    frontendRollbackSha: inputs.frontendRollbackSha,
    githubToken: env.GITHUB_TOKEN,
    githubApiUrl: env.GITHUB_API_URL,
  })

  if (!env.GITHUB_ENV) throw new Error('ONLINE_RELEASE_INPUTS_INVALID missing GITHUB_ENV')
  await appendFile(env.GITHUB_ENV, `VITE_MULTIPLAYER_URL=${inputs.publicMultiplayerUrl}\n`, 'utf8')
  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, [
      '### Online production release preflight',
      '',
      `- Source: \`${inputs.expectedSourceSha}\``,
      `- Backend: \`${new URL(inputs.publicMultiplayerUrl).hostname}\``,
      `- Backend health: exact revision, ${backend.privateRooms} active rooms`,
      `- Frontend rollback: \`${inputs.frontendRollbackSha}\` (run ${frontendRollback.runId}, artifact ${frontendRollback.artifactId})`,
      `- Backend rollback: \`${inputs.backendRollbackAction}\``,
      '',
    ].join('\n'), 'utf8')
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    source: inputs.expectedSourceSha,
    backendHost: new URL(inputs.publicMultiplayerUrl).hostname,
    frontendRollbackRunId: frontendRollback.runId,
  })}\n`)
}

function exactSha(name, value, errors) {
  const text = exactText(name, value, errors)
  if (text && !EXACT_SHA.test(text)) errors.push(`${name} must be a lowercase 40-character Git SHA.`)
  return text
}

function exactText(name, value, errors) {
  const text = typeof value === 'string' ? value : ''
  if (!text) errors.push(`${name} is required.`)
  else if (text !== text.trim()) errors.push(`${name} must not contain surrounding whitespace.`)
  return text
}

function githubNextRunsPage(linkHeader, { apiBase, runsUrl }) {
  if (!linkHeader) return undefined

  const nextLink = linkHeader.split(',')
    .map((entry) => entry.trim().match(/^<([^>]+)>\s*;\s*rel="([^"]+)"$/))
    .find((match) => match?.[2].split(/\s+/).includes('next'))
  if (!nextLink) return undefined

  const nextUrl = new URL(nextLink[1], apiBase)
  const allowedParameters = new Set([...runsUrl.searchParams.keys(), 'page'])
  const hasUnexpectedParameter = [...nextUrl.searchParams.keys()]
    .some((name) => !allowedParameters.has(name))
  const fixedParametersChanged = [...runsUrl.searchParams.entries()]
    .some(([name, value]) => nextUrl.searchParams.get(name) !== value)
  const page = nextUrl.searchParams.get('page')
  if (nextUrl.origin !== apiBase.origin
    || nextUrl.pathname !== runsUrl.pathname
    || hasUnexpectedParameter
    || fixedParametersChanged
    || !/^[1-9]\d*$/.test(page ?? '')) {
    throw new Error('FRONTEND_ROLLBACK_UNVERIFIED invalid workflow-run pagination link')
  }
  return nextUrl
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
