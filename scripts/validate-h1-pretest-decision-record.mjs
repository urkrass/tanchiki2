import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXACT_SHA = /^[0-9a-f]{40}$/
const RENDER_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com$/
const PAGES_PRODUCTION_TARGET = 'https://urkrass.github.io/tanchiki2/'

export function validateH1PretestDecisionRecord(record, { allowDraft = false } = {}) {
  const errors = []
  objectWithExactKeys('record', record, [
    'schemaVersion',
    'status',
    'profile',
    'source',
    'provider',
    'backend',
    'frontend',
    'operations',
    'authorization',
  ], errors)

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw decisionError(errors)
  }

  exactValue('schemaVersion', record.schemaVersion, 1, errors)
  exactValue('profile', record.profile, 'INVITE_ONLY_HOSTED_PRETEST', errors)
  if (!['DRAFT', 'AUTHORIZED'].includes(record.status)) {
    errors.push('status must be DRAFT or AUTHORIZED.')
  }

  objectWithExactKeys('source', record.source, ['repository', 'sha'], errors)
  exactValue('source.repository', record.source?.repository, 'urkrass/tanchiki2', errors)

  objectWithExactKeys('provider', record.provider, [
    'kind',
    'workspace',
    'plan',
    'region',
    'instances',
    'autoDeploy',
    'monthlyCeiling',
    'billingOwner',
    'repositoryConnectionAuthorized',
  ], errors)
  exactValue('provider.kind', record.provider?.kind, 'render', errors)
  exactValue('provider.instances', record.provider?.instances, 1, errors)
  exactValue('provider.autoDeploy', record.provider?.autoDeploy, false, errors)
  objectWithExactKeys('provider.monthlyCeiling', record.provider?.monthlyCeiling, [
    'amount',
    'currency',
  ], errors)

  objectWithExactKeys('backend', record.backend, [
    'publicOrigin',
    'allowedOrigin',
    'disableOrRollbackAction',
  ], errors)
  exactValue('backend.allowedOrigin', record.backend?.allowedOrigin, 'https://urkrass.github.io', errors)

  objectWithExactKeys('frontend', record.frontend, [
    'pagesTarget',
    'multiplayerOrigin',
    'rollback',
  ], errors)
  objectWithExactKeys('frontend.rollback', record.frontend?.rollback, [
    'sourceSha',
    'workflowRunId',
    'artifactId',
  ], errors)

  objectWithExactKeys('operations', record.operations, [
    'invitationOwner',
    'monitoredAbuseContact',
    'providerLogAdministrators',
    'providerLogRetention',
    'applicationSessionTelemetry',
    'sensitiveTelemetry',
    'tagDecision',
    'announcementDecision',
  ], errors)
  exactValue('operations.applicationSessionTelemetry', record.operations?.applicationSessionTelemetry, false, errors)
  exactValue('operations.sensitiveTelemetry', record.operations?.sensitiveTelemetry, false, errors)
  exactValue('operations.tagDecision', record.operations?.tagDecision, 'NO_TAG', errors)
  exactValue('operations.announcementDecision', record.operations?.announcementDecision, 'NO_PUBLIC_ANNOUNCEMENT', errors)

  objectWithExactKeys('authorization', record.authorization, [
    'status',
    'scope',
    'operator',
    'authorizedAt',
  ], errors)
  exactValue('authorization.scope', record.authorization?.scope, 'H1_INVITE_ONLY_HOSTED_PRETEST', errors)

  if (record.status === 'DRAFT') {
    validateDraft(record, errors)
    if (!allowDraft) errors.push('DRAFT records cannot authorize H1 execution; rerun only with --allow-draft for template validation.')
  } else if (record.status === 'AUTHORIZED') {
    validateAuthorized(record, errors)
  }

  if (errors.length > 0) throw decisionError(errors)

  return {
    ok: true,
    mode: record.status === 'DRAFT' ? 'draft-template' : 'authorized-decision',
    profile: record.profile,
    sourceSha: record.status === 'AUTHORIZED' ? record.source.sha : null,
  }
}

function validateDraft(record, errors) {
  const nullFields = [
    ['source.sha', record.source?.sha],
    ['provider.workspace', record.provider?.workspace],
    ['provider.plan', record.provider?.plan],
    ['provider.region', record.provider?.region],
    ['provider.monthlyCeiling.amount', record.provider?.monthlyCeiling?.amount],
    ['provider.monthlyCeiling.currency', record.provider?.monthlyCeiling?.currency],
    ['provider.billingOwner', record.provider?.billingOwner],
    ['backend.publicOrigin', record.backend?.publicOrigin],
    ['backend.disableOrRollbackAction', record.backend?.disableOrRollbackAction],
    ['frontend.pagesTarget', record.frontend?.pagesTarget],
    ['frontend.multiplayerOrigin', record.frontend?.multiplayerOrigin],
    ['frontend.rollback.sourceSha', record.frontend?.rollback?.sourceSha],
    ['frontend.rollback.workflowRunId', record.frontend?.rollback?.workflowRunId],
    ['frontend.rollback.artifactId', record.frontend?.rollback?.artifactId],
    ['operations.invitationOwner', record.operations?.invitationOwner],
    ['operations.monitoredAbuseContact', record.operations?.monitoredAbuseContact],
    ['operations.providerLogRetention', record.operations?.providerLogRetention],
    ['authorization.operator', record.authorization?.operator],
    ['authorization.authorizedAt', record.authorization?.authorizedAt],
  ]
  for (const [name, value] of nullFields) {
    if (value !== null) errors.push(`${name} must remain null in the committed DRAFT template.`)
  }
  exactValue(
    'provider.repositoryConnectionAuthorized',
    record.provider?.repositoryConnectionAuthorized,
    false,
    errors,
  )
  exactValue('authorization.status', record.authorization?.status, 'NOT_AUTHORIZED', errors)
  if (!Array.isArray(record.operations?.providerLogAdministrators)
    || record.operations.providerLogAdministrators.length !== 0) {
    errors.push('operations.providerLogAdministrators must remain an empty array in the committed DRAFT template.')
  }
}

function validateAuthorized(record, errors) {
  exactSha('source.sha', record.source?.sha, errors)
  boundedText('provider.workspace', record.provider?.workspace, errors)
  boundedText('provider.plan', record.provider?.plan, errors)
  boundedText('provider.region', record.provider?.region, errors)
  positiveNumber('provider.monthlyCeiling.amount', record.provider?.monthlyCeiling?.amount, errors)
  if (!/^[A-Z]{3}$/.test(record.provider?.monthlyCeiling?.currency ?? '')) {
    errors.push('provider.monthlyCeiling.currency must be one three-letter uppercase currency code.')
  }
  boundedText('provider.billingOwner', record.provider?.billingOwner, errors)
  exactValue(
    'provider.repositoryConnectionAuthorized',
    record.provider?.repositoryConnectionAuthorized,
    true,
    errors,
  )

  renderOrigin('backend.publicOrigin', record.backend?.publicOrigin, errors)
  renderOrigin('frontend.multiplayerOrigin', record.frontend?.multiplayerOrigin, errors)
  if (typeof record.backend?.publicOrigin === 'string'
    && typeof record.frontend?.multiplayerOrigin === 'string'
    && record.backend.publicOrigin !== record.frontend.multiplayerOrigin) {
    errors.push('frontend.multiplayerOrigin must exactly match backend.publicOrigin.')
  }
  if (record.frontend?.pagesTarget !== PAGES_PRODUCTION_TARGET) {
    errors.push('frontend.pagesTarget must be the guarded Tanchiki2 Pages production root; preview targets remain blocked.')
  }

  const rollbackSha = exactSha('frontend.rollback.sourceSha', record.frontend?.rollback?.sourceSha, errors)
  if (rollbackSha && rollbackSha === record.source?.sha) {
    errors.push('frontend.rollback.sourceSha must differ from source.sha.')
  }
  positiveInteger('frontend.rollback.workflowRunId', record.frontend?.rollback?.workflowRunId, errors)
  positiveInteger('frontend.rollback.artifactId', record.frontend?.rollback?.artifactId, errors)

  const rollbackAction = record.backend?.disableOrRollbackAction
  if (rollbackAction !== 'DISABLE_INITIAL_SERVICE'
    && !/^ROLLBACK_TO_SOURCE:[0-9a-f]{40}$/.test(rollbackAction ?? '')) {
    errors.push('backend.disableOrRollbackAction must be DISABLE_INITIAL_SERVICE or ROLLBACK_TO_SOURCE:<40-character-sha>.')
  }
  if (rollbackAction === `ROLLBACK_TO_SOURCE:${record.source?.sha}`) {
    errors.push('backend.disableOrRollbackAction must not point to source.sha.')
  }

  boundedText('operations.invitationOwner', record.operations?.invitationOwner, errors)
  boundedText('operations.monitoredAbuseContact', record.operations?.monitoredAbuseContact, errors)
  boundedText('operations.providerLogRetention', record.operations?.providerLogRetention, errors)
  if (!Array.isArray(record.operations?.providerLogAdministrators)
    || record.operations.providerLogAdministrators.length === 0) {
    errors.push('operations.providerLogAdministrators must name at least one reviewed administrator.')
  } else {
    for (const [index, administrator] of record.operations.providerLogAdministrators.entries()) {
      boundedText(`operations.providerLogAdministrators[${index}]`, administrator, errors)
    }
  }

  exactValue('authorization.status', record.authorization?.status, 'AUTHORIZED', errors)
  boundedText('authorization.operator', record.authorization?.operator, errors)
  const authorizedAt = record.authorization?.authorizedAt
  const normalizedAuthorizedAt = typeof authorizedAt === 'string' && !authorizedAt.includes('.')
    ? authorizedAt.replace(/Z$/, '.000Z')
    : authorizedAt
  const authorizedAtMilliseconds = typeof authorizedAt === 'string' ? Date.parse(authorizedAt) : Number.NaN
  if (typeof authorizedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(authorizedAt)
    || Number.isNaN(authorizedAtMilliseconds)
    || new Date(authorizedAtMilliseconds).toISOString() !== normalizedAuthorizedAt) {
    errors.push('authorization.authorizedAt must be one ISO-8601 UTC timestamp.')
  }
}

function objectWithExactKeys(name, value, keys, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must be an object.`)
    return
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${name} must contain exactly: ${expected.join(', ')}.`)
  }
}

function exactValue(name, value, expected, errors) {
  if (value !== expected) errors.push(`${name} must be ${JSON.stringify(expected)}.`)
}

function exactSha(name, value, errors) {
  if (!EXACT_SHA.test(value ?? '')) {
    errors.push(`${name} must be a lowercase 40-character Git SHA.`)
    return ''
  }
  return value
}

function boundedText(name, value, errors) {
  if (typeof value !== 'string' || value !== value.trim() || value.length < 1 || value.length > 160) {
    errors.push(`${name} must be non-empty trimmed text no longer than 160 characters.`)
    return ''
  }
  return value
}

function positiveNumber(name, value, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    errors.push(`${name} must be a positive finite number.`)
  }
}

function positiveInteger(name, value, errors) {
  if (!Number.isSafeInteger(value) || value <= 0) errors.push(`${name} must be a positive integer.`)
}

function renderOrigin(name, value, errors) {
  if (typeof value !== 'string' || value !== value.trim()) {
    errors.push(`${name} must be one canonical HTTPS Render origin.`)
    return ''
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:'
      || !RENDER_HOST.test(url.hostname)
      || url.username
      || url.password
      || url.port
      || url.pathname !== '/'
      || url.search
      || url.hash
      || url.origin !== value) {
      errors.push(`${name} must be one canonical HTTPS Render origin.`)
      return ''
    }
    return url.origin
  } catch {
    errors.push(`${name} must be one canonical HTTPS Render origin.`)
    return ''
  }
}

function decisionError(errors) {
  return new Error(`H1_PRETEST_DECISION_INVALID\n- ${errors.join('\n- ')}`)
}

export async function main(argv = process.argv.slice(2)) {
  const allowDraft = argv.includes('--allow-draft')
  const paths = argv.filter((argument) => argument !== '--allow-draft')
  if (paths.length !== 1) {
    throw new Error('Usage: node scripts/validate-h1-pretest-decision-record.mjs [--allow-draft] <record.json>')
  }
  const path = resolve(paths[0])
  const record = JSON.parse(await readFile(path, 'utf8'))
  const result = validateH1PretestDecisionRecord(record, { allowDraft })
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
