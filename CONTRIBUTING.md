# Contributing to Brew ni Cat Connect

## Before changing code

1. Read the relevant requirement IDs and architecture decisions.
2. Confirm the work belongs to the current roadmap phase.
3. Check `git status` and start from an up-to-date `main` branch.
4. Create one branch per task, named on its Trello card (for example `feat/p4-order-api`).

Use the `feat/`, `fix/` or `test/` prefix.

## Change requirements

- Do not invent business information. Use `TODO: Confirm with Brew ni Cat owner.`
- Label and isolate fixtures as `MOCK DATA — FOR DEVELOPMENT ONLY`.
- Never commit credentials, personal customer data, or production exports.
- Keep functionality traceable to requirements.
- Add tests for your code (unit, component or browser tests) in the same pull request.
- Before pushing, run `npm run format`, `npm run lint`, `npm run typecheck` and `npm test`. CI runs these on every pull request, plus the dependency audit, the production build and the chromium browser tests.

## Commits

Use an imperative, meaningful subject, for example:

```text
feat: add order tracking page
feat: add accessible mobile navigation
test: cover cart total calculation
fix: reject invalid order transitions
```

Use only the contributor's configured Git identity. Do not add automated co-author trailers.

## Pull requests

A review-ready pull request should include:

- Summary
- Requirement IDs addressed
- Changes
- Security or privacy impact, if any
- Known limitations

CI must pass before review. The CI run replaces pasted test results. Documentation updates, screenshots and manual test notes are not needed.

Self-approval is allowed for the lead developer's own pull requests; record the approval in the pull request. Teammate pull requests still need a review by Rodnee or Van before merge. Do not mark a module reviewed without an identifiable review record.
