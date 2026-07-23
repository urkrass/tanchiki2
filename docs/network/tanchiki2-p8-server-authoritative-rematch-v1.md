# Tanchiki2 P8 Server-Authoritative Rematch v1

Status: **IMPLEMENTED AND AUTOMATED-ACCEPTED; EXACT-HEAD REVIEW PENDING**

Date: 2026-07-23

Exact base commit: `0e882043573d4b23d814ce7a2a20685fe4199995`

Working branch: `codex/tanchiki2-p8-online-scope-expansion-v1`

P8 deliberately accepts one optional online expansion: a unanimous rematch flow. It does not add a second game. Every new round uses the existing shared Relay Yard simulation, authoritative server controller, fog filtering, tank classes, equipment, reconnect rules, and tablet input path.

## Product decision

Accepted now:

- one large `PLAY AGAIN` action on the After Action Report;
- one vote per eligible player, with a visible aggregate count;
- unanimous consent before a rematch can open;
- preservation of player identity, team, tank class, and host permission;
- a fresh private room key visible only to the host;
- a clean ordinary lobby with every player Not Ready.

Deferred:

- Major Mods;
- portable player relays;
- persistent Garage loadouts beyond the existing lobby class choice;
- additional online maps or modes;
- acoustic-hearing/radar separation, which remains a later shared-gameplay package.

Chat remains absent.

## Authoritative lifecycle

1. The server commits one immutable result and removes the old room-key alias.
2. Result acknowledgement records delivery/rendering only. It cannot decide room lifetime.
3. The server publishes personalized rematch status. A score-limit or time-limit round is eligible only while the complete, balanced roster is connected.
4. Each `PLAY AGAIN` action records one idempotent server-side vote.
5. The last required vote creates a fresh shared-engine match state, restores the same roster/team/class assignments, clears Ready and per-round diagnostics, generates a fresh host-only key, and returns the room to `LOBBY`.
6. An explicit decline or leave destroys the room. A transient transport drop pauses rematch availability and retains the normal reconnection window; reconnect expiry or the terminal result timeout destroys the room.

Forfeit and no-contest results are not rematch-eligible because their roster is already incomplete.

Late movement or equipment packets already in transport when a round ends are bounded, validated, rate-limited, and ignored outside `PLAYING`. They do not contaminate the new lobby with a false gameplay error.

Local diagnostic telemetry can record allowlisted rematch vote, decline, and lobby-open lifecycle events. Default records contain only anonymous player sequence, aggregate vote counts, and roster size; player/result/match identifiers and the fresh key remain behind the existing sensitive-data opt-in. Production telemetry remains disabled by policy.

## Interface

The results screen remains one calm surface:

- verdict and score are the primary information;
- `PLAY AGAIN` is the only dominant action and has a 232 by 64 logical-pixel touch target;
- vote state reads `n/N READY FOR REMATCH`;
- the action becomes `VOTE SENT` after local consent;
- `MAIN MENU` remains visually secondary.

No panel, tab bar, nested card, or new persistent HUD region was added.

## Automated acceptance

| Lane | Result |
| --- | --- |
| Protocol, controller, result-control, and renderer focus | PASS |
| Full unit suite | PASS at 60 files / 564 tests |
| Production build | PASS |
| Real Colyseus SDK integration | PASS |
| Three-match deterministic online lab | PASS; zero divergence, stuck rooms, or cleanup failures |
| Four-context browser lifecycle | PASS through `PLAYING -> RESULTS -> LOBBY -> DESTROYED` |
| Browser rematch assertions | PASS; common result, unanimous vote, roster/team/class preservation, fresh host-only key, Ready cleared |
| Touch result action | PASS in the fourth isolated touch context |

The generated result and rematch-lobby screenshots were inspected under ignored `output/online-four-context/`. No room key, player identity, address, reconnection token, or other session secret is committed as evidence.

## Remaining gates

- run the complete repository validation and configured attended-v2 governance lanes on the final diff;
- run the tablet regression after the final diff;
- obtain exact-head review before merge;
- do not deploy or change provider settings under this package.

## Terminal outcome

`P8_REMATCH_IMPLEMENTED_AUTOMATED_ACCEPTANCE_PENDING_EXACT_HEAD_REVIEW`
