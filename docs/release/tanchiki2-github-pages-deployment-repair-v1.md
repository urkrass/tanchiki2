# Tanchiki2 GitHub Pages Deployment Repair V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: Tanchiki2 GitHub Pages deployment repair package

Decision state: `GITHUB_PAGES_DEPLOYMENT_REPAIR_READY_FOR_RETRY_AUTHORIZATION`

## Scope

This package investigates the failed GitHub Pages deployments for source head `831ac57a0b2cfbbbef1f89f3d0ff0e7d9b9ed243` and implements the minimum workflow repair for the GitHub Pages deployment path.

It does not dispatch the workflow. After this repair PR is merged, a separate human authorization is required before any clean deployment retry.

No product source, tests, game logic, package dependencies, secrets, billing, branch protection, rollback policy, tags, announcement, or external providers are changed.

## Authorization

Human authorization:

> I authorize a Tanchiki2 GitHub Pages deployment repair package.
>
> Scope: investigate why GitHub Pages deployments for source head 831ac57a0b2cfbbbef1f89f3d0ff0e7d9b9ed243 remain deployment_queued until cancellation, then implement the minimum safe repair.
>
> Allowed repair surfaces:
> - .github/workflows/deploy-github-pages.yml
> - docs/release/**
> - progress.md
>
> The package may adjust the GitHub Pages workflow structure, permissions, environment usage, timeout, concurrency, or deployment configuration documentation if evidence supports it.
>
> The package may not modify product source, tests, game logic, package dependencies, secrets, billing, branch protection, rollback policy, tags, announcement, or external providers.
>
> Do not dispatch the workflow again in the repair PR. After the repair PR is merged, stop and request separate authorization for one clean deployment retry.

## Failure Evidence

Failed workflow runs:

- Initial dispatch: `28605894174`
- Clean retry: `28607095099`

Both runs used:

- Branch: `main`
- Source head: `831ac57a0b2cfbbbef1f89f3d0ff0e7d9b9ed243`
- Workflow: `.github/workflows/deploy-github-pages.yml`

Observed behavior:

- `npm run build` passed.
- `actions/upload-pages-artifact@v5.0.0` uploaded a `github-pages` artifact.
- `actions/deploy-pages@v5.0.0` created a Pages deployment for `831ac57a0b2cfbbbef1f89f3d0ff0e7d9b9ed243`.
- The deployment remained `deployment_queued` until the deploy action reached its default 10-minute timeout.
- The deploy action canceled the Pages deployment and marked the job failed.
- The public URL `https://urkrass.github.io/tanchiki2/` returned `404` after the failures.

Repository configuration at investigation time:

- GitHub Pages exists.
- Pages `build_type`: `workflow`.
- Pages URL: `https://urkrass.github.io/tanchiki2/`.
- `https_enforced`: `true`.
- `github-pages` environment exists.
- `github-pages` custom branch policy allows `main`.
- GitHub status API reported all systems operational during investigation.

## Repair

The workflow already had the required build/deploy split, artifact upload, `needs: build`, `pages: write`, `id-token: write`, and `github-pages` environment.

This package makes two minimal changes:

1. Add `actions/configure-pages@v6.0.0` to the build job, matching GitHub's custom Pages workflow guidance that calls out the configure-pages action for GitHub Pages workflows.
2. Increase the deploy action timeout from its default 10 minutes to 30 minutes, with a 35-minute deploy job timeout, so a slow Pages backend queue does not self-cancel at the default timeout before a future authorized retry can finish.

The workflow remains manual-only with `workflow_dispatch`.

## Validation

Local validation passed for this package.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 18 test files and 186 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check returned `contrast ok`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; `open_blocking_count: 0`; `finding_codes: []`. |
| `git diff --check` | PASS | No whitespace errors in the working tree diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the staged diff. |

GitHub Actions Validate must still pass on the pull request head before merge.

## Review Warden Result

Product Review Warden allows the current complete claim.

- `can_claim_complete: true`
- `gate_passed: true`
- `terminal_outcome: PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`
- `finding_codes: []`
- `open_blocking_count: 0`
- `open_blocking_debt_ids: []`
- `closed_by_linked_repair_count: 5`
- `converted_to_repair_work_count: 5`
- `closed_by_human_waiver_count: 0`
- `scanned_comment_count: 10`

## Retry Boundary

This package does not dispatch the workflow.

After this repair PR is merged, a separate human authorization is required for exactly one clean deployment retry on `main`.

## Explicit No-Release-Action Statement

This package did not dispatch the workflow, deploy, publish, tag, announce, change product source, change tests, change package dependencies, change secrets, change billing, change branch protection, remove rollback, mutate external providers, or perform any non-GitHub-Pages release action.
