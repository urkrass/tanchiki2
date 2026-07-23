# Tanchiki2 P10 Presentation And Accessibility v1

Date: 2026-07-23

Exact base commit: `f8009deb6661b62f9a13e2d989e81eb04b835f7a`

Working branch: `codex/tanchiki2-p10-presentation-polish-v1`

## Scope

This is the first bounded P10 package. It improves one presentation defect visible in the definitive Signal Scar mission, strengthens the existing accessibility output, and refreshes stale player-facing repository instructions.

It does not redesign the HUD, add panels, alter gameplay, change hearing range, change the online protocol, deploy, publish, or authorize a release.

## Primary screen job

During play, the battlefield remains the one dominant surface. Transient notices exist only to explain a recent action; they must not compete with the battlefield, merge into each other, or cover the persistent HUD.

No new card, sidebar, inspector, status strip, or nested overlay is introduced.

## Baseline defect

Offline feedback notices stored world-pixel anchors, but the renderer treated those anchors as screen coordinates. On large camera-driven maps, off-screen ally actions were clamped against a fixed center allowance rather than their actual panel width. Concurrent Signal Scar notices could therefore merge into a long unreadable line and extend over the right HUD or bottom band.

The P10 baseline screenshot at `output/p7-signal-scar/smoke/desktop-opening.png` reproduced this with simultaneous Scout Overdrive and Battle Tank Hedgehog notices.

## Implementation

- `src/game/feedbackNoticeLayout.ts` owns a pure, directly tested notice-layout rule.
- World anchors are transformed through the current battlefield camera before layout.
- Every notice panel is clamped using its measured width, so its complete box stays inside the arena.
- Concurrent panels use collision-aware vertical placement.
- Only the four newest panels are drawn; the full bounded notice state remains available through `render_game_to_text()`.
- The renderer clips notices to the battlefield as a final HUD-safety boundary.
- A notice-specific monotonic sequence keeps active identities unique after staggered expiry, preventing text replacement and missed accessibility announcements.
- The existing polite accessibility announcer reports the newest battlefield update before returning to the ordinary objective announcement.

The change keeps notices local and transient. It does not create a persistent event log.

## Player-facing copy refresh

The README now reflects:

- ten campaign missions rather than eight;
- current class-kit controls on keys `1` and `2`;
- unanimous online rematch with a fresh room key;
- fixed team radio and map pings with arbitrary chat disabled;
- Signal Scar as the completed vertical slice;
- human WAN, spatial hearing, and production hosting as distinct remaining limitations.

Historical release and implementation evidence remains historical and is not rewritten as current authority.

## Validation contract

Required before exact-head review:

- focused feedback-layout and accessibility tests;
- full `npm.cmd run validate`;
- `npm.cmd run visual:p7-signal-scar`;
- desktop and tablet screenshot inspection;
- the bundled generic web-game Playwright client with structured state and browser-log inspection;
- `npm.cmd run visual:tank-carousel` against the exact P10 worktree;
- `npm.cmd run visual:contrast`;
- Product Review Warden;
- Deep Agent stub runtime;
- `git diff --check`.

Generated browser artifacts remain ignored under `output/`.

## Validation results

| Gate | Result |
|---|---|
| Focused layout, accessibility, and readability tests | PASS; 3 files / 9 tests |
| Full `npm.cmd run validate` | PASS; 62 files / 576 tests, production build, server integration, and harness checks |
| `npm.cmd run visual:p7-signal-scar` | PASS; desktop and tablet captures inspected, no blocking browser messages |
| Bundled generic web-game client | PASS; Signal Scar remains in active play with structured fog-safe state and no browser-error artifact |
| Exact-worktree Tank Select carousel | PASS; full choreography and new Breakthrough playback capture inspected |
| `npm.cmd run visual:contrast` | PASS |
| Product Review Warden | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; zero blocking debt |
| Deep Agent stub runtime | `DEEP_AGENT_STUB_COMPLETE_ALLOWED` |
| `git diff --check` | PASS |

## Explicit deferrals

- Ordinary battlefield hearing range is still global enough to need a separate gameplay package. That package should localize physical sound while preserving relay or radar-derived intelligence as a separate channel.
- Larger HUD, result, briefing, sprite, sound, and minimap changes require their own observed defect and bounded package.
- P9 code splitting remains separate from presentation polish.
- Human WAN acceptance and any public deployment remain external or protected gates.
