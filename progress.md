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
