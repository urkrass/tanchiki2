# Tanchiki2 Deep Agents Stub Runtime

Tanchiki2 is pinned to `urkrass/agentic-harness@4e1825c84650b032b23d98029772918fb1740c80`, the I7 deterministic Deep Agents stub-runtime commit.

Run the Tanchiki2 polish-planning scenario with:

```powershell
npm.cmd run harness:deep-agent:stub-runtime
```

The wrapper reads `.agentic-harness/deep-agents/runtime-profile.json` and
`.agentic-harness/deep-agents/scenarios/polish-planning.json`, materializes the
exact pinned I7 runtime from a local Agentic Harness checkout, and writes:

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
