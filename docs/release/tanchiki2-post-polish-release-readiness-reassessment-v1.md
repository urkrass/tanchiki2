# Tanchiki2 Post-Polish Release Readiness Reassessment V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Terminal outcome: `TANCHIKI2_POST_POLISH_RELEASE_READINESS_REASSESSMENT_READY`

## Scope

This reassessment reviews release readiness after the full I9-I16 polish chain. It is an audit and release-readiness document only. It does not add I17, product polish, gameplay changes, deployment, publication, release tagging, production settings, secrets, billing changes, branch protection changes, or Review Warden waivers.

## Final Status

Status: `READY_FOR_RELEASE_CANDIDATE_PREPARATION`

The game remains release-ready after I9-I16, subject to the same human gates that existed before polish. The correct next action is release candidate preparation with final manual QA as an explicit gate inside that package. No repair package is currently indicated.

This is not approval to deploy, publish, tag, or announce a release.

## Base, Head, And Merge State

- Fetch result: `origin/main` advanced to `f11828c7c266199fb31cc0af5069588ef11b19b2`.
- Expected post-I16 merge: `f11828c7c266199fb31cc0af5069588ef11b19b2`.
- Reassessment source base: `origin/main` at `f11828c7c266199fb31cc0af5069588ef11b19b2`.
- Reassessment branch: `codex/tanchiki2-post-polish-release-readiness-reassessment`.
- Product source head assessed: `f11828c7c266199fb31cc0af5069588ef11b19b2`.
- Merge base with `origin/main`: `f11828c7c266199fb31cc0af5069588ef11b19b2`.
- Current main first-parent tail:
  - `f11828c` Implement I16 QA gap closure (#31)
  - `6d0b486` Harden accessibility readability evidence (#30)
  - `bf6b3ef` Polish mobile touch controls (#29)
  - `ff4456f` Improve level readability markers (#28)
  - `16495f5` I12 online UX clarity (#27)
  - `58321b` Clarify onboarding and retry copy (#26)
  - `e40d0fd` Polish Tanchiki2 game feel feedback (#25)
  - `2c73641` Improve Tanchiki2 readability baseline (#24)

This reassessment document is a docs-only child of the product source state above.

## Reviewed Inputs

- `.agentic-harness/memory/`
- `docs/planning/tanchiki2-polish-plan-v1.md`
- `docs/qa/i16-qa-gap-closure.md`
- `docs/release/tanchiki2-production-closeout-v1.md`
- `docs/release/release-checklist.md`
- `progress.md`
- PR #24 through PR #31 metadata and PR bodies

## PR Chain Summary

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

## I9-I16 Change Summary

- I9 improved briefing/result/HUD copy, objective labels, minimap readability, and contrast/readability coverage.
- I10 added bounded local game-feel feedback: movement dust, shot feedback, reload meter, impact feedback, and clearer pause helper copy.
- I11 clarified first-run onboarding, How To Play, loading recovery, restart/save wording, defeat retry copy, and rendered onboarding evidence.
- I12 clarified online waiting, error, and battle status copy without changing protocol, server authority, matchmaking, hosting, or gameplay behavior.
- I13 added level-readability markers and rendered evidence for objectives, spawns, critical cover, visible markers, and off-camera cues.
- I14 improved mobile/touch control clarity, touch-control labels, held feedback, pause/restart copy, and mobile smoke evidence while preserving multi-touch semantics.
- I15 hardened accessibility/readability with `readableText` diagnostics, non-ambiguous marker labels, word-direction offscreen cues, touch pause labeling, and contrast evidence.
- I16 closed QA evidence gaps only: word-direction objective evidence in `render_game_to_text()`, focused result/offscreen cue regressions, reusable mobile-touch smoke `--out-root`, and final QA audit documentation.

No PR in this chain claimed deployment, release, production-setting, secret, billing, branch-protection, protocol redesign, or large UI redesign authority.

## Validation Results

Required validation was run from `D:\projects\tanchiki` on the reassessment branch.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 16 test files and 137 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check passed with tank `luminanceDelta: 72.12485126055542`, tank `chromaDelta: 26.290213260135133`, HUD `luminanceDelta: 18.410873469387994`, and HUD objective line delta `23.62460192307725`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. |
| `git diff --check` | PASS | No whitespace errors in the final unstaged diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the final staged diff. |

Additional existing smoke run:

- `node qa/playwright/mobile-touch-smoke.mjs --phase post-polish-reassessment --out-root output/post-polish-release-readiness-reassessment/mobile-touch-smoke`: PASS with `MOBILE_TOUCH_SMOKE_PASSED`.
- Refreshed mobile evidence: normal play reached, touch controls visible, held feedback for `up` and `fire`, multi-touch preserved, fire triggered, and pause/restart copy matched `Tap Restart to reload this mission from the beginning; unsaved progress is discarded.`

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

The `.agentic-harness/memory/review-debt.json` ledger still records all known blocking P1/P2 debt as closed by linked repair evidence or converted linked repair work. No open Review Warden blockers were found.

## QA Gap Assessment

No unresolved release-blocking QA gap remains after I16.

I16 found and closed three concrete evidence gaps:

- Off-camera objective direction cues were visible in screenshots but not keyboard-readable through `render_game_to_text()`.
- Result readability copy lacked a focused QA closure regression.
- Mobile touch smoke output was tied to the I14 default path.

Those are now covered by word-direction rendered evidence, `src/game/qaGapClosure.test.ts`, and reusable mobile smoke output. I16 intentionally did not recapture every screenshot surface because I9-I15 already carried targeted evidence and I16 only required focused runtime proof.

## Evidence Coherence

Validation, contrast, mobile/touch, online, and readable-text evidence are coherent.

- Unit validation includes the I15/I16 readable-text and QA-gap regressions.
- `visual:contrast` remains green after the full polish chain.
- The refreshed mobile/touch smoke confirms the I14/I16 mobile path still works at the post-I16 head.
- Online UX evidence is coherent across PR #27, the current test suite, server smoke, and online status/readable-text coverage. No new online protocol or server authority change was introduced after I12.
- The Review Warden gate, harness memory, PR bodies, and I16 QA note agree that no blocking review debt or unresolved polish-chain QA gap remains.

## Release Document Freshness

The older release documents are historically valid but stale for current post-polish readiness.

- `docs/release/tanchiki2-production-closeout-v1.md` records I5 production closeout proof at base `de2d1e25dec7fdc681f691ce7a0fb93cb504756e`, before I9-I16.
- `docs/release/release-checklist.md` records I5 evidence, older validation counts, and `output/i5-production-closeout/` browser proof.
- Neither older document is a current post-polish release authority by itself.

This reassessment supersedes them for the post-I16 readiness question. A later release candidate package should refresh the checklist if it will be used as an operational RC artifact.

## Residual Risks

- Final manual QA after I16 has not been recorded as a human release gate. This should be part of the release candidate preparation package.
- Browser screenshots and smoke outputs are local generated artifacts under ignored output paths. They are useful evidence but not committed release artifacts.
- Deployment, hosting, rollback, production settings, secrets, billing, tagging, announcement, and branch-protection state were not changed or authorized by this reassessment.
- The I5 closeout/checklist docs are stale as current guidance unless refreshed in the next governed package.

No residual risk currently requires a repair package.

## Go / No-Go Recommendation

Recommendation: GO for release candidate preparation.

Recommendation: NO-GO for deployment, publishing, tagging, release announcement, production-setting changes, secret changes, billing changes, branch-protection changes, rollback removal, or Review Warden waiver.

No product repair package is recommended at this time.

## Next Recommended Governed Package

Package: `TANCHIKI2-RC1-RELEASE-CANDIDATE-PREPARATION`

Objective:

- Refresh release checklist authority from I5 to post-I16.
- Run and record final manual QA across offline campaign start, online battle/server smoke, mobile/touch controls, contrast/readability, `readableText`, and screenshot inspection.
- Confirm Review Warden remains allowed on the exact RC head.
- Prepare deployment planning inputs without deploying, publishing, tagging, changing production settings, or changing secrets.

Expected next terminal outcome:

- `TANCHIKI2_RC1_RELEASE_CANDIDATE_PREPARATION_READY`
