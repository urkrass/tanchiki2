# Release Checklist

This checklist is for release-candidate proof and readiness only. It is not a deployment, publishing, tagging, announcement, production-setting, secret, billing, or branch-protection procedure.

## Current Post-PR50 Authority Anchor

- Current authority source: Git artifacts on `main`; `.agentic-harness/memory/` is evidence and context only.
- Latest fetched `origin/main`: `dbaf0db6c4310edb32cbe03860f3a435d007185d` (`Record post-PR50 release pause decision (#54)`).
- Current repository source assessed for post-PR50 release target selection: `dbaf0db6c4310edb32cbe03860f3a435d007185d`.
- Current post-PR50 release authority source head: `dbaf0db6c4310edb32cbe03860f3a435d007185d`.
- Previous validated release-candidate source head: `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- Product runtime remains unchanged by the docs/planning-only PR #52 and PR #53 governance evidence chain.
- Current release decision state: `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY`.
- Current selected release target for planning: GitHub Pages static site.
- Proposed future method: GitHub Actions builds with `npm.cmd run build` and publishes generated `dist/` to GitHub Pages.
- PR #24 through PR #54 are merged into `main`.
- RC1 preparation document: `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`.
- RC1 final human release decision document: `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md`.
- RC1 human decision capture document: `docs/release/tanchiki2-rc1-human-decision-capture-v1.md`.
- RC1 release action planning document: `docs/release/tanchiki2-rc1-release-action-planning-v1.md`.
- PR #50 Reviewer App waiver evidence document: `docs/release/tanchiki2-pr50-reviewer-app-waiver-v1.md`.
- Post-PR50 release-readiness reassessment document: `docs/release/tanchiki2-post-pr50-release-readiness-reassessment-v1.md`.
- Post-PR50 release-candidate refresh document: `docs/release/tanchiki2-post-pr50-release-candidate-refresh-v1.md`.
- Post-PR50 release-action authorization document: `docs/release/tanchiki2-post-pr50-release-action-authorization-v1.md`.
- Post-PR50 release-target selection document: `docs/release/tanchiki2-post-pr50-release-target-selection-v1.md`.
- Historical RC1 release-action planning predates PR #37 through PR #50 and is not current release-action authority for the post-PR50 runtime.
- Release action remains unauthorized. The GitHub Pages target selection is planning-only and does not create a workflow, enable Pages, deploy, publish, tag, announce, mutate providers, or change protected settings.

## Required Before Post-PR50 Release Candidate Review

- [x] Use existing attended-v2 path and do not use the local I7 stub runtime as execution authority.
- [x] Fetch latest `main` before starting.
- [x] Confirm PR #51 waiver evidence and PR #52 post-PR50 reassessment are merged in `main`.
- [x] Treat Review Warden memory as read-only evidence; keep Git artifacts authoritative.
- [x] Confirm Product Review Warden allows `COMPLETE` with `open_blocking_count: 0`.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Capture offline campaign browser smoke reaching normal play.
- [x] Capture online battle browser smoke with a local multiplayer server.
- [x] Capture mobile/touch smoke showing multi-touch and fire behavior are preserved.
- [x] Confirm contrast/readability remains green.
- [x] Confirm `readableText` evidence exists for key offline, online, and mobile surfaces.
- [x] Inspect browser screenshots for blank or broken canvas states.
- [x] Confirm no product source files changed.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, rollback, external-provider, or release-action authority is claimed.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.

## Required Before Post-PR50 Release Action Authorization

- [x] Use existing attended-v2 path and do not use the local I7 stub runtime as execution authority.
- [x] Fetch latest `main` before starting.
- [x] Confirm current `origin/main` is `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- [x] Confirm PR #52 and PR #53 are merged in `main`.
- [x] Confirm the standing docs/planning-only waiver is recorded and applies only to `docs/release/**` plus `progress.md` when every waiver predicate is true.
- [x] Confirm this package remains docs/planning-only.
- [x] Record the quoted human pause decision for source head `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- [x] Record decision state `RELEASE_PAUSED_NO_EXECUTION_AUTHORIZED`.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, rollback, external-provider, or release action is authorized.
- [x] Confirm future release authorization must name exact source head, deployment/publishing target, deployment/publishing method, tag decision, announcement decision, rollback target, and any protected-surface exceptions.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.

## Required Before Post-PR50 Release Target Selection

- [x] Fetch latest `main` before starting.
- [x] Confirm current `origin/main` is `dbaf0db6c4310edb32cbe03860f3a435d007185d`.
- [x] Read `package.json`, `docs/release/release-checklist.md`, `progress.md`, and the post-PR50 release docs.
- [x] Confirm `package.json` has `build` and `preview` scripts but no committed `deploy` or `publish` script.
- [x] Search committed repo files for existing deploy/publish/GitHub Pages/Vercel/Netlify/Cloudflare configuration.
- [x] Confirm no committed deploy target exists.
- [x] Confirm this package remains docs/planning-only.
- [x] Record decision state `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY`.
- [x] Record selected target as GitHub Pages static site.
- [x] Record proposed future method as GitHub Actions building with `npm.cmd run build` and publishing generated `dist/` to GitHub Pages.
- [x] Confirm no workflow is created and GitHub Pages is not enabled.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, rollback, provider mutation, or release action is authorized or performed.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.

## Required Before RC1 Candidate Review

- [x] Load `.agentic-harness/memory/` before claiming release-candidate readiness.
- [x] Fetch latest `main` before starting.
- [x] Confirm PR #24 through PR #32 are merged in `main`.
- [x] Treat Review Warden memory as read-only evidence; keep Git artifacts authoritative.
- [x] Confirm Product Review Warden allows `COMPLETE` with `open_blocking_count: 0`.
- [x] Confirm no human waivers were used.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Capture offline campaign browser smoke reaching normal play.
- [x] Capture online battle browser smoke or server smoke showing online play is still healthy.
- [x] Capture mobile/touch smoke showing multi-touch and fire behavior are preserved.
- [x] Confirm contrast/readability remains green.
- [x] Confirm `readableText` evidence exists for key offline and online surfaces.
- [x] Confirm level/result/retry readability remains covered by focused regression evidence.
- [x] Inspect browser screenshots for blank or broken canvas states.
- [x] Prepare deployment-planning inputs only.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, or branch-protection authority is claimed.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.

## Required Before Final Human Release Decision Record

- [x] Load `.agentic-harness/memory/` before preparing the decision record.
- [x] Fetch latest `main` before starting.
- [x] Confirm PR #24 through PR #33 are merged in `main`.
- [x] Treat Review Warden memory as read-only evidence; keep Git artifacts authoritative.
- [x] Confirm no open blocking P1/P2 review debt appears.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Run final mobile/touch smoke with phase `rc1-final-human-decision`.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.
- [x] Record the release decision state.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, or release action was performed.

## Required Before Human Decision Capture

- [x] Load `.agentic-harness/memory/` before capturing the human decision.
- [x] Fetch latest `main` before starting.
- [x] Confirm PR #24 through PR #34 are merged in `main`.
- [x] Treat Review Warden memory as read-only evidence; keep Git artifacts authoritative.
- [x] Confirm no open blocking P1/P2 review debt appears.
- [x] Record the explicit quoted human decision.
- [x] Record decision state `HUMAN_APPROVED_FOR_RELEASE_ACTION_PLANNING`.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Run final mobile/touch smoke with phase `rc1-human-decision-capture`.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, rollback removal, or release action was performed.

## Required Before RC1 Release Action Planning

- [x] Load `.agentic-harness/memory/` before preparing the release action plan.
- [x] Fetch latest `main` before starting.
- [x] Confirm PR #24 through PR #35 are merged in `main`.
- [x] Treat Review Warden memory as read-only evidence; keep Git artifacts authoritative.
- [x] Confirm no open blocking P1/P2 review debt appears.
- [x] Identify exact release action options.
- [x] Define the proposed release path as a plan only.
- [x] Define deployment/publishing/tagging/announcement decision points.
- [x] Define rollback plan.
- [x] Define pre-release checks.
- [x] Define post-release checks.
- [x] Define explicit human authorization text required before execution.
- [x] Define what remains human-gated.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run visual:contrast`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Run final mobile/touch smoke with phase `rc1-release-action-planning`.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.
- [x] Confirm no deployment, publishing, tag, announcement, production-setting, secret, billing, branch-protection, rollback removal, or release action was performed.

## Human Gate Items

These require explicit separate human authorization and remain outside RC1 preparation:

- [ ] Deploy or publish.
- [ ] Select a concrete deployment/publishing target and method.
- [ ] Tag a release.
- [ ] Announce a release.
- [ ] Select an exact rollback target.
- [ ] Change production settings.
- [ ] Change billing settings.
- [ ] Add, rotate, remove, or reveal secrets.
- [ ] Change branch protection.
- [ ] Remove rollback.
- [ ] Authorize release action execution from an exact source head.
- [ ] Waive Review Warden debt.
- [ ] Mutate an external provider or hosting target.

## RC1 Evidence Summary

- Source base/head: `67be4dadaccd690b88d85f3235b9869f41d971ae`.
- Human decision capture repository head: `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- Release action planning source head: `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- Validation: `npm.cmd run validate` passed with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke.
- Contrast: `npm.cmd run visual:contrast` passed with tank luminance delta `72.12485126055542`, tank chroma delta `26.290213260135133`, HUD luminance delta `18.410873469387994`, and HUD objective line delta `23.62460192307725`.
- Harness: `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` passed.
- Review Warden: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Offline browser proof: `output/rc1-release-candidate-preparation/offline-campaign-smoke/shot-0.png` and `state-0.json` show Level 1 `Outer Blocks`, `mode: "playing"`, base HP `3/3`, enemies spawned, nonblank canvas, and offline `readableText` HUD/objective/marker evidence.
- Online browser proof: `output/rc1-release-candidate-preparation/online-battle-smoke/shot-0.png` and `state-0.json` show `mode: "online-battle"`, `connection: "connected"`, snapshot `phase: "playing"`, `sendErrorCount: 0`, circular fog, and online `readableText` status evidence.
- Mobile/touch proof: `output/rc1-release-candidate-preparation/mobile-touch-smoke/` contains gameplay and pause/restart screenshots/states; `MOBILE_TOUCH_SMOKE_PASSED` records normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and touch restart copy preserved.
- Final decision mobile/touch proof: `output/rc1-final-human-release-decision/mobile-touch-smoke/` contains fresh gameplay and pause/restart screenshots/states; `MOBILE_TOUCH_SMOKE_PASSED` records normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and touch restart copy preserved.
- Human decision capture mobile/touch proof: `output/rc1-human-decision-capture/mobile-touch-smoke/` contains fresh gameplay and pause/restart screenshots/states; `MOBILE_TOUCH_SMOKE_PASSED` records normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and touch restart copy preserved.
- Result/retry readability: covered by `src/game/accessibilityReadability.test.ts` and `src/game/qaGapClosure.test.ts` in the green validation run; mobile pause/restart browser evidence confirms the restart copy on the visible surface.

## Post-PR50 Release Candidate Refresh Evidence Summary

- Source base/head for PR #53 validation: `172cf27b7fb159b0c8f1541dd223ed6788d03cd6`.
- PR #53 head: `c5339fc4a20c6cb728d65dfdb42f4c01a69c0456`.
- PR #53 merge/source authority head: `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- Refresh document: `docs/release/tanchiki2-post-pr50-release-candidate-refresh-v1.md`.
- Validation: `npm.cmd run validate` passed with 18 test files and 186 tests, production build, server smoke, harness validate, and harness smoke.
- Contrast: `npm.cmd run visual:contrast` passed with `contrast ok`.
- Harness: `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` passed.
- Review Warden: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.
- Offline browser proof: `output/post-pr50-release-candidate-refresh/offline-campaign-smoke/shot-0.png` and `state-0.json` show Level 1 `Outer Blocks`, `mode: "playing"`, base HP `3/3`, circular fog, solo relay link state, `GEAR 0/5`, readable HUD/objective/marker evidence, and a nonblank canvas.
- Online browser proof: `output/post-pr50-release-candidate-refresh/online-battle-smoke/shot-0.png` and `state-0.json` show `mode: "online-battle"`, `connection: "connected"`, snapshot `phase: "playing"`, `sendErrorCount: 0`, circular fog, and online readable status `ONLINE` / `BATTLE LIVE`.
- Mobile/touch proof: `output/post-pr50-release-candidate-refresh/mobile-touch-smoke/` contains gameplay and pause/restart screenshots/states; `MOBILE_TOUCH_SMOKE_PASSED` records normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and touch restart copy preserved.
- Screenshot inspection: offline, online, mobile gameplay, and mobile pause/restart screenshots were visually inspected and were nonblank/coherent.
- No deployment, publishing, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external provider mutation, or release action was performed.

## Post-PR50 Release Action Authorization Pause

- Decision document: `docs/release/tanchiki2-post-pr50-release-action-authorization-v1.md`.
- Exact source head: `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- Decision state: `RELEASE_PAUSED_NO_EXECUTION_AUTHORIZED`.
- Human decision: "I do not authorize Tanchiki2 post-PR50 release action execution yet. Record a release pause decision for source head d6282887bad2db0a23bbc555bd0699636a14b8fe. Do not deploy, publish, tag, announce, change production settings, secrets, billing, branch protection, rollback state, or release anything."
- Pause reason: no concrete deployment/publishing target and method has been selected in committed release authority.
- No deployment, publishing, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external provider mutation, or release action was performed.
- Next governed package: `TANCHIKI2-POST-PR50-RELEASE-TARGET-SELECTION`.

## Post-PR50 Release Target Selection

- Decision document: `docs/release/tanchiki2-post-pr50-release-target-selection-v1.md`.
- Source head: `dbaf0db6c4310edb32cbe03860f3a435d007185d`.
- Previous validated release-candidate source head: `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- Decision state: `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY`.
- Selected target: GitHub Pages static site.
- Proposed future method: GitHub Actions builds with `npm.cmd run build` and publishes generated `dist/` to GitHub Pages.
- Reason: Tanchiki2 is a Vite browser game; GitHub Pages keeps release governance inside GitHub.
- No deployment, publishing, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external provider mutation, workflow creation, GitHub Pages enablement, or release action was performed.
- Next governed package: `TANCHIKI2-POST-PR50-GITHUB-PAGES-RELEASE-IMPLEMENTATION-PLANNING`.

## Deployment Planning Inputs

Planning inputs only:

- Current post-PR50 release authority source: `dbaf0db6c4310edb32cbe03860f3a435d007185d`.
- Previous validated release-candidate source: `d6282887bad2db0a23bbc555bd0699636a14b8fe`.
- Current post-PR50 release decision state: `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY`.
- Deployment/publishing target selected for planning: GitHub Pages static site.
- Deployment/publishing method selected for planning: future GitHub Actions workflow builds with `npm.cmd run build` and publishes generated `dist/` to GitHub Pages.
- Release tag decision: not selected.
- Announcement decision: not selected.
- Rollback target: not selected.
- Candidate product source for human RC review: `67be4dadaccd690b88d85f3235b9869f41d971ae`.
- Release action planning source: `fa5a557840801b54946d811e9fdc78b8ba1f4714`.
- Candidate build command: `npm.cmd run build`.
- Required pre-release verification commands: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and the final browser/mobile smoke evidence listed above.
- Multiplayer smoke remains covered by `npm.cmd run server:smoke` through `npm.cmd run validate`; browser online smoke used a local server only.
- Any hosting URL, `VITE_MULTIPLAYER_URL`, LiveKit configuration, rollback procedure, production settings, secrets, billing, branch protection, release tag, and announcement content must be handled by a separately authorized governed package.
- Future release execution authorization must name exact source head, deployment/publishing target, deployment/publishing method, tag decision, announcement decision, rollback target, and any production-setting, secret, billing, branch-protection, or rollback exception. Otherwise those protected surfaces remain forbidden.
- The next recommended governed package is `TANCHIKI2-POST-PR50-GITHUB-PAGES-RELEASE-IMPLEMENTATION-PLANNING`.

## RC1 Release Action Planning

Planning inputs only:

- Exact release action options are `TANCHIKI2-RC1-RELEASE-PAUSE`, `TANCHIKI2-RC1-RELEASE-ACTION-REPAIR-BLOCKER`, `STATIC_WEB_PUBLISH_ONLY`, `STATIC_WEB_PUBLISH_PLUS_TAG`, and `STATIC_WEB_PUBLISH_PLUS_TAG_PLUS_ANNOUNCEMENT`.
- Proposed path: `STATIC_WEB_PUBLISH_PLUS_TAG_PLUS_ANNOUNCEMENT` only if the final authorization names the exact source head, deployment target, rollback target, tag, and announcement channel. Otherwise pause or repair the blocker.
- Deployment assumption: `npm.cmd run build` produces the static `dist/` artifact; no provider target is authoritative until named by the final authorization.
- Publish/deploy decision point: exact target, source head, method, and rollback target must be named.
- Tag decision point: exact tag must be named and tag creation must occur only after live checks pass.
- Announcement decision point: exact channel/copy owner must be named and announcement must occur only after live checks and tag decision complete.
- Rollback plan: identify the current live deployment before deployment, restore it if live checks fail, and do not remove rollback without separate authorization.
- Required final authorization wording is recorded in `docs/release/tanchiki2-rc1-release-action-planning-v1.md`.
- Review Warden and validation results for this planning package: PASS. `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, mobile/touch smoke, `git diff --check`, and `git diff --cached --check` passed.
- No deployment, publishing, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback removal, external provider mutation, or release action was performed by this planning package.

## RC1 Decision

Human decision supplied by operator:

> "I approve Tanchiki2 RC1 for release action planning."

Release decision state: `HUMAN_APPROVED_FOR_RELEASE_ACTION_PLANNING`.

Next recommended governed package: `TANCHIKI2-RC1-RELEASE-ACTION-AUTHORIZATION`.

NO-GO for deployment, publish, tag, production-setting changes, secret changes, billing changes, branch-protection changes, rollback removal, announcement, or any release action until separately authorized.
