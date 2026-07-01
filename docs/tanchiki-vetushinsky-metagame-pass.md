# Tanchiki Vetushinsky Metagame Pass

## Purpose

This pass treats Tanchiki's campaign results as an interpretation layer, not as generic gamification. It does not add daily rewards, badges, streaks, or a separate engagement loop. The new layer reads existing match procedures: what the player destroyed, protected, captured, risked, and preserved.

The design thesis is:

> Victory is not just destroying enemies. Victory is managing the consequences of destruction.

The map is a fragile tactical system. Bricks can be useful cover or reckless debris. Powerups can be timely rescue tools or incidental pickups. Objective completion matters, but the cost of that completion now has meaning.

## Repository Audit

- Level stats are tracked in `src/game/game.ts` through `RunStats`, `createRunStats`, `normalizeRunStats`, and per-event updates for shots, hits, kills, destroyed bricks, powerups, captures, assault damage, base damage, and reward ledger entries.
- The level results screen is generated from `LevelResult` in `src/game/game.ts`, surfaced through `getSnapshot()`, and rendered by `src/game/render.ts` as part of the existing `level-complete`, `campaign-complete`, and `lost` menu overlays.
- XP, credits, score, and rewards are calculated in `src/game/game.ts` through `addRewards`, kill rewards, mission rewards in `completeCurrentLevel`, and the normalized `RewardLedger`.
- Garage upgrades are defined in `src/game/content.ts`, presented and purchased in `src/game/game.ts`, and applied through stat helpers such as max HP, reload, movement duration, and repair charges.
- Objective-specific stats live in `RunStats` and `SavedObjectiveState`, with mode logic in `src/game/game.ts` for defense, team battle, CTF, FFA, and assault.
- Campaign save data is stored through `src/game/save.ts` and `SaveData`/`SavedRun` in `src/game/types.ts`.
- Vitest coverage is in `src/game/*.test.ts`, `src/online/*.test.ts`, and `packages/shared/src/*.test.ts`. Browser validation uses Playwright scripts under `qa/playwright/` plus the `develop-web-game` client.
- Offline and online do not currently share full match-result logic. This pass keeps tactical evaluation pure and offline-facing, so future online summaries can reuse it without coupling to rendering or save state.

## Tactical Evaluation

The new pure evaluator lives in `src/game/tacticalEvaluation.ts`. It consumes objective mode, objective state, run stats, base/life state, mission rewards, and outcome. It returns:

- tactical style
- victory quality
- short reasons
- objective interpretation
- metrics
- transparent XP/credit modifiers

The initial rules are deterministic and intentionally small:

- `Fortress`: defense or team-battle wins with intact objectives, low critical cover loss, and no life loss.
- `Surgeon`: high shell efficiency with low terrain damage.
- `Sniper`: controlled hit rate with enough confirmed hits.
- `Bulldozer`: destructive but valid route opening.
- `Raider`: CTF or assault objective pressure that decides the mission.
- `Guardian`: team survival is preserved.
- `Opportunist`: powerups are used in objective-relevant moments.
- `Last Wall`: victory with the objective barely intact.
- `Pyrrhic Victory`: victory with heavy structural or survival cost.
- `Reckless Victory`: high aggression with poor objective care.
- `Failed Defense`: objective loss or defeated run.

## Objective Interpretation

- Defense emphasizes base HP, critical cover, and controlled defense over raw kills.
- Team Battle emphasizes side survival and controlled elimination.
- CTF emphasizes captures, carrier/route pressure, and preserving mobility.
- FFA emphasizes efficient survival and precision, not kill count alone.
- Assault emphasizes breakthrough pressure and the cost of opening a route.

## Rewards

Existing score, kills, pickups, XP, credits, and mission rewards are preserved. Tactical evaluation adds a small transparent modifier:

- Clean Win: +15 percent mission credits and XP.
- Controlled Win: +10 percent mission credits and XP.
- Costly Win or Last Wall: +5 percent mission credits and XP.
- Pyrrhic Victory, Reckless Victory, Failed Defense: no tactical bonus.

The modifier is visible in the result helper text and stored in the reward ledger as `tacticalCredits` and `tacticalXp`. This keeps destructive victories valid while making clean and objective-aware play feel different.

## Garage Upgrade Direction

The current four upgrades remain intact. Their garage descriptions now communicate tactical style support:

- Armor supports `Fortress` and `Guardian` play by helping the player hold pressure.
- Cannon supports `Sniper` and `Bulldozer` play through faster reload and later shell damage.
- Engine supports `Raider` play in CTF and assault routes.
- Repair Kit supports `Last Wall` recovery and defensive stabilization.

This pass avoids a large RPG tree. The next upgrade pass should add explicit tradeoffs only after the tactical result layer has enough data to judge those tradeoffs fairly.

## Powerups

Powerups remain unchanged mechanically. The evaluator now receives objective-relevant pickup counts when the current state implies the pickup mattered, such as repair near failure, shield under low HP, CTF carrier pressure, defense near the base, or assault pressure near the objective.

## Online Compatibility

Online multiplayer is not refactored in this pass. The evaluator is pure and input-shaped around stats plus objective state, so future online summaries can feed it with:

- relay vision contribution
- ping/radio coordination
- scouting under fog of war
- shared capture pressure
- flag carrier protection

No online protocol, fog rule, server route, or multiplayer save schema is changed.

## Next Pass

- Add assist/protection events for friendly bots and future online teams.
- Track whether destroyed bricks were cover, route opening, or careless damage.
- Add objective-time metrics, especially CTF route efficiency and assault breakthrough time.
- Make upgrade choices appear in the final evaluation so build identity is interpreted alongside mission behavior.
- Add a post-match comparison view only if it can stay calm and non-dashboard-like.
