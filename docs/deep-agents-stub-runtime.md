# Tanchiki2 Deep Agents Stub Runtime

Tanchiki2 is pinned to `urkrass/agentic-harness@69df33aafbe6f2738b87419d449fd3ee4f84f018`, the attended-v2 lifecycle LangSmith telemetry commit that includes the I7 deterministic Deep Agents stub-runtime.

Run the Tanchiki2 polish-planning scenario with:

```powershell
npm.cmd run harness:deep-agent:stub-runtime
```

The wrapper reads `.agentic-harness/deep-agents/runtime-profile.json` and
`.agentic-harness/deep-agents/scenarios/polish-planning.json`, materializes the
exact pinned runtime from a local Agentic Harness checkout, and writes:

- `.agentic-harness/deep-agents/outputs/polish-plan-v1.json`
- `docs/planning/tanchiki2-polish-plan-v1.md`

By default the wrapper expects the local harness checkout at
`D:/agentic-harness/repo`. Set `AGENTIC_HARNESS_REPO` to a different local
checkout if needed. The wrapper verifies that checkout contains the exact pinned
commit before running.

The scenario is planning-only. It does not call providers, GitHub, Linear, web,
deployment APIs, or external network services. It does not grant deployment,
publish, release, merge, review, or product-source mutation authority. Memory is
evidence and context only; Git artifacts remain authority.
