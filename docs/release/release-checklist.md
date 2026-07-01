# Release Checklist

This checklist is for release-candidate proof and readiness only. It is not a deployment, publishing, tagging, announcement, production-setting, secret, billing, or branch-protection procedure.

## RC1 Authority Anchor

- Current authority source: Git artifacts on `main`; `.agentic-harness/memory/` is evidence and context only.
- Latest fetched `origin/main`: `c6ab0eea05040f3ca5d84622c7c117f37b81d682` (`Add post-polish release readiness reassessment (#32)`).
- Current product source assessed for RC1: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- PR #24 through PR #32 are merged into `main`.
- RC1 preparation document: `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`.

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

## Human Gate Items

These require explicit separate human authorization and remain outside RC1 preparation:

- [ ] Deploy or publish.
- [ ] Tag a release.
- [ ] Announce a release.
- [ ] Change production settings.
- [ ] Change billing settings.
- [ ] Add, rotate, remove, or reveal secrets.
- [ ] Change branch protection.
- [ ] Remove rollback.
- [ ] Waive Review Warden debt.

## RC1 Evidence Summary

- Source base/head: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Validation: `npm.cmd run validate` passed with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke.
- Contrast: `npm.cmd run visual:contrast` passed with tank luminance delta `72.12485126055542`, tank chroma delta `26.290213260135133`, HUD luminance delta `18.410873469387994`, and HUD objective line delta `23.62460192307725`.
- Harness: `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` passed.
- Review Warden: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Offline browser proof: `output/rc1-release-candidate-preparation/offline-campaign-smoke/shot-0.png` and `state-0.json` show Level 1 `Outer Blocks`, `mode: "playing"`, base HP `3/3`, enemies spawned, nonblank canvas, and offline `readableText` HUD/objective/marker evidence.
- Online browser proof: `output/rc1-release-candidate-preparation/online-battle-smoke/shot-0.png` and `state-0.json` show `mode: "online-battle"`, `connection: "connected"`, snapshot `phase: "playing"`, `sendErrorCount: 0`, circular fog, and online `readableText` status evidence.
- Mobile/touch proof: `output/rc1-release-candidate-preparation/mobile-touch-smoke/` contains gameplay and pause/restart screenshots/states; `MOBILE_TOUCH_SMOKE_PASSED` records normal play reached, touch controls visible, held `up` plus `fire`, multi-touch preserved, fire triggered, and touch restart copy preserved.
- Result/retry readability: covered by `src/game/accessibilityReadability.test.ts` and `src/game/qaGapClosure.test.ts` in the green validation run; mobile pause/restart browser evidence confirms the restart copy on the visible surface.

## Deployment Planning Inputs

Planning inputs only:

- Candidate product source for human RC review: `c6ab0eea05040f3ca5d84622c7c117f37b81d682`.
- Candidate build command: `npm.cmd run build`.
- Required pre-release verification commands: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and the final browser/mobile smoke evidence listed above.
- Multiplayer smoke remains covered by `npm.cmd run server:smoke` through `npm.cmd run validate`; browser online smoke used a local server only.
- Any hosting URL, `VITE_MULTIPLAYER_URL`, LiveKit configuration, rollback procedure, production settings, secrets, billing, branch protection, release tag, and announcement content must be handled by a separately authorized governed package.

## RC1 Decision

GO for RC1 candidate review / final human release decision.

NO-GO for deployment, publish, tag, production-setting changes, secret changes, billing changes, branch-protection changes, or announcement until separately authorized.
