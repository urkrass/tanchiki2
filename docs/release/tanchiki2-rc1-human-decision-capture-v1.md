# Tanchiki2 RC1 Human Decision Capture V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-RC1-HUMAN-DECISION-CAPTURE`

Terminal outcome: `TANCHIKI2_RC1_HUMAN_DECISION_CAPTURE_READY`

## Scope

This package captures the explicit human decision for Tanchiki2 RC1. It records approval for release action planning only.

It does not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, remove rollback, or perform any release action.

No product source, gameplay, UI, polish, campaign, online protocol, production setting, secret, billing, branch protection, rollback, deployment, publishing, tag, or release announcement change is included.

## Source Head

- Fetch result: `origin/main` advanced to `9da072e7bfdbdebe6c093e24f361d8251b53abc3`.
- Expected post-PR-34 merge: `9da072e7bfdbdebe6c093e24f361d8251b53abc3`.
- Human decision capture branch: `codex/tanchiki2-rc1-human-decision-capture`.
- Exact repository source head assessed: `9da072e7bfdbdebe6c093e24f361d8251b53abc3`.
- RC1 candidate product runtime source remains the PR #33 source: `67be4dadaccd690b88d85f3235b9869f41d971ae`.
- Product source change in this package: none.
- Documentation/evidence changes in this package: this human decision capture document, release checklist decision update, and `progress.md` update.

`.agentic-harness/memory/` was loaded before work. Review Warden memory was treated as evidence/context only; Git artifacts remain authority.

## Reviewed Inputs

- `.agentic-harness/memory/`
- `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md`
- `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`
- `docs/release/tanchiki2-post-polish-release-readiness-reassessment-v1.md`
- `docs/release/release-checklist.md`
- `progress.md`

## PR #24-#34 Merge State

`origin/main` first-parent history confirms PR #24 through PR #34 are merged.

| PR | Package | State | Merge commit | Merged at |
| --- | --- | --- | --- | --- |
| #24 | I9 visual clarity baseline | MERGED | `2c736410f8d7a314edc32f8501cba6068beee462` | 2026-07-01T19:30:11Z |
| #25 | I10 game feel micro-polish | MERGED | `e40d0fd8853e3b2dad1f7d7c251df4ec33d2b827` | 2026-07-01T19:51:57Z |
| #26 | I11 onboarding/tutorial clarity | MERGED | `58321b6a9e38c333e21e5c4e3cc9d3ee3d9e3f23` | 2026-07-01T20:22:28Z |
| #27 | I12 online UX clarity | MERGED | `16495f5318320b49c2e2d6186e5e72d786f9b219` | 2026-07-01T20:52:38Z |
| #28 | I13 level readability pass | MERGED | `ff4456f51892d80ed7516dd86399ba4104cfc307` | 2026-07-01T21:19:47Z |
| #29 | I14 mobile and touch polish | MERGED | `bf6b3efc98aa1637951a4126508c9276d9f1b118` | 2026-07-01T21:46:49Z |
| #30 | I15 accessibility/readability hardening | MERGED | `6d0b48616301194ae4a37cd95668c4aeea707aea` | 2026-07-01T22:18:32Z |
| #31 | I16 QA gap closure | MERGED | `f11828c7c266199fb31cc0af5069588ef11b19b2` | 2026-07-01T22:32:58Z |
| #32 | Post-polish release-readiness reassessment | MERGED | `c6ab0eea05040f3ca5d84622c7c117f37b81d682` | 2026-07-01T22:46:41Z |
| #33 | RC1 release candidate preparation | MERGED | `67be4dadaccd690b88d85f3235b9869f41d971ae` | 2026-07-02T04:04:12+05:00 |
| #34 | RC1 final human release decision | MERGED | `9da072e7bfdbdebe6c093e24f361d8251b53abc3` | 2026-07-02T04:19:44+05:00 |

## Explicit Human Decision

Human decision supplied by operator:

> "I approve Tanchiki2 RC1 for release action planning."

## Decision State

Decision state: `HUMAN_APPROVED_FOR_RELEASE_ACTION_PLANNING`

This approval authorizes planning for future release actions only. It does not authorize deployment, publishing, tagging, announcement, production-setting changes, secret changes, billing changes, branch-protection changes, rollback removal, or any release action.

## Validation Results

Validation was run locally from `D:\projects\tanchiki` on the human decision capture branch after fetching `origin/main` at the exact post-PR-34 source head.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 16 test files and 137 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check passed with tank `luminanceDelta: 72.12485126055542`, tank `chromaDelta: 26.290213260135133`, HUD `luminanceDelta: 18.410873469387994`, and HUD objective line delta `23.62460192307725`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. |
| `node qa/playwright/mobile-touch-smoke.mjs --phase rc1-human-decision-capture --out-root output/rc1-human-decision-capture/mobile-touch-smoke` | PASS | `MOBILE_TOUCH_SMOKE_PASSED`. |
| `git diff --check` | PASS | No whitespace errors in the final unstaged diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the final staged diff. |

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

No open blocking P1/P2 review debt appeared. No human waiver was used.

## Final Evidence Summary

- Exact repository source head is `9da072e7bfdbdebe6c093e24f361d8251b53abc3`.
- RC1 candidate product runtime source remains `67be4dadaccd690b88d85f3235b9869f41d971ae`.
- PR #24 through PR #34 are merged in `origin/main`.
- Prior pending decision evidence is recorded in `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md`.
- RC1 preparation evidence is recorded in `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`.
- Post-polish release readiness is recorded in `docs/release/tanchiki2-post-polish-release-readiness-reassessment-v1.md`.
- Full local validation, contrast, harness validation, harness smoke, Product Review Warden, and final mobile/touch smoke are green on the human decision capture branch.
- Final mobile/touch smoke passed with evidence at `output/rc1-human-decision-capture/mobile-touch-smoke/`.

## Explicit No-Deploy / No-Release Statement

This package did not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, remove rollback, or perform any release action.

## Residual Risks

- Release action planning is now approved, but release action execution remains unauthorized until a later governed package explicitly authorizes each action and its gates.
- Local generated browser evidence under `output/` is intentionally ignored and not committed; the committed authority is this document, the checklist, validation results, and the PR head.
- This package does not verify a live hosted environment, production domain, deployment credentials, release tag, rollback execution, billing state, branch protection state, or announcement channel.
- Any future review comments, source changes, dependency changes, or changed production/deployment assumptions must be evaluated before release action.

No residual risk currently requires a product repair package.

## Next Recommended Governed Package

Package: `TANCHIKI2-RC1-RELEASE-ACTION-PLANNING`

Objective:

- Plan release actions under explicit governed scope.
- Keep deployment, publishing, tagging, announcement, production-setting changes, secret changes, billing changes, branch-protection changes, rollback removal, and release execution gated until specifically authorized.
- Define exact release-action steps, rollback gates, validation gates, ownership, and stop conditions before any release action occurs.

Expected next terminal outcome:

- `TANCHIKI2_RC1_RELEASE_ACTION_PLANNING_READY`
