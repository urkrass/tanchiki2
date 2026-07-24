# Tanchiki2 F5 Portable Player Relays v1

Date: 2026-07-24

Base head: `ac8540e9c1786c3779c2d042a02209715ec98e63`

Status: implementation candidate; no merge, deployment, or public-hosting authority.

## Selected expansion

F5 selects portable player relays as its one online expansion. Major Mods,
persistent Garage loadouts, another online map, and another online mode remain
deferred.

This is not a second game mechanic. Offline and online use
`packages/shared/src/portableRelay.ts` for:

- Scout / Engineer / Battle Tank limits of 1 / 2 / 1;
- same-cell placement and adjacent recovery;
- 1.2-second placement and 0.9-second recovery holds;
- 1.5-second pulses with 32 rays;
- 110-pixel-per-second equivalent propagation;
- 1.8-second wave life;
- two-bounce maximum, 0.55 bounce attenuation, and 0.18 minimum strength;
- one-second wall and hostile contacts;
- the same entering-target, wall, reflection, and decay rules.

Offline retains its pixel coordinate presentation. Online uses cell-world
coordinates. The shared engine accepts the coordinate scale and environment;
it does not duplicate the propagation algorithm.

## Authoritative online path

The protocol is version 5. A client sends only an ordered hold edge:

```text
{ type: "relay", relaySeq, down }
```

The authenticated room slot maps that edge to one player. The server decides:

- whether play is live and the tank is alive;
- whether a sequence is new;
- whether the tank is stationary;
- whether recovery takes precedence within one cell;
- whether class capacity remains;
- whether terrain and the cell are legal;
- when the hold completes;
- relay identity, position, pulse time, wave propagation, and contacts.

The personalized self snapshot acknowledges `lastProcessedSeq`. A reconnecting
or reloaded client resumes above that authoritative value, so an old edge
cannot replay and the first new hold is not mistaken for an old command.

Movement, death, disconnect, or transport loss clears transient relay input.
Placed relays survive ordinary death and reconnection. Player removal removes
owned relays and their transient signals. A rematch creates a fresh match with
no relays, waves, or contacts.

Portable relays and class deployables cannot occupy the same cell. Portable
relays also reject fixed retranslators, another portable relay, an opposing
tank, blocking terrain, and out-of-bounds cells.

## Information model

Physical hearing remains `channel: "physical"`. Portable relay information is
separate:

```text
portableSignals.channel = "relay-radar"
```

Portable relay signals never add a vision circle and never activate fixed
retranslator team vision.

Each personalized snapshot follows these boundaries:

- waves and contacts are limited to the player's team;
- opposing teams retain independent contacts even when their rays strike the
  same wall cell;
- target IDs and relay-source IDs do not leave authoritative state;
- another team's relay body is included only when physically visible;
- team relay bodies may be known, but the renderer still places them below fog;
- transient projection is bounded to 96 nearby wave segments and 48 contacts;
- authoritative simulation is not truncated by presentation limits.

The one-second hostile contact is radar evidence, not a remembered enemy
position. It expires independently and does not enter `lastKnown`.

## Presentation and controls

Desktop uses `E` hold. Tablet reuses the existing Relay control above the
movement joystick. Both controls call the same client command path.

The gameplay hierarchy remains unchanged:

- one dominant battlefield;
- one `E RELAY` slot appended to the existing bottom class strip;
- the existing side-rail Relay control on tablet;
- relay bodies below circular fog;
- signal rays, transient contacts, and the hold prompt above fog;
- no new sidebar, event log, card, or persistent panel.

`render_game_to_text()` exposes relay input, the relay-radar channel, bodies,
contacts, and touch-action availability for deterministic QA.

## Validation contract

Focused evidence covers:

- shared limits, holds, pulse creation, wall reflection, target contact, and
  decay;
- offline compatibility through the shared propagation engine;
- authoritative place, cancel, recover, capacity, collision, sequence, death,
  disconnect, removal, and rematch behavior;
- team-only signal projection, enemy-body fog filtering, anonymous contacts,
  and payload bounds;
- protocol, controller, client, keyboard, tablet side rail, status copy, HUD,
  and fog-safety assertions;
- a two-browser desktop/tablet smoke with own-cell placement, keyboard
  recovery, team signal isolation, hidden enemy-relay filtering, rematch reset,
  screenshots, and room cleanup.

The full offline/online validation, synthetic quick and soak labs,
four-context browser lifecycle, tablet entry, generic web-game client, visual
contrast, Product Review Warden, Deep Agent check, and exact-head review remain
required before the package can reach its human gameplay merge gate.

Human WAN, hosting, provider setup, secrets, billing, DNS, release, and
deployment are outside F5.
