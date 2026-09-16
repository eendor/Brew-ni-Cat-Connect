# Brew ni Cat Connect — Phase 2 Independent QA Plan

**Project:** Brew ni Cat Connect

**Specification version:** 0.1 Draft

**Test record version:** Phase 2 independent QA plan

**Tester:** Renier Apal

**Date:** 2026-09-12

**Status:** Test preparation only — execution pending

## 1. Scope and Status Rules

This document defines the independent QA cases for the Phase 2 public showcase website.

The testing covers the public Home, Menu, About, Gallery, Contact, and 404 pages, live read-only menu data, responsive behavior, accessibility, security checks, and code review.

This QA plan does not cover ordering, checkout, authentication, loyalty, Messenger, Android, POS synchronization, or database mutations.

Statuses follow `docs/testing-strategy.md`:

- **Passed:** the recorded execution matched the expected result.
- **Failed:** the recorded execution completed but did not match the expected result.
- **Not Run:** the case is specified but has no execution evidence.
- **Blocked:** the execution could not complete and has a recorded blocker.
- **Deferred:** the approved scope is scheduled for a later phase.

All cases below are intentionally set to `Not Run` until actual QA execution is completed.

## 2. Independent Phase 2 QA Cases

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input / action | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-P2-030 | FR-001, FR-004 | Home | Verify public Home page | Phase 2 application running locally | Visit `/` | Home page loads correctly; official branding, content, navigation, and primary actions are available | — | Not Run | — |
| TC-P2-031 | FR-010, FR-011 | Menu | Verify public Menu page | Application running; public Supabase configuration available | Visit `/menu` | Menu page loads and displays the current menu interface | — | Not Run | — |
| TC-P2-032 | FR-011 | Menu | Verify live menu categories | Live read-only Supabase access available | Inspect categories displayed on `/menu` | Displayed categories match the current live menu data | — | Not Run | — |
| TC-P2-033 | FR-011 | Menu | Verify live menu items/products | Live read-only Supabase access available | Inspect menu items on `/menu` | Displayed items match the current live menu data | — | Not Run | — |
| TC-P2-034 | FR-011, FR-015 | Menu | Verify live menu prices | Live read-only Supabase access available | Compare displayed prices with current live data | Displayed prices match the current live menu data; no stale hardcoded prices appear | — | Not Run | — |
| TC-P2-035 | FR-011, FR-015 | Menu | Verify sizes and variants | Live menu data contains applicable records | Inspect applicable menu items | Available sizes and variants are displayed correctly | — | Not Run | — |
| TC-P2-036 | FR-011, FR-015 | Menu | Verify flavors and flavor prices | Live menu data contains applicable records | Inspect applicable menu items | Available flavors and their applicable prices are displayed correctly | — | Not Run | — |
| TC-P2-037 | FR-011, FR-016 | Menu | Verify combo information | Live menu data contains applicable records | Inspect applicable combo items | Combo information is displayed correctly without fabricated data | — | Not Run | — |
| TC-P2-038 | FR-008 | Menu | Verify loading state | Application running | Load or reload `/menu` while data is being retrieved | Loading state communicates that current menu data is being retrieved | — | Not Run | — |
| TC-P2-039 | FR-008 | Menu | Verify empty menu state | No production data mutation permitted | Review existing empty-state implementation/test behavior | Empty menu data is handled truthfully without fabricated catalog content | — | Not Run | — |
| TC-P2-040 | FR-008 | Menu | Verify error and retry behavior | No production data mutation permitted | Review error/retry behavior and available safe test coverage | Menu retrieval errors are handled clearly and retry behavior works as implemented | — | Not Run | — |
| TC-P2-041 | FR-002 | About | Verify About page | Application running | Visit `/about` | About page loads correctly and displays approved factual content | — | Not Run | — |
| TC-P2-042 | FR-005 | Gallery | Verify Gallery page | Application running | Visit `/gallery` | Gallery loads correctly with approved images and no unexpected layout gaps | — | Not Run | — |
| TC-P2-043 | FR-003, FR-030 | Contact | Verify Contact page and map | Application running | Visit `/contact` | Contact information, map, and documented rider/pickup information display correctly | — | Not Run | — |
| TC-P2-044 | NFR-040 | 404 | Verify unknown route | Application running | Visit an unknown route | Branded 404 page appears with appropriate recovery/navigation option | — | Not Run | — |
| TC-P2-045 | FR-011 | Menu | Verify Cat Treats placement | Application running | Inspect Menu category/item ordering | Cat Treats appears in the intended end position | — | Not Run | — |
| TC-P2-046 | FR-005 | Gallery | Verify previous gallery spacing fix | Application running | Inspect Gallery layout | Previously reported unexpected empty gap is no longer present | — | Not Run | — |
| TC-P2-047 | FR-003 | Contact | Verify corrected map location | Application running | Inspect Contact map | Map points to the actual Brew ni Cat shop location | — | Not Run | — |
| TC-P2-048 | FR-011 | Menu | Verify menu card alignment | Application running | Inspect menu cards | Menu cards remain consistently aligned | — | Not Run | — |
| TC-P2-049 | NFR-034 | Responsive | Verify 320px layout | Browser responsive mode available | Test Home, Menu, About, Gallery, and Contact at 320px | Pages remain usable with no horizontal overflow, clipping, or overlapping content | — | Not Run | — |
| TC-P2-050 | NFR-034 | Responsive | Verify 375px layout | Browser responsive mode available | Test Home, Menu, About, Gallery, and Contact at 375px | Pages remain usable with no horizontal overflow, clipping, or overlapping content | — | Not Run | — |
| TC-P2-051 | NFR-034 | Responsive | Verify 768px layout | Browser responsive mode available | Test public pages at 768px | Tablet layout, navigation, Menu, and Gallery remain usable without horizontal overflow | — | Not Run | — |
| TC-P2-052 | NFR-034 | Responsive | Verify 1024px layout | Browser responsive mode available | Test public pages at 1024px | Layout, navigation, spacing, Menu, and Gallery remain usable | — | Not Run | — |
| TC-P2-053 | NFR-034 | Responsive | Verify 1440px layout | Browser responsive mode available | Test public pages at 1440px | Desktop layout remains usable without excessive whitespace or unnecessary stretching | — | Not Run | — |
| TC-P2-054 | NFR-034 | Responsive | Verify no horizontal overflow | Browser responsive mode available | Inspect document width across supported viewports | Document does not unexpectedly exceed the viewport width | — | Not Run | — |
| TC-P2-055 | NFR-030 | Accessibility | Verify keyboard navigation | Keyboard available | Navigate public pages using Tab and Shift+Tab | Important links and buttons are reachable in a logical order | — | Not Run | — |
| TC-P2-056 | NFR-030 | Accessibility | Verify visible focus states | Keyboard available | Navigate interactive elements using keyboard | Focus indicators are visible and focus is not unexpectedly lost | — | Not Run | — |
| TC-P2-057 | NFR-030 | Accessibility | Verify heading structure | Application running | Inspect headings on Home, Menu, About, Gallery, and Contact | Headings identify page sections and follow a logical hierarchy | — | Not Run | — |
| TC-P2-058 | NFR-030 | Mobile navigation | Verify mobile menu accessibility | Mobile viewport available | Open mobile menu and test keyboard interaction including Escape where supported | Mobile menu has an accessible name, opens/closes correctly, and does not behave unexpectedly with keyboard input | — | Not Run | — |
| TC-P2-059 | NFR-030 | Accessibility | Verify skip link | Application running | Reload page, press Tab, activate skip link | Skip link is available and moves focus to the main content | — | Not Run | — |
| TC-P2-060 | NFR-030 | Accessibility | Verify image alternative text | Application running | Inspect Home and Gallery images | Meaningful images have appropriate alt text and decorative images are handled appropriately | — | Not Run | — |
| TC-P2-061 | NFR-017 | Security | Verify `.env.local` is untracked | Local `.env.local` configured | Run `git status` and `git ls-files .env.local` | `.env.local` is not tracked or staged | — | Not Run | — |
| TC-P2-062 | NFR-017 | Security | Verify service-role key is not client exposed | Source code available | Inspect environment usage and client-side code | Supabase service-role credentials are not exposed to the client | — | Not Run | — |
| TC-P2-063 | NFR-017 | Security | Verify browser bundle has no secrets | Application running | Inspect browser-accessible configuration/bundle | Secret or service-role credentials are not exposed to the browser | — | Not Run | — |
| TC-P2-064 | NFR-017 | Security | Verify environment documentation | Repository available | Inspect `.env.example` and environment documentation | Required public/local configuration is documented without exposing secrets | — | Not Run | — |
| TC-P2-065 | FR-011 | Code review | Review Supabase data layer | Phase 2 source available | Inspect menu data-fetching implementation | Live menu data uses the intended read-only Supabase data layer | — | Not Run | — |
| TC-P2-066 | NFR-017 | Code review | Review TypeScript safety | Phase 2 source available | Inspect relevant TypeScript implementation | Types are appropriate and unnecessary unsafe patterns are avoided | — | Not Run | — |
| TC-P2-067 | NFR-030 | Code review | Review accessibility implementation | Phase 2 source available | Inspect accessibility-related implementation | Accessibility behavior is implemented consistently with the tested public UI | — | Not Run | — |
| TC-P2-068 | NFR-017 | Code review | Review error handling | Phase 2 source available | Inspect menu/page error handling | Errors are handled appropriately without exposing unnecessary internal details | — | Not Run | — |
| TC-P2-069 | — | Code review | Review Phase 2 scope | Phase 2 source available | Inspect Phase 2 changes | Changes remain within the approved Phase 2 scope | — | Not Run | — |
| TC-P2-070 | NFR-017 | Code review | Review environment and secret handling | Phase 2 source available | Inspect environment usage and tracked files | Secrets are handled safely and are not committed or exposed to the client | — | Not Run | — |
| TC-P2-071 | — | Automated validation | Run lint | Dependencies installed | Run `npm run lint` | Lint completes without blocking errors | — | Not Run | — |
| TC-P2-072 | — | Automated validation | Run TypeScript typecheck | Dependencies installed | Run `npm run typecheck` | Type checking completes successfully | — | Not Run | — |
| TC-P2-073 | — | Automated validation | Run unit tests | Dependencies installed | Run `npm run test` | Unit tests complete successfully | — | Not Run | — |
| TC-P2-074 | — | Automated validation | Run production build | Dependencies installed | Run `npm run build` | Production build completes successfully | — | Not Run | — |
| TC-P2-075 | — | Automated validation | Run Playwright E2E tests | Dependencies installed; required browser available | Run `npm run test:e2e` | Playwright tests complete successfully | — | Not Run | — |

## 3. Known Fix Verification

The following previously identified items are treated as verification targets and should not be reported as new defects unless a different or new problem is observed:

- Cat Treats placement
- Gallery empty-gap fix
- Corrected Contact map location
- Menu card alignment

## 4. Known Refinements

The following are already documented project decisions and are not new defects by themselves:

- Rider/pickup information is presented on Contact.
- Mobile navigation uses a hamburger menu.
- Product photos are not provided for each menu item.

## 5. Security Constraints

The current RLS-disabled state is already documented as a security follow-up.

QA will verify the documented state and application handling only.

No database writes, mutations, RLS changes, policy changes, or retrieval of unrelated private rows will be performed.

## 6. Evidence Plan

Execution evidence will be captured during actual testing and stored under:

`docs/evidence/phase-2/renier-qa/`

Planned evidence includes:

- Home page
- Live Menu
- Mobile navigation
- Gallery
- Contact/map
- 404 page
- Responsive viewport checks
- Keyboard/focus accessibility
- Automated validation results