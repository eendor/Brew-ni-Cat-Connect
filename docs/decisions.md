# Architecture Decision Records

**Document version:** 0.1 Draft\
**Last updated:** 2026-08-23

Statuses used here are `Proposed`, `Accepted`, `Superseded`, and `Deferred`. Acceptance records a direction; it does not claim implementation.

---

## ADR-001 — Web foundation stack

**Decision:** Use Next.js App Router, React, and TypeScript as the Phase 1 web foundation, with Tailwind CSS and project-owned design tokens for styling.\
**Date:** 2026-08-18\
**Status:** Accepted and implemented for the Phase 1 foundation\
**Context:** The public site needs mobile-first usability, accessible interactions, strong visual presentation, discoverable public content, interactive ordering, and later server-only integration endpoints. The academic project also needs maintainable typing, testing, and deployment workflows.\
**Options considered:**

1. Static HTML/CSS/JavaScript — small initial surface but weaker structure for later authenticated/order flows.
2. React with Vite — simple client application, but public content rendering/metadata and server endpoints require additional architecture.
3. Next.js App Router with TypeScript — integrated rendering, routing, metadata, server/client boundaries, and ecosystem support.

**Chosen approach:** Option 3, with Tailwind constrained by semantic components and design tokens rather than one-off styling.\
**Reason:** It provides a coherent path from public website to validated customer flows without adding a separate API server before requirements justify one.\
**Consequences:** The team must understand server/client component boundaries, prevent secrets from entering client bundles, verify version compatibility, monitor bundle performance, and avoid coupling domain logic to framework components.

**Implementation note (2026-08-23):** The repository-root application uses Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3 in strict mode, and Tailwind CSS 4.3.3. The implemented scope is the responsive public shell and placeholder routes only; this acceptance does not imply ordering, backend, authentication, or integration functionality.

---

## ADR-002 — Planned shared cloud backend

**Decision:** Use Supabase as the planned shared backend, subject to a Phase 4 schema/security gate and owner-approved project configuration.\
**Date:** 2026-08-18\
**Status:** Accepted in principle; implementation deferred to Phase 4\
**Context:** Web, Messenger, Android, and POS integration need consistent business data, authentication, relational constraints, and selected realtime updates. A small business benefits from managed infrastructure, but public database access must be constrained.\
**Options considered:** Supabase; a custom Node API with self-managed PostgreSQL; Firebase; separate channel-specific backends.\
**Chosen approach:** Managed Supabase PostgreSQL, Auth, Storage, Realtime, and server-side functions only where justified.\
**Reason:** Relational order data, RLS, managed authentication, and cross-platform SDKs align with the scope while limiting operational overhead.\
**Consequences:** Database design, migrations, RLS, backups, region, retention, vendor limits, costs, and service-key isolation must be documented and tested. Channel-specific databases are prohibited.

---

## ADR-003 — Integration boundary with the existing POS

**Decision:** Integrate through a versioned adapter/contract after POS analysis; never expose POS tables or credentials directly to public clients.\
**Date:** 2026-08-18\
**Status:** Accepted; implementation deferred to Phase 6\
**Context:** The POS already handles business-side operations. Recreating it would duplicate responsibility and create conflicting data. Its architecture and safe interfaces are not yet documented in this repository.\
**Options considered:** Direct shared-table access; duplicate Connect administration/POS; file/manual transfer; a controlled API/event/synchronization adapter selected after analysis.\
**Chosen approach:** The controlled adapter option, with source-of-truth, idempotency, retries, conflict handling, audit, offline behavior, security, validation, and rollback specified first.\
**Reason:** It protects the production-style POS and allows the integration mechanism to match evidence rather than assumption.\
**Consequences:** Integration cannot begin until read-only POS analysis and owner approval occur. Some order operations may require staff workflow changes that must be confirmed.

---

## ADR-004 — Future customer channels

**Decision:** Reuse shared backend contracts for Messenger and Android; use a server-side webhook adapter for Messenger and prefer native Kotlin/Jetpack Compose for the planned Android client.\
**Date:** 2026-08-18\
**Status:** Accepted direction; revalidation deferred to Phases 7 and 8\
**Context:** Channel-specific data stores would cause inconsistent menu, order, and loyalty state. Messenger requires secret-bearing webhook operations, while the academic roadmap calls for an Android customer application.\
**Options considered:** Independent channel backends; web-only/PWA; cross-platform mobile; native Android plus shared backend.\
**Chosen approach:** Shared domain contracts, server-only Messenger integration, and native Android for the Android phase.\
**Reason:** It preserves centralized business data, keeps tokens off clients, and provides a platform-aligned Android implementation.\
**Consequences:** API contracts need versioning and channel-neutral semantics. Meta policy/version and Android SDK choices must be reassessed at implementation time. A responsive web experience remains mandatory regardless of native app availability.

---

## ADR-005 — Interim project license

**Decision:** Keep the private client-associated repository under an interim proprietary, all-rights-reserved license until source ownership and distribution are confirmed.\
**Date:** 2026-08-18\
**Status:** Accepted as interim\
**Context:** A license file is required, but the project is for a real business and no permission to publish or grant open-source rights has been documented. Academic submission access may differ from public distribution.\
**Options considered:** MIT immediately; no license file; interim proprietary terms followed by an explicit later decision.\
**Chosen approach:** Interim proprietary terms. Revisit before public release or client deployment.\
**Reason:** This avoids granting distribution rights without confirmed authority while making the current terms explicit.\
**Consequences:** Public reuse/distribution is not permitted under the interim file. Final ownership and licensing are **TODO: Confirm with Brew ni Cat owner.** Dependency licenses remain independently applicable.

---

## ADR-006 — Source-control visibility and review workflow

**Decision:** Use a private GitHub repository, `main` as the primary branch, focused branches for meaningful work, and pull requests left open when peer-review evidence is required.\
**Date:** 2026-08-18\
**Status:** Accepted and established\
**Context:** The project needs academic evidence, team review, controlled client-associated source, and maintainable history.\
**Options considered:** Local-only Git; public repository from inception; private GitHub repository with later visibility decision.\
**Chosen approach:** Private GitHub repository `eendor/Brew-ni-Cat-Connect`, with later visibility review.\
**Reason:** It enables remote history and collaboration without prematurely publishing client-related work.\
**Consequences:** Contributors need authorized GitHub access. Real reviews must identify their reviewer and findings; automated or fictitious review evidence is prohibited.

---

## ADR-007 — Phase 1 automated verification boundary

**Decision:** Use Vitest with Testing Library for unit/component behavior, Playwright Chromium for local end-to-end smoke and responsive-width checks, and a lightweight GitHub Actions workflow for dependency audit, formatting, specification-document validation, linting, type checking, unit/component tests, and the production build.\
**Date:** 2026-08-23\
**Status:** Accepted and implemented for Phase 1\
**Context:** The foundation needs fast developer feedback, real browser coverage for responsive navigation and routes, and reproducible pull-request gates. Installing browser binaries in every initial CI run adds material time and network weight before the application has transactional flows.\
**Options considered:** Framework checks only; one browser-focused test tool for every level; Vitest plus Playwright locally and in CI; Vitest plus Playwright locally with lightweight CI checks.\
**Chosen approach:** Keep unit/component tests in the DOM-focused Vitest suite, run the five Phase 1 browser smoke tests locally against the production build, and omit Playwright browser installation from the initial CI workflow while retaining it as a required local release check. Pin Node.js 24 and npm 12.0.2 in CI so its install-script policy matches the recorded local toolchain.\
**Reason:** The split provides quick component feedback and genuine browser evidence without making the first CI gate disproportionately heavy. It also keeps the choice reversible when browser CI provides greater value in a later phase.\
**Consequences:** Contributors must install the Playwright Chromium binary before the local E2E command. CI does not yet independently prove browser behavior, so the recorded local Playwright result and later manual QA remain required. Reassess browser execution in CI when ordering, authentication, or other critical end-to-end paths are introduced.

## ADR-008 — Phase 2 Read-only Supabase Catalog Boundary

**Decision:** Introduce a narrow browser-runtime Supabase catalog client in Phase 2, using only public publishable configuration and explicit read-only projections, while retaining authentication, customer/order data, writes, realtime, and broader backend activation for later phases.\
**Date:** 2026-08-24\
**Status:** Accepted; live public rendering verified under a manually RLS-disabled database state, with production security hardening still open\
**Context:** The original roadmap placed Supabase activation in Phase 4, but the revised client-approved Phase 2 requires the public website to display current menu data. Existing menu posters contain older prices and cannot be authoritative. The existing POS already uses the production Supabase catalog, so duplicating/transcribing data would undermine omnichannel consistency.\
**Options considered:** Keep a static/poster-derived Phase 2 menu; copy current data into source fixtures; fetch through a new privileged server endpoint; use the existing public Data API with a publishable key and typed application adapter.\
**Chosen approach:** Install and lock `@supabase/supabase-js` 2.112.3; create one public client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; disable auth session features; query explicit fields from discovered `categories` and `items`; map nullable/JSON rows into immutable catalog types; retrieve after browser render so builds need no service; and render loading, empty, error/retry, availability, category, item, variant/flavor, and price states.\
**Reason:** This uses the real current source without creating a second catalog, keeps database records out of source, creates a reusable typed boundary, and preserves stable CI/build behavior.\
**Initial consequences:** The first public probes returned HTTP 200 with zero rows while privileged read-only discovery confirmed six categories and sixteen items. The application retained a truthful unavailable state, did not use a privileged key, did not mutate business data, and did not present fake/poster prices. The adapter sorts categories/items alphabetically because no display-order field was discovered. Add-ons remain absent because the POS values are hardcoded rather than live catalog records. This narrow exception does not activate customer auth/order/backend scope early.

**2026-08-24 live-menu follow-up amendment:** The owner/developer manually disabled RLS on the relevant catalog tables outside the application to unblock verification. The publishable browser identity then returned 6 categories and 16 items, with 0 unavailable and 0 unmatched rows, and the real Menu rendered at all required widths. The application continues to use public configuration and read-only projections and made no RLS or business-data change.

This manual state is a temporary functional-verification condition, not a revision of the least-privilege target. Public access now depends on table grants, and HEAD-only/no-body probes found unrelated `inventory`, `recipe_mappings`, `expenses`, `orders`, `order_items`, and `app_release` relations publicly reachable. Restoring RLS and adding explicit intended-catalog-only anonymous `SELECT` policies remains a production security blocker. Public writes were not tested.

---

## ADR-009 — Cross-platform Text and Binary Line-ending Policy

**Decision:** Normalize repository text to LF with `.gitattributes`, retain CRLF for Windows command scripts, mark common raster image extensions binary, and configure Prettier `endOfLine` to `lf`.\
**Date:** 2026-08-24\
**Status:** Accepted, implemented, and formatter-verified\
**Context:** Phase 1 independent Windows QA recorded P1-ENV-001: Prettier warnings appeared when `core.autocrlf=true` caused working-tree LF/CRLF differences. Phase 2 also adds many approved binary images that text normalization must never alter.\
**Options considered:** Leave line endings to each contributor's Git setting; rely only on Prettier; normalize all files without binary rules; define repository-level text, command-script, and binary behavior.\
**Chosen approach:** Use `* text=auto eol=lf`; set `*.bat` and `*.cmd` to CRLF; mark PNG, JPG/JPEG, WebP, GIF, and ICO files binary; and set Prettier LF.\
**Reason:** Repository-level rules are consistent across Windows and CI, reduce line-ending-only diffs, preserve executable Windows scripts, and protect image bytes.\
**Consequences:** Contributors may see a one-time normalization when switching/renormalizing tracked text. Binary files are unaffected. `npm run format:check` and diff review are required before commit; a mass content rewrite is not implied.

---

## ADR-010 — Phase 2 Approved Local Media Curation

**Decision:** Use the official local logo and a configuration-owned initial set of 18 approved shop/customer photographs, rendered with Next.js Image and generic factual alternative text; do not publish all 139 files on first render.\
**Date:** 2026-08-24\
**Status:** Accepted and implemented pending independent visual review\
**Context:** The real showcase needs authentic Brew ni Cat visuals and the client approved the local assets. Publishing every image would create avoidable transfer/layout cost and duplication, and many images include customers who must not be identified or profiled.\
**Options considered:** Generic stock images; all local images at once; a heavy gallery dependency; a small project-owned curated configuration with framework image optimization.\
**Chosen approach:** Anchor the design with `brew-ni-cat-logo.png`, expose 18 varied cat/food/community/shop images in Gallery at one uniform portrait aspect, use six featured images on Home, lazy-load non-priority images, and provide generic scene-based alt text. The Home preview keeps its first and sixth images spanning two columns from the small breakpoint, filling two four-column rows as `2 + 1 + 1` and `1 + 1 + 2`, while retaining two columns on mobile. Menu posters inform visual direction only and are not a price source.\
**Reason:** The approach is authentic, mobile-conscious, accessible, dependency-light, and proportionate to Phase 2.\
**Consequences:** Renier must inspect variety, obvious duplicates, alt text, responsive loading, and customer-photo handling. Future additions require the same approval/privacy/performance review; face/name inference is prohibited. The Gallery count must stay divisible by both rendered column counts, two and three, so the grid ends on a flush row; the original nineteenth image was a landscape frame that left an unfilled cell and was removed on 2026-09-05.

---
