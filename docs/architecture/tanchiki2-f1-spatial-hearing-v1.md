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

Hidden physical terrain evidence now uses the same projected hearing gain for
its animation strength. A nearby hidden rustle is strong, the same rustle fades
through mid and edge range, and an out-of-range rustle produces no battlefield
animation. Visible evidence keeps its original exact-source strength. This
prevents remote enemy activity from filling fog with equally prominent cues
without weakening relay or radar information.

Desktop and tablet screenshots were inspected after the dedicated Signal Scar
smoke. Both retain the established battlefield/HUD hierarchy, tablet controls
remain visible, and no hidden exact-source data appears in structured state.

Short directional cues also enter a bounded 2.5-second accessibility queue
before audio mute/volume policy is applied. The regular half-second live-region
cycle therefore cannot miss a 0.45-second impact or shot cue, and muting audio
does not disable equivalent screen-reader information. Offline and online
queues both expire and cap old entries; tutorial narration retains priority.

## Human acceptance range

Signal Scar remains the representative gameplay integration route, but combat,
movement, and allied activity make it a poor instrument for judging hearing
and fog-of-war visuals. F1 therefore includes a development-only `Acoustic Lab`
at:

`?devLevel=acoustic_range&autostart=1&skipSplash=1`

The map is not campaign content and its route is unavailable when
`import.meta.env.DEV` is false. It contains no active enemies. The listener stays
at one fixed central booth while Left/Right, or the tablet joystick, selects one
of five sources:

1. visible reference at 2 cells: full exact-source rustle;
2. hidden source at 4 cells: strong approximate cue in fog;
3. hidden source at 5 cells: medium approximate cue in fog;
4. hidden source at 6 cells: faint approximate cue in fog;
5. hidden source at 7.1 cells: no audio or visual clutter.

Every station emits the same rustle kind and `1.5` intensity, so distance is the
only changing variable. Space, Fire, or the tablet `PLAY CUE` control emits once
without firing a shell. There is no automatic teleport or countdown. One
compact guide strip shows the selected distance, expected or observed visual,
and controls; it adds no dashboard, event log, or competing panel.

`render_game_to_text()` exposes the station, fixed listener/source cells,
distance, expected visual, pulse count, and currently observed projected
strength/precision. This state makes browser and human acceptance deterministic
while the shared production hearing projection remains the sole attenuation
authority.

## Validation

| Lane | Result |
| --- | --- |
| Focused visual-lab, terrain-projection, and soft-cover privacy suite | PASS at 3 files / 21 tests |
| Dedicated Acoustic Lab unit/runtime suite | PASS; fixed listener, manual selection, exact/directional projection, monotonic attenuation, cutoff, and projectile-free replay green |
| Full `npm.cmd run validate` | PASS at 66 files / 594 tests; build, server integration, and configured attended-v2 checks green |
| `npm.cmd run visual:f1-hearing-range` | PASS on desktop and tablet; five stations, keyboard/touch selection and replay, measured `1.5 -> 0.75 -> 0.38 -> 0.18 -> none` visuals, real fog, and empty blocking browser logs |
| `npm.cmd run visual:f1-spatial-hearing` | PASS on desktop and tablet; physical/signal separation, firing, controls, and hidden-source safety green |
| Bundled generic web-game client | PASS on the Acoustic Lab route; manual selection reached the hidden mid station with `0.38` directional evidence and zero shells, with screenshot and structured state inspected |
| `npm.cmd run visual:contrast` | PASS |
| Product Review Warden | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; zero open blocking debt |
| Deterministic Deep Agent stub runtime | `DEEP_AGENT_STUB_COMPLETE_ALLOWED` |
| `git diff --check` | PASS |

The dedicated desktop/tablet lane and a short deterministic generic-client run
both passed. The dedicated smoke's startup probe applies a one-second timeout
per HTTP attempt so a single stalled connection cannot consume the complete
startup window.

The production build continues to report the existing chunk-size warning
(`760.88 kB`, `218.84 kB` gzip). Local Node 24 also remains newer than the
repository's declared Node 22 baseline. Neither warning was introduced as an F1
functional defect.

Exact-head review found one legacy source-less splash-audio path. Known splash
impacts now provide their source cell, spatial playback preserves the original
`brick`/`hit` sound kind, and source-less acoustic calls retain their legacy
non-spatial playback instead of becoming silent.

A later exact-head review found that geometric tile visibility could incorrectly
upgrade sound and evidence from a soft-cover-concealed tank to exact precision.
Terrain projection now preserves an approximate source marker even when its
underlying tile is inside the vision circle. Offline hearing also consults the
same actor visibility decision used to filter hostile tanks and retains a
bounded directional-only event constraint when the concealed actor has already
left the emitting cell. A regression places a concealed hostile beside its
visible prior bush tile and proves both outputs remain directional and omit the
source cell.

The next exact-head review found that the half-second accessibility refresh
could miss shorter projected cues. Directional cues now enter independent,
bounded, expiring announcement queues in both offline and online play. Focused
regressions prove a cue remains announceable after leaving the live snapshot
and that the online queue consumes it exactly once.

A late prior-head review also found that ricochet paths queued an impact
directly and then emitted the same impact again through terrain evidence.
Ricochet evidence is now the single sound/hearing emitter, with a regression
proving one hit event per bounce.

The final exact-head review found that the physical-hearing gate could suppress
a visible distorted echo marker because echo is signal evidence without an
acoustic cue. Non-acoustic evidence now follows marker visibility, while
physical evidence continues to require source visibility or local audibility.
A regression keeps a visible distorted echo at its approximate marker cell.

## Authority boundary

Exact-head Codex review and Reviewer App review remain before merge. This
package does not authorize merge, deployment, public hosting, production
settings, secrets, billing, tags, announcements, repository settings, or
production telemetry.

## Terminal outcome

`F1_SPATIAL_HEARING_IMPLEMENTED_PENDING_EXACT_HEAD_REVIEW`
