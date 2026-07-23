# Tanchiki2 F1 Spatial Hearing v1

Status: **IMPLEMENTED AND LOCALLY VALIDATED; EXACT-HEAD REVIEW PENDING**

Date: 2026-07-23

Exact base commit: `62ef540c86e03fa76e0850761750df5238c5d8bc`

Working branch: `codex/tanchiki2-f1-spatial-hearing-v1`

## Bounded objective

F1 makes ordinary physical battlefield sounds local and tactically plausible. It
does not change relay, radar, jammer, ping, or radio intelligence.

The package covers:

- one shared physical-event vocabulary for offline and online play;
- deterministic range, lifetime, intensity, direction, stereo, and simple
  obstacle attenuation;
- server-authoritative personalized hearing for online play;
- fog-safe visual and accessibility projections;
- browser evidence on desktop and tablet.

It does not add chat, voice, a new HUD surface, a full acoustic simulation, new
radar mechanics, deployment, or production settings.

## Shared hearing contract

`packages/shared/src/spatialHearing.ts` is the single rule authority. A physical
event has a stable ID, kind, exact internal source cell, loudness class,
intensity, creation time, and expiry time.

| Event | Base range | Lifetime |
| --- | ---: | ---: |
| Tracks | 3.25 cells | 0.55 s |
| Rustle | 4 cells | 0.8 s |
| Environment | 5.5 cells | 0.7 s |
| Impact | 6 cells | 0.45 s |
| Trap | 6.5 cells | 0.75 s |
| Shot | 9 cells | 0.5 s |
| Explosion | 12 cells | 0.9 s |

Projection uses Euclidean cell distance. Each blocking brick, steel, or base
cell crossed by the listener-to-source line subtracts 1.75 cells from the
effective range. The result contains normalized gain, stereo pan, one of eight
coarse directions, a near/mid/far band, and an occlusion flag.

The active event list and client dedupe queues are bounded. All calculations are
pure and deterministic for the same event, listener, visibility, and obstacle
inputs.

## Hidden-information boundary

Exact source cells remain internal until the source is independently visible.
An audible hidden event is projected as a directional cue and omits the
`source` field entirely. Accessibility copy reports only the event type, coarse
direction, distance band, and optional muffling.

Terrain evidence follows the same boundary:

- visible physical evidence may render whether or not it is audible;
- hidden physical evidence renders only when its event is locally audible;
- its marker remains deliberately approximate;
- echo remains a signal-channel observation, not physical hearing.

The online server retains raw events inside authoritative match state and sends
only a personalized safe projection to each player. Raw `acousticEvents` are
never serialized into a player snapshot. Captured relays may reveal a source
through the existing vision rules, but they do not extend physical hearing
range.

## Offline and online integration

Offline gameplay emits the shared kinds for shots, impacts, explosions, tracks,
rustles, and traps. Audio playback consumes the projected gain and pan, and the
structured game snapshot exposes only safe cues.

Online movement, firing, terrain impacts, tank hits, kills, mines, tripwires,
and steel placement emit the same shared kinds on the server. Each snapshot is
projected for the receiving player. The browser client deduplicates cue IDs and
plays only newly received authoritative cues.

Relay, jammer, radar, ping, and radio state retain their existing signal
semantics and data paths. No second gameplay rule set was introduced.

## Presentation and accessibility

F1 adds no panel, card, sidebar, inspector, or persistent event log. The
battlefield remains the one dominant surface. Physical cues use audio and the
existing polite accessibility channel; signal information remains in its
existing presentation.

Desktop and tablet screenshots were inspected after the dedicated Signal Scar
smoke. Both retain the established battlefield/HUD hierarchy, tablet controls
remain visible, and no hidden exact-source data appears in structured state.

## Human acceptance range

Signal Scar remains the representative gameplay integration route, but combat,
movement, and allied activity make it a poor instrument for judging hearing
thresholds by ear. F1 therefore includes a development-only `Acoustic Range`
at:

`?devLevel=acoustic_range&autostart=1&skipSplash=1`

The map is not campaign content and its route is unavailable when
`import.meta.env.DEV` is false. It contains no active enemies and loops through
seven four-second listening stations:

1. near shot to the right — audible;
2. near shot to the left — audible;
3. far shot — silent;
4. far explosion at the same source — audible;
5. shot through one steel wall — audible at reduced gain;
6. near bush rustle — audible;
7. far bush rustle — silent.

The listener teleports to a fixed marked cell at each station, so accidental
movement cannot invalidate the distance. Each source pulses automatically at
1.25 and 2.5 seconds. Space or the tablet Fire control replays the current
sample without firing a shell. One compact guide strip shows the station,
expected result, countdown, and replay control; it adds no dashboard, event log,
or competing panel.

`render_game_to_text()` exposes the current phase, fixed listener/source cells,
timing, and pulse count. This state exists only to make deterministic browser
and human acceptance possible; it does not alter the shared hearing rules.

## Validation

| Lane | Result |
| --- | --- |
| Focused hearing, offline, online, fog, and accessibility suite | PASS at 7 files / 193 tests |
| Dedicated Acoustic Range unit/runtime suite | PASS; all seven expected audible states, panning, wall attenuation, teleporting, and projectile-free replay green |
| Full `npm.cmd run validate` | PASS at 65 files / 590 tests; build, server integration, and configured attended-v2 checks green |
| `npm.cmd run visual:f1-hearing-range` | PASS on desktop and tablet; seven stations, keyboard/touch replay, panning, silence, and occlusion green with empty blocking browser logs |
| `npm.cmd run visual:f1-spatial-hearing` | PASS on desktop and tablet; physical/signal separation, firing, controls, and hidden-source safety green |
| Bundled generic web-game client | PASS on the Acoustic Range route; one replay produced one cue and zero shells, with screenshot and structured state inspected |
| `npm.cmd run visual:contrast` | PASS |
| Product Review Warden | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; zero open blocking debt |
| Deterministic Deep Agent stub runtime | `DEEP_AGENT_STUB_COMPLETE_ALLOWED` |
| `git diff --check` | PASS |

One earlier long generic-client iteration exceeded the runner timeout after
producing a valid first screenshot and state capture. A short deterministic
generic run and the dedicated F1 desktop/tablet lane both passed. The dedicated
smoke's startup probe now applies a one-second timeout per HTTP attempt so a
single stalled connection cannot consume the complete startup window.

The production build continues to report the existing chunk-size warning
(`760.88 kB`, `218.84 kB` gzip). Local Node 24 also remains newer than the
repository's declared Node 22 baseline. Neither warning was introduced as an F1
functional defect.

Exact-head review found one legacy source-less splash-audio path. Known splash
impacts now provide their source cell, spatial playback preserves the original
`brick`/`hit` sound kind, and source-less acoustic calls retain their legacy
non-spatial playback instead of becoming silent.

## Authority boundary

Exact-head Codex review and Reviewer App review remain before merge. This
package does not authorize merge, deployment, public hosting, production
settings, secrets, billing, tags, announcements, repository settings, or
production telemetry.

## Terminal outcome

`F1_SPATIAL_HEARING_IMPLEMENTED_PENDING_EXACT_HEAD_REVIEW`
