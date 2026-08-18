# Contributing to Brew ni Cat Connect

## Before changing code or documentation

1. Read the relevant requirement IDs and architecture decisions.
2. Confirm the work belongs to the current roadmap phase.
3. Check `git status` and start from an up-to-date `main` branch.
4. Create a focused branch for a meaningful feature, test, documentation set, or fix.

Suggested branch prefixes are `feat/`, `fix/`, `docs/`, `test/`, and `integration/`.

## Change requirements

- Do not invent business information. Use `TODO: Confirm with Brew ni Cat owner.`
- Label and isolate fixtures as `MOCK DATA — FOR DEVELOPMENT ONLY`.
- Never commit credentials, personal customer data, or production exports.
- Keep functionality traceable to requirements.
- Update affected documentation and the development log.
- Add tests for important business logic and report only commands that were actually run.
- Run formatting, linting, type checking, tests, and a production build when the application foundation exists.

## Commits

Use an imperative, meaningful subject, for example:

```text
docs: document ordering execution paths
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
- Testing commands and literal results
- Screenshots for visible UI changes, when applicable
- Security/privacy impact
- Known limitations
- Documentation updated
- Checklist

Leave pull requests that require peer-review evidence open until a real teammate review occurs. Do not mark a module reviewed without an identifiable review record.
