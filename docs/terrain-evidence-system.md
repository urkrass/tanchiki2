# Terrain Evidence System Prototype

This is an offline-only prototype for terrain-created movement, sound, and projectile evidence.

## Launch

Run the Vite dev server and open:

```text
http://127.0.0.1:<vite-port>/?devLevel=terrain_evidence_test
```

The query parameter starts the hidden `Terrain Evidence Test` map directly. The normal menu stays unchanged.
The map includes separate open terrain lanes plus a wall-bounded echo maze so stepping on echo tiles can be checked in both exposed and closed environments.
The maze includes one passive invincible hostile patrol in the hidden branch. It does not attack; it exists so echo-triggered relay waves can be checked against a real hidden tank contact.

## Scope

Included:

- Level row encoding and parsing for the prototype terrain chars.
- Offline `TanchikiGame` movement, track, projectile, and snapshot mechanics.
- Canvas rendering for prototype terrain and temporary evidence markers.
- `GameSnapshot.terrainEvidence` for Playwright/tests to inspect markers without scraping canvas pixels.

Not included:

- Online/shared multiplayer protocol changes.
- Map editor support.
- Art-sheet or Figma asset updates.
- Release, deploy, tag, publishing, or external-service action.

## Terrain Chars

| Char | Tile kind | Prototype behavior |
| --- | --- | --- |
| `s` | `swamp` | Slower movement, stronger/longer muddy tracks, louder mud evidence. |
| `x` | `ricochet` | Solid projectile block that can deflect one shell deterministically. |
| `m` | `metal` | Suppresses tracks, emits metal evidence, and slides one clear tile after a move. |
| `d` | `dust` | Short-lived directional dust evidence. |
| `h` | `echo` | Stepping or firing on the tile emits a one-shot portable-relay signal pulse with moving waves and contacts. |
| `r` | `reeds` | Reduces stationary tank visibility and emits rustle/firing evidence. |
| `g` | `gravel` | Normal movement with stronger noise evidence. |
| `n` | `snow` | Slightly slower movement with longer, stronger visible tracks. |

## Snapshot Contract

`GameSnapshot.terrainEvidence` and `RenderState.terrainEvidence` expose visible prototype evidence markers:

```ts
{
  kind: 'dust' | 'noise' | 'rustle' | 'metal' | 'echo' | 'ricochet'
  col: number
  row: number
  dir?: Direction
  age: number
  ttl: number
  strength: number
  label: string
}
```

Tracks remain under `majorMods.tracks` and now include `surface`. Tracks are still fog-aware: hidden tracks are omitted unless they have already been seen and are fading through the existing track visibility model.

Hidden hostile terrain markers do not expose tank identity or exact coordinates. Loud hidden movement can surface as approximate evidence; exact player movement evidence remains exact.
Echo tile pulses reuse the portable relay wave propagation and wall-contact visuals; they do not create standalone echo terrain markers for tank steps. Echo sounds are neutral and do not identify hostiles, decoys, teams, or exact source ownership. Visible tanks emit echo waves from the stopped tile. Hidden enemy echo pulses start as a compact staggered ring from a side/back approximate point instead of a dense nexus at the tank center or a forward phantom cell. Portable relays still provide hostile signal-contact stripes; echo tiles only make ambiguous sound waves that are harder to source.

Mines, traps, portable relays, Czech hedgehogs, and EMP emitters can be placed on passable prototype terrain. Ricochet blocks remain invalid placement cells because they are solid terrain.
