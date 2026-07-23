# Tanchiki2 P9 Runtime Maintainability v1

Status: **IMPLEMENTED AND LOCALLY VALIDATED; EXACT-HEAD REVIEW PENDING**

Date: 2026-07-23

Exact base commit: `281051cb92852cb03756e34e13cc4a1159eb0566`

Working branch: `codex/tanchiki2-p9-runtime-maintainability-v1`

## Bounded objective

P9 is incremental refactoring, not a redesign. This first package extracts the offline battlefield-perception boundary stressed by Signal Scar:

- terrain-created movement and impact evidence;
- fog-safe evidence projection and hidden-source distortion;
- hostile jammer, EMP, and relay-suppression rules;
- terrain-evidence and jammer Canvas animation.

The package does not change gameplay, hearing range, relay/radar semantics, online protocol, saves, controls, UI hierarchy, or deployment.

## Runtime boundary

Before this package, the complete perception implementation lived inside two orchestration surfaces:

- `src/game/game.ts`: 11,644 lines;
- `src/game/render.ts`: 7,195 lines.

After extraction:

- `src/game/game.ts`: 11,545 lines;
- `src/game/render.ts`: 6,840 lines;
- `src/game/terrainEvidenceRuntime.ts` owns pure evidence planning, aging, bounds, projection, and distortion;
- `src/game/signalWarfare.ts` owns pure jammer, EMP, and relay-suppression decisions;
- `src/game/battlefieldPerceptionRender.ts` owns evidence and jammer battlefield animation.

`TanchikiGame` still owns the authoritative offline match state and calls these bounded systems. No second simulation, renderer, snapshot contract, or rule set was introduced.

## Preserved contracts

- Existing terrain weight and Overdrive multipliers remain exact.
- Dust, gravel, mud, reeds, metal, echo, and ricochet evidence retain their kinds, lifetimes, strength caps, direction, and labels.
- Evidence history remains capped at 90 items.
- Evidence remains visible when it belongs to the observing side or its cell is currently visible.
- Hidden hostile evidence remains approximate and deterministic.
- Hidden echo pulses remain displaced to a side or rear candidate and avoid a solid cell where possible.
- Jammer anchors remain operational only while their configured brick cell has positive HP.
- EMP disables an operational jammer temporarily without reporting it destroyed.
- Only hostile, operational, non-EMP-disabled jammers suppress relays inside their Manhattan radius.
- Hidden jammer coordinates remain absent from structured state.
- Per-cell evidence animation still renders only the strongest remaining signal.
- `render_game_to_text()` and `window.advanceTime(ms)` remain unchanged.

## Characterization coverage

`src/game/offlinePerception.test.ts` directly verifies:

- movement-evidence plans for dust, echo, reeds, metal, gravel, and ordinary ground;
- light/heavy and Overdrive strength behavior;
- evidence aging, expiry, 90-item-style bounding, fog-safe projection, and numeric rounding;
- deterministic bounded hidden-source and echo distortion;
- jammer, EMP-window, and destroyed-anchor states;
- relay suppression radius and EMP release;
- hidden jammer coordinate filtering;
- strongest-per-cell render coalescing.

The existing terrain-evidence and full game suites remain the integration authority.

## Visual acceptance

The committed Signal Scar browser lane remains the representative acceptance path:

```powershell
npm.cmd run visual:p7-signal-scar
```

It must continue to prove:

- initial jammed state;
- no hidden jammer coordinate leak;
- normal jammer breach and clear state;
- Engineer EMP cooperation;
- allied class equipment;
- desktop and tablet rendering;
- tablet movement and firing;
- no blocking browser messages.

The bundled generic web-game client is also run against the deterministic Signal Scar route. Generated screenshots, state captures, and browser logs remain ignored under `output/`.

## Deliberate deferrals

The previously identified hearing defect is not silently changed by a refactor. A later gameplay package should add bounded local acoustic hearing based on distance, loudness, and occlusion while keeping relay-derived information in the signal/radar channel. This extraction gives that work a dedicated state and rendering boundary.

The production build remains above the current 500 kB warning threshold. Static extraction by itself does not reduce shipped bytes, and this package does not disguise file movement as bundle optimization. Dynamic campaign/online or presentation chunking should be evaluated separately with startup, route, deterministic-QA, and browser-failure measurements.

## Validation

| Lane | Result |
| --- | --- |
| Focused perception, terrain-evidence, and full game tests | PASS at 3 files / 149 tests |
| Full `npm.cmd run validate` | PASS at 61 files / 571 tests; build, server integration, and configured attended-v2 checks green |
| `npm.cmd run visual:p7-signal-scar` | PASS on desktop and tablet; hidden-coordinate safety and all gameplay assertions green |
| Bundled generic web-game client | PASS; structured Signal Scar state and screenshots inspected, no console-error artifact |
| `npm.cmd run visual:contrast` | PASS |
| Product Review Warden | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; zero open blocking debt |
| Deterministic Deep Agent stub runtime | `DEEP_AGENT_STUB_COMPLETE_ALLOWED` |
| `git diff --check` | PASS |

Exact-head Codex and Reviewer App review remain before merge.

## Authority boundary

This package does not authorize merge, deployment, public hosting, production settings, secrets, billing, tags, announcements, repository settings, or production telemetry.

## Terminal outcome

`P9_OFFLINE_PERCEPTION_BOUNDARY_IMPLEMENTED_PENDING_EXACT_HEAD_REVIEW`
