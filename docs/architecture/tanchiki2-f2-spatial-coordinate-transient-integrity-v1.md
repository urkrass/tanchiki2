# Tanchiki2 F2 Spatial-Coordinate And Transient-Event Integrity v1

Date: 2026-07-24

Exact base commit: `a3906c0e573e689882d8808efef820e57c7aa5c6`

Working branch: `codex/tanchiki2-f2-coordinate-integrity-v1`

## Scope

F2 turns the concrete P10 feedback-notice defects into a small reusable contract. It also removes the frequently flashing last-seen enemy-tank marker from player-facing maps, as requested during F2 planning.

This package does not rewrite rendering, change authoritative movement or fog rules, remove AI memory, change spatial hearing, add a second snapshot, deploy, publish, or authorize a release.

## Spatial contract

`src/game/spatialCoordinates.ts` names the four coordinate forms used by the migrated feedback path:

- `GridCellPoint`: logical map column and row;
- `ArenaWorldPixelPoint`: arena-offset world pixels before camera projection;
- `CameraScreenPixelPoint`: final camera-relative canvas pixels;
- `BattlefieldScreenRect`: the clip and layout rectangle of the visible battlefield.

Feedback producers choose either the cell or world-pixel entry point. Cell anchors convert to world pixels in one helper. Stored notices carry a tagged world-pixel anchor. The renderer projects that anchor through the active camera exactly once, and the layout accepts only tagged screen points and battlefield bounds.

This is intentionally a bounded guardrail rather than a universal geometry framework. Existing gameplay coordinates outside the feedback path are not mechanically rewritten.

## Fog-aperture presentation contract

Human testing found that moving tanks could disappear when their center crossed the logical vision radius even though part of the sprite was still inside the renderer's softened circular fog aperture. The first north Acoustic Field Course patrol also vanished during its stationary reed pause despite remaining inside the clear aperture.

`packages/shared/src/visionPresentation.ts` now owns the half-tile tank footprint and the `0.35`-cell fog soft edge used by both offline and online presentation. A tank remains available to the renderer while that footprint intersects any current vision aperture, and the existing fog layer clips and fades the sprite. Once the complete footprint is behind opaque fog, the entity is omitted.

This presentation boundary is deliberately separate from simulation detection. Bot perception, acoustic source precision, terrain evidence, and authored soft-cover concealment retain their stricter rules. Ordinary reed terrain can no longer make a player-facing tank blink out inside clear fog; explicit soft-cover props still provide an environmental concealment boundary.

## Transient identity contract

Feedback notice identity comes from `MonotonicTransientId`. Expiry only removes events; it does not derive the next ID from the active array. A reset is explicit and occurs only when the whole gameplay lifecycle clears every notice.

The same ID survives storage, bounded filtering, layout, rendering, and accessibility selection.

## Last-seen presentation policy

Remembered enemy-tank coordinates remain private simulation evidence:

- offline AI can still investigate uncertain contacts without blind fire;
- authoritative online vision memory remains available for fog and device rules;
- structured QA can still prove that the memory exists.

They are no longer accepted by the offline battlefield renderer, online battlefield renderer, or online minimap model. This removes the visual ghost that repeatedly appeared and disappeared during close engagements.

Explicit equipment or radar contacts are separate. Tripwire alerts and `device-*` decoy contacts remain presentable because they are current player-created signals, not stale tank-position history. Ordinary terrain evidence, tread trails, soft-cover disturbance, physical sound, and relay/radar information keep their existing independent rules.

## Player-facing hierarchy

The battlefield remains the single dominant surface. F2 adds no panel, legend, history list, or persistent marker layer. Removing stale enemy ghosts reduces clutter and makes physical environmental evidence more important.

## Validation contract

Required before exact-head review:

- direct spatial-coordinate, transient-identity, presentation-policy, notice-layout, minimap, accessibility, and game regressions;
- a fog transition with retained internal tank memory but no player-facing ghost;
- the bundled generic web-game Playwright client with screenshot, structured-state, and browser-log inspection;
- desktop and tablet Acoustic Field Course evidence;
- relevant visual regressions;
- full `npm.cmd run validate`;
- Product Review Warden, Deep Agent stub runtime, and `git diff --check`.

## Current evidence

- Clean F2 baseline: `npm.cmd run validate` passed at 66 files / 603 tests.
- Focused implementation suite: 7 files / 148 tests passed.
- Full `npm.cmd run validate` passed at 69 files / 612 tests, including the production build, real server integration, and configured attended-v2 harness checks.
- Generic browser client passed on the Acoustic Field Course. The inspected state retained one internal `lastKnown` tank memory while the corresponding battlefield and minimap ghost were absent from the inspected screenshot; no browser-error artifact was produced.
- The full Acoustic Field Course passed all twelve checkpoints, seven real patrols, three real live-fire stations, steel attenuation, and the 1280x711 tablet lane with no blocking browser messages. Inspected desktop and tablet captures keep sound/evidence cues while showing no stale tank ghost.
- The fog-edge repair sampled the first north patrol for 125 live browser frames: 79 moving, 46 paused in reeds, and zero missing presentation frames. Inspected moving and paused captures keep the tank continuous while the fog clips the aperture. The shared multiplayer projection also omits a tank once its whole footprint is behind opaque fog.
- Signal Scar passed on desktop and tablet. Concurrent ally notices remained camera-anchored and inside the battlefield, `hiddenCoordinateLeak` stayed false, and browser logs were clean.
- `npm.cmd run visual:contrast`, Product Review Warden (`PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero blocking debt), Deep Agent stub runtime (`DEEP_AGENT_STUB_COMPLETE_ALLOWED`), and `git diff --check` passed.
- Post-repair full `npm.cmd run validate` passed at 70 files / 616 tests, including shared compilation, production build, server integration, and every configured attended-v2 harness check.

Exact-head PR review evidence must be refreshed after the repair commit.

## Explicit deferrals

- Broad renderer extraction and bundle work remain F3.
- Node and dependency maintenance remain F4.
- A broader visual language for equipment/radar contacts requires a separately observed defect.
- Human WAN acceptance remains deferred to the later friends pretest.
- Public hosting, deployment, secrets, billing, DNS, tagging, and announcement remain outside this package.
