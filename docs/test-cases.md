# Test Cases

**Project:** Brew ni Cat Connect
**Specification version:** 0.1 Draft
**Test record version:** Phase 1 foundation baseline
**Date:** 2026-08-23
**Status:** Developer automation complete; teammate manual QA and peer review pending

## 1. Scope and Status Rules

This record covers only the implemented Phase 1 application foundation. It does not claim coverage for production business content, ordering, Supabase, authentication, loyalty, Messenger, Android, or POS integration.

Statuses follow `docs/testing-strategy.md`:

- **Passed:** the recorded execution matched the expected result.
- **Failed:** the recorded execution completed but did not match the expected result.
- **Not Run:** the case is specified but has no execution evidence.
- **Blocked:** the execution could not complete and has a recorded blocker.
- **Deferred:** the approved scope is scheduled for a later phase.

Requirement references below are limited to the Phase 1 foundation aspect exercised by the case; they do not mark an entire Phase 2 requirement as implemented or tested.

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
