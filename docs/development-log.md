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
**Pull request:** [#1 — Phase 1: Initialize Brew ni Cat Connect web foundation](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1), open and not merged.\
**Next action:** Renier performs Phase 1 manual QA and Pull Request review; findings are resolved before merge.

## 2026-08-24 — Phase 2 public showcase implementation (before live-menu follow-up)

**Date:** 2026-08-24\
**Phase:** Phase 2 — Public Showcase Website\
**Task:** Replace the foundation placeholders with Brew ni Cat's real public presence and add a typed read-only current-menu integration without beginning ordering or mutating production.\
**Summary:** The `feat/showcase-website` branch implements Home, Menu, About, Gallery, and Contact experiences, real approved branding/content/media, a browser-runtime Supabase catalog adapter, customer-safe dynamic states, Phase 2 tests, and cross-platform line-ending rules. At this **BEFORE** observation, the anonymous Supabase policy returned zero catalog rows, so live public record display/verification was blocked; the code did not bypass the policy. Local developer validation and the initial hosted push/pull-request workflows for `67a81db` passed. The branch was pushed and Pull Request #2 opened; Renier QA/review remained pending.\
**Changes:**

- replaced Phase 1 customer-facing placeholders with business-focused routes and page metadata;
- configured the official logo and a curated 19-image approved Gallery, with eight Home-preview images and generic privacy-respecting alt text;
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
**Pull request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), open and unmerged.\
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
**Pull request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), open and unmerged.\
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