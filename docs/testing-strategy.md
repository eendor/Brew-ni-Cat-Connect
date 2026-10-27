# Testing Strategy

**Project:** Brew ni Cat Connect
**Version:** 0.1 Draft
**Original date:** 2026-08-18
**Last updated:** 2026-10-18
**Phase:** Living strategy through Phase 3
**Document status:** Phase 1 evidence is complete and merged. Phase 2 live public Menu verification, the final local quality-gate rerun, and both hosted workflows for evidence head `975561b` passed. Pull Request #2 merged on 2026-09-16 as `ae002f1` after Renier's independent QA (Pull Request #6); the RLS-disabled production security blocker remains open. Phase 3 verification is in §23.

## 1. Current Test Status

The original Phase 0 baseline contained no application runtime or test result. Phase 1 now provides the first implemented test baseline:

- Vitest, Testing Library, `jest-dom`, and a JSDOM environment are configured for unit/component tests.
- Playwright is configured for Chromium smoke tests against a production build.
- Four unit/component tests in two files and five Playwright tests passed locally on 2026-08-23.
- The Playwright responsive matrix covered widths of 320, 375, 768, 1024, and 1440 CSS pixels without horizontal document overflow.
- Lint, explicit type checking, production build, and the dependency audit exited successfully.
- A clean temporary-directory `npm ci` added 477 packages, audited 478 packages, and found zero vulnerabilities using only `package.json` and `package-lock.json`; `npm ci --dry-run` also exited successfully.
- The coverage run reported 96% statements, 88.88% branches, 100% functions, and 95.65% lines. This report covers only source units imported by the current foundation tests; it is not whole-application coverage.
- Four Phase 1 review screenshots and developer inspections were retained. Renier subsequently completed independent manual QA and peer review with no blocking defect; Pull Request #1 was approved and merged as `11c546d`.
- GitHub Actions is configured for format, lint, typecheck, unit/component test, and production-build validation. A remote workflow result is not claimed until the feature branch/PR workflow has completed.

The detailed cases and reproducible local evidence are in `docs/test-cases.md` and `docs/evidence/phase-1-verification.md`. Test results remain valid only for the identified working tree/commit and environment. Phases 2 and 3 extend this baseline; their status is in §22 and §23.

## 2. Objectives

The test program will:

1. Demonstrate that each implemented functional requirement meets measurable acceptance criteria.
2. Protect high-risk business rules such as totals, customization, order submission/state, loyalty, authorization, and synchronization.
3. Verify customer-visible behavior across supported mobile and desktop environments.
4. Detect security, privacy, accessibility, compatibility, and reliability regressions before release.
5. Provide reproducible evidence for academic evaluation, code review, and maintenance.
6. Keep feedback fast enough that developers run relevant checks locally before opening a pull request.

## 3. Test Levels and Planned Tools

| Level | Primary tool | Scope | Examples | Execution timing |
| --- | --- | --- | --- | --- |
| Static checks | TypeScript, ESLint, formatter | Types, unsafe patterns, consistency | Strict type errors, lint rules, formatting drift | Local and every pull request |
| Unit | Vitest | Pure domain and utility behavior | Cart totals, option validation, order transitions, loyalty calculations | Local watch mode and every pull request |
| Component | Vitest + Testing Library + DOM test environment | User-observable component behavior | Menu filtering, cart quantity controls, form errors, keyboard interaction | Every relevant pull request |
| Server/integration | Vitest plus controlled test services/adapters | Route/action, database, auth, RLS, transactions, webhooks | Order creation, cross-user denial, duplicate request handling | Every relevant pull request; isolated environment |
| End-to-end | Playwright | Critical workflows in a production-like build | Browse, customize, cart, checkout, authentication, tracking | Pull request for affected flows and pre-release |
| Accessibility | Testing Library queries, automated accessibility tooling when selected, Playwright/manual checks | Semantics, names, keyboard, focus, contrast/reflow | Navigation, dialog, checkout validation, live status | During feature work and pre-release |
| Performance | Framework metrics and a selected browser auditing tool | Mobile loading and interaction budgets | Home/menu load, image/font weight, layout stability | Baseline after UI exists; release regression checks |
| Security | Unit/integration/E2E plus dependency/secret scanning and manual review | Authorization, validation, RLS, secrets, abuse controls | Customer A cannot read customer B order; forged webhook rejected | Every relevant change and pre-release |
| User acceptance | Owner-approved scripted scenarios | Business fit and usability | Menu representation, pickup flow, staff handling | Before production release |

The project will not use every tool immediately. Add and document a dependency only when the corresponding test layer is implemented.

## 4. Test Pyramid and Ownership

- Keep most business-rule cases as fast deterministic Vitest unit tests.
- Use Testing Library for behavior that depends on rendering and user interaction; query by accessible role/name where practical.
- Use integration tests where confidence depends on real database constraints, authorization policies, transactions, or framework boundaries.
- Reserve Playwright for critical cross-layer journeys and browser-specific behavior rather than duplicating every unit case.
- A feature author owns initial automated tests and evidence. A named peer reviewer evaluates adequacy; self-review does not count as academic peer-review evidence.
- Failed or flaky tests remain visible work. They are not silently skipped or weakened.

## 5. Risk-Based Priority

| Priority | Area | Principal failure risk | Minimum planned evidence |
| --- | --- | --- | --- |
| Critical | Authentication and authorization | Account takeover or cross-customer access | Unit/integration denial cases; RLS role matrix; critical E2E path |
| Critical | Checkout and order creation | Wrong total, duplicate/lost order, false confirmation | Calculation boundary tests; transaction/idempotency integration tests; E2E submission |
| Critical | Order status transitions | Invalid or misleading status | Complete transition-table unit tests; role-aware integration tests |
| Critical | Loyalty and rewards | Incorrect balance or unauthorized adjustment | Calculation/property boundaries; transactional and authorization tests |
| High | Product configuration/menu availability | Customer orders an invalid/unavailable combination | Schema/domain tests; component behavior; integration validation |
| High | POS synchronization | Duplicates, conflicts, stale status, privileged exposure | Contract, replay, conflict, offline/failure, and authorization tests in non-production |
| High | Messenger/webhooks | Forged calls, privacy leak, incorrect action | Signature/replay tests, minimization review, contract tests |
| High | Privacy and logs | Unnecessary collection or personal data leakage | Data-flow review, redaction tests, evidence inspection |
| Medium | Public content and discovery | Broken navigation or misleading placeholder content | Component/E2E responsive and accessibility checks |
| Medium | Gallery/media | Poor performance or inaccessible content | Image behavior, alternative text, loading/performance checks |

Only implemented scope is tested. Deferred features receive detailed cases when their requirements and design are approved.

## 6. Unit Testing with Vitest

Unit tests should:

- Exercise public behavior with arrange-act-assert or an equally clear pattern.
- Cover happy paths, boundaries, invalid values, empty inputs, and invariant violations.
- Use table-driven tests for order transitions, option combinations, quantities, reward thresholds, and similar matrices.
- Freeze time and control randomness/identifiers where output depends on them.
- Avoid networks, the system clock, developer machines, and shared mutable state.
- Avoid asserting internal calls unless the call itself is the contract.
- Include regression coverage with each meaningful defect fix when practical.

Initial candidates after their requirements are implemented include product filtering, cart quantities/totals, customization validation, checkout validation, order transitions, loyalty calculations, and reward eligibility.

## 7. Component Testing with Testing Library

Component tests should model how a customer perceives and operates the interface:

- Query by role, accessible name, label, or visible text before using test IDs.
- Interact through a user-event abstraction rather than directly invoking handlers.
- Assert loading, empty, error, success, disabled, and recovery states where relevant.
- Verify keyboard operation, focus movement/return, form labels, error associations, and status announcements.
- Do not make broad snapshots the primary proof of behavior; narrow snapshots may document stable structured output when reviewed intentionally.
- Test responsive logic at the appropriate layer; layout appearance still requires browser/manual evidence.

## 8. Integration and Supabase Testing

Phase 2 tests mock the typed public menu loader/row mapper and do not mutate or seed production. The controlled live check is `SELECT`-only and compares representative public catalog behavior. Future database/authentication/write tests must use an isolated local or designated test project, never production.

The integration suite will verify:

- Migrations apply cleanly from an empty database and upgrade from the supported previous state.
- Constraints, foreign keys, indexes, timestamps, and transaction behavior match `docs/database-design.md`.
- RLS is enabled before exposed user data becomes reachable.
- Anonymous, customer A, customer B, staff, and trusted integration roles have exactly the intended operations.
- Cross-customer reads and writes are denied, including guessed IDs.
- User-editable metadata cannot elevate privileges.
- Direct changes to authoritative price, order state, loyalty balance, and ownership fields are denied to customers.
- Storage-bucket access rules are tested independently.
- Order creation and loyalty updates behave atomically under failure and concurrency.
- Service-role credentials remain server-only and are never required by public-client tests.

Seed data must be deterministic, synthetic, minimal, and labeled `MOCK DATA — FOR DEVELOPMENT ONLY`. Each run must create or reset its own known state without modifying production data.

## 9. End-to-End Testing with Playwright

Playwright exercises a production build. Phase 2 expands the shell regression to real Home/About/Gallery/Contact/Menu/404 content, navigation and representative-width overflow; unit/component tests inject deterministic menu loaders. Ordering workflows are added only when implemented. Phase 3 adds the browser-side order journey up to the send-to-shop summary and a separate `chromium-3d` project for the 3D layer (§23).

Planned journeys by phase include:

1. Public visitor opens the site, uses mobile/desktop navigation, and reaches core public sections.
2. Customer browses and filters the menu, configures a valid product, and updates the cart.
3. Invalid checkout input is explained and focus is placed appropriately.
4. Valid pickup order is submitted once, receives a confirmed reference only after authoritative success, and can be tracked.
5. Customer registers/signs in, recovers an account, and accesses only their own orders/profile.
6. Customer earns/redeems loyalty according to approved rules, including ineligible cases.
7. Integration failure produces a recoverable, truthful state rather than a false success.

Use resilient role/name/label selectors and stable explicit identifiers only when no semantic selector fits. Avoid fixed sleeps; wait for observable state. Capture trace, screenshot, or video on failure according to CI retention settings, with personal data redacted or synthetic.

## 10. Browser, Device, and Responsive Coverage

The support matrix will be finalized in non-functional requirements and reviewed against analytics only after privacy-approved analytics exists. Proposed minimum browser coverage is:

- Chromium-based current supported version for routine CI.
- Firefox current supported version for critical workflows.
- WebKit current supported version as a proxy for mobile Safari behavior.
- Manual verification on at least one representative Android phone and, when available, an iOS/Safari device before production release.
- Narrow mobile, tablet, common laptop, and wide desktop viewports, including orientation changes where relevant.

Checks include keyboard-only use, 200% zoom/reflow, reduced motion, touch usability, slow-network/loading behavior, and long/empty/error content. Emulator results do not replace all real-device checks.

## 11. Accessibility Testing

The target is WCAG 2.2 Level AA as defined in `docs/development-standards.md`.

Automated checks are necessary but not sufficient. Evidence for critical pages must combine:

- Semantic Testing Library queries and accessible-name assertions.
- Automated rule checks through a selected, documented tool when configured.
- Keyboard navigation and visible-focus inspection.
- Focus management for navigation, dialogs, validation errors, and route/status changes.
- Contrast, non-color cues, zoom/reflow, reduced-motion, and touch-target inspection.
- Representative screen-reader checks for account, cart, checkout, and tracking workflows when those flows exist.

Accessibility findings receive a bug ID and severity. Critical-path barriers block release unless formally risk-assessed and approved.

## 12. Security and Privacy Testing

Security tests trace to `docs/security-and-privacy.md` and include:

- Authentication enumeration, recovery, session expiry/revocation, and rate-limit behavior.
- Authorization tests for every protected entity and operation, especially cross-customer denial.
- Runtime validation using malformed, oversized, unexpected, and injection-like inputs.
- Webhook signature, timestamp, replay, and idempotency cases.
- Secret scanning, dependency advisories, and inspection of browser/Android production bundles.
- Log tests confirming tokens, authorization headers, customer payloads, and provider secrets are redacted.
- Security-header, cookie/session, CORS/origin, HTTPS, and redirect configuration checks in deployment.
- Backup restore and data-integrity exercises before production launch.
- Data minimization, retention/deletion, data-subject request, vendor, and privacy-notice procedure reviews.

Automated findings require triage; a green scanner does not replace threat modeling or code review.

## 13. Test Data and Environment Rules

- Maintain separate local, test/preview, and production environments with separate credentials and datasets.
- Tests must never call production services or mutate production POS/customer records.
- Use generated synthetic identities and orders; never copy real customer data into fixtures.
- Store non-secret fixture builders in source control, not environment-specific dumps.
- Make tests reproducible by controlling time, locale, timezone, currency representation, random IDs, and feature flags where applicable.
- Clean up per-run data or reset the isolated service to a known state.
- Mask secrets and personal data in CI logs and artifacts.
- Third-party sandbox use must be documented and must not contain real business credentials in repository files.

## 14. Coverage and Quality Gates

Coverage measures test reach, not correctness. Initial proposed thresholds, to be activated after a meaningful application baseline exists, are:

- At least 80% statements/lines/functions and 75% branches for testable TypeScript application code.
- Complete decision-path coverage for critical pure business rules such as totals, order transitions, and loyalty calculations.
- Explicit exclusion review for generated code, framework wiring, and justified non-testable entry points.

Thresholds may be adjusted only through an evidence-based decision; they must not be lowered merely to merge a change.

The 2026-08-23 Phase 1 coverage command reported 96% statements, 88.88% branches, 100% functions, and 95.65% lines for the source files imported by the two current test files. Vitest is not yet configured to include every `src/` file in the denominator, so this is useful targeted evidence rather than proof that the whole application meets the proposed threshold. Whole-source inclusion and an enforced coverage gate will be introduced only after the codebase has enough testable application logic to make the metric representative.

Before merging a relevant pull request, all applicable checks must pass on the reviewed commit:

1. Format check.
2. Lint.
3. Typecheck.
4. Unit/component/integration tests and configured coverage gate.
5. Relevant Playwright tests.
6. Production build.
7. Security/secret/dependency checks when configured.
8. Required manual accessibility/responsive evidence for UI work.

## 15. Implemented Commands

Phase 1 exposes these stable package scripts:

```text
npm run format:check
npm run audit
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

CI calls project scripts rather than duplicating hidden command variants. The Phase 1 lint, typecheck, test, coverage, E2E, and build commands were executed locally on 2026-08-23 and exited `0`; the literal summaries are recorded in `docs/evidence/phase-1-verification.md`. A lockfile-only clean-install reproduction and `npm ci --dry-run` also exited `0`. Formatting remains a required final/CI check and must be reported from its own completed run. The Phase 0 statement that no application command had run remains a historical fact for that completed phase.

## 16. Continuous Integration Strategy

Phase 1 implements `.github/workflows/ci.yml` for pushes to `main` and `feat/**` branches and pull requests targeting `main`. The job selects Python 3.14, Node.js 24, and the manifest-pinned npm 12.0.2, then runs:

1. `npm ci`
2. `npm run audit`
3. `npm run format:check`
4. `python3 scripts/validate_phase0_docs.py`
5. `npm run lint`
6. `npm run typecheck`
7. `npm run test`
8. `npm run build`

In Phase 1, Playwright was intentionally omitted from the hosted lightweight workflow to avoid installing and caching browser binaries on every run. `npm run test:e2e` remains a required local pre-review check, and its passing Chromium result is recorded in the Phase 1 verification evidence. The team can add browser CI when critical customer workflows make the added execution cost proportionate.

Phase 3 added a second job, `Browser tests (chromium)`, which builds the app and runs `npx playwright test --project=chromium` on the same triggers. Since PR #59 it downloads only the Chromium headless shell, because CI runs headless, and skips the apt install of system packages unless Chromium can't start without them. The runner image already has Chromium's libraries, and the packages Playwright adds are mostly fonts that no assertion depends on (there are no screenshot comparisons). Before this change, the install step took 20 to 28 seconds on a normal run, and one run on 2026-10-26 took 8 min 40 s because the Ubuntu mirror sent those packages at 50 kB/s.

The workflow grants only read access to repository contents, has a 15-minute timeout, and cancels superseded runs for the same workflow/ref. No protected application credentials are required because Phase 2 catalog retrieval starts in the browser at runtime, while automated tests mock or intercept the catalog boundary and the build does not call Supabase. Since PR #23 the build downloads the Big Shoulders and Archivo fonts from Google Fonts through `next/font/google`, so it needs network access, though still no credential. Production deployment remains separate and unconfigured. A local result is not represented as a GitHub Actions result; a linked remote run must complete before CI is marked passed.

## 17. Test Case and Evidence Records

Detailed cases are maintained in `docs/test-cases.md`. Phase 1 uses stable IDs `TC-P1-001` through `TC-P1-009` and the columns:

| ID | Requirement ID(s) | Module | Scenario | Preconditions | Input | Expected result | Actual result | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Permitted status values:

- **Not Run:** specified but no execution evidence exists.
- **Passed:** actual result matched expected result in the linked execution.
- **Failed:** actual result did not match expected result.
- **Blocked:** execution could not complete; the exact blocker is recorded.
- **Deferred:** approved scope is not yet implemented or scheduled.

Every meaningful test run record must include:

```text
Date/time and timezone:
Tester or CI workflow:
Git commit:
Branch / pull request:
Environment and relevant versions:
Exact command or manual procedure:
Test-data identifier (synthetic):
Literal summary output:
Total / passed / failed / skipped:
Exit status:
Evidence path or run link:
Related bugs:
```

The Phase 1 command record is stored at `docs/evidence/phase-1-verification.md`, and its compact responsive screenshots are stored under `docs/evidence/phase-1/screenshots/`. Large traces, videos, and future repeated evidence should use CI/GitHub artifacts or approved storage with a stable link and retention note. Do not commit secrets, real customer data, or excessive binary evidence.

## 18. Defect, Regression, and Flaky-Test Handling

- Record meaningful defects in `docs/bug-report.md` using the required bug ID and reproduction fields.
- Add a failing regression test before or with the fix when technically practical, then record the passing verification against the fixed commit.
- Triage failures by customer/business impact, security/privacy exposure, data integrity, reach, and reproducibility.
- Quarantine is a temporary last resort for a confirmed flaky test: document owner, issue, reason, scope, and removal date. The critical path must not depend on quarantined coverage.
- Never use retries to hide deterministic defects. A retry may gather evidence or mitigate verified environmental instability only when the root cause is tracked.
- Preserve unexpected failures and resolution in the development log; do not rewrite history as if the first run passed.

## 19. User Acceptance Testing

Before production launch, Brew ni Cat's authorized business representative will validate owner-approved scenarios and real business information in a controlled environment. Candidate areas include public content accuracy, menu presentation, customization, pickup handling, order states, loyalty policy, customer support text, and POS workflow. The representative, date, environment, expected result, actual result, finding, and sign-off status must be recorded. Owner approval is not inferred from technical test success.

## 20. Phase Test Gates

| Phase | Minimum testing outcome before completion |
| --- | --- |
| Phase 0 — Specification | Strategy reviewed for consistency; all test results remain truthfully `Not Run` |
| Phase 1 — Foundation | 4 unit/component and 5 Chromium E2E tests, static/build gates, developer inspection, independent Renier QA, and peer review completed; Pull Request #1 merged as `11c546d`. |
| Phase 2 — Public showcase | Real content/navigation/media and typed menu mapping success/loading/empty/error/availability states are covered; build remains live-service independent; publishable runtime returned and rendered the current 6-category/16-item catalog at five widths; the final follow-up gates and refreshed secret/bundle scans passed; independent Renier QA passed (Pull Request #6) and Pull Request #2 merged as `ae002f1`; RLS restoration/least-privilege policy work remains required before production. |
| Phase 3 — Menu/ordering | Critical calculation, product-configuration, cart, checkout-form/domain validation, and pre-submission journey cases pass; no persisted order is claimed before the backend exists. These cases pass for the merged browser-side flow (§23). |
| Phase 4 — Backend/accounts | Migration, auth, RLS cross-user denial, server validation, transaction, idempotent order creation, and recovery cases pass in isolation |
| Phase 5 — Customer experience | History, tracking, favorites, reorder, loyalty, concurrency, and authorization cases pass |
| Phase 6 — POS integration | Contract, source-of-truth, replay, conflict, offline/failure, security, and non-production integration cases pass |
| Phase 7 — Messenger | Webhook verification, policy flow, minimization, uncertain response, handoff, and backend contract cases pass |
| Phase 8 — Android | Shared contract, authentication, secure storage, device compatibility, offline/error, and critical journey cases pass |
| Phase 9 — QA | Full regression, security, accessibility, performance, inspection, peer review, and owner UAT evidence completed |
| Phase 10 — Deployment | Production configuration verification, smoke tests, monitoring, restore readiness, and documentation validated |

## 21. Review and Evolution

This strategy is reviewed whenever requirements, architecture, supported clients, data handling, POS integration, or a third-party service changes. Material changes require an entry in `docs/decisions.md`. The Phase 1 addendum records actual local commands, current coverage scope, Chromium target, and CI boundary without rewriting the Phase 0 planning history. Future CI links and broader browser/manual results replace `Not Run` entries only after those checks occur.

## 22. Phase 2 Verification Addendum

### Automated scope

Vitest/Testing Library covers the official Home content and absence of Phase 1 placeholders; one Menu navigation action and distinct Visit action; all three favorite-card links to `/menu`; mobile selection/Escape/focus behavior; catalog mapping from nullable/pipe/JSON rows; Philippine peso formatting; combo description and unavailable status; malformed-data omission; Menu loading, ready, empty, failure, and retry states; and zero-base flavor-priced presentation without a fabricated `₱0`. Tests inject deterministic loaders and contain no production credential/value. The final follow-up run passed all 21 unit/component cases in 6 files.

Playwright retains the 404 and five responsive widths (320, 375, 768, 1024, and 1440) while exercising the real routes, logo/navigation, business facts, gallery images/alt text, and no horizontal overflow. Deterministic intercepted tests continue to exercise success, loading/empty, and error states. Separate unmocked live evidence must use the actual publishable runtime rather than present fixtures as live data.

### Live read-only check

A live check must use the public runtime identity and compare representative category/item names, variants/sizes, flavor-specific prices, optional combo descriptions, and availability against current Supabase records. The initial 2026-08-24 discovery returned HTTP 200 with zero rows; that is retained as **BEFORE** failure-state evidence.

After RLS was manually disabled on the relevant catalog tables, the same publishable runtime returned 6 categories and 16 items, with 0 unavailable items and 0 unmatched relationships. Unmocked `/menu` inspection at 320, 375, 768, 1024, and 1440 rendered all current records with zero body overflow and zero console errors. `docs/evidence/phase-2/live-menu-review.json` is the machine-readable result. Current Supabase records, not posters, are the expected-result source.

This functional pass is not authorization acceptance. HEAD-only/no-body probes found unrelated business tables publicly reachable, and public writes were not tested. Never run mutation tests against production. Restore RLS and prove intended catalog-only anonymous `SELECT` access plus denial of unrelated tables/writes through an approved policy test before production.

### Evidence and status

`docs/evidence/phase-2-implementation.md` is the handoff record. It distinguishes initial and follow-up observations and records command summaries, counts, exit statuses, screenshot paths, commits, open [Pull Request #2](https://github.com/eendor/Brew-ni-Cat-Connect/pull/2), and hosted workflow results. The final local follow-up commands passed, implementation/evidence commit `4eaeca0` exists, and both hosted workflows for evidence head `975561b` passed. The live Pull Request check rollup remains authoritative for the metadata-only evidence update. Automated success moves the card to Testing / Review, not Done; the security blocker remains open and Renier's independent results stay unchecked until performed.

**Merge update:** Renier's independent QA then passed with the result "PASS FOR PHASE 2 MERGE WITH KNOWN PRE-PRODUCTION SECURITY FOLLOW-UP" ([`phase-2-qa-report.md`](phase-2-qa-report.md), Pull Request #6), and Pull Request #2 merged on 2026-09-16 as `ae002f1`. The RLS security blocker above remains open.

## 23. Phase 3 Verification Addendum

### Automated scope

Phase 3 adds the browser-side ordering flow and the 3D and motion layer. The whole Vitest suite now runs 152 tests in 21 files. In [`test-cases.md`](test-cases.md), §10 covers cart pricing, the cart reducer and the cart selectors; §11 covers menu photos, the menu loading and tab states, and the checkout validation and copy cases; and §12 covers the 3D and motion layer with its static fallbacks and cart-toss bridge, the order dialog, the checkout copy result and stored summary, the phone checks, the rider delivery flow, the decorative social/contact icons (`TC-P4-030`–`TC-P4-035`), the GCash QR (`TC-P4-036`–`TC-P4-037`) and the Menu 3D viewer with the Contact sign fit (`TC-P4-038`–`TC-P4-058`). The tests inject deterministic catalogs and contain no credential value. `tests/setup.ts` clears public Supabase settings so unit tests never fetch the live menu when those variables are in the shell.

Playwright runs two projects against the production build:

| Project | Specs | Settings | What it checks |
| --- | --- | --- | --- |
| `chromium` | `foundation`, `menu`, `phone` and `showcase` | Desktop Chrome with reduced motion; the phone cases switch to a Pixel 7 profile | Routes, menu states and the order journey on the static render, without animation timing |
| `chromium-3d` | `three.spec.ts` | Desktop Chrome with motion allowed and software WebGL (SwiftShader), a 180 s timeout and tests run one after another; one group uses a Pixel 7 profile and one turns reduced motion back on | The 3D layer draws real pixels, falls back with reduced motion, and leaves ordering usable |

The follow-up run on 2026-10-18 passed 25/25: 16 in `chromium` and 9 in `chromium-3d`. TC-P4-023 to TC-P4-026 were added in that run: a whole order tapped through on a phone profile, sideways scrolling and 44 px tap targets on seven routes at 412, 390 and 360 px, the 3D layer at phone quality, and the checkout heading after its split entrance. The rider-flow run on 2026-10-18 also passed 25/25. In it, TC-P1-009 renders the menu's category bar with one mocked category and compares the page width with the layout width instead of `clientWidth`, which the stable scrollbar gutter makes 15 px wider in headless Chromium. The menu 3D run on 2026-10-20 passed 32/32: 16 in `chromium` and 16 in `chromium-3d`. TC-P4-052 to TC-P4-058 were added in that run: the 3D viewer from drag to order, a tour of every item's sizes and flavors in four groups, the viewer on a phone profile, and the Contact sign checked at both edges at 1280 and 960 px. TC-P4-058 also failed, as it should, on a build with the old Contact camera. The phone tier run on 2026-10-25 passed 17/17 in `chromium-3d`. TC-P4-128 was added in that run: on a Pixel 7 profile the home showcase is marked `lite`, draws at a pixel ratio of at most 1 and downloads only the half-size HDRI. Playwright still runs only locally (§16).

### Manual checks

MAN-P4-003, a click-through on the development laptop's integrated GPU, passed on 2026-10-18 on five profiles: 1440 px, 1024 px, an iPad Mini profile with a 2× slower CPU, 390 px, and a Pixel 7 profile with a 4× slower CPU. Every page and the full order flow worked, with no console errors and no sideways scrolling. The tablet and phones held 60 fps idle and about 35–56 fps while scrolling; at 1440 px the home and menu heroes ran at 22–31 fps, and the order-summary scene stalls once, for about a second, when it first starts. These frame rates are observations, not a signed-off target: the Lighthouse method that NFR-001 calls for has not been run. MAN-P4-008, a visual review of the rider flow on the cart, checkout and contact pages from 1440 px down to 320 px, passed on 2026-10-18. MAN-P4-009, a narrow-width review of the social and contact icons, is still to do. MAN-P4-007, a click-through on a physical phone, is still to do and now includes the rider flow.

### Evidence and status

[`evidence/phase-3-verification.md`](evidence/phase-3-verification.md) lists each merged Phase 3 pull request with its evidence and results. Checkout ends in a summary that the customer copies and sends to the shop; no order is stored or sent to a server, so no persisted order is claimed (§20). The RLS blocker in §22 still stands.
