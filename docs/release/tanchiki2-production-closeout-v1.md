# Tanchiki2 Production Closeout Proof V1

Date: 2026-07-01

Repository: `urkrass/tanchiki2`

Base: `origin/main` at `de2d1e25dec7fdc681f691ce7a0fb93cb504756e` (`Repair Tanchiki2 Review Warden debt (#16)`)

Terminal outcome: `I5_TANCHIKI2_PRODUCTION_CLOSEOUT_PROOF_READY`

## Scope

This closeout proves release readiness. It does not deploy, publish, tag a release, change production settings, change secrets, change billing, change branch protection, remove rollback, or add gameplay features.

## Ready

- Product Review Warden allows `COMPLETE`.
- Open blocking P1/P2 review debt count is zero.
- All repaired blocking debt is linked to repair evidence in `.agentic-harness/memory/review-debt.json`.
- No human waivers were used.
- Local validation, harness validation, harness smoke, and browser gameplay proof are green.
- Old stacked gameplay PRs are closed or superseded and are not pending merge.

## Not Included

- Deployment or publishing.
- Release tagging.
- Production, billing, secret, or branch-protection changes.
- New gameplay features or unrelated polish.
- Waiving current or future Review Warden debt.

## Human Gate Required

A human gate is required before any deployment, release publication, production-setting change, billing change, secret change, branch-protection change, rollback removal, or Review Warden waiver.

## Review Warden Evidence

Command:

```powershell
npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout
```

Observed result:

- `can_claim_complete: true`
- `terminal_outcome: PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`
- `open_blocking_count: 0`
- `closed_by_linked_repair_count: 5`
- `converted_to_repair_work_count: 5`
- `closed_by_human_waiver_count: 0`
- `scanned_comment_count: 10`

The independent review-debt memory check also found no open blocking P1/P2 debt, no missing repair evidence, no missing repair-work links, and no human waivers.

## Validation Evidence

Commands run locally from the I5 branch:

- `npm.cmd run validate`: passed with 12 test files and 100 tests, production build, server smoke, harness validate, and harness smoke.
- `npm.cmd run harness:validate`: passed.
- `npm.cmd run harness:smoke`: passed.
- `git diff --check`: required final whitespace check.
- `git diff --cached --check`: required final staged whitespace check.

The final diff checks are recorded in the release checklist and must remain green on the PR head.

## Browser Gameplay Evidence

Artifacts are local generated proof under `output/i5-production-closeout/`; they are intentionally not committed.

| Requirement | Evidence |
| --- | --- |
| Offline campaign start | `offline-campaign-smoke/shot-0.png` and `state-0.json`: `mode: "playing"`, Level 1 `Outer Blocks`, base HP `3/3`, enemies spawned, nonblank canvas. |
| Online battle start or server smoke | `online-battle-smoke/shot-0.png` and `state-0.json`: `mode: "online-battle"`, `connection: "connected"`, snapshot `phase: "playing"`. |
| Minimap and fog behavior | Online state reports `fog.shape: "circular"`, `visibleCellCount: 29`, `hiddenCellCount: 291`, `visibleRetranslatorCount: 0`, and minimap policy `circular-live-vision-only`; screenshot shows black shroud outside the vision circle. |
| Input controls | `offline-input-probe/state-0.json`: keyboard left moved the player from Level 1 spawn column `4` to column `3` and set `dir: "left"`. |
| Combat interaction | `offline-combat-probe/state-0.json`: `shotsFired: 3`, `bricksDestroyed: 1`, `criticalCoverDestroyed: 1`, and brick count dropped to `43`. |
| No blank or broken canvas | Offline and online screenshots were manually inspected and show rendered battlefield/HUD states; no `errors-*.json` files were produced. |

## PR Hygiene

Before opening the I5 PR, `gh pr list --repo urkrass/tanchiki2 --state open` returned no open PRs.

Historical stacked PRs checked:

- PR #9 `codex/offline-pace-online-smoothing`: `CLOSED`, not merged, closed at `2026-07-01T16:33:40Z`.
- PR #10 `codex/online-camera-minimap`: `CLOSED`, not merged, closed at `2026-07-01T16:33:40Z`.
- PR #13 `codex/online-input-reliability`: `CLOSED`, not merged, closed at `2026-07-01T16:33:42Z`.
- PR #14 `codex/online-shooting-tempo`: `CLOSED`, not merged, closed at `2026-07-01T16:33:42Z`.
- PR #16 `codex/i4-review-debt-repair`: `MERGED` at `2026-07-01T16:33:24Z`.

## Authority

This document is proof, not authority. Git artifacts, the PR head, GitHub review state, required validation, and any explicit human gate remain authoritative.
