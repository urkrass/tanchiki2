# Persistent Memory Adapter

Date: 2026-07-01

Tanchiki2 uses the post-I7 agentic-harness persistent memory adapter and Deep Agents stub-runtime planning profile pinned to `urkrass/agentic-harness@4e1825c84650b032b23d98029772918fb1740c80`.

Future Codex sessions must load `.agentic-harness/memory/` before claiming package, production, or release `COMPLETE`.

Required memory files:

- `.agentic-harness/memory/project-memory.json`
- `.agentic-harness/memory/role-memory.json`
- `.agentic-harness/memory/review-debt.json`
- `.agentic-harness/memory/validation-memory.json`
- `.agentic-harness/memory/closeout-memory.json`
- `.agentic-harness/deep-agents/runtime-profile.json`
- `.agentic-harness/deep-agents/scenarios/polish-planning.json`

Review Warden command:

```powershell
npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout
npm.cmd run harness:deep-agent:stub-runtime
```

Current expected behavior after I4: production/release `COMPLETE` is allowed only when the Product Review Warden gate passes against `.agentic-harness/memory/review-debt.json`.

Current I8 Deep Agents behavior: `npm.cmd run harness:deep-agent:stub-runtime` produces a deterministic planning trace and bounded polish plan without provider calls, external network calls, GitHub/Linear mutation, deployment, publish, release, or gameplay implementation authority.

The memory files are evidence and operating context only. Git artifacts, PR review, validation results, and human gates remain authoritative.
