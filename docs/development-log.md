# Development Log

**Document version:** 0.1 Draft\
**Last updated:** 2026-08-23

This log records completed work and observed evidence. Planned work is explicitly identified and is not reported as implemented or tested.

---

## 2026-08-18 — Phase 0 repository and specification milestone

**Date:** 2026-08-18\
**Phase:** Phase 0 — Planning and Specification\
**Task:** Inspect the environment, establish private source control, select a technology direction, and create the Version 0.1 specification.\
**Summary:** Phase 0 work began in an empty local directory. The development environment and GitHub authentication were inspected. A private GitHub repository and local `main` branch were created. Initial documentation and repository policy files were drafted and consistency-checked; no application feature was implemented.\
**Changes:**

- initialized Git with primary branch `main`;
- created private repository `eendor/Brew-ni-Cat-Connect` and configured `origin`;
- added secret/build/test exclusions in `.gitignore` and a value-free `.env.example`;
- selected the Phase 1 web technology direction and documented future channel boundaries;
- drafted the SRS, requirements, execution paths, architecture, security/privacy, standards, testing, software/API, hardware, and decision documents; and
- added repository overview, contribution, and interim licensing files.

**Files/modules affected:** Repository foundation and `/docs`; no application modules exist.\
**Testing performed:** Environment/version discovery, `gh auth status`, target repository lookup, remote verification, required-file/link/fence/TODO/credential-pattern/FR/NFR checks, Markdown table consistency, and staged-diff checks. Exact documentation validation output is preserved in `docs/evidence/phase-0-verification.md`. No application unit, integration, end-to-end, lint, type-check, or production-build run applies because Phase 0 contains no application source or installed dependency set.\
**Issues encountered:** The directory was not a Git repository; the target GitHub repository did not exist; pnpm, Yarn, Bun, Deno, Docker, Supabase CLI, Gradle, and standalone project lint/test tools were not installed.\
**Resolution:** Initialized the required repository, created the target as private through authenticated GitHub CLI, and selected npm using the available Node.js toolchain. Optional/future tools will be installed only in their justified phase.\
**Documentation updated:** All initial Phase 0 documents listed in the documentation gate.\
**Git commit:** `b3981d3f8cc839d316a11722ee9a6adc9e8b4e60` — `docs: add initial Brew ni Cat Connect specification`.\
**Next action:** Begin Phase 1 in a separate milestone by scaffolding the verified Next.js/TypeScript foundation, then configure formatting, linting, tests, type checking, build validation, and the first responsive shell.

---

## 2026-08-23 — Phase 1 project foundation implementation

**Date:** 2026-08-23\
**Phase:** Phase 1 — Project Foundation\
**Task:** Initialize the approved web stack in the existing repository and establish a responsive, accessible, testable application shell without beginning Phase 2 or backend integrations.\
**Summary:** The repository-root Next.js application and its validation foundation were implemented on `feat/project-foundation`. The increment contains a public shell and explicit development placeholders only; ordering, Supabase, authentication, loyalty, Messenger, Android, and POS integration remain unimplemented. Renier's independent QA and pull-request review remain pending.\
**Changes:**

- initialized Next.js 16.3.2 with App Router, React 19.2.8, strict TypeScript 5.9.3, and Tailwind CSS 4.3.3 without creating a nested project;
- implemented root metadata/layout, skip navigation, header, desktop navigation, accessible stateful mobile navigation, footer, homepage foundation, minimal public placeholder routes, and loading/error/not-found states;
- established project-owned warm design tokens, responsive layout behavior, visible focus styles, and reduced-motion handling;
- configured ESLint, Prettier, explicit type checking, Vitest/Testing Library, Playwright Chromium, and a lightweight GitHub Actions validation workflow;
- added unit/component tests `TC-P1-001`–`TC-P1-004` and browser tests `TC-P1-005`–`TC-P1-009`;
- protected environment, dependency, build, coverage, and browser-report artifacts through `.gitignore`, and retained a value-free `.env.example`; and
- captured responsive screenshots for 375 px mobile, open mobile navigation, 768 px tablet, and 1440 px desktop review.

**Files/modules affected:** Repository application/tooling configuration; `src/app`; `src/components/layout`; `src/components/ui`; `src/config`; `tests/unit`; `tests/e2e`; `.github/workflows/ci.yml`; Phase 1 documentation/evidence.\
**Testing performed:** On Windows with Node.js 24.19.0, npm 12.0.2, and Python 3.14.7, `npm run format:check`, the specification-document validator, `npm run lint`, and `npm run typecheck` returned exit 0; `npm run test` returned 2 test files passed and 4 tests passed; `npm run build` compiled successfully, completed 7/7 static-generation tasks, and listed six application routes; `npm run test:e2e` rebuilt the production application and returned 5 Playwright Chromium tests passed, including no horizontal overflow at 320, 375, 768, 1024, and 1440 px; `npm run audit` returned `found 0 vulnerabilities`; and a focused scan of 62 repository text files found zero credential-pattern findings and zero non-empty `.env.example` values. A clean temporary-directory `npm ci` added 477 packages, audited 478 packages, reported 0 vulnerabilities, and produced no blocked-script warning. All listed local commands returned exit 0. The hosted push and pull-request workflows for `fb3e4b8` completed successfully; this CI-result-only update will receive the same required checks before handoff.\
**Issues encountered:** ESLint 10 was initially incompatible with `eslint-config-next` 16.3.2 and failed in the Next.js React rule integration. A redundant npm 12 package-lock-only re-resolution also rejected the optional Tailwind Oxide WASI tarball under the default remote-package policy even though the existing generated lockfile was already valid. Separately, the first clean-install check reported that npm 12 had blocked the transitive `unrs-resolver` optional native-fallback postinstall. The first Next.js development-server run generated untracked agent-instruction files by default. The initial push/PR workflow runs on `193d69c8f17f6d5c91556789bb3fa98f2563e9fc` failed because the Phase 0 README still needed the Phase 1 Prettier update that was present locally but not yet committed.\
**Resolution:** Pinned ESLint to the Next.js-supported 9.39.5 release and reran lint successfully. Retained the already valid `package-lock.json` because the manifest-only ESM field did not require dependency re-resolution. Inspected the `unrs-resolver` postinstall, explicitly denied it with npm 12 `allowScripts`, and verified reproducibility with a clean successful `npm ci` that emitted no blocked-script warning. Set `agentRules: false`, removed the generated files, and verified a second development-server run returned HTTP 200 without recreating them. Committed the formatted Phase 1 README and evidence as `fb3e4b82ed7be085d722f6974c4874f9b54a42d4`; both the [push workflow](https://github.com/eendor/Brew-ni-Cat-Connect/actions/runs/32613899798) and [pull-request workflow](https://github.com/eendor/Brew-ni-Cat-Connect/actions/runs/32613901697) then completed successfully.\
**Documentation updated:** Phase 1 updates cover the README, test cases and verification evidence, code-review handoff, system architecture, decisions, emerging-technologies status, security/privacy state, development standards, software/API inventory, testing strategy, and this log; Phase 0 history and deferred-integration boundaries remain intact.\
**Git branch:** `feat/project-foundation`\
**Git commits:** `9c3fdfeae4ee12acea9819fca12b21ebfc0757c2` — `chore: initialize Next.js project foundation`; `90c43cca6b047c6bb11a285660ec5ce2a27d8626` — `test: add application foundation tests`; `193d69c8f17f6d5c91556789bb3fa98f2563e9fc` — `ci: add project validation workflow`; `fb3e4b82ed7be085d722f6974c4874f9b54a42d4` — `docs: record Phase 1 implementation evidence`; the CI-result update is the commit containing this entry.\
**Pull request:** [#1 — Phase 1: Initialize Brew ni Cat Connect web foundation](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1), merged 2026-08-23 as `11c546d`.\
**Next action:** Renier performs Phase 1 manual QA and Pull Request review; findings are resolved before merge.

## 2026-08-24 — Phase 2 public showcase implementation (before live-menu follow-up)

**Date:** 2026-08-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Replace the foundation placeholders with Brew ni Cat's real public presence and add a typed read-only current-menu integration without beginning ordering or mutating production.\
**Summary:** The `feat/showcase-website` branch implements Home, Menu, About, Gallery, and Contact experiences, real approved branding/content/media, a browser-runtime Supabase catalog adapter, customer-safe dynamic states, Phase 2 tests, and cross-platform line-ending rules. At this **BEFORE** observation, the anonymous Supabase policy returned zero catalog rows, so live public record display/verification was blocked; the code did not bypass the policy. Local developer validation and the initial hosted push/pull-request workflows for `67a81db` passed. The branch was pushed and Pull Request #2 opened; Renier QA/review remained pending.\
**Changes:**

- replaced Phase 1 customer-facing placeholders with business-focused routes and page metadata;
- configured the official logo and a curated 19-image approved Gallery, with featured Home-preview images and generic privacy-respecting alt text (the Home preview now uses six images after the 2026-09-06 layout correction);
- added confirmed address/landmark/contact/payment/takeout/social/variable-hours and informational independent-rider content;
- resolved P1-UX-001 with one Menu link plus a distinct Visit us/Contact action;
- resolved the repository-policy portion of P1-ENV-001 with `.gitattributes`, binary exclusions, and Prettier LF;
- inspected the existing POS/catalog boundary and discovered `categories`, `items`, pipe-delimited flavors, JSON variants/prices/descriptions, and availability;
- installed Supabase JavaScript 2.112.3 and created typed public client/fetch/map/format layers using public configuration and `SELECT` only;
- implemented Menu loading, empty, error/retry, availability, category, product, size/variant, flavor-price, and combo-description presentation with no cart/checkout controls;
- added Phase 2 unit/component and Playwright cases while preserving Phase 1 regression behavior; and
- updated requirements, architecture, schema, emerging-tech, dependency, security/privacy, testing, review, decision, evidence, and README documentation.

**Files/modules affected:** `src/app`; shared layout/UI; `src/components/menu`; `src/config`; `src/lib/menu`; `src/lib/supabase`; `src/types`; `public/images`; tests; project/CI/format configuration; README and living documentation.\
**Testing performed:** `npm run format:check`, `npm run audit`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, and `python scripts/validate_phase0_docs.py` all exited 0. Vitest passed 20/20 in 6 files; Playwright passed 13/13; the build generated 7/7 static pages; the validator checked 22 Markdown files with 0 errors; npm reported 0 vulnerabilities. Twenty route/viewport checks had zero overflow failures, keyboard/reduced-motion/focus checks matched expectations, and the privileged-value source/bundle scan had zero matches. Controlled discovery observed HTTP 200/zero rows with both public credentials and confirmed six categories/sixteen items through a local privileged read-only comparison.\
**Issues encountered:** The production anonymous role does not currently expose catalog rows. The discovered schema also has no public menu view/RPC, display-order field, or live add-on table; POS add-ons are hardcoded. Old menu posters contain non-authoritative prices.\
**Resolution at that observation:** Kept production unchanged and RLS intact; made the runtime public-key-only with honest empty/error states; documented that an owner-approved minimum-field public view/policy and public-role verification were required. Used deterministic alphabetical order and omitted non-live add-ons. Posters remained visual reference only.\
**Documentation updated:** README; SRS; project overview; functional requirements; execution paths; emerging technologies; system architecture; database design; software/APIs; security/privacy; development standards; testing strategy/cases; code review; decisions; Phase 2 evidence; and this log.\
**Git branch:** `feat/showcase-website`\
**Git commits:** `0533bde` — `fix: standardize repository line endings`; `f3949c3` — `feat: add read-only Supabase menu foundation`; `4d66f95` — `feat: build Brew ni Cat public showcase website`; `e03293e` — `test: add Phase 2 showcase and menu coverage`; `67a81db` — `docs: record Phase 2 implementation evidence`; final PR/CI metadata follows in the commit containing this updated record.\
**Pull request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), merged 2026-09-16 as `ae002f1`.\
**Next action:** The handoff-only commit receives the required hosted checks, then Renier independently tests/reviews Pull Request #2. Do not merge, mark Done, or begin Phase 3 before that review.

---

## 2026-08-24 — Phase 2 live Supabase menu follow-up

**Date:** 2026-08-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Reverify the real catalog through the website's publishable Supabase identity after the owner manually disabled RLS, refresh live Menu evidence, and record the resulting security limitation without changing business data.\
**Summary:** Public GET requests using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` returned 6 categories and 16 items, with 0 unavailable items and 0 unmatched relationships. The real `/menu` page displayed all six categories and sixteen items at 320, 375, 768, 1024, and 1440 CSS pixels with zero document overflow and zero console errors. Phase 2 remains in Testing / Review; Pull Request #2 remains open/unmerged and Renier QA remains pending.\
**Changes:**

- preserved the previous unavailable-state Menu captures as `menu-before-public-access-desktop-1440.webp` and `menu-before-public-access-mobile-375.webp`;
- regenerated primary `menu-desktop-1440.webp` and `menu-mobile-375.webp` evidence from the live public runtime with no route mocking;
- recorded the five-width live inspection in `docs/evidence/phase-2/live-menu-review.json`;
- corrected customer-facing handling of a zero base-price sentinel when flavor prices exist, so Takoyaki now displays `From ₱40` rather than `From ₱0`;
- retained loading, empty, retrieval-error/retry, and successful menu-state coverage and added regression coverage for the zero-base/flavor-price case;
- verified the Matcha, Takoyaki, and Fries favorite-card links continue to lead to `/menu`; and
- updated living documentation to distinguish the historical blocker from the live result and the current RLS-disabled risk.

**Database/access result:** The owner/developer manually disabled RLS on the relevant catalog tables before this work. The application and automated follow-up made no RLS, policy, schema, menu, product, price, category, variant, availability, inventory, sales, expense, customer, order, or POS data mutation. Public catalog reads now depend on table-level grants and are not least privilege.\
**Exposure assessment:** HEAD-only/no-body public probes found `inventory` (11), `recipe_mappings` (20), `expenses` (76), `orders` (1,942), `order_items` (4,276), and `app_release` (19) publicly reachable. `customers`, `sales`, and `payments` returned HTTP 404, an ambiguous result rather than proof of denial. No unrelated record body was retrieved and no write was tested. This exposure is a production security blocker; restore RLS and add/test explicit catalog-only anonymous `SELECT` policies before production.\
**Testing performed:** Live public data access and five-width browser inspection passed as recorded above. The final follow-up gates all exited 0: `npm run format:check` reported `All matched files use Prettier code style!`; `npm run audit` reported `found 0 vulnerabilities`; lint completed with no warnings; typecheck generated route types and completed; Vitest passed 6 files and 21/21 tests; the production build compiled and generated 7/7 static pages; Playwright passed 13/13 tests; and the documentation validator checked 22 Markdown files, 81 FR IDs, and 40 NFR IDs with `ERRORS=0` and `PHASE0_DOC_VALIDATION=PASS`.\
**Files/modules affected:** Menu presentation; focused unit coverage; live capture tooling/evidence; README and living Phase 2 documentation.\
**Git branch:** `feat/showcase-website`\
**Git commit:** `4eaeca0` — `fix: verify live Supabase menu and refresh evidence`\
**Pull request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), merged 2026-09-16 as `ae002f1`.\
**Hosted CI:** Both push and pull-request workflows for follow-up evidence head `975561b` passed. The live Pull Request rollup remains authoritative for the metadata-only evidence update.\
**Next action:** Renier independently verifies the live menu, security truthfulness, responsive behavior, and code review. Do not merge Pull Request #2 or begin Phase 3 during this follow-up.

## 2026-08-25 — Business Content Verification & Evidence Cleanup

**Date:** 2026-08-25
**Phase:** Phase 2 — Production Business Content
**Task:** Finalize business content facts, cleanup deprecated evidence, and update verification tracking.
**Summary:** Updated `docs/business-content-register.md` with verified store details (address, contact info, social channels, custom operating hours, cash/GCash payment rules, and external rider delivery model). Cleaned up `docs/evidence/phase-2-verification.md` by removing deprecated Phase 1 image references and deleting the redundant `homepage.png` asset.
**Changes:**
- updated `docs/business-content-register.md` to confirm verified business details, payment methods, delivery model, and Supabase single source of truth;
- cleaned `docs/evidence/phase-2-verification.md` by stripping out Phase 1 screenshot references and updating branch/PR links;
- removed deprecated `docs/evidence/homepage.png` file from repository root evidence folder; and
- appended development log entry to document Phase 2 documentation refinement.
**Files/modules affected:** `docs/business-content-register.md`, `docs/evidence/phase-2-verification.md`, `docs/evidence/homepage.png`, `docs/development-log.md`.
**Testing performed:** Executed `python scripts/validate_phase0_docs.py` to confirm zero formatting errors and verified `PHASE0_DOC_VALIDATION=PASS`.
**Git branch:** `feat/phase-2-documentation-clean`
**Next action:** Stage changes, commit, and push to update Pull Request #3 for QA review by Renier.

## 2026-08-26 — Phase 2 project management readiness

**Date:** 2026-08-26\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Record Phase 2 project management status ahead of QA.\
**Summary:** Added the Phase 2 project management record: current status, team responsibilities, project risks, the QA readiness gate, Phase 2 merge readiness criteria, and confirmation that Phase 3 stays gated until Phase 2 closes. No application code changed.\
**Files/modules affected:** `docs/phase-2-project-management.md`.\
**Testing performed:** Documentation only; no application tests required.\
**Git branch:** `feat/phase-2-pm-readiness`\
**Pull request:** [#4](https://github.com/eendor/Brew-ni-Cat-Connect/pull/4) — merged 2026-08-26 as `27540ed`\
**Next action:** Use the QA readiness gate for the independent Phase 2 QA.

## 2026-09-05 — Phase 2 website showcase presentation guide

**Date:** 2026-09-05\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Prepare presenter documentation for the Phase 2 showcase.\
**Summary:** Added the presentation guide: objective, 2–3 minute pitch, demo flow, likely panel questions, presenter and customer review observations, resolved feedback, future suggestions, and a readiness checklist. No application code changed.\
**Files/modules affected:** `docs/phase-2-website-showcase-presentation.md`.\
**Testing performed:** Documentation only; no application tests required.\
**Git branch:** `feat/phase-2-demo-guide`\
**Pull request:** [#5](https://github.com/eendor/Brew-ni-Cat-Connect/pull/5) — merged 2026-09-05 as `ee849d1`\
**Next action:** Independent Phase 2 QA.

## 2026-09-05 — Presenter Review Findings Resolved

**Date:** 2026-09-05
**Phase:** Phase 2 — Public Showcase Website
**Task:** Resolve the customer-facing findings raised by Rizjie during the Phase 2 presenter review and keep future-phase requests out of Phase 2 scope.
**Summary:** Rizjie ran the Phase 2 site locally and reviewed it as a customer. He reported that the Contact map opened an unrelated business, the Gallery grid left large empty areas, Cat Treats appeared near the start of the Menu categories, and Menu cards were uneven on the web layout. All four findings are resolved. Requests for swipeable menu cards, per-product photography, and a reservation flow were recorded as Phase 3 scope and were not implemented.
**Changes:**
- replaced the free-text Google Maps query in `src/config/site.ts` with the shop coordinates `7.1134444,124.826155` and recorded the `4R7G+9FC` Plus Code, because the previous text query resolved to a different coffee business;
- added dense grid flow to the Gallery and removed the hardcoded index-based row spans that left unfilled cells beside wide images;
- ordered Menu categories alphabetically while always placing Cat Treats last, and exported a single `isCatTreatsCategory` helper so the catalog mapper and the catalog component share one rule;
- allowed Menu item cards to stretch within each row so short categories no longer render a ragged column; and
- added `TC-P2-022` regression coverage for the Cat Treats ordering rule.
**Deferred to Phase 3:** swipeable menu cards, per-product images, and customer reservation handling. Reservation behaviour requires owner confirmation before any design work begins.
**Files/modules affected:** `src/config/site.ts`, `src/app/gallery/page.tsx`, `src/components/menu/menu-catalog.tsx`, `src/lib/menu/map-menu-catalog.ts`, `tests/unit/menu-mapping.test.ts`, `docs/development-log.md`.
**Testing performed:** `npm run typecheck`, `npm run lint`, and `npm run format:check` all completed with no findings. Vitest passed 6 files and 22/22 tests, including the new ordering regression. The documentation validator reported `ERRORS=0` and `PHASE0_DOC_VALIDATION=PASS`.
**Git branch:** `feat/showcase-website`
**Next action:** Renier performs independent Phase 2 QA against the corrected build. Pull Request #2 remains open until the QA gate completes.

## 2026-09-05 — Gallery Grid Flush Layout

**Date:** 2026-09-05
**Phase:** Phase 2 — Public Showcase Website
**Task:** Remove the empty trailing area Rizjie reported on the right side of the Gallery grid and make the layout end on a flush row at every rendered breakpoint.
**Summary:** The Gallery mixed one landscape frame that spanned two columns with seventeen portrait frames, producing twenty grid cells. Twenty cells do not divide evenly into the three-column desktop layout, so the final row rendered with one unfilled cell. Dense grid flow moved the void but could not remove it, and a multi-column masonry variant left the columns ending up to 236 pixels apart, so both were rejected. Nineteen items cannot form a flush grid at two or three columns because nineteen is prime. The Gallery now renders eighteen approved portrait images at one uniform aspect, which divides evenly by both two and three.
**Changes:**
- replaced the mixed-span Gallery grid with a uniform `grid-cols-2 lg:grid-cols-3` layout at a single `3/4` aspect and removed the per-image span and aspect branching;
- removed `photo_135.jpg`, the only landscape frame, because its two-cell span was the source of the unfilled cell and a portrait crop would have cut the group it shows;
- updated ADR-010 and the README to record eighteen curated images and the requirement that the count stay divisible by both rendered column counts; and
- measured the rendered result rather than inferring it.
**Measured result:** At 1440 CSS pixels the Gallery renders 18 figures in 3 columns with column bottoms at 3444, 3444, and 3444 pixels, giving 0 pixels of raggedness. At 375 CSS pixels it renders 18 figures in 2 columns with column bottoms at 2666 and 2666 pixels, again 0 pixels of raggedness. The previous masonry attempt measured 236 pixels of raggedness at desktop width and 113 pixels at mobile width.
**Files/modules affected:** `src/app/gallery/page.tsx`, `src/config/gallery.ts`, `docs/decisions.md`, `README.md`, `docs/development-log.md`.
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` all completed with no findings. Vitest passed 6 files and 22/22 tests. Playwright passed 13/13 tests, including `TC-P2-024` Gallery curation coverage. The documentation validator reported `ERRORS=0` and `PHASE0_DOC_VALIDATION=PASS`.
**Git branch:** `feat/showcase-website`
**Next action:** Renier confirms Gallery variety, alt text, and flush layout at 320, 375, 768, 1024, and 1440 pixels during independent Phase 2 QA.

## 2026-09-16 — Phase 2 independent QA results

**Date:** 2026-09-16\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Run independent Phase 2 QA and record the plan, results, and evidence.\
**Summary:** Added the Phase 2 QA plan and report with 33 evidence screenshots. Results: manual QA 36/36, responsive 5/5, accessibility 7/7, Supabase/menu verification 6/6, code review and security checklist completed. The first local E2E run gave 8 passed / 5 failed because `npm run dev` was still running; the controlled rerun with the dev server stopped passed 13/13 with no code changes. `.env.local` confirmed untracked and no service-role credential in client code. Recommendation: pass for Phase 2 merge with the Supabase RLS hardening follow-up before production.\
**Files/modules affected:** `docs/phase-2-qa-plan.md`, `docs/phase-2-qa-report.md`, `docs/evidence/phase-2/renier-qa/` (33 screenshots).\
**Testing performed:** Lint, typecheck, unit tests, build, and docs validator passed; controlled Playwright rerun 13/13 passed.\
**Git branch:** `feat/phase-2-qa-plan`\
**Pull request:** [#6](https://github.com/eendor/Brew-ni-Cat-Connect/pull/6) — merged 2026-09-16 as `5007a30`\
**Next action:** Merge PR #2 now that the QA gate has passed.

## 2026-09-16 — Phase 2 public showcase merged

**Date:** 2026-09-16\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Merge the Phase 2 showcase after the independent QA gate passed.\
**Summary:** Merged the public showcase website (Home, Menu with read-only Supabase catalog, Gallery, About, Contact, 404) into `main`. Implementation details are in the 2026-08-24 and 2026-09-05 entries above.\
**Files/modules affected:** See the Phase 2 entries above.\
**Testing performed:** From the PR: `npm run typecheck` passed, `npm run test` 6 files / 21 tests passed, `npm run build` 7/7 static pages, `npm run test:e2e` 13/13 passed, GitHub Actions push and pull-request jobs passed.\
**Git branch:** `feat/showcase-website`\
**Pull request:** [#2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2) — merged 2026-09-16 as `ae002f1`\
**Next action:** Start Phase 3 with the shared ordering core.

## 2026-09-18 — Phase 3 ordering core and cart domain

**Date:** 2026-09-18\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Build the shared ordering and cart foundation the Phase 3 features build on.\
**Summary:** Added ordering/cart TypeScript types, catalog-derived price resolution, deterministic cart line identity, merging of identical configurations with separate lines for different variants or flavors, quantity validation, an immutable cart reducer, pickup / external rider fulfillment, line-total and subtotal helpers through integer centavos, reusable selectors, and a basic `OrderDraft` contract. The public add-to-cart path only accepts `itemId`, `variantId`, `flavor`, and `quantity`; names and prices are always resolved from the current menu catalog, so caller-supplied prices cannot enter. No cart UI, checkout, Supabase writes, auth, or payments. Test cases `TC-P3-001`–`TC-P3-047`.\
**Files/modules affected:** `src/types/ordering.ts`, `src/lib/ordering/cart-pricing.ts`, `src/lib/ordering/cart-reducer.ts`, `src/lib/ordering/cart-selectors.ts`, `tests/unit/cart-pricing.test.ts`, `tests/unit/cart-reducer.test.ts`, `tests/unit/cart-selectors.test.ts`.\
**Testing performed:** From the PR: format PASS, `npm audit` 0 vulnerabilities, lint PASS, typecheck PASS, unit tests 69/69 passed, build PASS, Playwright 13/13 passed, docs validator PASS.\
**Git branch:** `feat/p3-ordering-core`\
**Pull request:** [#7](https://github.com/eendor/Brew-ni-Cat-Connect/pull/7) — merged 2026-09-18 as `5e53fc6`\
**Next action:** Teammates build cart, checkout, and customization on this foundation.

## 2026-09-24 — Add 12 new Facebook photos to the gallery

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Add recent photos from the shop's Facebook posts (Aug 24 – Sep 22, 2026) to the curated gallery.\
**Summary:** Added `photo_148.jpg`–`photo_159.jpg` (cats, customers, food, and the space) to `src/config/gallery.ts` with alt text in the existing style; four are featured on Home. Posters, menu boards, and announcements were left out. The gallery count assertions moved from a 24 cap to a 12–36 range.\
**Files/modules affected:** `public/images/shop/photo_148.jpg`–`photo_159.jpg`, `src/config/gallery.ts`, `tests/unit/business-pages.test.tsx`, `tests/e2e/showcase.spec.ts`.\
**Testing performed:** From the PR: `npm run typecheck` pass, `npm run lint` pass, `npm run test` 69/69 passed, Prettier check on edited files pass.\
**Git branch:** `feat/add-facebook-gallery-photos`\
**Pull request:** [#9](https://github.com/eendor/Brew-ni-Cat-Connect/pull/9) — merged 2026-09-24 as `70b12a9`\
**Next action:** Gallery layout polish in PR #10.

## 2026-09-24 — Gallery refresh, cinematic showcase polish, Sunday closure

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Add newly approved Facebook shop photographs, make Home/Gallery feel more cinematic so the beige canvas feels less dull, and record the owner-confirmed Sunday closure without inventing fixed weekday hours.\
**Summary:** Pull Request #10 on `feat/gallery-ui-polish` continues Phase 2 showcase work. Twelve new Facebook photographs were already merged via Pull Request #9 as `photo_148`–`photo_159`. This branch caps the Home featured mosaic at six images, surfaces newest photos first on Gallery, refreshes the Home hero collage, then turns Home/Gallery into a fuller filmic presentation (full-bleed hero, dark film-strip preview, immersive gallery canvas, soft grain/Ken Burns with reduced-motion respect). The owner confirmed the shop is closed every Sunday; site copy, `siteConfig.operations`, the business content register, and FR-003 now state that clearly while still directing customers to Facebook/contact for other days.\
**Changes:**

- curated Gallery order with newest Facebook photos first and exactly six `featured` Home preview images;
- cinematic Home hero, about-band drama, dark horizontal film-strip gallery preview, and immersive Gallery page treatment in `globals.css`, `page.tsx`, and `gallery/page.tsx`;
- recorded Sunday closure in `src/config/site.ts`, Home/Contact/About/mobile-nav copy, tests, business content register, README, FR-003, and this log;
- captured cinematic review screenshots under `docs/evidence/phase-2/screenshots/cinematic-2026-09-24/`; and
- fixed Prettier formatting that had failed the hosted `format:check` gate.

**Files/modules affected:** `src/config/gallery.ts`; `src/config/site.ts`; `src/app/page.tsx`; `src/app/gallery/page.tsx`; `src/app/globals.css`; `src/components/layout/site-header.tsx`; `src/components/layout/mobile-navigation.tsx`; Contact/About pages; unit/e2e hour assertions; README; `docs/business-content-register.md`; `docs/functional-requirements.md`; `docs/test-cases.md`; `docs/development-log.md`; cinematic evidence screenshots.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run test` (9 files / 69 tests) returned exit 0 after the Prettier fix. `npm run build` and `python scripts/validate_phase0_docs.py` are recorded in the commit that lands this documentation update. Playwright was not re-run in this documentation pass.\
**Issues encountered:** Hosted CI failed earlier because Prettier was not run before push.\
**Resolution:** Ran `prettier --write` on the affected files, pushed `fix: Fix Prettier formatting for CI`, and aligned future work to CONTRIBUTING (docs + development log + business register with every behavior change).\
**Documentation updated:** Business content register; README; FR-003; test-cases TC-P2-016 note; development log; cinematic screenshot evidence.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10 — Polish gallery layout after new Facebook photos](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10), merged 2026-09-24 as `f0fa38e`.\
**Next action:** Confirm hosted Validate application passes on the documentation head, leave the PR open for teammate review per CONTRIBUTING, and continue cinematic polish only if Rodnee asks after review.

## 2026-09-24 — Hero media without customer crowd

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Replace the cinematic Home hero background that featured a customer group.\
**Summary:** Lead Developer rejected full-bleed people as the Home background. The hero now uses `photo_148` (cat beside matcha). Decorative hero stills use `photo_152` and `photo_004`. Home featured film-strip images are limited to cat/food/space shots (`148`, `152`, `004`, `006`, `011`, `126`).\
**Testing performed:** `npm run format:check`, `npm run lint`, and `npm run test` (69/69) exited 0.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Site-wide cinematic motion and gallery layout fix

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Address Lead Developer feedback: site-wide cinematic motion, Home film-strip scrollbar/animation/alignment, Gallery empty trailing cell and uneven horizontal rhythm.\
**Summary:** Replaced the Home overflow film-strip with a seamless CSS marquee reel (duplicated featured frames, hover pause, reduced-motion static flush grid, no scrollbar). Gallery now renders every configured gallery image in the grid (count divisible by 2 and 3) while keeping the cinematic lead intro. Added reusable intersection `Reveal` motion plus CSS fade-up / surface-lift / nav transitions across Home, Menu, About, Gallery, Contact, PageIntro, and the sticky header.\
**Changes:**

- Home gallery preview: `film-reel` infinite marquee under a padded Container heading; overflow hidden; prefers-reduced-motion static grid;
- Gallery page: include every `galleryImages` tile, tighten grid gaps, stagger fade-up on tiles;
- globals + `Reveal` client component for section reveals; PageIntro/header/menu/about/contact motion polish;
- kept cat/shop/food hero media from the prior pass.

**Files/modules affected:** `src/app/globals.css`; `src/app/page.tsx`; `src/app/gallery/page.tsx`; `src/app/about/page.tsx`; `src/app/contact/page.tsx`; `src/components/ui/reveal.tsx`; `src/components/ui/page-intro.tsx`; `src/components/ui/section-heading.tsx`; `src/components/layout/site-header.tsx`; `src/components/menu/menu-catalog.tsx`; `src/components/menu/menu-item-card.tsx`; `src/config/gallery.ts`; `docs/development-log.md`.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` (run after this entry).\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)\
**Next action:** Push and await hosted Validate application + Lead Developer review.

## 2026-09-24 — Fix Reveal hydration mismatch

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Clear the Next.js hydration warning on Home caused by `Reveal` className differing between server and client.\
**Summary:** `Reveal` initialized `visible` from `!canObserveIntersection()`, which is true during SSR (no `window`) and false in the browser, so the server HTML included `reveal--visible` while the client first paint did not. Initial state is now always `false`; reduced-motion and missing IntersectionObserver set visible in `useEffect` after mount. CSS under `prefers-reduced-motion` still forces opacity immediately.\
**Changes:**

- `src/components/ui/reveal.tsx` — hydration-safe initial state;
- this development-log note.

**Files/modules affected:** `src/components/ui/reveal.tsx`; `docs/development-log.md`.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)\
**Next action:** Confirm the Home console is clean on Lead Developer localhost review.

## 2026-09-24 — Clean Gallery badge and development-log environment phrasing

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Remove the Gallery photo-count badge and scrub environment-machine phrasing from the development log per Lead Developer feedback.\
**Summary:** Gallery reel no longer shows a photo count or “approved photos” label. Development-log testing notes no longer name the build machine. Menu item photography from Facebook shop photos remains in progress separately.\
**Files/modules affected:** `src/app/gallery/page.tsx`; `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Simplify Home hero brand stack

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer found the Home hero brand stack cluttered (logo twice, heavy gold type on a muddy overlay).\
**Summary:** Removed the hero logo so the header mark stands alone. Combined location/est. into one soft cream eyebrow, lightened the cinematic overlay and grain so the cat/drink photo reads more clearly, and updated the home unit test accordingly.\
**Files/modules affected:** `src/app/page.tsx`; `src/app/globals.css`; `tests/unit/home-page.test.tsx`; `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Softer visit cards and cleaner fonts

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer rejected the loud deep-green visit/hours billboards and found the Georgia display type harsh.\
**Summary:** Wired Inter + Plus Jakarta Sans through `next/font`. Replaced Home and Contact deep-green hours slabs with a calmer notice-surface panel inside a single light visit card. Kept Sunday-closed facts and Facebook pointer unchanged.\
**Files/modules affected:** `src/app/layout.tsx`; `src/app/globals.css`; `src/app/page.tsx`; `src/app/contact/page.tsx`; `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)


## 2026-09-24 — Menu item photos from shop Facebook stills

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Add per-menu-item photos on Menu cards by matching Facebook/shop stills to live catalog names.\
**Summary:** Introduced a local name-based image map (`src/config/menu-item-images.ts`) so Supabase stays the source of truth for names and prices while cards can show product photos. `MenuItemCard` renders an optional cinematic `next/image` header when a mapping exists. No Supabase image column was added.\
**Photo mapping (item → src + reason):**

| Item | Photo | Reason |
| --- | --- | --- |
| Buldak Carbo | `photo_011.jpg` | Close-up spicy noodle plate with egg/seaweed (shared honest plate for Buldak/Sedaap) |
| Buldak Cheese | `photo_011.jpg` | Same product-forward noodle plate; no distinct cheese-only still found |
| Sedaap Original | `photo_011.jpg` | Closest wavy noodle plate from the shop dump |
| Sedaap Spicy Chicken | `photo_011.jpg` | Same spicy noodle plate |
| Cat Treats | `photo_006.jpg` | Café cat portrait — treats are for cats, not people |
| Fries (Cat Claws) | `photo_041.jpg` | Large wire basket of fries is the table centerpiece |
| Nachos (Kitty Litter Crisps) | `menu/bites.jpg` | No clear nachos product still; category bites art is the honest fallback |
| Takoyaki (Pawsome Balls) | `photo_155.jpg` | Takoyaki in wooden trays visible on the patio table |
| Cat-Feine (Classic Coffee) | `photo_012.jpg` | Product-forward trio of iced coffee drinks with cat stickers |
| Matcha (The Lucky Green Neko) | `photo_148.jpg` | Salted caramel matcha beside a gray cat |
| Oreo (The Tuxedo Cat) | `photo_152.jpg` | Caramel Oreo drink beside a white café cat |
| Soda (Fizzy Felines) | `photo_042.jpg` | Row of colorful clear-cup sodas |
| Cat Association | `photo_030.jpg` | Shared group table with sodas, fries, and takoyaki |
| Couple of Cats | `photo_074.jpg` | Shared fries, takoyaki, and sodas for a small group |
| Single-Paw-rtner Combos | `photo_157.jpg` | Single drink + fries set with a café cat |
| Take-out Box | `photo_078.jpg` | White take-out clamshells with drinks on the patio |

**Files/modules affected:** `src/config/menu-item-images.ts`; `src/components/menu/menu-item-card.tsx`; `tests/unit/menu-item-images.test.ts`; `docs/development-log.md`.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Layered depth with restored display type

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer asked for depth / HDR-style layered UI across the site and to revert the Inter / Plus Jakarta Sans font change.\
**Summary:** Restored Georgia display type and an Apple system sans stack (`-apple-system` / SF). Added layered shadows, glass panels, richer card gradients, ambient canvas light, HDR-leaning media contrast on the cinematic hero, and stronger frosted header treatment without bringing back the deep-green hours billboard.\
**Files/modules affected:** `src/app/layout.tsx`; `src/app/globals.css`; `src/components/layout/site-header.tsx`; `src/app/page.tsx`; `src/app/contact/page.tsx`; `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)


## 2026-09-24 — Menu item photos: foods-only remapping

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Remap Menu card images to food/drink-only product stills (no people, no cats, no flyer art) per Lead Developer feedback.\
**Summary:** Kept the two confirmed shop product stills (noodles `photo_011.jpg`, Cat-Feine iced coffees `photo_012.jpg`). Replaced all other mappings that showed customers, café cats, or menu flyer graphics with royalty-free Unsplash/Pexels product photos under `public/images/menu/items/`. Omitted Cat Treats from the map rather than using a cat portrait.\
**Final mapping (item → src):**

| Item | Photo | Notes |
| --- | --- | --- |
| Buldak Carbo / Cheese | `/images/shop/photo_011.jpg` | Local FOOD_ONLY noodle plate |
| Sedaap Original / Spicy Chicken | `/images/shop/photo_011.jpg` | Same honest plate |
| Cat-Feine | `/images/shop/photo_012.jpg` | Local DRINK_ONLY iced coffees |
| Fries | `/images/menu/items/fries.jpg` | Stock fries basket |
| Nachos | `/images/menu/items/nachos.jpg` | Stock loaded nachos |
| Takoyaki | `/images/menu/items/takoyaki.jpg` | Stock takoyaki close-up |
| Matcha | `/images/menu/items/matcha.jpg` | Stock matcha latte |
| Oreo | `/images/menu/items/oreo-drink.jpg` | Stock cookies-and-cream drink |
| Soda | `/images/menu/items/soda.jpg` | Stock colorful fruit sodas |
| Cat Association / Couple of Cats / Single-Paw-rtner | `/images/menu/items/combo-spread.jpg` | Stock cafe combo spread |
| Take-out Box | `/images/menu/items/takeout-box.jpg` | Stock open takeout with noodles |
| Cat Treats | *(omitted)* | No treat-pack photo without a cat |

**Files/modules affected:** `src/config/menu-item-images.ts`; `public/images/menu/items/*`; `tests/unit/menu-item-images.test.ts`; `docs/development-log.md`.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Drop internet stock from menu cards

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer asked to drop the internet stock photos used on Menu cards.\
**Summary:** Removed `/images/menu/items/` stock files. Menu photos now use only real Brew ni Cat shop stills that are food/drink product frames (`photo_011` noodles, `photo_012` Cat-Feine). All other items omit a photo until a matching shop still exists.\
**Files/modules affected:** `src/config/menu-item-images.ts`; `tests/unit/menu-item-images.test.ts`; `public/images/menu/items/` (removed); `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Menu cards hug content height

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer flagged empty space below Menu cards that have no product photo.\
**Summary:** Menu category grids now use `items-start` so cards hug their content instead of stretching to match taller photo cards in the same row.\
**Files/modules affected:** `src/components/menu/menu-catalog.tsx`; `docs/development-log.md`.\
**Git branch:** `feat/gallery-ui-polish`\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10)

## 2026-09-24 — Merged PR #10 gallery UI polish

**Date:** 2026-09-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Lead Developer approved the gallery / cinematic UI polish branch and asked to merge after local review.\
**Summary:** Merged `feat/gallery-ui-polish` into `main` via [PR #10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10). Delivered cinematic Home/Gallery presentation, site-wide depth and layered surfaces with Georgia + system sans typography, Sunday-closed visit copy, Reveal hydration fix, gallery layout flush, optional Menu item photos only for confirmed shop food/drink stills (noodles + Cat-Feine), and menu card height alignment so imageless cards do not stretch. Internet stock photos were tried then removed per Lead Developer direction.\
**Files/modules affected:** Home, Gallery, Menu, Contact, shared layout/header/globals, gallery config, menu image map, development log and related Phase 2 docs already updated on the branch.\
**Git branch:** `main` (merged from `feat/gallery-ui-polish`)\
**Pull request:** [#10](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10) — merged 2026-09-24 as `f0fa38e`

## 2026-10-05 — Polish Home visit logistics, favorites, and cat lounge guidance

**Date:** 2026-10-05\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Implement UX/UI polish on Home based on Impeccable critique findings: surface operating hours in the top visit facts strip, replace abstract letter watermarks on customer favorites with authentic food photography and starting prices, add cat lounge house rules / etiquette, and highlight independent delivery rider logistics.\
**Summary:** Updated Home page to resolve priority critique issues. Expanded the top visit facts card to four items (`sm:grid-cols-2 lg:grid-cols-4`) to make Sunday closure and variable weekday hours immediately visible on arrival. Upgraded the Popular at Brew ni Cat section with authentic shop food/drink photography (`photo_148.jpg`, `bites.jpg`, `combo.jpg`), starting price pills (`From ₱49`, `From ₱40`, `From ₱30`), and sensory descriptions, eliminating sterile single-letter watermarks. Added a friendly "Visiting the Cats" etiquette block (no entrance fee, gentle paws, clean cuddles) and documented independent local delivery rider options in the Visit section. Adjusted hero heading tracking to `-0.025em` and softened background tones in alignment with the craft floor.\
**Changes:**
- `src/app/page.tsx`: 4-item visit facts grid with hours/schedule, favorite cards with food photos/prices/nicknames, cat lounge etiquette, delivery notice, tracking/contrast polish;
- `package.json` & `package-lock.json`: upgrade Next.js and eslint-config-next to 16.3.8, configure audit for production high+ and dev critical checks;
- `eslint.config.mjs` & `.prettierignore`: ignore editor skill and agent metadata directories;
- this development-log entry.
**Files/modules affected:** `src/app/page.tsx`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `.prettierignore`, `docs/development-log.md`.\
**Testing performed:** `npm run audit`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` (10 files / 73 tests passed), `npm run build` (7/7 static pages), and `python3 scripts/validate_phase0_docs.py` (ERRORS=0 / PASS).\
**Git branch:** `feat/homepage-ui-polish`\
**Pull request:** [#11 — feat(home): polish visit logistics, customer favorites, and cat lounge etiquette](https://github.com/eendor/Brew-ni-Cat-Connect/pull/11), merged 2026-10-05 as `937d6f5`.\
**Next action:** None; merged and recorded on Trello.


## 2026-10-11 — Update vulnerable sharp and source-map-js

**Date:** 2026-10-11\
**Phase:** Phase 3 — Menu and Ordering Flow (maintenance)\
**Task:** `npm run audit` reported high-severity findings in `sharp` and `source-map-js`.\
**Summary:** Ran `npm audit fix`, which moved `sharp` to 0.35.5 (librsvg CVE-2026-96889) and `source-map-js` to 1.2.2 (event-loop denial of service). The production audit now reports 0 vulnerabilities. A dev-only `braces` finding remains through `eslint-config-next` > `@next/eslint-plugin-next` > `fast-glob` > `micromatch`; the only offered fix downgrades `eslint-config-next` to 14.x, which is a breaking change for Next 16, so it was left alone.\
**Changes:**
- `package-lock.json`: transitive dependency bumps only, no `package.json` change;
- this development-log entry.
**Files/modules affected:** `package-lock.json`, `docs/development-log.md`.\
**Testing performed:** `npm run lint`, `npm run typecheck`, `npm test` (10 files / 73 tests passed), `npm run build` (7/7 static pages), `npm audit --omit=dev` (0 vulnerabilities). Playwright E2E was not run.\
**Known limitations:** Dev-only `braces` high-severity finding remains open until the Next.js ESLint plugin updates its dependency.\
**Git branch:** `fix/audit-deps`\
**Pull request:** [#12](https://github.com/eendor/Brew-ni-Cat-Connect/pull/12) — merged 2026-10-11 as `2b570b6`\
**Next action:** None; merged.

## 2026-10-11 — Confirm shop opening hours

**Date:** 2026-10-11\
**Phase:** Phase 3 — Menu and Ordering Flow (content update)\
**Task:** Lead Developer relayed that the shop opens every day at 11 AM until 10 PM and is still closed on Sunday.\
**Summary:** Replaced the "hours vary" wording with the confirmed hours (11 AM to 10 PM, Monday to Saturday, closed every Sunday) in the site config, Home, About and mobile navigation. Updated FR-003, the business content register, SRS, project overview, PRODUCT.md and README to match. Customers are still pointed to Facebook or the shop contact for schedule changes.\
**Files/modules affected:** `src/config/site.ts`, `src/app/page.tsx`, `src/app/about/page.tsx`, `src/components/layout/mobile-navigation.tsx`, `tests/unit/business-pages.test.tsx`, `docs/functional-requirements.md`, `docs/business-content-register.md`, `docs/srs.md`, `docs/project-overview.md`, `PRODUCT.md`, `README.md`, `docs/development-log.md`.\
**Testing performed:** `npm run lint`, `npm run typecheck`, `npm test` (73/73 passed), `npm run build`, `python3 scripts/validate_phase0_docs.py` (PASS). Playwright E2E was not run.\
**Git branch:** `feat/update-shop-hours`\
**Pull request:** [#13](https://github.com/eendor/Brew-ni-Cat-Connect/pull/13) — merged 2026-10-11 as `82e336e`\
**Next action:** None; merged.

## 2026-10-14 — Restore a passing Playwright baseline

**Date:** 2026-10-14\
**Phase:** Phase 3 — Menu and Ordering Flow (maintenance)\
**Task:** While reviewing PR #14, two Playwright tests failed on `main` as well as on the PR branch.\
**Summary:** TC-P1-009 found horizontal overflow at 320px on `/contact`: the email address cannot break at word boundaries, so its card grew to 303px and pushed the page wider than the viewport. The contact value now uses `wrap-anywhere`. TC-P2-021 still looked for a homepage image named "Brew ni Cat Coffee Shop logo", which was removed in the PR #10 hero redesign; the logo now sits in the header as decoration inside the "Brew ni Cat Coffee Shop home" link. The test now checks that link and the hero heading instead.\
**Changes:**
- `src/app/contact/page.tsx`: `break-words` → `wrap-anywhere` on contact values;
- `tests/e2e/showcase.spec.ts`: TC-P2-021 checks the header home link and hero heading;
- this development-log entry.
**Files/modules affected:** `src/app/contact/page.tsx`, `tests/e2e/showcase.spec.ts`, `docs/development-log.md`.\
**Testing performed:** `npm run test:e2e` (13/13 passed); `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (10 files / 73 tests passed), `python3 scripts/validate_phase0_docs.py` (PASS).\
**Git branch:** `fix/e2e-baseline`\
**Pull request:** [#15](https://github.com/eendor/Brew-ni-Cat-Connect/pull/15) — merged 2026-10-14 as `8be9e6a`\
**Next action:** None; merged.

## 2026-10-15 — Phase 3 Cart & Checkout implementation and review resolution

**Date:** 2026-10-15\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Implement Phase 3 Cart & Checkout (FR-019, FR-021, FR-022, FR-025) and resolve code review feedback from project lead on PR #14.\
**Summary:** Implemented cart state management, slide-out drawer, dedicated cart page, and step-by-step checkout flow. Addressed peer review feedback: rendered dialogs via React portal (`createPortal(..., document.body)`) to prevent card CSS transform clipping; implemented circular focus trap and focus restoration hook (`useFocusTrap`) with ref-stabilized callbacks so option clicks and cart quantity adjustments retain focus; added accessible `<fieldset>`/`<legend>`/`aria-pressed` attributes; revalidated cart prices against authoritative menu catalog on checkout to defend against `localStorage` tampering; replaced simulated backend order IDs with a truthful "Send to Shop" draft summary flow providing direct copy button and Messenger/phone contact links; enforced strict Philippine mobile phone format (`^(09\d{9}|\+639\d{9})$`); aligned checkout copy with confirmed shop takeout packaging fee and operating hours; and hid checkout step indicator text below `sm` (`sr-only sm:not-sr-only`) to eliminate 320px horizontal overflow with TC-P1-009 verification.\
**Files/modules affected:** `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `src/app/menu/page.tsx`, `src/components/cart/cart-drawer.tsx`, `src/components/cart/cart-line-item.tsx`, `src/components/cart/cart-page-view.tsx`, `src/components/cart/cart-trigger-button.tsx`, `src/components/checkout/checkout-view.tsx`, `src/components/menu/menu-item-order-dialog.tsx`, `src/context/cart-context.tsx`, `src/lib/accessibility/focus-trap.ts`, `tests/e2e/foundation.spec.ts`, `tests/unit/cart-components.test.tsx`, `tests/unit/cart-context.test.tsx`, `tests/unit/checkout.test.tsx`, `tests/unit/menu-order-dialog.test.tsx`, `docs/development-log.md`.\
**Testing performed:** `npm run lint`, `npm run typecheck`, `npm run test` (14 files / 108 tests passed), `npm run format:check`, `npm run test:e2e` (13/13 passed), `npm run build` (9/9 static pages), `python scripts/validate_phase0_docs.py` (PASS).\
**Git branch:** `feat/p3-cart-checkout`\
**Pull request:** [#14](https://github.com/eendor/Brew-ni-Cat-Connect/pull/14) — merged 2026-10-15 as `e36b5a3`\
**Next action:** None; merged. Supabase RLS hardening remains open before release.

## 2026-10-15 — Menu product photos and refined scroll and page motion

**Date:** 2026-10-15\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation polish)\
**Task:** Lead Developer approved real product photos from the shop for the Menu and asked for complete, restrained scroll and page motion across the site; the four noodle cards were all showing one duplicated photo.\
**Requirement IDs:** FR-005, FR-008, FR-011, FR-016, NFR-005, NFR-029, NFR-032, NFR-034.\
**Summary:** Six real product photos (max 1600px, quality 80, EXIF/GPS stripped) now live in `public/images/menu/items/`, one per item. `photo_011` is removed from every Menu card, Sedaap and all other unphotographed items stay imageless, and no menu-board graphics are used (Home favorites now use the real Takoyaki and Fries photos). Image lookup is exact (base name or nickname) so no two cards can share a photo. Motion is CSS-first with one rAF-throttled scroll hook, no new dependencies, and is disabled under `prefers-reduced-motion`.\
**Changes:**

- Menu photos: Takoyaki, Buldak Carbo, Buldak Cheese, Fries, Cat-Feine, Matcha (The Lucky Green Neko, cropped to the dirty matcha);
- soft fade/rise route transition (`src/app/template.tsx`);
- frosted header tightens on scroll, centered nav underline, sticky category bar tracks the header height;
- Home hero media scales/parallaxes while copy fades on scroll; interior page heroes fade/rise with a subtle ambient drift;
- staggered card rise in Menu categories, gentle card lift with slow photo zoom, scroll-spy active category tab that stays visible in the tab bar;
- footer reveal, button press feedback, smooth form focus transitions;
- cart drawer slide-in, order dialog scale-in, mobile menu drop-in, backdrop fades;
- Menu loading skeleton cards; and
- contribution rules updated: lead-developer self-approval allowed, teammate pull requests still reviewed.

**Files/modules affected:** `public/images/menu/items/*`, `src/config/menu-item-images.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/template.tsx`, `src/components/motion/scroll-motion.tsx`, `src/components/layout/site-header.tsx`, `src/components/layout/site-footer.tsx`, `src/components/layout/mobile-navigation.tsx`, `src/components/menu/menu-catalog.tsx`, `src/components/menu/menu-item-card.tsx`, `src/components/menu/menu-item-order-dialog.tsx`, `src/components/cart/cart-drawer.tsx`, `tests/unit/menu-item-images.test.ts`, `tests/unit/menu-catalog.test.tsx`, `docs/test-cases.md`, `docs/code-review.md`, `docs/evidence/phase-3/menu-photos-motion/`, `CONTRIBUTING.md`, `docs/development-standards.md`, `docs/development-log.md`.\
**Testing performed:** `npm run lint` (pass), `npm run typecheck` (pass), `npm run format:check` (pass), `npm test` (14 files / 109 tests passed), `npm run build` (9/9 static pages), `npx playwright test` (13/13 passed), `python scripts/validate_phase0_docs.py` (PASS). Desktop 1440px and mobile 320px screenshots reviewed with zero horizontal overflow; record in `docs/evidence/phase-3/menu-photos-motion/verification.md`.\
**Issues encountered:** GSAP and Lenis were evaluated and not added; native smooth anchor scrolling is already subtle and keeps sticky bars and focus traps simple. Drawer/dialog exit animations are not implemented because they unmount immediately.\
**Git branch:** `feat/menu-photos-motion`\
**Pull request:** [#16](https://github.com/eendor/Brew-ni-Cat-Connect/pull/16) — merged 2026-10-15 as `cb28583`\
**Next action:** None; merged.

## 2026-10-15 — Restore menu card hover lift and right-size menu photos

**Date:** 2026-10-15\
**Phase:** Phase 3 — Menu and Ordering Flow (follow-up to PR #16)\
**Task:** Post-merge review of PR #16 found that menu cards no longer lifted on hover, and that the card photo `sizes` hint did not match the two-column menu grid.\
**Summary:** The staggered reveal rule `.reveal--visible .menu-grid > *` sets `transform: none` with the same specificity as `.surface-lift:hover` and comes later, so the hover lift never applied; its stagger delays also stayed on the cards. A rule after the reveal rules restores the lift with no delay. Reduced motion still disables it through the existing `!important` override. The menu card `sizes` now follows the grid (one column below 768px, two columns up to the 72rem container) instead of a three-column guess, so 640–767px screens and high-density laptops download photos at least as wide as the card. A report of alt text showing on the drinks cards under `npm run dev` could not be reproduced on a fresh dev server or a production build in Chromium or Firefox (all six photos return 200 and render).\
**Changes:**
- `src/app/globals.css`: `.reveal--visible .menu-grid > .surface-lift:hover` restores `translateY(-4px)` with `transition-delay: 0ms`;
- `src/components/menu/menu-item-card.tsx`: `sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 576px"`;
- this development-log entry.
**Files/modules affected:** `src/app/globals.css`, `src/components/menu/menu-item-card.tsx`, `docs/development-log.md`.\
**Testing performed:** Browser check on a production build: cards 1 and 3 lift to `-4px` on hover starting within 30ms, no lift under reduced motion; downloaded photo width covers the card at 375px@2x (750 for 333), 800px (640 for 360), 1280px (640 for 532) and 1440px@2x (1200 for 532). `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (14 files / 109 tests passed), `npm run test:e2e` (13/13 passed), `python3 scripts/validate_phase0_docs.py` (PASS).\
**Git branch:** `fix/menu-card-hover-and-images`\
**Pull request:** [#17](https://github.com/eendor/Brew-ni-Cat-Connect/pull/17) — merged 2026-10-15 as `8f62c6c`\
**Next action:** None; merged. PR #18 later replaced this hover rule.

## 2026-10-15 — Menu layout, order dialog and header polish

**Date:** 2026-10-15\
**Phase:** Phase 3 — Menu and Ordering Flow (UI polish)\
**Task:** Lead developer review of the Menu after PR #16/#17: blank gaps between cards, photo and text-only cards looking like two designs, single cards filling half a row, sections blank after a tab jump, a cramped order dialog, a warm glow through the header, the wrong Home Matcha photo, and a very long mobile Home.\
**Summary:**
- Menu cards share one structure. A photo, when the item has one, is a 96px thumbnail beside the name instead of a 16:10 banner, so photo and text-only cards match. Cards stretch to the row height with the order button pinned to the bottom, and an odd last card in a category spans the full row (its sizes use two columns when there is more than one). Largest in-row height difference on desktop went from 437px to 0; Menu page height from 7781px to 6234px on desktop and 11420px to 10433px on mobile.
- Menu categories no longer wait for a scroll fade-in. Visible cards were at opacity 0 for 0.5–0.9s after a tab jump; they are now fully visible immediately. The menu-specific stagger CSS and the PR #17 hover workaround were removed with it. The repeated "Current category" eyebrow was dropped because it labelled every section as current.
- Order dialog: three sizes sit on one row, and the option groups get their spacing back (`m-0` on the fieldsets was overriding `space-y-6`).
- Header becomes 90% opaque once the page scrolls and uses the design-system saturation (1.35), so the warm notice and terracotta buttons scrolling beneath can't tint the blur.
- Home: Matcha favorite uses the real Lucky Green Neko photo used on the Menu; on phones the favorites are compact side-by-side cards (favorites section 1854px to 1109px at 375px).
- Mobile card footer: full-width 48px order button on one line; the "Ready to enjoy?" hint shows from `sm` up. Flavor price lists use a 1px neutral rule instead of a 2px accent border.
**Files/modules affected:** `src/components/menu/menu-item-card.tsx`, `src/components/menu/menu-catalog.tsx`, `src/components/menu/menu-item-order-dialog.tsx`, `src/components/layout/site-header.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `docs/development-log.md`.\
**Testing performed:** Production-build browser measurements and screenshots at 1280px, 375px and 320px (row height differences, page heights, card opacity after tab jump, dialog layout, 320px overflow 0, order button 48px). `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (14 files / 109 tests passed), `npm run test:e2e` (13/13 passed), `python3 scripts/validate_phase0_docs.py` (PASS).\
**Git branch:** `fix/menu-layout-polish`\
**Pull request:** [#18](https://github.com/eendor/Brew-ni-Cat-Connect/pull/18) — merged 2026-10-15 as `a887c12`\
**Next action:** Re-check remaining Menu polish items (stretched short cards, dialog selected state, sticky bar width) in a follow-up.

## 2026-10-16 — Checkout validation refactor and Phase 3 documentation update

**Date:** 2026-10-16\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Refactor checkout validation out of the component into pure ordering utilities, add unit tests, and update Phase 3 documentation following PR #14 merge.\
**Summary:** Extracted `validateDetails` and Philippine mobile regex matching formats (`0912 345 6789`, `+63 912 345 6789`, invalid strings, short/long lengths) from the checkout component into `src/lib/ordering/validation.ts` as pure exportable functions. Added unit test coverage at `tests/unit/checkout-validation.test.ts` to verify valid/invalid inputs, missing fields, and edge cases. Audited UI text against `src/config/site.ts` to ensure wording consistency. Recorded Phase 3 documentation updates across test cases, functional requirement statuses, PR #14 code review entries, and this log.\
**Changes:**
- `src/lib/ordering/validation.ts`: created pure helper functions `validatePhoneNumber` and `validateDetails` with `CheckoutDetails` and `ValidationResult` interfaces;
- `tests/unit/checkout-validation.test.ts`: created unit tests covering Philippine phone number formats, non-numeric strings, boundary lengths, and required form fields;
- `docs/code-review.md`: added review record for PR #14;
- `docs/test-cases.md`: appended Phase 3 checkout validation and order summary copy test cases;
- `src/components/checkout/checkout-view.tsx`: replaced the inline validation with the shared helper, keeping the existing field messages;
- this development-log entry.
**Files/modules affected:** `src/lib/ordering/validation.ts`, `src/components/checkout/checkout-view.tsx`, `tests/unit/checkout-validation.test.ts`, `docs/code-review.md`, `docs/test-cases.md`, `docs/development-log.md`.\
**Note:** `docs/functional-requirements.md` was not part of the merged change. FR-021 and FR-025 cover server-side revalidation and order references, which this client-side refactor does not implement, so they stay Planned. The phone and name checks belong to FR-022 (pickup checkout fields with field-specific errors), and the copy-summary case to FR-020; the test-case mapping was corrected in the follow-up docs sync.\
**Testing performed:** Executed `npm run test` (all unit test suites passing), `npm run lint`, `npm run typecheck`, and `npm run build` with zero errors.\
**Git branch:** `feat/p3-checkout-docs`\
**Pull request:** [#20](https://github.com/eendor/Brew-ni-Cat-Connect/pull/20) — reviewed by the lead developer (two rounds of requested changes, then approved) and merged 2026-10-16 as `902fb6b`\
**Post-merge check (2026-10-17, `main` at `902fb6b`):** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (15 files / 115 tests passed), `npm run build`, `npm run test:e2e` (13/13 passed), `python3 scripts/validate_phase0_docs.py` (PASS).\
**Next action:** Server-side order creation and revalidation (FR-021, FR-024, FR-025) remain open for Phase 3.