# Online Session Telemetry v1

Status: local/private-preview diagnostic feature. It is disabled by default and is not a production retention policy.

## Purpose

Write one compact JSON object per meaningful online-room event so a short playtest can be diagnosed after the room has already been destroyed. The logger does not record movement commands, per-tick positions, personalized snapshots, or rendering frames.

Events in v1 are:

- `room_created`, `room_key_rotated`, and `phase_changed`;
- `player_joined`, `player_dropped`, `player_reconnected`, `reconnect_expired`, `player_left`, and `player_kicked`;
- accepted team-radio `chat` messages;
- `match_ended` with duration, final tick, score, reason, winner, and the existing bounded network summary.

Every line carries schema version `v`, UTC timestamp `ts`, an anonymous telemetry room id `sid`, and an `event` name. String values are capped at 256 characters, arrays and objects are bounded, and a telemetry write failure cannot change authoritative room behavior.

## Enabling a local log

Telemetry needs an explicit output path:

```powershell
$env:ONLINE_TELEMETRY_LOG_PATH='output/online-telemetry/session.jsonl'
npm run server:dev
```

This default form records pseudonymous player labels (`p1`-`p4`), team/host state, phases, scores, event counts, and aggregate performance diagnostics.

For the current private playtest only, sensitive fields can be enabled separately:

```powershell
$env:ONLINE_TELEMETRY_INCLUDE_SENSITIVE='true'
```

That adds the current/rotated room key, internal room/player/session identifiers, callsigns, Colyseus-provided connection IP, and accepted chat text. This switch is intentionally independent from the log path so a future deployment cannot enable sensitive capture by selecting a file alone. Generated `.jsonl` files must remain under ignored `output/` paths and must not be committed, pasted into PRs, or included in browser screenshots.

## Example

```json
{"v":1,"ts":"2026-07-22T12:00:00.000Z","sid":"room-123456781234","event":"match_ended","durationMs":183250,"finalServerTick":3665,"scores":{"blue":3,"red":2},"winner":"blue","reason":"TIME_LIMIT","network":{"rttMedianMs":54,"rttP95Ms":103,"jitterMs":12}}
```

Retention, player notice, abuse-report workflows, access control, export, deletion, and legal-hold behavior are explicitly deferred before any production release.
