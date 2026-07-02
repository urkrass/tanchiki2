# Tanchiki2 GitHub Pages Relative Base Repair

## Decision State

`GITHUB_PAGES_RELATIVE_BASE_REPAIR_READY_FOR_REDEPLOY`

## Source Head

- Current `main` source head before this repair: `ef6a187c86fac62a15e53831da08a901744ee246`.
- Failed redeploy run inspected by this package: `28612400957`.
- Pages URL: `https://urkrass.github.io/tanchiki2/`.

## Failure Evidence

- PR #60 fixed the Vite project-site base to `/tanchiki2/` and merged into `main`.
- Post-merge `Validate` passed for `ef6a187c86fac62a15e53831da08a901744ee246`.
- The authorized redeploy run `28612400957` built successfully and uploaded Pages artifact `8047994978`.
- The uploaded artifact was structurally valid, contained no symlinks, and included `index.html`, `favicon.svg`, `assets/index-BedFxgZK.js`, `assets/index-Bc-eb6z6.css`, and sprite assets.
- The artifact `index.html` referenced `/tanchiki2/assets/...` as intended.
- GitHub Pages accepted the deployment request for source head `ef6a187c86fac62a15e53831da08a901744ee246`, then reported `deployment_failed` after `deployment_queued`.
- Deployment record `5289229174` ended in `failure`.
- The live URL still served the previous faulty HTML from the earlier successful deployment and did not publish the repaired artifact.

## Repair

Changed the Vite base from an absolute project-site path to a relative base:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
})
```

This keeps the static site deployable under `https://urkrass.github.io/tanchiki2/` while avoiding absolute asset URLs inside the artifact. Local build evidence confirmed the generated HTML now references:

- `./favicon.svg`;
- `./assets/index-BedFxgZK.js`;
- `./assets/index-Bc-eb6z6.css`.

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

After merge, perform one clean GitHub Pages redeploy from the resulting exact `main` head only if the merge, GitHub `Validate`, and Review Warden gates remain clean.

Tag decision remains no tag.

Announcement decision remains no announcement.

Rollback target remains pre-workflow main head `dbaf0db6c4310edb32cbe03860f3a435d007185d`, plus disabling or pausing GitHub Pages publication if a faulty deployment remains live.
