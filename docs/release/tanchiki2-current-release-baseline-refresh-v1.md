# Tanchiki2 Current Release Baseline Refresh v1

Date: 2026-07-22

Repository: `urkrass/tanchiki2`

Package: `TANCHIKI2-CURRENT-RELEASE-BASELINE-REFRESH-V1`

Terminal outcome: `TANCHIKI2_CURRENT_RELEASE_BASELINE_REFRESH_READY_FOR_REVIEW`

Decision state: `CURRENT_BASELINE_VALIDATED_RELEASE_PROFILE_SELECTION_REQUIRED`

## Scope

This package replaces stale release-candidate assumptions with a current evidence baseline for exact `origin/main` `caf59ad578e03fad12f5c637e2a1318c5cdbb0a6`.

It records what is implemented, what has deterministic evidence, what remains external, what is currently public, and which release-profile decision must be made before another deployment.

This is documentation and evidence only. It does not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, remove rollback, mutate an external provider, or perform a release action.

## Exact source and GitHub state

- Fetched `origin/main`: `caf59ad578e03fad12f5c637e2a1318c5cdbb0a6`.
- Current merge: PR #108, `TANCHIKI2-ONLINE-CLASS-PARITY-V1: unify offline and online tank classes`.
- Current GitHub Validate: run `29923937307`, `success`, exact head `caf59ad578e03fad12f5c637e2a1318c5cdbb0a6`.
- Open issues: none.
- Open pull requests: PR #79, `Add Echo Quarry battle map`, head `e8e04405552b803ad42b25c91e4e88968682dbf1` based on old main `f92904a864a3a2b08766fc38c6573da0713f6caa`.
- PR #79 merge state: `DIRTY` / `CONFLICTING`. It is not part of this baseline and must not be merged as-is.
- Isolated package branch: `codex/tanchiki2-project-continuation-p1`.
- Isolated package worktree: `D:\projects\tanchiki-project-continuation-p1`.
- The stale dirty canonical checkout and its unrelated planning edit remain untouched.

## Attended-v2 lifecycle

The package uses the existing attended-v2 path and does not create a new runner.

- Prompt packet: `D:\agentic-harness\tmp\tanchiki2-current-release-baseline-refresh-prompt.json`.
- Canonical prompt validation: `passed`, blockers `0`.
- Guard request: `D:\agentic-harness\tmp\tanchiki2-current-release-baseline-refresh-attended-v2-guard-request.json`.
- Operating-mode guard: `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`, finding codes `[]`.
- Product consumer wrapper: `npm.cmd run harness:attended-v2:lifecycle-trace-smoke` passed its pinned local contract check.
- Product harness pin: `urkrass/agentic-harness@69df33aafbe6f2738b87419d449fd3ee4f84f018`.
- The optional live telemetry branch `refs/heads/codex/mar-693-empty-base` currently resolves to `37b22404a3dd2a2a78f5f6fe747cbfb89d6fb889`, not the pinned SHA. No live LangSmith workflow was dispatched.
- An optional Harness-v2 B0 shadow in isolated temp output reached a projection-bundle control-plane defect after the canonical prompt passed. It did not mutate the product repository and is not used as execution authority.
- LangSmith, the local Deep Agent stub, memory, screenshots, and natural-language summaries remain advisory evidence only. Git artifacts and deterministic gates remain authoritative.

## Current product baseline

The project is a feature-rich prototype and vertical slice, not a finished production release.

### Offline product

Current main includes:

- an eight-mission offline campaign;
- Boot Camp;
- Scout, Engineer, and Battle Tank classes;
- native class equipment and Battle Tank active kit;
- Garage Major Mods;
- field salvage;
- tablet controls and orientation handling;
- the current Encyclopedia;
- fullscreen-safe Back behavior;
- the accumulated battlefield, HUD, tutorial, readability, and visual-polish passes.

### Private online MVP

Current main includes:

- private, unlisted Colyseus rooms with six-character join keys;
- one server-authoritative Relay Yard round for 1v1 or 2v2;
- host Start, teams, Ready state, countdown, results, reconnection, and cleanup;
- personalized fog-safe snapshots, 20 Hz simulation/snapshots, and interpolation;
- keyboard and tablet entry, lobby, class selection, gear, radio, ping, and live controls;
- no arbitrary chat;
- default-off bounded session telemetry;
- one shared offline/online class-mechanics contract for movement, firing, ammunition, Mine, Trap, Wire, Decoy, Bulwark, Traverse, and Battle HE.

Major Mods, portable player relays, persistent Garage loadouts, additional maps, public matchmaking, accounts, ranking, spectators, parties, and rematches are outside the accepted online MVP. Chat remains intentionally excluded and is not backlog.

## Current deterministic validation

Validation was run from the isolated exact-main worktree before and after the documentation refresh.

| Command or evidence | Result | Current evidence |
| --- | --- | --- |
| `npm.cmd ci` | PASS | 213 packages installed from the lockfile. |
| `npm.cmd run validate` | PASS | 56 test files / 518 tests; production build; real SDK server integration; harness validate/smoke; Reviewer App dry-run contract; attended-v2 lifecycle wrapper contract. |
| Production bundle | PASS WITH WARNING | Main JS is 729.36 kB minified / 209.51 kB gzip; Vite reports the existing chunk-size warning. |
| Server smoke | PASS | Private key resolution, deterministic simulation clock, stable reconnect, and telemetry JSONL behavior pass. |
| `npm.cmd run visual:contrast` | PASS | `contrast ok`. |
| Product Review Warden | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; `open_blocking_count: 0`; finding codes `[]`. |
| Deep Agent stub | PASS AS ADVISORY EVIDENCE | `DEEP_AGENT_STUB_COMPLETE_ALLOWED`; it is not execution authority. |
| Production dependency audit | ACCEPTED RESIDUAL | 5 low, 3 moderate, 0 high, 0 critical. The incompatible automated downgrade was not applied. |
| Seeded online soak | PASS | 100 seeded 2v2 rooms, zero divergent results, stuck rooms, or cleanup failures. |
| Browser/device evidence | PASS FOR PRIVATE MVP | Four-context Chromium lifecycle and two-tablet play pass; latest sustained tablet trace reports zero rewinds and zero browser errors. |

Because this package changes no product runtime, it does not generate replacement gameplay screenshots. Current implementation evidence remains in `progress.md` and the online closeout document.

## Honest unclaimed gates

These remain unclaimed and must not be converted into a release claim by wording:

1. Docker/Toxiproxy fault-profile execution. Source and profile contracts exist, but proxy-backed runtime evidence has not been produced in this environment.
2. Ten to twenty human 2v2 WAN matches using physical devices and independent networks.
3. A production multiplayer backend, domain, TLS termination, `wss`, allowed-origin configuration, monitoring, restart policy, log operations, and rollback.
4. Production telemetry decisions covering notice, retention, access control, deletion/export, incident handling, and legal hold.
5. A current public deployment and post-deployment browser/network smoke from exact `caf59ad578e03fad12f5c637e2a1318c5cdbb0a6`.

## Current public Pages state

- Public URL: `https://urkrass.github.io/tanchiki2/`.
- GitHub Pages is public, workflow-built, and HTTPS-enforced.
- The live HTML returned HTTP 200 during this refresh.
- Latest successful Pages workflow: run `29852987783`.
- Deployed source head: `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`, merged PR #100.
- Current main is eight merge commits ahead through PRs #101-#108.
- The Pages workflow remains manual `workflow_dispatch` only.

The current public site is therefore not evidence for the current main release candidate.

## Release-profile decision

Current unconfigured production builds expose `Online Battle` but use `http://127.0.0.1:8787` when `VITE_MULTIPLAYER_URL` is absent. GitHub Pages cannot host Colyseus. Redeploying current main without a profile decision would publish an Online Battle entry that cannot reach a public backend.

Choose one profile in a later explicit package.

### Profile A - Static offline demo

Required before deployment:

- add an explicit production build or product flag that hides or clearly disables Online Battle when no hosted endpoint is supplied;
- validate Campaign, Boot Camp, Garage, Encyclopedia, tablet behavior, assets, and the disabled-online presentation under the Pages base path;
- name exact source and rollback heads;
- authorize one Pages deployment and live smoke.

This is the shortest path to a current public demo.

### Profile B - Online-enabled public preview

Required before deployment:

- close the WAN/Toxiproxy acceptance gates;
- select and prepare the production Colyseus hosting target;
- configure TLS, `wss`, `ALLOWED_ORIGIN`, health monitoring, restart policy, bounded logs, and rollback;
- settle the minimum telemetry/privacy/abuse policy;
- build Pages with the exact approved `VITE_MULTIPLAYER_URL`;
- validate public room create/join/play/results/cleanup across real networks.

This is the intended path when public online play is the release goal.

### Current decision

Decision state remains `RELEASE_PROFILE_SELECTION_REQUIRED`.

Recommendation: keep the existing Pages deployment unchanged until Profile A or Profile B is explicitly selected. Do not infer Profile A merely because Pages already exists, and do not infer Profile B merely because the private online MVP works over Tailscale.

## Rollback posture

### Frontend

- Current known live source: `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`.
- Before any new Pages deployment, confirm the current successful artifact remains recoverable or create an equivalent exact rollback reference.
- If live HTML, assets, Canvas, controls, or networking smoke fails, restore the previous known-good Pages artifact/head and stop before tag or announcement.
- Do not delete the previous artifact or remove rollback as part of deployment.

### Multiplayer backend

No production backend exists, so no production backend rollback target exists. A future hosting plan must name both the initial deployment target and its rollback/disable procedure before execution.

## Open work and package boundaries

- PR #79 Echo Quarry is a separate product decision. Reimplement it on current main or close it; do not mix it into release-baseline documentation.
- WAN and Toxiproxy evidence is a separate acceptance package.
- Production backend planning is a separate protected-surface planning package.
- Telemetry/privacy operations is a separate policy package.
- Any static-profile online-disable flag is a small product package with normal gameplay/UI validation and exact-head review.
- Deployment, tag, and announcement remain separate release-execution decisions.

## Pre-release checks for either profile

- [ ] Fetch and record the exact authorized `origin/main`.
- [ ] Confirm the release-profile selection is explicit.
- [ ] Confirm the final diff and dependency lockfile are reviewed.
- [ ] Run `npm.cmd ci` and `npm.cmd run validate` from a clean exact-head checkout.
- [ ] Run relevant visual, desktop, tablet, server, network, and Product Review Warden gates.
- [ ] Confirm GitHub Validate and exact-head Reviewer App approval match the final PR head.
- [ ] Name deployment target, method, rollback target, tag decision, and announcement decision.
- [ ] Confirm protected-surface exceptions are explicitly authorized or remain forbidden.
- [ ] Confirm no room keys, reconnection tokens, credentials, raw sensitive telemetry, or IP addresses appear in evidence.

## Post-release checks

- [ ] Verify live HTML and every referenced asset returns HTTP 200.
- [ ] Inspect the live Canvas and browser console on desktop and tablet.
- [ ] Verify Campaign, Boot Camp, Garage, Encyclopedia, Back, fullscreen, and touch controls.
- [ ] For Profile A, verify Online Battle is absent or clearly unavailable without a broken localhost connection attempt.
- [ ] For Profile B, verify `wss`, room create/copy/join, Ready/Start, one full round, shared result, leave/reconnect, room disposal, and key rejection after cleanup.
- [ ] Confirm rollback remains available.
- [ ] Create a tag or announcement only if separately authorized and only after live checks pass.

## Required future authorization wording

Any release execution authorization must replace every bracket:

```text
I authorize Tanchiki2 release execution from source head [exact git SHA] using release profile [STATIC_OFFLINE_DEMO or ONLINE_ENABLED_PUBLIC_PREVIEW]. Deploy [exact frontend target and method] and, if applicable, [exact backend target and method]. Build with [exact public multiplayer endpoint or ONLINE_DISABLED]. The rollback target is [exact frontend rollback and, if applicable, backend rollback]. The tag decision is [exact tag or NO TAG]. The announcement decision is [channel/owner or NO ANNOUNCEMENT]. I do not authorize production setting changes, secret changes, billing changes, branch protection changes, rollback removal, or other protected-surface changes unless explicitly listed here.
```

General approval, approval for planning, or authorization missing source/profile/target/method/rollback/tag/announcement fields is insufficient.

## Next package

The project continuation plan recommends resolving PR #79 next, followed by WAN/fault acceptance. If the operator prioritizes release over content, the next decision package should instead select `STATIC_OFFLINE_DEMO` or `ONLINE_ENABLED_PUBLIC_PREVIEW`.

## Explicit no-release-action statement

This package did not deploy, publish, tag, announce, change production settings, change secrets, change billing, change branch protection, change rollback state, remove rollback, mutate an external provider, or perform any release action.
