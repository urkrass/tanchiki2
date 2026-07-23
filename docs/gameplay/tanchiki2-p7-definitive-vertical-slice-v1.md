# P7 Definitive Vertical-Slice Mission v1

Status: implementation and local browser validation complete; exact-head review and human gameplay acceptance pending.

Baseline: `9575627ce96836512a74680a7c2d14c5fb408c17` (`origin/main` after the guarded P6 repository preparation).

Working branch: `codex/tanchiki2-p7-definitive-vertical-slice-v1`.

## Product outcome

Campaign Level 10, Signal Scar, is one self-contained assault mission built from the game's existing tactical systems. It does not add a tutorial, debug overlay, parallel combat model, online dependency, or another persistent UI surface.

The player begins behind a three-tank allied screen and must cross a ruined battlefield, manage finite ammunition, exploit visible movement evidence, recover from wrecks or ammunition stations, break an enemy jammer wall, and destroy the northern command core. The battlefield itself communicates the route through roads, soft cover, debris, relays, props, tracks, and short status labels.

## Mission systems

- Fog remains authoritative for the player view. Hidden enemies, props, evidence, and the jammer's exact position do not leak through structured state.
- Three relay towers extend team vision only while owned, powered, and outside an effective hostile jammer radius.
- The northern signal jammer is anchored to a destructible brick cell. It suppresses affected player relays until the anchor is destroyed or an EMP pulse creates a short disruption window.
- A visible jammer communicates state without floating text: active interference emits red static bands and a pulse ring, EMP disruption breaks into cyan electrical flicker, and a destroyed unit loses its transmission and emits a restrained smoke drift. No new panel or inspector was added.
- The Scout ally seeds Decoy and Wire equipment and uses Overdrive to screen the route.
- The Engineer ally seeds Mine and Trap equipment and opens an EMP window unless the player selected EMP, in which case the player keeps that tactical lane.
- The Battle Tank ally operates as a finite-ammunition support battery on the eastern route and deploys its configured Hedgehog support unless the player selected that same Mod lane.
- Dust, gravel, echo, reeds, swamp, soft-cover rustle, and tread tracks expose movement without revealing hidden tank coordinates. Evidence is animated at the affected tile or prop—dust drift, hopping stones, mud ripples, foliage movement, metal sparks, ricochet bursts, or echo waves—rather than emitting a boxed marker or terrain name. Semantic labels remain only in structured state for deterministic QA and non-visual inspection.
- Two ammunition stations and the existing wreck-salvage rules support the ten-shell player limit.
- The mission uses a finite nine-tank allied roster, eighteen enemies, three active allies, and at most five active enemies. The assault ends by destroying the eight-hit-point command core or by exhausting the player's lives and allied reserve.
- Other campaign and test maps keep their existing behavior. A `signal_jammer` prop becomes mechanically active only when its level explicitly supplies a `signalJammers` definition.

## Development and QA route

The deterministic development route is:

```text
?devLevel=signal_scar&autostart=1&tankClass=scout&majorMod=emp&skipSplash=1
```

`tankClass` accepts the current Scout, Engineer, and Battle selections. `majorMod` accepts the existing Major Mods. The route changes no production campaign progression.

The committed browser smoke is:

```powershell
npm.cmd run visual:p7-signal-scar
```

It proves:

- player-selected EMP is not consumed by the scripted Engineer;
- the player can approach, identify, and destroy the jammer through normal movement and firing;
- destroying the jammer restores the signal state to `clear`;
- an Engineer-controlled EMP window appears when the player chooses another Major Mod;
- Scout and Engineer allies place their actual class equipment;
- the AI policy reports no hidden-coordinate leak;
- a 1280 by 711 touch context exposes both side rails, moves through the joystick, and fires through the action rail;
- desktop and tablet runs produce no blocking console or page errors.

Generated browser evidence stays under ignored `output/p7-signal-scar/`.

## Validation evidence

- Focused mission and readability tests: 3 files / 134 tests passed.
- `npm.cmd run validate`: 59 files / 559 tests passed, production build passed, real server SDK integration passed, and all configured harness checks passed.
- `npm.cmd run visual:p7-signal-scar`: desktop jammer breach, allied class cooperation, and tablet control smoke passed with no blocking browser messages.
- `npm.cmd run visual:contrast`: passed.
- `npm.cmd run harness:review-warden:product-repo`: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, zero open blocking debt.
- `npm.cmd run harness:deep-agent:stub-runtime`: `DEEP_AGENT_STUB_COMPLETE_ALLOWED`.
- `git diff --check`: passed.

## Acceptance boundary

Before merge, a person should play the exact pull-request head on desktop and a physical tablet and confirm:

- the opening makes the northern objective and allied roles understandable without explanatory overlays;
- the jammer, EMP window, relay effect, ammunition pressure, and breach result are readable during combat;
- Scout, Engineer, and Battle Tank each remain useful without completing the mission for the player;
- the eight-hit-point core and finite rosters create a fair pacing arc;
- terrain labels, tracks, notices, props, HUD, minimap, and touch rails do not obscure important threats;
- at least two different player classes and Major Mods produce meaningfully different but viable approaches.

This package does not authorize merge, deployment, public hosting, secrets, billing, tags, announcements, repository settings, or production telemetry.
