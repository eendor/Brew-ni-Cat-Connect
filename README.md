# Brew ni Cat Connect

**Development status:** Phase 1 — Project Foundation: Testing / Review\
**Specification version:** 0.1 Draft\
**Last updated:** 2026-08-23

Brew ni Cat Connect is the customer-facing omnichannel platform being developed for Brew ni Cat Coffee Shop. It complements the existing Brew ni Cat POS; it does not recreate the POS or claim that a production integration currently exists.

## Project Status

The Phase 1 web foundation is implemented on `feat/project-foundation` and is awaiting teammate QA and pull-request review. This milestone establishes the application shell and engineering toolchain without beginning the Phase 2 business showcase or later ordering and integration work.

| Area                                  | Status                                      |
| ------------------------------------- | ------------------------------------------- |
| Phase 0 specification                 | Version 0.1 Draft complete                  |
| Phase 1 web foundation                | Testing / Review                            |
| Phase 2 production business content   | Not implemented                             |
| Online ordering and customer accounts | Not implemented                             |
| Supabase backend                      | Deferred to Phase 4                         |
| Existing POS integration              | Deferred pending Phase 6 analysis           |
| Messenger assistant                   | Deferred until the shared backend is stable |
| Android application                   | Deferred to Phase 8                         |

## Implemented Foundation

- Next.js App Router application using React and strict TypeScript
- Tailwind CSS design tokens and responsive global styles
- Semantic root layout, header, desktop navigation, mobile navigation, main content, and footer
- Homepage shell and intentionally minimal `/menu`, `/about`, `/gallery`, and `/contact` routes
- Loading, error-boundary, and not-found foundations
- Keyboard-accessible navigation and visible focus/reduced-motion foundations
- Vitest and Testing Library unit/component tests
- Playwright browser smoke tests
- ESLint, Prettier, explicit TypeScript checking, production builds, and GitHub Actions CI configuration

## Tech Stack

Only the installed Phase 1 web stack is listed here:

- Next.js 16.3.2 with App Router
- React and React DOM 19.2.8
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- Vitest 4.1.11 and Testing Library
- Playwright 1.62.1
- ESLint 9.39.5 and Prettier 3.9.6

The complete version and license register is in [`docs/software-and-apis.md`](docs/software-and-apis.md).

## Requirements

- Node.js 24.x (`package.json` permits `>=24.0.0 <25`; `.nvmrc` selects 24)
- npm 12.x
- Python 3.10+ for the dependency-free specification validator (CI uses 3.14)
- Git
- GitHub access if cloning the private repository

## Installation

```bash
git clone https://github.com/eendor/Brew-ni-Cat-Connect.git
cd Brew-ni-Cat-Connect
npm ci
```

`npm ci` installs the exact direct and transitive versions recorded in `package-lock.json`.

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The current public routes are `/`, `/menu`, `/about`, `/gallery`, and `/contact`.

## Quality Checks

```bash
npm run format:check
npm run audit
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
python scripts/validate_phase0_docs.py
```

Run `npm run test:watch` for an interactive Vitest development loop. Executed results are recorded in the Phase 1 test evidence and development log rather than being assumed from configuration alone.

## E2E Tests

Install the Chromium binary once on a new workstation, then run the browser suite:

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E command creates a production build, starts it locally, and executes the Playwright smoke tests. Generated Playwright reports and test results are ignored by Git.

## Documentation

Start with:

- [`docs/srs.md`](docs/srs.md) — master Software Requirements Specification
- [`docs/project-overview.md`](docs/project-overview.md) — purpose, users, scope, and boundaries
- [`docs/functional-requirements.md`](docs/functional-requirements.md) — testable functional requirements
- [`docs/non-functional-requirements.md`](docs/non-functional-requirements.md) — quality requirements
- [`docs/system-architecture.md`](docs/system-architecture.md) — current and planned architecture
- [`docs/development-standards.md`](docs/development-standards.md) — implementation and review conventions
- [`docs/testing-strategy.md`](docs/testing-strategy.md) — test levels and quality gates
- [`docs/test-cases.md`](docs/test-cases.md) — stable Phase 1 test cases and results
- [`docs/code-review.md`](docs/code-review.md) — inspection checklist and pending teammate handoff
- [`docs/evidence/phase-1-verification.md`](docs/evidence/phase-1-verification.md) — executed Phase 1 validation record
- [`docs/decisions.md`](docs/decisions.md) — architecture decision records
- [`docs/development-log.md`](docs/development-log.md) — truthful milestone history

## Current Limitations

Phase 1 intentionally does not implement:

- confirmed production business copy, menu data, prices, images, address, opening hours, contact details, or social accounts;
- online ordering, product customization, cart, checkout, payment, pickup, or delivery;
- Supabase, a production database, authentication, customer profiles, order tracking, loyalty, favorites, or realtime updates;
- Messenger integration, the Android application, or existing POS integration; or
- deployment and production operations.

Owner-dependent information remains marked:

```text
TODO: Confirm with Brew ni Cat owner.
```

Development fixtures, if introduced in a later phase, must remain separated from production data and be labelled:

```text
MOCK DATA — FOR DEVELOPMENT ONLY
```

## Contributing

Use focused feature branches, meaningful Conventional Commit-style messages, appropriate automated tests, and pull requests for reviewable work. Phase 1 remains unmerged so Renier can perform the real QA and peer review. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/development-standards.md`](docs/development-standards.md).

## Configuration and Secrets

Phase 1 requires no runtime secrets. `.env.example` reserves later configuration names without supplying credentials. Never commit `.env`, service-role keys, tokens, passwords, webhook secrets, or private certificates.

## License

This repository currently uses an interim proprietary, all-rights-reserved license while client and academic distribution terms are confirmed. See [`LICENSE`](LICENSE) and ADR-005 in [`docs/decisions.md`](docs/decisions.md).
