# Software Libraries and APIs

**Version:** 0.1 Draft\
**Status:** Phase 1 web dependencies installed and locked; external APIs deferred\
**Last updated:** 2026-08-23

## 1. Current technology state

Phase 1 implements the selected web foundation with **Next.js App Router, React, TypeScript, and Tailwind CSS**. The repository commits `package-lock.json`, pins every direct dependency to an exact version, and requires Node.js 24.x. Vitest and Testing Library provide unit/component testing, Playwright provides browser smoke testing, and ESLint, Prettier, TypeScript, and the Next.js production build form the local quality gate.

The Phase 0 planning register dated 2026-08-18 is retained in repository history. The tables below supersede its registry observations with versions actually installed for Phase 1. An installed version documents the project toolchain; it does not by itself claim that a check passed. Executed results belong in the test evidence and development log.

Supabase, Meta Messenger Platform, Android, and POS dependencies are not installed or connected in Phase 1.

## 2. Runtime and application dependencies

| Technology             | Purpose                                                        | Installed / supported version   | License      | Status / notes                                                                              |
| ---------------------- | -------------------------------------------------------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| Node.js                | Web build and runtime                                          | `>=24.0.0 <25`; local `24.19.0` | MIT          | Supported engine range is declared in `package.json`; `.nvmrc` selects major 24             |
| npm                    | Reproducible package installation                              | Local `12.0.2`                  | Artistic-2.0 | Uses the committed `package-lock.json`; npm is the only package manager for the web project |
| Python                 | Dependency-free specification document validation             | `>=3.10`; local `3.14.7`        | PSF License  | GitHub Actions selects Python 3.14 for the repository validator                            |
| Next.js                | App Router, rendering, routing, metadata, and production build | `16.3.2`                        | MIT          | Installed; React strict mode enabled and powered-by header disabled                         |
| React                  | Component UI runtime                                           | `19.2.8`                        | MIT          | Installed with the Next.js-compatible pinned version                                        |
| React DOM              | Browser/server React rendering                                 | `19.2.8`                        | MIT          | Installed with React at the same pinned version                                             |
| TypeScript             | Static type checking                                           | `5.9.3`                         | Apache-2.0   | Installed; strict configuration and explicit no-emit check enabled                          |
| Tailwind CSS           | Responsive styling and project design tokens                   | `4.3.3`                         | MIT          | Installed through the Tailwind PostCSS integration                                          |
| `@tailwindcss/postcss` | Tailwind CSS PostCSS adapter                                   | `4.3.3`                         | MIT          | Installed for CSS compilation                                                               |

## 3. Quality and test dependencies

| Technology                 | Purpose                                         | Installed version | License    | Status / notes                                                   |
| -------------------------- | ----------------------------------------------- | ----------------- | ---------- | ---------------------------------------------------------------- |
| Vitest                     | Unit/component test runner                      | `4.1.11`          | MIT        | Uses jsdom and repository test setup                             |
| `@vitest/coverage-v8`      | V8 coverage reporting for Vitest                | `4.1.11`          | MIT        | Available through `npm run test:coverage`                        |
| React Testing Library      | User-observable React component tests           | `16.3.2`          | MIT        | Installed as `@testing-library/react`                            |
| Testing Library jest-dom   | Accessible DOM matchers                         | `7.0.1`           | MIT        | Integrated with Vitest through `tests/setup.ts`                  |
| Testing Library user-event | Keyboard/pointer interaction in component tests | `14.6.6`          | MIT        | Used for interactive navigation behavior                         |
| jsdom                      | DOM environment for Vitest                      | `30.0.1`          | MIT        | Test-only dependency                                             |
| Playwright Test            | Chromium end-to-end and responsive smoke tests  | `1.62.1`          | Apache-2.0 | Generated reports and results remain untracked                   |
| Vite                       | Vitest transformation and configuration runtime | `8.2.2`           | MIT        | Direct dev dependency supporting the test configuration          |
| `@vitejs/plugin-react`     | React transformation for Vitest/Vite            | `6.1.0`           | MIT        | Test tooling only; Next.js remains the application framework     |
| ESLint                     | Static analysis runner                          | `9.39.5`          | MIT        | Pinned to the major compatible with Next.js 16.3.2 configuration |
| `eslint-config-next`       | Next.js, React, and TypeScript lint rules       | `16.3.2`          | MIT        | Matches the installed Next.js version                            |
| Prettier                   | Deterministic formatting                        | `3.9.6`           | MIT        | Used by `format` and `format:check` scripts                      |
| Node.js type definitions   | Node tool/config typing                         | `24.13.3`         | MIT        | Installed as `@types/node`                                       |
| React type definitions     | React component typing                          | `19.2.18`         | MIT        | Installed as `@types/react`                                      |
| React DOM type definitions | React DOM typing                                | `19.2.4`          | MIT        | Installed as `@types/react-dom`                                  |
| `actions/checkout`         | GitHub Actions repository checkout              | `v7`               | MIT        | Workflow major; latest release observed as `v7.0.1` on 2026-08-23 |
| `actions/setup-node`       | GitHub Actions Node.js and npm cache setup       | `v7`               | MIT        | Workflow major; latest release observed as `v7.0.0` on 2026-08-23 |
| `actions/setup-python`     | GitHub Actions Python setup for document checks | `v7`               | MIT        | Workflow major; latest release observed as `v7.0.0` on 2026-08-23 |

## 4. Available package scripts

| Script                  | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Start the Next.js development server                           |
| `npm run build`         | Create the production Next.js build                            |
| `npm run start`         | Serve an existing production build                             |
| `npm run audit`         | Fail on reported high- or critical-severity advisories         |
| `npm run format`        | Apply Prettier formatting                                      |
| `npm run format:check`  | Verify formatting without changing files                       |
| `npm run lint`          | Run ESLint with warnings treated as failures                   |
| `npm run typecheck`     | Generate Next.js route types and run `tsc --noEmit`            |
| `npm run test`          | Run Vitest once                                                |
| `npm run test:watch`    | Run Vitest in watch mode                                       |
| `npm run test:coverage` | Run Vitest and create V8 coverage output                       |
| `npm run test:e2e`      | Build the app and run Playwright against the production server |

## 5. Planned and deferred technologies

These technologies remain architecture directions, not installed capabilities:

| Technology                               | Intended purpose                                              | Version                                    | License / terms             | Current status                                                       |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ | --------------------------- | -------------------------------------------------------------------- |
| Supabase JavaScript                      | Future authentication, database, storage, and realtime client | TBD at Phase 4 compatibility review        | MIT                         | Deferred; no client or credentials in Phase 1                        |
| PostgreSQL (Supabase managed)            | Planned central relational data store                         | TBD by approved project                    | PostgreSQL License          | Deferred; schema and RLS design required first                       |
| Zod or an evaluated equivalent           | Runtime validation at trust boundaries                        | TBD when input contracts are introduced    | Verify before install       | Not installed; Phase 1 contains no business-data boundary            |
| Meta Messenger Platform                  | Future customer-initiated messaging channel                   | Recheck supported Graph API during Phase 7 | Platform terms apply        | Deferred until the shared backend is stable                          |
| Android SDK, Kotlin, and Jetpack Compose | Future native Android client                                  | TBD during Phase 8 architecture gate       | Mixed; verify per component | Deferred                                                             |
| POS integration adapter                  | Controlled menu/order/status synchronization                  | TBD after POS analysis                     | TBD                         | Deferred to Phase 6; direct public POS database access is prohibited |

No future technology should be added only to increase the tool count. Its requirement, system role, maintenance impact, license, privacy/security implications, and test approach must be documented before installation.

## 6. External API boundaries

| Boundary                           | Intended purpose                                     | Authentication direction                             | Current state                                           |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Public web shell                   | Static Phase 1 presentation and local navigation     | None                                                 | Implemented without customer data or external API calls |
| Web/Android to shared backend      | Menu, account, order, status, and loyalty operations | Customer session plus RLS/server authorization       | Planned; no endpoint or client exists                   |
| Messenger to server webhook        | Customer-initiated inquiries and guided actions      | Meta signature verification and server-held token    | Deferred                                                |
| Connect integration service to POS | Controlled menu/order/status synchronization         | Machine identity with least privilege; mechanism TBD | Deferred pending POS analysis                           |
| Deployment service to secrets      | Runtime configuration                                | Platform access controls                             | Planned; provider TBD                                   |

No provider keys, webhook secrets, payment identifiers, production endpoints, or real Supabase configuration are defined in this document or the Phase 1 application.

## 7. Dependency decision rules

Before adding or upgrading a dependency, a contributor must:

1. tie it to an approved requirement or documented engineering need;
2. review maintenance activity, security history, bundle/runtime impact, data behavior, and license;
3. prefer platform/framework capability over a redundant package;
4. pin a compatible direct version and update the npm lockfile;
5. add or update tests for dependency-driven behavior;
6. run formatter, lint, typecheck, tests, and production build as applicable;
7. record material architecture/security consequences; and
8. update this register with the installed version and verified status.

Automated vulnerability output must be triaged. Dependencies, checks, or tests must not be removed solely to hide a finding.

The manifest pins npm 12.0.2 through its `packageManager` field. Its `allowScripts` policy explicitly leaves the transitive `unrs-resolver` postinstall disabled. Inspection showed that the script prepares an optional native binding; the lint, type-check, test, and build toolchain operates through its fallback without executing that install-time script. Any future enablement requires a fresh package/source review and a documented need.

## 8. Deployment and provider decisions still open

- Web hosting and region: **TODO: Confirm with Brew ni Cat owner.**
- Supabase organization, project, region, plan, and data retention: **TODO: Confirm with Brew ni Cat owner.**
- Meta application and business-account ownership: **TODO: Confirm with Brew ni Cat owner.**
- Android package ownership and Google Play account: **TODO: Confirm with Brew ni Cat owner.**
- POS interface technology and credentials: **TODO: Confirm with Brew ni Cat owner.**
- Payment provider, if online payment enters scope: **TODO: Confirm with Brew ni Cat owner.**
