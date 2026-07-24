import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateH1PretestDecisionRecord } from '../../scripts/validate-h1-pretest-decision-record.mjs'

const sourceSha = '122dbd8fb2cfdeafc0835533acbd0b68605f682f'
const rollbackSha = 'ac8540e9c1786c3779c2d042a02209715ec98e63'

function authorizedRecord() {
  return {
    schemaVersion: 1,
    status: 'AUTHORIZED',
    profile: 'INVITE_ONLY_HOSTED_PRETEST',
    source: {
      repository: 'urkrass/tanchiki2',
      sha: sourceSha,
    },
    provider: {
      kind: 'render',
      workspace: 'human-selected-workspace',
      plan: 'human-confirmed-plan',
      region: 'human-confirmed-region',
      instances: 1,
      autoDeploy: false,
      monthlyCeiling: {
        amount: 10,
        currency: 'USD',
      },
      billingOwner: 'named billing owner',
      repositoryConnectionAuthorized: true,
    },
    backend: {
      publicOrigin: 'https://tanchiki2-online.onrender.com',
      allowedOrigin: 'https://urkrass.github.io',
      disableOrRollbackAction: 'DISABLE_INITIAL_SERVICE',
    },
    frontend: {
      pagesTarget: 'https://urkrass.github.io/tanchiki2/',
      multiplayerOrigin: 'https://tanchiki2-online.onrender.com',
      rollback: {
        sourceSha: rollbackSha,
        workflowRunId: 3001,
        artifactId: 5001,
      },
    },
    operations: {
      invitationOwner: 'named invitation owner',
      monitoredAbuseContact: 'named private contact',
      providerLogAdministrators: ['named provider administrator'],
      providerLogRetention: 'provider setting reviewed at execution',
      applicationSessionTelemetry: false,
      sensitiveTelemetry: false,
      tagDecision: 'NO_TAG',
      announcementDecision: 'NO_PUBLIC_ANNOUNCEMENT',
    },
    authorization: {
      status: 'AUTHORIZED',
      scope: 'H1_INVITE_ONLY_HOSTED_PRETEST',
      operator: 'named human operator',
      authorizedAt: '2026-07-24T08:00:00Z',
    },
  }
}

describe('H1 invite-only hosted-pretest decision guard', () => {
  it('keeps the committed template structurally valid but non-authorizing', () => {
    const template = JSON.parse(readFileSync(
      new URL('../../docs/deployment/tanchiki2-h1-invite-only-hosted-pretest-decision-record.template.json', import.meta.url),
      'utf8',
    ))
    expect(validateH1PretestDecisionRecord(template, { allowDraft: true })).toEqual({
      ok: true,
      mode: 'draft-template',
      profile: 'INVITE_ONLY_HOSTED_PRETEST',
      sourceSha: null,
    })
    expect(() => validateH1PretestDecisionRecord(template)).toThrow(/DRAFT records cannot authorize H1 execution/)
  })

  it('accepts a complete exact invite-only decision without granting public-release scope', () => {
    expect(validateH1PretestDecisionRecord(authorizedRecord())).toEqual({
      ok: true,
      mode: 'authorized-decision',
      profile: 'INVITE_ONLY_HOSTED_PRETEST',
      sourceSha,
    })
  })

  it('fails closed on scaling, automatic deploy, telemetry, tags, and announcements', () => {
    const record = authorizedRecord()
    record.provider.instances = 2
    record.provider.autoDeploy = true
    record.operations.applicationSessionTelemetry = true
    record.operations.sensitiveTelemetry = true
    record.operations.tagDecision = 'v1.0.0'
    record.operations.announcementDecision = 'PUBLIC_POST'

    expect(() => validateH1PretestDecisionRecord(record)).toThrow(
      /provider.instances[\s\S]*provider.autoDeploy[\s\S]*applicationSessionTelemetry[\s\S]*sensitiveTelemetry[\s\S]*tagDecision[\s\S]*announcementDecision/,
    )
  })

  it('rejects endpoint drift, self rollback, missing ownership, and undeclared fields', () => {
    const record = authorizedRecord()
    record.backend.publicOrigin = 'https://example.com'
    record.frontend.multiplayerOrigin = 'https://different.onrender.com'
    record.frontend.rollback.sourceSha = sourceSha
    record.operations.providerLogAdministrators = []
    ;(record as Record<string, unknown>).secret = 'must never enter the record'

    expect(() => validateH1PretestDecisionRecord(record)).toThrow(
      /record must contain exactly[\s\S]*backend.publicOrigin[\s\S]*multiplayerOrigin[\s\S]*rollback.sourceSha[\s\S]*providerLogAdministrators/,
    )
  })

  it('rejects Pages preview paths until their multiplayer build is guarded', () => {
    const record = authorizedRecord()
    record.frontend.pagesTarget = 'https://urkrass.github.io/tanchiki2/previews/friends-pretest/'
    expect(() => validateH1PretestDecisionRecord(record)).toThrow(
      'preview targets remain blocked',
    )
  })

  it('rejects calendrically impossible authorization timestamps', () => {
    const record = authorizedRecord()
    record.authorization.authorizedAt = '2026-02-31T08:00:00Z'
    expect(() => validateH1PretestDecisionRecord(record)).toThrow(
      'authorization.authorizedAt must be one ISO-8601 UTC timestamp',
    )
  })
})
