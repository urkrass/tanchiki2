# Tanchiki2 Boot Camp

Boot Camp is the offline, replayable tutorial run for new saves. It is the first focused main-menu action, but Campaign remains immediately available. Tutorial progress and Campaign run progress are deliberately separate.

## Player-facing structure

Boot Camp uses the existing single Canvas battlefield. Each drill opens with a left-anchored address from General Rook, the range commander, whose pixel portrait speaks in a restrained two-frame animation. During a drill, the right HUD shows one current training goal while the active speaker occupies one calm upper-left command panel. Instructions arrive letter by letter at 20 characters per second, pause for 0.65 seconds between sentences, and hold for at least 1.5 seconds after the final character. Enter or a tap first completes the current sentence, then advances it. An objective performed during narration is remembered, but it cannot replace the sentence before that reading beat. After a transmission ends, the panel collapses to the speaker's portrait. There are no modal tutorial cards over combat.

Reduced-motion mode completes typewriting immediately, shortens mandatory camera moves, freezes portrait animation, and removes cue pulsing.

When player control is expected, one compact action cue appears beside the player's tank. It shows the exact current action: movement arrows, Fire, Relay, class-kit slots, Major Mod, or flag drop. It remains for ten seconds or until the action advances the drill. If the goal remains incomplete, the cue returns after a short quiet interval instead of disappearing forever. Cues remain hidden during ordinary narration and camera tours. Their anchor flips below the tank when instructor vehicles occupy the space above. Touch cues use semantic labels (`RELAY`, `KIT 1`, `KIT 2`, `MOD`, and `FLAG`) rather than keyboard letters.

Every briefing recommends a tank class and Major Mod. `Change Loadout` opens the existing Garage and returns to the same briefing. Coaching follows the equipped class or Mod:

- Scout: decoy or tripwire reconnaissance and disengagement.
- Engineer: mine or steel-trap lane control.
- Battle Tank: five-second Bulwark timing, lateral Traverse fire, and splash breaches.
- Overdrive: rapid repositioning.
- Pontoon: water-route creation.
- Czech Hedgehog: choke-point denial.
- EMP: relay-area disruption.

Keyboard controls remain unchanged. On touch devices, the existing bottom kit slots are tappable, the Mod readout is a Mod button, and the CTF flag HUD becomes the manual drop target.

## Six drills

1. **First Gear** — A base-free live-fire tank hunt. Rook tours both preloaded hostiles and the obstacle lanes before teaching cumulative movement, a deliberate heading change, fire discipline, ammunition awareness, and two easy kills.
2. **Radio Is Not Magic** — Defense fog, relays, off-screen markers, a camera tour, and offline shared vision. One preloaded hostile begins outside direct tank vision, and danger stays held until shared relay contact is established.
3. **Three Tanks, One Plan** — Team Battle with the classed instructor squad. Class gear must be placed in its marked lane, Battle Tanks must activate Bulwark or Traverse and then land or absorb an opening hit, Major Mods must be used in their tactical zone, and the player must contribute a hit before the last hostile can be cleared.
4. **Borrowed Flag** — A two-pass Capture The Flag drill. The player completes one clear solo capture, then a surprise permanent trap catches the second carrier at the only crossing. The immobilized player drops the flag, Brick receives it on the safe side, and the camera follows his allied capture.
5. **No Friendlies on the Form** — Free For All relay doctrine, a planted false contact that requires physical inspection, relay recovery and marked relocation, icon-marked ammo resupply, and four total player kills against a replenishing field capped at five live tanks.
6. **Knock Before Breaching** — Assault camera reveal, spatial Major Mod practice, full-squad combined arms, and a multi-hit command core that is invulnerable before the breach and accepts tutorial damage only from the player's cannon.

The recurring instructors are Needle (Scout), Spanner (Engineer), and Brick (Battle Tank), with General Rook commanding range control. Their class shells, movement, reload, damage, active native kit, equipment, Major Mods, and vehicle visuals use the real gameplay systems. Instructor devices retain owner tank, side, and team, so the squad does not trigger its own training equipment.

Battle Tank no longer begins with a passive shield point. `1` raises Bulwark Field for five seconds and absorbs up to three damage before ordinary shield pickups or HP; it then recharges for twelve seconds. `2` engages Traverse Mode for four seconds: Left and Right move perpendicular to the fixed hull direction at a modest speed penalty, so the tank can keep firing down one lane. Traverse recharges for ten seconds, and Overdrive is deliberately capped while Traverse is active.

The no-fog Heavy Battery Proving Ground is available at `?devLevel=battle_tank_battery`. Three allied Battle Tanks use real Bulwark and Traverse state, maintain a lateral firing line, obey collision, and each carries eight shells. The open center demonstrates battery strength; the brick-and-steel side maze, finite ammunition, and rear ammo stations expose its logistical and terrain weaknesses.

## Safety and progression

Opening orders wait for confirmation. First Gear preloads both enemies under a safety hold so its three-stop camera tour can show the left hostile, central obstacle lanes, and right hostile before control returns. Later tours temporarily disable player movement, hold hostile AI and spawning, protect the player and relevant objectives, and return smoothly to player follow.

First Gear contains no base tile, base marker, base HUD, or base-loss condition; destroying its two enemy tanks is the only combat objective. Its handling check counts cumulative travel and requires a heading change. Cover and reload are presented as combat guidance rather than falsely certified mastery.

The Vision Drill keeps its training base indestructible and counts absolute squad defeats so early or allied kills cannot exhaust its finite objective. Borrowed Flag reserves the transfer route, recreates Brick if necessary, clears player obstructions, and has a bounded handoff fallback so its actor-follow camera cannot lock indefinitely. No Friendlies preserves its relay curriculum across a late combat failure by returning the player to the live-combat checkpoint instead of repeating setup. The graduation core has six HP, is locked before the final breach step, and ignores instructor damage.

Running out of player lives otherwise restarts only the current drill. Save schema and key remain v1; `tutorialCompletedMissions` is an additive normalized list. Only completed drills persist. Tutorial runs never write Campaign credits, XP, unlocks, tactical ranking, or the Campaign resumable-run slot. Completing a drill unlocks the next one, completed drills remain selectable for replay, and quitting returns to Boot Camp selection.

## Runtime contracts

- `src/game/tutorial.ts` owns mission, step, dialogue, camera, actor-loadout, adaptive-goal, and marked-zone data.
- `src/game/tutorialDirector.ts` observes gameplay probes and advances goals without scattering mission conditionals through the main loop.
- `GameSnapshot.tutorial` and `render_game_to_text` mirror mission, step, speaker, dialogue, current goal, contextual action cue, loadouts, camera control, reduced-motion state, completion, and instructor loadouts.
- A separate concise accessibility announcer reports meaningful screen, goal, and completion changes. The full automation JSON remains available through `window.render_game_to_text` but is never streamed into the `aria-live` region.
- Tutorial-only automatic actor assignment is gated by `runKind === 'tutorial'`; Campaign bot composition remains unchanged.

## Validation

Focused Vitest coverage checks save migration, sequential unlock/replay, director triggers, cumulative handling, camera safety, relay-only contact acquisition, marked class and Mod zones, absolute kill accounting, FFA combat recovery, actor-aware mechanics, owner-scoped devices, handoff fallbacks, multi-hit player-only core damage, map dimensions, safe spawns, reachable targets, Pontoon affordances, concise accessibility announcements, reduced motion, and touch action targets.

Browser choreography lives in `qa/playwright/boot-camp-*.mjs` and records screenshots, `render_game_to_text`, and console errors for menu/briefing, portraits, live dialogue, the First Gear map tour, contextual keyboard/touch action cues, marked tactic zones, both CTF captures and the allied camera-follow handoff, the relay/decoy/ammo curriculum, the player-driven graduation core, replay selection, and Campaign skip flows.
