# Tanchiki2 P6 Public Release Execution v1

Status: **REPOSITORY RELEASE PREPARATION IMPLEMENTED; LIVE EXECUTION BLOCKED**

Prepared: 2026-07-23

Exact preparation baseline: `2de4955041dfadc002666e27bef746a7b45a978e`

Working branch: `codex/tanchiki2-p6-public-release-execution-v1`

This package prepares the online-enabled production release lane without performing a release. It does not provision Render, connect a provider account, spend money, create a public backend, publish GitHub Pages, change repository or provider settings, create a tag, or announce anything.

## Attended-v2 boundary

- Campaign prompt: `D:\agentic-harness\tmp\tanchiki2-p6-public-release-execution-v1-prompt.json`.
- Prompt validation: passed with zero blockers.
- Guard request: `D:\agentic-harness\tmp\tanchiki2-p6-public-release-execution-v1-attended-v2-guard-request.json`.
- Operating-mode result: `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`, finding codes `[]`.
- The request explicitly sets production-setting mutation and deploy/publish/tag/announcement authority to false.

Git artifacts and deterministic checks remain authoritative. Historical release documents, read-only live inspection, natural-language summaries, and attended-v2 telemetry remain advisory evidence.

## Reconciled live state

Read-only checks on 2026-07-23 found:

- `origin/main`: `2de4955041dfadc002666e27bef746a7b45a978e`.
- Open pull requests and issues: none before this package.
- Public Pages URL: `https://urkrass.github.io/tanchiki2/`, workflow-built and HTTPS-enforced.
- Live source: `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`, workflow run `29852987783`.
- Live HTML, JavaScript, CSS, and favicon: HTTP 200.
- Bundled browser client: rendered the splash Canvas and structured state with no console-error artifact.
- The live JavaScript still contains the `127.0.0.1:8787` multiplayer default. It is not an online-enabled public preview.
- The live Pages artifact `8504117857` expired on 2026-07-22. It is no longer a usable rollback artifact.
- Repository artifact retention allows 90 days, but `actions/upload-pages-artifact` defaults Pages artifacts to one day unless the workflow overrides it.
- No Render CLI or Render-named environment credential is present locally. No production backend endpoint is known or claimed.
- GitHub has no production multiplayer URL repository variable. Existing repository secret names are unrelated to Render hosting.

## Release workflow lock

The manual Pages workflow remains non-automatic. Preview-slug builds retain their existing isolated behavior. A blank slug, which targets the production root, now fails closed unless all of these inputs are present and valid:

| Input | Required production meaning |
| --- | --- |
| `expected_source_sha` | Lowercase 40-character SHA exactly equal to the workflow's `main` head. |
| `multiplayer_url` | HTTPS origin using one Render-managed `*.onrender.com` hostname, with no credentials, port, path, query, fragment, or surrounding whitespace. |
| `frontend_rollback_sha` | Different prior source with a successful production-root Pages run and an unexpired `github-pages` artifact. Preview artifacts are rejected. |
| `backend_rollback_action` | `DISABLE_INITIAL_SERVICE` for the first backend release, or `ROLLBACK_TO_SOURCE:<sha>` once a previous backend artifact exists. |

Before building the production root, the guard also requires:

1. workflow ref `refs/heads/main`;
2. `/health` HTTP success with exactly `ok`, `service`, `revision`, and `privateRooms`;
3. service identity `tanchiki-multiplayer`;
4. backend revision equal to the approved source SHA;
5. `privateRooms: 0`;
6. proof that at least one matching prior run skipped the preview-preservation step and therefore deployed the named source at the production root, even when newer preview runs exist for the same commit or GitHub paginates the matching run into older results;
7. an unexpired rollback artifact from that production-root run.

Only after those checks does the workflow export the validated origin as `VITE_MULTIPLAYER_URL`. After the artifact build, the deploy job repeats the exact backend identity, revision, and zero-room check immediately before it creates the Pages deployment, closing the build-time drain race. Future Pages artifacts explicitly retain for 90 days. Invalid input, a localhost or foreign endpoint, revision drift, an occupied backend, an expanded health payload, or an expired/missing rollback artifact stops before deployment.

This is a repository safety interlock, not release authority and not evidence that the provider exists.

## Current blocker ledger

| Gate | Current evidence | Terminal state |
| --- | --- | --- |
| Release profile | The prepared production-root lane is online-enabled; P1 still requires explicit exact release-profile selection. | `RELEASE_PROFILE_SELECTION_REQUIRED` |
| Human WAN | Automated P3 fault evidence is complete; real 2v2 WAN evidence remains `0 / 10 minimum`. | `HUMAN_WAN_PARTICIPANTS_REQUIRED` |
| Provider and region | P4 recommends Render Starter, one instance, Frankfurt; no workspace is named. | `RENDER_WORKSPACE_REQUIRED` |
| Cost | P4 proposed a USD 10 monthly ceiling; no current commercial terms or spend approval are accepted. | `BILLING_CEILING_APPROVAL_REQUIRED` |
| Public backend | No Render service, hostname, deployment, or health response exists. | `PUBLIC_HOSTING_AUTHORITY_REQUIRED` |
| Frontend rollback | Exact live source is known, but its Pages artifact is expired. | `FRONTEND_ROLLBACK_REQUIRED` |
| Backend rollback | This would be the first backend deploy; `DISABLE_INITIAL_SERVICE` has not been authorized. | `BACKEND_ROLLBACK_OR_DISABLE_REQUIRED` |
| Abuse contact | P5 requires one monitored private invitation-channel contact; none is named. | `MONITORED_ABUSE_CONTACT_REQUIRED` |
| Provider logs | Actual provider-log administrators and retention have not been inspected or approved. | `PROVIDER_LOG_RETENTION_AND_ADMIN_REQUIRED` |
| Exact release authority | No exact source/profile/target/method/rollback/tag/announcement authorization exists. | `PRODUCTION_DEPLOYMENT_AUTHORITY_REQUIRED` |

The expired artifact is repairable without weakening the gate: after this workflow change is merged, prepare a fresh unexpired rollback artifact from the exact currently live source, verify it, and only then authorize a production-root run. Running that remote preparation and any public deployment remain separate human-owned actions.

## Validation contract

The repository package must pass:

- focused release-input and workflow contract tests, including rejection of preview artifacts, safe GitHub pagination, and selection of a valid production-root rollback among multiple same-source runs;
- the full product validation stack;
- a production build with a representative Render URL embedded and no localhost multiplayer default in the emitted JavaScript;
- Product Review Warden, Deep Agent stub, and attended-v2 lifecycle checks;
- the required bundled browser client against the unchanged live site;
- `git diff --check` and exact-head review.

No successful local test may be presented as hosted multiplayer, Human WAN, or deployment evidence.

## Required execution authorization

After the branch is merged, all external acceptance evidence is complete, and a rollback artifact is recoverable, the operator must replace every bracket in one explicit instruction:

```text
I authorize Tanchiki2 release execution from source head [exact merged 40-character SHA] using release profile ONLINE_ENABLED_PUBLIC_PREVIEW. Deploy the backend to Render workspace [workspace], region frankfurt, one Starter instance, by connecting urkrass/tanchiki2 and applying render.yaml, with a monthly ceiling of [amount and currency], and authorize creation of its public onrender.com hostname. Deploy the frontend to https://urkrass.github.io/tanchiki2/ with deploy-github-pages.yml and VITE_MULTIPLAYER_URL=[exact HTTPS Render origin]. The frontend rollback is [exact unexpired artifact/run/source], and the backend rollback is [DISABLE_INITIAL_SERVICE or exact prior source/artifact]. The monitored private abuse contact is [human-owned channel/contact], and provider-log administrators/retention are [actual reviewed setting]. The tag decision is [exact tag or NO TAG]. The announcement decision is [exact channel/owner or NO ANNOUNCEMENT]. I authorize only the production/provider/repository changes explicitly named above.
```

General approval such as "proceed", "merge", or "deploy" is insufficient for those protected surfaces because it does not name cost, provider workspace, public target, exact source, rollback, operational ownership, tag, or announcement decisions.

## Terminal outcome

`P6_REPOSITORY_RELEASE_PREPARATION_READY_LIVE_EXECUTION_BLOCKED_BY_EXTERNAL_GATES`
