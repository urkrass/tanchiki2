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
and fog-of-war visuals. F1 therefore includes a development-only `Acoustic
Field Course`
at:

`?devLevel=acoustic_range&autostart=1&skipSplash=1`

The map is not campaign content and its route is unavailable when
`import.meta.env.DEV` is false. The player drives one continuous eastbound lane
and may stop, reverse, or turn north in the final inspection yard. Water bounds
the lane without attenuating sound. Nine signed checkpoints cover:

1. a visible moving reference with exact-source rustle;
2. hidden near, mid, and edge patrols with progressively weaker directional
   rustles;
3. a moving out-of-range patrol that produces no local sound or marker;
4. one continuous gravel patrol heard before a steel screen, absent while the
   listener is inside it, and heard again after exit;
5. an open inspection yard where the player can approach and reveal a real
   moving patrol tank.

All seven patrols are ordinary `Tank` entities. A small course director only
chooses their next adjacent route cell and endpoint pause. `startMove`,
`updateTankMove`, collision, terrain definitions, fog, evidence creation, and
the shared acoustic projection remain the gameplay authorities. The director
never calls sound or evidence emitters. Paused patrols therefore create no
movement cue, while reeds and gravel create cues only when an actual grid move
finishes. AI fire and player weapons are disabled to keep the observation clean.

One compact guide strip announces the current checkpoint, expected result, and
live observation. It adds no selector, station dashboard, event log, or
competing panel. The tablet keeps its ordinary movement joystick and marks Fire
as disabled.

`render_game_to_text()` exposes dev-only diagnostics for the checkpoint, player,
every actual patrol ID/cell/moving state/route index/cells traversed, current
focus cue and marker, and the three-part wall proof. The rendered battlefield
still receives only the normal fog-filtered enemy list. This makes browser and
human acceptance deterministic without turning diagnostics into gameplay
authority.

## Validation

| Lane | Result |
| --- | --- |
| Dedicated Acoustic Field Course unit/runtime suite | PASS at 5 tests; real movement, endpoint pauses, keyboard travel, distance attenuation, moving cutoff, single-patrol wall proof, disabled projectiles, and reachable inspection yard green |
| Full `npm.cmd run validate` | PASS at 66 files / 597 tests; production build, server integration, and all configured harness checks green |
| `npm.cmd run visual:f1-hearing-range` | PASS on desktop and tablet; nine checkpoints and seven real patrols, measured hidden cue gains `0.45 -> 0.20 -> 0.169 -> none`, matching visual attenuation, complete wall proof, reachable visible patrol, and empty blocking browser logs |
| `npm.cmd run visual:f1-spatial-hearing` | PASS on desktop and tablet; physical/signal separation, firing, controls, and hidden-source safety green |
| Bundled generic web-game client | PASS on the field-course route; ordinary eastbound movement advanced the player while a real patrol produced a normal cue, with screenshot and structured state inspected and no browser-error artifact |

The dedicated desktop/tablet lane and a short generic-client run both pass. The
dedicated smoke's startup probe applies a one-second timeout per HTTP attempt so
a single stalled connection cannot consume the complete startup window.

The production build continues to report the existing chunk-size warning
(`775.07 kB`, `223.01 kB` gzip). Local Node 24 also remains newer than the
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

The follow-up exact-head review found that repeated browser keydown events could
replay the lab cue while Fire remained held. The lab now records Fire as held
until keyup and emits once per press, with a key-repeat regression.

The next exact-head review found that an audible point event with no upstream
distortion could still place a directional marker at its true fogged cell.
Hidden physical evidence now renders only when its stored marker is already
approximate; exact hidden point evidence is omitted rather than leaking a
coordinate. Visible exact evidence and safely distorted hidden evidence retain
their existing paths.

## Authority boundary

Exact-head Codex review and Reviewer App review remain before merge. This
package does not authorize merge, deployment, public hosting, production
settings, secrets, billing, tags, announcements, repository settings, or
production telemetry.

## Terminal outcome

`F1_SPATIAL_HEARING_IMPLEMENTED_PENDING_EXACT_HEAD_REVIEW`
