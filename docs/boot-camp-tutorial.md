# Tanchiki2 Boot Camp

Boot Camp is the offline, replayable tutorial run for new saves. It is the first focused main-menu action, but Campaign remains immediately available. Tutorial progress and Campaign run progress are deliberately separate.

## Player-facing structure

Boot Camp uses the existing single Canvas battlefield. Each drill opens with a left-anchored address from General Rook, the range commander, whose pixel portrait speaks in a restrained two-frame animation. During a drill, the right HUD shows one current training goal and a compact radio strip carries live dialogue. Standard radio lines remain visible for six seconds; Enter or a tap on the radio strip advances immediately. There are no modal tutorial cards over combat.

Every briefing recommends a tank class and Major Mod. `Change Loadout` opens the existing Garage and returns to the same briefing. Coaching follows the equipped class or Mod:

- Scout: decoy or tripwire reconnaissance and disengagement.
- Engineer: mine or steel-trap lane control.
- Battle Tank: shield trading and splash breaches.
- Overdrive: rapid repositioning.
- Pontoon: water-route creation.
- Czech Hedgehog: choke-point denial.
- EMP: relay-area disruption.

Keyboard controls remain unchanged. On touch devices, the existing bottom kit slots are tappable, the Mod readout is a Mod button, and the CTF flag HUD becomes the manual drop target.

## Six drills

1. **First Gear** — Defense movement, turning, fire discipline, ammunition, cover, and an easy two-hostile base defense.
2. **Radio Is Not Magic** — Defense fog, relay, off-screen marker, camera-tour, and offline shared-vision training.
3. **Three Tanks, One Plan** — Team Battle with the classed instructor squad and an adaptive player tactic.
4. **Borrowed Flag** — Capture The Flag pickup, route choice, manual drop, recovery, escort, and capture.
5. **No Friendlies on the Form** — Free For All identification, cover, priority, and two player kills.
6. **Knock Before Breaching** — Assault camera reveal, full-squad combined arms, a destructible shutter, and the command core.

The recurring instructors are Needle (Scout), Spanner (Engineer), Brick (Battle Tank), and Actual (range control). Their class shells, movement, reload, damage, shield, equipment, Major Mods, and vehicle visuals use the real gameplay systems. Instructor devices retain owner tank, side, and team, so the squad does not trigger its own training equipment.

## Safety and progression

Opening orders wait for confirmation. The first hostile is delayed after confirmation, later hostile spawns use the slower per-drill training cadence, and objective camera tours have longer observation holds. Camera tours temporarily disable player movement, hold hostile AI and spawning, protect the player and base, and then return smoothly to player follow. Animations and the radio presentation continue during a tour.

The training base in the first two Defense drills is indestructible, so base loss cannot fail or restart those exercises. Running out of player lives still restarts only the current drill. Save schema and key remain v1; `tutorialCompletedMissions` is an additive normalized list. Only completed drills persist. Tutorial runs never write Campaign credits, XP, unlocks, tactical ranking, or the Campaign resumable-run slot.

Completing a drill unlocks the next one. Completed drills remain selectable for replay. Quitting returns to Boot Camp selection.

## Runtime contracts

- `src/game/tutorial.ts` owns mission, step, dialogue, camera, actor-loadout, and adaptive-goal data.
- `src/game/tutorialDirector.ts` observes gameplay probes and advances goals without scattering mission conditionals through the main loop.
- `GameSnapshot.tutorial` and `render_game_to_text` mirror mission, step, speaker, dialogue, current goal, loadouts, camera control, completion, and instructor loadouts.
- Tutorial-only automatic actor assignment is gated by `runKind === 'tutorial'`; Campaign bot composition remains unchanged.

## Validation

Focused Vitest coverage checks save migration, sequential unlock/replay, director triggers, camera safety, adaptive class and Mod paths, actor-aware mechanics, owner-scoped devices, map dimensions, safe spawns, reachable targets, Pontoon affordances, and touch action targets.

Browser choreography lives in `qa/playwright/boot-camp-*.mjs` and records screenshots, `render_game_to_text`, and console errors for menu/briefing, radio, camera, instructor synergy, modes, touch actions, replay selection, and Campaign skip flows.
