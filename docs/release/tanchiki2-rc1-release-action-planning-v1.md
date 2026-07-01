# Tanchiki2 RC1 Release Action Planning V1

Date: 2026-07-02

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-RC1-RELEASE-ACTION-PLANNING`

Terminal outcome: `TANCHIKI2_RC1_RELEASE_ACTION_PLANNING_READY`

## Scope

This package prepares the governed release action plan for Tanchiki2 RC1. It plans future release actions only.

It does not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, remove rollback, or perform any release action.

No product source, gameplay, UI, polish, campaign, online protocol, production setting, secret, billing, branch protection, rollback, deployment, publishing, tag, release announcement, or external provider configuration change is included.

## Human Decision Basis

Human decision already captured:

> "I approve Tanchiki2 RC1 for release action planning."

Decision state already captured: `HUMAN_APPROVED_FOR_RELEASE_ACTION_PLANNING`.

This approval authorizes this planning package only. It does not authorize release execution.

## Source Head

- Fetch result: `origin/main` advanced from `9da072e7bfdbdebe6c093e24f361d8251b53abc3` to `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- Expected post-human-decision-capture merge: `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- Release action planning branch: `codex/tanchiki2-rc1-release-action-planning`.
- Exact repository source head assessed: `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- RC1 candidate product runtime source remains the PR #33 source: `67be4dadaccd690b88d85f3235b9869f41d971ae`.
- Product source change in this package: none.
- Documentation/evidence changes in this package: this release action planning document, release checklist planning update, and `progress.md` update.

`.agentic-harness/memory/` was loaded before work. Review Warden memory was treated as evidence/context only; Git artifacts remain authority.

## Reviewed Inputs

- `.agentic-harness/memory/`
- `.agentic-harness/review-warden-gate.json`
- `docs/release/tanchiki2-rc1-human-decision-capture-v1.md`
- `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md`
- `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`
- `docs/release/release-checklist.md`
- `progress.md`
- `package.json`

## PR #24-#35 Merge State

`origin/main` first-parent history confirms PR #24 through PR #35 are merged.

| PR | Package | State | Merge commit | Merged at |
| --- | --- | --- | --- | --- |
| #24 | I9 visual clarity baseline | MERGED | `2c736410f8d7a314edc32f8501cba6068beee462` | 2026-07-02T00:30:11+05:00 |
| #25 | I10 game feel micro-polish | MERGED | `e40d0fd8853e3b2dad1f7d7c251df4ec33d2b827` | 2026-07-02T00:51:56+05:00 |
| #26 | I11 onboarding/tutorial clarity | MERGED | `58321b6a9e38c333e21e5c4e3cc9d3ee3d9e3f23` | 2026-07-02T01:22:27+05:00 |
| #27 | I12 online UX clarity | MERGED | `16495f5318320b49c2e2d6186e5e72d786f9b219` | 2026-07-02T01:52:37+05:00 |
| #28 | I13 level readability pass | MERGED | `ff4456f51892d80ed7516dd86399ba4104cfc307` | 2026-07-02T02:19:47+05:00 |
| #29 | I14 mobile and touch polish | MERGED | `bf6b3efc98aa1637951a4126508c9276d9f1b118` | 2026-07-02T02:46:49+05:00 |
| #30 | I15 accessibility/readability hardening | MERGED | `6d0b48616301194ae4a37cd95668c4aeea707aea` | 2026-07-02T03:18:32+05:00 |
| #31 | I16 QA gap closure | MERGED | `f11828c7c266199fb31cc0af5069588ef11b19b2` | 2026-07-02T03:32:57+05:00 |
| #32 | Post-polish release-readiness reassessment | MERGED | `c6ab0eea05040f3ca5d84622c7c117f37b81d682` | 2026-07-02T03:46:40+05:00 |
| #33 | RC1 release candidate preparation | MERGED | `67be4dadaccd690b88d85f3235b9869f41d971ae` | 2026-07-02T04:04:12+05:00 |
| #34 | RC1 final human release decision | MERGED | `9da072e7bfdbdebe6c093e24f361d8251b53abc3` | 2026-07-02T04:19:44+05:00 |
| #35 | RC1 human decision capture | MERGED | `fa5a557840801b54946d811e9fdc78b8ba1f4714` | 2026-07-02T04:43:37+05:00 |

## Release Candidate Evidence Summary

- RC1 candidate preparation is recorded in `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`.
- Final human decision record is recorded in `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md`.
- Human approval for release action planning is recorded in `docs/release/tanchiki2-rc1-human-decision-capture-v1.md`.
- Full local validation, visual contrast, harness validation, harness smoke, Product Review Warden, and mobile/touch smoke were green in the RC1 preparation and decision-capture packages.
- Offline campaign evidence reached Level 1 normal play with a nonblank canvas.
- Online battle evidence reached connected play with strict fog and no send errors in the recorded local browser smoke.
- Mobile/touch evidence preserved visible touch controls, multi-touch movement plus fire, and pause/restart copy.
- Product Review Warden previously reported `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- This planning package re-runs the required validation set and records the current results below.

## Exact Release Action Options

These are the exact governed choices available after this planning package:

1. `TANCHIKI2-RC1-RELEASE-PAUSE`: perform no release action and leave RC1 approved for planning only.
2. `TANCHIKI2-RC1-RELEASE-ACTION-REPAIR-BLOCKER`: repair a blocker if validation, Review Warden, source-head verification, deployment target assumptions, rollback evidence, or final authorization wording fails.
3. `STATIC_WEB_PUBLISH_ONLY`: after explicit final authorization, build the Vite static artifact from the authorized source head and publish/deploy it to the named target only. Do not tag or announce unless separately authorized.
4. `STATIC_WEB_PUBLISH_PLUS_TAG`: after explicit final authorization, publish/deploy to the named target, pass post-release checks, and create the named Git tag only after the live checks pass. Do not announce unless separately authorized.
5. `STATIC_WEB_PUBLISH_PLUS_TAG_PLUS_ANNOUNCEMENT`: after explicit final authorization, publish/deploy to the named target, pass post-release checks, create the named Git tag, and send the named announcement to the named channel.

Option 5 is the proposed release path only if the final authorization names the source head, deployment target, rollback target, tag, and announcement channel. If any of those fields is absent or validation changes, the proposed path becomes option 1 or option 2.

## Proposed Release Action Sequence

This sequence is a plan only. It must be copied into a separately authorized governed package before execution.

1. Fetch latest `main` and confirm the exact authorized source head.
2. Confirm the planning PR and any authorization PR are merged before execution starts.
3. Load `.agentic-harness/memory/` and run Product Review Warden.
4. Stop if any open blocking P1/P2 review debt appears.
5. Confirm the final human authorization wording exactly names the source head, deployment target, rollback target, tag decision, and announcement decision.
6. Confirm no production settings, secrets, billing settings, branch protection, or rollback removal are included unless explicitly authorized.
7. Run pre-release validation.
8. Build the static artifact with `npm.cmd run build`.
9. Publish/deploy the resulting `dist/` artifact to the explicitly named target.
10. Run post-release browser checks against the live target.
11. If live checks fail, stop and follow the rollback plan before any tag or announcement.
12. If and only if tag creation was authorized, create the named Git tag after live checks pass.
13. If and only if announcement was authorized, publish the approved announcement after tag/live evidence is recorded.
14. Record release evidence, Review Warden result, rollback readiness, and terminal outcome.

## Deployment Target Assumptions

- The repo is a Vite static web app. The release artifact is the `dist/` directory produced by `npm.cmd run build`.
- No provider-specific deployment configuration was changed by this planning package.
- No hosting provider, production URL, project ID, or publication mechanism is authoritative until the final authorization names it.
- Multiplayer browser smoke has been local-only in the RC1 evidence. Any hosted `VITE_MULTIPLAYER_URL`, LiveKit route, provider secret, or server hosting configuration remains a separate explicit authorization item.
- If no hosted multiplayer target is authorized, the release path must treat hosted multiplayer as out of scope and avoid changing provider configuration.
- The rollback target must be named before deployment. A vague rollback claim is insufficient.

## Publish, Tag, And Announcement Decision Points

- Publish/deploy decision point: requires exact target name, URL or provider project, artifact source head, and rollback target.
- Tag decision point: requires exact tag name and must occur only after post-release live checks pass.
- Announcement decision point: requires exact channel, audience, copy owner, and confirmation that post-release checks and tag decision are complete.
- If publish/deploy is rejected or blocked, tag and announcement must not proceed.
- If post-release checks fail, tag and announcement must not proceed until rollback/repair is complete and separately authorized.

## Rollback Plan

Rollback is a human-gated plan item and must remain available.

1. Before deployment, identify the current live deployment or artifact that can be restored.
2. Record the rollback target, previous deployment identifier, and expected restored URL before changing anything.
3. If deployment or live smoke fails before tagging, restore the previous deployment and stop; do not tag or announce.
4. If failure appears after tag creation but before announcement, stop announcement and require a governed repair or rollback decision.
5. If failure appears after announcement, require a governed incident/rollback package before public follow-up.
6. Do not remove rollback, delete previous artifacts, rotate secrets, change billing, or change branch protection as part of rollback unless separately authorized.

## Pre-Release Checklist

- [ ] Fetch latest `main`.
- [ ] Confirm exact authorized source head.
- [ ] Confirm PR #24 through the latest authorization PR are merged.
- [ ] Load `.agentic-harness/memory/`.
- [ ] Confirm Review Warden reports no open blocking P1/P2 debt.
- [ ] Run `npm.cmd run validate`.
- [ ] Run `npm.cmd run visual:contrast`.
- [ ] Run `npm.cmd run harness:validate`.
- [ ] Run `npm.cmd run harness:smoke`.
- [ ] Run Product Review Warden with `--check --compact --stdout`.
- [ ] Run mobile/touch smoke for the execution phase.
- [ ] Confirm deployment target and rollback target are named.
- [ ] Confirm tag and announcement decisions are explicit.
- [ ] Confirm secrets, billing, production settings, branch protection, and rollback removal remain out of scope unless explicitly named.
- [ ] Confirm the operator supplied the exact final authorization wording below.

## Post-Release Checklist

- [ ] Confirm the live URL loads the RC1 build.
- [ ] Confirm the canvas is nonblank.
- [ ] Confirm offline campaign can reach normal play.
- [ ] Confirm mobile/touch controls render and preserve movement plus fire.
- [ ] Confirm online battle only if hosted online multiplayer was explicitly authorized.
- [ ] Confirm browser console has no release-blocking errors.
- [ ] Confirm Review Warden remains green.
- [ ] Confirm rollback remains available.
- [ ] Confirm the tag was created only if authorized and only after live checks passed.
- [ ] Confirm announcement was sent only if authorized and only after live checks and tag decision completed.
- [ ] Record evidence paths and terminal outcome.

## Required Final Authorization Wording

Before execution, the human must provide wording at least this specific, with every bracket replaced:

```text
I authorize Tanchiki2 RC1 release action execution from source head [exact git SHA] for these exact actions: [deploy/publish target and method]; [tag name or "no tag"]; [announcement channel/copy owner or "no announcement"]. The rollback target is [exact rollback target]. I do not authorize production setting changes, secret changes, billing changes, branch protection changes, or rollback removal unless explicitly listed in this sentence.
```

General approval, approval for planning, or approval with missing source/target/rollback/tag/announcement fields is not sufficient for execution.

## Human-Gated Items

The following remain human-gated:

- Deployment or publishing.
- Release tag creation.
- Release announcement.
- Hosted multiplayer target selection or `VITE_MULTIPLAYER_URL` configuration.
- LiveKit or other provider configuration.
- Production settings.
- Secrets.
- Billing.
- Branch protection.
- Rollback execution.
- Rollback removal.
- Review Warden waiver.
- Any external provider mutation.

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

## Validation Results

Validation was run locally from `D:\projects\tanchiki` on the release action planning branch after fetching `origin/main` at the exact post-PR-35 source head.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run validate` | PASS | 16 test files and 137 tests passed; production build passed; server smoke passed; harness validate passed; harness smoke passed. |
| `npm.cmd run visual:contrast` | PASS | Contrast check passed with tank `luminanceDelta: 72.12485126055542`, tank `chromaDelta: 26.290213260135133`, HUD `luminanceDelta: 18.410873469387994`, and HUD objective line delta `23.62460192307725`. |
| `npm.cmd run harness:validate` | PASS | `consumer wrapper contract validated`. |
| `npm.cmd run harness:smoke` | PASS | `consumer wrapper accepted smoke; dispatch pinned core from lockfile`. |
| `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; `open_blocking_count: 0`; `finding_codes: []`; zero human waivers. |
| `node qa/playwright/mobile-touch-smoke.mjs --phase rc1-release-action-planning --out-root output/rc1-release-action-planning/mobile-touch-smoke` | PASS | `MOBILE_TOUCH_SMOKE_PASSED`; normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and restart copy preserved. |
| `git diff --check` | PASS | No whitespace errors in the working tree diff. |
| `git diff --cached --check` | PASS | No whitespace errors in the final staged diff. |

## Explicit No-Release-Action Statement

This package did not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, remove rollback, or perform any release action.

## Residual Risks

- Release execution remains unauthorized until a later governed package supplies exact final authorization.
- Deployment target, production URL, provider project, rollback target, tag name, and announcement channel are not yet authoritative.
- Hosted multiplayer production configuration remains unverified and unauthorized.
- Local generated browser evidence under `output/` is intentionally ignored and not committed; committed Git artifacts remain authority.
- Any future review comments, source changes, dependency changes, or changed production/deployment assumptions must be evaluated before release action.

## Next Recommended Governed Package

Package: `TANCHIKI2-RC1-RELEASE-ACTION-AUTHORIZATION`

Objective:

- Capture exact final authorization wording for the selected release action option.
- Name the source head, deployment target, rollback target, tag decision, and announcement decision.
- Continue to prohibit release execution unless and until the authorization package explicitly grants it.

Alternate next package if validation, Review Warden, source-head verification, target assumptions, or authorization wording is blocked: `TANCHIKI2-RC1-RELEASE-ACTION-REPAIR-BLOCKER`.

Alternate next package if the operator decides not to proceed: `TANCHIKI2-RC1-RELEASE-PAUSE`.
