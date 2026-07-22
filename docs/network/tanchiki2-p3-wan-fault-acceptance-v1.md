# Tanchiki2 P3 WAN and Fault Acceptance v1

Status: **AUTOMATED ACCEPTANCE PARTIAL; EXTERNAL GATES PENDING**

Date: 2026-07-22

Exact base commit: `730df3e05a77724e377ad8e5e958b6834af15714`

Working branch: `codex/tanchiki2-p3-wan-fault-acceptance-v1`

This package executes the locally available P3 network acceptance, preserves replayable seeds, and repairs defects found by those lanes. It does not claim Docker/Toxiproxy execution or human WAN acceptance when those environments are unavailable. No room key, reconnection token, internal room identifier, connection address, credential, or participant identity appears in this evidence.

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
| Bundled web-game Playwright client | PASS | Final post-repair run produced structured state and inspected screenshots under ignored `output/p3-bundled-client-final/`; no browser error artifact was emitted. |
| `npm.cmd run validate` | PASS | 56 files and 527 tests, production build, real-SDK server smoke, harness validation/smoke, Reviewer App dry run, and attended-v2 lifecycle smoke. |
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

## Unclaimed external gates

### Docker/Toxiproxy runtime

Status: **BLOCKED BY LOCAL ADMINISTRATOR-LEVEL SERVICE CONFIGURATION**

Docker CLI `29.6.1` and Compose `5.3.0` are installed. Docker Desktop could not start because the installed Windows WSL service is disabled. Temporarily changing that service to manual startup was denied by the current non-administrator session. No native Toxiproxy binary is present.

Therefore none of these proxy-backed lanes is claimed:

- mixed clean/30 ms/80 ms/150 ms plus jitter;
- five-second outage;
- simultaneous reconnect;
- abrupt reset;
- one-direction stall;
- overlong outage and forfeit;
- slow-client/backpressure;
- 100-match five-second-outage soak.

Required operator action: enable the WSL service from an administrator session, start Docker Desktop, then execute the pinned compose lab and every command in `docs/online-network-test-runbook.md`. Preserve the reported seed and redacted failure trace if any lane fails.

### Human WAN playtest

Status: **PENDING EXTERNAL PARTICIPANTS**

Matches completed: `0 / 10 minimum`.

Required operator action: schedule 10-20 real 2v2 matches with physical devices across home Wi-Fi, a mobile hotspot, and at least one participant on a remote network. Complete `docs/online-wan-playtest-checklist.md` with anonymous participant labels and redacted aggregate results.

## Terminal outcome

`P3_AUTOMATED_ACCEPTANCE_PARTIAL_EXTERNAL_GATES_PENDING`

The available clean, browser, tablet, full-validation, and governance lanes pass, and the reproduced tablet rewind is repaired without weakening acceptance. P3 is not complete until actual Toxiproxy runtime evidence and real human WAN evidence are recorded, and the branch still requires exact-head review and ordinary merge authority before entering `main`.
