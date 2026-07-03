# Tanchiki2 Reviewer App Workflow

Tanchiki2 uses `.github/workflows/reviewer-app.yml` for exact-head Reviewer App review.

The workflow validates the PR head in this repository, then checks out the trusted
`urkrass/agentic-harness` attended-v2 commit
`69df33aafbe6f2738b87419d449fd3ee4f84f018` to run Reviewer App logic.
Because the trusted harness repository is private, the same Reviewer App
installation must have read access to `urkrass/agentic-harness`.

## Dispatch

Dry-run without review submission:

```powershell
gh workflow run reviewer-app.yml --repo urkrass/tanchiki2 --ref main -f pr_number=<PR_NUMBER> -f issue=<ISSUE_OR_PACKAGE_ID> -f verify_token=false -f submit_review=false
```

This no-secret dry-run validates the product PR head, Product Review Warden, and
local Reviewer App wiring. It does not request a token, check out the private
trusted harness repository, or submit a GitHub review.

Submit a live review after token verification:

```powershell
gh workflow run reviewer-app.yml --repo urkrass/tanchiki2 --ref main -f pr_number=<PR_NUMBER> -f issue=<ISSUE_OR_PACKAGE_ID> -f verify_token=true -f submit_review=true
```

## Authority

The workflow is review-only. It may submit a GitHub PR review through the
Reviewer App identity only when `submit_review=true` and all gates pass.

It must not deploy, publish, tag, announce, merge, push, change repository
settings, change secrets, change billing, change branch protection, or change
Tanchiki2 game logic.

Secret values are not printed. The workflow reports setup presence by secret
name only and relies on the harness output guard to reject secret-like output.

Required repository secrets:

- `OPENAI_API_KEY`
- `REVIEWER_APP_ID`
- `REVIEWER_APP_PRIVATE_KEY`
- `REVIEWER_APP_INSTALLATION_ID`

When `verify_token=true` or `submit_review=true`, the workflow uses
`REVIEWER_APP_ID` and `REVIEWER_APP_PRIVATE_KEY` to mint a short-lived
installation token for the private trusted harness checkout. The token is not
printed or written to disk.

## Local Validation

```powershell
npm.cmd run harness:reviewer-app:dry-run
```

This command validates the local workflow wiring and the non-secret dry-run
fixture `.agentic-harness/reviewer-app-dry-run-evidence.json`. It is evidence
that the workflow is wired correctly, not an exact-head approval.
