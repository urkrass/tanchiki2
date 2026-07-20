# Tanchiki2 Boot Camp

Boot Camp is the offline, replayable tutorial run for new saves. It is the first focused main-menu action, but Campaign remains immediately available. Tutorial progress and Campaign run progress are deliberately separate.

## Player-facing structure

Boot Camp uses the existing single Canvas battlefield. Each drill opens with a left-anchored address from General Rook, the range commander, whose pixel portrait speaks in a restrained two-frame animation. During a drill, the right HUD shows one current training goal while Rook occupies one calm upper-left command panel. Instructions arrive letter by letter at 20 characters per second, pause for 0.65 seconds between sentences in the same transmission, and hold for at least 1.5 seconds after the final character; Enter or a tap first completes the current sentence, then advances it. An objective performed during narration is remembered, but it cannot replace the sentence before that reading beat. After a transmission ends, the panel collapses to Rook's blinking portrait. There are no modal tutorial cards over combat.

When player control is expected, one compact action cue appears beside the player's tank. It shows the exact current input—movement arrows, Fire, Relay, class-kit slots, Major Mod, or flag drop—and remains for at most ten seconds or until that action advances the drill. Cues remain hidden during ordinary narration and camera tours. Their anchor flips below the tank when instructor vehicles occupy the space above. The second CTF run first shows `TO XFER`, then changes to `R DROP FLAG` only after the player reaches the marked pad.

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

1. **First Gear** — A base-free live-fire tank hunt: Rook tours the player past both preloaded hostiles and the obstacle lanes before teaching movement, turning, fire discipline, ammunition, cover, and two easy kills.
2. **Radio Is Not Magic** — Defense fog, relay, off-screen marker, camera-tour, and offline shared-vision training.
3. **Three Tanks, One Plan** — Team Battle with the classed instructor squad and an adaptive player tactic.
4. **Borrowed Flag** — A two-pass Capture The Flag drill: the player completes one clear solo capture, then a second theft seals the crossing. The player drops the second flag through the marked hatch, Brick receives it beyond the steel wall, and the camera follows his allied capture.
5. **No Friendlies on the Form** — Free For All relay doctrine, a planted false contact, relay recovery and relocation, ammo-station resupply, and four player kills against a replenishing field capped at five live tanks.
6. **Knock Before Breaching** — Assault camera reveal, full-squad combined arms, a clear firing lane, and a destructible command core.

The recurring instructors are Needle (Scout), Spanner (Engineer), and Brick (Battle Tank), with General Rook commanding range control. Their class shells, movement, reload, damage, shield, equipment, Major Mods, and vehicle visuals use the real gameplay systems. Instructor devices retain owner tank, side, and team, so the squad does not trigger its own training equipment.

## Safety and progression

Opening orders wait for confirmation. First Gear preloads both enemies under a safety hold so its three-stop camera tour can show the left hostile, central obstacle lanes, and right hostile before control returns. Later drills retain delayed hostile arrivals and the slower per-drill training cadence. Camera tours temporarily disable player movement, hold hostile AI and spawning, protect the player and any relevant objective, and then return smoothly to player follow. Portrait and typewriter animations continue during a tour.

First Gear contains no base tile, base marker, base HUD, or base-loss condition; destroying its two enemy tanks is the only combat objective. Its action sequence is one short three-cell handling lap followed by a consolidated engagement order covering deliberate fire, reload and ammunition awareness, cover, and both enemy kills. The Vision Drill keeps its training base indestructible. Borrowed Flag uses a data-driven two-capture transfer checkpoint: capture one leaves the crossing open, capture two activates the steel gate, an off-pad transfer is rejected, and the correct drop sends the flag from the north pad to Brick's south-side receiver while the wall remains closed. A safe actor-follow camera shows Brick carry the flag home. The graduation Assault marker and camera target share the actual destructible core tile. Running out of player lives still restarts only the current drill. Save schema and key remain v1; `tutorialCompletedMissions` is an additive normalized list. Only completed drills persist. Tutorial runs never write Campaign credits, XP, unlocks, tactical ranking, or the Campaign resumable-run slot.

Completing a drill unlocks the next one. Completed drills remain selectable for replay. Quitting returns to Boot Camp selection.

## Runtime contracts

- `src/game/tutorial.ts` owns mission, step, dialogue, camera, actor-loadout, and adaptive-goal data.
- `src/game/tutorialDirector.ts` observes gameplay probes and advances goals without scattering mission conditionals through the main loop.
- `GameSnapshot.tutorial` and `render_game_to_text` mirror mission, step, speaker, dialogue, current goal, contextual action cue, loadouts, camera control, completion, and instructor loadouts.
- Tutorial-only automatic actor assignment is gated by `runKind === 'tutorial'`; Campaign bot composition remains unchanged.

## Validation

Focused Vitest coverage checks save migration, sequential unlock/replay, director triggers, camera safety, adaptive class and Mod paths, actor-aware mechanics, owner-scoped devices, map dimensions, safe spawns, reachable targets, Pontoon affordances, and touch action targets.

Browser choreography lives in `qa/playwright/boot-camp-*.mjs` and records screenshots, `render_game_to_text`, and console errors for menu/briefing, Rook's typewriter panel and portrait-only state, the First Gear map tour, every contextual keyboard/touch action cue, both CTF captures and the allied camera-follow handoff, the destructible graduation core, instructor synergy, modes, replay selection, and Campaign skip flows.
