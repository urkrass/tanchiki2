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
