# Battlefield Biomes and Props

## Design Thesis

The battlefield is an interpretive surface, not decorative wallpaper. Terrain, biome skins, props, infrastructure, and debris should help the player read climate, movement evidence, cover, danger, signal infrastructure, and battlefield history.

The foundation pass created taxonomy, manifest structure, placement data, placeholder rendering, tests, and a visual QA map. The Atlas Replacement Pass keeps that taxonomy stable and adds a committed atlas-backed rendering path without attempting final pixel art. The Soft-Cover Vegetation Mechanics pass activates only the existing `soft_cover_vegetation` category as a first prop-backed mechanic.

## Terrain, Props, and Biome Skins

Terrain mechanics are encoded by level row characters and `TileKind`. They drive movement, projectile blocking, destructibility, tracks, sound evidence, and fog readability.

Props are level-placed visual objects with a sprite id, category, biome, mechanical role, and optional collision or cover hints. Most hints remain metadata and readability cues. The current exception is soft-cover vegetation: selected vegetation props can affect detection and evidence without becoming blocking terrain or projectile cover.

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
  "dimensions": { "w": 42, "h": 60 },
  "renderOffset": { "x": 0, "y": -14 },
  "category": "infrastructure_signal",
  "biome": "industrial",
  "mechanicalRole": "infrastructure",
  "collisionHint": "solid",
  "coverHint": "none",
  "tags": ["signal", "relay", "tower", "qa-placeholder"]
}
```

The atlas key `battlefield-props-placeholder` is kept for manifest compatibility, but its path now points to `assets/sprites/battlefield-props.atlas.svg?v=18`. Most props keep their existing 32x32 source rectangles. Tall tree-class blockers and the representative `rock_large`, `bush`, `fuel_barrel`, and `relay_tower` proofs use larger non-overlapping source rectangles where 32px source density is not enough. `dimensions` and optional `renderOffset` describe the visual draw box, not the mechanical footprint.

## Atlas Replacement Pass

The atlas is a committed original SVG sheet on a 384 by 384 coordinate surface. It contains one authored source region for every current battlefield prop id. Most props still use their stable 32x32 source region; larger tree-class blockers and four representative campaign proofs use high-density regions. The cells are object-specific sprites rather than abstract procedural blocks:

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

## Scale And Overhang Polish Pass

The scale pass separates a prop's occupied tile from its visual footprint. Most source rectangles remain 32x32 atlas cells, while visually tall tree-class blockers can use larger source rectangles for better pixel density. Selected large props draw with larger `dimensions` and bottom-aligned `renderOffset` values. This lets trees, large wreckage, rocks, and signal infrastructure look physically larger without changing collision, soft-cover, destruction, fog, online protocol, or placement mechanics.

Review rules:

- the tile coordinate is still the mechanical anchor;
- `source` must remain stable, bounded, and non-overlapping;
- ordinary props should stay in 32x32 atlas cells unless readability proves that insufficient;
- `dimensions` may exceed 32 only when the prop should visibly overhang its tile;
- `renderOffset` should usually keep the prop's base aligned to the occupied tile;
- large props may overlap nearby terrain visually but must not hide tanks, projectiles, objective markers, or evidence cues.

The tree cells were reshaped with irregular crowns, stronger trunks, roots, and less square silhouettes. Large blockers and signal infrastructure now read larger at gameplay scale. Small destructible clutter and non-mechanical decoration remain tile-sized unless a later QA pass proves they need visual overhang.

## Reviewed Sprite Redesign Pass

The follow-up redesign pass used browser-scale review artifacts and an exploratory Figma board before updating the committed SVG atlas. It keeps prop ids, manifest schema, gameplay footprint, renderer, and fallback behavior stable. The first dense-source correction expanded the atlas to 256x256 for tree-class art; the visual-density campaign expands its coordinate surface to 384x384 and adds 48px representative blocker, soft-cover, inactive-hazard, and signal proofs without changing IDs or mechanical anchors.

The art direction moved from placeholder symbols toward grounded battlefield silhouettes:

- trees use larger irregular crowns, stronger trunks, roots, and heavier shadows;
- pine and palm shapes have biome-specific silhouettes instead of generic tree blobs;
- rocks, logs, stumps, sandbags, wreckage, and rubble use faceted or broken outlines so they read as physical objects;
- infrastructure props use mast, antenna, glow, warning, and machinery cues while staying below tank/projectile priority;
- decoration remains quieter, especially `field_lamp`, so non-mechanical props do not compete with tactical signals.

The repository SVG, manifests, deterministic generators, tests, and browser artifacts are the canonical source. Figma is a scenario-review and exploration surface only; it cannot override committed prop ids, source rectangles, behavior, or runtime geometry. The browser route remains the authority for gameplay-scale readability because the renderer applies `dimensions`, `renderOffset`, camera zoom, terrain contrast, fog, and prop-role cues. See `docs/architecture/adr-002-canonical-pixel-density-and-asset-authority.md`.

The dense-source tree follow-up further enlarged and redrew `tree_small`, `tree_large`, `pine`, and `palm` from larger atlas source rectangles. The palm now uses an 80x96 source region with a taller curved trunk and broader layered fronds. The showcase board starts one row lower so tall overhanging props are not judged against the HUD edge. The intent is believable battlefield scale and richer source detail, not extra collision or cover.

A later tree-naturalization cleanup replaced rectangular tree highlight bars and pine snow bands with irregular polygon patches. Tree foliage highlights should read as uneven leaf clusters, and pine snow should sit as broken branch-edge deposits rather than flat stripes.

The same visual language applies to logs and stumps: use rings, knots, cracks, root chips, and small moss/edge accents to make them read as cut or fallen wood rather than plain brown blocks. Keep these details bold enough for 32px gameplay scale.

Rock props should read as faceted stones, not smooth gray mounds. Use angular silhouettes, separated planes, dusty undersides, and a few high-contrast chips so `rock_small` and `rock_large` remain readable blockers at gameplay scale. Dark fracture lines are reserved for the explicit `cracked` variants; moss, snow, angled, and base rocks should read as intact natural stones.

Rock variations use the existing prop instance `variant` field instead of new prop IDs. `rock_small` and `rock_large` each provide `cracked`, `moss`, `snow`, and `angled` source rectangles in the same atlas. Variants can change visual climate and angle, but they inherit the same category, role, dimensions, and mechanical footprint from the base rock prop.

## Explicit Affordance Contract

The manifest taxonomy describes art and authoring history. Runtime claims come from `src/game/assets/battlefield-prop-affordances.json`, which defines all 34 stable prop ids explicitly.

- Collision, projectile blocking, and hard cover are either `none` or `terrain_backed`; prop art never creates a second hidden collision system.
- Only `bush`, `dry_bush`, `reeds_cluster`, and `snow_bush` activate concealment and rustle/fire evidence.
- Destructibility is `none` for every static prop because prop damage is not implemented.
- Hazard-looking barrels, wire, hedgehogs, EMP emitters, and jammers are explicitly inactive.
- Static relay, antenna, generator, EMP, and jammer art is inactive or broken. Functional retranslators and deployables use their existing dedicated runtime paths.
- Props remain unsupported online and never widen the online protocol.
- Every prop uses visible-cell-only fog clipping, including oversized art overhang.

The renderer draws an affordance cue only when the contract supports it. A terrain-backed blocker cue appears only when the anchor tile is both impassable and projectile-blocking; inactive and broken objects use neutral marks instead of cyan signal or yellow hazard claims.

## Soft-Cover Vegetation Mechanics

The first prop-backed gameplay mechanic is documented in:

```text
docs/soft-cover-vegetation-mechanics.md
```

Supported soft-cover ids are read from manifest sprites with `category: "soft_cover_vegetation"` and `mechanicalRole: "soft_cover"`:

- `bush`
- `dry_bush`
- `reeds_cluster`
- `snow_bush`

Rules in short:

- stationary tanks in soft-cover props receive a deterministic concealment multiplier;
- moving tanks receive little practical concealment;
- moving into or out of soft-cover props creates rustle evidence and a temporary disturbed prop state;
- firing from soft cover creates a stronger evidence marker and suppresses concealment briefly;
- soft cover does not add collision, destructibility, pathfinding cost, or projectile blocking.

The dev route is:

```text
http://127.0.0.1:<vite-port>/?devLevel=soft_cover_vegetation_test
```

## Relay Scar Visual-Density Slice

The isolated campaign vertical slice is available at:

```text
http://127.0.0.1:<vite-port>/?devLevel=visual_density_slice
```

Relay Scar is a review route, not a selectable campaign level. It combines the canonical 48px player art, active soft cover, terrain-backed blockers, broken/inactive static objects, one separately functional retranslator, projectiles, objective pressure, and strict circular fog without changing the save schema or online protocol.

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
6. Dynamic tank wrecks, tanks, reload meters, subtle soft-cover tank overlays, projectiles, legacy saved-run powerups, tree canopy overlay, HP bars, and particles.
7. Fog.
8. Evidence overlays, soft-cover rustle markers, signal waves, last-known markers, and hold prompts.

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
src/game/softCoverVegetation.test.ts
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
- soft-cover vegetation ids are sourced from manifest category and role;
- stationary cover, movement rustle, firing reveal, disturbance expiration, and class strength scaling work deterministically;
- the soft-cover dev map references only valid existing prop ids.

## Intentionally Not Included

- Final prop pixel art.
- A map editor.
- New dependencies.
- Engine migration.
- General collision, destruction, pathfinding cost, or projectile-cover mechanics for props.
- Online protocol changes.
- Production deployment, release, tag, or announcement work.

## Recommended Next Pass

1. Run destructible clutter mechanics only if crate/barrel behavior is explicitly authorized.
2. Run signal infrastructure mechanics for relays, generators, EMP emitters, and jammers.
3. Tune AI perception around soft-cover vegetation after more bot scenarios exist.
4. Add gameplay-safe collision/destruction tests before making blocking or destructible props mechanically active.
5. Extend visual contrast checks with representative prop samples after final art exists.
