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

The final Phase 2 branch validation ran on 2026-08-24. Vitest passed 20 of 20 cases in 6 files; the full Playwright suite passed 13 of 13 cases, comprising 5 retained Phase 1 regressions and 8 Phase 2 browser cases.

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
| TC-P2-016 | FR-003 | Contact | Confirm visit facts | JSDOM | Render Contact | Exact address/landmark/contact/payment/takeout/variable-hours content renders | All assertions matched the expected behavior in the final 20/20 Vitest run | Passed | `tests/unit/business-pages.test.tsx` |
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

**Automated Phase 2 result:** 28 of 28 Phase 2 cases passed: 20 Vitest unit/component cases and 8 Playwright browser cases. The complete Playwright run also passed all 5 retained Phase 1 browser regressions, for 13 of 13 browser tests overall.

## 9. Phase 2 Live Data and Manual Status

| Check ID | Check | Status | Evidence / blocker |
| --- | --- | --- | --- |
| LIVE-P2-001 | Public role reads current categories/items | Blocked | Both public probes returned HTTP 200 with zero rows under existing anonymous policy |
| LIVE-P2-002 | Representative current names/prices/variants/flavors/combos/availability render publicly | Blocked | Controlled read-only discovery found records, but privileged discovery cannot substitute for public-role acceptance |
| SEC-P2-001 | Final tracked/staged secret and browser-bundle review | Passed | `.env.local` ignored/untracked; zero real privileged values in tracked files or app bundles; zero privileged names in app bundles |
| RESP-P2-001 | Developer responsive/overflow check at 320, 375, 768, 1024, 1440 | Passed | 20 route/viewport checks had zero overflow failures; 9 retained captures and report under `docs/evidence/phase-2/` |
| QA-P2-001 | Renier independent Home/navigation QA | Not Run | Pending open Pull Request review |
| QA-P2-002 | Renier independent Menu/live-policy/error-state QA | Not Run | Pending open Pull Request review; live rows blocked |
| QA-P2-003 | Renier independent About/Gallery/Contact/content QA | Not Run | Pending open Pull Request review |
| QA-P2-004 | Renier independent accessibility/responsive/code review | Not Run | Pending open Pull Request review |

The old posters are not an expected-result oracle. Supabase current public records are authoritative after the approved public role can read them. No production mutation test is permitted in Phase 2.
