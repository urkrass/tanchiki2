# Echo Quarry Current-Main Reimplementation v1

Status: local validation complete; awaiting renewed exact-head human approval after review repair.

Baseline: `05f564b323672aca37374d1dc3ff4039b1282fa4` (`origin/main` after the current release-baseline refresh).

Replacement branch: `codex/tanchiki2-echo-quarry-current-v1`.

## Decision

Echo Quarry is retained, but old PR #79 is not rebased or merged. Its useful content is reimplemented as one focused current-main package so obsolete class, HUD, terrain, prop, and campaign assumptions do not become a second gameplay path.

The old PR may be closed as superseded only after the replacement pull request exists. Closing the old PR does not authorize merging the replacement.

## Included behavior

- Campaign Level 9, Echo Quarry, uses a 36 by 30 handcrafted battlefield with current terrain and battlefield-prop identifiers.
- The mission is a finite 30-versus-30 Team Battle. At most ten enemy tanks and ten allied tanks are active at once; replacement allies consume the remaining allied reserve.
- Initial allies use the current Scout, Engineer, and Battle Tank definitions. No Echo-specific tank mechanics, equipment, sprites, or HUD implementation exists.
- Existing campaign saves that completed Levels 1 through 8 unlock Level 9 without resetting progression.
- Saved Echo Quarry runs preserve the finite allied reserve. A missing reserve field is normalized conservatively for compatibility.
- Existing Team Battle, CTF, and Assault missions without an explicit finite roster keep their prior unlimited teammate-replacement behavior.
- The HUD reports active and total enemy roster counts plus active and reserve allied counts. The compact canvas objective line shows remaining enemy and allied forces without adding another panel.
- Readability markers identify the battle front and nearby ammunition using text and shape cues rather than color alone.
- A development-only `?devLevel=echo_quarry` route supports class, Major Mod, autostart, and forced-touch QA without changing production progression.

## Validation evidence

- `npm.cmd run test -- src/game/game.test.ts src/game/levelReadability.test.ts`: 130 tests passed.
- `npm.cmd run validate`: 56 files / 524 tests passed, production build passed, real server SDK smoke passed, and all configured harness checks passed.
- `npm.cmd run visual:contrast`: passed.
- `npm.cmd run harness:review-warden:product-repo`: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, zero open blocking debt.
- `npm.cmd run harness:deep-agent:stub-runtime`: `DEEP_AGENT_STUB_COMPLETE_ALLOWED`.
- Repository tablet touch-control regression: passed, including multitouch movement/fire, Relay, all Major Mod gestures, mirrored layout, and orientation behavior.
- Required bundled web-game client reached Echo Quarry gameplay and Tank Select with structured state and no browser error artifact.
- Inspected desktop gameplay, Tank Select, central tablet canvas, and full 1280 by 800 touch-layout captures. Echo Quarry reported ten active allies, a 20-tank reserve, current class equipment, and no HUD/control overlap.
- Headless Chromium emitted only the expected Web Audio autoplay warning before a user gesture.
- Exact-head Codex review found that a finite-roster battle could continue after the final allied tank was destroyed. The loss check now ends the mission when both active allies and allied reserve reach zero; the finite-roster regression covers that terminal state.
- Refreshed exact-head review then found that tactical survival used the ten active slots as its denominator. Finite missions now record the full roster total and count both active allies and unused reserve as survivors, so zero-loss and reserve-depletion results are scored honestly. Full validation remains green at 56 files / 524 tests.

Ignored local evidence lives under `output/echo-quarry-current-v1/`; it contains no room keys, player names, IP addresses, or online-session telemetry.

## Remaining human gate

Before merge, a person must play the exact pull-request head on desktop and a physical tablet and confirm:

- the larger map is navigable and the opening staging area is not trapped or overcrowded;
- Scout, Engineer, and Battle Tank remain readable during the ten-versus-ten fight;
- the finite allied and enemy rosters produce a fair, understandable battle;
- Mine, Trap, Wire, Decoy, Bulwark, Traverse, Relay, Major Mods, ammunition, and Back behavior still match current offline mechanics;
- no prop, objective marker, touch rail, or HUD element hides an important combat cue.

This package does not authorize merge, deployment, release, public hosting, or changes to the multiplayer server.
