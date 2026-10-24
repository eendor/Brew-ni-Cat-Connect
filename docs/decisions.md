# Architecture Decision Records

**Document version:** 0.1 Draft\
**Last updated:** 2026-10-24

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

**2026-08-24 live-menu follow-up amendment:** RLS was manually disabled on the relevant catalog tables outside the application to unblock verification. The publishable browser identity then returned 6 categories and 16 items, with 0 unavailable and 0 unmatched rows, and the real Menu rendered at all required widths. The application continues to use public configuration and read-only projections and made no RLS or business-data change.

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

## ADR-011 — Catalog-derived Cart Pricing

**Decision:** Cart lines carry only item, variant, flavor, and quantity; names and prices are always resolved from the current menu catalog in integer centavos.\
**Date:** 2026-09-18\
**Status:** Accepted and implemented (PR #7)\
**Context:** Several Phase 3 features build on one cart, and a client-supplied price must never become authoritative.\
**Chosen approach:** Pure reducer and selectors in `src/lib/ordering/`, with safe-integer guards on line totals and the subtotal.\
**Consequences:** Checkout re-resolves prices before showing the summary (PR #14). Server-side revalidation is still required once orders are written (FR-021).

---

## ADR-012 — Send-to-Shop Checkout Before Order Writes

**Decision:** Until server order creation exists, checkout produces an order summary the customer copies to Messenger or reads over the phone, instead of a simulated order reference.\
**Date:** 2026-10-15\
**Status:** Accepted and implemented (PR #14). For pickup, superseded by ADR-016 once online ordering is turned on; rider delivery keeps the summary.\
**Context:** A fake order ID would claim an order exists when the shop never received it.\
**Consequences:** FR-024 and FR-025 stay planned; the cart persists in `localStorage` and is revalidated against the catalog at checkout.

---

## ADR-013 — CSS-first Motion Without a Motion Library

**Decision:** Site motion uses CSS transitions, one passive rAF-throttled scroll hook (`ScrollMotion`), and a route fade in `template.tsx`; GSAP and Lenis are not added.\
**Date:** 2026-10-15\
**Status:** Superseded by ADR-015 (PR #23). Implemented in PR #16 and refined in PRs #17 and #18; `ScrollMotion` and the route fade remain.\
**Context:** Restrained reveals and transitions were wanted without new dependencies or side effects on sticky bars and focus traps.\
**Consequences:** Everything is disabled under `prefers-reduced-motion`. Drawer and dialog close without an exit animation. Menu categories no longer fade in on scroll since PR #18.

---

## ADR-014 — WebGL Experience Layer Over the Static Site

**Decision:** Add a three.js (plain, not React Three Fiber) and GSAP ScrollTrigger layer under `src/components/three/`, loaded with `next/dynamic` and `ssr: false`, on top of pages that still render completely without it. This partly supersedes ADR-013: GSAP is now a dependency, but only the 3D layer uses it; CSS motion elsewhere is unchanged.\
**Date:** 2026-10-17\
**Status:** Accepted and implemented in PR #23 (reworked and merged on 2026-10-18)\
**Context:** The goal was a full 3D site in a dark "Night Shift Glow" look that reads as real product photography, not cartoon art, without losing the live menu, real cart, checkout or accessibility of `main`.\
**Consequences:**
- Every 3D scene is decorative (`aria-hidden`). Headings, prices, hours, photos with alt text, forms and buttons stay real HTML, and each 3D control has a keyboard-operable HTML button.
- The 3D layer mounts only after hydration, when WebGL 2 is available and `prefers-reduced-motion` is not set. Otherwise the server-rendered static version stays (static showcase grid, photo thumbnails, sign fallback, no ring).
- Rendering is physically based: `MeshPhysicalMaterial` with transmission, IOR 1.45 and clearcoat; a bundled CC0 studio HDRI for light and reflections; ACES filmic tone mapping with sRGB output; soft shadow maps and contact shadows; subtle depth of field, bloom and film grain.
- Food and drink models are procedural with generated PBR maps (albedo, normal, roughness) because no CC0 photoscans of takoyaki, shoestring fries or buldak exist.
- Phones get a lower pixel-ratio cap, fewer particles and no depth of field. A frame-time budget drops depth of field and bloom and lowers the pixel ratio when frames run slow.
- The project design system was updated to the dark direction rather than overridden. On 2026-10-17 the design and product context was rewritten for Night Shift Glow: a #0B0A0D studio canvas with #15131A blocks, #F4F1EA / #B9B3C2 text, one glow color per featured item, matcha #7CFF6B as the only filled action color, Big Shoulders with Archivo, a documented type ramp and radius scale, realistic PBR rules with no cartoon styling, static reduced-motion fallbacks, and an AA-on-black rule for any accent used as text. The site was then audited against the new system and aligned to it in the same branch (type and radius tokens in `globals.css`, a coral error color, larger touch targets, a scrim behind the showcase copy and overlay layering).
- Adding an item still goes through `useCart().addItem`; the 3D toss only delays opening the drawer by 0.42 s when the cart layer is running.
- Pages are full-bleed (2026-10-17): backgrounds and 3D stages span the viewport and content uses a 90rem cap with fluid gutters, replacing the earlier 72rem column. The 1440 px content band is intentional: on wider screens the backgrounds and 3D stages keep going while text stays at a readable measure.
- Rework before merge (2026-10-18): the category glow bus, the page glow field, the film-grain overlay and the additive glow floors under the products were removed, along with glow shadows on cards and buttons; menu cards are plain and uniform with a neutral price. The cart layer no longer keeps a spinning basket in the header: it runs only on `/menu`, starts when the browser is idle, and draws only during a toss, after which the real cart button bumps. Off-screen scenes (the home visit sign) start when the visitor nears them. Scenes compile their shaders before they show, free their renderer if they fail part-way through starting, and retry a failed HDRI download. The gallery ring shows only the photos without people. Empty cart, order-ready and not-found states get small realistic scenes built from the same cup model.
- Follow-up (2026-10-18, PR #24): a scripted click-through on the laptop's integrated GPU passed every page and the full order flow on five desktop, tablet and phone profiles. Phones and the tablet hold 60 fps idle; at 1440 px the home and menu heroes run at 22–31 fps, and the order-summary scene stalls once, for about a second, while its lighting and shaders are prepared. Tuning the frame budget is an open Backlog item.

---

## ADR-015 — Cinematic Motion Layer on GSAP

**Decision:** Page entrances, scroll reveals, overlay enter and exit, and page transitions use GSAP (with ScrollTrigger and SplitText) through three pieces in `src/components/motion/`: a motion director that animates elements by data attribute (`data-split`, `data-rise`, `data-rise-group`, `data-unveil`, `data-magnetic`), a route curtain that covers internal navigations with a title card, and a presence hook that keeps overlays mounted through their exit. This supersedes ADR-013 for the page itself; ADR-014's 3D layer already used GSAP.\
**Date:** 2026-10-18\
**Status:** Accepted and implemented in PR #23\
**Context:** Every animation, transition and state needed to feel lively and cinematic, in step with the 3D layer. CSS transitions could not give overlays an exit, headings a line-by-line reveal, or navigations a transition.\
**Consequences:**
- Pages stay server components: they only carry data attributes, and the director runs once per route before paint. A flag set before first paint holds animated content until the director takes over, with a CSS failsafe that shows everything after 3 s if it never does.
- Nothing animates under `prefers-reduced-motion` (or in browsers that can't report it): the flag is never set and the curtain never covers. GSAP's ScrollTrigger and SplitText register only once motion runs.
- Internal link clicks get the curtain; modified clicks, new tabs, downloads, in-page anchors and back/forward keep plain navigation. The curtain waits at most 6 s for a page.
- The cart drawer, order dialog, mobile navigation and undo toast now animate out as well as in, and are inert while leaving.
- GSAP core, ScrollTrigger and SplitText are in the shared client bundle. The functional Playwright journeys keep running with reduced motion; the `chromium-3d` project checks the curtain and that no content is left hidden after scrolling.
- SplitText replaces a heading's content and sets its label, so a heading whose text changes in place is keyed by that text and remounted instead of updated. The checkout heading needed this (PR #24): after a step renamed the page, the old split heading kept the previous title as its label and brought it back on resize.

---

## ADR-016 — Online Orders Apart From POS Sales, Priced in the Database

**Decision:** Online pickup orders go into their own tables (`online_orders`, `online_order_items`, `online_order_status_history`), not the POS `orders` and `order_items`. One database function, `place_online_order()`, prices every line from the live menu, checks the details, and saves the order, its lines, the tracking token hash and the first status in one transaction. `POST /api/orders` calls it with the publishable key, and Place order stays behind the `NEXT_PUBLIC_ONLINE_ORDERING` flag until the shop can see online orders.\
**Date:** 2026-10-24\
**Status:** Accepted and implemented in PR #41. The flag is off on the live site until the POS order screen and the order page are on `main`.\
**Context:** The POS `orders` table records completed sales and feeds the shop's reports and stock. An online order is a request the shop has not accepted yet, so writing it there would count sales that may never happen. The browser can't be trusted with prices, and FR-037 rules out a privileged key on the server.\
**Consequences:**
- The POS keeps its tables and sync unchanged. How an accepted online order is counted as a POS sale is decided with the POS order screen.
- The tables stay closed to the API. The two `security definer` functions (`place_online_order()` and `get_online_order()`) are the only way in, so the publishable key is enough and no service-role key is used anywhere.
- Prices come only from the menu at the moment of ordering, with the same rules as the cart (copied from `src/lib/menu/map-menu-catalog.ts`, `src/lib/ordering/cart-pricing.ts` and `cart-reducer.ts`). If the subtotal the customer saw is out of date, nothing is saved and the new subtotal comes back. PGlite tests compare the SQL with the cart on random menus (TC-P4-084), so a change to the cart's rules needs the same change in SQL.
- One checkout attempt saves one order: the browser sends an idempotency key, and a retry gets the same order back (FR-024).
- Guests open their order with the reference and a 43-character tracking token. The token goes in the link's `#` fragment, so it never reaches a server log, and the database keeps only its SHA-256 hash (FR-045).
- With the flag off, pickup checkout keeps the copy-summary flow from ADR-012 and the route answers 503. Rider delivery always keeps the summary, because the rider orders at the counter.
