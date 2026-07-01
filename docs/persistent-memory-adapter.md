# Persistent Memory Adapter

Date: 2026-07-01

Tanchiki2 uses the post-I2 agentic-harness persistent memory adapter pinned to `urkrass/agentic-harness@5910034157384a8c777a1ed8f2492ee36a3ad1c6`.

Future Codex sessions must load `.agentic-harness/memory/` before claiming package, production, or release `COMPLETE`.

Required memory files:

- `.agentic-harness/memory/project-memory.json`
- `.agentic-harness/memory/role-memory.json`
- `.agentic-harness/memory/review-debt.json`
- `.agentic-harness/memory/validation-memory.json`
- `.agentic-harness/memory/closeout-memory.json`

Review Warden command:

```powershell
npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout
```

Current expected behavior: production/release `COMPLETE` is blocked because open P1/P2 review debt remains in `.agentic-harness/memory/review-debt.json`.

The memory files are evidence and operating context only. Git artifacts, PR review, validation results, and human gates remain authoritative.
