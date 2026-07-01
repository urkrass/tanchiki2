# Release Checklist

This checklist is for proof and readiness only. It is not a deployment or publication procedure.

## Required Before Release

- [x] Load `.agentic-harness/memory/` before claiming production readiness.
- [x] Fetch latest `main` and base the closeout branch on the merged I4 head.
- [x] Verify Product Review Warden allows `COMPLETE`.
- [x] Confirm no open blocking P1/P2 review debt.
- [x] Confirm repaired review debt has linked repair-work evidence.
- [x] Confirm no human waivers were used.
- [x] Run `npm.cmd run validate`.
- [x] Run `npm.cmd run harness:validate`.
- [x] Run `npm.cmd run harness:smoke`.
- [x] Run Product Review Warden with `--check --compact --stdout`.
- [x] Capture offline campaign browser smoke.
- [x] Capture online battle or server smoke.
- [x] Capture minimap/fog browser evidence.
- [x] Capture input-control browser evidence.
- [x] Capture combat-interaction browser evidence.
- [x] Inspect browser screenshots for blank or broken canvas states.
- [x] Confirm old stacked PRs are closed or superseded and not pending merge.
- [x] Run `git diff --check` on the final unstaged diff.
- [x] Run `git diff --cached --check` on the final staged diff.
- [ ] Confirm GitHub Actions validate passes on the I5 PR head.

## Human Gate Items

These require explicit human approval and are outside I5:

- [ ] Deploy or publish.
- [ ] Tag or announce a release.
- [ ] Change production settings.
- [ ] Change billing settings.
- [ ] Add, rotate, or remove secrets.
- [ ] Change branch protection.
- [ ] Remove rollback.
- [ ] Waive Review Warden debt.

## I5 Evidence Summary

- Base: `origin/main` at `de2d1e25dec7fdc681f691ce7a0fb93cb504756e`.
- Warden: `PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED`, `open_blocking_count: 0`, no human waivers.
- Validation: `npm.cmd run validate`, `npm.cmd run harness:validate`, and `npm.cmd run harness:smoke` passed locally.
- Browser proof: `output/i5-production-closeout/` contains offline, online, input, and combat screenshots plus text state.
