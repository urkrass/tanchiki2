# Soft-Cover Vegetation Mechanics

## Design Thesis

Soft-cover vegetation is a soft evidence layer, not a wall. It can reduce detection confidence for a disciplined stationary tank, but movement and firing disturb the vegetation and create readable risk.

This follows the Tanchiki2 loop:

```text
action -> evidence -> interpretation -> risk -> decision
```

## Supported Prop IDs

The source of truth is the battlefield prop manifest. A prop participates only when it has:

- `category: "soft_cover_vegetation"`
- `mechanicalRole: "soft_cover"`

Current supported ids:

- `bush`
- `dry_bush`
- `reeds_cluster`
- `snow_bush`

No new prop ids or art were added in this pass.

## Concealment Rules

Stationary tanks overlapping a supported soft-cover prop receive a deterministic visibility-radius multiplier of `0.68`.

Moving tanks in soft cover use a weak multiplier of `0.94`, which means movement gives little practical concealment.

Firing from soft cover suppresses concealment for `1.25` seconds. Very close vision still detects a tank even when the tank is stationary in cover, so soft cover creates uncertainty rather than full invisibility.

The existing terrain visibility multiplier is preserved. Soft-cover props layer on top of that logic through the same offline visibility path used by player vision and bot perception.

## Movement and Rustle

Moving into or out of a supported soft-cover prop creates a temporary disturbance:

- a `rustle` terrain evidence marker;
- a `softCover.disturbances` snapshot entry;
- a short visual vegetation movement cue on the prop.

Default disturbance duration is `3` seconds. Disturbance strength is deterministic:

- Scout: lighter disturbance.
- Engineer or classless tanks: medium disturbance.
- Battle Tank or heavy class hook: stronger disturbance.
- `dry_bush` is louder, `reeds_cluster` is slightly louder, and `snow_bush` is slightly quieter.

## Firing and Reveal

Firing from a supported soft-cover prop creates a stronger `COVER SHOT` rustle marker, records a firing disturbance, and suppresses concealment for `1.25` seconds.

The shot itself still follows the existing reload, shell, muzzle flash, projectile, and sound rules. This pass does not change weapon balance.

## Rendering

Rendering remains single-canvas and minimal:

- disturbed vegetation receives short-lived rustle strokes over the prop;
- firing disturbance adds a small high-contrast cue;
- tanks currently concealed by soft cover receive a subtle vegetation edge overlay.

No new dashboard UI, inspector, or map editor was added.

## Test Map

Open the dev route:

```text
http://127.0.0.1:<vite-port>/?devLevel=soft_cover_vegetation_test
```

The level id is `9004` and the slug is `soft_cover_vegetation_test`. It includes baseline ground plus `bush`, `dry_bush`, `snow_bush`, and `reeds_cluster` placements with room to enter, stop, move, and fire.

`render_game_to_text()` exposes:

- `softCover.supportedPropIds`
- `softCover.active`
- `softCover.disturbances`
- existing `terrainEvidence` rustle markers

## Fog and AI Limitations

Soft cover uses the current offline visibility model. It does not reveal hidden tanks through fog. Disturbances are visible to the player when they belong to the player side or when the disturbed prop cell is visible through existing vision.

Bots that use the existing visibility path are affected by the same concealment multiplier. There is no broader AI perception rewrite in this pass.

Online multiplayer protocol and server fog filtering are intentionally unchanged.

## Not Included

- General prop collision.
- Projectile blocking or projectile cover.
- Prop HP or destruction.
- New prop ids or art.
- New terrain mechanics.
- Map editor support.
- Online/server protocol changes.

## Next Recommended Pass

Proceed with one bounded mechanics pass:

1. Destructible clutter mechanics.
2. Signal infrastructure mechanics.
3. AI perception tuning for soft cover after more bot scenarios exist.
