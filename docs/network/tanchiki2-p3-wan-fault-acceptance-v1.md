# Tanchiki2 P3 WAN and Fault Acceptance v1

Status: **AUTOMATED ACCEPTANCE COMPLETE; HUMAN WAN GATE PENDING**

Date: 2026-07-22

Exact base commit: `730df3e05a77724e377ad8e5e958b6834af15714`

Working branch: `codex/tanchiki2-p3-wan-fault-acceptance-v1`

This package executes P3 network acceptance, preserves replayable seeds, and repairs defects found by those lanes. Docker/Toxiproxy acceptance is now complete; human WAN acceptance remains unclaimed. No room key, reconnection token, internal room identifier, connection address, credential, or participant identity appears in this evidence.

## Attended-v2 preflight

- PR #110 was merged with expected-head enforcement. The approved head `230257a5edaf749ff64bf4b881cd1cfdd5451f42` is an ancestor of merge commit `730df3e05a77724e377ad8e5e958b6834af15714`.
- A detached worktree at the merge commit passed `npm.cmd run validate`: 56 files and 524 tests, production build, server smoke, and all consumer harness checks.
- The P3 campaign prompt validated without findings.
- The attended-v2 guard returned `ALLOWED_ATTENDED_V2_WITH_RESTRICTIONS`.
- GitHub reported no overlapping open pull requests at P3 branch creation.

## Executed acceptance evidence

All synthetic lanes used replayable seed `20260722`.

| Lane | Result | Authoritative evidence |
| --- | --- | --- |
| `npm.cmd run online:lab:quick` | PASS | 3 scripted 2v2 matches; zero divergent results, stuck rooms, or cleanup failures. |
| `npm.cmd run online:lab:realtime` | PASS | 1 representative 12-second production-cadence match; zero divergent results, stuck rooms, or cleanup failures. |
| `npm.cmd run online:lab:soak` | PASS | 100 seeded 2v2 matches; zero divergent results, stuck rooms, or cleanup failures. |
| `npm.cmd run online:browser:four-context` | PASS | Four isolated contexts completed lobby, countdown cancellation, redeployment, locked roster, live play, common result, key rotation, and destruction cleanup. |
| `npm.cmd run online:browser:tablet-entry` | PASS after repair | Six consecutive final tablet runs completed the freeze/resume join, touch class selection, host Start, held movement, class kit, and guarded Back flow. Input-to-visible ranged 67-133 ms; first-tile completion ranged 426-460 ms; all six recorded zero visual rewinds and zero browser errors. |
| Bundled web-game Playwright client | PASS | Final post-repair run produced structured state and an inspected screenshot under ignored `output/web-game-final/`; no browser error artifact was emitted. |
| Toxiproxy profile matrix | PASS | Clean; mixed 30/80/150 ms plus jitter; five-second outage; four-client simultaneous reconnect; TCP reset; downstream-only stall; overlong forfeit; and bounded slow client all passed. Reclaiming profiles retained the original slot, all results agreed, and cleanup failures were zero. |
| `npm.cmd run online:fault:outage-soak` | PASS | 100 five-second bidirectional outages; 100 same-slot reclaims; 100 reconnect successes; zero reconnect failures, cleanup failures, or divergent results. 54 heartbeat stalls were observed and recovered. Four setup-only partial batches were discarded and replayed with identical seeds; no gameplay failure was retried or counted. |
| `npm.cmd run validate` | PASS | 56 files and 531 tests, production build, real-SDK server smoke, harness validation/smoke, Reviewer App dry run, and attended-v2 lifecycle smoke. |
| Product Review Warden | PASS | `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`; open blocking count 0. |
| Deep Agent stub runtime | PASS | `DEEP_AGENT_STUB_COMPLETE_ALLOWED`; no findings or denied actions. |

Generated screenshots, structured state, and transient test logs remain under ignored `output/`. Only this concise redacted aggregate is committed.

## Defect found and repaired

The first tablet acceptance batch found an intermittent held-direction rewind. The diagnostic rerun captured visual progress moving backward from `0.567` tile to `0.542` tile at 342 ms.

Root cause: personalized snapshots arrive at 20 Hz, but the local presentation buffer retained only six snapshots, or roughly 300 ms. A Battle Tank tile move lasts about 464 ms, and legal slow-plus-Traverse movement can approach one second. When the oldest low-latency presentation anchor left the buffer before the move completed, later snapshot timing could reduce extrapolated progress. A separate completion-snapshot handoff could also feed the local player back through delayed remote interpolation.

Repair:

- keep a bounded 24-snapshot history, covering the slowest legal tile move plus delivery-jitter margin;
- render a completed local move at its authoritative destination while leaving remote players on buffered interpolation;
- bind extrapolation anchors to the contiguous newest move cycle so a repeated A-to-B route after reversing cannot reuse an older matching anchor;
- add deterministic regressions for anchor eviction, completion-snapshot handoff, and repeated-route reversal;
- retain strict browser evidence for every backward delta rather than weakening the zero-rewind threshold.

The focused interpolation suite now passes 11 tests. The final six-run tablet sequence passed without a rewind, and the post-review tablet and four-context reruns also passed.

The live proxy lanes then found two network-specific defects:

- a downstream-only blackhole could leave the browser socket stuck because its TCP close handshake was also hidden; visible clients now recycle after four seconds without a server message and use a 2.5-second reconnect delay;
- heartbeat timeout marked a slot dropped, but expiry could wait for a transport callback that a one-way outage delayed; the authoritative server tick now expires disconnected reservations at their deadline, independently and idempotently.

The fault harness was also made deterministic: players join in fixed order, timed outages blackhole traffic rather than churning listeners, overlong timing begins from the authoritative dropped-slot state, and inter-match cleanup waits for actual Colyseus room disposal. The 100-match command isolates five-match server batches and retries only uncounted setup timeouts caused by the disposable Docker Desktop lab.

## Unclaimed external gate

### Human WAN playtest

Status: **PENDING EXTERNAL PARTICIPANTS**

Matches completed: `0 / 10 minimum`.

Required operator action: schedule 10-20 real 2v2 matches with physical devices across home Wi-Fi, a mobile hotspot, and at least one participant on a remote network. Complete `docs/online-wan-playtest-checklist.md` with anonymous participant labels and redacted aggregate results.

## Terminal outcome

`P3_AUTOMATED_ACCEPTANCE_COMPLETE_HUMAN_WAN_PENDING`

The clean, browser, tablet, Docker/Toxiproxy, full-validation, and governance lanes pass. The reproduced tablet rewind and live one-direction recovery defects are repaired without weakening acceptance. P3 is not complete until real human WAN evidence is recorded, and the branch still requires refreshed exact-head review and ordinary merge authority before entering `main`.
