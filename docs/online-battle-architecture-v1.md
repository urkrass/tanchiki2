# Online Battle Architecture v1

Status: accepted implementation decision for `TANCHIKI2-ONLINE-BATTLE-COLYSEUS-V1`.

## Primary job

Create or join one private Team Battle room, deploy one equal-team round, recover from short connection loss, render one authoritative result, and dispose the room completely. The screen remains a focused Field Briefing before deployment and the existing Canvas battlefield during play.

## Authority and boundaries

- `packages/shared/src/multiplayer.ts` remains the only gameplay simulation. Colyseus owns the connection, seat, room lifecycle, clocks, and message dispatch; it does not create a second simulation.
- The server advances the existing simulation with one fixed 50 ms step at 20 Hz and sends `createSnapshotForPlayer()` output at 20 Hz. The Colyseus scheduler callback delta is diagnostic timing only; it is not simulation time. Remote entities render through a 75 ms interpolation buffer. The local tank may advance only an already-authorized move from its personalized snapshot history, monotonically capped at that tile's authoritative destination; it never predicts a new move, collision, shot, score, or hidden state. The browser keeps the existing camera, fog, minimap, input, and Canvas rendering pipeline.
- Common lobby data is sent as explicit messages. Hidden gameplay data never enters a globally synchronized Colyseus Schema/StateView.
- Git artifacts, deterministic tests, Review Warden, Reviewer App, and human gates are authoritative. Lifecycle telemetry is advisory only.
- Self-hosted Colyseus is the only online service. This package adds no accounts, database, Redis, hosted multiplayer, LiveKit, deployment, or production setting.

## Package selection

The compatible stable 0.17 pair is pinned exactly:

- server: `colyseus@0.17.10`;
- browser and Node bots: `@colyseus/sdk@0.17.43`.

The old `colyseus.js@0.16.22` package belongs to the 0.16 protocol line. Colyseus's 0.17 migration replaces it with `@colyseus/sdk`; mixing the 0.16 SDK with the 0.17 seat-reservation format is intentionally avoided. `package-lock.json` fixes the full transitive graph.

## Matchmaking and room keys

`TeamBattleRoom` is private/unlisted and limited to four reserved seats. Creation uses Colyseus `create()`. Joining uses a small non-gameplay HTTP key-resolution request followed by Colyseus `joinById()` and normal seat reservation. No gameplay command or snapshot uses HTTP/SSE.

The six-character human key:

- uses the ambiguity-free alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`;
- is generated with Node cryptographic randomness and collision-checked;
- maps to, but is distinct from, the internal Colyseus room id;
- is case-insensitive;
- remains valid for the lifetime of an open waiting room, with no wall-clock lobby expiry;
- is invalidated on kick and removed before terminal cleanup;
- is never placed in a URL, synchronized state, trace, diagnostic report, server log, or PR text.

Only the creating host receives the current key in a targeted control message. A join request supplies a key in a bounded POST body; the key resolver returns only the internal room id.

## Serialized lifecycle

One server-owned command queue serializes all lifecycle and player mutations:

`LOBBY -> COUNTDOWN -> PLAYING -> RESULTS -> DESTROYED`

`COUNTDOWN -> LOBBY` is the sole backward transition. Countdown cancellation clears every Ready value. Entering `PLAYING` locks the room; entering `RESULTS` makes gameplay immutable and invalidates joining; entering `DESTROYED` removes the key, sockets, timers, listeners, diagnostics, tokens, controller state, and registry entries.

The gameplay engine starts only when countdown expiry revalidates equal non-empty teams, full connection, and Ready state. `addPlayer()` no longer starts the engine. Waiting rooms have no idle clock: the key remains joinable while the host connection owns the lobby. A dropped connection neutralizes input immediately and retains the slot for 15 seconds through Colyseus `onDrop()` / `allowReconnection()` / `onReconnect()`. `onLeave()` handles permanent departure; `onDispose()` performs final cleanup.

During `PLAYING`, the first Canvas Back tap or keyboard Back command releases held controls and arms a 2.5-second leave confirmation without disconnecting. A second Back inside that window leaves; expiry or any new gameplay input cancels the armed action. Lobby, entry, and result navigation retain their ordinary single-step Back behavior.

## Identity

Each slot has a server-issued `playerId`, host permission, team, Ready flag, connected flag, and monotonic `connectionEpoch`. Colyseus owns session and reconnection identities. The browser may keep the current Colyseus reconnection token in `sessionStorage` only; tokens are never sent as game messages or exposed through text state.

Gameplay inputs carry a monotonic `inputSeq`; personalized snapshots carry `serverTick` and the receiving slot's `lastProcessedInputSeq`. A stale session/epoch or duplicate/out-of-order input cannot mutate a reclaimed slot.

## Result and cleanup

Only one result may be committed. It contains match/result ids, final tick, final scores, winner/draw, terminal reason, and a bounded server-observed network summary. The locked room retains the result until all connected eligible players acknowledge it or the 30-second terminal TTL expires. Cleanup does not depend on acknowledgements.

After a live grace expiry the disconnected tank is deactivated, the roster/result record remains, and no replacement joins. One fully expired team forfeits. If both teams expire in the same serialized evaluation, the result is `NO_CONTEST` with no callback-order dependency. A host expiring before deployment destroys the lobby; there is no host migration.

## Diagnostics and privacy

One-second application heartbeats and bounded rolling aggregates report RTT median/p95, jitter, missed heartbeats, stalls, input acknowledgements, snapshot gaps, reconnect outcomes, observable backpressure, server tick timing/drift/overruns, client FPS, long frames, and visibility state. Missing application heartbeats neutralize stale controls only during live gameplay; browser background throttling cannot destroy a waiting lobby. Colyseus transport liveness still owns actual disconnect/reconnection. TCP/WebSocket diagnostics never claim packet loss.

Diagnostics and evidence exclude IP addresses, room keys, player/session identifiers, Colyseus reconnection tokens, credentials, and raw unbounded samples.

## Removal gate - satisfied

Focused controller, real-SDK integration, synthetic bot, fog-filter, and four-browser tests pass. Package I removed the legacy HTTP gameplay commands and SSE snapshots. HTTP now serves only health, bounded room-key resolution, Colyseus matchmaking, and the pre-existing unimplemented LiveKit token boundary.

Production requires an explicit `ALLOWED_ORIGIN` for both HTTP and Colyseus authentication, plus TLS termination so browser WebSockets use `wss`. Local development retains `ws` and loopback-only test overrides.
