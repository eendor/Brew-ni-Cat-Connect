# Architecture Decision Records

**Document version:** 0.1 Draft\
**Last updated:** 2026-10-30

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
**Status:** Accepted and implemented in PR #23 (reworked and merged on 2026-10-18). Its dark Night Shift Glow look is superseded by ADR-022; the layer itself stays.\
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
- Phone tier (2026-10-25, PR #44): the home intro loaded slowly and stuttered on low-end Android phones, so phones without `?quality=high` now get a lighter tier. The home showcase skips post-processing and shadow maps, draws at a pixel ratio of 1, makes its generated maps and titles at half size, and shows clear plastic and ice as an additive gloss without refraction, clearcoat or sheen. Every phone scene lights with a half-size copy of the HDRI. Desktop and `?quality=high` keep the full look described above.
- Frame pacing (2026-10-29, PR #63): the 3D still stuttered, mostly during page transitions, while the sign-in, sign-up and forgot-password pages (no 3D) stayed smooth. Three things caused it. The new page built its scenes (WebGL context, lighting, shader compiles) while the curtain was opening; the old page kept rendering under the closing curtain; and the frame budget stepped down only once frames averaged slower than 42 ms (under 24 fps), so judder at 30–45 fps never set it off. Now scenes rest while the curtain moves and start after it has opened. The budget aims for 22 ms, steps down in stages and keeps the stage for the rest of the visit. The desktop pixel-ratio cap is 1.5 instead of 1.75. The first step no longer switches the key light's shadow off, which made every lit material rebuild its shader in the middle of the scene; the shadows are redrawn every third frame instead. Shadows are now drawn at most once a frame (depth of field used to draw them a second time), and a canvas drawn through post-processing no longer multisamples on top of the effects' own antialiasing. This tunes the frame budget the PR #24 follow-up left open; a steady 60 fps on the laptop's integrated GPU is still to be measured.
- Light tier and curtain hold (2026-10-29, PR #63): testing the PR #63 preview on the laptop's integrated Intel GPU, the 3D still appeared late and ran at 24–25 fps on the home and menu heroes. Integrated, phone and software GPUs, recognised by the GPU name the browser reports, now get the lite tier (no post-processing, shadow maps or refraction, a pixel ratio of 1, the half-size HDRI); a device whose scenes are still too slow with every stage taken is remembered for 7 days. `?quality=high` and `?quality=lite` override the choice. The route curtain now stays closed until the new page's hero 3D has drawn its first frame, for 1.8 s at most, so the page is revealed with the 3D in place instead of having it pop in. Scenes that start later (visit sign, gallery ring, state scenes, cart toss) compile their shaders ahead and draw once out of sight before they show, production turns off three.js's blocking shader error checks, and the GPU's anisotropy limit is asked when the renderer starts, before shaders queue up. The frame budget now counts frames over 20 ms and steps down when more than a quarter miss. Measured on the laptop with a production build: idle 57–60 fps on every page (24–50 before), the 3D drawn when the curtain opens, and scrolling at 44–46 fps on Menu, About, Gallery and Contact. The first scroll down the home page stays below that, partly from the page's own first paint. A second run on the final build, while the laptop was busier, was slower on every page, so the 60 fps goal stays open.

---
- Tone mapping (2026-10-30, PR #70): ACES filmic is replaced by Khronos PBR Neutral, which keeps product colors on the light studio (ADR-022).

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

## ADR-017 — Owner Changes in the POS, Live Website Content, and Loyalty Mini-Games

**Decision:** The owner keeps managing the menu, prices, availability, and inventory in the existing POS, on the web app and on Android. Connect adds no owner area. Everything the website shows (prices, fees, hours, contact details, notices, about text, photos, links) is read from saved data; none stays in the page code. A site content table, edited in a new Shop settings screen of the POS web app, replaces the values now written in `src/config/site.ts` and the showcase data. Loyalty mini-games are decided on the server, limited per customer per day, and pay out loyalty points. Advertising appears only in the mini-game area, after consent.\
**Date:** 2026-10-26\
**Status:** Accepted on 2026-10-30 for the website and 2026-10-31 for the POS Shop settings screen: the site content table, its rules and audit, the website reads (`docs/database-design.md` §10, PR #69), and the POS web Shop settings screen (`Brew-ni-Cat-POS` PR #3) are built and live. The POS product editor (`FR-093`), the price audit and the mini-games are still to come. Replaces the first draft of this ADR, which put an owner area in Connect.\
**Context:** The instructor's check on 2026-10-26 asked that nothing on the website be hardcoded, that the owner can customize the menu and prices, and that loyalty get mini-games with prizes and ads. The POS already has Menu and Inventory screens, and the website reads the same catalog, so a second editor in Connect would duplicate it. The menu prices are already live; the home showcase prices, the takeout box fee, the hours, the contact details and the page text are written in code.\
**Consequences:**
- No new owner login in Connect. Owner writes stay in the POS under its existing sign-in and policies; no privileged key goes in either web app (FR-037).
- The POS web app needs a Shop settings screen and an audit row for price and settings changes (FR-085, FR-087). That is POS work, not Connect work.
- Connect reads site content with the publishable key and keeps a fallback copy so the pages still render if the read fails. The fallback is not shown as current when the live read works.
- Checkout keeps pricing from the database at the moment of ordering (ADR-016), so a price change never changes an order already placed.
- Prizes need the owner's rules. A game with real prizes may need a promo permit; keep results skill-based or points-based until the owner confirms. **TODO: Confirm with Brew ni Cat owner.**
- Advertising needs an approved ad account and a domain the team controls; ads never load before consent and never appear on menu, cart, checkout, order, or account pages (FR-090).

## ADR-018 — Live 3D Menu Cards Through One Shared WebGL Stage

**Decision:** Each Menu card shows its product floating in 3D by default, with no View in 3D button and no pop-up viewer. One shared WebGL canvas draws every card's model and copies the picture into a plain 2D canvas on each card. Items without a hand-built model get a generic model by category (a cup for drinks, otherwise a take-out box). Photos stay only as the fallback for devices without WebGL or with reduced motion, and when the stage fails.\
**Date:** 2026-10-26\
**Status:** Superseded by ADR-019\
**Context:** The instructor's check asked for a menu that feels alive and for new products to appear without code changes. The old viewer needed a tap, and only items named in a code registry had a model. A WebGL context per card would exceed what phones allow, and one fixed overlay canvas would lag behind scrolling cards.\
**Alternatives considered:** one context per card (too many contexts on phones); one fixed full-screen canvas behind the page (models drift against scrolling cards); keeping the button and dialog (does not meet the request); deleting the photos (leaves no fallback for old phones and reduced-motion users).\
**Consequences:**
- Only one WebGL context exists on the Menu, however long the menu is. Models build one at a time when a card nears the screen and are freed when it is far away; a card left behind keeps its last picture.
- At most six cards (three on phones, two after a slow-frame check) are drawn each frame, nearest the screen centre first, at a capped pixel ratio.
- The size and flavor chips of the old viewer are gone; the card shows the item's default model. The order dialog still offers every size and flavor.
- A product added in the POS appears on the Menu with a 3D model on the next load (FR-083, FR-086). A better model for it is a later design task, not a requirement for it to appear.
- The `chromium-3d` browser tests draw on software GL and prove each card names the right model and draws; frame time on a real phone is covered by the phone check (MAN-P4-007).

## ADR-019 — 3D Product Pictures Only In The Add To Order Dialog

**Decision:** Menu cards go back to plain product photos. The floating 3D picture appears only at the top of the Add to order dialog and is always the item's built model (or a generic cup or box for a product without one). The photo is the fallback for devices without WebGL, with reduced motion, or if the stage fails.
**Date:** 2026-10-26\
**Status:** Accepted\
**Context:** ADR-018 put a 3D picture on every card. On the Menu that made models build, appear and vanish as cards neared the screen. Photo cut-outs were tried for the dialog, but background removal left artifacts (a floating egg, a metal stand, jar lids from behind a cup) and the owner's team preferred the built models.\
**Alternatives considered:** keeping 3D on every card (pop-in while scrolling); photo cut-outs in the dialog (artifacts, one file per photo); the full photo floating as a flat card.\
**Consequences:**
- Scrolling the Menu draws no WebGL at all. One stage exists only while a dialog is open, so no pop-in or pop-out.
- No cut-out files to make or keep in step with the photos; a product added in the POS later floats a generic model with no redeploy (FR-083, FR-086).
- ADR-018 is superseded by this decision.

## ADR-020 — The Cart Empties When The Order Summary Is Made

**Decision:** Once checkout makes the order summary, the summary holds the order and the cart empties. **Edit order** on the summary step puts the items and details back for a change. While a summary is saved, the empty cart drawer and cart page link back to it with **View your order summary**. An item added after that starts a new order, and the old summary is dropped.\
**Date:** 2026-10-28\
**Status:** Accepted\
**Context:** The cart used to stay full until the summary was copied or **Start a new order** was pressed. Renier's QA of the live site on a phone found that after the summary was made the cart still held the order, **Proceed to Checkout** jumped straight back to the summary, and a new item joined the old order. Online ordering is still off on the live site, so every order there ends with this summary.\
**Alternatives considered:** keeping the cart until the copy (the reported problem); emptying it only when Copy, Message on Facebook or Call or Text is pressed (a visitor who types the summary out or takes a screenshot keeps the old cart); asking whether the order was sent (one more step, and the answer can't be checked).\
**Consequences:**
- The cart badge, drawer and cart page read empty as soon as the summary shows, so the next item starts a new order instead of joining the one already made.
- The summary still lives only in `sessionStorage` for up to 12 hours. Closing the tab before sending loses it, as before, and the cart is already empty by then.
- **Edit order** puts the lines back through the same check as a stored cart, then checkout rechecks their prices against the menu, so an old or hand-edited summary can't bring back a wrong price.
- A summary saved before this change, with its cart still full, empties the cart when it is copied.
- TC-P4-016 and TC-P4-017 are superseded by TC-P4-174 to TC-P4-179.

## ADR-021 — A Completed Online Order Becomes One POS Sale In The Database

**Decision:** When staff mark an online order completed, the database adds one sale to the POS tables (`orders` and `order_items`) in the same transaction, with `device_id` `online` and ids from 2 000 000 000 000 001 up. The POS tablet that completed the order deducts the stock on the device, once per order reference.\
**Date:** 2026-10-28\
**Status:** Accepted\
**Context:** FR-075 asks that each online order reach the shop's records at most once. The shop uses one POS tablet. The app keeps its sales and stock on the device and syncs them through the shared database. It pulls other devices' sales by id, and it uploads its whole stock count, which replaces the cloud copy (system architecture §19.2).\
**Alternatives considered:** the tablet saves the sale itself (a retry after a lost answer, or a second device, could save it twice); a separate table for online sales (the POS sales and reports would miss them); deducting the stock in the database (the next upload from a tablet would overwrite it).\
**Consequences:**

- An order makes at most one sale, even when a request is retried or Completed is pressed twice: the link table's primary key and the stale-status check stop a second one.
- Online sales show in the POS sales and reports after the tablet's next pull, like a sale from another device.
- The stock is right only if the tablet deducts it. If the tablet fails first, the stock stays high until the next count; the reference key stops a double deduction.
- Ingredients used for an order cancelled after Preparing are not deducted; the staff adjust the stock by hand. This is to be reviewed with the owner.
- The online sale ids must stay above every POS id. The POS makes ids below 1e15, so the gap is wide.

## ADR-022 — Daylight Glass: A Light Theme In The Shop's Cream And Green

**Decision:** Replace the dark Night Shift Glow look with a light theme taken from the shop: a cream page (`#F6EEE1`, the walls), the shop's deep green (`#1F6B45`) as the only filled action colour, terracotta (`#9E451E`) for accent text and a deep green footer (`#183A2A`). Glassmorphism carries it. A soft window light (green, peach and sage radial washes) is fixed behind the page, and the header, glass panels, the showcase HUD, the menu tabs, the mobile cart bar and secondary buttons are frosted glass. Every opaque 3D scene ends in the same cream: backdrops are designed in on-screen colours and run backwards through three.js's ACES curve (`src/components/three/engine/studio.ts`), and the small state scenes draw on a transparent canvas.\
**Date:** 2026-10-30\
**Status:** Accepted\
**Context:** After checking the live site, the owner asked for a lighter look in the shop's cream with a little green. The site's first draft was light, and glassmorphism was chosen for the background. Photos of the shop give the palette: cream and peach walls, deep green panels, sage plants, light wood and terracotta signs. The 3D layer runs close to its frame budget (PR #63), so the theme can't add much paint work.\
**Alternatives considered:** keeping the dark theme (the owner asked for a lighter one); a flat light theme without glass (not what was asked for); a backdrop blur on every card (over the smooth window light a blur shows nothing, and each one costs frame time); transparent canvases for the big 3D scenes (depth of field draws an opaque frame, and clear cups need a wall behind them to refract); a dark mode switch (two themes to keep at AA for one deadline).\
**Consequences:**

- Every colour used as text reaches 4.5:1 on the canvas, on cards, on the warm well and under the brightest window light. `tests/unit/daylight-glass.test.ts` checks this from the stylesheet (TC-P4-202 and TC-P4-203).
- Item glows tint the cream studio wall like daylight through coloured glass. As text or a border they are mixed 35% with the strong text.
- The bloom threshold rises from 0.9 to 2.2, above the cream wall, so only highlights on glass and ice glow.
- A full-width 3D section shows a faint edge where the window light is strongest, because the light is fixed behind the page and the canvas covers it. A CSS mask could hide it but costs frame time.
- The state scenes lose their `tone` option; on a transparent canvas they fit any panel.
- ADR-014's dark look is superseded by this decision. Its three.js layer, fallbacks and performance rules stay, and so do ADR-015's motion rules and the route curtain.
- Washed-out colors (2026-10-30, PR #70): on the cream studio, ACES filmic tone mapping bleached and greyed the drinks, leaves and ice, the product names on the 3D walls were a pale pastel, and the gallery faded its front photo while the page scrolled. The renderer now uses Khronos PBR Neutral tone mapping at an exposure of 1.1, which is made for showing products in their own colors; `untonemap()` inverts it exactly, so backdrops still end in the page cream (TC-P4-199, TC-P4-205). Product names take a deep shade of the item's color that reads at 4.5:1 or better on the cream (TC-P4-226), and the rim lights are the item's color softened toward daylight. Loose ice has a cool tint, and the phone tier draws it see-through instead of as an additive gloss (TC-P4-227). The gallery ring takes focus from the photo the visitor chose, not the small scroll turn, adds no sheen, and keeps 60% of a side photo's color (TC-P4-225). The footer's headings, brand and landmark use a new white `--footer-strong` (TC-P4-223).
- iOS 27 and night (2026-10-30, PR #71): ADR-023 amends this decision's type and corner sizes, and ADR-024 adds a night theme with a day/night toggle. The palette, window light, glass and 3D studio stay.

## ADR-023 — iOS 27 Liquid Glass: System Type, Capsule Controls And Grouped Cards

**Decision:** Restyle every class, button, text style and container on the website after Apple's iOS 27 (Liquid Glass), with the Apple iOS 27 UI Kit as the reference, and keep ADR-022's cream and green palette. The look comes from shared building blocks in `src/app/globals.css` (`ios-card`, `ios-well`, `ios-list`, `ios-sheet`, `ios-glass-bar`, `ios-caption`, `ios-label`, `ios-field`, `ios-icon-button`, `ios-chip`, `ios-stepper` and `ios-switch`) inside `@layer components`, so Tailwind utilities on the same element can still adjust them.\
**Date:** 2026-10-30\
**Status:** Accepted\
**Context:** The site should feel like a current iPhone app: system type in sentence case, capsule buttons, grouped cards, sheets and switches. The UI kit gives the type sizes, shapes and control styles; the shop's photos still give the colors (ADR-022).\
**Alternatives considered:** the kit's own blue and gray palette (it would lose the shop's cream and green); a component library (a new dependency for what a few CSS classes do); a backdrop blur on every card and list (it costs frame time on phones, so blur stays on bars and sheets that float over content); keeping the condensed Big Shoulders headings and Archivo text (they read as a poster, not as iOS).\
**Consequences:**

- Type: Apple devices show SF Pro, and other devices get Inter, the closest open font, served from the site through `next/font` as before. Archivo is no longer loaded, and Big Shoulders only paints the lit signs inside the 3D scenes. Text is in sentence case without letter-spacing; titles are bold (700) and labels semibold (600). Tailwind's text sizes follow the iOS text styles: 12, 15, 17 (body), 20, 22, 28 and 34 px.
- Shapes: cards have 26 px corners, grouped wells 20 px, fields 14 px and sheets 36 px. Anything pressable that holds text is a capsule.
- Text buttons keep `.button-primary`, `.button-secondary` and `.button-ghost`, now a green capsule, a clear glass capsule and a gray capsule with a green label. Icon buttons are 44 px glass circles. Choices (sizes, flavors, categories and the showcase switcher) are capsules or a segmented control, and quantity is one stepper capsule.
- Blur stays on what floats over content: the header, the category and cart bars, the phone menu and the undo toast. The order dialog and the cart drawer are opaque sheets.
- Hover lifts are gone; a press scales a control down slightly. ADR-015's motion rules, the route curtain and reduced motion stay.
- Every control is still at least 44 × 44 px on phones (`tests/e2e/phone.spec.ts`), and focus rings stay visible.
- This amends ADR-022's type (Big Shoulders headings and Archivo text) and its corner sizes.

## ADR-024 — A Night Theme And A Day/Night Toggle

**Decision:** Add a night theme, "the shop after dark", as night values of the same color tokens under `:root[data-theme="night"]`, and a toggle: a moon or sun button in the desktop header and a "Night mode" switch in the phone menu (FR-092). A first visit follows the device's light or dark setting; the visitor's choice is saved in the browser and wins after that.\
**Date:** 2026-10-30\
**Status:** Accepted\
**Context:** ADR-022 set a dark mode switch aside so only one theme had to be kept at AA for the deadline. A day/night toggle was then requested, and the contrast tests now check both themes. The old dark look (ADR-014, near-black with a bright neon green) was judged too close to a music app, so the night theme had to be warm and calm instead.\
**Alternatives considered:** following the device setting with no toggle (a toggle was asked for); a separate dark stylesheet (two copies of every rule); near-black with neon green (the look ADR-022 replaced); saving the choice in a cookie so the server renders it (pages would stop being static, and a small script before the first paint already avoids a flash).\
**Consequences:**

- Night colors: espresso walls (`#14120F`), cream text (`#F6EEE1`), warm dark glass, a sage green (`#7DCFA0`) for green text, links and focus rings, terracotta text (`#F0A77C`), a deeper green fill (`#25764B`) under white text for filled buttons, and a darker green footer. Every day color token has a night value (TC-P4-230).
- Green as a fill and green as text are separate tokens: `--accent-fill` sits under white text, and `--accent-solid` is the green for text, borders and rings. At night the text green is light, so it is never used as a fill (TC-P4-230).
- Text keeps 4.5:1 on every surface in both themes, and white text keeps 4.5:1 on every filled button (TC-P4-228, TC-P4-229).
- An inline script in the page head sets the theme and the browser bar color before the first paint, so a night visitor never sees a flash of day. The server always renders day, so pages stay static.
- The switch crossfades with a View Transition, except with reduced motion.
- The 3D studio wall follows the theme without a reload (TC-P4-231, TC-P4-237). At night the item glow on the wall is halved (0.16 instead of 0.32), and product names take a light tint of the item's color that reaches 4.5:1 on the dark wall (TC-P4-232).
- The choice is stored under `bnc-theme` in the browser's local storage and holds only `day` or `night`. Nothing is sent to the server.
- Following the device first is a default; a small change in `src/lib/theme/theme.ts` would make day the default instead.

## ADR-025 — Mixed Flavors Use The Size Price

**Decision:** Any product with flavors can mix up to 2 different listed flavors on one line, stored in the existing flavor field as `"A / B"`. A mix costs the size price; when a size prices flavors differently, the dearest flavor in the mix applies.\
**Date:** 2026-11-01\
**Status:** Accepted\
**Context:** The shop sells 2-flavor fries and similar mixes. The user chose all products with flavors, the size price, and the same limit for every size.\
**Alternatives considered:** averaging the flavor prices (could undercharge and give odd centavos); a separate mix column (a schema change across both POS apps and the website); allowing more than 2 flavors (not asked for).\
**Consequences:**

- The website, the database and the Android POS check and price mixes the same way (TC-P4-252 to TC-P4-256).
- No table changes: the website reads the flavor text, and old single-flavor orders are unchanged.
- Each flavor deducts a full recipe portion from stock.

## ADR-026 — Add-Ons In A Table, Stored In The Flavor Text

**Decision:** Paid extras live in `public.menu_add_ons` per category, and an order line stores them in the existing flavor text the way the POS does. Mixing 2 flavors (ADR-025) is limited to fries.\
**Date:** 2026-11-01\
**Status:** Accepted\
**Context:** The printed menu sells noodle add-ons, which the POS already supports. Prices must come from data, not code. The user asked that takoyaki, drinks and soda not mix.\
**Alternatives considered:** hard-coding add-ons on the website (prices would not be data); a separate order column for add-ons (a change to every order reader on both POS apps); a per-item mixing switch in the POS editor (kept for later; fries only for now).\
**Consequences:**

- The website and the database price add-ons the same way (TC-P4-258, TC-P4-259).
- Orders from the website print on the POS with the same add-on lines and prices.
- The POS add-on list must match the table until the POS reads it.
