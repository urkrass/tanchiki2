# Tanchiki2 GitHub Pages Base Path Repair

## Decision State

`GITHUB_PAGES_BASE_PATH_REPAIR_READY_FOR_REDEPLOY_AUTHORIZATION`

## Source Head

- Current `main` source head before this repair: `1559cd7ab1911c7abc8e51995a70dc3eeb0a4f20`.
- Successful deployment run with faulty live smoke: `28611138626`.
- Pages URL: `https://urkrass.github.io/tanchiki2/`.

## Failure Evidence

- The GitHub Pages workflow run `28611138626` completed successfully.
- Pages deployment status for `1559cd7ab1911c7abc8e51995a70dc3eeb0a4f20` reported `succeed`.
- The live HTML at `https://urkrass.github.io/tanchiki2/` returned HTTP `200`.
- Browser smoke found zero `canvas` elements.
- The published HTML referenced `/assets/index-BedFxgZK.js` and `/assets/index-Bc-eb6z6.css`.
- Those absolute paths resolved to `https://urkrass.github.io/assets/...`, which returned `404`.
- The actual assets existed under `https://urkrass.github.io/tanchiki2/assets/...`.
- Browser smoke evidence was written to `output/github-pages-release-smoke/no-canvas-debug.json` and `output/github-pages-release-smoke/no-canvas-debug.png`.

## Root Cause

The Vite build used the default root asset base. For a GitHub Pages project site, the generated HTML must use the repository path prefix `/tanchiki2/`.

## Repair

Added `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tanchiki2/',
})
```

Local build evidence confirmed the generated HTML now references:

- `/tanchiki2/favicon.svg`;
- `/tanchiki2/assets/index-BedFxgZK.js`;
- `/tanchiki2/assets/index-Bc-eb6z6.css`.

## Explicit Non-Actions

No workflow dispatch was performed by this repair package before merge.

No deployment retry, publishing retry, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external-provider mutation, game logic change, package dependency change, or non-GitHub-Pages release action was performed by this repair package before merge.

## Local Validation

- `npm.cmd run validate` passed with 18 test files and 186 tests, production build, server smoke, harness validate, and harness smoke.
- `npm.cmd run visual:contrast` passed with `contrast ok`.
- `npm.cmd run harness:validate` passed.
- `npm.cmd run harness:smoke` passed.
- `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` passed with terminal outcome `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `can_claim_complete: true`, `open_blocking_count: 0`, and `finding_codes: []`.
- `git diff --check` passed.
- `git diff --cached --check` passed before staging.

## Required Before Redeploy

Future deployment retry authorization must name all of:

- exact source head after this repair is merged;
- exact workflow file;
- deployment/publishing target;
- deployment/publishing method;
- tag decision;
- announcement decision;
- rollback target;
- any production-setting exception required for GitHub Pages, otherwise production settings remain forbidden.

The next governed action after merge is one clean GitHub Pages redeploy from the repaired `main` head, only if separately authorized.
