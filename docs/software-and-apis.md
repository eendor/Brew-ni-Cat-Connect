# Software Libraries and APIs

**Version:** 0.1 Draft\
**Status:** Technology decision recorded; no application dependencies installed\
**Last updated:** 2026-08-18

## 1. Selected stack

The selected web foundation is **Next.js App Router + React + TypeScript**, with **Tailwind CSS** for a token-driven, mobile-first interface. This combination supports server-rendered public content, metadata/SEO, responsive interactive ordering flows, server-only integration endpoints, type safety, and a large maintainable testing ecosystem without introducing a separate application server prematurely.

The planned shared backend is **Supabase** (managed PostgreSQL, authentication, storage, realtime, and server-side functions where justified). Public clients must use least-privilege access protected by Row Level Security; service credentials remain server-only.

Future channels will reuse documented backend contracts:

- Facebook Messenger through a verified, rate-limited server-side webhook adapter;
- native Android using Kotlin and Jetpack Compose, selected for Android platform integration and long-term native maintainability; and
- the existing POS through a purpose-built integration adapter after POS analysis, never through direct public database access.

## 2. Version and license register

Versions below are registry observations made on 2026-08-18 for planning. They are **not installed**. Phase 1 must verify framework compatibility, pin direct dependencies in `package.json`, and commit the npm lockfile. Future-phase technologies remain `TBD` until their architecture gate.

| Technology | Purpose | Planning version | License | Status / notes |
| --- | --- | --- | --- | --- |
| Node.js | Web build/runtime toolchain | Local 24.19.0 | MIT | Available locally; Phase 1 will define the supported engine range |
| npm | Reproducible package installation | Local 11.17.0 | Artistic-2.0 | Available locally; commit `package-lock.json` |
| Next.js | Web framework, rendering, routing, server endpoints | 16.3.1 observed | MIT | Selected; compatibility to verify before install |
| React | Component UI runtime | 19.2.8 observed | MIT | Selected with Next.js-compatible version |
| TypeScript | Static typing | 7.0.2 observed | Apache-2.0 | Selected; use the newest Next.js-supported stable version, not automatically the registry newest |
| Tailwind CSS | Responsive styling and design tokens | 4.3.3 observed | MIT | Selected; avoid arbitrary inconsistent styling |
| Supabase JavaScript | Auth/database/storage/realtime client | 2.112.3 observed | MIT | Planned for Phase 4, not installed in Phase 1 unless required by an approved foundation task |
| PostgreSQL (Supabase managed) | Central relational data store | TBD by created project | PostgreSQL License | Planned; schema/RLS design precedes production data |
| Zod | Runtime validation at trust boundaries | 4.4.3 observed | MIT | Planned when validated inputs/contracts are introduced |
| Vitest | Unit and integration test runner | 4.1.10 observed | MIT | Selected for Phase 1 compatibility evaluation |
| React Testing Library | Accessible component behavior tests | 16.3.2 observed | MIT | Selected for Phase 1 |
| Playwright Test (`@playwright/test`) | Browser end-to-end and responsive tests | 1.62.1 observed | Apache-2.0 | Selected; introduce browser binaries only with first E2E path |
| ESLint | Static analysis | 10.8.1 observed | MIT | Selected; use framework-compatible configuration |
| Prettier | Deterministic formatting | 3.9.6 observed | MIT | Selected |
| Meta Messenger Platform | Future webhook/channel API | TBD at Phase 7 | Platform terms apply | Deferred; recheck supported Graph API version and policies before implementation |
| Android SDK / Kotlin / Jetpack Compose | Future Android client | TBD at Phase 8 | Mixed; verify per component | Deferred; architecture and minimum SDK decision required first |

Registry observations were obtained with `npm view <package> version` and `npm view <package> license`; they are not proof of compatibility or installation.

## 3. External API boundaries

| Boundary | Intended purpose | Authentication direction | Current state |
| --- | --- | --- | --- |
| Web/Android to shared backend | Menu, account, order, status, loyalty operations | Customer session plus RLS/server authorization | Planned |
| Messenger to server webhook | Customer-initiated inquiries and guided actions | Meta signature verification and server-held token | Deferred |
| Connect integration service to POS | Controlled menu/order/status synchronization | Machine identity with least privilege; mechanism TBD | Deferred pending POS analysis |
| Deployment service to secrets | Runtime configuration | Platform access controls | Planned; provider TBD |

No provider keys, webhook secrets, payment identifiers, or production endpoints are defined in this document.

## 4. Dependency decision rules

Before adding a dependency, a contributor must:

1. tie it to a requirement or documented engineering need;
2. review maintenance activity, security history, bundle/runtime impact, and license;
3. prefer platform/framework capability over a redundant package;
4. pin a compatible direct version and commit the lockfile;
5. add or update tests for dependency-driven behavior;
6. record material architecture/security consequences; and
7. update this register with the installed version rather than the planning observation.

Automated vulnerability output must be triaged; dependencies or tests are not removed solely to hide a finding.

## 5. Deployment and provider decisions still open

- Web hosting and region: **TODO: Confirm with Brew ni Cat owner.**
- Supabase organization, project, region, plan, and data retention: **TODO: Confirm with Brew ni Cat owner.**
- Meta application and business-account ownership: **TODO: Confirm with Brew ni Cat owner.**
- Android package ownership and Google Play account: **TODO: Confirm with Brew ni Cat owner.**
- POS interface technology and credentials: **TODO: Confirm with Brew ni Cat owner.**
- Payment provider, if online payment enters scope: **TODO: Confirm with Brew ni Cat owner.**
