# Brew ni Cat Connect

**Course:** ICT05a Applications Development & Emerging Technologies\
**Development status:** Phase 3 — Menu and Ordering Experience is finishing its last checkout polish, and Phase 4 — Cloud backend and customer accounts has started: the online order tables, the order API and Place order are merged, and Place order stays off on the live site until the POS order screen is ready\
**Live site:** <https://brew-ni-cat-connect.vercel.app>\
**Specification version:** 0.1 Draft (living specification)\
**Last updated:** 2026-10-24

Brew ni Cat Connect is the customer-facing omnichannel platform for Brew ni Cat Coffee Shop in Kabacan, Cotabato. It complements the existing Brew ni Cat POS; it does not recreate or expose the POS.

## Project Status

| Area                                    | Status                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 0 specification                   | Version 0.1 Draft complete                                                                                                                                                                                                                                                                                                                                                     |
| Phase 1 web foundation                  | Independently tested and approved by Renier; merged 2026-08-23 as `11c546d` ([PR #1](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1))                                                                                                                                                                                                                                    |
| Phase 2 public showcase                 | Merged 2026-09-16 as `ae002f1` ([PR #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2)) after Renier's independent QA ([report](docs/phase-2-qa-report.md), [PR #6](https://github.com/eendor/Brew-ni-Cat-Connect/pull/6))                                                                                                                                              |
| Phase 3 browser-side ordering           | Merged: the ordering core ([PR #7](https://github.com/eendor/Brew-ni-Cat-Connect/pull/7)), Van's cart drawer, cart page and checkout ([PR #14](https://github.com/eendor/Brew-ni-Cat-Connect/pull/14)) and Shan's checkout validation ([PR #20](https://github.com/eendor/Brew-ni-Cat-Connect/pull/20)). Checkout ends in an order summary that the customer sends to the shop |
| Menu presentation                       | Product photos, card layout, the order dialog and header polish merged in PRs #16 to #18                                                                                                                                                                                                                                                                                       |
| 3D and motion layer                     | The Night Shift Glow redesign (ADR-014) on three.js and GSAP merged in [PR #23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23); phone checks, tap targets and the duplicate-photo cleanup followed in [PR #24](https://github.com/eendor/Brew-ni-Cat-Connect/pull/24)                                                                                                  |
| Rider delivery and social icons         | Rider flow and local rider list in [PR #25](https://github.com/eendor/Brew-ni-Cat-Connect/pull/25); decorative Facebook/TikTok and contact icons (inline Lucide/Simple Icons shapes, no icon package) in [PR #26](https://github.com/eendor/Brew-ni-Cat-Connect/pull/26)                                                                                                       |
| Read-only current menu                  | Live publishable runtime verified; manually disabled RLS was a production security blocker until PR #41 restored it on 2026-10-24                                                                                                                                                                                                                                              |
| Server-side orders and accounts         | Merged in [PR #41](https://github.com/eendor/Brew-ni-Cat-Connect/pull/41) for pickup: server revalidation, single order creation and order references (FR-021, FR-024, FR-025), off on the live site until the POS order screen is ready; customer accounts in Phase 4                                                                                                         |
| Online payment and delivery             | Deferred until the owner approves the rules                                                                                                                                                                                                                                                                                                                                    |
| Messenger, Android, and POS integration | Deferred to their approved roadmap phases                                                                                                                                                                                                                                                                                                                                      |

Evidence for each Phase 3 pull request is in [`docs/evidence/phase-3-verification.md`](docs/evidence/phase-3-verification.md).

## What the Site Does

- **Home:** a 3D showcase that steps through five featured items (Matcha, Cat-Feine, Takoyaki, Fries and Buldak Carbo), the visit facts, an about preview, a gallery preview and the visit details.
- **Menu:** the current catalog, read from Supabase at browser runtime, with category tabs, plain photo cards and an order dialog for the option or size, flavor and quantity.
- **About:** restrained facts confirmed for the business.
- **Gallery:** 30 curated, approved shop and customer photos, newest Facebook favorites first. The 3D photo ring uses only the photos without people.
- **Contact:** location, opening hours, Cash or GCash, the ₱10 takeout box, social links with decorative icons, and how rider delivery works, with the three local rider services and their Facebook pages. The same icon set appears in the footer, home visit facts, mobile menu, rider cards and checkout.
- **Cart and cart drawer:** kept in the browser (`localStorage`), with prices rechecked against the current catalog.
- **Checkout:** three steps (details, review, and the order summary). For pickup, the customer chooses Cash or GCash at the counter, then copies the summary into Messenger or reads it out on the phone. For rider delivery, the customer adds a delivery address and sends the summary to one of the listed local riders, who orders it at the shop and delivers it; the delivery fee, timing and payment are agreed with the rider. Nothing is written to a server.

The 3D scenes load after the static page. Visitors who prefer reduced motion, or whose browser lacks WebGL 2, get the static page. Old menu-poster artwork is a visual reference only and is not the source of current names or prices.

## Tech Stack

- Next.js 16.3.8 with App Router
- React and React DOM 19.2.8
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- three.js 0.186.1 for the 3D scenes
- GSAP 3.15.0 with ScrollTrigger and SplitText for motion
- Supabase JavaScript 2.112.3 for public read-only catalog access
- Vitest 4.1.11 and Testing Library
- Playwright 1.62.1
- ESLint 9.39.5 and Prettier 3.9.6

Exact versions, licenses and third-party assets are recorded in [`docs/software-and-apis.md`](docs/software-and-apis.md).

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

The browser runtime uses only these two public variables. `.env.example` also lists `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-side names for environment parity; the current site does not read them. `SUPABASE_SECRET_KEY` is privileged and server-only: it must never reach browser code or take a `NEXT_PUBLIC_` prefix. `.env.local` and other value-bearing environment files are ignored, and credentials must never be committed.

The initial public probes returned an empty catalog; those **BEFORE** captures remain as failure-state evidence. After RLS was manually disabled on the relevant catalog tables during Phase 2, the website's publishable runtime returned and rendered 6 categories and 16 items. The application still uses no privileged fallback and made no business-data or RLS change.

This current access depends on table grants and is not least privilege. HEAD-only/no-body checks found unrelated inventory, recipe, expense, order, order-item, and release tables publicly reachable. Restoring RLS and adding tested, explicit catalog-only anonymous `SELECT` policies is a production security blocker. **Update (2026-10-24):** RLS is back on for every public table, and guests can read only the menu and the POS releases (PR #41).

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The routes are `/`, `/menu`, `/about`, `/gallery`, `/contact`, `/cart`, and `/checkout`.

## Quality Checks

```bash
npm run format:check
npm run audit
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
python3 scripts/validate_phase0_docs.py
```

As of PR #32, formatting, the dependency audit (0 vulnerabilities, dev tooling included), lint, type checking, 152 of 152 unit and component tests in 21 files, the production build with 9 of 9 static pages, 32 of 32 Playwright tests and the documentation validator all pass. GitHub Actions runs the same checks, except Playwright, on pull requests to `main` and on pushes to `main` and `feat/**` branches.

## End-to-End Tests

Install Chromium once on a new workstation, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite builds the production application, starts it locally and runs two Playwright projects. `chromium` covers the public routes, the menu, the phone order flow and tap targets with reduced motion on, so it sees the static page. `chromium-3d` turns motion back on and renders the WebGL scenes through SwiftShader software rendering, so it needs no GPU. Generated reports and test results are ignored by Git.

## Documentation

- [`docs/srs.md`](docs/srs.md) — master Software Requirements Specification
- [`docs/functional-requirements.md`](docs/functional-requirements.md) — testable requirements and implementation status
- [`docs/system-architecture.md`](docs/system-architecture.md) — current architecture and trust boundaries
- [`docs/database-design.md`](docs/database-design.md) — discovered read-only menu schema boundary
- [`docs/security-and-privacy.md`](docs/security-and-privacy.md) — public-key, RLS, secret, browser-storage, and privacy controls
- [`docs/software-and-apis.md`](docs/software-and-apis.md) — installed libraries, APIs, and third-party assets
- [`docs/development-standards.md`](docs/development-standards.md) — coding, branching, and review standards
- [`docs/testing-strategy.md`](docs/testing-strategy.md) and [`docs/test-cases.md`](docs/test-cases.md) — verification plan and cases
- [`docs/code-review.md`](docs/code-review.md) — self-inspection and teammate review record
- [`docs/phase-2-qa-report.md`](docs/phase-2-qa-report.md) — Renier's independent Phase 2 QA report
- [`docs/evidence/phase-2-implementation.md`](docs/evidence/phase-2-implementation.md) — Phase 2 implementation and QA handoff record
- [`docs/evidence/phase-3-verification.md`](docs/evidence/phase-3-verification.md) — Phase 3 evidence for each pull request
- [`docs/decisions.md`](docs/decisions.md) — architecture decision records
- [`docs/development-log.md`](docs/development-log.md) — truthful milestone history

## Current Limitations

The current site does not include:

- server-side order creation: the customer sends the prepared summary to the shop, and server revalidation, single order creation and order references (FR-021, FR-024, FR-025) are planned (PR #41 adds them for pickup, but Place order stays off on the live site until the POS order screen is ready);
- customer authentication, profiles, history, tracking, favorites, loyalty, and rewards;
- online payment processing or direct rider booking;
- Messenger, Android, and POS synchronization changes;
- database migrations, production-data mutations, or administrative functions;
- restored RLS with catalog-only read policies, which remains a production security blocker (done on 2026-10-24 in PR #41); and
- a steady 60 fps for the 3D scenes on integrated GPUs at desktop widths (tuning is planned) or a completed click-through on a physical phone (MAN-P4-007).

The shop is open 11 AM to 9 PM Monday to Friday and 1 PM to 9 PM on Sunday, and closed every Saturday. Customers are directed to the official Facebook page or the shop contact details for any schedule changes.

## Contributing

Use focused branches (`feat/`, `fix/`, `docs/`, `test/`, or `integration/`), commit subjects that start with `feat:`, `fix:`, `style:`, `docs:`, `test:`, or `chore:`, appropriate automated tests, and pull requests for reviewable work. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/development-standards.md`](docs/development-standards.md).

## License

This repository currently uses an interim proprietary, all-rights-reserved license while client and academic distribution terms are confirmed. See [`LICENSE`](LICENSE) and ADR-005 in [`docs/decisions.md`](docs/decisions.md).
