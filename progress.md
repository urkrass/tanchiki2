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
