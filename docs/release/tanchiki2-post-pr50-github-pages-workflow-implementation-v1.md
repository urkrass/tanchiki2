# Tanchiki2 Post-PR50 GitHub Pages Workflow Implementation V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-POST-PR50-GITHUB-PAGES-WORKFLOW-IMPLEMENTATION-AUTHORIZATION`

Decision state: `GITHUB_PAGES_WORKFLOW_IMPLEMENTED_NOT_EXECUTED`

## Scope

This package implements a manual-only GitHub Actions workflow for a future GitHub Pages static-site release path.

It creates `.github/workflows/deploy-github-pages.yml` and records governance evidence. It does not modify product source, tests, harness adapters, application runtime behavior, or package scripts.

It does not dispatch the workflow, enable GitHub Pages, deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback state, remove rollback, mutate an external provider, or perform any release action.

## Authorization

Authorized source head: `a1531327a481e7120ca4af8dc38a9444897f70f6`

Human authorization:

> I authorize Tanchiki2 GitHub Pages workflow implementation from current main head a1531327a481e7120ca4af8dc38a9444897f70f6.
>
> This authorizes creating a GitHub Actions workflow for GitHub Pages static deployment planning/implementation only.
>
> The workflow may build with npm run build and prepare publishing dist/ to GitHub Pages, but it must not be executed as a release action in this package.
>
> This does not authorize deployment, publishing, tagging, announcement, production-setting changes, secret changes, billing changes, branch-protection changes, rollback removal, or release execution.

## Pre-Edit Repository Check

Before editing, `origin/main` was fetched and confirmed at `a1531327a481e7120ca4af8dc38a9444897f70f6`.

Reviewed files:

- `package.json`
- `.github/workflows/validate.yml`
- `docs/release/release-checklist.md`
- `docs/release/tanchiki2-post-pr50-github-pages-implementation-plan-v1.md`
- `progress.md`

`package.json` contains `build` and `preview` scripts. It does not contain committed `deploy` or `publish` scripts.

Before this package, `.github/workflows/validate.yml` was the only committed workflow.

Before this package, no committed GitHub Pages, Vercel, Netlify, Cloudflare, Firebase, Render, `CNAME`, `.nojekyll`, deploy, or publish configuration was found.

## Attended-V2 Authority

The existing attended-v2 guard path was used for this package.

- Harness path: `D:\agentic-harness\worktrees\attended-v2-live-path-verify-4e1825`
- Attended-v2 guard: `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`; `finding_codes: []`
- Local `.agentic-harness` I7 Deep Agents stub runtime was not used as execution authority.

## Workflow Implementation

Created workflow file: `.github/workflows/deploy-github-pages.yml`

Workflow trigger:

- `workflow_dispatch` only.

Build command:

- GitHub Actions: `npm run build`
- Windows/local equivalent: `npm.cmd run build`

Artifact:

- `dist/`

Permissions:

- Top-level permissions are empty.
- Build job grants `contents: read`.
- Deploy job grants `pages: write` and `id-token: write`.

Environment:

- `github-pages`

Workflow steps:

1. Checkout repository.
2. Set up Node 22 with npm cache.
3. Run `npm ci`.
4. Run `npm run build`.
5. Upload `dist/` as the GitHub Pages artifact.
6. Deploy the GitHub Pages artifact.

Exact action versions verified during this package:

- `actions/checkout@v7.0.0`
- `actions/setup-node@v6.4.0`
- `actions/upload-pages-artifact@v5.0.0`
- `actions/deploy-pages@v5.0.0`

`actions/configure-pages@v6.0.0` was also checked as current, but this Vite static-artifact workflow does not use it because the approved implementation plan only requires checkout, Node setup, install, build, artifact upload, and Pages artifact deployment.

## Review And Merge Boundary

The standing docs/planning-only waiver does not apply to this package because `.github/workflows/deploy-github-pages.yml` is a workflow change.

This PR must not be merged under the docs/planning-only waiver. Merge requires exact-head Reviewer App approval/attestation or an explicit human waiver for this workflow-change PR after CI, local validation, Product Review Warden, and review-blocker checks are clean.

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

## Residual Risks

- GitHub Pages repository settings may still require human configuration to select GitHub Actions as the publishing source.
- The workflow is manual-only, but after merge a maintainer with sufficient GitHub permission could dispatch it. That dispatch would be release execution and remains unauthorized by this package.
- GitHub-hosted runner behavior and action versions can change over time; future release execution must re-check workflow health at the exact source head.
- No hosted production URL, rollback target, release tag, or announcement channel is authorized here.

## Future Release Execution Requirements

Future release execution must separately name all of:

- Exact source head.
- Deployment/publishing target.
- Deployment/publishing method.
- Tag decision.
- Announcement decision.
- Rollback target.
- Any production setting, secret, billing, branch-protection, or rollback exception; otherwise those remain forbidden.

## Explicit No-Release-Action Statement

This package did not dispatch the workflow, enable GitHub Pages, deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback state, remove rollback, mutate an external provider, or perform any release action.
