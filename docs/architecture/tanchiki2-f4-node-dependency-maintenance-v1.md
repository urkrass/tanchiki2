# Tanchiki2 F4 Node and dependency maintenance

Date: 2026-07-24

Package: `TANCHIKI2-F4-NODE-DEPENDENCY-MAINTENANCE-V1`

Base: `96e37815b12a606cb5dadc15a3eee2ed3d3c2adb`

## Decision

Tanchiki2 supports Node.js 22. The repository now has one exact development and
product-CI pin, Node.js `22.23.1`, in `.node-version`. `package.json` keeps the
supported major range so a production platform may take a compatible Node 22
security patch. npm `10.9.x` is the supported package-manager line and
`packageManager` records the tested npm `10.9.8` release.

`.npmrc` uses `engine-strict=true`. Ordinary installation therefore stops on an
unsupported Node/npm line instead of continuing after `EBADENGINE`. The
deterministic `runtime:check` guard also protects the main local entry points and
prints an actionable failure when lifecycle scripts resolve the wrong `node`
binary on Windows.

Product validation, Pages build/release guards, and the product-validation half
of Reviewer App all read `.node-version`. Reviewer App deliberately switches
back to Node.js 24 only after product validation, immediately before installing
and running the separately pinned trusted harness.

## Why local validation used Node.js 24

Before F4, Node.js 22 existed only as an `engines` range, README sentence, and
loose workflow value. The local Windows PATH resolved
`C:\Program Files\nodejs\node.exe` at `24.18.0`; npm warned about `EBADENGINE`
but continued. There was no `.node-version`, version-manager declaration,
strict engine policy, or runtime guard.

F4 does not install or mutate a machine-wide runtime. A checksum-verified
portable Node.js `22.23.1` runtime from the official Node distribution was used
for package evidence. Local operators may use any manager that consumes
`.node-version`.

## Dependency finding

The baseline production audit reported eight findings: five low and three
moderate. `npm explain` traced every finding through this unused chain:

```text
colyseus
  -> @colyseus/playground
  -> @colyseus/auth
  -> grant
  -> request-oauth
  -> uuid 8
```

Tanchiki2 does not expose Colyseus auth, playground, monitor, tools, Redis
driver, or Redis presence. Its server uses only `Server`, `Room`,
`ServerError`, `matchMaker`, and `WebSocketTransport`.

Colyseus 0.17 already separates those supported surfaces:

- the official [0.17 migration guide](https://docs.colyseus.io/migrating/0.17)
  lists auth and playground as optional packages;
- the official [WebSocket transport guide](https://docs.colyseus.io/server/transport/ws)
  imports `WebSocketTransport` from `@colyseus/ws-transport` and core server
  APIs from `@colyseus/core`.

F4 therefore removes the broad `colyseus@0.17.10` package and directly pins the
same already-resolved compatible implementations:

```text
@colyseus/core@0.17.44
@colyseus/ws-transport@0.17.13
@colyseus/sdk@0.17.43
```

This is a dependency-surface reduction, not a Colyseus protocol or library
version migration. Server, room, and fault-lab imports now name their owning
packages. `dependencies:check` prevents the umbrella/auth/playground path from
silently returning without a separate reviewed migration.

## Security result

| Evidence | Before | After |
| --- | ---: | ---: |
| npm audit findings | 8 | 0 |
| low | 5 | 0 |
| moderate | 3 | 0 |
| high / critical | 0 | 0 |

Both `npm audit` and `npm audit --omit=dev` report zero findings after a clean
Node.js 22 install. There are no accepted production or development audit
findings in this package. The audit tool's unsafe suggestion to downgrade
Colyseus to `0.15.13` was not applied, and `npm audit fix --force` was not run.

## Compatibility and rollback

No shared protocol, room message, snapshot, save, gameplay, fog, room-key,
reconnection, or rendering contract changes. The direct package versions were
already present under the umbrella package in the baseline lockfile.

If a compatibility defect is found before merge, revert the three import
changes plus `package.json` and `package-lock.json`; this restores the exact
prior package graph. No data migration or provider rollback is required.

## Validation contract

F4 must pass under Node.js `22.23.1` and npm `10.9.8`:

- clean `npm ci`, deterministic runtime/dependency checks, and both audit modes;
- full offline/server/harness validation;
- three-match quick lab and 100-match seeded soak;
- four-context desktop browser lifecycle and two-tablet entry/gameplay;
- F3 online runtime-boundary and visual-contrast checks;
- generic web-game client screenshot, structured state, and console review;
- Product Review Warden, deterministic Deep Agent stub, and clean Git diffs.

Production deployment, provider configuration, secrets, billing, public
release, and Human WAN acceptance remain outside F4.

## Validation result

Final evidence under Node.js `22.23.1` and npm `10.9.8`:

- a clean `npm ci` and a production-pruned tree both report zero audit
  findings; a dry-run install under the machine's Node.js `24.18.0` / npm
  `11.16.0` fails with `EBADENGINE` as intended;
- full validation passes 71 files and 623 tests, production build, real server
  integration, room-key resolution, stable identity reconnection, telemetry,
  and every configured harness gate;
- the quick lab passes three rooms, and the seeded soak passes 100 rooms with
  zero divergence, stuck rooms, or cleanup failures;
- the four-context browser lifecycle passes lobby, countdown cancellation,
  play, common result, unanimous rematch, fresh key, kick/key rotation, and
  destruction;
- two tablet contexts pass native field entry, copy/join, class selection,
  host Start, 89 ms input-to-visible movement, 440 ms first-tile movement,
  battle kit, guarded Back, zero rewinds, and zero browser errors;
- the F3 runtime-boundary and visual-contrast checks pass without changing
  their bundle outputs; the documented main-chunk warning remains;
- the generic web-game client produced an inspected Campaign level-select
  screenshot and structured state with no console-error artifact;
- Product Review Warden reports zero blocking debt and the deterministic Deep
  Agent stub completes with zero denied actions.

The long soak exposed two pre-existing QA timing/geometry assumptions:

1. the bot validator treated a tank as a point even though authoritative F2
   projection correctly keeps the square tank visible through the fog's soft
   edge; the validator now calls the same shared aperture function while
   bullets retain point visibility;
2. the four-context smoke sampled the result screen before the following
   `rematch_status` message could arrive; it now waits for the complete result
   contract.

These are test-harness corrections only. They do not alter gameplay, fog,
protocol, or room behavior.
