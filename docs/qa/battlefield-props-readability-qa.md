# Battlefield Props Readability QA

## Context

Date: 2026-07-04

Branch: `codex/tanchiki2-battlefield-props-readability-qa`

Base: `origin/main` at `137ec90405be3b18eb380c1d7e8c1ebda1a3f77e`, which includes the Battlefield Props Visual Polish Pass.

This is a QA/reporting pass. It does not change prop ids, atlas slots, gameplay mechanics, renderer behavior, online protocol, terrain mechanics, or map-editor scope.

## QA Purpose

Core question: can the player quickly read each prop's category, biome, and tactical meaning during normal gameplay?

The review focused on:

- object recognition at gameplay scale;
- category distinction;
- biome distinction;
- silhouette clarity;
- terrain/background contrast;
- infrastructure importance;
- decoration restraint.

## Atlas And Manifest Check

| Check | Result |
| --- | --- |
| Atlas path | `public/assets/sprites/battlefield-props.atlas.svg` |
| SVG dimensions | `256x160` |
| SVG viewBox | `0 0 256 160` |
| Manifest cell size | `32x32` |
| Manifest grid | 8 columns x 5 rows |
| Manifest sprites | 34 |
| SVG prop groups | 34 |
| Missing SVG groups | 0 |
| Source slot mismatches | 0 |
| Biomes represented | `temperate`, `swamp`, `snow`, `desert_dust`, `industrial`, `ruined_battlefield` |
| Categories represented | `blocking_natural`, `soft_cover_vegetation`, `destructible_clutter`, `battlefield_debris`, `infrastructure_signal`, `decoration` |

## Screenshot Evidence

Screenshots are output artifacts and are not intended to be committed as binary repo assets.

| Artifact | Purpose |
| --- | --- |
| `output/battlefield-props-readability-qa/client/shot-1.png` | Required game-client full canvas capture at normal gameplay scale. |
| `output/battlefield-props-readability-qa/showcase-full-canvas.png` | Full canvas capture from a targeted Playwright smoke. |
| `output/battlefield-props-readability-qa/showcase-arena-normal-scale.png` | Arena-only crop at normal gameplay scale. |
| `output/battlefield-props-readability-qa/prop-board-crop-3x.png` | 3x crop of the prop rows for manual readability inspection. |
| `output/battlefield-props-readability-qa/smoke-state.json` | `render_game_to_text()` state used for coverage confirmation. |

Smoke state:

- `mode`: `playing`
- `propsTotal`: 34
- `propsVisible`: 34
- `fogHidden`: 0
- all six biomes represented
- all six categories represented
- no browser error file produced

## Summary Verdict

The atlas is usable for QA and normal gameplay readability. No prop is blank, invisible, broken, or obviously misaligned. Biome identity is broadly readable, and infrastructure props are now more important-looking than ordinary decoration.

The main issue is not an atlas slot break; it is a showcase readability issue: `fallen_log_vertical` is rendered with a 90 degree instance rotation in the QA map, so the route does not visibly prove the vertical-log sprite at gameplay scale. That should be fixed before treating the showcase as a complete prop-cell proof board.

Rating counts:

| Rating | Count |
| --- | ---: |
| `pass` | 24 |
| `minor` | 9 |
| `major` | 1 |
| `blocker` | 0 |

## Category Readability

`blocking_natural` is generally clear because trees, palms, pines, rocks, and logs use dark bases and heavier silhouettes. The small tree is readable, but its square canopy is close to the bush vocabulary and would benefit from a less boxy crown.

`soft_cover_vegetation` reads softer than blockers overall. Reeds, dry bush, and snow bush are distinct. The temperate `bush` is the weakest because it sits on a busy green ground and loses edge contrast at normal scale.

`destructible_clutter` reads well for crates and fuel barrel. `stump` is natural clutter rather than battlefield clutter and reads after brief inspection, but its compact brown form can be mistaken for a small crate.

`battlefield_debris` is mostly strong. Craters, roadblock, hedgehog, and tank wreck are readable. `rubble_pile` and `broken_turret` read as debris after inspection, but both could use stronger object-specific shapes.

`infrastructure_signal` is readable and appropriately important. Cyan signal accents work. `portable_relay` and `broken_relay` are the least immediate because their silhouettes are low and can look like small equipment/debris.

`decoration` remains lower priority because the renderer reduces decoration opacity. `field_lamp` is still fairly bright due to the yellow lamp head, so it should be kept visually below signal infrastructure in future polish.

## Biome Readability

`temperate` reads through green/brown tree and log language, but green props on the dense grass ground need stronger outlines.

`swamp` reads well through dark reeds, vertical wetland shapes, and murky greens.

`snow` reads clearly through white/blue snow fields, pine highlights, and snow bush caps.

`desert_dust` reads clearly through sand/ochre ground, palm, dry bush, and dusty rocks.

`industrial` reads clearly through gray metal tiles, crates, generator shapes, cyan signal cues, and yellow warning accents.

`ruined_battlefield` reads through rust, char, craters, wreckage, rubble, and broken signal objects. Some debris shapes still share the same low brown/black mass and need stronger silhouettes in the next targeted art pass.

## Infrastructure Readability

| Prop | QA note |
| --- | --- |
| `relay_tower` | Pass. Tall mast and cyan signal bars read as infrastructure. |
| `portable_relay` | Minor. Reads as equipment, but the antenna could be taller for faster recognition. |
| `broken_relay` | Minor. Damaged signal cue is present, but the slumped mast reads as generic debris until inspected. |
| `antenna_mast` | Pass. Thin tall mast and cyan bars read immediately. |
| `generator` | Pass. Box, panel, and caution block read as machinery. |
| `emp_emitter` | Pass. Cyan emitter and hazard cue make it mechanically important. |
| `signal_jammer` | Pass. Red/cyan signal bars and mast read as special infrastructure. |
| `field_lamp` | Minor. It reads as a lamp, but the bright yellow head is close to objective/signage salience for decoration. |

## Prop-Specific Review

| Prop id | Biome | Category | Mechanical role | Rating | Issue summary | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tree_small` | `temperate` | `blocking_natural` | `blocking` | `minor` | Reads as a small tree, but square canopy can overlap the bush language. | Break up the canopy edge or strengthen trunk contrast. | P2 |
| `tree_large` | `temperate` | `blocking_natural` | `blocking` | `pass` | Clear tree silhouette with heavier blocking mass. | None required. | P3 |
| `pine` | `snow` | `blocking_natural` | `blocking` | `pass` | Conifer shape and snow caps read immediately. | None required. | P3 |
| `palm` | `desert_dust` | `blocking_natural` | `blocking` | `pass` | Palm fronds and angled trunk separate it from temperate trees. | None required. | P3 |
| `stump` | `temperate` | `destructible_clutter` | `destructible` | `minor` | Reads after inspection; compact brown block can look crate-like. | Add a stronger top ring or jagged cut silhouette. | P2 |
| `fallen_log_horizontal` | `temperate` | `blocking_natural` | `blocking` | `pass` | Horizontal log reads clearly. | None required. | P3 |
| `fallen_log_vertical` | `temperate` | `blocking_natural` | `blocking` | `major` | The showcase instance rotates it 90 degrees, so the vertical sprite is not proven at gameplay scale. | Remove the QA-map rotation override or add a separate unrotated vertical showcase instance. | P1 |
| `rock_small` | `desert_dust` | `blocking_natural` | `blocking` | `pass` | Small faceted rock reads as a hard blocker. | None required. | P3 |
| `rock_large` | `desert_dust` | `blocking_natural` | `blocking` | `pass` | Large rock has clear mass and outline. | None required. | P3 |
| `reeds_cluster` | `swamp` | `soft_cover_vegetation` | `soft_cover` | `pass` | Vertical wetland shape reads as reeds. | None required. | P3 |
| `bush` | `temperate` | `soft_cover_vegetation` | `soft_cover` | `minor` | Reads as vegetation, but blends into the green battlefield ground. | Increase outline separation or lighten inner foliage. | P2 |
| `dry_bush` | `desert_dust` | `soft_cover_vegetation` | `soft_cover` | `pass` | Dry ochre palette and twig shape read clearly. | None required. | P3 |
| `snow_bush` | `snow` | `soft_cover_vegetation` | `soft_cover` | `pass` | Snow cap and blue-white palette are clear. | None required. | P3 |
| `crate_wood` | `industrial` | `destructible_clutter` | `destructible` | `pass` | Wood crate X-bracing reads immediately. | None required. | P3 |
| `crate_metal` | `industrial` | `destructible_clutter` | `destructible` | `pass` | Metal crate and caution band read as clutter. | None required. | P3 |
| `fuel_barrel` | `industrial` | `destructible_clutter` | `hazard` | `pass` | Red barrel and hazard cue read clearly. | None required. | P3 |
| `sandbags` | `desert_dust` | `battlefield_debris` | `soft_cover` | `minor` | Reads as cover after inspection, but bag segments are small. | Emphasize individual rounded bags or add a stronger stacked contour. | P2 |
| `barbed_wire` | `ruined_battlefield` | `battlefield_debris` | `hazard` | `pass` | Wire posts and hazard cue read clearly. | None required. | P3 |
| `tank_wreck` | `ruined_battlefield` | `battlefield_debris` | `blocking` | `pass` | Wreck hull and cannon read as battlefield history. | None required. | P3 |
| `broken_turret` | `ruined_battlefield` | `battlefield_debris` | `evidence_surface` | `minor` | Reads as broken equipment after inspection; turret silhouette is low. | Widen the turret ring or lengthen the broken barrel. | P2 |
| `crater_small` | `ruined_battlefield` | `battlefield_debris` | `evidence_surface` | `pass` | Dark circular mark reads as crater and stays lower priority than tanks. | None required. | P3 |
| `crater_large` | `ruined_battlefield` | `battlefield_debris` | `evidence_surface` | `pass` | Larger crater is distinct and not too loud. | None required. | P3 |
| `rubble_pile` | `ruined_battlefield` | `battlefield_debris` | `blocking` | `minor` | Reads as rubble, but could be confused with rock debris. | Add angular brick/metal shards with a stronger pile outline. | P2 |
| `roadblock` | `ruined_battlefield` | `battlefield_debris` | `blocking` | `pass` | Yellow/red barricade reads immediately. | None required. | P3 |
| `czech_hedgehog` | `ruined_battlefield` | `battlefield_debris` | `hazard` | `pass` | Anti-tank X silhouette is clear. | None required. | P3 |
| `relay_tower` | `industrial` | `infrastructure_signal` | `infrastructure` | `pass` | Tall tower, cyan signal cues, and base read as important infrastructure. | None required. | P3 |
| `portable_relay` | `industrial` | `infrastructure_signal` | `infrastructure` | `minor` | Reads as signal gear, but its low body can look like generic equipment. | Raise or brighten the antenna silhouette. | P2 |
| `broken_relay` | `ruined_battlefield` | `infrastructure_signal` | `evidence_surface` | `minor` | Broken signal object reads after inspection; damage silhouette is not immediate. | Keep the slumped mast but add clearer broken antenna forks. | P2 |
| `antenna_mast` | `industrial` | `infrastructure_signal` | `infrastructure` | `pass` | Thin mast and cyan bars read immediately. | None required. | P3 |
| `generator` | `industrial` | `infrastructure_signal` | `infrastructure` | `pass` | Generator box and panel are recognizable. | None required. | P3 |
| `emp_emitter` | `industrial` | `infrastructure_signal` | `hazard` | `pass` | Cyan emitter plus warning cue reads as special hazard/infrastructure. | None required. | P3 |
| `signal_jammer` | `industrial` | `infrastructure_signal` | `hazard` | `pass` | Mast and red/cyan signal bars read as jammer. | None required. | P3 |
| `field_lamp` | `industrial` | `decoration` | `decoration` | `minor` | Reads as a lamp, but bright yellow can compete with functional cues. | Slightly reduce lamp-head saturation or keep it lower contrast than signal props. | P2 |
| `warning_sign` | `ruined_battlefield` | `decoration` | `decoration` | `pass` | Warning triangle reads and remains understandable as non-mechanical. | None required. | P3 |

## Top 5 Recommended Visual Fixes

1. `fallen_log_vertical`: fix the showcase rotation so the route proves a vertical log at gameplay scale.
2. `bush`: increase edge contrast against grass and swamp-like ground.
3. `stump`: add a more obvious cut-ring/jagged stump cue so it does not read like a small crate.
4. `portable_relay` and `broken_relay`: strengthen antenna silhouettes for faster infrastructure recognition.
5. `field_lamp`: reduce decorative brightness enough that it stays below signal infrastructure and objective markers.

## What Should Not Change Yet

- Do not add prop ids.
- Do not change atlas source slots.
- Do not add prop collision, cover, destruction, or hazard mechanics.
- Do not change online/server protocol.
- Do not rewrite the renderer.
- Do not turn the showcase into a finished map.
- Do not add a map editor.

## Limitations

The showcase gives useful mixed-background evidence because props appear over grass, snow, desert, metal, swamp/reeds, brick, and road-like areas. It is still not a full contrast matrix: every prop is not shown over every likely biome background. A future QA board should duplicate representative props across multiple terrain backgrounds if contrast becomes the primary review target.

This pass did not perform production art changes. All recommendations are for a future targeted visual fix pass.

## Recommended Next Pass

Run a targeted Visual Fix Pass for the `major` and highest-impact `minor` findings before starting new prop mechanics. Scope it to the existing cells only, with no new ids and no mechanics changes.
