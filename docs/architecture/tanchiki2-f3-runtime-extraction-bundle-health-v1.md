# Tanchiki2 F3 Runtime Extraction And Measured Bundle Health v1

Date: 2026-07-24

Exact base commit: `07e26e28b63827b6b25bab334e5d8b117e985f22`

Working branch: `codex/tanchiki2-f3-runtime-bundle-health-v1`

Status: **IMPLEMENTED AND LOCALLY VALIDATED; EXACT-HEAD REVIEW PENDING**

## Bounded objective

F3 reduces initial loading cost and gives one route-owned runtime a clearer boundary. It does not move code merely to reduce line counts.

The selected boundary is Online Battle:

- splash, menus, campaign, Garage, Encyclopedia, and offline QA do not need Colyseus;
- the previous entry bundle statically included the complete online client, renderer, SDK, Schema, and message-pack implementation;
- Online Battle already has a distinct user-entered route and stable client/renderer owners.

This package does not rewrite `TanchikiGame`, the offline renderer, online gameplay, protocol, room lifecycle, fog filtering, input semantics, or the authoritative server. It does not deploy or authorize hosting.

## Evidence-led selection

The exact F2 main build was profiled from production source maps:

| Baseline contributor | Mapped generated characters |
| --- | ---: |
| `src/game/game.ts` | 229,336 |
| `src/game/render.ts` | 103,392 |
| `@colyseus/schema` | 51,774 |
| `src/game/pixelArt.ts` | 34,388 |
| `src/online/onlineClient.ts` | 29,643 |
| `src/online/onlineRenderer.ts` | 21,516 |

`game.ts` and `render.ts` remain the largest individual contributors, but they own the immediately available offline game and menu surface. Splitting them safely requires a later characterization-led extraction. The online path was the largest coherent dependency group that was unnecessary during offline startup and could be isolated without changing gameplay ownership.

## Runtime boundary

`src/online/lazyOnlineRuntime.ts` is the static boot contract.

It:

- imports no Colyseus or online renderer runtime code;
- preloads the dynamic route when the player enters the Online Battle menu;
- deduplicates concurrent preload and activation requests;
- holds touch-control, handedness, joystick, and orientation state until the runtime exists;
- provides a bounded loading state and a recoverable error state;
- lets Back cancel a pending or failed activation;
- preserves the existing input target consumed by `InputController`.

`src/online/onlineRuntime.ts` is the dynamic browser runtime.

It creates and delegates to the existing:

- `OnlineBattleClient`;
- `OnlineCanvasRenderer`.

No gameplay rule, state machine, renderer, or network implementation is duplicated across the boundary.

The player-facing hierarchy remains calm: the normal main and Online Battle menus are unchanged. Only an unusually slow or failed dynamic import shows one full-canvas status with one recovery action.

## Deterministic bundle profiler

`npm.cmd run bundle:profile` now:

1. builds the production client with source maps;
2. identifies the actual entry and asynchronous JavaScript chunks;
3. reports raw and gzip byte sizes;
4. decodes source-map mappings without adding a profiling dependency;
5. names the largest mapped source contributors in each chunk.

The command writes generated build files only under ignored `dist/` and prints the profile as JSON. It does not treat source-file length as shipped-byte evidence.

## Before and after

| Metric | Exact F2 baseline | F3 result | Change |
| --- | ---: | ---: | ---: |
| Initial JavaScript | 784,825 B | 623,043 B | -161,782 B / -20.61% |
| Initial gzip JavaScript | 224,061 B | 174,832 B | -49,229 B / -21.97% |
| Async Online Battle JavaScript | 0 B | 168,899 B | route-loaded |
| Async Online Battle gzip | 0 B | 51,858 B | route-loaded |
| Total JavaScript | 784,825 B | 791,942 B | +7,117 B / +0.91% |
| Total gzip JavaScript | 224,061 B | 226,690 B | +2,629 B / +1.17% |

The small total-size increase is the explicit runtime boundary and error handling. The initial download reduction is material and does not defer code required for the ordinary offline experience.

The entry chunk remains above the current 500 kB warning threshold. F3 records that honestly. The new post-split profile confirms that `game.ts`, `render.ts`, and `pixelArt.ts` are the next dominant entry contributors; another reduction requires a separate bounded extraction rather than another arbitrary chunk.

## Characterization and browser evidence

Direct lazy-runtime tests prove:

- construction does not request the online module;
- preload is one-shot and does not activate Online Battle;
- Create/Join remains in a deterministic loading state until activation completes;
- mapped offline shortcuts cannot leak into the paused offline menu while the boundary owns the screen, while Back remains available;
- touch/orientation state survives the asynchronous boundary;
- load failure is announced and Back returns to the offline menu.

`npm.cmd run visual:f3-runtime-boundary` uses the production build and proves:

- main-menu startup requests only the entry JavaScript chunk;
- entering Online Battle requests exactly one `onlineRuntime-*` chunk;
- Field Briefing reuses that loaded chunk;
- structured state reaches `main-menu`, `online-menu`, and the Create Room `room-entry`;
- no blocking browser message occurs.

The required generic web-game client reaches the Create Room Field Briefing through ordinary inputs. Its screenshot and structured output were inspected.

The real four-context browser lane still completes:

`LOBBY -> COUNTDOWN -> LOBBY -> COUNTDOWN -> PLAYING -> RESULTS -> LOBBY -> DESTROYED`

It preserves countdown cancellation, locked roster, fixed radio and touch ping, own-cell deployables, result agreement, unanimous rematch, fresh rematch key, kick/key rotation, and cleanup.

The two-tablet lane preserves native text entry, touch copy/join, class selection, host Start, 62 ms input-to-visible motion, 430 ms first-tile completion, zero movement backtracks, Battle kit controls, guarded Back, and zero browser errors.

## Validation

| Lane | Result |
| --- | --- |
| Focused lazy-runtime and input tests | PASS at 2 files / 44 tests |
| Full `npm.cmd run validate` | PASS at 71 files / 622 tests, production build, server integration, and configured attended-v2 checks |
| `npm.cmd run bundle:profile` | PASS; deterministic two-chunk profile and before/after evidence recorded |
| `npm.cmd run visual:f3-runtime-boundary` | `F3_RUNTIME_BOUNDARY_SMOKE_PASSED` |
| Required generic web-game client | PASS; Field Briefing screenshot and structured state inspected |
| Four-context online lifecycle | PASS |
| Two-tablet entry/gameplay lifecycle | PASS |
| `npm.cmd run visual:contrast` | PASS |
| Product Review Warden | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; zero blocking debt |
| Deterministic Deep Agent stub runtime | `DEEP_AGENT_STUB_COMPLETE_ALLOWED` |
| Attended-v2 prompt and operating-mode guard | PASS with zero prompt blockers; `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS` |
| `git diff --check` | PASS |

## Deliberate deferrals

- Further `TanchikiGame`, offline renderer, and `pixelArt` extraction remains future measured work.
- The remaining 500 kB entry warning is not hidden or raised away.
- Node.js 22 alignment and dependency/audit work remain F4.
- Online feature expansion remains F5.
- Human WAN and real hosting remain H1.

## Authority boundary

This package does not authorize merge, deployment, public hosting, provider setup, production settings, secrets, billing, DNS, tags, announcements, repository settings, or production telemetry.

## Terminal outcome

`F3_RUNTIME_BOUNDARY_IMPLEMENTED_PENDING_EXACT_HEAD_REVIEW`
