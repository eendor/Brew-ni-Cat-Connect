# Software Libraries and APIs

**Version:** 0.1 Draft\
**Status:** Phase 2 public showcase dependencies installed and locked; live public catalog API rendering verified; manually RLS-disabled access remains a production security blocker\
**Last updated:** 2026-08-24

## 1. Current technology state

Phase 1 established the web foundation with **Next.js App Router, React, TypeScript, and Tailwind CSS**. Phase 2 retains that foundation and adds the public showcase plus a typed read-only Supabase catalog client. The repository commits `package-lock.json`, pins every direct dependency to an exact version, and requires Node.js 24.x. Vitest and Testing Library provide unit/component testing, Playwright provides browser smoke testing, and ESLint, Prettier, TypeScript, and the Next.js production build form the local quality gate.

The Phase 0 planning register dated 2026-08-18 is retained in repository history. The tables below supersede its registry observations with versions actually installed through Phase 2. An installed version documents the project toolchain; it does not by itself claim that a check passed. Executed results belong in the test evidence and development log.

Supabase JavaScript is installed solely for Phase 2 public read-only catalog retrieval. Meta Messenger Platform and Android dependencies are not installed; no POS mutation/synchronization dependency exists.

## 2. Runtime and application dependencies

| Technology             | Purpose                                                        | Installed / supported version   | License      | Status / notes                                                                              |
| ---------------------- | -------------------------------------------------------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| Node.js                | Web build and runtime                                          | `>=24.0.0 <25`; local `24.19.0` | MIT          | Supported engine range is declared in `package.json`; `.nvmrc` selects major 24             |
| npm                    | Reproducible package installation                              | Local `12.0.2`                  | Artistic-2.0 | Uses the committed `package-lock.json`; npm is the only package manager for the web project |
| Python                 | Dependency-free specification document validation             | `>=3.10`; local `3.14.7`        | PSF License  | GitHub Actions selects Python 3.14 for the repository validator                            |
| Next.js                | App Router, rendering, routing, metadata, and production build | `16.3.8`                        | MIT          | Upgraded from 16.3.2 in PR #11; strict mode on, powered-by header off                        |
| React                  | Component UI runtime                                           | `19.2.8`                        | MIT          | Installed with the Next.js-compatible pinned version                                        |
| React DOM              | Browser/server React rendering                                 | `19.2.8`                        | MIT          | Installed with React at the same pinned version                                             |
| TypeScript             | Static type checking                                           | `5.9.3`                         | Apache-2.0   | Installed; strict configuration and explicit no-emit check enabled                          |
| Tailwind CSS           | Responsive styling and project design tokens                   | `4.3.3`                         | MIT          | Installed through the Tailwind PostCSS integration                                          |
| three.js               | WebGL rendering for the 3D layer                               | `0.186.1`                       | MIT          | Added in PR #23; loaded only in client components via `next/dynamic`     |
| GSAP (with ScrollTrigger and SplitText) | Shared frame ticker and scroll progress for 3D scenes; site motion layer (entrances, split-line headings, overlay exits, page transitions) | `3.15.0` | GSAP Standard "No Charge" License | Free for this use, including the SplitText plugin; see https://gsap.com/standard-license |
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
| ESLint                     | Static analysis runner                          | `9.39.5`          | MIT        | Pinned to the major compatible with Next.js 16.3.8 configuration |
| `eslint-config-next`       | Next.js, React, and TypeScript lint rules       | `16.3.8`          | MIT        | Matches the installed Next.js version                            |
| Prettier                   | Deterministic formatting                        | `3.9.6`           | MIT        | Used by `format` and `format:check` scripts                      |
| Node.js type definitions   | Node tool/config typing                         | `24.13.3`         | MIT        | Installed as `@types/node`                                       |
| React type definitions     | React component typing                          | `19.2.18`         | MIT        | Installed as `@types/react`                                      |
| React DOM type definitions | React DOM typing                                | `19.2.4`          | MIT        | Installed as `@types/react-dom`                                  |
| three.js type definitions | three.js typing                                | `0.186.0`         | MIT        | Installed as `@types/three`                                      |
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

## 5. Current provider boundary and deferred technologies

This table distinguishes the installed Phase 2 catalog boundary from capabilities that remain future architecture directions:

| Technology                               | Intended purpose                                              | Version                                    | License / terms             | Current status                                                       |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ | --------------------------- | -------------------------------------------------------------------- |
| Supabase JavaScript                      | Public read-only catalog client; later evaluated for auth/realtime needs | 2.112.3                                   | MIT                         | Installed in Phase 2; uses public browser configuration only         |
| PostgreSQL (Supabase managed)            | Existing catalog store now; later central customer/order data store | Existing managed project; service version provider-managed | PostgreSQL License | Phase 2 reads discovered catalog fields only; customer/order schema, migrations, and RLS design remain deferred |
| Zod or an evaluated equivalent           | Runtime schema validation for future write/external contracts        | TBD when justified                       | Verify before install       | Not installed; Phase 2 uses a narrow defensive catalog mapper, while future write boundaries require a fresh evaluation |
| Meta Messenger Platform                  | Future customer-initiated messaging channel                   | Recheck supported Graph API during Phase 7 | Platform terms apply        | Deferred until the shared backend is stable                          |
| Android SDK, Kotlin, and Jetpack Compose | Future native Android client                                  | TBD during Phase 8 architecture gate       | Mixed; verify per component | Deferred                                                             |
| POS integration adapter                  | Controlled menu/order/status synchronization                  | TBD after POS analysis                     | TBD                         | Deferred to Phase 6; direct public POS database access is prohibited |

No future technology should be added only to increase the tool count. Its requirement, system role, maintenance impact, license, privacy/security implications, and test approach must be documented before installation.

## 6. External API boundaries

| Boundary                           | Intended purpose                                     | Authentication direction                             | Current state                                           |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Public website                     | Phase 2 showcase routes and read-only current-menu presentation | Supabase Data API through `@supabase/supabase-js` | Browser publishable runtime returns and renders 6 categories/16 items; no privileged key |
| Web/Android to shared backend      | Menu, account, order, status, and loyalty operations | Customer session plus RLS/server authorization       | Planned; no endpoint or client exists                   |
| Messenger to server webhook        | Customer-initiated inquiries and guided actions      | Meta signature verification and server-held token    | Deferred                                                |
| Connect integration service to POS | Controlled menu/order/status synchronization         | Machine identity with least privilege; mechanism TBD | Deferred pending POS analysis                           |
| Deployment service to secrets      | Runtime configuration                                | Platform access controls                             | Planned; provider TBD                                   |

No provider-key value, webhook secret, payment identifier, or privileged credential is defined in this document or source control. Real local configuration remains in ignored `.env.local`.

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

## 9. Phase 2 Public Catalog API Contract

| Technology / API | Purpose | Version | License | Notes |
| --- | --- | --- | --- | --- |
| Supabase JavaScript | Construct the browser public client and issue typed Data API reads | 2.112.3 | MIT | Exact version locked; session persistence/refresh disabled because Phase 2 has no auth |
| Supabase Data API | Read approved `categories` and `items` catalog fields | Managed existing service | Provider service terms apply | Application uses explicit `SELECT` only; live public GET succeeds, but RLS is manually disabled and table grants expose unrelated relations |
| Next.js Image | Optimize the official logo and curated approved gallery images | Included in Next.js 16.3.8 | MIT | No separate gallery/media dependency added |

Queries select explicit fields rather than `*`. The runtime does not query customer, order, inventory, sales, expense, or administrative structures. `src/lib/menu` maps database rows into application-level types so components do not depend directly on unstructured records.

The app intentionally performs retrieval in the browser after render. This keeps `npm run build` and GitHub Actions independent of production network availability and credentials. Missing configuration or denied/empty data produces a controlled customer state.

The five local menu posters are assets, not an API or data source. Current names/prices come from the live Supabase publishable response. That functional data path does not make the current RLS-disabled access least privilege.

## Phase 3 additions (PRs #7, #12, #14, #16)

The ordering work in Phase 3 added no runtime dependencies. The 3D layer in PR #23 adds `three` and `gsap`.

- **Ordering core (PR #7):** `src/lib/ordering/` (pricing, reducer, selectors) and `src/types/ordering.ts`. Prices come only from the current menu catalog, in integer centavos.
- **Cart and checkout (PR #14):** `src/context/cart-context.tsx` keeps the cart in `localStorage`; cart drawer, cart page, and checkout under `src/components/cart/` and `src/components/checkout/`; dialogs render through a React portal with `src/lib/accessibility/focus-trap.ts`. Checkout produces a "Send to Shop" order summary to copy into Messenger or read over the phone; there is no order write yet.
- **Motion (PR #16):** CSS transitions in `src/app/globals.css`, one passive scroll hook in `src/components/motion/scroll-motion.tsx`, and a route fade in `src/app/template.tsx`. GSAP and Lenis were evaluated and not added. All motion turns off under `prefers-reduced-motion`.
- **Dependency security (PR #12):** `sharp` 0.35.5 and `source-map-js` 1.2.2 through `npm audit fix`; production audit reports 0 vulnerabilities.
- **3D experience (PR #23):** `src/components/three/` (engine, scenes, canvases and page wrappers with static fallbacks) on three.js and GSAP ScrollTrigger, loaded client-side with `next/dynamic`. Reduced motion and devices without WebGL 2 get the static page.
- **Motion layer (PR #23):** `src/components/motion/` drives entrances, scroll reveals, overlay exits and page transitions with GSAP (ScrollTrigger and SplitText), replacing the CSS-only approach of PR #16 (ADR-015). Nothing animates under `prefers-reduced-motion`.

## 6. Third-party assets in the 3D layer

| Asset | File | Source and author | Licence | Notes |
| --- | --- | --- | --- | --- |
| Studio Small 09 HDRI (1K) | `public/three/hdri/studio_small_09_1k.hdr` | Poly Haven, by Sergej Majboroda | CC0 1.0 | Image-based lighting and reflections; downloaded from polyhaven.com and bundled locally (no runtime CDN) |
| Big Shoulders (display) and Archivo (body) | Served by `next/font/google` | Google Fonts | SIL Open Font License 1.1 | Self-hosted at build time by Next.js; Google Fonts now ships "Big Shoulders Display" as the "Big Shoulders" family |
| Cat sticker on the 3D cup | `public/three/cat-sticker.png` | Cut from the shop's own Matcha product photo | Shop-owned, same terms as the other approved shop photos | Not a stock image |
| Food, drink, sign and street models | Generated in code (`src/components/three/scenes/models.ts` and scene files) | Project code | Project licence | Procedural geometry with generated albedo, normal and roughness maps (`engine/textures.ts`); no third-party models |

