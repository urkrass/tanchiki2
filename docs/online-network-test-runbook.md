# Online Battle Network Test Runbook

This runbook exercises the private Colyseus Team Battle room without logging room keys, reconnection tokens, internal room ids, IP addresses, or credentials. Generated traces belong under ignored `output/`; commit only concise aggregate evidence and replayable seeds.

## Deterministic local gates

```bash
npm run server:smoke
npm run online:lab:quick
npm run online:lab:realtime
npm run online:browser:four-context
```

- `server:smoke` covers actual Colyseus create/join, host-only key visibility, malformed/oversized/rate-limited messages, countdown, personalized snapshots, and same-slot reconnection.
- `online:lab:quick` runs three seeded 2v2 public-protocol matches through Node bots.
- `online:lab:realtime` keeps one representative round active for 12 seconds with production 20 Hz simulation and 20 Hz snapshots.
- `online:browser:four-context` creates four isolated Chromium contexts, cancels and re-runs countdown, rejects a locked join, plays through Canvas controls, compares the authoritative result, proves cleanup, and checks kick/key rotation.

The tablet entry regression additionally taps the visible Copy Room Key action, freezes the host renderer beyond the former diagnostic-heartbeat cutoff, joins from a second touch context, resumes the host, and reaches live play. It then drives through the real side-rail touch surface, requires first visible motion within 220 ms, and proves one Back tap leaves the match connected until the 2.5-second confirmation expires. Waiting-room keys have no idle expiry; they remain available until the host leaves, the key is rotated, or deployment locks the room.

The touch lane also holds one direction through a complete tile. Acceptance requires the visual crossing to finish within 380 ms with zero backward corrections. The real-SDK server smoke independently requires six 20 Hz server ticks to advance authoritative match time by 0.25-0.35 seconds; this prevents a scheduler callback delta from silently slowing the simulation clock.

The production score limit is 15 and duration is eight minutes. Short browser/bot rounds use server-owned constructor tuning; clients cannot request or alter it.

## Clean soak

```bash
npm run online:lab:soak
```

This runs 100 seeded 2v2 matches. Acceptance is zero divergent results, stuck rooms, unexplained disconnects, or cleanup failures. Preserve the reported seed on failure; do not commit bulk output.

## Optional Toxiproxy lab

Docker is optional and ordinary `npm run validate` never depends on it.

```bash
docker compose -f qa/online/toxiproxy/docker-compose.yml up -d
npm run online:fault:quick
```

The pinned Toxiproxy container exposes four independent player routes. The mixed profile combines clean, approximately 30 ms RTT, 80 ms RTT, and 150 ms RTT with jitter. Additional executable profiles are:

```bash
node qa/online/toxiproxy/fault-lab.mjs --profile outage5 --matches 1 --seed 20260722
node qa/online/toxiproxy/fault-lab.mjs --profile simultaneous_reconnect --matches 1 --seed 20260722
node qa/online/toxiproxy/fault-lab.mjs --profile reset --matches 1 --seed 20260722
node qa/online/toxiproxy/fault-lab.mjs --profile stall --matches 1 --seed 20260722
node qa/online/toxiproxy/fault-lab.mjs --profile overlong --matches 1 --seed 20260722
node qa/online/toxiproxy/fault-lab.mjs --profile backpressure --matches 1 --seed 20260722
```

`npm run online:fault:outage-soak` runs the 100-match five-second outage acceptance lane. The overlong profile removes both Blue routes for 16 seconds and expects an authoritative forfeit. Stop the lab with:

```bash
docker compose -f qa/online/toxiproxy/docker-compose.yml down
```

## Reading diagnostics

Jitter is the median absolute difference between consecutive RTT samples. No packet-loss percentage is reported because Colyseus uses TCP WebSockets. Use missed heartbeats, stall count/duration, snapshot-gap p95, reconnect outcomes, input-ack latency, backpressure events, and server tick timing instead. Diagnostic-heartbeat timeout enforcement begins only in `PLAYING`; background-tab throttling in `LOBBY` is not a disconnect signal.

Thresholds and the `Measuring`, `Good`, `Unstable`, `Poor`, and `Disconnected` labels live in `packages/shared/src/networkDiagnostics.ts` and have deterministic tests. Poor quality warns but does not block deployment; a disconnected roster slot does.
