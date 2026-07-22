# Tanchiki2 Project Continuation Plan v1

Status snapshot: 2026-07-22

Current verified `origin/main`: `730df3e05a77724e377ad8e5e958b6834af15714`

Purpose: give future work sessions one durable starting point for deciding what remains, what is already complete, and which actions still require explicit authorization.

## How to use this document

Read this file before proposing or starting another Tanchiki2 package.

This is a planning and continuity artifact. It does not authorize a merge, deployment, release, repository-setting change, production infrastructure, secret, billing change, or deletion of existing work.

The status snapshot will age. At the start of every session, verify current Git state and replace assumptions with current evidence:

```powershell
git fetch origin --prune
git rev-parse origin/main
git status --short --branch
gh pr list --repo urkrass/tanchiki2 --state open
gh issue list --repo urkrass/tanchiki2 --state open
gh run list --repo urkrass/tanchiki2 --limit 10
```

If `origin/main` has moved, treat the SHA above as historical and record the new baseline in the session handoff. Do not silently rewrite completed evidence or infer release authority from this plan.

## Project state at this snapshot

Tanchiki2 is a feature-rich prototype and vertical slice, not a finished production release.

The core offline game is playable. It includes the campaign, tank classes and class equipment, Garage and Major Mods, Boot Camp, tablet controls, field salvage, the Encyclopedia, and the recent gameplay and visual polish rounds.

The private online MVP is also implemented and merged. It provides:

- a private, unlisted Colyseus room joined by a six-character key;
- server-authoritative 1v1 and 2v2 Relay Yard play;
- explicit host Start, teams, Ready state, countdown, results, reconnection, and cleanup;
- personalized fog-safe snapshots and client interpolation;
- keyboard and tablet controls;
- shared offline/online tank-class mechanics for movement, firing, ammunition, Mine, Trap, Wire, Decoy, Bulwark, Traverse, and Battle HE;
- bounded diagnostic telemetry that is disabled by default;
- synthetic match, four-browser, and two-tablet validation.

Current merged deterministic evidence includes 56 test files and 524 passing tests, a production build, four-browser lifecycle proof, two-tablet proof, and 100 seeded rooms with no divergence, stuck room, or cleanup failure. The active P3 candidate adds three interpolation regressions and passes 56 files / 527 tests, six consecutive tablet runs, the four-browser lifecycle, and a fresh 100-match clean soak.

## Decisions that should remain stable

Do not reopen these decisions without an explicit product change:

1. Arbitrary player chat stays off. Players may use built-in radio commands and map pings. Longer conversation belongs on third-party services.
2. The server owns online simulation. A host has lobby permissions but never owns or runs authoritative gameplay.
3. Offline and online must not become separate games. Shared mechanics belong in common contracts; mode-specific lifecycle, fog filtering, capture, respawn, and networking may remain mode-specific.
4. The first online experience remains private and disposable. Public matchmaking, accounts, ranking, persistent parties, spectators, and reinforcement players are not implicit requirements.
5. Telemetry remains disabled by default. Sensitive fields such as room keys, callsigns, internal identifiers, and connection IPs require a separate opt-in switch and must not appear in committed evidence.
6. GitHub Pages can host the static client but cannot host the Colyseus server.
7. Production deployment, public hosting, secrets, billing, tags, announcements, and repository settings require explicit authorization naming the exact source head and target.

## Current open work

At this snapshot there are no open GitHub issues or pull requests. P1 completed in PR #109. P2 replaced the stale Echo Quarry PR #79 with the current-main implementation merged in PR #110; PR #79 is closed and must remain historical only.

The public GitHub Pages deployment is older than current `main`. Its latest successful snapshot is `740e8a6cd0ec40d60b96d2a914f9829fd9154e65`, before PRs #101 through #108.

The production multiplayer backend is not deployed. The working online deployment is a private/local preview, not a public service.

## Prioritized work packages

### P1 - Current release baseline refresh

Status: **COMPLETE in PR #109.** The committed release baseline names its exact head and keeps deployment decisions unexecuted.

Objective: replace stale release-readiness evidence with one package based on the current `origin/main`.

Work:

- record the exact baseline SHA and green validation run;
- reconcile README, release checklist, online evidence, and release notes with the merged implementation;
- identify which older RC1 and post-PR50 documents are historical only;
- decide whether the intended candidate is offline/static-only or online-enabled;
- define exact frontend, backend, rollback, tag, and announcement decision points without executing them.

Done when:

- one current release-readiness document names the exact head and accurately lists passed, pending, and external gates;
- no old release package is being treated as current authority;
- the next authorized action is unambiguous.

Dependencies: none.

### P2 - Echo Quarry disposition

Status: **COMPLETE in PR #110.** Echo Quarry was reimplemented on current mechanics as Level 9, reviewed at its exact head, and merged; stale PR #79 is no longer active work.

Objective: remove ambiguity around PR #79.

Choose exactly one path:

- reimplement or rebase the map as a fresh, focused package on current `main`; or
- close the PR and record that Echo Quarry is deferred or abandoned.

If retained, revalidate its map mechanics, readability, current class equipment, tablet controls, shared placement behavior, tests, and browser evidence. Do not resolve conflicts by preserving obsolete parallel mechanics.

Done when: there is no old conflicting feature PR whose status can be mistaken for active release work.

Dependencies: product decision to retain or defer the map.

### P3 - Online WAN and fault acceptance

Status: **IN PROGRESS.** Clean quick/realtime/100-match soak, four-browser lifecycle, and repaired tablet interpolation pass on the P3 candidate. Docker/Toxiproxy execution is blocked by the disabled administrator-controlled WSL service, and human WAN matches remain pending real participants. See `docs/network/tanchiki2-p3-wan-fault-acceptance-v1.md`.

Objective: close the two external evidence gaps without changing gameplay scope.

Work:

- run the documented Docker/Toxiproxy clean, latency, jitter, stall, reset, reconnection, and overlong-outage profiles where Docker is available;
- conduct 10 to 20 representative 2v2 matches using physical devices, home Wi-Fi, mobile hotspot, and at least one remote network where practical;
- preserve redacted results, exact commit, seeds, failures, and reproduction steps;
- repair observed synchronization, cleanup, reconnection, or tablet defects rather than weakening thresholds.

Done when:

- the fault profiles complete with the documented authoritative-result and cleanup expectations;
- the human WAN checklist has real participant evidence;
- no divergent result, fog leak, duplicate tank, stale-socket mutation, stuck room, or cleanup failure remains unexplained.

Dependencies: Docker for proxy-backed evidence and actual participants/networks for WAN evidence.

### P4 - Production multiplayer hosting plan and readiness

Objective: turn the local Colyseus service into a deployable, supportable production component.

Planning work:

- select the backend hosting target and deployment method;
- define domain, TLS termination, `wss`, `ALLOWED_ORIGIN`, environment configuration, health checks, restart policy, logs, resource limits, monitoring, rollback, and ownership;
- decide whether the static client remains on GitHub Pages;
- document production smoke and cleanup checks;
- estimate recurring cost before provisioning paid resources.

Execution is a separate authorized package because it may change infrastructure, secrets, billing, DNS, and public availability.

Done when: an exact-head deployment package can be executed without inventing infrastructure or operational decisions during deployment.

Dependencies: P1 and a human hosting decision. P3 should pass before a public online release.

Candidate planning update, 2026-07-23: the current P4 branch selects one paid Render Starter web service in Frankfurt, keeps the static client on GitHub Pages, fixes the backend at one process/instance, disables automatic deploys and production telemetry, and records exact health, smoke, rollback, ownership, and cost gates in `docs/deployment/tanchiki2-production-multiplayer-hosting-readiness-v1.md`. The repository Blueprint is non-activating. Human WAN, P5, provider setup, billing, public hosting, DNS, and release execution remain unclaimed protected actions.

### P5 - Telemetry, privacy, and abuse operations

Objective: define the minimum responsible policy for any public preview.

Work:

- decide whether production telemetry is enabled at all;
- keep default events pseudonymous and bounded;
- define notice, retention, access control, rotation, deletion/export, incident handling, and legal-hold behavior;
- define callsign validation and a minimal abuse-report/response path;
- confirm that arbitrary chat remains absent;
- keep sensitive logging independently opt-in and out of ordinary screenshots, traces, PRs, and repositories.

Done when: production operators and players can understand what is collected, why, for how long, and who can access it.

Dependencies: required before public telemetry; detailed legal review may be scheduled closer to production.

### P6 - Public release execution

Objective: publish only an explicitly approved exact head.

Possible work, depending on the P1 decision:

- deploy the current static client to GitHub Pages;
- deploy and configure the production Colyseus backend if online play is included;
- verify live HTML, assets, browser console, Canvas gameplay, room creation/join, TLS/WebSocket behavior, cleanup, and rollback;
- create the approved tag, release notes, and announcement if separately authorized.

Done when: the approved public target passes live browser and network smoke, not merely a successful build workflow.

Dependencies: P1; P3-P5 for an online-enabled public release; explicit release authority.

### P7 - Definitive vertical-slice mission

Objective: turn the existing mechanics into one cohesive showcase rather than accumulating isolated features.

The mission should deliberately combine:

- fog and incomplete information;
- limited ammunition and salvage;
- signal infrastructure, jamming, EMP, and AI perception;
- soft cover, tracks, decoys, and environmental evidence;
- class cooperation and objective pressure;
- a pacing arc where uncertainty produces coordination rather than paralysis.

Terrain and prop systems that currently live mainly in test/dev maps should enter campaign content only when they improve this mission's clarity and rhythm.

Done when: the mission is understandable, replayable, readable on tablet and desktop, and demonstrates the project's central tactical identity without a tutorial overlay or debug explanation carrying the experience.

Dependencies: none for offline work. Keep it separate from production hosting.

### P8 - Optional online scope expansion

Objective: decide deliberately which offline systems, if any, belong in online play after the MVP is accepted.

Candidates:

- Major Mods;
- portable player relays;
- persistent Garage loadouts;
- additional maps or modes;
- rematch flow.

These are optional product packages, not current MVP defects. Chat is not a candidate. Every accepted mechanic must reuse shared rules where applicable and retain server authority, fog safety, reconnection correctness, and tablet support.

Dependencies: P3 and evidence that the base online round is stable.

### P9 - Runtime maintainability

Objective: reduce change risk without redesigning the game.

Work:

- gradually extract coherent runtime systems from the growing `TanchikiGame` and offline renderer;
- keep shared mechanics pure and directly tested;
- reduce duplicate offline/online constants and behavior;
- introduce code splitting where it materially reduces the current large bundle;
- preserve deterministic QA hooks and `render_game_to_text()`.

Done when: feature work can modify one bounded subsystem without touching a large orchestration surface or creating parallel rules.

Dependencies: perform incrementally; do not block urgent correctness repairs on a broad refactor.

### P10 - Cosmetic, accessibility, and documentation polish

Objective: finish presentation after gameplay and release risks are controlled.

Work may include restrained sprite, sound, HUD, briefing, results, minimap, contrast, touch-target, copy, and documentation improvements. Preserve one dominant gameplay surface and avoid dashboard-like or nested-panel UI.

Done when: desktop and tablet presentation is consistent, readable, and calm, with current screenshots and no stale player-facing instructions.

Dependencies: can proceed in small packages, but should not displace P1-P5 when the goal is a public online release.

## Recommended order

If the next goal is a public playable demo:

1. P1 - Current release baseline refresh.
2. P2 - Resolve the stale Echo Quarry PR.
3. P3 - WAN and fault acceptance.
4. P4 - Production hosting plan.
5. P5 - Telemetry and operational policy.
6. P6 - Explicitly authorized release execution.

If the next goal is a stronger game before release:

1. P2 - Resolve Echo Quarry.
2. P7 - Build the definitive vertical-slice mission.
3. P9 - Extract only the systems stressed by that mission.
4. P10 - Finish presentation.
5. Return to P1-P6 for release.

Default recommendation: finish P3's real Toxiproxy and human WAN gates, then obtain exact-head review for the bounded tablet interpolation repair. Do not advance to production hosting on the strength of clean synthetic evidence alone.

## Validation expectations

Every implementation package should remain independently reviewable and should run validation proportional to its risk. The normal evidence stack is:

- focused unit and integration tests for changed behavior;
- `npm.cmd run validate`;
- production build;
- relevant server, browser, tablet, visual, or network smoke;
- structured state inspection rather than pixel-only claims;
- Review Warden and exact-head review when required by the active package;
- `git diff --check`;
- preserved seeds and redacted reproduction evidence for network failures.

Do not claim Docker/Toxiproxy, human WAN, public deployment, or production policy gates without actual evidence.

## Hard gates and stop conditions

Stop and request human direction when work requires:

- deployment or public hosting;
- secrets, billing, DNS, production settings, or repository-setting changes;
- a choice between materially different release targets;
- actual external WAN participants;
- a decision to retain or close Echo Quarry when it cannot be inferred safely;
- an irreconcilable overlapping branch or unrelated failing baseline;
- acceptance of a known blocking security, privacy, or correctness defect.

Ordinary test failures, dependency problems, implementation defects, and review findings are repair work, not reasons to abandon an otherwise authorized package.

## Stale-document warning

The existing RC1/post-PR50 release documents and `tanchiki2-polish-plan-v1.md` describe earlier project stages. Keep them as historical evidence, but do not use them as a current completion list or release authorization without reconciling them against `origin/main`.

## Session handoff template

Append or provide this information at the end of every substantial future package:

```text
Date:
Verified origin/main:
Working branch and worktree:
Package from this plan:
Scope completed:
Files changed:
Validation and evidence:
Open review findings:
External gates still unclaimed:
Merge/deploy status:
Next recommended action:
Facts in this plan that are now stale:
```

Update this plan only when a milestone materially changes the remaining roadmap. Preserve historical evidence in package-specific documents and `progress.md` rather than turning this file into a chronological activity log.
