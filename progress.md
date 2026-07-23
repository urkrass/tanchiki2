Original prompt: This is a fresh product repo: tanchiki. Use D:\agentic-harness\repo, adopt agentic-harness with the standard .agentic-harness adapter, then build a production-quality retro top-down tank game inspired by Tanchiki / Battle City using Canvas 2D + TypeScript + Vite. Proceed with the safe default harness workflow: setup, adapter, bounded packages, implement package by package, validate, open PRs/report progress, ask only if blocked.

## 2026-07-23 P9 Runtime Maintainability - Offline Perception Boundary

- Started from exact merged `origin/main` `281051cb92852cb03756e34e13cc4a1159eb0566` in isolated worktree `D:\projects\tanchiki-p9-runtime-maintainability-v1`; the canonical checkout's older dirty branch and user-owned files remain untouched.
- Attended-v2 preflight found no open PR overlap and no protected-surface action. The pinned harness remains `69df33aafbe6f2738b87419d449fd3ee4f84f018`; Git artifacts and deterministic gates remain authoritative.
- Exact-main baseline passes at 60 files / 565 tests, production build, real server integration, and all configured harness checks. The dedicated Signal Scar desktop/tablet smoke also passes before extraction.
- Selected one bounded P9 extraction directly stressed by Signal Scar: offline battlefield perception. Terrain-evidence planning/lifetime/filtering/distortion, jammer-to-relay signal logic, and their Canvas animations now have dedicated modules instead of living inside the 11.6k-line `TanchikiGame` and 7.2k-line renderer.
- The game orchestrator is 99 lines smaller and the renderer is 355 lines smaller. Pure characterization coverage locks movement evidence, fog-safe projection, bounded evidence history, hidden-source distortion, jammer/EMP/destroyed states, relay suppression, hidden-coordinate filtering, and strongest-per-cell render coalescing.
- Focused validation passes at 3 files / 149 tests; the full unit suite passes at 61 files / 571 tests. Signal Scar desktop/tablet browser acceptance still reaches jammer breach, EMP cooperation, hidden-coordinate safety, touch movement, and firing with no blocking browser messages.
- The required generic web-game client reaches Signal Scar gameplay with `signalWarfare.state: "jammed"`, the jammer coordinate hidden, active terrain evidence, deterministic text state, and no console-error artifact. Inspected frames preserve the single dominant battlefield, fog, HUD, and tablet rails.
- This refactor intentionally does not change hearing distance, relay/radar semantics, gameplay balance, protocol, saves, UI, or deployment. It creates the seam for the later acoustic-hearing/radar package. Dynamic chunk splitting remains a separate measured P9 package because this extraction alone does not materially reduce the production bundle.
- Full validation passes at 61 files / 571 tests with production build, real server integration, and all configured attended-v2 checks. Visual contrast, Product Review Warden with zero blocking debt, deterministic Deep Agent stub runtime, and clean diff checks pass.
- Durable package record: `docs/architecture/tanchiki2-p9-runtime-maintainability-v1.md`.
- TODO: prepare the exact-head PR, complete current-head Codex/Reviewer App review, and obtain human merge authorization. Do not deploy.

## 2026-07-23 P8 Optional Online Scope Expansion

- Started from exact merged `origin/main` `0e882043573d4b23d814ce7a2a20685fe4199995` in isolated worktree `D:\projects\tanchiki-p8-online-scope-expansion-v1`; the canonical checkout's unrelated work remains untouched.
- Attended-v2 preflight found no open PR overlap and no protected-surface action. The pinned harness remains `69df33aafbe6f2738b87419d449fd3ee4f84f018`; memory is advisory and Git plus deterministic gates remain authoritative.
- Exact-main baseline passes at 59 files / 559 tests, production build, server integration, three-match synthetic lab, four-browser lifecycle, two-tablet entry/gameplay, attended-v2 checks, and Product Review Warden with zero open blocking debt.
- Selected one bounded P8 expansion: unanimous server-authoritative rematch. It preserves the shared Relay Yard round and avoids adding Major Mods, portable relays, maps, modes, chat, or parallel gameplay rules. A successful vote will keep the roster, teams, classes, and host permission; issue a fresh room key; clear Ready; reset per-round state; and return to the ordinary lobby. A decline, disconnect, or terminal timeout closes the room.
- Implemented protocol v4 result decisions and personalized rematch status. Result rendering acknowledgement remains delivery evidence only; it no longer silently destroys the room.
- Added the authoritative reset path: unanimous eligible votes rebuild a fresh shared-engine match, preserve identity/team/class/host, clear round diagnostics and Ready state, rotate to a fresh host-only key, and unlock the normal lobby. A transient result-screen drop removes that vote and pauses availability until reconnect; explicit leave, decline, reconnect expiry, or terminal TTL closes the room.
- Rebuilt the result action hierarchy around one large `PLAY AGAIN` control with live vote count and a quiet secondary Main Menu action. The hit target is shared by pointer/touch and rendering.
- Focused protocol/controller/layout/renderer checks pass. Full validation passes at 60 files / 565 tests with production build, real server SDK integration, and all configured attended-v2 checks. The three-match lab reports zero divergence, stuck rooms, or cleanup failures.
- Four-context browser acceptance passes a common result, keyboard and touch rematch votes, preserved roster/classes, a fresh host-only key, cleared Ready state, and clean destruction. Final result and rematch-lobby screenshots were inspected; a late-input lobby-error defect found in the first visual pass was repaired and the proof rerun cleanly.
- The final two-tablet regression passes native entry, copy/join, class selection, host Start, 90 ms input-to-visible movement, 431 ms first-tile completion, zero rewinds, guarded Back, and zero browser errors. Product Review Warden reports zero blocking debt and the deterministic Deep Agent stub passes.
- Exact-head Codex review found that independent dropped-slot expiry still ran only during `PLAYING`, so a result-screen transport drop could wait for terminal TTL if the Colyseus leave callback was delayed. The authoritative tick now expires disconnected result slots at the normal reconnect deadline and a deterministic regression proves the room closes exactly at that boundary.
- The P7 acoustic-hearing/radar separation remains a distinct later gameplay package and is not folded into P8.

## 2026-07-23 P7 Definitive Vertical-Slice Mission

- Started from exact merged `origin/main` `9575627ce96836512a74680a7c2d14c5fb408c17` in isolated worktree `D:\projects\tanchiki-p7-definitive-vertical-slice-v1`; the canonical checkout's unrelated work remains untouched.
- Added Campaign Level 10, Signal Scar, as a focused assault combining fog, finite ammunition and salvage, relays, jamming, EMP, AI perception, soft cover, tracks, decoys, environmental evidence, class cooperation, finite allied reserves, and objective pressure.
- Added one level-owned jammer contract. A hostile operational jammer suppresses affected player-owned relay vision and link credit; an EMP pulse creates a short window, and destroying its brick anchor clears it permanently. Exact jammer coordinates remain fog-filtered.
- The allied Scout uses Overdrive and seeds Decoy/Wire, the Engineer seeds Mine/Trap and uses EMP, and the Battle Tank supplies a finite-ammunition eastern battery. A scripted ally does not consume the same Major Mod lane selected by the player.
- Added compact `JAM`, `EMP`, and `OFF` battlefield feedback without a new panel. Coalesced simultaneous environmental evidence labels per tile so terrain cues no longer print over themselves.
- Physical review rejected the remaining floating terrain and jammer words as debug-like signals. Removed the generic boxed crosshair plus `BUSH`/`MUD`/`GRAVEL`/similar labels and replaced them with source-specific pixel animation: foliage flicker, dust drift, hopping gravel, mud ripples, metal sparks, ricochet bursts, and echo waves. The jammer now uses red interference, cyan EMP flicker, or destroyed smoke instead of `JAM`/`EMP`/`OFF` text; structured semantics remain available to QA without appearing on the battlefield.
- Exact-head Codex review found that the Battle Tank battery was excluded from the shared scripted-friendly action gate, so its configured Hedgehog support could never activate. Included `battle-battery` in that existing actor path and added a mission regression for ownership.
- Follow-up after P7: replace map-wide acoustic evidence with bounded local hearing based on distance, loudness, and occlusion. Keep relay-derived contacts in a separate signal/radar channel so a relay can report remote activity without pretending the player heard it directly.
- Added a deterministic Signal Scar development route and committed desktop/tablet Playwright smoke. The browser proof reaches and destroys the jammer through normal controls, observes the Engineer EMP window and all four allied support devices, reports no hidden-coordinate leak, and proves joystick movement plus firing at 1280 by 711 with zero blocking browser errors.
- Focused gameplay/readability validation passes at 3 files / 134 tests. Full validation passes at 59 files / 559 tests with production build, real server SDK integration, and all configured harness checks. Visual contrast, the dedicated P7 desktop/tablet smoke, Product Review Warden with zero open blocking debt, the deterministic Deep Agent stub, and clean diff checks pass. Exact-head review and human gameplay acceptance remain before merge.

## 2026-07-23 P6 Public Release Execution Preparation

- Started from exact merged `origin/main` `2de4955041dfadc002666e27bef746a7b45a978e` in isolated worktree `D:\projects\tanchiki-p6-public-release-execution-v1`; the dirty canonical checkout remains untouched.
- Attended-v2 campaign prompt validation passes with zero blockers. The operating-mode guard returns `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS` and explicitly grants no production-setting or deploy/publish/tag/announcement authority.
- Exact-main baseline passes at 57 files / 542 tests, production build, server integration, and all harness checks.
- Read-only live checks confirm Pages still serves source `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`; HTML/assets and the Canvas splash are healthy, but the emitted client still contains the localhost multiplayer default.
- The live Pages artifact is expired. The production-root workflow now requires exact main/source equality, one strict HTTPS Render origin, an exact healthy/drained backend revision, and an unexpired prior Pages artifact before it exports `VITE_MULTIPLAYER_URL` or builds.
- Future Pages artifacts retain for 90 days. Isolated preview-slug behavior remains available without invoking the production preflight.
- Focused release guard tests pass at 13/13, including malformed endpoints, revision drift, active rooms, expanded health payloads, expired rollback behavior, preview-artifact rejection, paginated run discovery, off-origin pagination rejection, valid production-root selection among multiple same-source runs, and deployment-boundary rollback plus backend drain rechecks.
- Full validation passes at 58 files / 555 tests, including production build, server integration, and all harness checks. Product Review Warden reports zero open blocking debt; the deterministic Deep Agent stub passes.
- Durable package record: `docs/release/tanchiki2-p6-public-release-execution-v1.md`.
- TODO: prepare the exact-head PR and complete review. Do not deploy. Human WAN remains `0 / 10 minimum`; Render workspace/cost/public-hosting authority, rollback artifact, monitored abuse contact, and provider-log administrators/retention remain external hard gates.

## 2026-07-23 P5 Telemetry, Privacy, and Abuse Operations

- Started from exact merged `origin/main` `67f059b897935b85f27d3e4fdaf6c4b006ea2308` in isolated worktree `D:\projects\tanchiki-p5-telemetry-privacy-abuse-v1`; the dirty canonical checkout remains untouched.
- Baseline validation passes at 57 files / 538 tests, including production build, server integration, and all harness checks. Node 24 emits the repository's expected Node 22 engine warning on this machine.
- Decision: application-level session telemetry remains disabled for the first public preview. Production now fails closed if a session log path or sensitive capture is configured.
- The JSONL diagnostic logger remains available locally but accepts only registered events and per-event allowlisted fields. Default payloads cannot acquire room keys, callsigns, IPs, or arbitrary text through an accidental caller field.
- Callsigns now receive NFKC normalization, removal of controls/invisible formatting, and an exact 18-Unicode-code-point bound on both native entry and the authoritative protocol.
- Arbitrary chat remains absent. The room-entry notice makes the preview boundary visible; the public notice and operator policy define local retention, access, deletion/export, incident/legal-hold handling, and the minimal invitation-channel abuse response.
- Durable policy: `docs/operations/tanchiki2-p5-telemetry-privacy-abuse-v1.md`; player notice: `public/online-preview-privacy.html`.
- Full validation passes at 57 files / 542 tests, including production build, server integration, and all harness checks. Product Review Warden reports zero open blocking debt; the deterministic Deep Agent stub and diff checks pass.
- Four-context lifecycle passes common results, fixed radio/pings, kick/key rotation, and cleanup. The final two-tablet flow passes native entry, room-key copy, host Start, class selection, 90 ms input-to-visible motion, 438 ms first-tile movement, zero rewinds, guarded Back, and zero browser errors.
- The required bundled browser client reports the room-entry safety boundary in structured state with no errors. Desktop and tablet screenshots show the line remains subordinate to the primary Create action. The separate privacy notice renders as one calm document surface with no browser errors.
- TODO: prepare the exact-head PR and complete current-head review. Do not deploy or change provider settings. Human WAN remains external.

## 2026-07-23 P4 Production Multiplayer Hosting Readiness

- Started from exact merged `origin/main` `eed90b852681d5d9917f2a7c9d86b36ccc3c3beb` in isolated worktree `D:\projects\tanchiki-p4-hosting-readiness-v1`; the dirty canonical checkout remains untouched.
- Current main CI is green at 56 files / 531 tests, with no open PRs or issues and no blocking Product Review Warden debt.
- Selected a single paid Render Starter web service in Frankfurt, with the static client remaining on GitHub Pages. Render Free is rejected for cold starts; Railway remains the usage-priced fallback; Fly.io is unnecessary operational surface for the first four-seat service.
- Added a non-activating `render.yaml`: Node service, one Starter instance, manual deploys, `/health`, exact Pages origin, no disk/database/Redis, and sensitive telemetry false. Applying it still requires provider, billing, public-hosting, and deployment authority.
- Production startup now fails before listening when `ALLOWED_ORIGIN` is absent/insecure or `PORT` is malformed. The health response exposes only service, exact provider revision, and aggregate room count. The main entrypoint enables Colyseus graceful SIGTERM/SIGINT behavior; test servers remain manually isolated.
- Node is bounded to major 22 and `server:start` runs the already-built backend. A production-origin probe confirms the exact Pages origin, bounded health payload, non-reflective CORS, and a `403 ORIGIN_NOT_ALLOWED` response for foreign room-key requests; missing production origin fails before listen.
- Durable decision/runbook: `docs/deployment/tanchiki2-production-multiplayer-hosting-readiness-v1.md`.
- Full validation passes at 57 files / 538 tests. The three-room lab, four-context lifecycle, two-tablet touch regression, required bundled browser client, Deep Agent stub, Product Review Warden, and clean diff checks pass; final client screenshot/state were inspected with no browser errors.
- A clean detached production artifact passes `npm ci`, shared build, development-dependency prune, `server:start`, exact-revision health, approved-origin CORS, foreign-origin rejection, and telemetry-disabled checks.
- Exact-head Codex review found that Render can build with `NODE_ENV=production`, causing plain `npm ci` to omit the compiler. The Blueprint now uses `npm ci --include=dev`, then prunes after `build:shared`; the contract test locks this command.
- The corrected Render command passes in a clean detached checkout with `NODE_ENV=production`: compiler present, shared build emitted, dev dependencies pruned, production server started, and exact-revision health returned.
- Refreshed exact-head review found YAML 1.1 can parse bare `off` as boolean false. `autoDeployTrigger` is now the explicit string `"off"`, and the contract test prevents regression.
- The next exact-head review found that startup trimmed `ALLOWED_ORIGIN` while room auth compared the raw environment value. Startup now rejects surrounding whitespace so health, HTTP CORS, and WebSocket authorization cannot disagree; a regression test covers the copied-value case.
- TODO: refresh exact-head review. Do not provision or deploy. Human WAN and P5 remain external gates.

## 2026-07-22 P3 WAN and Fault Acceptance

- Merged PR #110 at approved exact head `230257a5edaf749ff64bf4b881cd1cfdd5451f42`; merge commit `730df3e05a77724e377ad8e5e958b6834af15714` passed detached validation at 56 files / 524 tests plus build, server smoke, and harness checks.
- Started fresh branch/worktree `codex/tanchiki2-p3-wan-fault-acceptance-v1` / `D:\projects\tanchiki-p3-wan-fault-acceptance-v1`; attended-v2 prompt and guard both pass.
- Clean public-protocol evidence passes on seed `20260722`: 3-match quick, one 12-second realtime representative match, and 100-match seeded soak all report zero divergence, stuck rooms, or cleanup failures.
- Four-context browser lifecycle passes common result, countdown cancellation, locked roster, current shared equipment placement, key rotation, and cleanup.
- Tablet regression initially reproduced an intermittent held-movement rewind (`0.567` to `0.542` tile at 342 ms). Root cause was a six-snapshot buffer shorter than Battle and slowed/Traverse moves, plus delayed local completion handoff.
- Increased the bounded snapshot history to 24, kept completed local movement at its authoritative destination, added deterministic anchor-eviction/completion tests, and enriched tablet failures with exact backward samples.
- Exact-head Codex review found that an old A-to-B anchor could match a later A-to-B move after a quick reversal. Restricted anchor scanning to the contiguous newest move cycle and added the A-to-B / B-to-A / A-to-B regression. Focused interpolation passes 11/11.
- Final tablet evidence: six consecutive full touch sessions pass, input-to-visible 67-133 ms, first tile 426-460 ms, zero rewinds, zero browser errors. Live gameplay and guarded-Back screenshots were inspected; the required bundled web-game client also passes after the final change.
- Full validation passes at 56 files / 527 tests. Product Review Warden reports zero open blocking debt; Deep Agent stub and diff checks pass.
- Administrator-enabled WSL allowed Docker Desktop and pinned Toxiproxy 2.12.0 execution. The final matrix passes clean, mixed 30/80/150 ms plus jitter, five-second outage, simultaneous reconnect, TCP reset, downstream-only stall, overlong forfeit, and bounded slow-client profiles with zero divergence or cleanup failures.
- Proxy testing found and repaired a real downstream-only recovery gap: visible clients recycle after four seconds without server messages, use a 2.5-second reconnect delay, and the server tick independently expires disconnected reservations even if the transport callback is delayed.
- The finalized 100-match outage command passes with 100 same-slot reclaims, 100 reconnect successes, zero reconnect failures, zero cleanup failures, and zero divergent results; 54 heartbeat stalls were observed and recovered. Setup-only partial batches are discarded and replayed with the same seeds, while gameplay failures remain terminal.
- Final validation passes at 56 files / 531 tests. Four-context and tablet browser suites pass; the tablet reports 129 ms input-to-visible, 437 ms first-tile duration, zero rewinds, guarded Back, and zero browser errors. Final rendered screenshots were inspected.
- Human WAN remains `0 / 10 minimum` pending real participants and networks.
- Durable evidence: `docs/network/tanchiki2-p3-wan-fault-acceptance-v1.md`.
- TODO: conduct 10-20 redacted human 2v2 WAN matches, then complete the external checklist. Refresh exact-head review before requesting merge authority; no deployment is authorized.

## 2026-07-22 Field Salvage

- Follow-up prompt: replace dull random drops with temporary destroyed-tank remnants that provide slow healing and ammunition, discourage reckless base sacrifices, block routes while decaying, and eventually burn away.
- Started from exact merged `origin/main` at `c85e8104146159e65393497c666821ce59f4ad2e` in clean worktree `D:\projects\tanchiki-field-salvage-v1`; the dirty canonical checkout remains untouched.
- New offline kills create neutral actor-aware wrecks. Fresh wrecks last 20 seconds with four shells and one HP; burned wrecks remain blocking for another 9 seconds. Recovery requires a stationary adjacent tank and resets on movement, firing, or damage.
- Added spawn/objective-safe relocation, an eight-wreck cap, direct-fire denial, actor-aware bot recovery, path blocking/clearing, fog-filtered snapshots, v1 save compatibility, reusable wreck art, result stats, Encyclopedia copy, and tactical-evaluation support.
- Added the hidden no-fog `field_salvage_test` route and focused integration coverage for lifecycle timing, collision, both-side recovery, fixed-station priority, interruption, denial, save migration, and cap behavior.
- Focused Field Salvage coverage passes at 10/10; the four related suites pass at 147/147.
- Bundled-client and deterministic Playwright evidence under `output/field-salvage/` covers fresh wrecks, active progress, shell recovery, burnout, complete decay, and denial fire. All inspected screenshots match `render_game_to_text`; browser errors are empty.
- Full `npm.cmd run validate` passes at 43 files / 447 tests, plus production build, server smoke, harness validation/smoke, Reviewer App dry run, and attended-v2 lifecycle smoke.
- `npm.cmd run visual:contrast`, Product Review Warden (`open_blocking_count: 0`), Deep Agent stub runtime, and `git diff --check` pass.
- TODO: no known implementation or validation gaps; prepare the branch and PR for review.
- User review caught a wreck displaced from its destruction tile because spawn/objective protection relocated it. Removed wreck relocation: debris now remains at the exact death cell, while the existing safe-spawn resolver moves future tanks to the nearest open cell. Added unit and browser regressions that compare the live target and wreck coordinates directly.
- User review also caught the salvage indicator filling only half of one apparent track before an ammo payout. The renderer now gives a lone active resource the full track and uses two visibly separated tracks only when HP and ammunition are recovering together.

## 2026-07-22 Encyclopedia Current-Mechanics Refresh

- Started from merged `origin/main` at `a2ab2fc` in clean worktree `D:\projects\tanchiki-encyclopedia-current-mechanics-v1`.
- Audited the six existing detail pages against current tank classes, Battle Tank kit, stationary pivot controls, tablet controls, flag drop, Major Mods, Boot Camp, and biome terrain.
- Kept the calm six-topic hierarchy instead of adding another menu layer; refreshed Overview, Controls, Tanks, Objectives, Equipment, and Terrain.
- Added canonical visual keys for three player classes, Bulwark, Traverse, and all four Major Mods so the Encyclopedia reuses live tank and equipment art.
- Focused Encyclopedia/readability tests pass at 122/122. The first build caught a nullable snapshot class passed to the Mod icon; normalized it to the renderer's optional input.
- Added a pixel-width regression requiring every Encyclopedia description to fit its rendered two-line allocation. Shortened clipped copy after inspecting the first browser pass.
- Production build passes. Bundled web-game client captures under `output/encyclopedia-current-mechanics/final-*` show Controls, Tanks, Equipment, and Terrain; matching text state reports 9/7/10/9 entries and no error files.
- Full `npm.cmd run validate` passes at 42 files / 436 tests, plus production build, server smoke, harness validation/smoke, Reviewer App dry run, and attended-v2 lifecycle smoke.
- `npm.cmd run visual:contrast`, Product Review Warden (`open_blocking_count: 0`), Deep Agent stub runtime, and `git diff --check` pass.
- TODO: no known implementation or validation gaps; prepare the branch and PR for review.

## 2026-06-30

- Read the local `develop-web-game` skill and initialized the required progress log.
- Confirmed `D:\projects\tanchiki` was empty and not yet a Git repo; initialized `main`.
- Scaffolded Vite vanilla TypeScript and installed local `vitest` plus `playwright`.
- Inspected `D:\agentic-harness\repo` consumer bootstrap docs/templates.
- Chose the documented stable harness baseline `35bad308ebb904bb22e600643d6d279062101c44` because it exists locally and the standard forbids floating refs.
- Reference image notes: compact black playfield, brick/steel terrain, gray right status strip, sparse text, readable pixel silhouettes.

## Completed Package Evidence

- Package 0 complete: `.agentic-harness/` consumer adapter added from the standard kit shape, pinned to `agentic-harness@35bad308ebb904bb22e600643d6d279062101c44`.
- Package 1 complete: deterministic `TanchikiGame` loop, player movement/fire, lives, score, base state, `advanceTime(ms)`, and `render_game_to_text()`.
- Package 2 complete: Battle City-inspired brick/steel/water/base arena, destructible terrain, bullets, enemy waves, simple enemy AI, powerups, win/loss states.
- Package 3 complete: one dominant Canvas 2D surface, right HUD strip, compact menu/pause/win/loss overlays, keyboard controls, fullscreen support.
- Package 4 complete: `npm run validate` passed; web-game Playwright client passed against `http://127.0.0.1:5173` with inspected screenshot `output/web-game/shot-2.png` and state files.

## TODO / Handoff Notes

- No required implementation TODOs remain for the requested local build.
- Remote closeout: `origin` now points at `https://github.com/urkrass/tanchiki2.git`, and local `main` was pushed as the remote's initial base branch because the GitHub repo had no refs to open a PR against.
- Optional next improvements: add audio feedback, more levels, mobile touch controls, and branch-based PRs for follow-up changes.

## 2026-07-03 Tank Classes

- Added offline/campaign tank classes: Scout, Engineer, and Battle Tank.
- Added class-aware effective stats, save defaults, saved-run class locking, class-specific shell splash, deployable gating, and bounded portable relay lists.
- Added a calm in-canvas Tank Select screen with large class tabs reachable from Main Menu and Garage.
- Focused validation passed: `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`.
- Full validation passed: `npm.cmd run validate`; Product Review Warden, Deep Agent stub runtime, local attended-v2 lifecycle smoke, `git diff --check`, and `git diff --cached --check` all passed.
- Browser evidence inspected: `output/web-game-tank-select/shot-0.png` and `output/web-game-class-gameplay/shot-0.png`; both states include `Tank Engineer`, class-specific gear, and two-relay HUD text through `render_game_to_text`.

## Cinematic Tank-Class Carousel

- Started from clean `origin/main` on `codex/tanchiki2-cinematic-tank-carousel`; the unrelated dirty planning file in `D:\projects\tanchiki` remains untouched.
- Replaced class-card navigation with preview-only left/right carousel behavior, wrapping at both ends. Enter remains the equip action, Down/Up reaches and returns from Back, and pointer arrows do not equip.
- Added the deterministic 15-second showcase snapshot (five 3-second scenes) and extended each class presentation with strategy, strength, caution, physical projectile, native-kit effects, relay limit, and demonstrations derived from gameplay constants.
- Added the single dominant theater and aligned description surface with side-arrow gutters. Focused unit coverage currently passes: 125 tests across `game.test.ts` and `input.test.ts`.
- Canonical client capture inspected at `output/web-game-tank-carousel-final/shot-0.png`; `render_game_to_text` reports displayed/equipped class plus scene, scene index, progress, and 15-second loop timing.
- Exhaustive browser smoke captured all five scenes for Scout, Engineer, and Battle Tank at desktop and mobile sizes (16 captures per viewport including equipped state), with empty console/page-error logs. Keyboard wrap, touch arrows, preview-only browsing, Enter equip, reload persistence, and pointer Back all pass.
- Visual inspection confirmed the action beats and text fit: HE removes adjacent cover, the Battle shield absorbs the duel hit, race positions use class movement duration, and native-kit effects remain readable without scrollbars.
- Full repository validation passed: 33 files / 330 tests, production build, server smoke, harness validation/smoke, Reviewer App dry run, and attended-v2 lifecycle trace smoke. Contrast, Product Review Warden, and Deep Agent stub checks also pass.
- TODO: no known implementation or validation gaps; ready for user review.

### Carousel battlefield-scene refinement

- Replaced the abstract firing target and hand-drawn breach blocks with the production ground, road, brick-terrain, prop-atlas, tank, projectile, wreck, rubble, and damage renderers.
- Renamed the theater beats to `LIVE FIRE`, `BREAKTHROUGH`, and `FIELD KIT` where the prior names read like UI diagnostics.
- Rebuilt Field Kit as two trigger demonstrations per class: Scout Decoy relay contact then Wire alert; Engineer Mine damage/slow then Trap immobilization; Battle Shield absorption then clustered HE direct/splash damage.
- Shortened presentation copy and added deterministic pixel-width coverage for every description line so the fixed panel stays scrollbar-free and ellipsis-free.
- Focused TypeScript and unit validation passes at 126 tests; canonical-client field-scene capture inspected under `output/web-game-tank-carousel-field-scenes/`.
- Full desktop and mobile sweeps captured both Field Kit triggers for every class under `output/tank-class-carousel-field-desktop/` and `output/tank-class-carousel-field-mobile/`; both error logs are empty.
- Repository validation passes at 33 files / 331 tests with production build, server smoke, harness validation/smoke, Reviewer App dry run, attended-v2 lifecycle telemetry, contrast, Product Review Warden, and Deep Agent stub checks.
- TODO: no known implementation or validation gaps; ready for user review.

### Gameplay-Exact Carousel Playback

- Removed the static `relay_tower` prop from Scout's Decoy sequence and now render the same rotating Portable Relay equipment used on the battlefield and HUD.
- Corrected every theater outcome to live mechanics: normal enemies use 4 HP, Scout needs two 1-damage hits to break a 2-HP brick, Engineer mines leave 2/4 HP and slow for 10 seconds, Battle's shield absorbs 1 point from a 2-damage Engineer hit while 1 reaches HP, and HE leaves the direct target at 1/4 HP plus nearby targets at 3/4 HP.
- Replaced the cross-shaped generic bursts with compact direct-hit sparks or the HE/mine fragment, smoke, and dust language used by gameplay. Scout and Engineer never show splash.
- Replaced theater health pips with continuous health bars and a separate narrow shield bar.
- Expanded each scene from 3 to 5 seconds while keeping its action inside the original 3-second motion window, adding setup and outcome holds rather than slowing moving tanks or shells.
- Added small Previous, Pause/Resume, and Next controls in the theater header. Pointer/touch controls step scenes while preserving pause state; `P` also pauses or resumes the theater.
- Focused model/input validation passes at 128 tests with TypeScript clean. Canonical-client evidence is under `output/web-game-tank-carousel-mechanics/`.
- Desktop and mobile mechanics sweeps pass under `output/tank-class-carousel-mechanics-desktop/` and `output/tank-class-carousel-mechanics-mobile/`; playback buttons, pause freezing, all scenes, class wrapping, selection persistence, and Back pass with empty error logs.
- Full validation passes at 33 files / 333 tests with production build, server smoke, harness validation/smoke, Reviewer App dry run, attended-v2 lifecycle telemetry, contrast, Product Review Warden, and Deep Agent stub checks.
- TODO: no known implementation or validation gaps; ready for user review.
- Live attended-v2 LangSmith telemetry dispatched after verifying `urkrass/agentic-harness` branch `codex/mar-693-empty-base` resolves to `69df33aafbe6f2738b87419d449fd3ee4f84f018`; GitHub Actions run `28674666831` completed successfully.
- Follow-up shield fix: Battle Tank now starts with 1 persistent shield point; shield pickups add one persistent point instead of a timer; shield points absorb incoming damage before HP and no longer tick down over time.
- Shield validation passed: `npm.cmd run test -- src/game/game.test.ts`, `npm.cmd run validate`, and web-game Playwright evidence under `output/battle-shield-smoke/` with inspected Battle Tank shield screenshot.

### Calm Tank-Class Description

- Simplified the fixed class-description surface around one reading path: class and selection state, a single doctrine line, compact combat facts with Relay limit, then projectile and native-kit equipment.
- Removed duplicated presentation instead of shrinking the pixel font. Battle HE is described once as its projectile, while Auto Shield remains the only separate native capability in that class's description.
- Replaced the two long closing sentences with concise `BEST` and `WATCH` guidance, and shortened the strategy copy without changing any gameplay data or class mechanics.
- Added a render-only description model and deterministic pixel-width coverage for every live strategy, stat, Relay, projectile, kit, strength, and caution string.
- Canonical-client evidence is under `output/web-game-tank-carousel-calm-description/`. All three descriptions and field-kit scenes were inspected at desktop and mobile sizes under `output/tank-class-carousel-calm-desktop/` and `output/tank-class-carousel-calm-mobile/`; both browser error logs are empty.
- Full validation passes at 33 files / 333 tests with production build, server smoke, harness validation/smoke, Reviewer App dry run, attended-v2 lifecycle telemetry, contrast, Product Review Warden, and Deep Agent stub checks.
- No gameplay, balance, controls, save data, or showcase mechanics changed.

### Real-Speed Montage Pacing

- Removed the generic three-second interpolation that visibly slowed shells, tanks, and kit triggers inside the five-second showcase scenes.
- Player and enemy projectiles now use the same shared `240px/s` and `145px/s` constants as gameplay. Scout's second brick shot waits for its real reload interval, and race movement derives from each class's live seconds-per-tile value.
- Field Kit enemy approaches use the neutral Engineer's real movement timing. Each mine, trap, wire, shield, Decoy, and HE beat resolves at natural speed, then holds its resulting alert, damage, health, or destroyed state before the next cut.
- The five-second scenes and manual Previous/Pause/Next controls remain unchanged. Result holds range from roughly 1.1 to 3.5 seconds instead of stretching the underlying action.
- Canonical-client evidence is under `output/web-game-tank-carousel-montage-final/`. All classes and scenes were inspected at desktop and mobile sizes under `output/tank-class-carousel-montage-final-desktop/` and `output/tank-class-carousel-montage-final-mobile/`; both browser error logs are empty.
- Full validation passes at 33 files / 333 tests with production build, server smoke, harness validation/smoke, Reviewer App dry run, attended-v2 lifecycle telemetry, contrast, Product Review Warden, and Deep Agent stub checks.
- No gameplay, balance, controls, save data, or scene-selection behavior changed.

## 2026-06-30 Real-Game Upgrade Branch

- Branch: `codex/real-game-upgrade`.
- Implemented 32px tile-committed tank movement so blocked moves rotate without drifting into walls.
- Added grid-aware enemy AI with objective roles, BFS pathing, line-of-fire shooting, and wall-breaker brick clearing.
- Added selectable blue/red teams, menu/briefing/how-to-play/garage/pause screens, local save/continue, and persistent garage upgrades.
- Expanded `render_game_to_text()` with grid state, moving flags, teams, progression, upgrade stats, and save availability.
- Updated unit tests and Playwright smoke choreography for team selection, briefing start, gameplay, pause save, and continue.

## 2026-06-30 Campaign Progression

- Added an 8-level handcrafted campaign with per-level maps, spawn pressure, role weights, armor ratios, rewards, and briefing copy.
- Wired `unlockedStage` into new-game level selection; saved runs now include the active level and continue back into the correct map.
- Added `level-complete` and `campaign-complete` menu states with reward/unlock persistence and next-briefing flow.
- Extended HUD and `render_game_to_text()` with current level and active difficulty settings.

## 2026-06-30 Polish, CI, Balance, Mobile

- Merged PR #1 into `main` after `npm run validate` and Playwright smoke evidence.
- Created branch `codex/game-polish-ci-mobile` from updated `main`.
- Added GitHub Actions CI for `npm run validate`.
- Added saved Settings for volume, mute, and color-safe team rendering.
- Added retro Web Audio SFX event playback plus deterministic shake/flash/level-clear feedback.
- Smoothed campaign balance from 6 to 20 enemies across Levels 1-8 with gradually tighter spawn pressure.
- Added canvas touch controls for menu selection, D-pad movement, fire, and pause while keeping the desktop canvas uncluttered.

## 2026-06-30 Multiplayer Vision Foundation

- Created branch `codex/multiplayer-vision-foundation` from updated `main`.
- Added a shared authoritative multiplayer match model for blue/red PvP with discrete tile movement, bullets, scoring, respawn, team chat, pings, and relay capture.
- Added narrow personal vision plus retranslator ownership that merges teammate and relay sight for the owning team.
- Added a dependency-free local HTTP/SSE multiplayer server with join, command, typed team radio chat, ping, snapshot, health, smoke, and deployment-gated LiveKit token placeholder routes.
- Added an Online Battle menu path and focused canvas renderer so multiplayer remains one dominant game surface rather than a lobby dashboard.
- Validation evidence: `npm run validate` passes; Playwright online smoke inspected `output/web-game-online-final/shot-2.png` plus state; supplemental Playwright radio test confirmed typed team chat appears in `render_game_to_text()`.

## 2026-06-30 Strict Online Fog Repair

- User rejected the prior run because online play leaked relay positions and did not show real fog-of-war.
- Created branch `codex/strict-online-fog-repair` from current `main`.
- Started enforcing strict shroud in the server-side personalized snapshot: hidden relays and hidden team pings are no longer sent to the browser.
- Added online `render_game_to_text()` fog summary for visible/hidden cell counts and visible relay counts.
- Validation evidence: `npm run validate` passes; required online Playwright smoke shows zero visible relays at spawn; supplemental Playwright capture run shows `LINK ON` without revealing the whole map; single-player smoke still reaches gameplay.

## 2026-06-30 Pixel-Art Visual Upgrade

- Created branch `codex/pixel-art-visual-upgrade` from current `main`.
- Added shared procedural pixel-art helpers for terrain, ground, tanks, projectiles, power-ups, relays, pings, and last-known markers.
- Wired both offline and online renderers to the same sprite language; online visible cells now use textured terrain while hidden fog cells stay black.
- Initial `npm run validate` passes after the renderer refactor.
- Browser evidence inspected: offline `output/web-game-pixel-offline/shot-1.png`, online `output/web-game-pixel-online/shot-1.png`, relay capture `output/web-game-pixel-online-capture/shot.png`, and color-safe screenshots under `output/web-game-pixel-color-safe/`.

## 2026-06-30 Dense Battlefield Pixel-Art Pass

- Created branch `codex/dense-battlefield-pixel-art` from current `main`.
- Replaced the sparse procedural pixel-art helper with denser deterministic ground decals, chipped terrain sprites, richer tanks, relay mast/generator details, directional bullet tracers, and stronger power-up/ping/last-known markers.

## 2026-07-02 HUD Redistribution

- Created branch `codex/hud-redistribution` from updated `origin/main`.
- Reworked the canvas frame to `560x480`: a 48px left enemy band, the unchanged 416x416 battlefield, a 96px right status band, and a 48px bottom shell band.
- Moved enemy count/markers out of the right HUD, moved shell count/pips/recharge to the bottom, and kept objective/link/relay/gear/team/score/health/lives/level/credits/objective status on the right.
- Validation evidence: focused HUD tests passed; `npm run validate`, `npm run visual:contrast`, harness checks, Product Review Warden, and `git diff --check` passed.
- Browser evidence inspected: normal gameplay `output/playwright/hud-redistribution/normal/shot-0.png` and high-enemy assault `output/playwright/hud-redistribution/assault/shot-0.png`.

## 2026-07-02 HUD Cleanup Follow-Up

- Updated the same `codex/hud-redistribution` branch to thin the bottom band to 32px, move HP into a top-frame line, and unload level/credits/HP/gear count from the right combat HUD.
- Added a compact bottom gear strip using the existing deployable sprites, with inactive slots dimmed and active/held slots brighter.
- Browser evidence inspected: normal gameplay `output/playwright/hud-cleanup/normal/shot-0.png`, high-enemy assault `output/playwright/hud-cleanup/assault/shot-0.png`, and mobile touch `output/playwright/hud-cleanup/mobile-touch/mobile-touch-gameplay/shot-0.png`.
- Added a top-frame `SHIELD` timer bar to the right of the HP line; browser evidence inspected at `output/playwright/hud-shield-line/normal/shot-0.png`.
- Added a lower-right fog-safe vector minimap that draws visible map cells from logical terrain state instead of downscaling pixel-art sprites; browser evidence inspected at `output/playwright/hud-minimap/normal/shot-0.png`.

## 2026-07-02 Enemy Tank Durability

- Created branch `codex/enemy-tank-durability` from updated `origin/main`.
- Raised newly spawned offline enemy tank durability by 3 HP: normal enemies now spawn at `4/4` HP and armored enemies at `5/5` HP. Friendly bots, player HP, saved active enemy HP, online protocol, renderer layout, and deploy/release surfaces remain unchanged.
- Kept armored kill rewards/stats tied to the existing armored score tier instead of `maxHp > 1`, so tougher normal enemies do not count as armored kills.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 79 tests.
- Full validation evidence: `npm.cmd run validate` passes with 18 test files and 185 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/playwright/enemy-tank-durability/normal/shot-0.png` shows normal player-path gameplay after launch; `state-0.json` reports `mode: "playing"`, `shotsFired: 1`, and no browser error file.

## 2026-07-02 Shield HUD Hit Feedback Repair

- Created branch `codex/shield-hud-hit-feedback` from updated `origin/main`.
- Split true shield pickup state from hit/revive grace: unshielded hits no longer fill the top HUD shield bar, shield pickup protection is consumed by a hit before HP is damaged, and post-hit/repair grace now uses `spawnGrace`.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 80 tests.
- Full validation evidence: `npm.cmd run validate` passes with 18 test files and 186 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/playwright/shield-hud-hit-feedback/normal/shot-0.png` shows normal player-path gameplay with the top `SHIELD` bar empty; `state-0.json` reports `player.shield: 0` and no browser error file.

## 2026-07-01 Own-Objective Fire Repair

- Investigated the offline assault report where enemy defenders appeared to bombard their own command core.
- Split AI movement targeting from AI shot targeting so assault defenders can guard the core without using the core guard tile as a firing target.
- Added objective ownership guards: player-side fire no longer damages the player defense base, and enemy-side fire remains blocked from damaging the enemy assault core.
- Added targeted Vitest regressions for enemy assault core fire, valid hostile defender shots, and defense-base ownership.
- Evidence: `npm run test -- src/game/game.test.ts` passed with 36 tests; `npm run test` passed with 95 tests; `npm run build` passed; `npm run visual:contrast` passed; `npm run validate` passed, including server smoke and harness validate/smoke.
- Browser evidence: required web-game client smoke captured `output/web-game-own-objective-smoke/shot-0.png` and `state-0.json` with no browser errors; supplemental Level 8 probe captured `output/web-game-own-objective-level8/shot.png` and `state.json` showing Final Foundry assault, `CORE 6/6`, and no browser errors.
- Offline renderer now marks the player tank with the shared self outline and renders particles as denser sparks/smoke pixels; online projectile rendering uses the same directional tracer while preserving snapshot-filtered fog.
- Fast `npm run build` passes after the renderer changes.
- Full `npm run validate` passes after the dense renderer changes.
- Browser evidence inspected: offline `output/web-game-dense-offline/shot-0.png`, online clean spawn `output/web-game-dense-online-clean/shot-0.png`, relay capture `output/web-game-dense-online-capture-script/shot.png`, and color-safe screenshots under `output/web-game-dense-color-safe/`.
- Relay capture evidence: player reached relay `(10,12)`, `LINK ON`, `visibleCellCount: 48`, `hiddenCellCount: 272`, and `visibleRetranslatorCount: 2`; hidden map remained black.
- Visual density check: PNG byte sizes increased versus the prior pixel-art baseline for offline, online spawn, and relay-capture screenshots.

## 2026-06-30 Figma-Backed High-Contrast Sprite Pass

- Created Figma source file `Tanchiki Sprite Lab`: https://www.figma.com/design/cj71CGcXTFM5xTCl7xYIio
- Added Figma source pages for `32px Offline`, `20px Online`, `Animation Frames`, and `Contrast Spec`.
- Exported committed runtime sprite sheets: `public/assets/sprites/tanchiki-core-32.png` and `public/assets/sprites/tanchiki-core-20.png`.
- Added `src/game/spriteAtlas.ts` with lazy atlas loading and procedural fallback through the existing shared `pixelArt.ts` helpers.
- Wired offline and online renderers to use atlas sprites for tanks, terrain, relays, projectiles, pings, and last-known markers; online still only draws server-provided visible entities/cells.
- Added `npm run visual:contrast`; latest run passed with `luminanceDelta: 74.3377`, `chromaDelta: 22.7956`, `darkOutlineFraction: 0.0898`, screenshot `qa/artifacts/contrast-check.png`.
- Full `npm run validate` passes after the atlas integration.
- Browser evidence inspected: offline `output/web-game-figma-offline/shot-0.png`, online clean spawn `output/web-game-figma-online-clean/shot-0.png`, relay capture `output/web-game-figma-online-capture/relay-capture.png`, and color-safe screenshots under `output/web-game-figma-color-safe/`.
- Clean online spawn evidence: `visibleCellCount: 22`, `hiddenCellCount: 298`, `visibleRetranslatorCount: 0`, `teamVisionMerged: false`.
- Relay capture evidence: player reached relay `(4,7)`, `LINK ON`, `visibleCellCount: 50`, `hiddenCellCount: 270`, and `visibleRetranslatorCount: 1`; hidden map remained black.

## 2026-07-01 Figma-Backed HUD/Menu Visual Pass

- Created branch `codex/figma-ui-hud-menu` from current `main`.
- Extended `Tanchiki Sprite Lab` with `HUD/Menu 32px`, `HUD/Menu 20px`, `UI Animation Frames`, and an updated UI contrast spec.
- Exported Figma-authored runtime UI sheets: `public/assets/sprites/tanchiki-ui-32.png` and `public/assets/sprites/tanchiki-ui-20.png`.
- Added `src/game/uiAtlas.ts` with lazy UI atlas loading and renderer fallbacks.
- Wired offline and online HUD/menu/touch/status chrome to the UI atlas without changing gameplay, save data, multiplayer protocol, menu text, or strict online fog.
- Extended `npm run visual:contrast` with a HUD icon readability sample; latest run passed with HUD `luminanceDelta: 33.3088` and `chromaDelta: 53.6735`.
- Added color-safe UI atlas variants for team flags and badges so the HUD follows the cyan/amber readability mode.
- Full `npm run validate` passes after the UI atlas integration.
- Browser evidence inspected: main menu `output/web-game-figma-ui-main-menu-final/shot-0.png`, garage `output/web-game-figma-ui-garage-final/shot-0.png`, briefing `output/web-game-figma-ui-briefing-final/shot-0.png`, pause `output/web-game-figma-ui-pause-final/pause.png`, offline gameplay `output/web-game-figma-ui-offline-final/shot-0.png`, online spawn `output/web-game-figma-ui-online-final/shot-0.png`, relay capture `output/web-game-figma-ui-online-capture-final/relay-capture.png`, and color-safe screenshots under `output/web-game-figma-ui-color-safe-final/`.
- Clean online spawn evidence: `visibleCellCount: 22`, `hiddenCellCount: 298`, `visibleRetranslatorCount: 0`, `teamVisionMerged: false`.
- Relay capture evidence: player reached relay `(4,7)`, `LINK ON`, `visibleCellCount: 49`, `hiddenCellCount: 271`, and `visibleRetranslatorCount: 1`; hidden map remained black.

## 2026-07-01 Loading Screen And Pressed Menu Feedback

- Extended `Tanchiki Sprite Lab` UI atlas source with pressed menu and loading sprite cells; runtime sheets now include the new row in `tanchiki-ui-32.png` and `tanchiki-ui-20.png`.
- Added offline `loading` mode with deterministic 1.2s progress, level target summary, and playful tip text; `startGame()` remains the immediate initializer for internal/test use.
- Added menu press state with a short delayed commit, pressed row sprites, navigation lock during press, and `Esc`/Back cancellation.
- Extended `render_game_to_text()` with loading payload plus `pressedIndex` and `pressProgress` menu fields.
- Validation evidence: `npm run visual:contrast` passes; full `npm run validate` passes with 23 unit tests.
- Browser evidence inspected: menu press `output/web-game-loading-menu-press/shot-0.png`, loading progress `output/web-game-loading-open/shot-0.png`, loading completion `output/web-game-loading-complete/shot-0.png`, gameplay smoke `output/web-game-loading-gameplay/shot-0.png`, pause `output/web-game-loading-pause-key/shot-0.png`, restart loading `output/web-game-loading-pause-restart/shot-0.png`, and online smoke `output/web-game-loading-online/shot-0.png`.
- Clean online spawn evidence remains strict: `visibleCellCount: 22`, `hiddenCellCount: 298`, `visibleRetranslatorCount: 0`, `teamVisionMerged: false`.

## 2026-07-01 Manual Loading Proceed And Chunkier Menus

- Extended `Tanchiki Sprite Lab` again with Figma source frames for chunkier `menu.button`, `menu.button.selected`, `menu.button.pressed`, and `loading.ready` cells; runtime UI sheets now append those IDs at atlas indices 51-54 with cache query `v=4`.
- Changed offline loading so progress clamps at 100% and exposes `readyToProceed: true`; gameplay now starts only after Enter, Space, or an arena click, while Back/Esc returns to the target level briefing.
- Replaced the thin selected menu strip with 30px tactile button rows, wider 32px spacing, raised/pressed drawing states, and pointer hit testing that rejects row gaps and out-of-bounds clicks.
- Updated tests and Playwright payloads for manual loading proceed, click proceed, restart loading, and enlarged hit targets.
- Validation evidence so far: `npm run test` passes with 26 tests; `npm run build` passes; `npm run visual:contrast` passes.
- Browser evidence inspected: pressed main menu `output/web-game-manual-loading-menu-press/shot-0.png`, mid-loading `output/web-game-manual-loading-open/shot-0.png`, ready loading `output/web-game-manual-loading-ready/shot-0.png`, click proceed `output/web-game-manual-loading-click-proceed/shot-0.png`, gameplay `output/web-game-manual-loading-gameplay/shot-0.png`, garage `output/web-game-manual-loading-garage/shot-0.png`, restart loading `output/web-game-manual-loading-pause-restart/shot-0.png`, and online smoke `output/web-game-manual-loading-online/shot-0.png`.
- Clean online spawn evidence remains strict: `visibleCellCount: 22`, `hiddenCellCount: 298`, `visibleRetranslatorCount: 0`, `teamVisionMerged: false`.

## 2026-07-01 Menu Visual Cleanup

- User rejected the first chunky-menu pass as ugly; root cause was stretching square UI atlas cells into long menu rows, producing smeared stripes and oversized color slabs.
- Replaced stretched menu/title sprites with crisp procedural pixel chrome sized directly to the row/plaque geometry; kept the enlarged hit targets and pressed/menu state behavior unchanged.
- Reduced menu row width from 288px to 256px, kept 30px height, and changed selected state to a thin team accent plus subtle border instead of a large yellow/green block.
- Browser evidence inspected: cleaned main menu `output/web-game-menu-cleanup-idle/shot-0.png`, pressed state `output/web-game-menu-cleanup-press/shot-0.png`, and garage rows `output/web-game-menu-cleanup-garage/shot-0.png`.
- Validation evidence: `npm run test`, `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Follow-up centering fix: menu title and row labels now use middle-baseline drawing against the actual plaque/button centers; inspected `output/web-game-menu-centered-idle/shot-0.png`, `output/web-game-menu-centered-press/shot-0.png`, and `output/web-game-menu-centered-garage/shot-0.png`.

## 2026-07-01 Universal Battlefield Graphics

- Added a shared 32px battlefield rendering/camera module used by both offline and online renderers; offline uses the zero camera, while online uses a clamped 13x13 camera centered on the local player.
- Removed online's separate 20px minimap-style map rendering in favor of the same `core32` terrain, tank, projectile, relay, ping, and last-known sprite language as offline.
- Online strict fog remains intact: hidden cells are drawn as plain black 32px tiles and no relay/entity/terrain is rendered unless the filtered snapshot includes it.
- Extended online `render_game_to_text()` with `view` summary: `tileSize`, `viewCols`, `viewRows`, `cameraCol`, and `cameraRow`.
- Added unit coverage for camera centering, edge clamping, world-to-screen mapping, camera inclusion, and visible-cell checks.
- Browser evidence inspected: offline gameplay `output/web-game-universal-offline/shot-0.png`, online clean spawn `output/web-game-universal-online-clean/shot-0.png`, and relay capture `output/web-game-universal-online-relay/relay-capture.png`.
- Clean online spawn evidence: `visibleCellCount: 22`, `hiddenCellCount: 298`, `visibleRetranslatorCount: 0`, `teamVisionMerged: false`, `view.tileSize: 32`, `view.viewCols: 13`, `view.viewRows: 13`.
- Relay capture evidence: player reached `(4,8)`, relay `(4,7)` is blue-owned, `LINK ON`, `visibleCellCount: 46`, `hiddenCellCount: 274`, `visibleRetranslatorCount: 1`, `teamVisionMerged: true`, and the view remains a bounded 13x13 32px camera.

## 2026-07-01 Reinforced Review-Debt Closeout

- Closed the named unresolved Codex review debt from PR #2, PR #3, and PR #5 before merging PR #8.
- PR #2 P1: replaced single active touch pointer state with per-pointer button tracking so a second finger cannot strand a held D-pad direction.
- PR #3 stale command sequencing: added server-side `lastCommandSeq` and ignored older command posts.
- PR #3 multi-teammate vision memory: `refreshVisionMemory` now aggregates enemy sightings from every alive teammate.
- PR #5 relay capture progress color: relay progress bars now use the capturing team while a capture/takeover is in progress.
- Added `docs/review-debt-closeout.md` with thread IDs, fixes, and validation evidence.
- Validation evidence: `npm run test`, `npm run build`, full `npm run validate`, and `node ./.agentic-harness/harness-wrapper.mjs review` pass using D:-local npm cache/temp because C: npm cache reported `ENOSPC`.
- Browser evidence inspected: offline `output/web-game-review-debt-offline/shot-0.png` reaches `mode: "playing"`; online `output/web-game-review-debt-online/shot-0.png` reaches connected battle with `visibleRetranslatorCount: 0` and `view.tileSize: 32`.

## 2026-07-01 I3 Persistent Memory Adapter

- Created branch `codex/i3-persistent-memory-adapter` from `origin/main`.
- Verified harness PR #264 is merged into `urkrass/agentic-harness` base `codex/mar-693-empty-base` at exact commit `5910034157384a8c777a1ed8f2492ee36a3ad1c6`.
- Updated `.agentic-harness/project-adapter.yml` and `.agentic-harness/agentic-harness.lock.json` to pin that exact harness commit and declare persistent memory references.
- Added `.agentic-harness/memory/project-memory.json`, `role-memory.json`, `review-debt.json`, `validation-memory.json`, and `closeout-memory.json`.
- Added `.agentic-harness/memory-ledger.json` and `.agentic-harness/review-warden-gate.json`.
- Recorded closed historical Codex review debt from PR #2, PR #3, and PR #5, including the PR #2 P2 menu-tap comment that was missing from the earlier closeout table.
- Recorded current open P1/P2 review debt from PR #9, PR #10, PR #13, and PR #14.
- Added `npm run harness:review-warden:product-repo`; production/release `COMPLETE` must run it before closeout and is expected to be blocked while the open debt remains.
- Future Codex sessions must load `.agentic-harness/memory/` before claiming COMPLETE. Memory is evidence and operating context only; Git artifacts remain authoritative.
- Validation evidence: `npm.cmd run validate` passed; `npm.cmd run harness:validate` passed; `npm.cmd run harness:smoke` passed; `git diff --check` passed.
- Product Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` returned `PRODUCT_REVIEW_WARDEN_COMPLETE_BLOCKED` with five open blocking debt ids, as expected for production/release COMPLETE while current review debt remains.

## 2026-07-01 Offline Pace And Online Animation Smoothness

- Created branch `codex/offline-pace-online-smoothing` from current `main`.
- Slowed offline pacing moderately: base player movement is now `0.32s`, player reload is `0.42s`, player bullets move at `205`, enemy movement is `0.42s`, enemy bullets move at `175`, enemy reload/AI decisions are calmer, and campaign spawn intervals are about 20-25% longer while preserving level progression.
- Updated Engine/Cannon upgrade scaling from the new slower baselines, with movement clamped at `0.22s`, normal reload at `0.26s`, and rapid-fire reload at `0.22s`.
- Added client-side online snapshot interpolation with a 120ms render delay and a 6-snapshot buffer; players and bullets render from interpolated visual positions while terrain, relays, pings, last-known markers, and fog still come only from the latest filtered authoritative snapshot.
- Extended online `render_game_to_text()` with `animation.snapshotBufferSize`, `animation.interpolationDelayMs`, `animation.renderAlpha`, and `animation.visualSelf`.
- Validation evidence: `npm run test`, `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: offline smoke `output/web-game-pace-offline/shot-0.png` reaches `mode: "playing"` with `moveDuration: 0.32`, `reloadTime: 0.42`, and Level 1 `spawnInterval: 3.2`; online smoke `output/web-game-smoothing-online/shot-0.png` reaches connected battle with `visibleRetranslatorCount: 0`, `view.tileSize: 32`, and an animation buffer.
- Online animation sample evidence: `output/web-game-smoothing-animation/state.json` recorded 80 frame samples, 8 distinct visual self positions, and 6 fractional positions during movement while fog still reported `visibleRetranslatorCount: 0`.
- Relay capture evidence: `output/web-game-smoothing-relay/shot.png` and state show relay `(4,7)` blue-owned, `LINK ON`, `visibleRetranslatorCount: 1`, `hiddenCellCount: 274`, and animation diagnostics still present.

## 2026-07-01 Smooth Online Camera And Strict-Fog Minimap

- Created branch `codex/online-camera-minimap` stacked on the open PR #9 branch `codex/offline-pace-online-smoothing`.
- Added a render-only online camera state with `180ms` soft-follow smoothing, interpolated-self targeting, fractional camera support, arena clipping, and an extra draw margin so fractional camera movement does not reveal gaps.
- Added a compact bottom-right online minimap using live visible snapshot data only; terrain, players, relays, and pings are filtered to `visibleCells`, while hidden battlefield cells remain black.
- Extended online `render_game_to_text()` with current/target camera, `cameraSmoothingMs`, and minimap summary `{ enabled, fogPolicy: "live-vision-only", visibleCellCount, visibleRetranslatorCount }`.
- Validation evidence: `npm run test`, `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: offline regression `output/web-game-camera-minimap-offline/shot-0.png`; online spawn `output/web-game-camera-minimap-online/shot-0.png` shows the minimap with `visibleRetranslatorCount: 0`; smoothing sampler `output/web-game-camera-minimap-smoothing/state.json` recorded 190 samples, 41 distinct camera rows, and 37 fractional camera rows; relay capture `output/web-game-camera-minimap-relay/shot.png` shows `LINK ON`, `visibleRetranslatorCount: 1`, `hiddenCellCount: 274`, and live-vision-only minimap state.

## 2026-07-01 Spawn Safety, Stronger Base, And River Pass

- Created branch `codex/spawn-base-river-pass` stacked on `codex/online-camera-minimap`.
- Started the gameplay logic pass: offline player/enemy creation now resolves spawn requests through deterministic nearest-safe BFS, and online spawn selection searches out from configured team spawns instead of falling back to blocked terrain.
- Started the base durability pass: new offline runs use `BASE_MAX_HP = 3`, `baseHp` remains the saved current HP field, and base bullet hits now subtract HP before losing.
- Started the river pass: campaign maps now have more connected water channels and the shared terrain renderer receives water-neighbor context for connected banks without revealing hidden online water.
- Finished the pass with focused unit coverage for blocked player spawns, blocked enemy spawns, multiplayer fallback spawns, campaign spawn/base invariants, base HP damage/save/continue, and water-neighbor detection.
- Validation evidence: `npm run test` passes with 58 tests; `npm run build` passes; `npm run visual:contrast` passes; full `npm run validate` passes including server smoke and harness checks.
- Browser evidence inspected: offline gameplay `output/web-game-spawn-base-river-offline/shot-0.png` shows safe spawn, connected river, steel base armor, and three base pips with state `baseHp: 3`, `baseMaxHp: 3`; clean online spawn `output/web-game-spawn-base-river-online-clean/shot-0.png` shows strict black fog with `visibleRetranslatorCount: 0`; relay capture `output/web-game-spawn-base-river-online-relay-realtime/shot.png` shows `LINK ON`, relay-1 blue-owned, and bounded fog (`visibleCellCount: 46`, `hiddenCellCount: 274`).

## 2026-07-01 Circular RTS-Style Online Fog

- Created branch `codex/circular-rts-fog` stacked on `codex/spawn-base-river-pass`.
- Started replacing online tile/manhattan visibility with circular live vision: player vision radius `2.75`, relay vision radius `4.25`, terrain sent only when a tile intersects a live circle, and entities/pings/relays sent only when their center is inside a live circle.
- Extended the online snapshot with `vision.circles` and `fog.shape: "circular"` plus `visionCircleCount`, while preserving existing visible/hidden cell counts and strict filtered entity lists.
- Started renderer updates so the battlefield and minimap draw only filtered snapshot data, then apply soft circular black shroud cutouts; last-known markers remain above shroud as memory markers without terrain/objective data.
- Unit evidence: `npm run test` passes with 60 tests, including circular diagonal cell inclusion, outside-circle entity filtering, relay vision expansion, ping filtering, last-known memory, and circular minimap policy.
- Build/visual evidence: `npm run build` passes; `npm run visual:contrast` passes with tank/environment luminance delta `75.009` and HUD luminance delta `33.309`.
- Full validation evidence: `npm run validate` passes, including tests, build, server smoke, harness validate, and harness smoke.
- Browser evidence inspected: clean online spawn `output/web-game-circular-fog-online-clean/shot-0.png` shows round soft shroud with `fog.shape: "circular"`, `visibleCellCount: 29`, `hiddenCellCount: 291`, `visibleRetranslatorCount: 0`, and minimap policy `circular-live-vision-only`.
- Browser movement evidence inspected: `output/web-game-circular-fog-online-motion/shot.png` and `state.json` show 50 samples, 18 fractional visual-self rows, and 15 distinct camera rows while the circular fog footprint moves without square tile snapping.
- Relay capture evidence inspected: `output/web-game-circular-fog-online-relay-realtime/shot.png` shows `LINK ON`, two live vision circles, `visibleCellCount: 69`, `hiddenCellCount: 251`, and `visibleRetranslatorCount: 1` without revealing the full map.
- Offline regression evidence inspected: `output/web-game-circular-fog-offline/shot-0.png` reaches normal gameplay with `baseHp: 3`, `baseMaxHp: 3`, and no fog overlay.

## 2026-07-01 Reliable Online Movement Controls

- Created branch `codex/online-input-reliability` stacked on open PR #12 branch `codex/circular-rts-fog`.
- Added an explicit online input tracker that keeps held directions/fire separate from the sent command, restores the previous held direction after key rollover, and clears input on release-all.
- Routed existing canvas pointer D-pad/fire events to `OnlineBattleClient` while online is active, instead of sending them to the offline game object.
- Online commands now send immediately after input changes and continue periodic resend; `render_game_to_text()` exposes held input, active direction, fire, command sequence, send errors, and touch-control visibility.
- Unit evidence: `npm run test` passes with 65 tests, including online direction rollover, fire independence, release-all clearing, multi-pointer tracking, and online/offline input routing.
- Validation evidence: `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: online smoke `output/web-game-online-input-smoke/shot-0.png` shows connected circular-fog online play with `visibleRetranslatorCount: 0`, `sendErrorCount: 0`, and input diagnostics present.
- Browser control evidence inspected: `output/web-game-online-input-reliability/state.json` shows keyboard hold moved row `14 -> 10`, right-over-up rollover made `activeDirection: "right"`, releasing right restored `activeDirection: "up"`, and canvas D-pad events reached online input.
- Browser pointer evidence inspected: `output/web-game-online-input-pointer/state.json` shows canvas D-pad moved the authoritative player row `14 -> 10`, canvas fire set `input.fire: true`, and all samples had `sendErrorCount: 0`.
- Browser touch visual evidence inspected: `output/web-game-online-input-touch-visual/shot.png` shows online D-pad/fire overlay in a touch-capable context while strict circular fog remains black outside vision.
- Offline regression evidence inspected: `output/web-game-online-input-offline/shot-0.png` reaches normal offline gameplay with `baseHp: 3` and unchanged HUD/gameplay.

## 2026-07-01 Online Shooting Smoothness And Slower Online Tempo

- Created branch `codex/online-shooting-tempo` stacked on `codex/online-input-reliability`.
- Added exported shared multiplayer tuning constants and slowed online-only pacing: movement cooldown `0.28s`, reload `0.60s`, bullet speed `6.5 tiles/s`, and relay capture `3.6s`; offline tuning remains unchanged.
- Added render-only local online shot feedback: pressing fire emits a short muzzle flash/tracer from the visible local tank, rate-limited to the online reload timing and separate from authoritative bullets/hits.
- Smoothed first-seen authoritative online bullets by synthesizing a previous visual position while still drawing only bullets included in the filtered snapshot.
- Extended online `render_game_to_text()` with `tempo` and `shooting` summaries for validation.
- Unit evidence: `npm run test` passes with 70 tests, including online tuning behavior, shot feedback cooldown/lifetime, and first-seen bullet smoothing.
- Validation evidence: `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: online smoke `output/web-game-online-shooting-smoke/shot-0.png` shows connected strict circular fog with `visibleRetranslatorCount: 0` and tempo debug values; shot probe `output/web-game-online-shooting-probe/fire-60ms.png` shows the immediate muzzle cue while state reports `activeLocalShotEffects: 1`, `localShotCooldownMs: 600`, and zero send errors; movement probe still moves keyboard `row 14 -> 11` under slower cooldown with rollover restored; offline smoke `output/web-game-online-shooting-offline/shot-0.png` remains normal offline gameplay with `moveDuration: 0.32` and `reloadTime: 0.42`.
- Follow-up movement-inactive repair: reproduced a stale quick-match room at `phase: "finished"` and `timeRemaining: 0` where client input changed correctly but authoritative movement was stopped; patched the server so joining a finished quick room resets the match and closes stale streams.
- Repair evidence: `npm run server:smoke` covers finished quick-room reset; fixed browser probe `output/web-game-movement-inactive-fixed/state.json` shows fresh `phase: "playing"`, keyboard movement `row 14 -> 10`, canvas D-pad movement `row 10 -> 8`, and `sendErrorCount: 0`.

## 2026-07-01 Offline Objective Campaign Modes And Level Replay

- Refactored the offline campaign into reusable objective modes: Defense, Team Battle, Capture The Flag, Free For All, and Assault, with per-level objective metadata shaped for later online reuse.
- Reworked the 8 campaign levels around mixed objectives and added objective state for sides, friendly bots, neutral FFA bots, flag carrier/capture state, assault core HP, and objective scores.
- Added `level-select` so Campaign opens a calm replay picker with completed levels plus the next unlocked level; old saves migrate from `unlockedStage` into `completedLevels`.
- Generalized offline bullet hostility from hardcoded player-vs-enemy to side-aware combat while keeping friendly fire disabled outside FFA.
- Updated HUD/debug text with current objective state and refreshed Playwright action files for the new Main Menu -> Level Select -> Briefing flow.
- Unit evidence: `npm run test` passes with 80 tests, including old-save migration, level select, CTF capture/continue, FFA score win, assault objective HP, and team-battle side spawning.
- Validation evidence: `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: level select `output/web-game-level-select-open/shot-0.png`; objective gameplay smoke `output/web-game-objective-gameplay-smoke/shot-0.png` reaches `mode: "playing"`; CTF seeded probe `output/web-game-ctf-briefing-probe/ctf-briefing.png` and `ctf-gameplay.png` show Level 3 `objective.mode: "ctf"` with selectable levels `[1,2,3]`.

## 2026-07-01 Upgrade Clarity, Pickup Feedback, And Level Results

- Added Garage upgrade presentations with exact current/next effects, costs, affordability, and max-state text for Armor, Cannon, Engine, and Repair Kit.
- Added transient pickup/repair/reward notices and run statistics for shots, hits, kills, powerups, lives lost, repair-kit uses, base damage, CTF captures, assault damage, and reward sources.
- Added level/campaign result summaries to `render_game_to_text()` and the completion helper text, showing time, kills, powerups, earned credits/XP/score, funds, best score, and unlock status.
- Focused unit evidence: `npm run game:smoke` passes with 32 tests, including upgrade explanations, pickup notice expiry, saved run stats, and reward ledgers.
- Validation evidence: `npm run test`, `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass with 82 tests.
- Browser evidence inspected: Garage upgrade detail `output/web-game-upgrade-clarity-garage/shot-0.png`; in-game pickup notice `output/web-game-upgrade-clarity-probes/pickup-playing.png` with `RAPID FIRE 8s +50`; level results overlay `output/web-game-upgrade-clarity-probes/results.png` with reward totals and funds.

## 2026-07-01 Tactical Evaluation Metagame Pass

- Added a pure tactical evaluation layer that interprets existing offline run stats by objective mode instead of adding generic badges or repeated-engagement loops.
- Extended run stats and reward ledgers with critical cover damage, objective-relevant powerups, friendly survival, tactical XP, and tactical credits.
- Level results now include tactical style, victory quality, concise reasons, key metrics, and transparent tactical bonus text while keeping the same one-canvas result overlay.
- Garage copy now maps existing upgrades to tactical styles: Armor for Fortress/Guardian, Cannon for Sniper/Bulldozer, Engine for Raider, and Repair Kit for Last Wall recovery.
- Documentation added at `docs/tanchiki-vetushinsky-metagame-pass.md` with the repository audit, design philosophy, objective interpretation, rewards, and next pass.
- Unit evidence: `npm run game:smoke` passes with 32 tests and `npm run test` passes with 89 tests, including deterministic tactical-evaluation coverage.
- Validation evidence: `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass, including server smoke and `.agentic-harness` smoke/validate.
- Browser evidence inspected: Garage upgrade role copy `output/web-game-tactical-garage/shot-0.png`; tactical result overlay `output/web-game-tactical-results/results.png` with `STYLE: Fortress`, `QUALITY: Controlled Win`, and transparent `Bonus +$8 +3XP`.

## 2026-07-01 Governance Recovery

- User correctly pointed out that harness rules disallow uncontrolled coding; stopped feature work and audited the branch/worktree before any PR claim.
- Current branch `codex/online-shooting-tempo` is stacked on open PR #13 (`codex/online-input-reliability`) and contains a mixed dirty batch from online shooting tempo, offline objective campaign, upgrade clarity/results, and tactical evaluation.
- Local adapter resource locks were incomplete for the current repo shape: `packages/server` and `packages/shared` are tracked product surfaces but were not listed under owned resources.
- Repaired `.agentic-harness/project-adapter.yml` and `.agentic-harness/resource-locks.yml` to include `packages/**` before staging the mixed batch.

## 2026-07-01 Pixel Text Sharpness

- Replaced Canvas `fillText()` usage in offline and online renderers with a shared integer-grid bitmap font renderer so menu/HUD/status text is hard-edged instead of antialiased and blurry.
- Added deterministic bitmap text measurement coverage in `src/game/pixelText.test.ts`.
- Validation evidence: `npm run test` passes with 91 tests; `npm run build`, `npm run visual:contrast`, and full `npm run validate` pass.
- Browser evidence inspected: offline menu `output/web-game-pixel-text-menu/shot-0.png`; online battle HUD `output/web-game-pixel-text-online-hud/shot-0.png` with connected strict circular fog and `visibleRetranslatorCount: 0`.
- Follow-up HUD correction: removed hard bitmap drop-shadows from side-panel text, softened HUD ink, wrapped high-armor HP pips, and moved the base/objective cluster into a dedicated bottom row.
- HUD correction evidence: controlled red Level 8 assault HUD `output/web-game-hud-position-fix/hud.png` shows `CORE 6/6` without overlap; standard client screenshot `output/web-game-hud-position-client/shot-0.png` inspected; `npm run validate` passes.

## 2026-07-01 I4 Review Warden Debt Repair

- Created branch `codex/i4-review-debt-repair` from latest `origin/main` after PR #15 merge commit `705d0cb320896283276a653b05c3cd6b42dcc650`.
- Merged the cumulative stacked gameplay branch `origin/codex/online-shooting-tempo` into the I4 branch so the recorded PR #9/#10/#13/#14 debt surfaces existed in this repair PR.
- Repaired `tanchiki2-pr9-respawn-teleport-interpolation`: online player interpolation now snaps on alive-state changes and teleport-sized deltas, with regression coverage in `src/online/onlineInterpolation.test.ts`.
- Repaired `tanchiki2-pr10-last-known-minimap-fog-leak`: online minimap last-known markers are filtered by live visible cells, with hidden/visible marker coverage in `src/online/onlineMinimap.test.ts`.
- Repaired `tanchiki2-pr13-hybrid-online-input-held-button-drop`: online input holds are source-aware across keyboard, pointer, and programmatic inputs, with hybrid hold coverage in `src/online/onlineInput.test.ts`.
- Repaired `tanchiki2-pr14-ffa-bot-kills-exhaust-objective`: FFA completes when the neutral objective pool is exhausted and no tanks remain, with offline objective regression coverage in `src/game/game.test.ts`.
- Repaired `tanchiki2-pr14-assault-defenders-target-core`: assault defenders target hostile tanks before objective fallback, and core objective fallback is player-side only, with hostile targeting coverage in `src/game/game.test.ts`.
- Updated `.agentic-harness/memory/review-debt.json` so all five items are closed by `repair_work` with linked debt ids, linked Codex comment ids, package `I4_TANCHIKI2_REVIEW_DEBT_REPAIRED`, and source/test evidence. No waivers were used.
- Product Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and five linked repair-work closures.
- Focused unit evidence: `npx vitest run src/online/onlineInterpolation.test.ts src/online/onlineMinimap.test.ts src/online/onlineInput.test.ts src/game/game.test.ts` passes with 53 tests.
- Full validation evidence: `npm.cmd run validate` passes with 100 tests, build, server smoke, harness validate, and harness smoke.
- Browser evidence inspected: Playwright smoke `output/web-game-i4-review-debt-playing/shot-0.png` reaches `mode: "playing"` with movement in progress, one fired shot, spawned enemies, and a nonblank battlefield.

## 2026-07-01 I5 Production Closeout Proof

- Created branch `codex/i5-production-closeout-proof` from fetched `origin/main` at `de2d1e25dec7fdc681f691ce7a0fb93cb504756e`, the merged PR #16 I4 repair commit.
- Loaded `.agentic-harness/memory/` before repo work and verified Product Review Warden COMPLETE is allowed with `open_blocking_count: 0`, five linked repair-work closures, and zero human waivers.
- Validation evidence: `npm.cmd run validate` passed with 100 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` also passed.
- Browser evidence inspected under `output/i5-production-closeout/`: offline campaign start, connected online battle, circular fog/minimap, keyboard movement, and combat terrain destruction.
- Combat proof: `offline-combat-probe/state-0.json` records `shotsFired: 3`, `bricksDestroyed: 1`, and `criticalCoverDestroyed: 1`.
- Input proof: `offline-input-probe/state-0.json` records keyboard movement from Level 1 spawn column `4` to column `3`.
- Online proof: `online-battle-smoke/state-0.json` records `mode: "online-battle"`, `connection: "connected"`, circular fog, `hiddenCellCount: 291`, and minimap policy `circular-live-vision-only`.
- Added release proof docs in `docs/release/` and updated closeout memory for `I5_TANCHIKI2_PRODUCTION_CLOSEOUT_PROOF_READY`.

## 2026-07-01 I6 Respawn Escape Spawn Safety

- Created branch `codex/respawn-escape-spawn-safety` from freshly fetched `origin/main` at `8b4a5267d9a85de027a76cf25bc7be46ef8ec2dd`.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and left `.agentic-harness/memory/` unchanged.
- Tightened offline and online spawn selection so safe spawn cells must be passable, unoccupied, and have at least one passable unoccupied neighboring exit; normal movement collision rules remain unchanged.
- Added regressions for passable but trapped offline player/enemy spawns and online respawn selection after the respawn timer expires.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts packages/shared/src/multiplayer.test.ts` passes with 57 tests.
- Full validation evidence: `npm.cmd run validate` passes with 103 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- Browser evidence inspected: offline smoke `output/web-game-respawn-escape-offline/shot-0.png` reaches active Level 1 gameplay with spawned enemies; online smoke `output/web-game-respawn-escape-online/shot-0.png` reaches connected online play with circular fog and `sendErrorCount: 0`.

## 2026-07-01 I7 Continuous Enemy Movement Fairness

- Created branch `codex/continuous-enemy-movement` from freshly fetched `origin/main` at `a8362afa23f11ce92277d35a756e1f3f2afd193b`, the merged PR #18 spawn-safety commit.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and left `.agentic-harness/memory/` unchanged.
- Changed offline enemy AI decisions to distinguish `moved`, `acted`, and `idle`: successful movement now leaves `aiCooldown` at `0`, while shooting, wall breaking, blocked, or idle decisions keep the existing randomized cooldown.
- Added regressions showing enemies chain movement immediately after a completed tile step while enemy shooting decisions still apply cooldown.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 42 tests.
- Full validation evidence: `npm.cmd run validate` passes with 105 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- Browser evidence inspected: offline smoke `output/web-game-continuous-enemy-movement-offline/shot-0.png` reaches active Level 1 gameplay; `state-0.json` records two spawned enemies with `moving: true` and no browser error files were produced.

## 2026-07-01 I8 Mission Description Text Wrap

- Created branch `codex/mission-description-text-wrap` from freshly fetched `origin/main` at `a60b3706655d7006874dce40ccb23f039ccd3699`, the merged PR #19 enemy-movement commit.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and left `.agentic-harness/memory/` unchanged.
- Added shared pixel-text word wrapping and used it for non-result menu helper lines so long briefing copy wraps above the mission buttons instead of being ellipsized.
- Kept mission copy, gameplay, online rendering, HUD behavior, menu actions, and Review Warden memory unchanged.
- Focused evidence: `npm.cmd run test -- src/game/pixelText.test.ts` passes with 3 tests.
- Full validation evidence: `npm.cmd run validate` passes with 106 tests, production build, server smoke, harness validate, and harness smoke; `npm.cmd run visual:contrast`, separate `npm.cmd run harness:validate`, and separate `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- Browser evidence inspected: briefing smoke `output/web-game-mission-description-wrap-20260701-224216/shot-0.png` shows the Level 1 mission description wrapped without cropping; `state-0.json` reports `mode: "briefing"` and no browser error files were produced.

## 2026-07-01 I9 Respawning Teammate Squads With HP Bars

- Created branch `codex/teammate-respawn-hp-bars` from freshly fetched `origin/main` at `0cd3eabaa75581b8b02aa22b0bc85b1e56d95d4b`, the merged PR #20 mission-description commit.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and left `.agentic-harness/memory/` unchanged.
- Added a dedicated friendly-AI spawn path for player-side teammates with `hp: 3`, `maxHp: 3`, `role: "hunter"`, zero score value, and saved `friendlyRespawnTimer` support for pending respawns.
- Team-battle, CTF, and assault missions now maintain the configured friendly group; CTF and assault campaign defaults now provide at least two friendly spawn cells, while the existing three-ally Team Battle level stays at three.
- Added compact in-arena teammate HP bars and exposed `maxHp` for AI tanks in `render_game_to_text`.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 45 tests.
- Full validation evidence: `npm.cmd run validate` passes with 109 tests, production build, server smoke, harness validate, and harness smoke; `npm.cmd run visual:contrast`, separate `npm.cmd run harness:validate`, and separate `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- Browser evidence inspected: seeded Level 2 Team Battle smoke `output/web-game-teammate-respawn-hp-20260701-230213/shot-0.png` shows two blue teammate tanks with HP bars; `state-0.json` reports both player-side allies with `hp: 3`, `maxHp: 3`, and no browser error files were produced.

## 2026-07-01 I10 Large Offline Maps With Figma Pixel Props

- Created branch `codex/large-maps-figma-props` from freshly fetched `origin/main` at `6a710b5e92e49e67e1c4f2c6b40d4cdbc3012193`, the post-PR #21 main state.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and left `.agentic-harness/memory/` unchanged.
- Updated the existing Figma source file `Tanchiki Sprite Lab` (`cj71CGcXTFM5xTCl7xYIio`) with 32px and 20px source cells for radio towers, damaged radio towers, depots, damaged depots, and road tiles.
- Updated committed runtime core sprite sheets `public/assets/sprites/tanchiki-core-32.png` and `public/assets/sprites/tanchiki-core-20.png`; core atlas URLs now use cache query `v=2`.
- Expanded offline campaign maps to `21x17`, shifted mission spawns/objectives into the larger world, and added radio/depot/road terrain decorations while keeping online maps/fog/networking out of scope.
- Added dynamic offline map bounds, smooth offline camera state, camera-aware offline rendering, and `render_game_to_text` map/camera/terrain evidence.
- Added radio/depot HP terrain behavior and road passability; radio/depot destruction does not change brick metrics or kill rewards.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts src/game/battlefield.test.ts` passes with 56 tests.
- Full validation evidence: `npm.cmd run validate` passes with 114 tests, production build, server smoke, harness validate, and harness smoke; `npm.cmd run visual:contrast`, separate `npm.cmd run harness:validate`, and separate `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and zero human waivers.
- Browser evidence inspected: offline smoke `output/web-game-large-maps-figma-props-20260701-235055/shot-0.png` reaches active Level 1 gameplay after driving left; `state-0.json` reports `map.cols: 21`, `map.rows: 17`, `camera.current.col: 1`, `terrain.radio: 2`, `terrain.depot: 2`, `terrain.road: 22`, one fired shot, and no browser error files were produced.

## 2026-07-01 I8 Deep Agents Polish Planning

- Created branch `codex/i8-deep-agent-polish-plan` from freshly fetched `origin/main` at `e980ee452d7724c5b2f2015509c19efc4dfaa930`, the merged PR #22 large offline maps state.
- Loaded `.agentic-harness/memory/` before repo work; treated Review Warden memory as evidence/context only and preserved Git artifacts as authority.
- Updated the Tanchiki2 harness pin to exact post-I7 Agentic Harness commit `4e1825c84650b032b23d98029772918fb1740c80`; no branch, `main`, `HEAD`, `latest`, or floating ref is used.
- Added the Tanchiki2 Deep Agents stub-runtime profile, scenario, local wrapper, generated trace output, and generated bounded polish plan.
- Stub-runtime scope is planning-only: no gameplay features, no product source mutation, no providers, no GitHub/Linear/web/deployment API calls, no external network, and no deployment/publish/release authority.
- Generated plan covers game feel, visual clarity, onboarding/tutorial clarity, online UX, level readability, mobile/touch polish, accessibility/readability, and test/QA gaps. Next recommended package: I9 visual clarity and readability baseline.
- Full validation evidence: `npm.cmd run validate` passes with 114 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Deep Agents evidence: `npm.cmd run harness:deep-agent:stub-runtime` reports `DEEP_AGENT_STUB_COMPLETE_ALLOWED`, `finding_codes: []`, `denied_action_count: 0`, role sequence `project_steward`, `architecture_keeper`, `review_warden`, `validation_agent`, `git_discipline_agent`, `release_warden`, `implementation_executor`, `memory_curator`, and 41 trace events.
- Diff hygiene evidence: `git diff --check` and `git diff --cached --check` pass.
- Terminal outcome: `I8_TANCHIKI2_DEEP_AGENT_POLISH_PLAN_READY`.

## 2026-07-02 I9 Visual Clarity And Readability Baseline

- Created branch `codex/i9-visual-clarity-baseline` from freshly fetched `origin/main` at `21bdf84824e21a9bb23cfe56754953be0909f584`, the merged PR #23 Deep Agents polish-planning state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and inspected the deterministic Deep Agents stub-runtime planning scenario/output before product edits.
- Kept the pass bounded to copy clarity, HUD/result wrapping, minimap symbol readability, and focused contrast/test coverage; no game rules, campaign structure, online protocol, deployment, release, secrets, or production settings changed.
- Removed duplicate `Mode:` wording from briefing helper presentation, added explicit `Goal:` and `Enemy tanks` helper lines, expanded result copy from terse abbreviations to `Tactic`, `Hit rate`, and `Power`, and changed objective HUD `HOST`/`KOS` copy to `ENEMY`/`KILLS`.
- Result helper text now uses the same pixel-text wrapping path as other overlay helpers, so long tactical lines do not crowd the menu.
- Enlarged the online minimap cell scale, added a compact `MAP` label, and outlined minimap markers so player/relay/ping/last-known symbols are not color-only.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts src/game/pixelText.test.ts src/online/onlineMinimap.test.ts` passes with 57 tests.
- Full validation evidence: `npm.cmd run validate` passes with 115 tests, production build, server smoke, harness validate, and harness smoke; `npm.cmd run visual:contrast`, separate `npm.cmd run harness:validate`, and separate `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Before/after screenshot evidence inspected under `output/i9-visual-clarity-baseline/`: `before/briefing.png`, `before/gameplay-hud.png`, `before/result.png`, `before/online-minimap.png`, and matching files under `after/`.

## 2026-07-02 I10 Game Feel Micro-Polish

- Created branch `codex/i10-game-feel-micro-polish` from freshly fetched `origin/main` at `2c736410f8d7a314edc32f8501cba6068beee462`, the merged PR #24 / I9 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and verified Product Review Warden before product edits: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`.
- Kept the pass bounded to local game-feel feedback: deterministic player tread dust on movement start, deterministic muzzle particles plus subtle local shot recoil flash, a compact in-arena player reload meter, small feedback for non-destroying solid hits, and selected-action pause helper copy.
- Added focused game tests for reload/shot feedback, movement/solid-impact feedback, and pause action helper copy; current focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 53 tests.
- Browser before/after evidence captured under `output/i10-game-feel-micro-polish/`: baseline `before/gameplay`, `before/pause`, `before/restart`; after `after/gameplay`, `after/pause`, `after/restart`, `after/fire-reload`, and `after/restart-selected`. Normal play smoke reaches `mode: "playing"` and after fire/reload evidence records `shotsFired: 1`, `reload: 0.39`, and no browser error files.
- Full validation evidence: `npm.cmd run validate`, separate `npm.cmd run harness:validate`, separate `npm.cmd run harness:smoke`, focused `npm.cmd run test -- src/game/game.test.ts`, `git diff --check`, and `git diff --cached --check` all pass; Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.

## 2026-07-02 I11 Onboarding And Tutorial Clarity

- Created branch `codex/i11-onboarding-tutorial-clarity` from freshly fetched `origin/main` at `e40d0fd8853e3b2dad1f7d7c251df4ec33d2b827`, the merged PR #25 / I10 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and verified Product Review Warden before product edits: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`.
- Kept the pass bounded to first-run clarity: Level 1 briefing copy, objective/control helper text, How To Play controls and recovery copy, loading-ready back-out text, pause restart/save wording, defeat retry helper text, and `render_game_to_text()` onboarding evidence.
- Added reusable Playwright action fixtures for How To Play and loading-ready evidence without adding tutorial modes, dashboards, new mechanics, new levels, save-model changes, online protocol changes, deployment, release, secrets, or production settings.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 54 tests.
- Browser before/after evidence captured under `output/i11-onboarding-tutorial-clarity/`: `before/briefing`, `before/how-to-play`, `before/loading-ready`, `before/restart-selected`, `before/gameplay-smoke`, and matching `after/` directories. After gameplay smoke reaches `mode: "playing"`, records `shotsFired: 2`, and no browser error files are produced.
- Full validation evidence: `npm.cmd run validate`, separate `npm.cmd run harness:validate`, separate `npm.cmd run harness:smoke`, focused `npm.cmd run test -- src/game/game.test.ts`, and Product Review Warden all pass; Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.

## 2026-07-02 I12 Online UX Clarity

- Created branch `codex/i12-online-ux-clarity` from freshly fetched `origin/main` at `58321b6a9e38c333e21e5c4e3cc9d3ee3d9e3f23`, the merged PR #26 / I11 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and treated Review Warden memory as evidence/context only.
- Kept the pass bounded to online status copy, connection-state rendering, and local rendered-text diagnostics; no protocol, server authority, matchmaking, hosting, deployment, production settings, secrets, or gameplay mechanics changed.
- Baseline browser evidence captured under `output/i12-online-ux-clarity/before/` for delayed join, join failure, and connected online battle smoke.
- Added pure online status copy helpers and renderer/rendered-text usage:
  - Waiting: `JOINING ONLINE`, `REQUESTING ROOM`, `WAITING FOR SERVER`.
  - Error: `ONLINE UNAVAILABLE`, normalized local server error detail, and retry hint.
  - Battle HUD: raw `connected` text replaced by `ONLINE` plus `BATTLE LIVE`.
- Focused evidence: `npm.cmd run test -- src/online/onlineStatus.test.ts src/online/onlineRenderer.test.ts` passes with 9 tests.
- After browser evidence captured under `output/i12-online-ux-clarity/after/`; connected online smoke reports `connection: "connected"`, snapshot `phase: "playing"`, and status detail `BATTLE LIVE`.
- Full validation evidence: `npm.cmd run validate`, separate `npm.cmd run harness:validate`, separate `npm.cmd run harness:smoke`, focused `npm.cmd run test -- src/online/onlineStatus.test.ts src/online/onlineRenderer.test.ts`, `git diff --check`, and `git diff --cached --check` all pass; Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.

## 2026-07-02 I13 Level Readability Pass

- Created branch `codex/i13-level-readability` from freshly fetched `origin/main` at `16495f5318320b49c2e2d6186e5e72d786f9b219`, the merged PR #27 / I12 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and treated Review Warden memory as evidence/context only.
- Kept the pass bounded to offline campaign battlefield readability: objective markers, off-camera objective edge cues, spawn brackets, critical-cover accents, and rendered-text marker evidence.
- Did not add campaign stages, rebalance difficulty, change online maps/protocols, add mechanics, deploy, publish, alter production settings, or touch secrets/branch protection.
- Added `src/game/levelReadability.ts` and `render_game_to_text()` readability summaries for objective, spawn, critical-cover, visible, and hidden marker evidence.
- Added calm in-arena markers: visible base/home/core/flag labels, quiet spawn brackets, critical cover corner ticks, and compact `FLAG ^` / `CORE ^` edge cues when primary objectives are outside the camera.
- Focused evidence: `npm.cmd run test -- src/game/levelReadability.test.ts src/game/battlefield.test.ts` passes with 10 tests; `npm.cmd run build` passes.
- Browser before/after evidence inspected under `output/i13-level-readability/`: Level 1 normal play, seeded Level 3 CTF, and seeded Level 5 assault. After CTF shows `FLAG ^`; after assault shows `CORE ^`; no browser console error files were produced.
- Full validation evidence: `npm.cmd run validate`, separate `npm.cmd run harness:validate`, separate `npm.cmd run harness:smoke`, focused `npm.cmd run test -- src/game/levelReadability.test.ts src/game/battlefield.test.ts`, Product Review Warden, `git diff --check`, and `git diff --cached --check` all pass; Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.
- Terminal outcome: `I13_TANCHIKI2_LEVEL_READABILITY_PASS_READY`.

## 2026-07-02 I15 Accessibility And Readability Hardening

- Created branch `codex/i15-accessibility-readability` from freshly fetched `origin/main` at `bf6b3efc98aa1637951a4126508c9276d9f1b118`, the merged PR #29 / I14 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, and verified Product Review Warden before product edits: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`.
- Kept the pass bounded to readability/accessibility hardening: clearer briefing/retry copy, text evidence in `render_game_to_text()`, non-ambiguous level marker labels/directions, and a visible touch Pause label. No mechanics, campaign structure, online protocol, deployment, production settings, secrets, or branch protection changed.
- Added `readableText` diagnostics for offline HUD/menu/results/touch/level-marker labels and online status/touch labels so keyboard-readable evidence matches the visible surfaces.
- Focused evidence: `npm.cmd run test -- src/game/accessibilityReadability.test.ts src/game/levelReadability.test.ts src/online/onlineStatus.test.ts` passes with 14 tests; `npm.cmd run build` passes.
- Full validation evidence: `npm.cmd run validate` passes with 135 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check` pass. Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.
- Browser before/after evidence captured under `output/i15-accessibility-readability/`: desktop surfaces in `before/` and `after/`, mobile touch screenshots/states, web-game client smoke, and focused assault marker before/after showing `CORE ^` changed to `CORE UP`.

## 2026-07-02 I16 QA Gap Closure

- Created branch `codex/i16-qa-gap-closure` from freshly fetched `origin/main` at `6d0b48616301194ae4a37cd95668c4aeea707aea`, the merged PR #30 / I15 state.
- Loaded `.agentic-harness/memory/`, inspected `docs/planning/tanchiki2-polish-plan-v1.md`, reviewed PR evidence for I9-I15 from PRs #24-#30, and verified Product Review Warden before edits: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`.
- Added `docs/qa/i16-qa-gap-closure.md` with checked areas, gaps found, gaps closed, and intentionally deferred/non-gaps. I14 evidence was reviewed from PR #29 because `progress.md` did not contain a separate I14 section before this final audit.
- Closed evidence gaps without product polish changes: off-screen primary objective markers now include word directions in `render_game_to_text()`, I9/I15 result readability evidence is locked by a focused regression, and the mobile touch smoke script accepts `--out-root` for reusable QA evidence.
- Focused evidence: `npm.cmd run test -- src/game/qaGapClosure.test.ts` passes with 2 tests.
- Browser smoke evidence: `node qa/playwright/mobile-touch-smoke.mjs --phase i16 --out-root output/i16-qa-gap-closure/mobile-touch-smoke` passes with `MOBILE_TOUCH_SMOKE_PASSED`; screenshots/states are under `output/i16-qa-gap-closure/mobile-touch-smoke/`.
- Full validation evidence: `npm.cmd run validate` passes with 137 tests, production build, server smoke, harness validate, and harness smoke; separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, focused I16 test, and I16 mobile smoke pass. Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and `finding_codes: []`.
- Terminal outcome: `I16_TANCHIKI2_QA_GAP_CLOSURE_READY`.

## 2026-07-02 RC1 Release Candidate Preparation

- Created branch `codex/tanchiki2-rc1-release-candidate-preparation` from freshly fetched `origin/main` at `c6ab0eea05040f3ca5d84622c7c117f37b81d682`, the merged PR #32 / post-polish reassessment state.
- Loaded `.agentic-harness/memory/`, inspected the post-polish reassessment, I16 QA note, I5 production closeout, release checklist, and `progress.md`; treated Review Warden memory as evidence/context only with Git artifacts as authority.
- Confirmed PR #24 through PR #32 are all merged in `main`; no product source, gameplay, UI, online protocol, campaign, deployment, production setting, secret, billing, branch protection, tag, publish, or announcement changes were made.
- Refreshed `docs/release/release-checklist.md` from stale I5 evidence to current RC1/post-I16 authority and added `docs/release/tanchiki2-rc1-release-candidate-preparation-v1.md`.
- Browser evidence captured under `output/rc1-release-candidate-preparation/`: offline campaign smoke reaches Level 1 normal play; online battle smoke reaches connected `phase: "playing"` with strict circular fog and `sendErrorCount: 0`; mobile touch smoke passes with multi-touch, fire, and pause/restart copy preserved.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and RC1 mobile touch smoke pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Decision recorded: GO for RC1 candidate review / final human release decision; NO-GO for deployment, publish, tag, production-setting changes, secret changes, billing changes, branch-protection changes, or announcement until separately authorized.
- Terminal outcome: `TANCHIKI2_RC1_RELEASE_CANDIDATE_PREPARATION_READY`.

## 2026-07-02 RC1 Final Human Release Decision

- Created branch `codex/tanchiki2-rc1-final-human-release-decision` from freshly fetched `origin/main` at `67be4dadaccd690b88d85f3235b9869f41d971ae`, the merged PR #33 / RC1 release candidate preparation state.
- Loaded `.agentic-harness/memory/`, inspected the RC1 preparation document, release checklist, post-polish reassessment, I16 QA note, and `progress.md`; treated Review Warden memory as evidence/context only with Git artifacts as authority.
- Confirmed PR #24 through PR #33 are all merged in `main`; local review-debt scan found `open_blocking_p1_p2_count: 0`.
- Added `docs/release/tanchiki2-rc1-final-human-release-decision-v1.md` and updated `docs/release/release-checklist.md` with the final human release decision record.
- No explicit human approval or rejection was supplied, so the release decision state is `PENDING_HUMAN_DECISION`.
- No product source, gameplay, UI, polish, campaign, online protocol, deployment, production setting, secret, billing, branch protection, tag, publish, announcement, or release action change was made.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Final mobile/touch smoke evidence: `node qa/playwright/mobile-touch-smoke.mjs --phase rc1-final-human-decision --out-root output/rc1-final-human-release-decision/mobile-touch-smoke` passes with `MOBILE_TOUCH_SMOKE_PASSED`; inspected screenshots show nonblank normal gameplay and coherent pause/restart copy.
- Diff hygiene evidence: `git diff --check` and `git diff --cached --check` pass.
- Next recommended governed package: `TANCHIKI2-RC1-HUMAN-DECISION-CAPTURE`.
- Terminal outcome: `TANCHIKI2_RC1_FINAL_HUMAN_RELEASE_DECISION_READY`.

## 2026-07-02 RC1 Human Decision Capture

- Created branch `codex/tanchiki2-rc1-human-decision-capture` from freshly fetched `origin/main` at `9da072e7bfdbdebe6c093e24f361d8251b53abc3`, the merged PR #34 / RC1 final human release decision state.
- Loaded `.agentic-harness/memory/`, inspected the RC1 final human release decision document, RC1 release candidate preparation document, post-polish reassessment, release checklist, and `progress.md`; treated Review Warden memory as evidence/context only with Git artifacts as authority.
- Confirmed PR #24 through PR #34 are all merged in `main`; local review-debt scan found `open_blocking_p1_p2_count: 0`.
- Human decision supplied by operator: `"I approve Tanchiki2 RC1 for release action planning."`
- Added `docs/release/tanchiki2-rc1-human-decision-capture-v1.md` and updated `docs/release/release-checklist.md` with decision state `HUMAN_APPROVED_FOR_RELEASE_ACTION_PLANNING`.
- No product source, gameplay, UI, polish, campaign, online protocol, deployment, production setting, secret, billing, branch protection, rollback, tag, publish, announcement, or release action change was made.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Final mobile/touch smoke evidence: `node qa/playwright/mobile-touch-smoke.mjs --phase rc1-human-decision-capture --out-root output/rc1-human-decision-capture/mobile-touch-smoke` passes with `MOBILE_TOUCH_SMOKE_PASSED`.
- Diff hygiene evidence: `git diff --check` and `git diff --cached --check` pass.
- Next recommended governed package: `TANCHIKI2-RC1-RELEASE-ACTION-PLANNING`.
- Terminal outcome: `TANCHIKI2_RC1_HUMAN_DECISION_CAPTURE_READY`.

## 2026-07-02 RC1 Release Action Planning

- Created branch `codex/tanchiki2-rc1-release-action-planning` from freshly fetched `origin/main` at `fa5a557840801b54946d811e9fdc78b8ba1f4714`, the merged PR #35 / RC1 human decision capture state.
- Loaded `.agentic-harness/memory/`, inspected the RC1 human decision capture, final human release decision, RC1 release candidate preparation, release checklist, and `progress.md`; treated Review Warden memory as evidence/context only with Git artifacts as authority.
- Confirmed PR #24 through PR #35 are all merged in `main`; local review-debt scan found `open_blocking_p1_p2_count: 0`.
- Added `docs/release/tanchiki2-rc1-release-action-planning-v1.md` and updated `docs/release/release-checklist.md` with release action planning only.
- Identified exact release action options: pause, repair blocker, static web publish only, static web publish plus tag, and static web publish plus tag plus announcement.
- Proposed release path: static web publish plus tag plus announcement only if a later authorization package names the exact source head, deployment target, rollback target, tag, and announcement channel.
- Defined deployment target assumptions, publish/tag/announcement decision points, rollback plan, pre-release checks, post-release checks, required final authorization wording, and human-gated items.
- No product source, gameplay, UI, polish, campaign, online protocol, deployment, publishing, tag, announcement, production setting, secret, billing, branch protection, rollback removal, external provider mutation, or release action change was made.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` pass.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, `finding_codes: []`, and zero human waivers.
- Final mobile/touch smoke evidence: `node qa/playwright/mobile-touch-smoke.mjs --phase rc1-release-action-planning --out-root output/rc1-release-action-planning/mobile-touch-smoke` passes with `MOBILE_TOUCH_SMOKE_PASSED`.
- Diff hygiene evidence: `git diff --check` and `git diff --cached --check` pass.
- Next recommended governed package: `TANCHIKI2-RC1-RELEASE-ACTION-AUTHORIZATION`.
- Terminal outcome: `TANCHIKI2_RC1_RELEASE_ACTION_PLANNING_READY`.

## 2026-07-02 Offline Speed Calm-Down

- Loaded `.agentic-harness/memory/`, confirmed Product Review Warden allows complete with `open_blocking_count: 0`, and kept memory advisory with Git artifacts authoritative.
- Retuned offline-only tank movement and newly fired shell travel speed/TTL; camera behavior, reload timing, AI decision cadence, campaign structure, online protocol, UI, release/deploy/provider surfaces, and `.agentic-harness/deep-agents/` remain unchanged.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 55 tests.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 137 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check` pass.
- Browser evidence inspected: `output/offline-speed-calm-down-smoke/shot-0.png` shows active Level 1 offline gameplay with the single canvas/HUD intact; `state-0.json` reports `mode: "playing"`, `moveDuration: 0.38`, two player shots fired, and no generated error files.

## 2026-07-02 Offline Precious Shells

- Created branch `codex/offline-precious-shells` from clean `main`; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Started the offline player-only ammo economy: 10-shell mission loadout, saved shell/recharge state, passable `A` ammo-station terrain, procedural station art, compact HUD shell count, slower tactical reload constants, faster player shells, and player-only splash damage. Online protocol, enemy/friendly bot ammo, release/deploy/provider surfaces, and `.agentic-harness/deep-agents/` remain unchanged.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 60 tests after adding ammo, recharge, save/restore, station pass-through, and shrapnel regressions.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 142 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/offline-precious-shells-smoke/shot-0.png` shows active Level 1 offline gameplay with the single canvas/HUD intact, the procedural ammo station visible, and the compact shell HUD row showing `9/10`; `state-0.json` reports `mode: "playing"`, `terrain.ammo: 2`, `player.shells: 9`, `player.reloadTime: 1.6`, and no generated error files.

## 2026-07-02 Wider Road Sprite

- Created branch `codex/wider-road-sprite` from clean `main`.
- Switched road terrain away from the narrow atlas cell to a wider procedural full-tile road with restrained paver texture; gameplay, passability, ammo stations, online protocol, and release/deploy surfaces remain unchanged.
- Validation evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 60 tests; `npm.cmd run validate` passes with 16 test files and 142 tests, production build, server smoke, harness validate, and harness smoke; `npm.cmd run visual:contrast` passes.
- Browser evidence inspected: `output/wider-road-sprite-smoke/shot-0.png` shows active Level 1 offline gameplay with the widened road tiles visible along the lower lane; `state-0.json` reports `mode: "playing"`, `terrain.road: 20`, `terrain.ammo: 2`, and no generated error files.
- Follow-up: replaced the blocky full-tile road stamp with a neighbor-aware procedural road shape so straight runs, bends, and junctions render as continuous lanes with only outer caps; focused `npm.cmd run test -- src/game/game.test.ts` remains green with 60 tests.
- Follow-up validation evidence: `npm.cmd run validate`, `npm.cmd run visual:contrast`, Product Review Warden, and `git diff --check` pass; browser evidence inspected at `output/continuous-road-sprite-smoke/shot-0.png` shows the lower road as a continuous lane, with `state-0.json` reporting `mode: "playing"`, `terrain.road: 20`, and `terrain.ammo: 2`.

## 2026-07-02 Offline Fog Of War And Retranslators

- Created branch `codex/offline-fog-relays` from `origin/main` after PR #39 was merged; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Added the offline strict-fog/retranslator implementation: circular live player-side vision, capturable relay state, player-facing snapshot filtering, short last-known markers, visible-neighbor terrain rendering, and vision-aware AI targeting. Online protocol, deployment/release/provider surfaces, and `.agentic-harness/deep-agents/` remain unchanged.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 66 tests, including strict snapshot filtering, relay visibility at fog edges, relay capture/save restore, contested relay freeze, old-save defaults, and hidden-vs-last-known AI behavior.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 148 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/offline-fog-relays-smoke/shot-0.png` and `state-0.json` show black circular fog at spawn, `visibleRetranslatorCount: 1`, `teamVisionMerged: false`, zero visible enemies, and no hidden enemy marker leaks; `output/offline-fog-relays-capture-smoke/shot-0.png` and `state-0.json` show relay capture with `Link 1/4`, `teamVisionMerged: true`, two vision circles, and expanded visible cells.
- Follow-up correction: player-owned base cells now stay visible through offline fog for defense and CTF home objectives without exposing enemy flags, assault cores, or hostile markers. Focused `npm.cmd run test -- src/game/game.test.ts` passes with 68 tests; `npm.cmd run validate` passes with 16 test files and 150 tests; separate `visual:contrast`, harness validate/smoke, Product Review Warden, and `git diff --check` pass. Browser evidence inspected at `output/offline-fog-base-visible-smoke/shot-0.png`; `state-0.json` reports `alwaysVisibleCells: {"col":10,"row":14}`, `terrain.base: 1`, and no hidden enemy leaks.

## 2026-07-02 Taller Retranslator Sprite

- Created branch `codex/taller-retranslator-sprite` from merged `origin/main` after PR #40 landed.
- Updated Figma source file `Tanchiki Sprite Lab` (`cj71CGcXTFM5xTCl7xYIio`) with a new tall red-white lattice retranslator tower row: neutral, team, and color-safe variants, each with mast, cross-bracing, side dishes, beacon, and team equipment marker.
- Updated runtime core atlas sheets: `public/assets/sprites/tanchiki-core-32.png` is now `512x240`; `public/assets/sprites/tanchiki-core-20.png` is now `320x150`. Core atlas cache query is `v=3`, and relay atlas rects now use 1.5-tile-tall rows while remaining base-anchored to the same map tile.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 68 tests.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 150 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/taller-retranslator-sprite-smoke/shot-0.png` shows the captured relay as a taller red-white tower with dish shapes and no HUD overlap; `state-0.json` reports `Link 1/4`, `visibleRetranslatorCount: 1`, `ownedRetranslatorCount: 1`, and no browser error file.
- Regression repair: the Figma atlas export had changed existing tank cells, making player and enemy tanks appear buried in terrain. Rebuilt the runtime sheets so the original atlas area is restored from `origin/main` pixel-for-pixel and only the appended taller retranslator row remains new. Pixel equality evidence reports `originalAreaMismatchedBytes: 0` for both 32px and 20px sheets; browser evidence inspected at `output/taller-retranslator-regression-after/shot-0.png` and `output/taller-retranslator-enemy-short-after/shot-0.png` shows restored player/enemy tank sprites with the taller relay still visible.

## 2026-07-02 Offline Team Vision Link

- Created branch `codex/offline-team-vision-link` from merged `origin/main` after PR #41 landed; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Made the offline team vision rule explicit: player-side vision stays `SOLO` and excludes teammate view fields until the player side owns a retranslator, then switches to `TEAM` linked vision. Online protocol and AI behavior remain unchanged.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 69 tests, including a regression test proving a hidden hostile near a teammate remains hidden before relay capture and appears only after the relay link is established.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 151 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: standard smoke `output/offline-team-vision-link-standard-smoke/shot-0.png` shows the compact `SOLO` label fitting in the existing HUD link row. Team-battle probe screenshots `output/offline-team-vision-link-team-probe/before-link.png` and `after-link.png` show `Link 0/4 SOLO` with one vision circle before capture, then `Link 1/4 TEAM` with four vision circles and expanded view after capture; the probe reported zero browser errors.

## 2026-07-02 Offline Portable Relays

- Created branch `codex/offline-portable-relays` from freshly fetched `origin/main`; preflight confirmed scripts, local repo instructions, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Added one offline player-owned portable scouting relay: hold `E` or touch `RELAY` to place/recover it, passable equipment state, saved deployment restore, temporary signal waves/contacts, procedural portable relay art, compact HUD status, and in-world hold progress. Online routing ignores the relay input and remains movement/fire only.
- Kept the relay as non-combat scouting equipment: it does not damage, stun, block, affect fixed relay capture, merge teammate vision, alter AI authority, or touch deployment/release/provider surfaces.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 73 tests; focused input/game/readability/tactical suite passes with 90 tests.
- Full validation evidence: `npm.cmd run validate` passes with 16 test files and 155 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass.
- Browser evidence inspected: `output/offline-portable-relay-smoke/shot-0.png` shows active offline gameplay with the portable relay, fading waves, readable tank sprites, and calm single-canvas HUD. `state-0.json` reports `portableRelay.deployed: true`, `waveCount: 32`, `signalVisibleCells: 30`, `teamVisionMerged: false`, `readableText.hud.relay: "RELAY OUT"`, and no browser error file.
- Echo-only correction: portable relay signals now behave like Dark Echo-style probes instead of fog reveal. Signals no longer add visible terrain cells, punch fog holes, show hidden enemy sprites, or expose hidden tank ids through player-facing snapshots/readable text; they render as fading white/red echo fragments over black fog. Focused `npm.cmd run test -- src/game/game.test.ts` passes with 73 tests, and the focused input/game/readability/tactical suite passes with 90 tests.
- Echo-only validation evidence: post-render-change `npm.cmd run validate` passes with 16 test files and 155 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass. Browser evidence inspected at `output/offline-portable-relay-echo-smoke-early/shot-0.png`; `state-0.json` reports `visibleCellCount: 37`, `teamVisionMerged: false`, no `signalVisibleCells`, no visible hidden enemies, and white echo traces over black fog without terrain texture reveal.
- Hold-chain correction: completing a portable relay place/recover now consumes the current relay press until `E` or touch `RELAY` is released, preventing accidental immediate opposite-action countdowns. Focused `npm.cmd run test -- src/game/game.test.ts` passes with 73 tests, and the focused input/game/readability/tactical suite passes with 90 tests.
- Hold-chain validation evidence: `npm.cmd run validate` passes with 16 test files and 155 tests. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check` pass. Browser evidence inspected at `output/portable-relay-hold-chain-smoke/shot-0.png`; `state-0.json` reports `portableRelay.deployed: true`, `hold: null`, `portableRelaysPlaced: 1`, and `portableRelaysRecovered: 0` after holding the relay control longer than both place and recover durations.

## 2026-07-02 Offline Prototype Deployables

- Created branch `codex/offline-prototype-deployables` from current `main`; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Added offline player-only prototype deployables on held number keys: `1` decoy, `2` mine, `3` noise trap, `4` steel trap, and `5` tripwire signal. Existing portable relay remains on `E`, touch controls stay unchanged, and online input routing ignores all prototype gear buttons.
- Implemented one active device per type, held place/recover progress with press-consumption latching, save/continue restore for deployed devices and tank slow/immobilize state, player-facing gear/alert snapshots, and procedural device sprites.
- Device behavior: decoys create false red portable-relay echo contacts; mines trigger on hostiles within one tile for 2 damage plus 10s movement slow; noise/tripwire create investigate-only player-side alerts without fog reveal; steel traps immobilize tanks for 5s and warn enemy-side AI internally.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts` passes with 78 tests; `npm.cmd run test -- src/game/input.test.ts src/game/game.test.ts src/game/accessibilityReadability.test.ts src/game/tacticalEvaluation.test.ts` passes with 95 tests.
- Full validation evidence so far: `npm.cmd run validate` passes with 16 test files and 160 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check` pass.
- Browser evidence inspected: bundled web-game client produced `output/offline-prototype-deployables-smoke/web-client/shot-0.png`; gear probe screenshots `output/offline-prototype-deployables-smoke/gear-probe/hold-decoy.png` and `placed-decoy.png` show the `HOLD 1 DECOY` progress cue and placed decoy in the single-canvas fogged battlefield. `placed-decoy.json` reports `mode: "playing"`, `readableText.hud.gear: "GEAR 1/5"`, and an active decoy deployable.

## 2026-07-02 Hidden QA Integration Map

- Created branch `codex/hidden-qa-integration-map` from `origin/main` after PR #44 was merged; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Added a test-only `QA Integration Range` fixture with named coordinates and scenario presets for shell economy, ammo recharge, fixed relays, fog, portable relay echoes, deployable traps, objectives, AI routing, and save compatibility. The fixture is imported only by tests and is not registered in campaign levels, menus, browser routes, or runtime boot code.
- Focused evidence so far: `npm.cmd run test -- src/game/qaIntegrationLevel.test.ts` passes with 9 tests; `npm.cmd run test -- src/game/qaIntegrationLevel.test.ts src/game/game.test.ts src/game/input.test.ts src/game/accessibilityReadability.test.ts src/game/tacticalEvaluation.test.ts` passes with 104 tests.
- Full validation evidence: `npm.cmd run validate` passes with 17 test files and 169 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check` pass.
- Browser evidence inspected: bundled web-game client produced `output/hidden-qa-integration-map-smoke/web-client/shot-0.png` on the normal player-facing campaign path. `state-0.json` reports `mode: "playing"`, `level.name: "Outer Blocks"`, `readableText.hud.gear: "GEAR 0/5"`, and no QA fixture name in runtime state.

## 2026-07-02 Bot AI Architecture Pass

- Created branch `codex/bot-ai-architecture-pass` from freshly fetched `origin/main` after PR #45 landed; preflight confirmed scripts, `.agentic-harness/memory/`, and Product Review Warden with `open_blocking_count: 0`.
- Added deterministic offline bot AI modules under `src/game/ai/` for perception, confidence memory, utility scoring, behavior execution, weighted A*, and fire control. Existing role IDs are preserved while mapping `base_attacker` to Basic, `hunter` to Scout, and `wall_breaker` to Breaker.
- Integrated the AI adapter into the offline enemy loop while reusing existing `startMove`, `fire`, tile passability, shell collision, objective damage, fog, relay, and deployable alert systems. Online multiplayer, renderer surfaces, campaign maps, deployables, release/deploy/provider settings, and `.agentic-harness/deep-agents/` remain unchanged.
- Focused evidence: `npm.cmd run test -- src/game/ai/botAi.test.ts src/game/game.test.ts src/game/qaIntegrationLevel.test.ts` passes with 96 tests, covering pure AI modules, existing gameplay regressions, and QA-map integration for hidden-target non-firing, visible-target firing, alerts, and Breaker wall execution. `npm.cmd run build` also passes.
- Full validation evidence: `npm.cmd run validate` passes with 18 test files and 178 tests, production build, server smoke, harness validate, and harness smoke. Separate `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check` pass.
- Browser evidence inspected: bundled web-game client captured normal player-path gameplay under `output/bot-ai-architecture-smoke/web-client/shot-2.png`; `state-0.json` reports `mode: "playing"`, `level.name: "Outer Blocks"`, `teamVisionMerged: false`, `shotsFired: 1`, no QA fixture name, and no browser error file.

## 2026-07-02 Right-Click Context Menu Control Recovery

- Created branch `codex/right-click-control-recovery` from updated `origin/main`.
- Added canvas context-menu suppression, non-primary mouse filtering, and offline control release on window blur/context-menu cleanup.
- Added focused input/game regression tests; `npm.cmd run test -- src/game/input.test.ts src/game/game.test.ts` passed with 90 tests.
- Full validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, and `git diff --check`.
- Browser smoke passed against local Vite on `http://127.0.0.1:5178` with a right-click during active gameplay followed by movement/fire; inspected `output/right-click-control-recovery/web-client/shot-2.png` and `state-2.json`.

## 2026-07-02 PR #50 Reviewer App Waiver Evidence

- Recorded the explicit human waiver for `MISSING_REVIEWER_APP_EXACT_HEAD_APPROVAL` on PR #50 head `1ed0fe03510301c491d6c9e49fa3487d540b508f` in `docs/release/tanchiki2-pr50-reviewer-app-waiver-v1.md`; the waiver applies only to that already-merged head.
- Confirmed PR #50 is merged at merge commit `445316d0ab41719dd80af3968153bea07cb831bd`, with changed files limited to `progress.md`, `src/game/game.test.ts`, and `src/game/game.ts`.
- Confirmed GitHub CI `Validate` succeeded on head `1ed0fe03510301c491d6c9e49fa3487d540b508f`; current `origin/main` is `445316d0ab41719dd80af3968153bea07cb831bd`; local `npm.cmd run validate`, `npm.cmd run visual:contrast`, Review Warden, `git diff --check`, and `git diff --cached --check` passed.
- Attended-v2 continuation remains constrained to the existing harness path and generated docs/planning-only next packet, which validated with zero blockers and guard outcome `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`; no product source, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, or release action changed.

## 2026-07-02 Post-PR50 Release Readiness Reassessment

- Continued the existing attended-v2 path from current `origin/main` `1f89a6de71511a3650658f78fd3cdcd0c19b388a`, after PR #51 made the PR #50 Reviewer App waiver durable as remote Git evidence.
- Added `docs/release/tanchiki2-post-pr50-release-readiness-reassessment-v1.md` to reconcile merged PR #37 through PR #51 against stale RC1 release-action planning authority.
- Determined that current validation supports planning continuation, but the PR #36 RC1 release-action plan must not be used as current release authority after PR #37 through PR #50 changed gameplay/runtime behavior.
- Recommended next safe package `TANCHIKI2-POST-PR50-RELEASE-CANDIDATE-REFRESH`; no product source, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, or release action changed.

## 2026-07-02 Post-PR50 Release Candidate Refresh

- Continued from merged `origin/main` `172cf27b7fb159b0c8f1541dd223ed6788d03cd6` through the existing attended-v2 path and validated `D:\agentic-harness\tmp\tanchiki-post-pr50-rc-refresh-prompt.json` with zero blockers.
- Added `docs/release/tanchiki2-post-pr50-release-candidate-refresh-v1.md` and refreshed `docs/release/release-checklist.md` so current release-candidate evidence is anchored to the post-PR50 runtime rather than the older PR #36 RC1 plan.
- Current-head browser evidence passed under `output/post-pr50-release-candidate-refresh/`: offline campaign smoke, local online battle smoke, and mobile/touch smoke with `MOBILE_TOUCH_SMOKE_PASSED`; screenshots were inspected and nonblank/coherent.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`; no product source, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, external provider, or release action changed.

## 2026-07-02 Post-PR50 Release Action Authorization Pause

- Continued from merged `origin/main` `d6282887bad2db0a23bbc555bd0699636a14b8fe` through the existing attended-v2 path and validated `D:\agentic-harness\tmp\tanchiki-post-pr50-release-action-authorization-prompt.json` with zero blockers.
- Recorded the human decision state `RELEASE_PAUSED_NO_EXECUTION_AUTHORIZED` for source head `d6282887bad2db0a23bbc555bd0699636a14b8fe` in `docs/release/tanchiki2-post-pr50-release-action-authorization-v1.md`.
- Updated `docs/release/release-checklist.md` so future release execution requires exact source head, deployment/publishing target, deployment/publishing method, tag decision, announcement decision, rollback target, and any protected-surface exceptions.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No product source, tests, workflows, harness adapter, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, external provider, or release action changed.

## 2026-07-02 Post-PR50 Release Target Selection

- Continued from merged `origin/main` `dbaf0db6c4310edb32cbe03860f3a435d007185d` after confirming `package.json` has `build` and `preview` scripts but no committed `deploy` or `publish` script.
- Searched committed repo files for deploy/publish/GitHub Pages/Vercel/Netlify/Cloudflare target configuration; no committed release target configuration was found.
- Recorded decision state `RELEASE_TARGET_SELECTED_FOR_PLANNING_ONLY` in `docs/release/tanchiki2-post-pr50-release-target-selection-v1.md`, selecting GitHub Pages static site as the planning target.
- Proposed future method: a future GitHub Actions workflow builds with `npm.cmd run build` and publishes generated `dist/` to GitHub Pages.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No product source, tests, workflows, harness adapter, GitHub Pages enablement, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, external provider, or release action changed.

## 2026-07-02 Post-PR50 GitHub Pages Implementation Planning

- Continued from merged `origin/main` `f0b330cdc7f4cf4e04c93795250e50d64c045ed3` after confirming `package.json` has `build` and `preview` scripts but no committed `deploy` or `publish` script.
- Confirmed `.github/workflows/validate.yml` is the only workflow and no committed GitHub Pages/Vercel/Netlify/Cloudflare/Firebase/Render/CNAME/.nojekyll/deploy/publish config exists.
- Added `docs/release/tanchiki2-post-pr50-github-pages-implementation-plan-v1.md` with decision state `GITHUB_PAGES_IMPLEMENTATION_PLAN_READY`.
- Planned a future `.github/workflows/deploy-github-pages.yml` with `workflow_dispatch`, `contents: read`, `pages: write`, `id-token: write`, environment `github-pages`, `npm ci`, `npm run build`, and `dist/` Pages artifact upload/deploy steps.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow, GitHub Pages enablement, product source, tests, harness adapter, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, external provider, or release action changed.

## 2026-07-02 Post-PR50 GitHub Pages Workflow Implementation

- Continued from merged `origin/main` `a1531327a481e7120ca4af8dc38a9444897f70f6` after explicit human authorization to implement, but not execute, the GitHub Pages workflow.
- Created `.github/workflows/deploy-github-pages.yml` with `workflow_dispatch` only; it runs `npm ci`, `npm run build`, uploads `dist/` as the Pages artifact, and defines the Pages deploy job for future manual release execution.
- Verified current official action release tags before committing the workflow: `actions/checkout@v7.0.0`, `actions/setup-node@v6.4.0`, `actions/upload-pages-artifact@v5.0.0`, and `actions/deploy-pages@v5.0.0`.
- Added `docs/release/tanchiki2-post-pr50-github-pages-workflow-implementation-v1.md` with decision state `GITHUB_PAGES_WORKFLOW_IMPLEMENTED_NOT_EXECUTED`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- The standing docs/planning-only waiver does not apply because this package changes `.github/workflows/**`; merge requires exact-head Reviewer App approval/attestation or explicit human waiver after validation is clean.
- No product source, tests, package scripts, harness adapter, GitHub Pages enablement, workflow dispatch, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, rollback, external provider, or release action changed.

## 2026-07-02 GitHub Pages Deployment Repair

- Investigated failed GitHub Pages workflow runs `28605894174` and `28607095099` for source head `831ac57a0b2cfbbbef1f89f3d0ff0e7d9b9ed243`; both built and uploaded the `github-pages` artifact, then remained `deployment_queued` until `actions/deploy-pages@v5.0.0` timed out and canceled the Pages deployment.
- Verified Pages configuration: `build_type: workflow`, URL `https://urkrass.github.io/tanchiki2/`, HTTPS enforced, and `github-pages` environment branch policy allowing `main`.
- Repaired the manual-only workflow by adding `actions/configure-pages@v6.0.0`, granting the build job the required `pages: write` permission while keeping `contents: read`, and increasing the deploy action timeout to 30 minutes with a 35-minute job timeout.
- Added `docs/release/tanchiki2-github-pages-deployment-repair-v1.md` with decision state `GITHUB_PAGES_DEPLOYMENT_REPAIR_READY_FOR_RETRY_AUTHORIZATION`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow dispatch, product source, tests, game logic, package dependency, tag, announcement, secret, billing, branch-protection, rollback-policy, rollback-removal, external-provider, or non-GitHub-Pages release action changed.

## 2026-07-02 GitHub Pages Deployment Wait Repair

- Investigated authorized clean retry run `28609482595` for source head `b45363845a8cdaad49333b6ce4c1f14c8079518d`; the build job succeeded, uploaded the `github-pages` artifact `8046828417`, and the deploy job failed after the Pages deployment stayed queued.
- Confirmed GitHub deployment record `5288600813` targeted environment `github-pages`, source SHA `b45363845a8cdaad49333b6ce4c1f14c8079518d`, and ref `main`, then ended in failure after `actions/deploy-pages@v5.0.0` timed out and canceled the deployment.
- Verified `actions/deploy-pages@v5.0.0` caps timeout at `600000` milliseconds and cancels pending deployments on timeout, so the previous `timeout: 1800000` workflow input could not take effect.
- Repaired the manual-only workflow by creating the Pages deployment through the GitHub Pages API, polling for up to 30 minutes, and leaving a queued backend deployment uncanceled if GitHub Pages does not report success before the wait expires.
- Added `docs/release/tanchiki2-github-pages-deployment-wait-repair-v1.md` with decision state `GITHUB_PAGES_DEPLOYMENT_WAIT_REPAIR_READY_FOR_RETRY_AUTHORIZATION`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow dispatch, deployment, publishing, product source, tests, game logic, package dependency, tag, announcement, secret, billing, branch-protection, rollback-policy, rollback-removal, external-provider, or non-GitHub-Pages release action changed.

## 2026-07-02 GitHub Pages Base Path Repair

- Investigated successful deployment run `28611138626` for source head `1559cd7ab1911c7abc8e51995a70dc3eeb0a4f20`; Pages reported `succeed` but live browser smoke found zero canvas elements.
- Confirmed the published HTML referenced `/assets/index-BedFxgZK.js` and `/assets/index-Bc-eb6z6.css`, which resolved to `https://urkrass.github.io/assets/...` and returned `404`; the assets existed under `https://urkrass.github.io/tanchiki2/assets/...`.
- Added `vite.config.ts` with `base: '/tanchiki2/'` so the GitHub Pages project site build emits repository-prefixed asset URLs.
- Local build evidence confirmed generated HTML now references `/tanchiki2/favicon.svg`, `/tanchiki2/assets/index-BedFxgZK.js`, and `/tanchiki2/assets/index-Bc-eb6z6.css`.
- Added `docs/release/tanchiki2-github-pages-base-path-repair-v1.md` with decision state `GITHUB_PAGES_BASE_PATH_REPAIR_READY_FOR_REDEPLOY_AUTHORIZATION`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow dispatch, deployment retry, publishing retry, tag, announcement, secret, billing, branch-protection, rollback-policy, rollback-removal, external-provider, or non-GitHub-Pages release action changed before merge.

## 2026-07-02 GitHub Pages Relative Base Repair

- Investigated failed redeploy run `28612400957` for source head `ef6a187c86fac62a15e53831da08a901744ee246`; the build job passed, uploaded Pages artifact `8047994978`, and GitHub Pages reported `deployment_failed`.
- Confirmed the failed artifact was structurally valid, included the repaired `/tanchiki2/assets/...` HTML, and had no symlinks or oversized content.
- Confirmed the live site still served the prior faulty HTML after the failed redeploy.
- Changed `vite.config.ts` from absolute base `/tanchiki2/` to relative base `./`, so project-site asset URLs resolve under the repository path without absolute artifact URLs.
- Local build evidence confirmed generated HTML now references `./favicon.svg`, `./assets/index-BedFxgZK.js`, and `./assets/index-Bc-eb6z6.css`.
- Added `docs/release/tanchiki2-github-pages-relative-base-repair-v1.md` with decision state `GITHUB_PAGES_RELATIVE_BASE_REPAIR_READY_FOR_REDEPLOY`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow dispatch, deployment retry, publishing retry, tag, announcement, secret, billing, branch-protection, rollback-policy, rollback-removal, external-provider, or non-GitHub-Pages release action changed before merge.

## 2026-07-02 GitHub Pages Sprite Base Repair

- Investigated successful redeploy run `28612828153` for source head `f720cec20f9ff789a8b53868a34720f66cc3f606`; the workflow completed successfully and the live app reached nonblank gameplay.
- Browser smoke still failed because sprite atlas requests used root-scoped `/assets/sprites/...` URLs, producing 404 console errors under `https://urkrass.github.io/assets/sprites/...`.
- Repaired `src/game/spriteAtlas.ts` and `src/game/uiAtlas.ts` so sprite sheet URLs resolve through Vite `import.meta.env.BASE_URL`; local build output now uses project-relative sprite paths under the current `./` base.
- Added `docs/release/tanchiki2-github-pages-sprite-base-repair-v1.md` with decision state `GITHUB_PAGES_SPRITE_BASE_REPAIR_READY_FOR_REDEPLOY`.
- Local validation passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `git diff --check`, and `git diff --cached --check`.
- No workflow dispatch, deployment retry, publishing retry, tag, announcement, secret, billing, branch-protection, rollback-policy, rollback-removal, external-provider, or non-GitHub-Pages release action changed before merge.

## 2026-07-02 Encyclopedia Menu

- Created branch `codex/tanchiki2-encyclopedia-menu` from GitHub `main` head `fd8abe640dc3430e2ae67fb88bbd845374d36827`.
- Generated explicit attended-v2 package artifacts under `D:\agentic-harness\tmp\`; prompt validation passed and attended-v2 guard returned `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`.
- Replaced the main-menu `How To Play` entry with `Encyclopedia`, preserving controls/recovery copy as a topic and adding Overview, Tanks, Objectives, Equipment, and Terrain topics on the existing single overlay.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts src/game/accessibilityReadability.test.ts` passed with 83 tests.
- Full local gates passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, and `git diff --check`.
- Web-game Playwright client evidence captured under `output/encyclopedia-menu-smoke-2/`: main menu, Encyclopedia overview, and Controls topic screenshots plus `render_game_to_text` state snapshots. The first pass showed the Overview copy crowding the topic list, so the helper text was shortened before final captures.
- No deployment, publishing, tag, announcement, production setting, secret, billing, branch protection, rollback, or external-provider change was made.

## 2026-07-03 Encyclopedia Detail Correction

- Corrected the first Encyclopedia pass from a selector-only topic list into pressable illustrated detail pages. Topic list remains the calm entry point; selecting a topic now opens a focused page with existing game visuals for tanks, objectives, equipment, terrain, and controls.
- Added `encyclopedia` snapshot/readableText payload entries so `render_game_to_text` exposes active topic, entry labels, descriptions, and visual keys.
- Focused evidence: `npm.cmd run test -- src/game/game.test.ts src/game/accessibilityReadability.test.ts` and `npm.cmd run build` passed before browser capture.
- Web-game Playwright client evidence captured under `output/encyclopedia-detail-smoke/`: Tanks, Equipment, and Terrain detail pages open from the main menu and expose illustrated `render_game_to_text` entries. Screenshots were inspected; the detail overlay was made less transparent after the first capture showed the live map competing with encyclopedia content.
- Revalidated GitHub `main` remained `fd8abe640dc3430e2ae67fb88bbd845374d36827`. Revised attended-v2 prompt artifacts were generated under `D:\agentic-harness\tmp\`; prompt validation passed and attended-v2 guard returned `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`.
- Full local gates passed: `npm.cmd run validate`, `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, and `git diff --check`.

## 2026-07-03 Attended-v2 AI Fog Tension

- Created clean worktree `D:\projects\tanchiki-attended-v2-ai-fog` on branch `codex/attended-v2-ai-fog` from `origin/main` `1236e1c903b6bb915786da0a58317e875c549706`, which already includes the attended-v2 lifecycle LangSmith consumer script.
- Improved offline bot uncertainty handling without changing online protocol, release infrastructure, workflow dispatch, deployment, publishing, tagging, announcement, production settings, secrets, billing, branch protection, or rollback policy.
- Bots still require visible confident targets for tank fire; fresh hidden contacts now brake blind objective pressure, pause objective shots, mark nearby suspected cells as path risk, and move investigation toward cautious scouting positions instead of directly rushing the exact last-known cell.
- Added aggregate `render_game_to_text()` AI diagnostics with policy `visible-fire-scout-uncertainty`, active bot count, belief count, uncertain-contact count, visible attack-contact count, and `hiddenCoordinateLeak: false`.
- Focused evidence so far: `npm.cmd run test -- src/game/ai/botAi.test.ts src/game/game.test.ts` passed with 91 tests after `npm.cmd ci` installed this fresh worktree's dependencies.
- Full validation evidence: `npm.cmd run validate` passed with 18 test files and 189 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:attended-v2:lifecycle-trace-smoke`, `git diff --check`, and `git diff --cached --check` passed.
- Web-game Playwright client evidence captured under `output/attended-v2-ai-fog/web-client-final/`: `shot-2.png` was inspected; `state-2.json` reports `mode: "playing"`, circular fog, `lastKnownCount: 1`, `ai.policy: "visible-fire-scout-uncertainty"`, `uncertainContactCount: 2`, `visibleAttackContactCount: 0`, `hiddenCoordinateLeak: false`, and no console error file.

## 2026-07-03 Cautious Fog AI Tuning V2

- Packaged `TANCHIKI2-AI-FOG-TUNING-V2` on branch `codex/tanchiki2-ai-fog-tuning-v2` from current `origin/main`, preserving `hiddenCoordinateLeak: false` and avoiding trap/decoy mechanics, release infrastructure, deployment, publishing, tags, announcements, production settings, secrets, billing, and branch-protection changes.
- Added focused AI/fog regressions for stale visible beliefs, scout-vs-objective pressure, blind-fire suppression, and game-level stale-coordinate fire.
- Tuned bot memory so contacts not refreshed by current vision become investigate-only hidden beliefs, while fresh visible percepts still restore confirmed attack state.
- Tuned utility scoring so credible nearby and mid-range suspicious fog alerts still pull investigation, low-confidence distant stale signals lose weight, and objective pressure remains strong enough to prevent passive wandering.
- Followed up on Codex review by ranking competing investigate candidates with the same distance-weighted score used for the emitted investigate intention, so a distant stale belief cannot suppress a nearby credible fog alert.
- Tightened fire control and cell-target bridging so hidden coordinates and arbitrary empty cells are not treated as confidence-1 firing targets; explicit objective cells remain shootable.
- Focused evidence: `npm.cmd test -- src/game/ai/botAi.test.ts src/game/game.test.ts` passed with 96 tests.
- Full validation evidence: `npm.cmd run validate` passed with 18 test files and 194 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Review Warden evidence: `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reported `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, and no finding codes.
- Browser evidence inspected: bundled web-game Playwright client captured active gameplay at `output/cautious-fog-ai-smoke-v2/web-client/shot-0.png`; `state-0.json` reports `mode: "playing"`, `shotsFired: 1`, `fog.teamVisionMode: "solo"`, `fog.hiddenCellCount: 320`, `ai.policy: "visible-fire-scout-uncertainty"`, `ai.hiddenCoordinateLeak: false`, and no browser error file.

## 2026-07-03 Garage Major Mods

- Replaced selectable Garage RPG upgrades with one selectable Major Mod while leaving Utility Mods class-specific and non-selectable.
- Added Overdrive, Pontoon Bridge, Czech Hedgehog, and EMP Emitter mechanics; every tank now leaves weight-based tread traces, with Overdrive doubling track persistence while active.
- Preserved legacy upgrade save normalization for compatibility, but effective player stats now come from fixed tank-class identity rather than upgrade levels.
- Focused evidence so far: `npm.cmd run game:smoke` passed with 95 tests, and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 206 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Product Review Warden and Deep Agent stub runtime also passed.
- Visual evidence: `npm.cmd run visual:contrast` passed after updating its smoke path for the current Campaign/Tank Select flow; bundled web-game Playwright client captured inspected gameplay and Garage Mods screenshots under `output/garage-major-mods-smoke/`.
- Live attended-v2 LangSmith telemetry dispatched after verifying `urkrass/agentic-harness` branch `codex/mar-693-empty-base` resolves to `69df33aafbe6f2738b87419d449fd3ee4f84f018`; GitHub Actions run `28679236736` completed successfully.
- Scope guard: no recon flare, online protocol change, deployment, publishing, tag, announcement, production setting, secret, billing, branch-protection, or rollback-policy change was made.

## 2026-07-04 Garage Major Mods Follow-up

- Fixed reported Mod behavior: Czech Hedgehogs now trap player, friendly, and enemy tanks; use exact direct-hit counters instead of HP; and remain spent after destruction for the rest of the mission.
- Overdrive can now activate while the player tank is already moving and immediately shortens the active move's remaining duration.
- Pontoon bridges now preserve the underlying water tile and render as a bridge overlay while movement/pathfinding treats bridged water as passable.
- Tread traces were made brighter and higher-contrast; EMP emitters now expose fade progress for smoother relay-field disappearance and render expanding pulse rings.
- Follow-up trace sprite pass: replaced the two-bar tread marks with paired belts, repeated diagonal tread lugs, dark outer edges, and deterministic dirt speckles so traces read more like tank tracks.
- Trace orientation follow-up: corrected tread trace rotation so each pair of belts follows the tank's movement direction instead of sitting 90 degrees across the path.
- Corner trace follow-up: tread snapshots now keep their source tank id, and the renderer draws same-tank perpendicular turn elbows so turns leave organic corner traces between straight tread marks.
- Continuous trace correction: straight tread marks now render as overlapping center-to-center movement segments, and corner elbows draw after straight segments so turns blend the connected path instead of sitting as separate tile stamps.
- Trace timing correction: tread tracks are now emitted only after a movement completes, using the completed move direction, so tracks no longer appear in a tile before the tank has occupied it.
- Focused evidence so far: `npm.cmd run game:smoke`, `npm.cmd run test`, and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 207 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/garage-major-mods-followup/`: bundled client trace screenshot `traces-client-rerun/shot-0.png` shows visible tread marks; targeted Mod probes show pontoon overlay over preserved water, visible five-hit hedgehog, and EMP emitter pulse rings.
- Trace sprite browser evidence inspected under `output/garage-major-mods-trace-sprite-neutral/`: bundled client screenshot `shot-0.png` and zoom crop `trace-crop-zoom.png` show paired neutral tread belts with diagonal lug marks and broken dirt edges; `state-0.json` reports three visible tracks and no browser error file.
- Trace orientation browser evidence inspected under `output/garage-major-mods-trace-orientation/`: bundled client screenshot `shot-0.png` and zoom crop `trace-crop-zoom.png` show down-movement tracks running vertically behind the tank path; `state-0.json` reports three visible tracks and no browser error file.
- Trace corner browser evidence inspected under `output/garage-major-mods-trace-corner/`: bundled client screenshot `shot-0.png` and zoom crop `trace-corner-crop-zoom.png` show an organic muddy elbow at the down-to-right turn; `state-0.json` reports same-tank `tankId` traces and no browser error file.
- Continuous trace browser evidence inspected under `output/garage-major-mods-trace-continuous-longer/`: bundled client screenshot `shot-0.png` and zoom crop `trace-continuous-longer-crop-zoom.png` show overlapping center-to-center tread segments continuing through the down-to-right turn; `state-0.json` reports five same-tank `tankId` traces and no browser error file.
- Trace timing browser evidence inspected under `output/garage-major-mods-trace-timing/`: `in-progress-valid/state-0.json` reports `player.moving: true` with `majorMods.tracks: []`, while `completed/state-0.json` reports a completed same-tank trace behind the tank; both probes had no browser error file.
- Trace fog fade follow-up: tread snapshots now keep a per-track visibility alpha and last-seen timestamp, so seen tracks fade for 0.8s after leaving player vision instead of disappearing as whole tile objects; never-seen hidden tracks remain omitted.
- Focused evidence: `npm.cmd run game:smoke` passed with 97 tests and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 208 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/garage-major-mods-trace-fog-fade/client/`: `shot-0.png` shows older lower-lane traces fading into fog, and `state-0.json` reports partial track visibilities `0.06`, `0.08`, and `0.56` with no browser error file.
- Continuous texture follow-up: straight tread traces now merge consecutive same-tank, same-direction segments into one rendered run with no artificial segment-length overlap; tread lugs and dust cadence are generated once across the full run.
- Focused evidence: `npm.cmd run game:smoke` passed with 97 tests and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 208 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/garage-major-mods-trace-continuous-run-final/`: bundled client screenshot `client/shot-0.png` and zoom crop `trace-run-crop-zoom.png` show the lower horizontal tracks rendered as one continuous tread run instead of repeated overlapping segment stamps; no browser error file.
- Live trace follow-up: moving tanks now draw a visual-only tread span from the move source toward the current interpolated tank position, so the trail no longer appears one tile late while preserving completed-move-only committed track emission.
- Focused evidence: `npm.cmd run game:smoke` passed with 97 tests and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 208 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/garage-major-mods-trace-live/`: `client-late/state-0.json` reports `player.moving: true` with `majorMods.tracks: []`, while `live-crop-zoom.png` shows the live tread segment behind the moving tank; no browser error file.
- Live trace cap cleanup: the visual-only moving trace now runs rear-edge to rear-edge, uses square live caps, and suppresses end dust so a separate post-like cap no longer appears immediately behind the tank.
- Focused evidence: `npm.cmd run game:smoke` passed with 97 tests and `npm.cmd run build` passed.
- Full local evidence: `npm.cmd run validate` passed with 18 test files and 208 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry smoke. Separate `npm.cmd run visual:contrast`, Product Review Warden, `npm.cmd run harness:deep-agent:stub-runtime`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/garage-major-mods-trace-live-trim/`: `client/state-0.json` reports `player.moving: true` with `majorMods.tracks: []`, while `live-trim-crop-zoom.png` shows the trimmed live tread span without the post-like cap; no browser error file.

## 2026-07-04 Battlefield Biome Props Foundation

- Created branch/worktree `codex/tanchiki2-battlefield-biomes-props` at `D:\projects\tanchiki-battlefield-biomes-props` from `origin/main` `17d216106680deadc5527351f431d9f8b6e42e91`.
- Added the initial JSON prop manifest at `src/game/assets/battlefield-props.manifest.json`, covering the requested biome categories, prop categories, mechanical roles, and all initial prop example ids.
- Added `src/game/battlefieldProps.ts` with manifest lookup, validation helpers, prop-instance resolution, category/role summaries, and procedural fallback render plans for placeholder or missing art.
- Added `BattlefieldPropInstance` level placement support, a full-visibility dev showcase level at `?devLevel=battlefield_biomes_props`, and fog-aware `battlefieldProps` snapshots for render/test state.
- Focused evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts src/game/terrainEvidence.test.ts src/game/game.test.ts` passed with 3 files and 121 tests after `npm.cmd ci` installed this fresh worktree's dependencies.
- Full local evidence: `npm.cmd run validate` passed with 20 test files and 232 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run wrapper validation, and attended-v2 lifecycle telemetry wrapper validation. Separate `npm.cmd run visual:contrast`, `git diff --check`, and `git diff --cached --check` passed.
- Browser evidence inspected under `output/battlefield-biomes-props-smoke/client/`: `shot-1.png` shows the active gameplay QA board with placeholder prop rows visible; `state-1.json` reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six prop categories represented, all mechanical roles except unused `none` represented, `fogHidden: 0`, and no browser error file.
- Scope guard: no map editor, final pixel-art pass, engine migration, dependency, online protocol, deployment, publishing, tag, announcement, production setting, secret, billing, branch-protection, or rollback-policy change was made.

## 2026-07-04 Battlefield Prop Atlas Replacement

- Created branch/worktree `codex/tanchiki2-battlefield-props-atlas-replacement` at `D:\projects\tanchiki-battlefield-props-atlas-replacement` from merged foundation commit `a852fc6dff1afeb28ad61b9c3881c87e8529f5e5`.
- Kept all 34 existing battlefield prop ids and source rectangles stable.
- Repointed the existing `battlefield-props-placeholder` atlas key to `public/assets/sprites/battlefield-props.atlas.svg` while preserving the 8-column, 32px cell grid.
- Added original SVG atlas cells for all current prop examples so render can use atlas sprites instead of only procedural silhouettes.
- Added `src/game/battlefieldPropAtlas.ts` as a small non-blocking atlas loader/drawer with graceful false-return fallback.
- Updated Canvas prop rendering to draw atlas sprites first and retain procedural placeholders when atlas data or image loading is unavailable.
- Validation evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 9 focused atlas/manifest/showcase tests; `npm.cmd run test` passed with 20 files and 236 tests; `npm.cmd run build`, `npm.cmd run visual:contrast`, and `npm.cmd run validate` passed.
- Browser evidence inspected under `output/battlefield-props-atlas-smoke/client/`: `shot-1.png` shows atlas-backed prop sprites on the active `battlefield_biomes_props` board; `state-1.json` reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biome categories represented, all six prop categories represented, `fogHidden: 0`, and no browser error file.

## 2026-07-04 Battlefield Props Visual Polish

- Created branch/worktree `codex/tanchiki2-battlefield-props-visual-polish` at `D:\projects\tanchiki-battlefield-props-visual-polish` from merged atlas replacement commit `17a9d5872a412676e4d28d83a35855f885c858e1`.
- Pre-edit audit confirmed atlas dimensions `256x160`, `viewBox="0 0 256 160"`, 32x32 cells, 8 columns, 5 rows, 34 manifest prop sprites, 34 matching SVG groups, all six biomes, and all six prop categories.
- Polished only `public/assets/sprites/battlefield-props.atlas.svg`: stronger silhouettes, clearer trees/palm/pine/logs/rocks, distinct bush/reed biomes, more readable crates/barrels/sandbags/wire, debris/wreck/crater/rubble shapes, and stronger signal infrastructure cues.
- Preserved existing prop ids, atlas path, source slots, manifest metadata, renderer behavior, procedural fallback, showcase route, and gameplay mechanics.
- Added focused tests for SVG root dimensions and group transforms matching manifest source slots.
- Validation evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 9 focused atlas/manifest/showcase tests; `npm.cmd run test` passed with 20 files and 236 tests; `npm.cmd run build`, `npm.cmd run visual:contrast`, and `npm.cmd run validate` passed.
- Browser evidence inspected under `output/battlefield-props-visual-polish-smoke/client/`: `shot-1.png` shows the polished atlas sprites on the active `battlefield_biomes_props` board; `state-1.json` reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biome categories represented, all six prop categories represented, `fogHidden: 0`, and no browser error file.

## 2026-07-04 Battlefield Props Readability QA

- Created branch/worktree `codex/tanchiki2-battlefield-props-readability-qa` at `D:\projects\tanchiki-battlefield-props-readability-qa` from `origin/main` merge commit `137ec90405be3b18eb380c1d7e8c1ebda1a3f77e`.
- Reporting-only QA pass: no prop ids, atlas slots, renderer behavior, gameplay mechanics, online protocol, terrain mechanics, or map editor scope were changed.
- Pre-QA audit confirmed atlas dimensions `256x160`, `viewBox="0 0 256 160"`, 32x32 cells, 8 columns, 5 rows, 34 manifest prop sprites, 34 matching SVG groups, all six biomes, and all six prop categories.
- Started branch-local Vite server on `http://127.0.0.1:5195/?devLevel=battlefield_biomes_props` and captured screenshots under `output/battlefield-props-readability-qa/`.
- Screenshot/state evidence confirmed `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biomes/categories represented, `fogHidden: 0`, and no browser error artifact.
- Added QA report `docs/qa/battlefield-props-readability-qa.md` and machine-readable summary `qa/playwright/battlefield-props-readability-summary.json`.
- Current QA verdict: 24 pass, 9 minor, 1 major, 0 blocker. The major issue is that the showcase rotates `fallen_log_vertical` 90 degrees, so the route does not actually prove the vertical-log sprite at gameplay scale.
- Validation evidence: `npm.cmd run test` passed with 20 files and 236 tests; `npm.cmd run build` passed; `npm.cmd run visual:contrast` passed; `npm.cmd run validate` passed, including server smoke, harness validate/smoke, Reviewer App dry-run, and attended-v2 lifecycle smoke. `git diff --check` passed with only the repo's CRLF warning for `progress.md`.

## 2026-07-04 Battlefield Props Targeted Visual Fixes

- Created stacked branch `codex/tanchiki2-battlefield-props-targeted-visual-fixes` from the readability QA branch/worktree.
- Removed the `fallen_log_vertical` showcase rotation so the QA board proves the vertical sprite at gameplay scale, and added a focused test assertion preventing that regression.
- Targeted only the named SVG cells: improved `bush` edge contrast, made `stump` less crate-like, strengthened `portable_relay` and `broken_relay` antenna silhouettes, and toned down `field_lamp`.
- Added follow-up QA note `docs/qa/battlefield-props-targeted-visual-fixes.md`.
- Browser evidence captured under `output/battlefield-props-targeted-visual-fixes/`; `smoke-state.json` reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biomes/categories represented, `fallen_log_vertical.rotation: 0`, and no browser error artifact.
- Focused evidence so far: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 9 tests; atlas audit still reports `256x160`, 34 sprite groups, and no manifest/source mismatches.
- Full validation evidence: `npm.cmd run test` passed with 20 files and 236 tests; `npm.cmd run build` passed; `npm.cmd run visual:contrast` passed; `npm.cmd run validate` passed, including server smoke, harness validate/smoke, Reviewer App dry-run, and attended-v2 lifecycle smoke.

## 2026-07-04 Soft-Cover Vegetation Mechanics

- Created branch `codex/tanchiki2-soft-cover-vegetation-mechanics` from merged `origin/main`.
- Added prop-backed soft-cover mechanics for existing `bush`, `dry_bush`, `snow_bush`, and `reeds_cluster` manifest ids.
- Stationary tanks in soft cover now receive deterministic concealment metadata; movement through soft cover creates rustle/disturbance evidence; firing from soft cover briefly suppresses concealment.
- Added dev route `?devLevel=soft_cover_vegetation_test` and focused unit/snapshot tests for manifest sourcing, concealment, movement evidence, firing reveal, expiration, class disturbance scaling, and valid dev-map references.
- Updated docs with `docs/soft-cover-vegetation-mechanics.md` and linked the pass from `docs/battlefield-biomes-and-props.md`.

## 2026-07-04 Battlefield Props Scale And Realism Polish

- Created stacked worktree `D:\projects\tanchiki-battlefield-props-scale-realism-polish` on branch `codex/tanchiki2-battlefield-props-scale-realism-polish` from `codex/tanchiki2-soft-cover-vegetation-mechanics` while PR #77 remained open.
- Added manifest `renderOffset` metadata and renderer support so selected props can draw larger than their 32x32 atlas source slot while keeping the tile coordinate as the mechanical anchor.
- Scaled large visual props only: trees, pine, palm, logs, large rock, soft-cover vegetation, tank wreck, rubble, roadblock, relay tower, antenna mast, generator, EMP emitter, and signal jammer. Small clutter and decorations remain tile-sized.
- Reworked the tree, pine, and palm SVG cells with less square silhouettes, stronger trunks, visible roots/shadows, and more natural asymmetry.
- Adjusted the `battlefield_biomes_props` QA board into spaced proof bands so larger natural and infrastructure sprites do not crowd their neighbors.
- Browser evidence inspected under `output/battlefield-props-scale-realism-polish/`: `client-rerun/shot-1.png` and `prop-board-crop.png` show larger trees and scaled props; `client-rerun/state-1.json` reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biomes, all six prop categories, `fogHidden: 0`, and no console error artifact.
- Validation evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 10 focused prop tests; `npm.cmd run test` passed with 21 files and 246 tests; `npm.cmd run build`, `npm.cmd run visual:contrast`, `npm.cmd run validate`, standalone `npm.cmd run harness:attended-v2:lifecycle-trace-smoke`, `git diff --check`, and `git diff --cached --check` passed. Diff checks only emitted the repo's normal CRLF warnings.

### Figma-Guided Sprite Redesign Follow-up

- Created Figma design source: `https://www.figma.com/design/baaEO3sJkIQkUTFsjFdHul`.
- Redrew all 34 atlas cells with stronger silhouettes and more grounded battlefield proportions.
- Bumped atlas cache path to `assets/sprites/battlefield-props.atlas.svg?v=17`.
- Preserved prop ids, render bounds metadata, gameplay footprint, soft-cover mechanics, renderer behavior, and fallback behavior. Ordinary props keep 32x32 source cells; tree-class blockers now use larger atlas source rectangles.
- Captured the live showcase into the Figma source at `https://www.figma.com/design/baaEO3sJkIQkUTFsjFdHul?node-id=2-2`.
- Browser evidence inspected under `output/battlefield-props-figma-redesign/`: `figma-capture-node-2-2.png`, `client/shot-1.png`, `client/prop-board-crop.png`, and `client/state-1.json`. The state reports `mode: "playing"`, `propsTotal: 34`, `propsVisible: 34`, all six biomes, all six prop categories, `fogHidden: 0`, and no console error artifact.
- Validation evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 10 focused tests; `npm.cmd run test` passed with 21 files and 246 tests; `npm.cmd run build`, `npm.cmd run visual:contrast`, `npm.cmd run validate`, standalone `npm.cmd run harness:attended-v2:lifecycle-trace-smoke`, `git diff --check`, and `git diff --cached --check` passed. Diff checks only emitted the repo's normal CRLF warnings.
- Dense-source tree correction: expanded the atlas to `256x256`, moved `tree_small`, `tree_large`, `pine`, and `palm` to larger source rectangles below the original 8x5 grid, and redrew those props with richer source detail. The palm now uses an 80x96 source region instead of an enlarged 32x32 cell, with broader curved fronds to replace the earlier jagged leaf wedges.
- Palm leaf follow-up: replaced the starburst-style palm canopy with drooping curved fronds, softened the outline to dark green, and shifted the showcase board down one tile so tall tree-class sprites are not clipped by the HUD edge.
- Tree and pine naturalization follow-up: replaced rectangular tree leaf highlights and pine snow bands with uneven polygon patches, then added a focused SVG regression test to keep these dense-source tree details from reverting to bars.
- Log and stump enrichment follow-up: redrew `stump`, `fallen_log_horizontal`, and `fallen_log_vertical` with cut rings, bark cracks, uneven highlights, root chips, knots, and small moss accents while preserving their existing source slots, dimensions, IDs, and mechanics.
- Stone enrichment follow-up: redrew `rock_small` and `rock_large` as faceted angular stone clusters with dusty undersides and small chips while preserving their existing source slots, dimensions, IDs, and blocking metadata.
- Rock variant follow-up: added `cracked`, `moss`, `snow`, and `angled` atlas source variants for both `rock_small` and `rock_large`, wired prop instance `variant` through atlas rendering, and added a showcase variant proof strip without introducing new prop IDs or mechanics.
- Rock variant correction: kept fracture lines only on the explicit `cracked` variants. Base rocks plus `moss`, `snow`, and `angled` variants now use intact facets rather than broken/cracked visual language.
- Tree/palm/log/stone correction evidence: `output/battlefield-props-dense-tree-sources/skill-client-rock-variants-v17-intact/shot-1.png` shows the shifted showcase board with rock variants; `rock-variant-board-crop.png` isolates the variant proof strip; `state-1.json` reports 42 visible prop instances, 34 unique sprite IDs, all 8 rock variants visible, and no console error artifact.
- Latest validation evidence: `npm.cmd run test -- src/game/battlefieldProps.test.ts` passed with 15 focused tests; `npm.cmd run visual:contrast` passed; `npm.cmd run build` passed; `npm.cmd run validate` passed with 21 files and 251 tests plus build, server smoke, harness validate/smoke, Reviewer App dry-run, and attended-v2 lifecycle telemetry.

## 2026-07-04 Terrain Evidence Prototype

- Created clean worktree `D:\projects\tanchiki-terrain-evidence-prototype` on branch `codex/tanchiki2-terrain-evidence-prototype` from `origin/main`, leaving the dirty planning doc in `D:\projects\tanchiki` untouched.
- Added serializable terrain definitions, parser chars, and hidden dev launch URL `?devLevel=terrain_evidence_test` for the offline `Terrain Evidence Test` map.
- Implemented offline terrain mechanics for swamp, snow, dust, gravel, metal slide, reeds concealment/rustle, ricochet deflection, and echo-displaced evidence without changing online/shared multiplayer.
- Added `terrainEvidence` snapshots, track `surface`, bullet `ricochets`, minimap/render colors, canvas terrain/evidence glyphs, and docs at `docs/terrain-evidence-system.md`.
- Focused evidence so far: `npm.cmd run test -- src/game/game.test.ts`, `npm.cmd run test -- src/game/terrainEvidence.test.ts`, and `npm.cmd run build` pass.
- Remaining validation: full requested gate bundle, dev-URL Playwright smoke, screenshot inspection, and final diff hygiene.
- Echo visual follow-up: echo terrain evidence first moved off generic labeled contact markers, then was corrected to radial Dark Echo-style segmented rings that expand from the stepped cell instead of directional streaks. Focused evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run build`, `git diff --check`, and inspected Playwright screenshot `output/terrain-evidence-echo-radial-smoke/shot-0.png`.
- Echo map robustness follow-up: the `terrain_evidence_test` map now keeps a separate open echo strip and adds a reachable wall-bounded echo maze/chamber directly above the player spawn, with tests asserting both open and blocker-adjacent echo cells.
- Echo mechanics correction: echo tile steps and shots now trigger the existing portable relay signal-wave pulse path instead of standalone echo terrain markers, so closed echo corridors use the same moving waves, wall bounces, and signal contacts as portable relays.
- Echo relay-pulse evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, `npm.cmd run test`, `npm.cmd run build`, and `git diff --check` passed. The skill Playwright client captured `output/terrain-evidence-echo-relay-smoke/shot-0.png`; `state-0.json` reports 64 portable relay waves, 9 wall contacts, and 0 echo terrain markers.
- Hidden hostile patrol follow-up: the dev map's one enemy is now a passive invincible patrol sentinel in the hidden echo maze branch. Focused tests assert it starts hidden, patrols with normal AI disabled, does not fire, survives direct hits, and appears only as a hostile portable relay signal contact when echo waves reach it.
- Hidden patrol evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, `npm.cmd run build`, `npm.cmd run test`, and `git diff --check` passed. The skill Playwright client captured `output/terrain-evidence-hidden-patrol-smoke/shot-0.png`; `state-0.json` reports no visible enemies, 64 portable relay waves, 1 hostile contact at `8,13`, 14 wall contacts, and 0 enemy shots.
- Placement follow-up: mines, steel traps, portable relays, Czech hedgehogs, and EMP emitters now use the shared passable-prototype-terrain placement rule, so passable new tiles accept placeables while solid ricochet blocks remain invalid. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, `npm.cmd run build`, `npm.cmd run test`, and `git diff --check` passed. Browser evidence: required skill client smoke at `output/terrain-evidence-placement-smoke/shot-0.png`; targeted keycheck screenshots and JSON under `output/terrain-evidence-placement-keycheck/` confirm mine, steel, and relay placement on an echo tile with no console errors.
- Enemy echo-wave follow-up: hidden enemy tanks stepping on echo tiles now emit portable-relay wave pulses instead of suppressing non-player echo sources. Wave snapshots carry `sourceTeam`, and hostile-source waves render with a red tint while the enemy tank remains omitted from normal visible enemy snapshots. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, `npm.cmd run build`, `npm.cmd run test`, and `git diff --check` passed. Browser evidence: `output/terrain-evidence-enemy-echo-waves/shot-0.png` shows red enemy-origin waves in the hidden maze; `state-0.json` reports player still at spawn, 0 visible enemies, 38 active waves, and 38 red-source waves with no console error file.
- Enemy echo-contact follow-up: enemy-origin echo pulses now also add a hostile portable-relay signal contact at the source tank cell, so the red stripe marker appears with the sound waves while the tank sprite remains hidden from normal vision. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, and `npm.cmd run build` passed before browser capture. Browser evidence: `output/terrain-evidence-enemy-echo-contact/shot-0.png`; `state-0.json` reports player still at spawn, 0 visible enemies, 38 red-source waves, and 1 red hostile contact with no console error file.
- Echo neutral-sound correction: per user clarification, echo-tile sound waves now deliberately do not identify hostiles, teams, decoys, or exact source ownership. Echo pulses still reuse portable relay propagation and wall contacts, but they are neutral/ambiguous and cannot create red waves or hostile stripe contacts; placed portable relays keep hostile detection. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, and `npm.cmd run build` passed before browser capture. Browser evidence: `output/terrain-evidence-echo-neutral-sound/shot-0.png`; `state-0.json` reports player still at spawn, 0 visible enemies, 55 waves, 0 owned/red waves, 0 hostile contacts, and 15 wall contacts with no console error file.
- Echo source ambiguity follow-up: hidden enemy echo pulses no longer originate as a dense nexus at the tank center. They spawn as neutral, non-detecting wave segments from a staggered ring around a deterministic nearby approximate point; focused tests assert the initial hidden enemy waves do not touch the real source tile. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts`, `npm.cmd run test -- src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, and `npm.cmd run build` passed before browser capture. Browser evidence: `output/terrain-evidence-echo-ambiguous-source/shot-0.png`; `state-0.json` reports 0 visible enemies, 41 neutral waves, 0 owned waves, 0 hostile contacts, and 14 wall contacts with no console error file.
- Echo forward-spill correction: visible enemy echo pulses now anchor to the stopped tile, while hidden enemy echo pulses choose side/back approximate cells and use a smaller compact starting ring so first-frame waves do not touch the real stopped cell or immediate forward cell. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts src/game/game.test.ts src/game/qaIntegrationLevel.test.ts`, `npm.cmd run test`, `npm.cmd run build`, and `git diff --check` passed. Browser evidence inspected under `output/terrain-evidence-echo-birth-no-spill/`, `output/terrain-evidence-echo-no-forward-spill/`, and `output/terrain-evidence-visible-echo-patrol-no-spill/`; captures show neutral waves, no hostile contacts, and no console error files.
- Echo tile sprite follow-up: replaced the echo terrain tile's rounded parenthesis glyphs with squared bracket strokes while leaving emitted signal-wave visuals unchanged. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts` and `npm.cmd run build` passed; browser evidence inspected at `output/terrain-evidence-echo-square-brackets/shot-0.png`, with `state-0.json` reporting 8 visible echo tiles and no console error file.
- Echo tile uniformity/noise follow-up: made every echo terrain tile draw the same square bracket glyph by removing seeded bracket-radius variation, and reduced echo-triggered sound pulses from 32 rays to 18 rays while leaving portable relay pulses at full density. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts` and `npm.cmd run build` passed; browser evidence inspected at `output/terrain-evidence-echo-uniform-low-noise/shot-0.png`, with `state-0.json` reporting 8 visible echo tiles, 18 active waves, 0 hostile contacts, and no console error file.
- Echo low-noise follow-up: reduced echo-triggered sound pulses again from 18 rays to 10 rays, keeping portable relay pulses unchanged at 32 rays. Evidence: `npm.cmd run test -- src/game/terrainEvidence.test.ts` and `npm.cmd run build` passed; browser evidence inspected at `output/terrain-evidence-echo-very-low-noise/shot-0.png`, with `state-0.json` reporting 8 visible echo tiles, 10 active waves, 0 hostile contacts, and no console error file.

## 2026-07-19 Attended-v2 Visual Density Campaign

- Created clean worktree `D:\projects\tanchiki-pixel-density-campaign` on branch `codex/tanchiki2-pixel-density-campaign` from `origin/main` at `d383090e37f9e16e2bbc606f97ec1f26acf6aaf7`; left the pre-existing dirty planning file in `D:\projects\tanchiki` untouched.
- Audited current assets, Canvas2D scaling, 13x13 camera behavior, 32px/20px legacy atlas paths, the 34-prop manifest, current tests/harness scripts, Figma review files, and open PR #79 before editing.
- Rendered an actual-1x 48px versus 64px comparison and selected 48px because it exposes class/equipment structure without consuming the existing camera and mobile composition.
- Added a deterministic 24-cell player atlas covering Scout, Engineer, Battle Tank, blue/red/color-safe teams, and two movement frames; added generator drift validation and a repository-canonical asset authority ADR.
- Replaced competing self/shield rectangles with separate self chevron, segmented shield, focus brackets, physical armor/damage, and independent reload channels. Status renders after soft-cover overlays.
- Added and inspected the 48-scenario Player Combat Matrix and confirmed no browser error artifact.
- Added an explicit 34-entry prop affordance contract. Only four soft-cover props activate concealment/evidence; terrain-backed blockers, inactive hazards, broken/inactive static signals, no destructibility, no online support, and strict visible-cell fog clipping are all explicit.
- Expanded the prop atlas coordinate surface to 384x384 and gave `rock_large`, `bush`, `fuel_barrel`, and `relay_tower` representative 48px source regions without changing prop IDs or mechanical anchors.
- Added and inspected the complete Prop Affordance Board with no browser error artifact.
- Added the isolated Relay Scar review slice at `?devLevel=visual_density_slice`. It keeps distant live relay state hidden under strict circular fog and separates it from broken/inactive static signal art.
- Focused tests and production builds pass throughout; full validation, lifecycle telemetry, current-head review packaging, and closeout evidence remain.
- Full validation passed: 24 test files / 264 tests, deterministic atlas sync, production build, server smoke, contrast, harness validate/smoke, Reviewer App dry-run, Deep Agent stub runtime, Product Review Warden, desktop browser smokes, and mobile touch smoke.
- Attended-v2 telemetry safety gate: local lifecycle validation passed, but the required live ref `codex/mar-693-empty-base` moved from expected `69df33aafbe6f2738b87419d449fd3ee4f84f018` to `9d433dd871cc70b77c57245acaa15ad26e965672` with no remaining exact branch/tag. No unverified workflow was dispatched.

## 2026-07-19 Visual Density Correction

- User review rejected the first pass because it enlarged 48px source sprites into 48px gameplay models and did not add enough internal detail.
- Separated authored density from display size: the atlas remains 48px, gameplay renders at the requested 28px, and the class-sprite renderer now has a hard 32px one-tile maximum.
- Rebuilt Scout, Engineer, and Battle Tank sources with track rollers/treads, panel seams, vents, hatches, optics, rivets, barrel highlights, tools, wear, and layered armor rather than a larger silhouette.
- Moved self, shield, and focus channels inside the bounded visual square so status art does not extend tank overdraw across walls.
- Updated the runtime comparison and 48-scenario combat matrix to show 48/64 source candidates at the same 28px destination, with explicit 32px tile outlines and 2x inspection crops.
- Added a deterministic wall-adjacency browser action. Required skill-client evidence at `output/pixel-density-correction/relay-scar-wall-adjacency/shot-0.png` places the Engineer at column 12, row 12, facing the brick at column 13 without sprite overlap.
- Full validation passes: generated atlas sync, 24 test files / 265 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle trace smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, mobile touch smoke, and inspected browser captures with no error artifacts.

## 2026-07-19 Sanctioned Battle Tank Class Scale

- User explicitly approved making Battle Tank visually larger than Scout and Engineer while keeping it inside the one-tile boundary.
- Added a class-aware runtime size contract: Scout and Engineer cap at 28px; Battle receives a +4px allowance and caps at 32px. Collision, movement, hit footprint, save data, and protocol behavior remain unchanged.
- Updated the density comparison and 48-scenario combat matrix to show the 28/28/32 class hierarchy at actual 1x scale.
- Added a dev-route-only `tankClass` selector and deterministic Battle wall-adjacency action for direct QA without changing production navigation.
- Required skill-client evidence at `output/pixel-density-correction/battle-class-scale/battle-wall-adjacency/shot-0.png` shows Battle at column 12, row 12, facing the brick at column 13. Text state confirms selected/active `battle`, and no browser error artifact exists.
- Validation passes: 24 test files / 265 tests, asset sync, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle trace smoke, visual contrast, and clean diff checks.

## 2026-07-19 Player Status HUD

- Created clean worktree `D:\projects\tanchiki-hud-lives-overdrive` on branch `codex/tanchiki2-hud-lives-overdrive` from merged `origin/main` commit `9970d7f1070132814cf4fd233971f6fbdea86efc`; the dirty planning edit in the original checkout remains untouched.
- Consolidated the middle-right MOD and TEAM rows into one player-status surface, leaving the lower-right minimap at its existing position.
- The status surface now uses the active class/team tank sprite, makes the lives numeral the dominant element, and shows Overdrive as ready, active, or regenerating with a countdown and progress bar.
- Added a pure Overdrive HUD model and focused tests, plus an explicit 12-second regeneration duration in the runtime snapshot without changing Overdrive mechanics.
- Focused validation passes: `npm.cmd run test -- src/game/hudPlayerStatus.test.ts src/game/game.test.ts` (100 tests) and `npm.cmd run build`.
- Ran a browser smoke that preserves the required skill-client run and then captures ready, active, and regenerating Overdrive states through the real `X` control.
- First browser run exposed that an instantaneous Playwright `X` press releases before the deterministic input frame observes it; updated the smoke to hold `X` across 80 ms of stepped game time.
- Desktop ready/active/regenerating browser smoke passes with no console messages, and the required skill-client screenshot was captured.
- Mobile inspection found the legacy touch PAUSE plate covering the new middle-right status surface; moved that touch-only control into the empty gap below Score and above MAP, updating hit-map and mobile smoke coordinates.
- Final browser evidence inspected under `output/hud-player-status-final/`: ready shows `OVERDRIVE RDY`, active shows a draining cyan bar and `4s`, and cooldown shows an amber `REGEN 12s` bar. No console messages were recorded.
- Corrected mobile evidence inspected at `output/hud-player-status/mobile-touch-final/mobile-touch-gameplay/shot-0.png`; lives, Overdrive, Score, PAUSE, and MAP are all unobstructed, and the interaction smoke passes.
- Full validation passes: deterministic atlas sync, 25 test files / 268 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, and clean browser state.
- Live attended-v2 LangSmith safety gate: the consumer requires `urkrass/agentic-harness@69df33aafbe6f2738b87419d449fd3ee4f84f018`, but `refs/heads/codex/mar-693-empty-base` now resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, with no branch or tag at the pinned SHA. No unverified workflow was dispatched.
- Committed the isolated HUD package and opened draft PR #83; the repository `validate` check passed on the initial implementation head.
- User follow-up moved the score/points row into the upper-right gap below the objective pips and above LINK, freeing the lower status area without changing the minimap or player-status positions.
- Score-top evidence inspected at `output/hud-player-status-score-top/shot-0.png` and the corresponding mobile screenshot; objective, score, LINK, lives, Overdrive, PAUSE, and MAP remain unobstructed. Focused tests (112), production build, full validation (25 files / 268 tests), visual contrast, required skill-client capture, and mobile touch smoke pass.
- Remaining hard gates: visual/human approval on the final PR head, plus restoration of an exact trusted attended-v2 workflow ref before any live LangSmith dispatch.

## 2026-07-19 Base And Relay HUD Simplification

- Created clean worktree `D:\projects\tanchiki-hud-base-relay` on branch `codex/tanchiki2-hud-base-relay` from merged `origin/main` commit `7098250c5cbab5cad3065a4e483f50d98010a913`; the unrelated planning edit in the original checkout remains untouched.
- Removed the standalone captured-relay fraction because relay ownership is already visible on the minimap. The useful link context is retained as a compact `SOLO`/`TEAM` label in the minimap header.
- Rebuilt the Defense base status with the real base terrain sprite, a larger health fraction, a continuous segmented health bar, and low-health red treatment.
- Moved the player's planted portable-relay count to the empty lower-left rail. It uses the same detailed portable-relay sprite as the battlefield and a large live `activeCount` numeral.
- Required web-game skill client smoke passed and was inspected at `output/hud-base-relay-smoke/shot-0.png`; text state reports normal play, base `3/3`, relay count `0`, and no console-error artifact.
- Real hold-to-place evidence passed and was inspected at `output/hud-base-relay-planted/shot-0.png`; the rendered count and text state both update to one planted relay with no console errors.
- Maximum enemy-density evidence passed and was inspected at `output/hud-base-relay-max-enemies/shot-0.png`; all 20 enemy markers remain clear of the lower-left relay block.
- Mobile touch smoke passed and both gameplay/pause captures were inspected under `output/hud-base-relay-mobile/`; the new relay block, controls, base status, player status, pause control, and minimap remain unobstructed.
- Damaged-base evidence passed and was inspected at `output/hud-base-relay-damaged-base/shot-0.png`; base `1/3` uses the expected red health fraction and bar while the real base sprite remains legible.
- Full validation passes: deterministic atlas sync, 25 test files / 268 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required desktop browser coverage, real relay placement, maximum enemy density, and mobile touch smoke.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, and no branch or tag currently points to the expected SHA. No unverified telemetry workflow was dispatched.
- Opened draft PR #84 from the isolated branch; its initial GitHub `validate` check passed.
- Remaining hard gate: visual/human approval on the final exact PR head before any merge.

## 2026-07-19 Static Relay High-Density Red-White Pass

- Rejected the prior procedural direction after visual review: it added many competing one-pixel marks inside the existing small footprint and did not improve battlefield recognition.
- Rebuilt the functional static relay as a deterministic 64x120 SVG source rendered at 32x60 on the battlefield, increasing the visible tower height from 48px to 60px while preserving the 32px horizontal cell boundary.
- Restricted the authored structural palette to dark outline, red, white, and one white shadow; removed platform gadgets, wires, ladders, scattered highlights, and the multi-dish silhouette.
- Kept one round dish and a two-frame red/white hub change. Team identity is confined to one broad ownership plaque plus the existing capture-progress strip.
- Added a density manifest, atlas loader, preload integration, and focused tests for source/runtime dimensions, frame addressing, palette discipline, and manifest drift.
- Focused validation passes: 3 test files / 104 tests and production build.
- Required web-game client ran successfully at `output/static-relay-v3-skill-client/shot-0.png`; text state reports normal play and no console-error artifact.
- Focused 1x battlefield board was inspected at `output/static-relay-v3-density-board/board.png`; neutral, blue, red, and wall-adjacent treatments remain readable, and `errors.json` is empty.
- Functional gameplay evidence was inspected at `output/static-relay-v3-gameplay/relay-visible.png` after moving the player beside the live relay; state identifies relay row 8 with active capture progress, and `errors.json` is empty.
- Full validation passes: deterministic vehicle atlas sync, 27 test files / 275 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required browser coverage, and mobile touch smoke.
- Mobile gameplay and pause evidence was inspected under `output/static-relay-v3-mobile/`; the HUD, touch controls, battlefield, and pause surface remain unobstructed.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, and no branch or tag points to the pinned SHA. No unverified telemetry workflow was dispatched.
- Opened draft PR #87 from the isolated branch.
- Remaining hard gate: visual/human approval on the final exact PR head before any merge.

## 2026-07-19 Detailed Base Sprite

- Created branch `codex/tanchiki2-base-sprite-v2` from merged PR #84 commit `4901fe35dc0e2f0272f821b698502aa12666deac`, reusing the clean detached post-merge worktree and leaving the original dirty checkout untouched.
- Replaced the legacy base atlas cell at runtime with a deterministic procedural 16-grid sprite that stays crisp at both 32px offline/HUD scale and the 20px compatibility scale.
- The new command-bunker silhouette adds stepped roof armor, a beacon, reinforced side plates, an eagle-like gold crest, an armored entrance, observation slit, status lights, rivets, and foundation detail.
- Added distinct critical-health art at 1 HP: broken roof armor, soot, facade cracks, red warning lights, and a damaged observation slit. The destroyed state now collapses the same structure into recognizable rubble with an exposed hot crater.
- Required web-game skill client smoke passed and was inspected at `output/base-sprite-v2-skill-client-final/shot-0.png`; text state reports normal play with base `3/3` and no console-error artifact.
- Gameplay evidence was inspected at `output/base-sprite-v2-gameplay/shot-0.png`, and the Objectives encyclopedia close-up was inspected at `output/base-sprite-v2-encyclopedia/shot-0.png`.
- Focused state-board evidence was inspected at `output/base-sprite-v2-state-board/shot-0.png`; it covers full, critical, and destroyed states at both 32px and 20px render sizes with no browser warnings or errors.
- Full validation passes: deterministic atlas sync, 25 test files / 268 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required skill-client coverage, focused state-board coverage, and mobile touch smoke.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` still resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, and no branch or tag points to the pinned SHA. No unverified telemetry workflow was dispatched.
- Opened draft PR #85 from the isolated branch; its initial GitHub `validate` check passed.
- Remaining hard gate: visual/human approval on the final exact PR head before any merge.

## 2026-07-19 Animated Portable Relay Sprite

- Created branch `codex/tanchiki2-portable-relay-sprite-v2` from merged PR #85 commit `25fb1f393ada214731f26e49b1d5bcb982aa350c`, reusing the clean detached post-merge worktree and leaving the original dirty checkout untouched.
- Rebuilt the portable relay on a one-pixel detail grid as a reinforced field unit with a diagnostics screen, three-color switch bank, vent rows, cabinet rivets, carry handles, stabilizing feet, an exposed signal cable, shaded mast, rotating collar, layered concave dish, rear X-bracing, hub, and separate receiver boom.
- Added an eight-frame, 2.4-second axial rotation model. The cabinet and mast remain fixed while the dish narrows edge-on, reverses its visible face after half a turn, and moves the feed-arm projection through the full rotation.
- Preserved the existing one-tile battlefield footprint and reused the same animated sprite in the lower-left planted-relay HUD and the encyclopedia.
- Added per-relay phase offsets so multiple placed relays do not rotate in lockstep, plus focused deterministic tests for frame sequencing, looping, face reversal, edge-on width, phase offsets, and invalid-time fallback.
- Required web-game skill client smoke passed and was inspected at `output/portable-relay-v2-skill-client-detailed/shot-0.png`; text state reports normal play and no console-error artifact.
- Focused rotation-board evidence was inspected at `output/portable-relay-v2-frames.png`; all eight poses remain inside their 32px tile guides.
- Real hold-to-place gameplay evidence was inspected under `output/portable-relay-v2-gameplay/`; state reports one planted relay, the player moved clear for visibility, front/edge screenshots differ as expected, and `errors.json` is empty.
- Full validation passes: deterministic atlas sync, 26 test files / 271 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required browser coverage, and mobile touch smoke.
- User follow-up made the dish substantially rounder and more dominant: front/rear poses are now near-circular, edge-on poses retain the tall rotating-disc profile, and the cabinet/platform was narrowed and compressed into a shallow pedestal.
- Round-dish evidence was inspected at `output/portable-relay-v2-round-dish-frames.png`, `output/portable-relay-v2-round-dish-gameplay/front.png`, and `output/portable-relay-v2-round-dish-gameplay/edge.png`; the required skill client, full 271-test validation, contrast check, and mobile touch smoke were rerun successfully with no browser errors.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, and no branch or tag points to the pinned SHA. No unverified telemetry workflow was dispatched.
- Opened draft PR #86 from the isolated branch; its initial GitHub `validate` check passed.
- Remaining hard gate: visual/human approval on the final exact PR head before any merge.

## 2026-07-19 CTF Objective HUD Rework

- Created clean worktree `D:\projects\tanchiki-ctf-hud-v2` on branch `codex/tanchiki2-ctf-hud-v2` from merged `origin/main` commit `8d689cb727cf7b1f3641176ddc996170588107d1`; the unrelated dirty planning edit in the original checkout remains untouched.
- Identified the misleading HUD bug: CTF reused Defense base-health pips, so a `0/2` flag objective displayed three unrelated yellow pips.
- Rebuilt CTF status with the same hierarchy as the improved Defense base block: a detailed HUD flag sprite, large capture fraction, and a continuous segmented capture bar.
- Added explicit `FLAG`, `CARRY`, and `DROP` states and replaced the truncated `CAPTURE THE` heading with `CAPTURE FLAG`.
- Added a hidden `ctf_hud_test` development route with a two-capture target plus a pure CTF HUD model and focused state tests.
- Focused validation passes: 3 test files / 110 tests and production build.
- Required web-game skill client evidence was inspected at `output/ctf-hud-v2-skill-client-final/shot-0.png`; text state reports CTF `0/2`, normal play, and no browser error artifact.
- Focused state-board evidence was inspected at `output/ctf-hud-v2-state-board-final/board.png`; at-home, carried, dropped, and `1/2` progress states remain clear, and `errors.json` is empty.
- Full validation passes: deterministic vehicle atlas sync, 28 test files / 278 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required browser coverage, and mobile touch smoke.
- CTF mobile-layout evidence was inspected at `output/ctf-hud-v2-mobile-ctf/gameplay.png`; the complete `CAPTURE FLAG`, flag sprite, `0/2`, capture bar, score, lives, Overdrive, and minimap remain unobstructed, and `errors.json` is empty.
- Narrowed PR #88 after human review so the visual change affects only the CTF HUD; battlefield flag markers, the Objectives encyclopedia, and gameplay/readable-state behavior remain unchanged.
- Revalidated the HUD-only diff with 28 test files / 278 tests, production build, visual contrast, Product Review Warden, Deep Agent stub runtime, and the required web-game client; the inspected final screenshot is `output/ctf-hud-v2-hud-only-final/shot-0.png`.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`, and no branch or tag points to the pinned SHA. No unverified telemetry workflow was dispatched.
- Opened draft PR #88 from the exact validated branch head.
- Human approved the HUD-only scope and authorized merge; exact-head validation and review gates remain required before merge.

## 2026-07-19 CTF Flag Carry, Drop, and Locator Pass

- Created clean worktree `D:\projects\tanchiki-ctf-flag-gameplay-v1` on branch `codex/tanchiki2-ctf-flag-gameplay-v1` from merged `origin/main` commit `10411f279f18a37502e05c327112ca2acf3d212b`; the unrelated dirty original checkout remains untouched.
- Removed the battlefield flag's opaque square platform and label plaque, leaving the detailed flag itself as the objective marker.
- Replaced the grid-cell carried marker with a separate flag rendered from the carrier tank's exact interpolated pixel position, immediately behind the tank and beneath its body in draw order.
- Bound `R` during offline play to drop the player's carried flag. The dropping tank cannot immediately reclaim it without leaving the drop cell; another friendly tank can pick it up, while an enemy touching a dropped flag returns it home.
- Added a presentation-only locator pulse for dropped flags: a short immediate wave, then a 1.6-second wave every 24 seconds. The pulse is drawn above fog and briefly echoed on the minimap; it does not modify visibility, damage, movement, AI knowledge, or ownership.
- Added a contextual `R DROP` hint only while the player carries the flag and CTF-specific control help without adding another persistent HUD panel.
- Added deterministic unit/gameplay coverage for exact carried placement, rare pulse timing, manual drop/regrab locking, teammate pickup and capture, enemy touch-return, input routing, and removal of the stale carried grid marker.
- Required web-game skill client evidence was inspected at `output/ctf-flag-skill-client/shot-0.png`; text state reports a moving player carrier and no browser error.
- Focused browser evidence was inspected under `output/ctf-flag-visual-smoke/`: `carried.png` shows the exact-position carried flag, `dropped-signal.png` shows the platform-free marker and locator wave, `dropped-quiet.png` shows the normal quiet interval, and `errors.json` is empty.
- Focused validation passes: 5 test files / 123 tests and production build.
- Full validation passes: deterministic vehicle atlas sync, 29 test files / 285 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle wrapper smoke, visual contrast, Deep Agent stub runtime, Product Review Warden, required browser coverage, and mobile touch smoke.
- Mobile gameplay and pause evidence was inspected under `output/ctf-flag-mobile/`; the existing battlefield, HUD, touch controls, and pause/restart surface remain unobstructed.
- Live attended-v2 safety gate remains closed: the consumer pins `69df33aafbe6f2738b87419d449fd3ee4f84f018`, while `refs/heads/codex/mar-693-empty-base` still resolves to `7b5796cdf9f605d347a33122d5e603f5c351994e`. No unverified telemetry workflow was dispatched.
- Opened draft PR #89 from the isolated branch.
- Remaining hard gate: visual/gameplay approval on the final exact PR head before any merge.
- Human visual review found directional occlusion in the first carry anchor: right-facing tanks covered the inward-facing cloth, and upward tanks covered the vertically centered flag. The old HOME marker also still used a separate simplified rendering.
- Corrected all four carry orientations with explicit rear-edge placements and horizontal mirroring for right-facing tanks. Each flag now remains visibly outside the hull while following the carrier's exact interpolated position.
- Routed both `flag-target` and `flag-home` through the same 28px platform-free `drawPixelFlag` path; team palette is now their only presentation difference.
- Removed the default static relay from the focused CTF QA level so the flag silhouette is judged without unrelated tower overlap.
- Required skill-client evidence was re-run and inspected at `output/ctf-flag-direction-fix-skill-client/shot-0.png`.
- Four-direction closeups, the unified HOME sprite, dropped signal, text state, and empty browser error log were inspected under `output/ctf-flag-direction-fix-approved-candidate/`.
- Exact follow-up validation passes: 29 test files / 285 tests, production build, server smoke, all local harness gates including attended-v2 lifecycle wrapper smoke, visual contrast, Product Review Warden, and Deep Agent stub runtime. The live attended-v2 ref mismatch remains unchanged, so no untrusted dispatch was attempted.
- A second human visual review clarified that the staff itself must read as hull-mounted, not merely place the cloth behind the tank.
- Added quarter-turn carried-sprite transforms for vertical movement: up/down carriers now show the staff laid across and slightly under the rear edge, while the cloth projects directly backward. Left/right retain their rear-edge vertical staff treatment.
- Added focused vertical skill-client coverage at `output/ctf-flag-rear-mount-skill-client/shot-0.png`; four-direction closeups and empty browser errors were inspected under `output/ctf-flag-rear-mount-final/`.
- Rear-mount exact-head validation passes: 29 test files / 285 tests, production build, server smoke, all local harness checks, visual contrast, Product Review Warden, and Deep Agent stub runtime.
- Final approved HUD follow-up replaces the carried-player `CARRY` status with `R DROP` on the same status row and keeps `0/2` on its own row below; no CTF gameplay code changed. The final screenshot was inspected at `output/ctf-hud-drop-skill-client-final/shot-0.png`, the four-direction browser smoke passed with an empty error log, and `npm.cmd run validate` passed all 29 test files / 285 tests plus the build, server smoke, and local harness gates.

## 2026-07-19 Local Campaign Level Testing

- Added a development-only `?campaign=all` route that opens all eight Campaign missions through an in-memory save; the player-facing production path and normal browser progression remain unchanged.
- Kept the existing single-list Campaign screen and tightened only long level lists so all eight missions plus Back fit without overlapping the bottom HUD. Pointer hitboxes use the same compact geometry.
- Added focused coverage for all-level selection, unchanged saved progression, compact pointer rows, row-gap input routing, and Level 8 briefing access. The focused game/input suites pass with 115 tests and the production build succeeds.
- Required web-game client evidence was inspected at `output/local-campaign-all-levels/picker/shot-0.png` and `output/local-campaign-all-levels/level-8/shot-0.png`; the first shows all eight missions, and the second reaches Level 8 `Final Foundry` gameplay with `unlockedStage: 1`, no completed levels, and no browser error artifact.
- Full validation passes: deterministic vehicle atlas sync, 29 test files / 287 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent check.
- Exact-head review found and repaired a compact-list pointer edge case: hit testing now rejects rows beyond the rendered Back option instead of activating the highlighted mission. The focused 115-test run and full 287-test validation pass after the repair.
- Live attended-v2 LangSmith dispatch remains hard-gated: the consumer requires `refs/heads/codex/mar-693-empty-base` at pinned commit `69df33aafbe6f2738b87419d449fd3ee4f84f018`, but GitHub currently resolves that ref to `7b5796cdf9f605d347a33122d5e603f5c351994e`. No untrusted telemetry workflow was dispatched.

## 2026-07-19 Detailed Class-Kit Visuals

- Created isolated branch `codex/tanchiki2-detailed-class-kit-visuals` from refreshed `origin/main` commit `52f83769331eb456e12596a109eb46ae521f33c7`; the unrelated dirty original checkout remains untouched.
- Added a render-only class-equipment HUD model for Scout, Engineer, and Battle Tank. Counts come only from existing shell, shield, deployable, and portable-relay state.
- Replaced the separate left relay counter and tiny generic gear icons with one class-aware bottom strip. Battle heavy-shell and splash presentation is combined into one HE shell slot.
- Added a shared 48-unit military equipment visual contract and detailed decoy, tripwire, mine, steel trap, shell, HE shell, and shield renderers. Battlefield deployables now reuse the same silhouettes.
- Added a distinct HE projectile, deterministic visual-only muzzle/impact particles, and shield emitter hardware without changing damage, inventory, or save rules.
- Added the hidden `?visualQa=class_equipment_board` review board and `?devLevel=class_kit_test&tankClass=...` gameplay route.
- Focused class-equipment, QA integration, game, and readability tests pass; the production build passes after one strict TypeScript QA-board narrowing repair.
- Required web-game client evidence was inspected for the equipment board and all three classes under `output/class-equipment-board-v2/` and `output/class-kit-gameplay-*-v2/`; text snapshots identify the correct class kits and no browser-error artifacts were produced.
- Focused browser smoke passed on the final code under `output/class-equipment-smoke-v7/`, covering ready, hold, placed, recovered, low, and empty presentation plus relay placement, shield response, HE flight, and HE impact. `errors.json` is empty and the state snapshots retain the original quantity and damage behavior.
- Mobile gameplay and pause evidence passed under `output/class-equipment-mobile/`; the consolidated 28px strip remains readable and unobstructed without introducing another panel.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 304 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.

## 2026-07-20 All-Equipment Test Tank

- Added a hidden development-only `?devLevel=all_mods_test` range with a Test Tank that combines every visualized built-in class kit: HE shells, three shield points, Decoy `1`, Mine `2`, Trap `4`, Wire `5`, and two portable Relays on `E`.
- Kept the runtime override isolated behind `GameOptions.allClassEquipmentForTesting`; normal Campaign classes, Garage Major Mods, saves, and balance remain unchanged.
- Added a compact seven-slot mode to the existing 28px bottom equipment strip so the Test Tank remains one HUD surface without overlapping the right HUD.
- Focused model, presentation, and game tests pass (3 files / 116 tests), and the production build succeeds.
- Required web-game client evidence was inspected at `output/all-equipment-skill-client/shot-0.png`; the Test Tank starts in play with the seven-slot strip, HE ammo, shield `3`, all four deployables, and relay `2`.
- Exhaustive browser smoke passed under `output/all-equipment-test-smoke-v2/`: all four deployables reached HOLD and placed states, the relay placed with `1/2` remaining, the HE projectile retained splash behavior, and `errors.json` is empty.
- The first browser pass exposed ellipsized compact `OUT` text; compact-only state marks were tightened to `X`, `H`, `E`, `LO`, and `R`, then screenshots were rerun and inspected with no overlap.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 306 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain; the local route is ready for human visual testing.

## 2026-07-20 Relay and Ammunition HUD Correction

- Restored the universal portable Relay item to its original left-HUD position and removed it from every class-equipment strip. Its large icon now shows exact remaining deployable count and HOLD progress.
- Replaced abstract ammunition pips with a physical ten-round shell tray; Battle HE rounds use heavier casings and warning-colored noses.
- Archived the Shield equipment slot from the bottom strip while retaining the shield artwork, slot kind, battlefield emitters, and authoritative top shield bar.
- Simplified the Test Tank strip to HE plus Decoy, Wire, Mine, and Trap; Relay stays universal at left and Shield stays at top.
- Focused model, presentation, visual-contract, and gameplay tests pass (4 files / 121 tests), and the production build succeeds.
- Required web-game client evidence was inspected for normal Battle and the Test Tank under `output/relay-shell-hud-*-client/`; both show countable physical HE rounds, Relay in the left HUD, and no bottom Shield slot.
- The class-equipment board was inspected at `output/relay-shell-hud-equipment-board/shot-0.png`; it keeps the Shield source artwork explicitly marked `ARCHIVED` outside the live HUD.
- Focused browser smoke passed under `output/relay-shell-hud-class-smoke/` and `output/relay-shell-hud-test-tank-smoke/`; Relay HOLD and placement update its left-HUD remaining count, all class deployables still place/recover, HE behavior is unchanged, and both error logs are empty.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 307 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain; the correction is ready for human visual review.

## 2026-07-20 Single-Count Equipment HUD

- Removed the duplicated compact key/capacity and state text from every deployable cell.
- Each deployable now has one dominant exact remaining-count number, with its short equipment name directly beneath the matching military icon.
- Ready, placed, and HOLD presentation still use the existing restrained state colors; HOLD retains its progress line. Inventory and placement behavior are unchanged.
- Required skill-client gameplay evidence was inspected at `output/single-count-hud-skill-client-final/shot-0.png`.
- Test Tank ready and all-placed states were inspected under `output/single-count-hud-test-tank-smoke-final/`; ordinary Scout and Engineer ready, HOLD, placed, and recovered states were inspected under `output/single-count-hud-class-smoke-final/`. Both browser error logs are empty.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 307 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Smaller Equipment Labels And Counts

- Reduced deployable remaining counts from 3x to 2x pixel scale.
- Reduced the equipment-name labels to a compact 0.75x treatment while retaining the icon/name/count hierarchy and existing state colors.
- Required skill-client evidence was inspected at `output/smaller-equipment-text-skill-client/shot-0.png`; Test Tank ready and placed states were inspected under `output/smaller-equipment-text-test-tank-smoke/`.
- The smaller names remain readable, quantities no longer dominate their cells, and `errors.json` is empty. Equipment behavior and text diagnostics are unchanged.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 307 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Deployable Keycap Badges

- Added tiny neutral keycap badges to the upper-left corner of every deployable HUD icon.
- Dedicated 3x5 micro-glyphs keep the `1`, `5`, `2`, and `4` controls distinguishable without restoring the old duplicate text rows.
- Required skill-client evidence was inspected at `output/equipment-keycap-skill-client/shot-0.png`; Test Tank ready and deployed states were inspected under `output/equipment-keycap-test-tank-smoke/`.
- All four badges remain legible at native and enlarged canvas scales, and `errors.json` is empty. Deployable quantities, controls, placement, and recovery behavior are unchanged.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 307 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Sharp Equipment Name Glyphs

- Replaced the fractionally scaled equipment names with a dedicated five-row integer-pixel alphabet.
- `DECOY`, `WIRE`, `MINE`, and `TRAP` keep the requested compact size but now render without transformed or antialiased edges.
- Required skill-client evidence was inspected at `output/sharp-equipment-labels-skill-client/shot-0.png`; Test Tank ready and deployed states were inspected under `output/sharp-equipment-labels-test-tank-smoke/`.
- The four names and their keycap badges remain distinguishable at native and enlarged canvas scales, and `errors.json` is empty. No gameplay or HUD-state behavior changed.
- Full validation passes: deterministic vehicle atlas sync, 32 test files / 307 tests, production build, server smoke, harness validate/smoke, Reviewer App dry-run, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Class-Local Equipment Slots

- Replaced the old global deployable hotkey numbering with class-local slot order: Scout uses `1` Decoy and `2` Wire; Engineer uses `1` Mine and `2` Trap.
- The hidden Test Tank uses the same ordered equipment list as slots `1` Decoy, `2` Wire, `3` Mine, and `4` Trap. Battle Tank has no numbered class deployables; HE remains on Space.
- HUD keycaps, hold prompts, active-deployable labels, and keyboard input now derive from the same class equipment order. Relay remains on `E` and Major Mod remains on `X`.
- Equipment identities, placement/recovery/trigger behavior, quantities, balance, and save data remain unchanged.
- Required skill-client evidence was inspected at `output/class-local-slots-skill-client/shot-0.png`. Scout and Engineer ready/HOLD/placed/recovered states were inspected under `output/class-local-slots-class-smoke/`; Test Tank ready and all-placed states were inspected under `output/class-local-slots-test-tank-smoke/`. Both browser error logs are empty.
- Focused input/model/integration/game coverage passes with 4 files / 133 tests. Full validation passes with 32 files / 309 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Universal Control Keycaps

- Reused the equipment strip's restrained 8px keycap treatment for the universal controls: `E` now sits on the Portable Relay item and `X` sits immediately before the Garage Major Mod status.
- Added the missing `3` micro-glyph so the Test Tank's ascending `1` through `4` equipment sequence is complete.
- Kept the Relay, Major Mod, quantities, and existing HUD regions in place; no controls or gameplay behavior changed.
- Required skill-client evidence was inspected at `output/relay-major-mod-keycaps-skill-client/shot-0.png`; enlarged Test Tank evidence was inspected at `output/relay-major-mod-keycaps-smoke/ready-all-equipment.png`, and the browser error log is empty.
- Deterministic bounds coverage passes for all live `1`, `2`, `3`, `4`, `E`, and `X` badge glyphs. Full validation passes with 32 files / 315 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Keycap Legibility Refurbish

- Refurbished the shared keycap component for all `1` through `4`, `E`, and `X` controls: the body is now a centered 9px square with a centered glyph, distinct lower bevel, and a one-pixel HUD-surface moat that prevents its dark lower edge from merging into equipment frames.
- Moved the Overdrive `X` away from the right-HUD boundary and anchored it inside the Major Mod row at the left end of the meter. Other Garage Major Mods retain the same keycap attached to their status icon.
- Required skill-client evidence was inspected at `output/keycap-refurb-skill-client/shot-0.png`; enlarged Test Tank evidence was inspected at `output/keycap-refurb-test-tank-smoke/ready-all-equipment.png`, and the browser error log is empty.
- Updated deterministic geometry coverage verifies the clearance, body, bevel, and glyph stay inside the intended bounds for every live keycap.
- Full validation passes with 32 files / 315 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub. No gameplay behavior changed.
- No required TODOs remain.

## 2026-07-20 Class-Specific Shell Visuals

- Constrained the Battle Tank's single HE-ammo cell to the same 188px left-anchored footprint used by Scout and Engineer, leaving the remainder of the existing bottom HUD calm and empty.
- Replaced the old normal/HE visual split with shared Scout, Engineer, and Battle shell profiles. The large HUD round, physical tray rounds, and local-player battlefield projectile now share each class's casing, recognition band, nose, and silhouette treatment.
- Scout uses a slim blue-banded light round, Engineer uses a medium olive/brass utility round, and Battle retains the large red-banded HE round and detailed fuse stencil.
- Gameplay state is unchanged: all classes still consume the same existing shell count, Scout and Engineer remain non-splash, and Battle retains its existing damage, splash radius, impact fragments, and shield behavior.
- Added deterministic ready and in-flight browser scenarios for every class plus the Battle impact. Desktop evidence is under `output/class-shell-smoke-final/`; mobile evidence is under `output/class-shell-smoke-mobile/`; both browser error logs are empty.
- Required web-game skill-client evidence was inspected at `output/web-game-class-shell-battle/shot-0.png`, with the matching text state confirming `HE SHELL 9/10 READY` and the unchanged splash projectile fields.
- Full validation passes with 32 files / 317 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain.

## 2026-07-20 Portable Relay Splash Screen

- Added a focused boot-layer splash before the existing menu: the shared Portable Relay powers up against expanding signal rings, then reveals the `TANCHIKI` title beneath it and hands off automatically after 4.2 seconds.
- Expanded the reusable Portable Relay rotation from 8 to 16 deterministic frames. The battlefield and HUD relay keep the same timing and gameplay state while gaining smoother dish motion.
- Kept the splash outside `GameMode`, progression, saves, and gameplay. Input attaches only after handoff, so Enter, Space, Escape, click, or tap can skip after the protected 0.7-second opening beat without leaking into the menu.
- Added deterministic splash phase and skip coverage plus text snapshots through `render_game_to_text`. Direct development/visual-QA routes bypass the splash, and `?skipSplash=1` remains available for automation.
- Required web-game skill-client evidence was inspected across the full automatic sequence under `output/relay-splash-skill-client/`; the snapshots progress from signal lock through title reveal to the unchanged main menu with no browser error artifact.
- Desktop and mobile smoke evidence passed under `output/relay-splash-smoke-desktop/` and `output/relay-splash-smoke-mobile-final/`. Mobile uses the real canvas tap path; both handoffs preserve Campaign at selected index `0`, and the mobile error log is empty.
- Full validation passes with 33 files / 320 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain; the splash is ready for human visual review.

## 2026-07-20 Portable Relay Splash Refinement

- Lowered the Relay and `TANCHIKI` composition by roughly 30 logical pixels and enlarged the hero Relay from 164px to 190px at full reveal.
- Added a splash-only 64-step detail grid with finer cabinet seams, latches, vents, indicator lamps, dish facets, and hub glint. Normal HUD and battlefield Relay presentation remains on its existing grid.
- Made the dish hub orientation-aware: front-facing frames retain the active cyan emitter, while rear-facing frames show a dark unlit cap with a muted mechanical glint.
- Added deterministic browser coverage for the full rear-facing title frame. Required skill-client evidence is under `output/relay-splash-refined-skill-client/`; desktop and mobile evidence is under `output/relay-splash-refined-smoke-desktop/` and `output/relay-splash-refined-smoke-mobile/`.
- Both browser error logs are empty, the pointer/keyboard handoff remains intact, and the main menu is unchanged.
- Full validation passes with 33 files / 321 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain; the refined splash is ready for human visual review.

## 2026-07-20 Start Menu And Garage Loadout Tabs

- Brightened and simplified the start menu to its five primary destinations. Team and Tank no longer compete with navigation there; all pre-mission loadout choices now live in Garage.
- Rebuilt Garage as one focused overview with three large entries: Team, Tank, and Mods. Team and Tank retain their existing dedicated pickers and return to Garage.
- Moved the four illustrated Major Mods into their own `Garage / Mods` screen. The 2x2 selector stays visually compact while a taller detail surface presents role, operation, best use, and tradeoff at the original sharp integer-pixel font scale.
- Kept Mod mechanics, balance, controls, saves, and single-equipped-Mod behavior unchanged. Pointer, keyboard, persistence, and Back navigation are covered by deterministic tests.
- Required web-game skill-client evidence was inspected under `output/garage-tabs-skill-overview/` and `output/garage-tabs-skill-mods/`. Desktop and mobile interaction evidence is under `output/start-menu-garage-tabs-desktop/` and `output/start-menu-garage-tabs-mobile/`; both browser error logs are empty and the longest Pontoon and EMP descriptions fit without an inner scrollbar.
- Full validation passes with 33 files / 324 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No required TODOs remain; the refined start menu and Garage tabs are ready for human visual review.

## 2026-07-20 Spatial Garage Mod Navigation

- Replaced one-dimensional list movement on the 2x2 Mod selector with direction-aware grid navigation.
- Up and Down now remain in the same Mod column, while Left and Right remain in the same row. In particular, Up from Czech Hedgehog returns directly to Overdrive instead of jumping diagonally to Pontoon.
- Moving down from either lower Mod reaches Back; moving up from Back returns to the lower Mod column the player came from.
- Added model and keyboard-routing coverage plus an exact deterministic browser reproduction. Required skill-client evidence is under `output/garage-mods-spatial-skill-client/`; desktop and mobile interaction evidence is under `output/start-menu-garage-spatial-desktop/` and `output/start-menu-garage-spatial-mobile/`, with both browser error logs empty.
- Full validation passes with 33 files / 326 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay, Mod behavior, balance, or save data changed.

## 2026-07-20 Fog-Accurate Scout Decoy Showcase

- Rebuilt the Scout class-kit montage around the real Decoy and Portable Relay behavior: the Scout holds `1` for the live 0.9-second placement time, leaves the armed Decoy on the occupied tile, and withdraws before the remote scan.
- The Portable Relay now uses its normal rotating battlefield renderer without an invented ray, pulse beam, or substitute model.
- The remote lane then falls under the existing circular fog-of-war treatment. The hidden Decoy produces the same red hostile-contact glyph used by live Relay detection, with no physical enemy tank invented behind the fog.
- Kept a slower-paced Wire demonstration as the second Scout kit beat. The montage uses real class movement timing and remains presentation-only; deployable, Relay, contact, fog, and enemy gameplay behavior are unchanged.
- Added deterministic phase coverage for placement, withdrawal, Relay reveal, fog, false contact, and Wire, plus named desktop and mobile captures for the four Decoy beats.
- Required web-game skill-client evidence is under `output/web-game-scout-decoy-realism-final/`; desktop and mobile evidence is under `output/tank-class-carousel-scout-decoy-final-desktop/` and `output/tank-class-carousel-scout-decoy-final-mobile/`. Both browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.

## 2026-07-20 Continuous Trap Montage

- Removed the presentation-only movement clamp that made Scout's enemy stop on Wire and made Engineer's kit look like it reset between two disconnected demonstrations.
- Scout's enemy now crosses Wire at the real reference movement rate and continues down the lane while the crossing alert remains at the trigger point.
- Engineer now has one continuous field lane: the enemy hits Mine, loses two health, continues at the live 1.7x slowed movement rate, and then reaches Steel Trap. Only Steel Trap stops the tank, matching its real five-second immobilize mechanic.
- Added a shrinking five-second lock bar beneath the trapped tank so the intentional Steel Trap hold reads as an active timed state rather than a stale frame.
- Deterministic motion coverage verifies Wire continuation, Mine-to-Trap slowed travel, and the final Steel Trap clamp. Named desktop and mobile evidence is under `output/tank-class-carousel-trap-flow-desktop/` and `output/tank-class-carousel-trap-flow-mobile/`; both browser error logs are empty.
- The required generic web-game client was also exercised and inspected under `output/web-game-trap-flow/`. Gameplay behavior, balance, controls, and save data remain unchanged.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.

## 2026-07-20 Enemy-POV Decoy Montage

- Added a real enemy Engineer to the Scout-side Decoy setup. It patrols beside its normal Portable Relay without firing while the Scout places the Decoy and withdraws.
- Repeats the same lane from the enemy's fog-of-war point of view: the vision circle moves to the enemy, the Relay exposes the existing red false-hostile contact, and a physical Engineer shell travels at the live enemy projectile speed into the hidden Decoy contact.
- Keeps the normal Relay renderer and the existing contact/fog language; there is no invented beam, alternate Relay, or omniscient enemy view.
- Replaced the five-second hard cut with a 5.5-second action window plus a shared 1.75-second result hold. All five scenes now report the action window and hold through `render_game_to_text`, and the final frame remains in the same scene until the edit.
- Deterministic coverage verifies every Decoy phase, real shell timing, Wire completion before the hold, the 7.25-second scene duration, and the 36.25-second montage loop.
- Required generic web-game evidence is under `output/web-game-decoy-pov/`. Full desktop and mobile phase/result-hold evidence is under `output/tank-class-carousel-decoy-pov-desktop/` and `output/tank-class-carousel-decoy-pov-mobile/`; both browser error logs are empty.
- Gameplay mechanics, balance, controls, Relay behavior, fog rules, and save data remain unchanged.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.

## 2026-07-20 Decoy Montage Idle Pacing

- Gave the final Field Kit scene its own 12.5-second edit while leaving the first four scenes at 7.25 seconds. The Field Kit uses a 10.75-second action window followed by the established 1.75-second result hold.
- Added deliberate still beats after the Scout arms the Decoy, while the Relay scans, while the enemy studies the false contact from its own fog-of-war view, and after the shell impacts. Placement, withdrawal, projectile, and Wire movement still use their live gameplay speeds.
- The Decoy now remains armed beside an idle Scout for 0.65 seconds before withdrawal; the enemy observes the Relay contact for 1.15 seconds before firing; the post-impact result remains visible for roughly 1.6 seconds before the Wire demonstration begins.
- Updated variable-duration carousel stepping, text snapshots, unit coverage, and desktop/mobile deterministic captures. Evidence is under `output/tank-class-carousel-decoy-idle-desktop/`, `output/tank-class-carousel-decoy-idle-mobile/`, and `output/web-game-decoy-idle/`; browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, controls, balance, Relay behavior, fog rules, or save data changed.

## 2026-07-20 Fog-Accurate Wire Montage

- Rebuilt the Scout Wire half with the same deliberate two-POV field sequence as Decoy: the Scout places Wire with the real 0.9-second hold, pauses, withdraws, and watches the lane disappear into circular fog.
- The enemy then approaches and crosses from its own fog-of-war viewpoint at the live reference movement rate. After crossing, the view returns to the Scout and shows the canonical yellow deployable-alert glyph at the Wire tile.
- The triggered Wire is consumed and the hidden enemy is not rendered in the Scout view. The alert reports a hostile crossing location without revealing the tank or expanding vision, matching the existing gameplay contract.
- Moved the live four-second deployable-alert lifetime into the shared constants surface and reused the same alert-glyph renderer in gameplay and the showcase without changing its behavior.
- Extended Field Kit to an 18.25-second scene with a 16.5-second action window and the established 1.75-second result hold; the first four montage scenes remain 7.25 seconds.
- Deterministic evidence covers Wire placement, armed pause, withdrawal, Scout fog, enemy POV, approach, crossing, alert, and alert hold at desktop and mobile sizes under `output/tank-class-carousel-wire-fog-final2-desktop/` and `output/tank-class-carousel-wire-fog-final2-mobile/`. Generic client evidence is under `output/web-game-wire-fog/`; browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, balance, controls, fog visibility, deployable effects, or save data changed.

## 2026-07-20 Cinematic Scout Border And Wire Pass

- Extended the showcase fog mask through the full battlefield floor and label area while leaving the playback timeline readable; the former exposed strip at the theater bottom is gone.
- Decoy's enemy Engineer now drives in from beyond the right map border at its live movement rate, settles into the lane, and only then disappears into fog before the existing enemy-POV deception.
- Recut Wire as one Scout-view sequence: place and arm Wire, withdraw, hold the clear establishing field, let an enemy enter from the right border and traverse the visible lane, then bring in fog immediately before the crossing.
- Restored an unmistakable contact signal as three repeating radial waves emitted from the consumed Wire tile. The hidden enemy continues moving and is not revealed by the alert.
- Added deterministic fog bounds, border-entry motion, reordered Wire phases, trigger timing, and radial-wave geometry coverage. Focused model/input coverage passes at 128 tests.
- Required generic client evidence is under `output/web-game-wire-cinematic-v2/`. Desktop and mobile phase captures are under `output/tank-class-carousel-wire-cinematic-v2-desktop/` and `output/tank-class-carousel-wire-cinematic-v2-mobile/`; both browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, balance, controls, fog visibility, deployable effects, or save data changed. No known TODO remains for this pass.

## 2026-07-20 Showcase Fog Edge Follow-Up

- Removed the presentation-only fog inset that exposed thin battlefield-texture lines along the Scout Field Kit theater.
- The fog layer now overscans the complete battlefield surface through the theater clip; the title, playback controls, timeline, and frame remain readable because they render above it.
- Added deterministic coverage for the fog layer's left, top, right, and bottom theater edges.
- Generic client evidence is under `output/web-game-fog-edge-followup-final/`. Corrected Decoy and Wire frames are under `output/tank-class-carousel-fog-edge-final-desktop/` and `output/tank-class-carousel-fog-edge-final-mobile/`; both browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, balance, controls, fog visibility rules, deployable effects, or save data changed. No known TODO remains for this follow-up.

## 2026-07-20 Persistent Decoy Relay Pulse

- Made the portable Relay a persistent, already-operating battlefield prop from the first frame of the Scout Decoy demonstration instead of introducing it after placement.
- Promoted the live Relay pulse period, ray count, wave speed, lifetime, and strength to shared constants and reused them in the showcase.
- Added a render-only Decoy Relay presentation with the canonical 32-ray pulse, starting mid-cycle so the montage opens on an established scan. The same wave-trail renderer now serves gameplay and the showcase.
- Deterministic coverage verifies immediate Relay presence, active state, pulse count, overlapping pulse timing, and the pulse front at the false-contact beat.
- Generic client evidence is under `output/web-game-decoy-relay-pulse/`. Desktop and mobile phase captures are under `output/tank-class-carousel-decoy-relay-pulse-final-desktop/` and `output/tank-class-carousel-decoy-relay-pulse-final-mobile/`; both browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, Relay behavior, balance, controls, fog visibility, or save data changed. No known TODO remains for this follow-up.

## 2026-07-20 Engineer Showcase Staging And Pacing

- Reduced the shared finished-action hold from 1.75 seconds to 1.5 seconds, preserving the previously requested minimum readable montage beat while removing the overlong tail.
- Added class-specific Field Kit action windows so Scout keeps its full Decoy/Wire edit, Engineer ends after its prepared-lane demonstration, and Battle no longer inherits Scout's long timeline.
- Corrected the Engineer-vs-Engineer duel to use identical 3 HP / 2 damage class stats on both sides; the previous generic 4 HP reference enemy made the same-class health bars unequal.
- Rebuilt Engineer Field Kit as a continuous real-speed sequence: hold 1 to place Mine, reposition, hold 2 to place Steel Trap, withdraw, then let an enemy enter from the map edge, trigger Mine, continue at the live slowed rate, and hit Trap.
- Focused model/input coverage passes at 128 tests. Generic client evidence is under `output/web-game-engineer-placement-pacing/`; every Engineer beat and all class result holds are captured under `output/tank-class-carousel-engineer-staging-desktop/` and `output/tank-class-carousel-engineer-staging-mobile/`, with empty browser error logs.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, balance, controls, deployable behavior, tank stats, or save data changed. No known TODO remains for this follow-up.

## 2026-07-20 Settled Trap Closure And Tighter Result Holds

- Replaced the Engineer showcase Trap's unfinished shrinking timer with a complete 0.45-second jaw-closing animation and a stable locked pose around the immobilized enemy.
- The finished state now reports `LOCKED FOR 5S` and holds a full lock indicator, preserving the real five-second Trap mechanic without making the short montage look like it cuts off an incomplete countdown.
- Reduced the shared post-action montage hold from 1.5 seconds to 1.3 seconds. All action speeds and class-specific action windows remain unchanged.
- Added deterministic phase and completion coverage for `trap-closing` and `trap-locked`, including the final settled state before the Engineer action window ends.
- Focused model coverage passes at 109 tests. Required generic client evidence is under `output/web-game-trap-closure-pacing-final2/`; full desktop and mobile captures are under `output/tank-class-carousel-trap-closure-desktop/` and `output/tank-class-carousel-trap-closure-mobile/`, with empty browser error logs.
- No gameplay mechanics, balance, controls, Trap duration, Mine behavior, or save data changed. No known TODO remains for this follow-up.

## 2026-07-20 Full-Duration Trap Demonstration

- Corrected the prior interpretation of the Trap feedback: the Engineer montage now keeps the enemy immobilized for the complete real-time five-second gameplay effect instead of ending shortly after contact.
- Promoted the existing 10-second Mine slow and five-second Steel Trap duration to shared constants so gameplay and the render-only showcase use the same values.
- The Trap status and lock bar count down continuously from impact to expiry. The enemy remains stationary for all five seconds, the consumed Trap then disappears, and the still-Mine-slowed enemy visibly resumes moving before the cut.
- Extended only the Engineer Field Kit action window from 8.1 to 12.8 seconds; the tightened shared result hold remains 1.3 seconds.
- Deterministic coverage verifies the initial lock, midpoint, final 0.05 seconds, exact five-second expiry, and resumed movement. Required generic-client evidence is under `output/web-game-trap-full-duration/`; desktop and mobile phase captures are under `output/tank-class-carousel-trap-full-duration-desktop-v3/` and `output/tank-class-carousel-trap-full-duration-mobile-v2/`, with empty browser error logs.
- No gameplay mechanics, balance, controls, effect durations, deployable behavior, or save data changed. No known TODO remains for this correction.

## 2026-07-20 Real Reload-Cadence Comparison

- Rebuilt Live Fire as a calm two-lane comparison between the displayed friendly class and a standard friendly Engineer. Both fire at stationary, invincible enemy Engineer targets.
- Each lane uses the class's existing `demonstration.reloadTime` as its exact minimum shot interval. The synchronized opening volley makes the cadence directly comparable: Scout and Battle fire four times in the 5.5-second action window, while the Engineer reference fires three; Engineer versus Engineer remains synchronized at three each.
- Reused the real class tank sprites, physical class shell sprites, projectile speed, muzzle flashes, impact effects, and full enemy health bars. Targets never lose health, and the two reload bars reset and refill on the real class cadence.
- Added deterministic cadence coverage for shot counts, reload reset/progress, projectile travel, muzzle flash, and impact timing. The carousel browser smoke now captures the visible cadence gap for every class.
- Required generic-client evidence is under `output/web-game/`. Full desktop and mobile visual evidence is under `output/reload-cadence-final-desktop/` and `output/reload-cadence-final-mobile/`; screenshots were inspected and both browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, tank stats, reload rules, damage, controls, balance, or save data changed. No known TODO remains for this correction.

## 2026-07-20 Reload Theater Text Reduction

- Removed the per-lane shot counters, `NO DAMAGE` labels, and bottom explanatory sentence from Live Fire.
- Reduced each lane to one compact identifier with its exact reload time: the selected class and `ENGINEER REF`.
- Kept the stationary full-health targets as the visual invulnerability cue, and widened the two animated reload bars so cadence remains the dominant comparison.
- Generic-client evidence is under `output/reload-cadence-minimal-generic/`; full desktop and mobile captures are under `output/reload-cadence-minimal-desktop/` and `output/reload-cadence-minimal-mobile/`. Screenshots were inspected and browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No timing, projectile, impact, target, gameplay, balance, control, or save-data behavior changed. No known TODO remains for this reduction.

## 2026-07-20 Reload Pointer And Shell Detail

- Removed the final class/reload labels from both Live Fire lanes.
- Added one compact cyan pixel arrow beside the upper friendly tank to identify the currently previewed class; the lower friendly tank remains the unmarked Engineer reference.
- Moved the exact reload interval into the physical shell block below the theater. The general performance strip no longer duplicates reload, while every shell now shows damage/effect and `RELOAD 1.60S` or `RELOAD 1.92S`.
- Kept Battle's shell effect within one line as `3+1 SPLASH / 40PX`, leaving the second line exclusively for reload.
- Generic-client evidence is under `output/reload-pointer-small-generic/`; full desktop and mobile captures are under `output/reload-pointer-small-desktop/` and `output/reload-pointer-small-mobile/`. Screenshots were inspected, text state matches the presentation, and browser error logs are empty.
- Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No firing cadence, reload timing, projectile, impact, target, gameplay, balance, control, or save-data behavior changed. No known TODO remains for this correction.

## 2026-07-20 Numeric Live-Fire Shot Counters

- Added one large numeric-only shot counter immediately above and to the right of each friendly firing tank in Live Fire.
- The displayed class counter uses the existing cyan comparison accent; the standard Engineer reference uses neutral white. No label, badge, panel, or duplicate timing text was added.
- Counts come directly from the existing deterministic reload-cadence presentation: Scout and Battle finish at `4` against the Engineer reference's `3`, while Engineer versus Engineer remains synchronized at `3`.
- Kept both projectile lanes and the wide reload bars unobstructed. Desktop and mobile captures under `output/reload-shot-count-desktop/` and `output/reload-shot-count-mobile/` were inspected; required generic-client evidence is under `output/reload-shot-count-generic/`, and browser error logs are empty.
- Focused game coverage passes at 109 tests. Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No firing cadence, reload timing, projectile, impact, target, gameplay, balance, control, or save-data behavior changed. No known TODO remains for this refinement.

## 2026-07-20 Enemy-Side Shot Counter Placement

- Corrected the shot-counter anchor: each number is now vertically centered immediately to the right of its red invincible enemy target, rather than beside the friendly firing tank.
- Preserved the cyan displayed-class counter, neutral Engineer-reference counter, numeric-only treatment, existing count logic, and unobstructed target health bars.
- Desktop and mobile evidence under `output/reload-shot-count-target-desktop/` and `output/reload-shot-count-target-mobile/` confirms the cadence gap and `4` versus `3` result remain readable. Required generic-client evidence is under `output/reload-shot-count-target-generic/`; browser error logs are empty.
- Focused game coverage passes at 109 tests. Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No firing cadence, reload timing, projectile, impact, target, gameplay, balance, control, or save-data behavior changed.

## 2026-07-20 Left-Side Shot Counter Placement

- Moved each numeric shot counter from the cramped outer edge to the left of its enemy target.
- Positioned the counter slightly above the target center, immediately below the health bar, so the shell path and impact remain visible without erasing the count.
- Preserved the large numeric-only treatment, cyan displayed-class counter, neutral Engineer-reference counter, and deterministic `4` versus `3` comparison.
- Desktop and mobile evidence under `output/reload-shot-count-left-final-desktop/` and `output/reload-shot-count-left-final-mobile/` was inspected. Required generic-client evidence is under `output/reload-shot-count-left-final-generic/`; browser error logs are empty.
- Focused game coverage passes at 109 tests. Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No firing cadence, reload timing, projectile, impact, target, gameplay, balance, control, or save-data behavior changed.

## 2026-07-20 Engineer Trap Anchor Fix

- Fixed the Engineer Field Kit trap jumping downward when it transitioned from its armed sprite to the closing and locked jaw animation.
- The armed trap, triggered jaws, steel base, settled marker, and five-second effect bar now derive from one shared battlefield center.
- Preserved the existing placement, trigger timing, jaw-closing progress, complete five-second immobilization, expiry, and enemy movement behavior.
- Desktop and mobile captures under `output/trap-anchor-desktop-v2/` and `output/trap-anchor-mobile-v2/` were inspected across armed, closing, locked, countdown, and release states. Required generic-client evidence is under `output/trap-anchor-generic-v2/`; browser error logs are empty.
- Focused game coverage passes at 109 tests. Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, trap duration, damage, movement, controls, balance, or save data changed.

## 2026-07-20 Battle HE And Shield Showcase Refinement

- Battle Breakthrough now destroys the focused brick while the two adjacent showcase bricks visibly retain one HP after the existing one-point HE splash.
- Battle Field Kit now marks a three-HP focused target before the shot, removes it on the existing three-point direct hit, and leaves both four-HP neighboring tanks visibly damaged at three HP from splash.
- Replaced the Duel's modulo-driven full-circle shield pulse with one smooth directional deflection. Active shield hardware is visible before impact, then the front arc absorbs and calmly fades without repeated size snapping.
- Added a deterministic splash-outcome presentation model and coverage for the exact wall and clustered-tank HP transitions.
- Required generic-client evidence is under `output/battle-showcase-generic-breach/`, `output/battle-showcase-generic-shield/`, and `output/battle-showcase-generic-he/`. Full desktop and mobile captures are under `output/battle-showcase-final-desktop/` and `output/battle-showcase-final-mobile/`; screenshots were inspected and browser error logs are empty.
- Focused game coverage passes at 109 tests. Full validation passes with 33 files / 333 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.
- No gameplay mechanics, damage values, splash radius, shield capacity, controls, balance, or save data changed.

## 2026-07-20 Carousel And Real-Gameplay Synchronization

- Expanded Tank Select mouse targets from the small painted arrow rectangles to the complete visible side gutters beside the theater and description, while preserving keyboard wrapping and Enter-to-equip behavior.
- Implemented the Battle Tank's advertised wall splash in real play: a direct HE hit keeps its existing three-point damage, while orthogonally adjacent brick tiles inside the existing 40px radius take the existing one-point splash. Diagonal tiles outside 40px remain untouched, and Scout/Engineer shells remain non-explosive.
- Connected shield absorption to a restrained cyan segmented deflection rendered on the real battlefield. A selected Battle Tank enters a new mission with one shield point, the first one-point hit consumes it without reducing HP, and the HUD reflects the transition.
- Extended the hidden class-kit range to a three-brick target so the focused destruction and two damaged neighbors can be inspected visually.
- Added deterministic unit coverage plus `qa/playwright/tank-class-gameplay-sync-smoke.mjs`, which uses a real mouse click at the expanded carousel edge, equips Battle, launches Campaign, observes a real enemy shot being absorbed, and verifies real HE wall impact behavior.
- Focused tests pass at 136 tests. Browser evidence is under `output/gameplay-sync-e2e-final/`, `output/gameplay-sync-class-equipment-final/`, `output/gameplay-sync-carousel-final/`, and `output/gameplay-sync-generic-final/`; screenshots were inspected and browser error logs are empty.
- Full validation passes with 33 files / 334 tests, production build, server smoke, attended-v2 lifecycle consumer validation, visual contrast, Product Review Warden, and the deterministic Deep Agent stub.

## 2026-07-20 Tanchiki2 Boot Camp Tutorial — Package 1

- Created the attended-v2 feature worktree from exact `origin/main` head `2080a3fb7e641f5edd383e1d3113fc0d47847df4`; the dirty original checkout and unrelated PR #79 remain untouched.
- Added a distinct tutorial run kind, focused Boot Camp entry, sequential replayable mission selection, adaptive briefing loadout context, and Garage return flow.
- Added six data-driven mission definitions, dialogue/trigger/camera/actor/adaptive-goal contracts, additive v1 save normalization for tutorial completion, and tutorial state in both snapshots and readable text.
- Tutorial starts and loadout changes preserve any Campaign resumable-run slot. Quitting a drill returns to Boot Camp selection instead of creating a resumable tutorial run.
- Package prompt validation and the attended-v2 operating-mode guard pass. The optional read-only Harness v2 shadow collided with a pre-existing immutable manifest digest; the canonical validator remained green and the harness checkout was restored clean.
- Focused Boot Camp tests pass at 5 tests. The full suite passes at 34 files / 339 tests, and the production build passes.

## 2026-07-20 Tanchiki2 Boot Camp Tutorial — Package 2

- Added an event-observing tutorial director for confirm, movement, turn, fire, destroy, relay, deployable, Mod, flag, objective, and camera triggers.
- Opening orders and camera tours hold player control and danger. Camera tours steer smoothly, clamp to the battlefield, reveal the objective through a tutorial-only vision circle, hold hostile AI/spawning, protect the player/base, and return to player follow.
- Added the restrained live radio strip and one current training goal in the right HUD. Enter or tapping the strip advances dialogue; touch layout moves the strip above the combat controls.
- Failure restarts the current drill. Tutorial completion persists only the mission ledger, leaves Campaign credits/XP/unlocks/ranking untouched, and preserves an existing Campaign resumable-run slot.
- Added deterministic director/runtime coverage and browser choreography for the live radio and Mission 2 camera tour. Generic-client and camera evidence are under `output/boot-camp-package2-live-v2/` and `output/boot-camp-package2-camera-v2/`; screenshots were inspected, state text matched, and browser error logs were empty.
- Full tests pass at 35 files / 344 tests, and the production build passes.

## 2026-07-20 Tanchiki2 Boot Camp Tutorial - Package 3

- Boot Camp friendly actors now receive their declared Scout, Engineer, and Battle Tank class stats, shields, movement, reload, damage, splash, weight, visuals, and class shell presentation. Ordinary Campaign bot creation remains classless and unchanged.
- Needle and Spanner deploy real class equipment with explicit owner tank, side, and team metadata. Trigger checks keep the instructor squad safe from its own devices while preserving compatibility for existing Campaign saves and legacy prototype behavior.
- Instructor Major Mods execute as owner-labelled effects: Needle can use actor-local Overdrive, Spanner can deny a hostile lane with a Czech Hedgehog, and Brick can create a Pontoon route. The player's selected Mod lane is reserved so instructor actions cannot complete or block the adaptive player goal.
- Tank serialization now preserves class, call sign, Major Mod, script state, shield, and actor-local Mod state. Classed instructor shells use real damage/splash and the class-specific projectile art.
- Added deterministic actor-mechanics coverage and browser choreography. Generic-client and Mission 3 evidence are under `output/boot-camp-package3-client/` and `output/boot-camp-package3-instructors/`; both screenshots were inspected, instructor loadouts/devices/Mods matched readable state, and browser error logs were empty.
- Focused actor coverage passes at 3 tests. The full pre-package suite remains green at 35 files / 344 tests, and the production build passes.

## 2026-07-20 Tanchiki2 Boot Camp Tutorial - Package 4

- Finished all six short drills across Defense, shared-vision Defense, Team Battle, CTF, FFA, and Assault, including sequential objectives, completion radio exchanges, recurring instructors, and family-safe military banter.
- Added map-level safety and reachability checks for every mission, including safe actor spawns, objective paths, Pontoon-capable water routes, and a destructible Assault-core breach.
- Added player-only tutorial flag handling, manual touch flag drop/recovery, touch Mod and class-kit targets, and readable instructor call signs. The adaptive tactic lane remains tied to the player's actual class and Major Mod.
- Added the Boot Camp operator guide plus deterministic six-mission desktop and touch QA choreography.
- Six-mission browser evidence is under `output/boot-camp-package4-six-missions-v1/`; touch evidence is under `output/boot-camp-package4-touch-v2/`; required generic-client evidence is under `output/boot-camp-package4-generic-final/`. All final screenshots were inspected, readable text matched the requested mission/mode/goal state, and browser error logs were empty.
- The full suite passes at 36 files / 352 tests, and the production build passes.

## 2026-07-20 Boot Camp Player-Feedback Revision

- Removed base-loss failure from the first two Defense drills by keeping their training base indestructible; Campaign base damage and defeat behavior remain unchanged.
- Replaced the centered tutorial briefing with one left-anchored address from General Rook, including an animated pixel portrait, mission summary, loadout guidance, and the existing three actions without adding extra panels.
- Slowed the director cadence: normal radio lines now hold for six seconds, camera tours hold longer, every tutorial mission uses a wider hostile spawn interval, and the first hostile no longer appears immediately at drill start.
- Added deterministic coverage for base safety, readable General Rook briefing text, six-second dialogue timing, camera pacing, spawn cadence, and portrait animation.
- Browser evidence is under `output/boot-camp-feedback-six-missions-v1/` and `output/boot-camp-feedback-focused-v4/`; all six briefings plus the two portrait frames, live radio reading beat, and delayed-hostile state were inspected, with empty browser error logs.
- Full validation passes at 36 files / 357 tests with build and server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, the generic web-game client, and the attended-v2 operating-mode guard.

## 2026-07-20 Boot Camp Commander-Panel and First Gear Revision

- Replaced the bottom tutorial radio strip with one persistent upper-left General Rook command presence. Live instructions type at 20 characters per second, Enter/tap completes before advancing, and finished transmissions collapse to the blinking portrait alone.
- Simplified First Gear into a base-free Tank Hunt. Its map, marker, HUD, copy, AI roles, and win condition contain no eagle-base objective; the only combat objective is destroying two enemy tanks.
- Preloaded both Mission 1 enemies behind the tutorial safety hold and added a three-stop range-control tour of the left hostile, central obstacle lanes, and right hostile before movement control returns.
- Added deterministic director/runtime coverage for typewriter state, fast-forward semantics, waypoint sequencing, preloaded enemies, and the absence of a Mission 1 base.
- Consolidated official range-control dialogue under General Rook so the persistent portrait and speaker agree; Needle, Spanner, and Brick retain their own squad radio banter.
- Browser choreography in `qa/playwright/boot-camp-rook-tour-smoke.mjs` verifies the animated typing frames, complete sentence, face-only state, all camera stops, player-follow return, base-free readable state, and empty browser errors. Final inspected evidence is under `output/boot-camp-rook-tour-v4/`, with all-six-mission coverage under `output/boot-camp-rook-six-missions-v3/`, touch coverage under `output/boot-camp-rook-touch-regression-v2/`, and the required generic-client capture under `output/boot-camp-rook-generic-v1/`.
- Full tests and build pass at 36 files / 358 tests. `npm.cmd run validate`, visual contrast, Product Review Warden, Deep Agent stub runtime, and the attended-v2 operating-mode guard are green.

## 2026-07-21 Boot Camp Narration-Pacing Revision

- Added a 0.65-second typewriter pause between sentences in one transmission plus a guaranteed 1.5-second reading beat after the final character before an instruction can clear automatically.
- Latched tutorial actions while narration is active: easy or momentary actions still count, but they cannot interrupt General Rook or replace the current order mid-sentence.
- Consolidated First Gear into a short three-cell movement lap followed by one coherent engagement lesson covering deliberate fire, reload and ammunition awareness, cover, and destruction of both enemy tanks.
- Extended deterministic and browser choreography to verify the movement goal cannot race the narration, the completed sentence remains readable during its breathing beat, and touch-only transient actions still advance after their instruction settles.
- Inspected punctuation-pause, movement-hold, and engagement-order screenshots under `output/boot-camp-rook-pacing-v3/`; all-six-mission, camera, touch, and required generic-client checks are green with empty browser error logs.
- Full validation passes at 36 files / 360 tests. Build, server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, and the attended-v2 operating-mode guard are green.

## 2026-07-21 Boot Camp Objective-Flow Revision

- Rebuilt Borrowed Flag around a transfer checkpoint instead of an arbitrary drop/recovery checklist. The only crossing seals when the flag is stolen; the marked north XFER pad is the sole valid manual-drop point, sends the flag to the south pad, and reopens the gate for a necessary recovery.
- Added a calm XFER objective marker, checkpoint camera reveal, concise desktop/touch goals, transfer feedback, readable-state details, and data-driven transfer state that leaves ordinary Campaign CTF unchanged.
- Fixed the graduation Assault root cause: its objective and camera targeted an empty cell while the map supplied no base core there. The marker now targets the real `E` core tile at `(10,2)`, so player and instructor shells reduce its HP and can complete Boot Camp.
- Added deterministic coverage for the sealed-map route, wrong-pad rejection, gate state, flag transfer/recovery, core tile alignment, and the complete director flow.
- Added real-input browser choreography for the entire CTF theft-transfer-recovery-capture route and the full Assault graduation through `CORE 0/3` to `BOOT CAMP COMPLETE`.
- Inspected desktop and touch evidence under `output/boot-camp-objective-repair-v4/` and `output/boot-camp-objective-touch-v2/`; the complete two-drill smoke, six-mission regression, and required generic client are green with empty browser error logs. Full validation passes at 36 files / 363 tests, together with production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, prompt validation, and the attended-v2 operating-mode guard.

## 2026-07-21 Boot Camp Contextual Action Cues

- Added one compact, pulsing action cue anchored beside the player's tank after tutorial narration releases control. The cue derives from the active trigger and equipped adaptive path, covering confirmation, movement/turning, fire, relay, class-kit placement, Major Mod use, flag navigation, and flag drop.
- Kept the battlefield calm by hiding cues during normal narration and camera tours, removing them as soon as the required action advances the drill, and flipping them below the tank when nearby instructor vehicles occupy the space above.
- Made the CTF prompt stateful: it shows movement controls and `TO XFER` while approaching the north pad, then changes to `R DROP FLAG` or the touch flag action only on the pad.
- Mirrored the active cue in `GameSnapshot.tutorial` and readable text, and added deterministic mapping/lifecycle coverage plus real-input desktop and touch choreography.
- Inspected every cue state under `output/boot-camp-action-cues-v5/` and final touch cues under `output/boot-camp-action-cues-touch-v3/`; full CTF/Assault completion, all-six-mission, and required generic-client regressions are green with empty browser error logs. Full validation passes at 36 files / 365 tests, together with production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, prompt validation, and the attended-v2 operating-mode guard.

## 2026-07-21 Boot Camp Speaker Portraits and Persistent Confirmation

- Added distinct animated pixel command portraits for Needle, Spanner, and Brick while retaining General Rook as the idle range-control presence.
- Changed confirmation-step pacing so the final fully typed order remains visible indefinitely with its Enter/tap prompt; player control stays safely held until explicit confirmation.
- Added deterministic director coverage for the held final order and browser choreography for all three portraits, unique palettes, typewriting, long-delay persistence, locked movement, confirmation release, and browser errors.
- Required generic-client evidence was refreshed under `output/boot-camp-speaker-update-generic/`; focused portrait/persistence evidence is produced by `qa/playwright/boot-camp-speaker-portraits-smoke.mjs`.
- Inspected Needle, Spanner, Brick, and long-held confirmation screenshots under `output/boot-camp-speaker-portraits-smoke/`; portrait signatures are distinct and browser errors are empty. Full validation passes at 36 files / 366 tests, with all-six-mission, General Rook tour, instructor synergy, visual contrast, Product Review Warden, Deep Agent stub, canonical prompt validation, and the attended-v2 guard green. The optional Harness v2 read-only shadow still reports its pre-existing immutable-manifest digest collision after validating this prompt with zero blockers; its generated baseline changes were restored and the harness checkout is clean.
- Exact-head PR audit surfaced one current P2 in the pre-existing Boot Camp menu flow. Main-menu Garage entry now restores Campaign run context after merely browsing Boot Camp, so a team or Mod change correctly invalidates a stale resumable Campaign run; the briefing-specific `Change Loadout` path remains tutorial-scoped and preserves that slot.
- The P2 regression is covered by a deterministic save-state test and a complete browser flow in `qa/playwright/boot-camp-main-menu-garage-smoke.mjs`; inspected evidence under `output/boot-camp-main-menu-garage-smoke/` shows Pontoon equipped in Campaign context, no resumable run, and no browser errors. Final validation passes at 36 files / 367 tests with contrast, Product Review Warden, Deep Agent stub, generic-client, and diff checks green.

## 2026-07-21 Boot Camp Contextual Cue Expiry and Direction Art

- Contextual action cues now remain beside the player for ten seconds after each distinct cue appears, then disappear without removing the persistent HUD goal or a confirmation-step radio instruction.
- Cue identity includes its action and controls, so stateful changes such as CTF `TO XFER` becoming `DROP FLAG` receive a fresh ten-second teaching window.
- Replaced ambiguous pixel-font direction characters with dedicated high-contrast pixel arrow sprites. Readable state now names the inputs as `LEFT`, `UP`, `DOWN`, and `RIGHT` while desktop and touch Canvas rendering use the compact icons.
- Added deterministic lifecycle coverage plus browser assertions for pre-expiry visibility, post-expiry absence, retained radio/HUD guidance, semantic readable text, and empty console output.
- Inspected movement, expired confirmation, CTF transfer, touch, and bundled generic-client screenshots under `output/boot-camp-action-cue-expiry-v1/`, `output/boot-camp-cue-expiry-portraits-v1/`, `output/boot-camp-action-cue-touch-expiry-v1/`, and `output/boot-camp-action-cue-generic-v1/`.
- Full validation passes at 36 files / 368 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, desktop/touch cue choreography, and diff checks are green.

## 2026-07-21 Boot Camp Two-Pass CTF Handoff

- Reworked Borrowed Flag into two clearly separated captures: the first is a direct steal-and-return run through an open crossing, while the second seals the steel checkpoint and teaches a necessary squad handoff.
- The second run directs the player to the marked XFER pad and shows the contextual desktop `R DROP FLAG` cue or touch flag action only when the handoff is valid.
- Brick now waits beyond the wall, receives the dropped flag, and drives it home with real Battle Tank movement. The safe tutorial camera follows his run while hostile danger remains held.
- General Rook explains that passing the flag across divided terrain keeps the operation moving and increases efficiency. The completed handoff scores the required second flag, so the HUD and win condition now agree at `2/2`.
- Added deterministic coverage for both captures, second-run wall activation, invalid drops, Brick's pickup and return, actor-follow camera state, and player-cue ownership.
- Inspected desktop, touch, all-six-mission, and bundled generic-client evidence under `output/boot-camp-two-pass-ctf-v2/`, `output/boot-camp-two-pass-cues-v1/`, `output/boot-camp-two-pass-touch-v1/`, `output/boot-camp-two-pass-six-missions-v1/`, and `output/boot-camp-two-pass-generic-v1/`; browser error logs are empty.
- Full validation passes at 36 files / 368 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 operating-mode guard, and diff checks are green.

## 2026-07-21 Boot Camp FFA Relay Doctrine

- Rebuilt No Friendlies on the Form around a protected relay curriculum before live combat: deploy the portable set, observe its echo pulse, identify a planted false hostile contact, hear General Rook's verification doctrine, recover the set, fire a calibration round, and replenish it at the yellow ammo station.
- Added step-scoped danger holds so the relay, decoy, recovery, and resupply lessons cannot be disrupted by early FFA spawning. Player movement remains available for the interactive steps.
- Added data-driven scripted tutorial deployables and relay triggers for placement, a named signal contact, and recovery. The decoy remains hidden outside direct vision until the relay discovers it and the safe camera reveals it.
- Raised the FFA target from two to four player kills, added five neutral spawn points, and enabled continuous replacement spawning capped at five live tanks. Neutral-on-neutral kills no longer exhaust the player's objective opportunities.
- Added a post-first-kill relay relocation order so the lesson demonstrates moving reconnaissance equipment with the fight instead of abandoning it.
- Focused deterministic coverage passes at 3 files / 36 tests. Desktop and touch browser evidence is under `output/boot-camp-ffa-relay-v1/`; all-six-mission regression evidence is under `output/boot-camp-ffa-relay-six-missions-v1/`; required generic-client evidence is under `output/boot-camp-ffa-relay-generic-v1/`. Screenshots and readable state were inspected, and browser error logs are empty.
- Full validation passes at 36 files / 371 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 operating-mode guard, and diff checks are green.

## 2026-07-21 Boot Camp CTF Permanent-Trap Ambush

- Replaced the second-run checkpoint wall and XFER pad with a permanent trap at the map's only crossing. The first capture remains a clear flag return; the second looks ordinary until the carrier reaches the crossing and is immobilized.
- The trapped player cannot move or complete the drill until dropping the flag with R or the touch flag action. Only after the trap springs does the HUD expose the DROP marker and General Rook explain the combat handoff.
- Removed advance disclosure of the special second run from the briefing and early dialogue. General Rook now explains the handoff's efficiency only after Brick receives the flag.
- Removed the roaming Needle actor from this drill after browser reproduction showed that the ally could occupy the single southern approach and pin the player at their own base. Brick is now the only staged receiver.
- Made CTF pickup, transfer, and first-capture triggers resilient to actions completed while narration is still running. Brick remains at his receiving position until the handoff step and the camera follows him without a time limit until the 2/2 capture.
- Added deterministic coverage for the permanent trap, state-based fast-player progress, forced drop, delayed Brick activation, capture-bound camera follow, surprise copy, single-crossing topology, and the persistent trap sprite.
- Desktop evidence is under `output/boot-camp-ctf-permanent-trap-v3/` and `output/boot-camp-ctf-trap-cues-v1/`; touch evidence is under `output/boot-camp-ctf-trap-touch-v1/`; all-six-mission regression evidence is under `output/boot-camp-ctf-trap-six-missions-v1/`; final bundled generic-client evidence is under `output/boot-camp-ctf-trap-generic-v2/`. Screenshots and readable states were inspected, including a no-wait fast-player completion, and browser error logs are empty.
- Full validation passes at 36 files / 371 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, canonical prompt validation, attended-v2 operating-mode guard, and diff checks are green.

## 2026-07-21 Boot Camp Review Reliability Pass

- Unified tutorial radio rendering and pointer hit-testing behind one shared geometry contract, with a touch-only browser regression that advances the visible panel without keyboard input.
- Removed Mission 2's finite-enemy baseline trap by holding danger through shared-contact acquisition and counting absolute squad defeats. One hostile now begins outside direct tank vision so relay information is necessary.
- Made the CTF handoff recoverable: the trapped player remains immobilized, Brick is restored before the transfer, reserved route cells are cleared, and a bounded stall fallback prevents an indefinite actor-follow camera.
- Replaced label-only tactic checks with cumulative movement plus turning, marked class-kit and Major Mod zones, Battle hit/shield contribution, absolute FFA kill totals, physical decoy inspection, covered relay relocation, and player-only six-HP Assault core damage.
- Added a live-FFA combat checkpoint, a non-color ammo marker, recurrent action cues, semantic touch legends, concise accessibility announcements, and reduced-motion behavior for typewriting, portraits, camera tours, and cue animation.
- Updated the canonical tutorial documentation and desktop/touch browser choreography to match the permanent CTF trap, marked tactic zones, relay inspection route, and six-HP graduation core.
- Final validation is green at 38 files / 383 tests. `npm.cmd run validate`, production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, desktop/touch tutorial regressions, and the canonical bundled web-game client all pass. Inspected evidence is under `output/boot-camp-review-accessibility/`, `output/boot-camp-ffa-relay-smoke/`, `output/boot-camp-objective-repair-smoke/`, `output/boot-camp-action-cues-smoke/`, and `output/boot-camp-review-generic-final/`; captured browser error logs are empty.

## 2026-07-21 Boot Camp Loading Copy Repair

- Production smoke after PR #97 exposed Campaign Level 1 base orders and HUD art behind First Gear's loading overlay, even though the drill itself was correctly base-free.
- Tutorial loading now uses the mission's actual win condition, says `READYING DRILL`, and covers the full Canvas so stale Campaign state cannot show through. Campaign loading remains unchanged.
- Added a deterministic tutorial-loading regression. Full validation passes at 38 files / 384 tests, visual contrast passes, and the inspected loading capture under `output/loading-copy-smoke/` has no browser errors.

## 2026-07-21 Tablet Touch Controls

- Original follow-up prompt: implement the selected floating-joystick tablet control plan, including direct Relay/Mod touch targets, handedness, portrait-tablet gating, tutorial cues, and complete browser validation.
- Started from clean exact `origin/main` `768ca8c6102cd1a8e6aa19909e0de423de43ee92` in isolated worktree `D:\projects\tanchiki-tablet-touch-controls-v1`; the dirty canonical checkout and its attachments remain untouched.
- Resolved the selected visual target to the large floating joystick mock at `C:\Users\Legion\.codex\generated_images\019f801b-21b8-70a1-bd9d-ada0fc64a130\exec-8ce0bdff-aa4b-4e1b-9335-725a1c9e219d.png` and inspected both supplied tablet captures.
- Replaced the fixed movement pad with a floating four-cardinal joystick using a 10px deadzone, 32px clamp, 6px hysteresis, single-pointer drag ownership, and concurrent Fire touch. Standard and mirrored layouts share one draw/hit-test geometry contract and persist through the existing v1 save.
- Added direct real-art Relay and equipped Mod actions: Relay preserves 1.2s place / 0.9s recover holds; Pontoon, Hedgehog, and EMP use a 0.4s confirmation hold with placement footprints; Overdrive remains immediate. Drag-away/release cancellation, invalid placement feedback, and progress rings are covered.
- Added the coarse-pointer portrait-tablet gate at 600px minimum width. Offline simulation freezes, Quick Match does not connect, connected online play remains live with released controls, and narrower portrait phones remain playable. Online touch exposes joystick, Fire, Pause, handedness, and orientation state only.
- Updated tutorial cues and readable snapshots to teach `DRAG TO MOVE`, `RELAY ICON`, and `MOD ICON`; reused the existing pixel art system for every visible control asset.
- Device smoke passes standard/mirrored tablet layouts, multi-touch, Relay place/recover, all four Mods, portrait-tablet freeze, blocked portrait matchmaking, and portrait-phone playability. The legacy mobile smoke and bundled canonical web-game client also pass; captured state and screenshots are under `output/tablet-touch-v1/`.
- Exact 1600x1000 reference/implementation comparison passed and is recorded in `design-qa.md`. Full validation passes at 40 files / 395 tests, production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle telemetry, and diff checks are green.

## 2026-07-21 Tablet Side-Rail Controls

- Removed the temporary Vercel preview project and its PR comment. GitHub Pages remains the only deployment route; the protected `github-pages` environment still correctly accepts `main` only.
- Moved the tablet joystick into the unused left page margin and Fire into the matching right margin. The battlefield Canvas is larger than in the supplied tablet capture and no touch control obscures combat.
- Made the existing left-HUD portable-relay sprite the Relay target and the existing right-HUD player-tank portrait the Major Mod target. Hold, cancellation, invalid placement, and progress feedback now stay attached to those semantic assets.
- Standard mode is left-Move/right-Fire. Mirrored accessibility swaps only the two side rails; Relay and Mod remain fixed to their HUD art. Portrait phones retain the in-Canvas fallback, while tablet portrait keeps the existing rotate gate.
- Updated tutorial touch language to `RELAY ICON` and `TANK ICON`, refreshed accessible text, and migrated browser QA selectors to the primary game Canvas now that two dedicated rail canvases exist.
- Tablet smoke passes standard/mirrored placement, simultaneous move/fire, Relay place/recover, all Major Mods, portrait-tablet safety, blocked portrait matchmaking, and phone fallback with empty blocking console output. Boot Camp adaptive Mod and FFA Relay touch choreography also pass.
- Full validation passes at 41 files / 399 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, paired visual comparison, and diff checks are green; final design QA is recorded in `design-qa.md`.

## 2026-07-21 Tablet Touch Tidy Follow-up

- Original follow-up prompt: make tutorial briefing taps confirm reliably, keep the movement disc inside its boundary, prevent the tank-portrait Mod affordance from obscuring lower HUD text, and tidy the tablet controls overall.
- Started from deployed `origin/main` `10efac3258d6a24389870ec8b0bed619831120c6` in isolated worktree `D:\projects\tanchiki-tablet-touch-controls-tidy-v2`; the dirty canonical checkout and supplied attachment remain untouched.
- Fixed the side-rail joystick to a stable center, reduced its visual footprint, and clamped the complete knob inside the base ring even when a touch begins near the rail edge. Fire received a matching compact visual pass without reducing its hit surface.
- Added a deduplicated Canvas click fallback for tutorial briefing confirmation, while preserving pointer-down response and allowing non-mouse touch pointers with browser-specific button values.
- Tightened the Major Mod activation ring to the tank portrait and removed its redundant `MOD` label so Lives and Major Mod status copy retain clear space.
- Focused input, side-rail geometry, and tutorial-radio tests pass at 3 files / 31 tests. The 1280x711 focused tablet smoke uses real `touchscreen.tap()` events and passes briefing confirmation, fixed joystick containment, portrait Mod hold progress, and empty blocking console output.
- Inspected focused screenshots under `output/tablet-touch-tidy-v2/focused-rerun/`, standard/mirrored device regression evidence under `output/tablet-touch-tidy-v2/tablet-smoke/`, and required bundled-client evidence under `output/tablet-touch-tidy-v2/canonical-client/`.
- Full validation passes at 41 files / 402 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, canonical client, focused tablet smoke, legacy tablet regression, and diff checks are green.

## 2026-07-21 Tablet Remote-Test Interaction Pass

- Preserved the private Tailscale Serve route at `https://marselkhaliullin.tailce7629.ts.net/tanchiki-preview/?skipSplash=1`, backed by the isolated PR worktree Vite server on port 5174. The existing root Serve route remains untouched.
- Traced the one-finger portable Relay failure to Android's long-press `contextmenu` event releasing every active control during the 1.2-second hold plus strict hit-boundary cancellation from ordinary fingertip drift. Touch-owned Relay and Mod holds now suppress that browser event, and Relay/phone-Mod holds gain continuation slop after a precise initial press; mouse right-click release and deliberate drag-away cancellation remain unchanged.
- Added a dedicated `NEXT` button in the center of the movement rail while tutorial dialogue is active. It advances exactly one radio order without moving or spending a shell; tapping the radio panel remains supported.
- Moved the tablet Major Mod action from the right-HUD portrait to a separate real-tank button above Fire on the same side rail. Mirrored controls keep the Mod above whichever rail owns Fire; portrait phones retain the original Canvas fallback.
- Focused input, rail geometry, tutorial-cue, and accessibility coverage passes at 4 files / 51 tests. Browser choreography and full validation remain TODO for this exact delta.
- Browser validation passes at 1280 x 711 and 1280 x 800 for joystick-center confirmation, standard/mirrored rails, concurrent move/fire, synthetic Android long-press Relay placement, all Major Mods, drag cancellation, portrait gating, and phone fallback. Boot Camp adaptive/CTF touch flows and the full FFA relay lesson also pass with empty error logs.
- Inspected the focused, standard, mirrored, phone, and FFA Relay screenshots under `output/tablet-remote-interaction-v1/`; `render_game_to_text` reports `Tap Mod above Fire` and the contextual joystick-center confirmation label.
- The canonical bundled web-game client passed against the private Tailscale URL; its screenshot/state are under `output/tablet-remote-interaction-v1/tailscale-canonical/` with no browser-error artifact.
- Full validation passes at 41 files / 406 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, canonical prompt validation, attended-v2 operating-mode guard, and diff checks are green.
- This exact tested delta is ready for PR #100. Keep the Tailscale Serve mapping and Vite process running so the user can test the new head on the tablet before exact-head approval/merge.

## 2026-07-21 Tablet Side-Rail Slider Follow-up

- Moved portable Relay placement from the left HUD to its own real-sprite button above the joystick. The action follows the movement rail in mirrored mode, preserves one-finger place/recover holds and Android long-press suppression, and removes the duplicate tablet Canvas hotspot.
- Replaced the Major Mod tap/hold button with a centered vertical slider above Fire. A gesture must begin on the tank knob and reach the top before activation; partial gestures cancel, the completed state latches briefly, and Fire remains a separate lower target. Portrait-phone fallback controls remain unchanged.
- Added a visible press-depth/ripple animation plus short touch vibration to the joystick-center `NEXT` action. It still advances exactly one tutorial radio order without moving or firing.
- Updated action cues, accessible/readable text, snapshot state, rail ARIA labels, focused geometry/input tests, and browser QA choreography for the new Relay and Mod interactions.
- Focused tests pass at 4 files / 53 tests. Full validation passes at 41 files / 408 tests, including the production build/server smoke and attended-v2 lifecycle contract. Visual contrast, Product Review Warden, Deep Agent stub runtime, and the attended-v2 operating-mode guard are green.
- Tablet browser evidence under `output/tablet-touch-tidy-v2/slider-focused/` and `output/tablet-touch-tidy-v2/slider-regression/` covers briefing confirmation, Relay drift/context-menu behavior, partial-slider cancellation, all Major Mods, mirrored controls, concurrent movement/fire, orientation gating, and phone fallback with no blocking console output. The canonical bundled client passed against the private Tailscale URL under `output/tablet-touch-tidy-v2/slider-tailscale-canonical/`.
- Inspected the briefing, idle, midpoint-slider, standard, and mirrored screenshots. The battlefield remains the single dominant surface; controls use the otherwise-empty side rails and no action target obscures combat or lower HUD text.

## 2026-07-21 Live Radio Safety and Mod Cooldown Follow-up

- Separated formal control-holding tutorial orders from ordinary live radio narration. The joystick-center `NEXT` action now appears only for opening confirmations and camera-control moments; General Rook can continue speaking during combat without replacing movement input.
- Extended tutorial danger holds to remove hostile shells already in flight as well as pausing hostile AI and spawning. A player whose controls are formally held can no longer be damaged by an approaching tank's earlier shot.
- Removed the tank sprite from the Major Mod slider and replaced it with the equipped Mod's compact pixel glyph. Overdrive now uses a dedicated speed-bolt symbol rather than a miniature vehicle.
- Moved Mod runtime feedback onto the same slider: Overdrive shows active time and a bottom-up cooldown refill with seconds remaining, while placement Mods show deployed or spent state. The slider's activation flash resets before the cooldown meter takes over.
- Focused input, side-rail, and tutorial-director coverage passes at 3 files / 63 tests. Full validation passes at 41 files / 411 tests, with visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 operating-mode guard, and diff checks green.
- Tablet browser evidence covers live movement during Rook's narration, protected hostile-shell handling, the symbol-only Mod slider, cooldown refill, Boot Camp touch actions, and the complete FFA Relay lesson. The canonical bundled client passes against the private Tailscale preview with no browser-error artifact.

## 2026-07-21 Native Class Kit and Briefing Focus Follow-up

- Added the equipped tank class's two native gear actions to a compact `CLASS KIT` row at the top of the Fire rail. Scout exposes Decoy/Wire, Engineer exposes Mine/Trap, and Battle Tank keeps the row absent because its native shield and splash shell are passive/Fire-based.
- Native gear uses its real pixel art and real hold mechanics. Each direct target shows ready, hold progress, and deployed/out state; Android long-press suppression and drag-away cancellation match the Relay interaction.
- Removed the duplicate tablet hit targets from the bottom class-kit status strip. On side-rail tablets the right-side kit row is the single touch action surface, while the bottom strip remains a readable equipment status display.
- Simplified blocking mission confirmation to the joystick rail alone. Relay, native gear, Major Mod, and Fire are both hidden and non-interactive until the player presses the joystick-center `NEXT`; all controls return when live play begins.
- Focused input, rail geometry, and accessibility tests pass at 3 files / 43 tests. Full validation passes at 41 files / 413 tests, with production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 guard, and diff checks green.
- Inspected the blocking briefing, Engineer Mine/Trap hold, standard, mirrored, and Mod-slider screenshots under `output/tablet-touch-tidy-v2/`. Tablet control, Boot Camp touch, FFA Relay, and canonical private-Tailscale browser runs pass with no blocking console or browser-error artifact. No implementation TODO remains for this follow-up.

## 2026-07-21 Restored Live Touch Controls

- Fixed a run-context leak where resuming a saved Campaign after entering Boot Camp could retain the old tutorial director snapshot. The side-rail renderer interpreted that stale held dialogue as a blocking briefing and visually hid Relay, class kit, Major Mod, and Fire while leaving only the joystick.
- Campaign restore now clears tutorial director/action-cue state, inactive tutorial snapshots no longer project stale director fields, and briefing-only rail mode explicitly requires an active tutorial run.
- Added deterministic coverage for Campaign save -> Boot Camp -> Campaign Continue and the active-tutorial-only rail predicate. Focused tests pass at 3 files / 56 tests.
- Added a complete browser regression at `qa/playwright/tablet-touch-control-visibility-smoke.mjs`. Inspected `output/tablet-touch-tidy-v2/control-visibility-fix/campaign-controls-restored.png`: joystick, Relay, Engineer Mine/Trap, Major Mod slider, and Fire are all visible after Campaign resume; readable state lists every action and browser errors are empty.
- The required bundled web-game client also passes against the preserved localhost/Tailscale Vite process under `output/tablet-touch-tidy-v2/control-visibility-canonical/`; its state reports `runKind: campaign`, inactive/null tutorial fields, and all touch labels.
- Full validation passes at 41 files / 415 tests. Production build/server smoke, visual contrast, legacy tablet controls, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle smoke, and diff checks are green.

## 2026-07-21 Full Rails During Battlefield Briefings

- Corrected the briefing interpretation after the user's tablet screenshot showed that a loaded battlefield already counts as in-game. Blocking General Rook narration now keeps the complete tablet layout visible: Relay and `NEXT` on the movement rail, plus native class kit, Major Mod slider, and Fire on the opposite rail.
- Only `NEXT` accepts input while range control formally holds the player. The other visible controls are marked inactive for accessibility and remain ignored by the input controller, preventing accidental shells or equipment use.
- Updated the tablet browser regression to require the Fire-side controls to remain visible during the opening order while still being inactive. Focused tests pass at 3 files / 56 tests and the full tablet smoke passes with no blocking console output.
- Inspected `output/tablet-touch-tidy-v2/full-rails-during-briefing/tablet-briefing-before-tap.png`: all controls are visible around the loaded battlefield and none obscure combat or HUD text.
- Full validation remains green at 41 files / 415 tests, together with production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, the attended-v2 lifecycle check, canonical client, and diff checks.

## 2026-07-21 Compact Fire-Side Control Cluster

- Reorganized the Fire rail without changing the battlefield or joystick rail. Fire now sits toward the battlefield, the Major Mod slider runs vertically on its right, and the two active class-kit buttons form a compact row immediately above Fire.
- Reduced only the decorative Fire ring and Mod/gear circles enough to keep their touch regions distinct inside the existing rail. Relay, joystick geometry, Android hold behavior, Mod cooldown feedback, and mirrored accessibility remain unchanged.
- Updated hit-test constants, input coverage, semantic touch guidance, and tablet browser coordinates to match the new geometry. Deterministic layout checks require the Mod slider to be right of Fire and class gear to remain above it.
- Inspected standard, mirrored, cooldown, opening-briefing, native-kit hold, and slider-progress screenshots under `output/tablet-touch-tidy-v2/fire-cluster-layout-v1/`, `fire-cluster-regression-v1/`, and `fire-cluster-visibility-v1/`. The cluster is readable, clear of HUD text, and browser error logs are empty.
- Full validation passes at 41 files / 415 tests, with production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle checks, and the canonical web-game client green.

## 2026-07-21 Balanced Fire-Side Cluster

- Rebalanced the tablet Fire rail from the user's close-up: the Major Mod status now belongs directly to a shorter centered track, the slider knob has less visual weight, and the class-kit row sits slightly closer to the Fire action.
- Reduced only the decorative Fire ring and sprite while preserving its larger 38px touch radius. The Mod start target remains generous and distinct from Fire, and the battlefield dimensions are unchanged.
- Updated tablet browser choreography for the refined geometry. Focused tests pass at 3 files / 44 tests; inspected opening-briefing, native-kit hold, slider-progress, standard, mirrored, and Overdrive-cooldown screenshots under `output/tablet-touch-tidy-v2/balanced-fire-cluster-v1/` and `balanced-fire-cluster-regression-v1/` with empty blocking console output.
- The required bundled web-game client passes under `output/tablet-touch-tidy-v2/balanced-fire-cluster-canonical/`; its state mirrors the active touch actions and contains no browser-error artifact.
- Full validation passes at 41 files / 415 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle checks, and diff checks are green.

## 2026-07-21 Two-Column Fire-Rail Balance

- Reworked the earlier subtle balance pass after the user correctly noted that it still read like the old layout. The native class-kit row now spans the full rail and aligns as two exact columns over Fire and the Major Mod slider.
- Centered the `CLASS KIT` heading across the complete rail instead of over Fire alone. The first kit action shares Fire's x-axis, the second shares the Mod slider's x-axis, giving the group a clear 2 x 2 structure without adding panels or separators.
- Added a deterministic geometry assertion for the two aligned columns and updated tablet browser choreography. Focused tests pass at 3 files / 45 tests; both full tablet interaction suites pass across standard, mirrored, cooldown, briefing, hold, and slider states with empty blocking console output.
- Inspected the new screenshots under `output/tablet-touch-tidy-v2/two-column-balance-v2/` and `two-column-balance-regression-v2/`. The bundled web-game client also passes under `two-column-balance-canonical-v2/` with matching text state and no browser-error artifact.
- Full validation passes at 41 files / 416 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle checks, and diff checks are green.

## 2026-07-21 Battle Tank Active Kit and Battery Range

- Original follow-up prompt: replace the Battle Tank's passive shield with two active native abilities, update every Battle Tank presentation/tutorial surface, and add a no-fog map where a coordinated heavy battery can be evaluated in action.
- Started from clean exact `origin/main` `740e8a6cd0ec40d60b96d2a914f9829fd9154e65` in isolated worktree `D:\projects\tanchiki-battle-tank-active-kit-v1`; the dirty canonical checkout and existing tablet preview remain untouched.
- Replaced the passive shield point with `Bulwark Field`: five active seconds, three total absorbed damage, no refresh or stacking, then twelve seconds of recharge. Ordinary shield pickups remain a separate damage layer.
- Added `Traverse Mode`: four seconds of lateral-only movement at 80% normal speed while the hull and gun keep their original direction. The player may end it early, which immediately starts its ten-second recharge; collision and terrain rules remain unchanged, and Overdrive is moderated during Traverse.
- Added real keyboard (`1`/`2`) and tablet class-kit activation with active/cooldown state, pixel icons, readable snapshots, serialization, tutorial trigger coverage, and actor-aware use by Brick and scripted Battle Tank allies. Heavy HE remains the baseline Fire weapon rather than consuming a class-kit slot.
- Updated Tank Select's FIELD KIT theater, class descriptions, HUD copy, Boot Camp Mission 3 coaching, instructor behavior, README, and tutorial documentation. The theater now visibly demonstrates a partially spent Bulwark and lateral fire beneath a fixed gun line.
- Added the no-fog `Heavy Battery Proving Ground` at `?devLevel=battle_tank_battery`: three allied Battle Tanks strafe as an open-ground battery, cycle both active abilities, obey collision, and each carries eight shells. Brick/steel side mazes and two rear ammo stations expose terrain and logistics counters without artificial anti-stacking.
- The required bundled web-game client and focused desktop/tablet Playwright choreography pass with zero browser errors. `render_game_to_text` confirms 357/357 visible cells, fixed player/battery facing during lateral travel, active kit timers, and finite actor magazines. Inspected proving-ground, Bulwark theater, Traverse theater, and tablet-control captures under `output/`.
- Full validation passes at 42 files / 420 tests. Production build/server smoke, visual contrast, Product Review Warden, Deep Agent stub runtime, attended-v2 lifecycle checks, and diff checks are green. The private assessment preview is preserved at `https://marselkhaliullin.tailce7629.ts.net/battle-tank-preview/?skipSplash=1&devLevel=battle_tank_battery`.

## 2026-07-22 Bulwark Tracking and Traverse Theater Follow-up

- Original follow-up prompt: keep the shield-absorption halo attached to a moving tank and make Tank Select's lateral-movement scene show why Traverse controls the field better than ordinary turning and re-aiming.
- Anchored the short-lived shield-impact particle to the struck tank and synchronize its world position after movement and bullet resolution. The underlying active Bulwark field and the absorption flare now share the same moving center instead of leaving a halo at the old hit point.
- Rebuilt the Traverse theater beat around two narrow vertical lanes. A conventional Engineer turns upward, completes the move, turns its barrel back toward the target, and fires once; the Battle Tank holds a right-facing gun throughout the same vertical strafe and destroys three targets at lower, middle, and upper firing lines.
- Added deterministic coverage for moving shield-impact anchoring and the standard-turn versus Traverse motion phases. The required bundled client and focused Playwright captures pass with no console errors; inspected the impact/moving halo frames and both Traverse comparison phases under `output/bulwark-halo/`, `output/battle-showcase/`, and `output/battle-followup-canonical/`.

## 2026-07-22 Equal-Lane Comparison and Shield Visual Unification

- Original follow-up prompt: compare the ordinary and Traverse tanks against equal opposition, and make Bulwark's Tank Select animation match its real-battle feedback.
- Both narrow showcase lanes now contain the same three-target formation. The ordinary tank turns, moves, re-aims, and engages one target; the Traverse tank maintains its firing line during the same move and clears all three.
- Replaced the garage-only sweeping shield arc with the exact segmented expanding-ring renderer used by live shield impacts. Both Tank Select shield demonstrations now share the same timing, color, segmentation, and fade as battlefield Bulwark feedback, with proportional sizing for the larger theater tank.
- Focused tests pass at 118 tests and full validation passes at 42 files / 421 tests. Browser captures under `output/battle-showcase/`, `output/bulwark-halo/`, and the required bundled-client run under `output/battle-equal-shield-canonical/` were inspected; equal target counts and matching shield-impact language are visible with no console or page errors. Contrast, Product Review Warden, and Deep Agent stub checks also pass.

## 2026-07-22 Screen-Relative Traverse Controls

- Original follow-up prompt: fix Traverse movement when the Battle Tank faces east or west so Up performs the intuitive on-screen lateral move.
- Replaced relative Left/Right track commands with screen-relative directional input during Traverse. North/south-facing tanks still strafe with Left/Right; east/west-facing tanks now strafe with Up/Down. Forward and backward inputs remain blocked, and the hull/barrel direction stays fixed.
- Added deterministic coverage for all four facings, each valid lateral direction, and each blocked forward direction. A live browser reproduction under `output/traverse-input/` confirms an east-facing tank moves from row 15 to row 14 on Up without changing direction; the required bundled-client run under `output/traverse-input-canonical/` also passes without browser errors. Full validation passes at 42 files / 422 tests, along with contrast, Product Review Warden, and Deep Agent stub checks.

## 2026-07-22 Stationary Pivot Controls and Equal Battle Comparison

- Original follow-up prompt: let tanks turn without being forced to enter the adjacent tile, preserve the approved tap/hold control economy, and make Tank Select show an ordinary Battle Tank eventually clearing the same three-target lane as Traverse, only later.
- Started from clean exact merged `origin/main` `e17e92b947e169e29e9d4fecd20e359f3db8d221` in isolated worktree `D:\projects\tanchiki-stationary-pivot-v1`; the dirty canonical checkout and existing tablet/Tailscale preview remain untouched.
- Added one shared 160 ms stationary-pivot threshold. A new direction turns the tank immediately; release leaves it stationary, continued hold begins movement, the current facing moves immediately, and firing uses the tapped facing. Immobilization and tutorial camera control suppress both pivot and movement. Traverse keeps its screen-relative, immediate lateral movement with fixed facing.
- Kept online command packets unchanged. The server derives press/release edges, owns transient pivot state, exposes bounded progress in snapshots, clears it on death/respawn, and preserves direct AI movement without adding human input latency.
- Rebuilt the Traverse Garage beat with the same Battle Tank in both lanes and three targets per lane. Timing derives from the live 0.464-second Battle Tank move, 1.6-second reload, 0.16-second input gesture, and projectile travel. Traverse clears first while holding its firing line; the ordinary tank repositions and still reaches 3/3 before the result hold.
- Updated First Gear coaching, Encyclopedia/loading/help copy, accessible state text, Boot Camp documentation, and the Tank Select browser choreography. Focused tests pass at 4 files / 154 tests; the tablet pivot smoke proves quick-tap/no-move and held movement on a real side-rail pointer sequence with no blocking browser errors. Inspected the active joystick, settled tablet, Traverse-first, and both-3/3 captures under `output/stationary-pivot-v1/`.
- Full validation passes at 42 files / 427 tests, including production build, server smoke, all attended-v2 wrapper checks, visual contrast, Product Review Warden with zero open blocking debt, Deep Agent stub runtime, the updated Tank Select carousel, the required bundled web-game client, and clean diff checks.

## 2026-07-22 Buffered Mid-Move Steering Follow-up

- Original follow-up prompt: remove the sluggish pause when a new turn is requested halfway through an in-progress tile move.
- Direction input now buffers during the current tile without snapping the hull early. Its 160 ms hold time accrues while the tank is still moving, so a sustained direction pivots and begins the next tile in the same boundary update instead of starting a fresh wait after arrival.
- A quick mid-move tap is also useful: it queues only the facing change at the boundary and leaves the tank stationary. Immobilization, tutorial control holds, Traverse behavior, and server-authoritative online input remain unchanged.
- Added equivalent offline and multiplayer coverage plus a real tablet pointer sequence. The touch smoke confirms queued progress is exposed in `render_game_to_text` and reports `bufferedTurnHadIdleFrame: false`; the inspected boundary frame shows the tank already moving in the new direction with no blocking browser errors.
- Focused movement suites pass at 2 files / 140 tests and full validation passes at 42 files / 431 tests. Production build/server smoke, the tablet choreography, the required bundled web-game client, visual contrast, Product Review Warden with zero open blocking debt, Deep Agent stub runtime, attended-v2 wrapper checks, and clean diff checks are green.

## 2026-07-22 Garage Pivot Choreography Follow-up

- Original follow-up prompt: after accepting the stationary-pivot controls, fix the Garage demonstration for every class whose scene is affected by the new turn behavior.
- Audited all five Tank Select beats for Scout, Engineer, and Battle Tank. Scout only withdraws or advances in its established facing, and the straight race/fire/breach/duel lanes do not turn, so adding pauses there would misrepresent their mechanics.
- Corrected Engineer FIELD KIT: it now pivots left while stationary during the existing armed hold, then drives to the trap without flipping right during placement or inventing another turn before withdrawal. The short beat explicitly reads `PIVOT LEFT / HOLD TO DRIVE`.
- Corrected the Battle Tank comparison: the standard lane holds its shot long enough to read, pivots, repositions, queues right-facing aim during the end of the moving tile, and fires at the boundary. Traverse still clears 3/3 first; the standard tank then completes the identical formation later.
- Added deterministic phase/direction/timing coverage and new desktop/mobile captures for Engineer pivot, standard pivot, buffered boundary aim, Traverse-first completion, and final 3/3 parity. Both viewport sweeps pass with empty browser-error logs, and the required bundled web-game client reaches a live Tank Select scene with matching text state.
- Focused validation passes at 1 file / 119 tests and full validation passes at 42 files / 431 tests. Production build/server smoke, visual contrast, Product Review Warden with zero open blocking debt, Deep Agent stub runtime, attended-v2 wrapper checks, desktop/mobile theater sweeps, the required bundled client, and clean browser logs are green.

## 2026-07-22 Rejected Fullscreen Escape Bridge

- The first interpretation made a browser fullscreen exit also perform the game's Back action. The user rejected that coupling: Escape must retain its normal browser fullscreen behavior, and game navigation needs its own reliable control.
- Removed the `fullscreenchange` navigation bridge and its timing/deduplication state before review. A browser fullscreen exit no longer changes the game mode.

## 2026-07-22 Dedicated Fullscreen-Safe Back Control

- Original corrected prompt: provide a reliable Back button that navigates inside the game without changing browser fullscreen.
- Added one compact in-canvas Back button at the lower-left edge. Because it belongs to the fullscreen canvas rather than a DOM side rail, it remains visible and tappable in fullscreen without obscuring the battlefield.
- The button routes through existing Back behavior in gameplay, menus, loading, results, and online battle. Keyboard users can use B or Backspace; Escape remains available to the browser and F remains a pure fullscreen toggle.
- Updated visible help and accessibility copy to advertise the reliable control instead of instructing fullscreen users to use Escape.
- Focused validation passes at 5 files / 181 tests. The real Chromium fullscreen choreography proves button navigation and Backspace both retain fullscreen, a direct browser fullscreen exit leaves the game mode unchanged, and the gameplay button opens Pause without exposing the player to a second fullscreen transition.
- Inspected Tank Select, Garage, live gameplay, and Pause captures under `output/fullscreen-back-control-v2/browser/`; the button stays in the unused lower-left HUD edge, remains touch-sized after fullscreen scaling, and does not cover the battlefield. Text state mirrors its availability and browser logs are empty.
- The required bundled web-game client activates the visible button through a real canvas mouse press and lands in Garage with matching text state and no error artifact under `output/fullscreen-back-control-v2/canonical-client/`.
- Full validation passes at 42 files / 435 tests. Production build/server smoke, visual contrast, Product Review Warden with zero open blocking debt, Deep Agent stub runtime, attended-v2 lifecycle checks, and clean diff checks are green.

## 2026-07-22 Fullscreen Mouse Letterbox Follow-up

- User retest exposed that the Back button clicked correctly in normal mode but not with a mouse in real browser fullscreen.
- Root cause: browsers can render a fullscreen canvas with `object-fit: contain`. The game image is centered inside the fullscreen element, but pointer coordinates were scaled against the entire element, including its letterbox bars. A visible click therefore mapped to the wrong logical x-coordinate.
- Made fullscreen canvas geometry explicit as centered `object-fit: contain` and added one shared coordinate transform that removes the letterbox offsets before mapping every canvas pointer action. Normal-mode mapping remains unchanged, and clicks in the black bars are ignored.
- Added deterministic 1280x720 letterbox coverage. Focused input validation passes at 1 file / 38 tests.
- Updated real Chromium choreography to click the visible Back button through contained fullscreen coordinates. Inspected Tank Select, Garage, live gameplay, and Pause captures under `output/fullscreen-back-control-v3/browser/`; they now show the preserved game aspect ratio with side bars, successful Back navigation, matching text state, and empty browser errors.
- The required bundled client still activates the normal-mode canvas button and lands in Garage under `output/fullscreen-back-control-v3/canonical-client/`, confirming the fullscreen correction did not regress ordinary pointer mapping.
- Full validation passes at 42 files / 436 tests. Production build/server smoke, visual contrast, Product Review Warden with zero open blocking debt, Deep Agent stub runtime, attended-v2 lifecycle checks, and clean diff checks are green.

## 2026-07-22 Private Online Battle MVP

- Original follow-up prompt: implement the first private, disposable, server-authoritative 1v1/2v2 Team Battle room using self-hosted Colyseus, with six-character keys, full lobby/countdown/reconnection/results lifecycle, diagnostics, bots, fault/soak tests, and governed attended-v2 closeout.
- Started from exact verified `origin/main` `cb08c212259abd6f68ec47a33f3fb088ec2e3e70` in isolated worktree `D:\projects\tanchiki-online-battle-colyseus-v1`; the dirty canonical checkout and its untracked attachments remain untouched.
- Preflight found one open PR, #79 Echo Quarry, whose map/game files do not overlap multiplayer/server code. I12 is already merged as PR #27; remaining online-named branches are closed historical lanes.
- Untouched baseline passes: `npm.cmd ci`; 43 files / 448 tests; 54/54 focused multiplayer/online tests; production build; server smoke; harness validation/smoke; local attended-v2 wrapper; Review Warden with zero open blocking debt; and an inspected live online screenshot/text state with no browser errors.
- Advisory telemetry branch drift is recorded: `codex/mar-693-empty-base` resolves to `37b22404a3dd2a2a78f5f6fe747cbfb89d6fb889`, not pinned `69df33aafbe6f2738b87419d449fd3ee4f84f018`. No pin bump or live dispatch is authorized; deterministic local work continues against the exact pin.
- Package A selected and installed exact compatible 0.17 packages: `colyseus@0.17.10` and `@colyseus/sdk@0.17.43`. The old `colyseus.js@0.16.22` client is intentionally not mixed with the 0.17 seat-reservation protocol.
- Added the architecture decision, shared runtime-validated protocol, explicit simulation start/input-neutralization/deactivation hooks, authoritative `serverTick` and input acknowledgement fields, and a CSPRNG/collision-checked room-key registry.
- Packages B-C: added the private Colyseus room, key resolver/rotation, serialized authorization/lifecycle controller, exact-slot reconnect, heartbeat timeout, results/ack/TTL cleanup, and real SDK integration. Focused controller and server suites pass.
- Packages D-E: replaced Quick Match with Create Room / Join By Key and a calm Canvas Field Briefing. Existing interpolation, input, fog-safe snapshots, renderer, chat, pings, minimap, touch/orientation, structured text, and Relay Yard engine remain the live path. Four isolated browsers pass the complete lifecycle, cancellation, locked join, common result, kick/key rotation, and cleanup.
- Package F: added bounded rolling diagnostics, centralized/tested quality thresholds, one-second heartbeat, input/snapshot/tick/reconnect/backpressure metrics, and a privacy-safe authoritative after-action summary. Jitter is documented as median absolute consecutive RTT difference; no TCP packet-loss fiction is reported.
- Packages G-H: added public-protocol scripted/seeded bots, quick/realtime/100-match soak commands, a four-route pinned Toxiproxy setup, and executable mixed/outage/reset/stall/overlong/backpressure profiles. Docker is unavailable locally, so proxy-backed evidence is explicitly unclaimed; profile/config tests pass offline.
- Package I: focused Colyseus/browser proof passed, so obsolete HTTP-command and SSE gameplay routes were removed. README, architecture, network runbook, human WAN checklist, and closeout evidence are updated. The human WAN gate remains pending and no merge/deploy is authorized.
- Closeout correction: long-run bot testing exposed Node 24 native WebSocket and HTTP keep-alive pool ceilings, not room failures. Node QA now pins patched `ws@8.21.1`, closes its matchmaking/key HTTP connections, and bounds create/join operations; 30-room regression and the final 100-room seeded soak both pass beyond the former ceilings.
- Final deterministic evidence: 49 files / 482 tests; production build; real SDK integration; one 12-second representative round; 100/100 seeded rooms with zero divergence/stuck/cleanup failures; four-context Chromium lifecycle; visual contrast; tablet touch/orientation; Deep Agent stub; and Product Review Warden with zero blocking debt all pass. Production audit has zero high/critical findings. Docker/Toxiproxy and the 10-20 match human WAN session remain explicitly unclaimed external gates.

## 2026-07-22 Tablet Online Entry Follow-up

- A real Redmi Pad Tailscale test exposed that Canvas-painted callsign and room-key fields entered edit mode but could not summon a mobile software keyboard.
- Added one visually hidden, focusable native input that is activated synchronously by the existing Canvas field tap. Native input events are normalized back into the Canvas model, Enter/Done commits editing, and the later Canvas click no longer steals focus before the keyboard opens.
- Aligned the Create Room touch hit target with its visible label and centralized all room-entry field/action geometry. Touch users now see concise `TAP FIELD TO TYPE / TAP ACTION TO CONTINUE` guidance without adding another visible surface.
- Added deterministic layout/value tests and a two-context tablet browser regression covering native focus, callsign entry, six-character key entry, visible Create/Join taps, and a shared two-player lobby without logging or preserving the room key.
- The tablet regression, existing four-context lifecycle, Tailscale real-clock room creation with a six-second connected hold, required bundled client, full validation at 50 files / 485 tests, production build, visual contrast, Product Review Warden, and clean diff checks pass. The Tailscale preview is updated at the existing tailnet-only URL.

## 2026-07-22 Tablet Host Start and Keyboard Viewport Follow-up

- User retest confirmed that joining worked, but the host start affordance was visually buried among same-weight keyboard shortcuts and Android panned the game upward toward the hidden input while typing.
- Replaced the flat lobby shortcut row with compact team/ready controls and one substantially larger, filled, host-only `START BATTLE` button. The CTA remains disabled with a precise opponent/team/reconnect/readiness reason until the same conditions enforced by the authoritative server are satisfied; guests see `WAITING FOR HOST TO START` instead.
- Centralized lobby control geometry and startability presentation in a pure module. Touch hit testing now follows the rendered buttons, client-side start attempts no-op while visibly disabled, and the server remains authoritative over the actual transition.
- Pinned the hidden native input to the top edge, disabled page scrolling, added `interactive-widget=overlays-content`, and feature-detected Chromium's virtual-keyboard overlay policy. This keeps the one-screen Canvas stable instead of asking Android to reveal a 1px input at the bottom of the page.
- Added three focused lobby-control assertions and extended the two-touch-context browser regression through viewport checks, ready-up, a safe lower-lobby CTA capture, host start tap, and countdown. The capture excludes the room-key area.
- The tablet regression, existing four-context lifecycle, real tailnet HTTPS/WebSocket touch flow through countdown and a six-second connected playing hold, safe required bundled client, full validation at 51 files / 488 tests, production build, visual contrast, Product Review Warden, and clean diff checks pass. No room key or reconnection token is retained in evidence.

## 2026-07-22 Persistent Waiting-Room Key and Touch Copy Follow-up

- Real Redmi Pad screenshots showed the host receiving `HEARTBEAT_TIMEOUT` after switching browsers; the guest then received the derivative room-key error because host teardown had already removed the registry entry. The key itself had not reached a meaningful expiry.
- Root cause: application heartbeats were advanced by `requestAnimationFrame`, which Android pauses in a background tab, while the server treated 3.5 seconds without that diagnostic message as a dead connection even in `LOBBY`. A separate five-minute idle lobby clock also contradicted dynamic room filling.
- Waiting rooms now have no wall-clock expiry. Diagnostic-heartbeat timeout enforcement applies only in live gameplay, where stale control neutralization is required; Colyseus WebSocket liveness remains authoritative for a real disconnect, and host departure still cleans up the disposable room.
- Replaced the misleading `ROOM_KEY_EXPIRED` surface with `ROOM_KEY_NOT_FOUND` and actionable copy. A valid waiting-room key remains joinable until the host leaves, deployment locks the room, or a kick rotates the key.
- Added a large blue `COPY ROOM KEY` button and green `KEY COPIED` feedback, both using the same centralized touch geometry as the other lobby actions. The keyboard shortcut remains available.
- Focused controller/protocol/control tests, real SDK integration, the four-context lifecycle, and the two-tablet regression pass. The tablet lane now taps Copy, freezes the host renderer beyond the former cutoff, joins from the guest, resumes the host, readies both players, and starts. The identical sequence passes through the private Tailscale HTTPS/WebSocket preview and remains connected in play for six seconds; safe captures exclude the key.
- Full validation passes at 51 files / 490 tests with production build, server smoke, harness gates, visual contrast, Product Review Warden with zero blocking debt, and clean diff checks.

## 2026-07-22 Online Responsiveness and Live Back Guard Follow-up

- A simultaneous PC/Redmi Pad playtest confirmed that matches start correctly but are too laggy to play and that an accidental in-game Back tap can abandon the match. Tank-class selection is explicitly deferred until responsiveness is fixed.
- The tailnet route itself is healthy: the tablet is reached directly rather than through DERP at approximately 11 ms. A real-clock private-preview probe showed 60 fps and approximately 4 ms game RTT but 369 ms from a straight input to first visible tank movement, isolating the problem to the application pipeline.
- Increased personalized snapshots from 10 Hz to the existing 20 Hz simulation cadence, reduced remote render delay from 120 ms to 75 ms, and let the local renderer advance only movement metadata already authorized by the latest personalized snapshot. New moves, collisions, firing, scores, fog, and remote entities remain server-authoritative; the established 160 ms stationary-pivot behavior is unchanged.
- The first Back action during live play now releases controls and displays one clear `TAP BACK AGAIN TO LEAVE MATCH` confirmation for 2.5 seconds. A second Back leaves; expiry or resumed gameplay cancels it. Entry, lobby, and results keep ordinary Back behavior.
- The final private Tailscale probe reports 63 ms input-to-visible motion, 45 ms median snapshot cadence, 26 ms median input acknowledgement, 60 fps, approximately 5 ms RTT, and zero browser errors. The two-touch-context browser regression independently reports 105 ms through the real tablet side rail, remains connected after one Back tap, and proves confirmation expiry.
- Focused movement/interpolation/leave tests pass at 4 files / 151 tests. Full validation passes at 52 files / 493 tests with production build, server integration, harness validation/smoke, Reviewer App dry-run, and attended-v2 lifecycle checks. Four-context and tablet Chromium suites pass with clean browser logs; the required bundled client passes against the private Tailscale URL.

## 2026-07-22 Authoritative Simulation Clock Correction

- The user's physical PC/tablet retest remained impossible to play, proving that the earlier first-visible-motion probe was not a sufficient playability gate.
- Added a sustained full-tile trace. It reproduced the defect: a nominal 280 ms tile took roughly 1.4 seconds, authoritative progress advanced irregularly, and the local tank visually rewound 25 times while input remained held.
- Root cause: `TeamBattleRoom` scheduled its simulation callback every 50 ms but advanced the engine using Colyseus's short scheduler callback delta, commonly 0-17 ms. The authoritative match therefore ran several times slower than wall time and with uneven progress.
- The room now advances one deterministic 50 ms step per 20 Hz callback and measures actual callback cadence only for drift diagnostics. Real-SDK integration requires six ticks to advance 0.25-0.35 seconds, preventing this clock mismatch from recurring.
- Local presentation now retains the furthest point of the same server-authorized tile move across delayed snapshots, capped at the authoritative destination. It cannot predict another tile or collision, but a newly received snapshot can no longer pull the tank backward.
- The expanded two-tablet regression reports 100 ms input-to-visible, 248 ms for the complete tile, zero backward corrections, preserved Back confirmation, and zero browser errors. Repeated live private-Tailscale host probes report 40-128 ms input-to-visible, 251-266 ms for the complete tile, zero rewinds/freezes, 60 fps, and zero browser errors. The tablet route remains direct; peer diagnostics ranged from 58 ms in an earlier active sample to 95-666 ms while the Android peer was idle, so they are not treated as browser gameplay RTT.
- Full validation passes at 52 files / 494 tests, including the fixed-clock real-SDK regression, production build, server integration, harness checks, four-context Chromium lifecycle, visual contrast, Product Review Warden, and deterministic Deep Agent stub runtime.

## 2026-07-22 Local Online Session Telemetry v1

- Added a compact server-side JSONL session logger for private playtests. It is disabled unless `ONLINE_TELEMETRY_LOG_PATH` is set and never changes authoritative room behavior when writing fails.
- V1 records room/key lifecycle, phase changes, joins/drops/reconnects/leaves/kicks, accepted chat, and one bounded final result/network summary. It intentionally avoids movement inputs, positions, snapshots, and per-frame logs.
- Callsigns, chat text, Colyseus-provided IPs, raw room keys, and internal identifiers require the separate `ONLINE_TELEMETRY_INCLUDE_SENSITIVE=true` opt-in. Logs are bounded, stay under ignored `output/`, and are forbidden from committed evidence or screenshots.
- Production notice, retention, moderation/reporting, access control, deletion/export, and legal-hold policy remain explicitly deferred as requested.
- Full validation passes at 53 files / 498 tests. The real-SDK smoke proves sensitive JSONL creation, join/IP capture, reconnect, and chat; four-context and two-tablet browser lifecycles generated 31 bounded lines across three rooms with key/name/IP fields present only under the explicit sensitive flag. The tablet lane remained responsive at 74 ms input-to-visible, 266 ms per tile, zero rewinds, and zero browser errors. Visual contrast, Product Review Warden, deterministic Deep Agent stub runtime, and the required bundled client also pass.

## 2026-07-22 Fixed Team Signals and Chat Removal

- Removed arbitrary online chat end to end: there is no draft field, accepted `chat` protocol message, chat state, chat snapshot field, chat renderer, or new chat telemetry event. The breaking room protocol is now v2, and focused SDK coverage proves a legacy free-text message is rejected.
- Added five typed team-only radio commands: `ATTACK`, `DEFEND`, `REGROUP`, `HELP`, and `THANKS`. Commands expire after eight seconds, are returned only to teammates, and display without player-authored text.
- Rebuilt the live signaling UI around two large touch targets, `PING` and `RADIO`, plus one focused five-row selector. Keyboard supports T, arrows/W-S, Enter, and direct 1-5 selection; tablet touch opens and sends through the same geometry without a software keyboard.
- Added independent server cooldowns of one second for radio and 500 ms for pings. Accepted telemetry now records only the fixed `radio_command` type or bounded `team_ping` coordinates, with no message-content field in either pseudonymous or sensitive mode.
- Full validation passes at 54 files / 503 tests, including a clean-checkout guard that keeps the QA bot protocol version synchronized without depending on generated build output. Real-SDK smoke covers protocol v2, legacy rejection, telemetry, and reconnect; the four-context browser lifecycle proves keyboard radio, true tablet-touch radio, team scoping, touch ping, shared results, and empty browser errors. The separate tablet-entry regression remains green at 89 ms input-to-visible, 252 ms per tile, zero rewinds, a pinned keyboard viewport, and guarded Back.
- Final visual evidence was inspected at `output/online-four-context/tablet-radio-selector.png`; `render_game_to_text()` exposes the five commands with no draft or chat field. The required bundled web-game client also reaches the clean Create Room briefing under `output/web-game-fixed-radio-canonical/` without console errors.
- Pre-merge review closure fixed both live QA-parser P2s: absent or dangling synthetic-lab and Toxiproxy flags now return `undefined` and preserve their intended defaults instead of reading `argv[0]`. Focused parser/bot tests pass at 2 files / 8 tests, the three-match synthetic lab completes without divergence or cleanup failures, and full validation passes at 55 files / 506 tests.

## 2026-07-22 Online Class Parity Round

- Started from merged PR #107 at `3fc6d167bd95e6ce0ef28547d0cebfa6d27c74a3` on isolated branch `codex/online-class-parity-v1`; the canonical checkout's unrelated planning edit remains untouched.
- Added one shared Scout/Engineer/Battle contract and protocol v3 class selection. The authoritative lobby retains the selection, clears Ready when it changes, freezes it after countdown, and includes it on reconnect-safe roster state.
- Implemented server-owned class movement/reload/damage, typed shells, ten-round ammunition, symmetric Relay Yard ammo stations, Battle HE splash, and the six native kit actions: Scout Decoy/Wire, Engineer Mine/Trap, and Battle Bulwark/Traverse.
- Snapshot additions remain personalized: only self combat/kit state and team-owned devices/alerts are sent; decoys become ordinary short-lived hostile last-known contacts instead of a new hidden-entity channel.
- Connected canonical class vehicle sprites, class shell art, ammo/kit strip, HP/shield line, keyboard `1/2`, and tablet side-rail gear. Major Mods, portable player relays, persistent Garage loadouts, and chat remain outside this round.
- Final validation passes at 55 files / 513 tests, including the production build, real-SDK room lifecycle and simulation clock, harness validation/smoke, Reviewer App dry-run, and attended-v2 lifecycle trace. The focused server smoke, three-room synthetic lab, four-context Chromium lifecycle, visual contrast, and Product Review Warden also pass.
- The two-tablet browser lane selects Battle and Scout through touch, starts the match, activates both Battle kit buttons from the live side rail, and reports 89 ms input-to-visible motion, a 322 ms complete tile, zero rewinds, and zero browser errors. Final bundled-client and inspected tablet captures confirm the calm class selector, dominant host Start CTA, canonical class HUD/icons, and non-overlapping Back confirmation.
- Refreshed the existing tailnet-only local preview from this worktree at `https://marselkhaliullin.tailce7629.ts.net/tanchiki-online/`. A bundled-client room creation reached the protocol-v3 lobby with Engineer selected and no browser error; the HTTPS multiplayer health route is green. Sensitive playtest telemetry is enabled only in ignored `output/local-host/online-session.jsonl` for this local session.
- Physical testing caught that online placed devices were rendering a 20-pixel recolored HUD icon instead of the canonical 48-unit deployable art rendered over one 32-pixel battlefield tile. Online Decoy, Wire, Mine, and Trap now all call the exact offline `drawPixelDeployable` path at full tile density and use the same active-state palette. A four-browser regression deploys and captures Engineer Mine/Trap in live personalized snapshots; the offline equipment smoke, hosted bundled-client check, full 513-test validation, production build, server smoke, and harness gates pass.
- Physical testing then caught the deeper architectural split: online gear was placed one cell ahead while offline gear was placed under the tank. Placement/recovery geometry, class movement and firing statistics, shell inventory/recharge, mine range/damage/slow, consumed Wire/Trap crossings, persistent Decoys, Bulwark, Traverse, and Battle HE impact behavior now come from the shared tank-class mechanics contract used by both modes.
- Online Mine/Trap/Decoy/Wire placement is now on the tank's current cell; the same or an orthogonally adjacent tank cell can recover it regardless of facing. Movement cancels the hold and a still-held input retries after stopping. Mine triggers at Manhattan range one, Wire and Trap are consumed with owner-team alerts, Trap cancels movement and immobilizes for five seconds, and bullets no longer destroy Decoys.
- Traverse now preserves hull/turret facing, accepts only lateral movement at the offline 1.25 duration multiplier, fires in the fixed facing, and toggles off into the ten-second recharge. Bulwark absorbs three points for up to five seconds and transitions to the twelve-second recharge if broken. Scout/Engineer/Battle damage is 1/2/3, reload and movement cadence match offline, and Battle HE splashes players and nearby bricks only on player/brick impacts, never steel or water.
- Added direct shared-contract and authoritative online regressions plus the real four-browser own-cell assertion. Full validation passes at 56 files / 518 tests; offline equipment smoke, four-context lifecycle, and two-tablet lanes are green. The tablet Battle Tank reports 79 ms input-to-visible motion, a mechanics-correct 455 ms complete tile, zero rewinds, and zero browser errors.
- Restarted the existing tailnet-only preview from this worktree. The bundled browser created and left a protocol-v3 room at `https://marselkhaliullin.tailce7629.ts.net/tanchiki-online/`, reported the shared `0.38s / 1.6s / 7.5 tiles/s` base tempo, and both local and HTTPS health routes returned zero private rooms after cleanup.

## 2026-07-22 Current Release Baseline Refresh

- Started P1 from exact `origin/main` `caf59ad578e03fad12f5c637e2a1318c5cdbb0a6` in isolated worktree `D:\projects\tanchiki-project-continuation-p1`; the stale dirty canonical checkout and its unrelated planning edit remain untouched.
- Added the durable cross-session continuation plan and `docs/release/tanchiki2-current-release-baseline-refresh-v1.md`; refreshed the release checklist and corrected README's broad offline/online limitation after shared class parity.
- Current GitHub state: Validate run `29923937307` passes on exact main, no issues are open, and PR #79 Echo Quarry is the only open PR and remains old/conflicting.
- Current Pages state: the public site is healthy at the HTML level but deploys source `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`, before PRs #101-#108. No deployment was performed.
- Release-profile decision is now explicit: either a static/offline demo with Online Battle disabled, or an online-enabled public preview with a production Colyseus backend. An unconfigured current build exposes Online Battle but defaults to `http://127.0.0.1:8787`, so current main must not be presented as a working public online release.
- Canonical attended-v2 prompt validation passed with zero blockers; the operating-mode guard returned `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`. The optional live telemetry ref no longer resolves to the pinned SHA, so no workflow was dispatched. An isolated optional Harness-v2 shadow retained its projection-bundle control-plane defect and is not execution authority.
- Baseline validation passes at 56 files / 518 tests with production build, server integration, harness checks, visual contrast, Product Review Warden with zero blocking debt, and advisory Deep Agent stub evidence. Production dependencies report 5 low, 3 moderate, 0 high, and 0 critical audit findings.
- Remaining release gates are explicitly unclaimed: Docker/Toxiproxy runtime evidence, 10-20 human WAN matches, production backend hosting/TLS/`wss`/operations, production telemetry policy, exact-head deployment, and live public smoke.
- No product runtime, workflow, harness adapter, deployment, publish, tag, announcement, production setting, secret, billing, branch protection, rollback, or external-provider mutation was performed.

## 2026-07-22 Echo Quarry Current-Main Reimplementation

- Retained the useful product intent from stale/conflicting PR #79, but reimplemented it from current `origin/main` `05f564b323672aca37374d1dc3ff4039b1282fa4` on isolated branch `codex/tanchiki2-echo-quarry-current-v1`. No obsolete PR code was merged into current mechanics.
- Added Campaign Level 9, Echo Quarry: a 36 by 30 ruined-quarry Team Battle with current terrain, props, relay coverage, two ammunition stations, 30 enemy tickets, ten active enemies, and a finite 30-tank allied roster with ten current-class allies active at once.
- Existing saves that cleared Levels 1 through 8 unlock Level 9. Echo saves persist the allied reserve, while existing missions without an explicit finite roster retain unlimited teammate replacements.
- Reused current Scout/Engineer/Battle definitions, class equipment, Major Mods, projectiles, deployables, field props, HUD art, tablet rails, and save architecture. Added only roster presentation and a compact `E / A` Team Battle line; no parallel Echo-specific mechanics or dense new UI surface was introduced.
- Added non-color `FRONT` and `AMMO` readability markers, current campaign/map validation, finite-roster/save regressions, a legacy-respawn regression, and development-only Echo Quarry gameplay/loadout routes for deterministic browser QA.
- Focused validation passes at 2 files / 130 tests. Full validation passes at 56 files / 524 tests with production build, real server SDK smoke, harness checks, Reviewer App dry-run, and attended-v2 lifecycle trace. Visual contrast, Product Review Warden with zero blocking debt, deterministic Deep Agent stub, and the complete repository tablet-control regression pass.
- Required bundled-client and Playwright captures were inspected for desktop gameplay, Tank Select, the tablet canvas, and the full 1280 by 800 touch layout. Structured state reports ten active allies, a 20-tank reserve, the selected class and Major Mod, and no browser error artifact; only expected pre-gesture Web Audio autoplay warnings appeared in the full-page capture.
- The replacement remains human-gameplay-gated. Exact-head desktop and physical-tablet play must confirm map navigation, combat readability, roster balance, current shared mechanics, and non-overlapping controls before merge. No deployment or release is authorized.
- Exact-head Codex review then found one current P2: depleting all 30 allied roster tickets stopped respawns but did not end the mission, allowing the player to continue solo despite the finite-roster objective. `checkWinState` now records defeat when active allies plus reserve reach zero; the regression destroys the final allied tank and asserts the `lost` terminal state.
- Refreshed review found a second current P2 in tactical scoring: the ten active slots were still used as the survival denominator for the 30-tank finite roster. Finite missions now record the full roster and count active allies plus unused reserve as survivors. A zero-casualty three-tank proof finishes at 3/3, while full roster depletion finishes at 0/3. Focused 130-test and full 524-test validation remain green. Because the repairs change the PR head, the gameplay human gate must be renewed before merge.

## 2026-07-23 P10 Presentation And Accessibility

- Started the first bounded P10 package from exact merged `origin/main` `f8009deb6661b62f9a13e2d989e81eb04b835f7a` in isolated worktree `D:\projects\tanchiki-p10-presentation-polish-v1`; the unrelated dirty canonical checkout remains untouched.
- Baseline Signal Scar desktop evidence exposed two simultaneous ally notices merging across the battlefield and right HUD because world-pixel anchors were treated as screen coordinates.
- Added a pure, directly tested feedback-layout module. Offline notices now follow the current camera, stay fully clipped inside the arena, avoid panel collisions, and limit the visible stack to the four newest updates without removing structured notice state.
- The existing polite accessibility channel now announces the newest visible battlefield update before returning to the ordinary objective announcement. No event-log panel or additional gameplay chrome was added.
- Refreshed stale README copy from eight to ten missions, corrected class-kit keys to `1` and `2`, documented unanimous rematch and chat-off radio/ping communication, and replaced the pre-Signal-Scar product direction with the current state and explicit hearing-range deferral.
- Focused layout/accessibility/readability validation passes at 3 files / 9 tests. Exact-head review then exposed staggered notice ID reuse; a notice-specific monotonic sequence and regression test now preserve distinct rendering and accessibility announcements after expiry.
- A second exact-head review exposed mixed anchor coordinate conventions. All cell-based relay, deployable, and EMP notice producers now pass through one arena-offset world-pixel helper, with relay and deployable anchor assertions covering the real producer paths.
- Full `npm.cmd run validate` passes at 62 files / 576 tests with production build, server integration, and harness checks.
- `visual:p7-signal-scar`, the bundled generic web-game client, exact-worktree Tank Select carousel choreography, and `visual:contrast` pass. Desktop/tablet Signal Scar, active Breakthrough theater, and generic gameplay screenshots were inspected with structured state and no browser-error artifact.
- Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero blocking debt. The deterministic Deep Agent stub, `git diff --check`, and the attended-v2 lifecycle wrapper are green.
- Gameplay, sound propagation, online protocol, deployment, publishing, tags, announcements, production settings, secrets, billing, branch protection, and rollback policy remain unchanged. A later hearing package should localize physical sound while keeping relay/radar intelligence separate.

## 2026-07-23 F1 Spatial Hearing

- Started from exact merged `origin/main` `62ef540c86e03fa76e0850761750df5238c5d8bc` in isolated worktree `D:\projects\tanchiki-f1-spatial-hearing-v1`; the canonical checkout's user-owned changes remain untouched.
- Attended-v2 preflight found no open PR or issue overlap. Exact-main baseline passes at 62 files / 576 tests, production build, server integration, all configured harness checks, Product Review Warden with zero blocking debt, and the deterministic Deep Agent stub.
- Added the first pure shared spatial-hearing contract: physical events carry a source, loudness class, intensity, and lifetime; listener projection applies bounded range, coarse direction, distance band, stereo gain/pan, and simple obstacle attenuation. Hidden cues omit exact source coordinates. Relay, radar, radio, and ping vocabulary is deliberately outside this acoustic model.
- Offline gameplay now emits the shared event kinds for shots, impacts, explosions, tracks, rustles, and traps. Terrain evidence, audio playback, structured state, and accessibility announcements consume fog-safe projections; distant hidden bush and track noise is no longer globally exposed.
- Online matches retain raw events only in server-authoritative state and send each player a personalized safe hearing projection. The browser deduplicates cue IDs before playback. Relay visibility may independently reveal a source but never extends physical hearing range.
- Focused validation passes at 7 files / 193 tests. Full `npm.cmd run validate` passes at 64 files / 588 tests with production build, server integration, and configured attended-v2 checks.
- `visual:f1-spatial-hearing`, `visual:contrast`, the bundled generic web-game client, Product Review Warden, deterministic Deep Agent stub, and `git diff --check` pass. Desktop/tablet Signal Scar screenshots and structured state were inspected; no new HUD chrome or hidden exact-source leak was found.
- Exact-head review found one legacy source-less splash-audio path. Known splash impacts now carry their source, spatial playback preserves the original `brick`/`hit` kind, and source-less acoustic calls fall back to legacy non-spatial audio instead of becoming silent.
- The durable F1 architecture, hidden-information boundary, event ranges, validation evidence, warnings, and authority limits are recorded in `docs/architecture/tanchiki2-f1-spatial-hearing-v1.md`.
- TODO: complete exact-head Codex and Reviewer App review. Do not merge or deploy without a later explicit user instruction.

## 2026-07-23 F1 Human Acoustic Range Follow-up

- The representative Signal Scar integration map proved too noisy and unpredictable for a human to judge hearing thresholds reliably, so F1 now includes a development-only `Acoustic Range` route without campaign progression or active combat.
- The range loops through seven fixed four-second stations: right and left near shots, an inaudible far shot, an audible far explosion from the same source, a quieter shot through steel, an audible near bush rustle, and an inaudible far rustle.
- The player is teleported to marked listener cells and movement input is ignored. Each source pulses at 1.25 and 2.5 seconds; Space or tablet Fire replays the station without creating a shell.
- Added one compact battlefield guide strip for station, expected result, countdown, and replay. Structured state exposes phase/timing/pulse data for deterministic QA, while the shared production hearing contract remains the sole range and attenuation authority.
- The dedicated runtime/unit suite passes all seven projections, left/right stereo, wall attenuation, automatic teleporting, and keyboard replay. `visual:f1-hearing-range` passes desktop and tablet with touch replay, zero projectiles, and empty blocking browser logs; inspected captures keep the battlefield dominant.
- Full validation passes at 65 files / 590 tests with production build, server integration, and configured attended-v2 checks. Existing Signal Scar spatial-hearing smoke, visual contrast, Product Review Warden, deterministic Deep Agent stub, the required bundled web-game client, and structured-state inspection are green.
- TODO: commit and push this follow-up, refresh PR #120 for the new exact head, and obtain fresh exact-head Codex and Reviewer App results. No merge or deployment is authorized.

## 2026-07-23 F1 Visual Hearing Lab Revision

- Replaced the automatic seven-phase Acoustic Range with a deliberate five-station Acoustic Lab. The listener remains fixed at the center; Left/Right or the tablet joystick selects a station, and Space/Fire or `PLAY CUE` emits it once.
- All stations use the same `1.5`-intensity rustle. They provide a visible 2-cell reference, hidden 4/5/6-cell sources, and a hidden 7.1-cell out-of-range source, so distance is the only variable under review.
- The route now uses real fog of war and emits actual terrain evidence as well as audio. Hidden physical animations use the shared projected hearing gain, producing measured strengths `0.75`, `0.38`, `0.18`, then no cue; visible evidence remains exact at `1.5`.
- The compact battlefield guide reports the selected station and observed result without adding a panel. Tablet rails read `SELECT` and `PLAY CUE`; selection never moves the tank or fires a shell.
- Focused runtime/projection coverage and the dedicated desktop/tablet smoke pass. Inspected captures show strong, medium, faint, and absent fog cues; the required generic web-game client reaches the mid station with matching structured state and no browser-error artifact.
- Exact-head Codex review found that geometric tile visibility could upgrade sound and terrain evidence from a soft-cover-concealed tank to exact precision. Terrain projection now preserves its approximate marker. Offline audio uses the same actor-concealment decision that filters hostile tanks and retains a bounded directional-only event constraint after the actor leaves its emitting cell. A focused regression proves both outputs remain directional and source-free beside a visible prior bush tile.
- A later exact-head review found that 0.45-0.5-second physical cues could expire before the half-second accessibility refresh. Offline and online directional cues now enter separate bounded 2.5-second announcement queues before audio mute/volume policy is applied; tutorial narration remains primary. Regressions prove an expired live cue is still announced once without exposing its source.
- A late prior-head review found duplicate ricochet impacts: each path queued a hit directly and then emitted the same hit through terrain evidence. Ricochet evidence is now the single emitter, and focused coverage proves one hit event per bounce.
- The final exact-head review found that a visible distorted echo marker could be suppressed by the physical-hearing gate because echo is signal evidence without an acoustic cue. Non-acoustic evidence now follows marker visibility, while physical evidence remains visibility-or-audibility gated; a regression preserves the approximate visible echo cell.
- The follow-up exact-head review found that browser key-repeat could replay a lab cue while Fire remained held. The lab now tracks Fire until keyup and emits once per press; a regression covers repeated keydown.
- The next exact-head review found that audible point evidence could still draw at a true fogged source cell when no upstream distortion existed. Hidden physical evidence now renders only with an already-approximate marker; exact hidden point evidence is omitted, with a regression proving the coordinate does not enter the snapshot.
- Full validation passes at 66 files / 595 tests with production build, server integration, and configured attended-v2 checks. Existing Signal Scar spatial-hearing smoke, visual contrast, Product Review Warden with zero blocking debt, deterministic Deep Agent stub, and diff checks are green.
- TODO: commit and push PR #120, then refresh exact-head Codex and Reviewer App review. No merge or deployment is authorized.

## 2026-07-23 F1 Playable Acoustic Field Course

- Superseded the synthetic fixed-listener Acoustic Lab with a player-controlled 94x17 linear field course. The player follows one bounded east-west road, stops at nine signed checkpoints, may reverse freely, and can turn north in the final yard to approach a real patrol.
- Seven deterministic patrols are ordinary `Tank` entities. The dev-only director chooses adjacent route cells and endpoint pauses, while normal tank movement, collision, terrain, fog, terrain evidence, and shared acoustic projection produce every observation. It has no direct sound or evidence emitter.
- Reeds provide visible, hidden-near, hidden-mid, hidden-edge, and moving-out-of-range cases. Browser smoke measured cue gains `0.70`, `0.45`, `0.20`, `0.169`, then none; matching hidden marker strengths fall `0.54 -> 0.24 -> 0.20 -> none`.
- One continuous gravel patrol validates the same source before, inside, and after a steel sound screen. Automated state proves `outsideHeard=true`, `insideSilent=true`, and `exitHeard=true` while the patrol continues traversing cells.
- The final water barrier opens into an inspection lane. Desktop automation drove the player beside the ordinary moving inspection tank and confirmed it entered the normal fog-filtered visible-enemy snapshot.
- Weapons are disabled and paused patrols emit no cue. The compact top guide announces the current expectation and live result; tablet keeps its ordinary movement joystick and clearly labels Fire as disabled.
- The focused five-test runtime suite and `visual:f1-hearing-range` pass. Desktop and 1280x711 touch captures were inspected, all nine checkpoints and tablet movement are reachable, and blocking browser logs are empty. The required bundled generic web-game client also passes a short real-movement choreography with inspected screenshot and structured state.
- Full `npm.cmd run validate` passes at 66 files / 597 tests with production build, server integration, and every configured harness check green.
- Exact-head Codex review found that the field-course live-region key stayed constant after the first waiting announcement. The key now advances once to `cue-observed` or `no-cue`, so the result is spoken without repeating every tread. A focused regression covers the state transition.
- Full validation after the accessibility repair passes at 66 files / 598 tests.
- The next exact-head review found that a retained hidden cue could cross into a new course checkpoint and that a concealed combat cue could become exact if its tank left the source cell before expiry. Checkpoint transitions now clear the dev-only pending queue, and every event born at a non-visible source remains direction-only for its full lifetime.
- Focused regressions prove both boundaries. Full validation passes at 66 files / 600 tests.
- TODO: commit and push the two exact-head repairs to PR #120, then obtain fresh exact-head Codex and Reviewer App results. No merge or deployment is authorized.

## 2026-07-24 F1 South Live-Fire Course Extension

- Extended the player-controlled Acoustic Field Course from 94 to 136 columns and from nine to twelve signed checkpoints. The original north movement, distance, steel-screen, and inspection sequence remains intact; the same eastbound player road now continues past three isolated stations in the map's previously unused south half.
- The south stations exercise the other genuinely long-range physical sounds through ordinary mechanics: a real distant shot whose farther steel impact stays silent, a real shot followed by an audible steel impact, and a real shell that destroys and repeatedly respawns a one-HP tank target. The final firing tank is outside gunshot range while the closer impact and explosion remain audible.
- Station control only selects which ordinary tank may call the normal fire path. Normal bullet travel, tile collision, tank damage, and enemy destruction emit every shot, impact, and explosion; no course code calls an acoustic or evidence emitter directly. Structured diagnostics separately record mechanic events and listener-projected cues so the tests prove both that an event happened and that range filtering made the correct event visible/audible.
- Rebuilt the compact guide as fixed-scale wrapped text. Complete instruction and live-result lines determine the guide height; no line is sliced, ellipsized, or passed through the pixel text width fitter. Inspected desktop and 1280x711 tablet captures keep one dominant battlefield surface and show the complete copy.
- The dedicated seven-test course suite passes real patrol movement, attenuation, steel occlusion, inspection access, inactive pre-course weapons, real projectiles, real impacts/destruction, target respawn, player isolation, and guide-line width. Full `npm.cmd run validate` passes at 66 files / 601 tests.
- `visual:f1-hearing-range` passes all twelve checkpoints on desktop plus tablet movement with empty blocking browser logs. Recorded live-fire evidence is: distant station mechanics `shot=3 impact=3` with only `shot` heard; impact station with both `shot` and `impact` heard; explosion station mechanics `shot=3 impact=3 explosion=3`, three target respawns, and only `impact` plus `explosion` heard.
- The required bundled generic web-game client passes against the live local route; its screenshot and structured state were inspected and no browser-error artifact was produced.
- TODO: commit and push the new PR #120 head, then obtain fresh exact-head Codex and Reviewer App results. No merge or deployment is authorized.

## 2026-07-24 F1 Concealed Destruction Review Repair

- Pre-merge review reconciliation found one unresolved current P1: a tank concealed by soft cover was removed before its destruction sound was projected, so a geometrically visible source cell could be upgraded to exact precision after the actor-specific concealment state disappeared.
- The ordinary destruction path now queues `enemy-destroyed` while the tank is still present, then removes the actor and creates the wreck. This preserves the existing shared spatial-hearing projection and keeps the resulting cue directional for its full retained lifetime.
- A focused soft-cover regression destroys a concealed hostile on a visible tile, confirms the actor is removed, and proves both structured hearing and drained audio omit the exact source. The focused file passes 12 tests.
- The required generic web-game client passed against the live course; its screenshot and structured state were inspected with no browser-error artifact.
- `visual:f1-hearing-range` passed all twelve checkpoints, seven real patrols, three real live-fire stations, steel attenuation, the inspection approach, and tablet movement with no blocking browser messages. The representative desktop explosion and tablet hidden-near captures were inspected.
- Full `npm.cmd run validate` passes at 66 files / 602 tests with production build, server integration, and every configured attended-v2 harness check.
- The first refreshed exact-head Codex review found a P2 timing boundary: one steel occluder added 1.75 effective cells, which left maximum-intensity tracks at distance 3 barely inside their 4.875-cell range. The shared penalty is now 2 cells. A pure regression proves the same heavy track remains audible in open ground and silent across the field-course steel cell.
- Focused shared, field-course, and soft-cover validation passes at 3 files / 24 tests after the occlusion repair.
- The required generic web-game client passed again; its screenshot and structured state were inspected with no browser-error artifact.
- `visual:f1-hearing-range` passed the complete route after the threshold repair. Deterministic wall proof remains `outsideHeard=true`, `insideSilent=true`, and `exitHeard=true`; all distance, inspection, live-fire, and tablet checks pass with no blocking browser messages. The latest steel-screen and tablet captures were inspected.
- Full `npm.cmd run validate` passes at 66 files / 603 tests with production build, server integration, and every configured attended-v2 harness check.
- The next exact-head Codex review found only a P3 documentation mismatch: the architecture contract still named the prior 1.75-cell penalty. It now records the validated 2-effective-cell per-occluder rule.
- TODO: commit/push, refresh exact-head Codex and Reviewer App review, resolve only verified threads, and merge only after all gates are current.

## 2026-07-24 F2 Coordinate And Transient Integrity

- Created clean worktree `D:\projects\tanchiki-f2-coordinate-integrity-v1` on branch `codex/tanchiki2-f2-coordinate-integrity-v1` from merged F1 main `a3906c0e573e689882d8808efef820e57c7aa5c6`; the dirty canonical checkout was left untouched and GitHub had no open PRs.
- Baseline `npm.cmd run validate` passed at 66 files / 603 tests before implementation.
- Added explicit grid-cell, arena-world-pixel, camera-screen-pixel, and battlefield-screen-rectangle contracts for the bounded feedback-notice path. Cell anchors now convert through one named helper, camera projection happens once, and layout consumes tagged screen points and bounds.
- Replaced the notice counter with a reusable monotonic transient-ID source; staggered expiry still cannot reuse an active identity.
- Removed remembered enemy-tank positions from player-facing offline battlefield, online battlefield, and online minimap presentation. Internal offline AI memory and authoritative online vision memory remain intact. Explicit tripwire/decoy equipment signal contacts remain presentable through a separately named policy.
- Focused coordinate, identity, presentation-policy, layout, minimap, accessibility, and game tests pass at 7 files / 148 tests; the production TypeScript/Vite build passes.
- The required generic browser client passed with inspected screenshot and structured state. Its final state retained an internal last-known patrol coordinate while the player-facing battlefield and minimap contained no stale tank ghost; no browser-error artifact was produced.
- The deterministic Acoustic Field Course completed all twelve checkpoints, seven real patrols, three live-fire stations, steel attenuation, and 1280x711 tablet controls. `summary.json` reports `F1_ACOUSTIC_FIELD_COURSE_SMOKE_PASSED` with no blocking browser messages; representative desktop and tablet captures were inspected.
- Signal Scar passed on desktop and tablet with camera-driven ally notices inside the battlefield, no hidden-coordinate leak, and no blocking browser messages. Visual contrast also passed.
- Full `npm.cmd run validate` passes at 69 files / 612 tests. Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero blocking debt; Deep Agent reports `DEEP_AGENT_STUB_COMPLETE_ALLOWED`; `git diff --check` passes.
- TODO: create the exact F2 commit, push, open the focused PR, obtain current-head Codex and Reviewer App results, and stop for the human gameplay merge gate. No deployment or release action is authorized.

## 2026-07-24 F2 Fog-Aperture Human Review Repair

- Human review found the first north Acoustic Field Course patrol disappearing and reappearing near the circular vision edge. Two center-based rules were visible: the renderer dropped the whole actor before its sprite crossed the softened fog boundary, and a stationary reed multiplier removed the patrol even while it remained inside clear fog.
- Added one shared visual-aperture contract for offline and online play. Projection now tests the moving tank footprint against the same 0.35-cell soft edge used by both Canvas fog renderers; the fog itself clips the sprite until the last visible pixel is opaque.
- Player-facing reed terrain no longer deletes a tank inside clear fog. Authored soft-cover props retain their distinct concealment boundary. Bot perception, acoustic source precision, and environmental evidence remain on their stricter detection rule, avoiding a hidden-coordinate expansion outside the requested visual repair.
- Focused shared/offline/online coverage passes at 8 files / 215 tests, including explicit soft-cover preservation. Production build passes.
- The required generic web-game client reproduced the paused edge case at player col 10 and patrol col 7; the inspected frame keeps only the fog-exposed part of the tank visible with no browser errors.
- The full Acoustic Field Course passes all twelve checkpoints, steel attenuation, inspection, real live fire, and tablet controls. Browser continuity sampled 125 frames across the first patrol: 79 moving, 46 paused, zero missing.
- Full `npm.cmd run validate` passes at 70 files / 616 tests. Visual contrast, Product Review Warden with zero blocking debt, Deep Agent stub runtime, and diff checks pass; known generated Deep Agent check output was restored to the committed baseline.
- TODO: commit/push the repair to PR #121, refresh both exact-head review lanes, and return to the human gameplay gate. Do not merge or deploy.

## 2026-07-24 F3 Runtime Extraction And Measured Bundle Health

- Started from exact merged `origin/main` `07e26e28b63827b6b25bab334e5d8b117e985f22` in isolated worktree `D:\projects\tanchiki-f3-runtime-bundle-health-v1`; the canonical checkout's older dirty branch and user-owned files remain untouched. GitHub had no open pull requests or issues, and main CI was green.
- Exact-main source-map profiling found one 784,825-byte / 224,061-byte gzip entry bundle. The largest mapped contributors were `game.ts` (229,336 characters), `render.ts` (103,392), Colyseus Schema (51,774), `onlineClient.ts` (29,643), and `onlineRenderer.ts` (21,516).
- Selected one coherent runtime boundary: Online Battle and its Colyseus transport are not needed for splash, menu, campaign, Garage, Encyclopedia, or deterministic offline QA. The static boot path now owns only a lazy online host; entering the Online menu preloads one dynamic runtime chunk, and Create/Join waits behind a visible, accessible loading/error boundary when necessary.
- The existing `OnlineBattleClient` and `OnlineCanvasRenderer` remain behavior owners behind `onlineRuntime.ts`; no protocol, simulation, fog, rendering, lifecycle, or input rule was copied. Touch/orientation settings captured before loading are applied exactly once when the runtime becomes available.
- Added a deterministic source-map profiler (`npm.cmd run bundle:profile`) so future sessions can compare actual entry/async chunk contributions rather than source-file size alone.
- Focused lazy-runtime and input coverage passes at 2 files / 43 tests, including late-load disposal during page unload. Production build now emits a 622,956-byte / 174,714-byte gzip entry and a 168,899-byte / 51,858-byte gzip online chunk. Initial JavaScript falls 161,869 bytes (20.62%) and 49,347 gzip bytes (22.02%); total JavaScript grows 7,030 bytes (0.90%) for the explicit boundary. The entry remains above the 500 kB warning and broad offline engine/renderer extraction is deliberately not disguised as complete.
- Production route smoke proves offline startup requests only the entry chunk, entering Online Battle requests exactly one online runtime chunk, and Field Briefing reuses it. The required generic web-game client reaches the ordinary Create Room entry with inspected screenshot and structured state.
- The real four-context lifecycle passes lobby, countdown cancellation, play, common results, unanimous rematch, fresh rematch key, kick/key rotation, fixed signals, and cleanup. The two-tablet lane passes text entry, copy/join, class selection, host Start, 62 ms input-to-visible motion, 430 ms first-tile completion, zero backtracks, Battle kit controls, guarded Back, and zero browser errors. Representative screenshots were inspected.
- Full `npm.cmd run validate` passes at 71 files / 621 tests with production build, real server integration, and configured attended-v2 checks. The F3 campaign prompt validates with zero blockers and the operating-mode guard returns `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`. Visual contrast, Product Review Warden with zero blocking debt, deterministic Deep Agent stub runtime, and diff checks pass.
- Durable package record: `docs/architecture/tanchiki2-f3-runtime-extraction-bundle-health-v1.md`. Plan v2 now records F2 merged, F3 active, and F4 as the next candidate only after F3 review and merge.
- TODO: prepare the exact F3 commit and PR, obtain current-head Codex and Reviewer App review, address safe findings without weakening the measured boundary, and stop for the human merge gate. Do not merge or deploy.
