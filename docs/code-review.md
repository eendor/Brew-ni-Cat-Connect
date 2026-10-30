# Code Review and Inspection Record

**Document version:** 0.1 Draft\
**Last updated:** 2026-10-18

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

The initial production public probes returned HTTP 200 with zero `categories` and `items` rows; that **BEFORE** result is retained historically. After RLS was manually disabled, publishable GET requests returned 6 categories and 16 items and `/menu` rendered them at all required widths. The application still uses the publishable identity only and made no RLS or business-data change.

This functional pass exposes a more serious current blocker: public access depends on grants rather than least-privilege RLS, and HEAD-only/no-body probes found unrelated inventory, recipe, expense, order, order-item, and release tables publicly reachable. Restore RLS and test explicit catalog-only anonymous `SELECT` policies before production. Public writes were not tested.

### Independent Phase 2 handoff

**Reviewer:** Pending — Renier\
**Date:** Pending\
**Findings:** Pending real teammate QA and code review.\
**Recommendations:** Review the checklist and cases in `docs/evidence/phase-2-implementation.md` and `docs/test-cases.md`; separately verify business facts, public access behavior, mobile/keyboard/media experience, typing, environment separation, and scope.\
**Changes made:** Not applicable until review findings exist.\
**Status:** Developer self-inspection, local automation, branch push, open [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), and the initial/follow-up hosted workflows are complete. Renier's independent review remains pending. Do not merge or mark Done before that review.

### Independent Phase 2 QA closure

**Reviewer:** Renier Apal (QA)\
**Date:** 2026-09-16

**Findings:** Renier's independent QA, which included a security and code review pass, ended with "PASS FOR PHASE 2 MERGE WITH KNOWN PRE-PRODUCTION SECURITY FOLLOW-UP". The follow-up is the RLS-disabled catalog access described above. The plan is in [`phase-2-qa-plan.md`](phase-2-qa-plan.md) and the results are in [`phase-2-qa-report.md`](phase-2-qa-report.md), recorded in PR #6 (merged as `5007a30`).\
**Status:** Pull Request #2 merged on 2026-09-16 as `ae002f1` after that QA. The RLS blocker stays open until catalog-only policies are restored. The handoff above is kept as written at the time.

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

## 2026-10-16 — Phase 3 checkout validation refactor and test coverage (PR #20)

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

## 2026-10-17 — Category tab highlight test (PR #21)

**Module:** `tests/unit/menu-catalog.test.tsx`\
**Date:** 2026-10-17

**Findings:** Test-only fix for TC-P3-052, which failed once on `main` and passed on re-run. The fake `IntersectionObserver` now records each callback with the elements it observes, so the test only notifies the menu observer and not a `Reveal` one. The file passed 7/7 three times in a row, Vitest passed 115/115 and CI passed.\
**Status:** Self-reviewed by the lead developer; merged as `3b1f7ed`.

## 2026-10-17 — Direct-to-main documentation commits (process exception)

**Module:** Project documentation only\
**Date:** 2026-10-17

`CONTRIBUTING.md` asks for a focused branch and pull request for each documentation set. Two docs-only commits went straight to `main` without one:

| Commit | Date | Change | How it happened |
| --- | --- | --- | --- |
| `8ae282a` | 2026-10-16 | Synced the development log, test cases, architecture, decisions, and content docs with PRs #1–#18 (9 files) | Pushed directly by request to skip a PR for the docs sync |
| `ad5f0a5` | 2026-10-17 | Synced docs with PR #20 (5 files) | Pushed without prior approval |

**Findings:** Neither commit touches application code, tests, configuration, or data. Both were reviewed after the fact against the merged PRs they describe. CI failed once on `ad5f0a5` because of the flaky TC-P3-052 test, unrelated to the docs; a re-run passed and the test fix is in PR #21.\
**Status:** Accepted as documented exceptions by the lead developer. Docs syncs go through a `docs/` branch and pull request from now on. Recorded in PR #22, merged as `80c1839`.

## 2026-10-18 — Three.js experience, motion layer and dark redesign (PR #23)

**Module:** `src/components/three/`, `src/components/motion/`, `src/app/globals.css`, every page, and Van's cart, order dialog and checkout views\
**Author:** Lead developer\
**Reviewer:** Self-reviewed by the lead developer\
**Date:** 2026-10-18

**Findings:**

1. Scope stays presentational: no new data access, credentials or runtime network calls. The HDRI and textures are bundled locally, and no 3D file fetches catalog or customer data.
2. The category tab spy measures the layout once a frame, so the highlight follows the page and a clicked tab is current at once.
3. Copy clears the cart only after a successful clipboard write. The prepared summary, which holds the name and phone, is kept in `sessionStorage`, is shape-checked, expires after 12 hours and is dropped when the cart changes.
4. Scenes free their renderer when a start fails, retry a failed HDRI, compile their shaders before they show and pause off screen. No full-screen WebGL canvas stays running on every page.
5. Accessibility: every 3D and state scene is `aria-hidden` beside real text, overlays keep their focus traps and are inert while they animate out, the copy result is announced in a live region, and reduced motion gets the static site with no canvas or animation.
6. Design rules: menu cards are plain and uniform with no lit stage, glow floor or neon type; there are no scroll hints; the sign is not boxed; the gallery ring only shows photos without people.
7. Repeated menu links and sections are removed, long option names wrap, and nothing spills out of the order dialogs at 1440, 1024, 768 and 390 px.

**Known limitations:** The real-GPU click-through (MAN-P4-003), plus the duplicate photos and dev-only lint advisories already on `main`, were left for PR #24.\
**Status:** Self-reviewed by the lead developer, since GitHub does not allow approving your own pull request. Vitest passed 127/127 in 17 files and Playwright 21/21 (14 + 7) locally, and CI passed. Squash-merged on 2026-10-18 as `cf52cb3`.

## 2026-10-18 — Commit and pull request titles without a type prefix (process exception)

**Module:** Git history and pull request titles only\
**Date:** 2026-10-18

`CONTRIBUTING.md` and `docs/development-standards.md` §13 ask for imperative, Conventional Commit-style subjects such as `feat: …`, `fix: …` and `docs: …`. Merge commits aside, seven commits on `main` do not follow it:

| Commit | Date | Author | Subject | Pull request |
| --- | --- | --- | --- | --- |
| `b666e91` | 2026-08-26 | Van | `docs:add Phase 2 project management readiness` (no space after the colon) | #4 |
| `00d42c1` | 2026-09-05 | Rizjie | `Add phase 2 showcase presentation doc` | #5 |
| `3cf14fd` | 2026-09-05 | Rizjie | `Update Phase 2 : mark resolved observations, add future suggestions and confirmation items` | #5 |
| `70b12a9` | 2026-09-24 | Lead developer | `Add 12 new Facebook photos to the curated gallery` | #9 |
| `f0fa38e` | 2026-09-24 | Lead developer | `Polish gallery and cinematic showcase UI (#10)` | #10 |
| `937d6f5` | 2026-10-05 | Lead developer | `Polish homepage visit logistics, customer favorites, and cat lounge etiquette (#11)` | #11 |
| `5f33fc7` | 2026-10-15 | Van | `Fix: addressed feedback from code review` | #14 |

**Findings:** The commits are already on `main` and in every teammate's clone. Rewording them would mean rewriting shared history and force-pushing `main`, which §13 rules out without team coordination, and every clone would have to be reset; the subjects are a labeling slip and the code they carry was reviewed. Pull request titles can change without touching history, so the lead developer's seven unprefixed titles were retitled on 2026-10-18:

| Pull request | Old title | New title |
| --- | --- | --- |
| #1 | Phase 1: Initialize Brew ni Cat Connect web foundation | feat: initialize the Brew ni Cat Connect web foundation (Phase 1) |
| #2 | Phase 2: Build Brew ni Cat public showcase website | feat: build the Brew ni Cat public showcase website (Phase 2) |
| #7 | Phase 3: Add ordering core and cart domain | feat: add the ordering core and cart domain (Phase 3) |
| #8 (closed, not merged) | Add 12 new Facebook photos to the curated gallery | feat: add 12 new Facebook photos to the curated gallery |
| #9 | Add 12 new Facebook photos to the curated gallery | feat: add 12 new Facebook photos to the curated gallery |
| #10 | Polish gallery layout after new Facebook photos | feat: polish the gallery layout after the new Facebook photos |
| #11 | Polish homepage visit logistics, customer favorites, and cat lounge etiquette | feat: polish homepage visit logistics, customer favorites, and cat lounge etiquette |

Teammates' commits, and Renier's PR #6 title (`QA: Phase 2 independent QA results`), stay as their authors wrote them. The stale `feat/threejs-experience` branch, whose tree matched `main` after the PR #23 squash merge, was deleted locally and on GitHub.\
**Status:** Accepted as documented exceptions by the lead developer. New commits and pull request titles carry a type prefix, the reviewer checks the title before merging, and a squash merge reuses the prefixed title as the commit subject.

## 2026-10-18 — PR #23 follow-ups (PR #24)

**Module:** Shop photos and gallery config, footer, breadcrumbs, the split page heading, checkout review links (classes only), the npm override, Playwright phone and 3D checks, and the docs\
**Author:** Lead developer\
**Reviewer:** Self-reviewed by the lead developer\
**Date:** 2026-10-18

**Findings:**

1. MAN-P4-003 passed. A scripted click-through on the integrated GPU covered every page and the full order flow at 1440 and 1024 px, on an iPad Mini profile and on two phone profiles, with no failures, no console errors and no sideways scrolling. The tablet and phones held 60 fps idle and about 35–56 fps while scrolling, and the 1440 px heroes ran at 22–31 fps. Frame-budget tuning has a Backlog card.
2. After a checkout step renamed the page, the split heading kept the previous title as its label. Keying the heading by its title fixes it; TC-P4-026 failed on the PR #23 code and passes now.
3. TC-P4-024 found tap targets under 44 px on the footer links, both breadcrumbs and the two checkout review links. They now reach 44 px without moving the layout, and Van's checkout view changed in its link classes only.
4. Three duplicate shop photos are removed (`photo_011.jpg`, `photo_082.jpg` and `photo_085.jpg`), and the gallery keeps 30 photos with no duplicates.
5. An npm override swaps `fast-glob` in `@next/eslint-plugin-next` for `tinyglobby`, which clears the braces advisory without the downgrade that `npm audit fix --force` proposed. `npm run audit` reports 0 vulnerabilities.
6. No runtime dependency, data access or credential handling changed.

**Known limitations:** The click-through on a physical phone (MAN-P4-007) is still to do. The seven unprefixed commit subjects stay in history, as the process exception above (recorded in this pull request) explains.\
**Status:** Self-reviewed by the lead developer. Locally, Vitest passed 127/127 in 17 files and Playwright 25/25 (16 + 9), and the build, the audit and the docs validator passed. Squash-merged on 2026-10-18 after CI passed.

## 2026-10-18 — Rider delivery flow (PR #25)

**Module:** Checkout view, cart page and drawer copy, checkout validation (address setting), the new rider list, the contact rider card, site config, rider logos, the global `main` style, unit and e2e tests (including the TC-P1-009 overflow test), and the docs\
**Author:** Lead developer\
**Reviewer:** Self-reviewed by the lead developer\
**Date:** 2026-10-18

**Findings:**

1. The site described the rider flow wrongly: it told customers to order from the shop and book a rider separately. The lead developer confirmed that a local rider orders at the shop for the customer and delivers it, and every rider message now says so, with no fee, ETA or free-delivery promise (TC-P2-017 checks the contact page for them).
2. Rider delivery needs an address. It is required only with rider delivery (TC-P4-027, TC-P4-028), left out of pickup summaries, and kept in the browser like the name and phone number; nothing is sent to a server. Summaries saved before this change have no address and still load.
3. The selected fulfillment card in Van's cart page and checkout never looked selected: `.surface-lift` is unlayered, so its border, background and shadow beat Tailwind's utilities. The selected card now uses an outline, which `.surface-lift` doesn't set, and MAN-P4-008 confirms it shows.
4. If the cart changed on the last step, checkout rendered an empty step, because the step stayed on "send" after the stale summary was dropped. It now falls back to the review.
5. The review's hints were `span` elements directly inside the `dl` groups, which HTML doesn't allow there; they now sit inside the `dd`.
6. The rider links are named "{rider name} Facebook page". A space between the two spans keeps the words from running together in the accessible name (TC-P4-029), and the logos are decorative (`alt=""`) because the name sits next to them. The Playwright check for the shop's own "Facebook page" link now matches the name exactly, since the rider links contain the same words.
7. The logos are the services' public profile photos, resized to 256 × 256 px with metadata removed. Their cover photos are not used, and listing a rider is not an endorsement or partnership.
8. At 390 px the rider cards left about 120 px for text, so "Facebook page" wrapped. The rider list now sizes itself to its container: compact rows with 40 px logos below 20rem, larger rows from 20rem and three columns from 42rem. Van's checkout summary uses less padding on phones (`p-5` instead of `p-8` on the card, and `p-4` instead of `p-5` or `p-6` on the boxes inside it; unchanged from the `sm` breakpoint), and the contact page's three steps stack until their container is 36rem wide. MAN-P4-008 found every label on one line down to 320 px.
9. On desktop the menu's category bar overhung the page by 7.5 px on each side: the bar is 100vw wide, and the desktop scrollbar gutter takes part of that width. The `overflow-x: clip` on `body` didn't contain it, because the browser applies body's overflow to the viewport instead of to body. `main` now clips sideways overflow. Unlike `hidden`, `clip` doesn't make a scroll container, so the sticky bars keep working, and the order dialog, mobile navigation and cart drawer render outside `main`. TC-P1-009 in Van's `tests/e2e/foundation.spec.ts` had missed the overhang: it loaded an empty menu, so the bar never rendered, and it compared with `clientWidth`, which the stable gutter makes 15 px wider than the layout in headless Chromium. It now loads one mocked category and item, also checks `/about`, and compares with the layout width. It fails on the build without the fix (at 375 px, `/menu` measured 368 px of content in a 360 px layout) and passes with it.
10. No runtime dependency, data access or credential handling changed.

**Known limitations:** The GCash QR is still pending from the owner. The rider list can't show whether a rider is available. The click-through on a physical phone (MAN-P4-007) is still to do and now includes the rider flow.\
**Status:** Self-reviewed by the lead developer. Locally, Vitest passed 130/130 in 18 files and Playwright 25/25 (16 + 9), and the build, the audit and the docs validator passed. Squash-merged on 2026-10-18 after CI passed.

## 2026-10-18 — Social and contact icons (PR #26)

**Module:** Inline icon set, footer, contact page, home visit facts, mobile navigation, rider list, checkout fulfillment and contact buttons, unit tests and the Vitest setup\
**Author:** Lead developer\
**Reviewer:** Self-reviewed by the lead developer\
**Date:** 2026-10-18

**Findings:**

1. Facebook and TikTok marks (Simple Icons 16.33.0, CC0) and the interface shapes (Lucide 1.51.0, ISC; clock and navigation also carry Feather's MIT notice) are copied into `src/components/ui/icons.tsx`. No npm icon package was added. Every icon is decorative (`aria-hidden`, `focusable="false"`) and uses `currentColor`.
2. The footer, contact page, home visit strip, mobile menu, rider cards and checkout now show the icons beside the same link and label text. Icon-only social buttons in the mobile menu are named with `aria-label`. Accessible names of existing links are unchanged (TC-P4-030 to TC-P4-035).
3. TC-P3-052 could lose its first scroll event when the scroll spy's effect ran after the test resumed on a cold or busy machine. The test now waits for `window.addEventListener("scroll", …, { passive: true })` before scrolling.
4. Unit tests that load checkout without a menu loader were hitting the live catalog when `NEXT_PUBLIC_SUPABASE_*` was exported in the shell, which dropped the test cart's items. `tests/setup.ts` now deletes those two public settings so unit tests stay offline, matching CI.
5. No runtime dependency, data access or credential handling changed.

**Known limitations:** MAN-P4-009 (narrow-width icon layout) is left for a quick lead spot-check after merge. The GCash QR and the physical-phone click-through (MAN-P4-007) remain open. **Update (2026-10-30):** the GCash QR shipped in PR #29, MAN-P4-007 passed in PR #60, and MAN-P4-009 was measured on 2026-10-30; the result is in `docs/test-cases.md`.\
**Status:** Self-reviewed by the lead developer. Locally, Vitest passed 136/136 in 19 files and Playwright 25/25 (16 + 9), and the build, the audit and the docs validator passed. Squash-merged on 2026-10-18 after CI passed.

## 2026-10-19 — GCash QR on pickup checkout and Abellera St address (PR #29)

**Module:** Checkout send step, `public/images/payment/gcash-qr.svg`, site config, address copy across pages, tests and docs\
**Author:** Rodnee Glen Martin\
**Reviewer:** Rodnee Glen Martin (self-review)\
**Date:** 2026-10-19

**Findings:**

1. The pickup send step shows the shop QR only when the customer picks GCash. The image has a clear accessible name and a caption saying to pay once the shop confirms the total.
2. The QR is a static SVG in `public/`. No runtime dependency, data access or credential handling changed.
3. The street changed from Segundo St to Abellera St in `siteConfig` and in every hard-coded copy, test and doc (15 files).
4. PR #29 merged without a test for the QR or doc updates. I added TC-P4-036 and TC-P4-037 and updated the business content register, functional requirements, test cases and development log in this follow-up.
5. PR #29 was merged without labels; I added `enhancement`, `documentation` and `phase-3`.

**Known limitations:** The map pin coordinates were not checked against Abellera St. The physical-phone click-through (MAN-P4-007) remains open.\
**Status:** Self-reviewed. Vitest passed 138/138 in 19 files; the build, the audit and the docs validator passed. CI passed on PR #29 before the squash merge.

## 2026-10-19 — Motion waits for hydration (PR #31)

**Module:** `src/components/motion/motion-director.tsx`\
**Author:** Rodnee Glen Martin\
**Reviewer:** Rodnee Glen Martin (self-review)\
**Date:** 2026-10-19

**Findings:**

1. The dev overlay reported a hydration mismatch on the home eyebrow (`data-rise`): GSAP wrote its starting inline styles before React had hydrated that part of the page, so React found a `style` attribute it did not render.
2. The director now checks that every animated element is hydrated before it sets anything. Normally that is true on the first check, so motion still starts before paint. If not, it checks again each frame for up to 2.5 s, then starts anyway. The CSS hold keeps the elements hidden meanwhile, and its 3 s failsafe is unchanged.
3. Hydration is detected by React's internal fiber key on each DOM node. That is not a public API, but if it ever changes the director only waits the 2.5 s limit and then works as before.
4. No runtime dependency, data access or credential handling changed.

**Known limitations:** No automated test covers hydration timing. It was not checked in the browser.\
**Status:** Self-reviewed. Vitest passed 138/138 in 19 files; the build, the audit and the docs validator passed.

## 2026-10-20 — Menu 3D viewer for every item and the Contact sign fit (PR #32)

**Module:** `src/components/menu/menu-item-viewer.tsx`, `src/components/three/menu-models.ts`, `src/components/three/scenes/menu-models-3d.ts`, `src/components/three/scenes/menu-viewer.ts`, `src/components/menu/menu-item-order-dialog.tsx`, `src/components/three/scenes/visit.ts`\

_Update (ADR-018): the viewer dialog described here was replaced by live 3D cards on a shared stage; the review points about the registry, disposal and fallbacks now apply to `menu-stage.ts` and `menu-item-media.tsx`._
**Author:** Rodnee Glen Martin\
**Reviewer:** Rodnee Glen Martin (self-review)\
**Date:** 2026-10-20

**Findings:**

1. Every menu card keeps its photo. When the 3D layer is on, a card with a model gets a View in 3D button that opens one three.js viewer dialog with drag to spin (with inertia and an idle turntable), size and flavor chips, the flavor photo or the card photo, the price and Add to order. The model for an item, size and flavor comes from one registry in `menu-models.ts`. It has no three.js import, so a card can check it without loading WebGL. The builders in `menu-models-3d.ts` cover cups with their drink layers, takoyaki, fries, noodles, nachos, combos built from their package contents, a foam take-out clamshell with a back hinge, and a cat-face bowl of fish treats and kibble. The home showcase is unchanged.
2. The button appears only after hydration, with WebGL 2 and motion allowed, and only for items with a model. Sold-out items can be viewed but not ordered: Add to order is disabled. If the model cannot load, the stage keeps the photo.
3. Add to order opens the order dialog on the viewer's pick. The dialog gained `initialVariantId` and `initialFlavor`, and it only takes a preset that names one of the item's own options or flavors. Anything else falls back to the first size and no flavor (TC-P4-051).
4. The browser tour found a bug in my first version. Sizes priced per flavor (Takoyaki) opened on the first flavor in the size's price list, which arrives sorted by name, instead of the first flavor on the menu. `defaultFlavor` now follows the menu's flavor order (TC-P4-043, TC-P4-047).
5. The canvas sets `data-model` to the shown model's key once that model is on screen, so the browser tours wait for the exact model of each pick instead of a timer.
6. The Contact sign was cut off on the left. On the Contact page's 7:6 canvas, the camera at z = 15 showed 4.50 units each side of the sign, but the sign and its swing reach about 4.75. The camera now steps back until 5 units fit (`fitDistance`), to about z = 16.6 on that canvas; canvases wider than about 1.3:1 keep z = 15. TC-P4-058 checks both edges at 1280 and 960 px. It failed on the old camera (3.0% of the left edge strip changed at 1280 px) and passes with the fix (0% at both edges and both widths).
7. The four new drink photos (Vanilla Matcha Meow, Dirty Neko, Vanilla Oreo Whisker and Caramel Matcha Tail) are 1200 × 1200 JPEGs with no EXIF or XMP block. Vanilla Oreo Whisker is also the Oreo card's photo, since that card had none.
8. No new dependency: the viewer uses three 0.186.1 and gsap 3.15.0, which the project already has. It fetches nothing, and the photos are local.
9. The browser pixel checks decode screenshots in Node (`inflateSync`) instead of in the page, because software WebGL leaves the page too little time for the decode.

**Known limitations:** The drag check proves the drag through the canvas's grab state. The pixel check after it only proves that the scene keeps drawing, because the model also turns on its own and, on a slow GPU, the quality governor drops effects and redraws the whole frame. The viewer was not checked by hand or on a physical phone (MAN-P4-007 is still to do). The `chromium-3d` project runs only locally.\
**Status:** Self-reviewed. Vitest passed 152/152 in 21 files and Playwright 32/32 (16 in `chromium`, 16 in `chromium-3d`); the build (9 of 9 static pages), lint, type checking, the audit and the docs validator passed.

## 2026-10-23 — Shared online order types (PR #38)

**Module:** `src/lib/orders/types.ts`\
**Author:** Rodnee Glen Martin\
**Reviewer:** Rodnee Glen Martin (self-review)\
**Date:** 2026-10-23

**Findings:**

1. The seven statuses come from `docs/execution-paths.md` §4.3, as an `as const` list with a literal union and no `enum`, as the development standards ask. The final statuses (rejected, completed and cancelled) are the end states of the state diagram. Transition rules are not part of this pull request; they come with the status updates.
2. No type carries a price from the browser. `PlaceOrderRequest` sends the picks (`CartItemSelection`), the customer details, an idempotency key and the subtotal the customer saw. The server only compares that subtotal and answers `price-changed`, as `docs/execution-paths.md` §4.2 asks.
3. `OrderView`, what a customer sees, has no phone number, customer id or order id, because a guest can forward the order link.
4. References use 31 characters without 0, 1, I, L and O, so a reference read out at the counter is not misheard; 31 to the power of 6 gives about 887 million references. A tracking token is 32 random bytes (256 bits) in base64url. Both checks match the whole string, so a leading space or a trailing newline fails.
5. `OrderItemSnapshot` has the same fields as a cart line without its `key`, so the API can copy priced cart lines into the order.
6. Rules the owner has not confirmed stay marked `TODO: Confirm with Brew ni Cat owner.`: the status names and the cancellation rules.

**Known limitations:** Types only; nothing is saved yet. The tables, the guest read function and the API come in the next pull request and must match these types.\
**Status:** Self-reviewed. Vitest passed 165/165 in 22 files; lint, type checking, the build, the audit and the docs validator passed. CI runs the browser tests.

## 2026-10-24 — Online orders, the order API and Place order (PR #41)

**Module:** `supabase/migrations/`, `src/app/api/orders/route.ts`, `src/lib/orders/` and the pickup checkout\
**Author:** Rodnee Glen Martin\
**Reviewer:** Rodnee Glen Martin (self-review)\
**Date:** 2026-10-24

**Findings:**

1. The browser sends only the picks and the subtotal it saw. `place_online_order()` prices every line from the live `items` rows with the cart's rules, and TC-P4-084 checks that SQL and the cart agree on 250 random menus.
2. The order, its lines, the token hash and the first `pending` history row are saved in one function call. `on conflict (idempotency_key) do nothing` makes a retry return the first order, and a reused key with another token is refused.
3. The new tables have RLS on and no write policies, so nobody writes orders directly, staff included. Guests read an order only through `get_online_order()` with its token. Only the token's SHA-256 hash is stored, and the token travels in the link's `#` fragment, which browsers never send to a server.
4. The route uses the publishable-key client with no session. There is no secret or service-role key in the app, and the logs hold only the event, a correlation id and an error code.
5. The route reads at most 32 KB of JSON, six levels deep, and refuses text Postgres can't store before it reaches the database. The database checks every field again.
6. `private.is_staff()` reads the role from `app_metadata`, which users can't change. The POS staff account was marked inside the same SQL request that turned RLS on, so the POS never lost access, and its account id is not stored in the repository.
7. Each status change broadcasts once on the order's random Realtime topic. A failed broadcast only raises a warning, so the status change is still saved.
8. Place order is on only when `NEXT_PUBLIC_ONLINE_ORDERING=enabled`. When it is off, pickup keeps the copied summary and the API answers 503. Van's checkout step bar is unchanged.

**Known limitations:** `POST /api/orders` has no rate limit yet; it needs one before Place order is turned on for the public. If an answer is lost and the customer then edits the cart, the next try can create a second order. Status changes come with the POS order screen, which needs its own database function because the tables are closed. The order page `/orders/[reference]` is Shan's card. Order retention stays `TODO: Confirm with Brew ni Cat owner.`\
**Status:** Self-reviewed. Vitest passed 234/234 in 31 files, and Playwright `chromium` passed 18/18 with the switch on; `chromium-3d` TC-P4-026 passed. Lint, type checking, the build, the audit and the docs validator passed.
