# Tanchiki2 H1-P0 Invite-Only Hosted Pretest Readiness v1

Status: **READINESS PACKAGE IMPLEMENTED; HOSTING EXECUTION NOT AUTHORIZED**

Prepared: 2026-07-24

Exact readiness baseline: `122dbd8fb2cfdeafc0835533acbd0b68605f682f`

Working branch: `codex/tanchiki2-h1-p0-hosting-readiness-v1`

This package makes the later H1 hosted pretest unambiguous and fail-closed. It does not provision Render, connect GitHub to a provider, approve spending, create a hostname, mutate provider or repository settings, deploy the backend, publish GitHub Pages, create a tag, announce the game, or claim Human WAN evidence.

Git artifacts and deterministic checks remain authoritative. This document, the draft decision record, historical release documents, natural-language approval, local tests, and attended-v2 telemetry are not external-execution authority.

## Terminal objective

H1 is a small, invitation-only field test with friends, not a public release:

```text
named testers using a privately shared Pages URL
                         |
                      HTTPS/WSS
                         |
        one manually deployed Node/Colyseus process
```

The hosted environment exists to run 10-20 representative human 2v2 matches and expose real WAN, device, reconnection, usability, and cleanup defects. It makes no availability, durability, capacity, privacy-compliance, or public-release claim.

H1-P0 is complete when the repository can answer, before any external mutation:

1. which exact decisions and owners are still required;
2. which local and hosted checks must pass;
3. what may be collected and what must never be collected;
4. how the operator disables or rolls back both halves;
5. why a generic "proceed" or "deploy" cannot open the hosted lane.

## Reconciled foundation

At the H1-P0 baseline:

- F0-F5 are merged; F5 portable player relays reached `main` through PR #125 at `122dbd8fb2cfdeafc0835533acbd0b68605f682f`;
- the exact-main Node 22 baseline passes 73 test files and 640 tests, production build, server integration, and configured harness checks;
- the backend already fails closed in production unless `NODE_ENV=production`, a valid provider `PORT`, and one exact HTTPS `ALLOWED_ORIGIN` are present;
- `/health` exposes only service identity, exact revision, aggregate private-room count, and health state;
- `render.yaml` describes one manual, in-memory Render service with automatic deployment off;
- production application telemetry is locked off when `ONLINE_TELEMETRY_LOG_PATH` is absent and fails startup if telemetry is enabled;
- arbitrary chat is absent; players have only fixed radio commands and bounded team pings;
- automated clean, browser, tablet, soak, reconnect, and Toxiproxy evidence exists, but Human WAN remains `0 / 10 minimum`;
- the current Pages production-root guard verifies exact source, Render origin, backend revision, zero active rooms, frontend rollback artifact, and backend disable/rollback action.

These facts establish readiness inputs, not hosted evidence.

## H1 profile

The exact profile name is:

`INVITE_ONLY_HOSTED_PRETEST`

Its fixed boundaries are:

- friends and named testers only, invited through a human-owned private channel;
- private, unlisted, disposable room keys; no room directory or matchmaking;
- one backend process and one instance; no horizontal scaling, Redis, database, or persistent accounts;
- manual deployment only;
- application session telemetry off;
- sensitive telemetry off;
- no arbitrary chat or voice;
- no tag;
- no public announcement;
- provider lifecycle logs limited to provider defaults reviewed before execution;
- active rooms may be lost on deploy, restart, disable, or rollback;
- no uptime, support-time, capacity, or data-recovery promise;
- a separately named operator can stop invitations and disable or roll back the service.

The public URL is access location, not audience expansion. A URL does not make the rooms discoverable, but it also is not an authentication boundary. Invitees must not forward it or room keys.

## Fail-closed decision record

The committed template is:

[`tanchiki2-h1-invite-only-hosted-pretest-decision-record.template.json`](./tanchiki2-h1-invite-only-hosted-pretest-decision-record.template.json)

It deliberately contains null protected decisions, `status: DRAFT`, and `authorization.status: NOT_AUTHORIZED`. The template check is:

```powershell
npm.cmd run h1:pretest:template:check
```

For a future execution package:

1. copy the template to an ignored or human-controlled working location;
2. fill every protected field from current live evidence and explicit human decisions;
3. change both statuses to `AUTHORIZED`;
4. validate it with:

```powershell
node scripts/validate-h1-pretest-decision-record.mjs <path-to-decision-record.json>
```

The guard rejects draft records, extra fields, multiple instances, automatic deployment, telemetry, tags, public announcements, non-Render origins, endpoint drift, self-rollback, missing operational ownership, incomplete authorization, and Pages preview targets that do not yet have a guarded multiplayer build.

The validator is an interlock, not proof that the named person approved the values or that the provider state is current. The future execution package must retain the human authorization in an appropriate private/operator-owned surface and verify every live value again.

Never put provider credentials, room keys, reconnection tokens, IP addresses, private contact details, or participant identities in the committed template, CI output, PR text, screenshots, or public evidence.

## Decisions that remain blocking

| Decision | Current H1-P0 state | Required future evidence |
| --- | --- | --- |
| Exact source | Unset | One merged 40-character `main` SHA with green exact-head validation |
| Provider workspace | Unset | Human-owned Render workspace |
| Current plan and region | Unset | Current provider terms, selected plan, one region, one instance |
| Spending | Unset | Amount, currency, monthly ceiling, and billing owner |
| Repository connection | Not authorized | Explicit permission to connect `urkrass/tanchiki2` |
| Backend origin | Does not exist | Exact canonical HTTPS `*.onrender.com` origin |
| Pages target | Unset | Current guard accepts only `https://urkrass.github.io/tanchiki2/`; a preview target first needs the reviewed workflow extension below |
| Client backend origin | Unset | Must exactly equal the backend origin |
| Frontend rollback | Unset | Different source, successful production-root run, and unexpired Pages artifact |
| Backend recovery | Unset | `DISABLE_INITIAL_SERVICE` or exact prior source rollback |
| Invitation owner | Unset | Human owner of the private invite list/channel |
| Abuse contact | Unset | Monitored private contact named in every invitation |
| Provider logs | Uninspected | Actual administrators and retention setting |
| Human authorization | Absent | Named operator, UTC timestamp, and complete decision record |

Provider plan names, prices, regions, retention, and availability can change. H1-P0 does not freeze the historical P4 recommendation as a current commercial decision.

## Runtime configuration contract

| Surface | Required H1 value | Owner |
| --- | --- | --- |
| Node | repository-supported Node 22 | repository and provider configuration |
| `NODE_ENV` | `production` | provider service |
| `PORT` | provider-assigned valid port | provider |
| `ALLOWED_ORIGIN` | `https://urkrass.github.io` | provider service |
| `RENDER_GIT_COMMIT` | provider-supplied exact deployed SHA | provider |
| `ONLINE_TELEMETRY_LOG_PATH` | absent | provider service |
| `ONLINE_TELEMETRY_INCLUDE_SENSITIVE` | `false` | provider service |
| `VITE_MULTIPLAYER_URL` | exact approved HTTPS backend origin | Pages build |
| instances | exactly `1` | provider service |
| automatic deployment | off | provider service |

No game-process credential is required. Provider-account and GitHub-installation credentials stay in the provider/GitHub authorization surfaces and never enter repository files or model-facing output.

## Known Pages guard gap

The current workflow has two modes:

- a blank preview slug deploys the production root and uses the exact online release guard;
- a non-empty preview slug preserves the production root and adds a static preview, but does not currently export `VITE_MULTIPLAYER_URL`.

Therefore a future H1 execution package has one currently valid choice and one blocked alternative:

1. select the production root and use its existing exact-source, backend-health, drain, and rollback guards; or
2. propose a preview path only after a separate reviewed guard extension injects and revalidates the exact multiplayer origin for that path, then deliberately extend the H1 decision validator.

The current validator rejects option 2. Do not manually bypass the workflow, build a preview with an ad hoc environment, or present the current offline-only preview mode as hosted multiplayer.

## Separately authorized execution sequence

Only after the decision record is complete and human-authorized:

1. Re-fetch `main`; verify the record's source is exact current merged source and all required checks are green.
2. Re-check current Render plan, region availability, price, workspace, administrators, retention, and spending controls.
3. Connect the repository and create exactly one manual-deploy service from the approved source.
4. Confirm the environment contract, automatic deploy off, one instance, `/health`, and the exact revision before inviting traffic.
5. Confirm HTTPS and `wss`, reject foreign browser origins, and verify no telemetry file or sensitive capture is enabled.
6. Prepare the selected Pages target through the guarded workflow path. Do not publish a preview target until the known online-preview gap is repaired.
7. Verify the client contains the exact hosted multiplayer origin and no localhost multiplayer default.
8. Run the hosted smoke below before sending invitations.
9. Send the private notice, test instructions, monitored contact, limitation statement, and stop/rollback notice to named testers only.
10. Run the Human WAN matrix and record redacted evidence.
11. Stop invitations immediately on a blocking correctness, privacy, abuse, cost, or operations failure.
12. At the end of the bounded window, explicitly decide to disable, repeat H1, or propose a separate public-preview package.

## Hosted smoke

Before the first invitation, preserve redacted evidence that:

- `/health` returns HTTP 200 with exactly the expected service identity, approved source revision, and `privateRooms: 0`;
- TLS is valid and the client uses `wss` with no mixed-content failure;
- the approved Pages origin can connect and a foreign origin is rejected;
- four browser/physical clients create, join, form 2v2 teams, Ready, Start, and receive one common result;
- desktop and tablet controls, class selection, fixed radio commands, pings, portable relays, fog, hearing, and results behave as expected;
- one client reclaims the same slot inside 15 seconds;
- an overlong outage reaches the expected common terminal result;
- the room disposes and its used key is rejected;
- provider and browser logs contain no room key, token, callsign list, IP address, internal room/player ID, snapshot, position history, or free text;
- application telemetry remains absent;
- a controlled stop and restart returns the same approved revision with no stale room;
- the approved backend disable/rollback and frontend rollback procedures are executable.

A failed smoke blocks invitations. Repair the product or readiness package; do not weaken the check or relabel local evidence as hosted evidence.

## Human WAN matrix

Use [`docs/online-wan-playtest-checklist.md`](../online-wan-playtest-checklist.md) for approximately 10-20 2v2 matches.

Minimum coverage:

- desktop and tablet;
- home Wi-Fi;
- at least one mobile hotspot;
- at least one genuinely remote network when practical;
- create/join/copy/Ready/Start;
- ordinary play through result;
- at least one intentional sub-15-second reconnect;
- cleanup and used-key rejection.

Record anonymous participant labels, broad connection type, exact source, match ordinal, common-result agreement, reconnect outcome, connection-quality summary, cleanup outcome, and concise usability notes. Do not record room keys, tokens, IP addresses, credentials, provider-account data, or participant identities.

Human WAN remains pending until at least ten actual matches are recorded. Synthetic, local, Tailscale, browser, soak, and Toxiproxy evidence does not substitute for it.

## Stop and rollback rules

Stop new invitations immediately for:

- divergent results, fog/hidden-information leak, duplicate slot or tank, stale-socket mutation, stuck room, or cleanup failure;
- repeated unexplained disconnects or unusable latency;
- unexpected telemetry, sensitive log content, or provider-log scope;
- unapproved cost, instance, region, repository connection, or setting drift;
- revision mismatch, origin bypass, TLS/WSS failure, or rollback failure;
- abuse or safety handling that lacks a monitored human owner.

Before backend deploy, restart, disable, or rollback, observe `privateRooms: 0` twice at least ten seconds apart. This narrows but does not eliminate the race where a new room begins between checks. Tell testers that active matches can be lost.

For the first backend deployment, `DISABLE_INITIAL_SERVICE` is the minimum recoverable action. For later deployments, name an exact previously healthy backend source. Frontend rollback requires a different successful production-root source and an unexpired Pages artifact. After any recovery action, verify exact revision, origin, create/join, result, and cleanup again.

## Explicit H1 execution authority

The future operator instruction must name every protected value represented by the validated decision record and explicitly authorize only profile `INVITE_ONLY_HOSTED_PRETEST`. It must also state that there is no tag and no public announcement.

General instructions such as "proceed", "host it", "deploy", or "use Render" are insufficient because they do not name the exact source, workspace, current plan/region, cost owner and ceiling, repository connection, public origins, rollback, invitation/abuse ownership, provider-log controls, or execution scope.

H1 authority does not authorize a public release, matchmaking, accounts, telemetry activation, scaling, custom DNS, a tag, or an announcement.

## H1-P0 closeout

Required repository validation:

- draft template check;
- focused decision-guard tests;
- full `npm.cmd run validate`;
- Product Review Warden;
- attended-v2 prompt and operating-mode guard;
- exact-head review;
- `git diff --check`.

Local H1-P0 evidence:

- the committed draft template check passes;
- six focused guard tests pass, including draft rejection, safe authorized shape, fixed-boundary enforcement, endpoint/rollback/ownership rejection, rejection of the unsupported preview target, and rejection of impossible authorization dates;
- full Node 22 validation passes at 74 test files / 646 tests with production build, server integration, and configured harness checks;
- Product Review Warden returns `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED` with zero open blocking debt;
- deterministic Deep Agent check returns `DEEP_AGENT_STUB_COMPLETE_ALLOWED`;
- the attended-v2 prompt contract passes with zero findings and the operating-mode guard returns `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`;
- the optional harness-v2 read-only shadow still reports its pre-existing manifest-digest/projection-drift control-plane defect; it has no authority over this repository package;
- `git diff --check` passes.

Target terminal outcome:

`H1_P0_INVITE_ONLY_HOSTED_PRETEST_READINESS_COMPLETE_EXTERNAL_EXECUTION_NOT_AUTHORIZED`
