# Tanchiki2 Future Plan v2

Date: 2026-07-23

Exact planning baseline: `aaab4978f92bb45a9f881c66e658e04ad1a901c4`

Status: **CURRENT PLAN V2 AUTHORITY WHEN PRESENT ON `main`. NO F PACKAGE OR HOSTING EXECUTION IS AUTHORIZED BY THIS DOCUMENT.**

F0-F5 are now complete on `main`. H1-P0 is the current readiness package; H1 external execution remains separately protected.

## Purpose

This document is the durable starting point for the next Tanchiki2 phase after the P1-P10 continuation sequence.

It:

- closes the old sequence as historical project evidence;
- defines the bounded F0-F5 development order;
- excludes Human WAN acceptance from the F sequence;
- moves real Human WAN play into a later invite-only hosted pretest with friends;
- keeps public release, hosting, provider, billing, secrets, tags, announcements, and repository settings behind explicit authority.

`docs/planning/tanchiki2-project-continuation-plan-v1.md` remains historical. Do not rewrite its old snapshots into apparent current evidence.

## How to use this plan

Read this document before proposing or starting another substantial Tanchiki2 package.

At the start of every session, compare the snapshot above with live evidence:

```powershell
git fetch origin --prune
git rev-parse origin/main
git status --short --branch
gh pr list --repo urkrass/tanchiki2 --state open
gh issue list --repo urkrass/tanchiki2 --state open
gh run list --repo urkrass/tanchiki2 --limit 10
```

Treat differences as current-session context and record the verified live state in the package handoff. Do not rewrite this snapshot merely because `main`, pull requests, issues, or workflow runs moved; update this plan only when a material milestone changes its sequence, scope, or authority.

Use one isolated worktree, one bounded package, and one independently reviewable PR. Existing changes in the canonical checkout belong to the user and must remain untouched.

This plan organizes future work. It does not itself authorize implementation, merge, deployment, spending, provider setup, or public availability.

## Current verified baseline

At this snapshot:

- merged `origin/main` is `aaab4978f92bb45a9f881c66e658e04ad1a901c4`;
- P10 merged in PR #118;
- the post-merge P10 tree passed 62 test files and 576 tests, production build, server integration, and harness validation;
- no pull request was open when this plan package started;
- the offline campaign, definitive Signal Scar mission, private server-authoritative online MVP, rematch flow, tablet controls, telemetry lockout, release guards, and first maintainability/presentation passes are on `main`;
- production multiplayer is not hosted;
- the existing public GitHub Pages snapshot is older than current `main`;
- Human WAN evidence remains unclaimed and is deliberately moved to H1 rather than F development.

Known maintenance signals at this snapshot:

- ordinary physical battlefield sounds travel farther than the intended future hearing model;
- cell, world-pixel, and screen coordinates need a stronger explicit contract;
- transient gameplay/presentation events need stable monotonic identity;
- `src/game/game.ts` is approximately 11,556 lines;
- `src/game/render.ts` is approximately 6,873 lines;
- the production client bundle is approximately 753 kB and exceeds the current 500 kB warning threshold;
- the project declares Node.js 22, while some local validation has run under Node.js 24;
- `npm audit --omit=dev` reports 8 production-tree findings at this snapshot: 5 low and 3 moderate, primarily through the Colyseus auth/playground dependency chain.

These are planning inputs, not automatic proof that a particular repair or upgrade is safe.

## Stable product decisions

Do not reopen these decisions without an explicit product change:

1. Offline and online are two lifecycles of one game, not separate games. Shared mechanics belong in common contracts.
2. The online server remains authoritative for simulation, fog-safe information, room lifecycle, and results.
3. Arbitrary player chat stays off. Built-in radio commands and map pings remain the game communication surface.
4. The first online experience remains private, unlisted, disposable, and small.
5. Telemetry remains disabled by default. Sensitive capture remains separately opt-in and out of committed evidence.
6. Gameplay screens keep one dominant battlefield surface. New dashboard chrome, nested panels, and persistent event logs require a demonstrated need.
7. GitHub Pages may host the static client but cannot host the Colyseus server.
8. Public hosting, provider setup, secrets, billing, DNS, tags, announcements, and repository settings require exact explicit authority.

## Sequence overview

| Package | Objective | Terminal outcome |
|---|---|---|
| F0 | Close Plan v1 and establish this current Plan v2 | One merged, current planning authority |
| F1 | Add bounded spatial hearing without weakening relay/radar intelligence | Local physical hearing and separate signal information |
| F2 | Harden spatial-coordinate and transient-event contracts | Fewer camera, anchor, identity, and accessibility regressions |
| F3 | Continue measured runtime extraction and bundle work | Smaller change surfaces and evidence-based loading improvements |
| F4 | Align Node and dependency maintenance | Reproducible supported runtime and reviewed dependency posture |
| F5 | Add exactly one optional online expansion | One shared, server-authoritative feature with full parity evidence |
| H1 | Later invite-only hosted pretest | Real hosting and friend-based Human WAN evidence |

F0-F5 are the development plan. H1 is a later protected hosting and pretest package, not an F package.

## F0 - Plan v1 closeout and Plan v2 adoption

Status: **POST-MERGE STATE: COMPLETE.**

Before this file reaches `main`, F0 remains an unmerged planning candidate. Once it is read from `main`, do not treat F0 as active work; proceed to F1.

Objective: establish one current future-work authority without converting historical package records into a chronological log.

Work:

- add this separate Plan v2 document;
- mark Plan v1 as superseded and redirect the release-checklist planning pointer to Plan v2;
- preserve Plan v1 and package-specific evidence as historical;
- name the exact merged baseline and current validation state;
- record the F sequence and the H1 boundary;
- make F1 the next development candidate.

Done when:

- Plan v2 is merged from an exact current baseline;
- no implementation or hosting change is mixed into the planning PR;
- future sessions can identify the next package without treating P10 or Human WAN as active F work.

## F1 - Spatial hearing

Objective: make ordinary physical battlefield sounds local and tactically plausible while preserving relay/radar information as a separate intelligence channel.

Required design boundary:

- physical sound is produced by an event with a source, loudness class, and lifetime;
- audibility depends on bounded distance and, if evidence supports it, simple occlusion;
- relay, jammer, radio, ping, and radar-derived information is not treated as physical hearing;
- hidden-state filtering must not reveal an exact source that the player could not otherwise know;
- offline and online use the same event vocabulary and hearing rules where their information models overlap;
- the server remains authoritative for online information exposure.

Candidate work:

- define a pure hearing model for distance, loudness, and optional obstacle attenuation;
- classify current shots, explosions, tracks, bushes, traps, and environmental sounds;
- separate acoustic cues from signal/radar cues in state and presentation;
- preserve accessibility announcements without turning them into hidden-coordinate leaks;
- add focused deterministic tests before changing audio presentation.

Non-goals:

- no voice chat;
- no arbitrary text chat;
- no full acoustic simulation;
- no new radar mechanics;
- no unrelated sound-library replacement.

Done when:

- nearby physical events are audible and distant events are not globally heard;
- the same event produces deterministic audibility under the same conditions;
- relay/radar cues remain available through their own rules;
- desktop and tablet play remain readable;
- offline and online do not acquire parallel interpretations of the same mechanic.

Validation:

- pure hearing-model tests;
- fog and hidden-information regression tests;
- focused offline and online event tests;
- desktop/tablet browser evidence;
- full `npm.cmd run validate`;
- relevant visual and structured-state inspection.

Dependencies: F0.

## F2 - Spatial-coordinate and transient-event integrity

Objective: turn the P10 review findings into reusable architecture guardrails.

Required contracts:

- distinguish grid cells, arena-offset world pixels, camera-relative screen pixels, and rectangles explicitly;
- centralize conversions instead of repeating raw `ARENA_X`, `ARENA_Y`, and `TILE_SIZE` arithmetic at presentation call sites;
- use stable monotonic identity for transient events and notices;
- preserve event identity across filtering, layout, rendering, and accessibility announcement;
- clamp and clip presentation to the battlefield without changing authoritative world state.

Candidate work:

- introduce small typed helpers or branded structures only where they remove real ambiguity;
- migrate one bounded producer/consumer path at a time;
- add producer-level regression tests for relays, deployables, EMP, tanks, pickups, and camera movement;
- add layout assertions for arena containment, collision avoidance, and tablet viewports;
- retain `render_game_to_text()` as structured QA evidence.

Non-goals:

- no rendering-engine rewrite;
- no universal geometry framework;
- no gameplay-rule change;
- no second snapshot or coordinate system.

Done when:

- new feedback producers cannot silently mix cell, world, and screen coordinates;
- staggered event expiry cannot reuse active identity;
- representative camera-driven notices remain anchored, distinct, and accessible;
- migration remains incremental and reviewable.

Dependencies: F1 may proceed first because hearing has higher player impact. F2 must be complete before broad new presentation systems are added.

## F3 - Runtime extraction and measured bundle health

Objective: reduce change risk and loading cost without redesigning the game or disguising file movement as optimization.

Candidate work:

- profile the production bundle and name the actual largest modules;
- select one coherent responsibility from `TanchikiGame` or the offline renderer;
- move pure planning, transformation, or policy code behind direct characterization tests;
- evaluate dynamic loading for campaign, online, encyclopedia, or presentation assets;
- measure startup, route transitions, deterministic QA hooks, and browser failures before and after code splitting.

Rules:

- extraction must preserve authoritative ownership and existing behavior;
- shared mechanics must not fork into offline and online copies;
- do not create a framework merely to reduce line count;
- do not accept smaller source files as proof of a smaller shipped bundle;
- retain browser and structured-state QA.

Done when:

- one bounded runtime responsibility has a clearer owner and direct tests;
- any bundle change has measured before/after evidence;
- startup and deterministic browser tests remain green;
- the package can be reverted without touching unrelated gameplay.

Dependencies: F2 for coordinate-sensitive presentation extraction. Non-coordinate runtime work may be proposed separately if it stays bounded.

## F4 - Node and dependency maintenance

Objective: make the supported runtime and dependency posture deliberate and reproducible.

Candidate work:

- run local and CI project commands with the declared Node.js 22 line;
- identify why ordinary local validation can fall through to Node.js 24;
- inspect the current Colyseus 0.17 dependency graph and whether auth/playground packages are required in production;
- research supported upgrades or removals for the 8 current audit findings;
- update dependencies only with server lifecycle, reconnect, fog, room-key, browser, tablet, and soak evidence;
- record remaining accepted findings with scope and rationale.

Rules:

- do not run blind `npm audit fix --force`;
- do not accept the audit tool's suggested Colyseus downgrade without compatibility research;
- do not combine a protocol/library migration with new gameplay;
- no high-risk dependency change without a rollback path.

Done when:

- supported local and CI validation agree on Node.js 22;
- dependency changes are intentional and lockfile-reproducible;
- production-tree findings are fixed, removed with unused packages, or explicitly documented;
- full online and offline validation remains green.

Dependencies: may follow F3 or run earlier as a narrowly scoped security/correctness repair if evidence justifies priority.

## F5 - One bounded online expansion

Status: **COMPLETE. PORTABLE PLAYER RELAYS MERGED THROUGH PR #125 AT `122dbd8fb2cfdeafc0835533acbd0b68605f682f`.**

Objective: add exactly one optional online feature after the base game and development foundations are stable.

Choose one:

- Major Mods;
- portable player relays;
- persistent Garage loadouts beyond lobby class choice;
- one additional online map;
- one additional online mode.

Selection record:

- selected: portable player relays;
- deferred: Major Mods, persistent Garage loadouts, another online map, and another online mode;
- implementation boundary: the existing offline relay mechanic moves through one shared signal contract and authoritative online state rather than gaining a second ruleset;
- completion remains subject to focused/full/browser/tablet/reconnect/rematch/fog/cleanup evidence, exact-head review, and the human gameplay merge gate.

Selection criteria:

- player value;
- reuse of current shared mechanics;
- server-authoritative feasibility;
- fog and hidden-information safety;
- reconnection and rematch behavior;
- tablet usability;
- implementation and test surface;
- value during the later hosted pretest.

Rules:

- do not combine candidates;
- chat is not a candidate;
- do not create a second online-only interpretation of an offline mechanic;
- preserve private room keys, host permissions, Ready, rematch, and cleanup;
- defer another candidate until the first is played and evaluated.

Done when:

- one choice and its deferrals are recorded;
- one server-authoritative implementation passes focused, full, browser, tablet, reconnect, rematch, fog, and cleanup evidence;
- offline behavior remains unchanged unless the shared rule itself needed a reviewed correction.

Dependencies: F1-F4 should be reconciled first. Human WAN is not an F5 prerequisite; it occurs in H1.

## Human WAN disposition

Product decision, 2026-07-23:

- Human WAN acceptance is excluded from F0-F5;
- it is not considered complete;
- it will be performed naturally during the invite-only hosted pretest with friends;
- automated browser, soak, and fault evidence remains useful but does not substitute for those matches;
- no public-release claim may call Human WAN complete before H1 records actual results.

This decision avoids an artificial participant exercise before real hosting exists while preserving honest release evidence.

## H1 - Invite-only hosted pretest

Status: **H1-P0 READINESS ACTIVE. PROTECTED EXTERNAL EXECUTION NOT AUTHORIZED.**

Objective: host the actual game for a small known group, use that environment for pretesting, and collect real Human WAN evidence before any public-preview decision.

Intended shape:

```text
GitHub Pages static client
          |
       HTTPS/WSS
          |
one Render-hosted Node/Colyseus process
```

H1 must define an explicit invite-only pretest profile distinct from the existing public-preview release profile. It must update or extend release guards deliberately rather than bypassing them.

H1-P0 readiness is defined in [`docs/deployment/tanchiki2-h1-invite-only-hosted-pretest-readiness-v1.md`](../deployment/tanchiki2-h1-invite-only-hosted-pretest-readiness-v1.md). Its committed draft decision record is deliberately non-authorizing and must pass the local fail-closed validator. Completing or validating a record does not substitute for the separate human authority required for provider, billing, repository, Pages, or deployment mutations.

Pretest boundaries:

- friends and named testers by private invitation only;
- no public matchmaking;
- no public announcement;
- no release tag unless separately authorized;
- one server instance and one in-memory process;
- automatic deployment off;
- application telemetry off by default;
- no sensitive telemetry in repository evidence;
- immediate disable/rollback authority;
- active matches may be lost during restart or rollback;
- no availability or scale promise.

Human WAN activity inside H1:

- run approximately 10 to 20 representative 2v2 matches;
- include desktop and tablet devices;
- include home Wi-Fi, a mobile hotspot, and at least one genuinely remote network where practical;
- record anonymous participant labels and redacted aggregate results;
- preserve exact source revision, frontend/backend targets, failures, reproduction steps, reconnect outcomes, and room cleanup;
- repair observed defects rather than weakening thresholds.

Protected decisions required before H1 execution:

- exact merged source SHA;
- Render workspace and currently available plan;
- region;
- current spending ceiling and billing owner;
- repository/provider connection authority;
- public backend hostname;
- exact GitHub Pages target;
- frontend backend URL;
- frontend rollback artifact;
- backend disable or rollback action;
- monitored private abuse contact;
- provider-log administrators and retention;
- tag decision;
- announcement decision.

Done when:

- the invite-only hosted target passes health, revision, origin, TLS/WSS, create/join, gameplay, reconnect, results, cleanup, and rollback smoke;
- friend-based WAN results are recorded honestly;
- failed or incomplete evidence remains failed or incomplete;
- the operator can decide whether to continue development, repeat pretesting, or propose a separate public-preview package.

Dependencies: F0-F5 and a separate explicit hosting authorization.

## Public release remains separate

H1 is not a public release.

After H1, a public-preview proposal must still reconcile:

- current source and provider state;
- Human WAN results;
- current cost;
- rollback evidence;
- abuse and provider-log ownership;
- privacy notice;
- public target;
- tag and announcement decisions;
- exact release authority.

General instructions such as `proceed`, `host it`, `merge`, or `deploy` do not name those protected decisions.

## Review and merge discipline

Every implementation package should use validation proportional to its risk:

- focused tests for changed behavior;
- full `npm.cmd run validate`;
- production build;
- relevant server, browser, tablet, visual, or network smoke;
- structured state inspection rather than screenshot-only claims;
- Product Review Warden and exact-head review when required;
- `git diff --check`;
- redacted evidence for network or hosted failures.

Review automation contingency:

- send at most one canonical Codex review request for each unchanged SHA;
- preserve the request timestamp and exact head;
- if the integration remains silent after bounded polling, report it as an external review-gate failure rather than a clean review;
- do not substitute another automated reviewer as equivalent evidence;
- if the active package permits an explicit human waiver, record the waiver and the missing review honestly in closeout evidence;
- otherwise stop without merge.

## Hard stops

Stop and request direction when work requires:

- filling or choosing protected H1 provider, cost, target, ownership, or rollback values without explicit human direction;
- deployment, public hosting, secrets, billing, DNS, or provider/repository settings;
- accepting a known blocking privacy, security, correctness, or hidden-information defect;
- broad architecture work without one bounded responsibility;
- changing the stable product decisions above;
- treating unexecuted H1 activity as evidence.

Ordinary defects, failing tests, dependency installation, and review findings are repair work inside an otherwise authorized package.

## Package handoff template

Use this at the end of every F or H package:

```text
Date:
Verified origin/main:
Working branch and isolated worktree:
Plan package:
Scope completed:
Files changed:
Validation and evidence:
Open review findings:
Review automation status:
External gates still unclaimed:
Merge/deploy status:
Next recommended action:
Facts in this plan that are now stale:
```

Update this plan only when a milestone materially changes sequence, scope, or authority. Keep implementation chronology in package-specific documents and `progress.md`.

## Current package sequence

- F0 is complete.
- F1 spatial hearing was merged through PR #120 at main commit `a3906c0e573e689882d8808efef820e57c7aa5c6`.
- F2 spatial-coordinate and transient-event integrity was merged through PR #121 at main commit `07e26e28b63827b6b25bab334e5d8b117e985f22`.
- F3 runtime extraction and measured bundle health was merged through PR #122 at main commit `96e37815b12a606cb5dadc15a3eee2ed3d3c2adb`.
- F4 Node and dependency maintenance was merged through PR #123 at main commit `ac8540e9c1786c3779c2d042a02209715ec98e63`; its separate Reviewer App Node 22 bootstrap repair merged through PR #124 at `f03f6d406d0cdc64ee6a83b456af33e97a3aed1f`.
- F5 portable player relays was merged through PR #125 at main commit `122dbd8fb2cfdeafc0835533acbd0b68605f682f`.
- H1-P0 invite-only hosted-pretest readiness is the active bounded package. It may add documentation and non-mutating fail-closed guards only.

After H1-P0 is reviewed and merged, the next package is:

`H1 - Invite-only hosted-pretest execution`

Do not start H1 execution from this planning authority. It requires a complete current decision record and separate explicit authority for every external mutation.
