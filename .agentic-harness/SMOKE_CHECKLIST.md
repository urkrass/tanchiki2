# Consumer Bootstrap Smoke Checklist

Use this checklist before claiming Tanchiki has adopted the bootstrap kit.

## Local Files

- Project adapter exists at `.agentic-harness/project-adapter.yml`.
- Lockfile exists at `.agentic-harness/agentic-harness.lock.json`.
- Validation profile exists at `.agentic-harness/validation-profile.yml`.
- Resource locks exist at `.agentic-harness/resource-locks.yml`.
- Human gates exist at `.agentic-harness/human-gates.yml`.
- Wrapper exists at `.agentic-harness/harness-wrapper.mjs`.

## Required Checks

- Adapter uses `agentic_harness.project_adapter.v1`.
- Lockfile uses `agentic_harness.consumer_lock.v1`.
- Lockfile points at an explicit pinned core ref and resolved commit.
- Wrapper rejects `latest`, `main`, `master`, `HEAD`, and `refs/heads/*`.
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
- Local fallback command reference.
- Resource lock diff summary.
- Human gate summary.
- Gameplay screenshot and text-state summary.
