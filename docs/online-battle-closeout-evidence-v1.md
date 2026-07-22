# Private Online Battle MVP Closeout Evidence v1

## Scope and provenance

- Base: exact verified `origin/main` `cb08c212259abd6f68ec47a33f3fb088ec2e3e70`.
- Isolated worktree: `D:\projects\tanchiki-online-battle-colyseus-v1`.
- Branch: `codex/tanchiki2-online-battle-colyseus-v1`.
- Dependencies: exact `colyseus@0.17.10`, `@colyseus/sdk@0.17.43`, and Node-QA-only `ws@8.21.1` with committed lockfile.
- No harness pin/consumer/policy change, deployment, repository setting, external service, account, database, or LiveKit implementation.

## Implemented proof surfaces

- Private/unlisted four-seat `TeamBattleRoom`, CSPRNG six-character key registry, serialized lifecycle, stable player slot/epoch, Colyseus reconnection, deterministic results, TTL/ack cleanup, bounded diagnostics, origin and message validation.
- Canvas-native Field Briefing and after-action report with structured text state; a focusable native-input bridge opens the mobile keyboard without adding visible chrome. The host gets a large touch-sized `COPY ROOM KEY` action with confirmed feedback and one dominant `START BATTLE` action with explicit readiness reasons. Live play uses 20 Hz personalized snapshots, a 75 ms remote interpolation buffer, and bounded local presentation of an already-authorized move. A live Back action requires a second deliberate command within 2.5 seconds. Existing Relay Yard simulation, camera, minimap, keyboard, pointer/touch, orientation, team chat, and pings are reused.
- Public-protocol Node bots, four-context Chromium scenario, four-route Toxiproxy source/configuration, deterministic quick/realtime/soak commands, and human WAN checklist.
- Legacy HTTP-command and SSE gameplay transport removed after focused proof. Health and bounded key resolution remain.

## Current deterministic evidence

- Untouched baseline: 43 test files / 448 tests; focused multiplayer/online 54/54; production build; server smoke; harness checks; attended-v2 local lifecycle; Review Warden with zero blocking debt.
- Colyseus controller/protocol/diagnostics focused suites pass.
- Real SDK integration passes create/key resolve/join/privacy, malformed/oversized/rate limits, countdown, snapshots, heartbeat, and same-slot reconnect.
- Three-match scripted 2v2 lab passes with replayable seed `20260722`, zero divergence, stuck rooms, or cleanup failures.
- One 12-second representative real-time round passes with the same public resolver/SDK protocol and fog-safety assertions.
- One hundred seeded 2v2 rooms pass with replayable seed `20260722`, zero divergent results, stuck rooms, or cleanup failures. The Node bot transport explicitly closes QA HTTP connections and uses the pinned `ws` runtime so long soaks fail on game/room behavior rather than Node 24 native connection-pool ceilings.
- Four-context Chromium passes `LOBBY -> COUNTDOWN -> LOBBY -> COUNTDOWN -> PLAYING -> RESULTS -> DESTROYED`, common result, locked join, key rotation, kick rejection, and cleanup.
- Two touch-enabled tablet contexts pass native callsign/key entry with a pinned viewport, touch Copy Room Key with confirmed feedback, a host-renderer freeze beyond the former heartbeat cutoff, successful join, ready actions, host `START BATTLE` tap, countdown, live side-rail movement, and clean browser logs. The local browser probe reports 105 ms from touch direction to visible motion against a 220 ms regression ceiling. One Back tap visibly arms confirmation, remains connected in `PLAYING`, and safely expires.
- Toxiproxy profile contract and four-route config validate offline.
- Full closeout validation passes 52 test files / 493 tests, production build, server integration, harness validation/smoke, Reviewer App dry-run, and the attended-v2 lifecycle wrapper. The four-context Chromium lifecycle and the expanded two-tablet browser regression also pass.
- On the private Tailscale preview, the PC-to-tablet route was direct at approximately 11 ms. The same real-clock browser probe improved from 369 ms input-to-first-visible straight movement at 10 Hz snapshots / 120 ms interpolation to 63 ms at 20 Hz snapshots / 75 ms interpolation, while maintaining 60 fps, approximately 4-5 ms game RTT, and zero browser errors.
- `npm audit --omit=dev` reports 5 low / 3 moderate transitive findings and zero high / critical findings. The upstream Colyseus umbrella package pulls unused auth/playground paths; npm's proposed fix is an incompatible downgrade and was not applied.

## Honest external gates

- Docker/Toxiproxy is unavailable in the current environment. Proxy-backed quick/soak evidence is not claimed; only source/configuration and offline contract validation are claimed.
- The 10-20 match human WAN playtest is pending external participants and is not claimed.
- Advisory attended-v2 telemetry branch drift remains recorded; no live dispatch or pin change was authorized.
- No merge or deployment is authorized by this implementation package.
