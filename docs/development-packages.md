# Tanchiki Bounded Development Packages

This plan keeps the work scoped to a playable Canvas 2D game plus the standard harness adapter. The game screen follows the AGENTS.md UI contract: one dominant canvas, one primary job, no dashboard chrome, no nested panels.

## Package 0: Product Setup And Harness Adapter

Scope:
- Initialize the Vite TypeScript project.
- Add `.agentic-harness/` consumer adapter files pinned to an immutable harness ref.
- Add local validation scripts and this bounded package plan.

Acceptance:
- `npm install` succeeds.
- `.agentic-harness/harness-wrapper.mjs validate` accepts the local kit.
- Harness lock uses a commit SHA, not a branch or dynamic ref.

Status: complete. Evidence: `.agentic-harness/` kit added, lock pins `35bad308ebb904bb22e600643d6d279062101c44`, `npm run harness:validate` and `npm run harness:smoke` pass.

## Package 1: Core Game Loop

Scope:
- Deterministic update loop.
- Player tank movement, shooting, lives, score, and base state.
- `window.advanceTime(ms)` and `window.render_game_to_text()`.

Acceptance:
- Unit tests cover start, movement, firing, and state text.
- Browser loop can be driven by the Playwright game client.

Status: complete. Evidence: deterministic `TanchikiGame`, `window.advanceTime(ms)`, `window.render_game_to_text()`, and Vitest coverage are implemented.

## Package 2: Arena And Combat

Scope:
- Battle City-inspired tile map with brick, steel, water, trees, and base.
- Bullet collisions, destructible brick, protected base, enemy damage.
- Enemy wave spawning and simple AI.

Acceptance:
- Shots destroy brick/enemies and update score.
- Losing base or all lives ends the run.
- Clearing all enemy waves wins the run.

Status: complete. Evidence: brick/steel/water/base map, destructible brick, enemy waves, bullet combat, base loss, lives, score, and win state are implemented.

## Package 3: Retro Presentation

Scope:
- Pixel-art Canvas renderer using primitives.
- Right-side status strip, compact start/pause/win/loss overlays.
- Fullscreen key support.

Acceptance:
- Main screen has exactly one dominant surface.
- Controls are shown on menu/pause states, not during active play.
- Reference-image cues are present without copying assets.

Status: complete. Evidence: single Canvas 2D renderer, quiet page chrome, right-side HUD strip, menu/pause/win/loss overlays, keyboard controls, and fullscreen support are implemented.

## Package 4: Validation And Closeout

Scope:
- Vitest coverage for deterministic logic.
- TypeScript/Vite build.
- Harness wrapper smoke.
- Playwright gameplay smoke with screenshots and text state inspection.

Acceptance:
- `npm run validate` passes.
- Playwright smoke reaches gameplay, fires a shot, and produces readable state.
- PR creation is attempted when a Git remote is available; otherwise local branch/commit state is reported.

Status: complete. Evidence: `npm run validate` passes and the develop-web-game Playwright client produced inspected gameplay screenshots plus `render_game_to_text` state files under `output/web-game`.

## Package 5: Real Game Upgrade

Scope:
- Replace rollback-based continuous tank movement with committed 32px grid movement.
- Add grid-aware enemy roles, BFS objective routing, team selection, local save/continue, mission briefing, how-to-play, pause save, and garage upgrades.
- Preserve the single-canvas screen hierarchy while making pre-game explanation and progression visible.

Acceptance:
- Tanks never stop halfway before blocked terrain.
- Player can choose blue or red, start from a briefing, save/continue a run, and persist garage upgrades.
- Enemy AI routes toward objectives and wall breakers clear brick instead of wandering.

Status: complete. Evidence: `npm run validate` passes; Playwright inspected main menu, briefing, and gameplay/save/continue screenshots under ignored `output/web-game-real-*` directories.

## Package 6: Campaign Level Progression

Scope:
- Add an 8-level handcrafted campaign with per-level maps, briefing text, enemy totals, active enemy limits, spawn cadence, role weights, armored ratios, and rewards.
- Use the active level definition for map loading, spawning, enemy difficulty, HUD level marker, save/continue, and `render_game_to_text()`.
- Add level-complete and campaign-complete menu states with persisted unlocks and rewards.

Acceptance:
- New games start at the highest unlocked level.
- Clearing a level awards rewards, unlocks the next level, clears resumable save state, and shows the next-level briefing flow.
- Final level clear enters campaign-complete.
- Existing movement, team, save, garage, and AI behavior remains intact.

Status: complete. Evidence: unit tests cover unlocked-stage starts, rewards/unlocks, final completion, saved level restoration, and campaign difficulty ramp.

## Package 7: Release Closeout And CI

Scope:
- Validate and merge the real-game upgrade PR into `main`.
- Add GitHub Actions CI for `npm run validate`.
- Continue follow-up work on a fresh branch from updated `main`.

Acceptance:
- PR #1 is merged cleanly.
- CI runs on pull requests and pushes to `main`.
- Local validation remains green before follow-up changes.

Status: complete. Evidence: PR #1 merged; `.github/workflows/validate.yml` runs install plus `npm run validate`.

## Package 8: Game Feel And Feedback

Scope:
- Add retro Web Audio SFX for menu, firing, hits, brick breaks, enemy destroyed, powerups, upgrades, level clear, and game over.
- Add deterministic screen shake, flash, and level-clear feedback through render state.
- Add a saved Settings menu for volume, mute, and color-safe rendering.

Acceptance:
- Game logic queues sound events without depending on browser audio APIs.
- Settings persist in the existing local save payload.
- Canvas remains the only dominant surface; no extra dashboard UI is introduced.

Status: complete. Evidence: tests cover settings persistence and sound/feedback queueing.

## Package 9: Campaign Balance Pass

Scope:
- Smooth the 8-level difficulty ramp by reducing early grind and increasing pressure gradually.
- Tune enemy totals, active limits, spawn cadence, role weights, armor ratios, and rewards.
- Preserve increasing challenge from Level 1 through Level 8.

Acceptance:
- Enemy totals ramp from 6 to 20 across the campaign.
- Existing level progression, rewards, save/continue, and final-complete behavior remains intact.
- Upgrade-assisted run stats are covered by tests.

Status: complete. Evidence: campaign ramp and upgrade-assisted run tests are included.

## Package 10: Mobile And Accessibility

Scope:
- Add canvas pointer/touch controls for menu selection, movement, fire, and pause.
- Show minimal in-canvas touch glyphs only on coarse pointer devices or after touch input.
- Add color-safe team palette support through Settings.

Acceptance:
- Touch handling maps scaled canvas coordinates into logical game actions.
- Desktop keyboard and Playwright keyboard smoke remain unchanged.
- Color-safe mode affects tank, bullet, HUD, and marker rendering.

Status: complete. Evidence: TypeScript build covers touch/control surfaces; browser validation captures menu/settings/gameplay state.

## Package 11: Multiplayer Vision Foundation

Scope:
- Add an authoritative shared multiplayer simulation for blue-vs-red team battles.
- Add narrow personal vision, short last-known enemy markers, and capturable retranslators that merge team vision.
- Add a small local realtime server with room join, commands, typed team radio chat, pings, personalized snapshots, and a health/smoke check.
- Add an Online Battle menu path and focused canvas renderer without adding dashboard chrome.

Acceptance:
- A player can join Quick Match from the canvas menu and receive server-driven snapshots.
- Players only see personal vision until their team captures a retranslator.
- Team radio chat and pings are server-mediated and only returned to teammates.
- `render_game_to_text()` exposes online room, player, team, connection, scores, visibility, chat, pings, and relay status.
- Existing single-player validation remains green.

Status: complete. Evidence: shared unit tests cover narrow vision, relay vision merge, last-known enemies, authoritative commands, and team-scoped chat/pings; `npm run validate` passes; Playwright online and single-player smoke screenshots/states were inspected under ignored `output/web-game-online` and `output/web-game-regression`.

## Package 12: Strict Online Fog Repair

Scope:
- Treat online fog-of-war as an authoritative server contract, not a renderer-only effect.
- Hide unseen relays, pings, shots, players, objectives, and terrain from personalized snapshots.
- Keep short last-known enemy markers without revealing hidden terrain or relay state.

Acceptance:
- Fresh online snapshots do not include distant retranslators.
- Relays and pings only appear when their tile is inside the receiver's current team vision.
- Capturing a relay expands team vision without revealing the whole map.
- Browser smoke screenshots show black hidden map areas with no distant relay markers.

Status: complete. Evidence: `npm run validate` passes; online spawn smoke inspected `output/web-game-strict-fog-spawn/shot-1.png` and shows `visibleRetranslatorCount: 0`; supplemental capture smoke inspected `output/web-game-strict-fog-capture/shot.png` and shows `LINK ON` with 48 visible cells and only 2 visible relays; single-player regression smoke inspected `output/web-game-strict-fog-regression/shot-1.png`.

## Package 13: Pixel-Art Visual Upgrade

Scope:
- Replace low-detail rectangle sprites with shared procedural pixel-art drawing helpers.
- Give offline and online renderers the same visual language while preserving the existing canvas layout and online strict fog.
- Add denser terrain, tank, relay, projectile, power-up, and HUD marker rendering without adding image assets or dependencies.

Acceptance:
- Offline gameplay shows richer grass, terrain, tanks, bullets, power-ups, and HUD markers.
- Online gameplay no longer looks more primitive than offline; visible cells use the same pixel-art style at 20px scale.
- Hidden online fog cells remain plain black with no decorative hints or leaked relay markers.

Status: complete. Evidence: `npm run validate` passes; offline Playwright screenshot `output/web-game-pixel-offline/shot-1.png` shows denser terrain/tanks/HUD markers; online Playwright screenshot `output/web-game-pixel-online/shot-1.png` shows matching sprite density with `visibleRetranslatorCount: 0`; relay capture screenshot `output/web-game-pixel-online-capture/shot.png` shows a richer relay with strict fog; color-safe screenshots under `output/web-game-pixel-color-safe/` confirm readability in both modes.

## Package I3: Persistent Memory Adapter

Scope:
- Pin the product adapter to post-I2 `urkrass/agentic-harness@5910034157384a8c777a1ed8f2492ee36a3ad1c6`.
- Add persistent project, role, review-debt, validation, and closeout memory under `.agentic-harness/memory/`.
- Record closed PR #2/#3/#5 Codex review comments and current open P1/P2 review debt from later PRs.
- Wire the Product Review Warden gate so production/release `COMPLETE` is blocked while open P1/P2 debt remains.

Acceptance:
- `npm run harness:validate` and `npm run harness:smoke` verify the persistent memory files and gate input exist.
- `npm run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` reports production/release COMPLETE blocked when unresolved debt remains.
- Future Codex sessions load `.agentic-harness/memory/` before any COMPLETE or release-readiness claim.

Status: ready for PR. Evidence: `npm.cmd run validate`, `npm.cmd run harness:validate`, `npm.cmd run harness:smoke`, and `git diff --check` pass. The Product Review Warden command reports `PRODUCT_REVIEW_WARDEN_COMPLETE_BLOCKED` with five open blocking debt ids, proving production/release COMPLETE is blocked while current review debt remains.

## Package I4: Review Warden Debt Repair

Scope:
- Repair the five blocking Review Warden debt items recorded after I3.
- Add regression coverage for respawn interpolation snapping, last-known minimap filtering, hybrid online input holds, FFA objective exhaustion, and assault defender targeting.
- Update `.agentic-harness/memory/review-debt.json` with linked repair-work closure evidence.

Acceptance:
- Product Review Warden allows production/release `COMPLETE` for these five items.
- No debt is waived.
- Full local validation and diff checks pass.

Status: ready for PR. Evidence: focused debt regression tests pass; `npm.cmd run validate` passes; Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero open blocking debt items and five linked repair-work closures. Browser smoke reaches active offline gameplay with movement, a fired shell, spawned enemies, and a nonblank rendered battlefield. Expected terminal outcome: `I4_TANCHIKI2_REVIEW_DEBT_REPAIRED`.

## Package I6: Respawn Escape Spawn Safety

Scope:
- Treat safe tank spawning as passable, unoccupied, and escapable.
- Keep normal movement collision rules unchanged while preventing player, enemy, friendly, neutral, and online respawn placement in one-cell pockets.
- Preserve Review Warden memory as read-only evidence/context and avoid production, deployment, secret, or branch-protection changes.

Acceptance:
- Offline player and enemy spawns configured on passable but trapped cells relocate to escapable cells.
- Online respawn selection skips passable preferred spawn pockets with no usable exit.
- Full local validation, harness validation/smoke, Product Review Warden, browser smoke, and diff checks pass.

Status: ready for PR. Evidence: focused spawn tests pass with 57 tests; `npm.cmd run validate` passes with 103 tests; `npm.cmd run harness:validate` and `npm.cmd run harness:smoke` pass; Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. Browser evidence inspected: `output/web-game-respawn-escape-offline/shot-0.png` reaches active Level 1 gameplay, and `output/web-game-respawn-escape-online/shot-0.png` reaches connected online play with circular fog and `sendErrorCount: 0`.

## Package I7: Continuous Enemy Movement Fairness

Scope:
- Remove the visible pause after successful offline enemy tile movement.
- Keep player movement upgrades, grid collision, targeting, shooting, wall breaking, spawn safety, online movement, and UI unchanged.
- Preserve Review Warden memory as read-only evidence/context and avoid production, deployment, secret, or branch-protection changes.

Acceptance:
- Enemy tanks that successfully start movement immediately decide again after the tile move completes, matching held player movement cadence.
- Enemy shooting and brick-breaking decisions still apply the existing randomized AI cooldown.
- Full local validation, harness validation/smoke, Product Review Warden, browser smoke, and diff checks pass.

Status: ready for PR. Evidence: focused offline game tests pass with 42 tests; full validation and browser smoke evidence are recorded in `progress.md` for the I7 branch. Expected terminal outcome remains `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`.

## Package I8: Mission Description Text Wrap

Scope:
- Wrap long offline mission helper text in the canvas menu overlay instead of truncating it with an ellipsis.
- Keep mission copy, menu options, gameplay, HUD layout, online rendering, and Review Warden memory unchanged.
- Preserve one calm canvas-focused briefing screen without adding panels, nested chrome, or extra controls.

Acceptance:
- Long campaign briefing descriptions remain fully readable above the mission buttons.
- Pixel text wrapping keeps every generated helper line inside the arena text width.
- Full local validation, harness validation/smoke, Product Review Warden, browser briefing smoke, and diff checks pass.

Status: ready for PR. Evidence: focused pixel text test passes with 3 tests; `npm.cmd run validate` passes with 106 tests; `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` pass; Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. Browser evidence inspected: `output/web-game-mission-description-wrap-20260701-224216/shot-0.png` shows the Level 1 mission description wrapped without cropping and no browser error files were produced.

## Package I9: Respawning Teammate Squads With HP Bars

Scope:
- Maintain respawning offline teammate squads for team-battle, CTF, and assault objectives.
- Give teammate AI bots 3 HP and compact in-arena HP bars while keeping online multiplayer, enemy movement, shooting rules, fog, menus, and player upgrades unchanged.
- Preserve Review Warden memory as read-only evidence/context and avoid production, deployment, secret, or branch-protection changes.

Acceptance:
- Team-based missions start with at least two active player-side AI teammates where map layout allows.
- Killed teammates respawn after the level spawn interval without decrementing enemy tickets or awarding player rewards.
- Teammate HP and max HP are visible in `render_game_to_text`, and teammate HP bars are visible in browser evidence.
- Full local validation, harness validation/smoke, Product Review Warden, browser smoke, and diff checks pass.

Status: ready for PR. Evidence: focused offline game tests pass with 45 tests; `npm.cmd run validate` passes with 109 tests; `npm.cmd run visual:contrast`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` pass; Product Review Warden reports `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`. Browser evidence inspected: `output/web-game-teammate-respawn-hp-20260701-230213/shot-0.png` shows Level 2 Team Battle with teammate HP bars; `state-0.json` reports two player-side allies with `hp: 3` and `maxHp: 3`, and no browser error files were produced.
