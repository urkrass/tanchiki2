# Review Debt Closeout

Date: 2026-07-01

Scope: reinforced review-debt pass for unresolved Codex review threads from PR #2, PR #3, and PR #5 before finishing PR #8. I3 adds persistent memory so the same debt and later open review debt remain visible to future sessions.

## Closed Debt

| Source | Thread | Fix | Evidence |
| --- | --- | --- | --- |
| PR #2 | `PRRT_kwDOTJqPIc6NVjnm` / P1 multi-touch stuck input | Replaced single active pointer state with per-pointer button tracking. Releasing one touch now clears only that touch, while other held buttons remain accurate. | `src/game/input.test.ts` covers second-finger fire, duplicate held buttons, and pointer movement between buttons. |
| PR #2 | `PRRC_kwDOTJqPIc7QoO5l` / P2 menu taps outside rendered options | `selectMenuIndex` now rejects indices outside the current menu item list, so a tap below the options cannot clamp to and confirm the last item. | `src/game/game.ts` bounds `selectMenuIndex`; `src/game/input.test.ts` covers visible row bounds and row gaps. |
| PR #3 | `PRRT_kwDOTJqPIc6NWMDh` / stale command sequence | Added `lastCommandSeq` per multiplayer player and ignored older or unsequenced commands after sequenced input. | `packages/shared/src/multiplayer.test.ts` verifies seq `1` cannot overwrite seq `2`. |
| PR #3 | `PRRT_kwDOTJqPIc6NWMDk` / multi-teammate vision memory | `refreshVisionMemory` now aggregates sightings from every alive teammate instead of the first teammate for the team. | `packages/shared/src/multiplayer.test.ts` verifies a second teammate's personal sight produces last-known memory before relay capture. |
| PR #5 | `PRRT_kwDOTJqPIc6NWxki` / relay capture progress color | Relay body still uses current owner/neutral state, but the progress bar uses the capturing team while capture is in progress. | `src/online/onlineRenderer.test.ts` covers neutral capture, takeover capture, and completed/idle state. |

## Persistent Review Warden Memory

The canonical review-debt memory is `.agentic-harness/memory/review-debt.json`.
It records the closed PR #2, PR #3, and PR #5 comments above and the current open P1/P2 Codex review comments from PR #9, PR #10, PR #13, and PR #14.

Before any future production/release `COMPLETE` claim, load `.agentic-harness/memory/` and run:

```powershell
npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout
```

As of I3, that command was expected to report `PRODUCT_REVIEW_WARDEN_COMPLETE_BLOCKED` because unresolved P1/P2 review debt remained. The adapter installation could be ready, but production/release COMPLETE was blocked until the Review Warden debt was closed by exact repair links, explicit human waivers, or linked repair work.

As of I4, the five blocking P1/P2 debt items are closed by linked repair work, not waivers:

| Debt id | Repair | Evidence |
| --- | --- | --- |
| `tanchiki2-pr9-respawn-teleport-interpolation` | Online interpolation snaps across alive-state changes and teleport-sized deltas instead of lerping respawns. | `src/online/onlineInterpolation.ts`; `src/online/onlineInterpolation.test.ts`. |
| `tanchiki2-pr10-last-known-minimap-fog-leak` | Online minimap last-known markers are filtered to current visible cells. | `src/online/onlineMinimap.ts`; `src/online/onlineMinimap.test.ts`. |
| `tanchiki2-pr13-hybrid-online-input-held-button-drop` | Online held input is tracked per source so keyboard release cannot clear an active pointer hold. | `src/online/onlineInput.ts`; `src/online/onlineClient.ts`; `src/game/input.ts`; `src/online/onlineInput.test.ts`. |
| `tanchiki2-pr14-ffa-bot-kills-exhaust-objective` | FFA levels complete when the neutral objective pool is exhausted and no tanks remain. | `src/game/game.ts`; `src/game/game.test.ts`. |
| `tanchiki2-pr14-assault-defenders-target-core` | Assault defenders target hostile tanks before objective fallback, and objective fallback is player-side only. | `src/game/game.ts`; `src/game/game.test.ts`. |

The expected I4 Review Warden result is `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero open blocking debt items.

## Validation

- `npm run test` passed with 5 test files and 39 tests.
- `npm run build` passed.
- `npm run validate` passed, including `server:smoke`, `harness:validate`, and `harness:smoke`.
- `node ./.agentic-harness/harness-wrapper.mjs review` passed.
- Browser smoke inspected:
  - Offline: `output/web-game-review-debt-offline/shot-0.png`, state `mode: "playing"`.
  - Online: `output/web-game-review-debt-online/shot-0.png`, state `connection: "connected"`, `visibleRetranslatorCount: 0`, `tileSize: 32`, `viewCols: 13`, `viewRows: 13`.

Note: npm was run with cache/temp redirected to `.tmp/` on D: during validation because the default C: npm cache reported `ENOSPC`.
