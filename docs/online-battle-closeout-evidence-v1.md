# Private Online Battle MVP Closeout Evidence v1

## Scope and provenance

- Base: exact verified `origin/main` `cb08c212259abd6f68ec47a33f3fb088ec2e3e70`.
- Isolated worktree: `D:\projects\tanchiki-online-battle-colyseus-v1`.
- Branch: `codex/tanchiki2-online-battle-colyseus-v1`.
- Dependencies: exact `colyseus@0.17.10`, `@colyseus/sdk@0.17.43`, and Node-QA-only `ws@8.21.1` with committed lockfile.
- No harness pin/consumer/policy change, deployment, repository setting, external service, account, database, or LiveKit implementation.

## Implemented proof surfaces

- Private/unlisted four-seat `TeamBattleRoom`, CSPRNG six-character key registry, serialized lifecycle, stable player slot/epoch, Colyseus reconnection, deterministic results, TTL/ack cleanup, bounded diagnostics, origin and message validation.
- Canvas-native Field Briefing and after-action report with structured text state; a focusable native-input bridge opens the mobile keyboard without adding visible chrome. The host gets a large touch-sized `COPY ROOM KEY` action with confirmed feedback and one dominant `START BATTLE` action with explicit readiness reasons. Live play uses 20 Hz personalized snapshots, a 75 ms remote interpolation buffer, and bounded local presentation of an already-authorized move. A live Back action requires a second deliberate command within 2.5 seconds. Relay Yard now provides touch-sized `PING HERE` and `RADIO` actions plus a five-command team-only selector; no arbitrary chat text exists in UI, snapshots, or the accepted protocol.
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
- Two touch-enabled tablet contexts pass native callsign/key entry with a pinned viewport, touch Copy Room Key with confirmed feedback, a host-renderer freeze beyond the former heartbeat cutoff, successful join, ready actions, host `START BATTLE` tap, countdown, live side-rail movement, and clean browser logs. The corrected browser probe reports 100 ms from touch direction to visible motion, a 248 ms monotonic full-tile crossing, and zero backward corrections. One Back tap visibly arms confirmation, remains connected in `PLAYING`, and safely expires.
- Toxiproxy profile contract and four-route config validate offline.
- Full closeout validation passes 53 test files / 498 tests, production build, server integration, harness validation/smoke, Reviewer App dry-run, and the attended-v2 lifecycle wrapper. The four-context Chromium lifecycle and the expanded two-tablet browser regression also pass.
- The first responsiveness follow-up measured only first visible movement and was insufficient to claim playability. A later sustained trace reproduced the user's retest: a nominal 280 ms authoritative tile took roughly 1.4 seconds and visually rewound 25 times because the room fed Colyseus's short scheduler callback delta into a callback that ran every 50 ms.
- The corrected room advances one fixed 50 ms simulation step per 20 Hz callback and records wall-clock cadence separately. Repeated private-Tailscale host probes make sustained movement visible within 40-128 ms, cross a tile in 251-266 ms, and report zero rewinds, zero freezes, 60 fps, approximately 4 ms game RTT, and zero browser errors. The tablet route is direct; diagnostic pings have ranged from 58 ms in an earlier active sample to 95-666 ms while the Android peer was idle, so those peer pings are not claimed as browser gameplay RTT.
- Local session telemetry v1 is default-off and writes bounded lifecycle, fixed radio command, ping, and result JSONL only when a path is explicitly configured. A second explicit private-playtest switch adds room keys, callsigns, Colyseus-provided IPs, and internal identifiers; neither mode has a free-text message field. Generated files stay under ignored `output/` and are not committed evidence. Real-SDK and multi-browser checks prove both pseudonymous and sensitive modes without logging per-frame inputs, positions, or snapshots.
- `npm audit --omit=dev` reports 5 low / 3 moderate transitive findings and zero high / critical findings. The upstream Colyseus umbrella package pulls unused auth/playground paths; npm's proposed fix is an incompatible downgrade and was not applied.

## Honest external gates

- Docker/Toxiproxy is unavailable in the current environment. Proxy-backed quick/soak evidence is not claimed; only source/configuration and offline contract validation are claimed.
- The 10-20 match human WAN playtest is pending external participants and is not claimed.
- Advisory attended-v2 telemetry branch drift remains recorded; no live dispatch or pin change was authorized.
- No merge or deployment is authorized by this implementation package.
