# Tanchiki2 GitHub Pages Sprite Base Repair

## Decision State

`GITHUB_PAGES_SPRITE_BASE_REPAIR_READY_FOR_REDEPLOY`

## Source Head

- Current `main` source head before this repair: `f720cec20f9ff789a8b53868a34720f66cc3f606`.
- Successful redeploy run inspected by this package: `28612828153`.
- Redeploy run URL: `https://github.com/urkrass/tanchiki2/actions/runs/28612828153`.
- Pages URL: `https://urkrass.github.io/tanchiki2/`.

## Failure Evidence

- PR #61 changed the Vite base to relative `./` and merged into `main`.
- Post-merge `Validate` passed for `f720cec20f9ff789a8b53868a34720f66cc3f606`.
- The authorized redeploy run `28612828153` completed successfully from source head `f720cec20f9ff789a8b53868a34720f66cc3f606`.
- Repository Pages configuration remained `build_type: workflow`, public, and HTTPS enforced.
- The live HTML loaded the project-scoped JS and CSS from `https://urkrass.github.io/tanchiki2/`.
- Browser smoke reached live gameplay with a nonblank canvas, but console errors showed root-scoped sprite requests returning 404:
  - `https://urkrass.github.io/assets/sprites/tanchiki-core-32.png?v=3`;
  - `https://urkrass.github.io/assets/sprites/tanchiki-ui-32.png?v=4`;
  - `https://urkrass.github.io/assets/sprites/tanchiki-ui-20.png?v=4`;
  - `https://urkrass.github.io/assets/sprites/tanchiki-core-20.png?v=3`.

## Repair

Changed the core sprite atlas and UI sprite atlas URL construction to use Vite's configured base URL:

```ts
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
```

The sprite sheet URLs now resolve through `assetUrl('assets/sprites/...')` instead of absolute `/assets/sprites/...` paths. With the current relative Vite base, local build output uses project-relative sprite paths such as `./assets/sprites/tanchiki-core-32.png?v=3`.

## Explicit Non-Actions

No workflow dispatch was performed by this repair package before merge.

No deployment retry, publishing retry, tag, announcement, production-setting change, secret change, billing change, branch-protection change, rollback change, rollback removal, external-provider mutation, package dependency change, or non-GitHub-Pages release action was performed by this repair package before merge.

## Local Validation

- `npm.cmd run build` passed and emitted `dist/assets/index-D9c3BV_Z.js`.
- Local build evidence confirmed the generated bundle no longer contains root-scoped `/assets/sprites/...` sprite sheet URLs.
- `npm.cmd run validate` passed.
- `npm.cmd run visual:contrast` passed.
- `npm.cmd run harness:validate` passed.
- `npm.cmd run harness:smoke` passed.
- `npm.cmd run harness:review-warden:product-repo -- --input .agentic-harness/review-warden-gate.json --check --compact --stdout` passed with terminal outcome `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `can_claim_complete: true`, and `open_blocking_count: 0`.
- `git diff --check` passed.
- `git diff --cached --check` passed before staging.

## Required Before Redeploy

After merge, perform one clean GitHub Pages redeploy from the resulting exact `main` head only if the merge, GitHub `Validate`, and Review Warden gates remain clean.

Tag decision remains no tag.

Announcement decision remains no announcement.

Rollback target remains pre-workflow main head `dbaf0db6c4310edb32cbe03860f3a435d007185d`, plus disabling or pausing GitHub Pages publication if a faulty deployment remains live.
