# Persistent Memory Adapter

Date: 2026-07-03

Tanchiki2 uses the post-I7 agentic-harness persistent memory adapter, Deep Agents stub-runtime planning profile, and attended-v2 lifecycle telemetry wiring pinned to `urkrass/agentic-harness@69df33aafbe6f2738b87419d449fd3ee4f84f018`.

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
npm.cmd run harness:attended-v2:lifecycle-trace-smoke
```

Current expected behavior after I4: production/release `COMPLETE` is allowed only when the Product Review Warden gate passes against `.agentic-harness/memory/review-debt.json`.

Current I8 Deep Agents behavior: `npm.cmd run harness:deep-agent:stub-runtime` produces a deterministic planning trace and bounded polish plan without provider calls, external network calls, GitHub/Linear mutation, deployment, publish, release, or gameplay implementation authority.

Current attended-v2 lifecycle telemetry behavior: `npm.cmd run harness:attended-v2:lifecycle-trace-smoke` validates the consumer wiring for the upstream safe lifecycle smoke. The upstream GitHub workflow dispatch uses branch selector `codex/mar-693-empty-base` only after verifying it resolves to harness commit `69df33aafbe6f2738b87419d449fd3ee4f84f018`, because GitHub workflow dispatch does not accept the raw commit SHA as `--ref`. Live LangSmith trace evidence is advisory only and must record trace id, GitHub run URL, terminal outcome, and `secret-values-logged=false` without exposing secret values.

The memory files are evidence and operating context only. Git artifacts, PR review, validation results, and human gates remain authoritative.
