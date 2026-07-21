# Field Salvage

## Purpose

Field Salvage replaces random post-kill powerup drops in new offline runs. A destroyed tank now changes the battlefield for a short time: its wreck offers limited recovery, blocks movement, can be denied with gunfire, and eventually burns away.

The mechanic is intended to make forward movement less hopeless without making destruction a free reward. The side that controls the ground controls the wreck, so a reckless base rush can leave useful supplies to the defender.

## Rules

- Every ordinary destroyed tank creates one neutral wreck. Any side may salvage it.
- A wreck is salvageable for 20 seconds, then remains as burned blocking debris for 9 seconds before disappearing.
- Each fresh wreck contains at most four shells and one HP.
- A stationary tank on an adjacent tile automatically recovers one shell every 3.5 seconds and one HP after 6 seconds, up to its normal capacities.
- Moving, firing, or taking damage cancels the current partial recovery and imposes a brief interruption.
- Fixed ammo stations remain the faster, authoritative source of ammunition. Wreck ammunition does not progress while a tank is on one.
- A direct shell destroys a wreck immediately. Clearing debris gives no score or resources.
- Wrecks block tanks and bot paths in both fresh and burned phases. Projectiles may pass only after destroying the wreck.
- A wreck stays on the exact tile where its tank was destroyed. If that tile is also a spawn, the next tank uses the nearest safe spawn cell instead of displacing the wreck.
- At most eight wrecks remain active. The oldest burned wrecks are removed first when the cap is exceeded.

## AI

Damaged bots may seek nearby salvage. Bots with finite ammunition may also seek shells. Cautious bots will not abandon an immediate fight for a distant wreck, while critically damaged or empty finite-ammo tanks may make a longer recovery move. A bot that cannot route around adjacent debris may shoot it clear.

## Class Value

- Scout reaches contested wrecks first but must hold still to extract supplies.
- Engineer can secure a wreck with mines, traps, and route control.
- Battle Tank can hold the salvage tile under pressure, but its slow movement makes a failed claim costly.
- Major Mods remain situational: Overdrive wins the race, Pontoon opens a safer route, Hedgehog denies an approach, and EMP disrupts local relay support.

## Save and Compatibility

Wreck state, remaining resources, phase time, and recovery progress are serialized in the existing v1 run save. Older saves normalize to no wrecks. Legacy powerups already present in an old resumable run remain collectible so an in-progress save is not invalidated, but new kills no longer generate them.

## QA Surface

The development-only route `?devLevel=field_salvage_test&tankClass=battle` opens a no-fog, stationary-target range. It is excluded from Campaign progression and exists to inspect exact-cell wreck creation, safe spawn fallback, blocking, recovery, burnout, denial fire, snapshots, and rendering.
