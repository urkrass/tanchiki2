# Tanchiki2 P4 Production Multiplayer Hosting Readiness v1

Status: **PLAN READY; EXTERNAL EXECUTION NOT AUTHORIZED**

Prepared: 2026-07-23

Exact planning baseline: `eed90b852681d5d9917f2a7c9d86b36ccc3c3beb`

Working branch: `codex/tanchiki2-p4-hosting-readiness-v1`

This package selects a production hosting shape and makes the repository fail fast on invalid production configuration. It does not create a provider account, connect a GitHub installation, provision a service, spend money, publish a URL, change DNS, set a secret, deploy GitHub Pages, or make an online release.

## Decision

Use one **Render paid Starter web service** in the `frankfurt` region for the first controlled online preview.

- Runtime: native Node.js 22.
- Service: `tanchiki2-online` from the repository's `main` branch.
- Compute: one Starter instance, 512 MB RAM and 0.5 CPU.
- Public endpoint: the Render-managed HTTPS hostname initially; a custom domain is deferred.
- Client: keep the static Vite client on GitHub Pages.
- Transport: browser HTTPS and `wss` terminate at Render; Render forwards to the Node/Colyseus service on its assigned `PORT`.
- State: one in-memory Colyseus process with no database, Redis, disk, or cross-instance room registry.
- Deployment trigger: manual only. `autoDeployTrigger` is off.
- Telemetry: disabled because `ONLINE_TELEMETRY_LOG_PATH` is absent. Sensitive telemetry remains false.

The non-activating repository Blueprint is [`render.yaml`](../../render.yaml). Applying it is a separate protected action.

## Why this target

Render supports long-lived public WebSockets, managed TLS, custom domains, health checks, restart handling, Blueprint configuration, and recent-deploy rollbacks in one small service. Its paid instances remain active, while its free services sleep after 15 minutes of inactivity and can take about one minute to wake; the free tier is therefore unsuitable for room creation and a 15-second reconnection contract.

The current Starter list price is USD 7 per month for 512 MB and 0.5 CPU. Before provisioning, the operator must re-check the current price and approve a proposed initial ceiling of **USD 10 per month**, including any pipeline or outbound-bandwidth overage. Moving to Standard or adding another paid resource requires new approval.

Primary provider references, checked 2026-07-23:

- [Render web services](https://render.com/docs/web-services)
- [Render WebSockets](https://render.com/docs/websocket)
- [Render health checks](https://render.com/docs/health-checks)
- [Render rollbacks](https://render.com/docs/rollbacks)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render instance types](https://render.com/docs/compute-plans)
- [Render free-instance limitations](https://render.com/docs/free)
- [Render Node version selection](https://render.com/docs/node-version)
- [Render default environment variables](https://render.com/docs/environment-variables)
- [Render current Starter price reference](https://render.com/articles/top-heroku-alternatives-agencies)

Prices and platform behavior can change. These links are planning evidence, not permanent commercial terms.

## Alternatives considered

| Target | Decision | Reason |
| --- | --- | --- |
| Render Starter | Selected | Lowest operational surface with predictable always-on compute, native WebSockets, TLS, health restarts, Blueprint config, and rollback. |
| Render Free | Rejected | Idle spin-down and approximately one-minute wake-up contradict fast private-room creation and the reconnection window. |
| Railway Hobby | Viable fallback | Strong Git deployment and health/restart features, but the USD 5 minimum is usage credit rather than a fixed compute envelope; CPU, RAM, and egress remain variable. See [Railway pricing](https://docs.railway.com/pricing). |
| Fly.io Machines | Deferred | Capable health-checked regional machines and deployment strategies, but it adds image, machine, proxy, and regional operations that the first four-seat service does not need. See [Fly health checks](https://fly.io/docs/reference/health-checks/) and [Fly deployments](https://fly.io/docs/blueprints/seamless-deployments/). |
| Tailscale Serve from a developer PC | Local testing only | Useful for private physical-device tests, but it has no production ownership, availability, restart, cost, or rollback boundary. |

Railway is the fallback if Render account access or regional latency proves unsuitable. Changing provider is a human hosting decision and must update this plan before execution.

## Architecture and scaling boundary

```text
GitHub Pages static client
          |
       HTTPS/WSS
          |
Render managed TLS and web-service routing
          |
one Node.js 22 process / one Colyseus Server
          |
in-memory room-key registry and disposable TeamBattleRoom instances
```

The service must remain at exactly one instance. Render documents that WebSocket clients are not guaranteed to return to the same instance, while Tanchiki room keys, reconnection authority, and live matches are local to one process. Horizontal scaling without shared Colyseus presence/driver and room-key routing would create invalid keys and failed same-slot reconnections.

The first capacity change is vertical scaling, based on evidence. Redis, a database, multi-region service, autoscaling, and more than one instance are separate architecture packages.

## Repository readiness changes

The P4 branch adds these deployment-safe behaviors:

- Node is bounded to major version 22, matching CI and the README.
- `npm run server:start` starts already-built server output without invoking development compilation.
- production startup requires one exact HTTPS `ALLOWED_ORIGIN` and a valid `PORT`; bad configuration exits before a misleading green health check;
- `/health` reports the service name, exact `RENDER_GIT_COMMIT` when available, and current private-room count without exposing room keys, names, addresses, tokens, or internal room IDs;
- the production entrypoint enables Colyseus graceful handling for `SIGTERM` and `SIGINT` while test-created servers keep isolated manual shutdown;
- lifecycle stdout contains only bounded `server_started`, `server_shutdown_started`, and `server_shutdown_complete` records plus revision and aggregate room count.

## Declarative service configuration

The committed Blueprint specifies:

| Setting | Value | Rationale |
| --- | --- | --- |
| service type | Render web service | Public HTTPS and WebSocket ingress are required. |
| runtime | Node | No container layer is needed for the current server. |
| branch | `main` | Deployment packages must name and verify one merged exact head. |
| region | `frankfurt` | Initial region for the current operator and likely European/Central Asian test group. Region is immutable after creation, so execution must confirm it. |
| plan | `starter` | Small paid always-on canary; free cold starts are rejected. |
| instances | `1` | Mandatory while rooms and key routing are process-local. |
| auto deploy | `off` | A push must never interrupt rooms or publish unapproved code. |
| build | `npm ci && npm run build:shared && npm prune --omit=dev` | Reproducible install, authoritative shared-engine build, then production dependencies only. |
| start | `npm run server:start` | No development compiler or watcher in the runtime process. |
| health | `/health` | Application-level readiness and exact revision evidence. |
| origin | `https://urkrass.github.io` | Browser `Origin` excludes the `/tanchiki2/` path. Change only with an approved frontend-domain change. |
| telemetry | sensitive false; log path absent | No production session telemetry until P5 defines notice and operations. |

Render supplies `PORT`, `RENDER_GIT_COMMIT`, the external hostname, and TLS. The Blueprint explicitly sets `NODE_ENV=production` so a copied configuration cannot silently become permissive.

No credential is required by the game process. Render account access and its GitHub repository installation are provider credentials held outside the repository.

## Static client decision

Keep the client on GitHub Pages for the first preview. Do not move it merely to place both components on one provider.

The authorized release package must build the client with:

```text
VITE_MULTIPLAYER_URL=https://<actual-render-hostname>
```

The deployed backend must have:

```text
ALLOWED_ORIGIN=https://urkrass.github.io
```

The browser then reaches Colyseus over `wss` through the HTTPS service URL. The current unconfigured build still defaults to `http://127.0.0.1:8787`; a public Pages deploy without the exact build-time backend URL is a failed release.

## Health, logs, and monitoring

Expected healthy response:

```json
{
  "ok": true,
  "service": "tanchiki-multiplayer",
  "revision": "<40-character-source-sha>",
  "privateRooms": 0
}
```

Operational policy:

1. Configure Render's HTTP health path as `/health`.
2. Treat a non-2xx health response, revision mismatch, restart loop, or sustained tick overrun as a failed deployment.
3. Keep provider build/deploy logs and aggregate CPU/RAM metrics; do not add a second dashboard for the first preview.
4. Enable provider email alerts for deploy failures, health restarts, and spend limits during the separately authorized setup.
5. Do not log request headers, room keys, tokens, callsigns, connection addresses, snapshots, or player positions.
6. Keep `ONLINE_TELEMETRY_LOG_PATH` unset. P5 must define notice, retention, access, deletion/export, and incident handling before any production session log is enabled.

The existing final network report remains the performance signal inside a match. Initial canary observations must record only redacted aggregates: concurrent rooms, server tick p95/max/overruns, reconnect outcomes, cleanup failures, process CPU/RAM, and provider restarts.

## Capacity and availability envelope

No concurrency capacity is claimed yet. Starter is an evidence-gathering canary, not a scale promise.

Start with one invited 2v2 room. Increase gradually to five simultaneous rooms only after the prior step shows:

- no server tick overruns attributable to load;
- no divergent result, unexplained disconnect, fog leak, duplicate slot, or cleanup failure;
- memory remains comfortably below the 512 MB limit;
- health remains stable and rooms dispose back to zero.

If Starter is insufficient, stop increasing load and propose Standard vertical scaling with current measurements and a new cost approval. Do not add a second instance.

Render maintenance and deployments can replace an instance, and provider documentation states that WebSockets close when an instance is replaced. Because rooms are intentionally disposable and there is no shared live-state store, active matches cannot survive a process replacement. This is an accepted preview limitation, not high-availability readiness.

## Deployment discipline

Every deployment is manual and exact-head. Before deploying an update:

1. Announce or arrange a short maintenance window for invited testers.
2. Confirm exact merged source SHA and green repository validation.
3. Poll `/health` until `privateRooms` is zero in two observations at least ten seconds apart.
4. Trigger only the approved exact commit.
5. Verify `/health` reports that commit before rebuilding or publishing the client.

A room can still be created between the final poll and replacement. Until a separately designed drain control exists, operators must treat a deploy as potentially disruptive and must not claim seamless match preservation.

## Production smoke checklist

The separately authorized execution package must preserve redacted evidence for all of the following:

1. `/health` returns 200 and the authorized 40-character commit.
2. HTTPS redirects and managed TLS are valid; the browser uses `wss` with no mixed-content error.
3. The approved GitHub Pages origin can create and join; a foreign Origin is rejected.
4. Four physical/browser clients create a private room, form 2v2 teams, Ready, Start, and reach one common result.
5. One client reconnects to the same slot within 15 seconds.
6. An overlong disconnect produces the expected common forfeit or no-contest.
7. Leaving/results dispose the room and `/health` returns `privateRooms: 0`.
8. The used key is rejected after cleanup.
9. Browser console, server lifecycle logs, and provider events contain no room key, token, callsign, IP address, or internal room ID.
10. Telemetry output is absent while `ONLINE_TELEMETRY_LOG_PATH` is unset.
11. A controlled restart returns the service to the same source revision and no stale room survives.
12. Rollback to the previous successful artifact restores its exact revision and passes health plus one create/join/cleanup smoke.

## Rollback

Render's rollback reuses a previous successful build artifact, but it does not roll back every current service setting. Therefore:

1. Record the deployed source SHA, build/deploy identifier, `ALLOWED_ORIGIN`, instance type, region, and client backend URL before release.
2. If smoke fails, stop the client release or restore the previous Pages artifact first if necessary.
3. Roll back the backend to the last known-good successful deploy.
4. Verify `/health` reports the expected prior SHA.
5. Repeat origin, create/join, WebSocket, result, and cleanup checks.
6. If client and backend protocol versions differ, restore the matching prior client artifact; do not work around the mismatch in production settings.

Rollback is disruptive to live rooms and does not restore them. No user account or persistent progression is stored by this service.

## Ownership

| Responsibility | Owner for first preview |
| --- | --- |
| source and exact-head evidence | `urkrass/tanchiki2` maintainer |
| Render workspace, billing, GitHub connection, alerts, and rollback | human Render workspace administrator |
| frontend Pages artifact and backend URL | human release operator |
| gameplay/network incident triage | project maintainer using redacted reproduction evidence |
| telemetry/privacy decision | P5 owner before telemetry is enabled |

Provider access must not be shared through repository files or task output.

## Gates still open

- Human WAN remains `0 / 10 minimum`; automated P3 is complete, but public online release acceptance is not.
- P5 telemetry/privacy/abuse operations are not complete, so production telemetry stays off.
- Render account/workspace choice, GitHub installation, USD 10 monthly ceiling, and Frankfurt region require explicit human approval.
- Creating the service makes a public provider endpoint and requires explicit public-hosting/deployment authority.
- Any custom domain requires a separate DNS decision and authorization.
- Building and deploying GitHub Pages with the production backend URL requires exact-head release authority.

## Exact next authorized package

After Human WAN and P5 are complete, a deployment request must name:

- exact merged source SHA;
- Render workspace and approved `frankfurt` region;
- approved monthly ceiling;
- permission to connect the repository and apply `render.yaml`;
- permission to create the public Render hostname;
- exact GitHub Pages target and permission to publish it;
- rollback source SHA/artifact.

Terminal outcome for P4:

`P4_PRODUCTION_MULTIPLAYER_HOSTING_PLAN_READY_EXECUTION_NOT_AUTHORIZED`
