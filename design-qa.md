# Tablet Touch Controls Design QA

## Sources

- Primary tablet reference: `D:\projects\tanchiki\.codex-remote-attachments\019f801b-21b8-70a1-bd9d-ada0fc64a130\14c3a2e5-7511-4b1b-9aa8-9f0273907c6b\1-Photo-1.jpg`
- Secondary tablet reference: `D:\projects\tanchiki\.codex-remote-attachments\019f801b-21b8-70a1-bd9d-ada0fc64a130\14c3a2e5-7511-4b1b-9aa8-9f0273907c6b\2-Photo-2.jpg`
- Implementation idle state: `output/tablet-touch-side-rails/tablet-standard-idle.png`
- Implementation multitouch state: `output/tablet-touch-side-rails/tablet-standard-multitouch.png`
- Functional evidence: `output/tablet-touch-side-rails/summary.json`

## Comparison setup

- Viewport: 1280 x 800, touch-capable landscape tablet.
- State: live gameplay with standard handedness; both idle and simultaneous movement/fire states were captured.
- The primary reference and implementation idle screenshot were inspected together in one comparison input.
- Full-frame comparison was required because the decisive issue was the relationship between unused page margins, the game Canvas, and thumb controls. A crop would hide whether controls obstructed the battlefield.

## Fidelity surfaces

- The game keeps one dominant battlefield Canvas and reuses the quiet page margins as touch rails instead of adding panels.
- Move sits in the left margin and Fire in the right margin at matching vertical thumb positions.
- Relay activation is the existing portable-relay HUD sprite on the left; its hold progress is drawn around that same sprite.
- Major Mod activation is the existing player-tank portrait on the right; placement progress and validity are drawn around that portrait.
- Standard handedness follows the requested left-Move/right-Fire placement. Mirrored accessibility swaps only those two primary rails; Relay and Mod stay attached to their semantic HUD art.
- Phone layouts retain the in-Canvas fallback because they do not have usable side margins; tablet portrait remains protected by the existing rotate gate.

## Iteration findings

### Iteration 1

- The prior layout covered the lower battlefield with four competing circular controls.
- Relay and Mod duplicated information already present in the HUD.
- The game remained narrow despite large unused tablet margins.

### Iteration 2

- Side-rail Move and Fire controls leave the entire battlefield unobstructed and align with natural two-thumb reach.
- Direct HUD targets remove the duplicated Relay and Mod plates while retaining visible hold and invalid-placement feedback.
- The Canvas is larger than in the supplied tablet capture while keeping sufficient margin for comfortable controls.
- Pixel labels, rings, minimap, pause, dialogue, and bottom equipment strip are not clipped or overlapped.
- Automated standard, mirrored, multitouch, Relay, all Major Mods, portrait gate, and phone fallback checks passed with no blocking console errors.

## Final result

passed

## Follow-up: tablet touch tidy v2

- Follow-up reference: `D:\projects\tanchiki\.codex-remote-attachments\019f801b-21b8-70a1-bd9d-ada0fc64a130\f0433fc7-386e-4d82-968a-c685016cbc6c\1-Photo-1.jpg`.
- Reproduced at the reference's effective browser viewport, 1280 x 711, rather than relying only on a full-height emulator.
- Fixed the side-rail joystick base in place and reduced its complete footprint. At maximum travel, the 15px knob plus 24px offset remains strictly inside the 44px base radius.
- Reduced Move and Fire chrome while preserving the existing generous rail hit surfaces.
- Tightened the tank-portrait action ring from 22px to 18px and removed the redundant lower `MOD` label. Lives and Major Mod status copy now have uninterrupted spacing.
- Replaced ambiguous mixed-device confirmation copy with touch-specific `TAP BRIEFING TO ADVANCE`; a real Playwright touchscreen tap advances exactly one order and starts the camera tour after the second order.
- Inspected evidence: `output/tablet-touch-tidy-v2/focused-rerun/tablet-briefing-before-tap.png`, `tablet-fixed-joystick.png`, and `tablet-tidy-mod-target.png`. The focused summary reports no blocking console messages.

Follow-up result: passed

## Follow-up: remote tablet interaction v3

- Kept one dominant battlefield Canvas and reused the existing side rails; no new panel or combat overlay was added.
- Added a high-contrast `NEXT` button to the joystick center only while tutorial radio dialogue is active. The radio panel remains tappable, and neither confirmation route fires a shell.
- Relocated the tablet Major Mod target from the crowded HUD portrait to a separate real-tank button directly above Fire. Its progress/validity ring stays in the side margin, and mirrored handedness keeps it above the relocated Fire control.
- Preserved Relay activation on the existing left-HUD relay sprite. Android long-press context-menu events no longer cancel the single-finger hold, while deliberate drag-away cancellation remains intact.
- Inspected 1280 x 711 briefing and Mod-hold captures plus 1280 x 800 standard/mirrored states under `output/tablet-remote-interaction-v1/`. The Canvas, HUD text, bottom equipment strip, and both thumb rails remain unobscured.

Remote interaction follow-up result: passed
