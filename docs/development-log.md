# Development Log

**Document version:** 0.1 Draft\
**Last updated:** 2026-10-28

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
**Pull request:** [#1 — feat: initialize the Brew ni Cat Connect web foundation (Phase 1)](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1), merged 2026-08-23 as `11c546d`.\
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
**Pull request:** [#2 — feat: build the Brew ni Cat public showcase website (Phase 2)](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), merged 2026-09-16 as `ae002f1`.\
**Next action:** The handoff-only commit receives the required hosted checks, then Renier independently tests/reviews Pull Request #2. Do not merge, mark Done, or begin Phase 3 before that review.

---

## 2026-08-24 — Phase 2 live Supabase menu follow-up

**Date:** 2026-08-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Reverify the real catalog through the website's publishable Supabase identity after RLS was manually disabled, refresh live Menu evidence, and record the resulting security limitation without changing business data.\
**Summary:** Public GET requests using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` returned 6 categories and 16 items, with 0 unavailable items and 0 unmatched relationships. The real `/menu` page displayed all six categories and sixteen items at 320, 375, 768, 1024, and 1440 CSS pixels with zero document overflow and zero console errors. Phase 2 remains in Testing / Review; Pull Request #2 remains open/unmerged and Renier QA remains pending.\
**Changes:**

- preserved the previous unavailable-state Menu captures as `menu-before-public-access-desktop-1440.webp` and `menu-before-public-access-mobile-375.webp`;
- regenerated primary `menu-desktop-1440.webp` and `menu-mobile-375.webp` evidence from the live public runtime with no route mocking;
- recorded the five-width live inspection in `docs/evidence/phase-2/live-menu-review.json`;
- corrected customer-facing handling of a zero base-price sentinel when flavor prices exist, so Takoyaki now displays `From ₱40` rather than `From ₱0`;
- retained loading, empty, retrieval-error/retry, and successful menu-state coverage and added regression coverage for the zero-base/flavor-price case;
- verified the Matcha, Takoyaki, and Fries favorite-card links continue to lead to `/menu`; and
- updated living documentation to distinguish the historical blocker from the live result and the current RLS-disabled risk.

**Database/access result:** RLS was manually disabled on the relevant catalog tables before this work. The application and automated follow-up made no RLS, policy, schema, menu, product, price, category, variant, availability, inventory, sales, expense, customer, order, or POS data mutation. Public catalog reads now depend on table-level grants and are not least privilege.\
**Exposure assessment:** HEAD-only/no-body public probes found `inventory` (11), `recipe_mappings` (20), `expenses` (76), `orders` (1,942), `order_items` (4,276), and `app_release` (19) publicly reachable. `customers`, `sales`, and `payments` returned HTTP 404, an ambiguous result rather than proof of denial. No unrelated record body was retrieved and no write was tested. This exposure is a production security blocker; restore RLS and add/test explicit catalog-only anonymous `SELECT` policies before production.\
**Testing performed:** Live public data access and five-width browser inspection passed as recorded above. The final follow-up gates all exited 0: `npm run format:check` reported `All matched files use Prettier code style!`; `npm run audit` reported `found 0 vulnerabilities`; lint completed with no warnings; typecheck generated route types and completed; Vitest passed 6 files and 21/21 tests; the production build compiled and generated 7/7 static pages; Playwright passed 13/13 tests; and the documentation validator checked 22 Markdown files, 81 FR IDs, and 40 NFR IDs with `ERRORS=0` and `PHASE0_DOC_VALIDATION=PASS`.\
**Files/modules affected:** Menu presentation; focused unit coverage; live capture tooling/evidence; README and living Phase 2 documentation.\
**Git branch:** `feat/showcase-website`\
**Git commit:** `4eaeca0` — `fix: verify live Supabase menu and refresh evidence`\
**Pull request:** [#2 — feat: build the Brew ni Cat public showcase website (Phase 2)](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), merged 2026-09-16 as `ae002f1`.\
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
**Deferred to Phase 3:** swipeable menu cards, per-product images, and customer reservation handling. Reservation behavior requires owner confirmation before any design work begins.
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
**Pull request:** [#10 — feat: polish the gallery layout after the new Facebook photos](https://github.com/eendor/Brew-ni-Cat-Connect/pull/10), merged 2026-09-24 as `f0fa38e`.\
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
**Pull request:** [#11 — feat: polish homepage visit logistics, customer favorites, and cat lounge etiquette](https://github.com/eendor/Brew-ni-Cat-Connect/pull/11), merged 2026-10-05 as `937d6f5`.\
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
- Menu categories no longer wait for a scroll fade-in. Visible cards were at opacity 0 for 0.5–0.9s after a tab jump; they are now fully visible immediately. The menu-specific stagger CSS and the PR #17 hover workaround were removed with it. The repeated "Current category" eyebrow was dropped because it labeled every section as current.
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

## 2026-10-17 — Stabilize the category tab highlight test (TC-P3-052)

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Fix a menu category test that failed once on `main` (run 38986962690) and passed on re-run.\
**Summary:** The fake `IntersectionObserver` in the test kept only the last callback it was given. `Reveal` also creates observers, so the test sometimes fired a reveal callback instead of the menu one and the last tab never got `aria-current`. The fake now records each callback with the elements it observes, and the test notifies only the observers that watch the target section. PR #23 later moved the tabs to a scroll-spy and rewrote TC-P3-052 for it.\
**Files/modules affected:** `tests/unit/menu-catalog.test.tsx`.\
**Testing performed:** `vitest run tests/unit/menu-catalog.test.tsx` three times (7/7 each), `npm test` (15 files / 115 tests passed), Prettier, ESLint and `tsc --noEmit`; CI passed.\
**Git branch:** `fix/menu-tab-test-flake`\
**Pull request:** [#21](https://github.com/eendor/Brew-ni-Cat-Connect/pull/21) — merged 2026-10-17 as `3b1f7ed`\
**Next action:** None.

## 2026-10-17 — Record direct-to-main docs commits

**Summary:** Two docs-only commits (`8ae282a`, `ad5f0a5`) reached `main` without a pull request. They are now listed as reviewed process exceptions in `docs/code-review.md`, and future docs syncs go through a pull request.\
**Files/modules affected:** `docs/code-review.md`, `docs/development-log.md`.\
**Git branch:** `docs/direct-push-exceptions`\
**Pull request:** [#22](https://github.com/eendor/Brew-ni-Cat-Connect/pull/22) — merged 2026-10-17 as `80c1839`\
**Next action:** None.

## 2026-10-17 — Three.js experience layer across every page

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Bring the standalone three.js prototype into the real site on every route, with all `main` content and features kept, in a realistic (physically based) "Night Shift Glow" look.\
**Summary:** Added a WebGL layer under `src/components/three/` (plain three.js plus GSAP ScrollTrigger, loaded with `next/dynamic` and `ssr: false`). Home gets a pinned scroll showcase of the Matcha and Cat-Feine cups, takoyaki, fries and Buldak Carbo. Menu photos become glossy 3D prints, and Add to Order throws the item into a 3D basket on the real cart button before the drawer opens. Gallery gets a draggable photo ring. Contact and the home visit section get a flip sign and a street model with the small Brew ni Cat unit to the right of Pulido Eatery. About, cart and checkout get quiet ambient backdrops. Rendering uses physical materials (transmission, IOR 1.45, clearcoat), a bundled CC0 studio HDRI, ACES tone mapping, soft and contact shadows, depth of field and film grain. The site theme moves to the dark palette with Big Shoulders and Archivo. The "Ready to enjoy?" line is removed from menu cards. Reduced motion and devices without WebGL 2 keep a full static page; phones get a lower pixel ratio and fewer particles; slow frames drop depth of field and bloom.\
**Changes:**
- `src/components/three/`: engine (renderer, HDRI, PBR texture generators, post-processing, frame loop, quality and motion checks), scenes, canvas components and page wrappers with static fallbacks;
- `src/app/globals.css`, `src/app/layout.tsx`: dark tokens, `next/font` families, 3D layout styles, site-wide cart layer;
- `src/app/page.tsx`, `menu`, `gallery`, `contact`, `about` pages, `PageIntro`, cart and checkout views: 3D sections and recolored surfaces with all existing content;
- `src/components/menu/menu-item-card.tsx`, `menu-item-order-dialog.tsx`, `cart-trigger-button.tsx`: 3D tile slot, toss after a successful `addItem`, basket anchor;
- `public/three/`: CC0 HDRI and the cat sticker cut from the shop's Matcha photo;
- `tests/unit/three-layer.test.tsx`, `tests/e2e/three.spec.ts`, `tests/e2e/showcase.spec.ts`, `playwright.config.ts`: new 3D cases and a separate `chromium-3d` project;
- `docs/decisions.md` (ADR-014), `docs/system-architecture.md` (§18), `docs/software-and-apis.md` (packages and asset licenses), `docs/test-cases.md` (§12), this entry.
**Files/modules affected:** as listed above; `package.json` and `package-lock.json` add `three` 0.186.1, `gsap` 3.15.0 and `@types/three` 0.186.0.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (16 files / 120 tests passed), `npm run build`, `npm run test:e2e` (18/18 passed: 13 functional cases under reduced motion, 5 WebGL cases), `python3 scripts/validate_phase0_docs.py` (PASS). Production screenshots at 1440×900 and 390×844 for every route and scroll-through videos of home and menu were reviewed for blank canvases, overlap and console errors.\
**Note:** Food and drink models are procedural with generated PBR maps because no CC0 photoscans of these dishes exist. Captures used software WebGL, so they understate frame rate and show some tile lag behind fast scrolling.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — merged 2026-10-18 as `cf52cb3`\
**Next action:** A hands-on check by the lead developer on a phone and a desktop GPU. Done in PR #24 (MAN-P4-003 passed); the check on a physical phone continues as MAN-P4-007.

## 2026-10-17 — Align the 3D site to the updated dark design system

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Bring the `feat/threejs-experience` branch in line with the design system after it was updated to the "Night Shift Glow" direction, then do a hands-on UI sweep of every page and state.\
**Summary:** The project design system now describes the dark direction directly (palette, Big Shoulders and Archivo type roles, radius and spacing scales, motion timings, PBR rendering rules, reduced-motion behavior and AA contrast), so ADR-014 records an update rather than an override. The site was aligned to it: font sizes and corner radii now come from one token ramp, the two near-identical muted grays are merged, a dedicated error color (#FF8577) replaces the light-theme reds that failed AA on black, and dead CSS from the old spruce theme is removed. A manual sweep at 1440, 1280, 768, 390 and 360 px found and fixed: the home showcase controls sitting below the fold, the 3D basket drawing over the order dialog and cart drawer, cramped two-column showcase controls on tablets, copy over the product on phones (now with a bottom scrim), the Buldak Carbo bowl showing its empty underside while turning, truncated item names in the cart drawer, a visible duplicate "(Selected)" label, an invisible white-on-white copy button, 14 px checkout inputs that zoom on iOS, checkout errors that stayed off-screen on phones (the first invalid field now gets focus), touch targets under 44 px (footer links, steppers, close and remove buttons, clear-cart links, payment options, the mobile menu button), no current-page marker in the navigation, a lowercase landmark on the contact page, and a tall empty gallery stage on phones.\
**Files/modules affected:** `src/app/globals.css`, `src/app/page.tsx`, `about`, `contact`, `gallery`, `not-found` and `error` pages, layout (`site-header`, `mobile-navigation`, `site-footer`, new `nav-link.tsx`), menu, cart and checkout components, `src/components/three/scenes/models.ts` and `showcase.ts`, `docs/decisions.md` (ADR-014), `docs/test-cases.md` (MAN-P4-002, MAN-P4-003), this entry. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (16 files / 120 tests passed), `npm run build`, Playwright against the production build (18/18 passed), `python3 scripts/validate_phase0_docs.py` (PASS); manual sweep MAN-P4-002 with before and after captures kept outside the repository. No new automated tests were added for this pass.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — merged 2026-10-18 as `cf52cb3`\
**Next action:** A click-through by the lead developer in a real browser. Done in PR #24 (MAN-P4-003 passed).

## 2026-10-17 — Full-bleed layout, cinematic menu, borderless visit sign and click-through fixes

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Make every page full-bleed instead of a narrow centered column, remove the black box around the OPEN/CLOSED sign and street model, give the menu a cinematic 3D opening and category moments, and fix the issues found in a hands-on click-through.\
**Summary:**
- **Full-bleed layout:** the shared `Container` now uses `--shell-max: 90rem` of content plus fluid gutters (`--shell-pad: clamp(1rem, 4vw, 4rem)`), so section backgrounds and 3D scenes run edge to edge and text is no longer held in a 72rem column (at 1920 px the side gutters drop from 384 px to about 240 px, and at 1024 px from 32 px to 40 px fluid). The menu category bar spans the viewport. The menu grid goes to three columns at 1280 px. Cart and checkout put the items/form and the order summary side by side from 900 px.
- **Visit sign:** the stage now sits outside the bordered card on a transparent, full-bleed canvas. The sign texture has no dark margin (alpha-tested face). A wide-screen camera layout removes the empty band under the sign and shop.
- **Cinematic menu:** a full-viewport hero with a glowing "THE MENU" title over a three.js scene (turning cups with two-tone rim light, floating ice, beans and leaves, a soft floor shadow). The scene dollies and fades into the catalog as you scroll. Each category gets an indexed heading whose glow color shifts with it (drinks green/amber, bites orange/yellow, Buldak pink/cyan), and a fixed glow field follows the active category. Cards fly in with a depth stagger, and a rim sheen follows the pointer. 3D photo prints get pointer and scroll parallax. Film grain and a vignette apply on large hover screens only. Reduced motion keeps the static page; phones get one cup and fewer particles.
- **Click-through fixes:**
  - mobile menu scrim with blur that closes on tap, plus a scroll lock
  - fixed-width gallery caption with the prev/next buttons pinned
  - the order dialog's Add button reads the latest size, flavor and quantity from a ref, so rapid clicks can't add stale choices
  - the toss is shortened to 420 ms, so the drawer opens about 0.42 s after Add (was about 1 s)
  - drawer lines stack the stepper under the name in narrow containers
  - the ₱10 takeout box is shown as a separate line marked "not included in the subtotal" in the drawer, cart, checkout and copied summary (the SRS confirms the price but defers the fee rule, so nothing is added to totals)
  - checkout steps scroll to the step section and focus its heading
  - the cart is kept until the summary is copied or "Start a new order" is pressed, and the prepared summary survives a refresh
  - navigation no longer starts part-way down the page (`data-scroll-behavior="smooth"`), and the header keeps one height
  - a 5-second Undo toast after Remove and Clear all
  - wider header spacing between 1024 and 1280 px
  - `scroll-margin-top` on the visit section
  - designed letter placeholders for items without photos (no stock images)
  - a "Page not found" title on the 404 page
  - non-breaking arrows on the checkout buttons
  - 4× MSAA in the post-processing target and smoother ice geometry
  - `scrollbar-gutter: stable`

**Files/modules affected:** `src/components/ui/container.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/menu/page.tsx`, `src/app/not-found.tsx`, new `src/components/three/menu-hero.tsx`, `canvas/menu-hero-canvas.tsx`, `scenes/menu-hero.ts`, `src/components/menu/category-glow.ts`, `menu-catalog.tsx`, `menu-item-card.tsx`, `menu-item-order-dialog.tsx`, `scenes/visit.ts`, `scenes/menu-cards.ts`, `scenes/showcase.ts`, `scenes/models.ts`, `engine/post.ts`, `cart-toss.ts`, `cart-fx.ts`, layout header and mobile navigation, cart drawer, line item, cart page, new `cart-undo-toast.tsx`, `src/context/cart-context.tsx`, `src/components/checkout/checkout-view.tsx`, new `src/lib/ordering/summary-storage.ts`, `src/config/site.ts`, `tests/unit/menu-order-dialog.test.tsx`, `tests/unit/checkout.test.tsx`, `docs/system-architecture.md` (§18), `docs/test-cases.md`, `docs/decisions.md` (ADR-014), this entry. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (16 files / 122 tests passed, including the new TC-P4-011 and TC-P4-012 race cases, which fail on the previous dialog code), `npm run build`, `npm run test:e2e` against the production build (18/18 passed; TC-P2-027 now looks for the loading status inside `main` because the undo toast adds a second live region, and TC-P4-002 waits for the menu hero instead of an ambient backdrop on `/menu`), `python3 scripts/validate_phase0_docs.py` (PASS). Before and after captures at 1024, 1280, 1440 and 1920 px (layout) and at 1440 and 390 px (menu, sign, every menu tab, mobile navigation, gallery ring, drawer and undo, cart, checkout steps, sign flip, about) were reviewed; they are kept outside the repository.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — merged 2026-10-18 as `cf52cb3`\
**Next action:** A click-through by the lead developer on a desktop GPU and a real phone (MAN-P4-003). Done in PR #24; the check on a physical phone continues as MAN-P4-007.

## 2026-10-17 — Category-lit menu cards and no scroll hint

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Remove the vertical "Scroll" hint from the 3D heroes and redesign the menu cards, which all looked like the same generic box.\
**Summary:**
- **Scroll hint:** the vertical "Scroll" label and line are gone from the menu hero and the home showcase, along with their CSS and the drip animation.
- **Menu cards:** each card is now a small product studio lit by its item's glow (or its category's glow when the item has none): a dark stage with a glow pool on the floor, the real shop photo standing as a print with a contact shadow and a soft floor reflection, a rim light on the top edge, the name in large Big Shoulders with the nickname as a small label above it, and a large "From" price in the glow color. Short sizes show as price chips, flavors as chips with a glow dot, and long options keep a readable list. Items without a shop photo get their first letter as a lit sign on a studio plinth instead of an empty box. The footer holds only the Order button.
- **Layout:** each category leads with its first photo item, which takes two thirds of the row on wide screens; short last rows stretch to fill the width (`menu-layout.ts`). Wide cards switch to a side-by-side stage and details through a container query.
- **Motion:** a light sweep crosses the stage on hover, and cards without a live 3D tile now get the same gentle pointer tilt as photo cards; nothing tilts on touch or with reduced motion. 3D tiles no longer show their dark back deep in the scene before their entrance starts.

**Files/modules affected:** `src/components/menu/menu-item-card.tsx`, `menu-catalog.tsx`, new `menu-layout.ts`, `src/components/three/showcase-data.ts` (`matchGlowForItem`), `scenes/menu-cards.ts`, `menu-hero.tsx`, `home-showcase.tsx`, `src/app/globals.css`, new `tests/unit/menu-layout.test.ts`, `docs/test-cases.md` (TC-P4-013 to TC-P4-015, MAN-P4-005), this entry. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (17 files / 125 tests passed), `npm run build`, Playwright against the production build (18/18 passed), `python3 scripts/validate_phase0_docs.py` (PASS); manual review MAN-P4-005 at 1440, 1920, 768 and 390 px with before and after captures kept outside the repository.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — merged 2026-10-18 as `cf52cb3`\
**Next action:** A click-through by the lead developer on a desktop GPU and a real phone (MAN-P4-003). Done in PR #24; the check on a physical phone continues as MAN-P4-007.

## 2026-10-17 — Plain menu cards and crisp category headings

**Date:** 2026-10-17\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Replace the lit-stage menu cards and the wide lead card with a plain, uniform card grid, and stop the category headings from looking blurred.\
**Summary:**
- **Cards:** every card is a plain dark card. Photo items show the shop photo across the top at 4:3, followed by the name (Big Shoulders, nickname as a small label), the price, size chips or the options list, flavor chips, and the Order button. Imageless items start straight with the name; there is no placeholder art. The only color accent is the price, in the item's glow (or the category's). The stage, glow pool, floor, contact shadow, reflection, light sweep, rim light, plinth and hover glow are removed.
- **Grid:** one uniform grid per category: 1 column on phones, 2 from 768 px, 3 from 1280 px. Cards in a row share the row height. The lead-card layout (`menu-layout.ts`) and its tests are removed.
- **Photos:** menu photos are plain images again. The 3D photo tiles (`MenuTilesLayer`, `menu-tiles-canvas.tsx`, `scenes/menu-cards.ts`) are removed; the 3D basket toss on Add to Order stays.
- **Motion:** pointer tilt and sheen are removed. On hover-capable pointers a card lifts 3 px and its border lightens; nothing moves with reduced motion. Cards enter with a 500 ms fade and 20 px rise.
- **Category headings:** the blur filter and text glow are removed from the heading entrance, along with the haze behind it. Headings now fade and rise 12 px over 400 ms and are otherwise always crisp.

**Files/modules affected:** `src/components/menu/menu-item-card.tsx`, `menu-catalog.tsx`, removed `menu-layout.ts`, `src/components/three/layers.tsx`, removed `canvas/menu-tiles-canvas.tsx` and `scenes/menu-cards.ts`, `src/app/menu/page.tsx`, `src/app/globals.css`, removed `tests/unit/menu-layout.test.ts`, `tests/unit/three-layer.test.tsx` (TC-P4-009), `tests/e2e/three.spec.ts` (TC-P4-003), `docs/test-cases.md` (TC-P4-013 to TC-P4-015 retired with their tests, MAN-P4-005), `docs/system-architecture.md`, this entry. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (16 files / 122 tests passed), `npm run build`, Playwright against the production build (18/18 passed), `python3 scripts/validate_phase0_docs.py` (PASS); manual review MAN-P4-005 at 1440, 1024, 768 and 390 px with captures kept outside the repository.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — merged 2026-10-18 as `cf52cb3`\
**Next action:** A click-through by the lead developer on a desktop GPU and a real phone (MAN-P4-003). Done in PR #24; the check on a physical phone continues as MAN-P4-007.

## 2026-10-18 — PR #23 rework before merge: UX clean-up, cinematic motion and 3D states

**Date:** 2026-10-18\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Review PR #23 critically and rework what was wrong, weak, over-built or inconsistent; find and fix the remaining UI/UX issues; make animations, transitions and states lively and cinematic with three.js and GSAP; then merge.\
**Summary:**
- **Fewer repeated actions:** the home favorites section repeated the hero's items, photos and three "Browse the menu" links, so it is gone. The menu page no longer has a "Browse the menu" button of its own, Contact drops "Browse it here" and its second Maps button, the 404 keeps one way out, and the cart page drops its extra "Continue browsing menu". Contact now has one visit section (address, hours once, directions and the sign) instead of an address card, an hours card and a sign section that repeated each other. The home visit area is a heading, the address, one Maps button and the sign. The menu's boxed notice is a one-line note, and the drawer's notice box is one line.
- **Menu:** option names joined with "+" ("Nachos+Fries+Meat") now read "Nachos + Fries + Meat" everywhere (card, order dialog, cart, checkout and the copied summary); long options are full-width rows in the dialog instead of three columns that spilled past the dialog edge. The card button reads "Add to order". Hyphenated names no longer break at the hyphen. The active category tab now follows the page from the layout (no lag), a clicked tab is current at once, and the tab bar only scrolls when the active tab is cut off.
- **Checkout:** the prepared summary lives in this tab only (sessionStorage, not localStorage, since it holds the name and phone), is dropped after 12 hours or when malformed, and is cleared when the cart changes. Copy clears the cart only when the copy worked; a failed copy says so and selects the text.
- **Design system:** the glow bus, page glow field, film-grain overlay, glow floors and green glow shadows are removed; legacy token names (`--deep-green`, `--warm-gold`, `--surface-cinema`) give way to the Night Shift names, and dead CSS is deleted. The visit sign fallback is plain type with no box.
- **Motion (ADR-015):** a GSAP motion layer gives headings a line-by-line reveal, blocks a rise and photos an unveil as they scroll in; primary calls to action lean toward the pointer; internal navigations get a title-card curtain; the drawer, order dialog, mobile menu and undo toast animate out as well as in. Nothing animates with reduced motion.
- **3D:** the empty cart (drawer, cart page and checkout) shows the shop's clear cup with ice and beans drifting; the order-summary step pours it full of matcha; the 404 shows the cup tipped over in front of a backlit "404". The add-to-cart toss runs only on the menu, draws only while it flies and bumps the real cart button; the persistent header basket is gone. The gallery ring shows only the photos without people. Scenes compile their shaders before they show, free their renderer if they fail part-way, retry a failed HDRI, and start late when they sit off screen.
- **Teammate files:** Van's cart drawer, cart page, line item, order dialog and checkout view were touched for the exit animations, the state scenes, readable option names and the summary storage and copy fixes; Shan's validation is unchanged.

**Files/modules affected:** `src/app/` (layout, globals.css, home, menu, about, gallery, contact and 404 pages), new `src/components/motion/` (`gsap.ts`, `motion-director.tsx`, `route-curtain.tsx`, `use-presence.ts`, `curtain-state.ts`), `src/components/three/` (engine, canvases, scenes, new `state-scene.tsx`, `canvas/state-canvas.tsx` and `scenes/state.ts`), menu, cart, checkout and layout components, `src/components/ui/` (`reveal.tsx`, `container.tsx`, `page-intro.tsx`, `section-heading.tsx`), `src/config/gallery.ts`, new `src/lib/menu/format-name.ts`, `src/lib/ordering/summary-storage.ts`, unit and e2e tests (TC-P3-052, TC-P4-016 to TC-P4-022 and updates to TC-P1-008, TC-P2-002, TC-P2-016, TC-P2-021, TC-P4-004, TC-P4-005, TC-P4-009), `playwright.config.ts`, `docs/decisions.md` (ADR-013 status, ADR-014, new ADR-015), `docs/system-architecture.md` (§18), `docs/software-and-apis.md`, `docs/test-cases.md` (MAN-P4-006), this entry. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (17 files / 127 tests passed), `npm run build`, `npm run test:e2e -- --workers=2` (21/21 passed), `python3 scripts/validate_phase0_docs.py` (PASS), `npm run audit` (passes; five high advisories remain in dev-only lint tooling through `eslint-config-next`). Manual review MAN-P4-006: an automated text-overflow scan of every page and all 16 order dialogs at 1440, 1024, 768 and 390 px, the drawer, cart and checkout with long option names, the mobile menu, a motion pass that scrolls every page and checks nothing stays hidden, and captures of the 404, empty cart, drawer and order-ready scenes; captures are kept outside the repository.\
**Git branch:** `feat/threejs-experience`\
**Pull request:** [#23](https://github.com/eendor/Brew-ni-Cat-Connect/pull/23) — self-reviewed and squash-merged into `main` on 2026-10-18 as `cf52cb3`\
**Next action:** A click-through by the lead developer on a real phone (MAN-P4-003). Done in PR #24 on phone profiles; the check on a physical phone continues as MAN-P4-007.

## 2026-10-18 — PR #23 follow-ups: phone checks, tap targets, duplicate photos and the lint advisory

**Date:** 2026-10-18\
**Phase:** Phase 3 — Menu and Ordering Flow (presentation layer)\
**Task:** Close what PR #23 left open: the click-through on a real GPU and on phones, the duplicate photos, the dev-only advisories, the old titles without a type prefix, and the docs that still described Phase 2.\
**Summary:**
- **Real-GPU click-through (MAN-P4-003):** after the lead developer found the build smooth by hand, a scripted run on the laptop's integrated GPU went through every page and the full order flow at 1440 and 1024 px, on an iPad Mini profile with a 2× slower CPU, and at 390 px and on a Pixel 7 profile with a 4× slower CPU. Nothing failed, the console stayed clean and no page scrolled sideways. The tablet and phones held 60 fps idle and about 35–56 fps while scrolling; at 1440 px the home and menu heroes ran at 22–31 fps, and the order-summary scene stalls once, for about a second, while its lighting and shaders are prepared. Tuning the frame budget is left for later and has a Backlog card.
- **Checkout heading:** the run found that after a checkout step renamed the page, the split heading kept the old title as its label, and a resize brought "Checkout" back. The heading is now keyed by its title, so each step gets a fresh one. TC-P4-026 failed on the PR #23 code and passes now.
- **Phones:** TC-P4-023 taps through a full order on a Pixel 7 profile, TC-P4-024 checks seven pages at 412, 390 and 360 px for sideways scrolling and 44 px tap targets, and TC-P4-025 runs the 3D layer at phone quality. They found small targets on the footer links, both breadcrumbs and the two review links in checkout; all are 44 px now, without moving the layout. Van's checkout view changed in its link classes only. A click-through on a physical phone (MAN-P4-007) is still to do.
- **Photos:** `photo_011.jpg` was a near copy of the Buldak Cheese menu photo, and `photo_082.jpg` and `photo_085.jpg` were byte-identical, unused copies of `photo_043.jpg` and `photo_055.jpg`. All three are deleted, the iced-drinks shot (`photo_012.jpg`) takes the featured slot, the home gallery intro says "drinks" instead of "food", and the gallery keeps 30 photos with no duplicates.
- **Lint advisory:** the five high advisories in dev-only lint tooling all came from one braces advisory (GHSA-vfj7-8cjw-p6xm) through `fast-glob` in `@next/eslint-plugin-next`. An npm override swaps that `fast-glob` for `tinyglobby`, which was already installed; `npm audit fix --force` would have downgraded `eslint-config-next` to 14. `npm run audit` reports 0 vulnerabilities.
- **Old titles:** the lead developer's PRs #1, #2, #7, #8, #9, #10 and #11 now have type prefixes. The seven unprefixed commits on `main` stay, since rewording them means rewriting shared history; the process exception is in `docs/code-review.md`. The stale `feat/threejs-experience` branch is deleted.
- **Spelling:** the docs, the code comments, a few names and one test title now use American spelling throughout. For example, `neighbourSign` is now `neighborSign` and `greyTexture` is `grayTexture`; nothing else changes in that code.
- **Docs:** the README and the living docs (SRS, functional requirements, architecture, standards, execution paths, testing strategy, security and privacy, emerging technologies, project overview and database design) now describe the merged Phase 3 site. The test-case header, scope and QA-P2-001 to QA-P2-004 rows match the merged phases and the Phase 2 QA report, and the software register covers the override and the stricter audit wording. The evidence registers, the code-review record and this log now cover PRs #20 to #24, including the missing PR #21 entry. Lines that called the lead developer "the owner" are reworded, the RLS notes share one neutral wording, and the captured `docs/evidence/phase-2/public-access-audit.json` is unchanged. Renier's QA plan now points to the Phase 2 QA report, Shan's Phase 2 verification register is marked closed, the Phase 2 handoff record has a merge note, and the NFR register notes which checks bear on its still-Planned targets.

**Files/modules affected:** `public/images/shop/` (three photos removed), `src/config/gallery.ts`, `src/app/page.tsx`, `src/components/ui/page-intro.tsx`, `src/components/layout/site-footer.tsx`, `src/components/three/menu-hero.tsx`, `src/components/checkout/checkout-view.tsx` (classes only), the rest of `src/components/three/`, `src/components/menu/category-glow.ts`, `src/app/globals.css`, `tests/unit/three-layer.test.tsx` and `tests/unit/home-page.test.tsx` (spelling in comments and names only), `package.json` and `package-lock.json` (override), new `tests/e2e/phone.spec.ts`, `tests/e2e/three.spec.ts` (TC-P4-025, TC-P4-026), `README.md`, `docs/test-cases.md` (TC-P4-023 to TC-P4-026, MAN-P4-003, new MAN-P4-007), `docs/software-and-apis.md`, `docs/decisions.md`, `docs/code-review.md`, `docs/srs.md`, `docs/functional-requirements.md`, `docs/non-functional-requirements.md`, `docs/system-architecture.md`, `docs/development-standards.md`, `docs/execution-paths.md`, `docs/testing-strategy.md`, `docs/security-and-privacy.md`, `docs/emerging-technologies.md`, `docs/project-overview.md`, `docs/database-design.md`, `docs/phase-2-qa-plan.md` (pointer only), `docs/evidence/phase-2-implementation.md`, `docs/evidence/phase-2-verification.md` (status only), `docs/evidence/phase-3-verification.md`, this log. No new direct dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (17 files / 127 tests passed), `npm run build`, `npm run test:e2e` (25/25 passed: 16 in `chromium`, 9 in `chromium-3d`), `npm run audit` (0 vulnerabilities), `python3 scripts/validate_phase0_docs.py` (PASS), and the five-profile click-through for MAN-P4-003, with results kept outside the repository.\
**Git branch:** `fix/pr23-follow-ups`\
**Pull request:** [#24](https://github.com/eendor/Brew-ni-Cat-Connect/pull/24) — self-reviewed and squash-merged into `main` on 2026-10-18\
**Next action:** The click-through on a physical phone (MAN-P4-007), tuning the 3D frame budget, restoring RLS on the catalog tables, and adding security headers before production.

## 2026-10-18 — Rider delivery flow: a local rider orders and delivers, and the rider services are listed

**Date:** 2026-10-18\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Match the site to how rider delivery works in Kabacan. The lead developer confirmed that a customer messages a local rider, who orders at the shop for the customer and delivers it. The site told customers to order from the shop and book a rider separately, and it listed the three rider pages as "Rider Partner 1" to "3" with no names or logos.\
**Summary:**
- **Rider flow:** checkout, the cart page, the cart drawer, the menu intro and the contact rider card now describe one flow. The customer messages a local rider with the order summary, the rider orders at Brew ni Cat and picks it up, and then delivers it to the customer's address. Delivery fee, timing and payment are agreed with the rider, and Brew ni Cat doesn't book riders or charge rider fees. "Customer-Arranged Rider" is now "Rider Delivery", and the cart and checkout page descriptions match.
- **Checkout:** with rider delivery, the details step asks for a delivery address (required) in place of the payment preference at the counter. The review shows the address and "Agreed with your rider", and the last step becomes "Order Summary for Your Rider", with the rider list in place of "Message on Facebook" and "Call or Text". The copied summary names the shop to order from and the address to deliver to, and says payment and the delivery fee are agreed with the rider. A pickup order carries no address, and summaries saved before this change still load.
- **Rider list:** a new `RiderList` component, shared by checkout and the contact page, shows each service's name and logo and links to its Facebook page. It uses three columns when its container is wide enough and one column in narrow panels and on phones. The names are the services' Facebook page titles. The logos are their public profile photos from the lead developer's files, resized to 256 × 256 px with metadata removed; the Papa's Delivery logo is recropped to its mascot, and the cover photos are not used.
- **Fixes found on the way:** the selected pickup or rider card in the cart page and checkout never looked selected. The unlayered `.surface-lift` rule sets the border, background and shadow, so it beat Tailwind's border, background and ring utilities; the selected card now gets a 2 px accent outline. If the cart changed on the last step, from the drawer or another tab, checkout showed an empty step; it now returns to the review. The review's two hints sat outside their `dd` inside the `dl`, and now sit inside it. The name and phone fields get `autocomplete` hints, long addresses wrap, and the fulfillment label no longer has a `capitalize` class that turned "Pickup at shop" into "Pickup At Shop". At 390 px the rider cards left about 120 px for text, so "Facebook page" wrapped; below 20rem they are now compact rows with 40 px logos, the checkout summary uses less padding on phones, and the contact page's three steps stack until their container is 36rem wide. On desktop the menu's 100vw category bar overhung the page by 7.5 px on each side while the scrollbar gutter took space, and the `overflow-x: clip` on `body` didn't contain it, because the browser applies body's overflow to the viewport. `main` now clips sideways overflow, and `clip` keeps the sticky bars working.
- **Teammate files:** Van's cart drawer, cart page and checkout view carry the rider copy, the outline fix and the checkout changes above, and the checkout summary's phone padding changes only below the `sm` breakpoint. In Van's `tests/e2e/foundation.spec.ts`, TC-P1-009 missed the menu overhang: it loaded an empty menu, so the category bar never rendered, and compared with `clientWidth`, which the stable scrollbar gutter makes 15 px wider than the layout in headless Chromium. It now loads one mocked category and item, also checks `/about`, and compares with the layout width; it fails without the `main` fix and passes with it. Shan's `validation.ts` gains an optional `requireAddress` setting, and the name and phone checks are unchanged. Shan's business content register has the new delivery model, a row for the rider services and a Pending row for the GCash QR.
- **GCash QR:** the owner hasn't sent it yet, so the site shows none and uses no placeholder.
- **Docs:** the README, SRS, functional requirements, execution paths, project overview, security and privacy notes, business content register, test cases (TC-P1-009, TC-P2-017, TC-P2-025 and TC-P3-055 updated; new TC-P4-027 to TC-P4-029 and MAN-P4-008), testing strategy, Phase 3 verification register, code-review record and this log describe the rider flow. TC-P3-055 now names the "Copy order summary" button.

**Files/modules affected:** `src/config/site.ts` (rider names, links and logos), new `src/components/ui/rider-list.tsx`, new `public/images/riders/` (three logos), `src/components/checkout/checkout-view.tsx`, `src/components/cart/cart-page-view.tsx` and `src/components/cart/cart-drawer.tsx` (Van's), `src/lib/ordering/validation.ts` (Shan's; address setting), `src/app/contact/page.tsx`, `src/app/menu/page.tsx`, `src/app/cart/page.tsx` and `src/app/checkout/page.tsx` (descriptions), `src/app/globals.css` (`main` overflow), `tests/e2e/foundation.spec.ts` (Van's; TC-P1-009), new `tests/unit/rider-list.test.tsx`, `tests/unit/checkout-validation.test.ts`, `tests/unit/checkout.test.tsx`, `tests/unit/cart-components.test.tsx`, `tests/unit/business-pages.test.tsx`, `tests/e2e/showcase.spec.ts`, `README.md`, `docs/srs.md`, `docs/functional-requirements.md`, `docs/execution-paths.md`, `docs/project-overview.md`, `docs/security-and-privacy.md`, `docs/business-content-register.md` (Shan's), `docs/test-cases.md`, `docs/testing-strategy.md`, `docs/evidence/phase-3-verification.md`, `docs/code-review.md`, this log. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (18 files / 130 tests passed), `npm run build`, `npm run test:e2e` (25/25 passed: 16 in `chromium`, 9 in `chromium-3d`), `npm run audit` (0 vulnerabilities), `python3 scripts/validate_phase0_docs.py` (PASS). Manual review MAN-P4-008: screenshots and layout checks at 1440, 1024, 768 and 390 px, plus 360 and 320 px and a phone profile at 320 to 430 px, of the checkout details, address error, review and summary steps with rider delivery, the cart page and the contact rider card, and a before-and-after screenshot diff of all seven routes at four widths for the `main` fix (27 of 28 captures identical; the 28th differs only by a gallery photo that was still loading); captures are kept outside the repository.\
**Git branch:** `fix/rider-ordering-flow`\
**Pull request:** [#25](https://github.com/eendor/Brew-ni-Cat-Connect/pull/25) — self-reviewed and squash-merged into `main` on 2026-10-18\
**Next action:** Icons for the Facebook and TikTok links and the contact details, the GCash QR once the owner sends it, and the click-through on a physical phone (MAN-P4-007), which now includes the rider flow.

## 2026-10-18 — Social and contact icons on the public site

**Date:** 2026-10-18\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Add clear Facebook, TikTok and contact icons beside the existing social and visit details, without changing link names or adding an icon package.\
**Summary:**
- **Icon set:** new `src/components/ui/icons.tsx` holds decorative inline SVGs: Facebook and TikTok from Simple Icons 16.33.0 (CC0) and the interface shapes from Lucide 1.51.0 (ISC, with Feather's MIT notice for the clock and navigation shapes). Icons use `currentColor` and stay hidden from screen readers; visible text or an `aria-label` names each control.
- **Placement:** the footer shows a map pin, phone, mail, Facebook, TikTok and clock beside the existing copy; the contact page, home visit facts, mobile menu (including two named round social buttons), rider cards and checkout fulfillment/contact buttons get matching marks.
- **Tests:** TC-P4-030 to TC-P4-035 cover accessible names and decorative SVGs. TC-P3-052 now waits for the menu scroll spy before scrolling. `tests/setup.ts` clears public Supabase settings so unit tests never fetch the live menu when those variables are in the shell.
- **No new dependencies:** shapes are copied as is; license notices sit in the icon file header.

**Files/modules affected:** new `src/components/ui/icons.tsx`, `src/components/layout/site-footer.tsx`, `src/components/layout/mobile-navigation.tsx`, `src/app/contact/page.tsx`, `src/app/page.tsx`, `src/components/ui/rider-list.tsx`, `src/components/checkout/checkout-view.tsx`, `tests/setup.ts`, `tests/unit/menu-catalog.test.tsx`, new `tests/unit/site-footer.test.tsx`, `tests/unit/business-pages.test.tsx`, `tests/unit/home-page.test.tsx`, `tests/unit/site-header.test.tsx`, `tests/unit/rider-list.test.tsx`, `tests/unit/checkout.test.tsx`, `docs/test-cases.md`, `docs/code-review.md`, this log. No new direct dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (19 files / 136 tests passed), `npm run build`, `npm run test:e2e` (25/25 passed: 16 in `chromium`, 9 in `chromium-3d`), `npm run audit` (0 vulnerabilities), `python3 scripts/validate_phase0_docs.py` (PASS). Six cold `npm ci` + `npm test` runs also passed, including one with Supabase settings exported in the shell.\
**Git branch:** `feat/social-icons`\
**Pull request:** [#26](https://github.com/eendor/Brew-ni-Cat-Connect/pull/26) — self-reviewed and squash-merged into `main` on 2026-10-18\
**Next action:** Lead spot-check MAN-P4-009, the GCash QR once the owner sends it, and the click-through on a physical phone (MAN-P4-007).

## 2026-10-19 — GCash QR on pickup checkout and Abellera St address

- **Shipped (PR #29):** the pickup send step shows the shop GCash QR when GCash is chosen, and the shop street is now Abellera St instead of Segundo St.
- **Review follow-up:** I added TC-P4-036 and TC-P4-037 for the QR, marked the GCash QR Confirmed in the business content register, and added the PR #29 code review entry.

**Next action:** Check the map pin against Abellera St and do the click-through on a physical phone (MAN-P4-007).

## 2026-10-19 — Motion waits for hydration

- **Fixed (PR #31):** the motion director no longer sets inline styles on elements React has not hydrated yet, which caused a hydration mismatch on the home showcase eyebrow.

**Next action:** Check the map pin against Abellera St and do the click-through on a physical phone (MAN-P4-007).

## 2026-10-20 — Every menu item in 3D, and the Contact sign fit

**Date:** 2026-10-20\
**Phase:** Phase 3 — Menu and Ordering Flow\
**Task:** Let customers see every menu item in 3D from the Menu page while the home showcase stays as it is, and fix the Contact page's 3D OPEN/CLOSED sign, which was cut off on the left.\
**Summary:**
- **Menu 3D viewer:** each card keeps its photo and, when the 3D layer is on, gets a View in 3D button. It opens one three.js viewer with drag to spin, size and flavor chips, the flavor photo or the card photo, the price and Add to order, which opens the order dialog on the same size and flavor.
- **Models:** every live menu item has a model built in code. A registry maps the item, size and flavor to a model: drinks with their own layers (vanilla matcha, dirty matcha with espresso, caramel matcha with drizzle, vanilla Oreo with a cookie base, crumbs and a flat lid), takoyaki trays by count and topping, fries by size and seasoning, noodles, nachos, combos built from their package contents, a foam take-out clamshell and a cat-face bowl of fish treats and kibble.
- **Photos:** four drink photos from the lead developer's files (Vanilla Matcha Meow, Dirty Neko, Vanilla Oreo Whisker and Caramel Matcha Tail) show in the viewer when that flavor is picked. Vanilla Oreo Whisker is also the Oreo card's photo.
- **Order dialog (Van's):** new optional `initialVariantId` and `initialFlavor` props preset the size and flavor. Only the item's own options and flavors are accepted.
- **Contact sign:** on the Contact page's narrower canvas the camera now steps back until the sign and the street fit inside it.
- **Tests:** unit cases TC-P4-038 to TC-P4-051 cover the flavor photos, the model registry, the viewer and the order dialog presets. Browser cases TC-P4-052 to TC-P4-058 cover the viewer, a tour of every item's sizes and flavors, the phone view and the Contact sign at two widths.
- **Team:** Renier's and Rizjie's Trello cards now hold small Phase 3 coding tasks that don't touch the 3D code, plus their tests. Renier has an in-cart badge on menu cards, a Rider Delivery browser test and Playwright in CI. Rizjie has a checkout step indicator, a mobile cart bar on the Menu page and phone fixes on the cart and checkout pages.

**Files/modules affected:** new `src/components/menu/menu-item-viewer.tsx`, `src/components/three/canvas/menu-viewer-canvas.tsx`, `src/components/three/menu-models.ts`, `src/components/three/scenes/menu-models-3d.ts` and `src/components/three/scenes/menu-viewer.ts`; `src/components/menu/menu-item-card.tsx`, `src/components/menu/menu-item-order-dialog.tsx` (Van's), `src/components/three/scenes/models.ts`, `src/components/three/scenes/visit.ts`, `src/config/menu-item-images.ts` and `src/app/globals.css`; four photos in `public/images/menu/items/`; new `tests/unit/menu-models.test.ts` and `tests/unit/menu-viewer.test.tsx`, plus `tests/unit/menu-item-images.test.ts` and `tests/e2e/three.spec.ts`; the docs listed in the pull request.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (21 files / 152 tests passed), `npm run build` (9 of 9 static pages), `npm run test:e2e` (32/32 passed: 16 in `chromium`, 16 in `chromium-3d`), `npm run audit` (0 vulnerabilities), `python3 scripts/validate_phase0_docs.py` (PASS). TC-P4-058 was also run on a build with the old Contact camera, where it failed at the left edge.\
**Git branch:** `feat/menu-3d-models`\
**Pull request:** [#32](https://github.com/eendor/Brew-ni-Cat-Connect/pull/32) — self-reviewed and squash-merged into `main` on 2026-10-20\
**Next action:** FR-018 (edit a cart line's size or flavor), the teammates' Phase 3 pull requests, and the click-through on a physical phone (MAN-P4-007), which now includes the 3D viewer.

## 2026-10-23 — Course named in the README and the repository description

- **Changed:** the README, the project overview and the GitHub repository description now say that Brew ni Cat Connect is our class project for ICT05a Applications Development & Emerging Technologies.

**Next action:** Shared order types for Phase 4 (`src/lib/orders/types.ts`), then the online order tables, the order API and Place order.

## 2026-10-23 — Shared online order types

**Date:** 2026-10-23\
**Phase:** Phase 4 — Cloud backend and customer accounts\
**Task:** Put the shared online order types on `main` before Tue Oct 27, so Shan's order page and Renier's live tracking use the same shapes as the order API.\
**Summary:**
- **Statuses:** pending, accepted, rejected, preparing, ready, completed and cancelled, with `isOrderStatus` and `isFinalOrderStatus`. The exact names and the cancellation rules stay `TODO: Confirm with Brew ni Cat owner.`
- **Order shapes:** `OnlineOrder` (what the shop sees), `OrderView` (what the customer sees, with no phone number or internal ids), `OrderItemSnapshot` (a cart line copied when the order is placed) and `OrderStatusHistoryEntry` (who changed the status, when, from what, to what, and a correlation id).
- **Place order:** `PlaceOrderRequest` sends the picks, the customer details, an idempotency key and the subtotal the customer saw, never a price to charge. `PlaceOrderResult` is either the reference and tracking token or a typed failure: `invalid-request`, `invalid-details`, `empty-cart`, `line-unavailable`, `price-changed` or `server-error`.
- **Formats:** an order reference is `BNC-` plus six characters without 0, 1, I, L and O (`isOrderReference`). A tracking token is 43 base64url characters (`isTrackingToken`). The payment preference is Cash or GCash (`isPaymentPreference`).
- **Tests:** TC-P4-059 to TC-P4-063.

**Files/modules affected:** new `src/lib/orders/types.ts` and `tests/unit/order-types.test.ts`; `docs/test-cases.md`, `docs/functional-requirements.md`, `docs/development-standards.md`, `docs/code-review.md` and this log. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (22 files / 165 tests passed), `npm run build`, `npm run audit` (passed; 0 production vulnerabilities), `python3 -I scripts/validate_phase0_docs.py` (PASS). The browser tests run in CI.\
**Git branch:** `feat/p4-order-types`\
**Pull request:** [#38](https://github.com/eendor/Brew-ni-Cat-Connect/pull/38), self-reviewed and squash-merged into `main` on 2026-10-23\
**Next action:** The online order tables, `POST /api/orders` and Place order on the pickup checkout (`feat/p4-online-orders`).

## 2026-10-23 — No owner biography on the About page

- **Changed:** the owner confirmed that the About page needs no owner biography or longer About story, so `/about` keeps the factual points from the client brief. The README no longer lists the biography under Current Limitations, and the About story question is closed in `docs/srs.md` and `docs/functional-requirements.md`. TC-P2-015 and TC-P2-023 still check that no invented owner biography appears.

**Next action:** The online order tables, `POST /api/orders` and Place order on the pickup checkout (`feat/p4-online-orders`).

## 2026-10-24 — Online orders, the order API and Place order

**Date:** 2026-10-24\
**Phase:** Phase 4 — Cloud backend and customer accounts\
**Task:** Card "Rodnee — Online order tables, order API and Place order": the order tables, `POST /api/orders` and Place order on the pickup checkout, due Fri Oct 30.\
**Summary:**
- **RLS restored:** `20261024011051_restore_rls.sql` turns RLS back on for every public table. Guests read only the menu and the POS releases, and the POS staff account keeps full access through `private.is_staff()`. It was applied to the live database on 2026-10-24, with the staff account marked in the same request.
- **Tables:** `20261024064600_customer_tables.sql` adds the online order tables (orders, lines, status history and the private token hashes) and the Phase 5 customer tables (profiles, favorites, loyalty transactions and data requests), all with RLS. Online orders are kept apart from the POS `orders` sales (ADR-016).
- **Order functions:** `20261024064700_online_order_functions.sql` adds `place_online_order()` and `get_online_order()`. The first prices each line from the live menu with the cart's rules, checks the details, and saves the order, its lines and its first `pending` history row together. The second opens an order only with its token, to its customer, or to staff. Each status change broadcasts `status-changed` on the order's Realtime topic. Both migrations are live.
- **Order API:** `POST /api/orders` reads at most 32 KB of JSON, checks the token, calls `place_online_order()` with the publishable key, and maps each answer to a status code and a customer-safe message.
- **Place order:** on the pickup checkout, Place order sends the order and opens `/orders/BNC-…#token=…`. A retry reuses the key and token, a changed price shows the new subtotal, and an unavailable line is named. Rider delivery keeps the copied summary.
- **Switch:** Place order is on only when `NEXT_PUBLIC_ONLINE_ORDERING=enabled`. It stays off on the live site until the POS order screen and the order page are on `main`.
- **Live site:** <https://brew-ni-cat-connect.vercel.app> deploys from GitHub on Vercel, and the Supabase Auth URLs point to it.
- **Tests:** TC-P4-064 to TC-P4-123. The database tests run the migrations on PGlite with a copy of the live POS tables. TC-P4-023 and TC-P4-026 now take rider delivery, because pickup places the order online when the switch is on.

**Files/modules affected:** `supabase/migrations/` and `supabase/rollbacks/` (three each); `src/app/api/orders/route.ts`; `src/lib/orders/` (`order-link.ts`, `online-ordering.ts`, `place-order.ts`, `place-order-server.ts`, `order-client.ts`, `types.ts`); `src/lib/ordering/validation.ts`; `src/components/checkout/checkout-view.tsx`; `tests/database/`, six new unit test files, `tests/unit/checkout.test.tsx` and three browser specs; `vitest.config.ts`, `tests/setup.ts`, `.env.example` and the CI workflow; `docs/database-design.md` §8, `docs/decisions.md` ADR-016, `docs/software-and-apis.md` §12, `docs/security-and-privacy.md` §18, `docs/test-cases.md` §14, `docs/functional-requirements.md` §16, `docs/development-standards.md`, `docs/code-review.md`, the RLS notes in `README.md`, `docs/srs.md` and `docs/project-overview.md`, and this log. New dev dependency: `@electric-sql/pglite` 0.5.8 (Apache-2.0).\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (31 files / 234 tests passed), `npm run build`, `npm run audit` (passed), `python3 -I scripts/validate_phase0_docs.py` (PASS), Playwright `chromium` 18/18 on a build with the switch on, and `chromium-3d` TC-P4-026.\
**Git branch:** `feat/p4-online-orders`\
**Pull request:** [#41](https://github.com/eendor/Brew-ni-Cat-Connect/pull/41), self-reviewed and squash-merged into `main` on 2026-10-24\
**Next action:** Shan's order page reads `get_online_order()`. The POS order screen needs its own status-change function. `POST /api/orders` needs a rate limit before Place order is turned on.


## 2026-10-24 — New shop hours: closed every Saturday

**Date:** 2026-10-24\
**Phase:** Phase 4 — Cloud backend and customer accounts (content update)\
**Task:** Lead Developer shared the shop's posted "We are open" schedule: Monday to Friday 11 AM to 9 PM, Sunday 1 PM to 9 PM, closed Saturday. It replaces the hours from 2026-10-11 (11 AM to 10 PM, Monday to Saturday, closed every Sunday).\
**Summary:**
- **Config:** `siteConfig.operations` has `closedDays: "Saturday"` and the new `hoursNotice`, which the checkout and the footer show with no other change.
- **Pages:** the Home hours fact, About, Contact, the cart's pickup note and the mobile menu show the new hours.
- **3D sign:** `visitFacts` gains `otherDay` and `otherHours` for Sunday. The open side shows the weekday hours, "Monday to Friday" and "Sunday 1 PM – 9 PM". The closed side shows "Every Saturday" and both opening times. A line that is too long shrinks to fit the board. The plain sign without 3D shows Sunday's hours too.
- **Tests:** TC-P2-002, TC-P2-016 and TC-P4-008 check the new hours, and the Home and Contact tests check that the 10 PM and Sunday-closed text is gone. The browser tests TC-P2-025 and TC-P4-004 look for "Closed every Saturday".

**Files/modules affected:** `src/config/site.ts`, `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/components/cart/cart-page-view.tsx`, `src/components/layout/mobile-navigation.tsx`, `src/components/three/visit-facts.ts`, `src/components/three/visit-stage.tsx` and `src/components/three/scenes/visit.ts`; `tests/unit/home-page.test.tsx`, `tests/unit/business-pages.test.tsx`, `tests/unit/three-layer.test.tsx`, `tests/e2e/showcase.spec.ts` and `tests/e2e/three.spec.ts`; `docs/business-content-register.md`, `docs/functional-requirements.md` (FR-003), `docs/srs.md`, `docs/test-cases.md`, `README.md` and this log. No new dependencies.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (31 files / 234 tests passed), `npm run build`, `npm run audit` (passed), `python3 -I scripts/validate_phase0_docs.py` (PASS). The browser tests run in CI.\
**Git branch:** `fix/shop-hours-saturday-closed`\
**Pull request:** [#43](https://github.com/eendor/Brew-ni-Cat-Connect/pull/43), self-reviewed and squash-merged into `main` on 2026-10-24\
**Next action:** Speed up the home intro on low-end Android phones.

## 2026-10-25 — A lighter home intro on phones

**Date:** 2026-10-25\
**Phase:** Phase 4 — Cloud backend and customer accounts (performance fix)\
**Task:** The home intro loaded slowly, lagged and stuttered on low-end Android phones (the lead developer's and a teammate's). Make it fast there without changing the desktop look.\
**Summary:**
- **Phone tier:** `getQuality()` gains `lite`, on for phones without `?quality=high`. On it the home showcase renders straight to the canvas at a pixel ratio of 1 (0.75 if frames stay slow), with no post effects and no shadow maps; the soft contact shadow under each item stays. Clear plastic and ice become an additive gloss instead of refracting the scene, and clearcoat and sheen are off, so the shaders are smaller and each frame draws the scene once.
- **Smaller assets:** the phone tier makes the cup, takoyaki and floater maps at half size, with the condensation drops scaled so the cup looks the same, and draws the titles at half size. Every phone scene lights with `studio_small_09_512.hdr`, a half-size copy of the HDRI made with `scripts/downsample_hdr.py` (413 KB instead of 1.6 MB).
- **Every device:** the showcase downloads the HDRI and the cup sticker while it builds the models, lets the page respond between its heavy steps, uploads every texture while the shaders compile, and starts the intro after two drawn frames, so a slow first frame no longer skips part of it.
- **Desktop look:** unchanged. The generated maps at desktop sizes are byte-for-byte the same as before.
- **Tests:** TC-P4-124 to TC-P4-128.

**Files/modules affected:** `src/components/three/engine/runtime.ts`, `renderer.ts` and `textures.ts`; `src/components/three/scenes/showcase.ts` and `models.ts`; `src/components/three/canvas/showcase-canvas.tsx`; `public/three/hdri/studio_small_09_512.hdr`; `scripts/downsample_hdr.py`; `tests/unit/three-phone-tier.test.ts` and `tests/e2e/three.spec.ts`; `docs/decisions.md` ADR-014, `docs/software-and-apis.md` §11, `docs/system-architecture.md` §18, `docs/emerging-technologies.md`, `docs/testing-strategy.md` §23, `docs/test-cases.md` §15 and this log. No new package dependencies; the one-off `scripts/downsample_hdr.py` needs NumPy, and nothing in the build or CI runs it.\
**Testing performed:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (32 files / 238 tests passed), `npm run build`, `npm run audit` (passed), `python3 -I scripts/validate_phase0_docs.py` (PASS), and Playwright `chromium-3d` (17/17 passed) on a production build. The `chromium` browser tests run in CI.\
**Git branch:** `perf/home-intro-low-end-phones`\
**Pull request:** [#44](https://github.com/eendor/Brew-ni-Cat-Connect/pull/44), self-reviewed and squash-merged into `main` on 2026-10-25\
**Next action:** The physical-phone check, MAN-P4-007 (due Mon Nov 2), should include the home intro on a low-end Android phone.

## 2026-10-25 — Order confirmation page (FR-026)

**Date:** 2026-10-25\
**Phase:** Phase 4 — Cloud backend and customer accounts\
**Task:** Show customers their order after Place order (FR-026).\
**Summary:** `/orders/[reference]` loads one order with `get_online_order()` and the tracking token from the link, then shows its reference, status, items, subtotal, payment, notes, and next steps. It has loading, not-found, and error states, and a wrong reference or token looks the same as a missing order. While Place order is off on the live site, `npm run dev` shows a sample order at `/orders/BNC-234567` (development only). Renier's live tracker (week 2) goes under the header.\
**Files/modules affected:** `src/app/orders/[reference]/page.tsx`, `src/lib/orders/fetch-order.ts`, `tests/unit/fetch-order.test.ts`, `tests/unit/order-confirmation-page.test.tsx`, `docs/test-cases.md`, `docs/functional-requirements.md`, `docs/development-log.md`.\
**Testing performed:** `npm run lint` pass, `npm run typecheck` pass, `npm run test` 246/246 passed (TC-P4-129 to TC-P4-136), `npm run format:check` pass, `python3 scripts/validate_phase0_docs.py` PASS, `npm run build` pass.\
**Git branch:** `feat/p4-order-confirmation`\
**Pull request:** [#45](https://github.com/eendor/Brew-ni-Cat-Connect/pull/45)\
**Next action:** Review by Van or Rodnee, then merge. Renier adds the live tracker in week 2.

## 2026-10-25 — Checkout step timer stops when the checkout closes

**Date:** 2026-10-25\
**Phase:** Phase 4 — Cloud backend and customer accounts\
**Task:** Fix the failed CI run on `main` after PR #42.\
**Summary:** Each checkout step change starts a 50 ms timer that scrolls the step into view and focuses its heading. Nothing cancelled it when the checkout closed, so when the last Place order test (TC-P4-102) ended within those 50 ms, the timer ran after the test environment was gone. Vitest then failed the run with `ReferenceError: window is not defined`, even though all 252 tests passed. The checkout now cancels the timer when it closes and when a newer step change replaces it. Customers see no change.\
**Files/modules affected:** `src/components/checkout/checkout-view.tsx`, `tests/unit/checkout.test.tsx` (TC-P4-137), `docs/test-cases.md` and this log.\
**Testing performed:** TC-P4-137 failed before the fix and passes after it. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (35 files / 253 tests passed), `python3 -I scripts/validate_phase0_docs.py` (PASS) and `npm run build` pass.\
**Git branch:** `fix/checkout-step-timer`\
**Pull request:** [#46](https://github.com/eendor/Brew-ni-Cat-Connect/pull/46), self-reviewed and squash-merged into `main` on 2026-10-25\
**Next action:** None.

## 2026-10-26 — Requirements for the owner area, live prices, and mini-games

- **Phase:** 9 (planned)
- **Task:** Turn the instructor's check feedback into requirements.
- **Summary:** Added FR-082–FR-091 (owner area, menu and price editing, shop settings, no hardcoded prices, audit, loyalty prizes, mini-games, ads only in the mini-game area, prize redemption) and ADR-017. The docs validator now expects FR-001–FR-091. The menu already reads live prices from the POS tables; the home showcase "From ₱" prices and the takeout box fee are the remaining hardcoded prices.
- **Files:** `docs/functional-requirements.md`, `docs/decisions.md`, `docs/srs.md`, `docs/system-architecture.md`, `docs/execution-paths.md`, `docs/evidence/phase-0-verification.md`, `scripts/validate_phase0_docs.py`.
- **Testing:** Docs validation PASS, Prettier clean.
- **Branch / PR:** `docs/owner-dashboard-and-games`.
- **Next action:** Confirm prize rules and ad account with the owner, then plan the Phase 9 cards.

## 2026-10-26 — Owner changes belong in the POS, and all site content is live

- **Phase:** 9 (planned)
- **Task:** Correct the owner-area requirements after the instructor's feedback and the POS check.
- **Summary:** The POS web app (Menu and Inventory tabs) and the Android POS already edit the shared catalog, so FR-082, FR-083, FR-085 and FR-087 now say the owner works in the POS and Connect adds no owner area. FR-085 and FR-086 now cover all website content, not only prices. ADR-017 is rewritten to match. The site content table and its POS screen are POS work.
- **Files:** `docs/functional-requirements.md`, `docs/decisions.md`, `docs/srs.md`, `docs/system-architecture.md`, `docs/execution-paths.md`.
- **Testing:** Docs validation PASS, Prettier clean.
- **Branch / PR:** `docs/owner-side-in-pos`.
- **Next action:** Ask the owner about prizes and the ad account, then plan the Phase 9 cards.

## 2026-10-26 — Menu cards float their product in 3D

- **Phase:** 3 (menu, follow-up to the Menu 3D viewer)
- **Task:** Remove the View in 3D button and show each product floating in 3D on its card, including products with no hand-built model.
- **Summary:** One shared WebGL stage (`scenes/menu-stage.ts`) draws every card's model and copies the picture into a 2D canvas on each card, with a slow bob and turn and drag to spin. Unknown items get a generic cup or take-out box by category (`menuModelSpec`). The photo stays only as the fallback. The old viewer dialog, its canvas and scene, and its CSS were removed. ADR-018 records the design.
- **Files:** `src/components/three/scenes/menu-stage.ts`, `src/components/three/canvas/menu-stage-canvas.tsx`, `src/components/menu/menu-item-media.tsx`, `src/components/menu/menu-item-card.tsx`, `src/components/menu/menu-catalog.tsx`, `src/components/three/menu-models.ts`, `src/app/globals.css`, `tests/unit/menu-stage-card.test.tsx` (renamed from `menu-viewer.test.tsx`), `tests/e2e/three.spec.ts`, `docs/test-cases.md`, `docs/decisions.md`.
- **Testing:** TC-P4-138 – TC-P4-144 added; TC-P4-052 – TC-P4-057 reworked for cards; TC-P4-044 – TC-P4-050 marked superseded, not deleted.
- **Branch / PR:** `feat/p3-live-3d-menu-cards`.
- **Next action:** Phone frame-time check in MAN-P4-007.

## 2026-10-26 — Home showcase runs on its own reel

- **Phase:** 3 (home showcase follow-up)
- **Task:** Keep the home showcase separate from the page scroll and remove the stutter on its transitions.
- **Summary:** The showcase was a 520vh pinned section whose items changed with the page scroll. It is now one screen tall; the reel advances on its own every few seconds while on screen, on a swipe, or from the item buttons, and the page scrolls normally past it. The glow colour behind the hero now updates a few times a second instead of every frame, which removes a full-section restyle during each transition.
- **Files:** `src/components/three/home-showcase.tsx`, `src/components/three/canvas/showcase-canvas.tsx`, `src/app/globals.css`, `tests/e2e/three.spec.ts` (TC-P4-145), `docs/test-cases.md`.
- **Testing:** TC-P4-145 added; TC-P4-001, TC-P4-005 and TC-P4-128 still pass.
- **Branch / PR:** `fix/p3-showcase-own-reel`.
- **Next action:** Check smoothness on a real phone in MAN-P4-007.

## 2026-10-26 — Gallery: 18 new shop photos

- **Phase:** 3 (content)
- **Task:** Add the new Facebook photos to the gallery.
- **Summary:** 18 of the 23 supplied photos were added as `photo_160`–`photo_177`. Metadata was removed and each has generic alt text. Five were left out (a screenshot-style photo and four crowded group shots with tiny faces) so the gallery stays at a full last row: 48 photos, divisible by 6.
- **Files:** `public/images/shop/photo_160.jpg`–`photo_177.jpg`, `src/config/gallery.ts`, `tests/unit/gallery-config.test.ts` (TC-P4-146), `tests/unit/business-pages.test.tsx`, `docs/test-cases.md`, `docs/security-and-privacy.md`.
- **Testing:** TC-P4-146 added; the gallery page test limit raised to 60.
- **Branch / PR:** `feat/p3-gallery-facebook-photos`.
- **Next action:** None. The photos were already public on the shop's Facebook page and the owner confirmed the customers are fine with it.


## 2026-10-26 — Page-transition curtain restored to the original look

- **Phase:** 3 (motion follow-up)
- **Task:** Undo the compositor-driven curtain from the previous entry's change.
- **Summary:** The slide-based curtain looked worse than the original wipe, and the stutter that was reported is only in the text lines rising after a page loads. The curtain is back to its original GSAP clip-path wipe; the rising text is handled separately.
- **Files:** `src/components/motion/route-curtain.tsx`, `src/app/globals.css`.
- **Testing:** TC-P4-022 and TC-P4-026 cover the curtain.
- **Branch / PR:** `revert/p3-curtain`.
- **Next action:** Smooth only the text-line rise.

- **Testing:** TC-P4-022 and TC-P4-026 still pass.
- **Branch / PR:** `fix/p3-smooth-page-transition`.
- **Next action:** Check smoothness on a real phone in MAN-P4-007.

## 2026-10-26 — 3D moves into the Add to order dialog

- **Phase:** 3 (menu follow-up)
- **Task:** Remove the pop-in 3D on Menu cards; show products floating in 3D only in the Add to order dialog.
- **Summary:** Menu cards are plain photos again. The dialog floats the item's built model, or a generic cup or box. Photo cut-outs were tried and dropped after review: the background removal left artifacts. ADR-018 is superseded by ADR-019. The earlier card-stage PR (#49) was closed because #50 had already carried that work to main. The Home showcase now advances every 3.5 s instead of 5.5 s.
- **Files:** `src/components/menu/menu-order-preview.tsx`, `menu-item-media.tsx`, `menu-item-card.tsx`, `menu-item-order-dialog.tsx`, `src/components/three/menu-models.ts`, `scenes/menu-models-3d.ts`, `scenes/menu-stage.ts`, `src/config/menu-item-images.ts`, `src/app/globals.css`, tests TC-P4-003, 052–056, 138–144, 148.
- **Testing:** Vitest 8/8 in the reworked file; TC-P4-052 and TC-P4-144 pass on software GL.
- **Branch / PR:** `feat/p3-3d-in-order-dialog`.
- **Next action:** Phone check of the dialog in MAN-P4-007.


## 2026-10-26 — Smoother rising text on page entrances

- **Phase:** 3 (motion follow-up)
- **Task:** The heading lines and blocks that rise into place stuttered on page entrances.
- **Summary:** Each rising line now has its own compositor layer (`will-change: transform`, `backface-visibility: hidden`) and the GSAP tweens force 3D transforms, so the rise no longer repaints the heading every frame. Timings, the curtain and reduced-motion behavior are unchanged.
- **Files:** `src/components/motion/motion-director.tsx`, `src/app/globals.css`.
- **Testing:** TC-P4-022 and TC-P4-026 on a fresh build; checked by eye on a phone in MAN-P4-007.
- **Branch / PR:** `fix/p3-text-rise-smooth`.
- **Next action:** Ask the team to confirm the rise feels smooth in MAN-P4-007.


## 2026-10-27 — Customer authentication (FR-031, FR-032, FR-034 Implemented; FR-033, FR-035, FR-036 In development)

- **Phase:** 4 (customer authentication)
- **Task:** Implement customer authentication: auth client, auth-context with useAuth, sign-up, sign-in, forgot-password, reset-password pages, desktop and mobile navigation auth triggers.
- **Summary:** Added `src/lib/supabase/auth-client.ts` as a browser Supabase client with session persistence (`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`) without altering `public-client.ts`. Created `src/context/auth-context.tsx` with `useAuth()` exposing `user`, `isLoading`, `isPasswordRecovery`, `signUp`, `signIn`, `signOut`, `resetPassword`, and `updatePassword`. On page reload, valid sessions are preserved and expired sessions clear to guest state preserving public browsing (FR-036). Created `/account/sign-up`, `/account/sign-in`, `/account/forgot-password`, and `/account/reset-password` in the checkout form design token style. Sign-up prevents account enumeration (FR-031, FR-032) and prompts email verification (FR-035). Sign-in prioritizes unconfirmed account detection over invalid credentials (FR-032) and handles already signed-in users. Password reset page is protected behind the provider's `PASSWORD_RECOVERY` event (FR-034). Account navigation uses an accessible disclosure with a loading placeholder to avoid flash. Redirect URLs are dynamically built from `window.location.origin`.
- **Files:** `src/lib/supabase/auth-client.ts`, `src/context/auth-context.tsx`, `src/app/layout.tsx`, `src/app/account/sign-up/page.tsx`, `src/app/account/sign-in/page.tsx`, `src/app/account/forgot-password/page.tsx`, `src/app/account/reset-password/page.tsx`, `src/components/account/sign-up-view.tsx`, `src/components/account/sign-in-view.tsx`, `src/components/account/forgot-password-view.tsx`, `src/components/account/reset-password-view.tsx`, `src/components/layout/account-nav.tsx`, `src/components/layout/site-header.tsx`, `src/components/layout/mobile-navigation.tsx`, tests, documentation.
- **Testing:** Unit tests in `tests/unit/auth-supabase-client.test.ts` and `tests/unit/auth-context.test.tsx`, form component tests in `tests/unit/account-forms.test.tsx`, header auth tests in `tests/unit/site-header.test.tsx`, and Playwright Chromium tests in `tests/e2e/auth.spec.ts` (TC-P4-149 to TC-P4-173, with TC-P4-173 screenshot capture guarded by `CAPTURE_EVIDENCE=1`).
- **Branch / PR:** `feat/p4-customer-auth` / PR #58.
- **Next action:** Re-review and merge by Rodnee; independent QA by Renier.


## 2026-10-27 — Faster Playwright install in CI

- **Phase:** 4 (CI upkeep)
- **Task:** The `Install Playwright Chromium` step in the `Browser tests (chromium)` job was slow. It took 20 to 28 seconds on a normal run, and 8 min 40 s on 2026-10-26.
- **Summary:** The run log showed the time went to `--with-deps`: apt downloaded fonts and libraries from the Ubuntu mirror at 50 kB/s for 8 min 15 s, while Chromium itself downloaded in about 4 s. The step now runs `npx playwright install --only-shell chromium`, since CI runs headless, then starts the browser once and runs `npx playwright install-deps chromium` only if that fails. The runner image already has Chromium's libraries, and no test compares screenshots, so the extra fonts aren't needed. Caching the browser was not used: it would save only the few seconds of the download, and Playwright's CI guide advises against it.
- **Files:** `.github/workflows/ci.yml`, `docs/testing-strategy.md`, `docs/development-standards.md`.
- **Testing:** The `Browser tests (chromium)` job on PR #59 runs the full `chromium` project with the new install step. Its step timings are compared with the runs before it in the PR.
- **Branch / PR:** `perf/ci-playwright-install`, PR #59.
- **Next action:** None. If a future runner image drops a library, the step installs the system packages by itself.


## 2026-10-28 — The cart empties once the order summary is made

- **Phase:** 4 (ordering fix from QA)
- **Task:** Renier's QA of the live site on a phone found that after the order summary was made, the cart still held the order, Proceed to Checkout jumped straight back to the summary, and a new item joined the old order.
- **Summary:** The cart was kept on purpose until the summary was copied (2026-10-17 entry). Now the summary holds the order, so making it empties the cart (ADR-020). Edit order on the summary step puts the items and details back, and checkout rechecks their prices against the menu. While a summary is saved, the empty drawer and cart page show View your order summary. An item added after that starts a new order and drops the old summary. The summary's shape check moved into `src/lib/ordering/prepared-summary.ts`, so the checkout, drawer and cart page read the saved summary the same way.
- **Files:** `src/lib/ordering/prepared-summary.ts`, `src/components/checkout/checkout-view.tsx`, `src/context/cart-context.tsx`, `src/components/cart/cart-drawer.tsx`, `src/components/cart/cart-page-view.tsx`, `tests/unit/checkout.test.tsx`, `tests/unit/cart-components.test.tsx`, `tests/e2e/phone.spec.ts`, `docs/evidence/phase-4/screenshots/`, documentation.
- **Testing:** TC-P4-174 to TC-P4-179 added and TC-P4-023 updated; TC-P4-016 and TC-P4-017 superseded. Vitest 284/284 in 39 files; Playwright `chromium` 19/20 (TC-P4-173 skipped: it captures screenshots only with `CAPTURE_EVIDENCE=1`) on a production build with the switch on.
- **Branch / PR:** `fix/p4-cart-after-summary`, PR #61.
- **Next action:** Renier checks the flow again on the live site after the deploy.

## 2026-10-28 — Staff change online order statuses, and a completed order becomes a POS sale

- **Phase:** 6 (POS online orders, my week 2 card)
- **Task:** Give the POS app a safe way to accept, reject, prepare, finish and cancel online orders, and make each completed order count as one POS sale (FR-027, FR-028, FR-071, FR-075, FR-076, FR-079, FR-080).
- **Summary:** I documented how the POS app syncs, signs in and publishes releases (system architecture §19). Migration `20261028153552_online_order_status.sql` adds `set_online_order_status()`, which allows only the planned steps, refuses a change from a status the order has left, needs a reason to reject and answers a retry with the same correlation id without changing anything. Every change, done or refused, goes to `private.staff_audit_log`. Completing an order adds one POS sale to `orders` and `order_items` in the same transaction, and the tablet that completes it deducts the stock (ADR-021). `online_orders` joins the Realtime publication so the tablets hear about new orders. The undo keeps the orders and sales. The older undo tests now stop at their own migration.
- **Files:** `supabase/migrations/20261028153552_online_order_status.sql`, `supabase/rollbacks/20261028153552_online_order_status.sql`, `tests/database/online-order-status.test.ts`, `tests/database/support/baseline.sql`, `tests/database/support/database.ts`, `tests/database/customer-tables.test.ts`, `tests/database/online-orders.test.ts`, documentation.
- **Testing:** TC-P6-180 to TC-P6-190 added. Vitest 300/300 in 40 files.
- **Branch / PR:** `feat/p6-order-status`, PR #62.
- **Next action:** The POS order screen (Android) uses the function. The migration goes live only with the team's OK, following database design §8.7.
