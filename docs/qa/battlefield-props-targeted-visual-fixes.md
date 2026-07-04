# Battlefield Props Targeted Visual Fixes

## Context

Date: 2026-07-04

Branch: `codex/tanchiki2-battlefield-props-targeted-visual-fixes`

This pass follows `docs/qa/battlefield-props-readability-qa.md`. It is a focused fix pass, not a new art pass or mechanics pass.

## Findings Addressed

| QA finding | Fix |
| --- | --- |
| `fallen_log_vertical` was rotated 90 degrees in the showcase. | Removed the QA-board rotation so the vertical sprite is proven at gameplay scale. |
| `bush` edge contrast was weak on green ground. | Added a stronger irregular dark silhouette and brighter leaf breaks while keeping it soft-cover vegetation. |
| `stump` read too much like a crate. | Reworked the cell into an uneven stump with a cut top, ring cue, and root-like base marks. |
| `portable_relay` and `broken_relay` needed stronger antenna silhouettes. | Raised the portable relay mast/crossbars and made the broken relay's slumped antenna/fork damage more explicit. |
| `field_lamp` was too visually salient for decoration. | Reduced lamp brightness and glow opacity while keeping the lamp readable. |

## Screenshot Evidence

Screenshot artifacts are intentionally kept under ignored `output/` paths:

```text
output/battlefield-props-targeted-visual-fixes/client/shot-1.png
output/battlefield-props-targeted-visual-fixes/showcase-arena-normal-scale.png
output/battlefield-props-targeted-visual-fixes/prop-board-crop-3x.png
```

Expected smoke state:

- `mode`: `playing`
- `propsTotal`: 34
- `propsVisible`: 34
- all six biomes represented
- all six categories represented
- no browser error artifact

## Remaining Limitations

This pass does not perform a full every-prop-on-every-background contrast matrix. Remaining minor QA notes from the readability report, such as `sandbags`, `broken_turret`, and `rubble_pile`, are left for a later visual QA or targeted art pass.

## Next Pass Recommendation

If these targeted fixes pass review, proceed to one mechanics pass: soft-cover vegetation, destructible clutter, or signal infrastructure.
