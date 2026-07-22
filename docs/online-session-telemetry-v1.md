# Online Session Telemetry v1

Status: local/private-playtest diagnostic feature. It is disabled by default and deliberately locked out of production for the first public preview.

The governing operational policy is [`docs/operations/tanchiki2-p5-telemetry-privacy-abuse-v1.md`](operations/tanchiki2-p5-telemetry-privacy-abuse-v1.md). Production startup fails closed if a log path or sensitive capture is configured.

## Purpose

Write one compact JSON object per meaningful online-room event so a short playtest can be diagnosed after the room has already been destroyed. The logger does not record movement commands, per-tick positions, personalized snapshots, or rendering frames.

Events in v1 are:

- `room_created`, `room_key_rotated`, and `phase_changed`;
- `player_joined`, `player_dropped`, `player_reconnected`, `reconnect_expired`, `player_left`, and `player_kicked`;
- accepted `radio_command` and `team_ping` signals;
- `match_ended` with duration, final tick, score, reason, winner, and the existing bounded network summary.

Every line carries schema version `v`, UTC timestamp `ts`, an anonymous telemetry room id `sid`, and an `event` name. Event names and fields are allowlisted, string values are capped at 256 characters, arrays and objects are bounded, and a telemetry write failure cannot change authoritative room behavior.

## Enabling a local log

Telemetry needs an explicit output path:

```powershell
$env:ONLINE_TELEMETRY_LOG_PATH='output/online-telemetry/session.jsonl'
npm run server:dev
```

This default form records pseudonymous player labels (`p1`-`p4`), team/host state, phases, scores, event counts, and aggregate performance diagnostics.

For a consented local playtest only, sensitive fields can be enabled separately:

```powershell
$env:ONLINE_TELEMETRY_INCLUDE_SENSITIVE='true'
```

That adds only the registered sensitive fields appropriate to each event: current/rotated room keys, internal room/player/session identifiers, callsigns, and the Colyseus-provided connection IP. A radio event cannot carry a room key merely because sensitive mode is on. Radio telemetry contains one of the five protocol commands (`ATTACK`, `DEFEND`, `REGROUP`, `HELP`, or `THANKS`), and ping telemetry contains map coordinates; neither event has arbitrary message content. Generated `.jsonl` files must remain under ignored `output/` paths and must not be committed, pasted into PRs, or included in browser screenshots.

Use one timestamped file per playtest. Rotate at 5 MiB, delete pseudonymous files within seven days, and delete sensitive files after diagnosis or within 24 hours, whichever comes first. The file creator is the only default accessor.

## Example

```json
{"v":1,"ts":"2026-07-22T12:00:00.000Z","sid":"room-123456781234","event":"match_ended","durationMs":183250,"finalServerTick":3665,"scores":{"blue":3,"red":2},"winner":"blue","reason":"TIME_LIMIT","network":{"rttMedianMs":54,"rttP95Ms":103,"jitterMs":12}}
```

Player notice, retention, access, deletion/export, incident, legal-hold, and abuse-response behavior are defined by the P5 operational policy. None of those rules authorize production collection.
