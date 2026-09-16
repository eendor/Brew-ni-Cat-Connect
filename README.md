# Brew ni Cat Connect

**Development status:** Phase 2 — Public Showcase Website: Testing / Review
**Specification version:** 0.1 Draft (living specification)
**Last updated:** 2026-08-24

Brew ni Cat Connect is the customer-facing omnichannel platform for Brew ni Cat Coffee Shop in Kabacan, Cotabato. It complements the existing Brew ni Cat POS; it does not recreate or expose the POS.

## Project Status

Phase 1 was independently tested and approved by Renier Apal, then merged to `main` in merge commit `11c546d`. Phase 2 is being developed on `feat/showcase-website` and must remain unmerged until independent QA and pull-request review are complete.

| Area                                    | Status                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 specification                   | Version 0.1 Draft complete                                                                                                   |
| Phase 1 web foundation                  | Tested, approved, and merged                                                                                                 |
| Phase 2 public showcase                 | Implementation and automated validation complete; independent QA and peer review pending                                     |
| Read-only current menu                  | Live publishable runtime verified: 6 categories/16 items render; manually disabled RLS remains a production security blocker |
| Online ordering and accounts            | Deferred to later phases                                                                                                     |
| Messenger, Android, and POS integration | Deferred to their approved roadmap phases                                                                                    |

## Phase 2 Public Experience

The current increment replaces the Phase 1 placeholders with customer-facing routes for:

- Home, including the official logo, featured customer-favorite groups, gallery and visit previews;
- a read-only Menu that retrieves the current catalog through Supabase public configuration at browser runtime;
- About, using restrained facts confirmed for the business;
- Gallery, using a curated set of 18 approved local shop/customer photographs; and
- Contact, location, payment, takeout, variable-hours, social, and independent-rider information.

No cart, checkout, account, order write, payment processing, rider booking, or database administration is included. Old menu-poster artwork is a visual reference only and is not the source of current names or prices.

## Tech Stack

- Next.js 16.3.2 with App Router
- React and React DOM 19.2.8
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- Supabase JavaScript 2.112.3 for public read-only catalog access
- Vitest 4.1.11 and Testing Library
- Playwright 1.62.1
- ESLint 9.39.5 and Prettier 3.9.6

Exact versions and licenses are recorded in [`docs/software-and-apis.md`](docs/software-and-apis.md).

## Requirements

- Node.js 24.x (`package.json` permits `>=24.0.0 <25`; `.nvmrc` selects 24)
- npm 12.x
- Python 3.10+ for the dependency-free specification validator
- Git
- GitHub access if cloning the private repository

## Installation

```bash
git clone https://github.com/eendor/Brew-ni-Cat-Connect.git
cd Brew-ni-Cat-Connect
npm ci
```

## Environment Configuration

Copy `.env.example` to `.env.local` and supply deployment-appropriate public values through a local or managed environment store:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The Phase 2 browser runtime uses only these public variables. `.env.local` and other value-bearing environment files are ignored. Privileged credentials must never be exposed to browser code or committed.

The initial public probes returned an empty catalog; those **BEFORE** captures remain as failure-state evidence. After the owner/developer manually disabled RLS on the relevant catalog tables, the website's publishable runtime returned and rendered 6 categories and 16 items. The application still uses no privileged fallback and made no business-data or RLS change.

This current access depends on table grants and is not least privilege. HEAD-only/no-body checks found unrelated inventory, recipe, expense, order, order-item, and release tables publicly reachable. Restoring RLS and adding tested, explicit catalog-only anonymous `SELECT` policies is a production security blocker.

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Public routes are `/`, `/menu`, `/about`, `/gallery`, and `/contact`.

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

The final local Phase 2 follow-up passed formatting, dependency audit, lint, type checking, 21 of 21 unit/component tests in 6 files, the production build with 7 of 7 static pages, 13 of 13 Playwright tests, and the documentation validator. Literal results and the unmocked five-width live review are recorded in [`docs/evidence/phase-2-implementation.md`](docs/evidence/phase-2-implementation.md). Both hosted workflows for follow-up evidence head `975561b` passed. [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2) remains open/unmerged, and Renier's independent QA remains pending.

## End-to-End Tests

Install Chromium once on a new workstation, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite builds the production application, starts it locally, and exercises representative desktop/mobile public routes. Generated reports and test results are ignored by Git.

## Documentation

- [`docs/srs.md`](docs/srs.md) — master Software Requirements Specification
- [`docs/functional-requirements.md`](docs/functional-requirements.md) — testable requirements and implementation status
- [`docs/system-architecture.md`](docs/system-architecture.md) — current architecture and trust boundaries
- [`docs/database-design.md`](docs/database-design.md) — discovered read-only menu schema boundary
- [`docs/security-and-privacy.md`](docs/security-and-privacy.md) — public-key, RLS, secret, and privacy controls
- [`docs/testing-strategy.md`](docs/testing-strategy.md) and [`docs/test-cases.md`](docs/test-cases.md) — Phase 2 verification plan and cases
- [`docs/evidence/phase-2-implementation.md`](docs/evidence/phase-2-implementation.md) — implementation and QA handoff record
- [`docs/decisions.md`](docs/decisions.md) — architecture decision records
- [`docs/development-log.md`](docs/development-log.md) — truthful milestone history

## Current Limitations

The following remain outside Phase 2:

- online ordering, product configuration for purchase, cart, checkout, and order submission;
- customer authentication, profiles, history, tracking, favorites, loyalty, and rewards;
- payment processing or direct rider booking;
- Messenger, Android, and POS synchronization changes;
- database migrations, production-data mutations, or administrative functions; and
- a permanent weekly-hours promise or owner biography that has not been approved.

Operating hours are variable. Customers are directed to the official Facebook page or the shop contact details for the current schedule.

## Contributing

Use focused feature branches, meaningful Conventional Commit-style messages, appropriate automated tests, and pull requests for reviewable work. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/development-standards.md`](docs/development-standards.md).

## License

This repository currently uses an interim proprietary, all-rights-reserved license while client and academic distribution terms are confirmed. See [`LICENSE`](LICENSE) and ADR-005 in [`docs/decisions.md`](docs/decisions.md).
