# Battlefield Biomes and Props

## Design Thesis

The battlefield is an interpretive surface, not decorative wallpaper. Terrain, biome skins, props, infrastructure, and debris should help the player read climate, movement evidence, cover, danger, signal infrastructure, and battlefield history.

The foundation pass created taxonomy, manifest structure, placement data, placeholder rendering, tests, and a visual QA map. The Atlas Replacement Pass keeps that taxonomy stable and adds a committed atlas-backed rendering path without changing prop mechanics or attempting final pixel art.

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

The committed atlas asset lives at:

```text
public/assets/sprites/battlefield-props.atlas.svg
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

The atlas key `battlefield-props-placeholder` is kept for manifest compatibility, but its path now points to `assets/sprites/battlefield-props.atlas.svg?v=2`. Each prop keeps its original 32x32 source rectangle so existing ids and reserved atlas slots remain stable.

## Atlas Replacement Pass

The atlas is a deterministic original SVG sheet arranged on the existing 8-column, 32px cell grid. It contains one authored cell for every current battlefield prop id. The cells are still placeholder-quality art, but they are object-specific sprites rather than abstract procedural blocks:

- trees, palms, stumps, and logs use readable trunk and foliage silhouettes;
- rocks, rubble, wrecks, craters, and roadblocks use gray, rust, and debris shapes;
- reeds, bushes, dry bushes, and snow bushes are visually separated by biome palette;
- crates, barrels, generators, relays, antennas, EMP, and jammer props include infrastructure or hazard cues;
- decorations such as field lamps and warning signs remain visually lower priority.

To add a new prop sprite later:

1. Add the new id to the manifest and TypeScript id list in the same pass.
2. Reserve a non-overlapping `source` rectangle in the atlas grid.
3. Draw the original SVG cell at that rectangle in `battlefield-props.atlas.svg`.
4. Set `dimensions` to the intended display size, usually 32x32 for tile props.
5. Assign the existing biome, category, and mechanical role vocabulary unless a separate taxonomy pass expands it.
6. Add or update tests so the showcase map and manifest validation cover the new id.

The renderer loads the atlas once through `src/game/battlefieldPropAtlas.ts`. If the image is not ready, fails to load, or a sprite rectangle is invalid, the renderer falls back to the procedural placeholder plan from `src/game/battlefieldProps.ts`. Startup remains non-blocking.

## Visual Polish Pass

The visual polish pass keeps the atlas dimensions, manifest ids, source rectangles, and renderer behavior unchanged. It improves the existing cells by sharpening silhouettes, adding object-specific internal structure, and separating biome palettes at gameplay scale.

Visual language rules:

- natural blockers use heavier trunks, faceted rocks, and darker undersides than soft cover;
- soft-cover vegetation uses lighter, more porous forms, with reeds kept vertical and wetland-specific;
- destructible clutter uses readable crates, metal edges, barrels, and caution marks without adding mechanics;
- battlefield debris uses rust, char, broken metal, crater rims, rubble, and anti-tank silhouettes;
- signal infrastructure uses angular metal, antenna shapes, cyan signal cues, and restrained yellow hazard accents;
- decorations remain lower priority than infrastructure and gameplay-critical tanks/objectives.

Biome palette notes:

- temperate: green foliage, brown trunks, ordinary logs and bushes;
- swamp: darker greens, mud bases, reeds, and wet highlights;
- snow: white and blue caps on cold vegetation and conifers;
- desert/dust: ochre, sand, dry brush, palms, and dusty rocks;
- industrial: gray metal with yellow/black caution accents;
- ruined battlefield: charred dark silhouettes, rust, broken components, craters, and rubble.

To review readability, inspect `?devLevel=battlefield_biomes_props` at normal gameplay zoom and confirm each category reads before looking at the manifest name. No cell should be blank, misaligned, or visually louder than tanks, objective markers, or projectiles.

This remains placeholder-quality original SVG art. It is more readable than the first atlas-backed pass, but it is not a final pixel-art production pass.

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
3. Atlas-backed manifest props, with procedural placeholder silhouettes as fallback.
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
- Atlas placeholder art should be obvious enough for QA, but not polished enough to be mistaken for final art.

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
- committed atlas asset path;
- committed atlas dimensions and source-slot transforms;
- positive, bounded, non-overlapping atlas source rectangles;
- invalid atlas source data failures;
- required biome/category/role coverage;
- all initial prop examples exist;
- placeholder fallback plans exist for missing or unresolved atlas art;
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

1. Run a prop readability QA pass with screenshots and contrast notes before adding new ids.
2. Integrate selected terrain evidence with props where the role already supports readability.
3. Pick one mechanics category, such as soft-cover vegetation, destructible clutter, or signal infrastructure, only after a separate mechanics authorization.
4. Add gameplay-safe collision/destruction tests before making blocking or destructible props mechanically active.
5. Extend visual contrast checks with representative prop samples after final art exists.
