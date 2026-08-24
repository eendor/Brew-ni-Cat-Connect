# Phase 2 Public Showcase — Implementation and QA Handoff

**Version:** 0.1 Draft
**Date:** 2026-08-24
**Branch:** `feat/showcase-website`
**Status:** Testing / Review; local automation and the initial hosted workflows passed, the branch is pushed, and [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2) is open and unmerged; independent QA/review remains pending

## 1. Implemented Increment

The Phase 2 branch replaces the public development placeholders with the real Brew ni Cat customer showcase:

- official logo and business-focused Home experience;
- single-purpose header navigation with one `Menu` link and a distinct `Visit us` contact action;
- browser-runtime, read-only Supabase menu data layer with typed defensive mapping;
- customer-facing loading, empty, retrieval-error/retry, availability, category, item, variant, flavor, and price presentation;
- factual About and Contact experiences;
- curated responsive Gallery using approved local photographs;
- accurate address, contact, payment, takeout, variable-hours, social, and independent-rider information;
- route metadata, semantic landmarks, skip navigation, focus states, keyboard/Escape menu behavior, and reduced-motion support; and
- cross-platform LF repository policy with explicit binary-image exclusions.

Cart, checkout, ordering, customer accounts, payment processing, rider booking, authentication, loyalty, Messenger, Android, POS writes, and database changes are deliberately excluded.

## 2. Content and Asset Record

Confirmed business content comes from the Phase 2 client brief dated 2026-08-24. The implementation uses:

- the approved official logo at `public/images/branding/brew-ni-cat-logo.png`;
- 19 curated images from the 139 approved files under `public/images/shop/`;
- generic factual alternative text that does not identify or infer personal details about customers;
- the confirmed opening date, Kabacan address and landmark, phone, email, payment methods, takeout fee, social destinations, variable-hours wording, and external-rider model; and
- restrained factual About copy. A longer owner story remains provisional pending approval.

The five menu posters under `public/images/menu/` were reviewed only as visual/brand reference. Their older prices were not transcribed, rendered as structured catalog data, or used for verification.

### Curated gallery files

`photo_004.jpg`, `photo_006.jpg`, `photo_007.jpg`, `photo_009.jpg`, `photo_011.jpg`, `photo_030.jpg`, `photo_041.jpg`, `photo_045.jpg`, `photo_060.jpg`, `photo_063.jpg`, `photo_064.jpg`, `photo_074.jpg`, `photo_092.jpg`, `photo_119.jpg`, `photo_124.jpg`, `photo_126.jpg`, `photo_135.jpg`, `photo_145.jpg`, and `photo_146.jpg`.

Eight of these are marked for the Home preview; the Gallery initially renders all 19 through Next.js Image with responsive sizes and native lazy loading outside the eager/featured set.

## 3. Supabase Discovery and Access Evidence

Existing POS source and controlled read-only API discovery identified:

- `categories(id, name, created_at)`;
- `items(id, category_id, name, flavors, variants_json, is_available, created_at)`;
- variant entries with `id`, `name`, `basePrice`, `priceByFlavor`, and optional `description`;
- six categories and sixteen current items, with zero unavailable items at discovery time;
- combos/packages represented as normal items/variants;
- no discovered public catalog view, menu RPC, display-order field, or live add-on relation; and
- POS add-on constants that are not suitable as authoritative live public data.

Public publishable-key and legacy public-key reads each returned HTTP 200 with zero rows. A privileged local read-only comparison confirmed records exist, so the observed behavior is consistent with the existing anonymous access policy filtering rows. No key value was printed, saved, or committed.

The application uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at browser runtime. It does not use a privileged key, mutate data, change RLS, or require Supabase during compilation. The current customer-visible result is therefore the truthful empty state until an approved least-privilege public-read boundary exists.

Detailed fields and relationships are in [`../database-design.md`](../database-design.md).

## 4. Phase 1 Follow-up Findings

| Finding | Phase 2 action | Verification status |
| --- | --- | --- |
| P1-UX-001 — duplicate Menu/View menu header actions | Header now has one `Menu` destination and the separate `Visit us` action links to Contact | TC-P2-004 and TC-P2-022 passed; independent QA remains pending |
| P1-ENV-001 — Windows LF/CRLF Prettier warnings | Added `.gitattributes` with `* text=auto eol=lf`, CRLF rules for Windows command scripts, binary image rules, and Prettier `endOfLine: lf` | `npm run format:check` passed on Windows with `core.autocrlf=true` |

## 5. Automated Case Inventory

Phase 1 regression cases are preserved. Phase 2 cases use IDs `TC-P2-001` through `TC-P2-028` and cover real Home content, the navigation correction, mobile keyboard behavior, defensive menu mapping/price formatting, menu UI success/loading/empty/error/retry/availability states, public configuration, and public-route browser behavior. The final run passed 20 of 20 Vitest cases and all 13 Playwright cases: 5 retained Phase 1 regressions plus 8 Phase 2 browser cases. Exact case mapping and status are in [`../test-cases.md`](../test-cases.md).

## 6. Required Command Record

The following commands ran against the final local implementation and documentation revision on 2026-08-24.

| Command | Result | Exit status |
| --- | --- | --- |
| `npm run format:check` | `All matched files use Prettier code style!` | 0 |
| `npm run audit` | `found 0 vulnerabilities` | 0 |
| `npm run lint` | ESLint completed with zero errors and zero warnings | 0 |
| `npm run typecheck` | Next route types generated; `tsc --noEmit` completed | 0 |
| `npm run test` | 6 files passed; 20 tests passed | 0 |
| `npm run build` | Compiled successfully; 7 of 7 static pages generated | 0 |
| `npm run test:e2e` | Production build passed; Playwright 13 of 13 passed in 9.2 seconds | 0 |
| `python scripts/validate_phase0_docs.py` | 22 Markdown files checked; 81 FR IDs; 40 NFR IDs; 0 errors; `PHASE0_DOC_VALIDATION=PASS` | 0 |

The [push workflow](https://github.com/eendor/Brew-ni-Cat-Connect/actions/runs/32683571433) and [pull-request workflow](https://github.com/eendor/Brew-ni-Cat-Connect/actions/runs/32683615804) for `67a81db` both completed successfully. The metadata-only commit containing this update must receive the same checks; the live Pull Request check rollup remains authoritative.

## 7. Developer Inspection Evidence

Nine full-page Chromium captures are retained under `docs/evidence/phase-2/screenshots/`:

- Home at desktop 1440 px and mobile 375 px;
- the truthful policy-blocked Menu state at desktop 1440 px and mobile 375 px;
- Gallery at desktop 1440 px and mobile 375 px;
- About at desktop 1440 px, Contact at mobile 375 px, and the branded 404 at desktop 1440 px.

| View | Evidence |
| --- | --- |
| Home — desktop | [`home-desktop-1440.webp`](phase-2/screenshots/home-desktop-1440.webp) |
| Home — mobile | [`home-mobile-375.webp`](phase-2/screenshots/home-mobile-375.webp) |
| Menu — desktop | [`menu-desktop-1440.webp`](phase-2/screenshots/menu-desktop-1440.webp) |
| Menu — mobile | [`menu-mobile-375.webp`](phase-2/screenshots/menu-mobile-375.webp) |
| Gallery — desktop | [`gallery-desktop-1440.webp`](phase-2/screenshots/gallery-desktop-1440.webp) |
| Gallery — mobile | [`gallery-mobile-375.webp`](phase-2/screenshots/gallery-mobile-375.webp) |
| About — desktop | [`about-desktop-1440.webp`](phase-2/screenshots/about-desktop-1440.webp) |
| Contact — mobile | [`contact-mobile-375.webp`](phase-2/screenshots/contact-mobile-375.webp) |
| Branded 404 — desktop | [`not-found-desktop-1440.webp`](phase-2/screenshots/not-found-desktop-1440.webp) |

[`responsive-review.json`](phase-2/responsive-review.json) records 20 additional Home/Menu/Gallery/Contact checks across 320, 375, 768, 1024, and 1440 CSS pixels. Every response was expected, all 20 had no horizontal overflow, all nine captures had one `h1`, the skip link existed, images finished loading, and no unexpected console error was recorded.

The developer keyboard inspection observed the skip link as the first Tab stop with a 3 px solid focus outline, Enter moved focus to `MAIN#main-content`, the mobile menu expanded by keyboard, and Escape collapsed it and returned focus to the trigger. A reduced-motion browser context computed a `1e-05s` transition duration. Sampled foreground/background design-token contrast ratios ranged from 5.91:1 to 13.77:1; this is focused implementation evidence, not a full WCAG conformance claim.

The final secret review confirmed `.env.local` is ignored and untracked, source has zero privileged-variable-name and mutation-call matches, real local environment values have zero tracked-file matches, and the privileged local value/name has zero matches in `.next/static` and `.next/server/app`. Expected documentation references to `service_role` and the empty `SUPABASE_SECRET_KEY=` example remain non-secret.

The focused P1-UX-001 change also has a verified copy/diff/rollback transaction: [`MODIFIED_FILE`](phase-2/transaction/MODIFIED_FILE), [`DIFF_FILE`](phase-2/transaction/DIFF_FILE), [`VERIFICATION.txt`](phase-2/transaction/VERIFICATION.txt), and executable [`ROLLBACK.sh`](phase-2/transaction/ROLLBACK.sh). Rollback was exercised on a separate copy; the changed application header remained intact.

## 8. Independent QA Handoff — Renier

All items are intentionally unchecked. Developer automation does not complete them for the independent reviewer.

### Home and navigation

- [ ] Official logo, business name, warm public hero, Browse Menu and Visit/Contact actions render correctly.
- [ ] Favorite groups, gallery preview, location, operating-hours notice, and social links are factual.
- [ ] Desktop shows one Menu action and no duplicate same-destination CTA.
- [ ] Mobile menu opens/closes, closes after selection, closes with Escape, and restores focus.

### Menu and Supabase

- [ ] Public access behavior matches the current approved Supabase policy.
- [ ] When public rows are approved, categories, names, current prices, variants/sizes, flavors, descriptions/combos, and availability match representative live records.
- [ ] No POS-hardcoded add-on is presented as authoritative live catalog data; the absent live add-on relation is documented.
- [ ] Loading, empty, error, retry, unavailable, and category-navigation states are clear, keyboard accessible, and usable at representative mobile widths.
- [ ] No poster-derived stale prices or Add to Cart/checkout controls appear.
- [ ] Network/configuration failure exposes no credential or internal error detail.

### Content and media

- [ ] About contains the confirmed opening date and no invented owner biography.
- [ ] Gallery selection is varied, responsive, appropriately lazy-loaded, non-duplicative, and uses generic meaningful alt text.
- [ ] Contact has the exact address, landmark, phone, email, Cash/GCash, ₱10 takeout box, variable-hours wording, Facebook, and TikTok information.
- [ ] Delivery content says the customer independently books and pays an external rider, with no Brew ni Cat fee/ETA/availability guarantee; all three provided external rider links use the expected destinations and safe external-link behavior.

### Accessibility, responsive behavior, and code review

- [ ] Keyboard order, skip link, headings, visible focus, controls, external links, and image alternatives are appropriate.
- [ ] Layouts at 320, 375, 768, 1024, and 1440 CSS pixels have no unintended horizontal overflow or overlap.
- [ ] Browser console/network behavior has no unexplained errors.
- [ ] Naming, readability, duplication, typing, data-layer design, environment/key handling, security, tests, and Phase 2 scope are acceptable.

Record reviewer name, date, browser/device, actual results, findings, related bug IDs, and final review decision before Phase 2 is marked Done or the Pull Request is merged.

## 9. Pull Request State

**Commits:** `0533bde` line endings; `f3949c3` read-only menu foundation; `4d66f95` public showcase and approved assets; `e03293e` Phase 2 tests; `67a81db` documentation and evidence
**Pull Request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), open and unmerged
**Hosted CI:** Initial push and pull-request workflows for `67a81db` passed; the live check rollup covers later handoff-only updates
**Review:** Pending Renier
**Merge:** Prohibited during implementation handoff
