# Tanchiki2 Post-PR50 GitHub Pages Implementation Plan V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-POST-PR50-GITHUB-PAGES-RELEASE-IMPLEMENTATION-PLANNING`

Terminal outcome: `TANCHIKI2_POST_PR50_GITHUB_PAGES_IMPLEMENTATION_PLAN_READY`

Decision state: `GITHUB_PAGES_IMPLEMENTATION_PLAN_READY`

## Scope

This package records a docs-only implementation plan for a future GitHub Pages release workflow.

It does not create a workflow, enable GitHub Pages, deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback state, remove rollback, mutate an external provider, or perform any release action.

## Source And Current Decision

- Source head: `f0b330cdc7f4cf4e04c93795250e50d64c045ed3`
- Current release target decision: GitHub Pages static site, planning-only.
- Previous target-selection decision state: `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY`
- Current implementation-plan decision state: `GITHUB_PAGES_IMPLEMENTATION_PLAN_READY`
- Product source change in this package: none
- Workflow change in this package: none
- Documentation/evidence changes in this package:
  - `docs/release/tanchiki2-post-pr50-github-pages-implementation-plan-v1.md`
  - `docs/release/release-checklist.md`
  - `progress.md`

## Attended-V2 Authority

The existing attended-v2 guard path was used for this package.

- Harness path: `D:\agentic-harness\worktrees\attended-v2-live-path-verify-4e1825`
- Attended-v2 guard: `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`; `finding_codes: []`
- Local `.agentic-harness` I7 Deep Agents stub runtime was not used as execution authority.

## Pre-Edit Repository Check

Before editing, `origin/main` was fetched and confirmed at `f0b330cdc7f4cf4e04c93795250e50d64c045ed3`.

Reviewed files:

- `package.json`
- `docs/release/release-checklist.md`
- `docs/release/tanchiki2-post-pr50-release-target-selection-v1.md`
- `docs/release/tanchiki2-post-pr50-release-action-authorization-v1.md`
- `docs/release/tanchiki2-post-pr50-release-candidate-refresh-v1.md`
- `progress.md`

`package.json` contains `build` and `preview` scripts. It does not contain committed `deploy` or `publish` scripts.

Committed release-target scan result:

- `.github/workflows/validate.yml` is the only committed workflow.
- No committed GitHub Pages, Vercel, Netlify, Cloudflare, Wrangler, Firebase, Render, `CNAME`, `.nojekyll`, deploy, or publish configuration file was found.

## Future Workflow Plan

Target: GitHub Pages static site.

Proposed future workflow file name: `.github/workflows/deploy-github-pages.yml`

Proposed future trigger: `workflow_dispatch` only at first.

Future build command:

- GitHub Actions: `npm run build`
- Windows/local equivalent: `npm.cmd run build`

Future artifact: `dist/`

Required future permissions:

- `contents: read`
- `pages: write`
- `id-token: write`

Required future environment:

- `github-pages`

Required future steps:

1. Checkout repository.
2. Set up Node.
3. Run `npm ci`.
4. Run `npm run build`.
5. Upload `dist/` as the GitHub Pages artifact.
6. Deploy the GitHub Pages artifact.

Exact GitHub Pages action versions must be verified during the implementation package before any workflow file is committed.

GitHub Pages repository settings may require human configuration. Any required repository setting change remains outside this package and must be handled by explicit future authority.

## Future Implementation Boundaries

Implementation of `.github/workflows/deploy-github-pages.yml` is a separate governed package and is not authorized here.

Release execution is still not authorized. Even after a workflow implementation package, deploy or publish execution requires separate exact human release-action authorization unless that future package explicitly grants it within the allowed boundaries.

Future packages must still resolve:

- Exact workflow action versions.
- GitHub Pages repository settings and required human configuration.
- Rollback target and rollback procedure.
- Tag decision.
- Announcement decision.
- Any production setting, secret, billing, branch-protection, or rollback exception; otherwise those surfaces remain forbidden.

## Validation

The standard docs/planning-only validation bundle passed for this package.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 18 test files and 186 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check returned `contrast ok`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; `open_blocking_count: 0`; `finding_codes: []`. |
| `git diff --check` | PASS | No whitespace errors in the working tree diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the staged diff. |

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

## Next Governed Package

Next governed package: `TANCHIKI2-POST-PR50-GITHUB-PAGES-WORKFLOW-IMPLEMENTATION-AUTHORIZATION`

That package is not started here.

## Explicit No-Release-Action Statement

This package did not create a workflow, enable GitHub Pages, deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback state, remove rollback, mutate an external provider, or perform any release action.
