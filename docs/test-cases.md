# Test Cases

**Project:** Brew ni Cat Connect
**Specification version:** 0.1 Draft
**Test record version:** Phase 2 implementation draft
**Date:** 2026-08-24
**Status:** Phase 1 independently approved/merged; Phase 2 automated validation passed and independent QA is pending

## 1. Scope and Status Rules

This living record preserves the Phase 1 foundation evidence and specifies the Phase 2 public showcase/read-only catalog cases. It does not claim coverage for ordering, authentication, loyalty, Messenger, Android, POS synchronization, or database mutations.

Statuses follow `docs/testing-strategy.md`:

- **Passed:** the recorded execution matched the expected result.
- **Failed:** the recorded execution completed but did not match the expected result.
- **Not Run:** the case is specified but has no execution evidence.
- **Blocked:** the execution could not complete and has a recorded blocker.
- **Deferred:** the approved scope is scheduled for a later phase.

Requirement references identify only the behavior exercised by each case; one passing assertion never marks an entire requirement or phase Tested.

## 2. Automated Phase 1 Cases

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P1-001 | FR-001, FR-004 | Header | Render brand and desktop navigation | JSDOM test environment | Render `SiteHeader` | Brand home link and Home, Menu, About, Gallery, and Contact links are available by accessible role/name | Brand home link and all five named navigation links were found; assertions passed | Passed | `tests/unit/site-header.test.tsx`; `docs/evidence/phase-1-verification.md` §4 |
| TC-P1-002 | FR-001, FR-004 | Homepage | Render primary heading and menu CTA | JSDOM test environment | Render home page | Level-one Brew ni Cat Connect heading and View menu link to `/menu` are present | Heading and accessible CTA link with `/menu` target were found; assertions passed | Passed | `tests/unit/home-page.test.tsx`; `docs/evidence/phase-1-verification.md` §4 |
| TC-P1-003 | FR-004, NFR-030 | Mobile navigation | Open menu and close it by selecting a link | JSDOM test environment | Activate Open navigation, then select Menu | `aria-expanded` changes from false to true; mobile navigation becomes available; selecting Menu closes it | State changed as expected; Menu linked to `/menu`; navigation closed and trigger returned to collapsed state | Passed | `tests/unit/site-header.test.tsx`; `docs/evidence/phase-1-verification.md` §4 |
| TC-P1-004 | FR-004, NFR-030 | Mobile navigation | Close menu with Escape and restore trigger focus | JSDOM test environment | Open menu and press Escape | Menu closes and keyboard focus returns to Open navigation | Navigation was removed and the reopened trigger received focus | Passed | `tests/unit/site-header.test.tsx`; `docs/evidence/phase-1-verification.md` §4 |
| TC-P1-005 | FR-001, FR-004, NFR-034 | Homepage smoke | Load the production homepage | Built application served locally; Chromium available | Navigate to `/` | Response succeeds; Brew ni Cat Connect heading and desktop navigation/Menu link are visible | Response was successful and all required elements were visible | Passed | `tests/e2e/foundation.spec.ts`; `docs/evidence/phase-1-verification.md` §5.2 |
| TC-P1-006 | FR-004, NFR-030, NFR-034 | Mobile navigation | Use mobile menu at 375 × 812 | Built application served locally; Chromium available | Open `/`, activate mobile trigger | Trigger state changes, mobile Menu link is visible, and document width does not exceed viewport | Expanded state and mobile navigation were visible; `scrollWidth` did not exceed `clientWidth` | Passed | `tests/e2e/foundation.spec.ts`; `docs/evidence/phase-1-verification.md` §5.2 |
| TC-P1-007 | FR-004, NFR-034 | Routing | Load foundation placeholder routes | Built application served locally; Chromium available | Visit `/menu`, `/about`, `/gallery`, and `/contact` | Every response succeeds; route heading and shared brand shell remain visible | All four routes returned successfully with the expected heading and shared header brand | Passed | `tests/e2e/foundation.spec.ts`; `docs/evidence/phase-1-verification.md` §5.2 |
| TC-P1-008 | NFR-040 | Error foundation | Load an unknown route | Built application served locally; Chromium available | Visit `/phase-one-route-that-does-not-exist` | Response is 404; Page not found heading and Return home link are visible | Response status was 404 and both required elements were visible | Passed | `tests/e2e/foundation.spec.ts`; `docs/evidence/phase-1-verification.md` §5.2 |
| TC-P1-009 | NFR-034 | Responsive shell | Check representative responsive widths | Built application served locally; Chromium available | Load `/` at 320, 375, 768, 1024, and 1440 CSS pixels | At each width, document `scrollWidth` equals viewport `clientWidth` | All five width comparisons matched exactly; no horizontal document overflow was detected | Passed | `tests/e2e/foundation.spec.ts`; `docs/evidence/phase-1-verification.md` §5.2 |

**Automated result:** 9 cases passed: 4 Vitest unit/component cases and 5 Playwright Chromium cases. No failed or skipped case was reported.

## 3. Coverage Result

Command: `npm run test:coverage`

| Metric | Covered / total | Result |
| --- | --- | --- |
| Statements | 24 / 25 | 96% |
| Branches | 8 / 9 | 88.88% |
| Functions | 13 / 13 | 100% |
| Lines | 22 / 23 | 95.65% |

This denominator includes only source units imported by the current foundation tests. It is not a whole-`src/` coverage claim and is not yet an enforced project-wide gate.

## 4. Developer Responsive Inspection

The developer inspected the retained evidence images on 2026-08-23. This inspection is implementation evidence, not teammate QA or approval.

| View | Evidence | Observed result |
| --- | --- | --- |
| Mobile, 375 px, navigation closed | `docs/evidence/phase-1/screenshots/mobile-375.png` | Header, hero, CTAs, foundation cards, and footer reflowed into one column with no obvious clipping or overlap |
| Mobile, 375 px, navigation open | `docs/evidence/phase-1/screenshots/mobile-navigation-open-375.png` | Expanded control and Home, Menu, About, Gallery, and Contact links were visible; underlying content remained reachable below the menu |
| Tablet, 768 px | `docs/evidence/phase-1/screenshots/tablet-768.png` | Shell used the available width without obvious horizontal overflow or overlapping content |
| Desktop, 1440 px | `docs/evidence/phase-1/screenshots/desktop-1440.png` | Desktop navigation, two-column hero, content cards, and footer columns rendered without obvious overlap or clipped controls |

Widths 320 and 1024 were covered by automated overflow assertions in TC-P1-009 but do not have retained screenshots in this run.

## 5. Developer Accessibility Inspection

A separate developer browser inspection verified that the first Tab reached the skip link with a computed 3 px solid outline; Enter moved focus to `MAIN#main-content`; the keyboard reached Open navigation; Enter expanded it; Escape collapsed it and restored trigger focus; and a reduced-motion context computed a `0.00001s` transition duration. Sampled foreground/background token ratios ranged from `6.50:1` to `15.36:1`. The full procedure and literal state changes are in `docs/evidence/phase-1-verification.md` §7.2.

**Status:** Passed developer inspection. This does not replace teammate manual QA, an accessibility audit, or a WCAG conformance claim.

## 6. Teammate QA Handoff

These checks are intentionally left for Renier. Automated/developer evidence does not check them on the teammate's behalf.

| QA ID | Manual check | Status | Reviewer evidence |
| --- | --- | --- | --- |
| QA-P1-001 | Homepage loads correctly | Not Run (pending teammate QA) | — |
| QA-P1-002 | Header displays correctly | Not Run (pending teammate QA) | — |
| QA-P1-003 | Desktop navigation works | Not Run (pending teammate QA) | — |
| QA-P1-004 | Mobile menu opens and closes | Not Run (pending teammate QA) | — |
| QA-P1-005 | Layout works at representative mobile, tablet, and desktop widths | Not Run (pending teammate QA) | — |
| QA-P1-006 | Keyboard navigation has a logical order and no trap | Not Run (pending teammate QA) | — |
| QA-P1-007 | Focus indicators are visible | Not Run (pending teammate QA) | — |
| QA-P1-008 | No obvious horizontal overflow is present | Not Run (pending teammate QA) | — |
| QA-P1-009 | Unknown route presents the branded 404 experience | Not Run (pending teammate QA) | — |

Renier should record the reviewer name, date, browser/device, actual result, findings, and any related bug IDs before changing a manual status. Peer code-review evidence must remain separate from this developer-authored test record.

## 7. Phase 1 Independent Review Closure

The `Not Run` handoff table above is retained as the state when the Phase 1 implementation was first delivered. It was later superseded by actual independent work: Renier Apal completed manual QA and peer review, approved Pull Request #1, and reported no blocking defect. Phase 1 was merged to `main` as `11c546d`. P1-UX-001 and P1-ENV-001 were accepted as non-blocking Phase 2 follow-ups rather than rewritten as absent from the Phase 1 record.

## 8. Automated Phase 2 Cases

The final Phase 2 follow-up validation ran on 2026-08-24. Vitest passed 21 of 21 cases in 6 files; the full Playwright suite passed 13 of 13 cases, comprising 5 retained Phase 1 regressions and 8 Phase 2 browser cases. The follow-up includes `TC-P2-029` and the strengthened favorite-link assertion.

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P2-001 | FR-001, FR-004 | Home | Render official brand and CTAs | JSDOM | Render Home | Official logo/brand, Browse current menu, and Plan your visit actions render | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/home-page.test.tsx` |
| TC-P2-002 | FR-003, FR-006 | Home | Render favorites and visit details | JSDOM | Render Home | Matcha, Takoyaki, Fries, landmark, and payment summary render without exact analytics | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/home-page.test.tsx` |
| TC-P2-003 | FR-001, FR-009 | Home | Remove developer placeholder language | JSDOM | Inspect rendered Home text | Phase 1/foundation/future-milestone customer copy is absent | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/home-page.test.tsx` |
| TC-P2-004 | FR-004 | Header | Resolve duplicate menu action | JSDOM | Render header | One desktop Menu link and distinct Visit us link to Contact render | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/site-header.test.tsx` |
| TC-P2-005 | FR-004, NFR-030 | Mobile nav | Open and close by selection | JSDOM/user event | Open then select Menu | Expanded state changes and link selection closes menu | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/site-header.test.tsx` |
| TC-P2-006 | FR-004, NFR-030 | Mobile nav | Escape and focus restore | JSDOM/user event | Open then press Escape | Menu closes and trigger regains focus | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/site-header.test.tsx` |
| TC-P2-007 | FR-011 | Catalog mapper | Normalize flavors and prices | Row fixtures | Map pipe flavors and structured variants | Deduplicated flavors, base prices, and flavor prices map correctly | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-mapping.test.ts` |
| TC-P2-008 | FR-011, FR-015 | Catalog mapper | Preserve combo/unavailable data | JSON-string fixture | Map combo description and false availability | Description is retained and unavailable state is explicit | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-mapping.test.ts` |
| TC-P2-009 | FR-008, FR-011 | Catalog mapper | Reject malformed/null values | Malformed fixtures | Map invalid records | No fabricated names, variants, or prices appear | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-mapping.test.ts` |
| TC-P2-010 | FR-011 | Price display | Format PHP and minimum price | Numeric/null fixtures | Format and select price | Philippine peso output and lowest valid price are correct | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-mapping.test.ts` |
| TC-P2-011 | FR-008 | Menu UI | Loading state | Deferred loader | Render MenuCatalog | Polite status announces current-menu retrieval | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| TC-P2-012 | FR-010, FR-011, FR-015, FR-016 | Menu UI | Render mapped catalog | Deterministic catalog fixture | Resolve loader | Category, item, size/variant, flavor prices, combo detail, and availability render | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| TC-P2-013 | FR-008 | Menu UI | Empty response | Empty catalog fixture | Resolve loader | Truthful empty state and Contact route render | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| TC-P2-014 | FR-008 | Menu UI | Failure and retry | Rejecting then successful loader | Activate Try again | Generic error renders, retry occurs, and raw provider detail stays hidden | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| TC-P2-015 | FR-002 | About | Confirm factual content | JSDOM | Render About | Opening date, Kabacan context, offerings render; no invented owner biography | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/business-pages.test.tsx` |
| TC-P2-016 | FR-003 | Contact | Confirm visit facts | JSDOM | Render Contact | Exact address/landmark/contact/payment/takeout/Sunday-closed variable-hours content renders | Assertions updated 2026-09-24 for Sunday closure; unit suite currently 69/69 | Passed | `tests/unit/business-pages.test.tsx` |
| TC-P2-017 | FR-003, FR-030 | Contact | Describe external rider model | JSDOM | Inspect delivery information | Customer books/pays rider; no fee/ETA/in-house guarantee appears | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/business-pages.test.tsx` |
| TC-P2-018 | FR-005 | Gallery | Curated accessible photos | JSDOM | Render Gallery | Approved selection and generic non-empty alt text render | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/business-pages.test.tsx` |
| TC-P2-019 | FR-008, NFR-017 | Supabase config | Missing public config | Cleared public environment | Create client | Typed safe configuration error occurs before provider client creation | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/public-supabase-client.test.ts` |
| TC-P2-020 | FR-011, NFR-017 | Supabase config | Public publishable config only | Non-secret fixtures | Create client | Public values are used and session persistence/refresh/URL detection are disabled | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/public-supabase-client.test.ts` |
| TC-P2-021 | FR-001, FR-003, FR-006 | Browser Home | Official showcase smoke | Production build/Chromium | Visit `/` | Logo, CTAs, favorites, landmark/payment content render; developer text is absent | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/showcase.spec.ts` |
| TC-P2-022 | FR-004 | Browser header | Duplicate Menu regression | Desktop viewport | Inspect banner/nav | Exactly one Menu action and distinct Visit us/Contact action render | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/showcase.spec.ts` |
| TC-P2-023 | FR-002 | Browser About | Factual story | Production build | Visit `/about` | Confirmed opening date, Kabacan context and offerings render without owner biography | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/showcase.spec.ts` |
| TC-P2-024 | FR-005 | Browser Gallery | Curated responsive media | Production build | Visit `/gallery` | 12–24 unique non-empty-alt gallery images attach | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/showcase.spec.ts` |
| TC-P2-025 | FR-003, FR-030 | Browser Contact | Confirm business/rider facts | Production build | Visit `/contact` | Exact contact/visit/social and independent-rider information render | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/showcase.spec.ts` |
| TC-P2-026 | FR-010, FR-011, FR-015, FR-016 | Browser Menu | Mapped success response | Intercepted deterministic Data API reads | Visit `/menu` | Category/item/options/prices/unavailable render; cart/checkout controls are absent | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/menu.spec.ts` |
| TC-P2-027 | FR-008 | Browser Menu | Loading then empty response | Delayed intercepted empty reads | Visit `/menu` | Loading status transitions to truthful empty/contact state | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/menu.spec.ts` |
| TC-P2-028 | FR-008 | Browser Menu | Retrieval failure | Intercepted provider error | Visit `/menu` | Generic retry/contact alert renders without fabricated catalog | All assertions matched the expected behavior in the final 13/13 Playwright run | Passed | `tests/e2e/menu.spec.ts` |
| TC-P2-029 | FR-011, FR-015 | Menu UI | Zero base-price sentinel with flavor prices | Deterministic flavor-price fixture | Resolve loader | Lowest real flavor price renders as `From ₱40`; variant omits `₱0`; flavor prices remain visible | Assertions passed in the final 21/21 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |

**Final automated Phase 2 follow-up result:** 29 of 29 Phase 2 cases passed: 21 Vitest unit/component cases and 8 Playwright browser cases. The complete Playwright run also passed all 5 retained Phase 1 browser regressions, for 13 of 13 browser tests overall.

## 9. Phase 2 Live Data and Manual Status

| Check ID | Check | Status | Evidence / blocker |
| --- | --- | --- | --- |
| LIVE-P2-001 | Public role reads current categories/items | Passed | Publishable runtime GET returned 6 categories and 16 items, with 0 unavailable items and 0 unmatched relationships |
| LIVE-P2-002 | Representative current names/prices/variants/flavors/combos/availability render publicly | Passed | Unmocked `/menu` displayed all current records; Takoyaki correctly shows `From ₱40`; Supabase records, not posters, supplied the values |
| LIVE-P2-003 | Homepage favorite-card links remain browse-only | Passed | Matcha, Takoyaki, and Fries cards link to `/menu`; no sales statistic or ordering action was added |
| SEC-P2-001 | Follow-up tracked/staged secret and browser-bundle review | Passed | `.env.local` is ignored/untracked; real local values have zero tracked matches; privileged value/name have zero app/bundle matches; empty `.env.example` assignments remain non-secret |
| SEC-P2-002 | Public exposure assessment while RLS is disabled | Blocked | HEAD-only/no-body probes found `inventory`, `recipe_mappings`, `expenses`, `orders`, `order_items`, and `app_release` publicly reachable; production hardening required |
| DB-P2-001 | Follow-up remains read-only for business data | Passed | Catalog GET and HEAD-only/no-body probes performed no RLS, schema, menu, price, inventory, sales, expense, customer, order, or POS data mutation; writes were not tested |
| RESP-P2-001 | Initial developer responsive/overflow check at 320, 375, 768, 1024, 1440 | Passed | Initial 20 route/viewport checks had zero overflow failures; retained captures and report remain historical evidence |
| RESP-P2-002 | Live public Menu at 320, 375, 768, 1024, 1440 | Passed | All 6 categories/16 items rendered with zero body overflow and zero console errors; new desktop/mobile captures and `live-menu-review.json` retained |
| QA-P2-001 | Renier independent Home/navigation QA | Not Run | Pending open Pull Request review |
| QA-P2-002 | Renier independent Menu/live-access/error-state QA | Not Run | Pending open Pull Request review; live rows render, but the RLS-disabled security blocker remains open |
| QA-P2-003 | Renier independent About/Gallery/Contact/content QA | Not Run | Pending open Pull Request review |
| QA-P2-004 | Renier independent accessibility/responsive/code review | Not Run | Pending open Pull Request review |

The old posters are not an expected-result oracle. Current Supabase public records are authoritative. No production mutation test is permitted in Phase 2. Public-read success under manually disabled RLS does not complete the least-privilege security requirement.

## 10. Phase 3 Ordering Core Cases

Added with the ordering core in PR #7 (2026-09-18): Vitest 69/69 passed; Playwright 13/13 passed. These cases still pass in the 109/109 Vitest runs on PRs #16–#18.

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P3-001 | FR-018, FR-021 | Cart pricing | Trims flavors and treats blank input as no flavor | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Trims flavors and treats blank input as no flavor | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-002 | FR-018, FR-021 | Cart pricing | Builds a deterministic key that merges trims but separates flavors | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Builds a deterministic key that merges trims but separates flavors | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-003 | FR-018, FR-021 | Cart pricing | Finds items across categories and returns null when absent | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Finds items across categories and returns null when absent | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-004 | FR-018, FR-021 | Cart pricing | Finds variants within an item and returns null when absent | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Finds variants within an item and returns null when absent | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-005 | FR-018, FR-021 | Cart pricing | Resolves the base price when no flavor is selected | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Resolves the base price when no flavor is selected | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-006 | FR-018, FR-021 | Cart pricing | Prefers an explicit flavor price over the base price | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Prefers an explicit flavor price over the base price | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-007 | FR-018, FR-021 | Cart pricing | Falls back to the base price for a known flavor without an override | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Falls back to the base price for a known flavor without an override | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-008 | FR-018, FR-021 | Cart pricing | Resolves Takoyaki flavor prices when the base is the zero placeholder | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Resolves Takoyaki flavor prices when the base is the zero placeholder | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-009 | FR-018, FR-021 | Cart pricing | Rejects a bare zero-base variant that requires a flavor choice | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Rejects a bare zero-base variant that requires a flavor choice | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-010 | FR-018, FR-021 | Cart pricing | Resolves a flavor price when the base is null | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Resolves a flavor price when the base is null | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-011 | FR-018, FR-021 | Cart pricing | Rejects unknown flavors instead of falling back to the base | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Rejects unknown flavors instead of falling back to the base | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-012 | FR-018, FR-021 | Cart pricing | Rejects variants without any purchasable price | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Rejects variants without any purchasable price | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-013 | FR-018, FR-021 | Cart pricing | Accepts an explicit zero flavor price as authoritative | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Accepts an explicit zero flavor price as authoritative | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-014 | FR-018, FR-021 | Cart pricing | Converts through integer centavos without drift | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Converts through integer centavos without drift | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-015 | FR-018, FR-021 | Cart pricing | Totals lines through centavos so fractional pesos stay exact | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Totals lines through centavos so fractional pesos stay exact | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-016 | FR-018, FR-021 | Cart pricing | Accepts any positive safe integer without an owner-unconfirmed maximum | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Accepts any positive safe integer without an owner-unconfirmed maximum | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-017 | FR-018, FR-021 | Cart pricing | Guards centavo multiplication so totals stay precisely representable | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Guards centavo multiplication so totals stay precisely representable | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-018 | FR-018, FR-021 | Cart pricing | Guards the combined cart subtotal across individually safe lines | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Guards the combined cart subtotal across individually safe lines | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-019 | FR-018, FR-021 | Cart pricing | Keeps normal subtotals exact and rejects unsafe arbitrary input | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Keeps normal subtotals exact and rejects unsafe arbitrary input | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |
| TC-P3-020 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Adds a valid configured product with resolved unit and line totals | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Adds a valid configured product with resolved unit and line totals | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-021 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Merges identical configurations by adding quantities | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Merges identical configurations by adding quantities | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-022 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Keeps different flavors and variants on separate lines | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Keeps different flavors and variants on separate lines | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-023 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Keeps Takoyaki flavors separate with flavor-derived prices | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Keeps Takoyaki flavors separate with flavor-derived prices | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-024 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Sums merged quantities without an owner-unconfirmed cap | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Sums merged quantities without an owner-unconfirmed cap | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-025 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects unavailable and unknown-availability products | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects unavailable and unknown-availability products | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-026 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects unknown references, missing prices, and invalid quantities | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects unknown references, missing prices, and invalid quantities | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-027 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Normalizes flavor whitespace before identity and pricing | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Normalizes flavor whitespace before identity and pricing | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-028 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Derives prices from the supplied catalog rather than constants | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Derives prices from the supplied catalog rather than constants | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-029 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Removes a line and keeps removal of an unknown key a no-op | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Removes a line and keeps removal of an unknown key a no-op | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-030 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Updates quantities and never allows an invalid quantity | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Updates quantities and never allows an invalid quantity | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-031 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects invalid quantities through the public add boundary | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects invalid quantities through the public add boundary | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-032 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Clears all lines while retaining fulfillment | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Clears all lines while retaining fulfillment | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-033 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Defaults to pickup and switches only between supported modes | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Defaults to pickup and switches only between supported modes | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-034 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Applies reducer actions for price-free updates only | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Applies reducer actions for price-free updates only | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-035 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Ignores caller-supplied prices and resolves from the catalog | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Ignores caller-supplied prices and resolves from the catalog | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-036 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Follows catalog price changes instead of caller-fixed prices | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Follows catalog price changes instead of caller-fixed prices | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-037 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Ignores legacy price-injecting reducer payloads | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Ignores legacy price-injecting reducer payloads | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-038 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Refreshes an existing line to the current catalog price on re-add | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Refreshes an existing line to the current catalog price on re-add | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-039 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects money-unsafe adds and merges without changing the cart | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects money-unsafe adds and merges without changing the cart | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-040 | FR-020, FR-022 | Cart selectors | Reports an empty cart with zero counts and subtotal | Static test catalog | Unit test in `tests/unit/cart-selectors.test.ts` | Reports an empty cart with zero counts and subtotal | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-selectors.test.ts` |
| TC-P3-041 | FR-020, FR-022 | Cart selectors | Derives line count, item count, and subtotal from lines | Static test catalog | Unit test in `tests/unit/cart-selectors.test.ts` | Derives line count, item count, and subtotal from lines | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-selectors.test.ts` |
| TC-P3-042 | FR-020, FR-022 | Cart selectors | Builds an itemized draft that matches selector derivations | Static test catalog | Unit test in `tests/unit/cart-selectors.test.ts` | Builds an itemized draft that matches selector derivations | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-selectors.test.ts` |
| TC-P3-043 | FR-020, FR-022 | Cart selectors | Reflects fulfillment changes in the draft without altering totals | Static test catalog | Unit test in `tests/unit/cart-selectors.test.ts` | Reflects fulfillment changes in the draft without altering totals | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-selectors.test.ts` |
| TC-P3-044 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects money-unsafe quantity updates and keeps normal updates | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects money-unsafe quantity updates and keeps normal updates | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-045 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects a second safe line when the combined subtotal would overflow | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects a second safe line when the combined subtotal would overflow | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-046 | FR-017, FR-018, FR-020, FR-021, FR-022 | Cart reducer | Rejects a quantity update that would make the cart subtotal unsafe | Static test catalog | Unit test in `tests/unit/cart-reducer.test.ts` | Rejects a quantity update that would make the cart subtotal unsafe | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-reducer.test.ts` |
| TC-P3-047 | FR-018, FR-021 | Cart pricing | Rejects a variant flavor price when the flavor is not allowed by the item | Static test catalog | Unit test in `tests/unit/cart-pricing.test.ts` | Rejects a variant flavor price when the flavor is not allowed by the item | Matched in the 69/69 Vitest run on PR #7 and later 109/109 runs | Passed | `tests/unit/cart-pricing.test.ts` |

## 11. Phase 3 Menu Photos and Motion Cases

Run on 2026-10-15 for branch `feat/menu-photos-motion`: Vitest 109/109 passed in 14 files; Playwright 13/13 passed.

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P3-048 | FR-011, NFR-005 | Menu images | Approved items map to their own photos | Static config | Look up Takoyaki, Buldak Carbo/Cheese, Fries, Cat-Feine, Matcha by name and nickname | Each returns its dedicated `/images/menu/items/` photo | Matched in the 109/109 Vitest run | Passed | `tests/unit/menu-item-images.test.ts` |
| TC-P3-049 | FR-011 | Menu images | No duplicated photo | Static config | Compare all mapped sources | Every source is unique; Buldak Carbo and Cheese differ | Matched in the 109/109 Vitest run | Passed | `tests/unit/menu-item-images.test.ts` |
| TC-P3-050 | FR-011 | Menu images | Unphotographed items stay imageless | Static config | Look up Sedaap, Nachos, Oreo, combos, Cat Treats, unknown names | All return no photo | Matched in the 109/109 Vitest run | Passed | `tests/unit/menu-item-images.test.ts` |
| TC-P3-051 | FR-008 | Menu UI | Loading skeleton | Pending loader | Render MenuCatalog | Four `aria-hidden` skeleton cards render beside the polite status | Matched in the 109/109 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| TC-P3-052 | FR-016 | Menu UI | Scroll-spy active category tab | Stubbed IntersectionObserver | Report the last section as intersecting | Its tab gets `aria-current="true"` | Matched in the 109/109 Vitest run | Passed | `tests/unit/menu-catalog.test.tsx` |
| MAN-P3-001 | NFR-032, NFR-034 | All public pages, cart, checkout | Motion and responsive review | Dev server, Chromium | Capture 1440px and 320px views at top and scrolled | Motion renders without overflow, overlap or clipped content | Reviewed; zero horizontal overflow | Passed | `docs/evidence/phase-3/menu-photos-motion/` |
| TC-P3-053 | FR-022 | Checkout | Name & Phone Validation | User on Checkout Step | Enter valid name and valid PH mobile number (`0912 345 6789`) | Form allows proceeding to review | Matched in the 115/115 Vitest run (PR #20) | Passed | `tests/unit/checkout-validation.test.ts` |
| TC-P3-054 | FR-022 | Checkout | Invalid Phone Input | User on Checkout Step | Enter non-numeric string (`abcdefghij`) or invalid length | Error message displays and validation fails | Matched in the 115/115 Vitest run (PR #20) | Passed | `tests/unit/checkout-validation.test.ts` |
| TC-P3-055 | FR-020 | Checkout | Copy Order Summary | Review Step reached | Click "Copy Summary and Message Shop" | Order text copied to clipboard with confirmation toast | Verified UI behavior in PR #14 | Passed | `docs/code-review.md` |

## 12. 3D Experience Layer Cases

Run on 2026-10-17 for branch `feat/threejs-experience`: Vitest 120/120 passed in 16 files; Playwright 18/18 passed (13 functional cases in the reduced-motion `chromium` project, 5 cases in `chromium-3d`).

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P4-001 | FR-001, NFR-032 | 3D home | Showcase renders real pixels | Production build, `chromium-3d` project (software WebGL) | Open `/`, wait for `.showcase--ready`, sample the canvas; press the Takoyaki jump button | Canvas pixel spread above threshold; H1 present; five jump buttons; Takoyaki becomes `aria-current`; no console errors | Matched in the 18/18 Playwright run | Passed | `tests/e2e/three.spec.ts` |
| TC-P4-002 | NFR-029, NFR-034 | 3D layer | No console or hydration errors | As above, menu mocked | Visit `/menu`, `/about`, `/gallery`, `/contact`, `/cart`, `/checkout` | Each ambient backdrop mounts, H1 visible, zero console or page errors | Matched in the 18/18 Playwright run | Passed | `tests/e2e/three.spec.ts` |
| TC-P4-003 | FR-017, FR-020 | 3D menu + cart | 3D tiles and toss use the real cart | Mocked available Buldak Carbo | Wait for the 3D tile; Order → Add to Order | Tile ready; no 'Ready to enjoy?'; photo alt kept; drawer opens after the toss with the item; cart button reads 1 item | Matched in the 18/18 Playwright run | Passed | `tests/e2e/three.spec.ts` |
| TC-P4-004 | NFR-029, NFR-030 | 3D gallery + visit | Keyboard control of ring and sign | As above | Focus Next photo, press Enter; on `/contact` focus Flip the sign, press Enter | Caption moves to 2 / 30; photo grid keeps ≥12 images; sign button becomes `aria-pressed=true`; hours heading still visible | Matched in the 18/18 Playwright run | Passed | `tests/e2e/three.spec.ts` |
| TC-P4-005 | NFR-032 | Reduced motion | Static fallback | `prefers-reduced-motion: reduce` | Open `/`, `/contact`, `/gallery` | Static five-item grid; sign fallback card; no ring and no `<canvas>` | Matched in the 18/18 Playwright run | Passed | `tests/e2e/three.spec.ts` |
| TC-P4-006 | FR-017 | Cart toss bridge | No-op without the 3D cart | jsdom | Call `requestCartToss` with the layer off, then on | Returns 0 and fires nothing; then returns 900 ms and fires one event | Matched in the 120/120 Vitest run | Passed | `tests/unit/three-layer.test.tsx` |
| TC-P4-007 | FR-001 | Home showcase | Static render without WebGL | jsdom (no WebGL 2) | Render `HomeShowcase` | H1, menu CTA and five items with photo alt text and prices | Matched in the 120/120 Vitest run | Passed | `tests/unit/three-layer.test.tsx` |
| TC-P4-008 | FR-004 | Visit facts | Sign text matches confirmed facts | Static config | Read `visitFacts`; render `VisitStage` | 11 AM – 10 PM, Monday to Saturday, closed Sunday, Pulido Eatery, Segundo St; no flip button without 3D | Matched in the 120/120 Vitest run | Passed | `tests/unit/three-layer.test.tsx` |
| TC-P4-009 | FR-011, FR-017 | Menu card | 'Ready to enjoy?' removed, 3D slot exposed | Cart provider | Render Buldak Carbo card | No 'Ready to enjoy?'; order button carries `data-order-trigger`; slot has optimised photo URL and glow colour | Matched in the 120/120 Vitest run | Passed | `tests/unit/three-layer.test.tsx` |
| TC-P4-010 | NFR-005 | 3D helpers | Glow colours and texture URLs | None | Call `glowForItem` and `optimizedSrc` | Expected colours; local photos route through `/_next/image`; remote URLs unchanged | Matched in the 120/120 Vitest run | Passed | `tests/unit/three-layer.test.tsx` |
| MAN-P4-001 | NFR-032, NFR-034 | All routes | Visual review of the 3D layer | Production build, software WebGL | Screenshots at 1440×900 and 390×844 plus scroll-through videos of home and menu | 3D renders (no blank canvas), no overlap with text, no horizontal overflow | Reviewed; captures kept outside the repository | Passed | Local captures (`threejs-shots/`) |
