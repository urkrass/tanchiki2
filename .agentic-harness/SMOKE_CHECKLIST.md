# Consumer Bootstrap Smoke Checklist

Use this checklist before claiming Tanchiki has adopted the bootstrap kit.

## Local Files

- Project adapter exists at `.agentic-harness/project-adapter.yml`.
- Lockfile exists at `.agentic-harness/agentic-harness.lock.json`.
- Validation profile exists at `.agentic-harness/validation-profile.yml`.
- Resource locks exist at `.agentic-harness/resource-locks.yml`.
- Human gates exist at `.agentic-harness/human-gates.yml`.
- Wrapper exists at `.agentic-harness/harness-wrapper.mjs`.
- Persistent memory exists under `.agentic-harness/memory/`.
- Memory ledger exists at `.agentic-harness/memory-ledger.json`.
- Product Review Warden input exists at `.agentic-harness/review-warden-gate.json`.
- Deep Agents stub-runtime profile exists at `.agentic-harness/deep-agents/runtime-profile.json`.
- Deep Agents polish-planning scenario exists at `.agentic-harness/deep-agents/scenarios/polish-planning.json`.

## Required Checks

- Adapter uses `agentic_harness.project_adapter.v1`.
- Lockfile uses `agentic_harness.consumer_lock.v1`.
- Lockfile points at an explicit pinned core ref and resolved commit.
- Wrapper rejects `latest`, `main`, `master`, `HEAD`, and `refs/heads/*`.
- Lockfile declares persistent project, role, review-debt, validation, and closeout memory.
- Wrapper rejects missing persistent memory files or Review Warden gate input.
- Product Review Warden reports production/release `COMPLETE` blocked while unresolved P1/P2 review debt remains.
- Green validation alone is not accepted as review-debt closure.
- Deep Agents stub runtime runs deterministically through `npm.cmd run harness:deep-agent:stub-runtime`.
- Deep Agents trace consults Project Steward, Review Warden, Validation Agent, Git Discipline, and Release Warden.
- Deep Agents polish planning does not call providers, GitHub, Linear, web, deployment APIs, or external network.
- Local fallback remains declared through the adapter rollback section.
- Validation profile includes test, build, runner-loop smoke, and consumer bootstrap smoke commands.
- Resource lock evidence shows changed files stay inside `owns`.
- Human gate evidence requires gates for external setup, public release, product switch, local harness deletion, credential/security changes, production deployment, and external operational procedure changes.
- Credentials are represented by reference names only.
- No dashboards, deploys, billing, branch protection, production settings, or credential values are changed.
- Playwright game smoke reaches live gameplay and records `render_game_to_text`.

## Evidence To Record

- Commands run and pass/fail result.
- Pinned core ref and resolved commit reference.
- Persistent memory file summary.
- Product Review Warden terminal outcome and open blocking debt ids.
- Deep Agents stub-runtime terminal outcome, trace role sequence, and generated polish plan artifact.
- Local fallback command reference.
- Resource lock diff summary.
- Human gate summary.
- Gameplay screenshot and text-state summary.
