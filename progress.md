Original prompt: This is a fresh product repo: tanchiki. Use D:\agentic-harness\repo, adopt agentic-harness with the standard .agentic-harness adapter, then build a production-quality retro top-down tank game inspired by Tanchiki / Battle City using Canvas 2D + TypeScript + Vite. Proceed with the safe default harness workflow: setup, adapter, bounded packages, implement package by package, validate, open PRs/report progress, ask only if blocked.

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
- Live attended-v2 LangSmith telemetry dispatched after verifying `urkrass/agentic-harness` branch `codex/mar-693-empty-base` resolves to `69df33aafbe6f2738b87419d449fd3ee4f84f018`; GitHub Actions run `28674666831` completed successfully.
- Follow-up shield fix: Battle Tank now starts with 1 persistent shield point; shield pickups add one persistent point instead of a timer; shield points absorb incoming damage before HP and no longer tick down over time.
- Shield validation passed: `npm.cmd run test -- src/game/game.test.ts`, `npm.cmd run validate`, and web-game Playwright evidence under `output/battle-shield-smoke/` with inspected Battle Tank shield screenshot.

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
