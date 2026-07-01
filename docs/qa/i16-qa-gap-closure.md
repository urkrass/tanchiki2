# I16 QA Gap Closure

## Scope

I16 audits the merged polish packages from I9 through I15 and closes QA/evidence gaps only. It does not add gameplay mechanics, product polish features, UI redesign, online protocol changes, deployment, release, production settings, secrets, or branch-protection changes.

## Checked Areas

- I9 visual clarity: briefing/result/HUD copy, minimap readability, contrast checks, and before/after browser evidence from PR #24.
- I10 game feel: local movement, shooting, reload, hit feedback, pause helper copy, and browser smoke evidence from PR #25.
- I11 onboarding/recovery: briefing controls/objective copy, How To Play, loading-ready recovery, pause restart wording, and browser smoke evidence from PR #26.
- I12 online UX: waiting/error/battle status copy, rendered diagnostics, and online smoke evidence from PR #27.
- I13 level readability: objective, spawn, critical-cover, and off-camera marker evidence from PR #28.
- I14 mobile/touch: touch hit map, held feedback, multi-touch preservation, mobile viewport smoke, and PR #29 evidence.
- I15 accessibility/readability: readableText diagnostics, non-ambiguous marker labels, touch Pause label, and contrast evidence from PR #30.

## Gaps Found

- Off-camera objective direction cues were visible in browser screenshots as word directions, but `render_game_to_text()` only exposed generic off-screen marker text with coordinates. This left the I13/I15 marker-readability promise harder to verify without browser pixels.
- Result readability copy was covered indirectly by older tests, but I9/I15 expanded-result evidence was not locked in a focused QA closure regression.
- The mobile touch smoke script was still tied to the I14 output directory by default, making reuse for final QA evidence awkward.

## Gaps Closed

- `render_game_to_text()` now includes word-direction labels such as `CORE UP` for off-screen primary objective markers.
- `src/game/qaGapClosure.test.ts` locks the result evidence lines and off-screen objective direction evidence.
- `qa/playwright/mobile-touch-smoke.mjs` now accepts `--out-root` while keeping the original I14 default output path.
- The final audit trail records PR #29 as the I14 evidence source because `progress.md` did not have a separate I14 section before I16.

## I16 Evidence

- Focused regression: `npm.cmd run test -- src/game/qaGapClosure.test.ts` passed with 2 tests.
- Browser smoke: `node qa/playwright/mobile-touch-smoke.mjs --phase i16 --out-root output/i16-qa-gap-closure/mobile-touch-smoke` passed with `MOBILE_TOUCH_SMOKE_PASSED`.
- Browser evidence paths: `output/i16-qa-gap-closure/mobile-touch-smoke/mobile-touch-gameplay/shot-0.png`, `output/i16-qa-gap-closure/mobile-touch-smoke/mobile-touch-gameplay/state-0.json`, `output/i16-qa-gap-closure/mobile-touch-smoke/mobile-pause-restart/shot-0.png`, and `output/i16-qa-gap-closure/mobile-touch-smoke/mobile-pause-restart/state-0.json`.
- Review Warden: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.

## Intentionally Deferred Or Non-Gaps

- No all-surface screenshot recapture was added. I9-I15 already captured targeted browser evidence, while I16 uses focused smoke only where runtime proof is useful.
- No new product UI, gameplay, balance, online, deployment, release, or production setting work is included.
- `.agentic-harness/memory/` remains evidence/context only and is not treated as authority over Git artifacts.
