# Tanchiki Bot AI Architecture Pass

This pass adds a small deterministic utility AI for offline campaign bots. It is not ML, reinforcement learning, or an LLM agent. The game already has tile movement, shells, collision, fog, retranslators, objectives, traps, and saves; the AI layer now decides how to use those systems instead of replacing them.

## Role Mapping

Campaign and save role IDs stay unchanged:

- `base_attacker` maps to Basic Tank.
- `hunter` maps to Scout Tank.
- `wall_breaker` maps to Breaker Tank.

Keeping the stored IDs stable avoids campaign/save migration and keeps existing role weights valid.

## Architecture

The AI modules live under `src/game/ai/`:

- `botTypes.ts` defines beliefs, difficulty config, role profiles, intentions, decisions, pathing inputs, and fire-control inputs.
- `botPerception.ts` converts visible tanks, deployable alerts, shared vision memory, and scripted objective knowledge into bot percepts.
- `botMemory.ts` merges percepts into confidence-based beliefs and decays stale contacts deterministically.
- `botUtility.ts` scores attack, investigate, pressure objective, defend, break wall, retreat, and patrol intentions.
- `pathfinding.ts` provides weighted A* over the existing tile grid with penalties for unknown and dangerous cells, optional destructible-wall plans, and role tuning.
- `fireControl.ts` checks alignment, line of sight, blockers, confidence, friendly fire, reload/ammo availability, and ammo conservation.
- `botBehaviors.ts` converts the highest utility intention into one existing game action: move, fire, break wall, or idle.

`TanchikiGame` remains authoritative for movement, shooting, collision, tile damage, objective damage, fog state, and tank status effects. The AI receives callbacks into those existing rules and returns decisions.

## Fog And Belief Limits

Bots do not get exact hidden truth by default. Perception uses each side's current offline vision model plus existing side-specific vision memory and deployable alerts. Hidden tanks are not shootable targets. Noise, tripwire, and steel-trap alerts can create investigate beliefs, but those beliefs do not become confirmed firing targets.

Friendly bots intentionally use the same player-side team vision rules: before fixed relay capture, they do not gain private teammate sight. After a player-side relay link, teammate and relay vision can be merged through the existing fog model.

Portable relay echoes remain player-facing scouting feedback. They do not grant AI authority or reveal full hidden tanks to bots.

## Difficulty Config

`GameOptions.botDifficulty` accepts a partial config for tests and future tuning:

- `reactionDelayMs`
- `aimError`
- `confidenceThreshold`
- `decoySusceptibility`
- `aggression`
- `ammoConservation`
- `retreatHealthThreshold`
- `investigatePersistence`

The defaults are deterministic and conservative. Randomness is not introduced in scoring; the game still uses the existing seeded randomness for spawning and fallback movement.

## Online Boundary

This pass is offline only. Online multiplayer currently has server-side match state and strict fog filtering, but no bot loop. Future multiplayer bots must run server-authoritatively. The pure AI modules can be reused or moved later, but client-side online bots are intentionally not added here.

## Deferred Work

Deferred items:

- Ambusher and Signal Hunter roles.
- Decoy-specific sophistication beyond current confidence handling.
- Trap awareness and learned trap avoidance.
- Team-level bot coordination.
- Tactical AI metrics such as recon quality, signal discipline, ammo discipline, decoy resistance, and panic index.
