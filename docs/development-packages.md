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
