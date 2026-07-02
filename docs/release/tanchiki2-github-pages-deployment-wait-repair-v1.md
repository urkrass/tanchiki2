# Tanchiki2 GitHub Pages Deployment Wait Repair

## Decision State

`GITHUB_PAGES_DEPLOYMENT_WAIT_REPAIR_READY_FOR_RETRY_AUTHORIZATION`

## Source Head

- Current `main` source head: `b45363845a8cdaad49333b6ce4c1f14c8079518d`.
- Previous workflow repair PR: PR #58, merged at source head `b45363845a8cdaad49333b6ce4c1f14c8079518d`.
- Authorized retry run inspected by this package: `28609482595`.

## Failure Evidence

- The authorized clean retry used `.github/workflows/deploy-github-pages.yml` on `main`.
- Run `28609482595` built the static site successfully.
- Build job `84838009231` succeeded, including checkout, Node setup, `actions/configure-pages@v6.0.0`, `npm ci`, `npm run build`, and upload of the `github-pages` artifact.
- Uploaded artifact evidence: artifact name `github-pages`, artifact id `8046828417`, artifact size `112429`, not expired at inspection time.
- Deploy job `84838103561` failed after the Pages deployment remained queued.
- GitHub deployment record `5288600813` targeted environment `github-pages`, source SHA `b45363845a8cdaad49333b6ce4c1f14c8079518d`, and ref `main`.
- Deployment statuses for `5288600813` progressed through `waiting`, `queued`, and `in_progress`, then ended in `failure` at `2026-07-02T17:43:46Z`.
- Pages deployment status endpoint for `b45363845a8cdaad49333b6ce4c1f14c8079518d` returned an empty `status` during inspection instead of `succeed`.

## Configuration Evidence

- Repository GitHub Pages configuration is `build_type: workflow`.
- GitHub Pages URL is `https://urkrass.github.io/tanchiki2/`.
- HTTPS enforcement is enabled.
- The `github-pages` environment exists.
- The `github-pages` environment has a branch policy and permits `main`.
- No environment approval was pending for run `28609482595`.
- The workflow remains `workflow_dispatch` only.

## Root Cause

The workflow attempted to extend `actions/deploy-pages@v5.0.0` with `timeout: 1800000`, but the action implementation caps the timeout at `600000` milliseconds and cancels the Pages deployment when the cap is reached. The run log showed the timeout input was clamped, then the deployment stayed `deployment_queued` until the action canceled it.

This means the previous 30-minute timeout setting could not take effect. The failure path was the deploy action wait/cancel behavior, not a product build failure.

## Repair

The manual-only workflow now keeps the standard GitHub Pages build path, then creates and polls the Pages deployment directly through the GitHub Pages API:

- Build job still uses `npm run build`.
- Build job still uploads `dist/` through `actions/upload-pages-artifact@v5.0.0`.
- Build job exports the uploaded Pages artifact id to the deploy job.
- Deploy job keeps `pages: write` and `id-token: write`.
- Deploy job requests an OIDC token from GitHub Actions.
- Deploy job creates a Pages deployment with the uploaded artifact id, the exact source SHA, and the OIDC token.
- Deploy job polls the Pages deployment status for up to 30 minutes.
- If GitHub Pages still does not report success before the 30-minute wait, the job fails but does not cancel the queued Pages deployment.

This is the minimum workflow repair supported by the evidence because the prior action version already used the correct Pages API but had a hardcoded maximum wait and cancel-on-timeout behavior.

## Explicit Non-Actions

No workflow dispatch was performed by this repair package.

No deployment, publishing, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external-provider mutation, product source change, test change, game logic change, package dependency change, or non-GitHub-Pages release action was performed.

## Local Validation

- `npm.cmd run validate` passed with 18 test files and 186 tests, production build, server smoke, harness validate, and harness smoke.
- `npm.cmd run visual:contrast` passed with `contrast ok`.
- `npm.cmd run harness:validate` passed.
- `npm.cmd run harness:smoke` passed.
- `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` passed with terminal outcome `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `can_claim_complete: true`, `open_blocking_count: 0`, and `finding_codes: []`.
- `git diff --check` passed.
- `git diff --cached --check` passed before staging.

## Residual Risks

- GitHub Pages may still keep a deployment queued beyond 30 minutes.
- A public Pages URL may continue serving a previous deployment even when the current source SHA deployment fails or remains queued.
- If the next authorized retry still fails, the next package should stop with release execution failure evidence rather than retrying again without a fresh human decision.
- If GitHub Pages backend state remains inconsistent, the next repair path may require GitHub support, branch-based Pages publication planning, or a separately authorized hosting decision.

## Required Before Future Retry

Future deployment retry authorization must name all of:

- exact source head;
- exact workflow file;
- deployment/publishing target;
- deployment/publishing method;
- tag decision;
- announcement decision;
- rollback target;
- any production-setting exception required for GitHub Pages, otherwise production settings remain forbidden.

The next governed package is `TANCHIKI2-GITHUB-PAGES-DEPLOYMENT-RETRY-AUTHORIZATION`.
