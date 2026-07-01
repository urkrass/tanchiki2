# Tanchiki2 RC1 Release Candidate Preparation V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-RC1-RELEASE-CANDIDATE-PREPARATION`

Terminal outcome: `TANCHIKI2_RC1_RELEASE_CANDIDATE_PREPARATION_READY`

## Scope

This package prepares RC1 evidence and refreshes release documentation after I9-I16 and the post-polish release-readiness reassessment. It does not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change campaign balance, change online protocol, change server authority, add gameplay features, or add polish features.

## Source Base And Head

- Fetch result: `origin/main` advanced to `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Expected post-reassessment merge: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- RC1 preparation branch: `codex/tanchiki2-rc1-release-candidate-preparation`.
- Product source base assessed: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Product source head assessed: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Product source change in this package: none.
- Documentation/evidence changes in this package: release checklist refresh, this RC1 preparation document, and `progress.md` update.

`.agentic-harness/memory/` was loaded before work. Review Warden memory was treated as evidence/context only; Git artifacts remain authority.

## Reviewed Inputs

- `.agentic-harness/memory/`
- `docs/release/tanchiki2-post-polish-release-readiness-reassessment-v1.md`
- `docs/qa/i16-qa-gap-closure.md`
- `docs/release/tanchiki2-production-closeout-v1.md`
- `docs/release/release-checklist.md`
- `progress.md`
- PR #24 through PR #32 metadata

## PR #24-#32 Merge State

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

## Final Validation Results

Validation was run locally from `D:\projects\tanchiki` on the RC1 preparation branch.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 16 test files and 137 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check passed with tank `luminanceDelta: 72.12485126055542`, tank `chromaDelta: 26.290213260135133`, HUD `luminanceDelta: 18.410873469387994`, and HUD objective line delta `23.62460192307725`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. |
| `node qa/playwright/mobile-touch-smoke.mjs --phase rc1 --out-root output/rc1-release-candidate-preparation/mobile-touch-smoke` | PASS | `MOBILE_TOUCH_SMOKE_PASSED`. |
| `git diff --check` | PASS | No whitespace errors in the final unstaged diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the final staged diff. |

Additional browser evidence commands used existing smoke infrastructure:

- `node C:\Users\Legion\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js --url http://127.0.0.1:5721/ --actions-file qa/playwright/gameplay-smoke.json --iterations 1 --pause-ms 250 --screenshot-dir output/rc1-release-candidate-preparation/offline-campaign-smoke`: PASS.
- `node C:\Users\Legion\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js --url http://127.0.0.1:5721/ --actions-file qa/playwright/online-smoke.json --iterations 1 --pause-ms 500 --screenshot-dir output/rc1-release-candidate-preparation/online-battle-smoke`: PASS with a local multiplayer server.

## Final QA Evidence Paths

| Required coverage | Result | Evidence |
| --- | --- | --- |
| Offline campaign start reaches normal play | PASS | `output/rc1-release-candidate-preparation/offline-campaign-smoke/shot-0.png`; `output/rc1-release-candidate-preparation/offline-campaign-smoke/state-0.json` shows `mode: "playing"`, Level 1 `Outer Blocks`, base HP `3/3`, enemies spawned, and a nonblank battlefield. |
| Level/result/retry loop remains understandable | PASS | `npm.cmd run validate` includes `src/game/accessibilityReadability.test.ts` result recovery coverage and `src/game/qaGapClosure.test.ts` expanded result diagnostics; mobile pause/restart evidence shows visible restart copy at `output/rc1-release-candidate-preparation/mobile-touch-smoke/mobile-pause-restart/shot-0.png`. |
| Online battle/server smoke still passes | PASS | `npm.cmd run validate` includes `server:smoke`; browser evidence at `output/rc1-release-candidate-preparation/online-battle-smoke/shot-0.png` and `state-0.json` shows `connection: "connected"`, snapshot `phase: "playing"`, circular fog, and `sendErrorCount: 0`. |
| Mobile/touch controls preserve multi-touch and fire behavior | PASS | `output/rc1-release-candidate-preparation/mobile-touch-smoke/mobile-touch-gameplay/state-0.json` records `touchControlsVisible: true`, held `up: true`, held `fire: true`, `multiTouchPreserved: true`, and `fireTriggered: true`. |
| Contrast/readability remains green | PASS | `npm.cmd run visual:contrast` passed; `npm.cmd run validate` passed readable-text/accessibility regressions. |
| `readableText` evidence exists for key offline/online surfaces | PASS | Offline: `output/rc1-release-candidate-preparation/offline-campaign-smoke/state-0.json` includes `readableText.screen: "playing"` and HUD/objective/marker text. Online: `output/rc1-release-candidate-preparation/online-battle-smoke/state-0.json` includes `readableText.screen: "online-battle"`, `ONLINE`, and `BATTLE LIVE`. Mobile: `output/rc1-release-candidate-preparation/mobile-touch-smoke/mobile-pause-restart/state-0.json` includes pause/restart and touch labels. |
| Review Warden allows COMPLETE with zero blockers | PASS | Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` and `open_blocking_count: 0`. |
| No deploy/release authority claimed | PASS | This package contains documentation and evidence only; no deploy, publish, tag, production setting, secret, billing, branch protection, or announcement action was performed or authorized. |

Browser screenshots were manually inspected. Offline, online, mobile gameplay, and mobile pause/restart screenshots show rendered nonblank canvas states and no incoherent overlap was observed in the inspected surfaces.

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

## Readiness Decision

Recommendation: GO for RC1 candidate review / final human release decision.

Recommendation: NO-GO for deployment, publish, tag, production-setting changes, secret changes, billing changes, branch-protection changes, or announcement until separately authorized.

No product repair package is currently recommended.

## Residual Risks

- Local generated browser evidence under `output/` is intentionally ignored and not committed; the committed authority is this document, the checklist, validation results, and the PR head.
- RC1 preparation does not verify a live hosted environment, production domain, deployment credentials, release tag, rollback execution, or announcement channel.
- Final release remains a human decision. This package only prepares candidate evidence.
- Any future review comments or changed production/deployment assumptions must be evaluated before release action.

No residual risk currently requires a repair package.

## Explicit No-Deploy / No-Release Statement

This package did not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback, or claim authority to do any of those actions.

## Deployment Planning Inputs

Planning inputs only:

- Candidate product source: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Candidate build command: `npm.cmd run build`.
- Candidate verification commands: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, offline browser smoke, online browser/server smoke, and mobile touch smoke.
- Browser evidence output root: `output/rc1-release-candidate-preparation/`.
- Multiplayer local smoke assumption: browser online smoke used a local server only; deployment must separately authorize and verify any hosted `VITE_MULTIPLAYER_URL`.
- LiveKit token route remains deployment-gated by environment variables; this RC1 package did not configure or validate provider secrets.
- Release tag, release notes, publication target, production settings, billing, branch protection, rollback exercise, and announcement copy require a separately authorized governed package.

## Next Recommended Governed Package

Package: `TANCHIKI2-RC1-FINAL-HUMAN-RELEASE-DECISION`

Objective:

- Review this RC1 preparation PR and evidence.
- Make the final human release decision.
- If approved, separately authorize any deployment, publish, tag, production-setting, secret, billing, branch-protection, rollback, or announcement action with explicit scope and gates.

Expected next terminal outcome:

- `TANCHIKI2_RC1_FINAL_HUMAN_RELEASE_DECISION_READY`
