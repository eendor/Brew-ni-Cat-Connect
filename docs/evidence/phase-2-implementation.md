# Phase 2 Public Showcase — Implementation and QA Handoff

**Version:** 0.1 Draft
**Date:** 2026-08-24
**Branch:** `feat/showcase-website`
**Status:** Testing / Review; the live publishable-key Menu follow-up and final local quality gates passed, hosted CI is pending, [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2) remains open/unmerged, the RLS-disabled production security blocker remains open, and independent QA/review remains pending

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

## 3. Supabase Discovery and Access Evidence — Before Public Access

Existing POS source and controlled read-only API discovery identified:

- `categories(id, name, created_at)`;
- `items(id, category_id, name, flavors, variants_json, is_available, created_at)`;
- variant entries with `id`, `name`, `basePrice`, `priceByFlavor`, and optional `description`;
- six categories and sixteen current items, with zero unavailable items at discovery time;
- combos/packages represented as normal items/variants;
- no discovered public catalog view, menu RPC, display-order field, or live add-on relation; and
- POS add-on constants that are not suitable as authoritative live public data.

During the initial **BEFORE** observation, public publishable-key and legacy public-key reads each returned HTTP 200 with zero rows. A privileged local read-only comparison confirmed records existed, so the behavior was consistent with the then-existing anonymous access policy filtering rows. No key value was printed, saved, or committed.

The application used only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at browser runtime and did not use a privileged fallback. At that initial observation, customers therefore saw the truthful unavailable state.

### 3.1 Initial representative record comparison

A final controlled read-only comparison on 2026-08-24 again observed HTTP 200 with zero rows for both public tables, then observed six categories and sixteen items through the permitted local discovery credential. Category/item counts were: Buldak & Sedaap (4), Cat Treats (1), Cat-Tastic Bites (3), Cat-Tastic Drinks (4), Combos & Packages (3), and Take-out Box (1). All sixteen items reported available at that observation time.

The same current rows were passed through the application `mapMenuCatalog` boundary. Representative public fields compared without recording internal IDs were:

| Category | Current product checked | Representative current options/prices checked |
| --- | --- | --- |
| Buldak & Sedaap | Buldak Carbo | Plain Carbo Samyang ₱119; Carbo Samyang w/ Milk ₱129; Carbo Samyang w/ Egg ₱135 |
| Cat Treats | Cat Treats | Regular ₱5 |
| Cat-Tastic Bites | Fries (Cat Claws) | Small ₱30; Medium ₱50; Large ₱70; Jumbo ₱150; four named flavors remained attached |
| Cat-Tastic Bites | Takoyaki (Pawsome Balls) | 4pcs flavor prices: Veggie Whiskers ₱40, Cheesy Calico ₱50, Squid Treats ₱55, Shrimp Whisker ₱60 |
| Cat-Tastic Drinks | Cat-Feine (Classic Coffee) | 12oz ₱49; 16oz ₱59; 22oz ₱79; six named flavors remained attached |
| Cat-Tastic Drinks | Matcha (The Lucky Green Neko) | 12oz ₱49; 16oz ₱59; 22oz ₱79; four named flavors remained attached |
| Combos & Packages | Cat Association | Scaredy Cats ₱450; Lazy Cats ₱340; Grumpy Cats ₱480; Funny Cats ₱470; Super Cats ₱590; combo descriptions remained present |
| Take-out Box | Take-out Box | Regular ₱10 |

These are historical point-in-time observations, not hardcoded runtime fallback data. At that **BEFORE** point the public role still received zero rows. Menu posters were not used for the comparison, and the diagnostic made only GET/SELECT requests and performed zero mutations.

### 3.2 Live Menu follow-up — after manual RLS disablement

On 2026-08-24, after the owner/developer manually disabled RLS on the relevant catalog tables, the same publishable configuration used by the website returned:

| Public query | Literal result |
| --- | --- |
| `categories` explicit-field GET | HTTP 200; 6 rows |
| `items` explicit-field GET | HTTP 200; 16 rows |
| Availability check | 0 unavailable items |
| `items.category_id -> categories.id` mapping check | 0 unmatched items |

The returned categories were Buldak & Sedaap, Cat Treats, Cat-Tastic Bites, Cat-Tastic Drinks, Combos & Packages, and Take-out Box. Representative current rendering included Buldak Carbo from ₱119, Fries (Cat Claws) from ₱30, Matcha (The Lucky Green Neko) from ₱49, Takoyaki (Pawsome Balls) from ₱40, Cat Association from ₱340 with combo descriptions, and Take-out Box at ₱10. Flavors, structured variants, base/flavor prices, combo descriptions, availability, and category relationships passed through the typed mapper with no unmatched item.

The follow-up corrected display handling for a database zero base-price sentinel when real flavor prices exist. Takoyaki now displays `From ₱40` and does not present `₱0` as a customer price. Supabase records remain authoritative; poster prices were not used.

The application and automation made no RLS, policy, schema, menu, product, price, category, variant, availability, inventory, sales, expense, customer, order, or POS data mutation. The owner's manual RLS change is recorded separately and must not be confused with a row-data change.

Detailed fields and relationships are in [`../database-design.md`](../database-design.md).

## 4. Phase 1 Follow-up Findings

| Finding | Phase 2 action | Verification status |
| --- | --- | --- |
| P1-UX-001 — duplicate Menu/View menu header actions | Header now has one `Menu` destination and the separate `Visit us` action links to Contact | TC-P2-004 and TC-P2-022 passed; independent QA remains pending |
| P1-ENV-001 — Windows LF/CRLF Prettier warnings | Added `.gitattributes` with `* text=auto eol=lf`, CRLF rules for Windows command scripts, binary image rules, and Prettier `endOfLine: lf` | `npm run format:check` passed on Windows with `core.autocrlf=true` |

## 5. Automated Case Inventory

Phase 1 regression cases are preserved. Phase 2 cases use IDs `TC-P2-001` through `TC-P2-029` and cover real Home content, favorite-card Menu links, the navigation correction, mobile keyboard behavior, defensive menu mapping/price formatting, zero-base flavor-price display, menu UI success/loading/empty/error/retry/availability states, public configuration, and public-route browser behavior. The final follow-up run passed all 21 Vitest cases in 6 files and all 13 Playwright cases: 5 retained Phase 1 regressions plus 8 Phase 2 browser cases. Exact case mapping and status are in [`../test-cases.md`](../test-cases.md).

## 6. Initial Required Command Record

The following commands ran against the initial Phase 2 implementation and documentation revision on 2026-08-24, before the live-menu follow-up.

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

### 6.1 Follow-up command record

The final follow-up commands produced these observed results:

| Command | Follow-up result | Exit status |
| --- | --- | --- |
| `npm run format:check` | `All matched files use Prettier code style!` | 0 |
| `npm run audit` | `found 0 vulnerabilities` | 0 |
| `npm run lint` | ESLint completed with zero errors and zero warnings | 0 |
| `npm run typecheck` | Next route types generated; `tsc --noEmit` completed | 0 |
| `npm run test` | 6 files passed; 21 of 21 tests passed | 0 |
| `npm run build` | Compiled successfully; 7 of 7 static pages generated | 0 |
| `npm run test:e2e` | Production build passed; Playwright 13 of 13 passed | 0 |
| `python scripts/validate_phase0_docs.py` | 22 Markdown files; 81 FR IDs; 40 NFR IDs; `ERRORS=0`; `PHASE0_DOC_VALIDATION=PASS` | 0 |

Follow-up implementation/evidence commit `4eaeca0` records the verified changes. Hosted push/pull-request workflow results remain pending until that branch update is pushed. Pull Request #2 remains open and unmerged.

## 7. Developer Inspection Evidence

The primary nine-view Chromium evidence set remains under `docs/evidence/phase-2/screenshots/`. The Menu primary captures were regenerated from the live public runtime, and the two earlier unavailable-state captures were retained separately:

- Home at desktop 1440 px and mobile 375 px;
- the live current Menu at desktop 1440 px and mobile 375 px;
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

| Historical Menu state | Before evidence |
| --- | --- |
| Public catalog unavailable — desktop | [`menu-before-public-access-desktop-1440.webp`](phase-2/screenshots/menu-before-public-access-desktop-1440.webp) |
| Public catalog unavailable — mobile | [`menu-before-public-access-mobile-375.webp`](phase-2/screenshots/menu-before-public-access-mobile-375.webp) |

[`responsive-review.json`](phase-2/responsive-review.json) records 20 additional Home/Menu/Gallery/Contact checks across 320, 375, 768, 1024, and 1440 CSS pixels. Every response was expected, all 20 had no horizontal overflow, all nine captures had one `h1`, the skip link existed, images finished loading, and no unexpected console error was recorded.

[`live-menu-review.json`](phase-2/live-menu-review.json) records the unmocked follow-up against the actual publishable runtime. At 320, 375, 768, 1024, and 1440 CSS pixels, all 6 categories and 16 items rendered, document width equalled viewport width, no unexpected console error occurred, the unavailable message was absent, and no ordering control appeared. The four Home/Menu links—one primary link plus the Matcha, Takoyaki, and Fries card links—each resolved to `/menu`.

The developer keyboard inspection observed the skip link as the first Tab stop with a 3 px solid focus outline, Enter moved focus to `MAIN#main-content`, the mobile menu expanded by keyboard, and Escape collapsed it and returned focus to the trigger. A reduced-motion browser context computed a `1e-05s` transition duration. Sampled foreground/background design-token contrast ratios ranged from 5.91:1 to 13.77:1; this is focused implementation evidence, not a full WCAG conformance claim.

The refreshed follow-up secret review passed. `.env.local` remained ignored and untracked; `.env.example` had zero non-empty assignments; application source had zero privileged-variable-name and mutation-call matches; and every real local environment value had zero tracked-file matches. The actual `SUPABASE_SECRET_KEY` value and its variable name had zero matches in `.next/static` and `.next/server/app`. The expected public URL/publishable values appeared in the browser bundle. One literal `sb_secret_` marker came from the locked Supabase client's key-type detection code, not from a credential; the real secret value had zero bundle matches.

### 7.1 Current RLS and public exposure limitation

RLS is currently manually disabled by the owner/developer on the relevant catalog tables. The application still uses the publishable key only, but public reads now depend on table grants rather than a tested least-privilege RLS policy. HEAD-only/no-body public probes found `inventory` (11), `recipe_mappings` (20), `expenses` (76), `orders` (1,942), `order_items` (4,276), and `app_release` (19) reachable. `customers`, `sales`, and `payments` returned HTTP 404, which cannot distinguish absent/unexposed relations from an authorization boundary.

[`public-access-audit.json`](phase-2/public-access-audit.json) records the method and result without credential values or unrelated row bodies. No unrelated row body was retrieved and no write was attempted. This is a production security blocker. Restore RLS and add/test explicit anonymous `SELECT` policies limited to intended public catalog data before deployment; this hardening work is not complete.

The focused P1-UX-001 change also has a verified copy/diff/rollback transaction: [`MODIFIED_FILE`](phase-2/transaction/MODIFIED_FILE), [`DIFF_FILE`](phase-2/transaction/DIFF_FILE), [`VERIFICATION.txt`](phase-2/transaction/VERIFICATION.txt), and executable [`ROLLBACK.sh`](phase-2/transaction/ROLLBACK.sh). Rollback was exercised on a separate copy; the changed application header remained intact.

The zero-base-price follow-up has its own verified copy/diff/rollback transaction under [`phase-2/live-menu-follow-up/transaction/`](phase-2/live-menu-follow-up/transaction/). The rollback was tested on a separate copy while the application change remained applied.

## 8. Independent QA Handoff — Renier

All items are intentionally unchecked. Developer automation does not complete them for the independent reviewer.

### Home and navigation

- [ ] Official logo, business name, warm public hero, Browse Menu and Visit/Contact actions render correctly.
- [ ] Favorite groups, gallery preview, location, operating-hours notice, and social links are factual.
- [ ] Desktop shows one Menu action and no duplicate same-destination CTA.
- [ ] Mobile menu opens/closes, closes after selection, closes with Escape, and restores focus.

### Menu and Supabase

- [ ] The actual live Menu displays 6 current categories and 16 current items through the publishable runtime, without a secret/service-role credential.
- [ ] Current prices, variants/sizes, flavors, descriptions/combos, and availability match current Supabase records; no poster-derived stale price is used.
- [ ] Takoyaki displays `From ₱40`, retains its flavor prices, and does not display the zero base-price sentinel as `₱0`.
- [ ] No POS-hardcoded add-on is presented as authoritative live catalog data; the absent live add-on relation is documented.
- [ ] Loading, empty, error, retry, unavailable, and category-navigation states are clear, keyboard accessible, and usable at representative mobile widths.
- [ ] No poster-derived stale prices or Add to Cart/checkout controls appear.
- [ ] Network/configuration failure exposes no credential or internal error detail.
- [ ] Matcha, Takoyaki, and Fries favorite cards link to `/menu` without exact sales statistics or ordering actions.
- [ ] Desktop 1440 and mobile 375 primary Menu evidence show live data; layouts at 320, 375, 768, 1024, and 1440 have no unintended overflow or unusable wrapping.
- [ ] `.env.local` remains ignored/untracked and no privileged credential appears in source or browser bundles.
- [ ] Documentation accurately states that RLS is manually disabled, unrelated business tables are publicly reachable, and RLS restoration plus least-privilege catalog policies remain a production blocker.

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

**Commits:** `0533bde` line endings; `f3949c3` read-only menu foundation; `4d66f95` public showcase and approved assets; `e03293e` Phase 2 tests; `67a81db` documentation and evidence; `4eaeca0` live-menu verification/fix/evidence
**Pull Request:** [#2 — Phase 2: Build Brew ni Cat public showcase website](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), open and unmerged
**Hosted CI:** Initial push and pull-request workflows for `67a81db` passed; follow-up commit checks pending
**Review:** Pending Renier
**Merge:** Prohibited during implementation handoff
