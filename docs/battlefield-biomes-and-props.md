# Battlefield Biomes and Props

## Design Thesis

The battlefield is an interpretive surface, not decorative wallpaper. Terrain, biome skins, props, infrastructure, and debris should help the player read climate, movement evidence, cover, danger, signal infrastructure, and battlefield history.

This pass creates the asset foundation only. It defines taxonomy, manifest structure, placement data, placeholder rendering, tests, and a visual QA map. It does not attempt final pixel art.

## Terrain, Props, and Biome Skins

Terrain mechanics are encoded by level row characters and `TileKind`. They drive movement, projectile blocking, destructibility, tracks, sound evidence, and fog readability.

Props are level-placed visual objects with a sprite id, category, biome, mechanical role, and optional collision or cover hints. In this pass, those hints are metadata and readability cues. They do not replace terrain collision or add new gameplay mechanics.

Biome skins are visual families such as snow, swamp, desert dust, industrial, and ruined battlefield. Biome identity should change visual interpretation without duplicating movement rules unless a later mechanics package explicitly authorizes it.

## Biomes

Manifest biome ids are normalized for code:

| Display | Manifest id |
| --- | --- |
| Temperate | `temperate` |
| Swamp | `swamp` |
| Snow | `snow` |
| Desert / dust | `desert_dust` |
| Industrial | `industrial` |
| Ruined battlefield | `ruined_battlefield` |

## Prop Categories

| Category | Purpose |
| --- | --- |
| `blocking_natural` | Natural hard silhouettes such as trees, palms, logs, and rocks. |
| `soft_cover_vegetation` | Passable or low-occlusion visual cover such as reeds and bushes. |
| `destructible_clutter` | Crates, barrels, and other clutter intended for later damage rules. |
| `battlefield_debris` | Sandbags, wire, wrecks, craters, rubble, roadblocks, and anti-tank obstacles. |
| `infrastructure_signal` | Relay, antenna, generator, EMP, and jammer objects. |
| `decoration` | Explicitly non-mechanical visual markers such as lamps and signs. |

## Mechanical Roles

Allowed roles:

- `none`
- `blocking`
- `soft_cover`
- `destructible`
- `infrastructure`
- `decoration`
- `evidence_surface`
- `hazard`

The role is a readability and future-mechanics hint. Current gameplay collision still comes from terrain tiles and existing deployable mechanics.

## Naming Conventions

Sprite ids use lowercase snake case:

- Prefer object names: `tree_small`, `relay_tower`, `warning_sign`.
- Use orientation suffixes only when the sprite is authored separately: `fallen_log_horizontal`.
- Use biome-neutral names when the object can be reused across skins.
- Use biome-specific names only when visual identity matters: `snow_bush`, `dry_bush`.

Prop instance ids should be map-local and descriptive, for example `qa-relay-tower` or `north-roadblock-1`.

## Manifest Format

The JSON manifest lives at:

```text
src/game/assets/battlefield-props.manifest.json
```

Each sprite entry includes:

```json
{
  "id": "relay_tower",
  "atlas": "battlefield-props-placeholder",
  "source": { "x": 32, "y": 96, "w": 32, "h": 32 },
  "dimensions": { "w": 32, "h": 32 },
  "category": "infrastructure_signal",
  "biome": "industrial",
  "mechanicalRole": "infrastructure",
  "collisionHint": "solid",
  "coverHint": "none",
  "tags": ["signal", "relay", "tower", "qa-placeholder"]
}
```

The current atlas path is `procedural:fallback`. That means there is no final committed prop sheet yet; Canvas draws simple placeholder silhouettes from the manifest metadata. The `source` rectangles reserve stable placeholder atlas slots for a future real sheet.

## Placement Format

Levels can define props:

```ts
{
  id: 'qa-relay-tower',
  spriteId: 'relay_tower',
  x: 5,
  y: 10,
  rotation: 0,
  variant: 'optional',
  mechanicalRole: 'infrastructure'
}
```

`x` and `y` are tile coordinates. `rotation`, `variant`, and `mechanicalRole` are optional. If `mechanicalRole` is omitted, the manifest role is used.

## Render Layering

Offline Canvas layering is:

1. Battlefield frame and visible terrain.
2. Tread tracks and movement evidence surfaces.
3. Manifest props and procedural placeholder silhouettes.
4. Objective and spawn readability markers.
5. Relays, deployables, and major-mod structures.
6. Tanks, reload meters, projectiles, powerups, tree canopy overlay, HP bars, and particles.
7. Fog.
8. Evidence overlays, signal waves, last-known markers, and hold prompts.

This keeps props above the ground but below tanks, projectiles, and critical objective markers.

## Visual Readability Rules

- Blocking props need a strong base silhouette and dark bottom role cue.
- Soft-cover props should read lighter and more porous than blockers.
- Infrastructure props should include signal/power cues and avoid looking like decoration.
- Decorations use reduced opacity and a weak role cue because they are non-mechanical.
- Hazard props should use high-contrast warning marks.
- Placeholder art should be obvious enough for QA, but not polished enough to be mistaken for final art.

## Visual Test Map

The visual QA board is:

```text
http://127.0.0.1:<vite-port>/?devLevel=battlefield_biomes_props
```

Code location:

```text
src/game/level.ts
```

The level id is `9003` and the slug is `battlefield_biomes_props`. The map is full-visibility on purpose so the prop taxonomy can be inspected without fog hiding most of the QA board. Normal campaign fog is unchanged.

`render_game_to_text()` exposes `battlefieldProps` with manifest version, active biome, total count, visible prop snapshots, category counts, and mechanical role counts.

## Tests

Focused coverage lives in:

```text
src/game/battlefieldProps.test.ts
```

The tests validate:

- manifest validity;
- unique sprite ids;
- required biome/category/role coverage;
- all initial prop examples exist;
- placeholder fallback plans exist for missing art;
- showcase map rows are rectangular;
- all showcase prop references resolve to manifest sprites;
- the dev showcase exposes all initial prop examples through the snapshot.

## Intentionally Not Included

- Final prop pixel art.
- A map editor.
- New dependencies.
- Engine migration.
- New collision, destruction, or cover mechanics for props.
- Online protocol changes.
- Production deployment, release, tag, or announcement work.

## Recommended Next Pass

1. Produce a real prop atlas using the reserved manifest ids and source slots.
2. Add per-biome ground-skin variants only after the visual language is stable.
3. Decide which prop roles should become terrain-backed mechanics and which should remain visual evidence only.
4. Add gameplay-safe collision/destruction tests before making blocking or destructible props mechanically active.
5. Extend visual contrast checks with representative prop samples after final art exists.
