# Visual Density Campaign QA

Date: 2026-07-19
Branch: `codex/tanchiki2-pixel-density-campaign`
Base: `d383090e37f9e16e2bbc606f97ec1f26acf6aaf7`

## Decision

48px is the canonical density for new player-class sprites and representative high-information prop redraws. The inspected actual-1x comparison shows that 48px preserves the 13 by 13 camera and mobile composition while exposing class and equipment structure. The 64px candidate occupies too much local cluster space.

The repository is canonical. SVG/PNG atlases, JSON manifests, deterministic generators, tests, and browser artifacts define runtime truth. Figma is review and exploration only.

## Review Surfaces

| Surface | Route | Evidence |
| --- | --- | --- |
| Pixel density comparison | `?visualQa=pixel_density_comparison` | `output/pixel-density-campaign/runtime-comparison-5207/` |
| Player Combat Matrix | `?visualQa=player_combat_matrix` | `output/pixel-density-campaign/player-combat-matrix/` |
| Prop Affordance Board | `?visualQa=prop_affordance_board` | `output/pixel-density-campaign/prop-affordance-board/` |
| Relay Scar vertical slice | `?devLevel=visual_density_slice` | `output/pixel-density-campaign/relay-scar-repro/` |

All four routes were captured with the repository-required Playwright game client. Their `render_game_to_text` artifacts report integer Canvas2D coordinates, smoothing disabled for the QA boards, and no browser error file.

The three Relay Scar repetition screenshots have identical SHA-256 hashes. A transient dark preview shown by the local image viewer was therefore a preview-cache artifact, not a differing canvas frame.

## Player Contract

- Scout: narrow hull and tracks with a tall sensor mast.
- Engineer: modular chassis with visibly asymmetric field equipment.
- Battle Tank: wide heavy hull, large turret, and permanent armor identity.
- Team fill/rim, class structure, armor, damage, cosmetic wear, self, shield, focus, and reload use separate layers or channels.
- Status channels render after soft-cover overlays so vegetation cannot erase player identity or shield state.
- Cosmetics may change only internal texture, camouflage, wear, decals, and small non-critical details.

The Player Combat Matrix contains 48 actual-1x scenarios: three classes, four directions, and four team/state rows. It covers blue, red, color-safe cyan, color-safe amber, idle/movement frames, self, shield, armor, damage, focus, reload, open/grass/industrial/snow/fog-edge/soft-cover backgrounds, projectiles, muzzle flashes, hits, and signal objects.

## Prop Contract

`src/game/assets/battlefield-prop-affordances.json` contains one explicit record for each of the 34 stable IDs.

- Only the four existing soft-cover vegetation IDs activate concealment and rustle/fire evidence.
- Hard blocking is terrain-backed and its cue appears only on impassable projectile-blocking anchor terrain.
- Static props do not claim destructibility or online support.
- Hazard-looking static art is inactive.
- Static signal art is inactive or broken; functional retranslators and deployables remain on dedicated runtime paths.
- All prop overhang is clipped to the union of currently visible fog cells.

The atlas coordinate surface is now 384 by 384. `rock_large`, `bush`, `fuel_barrel`, and `relay_tower` use representative 48px source regions while all 34 IDs and one-tile mechanical anchors remain stable.

## Relay Scar Slice

Relay Scar is an isolated 21 by 17 offline level definition at `src/game/visualDensitySlice.ts`. It is not inserted into the campaign selection or save schema.

The player starts concealed in a real bush near explicitly broken relay art, an inactive barrel, craters, and decoration. Terrain-backed blocker art is anchored only to terrain that already blocks movement and projectiles. A separate live retranslator begins outside player vision and remains absent from visible snapshots until discovered. Circular fog reports hidden cells and does not leak the live relay or distant props.

The route does not add online messages, shared protocol fields, persistence schema, release actions, or production navigation.

## Validation

- `npm run assets:validate`: pass, 24 generated 48px player sprites synchronized.
- `npm run test`: pass, 24 files and 264 tests.
- `npm run build`: pass.
- `npm run server:smoke`: pass.
- `npm run visual:contrast`: pass.
- `npm run harness:validate`: pass.
- `npm run harness:smoke`: pass.
- `npm run harness:reviewer-app:dry-run`: pass.
- `npm run harness:deep-agent:stub-runtime`: `DEEP_AGENT_STUB_COMPLETE_ALLOWED`.
- `npm run harness:review-warden:product-repo`: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`.
- Mobile touch smoke: pass for gameplay, held movement/fire, multi-touch release, and pause/restart.
- `git diff --check`: pass with only repository-normal CRLF conversion warnings.

The local attended-v2 lifecycle validator passed and identified the expected telemetry source commit as `69df33aafbe6f2738b87419d449fd3ee4f84f018`. The live branch safety check then found `codex/mar-693-empty-base` had moved to `9d433dd871cc70b77c57245acaa15ad26e965672`, 253 commits ahead, with no remaining branch or tag at the expected commit. No unverified workflow was dispatched.

## Remaining Inactive Mechanics And Risks

- Static prop destruction, hazards, EMP/jammer behavior, and online prop synchronization remain intentionally inactive.
- The 20px classless online player path remains a compatibility lane; it does not yet receive the new three-class silhouettes.
- 48px gameplay art can overlap more neighboring terrain than the legacy 26px body. Collision remains unchanged, so future map art should continue testing crowded lanes and fog edges.
- The prop SVG now has a larger coordinate surface but is not yet generated. A future package may add a deterministic prop-atlas generator after the 34-cell art direction stabilizes.
- The telemetry wrapper’s expected ref is stale relative to live GitHub state. Dispatch must remain blocked until the harness contract is refreshed or an immutable ref to the expected commit is restored.

Recommended next package: refresh the consumer-pinned attended-v2 telemetry contract through the harness governance lane, then request exact-head human visual review of the Tanchiki2 PR. Do not merge or publish from this package.
