# Code Review and Inspection Record

**Document version:** 0.1 Draft\
**Last updated:** 2026-08-24

This document separates developer self-inspection from independent teammate review. A pull request or automated check is not recorded as peer approval until a named teammate has actually reviewed it.

## Reusable inspection checklist

- [ ] The change is traceable to the current phase and relevant requirement IDs.
- [ ] Names and module boundaries are clear and consistent.
- [ ] Components and functions avoid unnecessary duplication.
- [ ] TypeScript remains strict and no unjustified suppression was added.
- [ ] Inputs and failure paths are handled at the appropriate boundary.
- [ ] Authentication and authorization are reviewed when the module uses them.
- [ ] Secrets, credentials, personal data, and production exports are absent.
- [ ] Semantic HTML, accessible names, keyboard behavior, focus, and contrast are reviewed for customer-facing UI.
- [ ] Responsive behavior is checked at representative mobile, tablet, and desktop widths.
- [ ] Tests exercise real behavior and document actual—not assumed—results.
- [ ] Dependency, performance, and security implications are understood.
- [ ] Documentation, screenshots, known limitations, and rollback considerations are current.

## Phase 1 — Project Foundation

**Module:** Next.js application foundation, shared shell, navigation, placeholder routes, test tooling, and CI\
**Author:** Rodnee\
**Reviewer:** Rodnee — developer pre-PR self-inspection only\
**Date:** 2026-08-23

### Findings

1. The application scope stays within Phase 1: no backend, ordering, authentication, loyalty, Messenger, Android, or POS integration was introduced.
2. Shared layout components use semantic landmarks, visible focus styling, accessible mobile-menu state, Escape handling, and focus restoration.
3. The responsive overflow test measures the document rather than hiding overflow in global CSS.
4. Owner-dependent content uses the exact `TODO: Confirm with Brew ni Cat owner.` marker; no real business details or customer data were added.
5. Unit/component and Playwright tests cover the implemented shell behaviors; future business logic remains outside the current test surface.
6. The dependency lockfile, value-free environment example, ignore rules, audit output, and source-pattern inspection show no observed committed credential or high/critical dependency finding.

### Recommendations

- Renier should complete the independent manual QA and Pull Request review checklist.
- Phase 2 should begin only after the Phase 1 review findings are resolved and the Pull Request is approved and merged through the team workflow.

### Changes made during self-inspection

- Removed global horizontal-overflow clipping so responsive checks can detect real layout overflow.
- Added the five-width Playwright matrix covering 320, 375, 768, 1024, and 1440 CSS pixels.
- Kept Playwright as a required local validation while the initial CI job runs the lighter lint, type-check, unit/component-test, and production-build gate.

**Status:** Developer self-inspection complete; independent teammate review pending.

## Independent Phase 1 Review Closure

**Module:** Phase 1 — Project Foundation\
**Author:** Rodnee\
**Reviewer:** Renier Apal\
**Date:** Review date is not recorded in this document

**Findings:** Independent manual QA and peer review passed with no blocking defect. P1-UX-001 (duplicate desktop Menu/View menu actions) and P1-ENV-001 (Windows LF/CRLF Prettier warnings with `core.autocrlf=true`) were accepted as non-blocking Phase 2 follow-ups.\
**Recommendations:** Resolve the two accepted findings in Phase 2 and preserve the review evidence.\
**Changes made:** No Phase 1 history was rewritten. Pull Request #1 was approved and merged; Phase 2 resolves the findings on its own branch.\
**Status:** Approved and merged as `11c546d` through [Pull Request #1](https://github.com/eendor/Brew-ni-Cat-Connect/pull/1).

## Phase 2 — Public Showcase and Read-only Menu

**Module:** Home, Menu, About, Gallery, Contact, shared shell, catalog adapter, local media, tests, and documentation\
**Author:** Rodnee\
**Reviewer:** Rodnee — developer pre-PR self-inspection only\
**Date:** 2026-08-24

### Developer self-inspection findings

1. The branch stays inside the Phase 2 browse/showcase boundary: no cart, checkout, auth, customer/order write, payment, rider booking, Messenger, Android, POS change, migration, or RLS mutation exists.
2. Public business facts match the confirmed brief; the About copy avoids owner biography/unsupported claims, and variable hours are not presented as a fixed schedule.
3. Header navigation contains one Menu destination and a separate Visit us/Contact action, resolving P1-UX-001.
4. `.gitattributes` and Prettier define LF text, Windows command-script CRLF, and binary media exclusions, resolving the repository policy portion of P1-ENV-001.
5. Supabase calls are centralized, explicit-field, `SELECT`-only reads. Components consume typed mapped models and injectable loaders.
6. Only public URL/publishable configuration enters the browser client; missing config and provider errors are customer-safe. The current publishable runtime returns the live 6-category/16-item catalog, and no privileged fallback exists.
7. Current prices are never transcribed from posters. POS-hardcoded add-ons are not represented as live data.
8. The Gallery uses 19 of 139 approved local files and generic alt text without identifying/inferencing customers.
9. Phase 1 regression tests remain; the final follow-up run passed 21/21 unit/component tests and 13/13 browser tests, including all five retained Phase 1 browser regressions.

### Known limitation / blocker

The initial production public probes returned HTTP 200 with zero `categories` and `items` rows; that **BEFORE** result is retained historically. After the owner/developer manually disabled RLS, publishable GET requests returned 6 categories and 16 items and `/menu` rendered them at all required widths. The application still uses the publishable identity only and made no RLS or business-data change.

This functional pass exposes a more serious current blocker: public access depends on grants rather than least-privilege RLS, and HEAD-only/no-body probes found unrelated inventory, recipe, expense, order, order-item, and release tables publicly reachable. Restore RLS and test explicit catalog-only anonymous `SELECT` policies before production. Public writes were not tested.

### Independent Phase 2 handoff

**Reviewer:** Pending — Renier\
**Date:** Pending\
**Findings:** Pending real teammate QA and code review.\
**Recommendations:** Review the checklist and cases in `docs/evidence/phase-2-implementation.md` and `docs/test-cases.md`; separately verify business facts, public access behavior, mobile/keyboard/media experience, typing, environment separation, and scope.\
**Changes made:** Not applicable until review findings exist.\
**Status:** Developer self-inspection, local automation, branch push, open [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), and the initial/follow-up hosted workflows are complete. Renier's independent review remains pending. Do not merge or mark Done before that review.

## 2026-09-18 — Phase 3 ordering core (PR #7)

**Module:** `src/lib/ordering/`, `src/types/ordering.ts`\
**Date:** 2026-09-18

**Findings:** Public add-to-cart accepts only item, variant, flavor, and quantity; prices are resolved from the catalog in integer centavos with overflow guards. Covered by `TC-P3-001`–`TC-P3-047`.\
**Status:** Merged as `5e53fc6`.

## 2026-10-14 — Playwright baseline fix (PR #15)

**Module:** Contact page, showcase E2E\
**Date:** 2026-10-14

**Findings:** Contact values wrap anywhere so 320px has no overflow (TC-P1-009); TC-P2-021 checks the header home link after the hero redesign. No security impact.\
**Status:** Merged as `8be9e6a`.

## 2026-10-15 — Phase 3 cart drawer, cart page, and checkout (PR #14)

**Module:** Cart context, cart drawer/page, checkout, order dialog\
**Date:** 2026-10-15

**Findings:** Review feedback resolved before merge: dialogs moved into a portal so card transforms do not clip them, focus trap with focus restore, `fieldset`/`legend`/`aria-pressed` on options, cart prices revalidated against the catalog at checkout to resist `localStorage` tampering, simulated order IDs replaced with an honest send-to-shop summary, Philippine mobile number validation, and no 320px overflow on the step indicator.\
**Status:** Merged as `e36b5a3`.

## 2026-10-15 — Menu product photos and refined scroll and page motion (PR #16)

**Module:** Menu item images, site-wide motion layer, overlays\
**Author:** Lead developer\
**Reviewer:** Self-reviewed and approved by the lead developer\
**Date:** 2026-10-15

**Findings:**

1. Scope stays presentational: no order writes, auth, payments, schema, or RLS change.
2. Every photo maps to exactly one item, and lookup no longer uses prefix matching, which caused the duplicated noodle photo.
3. Motion is disabled under `prefers-reduced-motion`; hero progress is not written in that mode.
4. SSR-safe: `ScrollMotion` renders nothing and only writes `<html>` attributes after hydration; `template.tsx` is a server component.
5. Performance: one passive, rAF-throttled scroll listener; redundant `--hero-progress` writes skipped once past the first viewport; animations use opacity/transform only.
6. Accessibility: focus traps unchanged; skeletons are `aria-hidden`; active tab exposed with `aria-current`; focus-visible outlines preserved.

**Known limitations:** drawer/dialog close without an exit animation; footer and section reveals depend on JavaScript, matching the existing `Reveal` behavior.\
**Status:** Approved and merged on 2026-10-15 as `cb28583`.


## 2026-10-15 — Menu card hover and photo sizes (PR #17)

**Module:** `globals.css`, menu item card\
**Date:** 2026-10-15

**Findings:** Hover lift restored after the reveal rule overrode it; `sizes` matches the one/two-column grid. CSS and image hints only.\
**Status:** Self-reviewed by the lead developer; merged as `8f62c6c`.

## 2026-10-15 — Menu layout, order dialog, and header polish (PR #18)

**Module:** Menu catalog and cards, order dialog, site header, Home favorites\
**Date:** 2026-10-15

**Findings:** Presentation only; no data, ordering, or pricing logic changed. Removes the PR #17 hover workaround along with the menu stagger. Header glow fix checked by computed opacity because headless Chromium does not show it.\
**Status:** Self-reviewed by the lead developer; merged as `a887c12`.

## 2026-10-16 — Phase 3 checkout validation refactor and test coverage

**Module:** `src/lib/ordering/validation.ts`, `tests/unit/checkout-validation.test.ts`\
**Author:** Shan Besto\
**Reviewer:** Lead developer\
**Date:** 2026-10-16

**Findings:**
1. Extracted `validateDetails` and Philippine mobile regex from UI components into pure exportable helper functions in `src/lib/ordering/validation.ts`.
2. Phone validation correctly handles formats (`0912 345 6789`, `09123456789`, `+63 912 345 6789`, `+639123456789`) and rejects invalid inputs (non-numeric strings, short/long lengths, invalid prefixes).
3. Added dedicated unit test coverage in `tests/unit/checkout-validation.test.ts` covering valid inputs, missing required fields, and invalid phone formats.
4. UI labels and validation messages align with `src/config/site.ts` without introducing new store policies or hours.
5. Quality checks (`npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`) passed with zero errors.

6. Review rounds: the first round flagged a Prettier CI failure and helpers that the checkout form did not use yet; the second flagged a lint failure from an unused import and a leftover local validation function in `checkout-view.tsx`. The third commit wired the shared helper in, removed the inline regex and messages, and CI went green on `5cd2b91`.

**Status:** Approved by the lead developer and merged as `902fb6b` (PR #20). Post-merge gates on `main` passed: Vitest 115/115 in 15 files, Playwright 13/13, build, lint, typecheck, format, docs validator.

## 2026-10-17 — Direct-to-main documentation commits (process exception)

**Module:** Project documentation only\
**Date:** 2026-10-17

`CONTRIBUTING.md` asks for a focused branch and pull request for each documentation set. Two docs-only commits went straight to `main` without one:

| Commit | Date | Change | How it happened |
| --- | --- | --- | --- |
| `8ae282a` | 2026-10-16 | Synced the development log, test cases, architecture, decisions, and content docs with PRs #1–#18 (9 files) | Pushed directly by request to skip a PR for the docs sync |
| `ad5f0a5` | 2026-10-17 | Synced docs with PR #20 (5 files) | Pushed without prior approval |

**Findings:** Neither commit touches application code, tests, configuration, or data. Both were reviewed after the fact against the merged PRs they describe. CI failed once on `ad5f0a5` because of the flaky TC-P3-052 test, unrelated to the docs; a re-run passed and the test fix is in PR #21.\
**Status:** Accepted as documented exceptions by the lead developer. Docs syncs go through a `docs/` branch and pull request from now on.
