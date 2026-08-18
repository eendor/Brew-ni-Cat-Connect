# Testing Strategy

**Project:** Brew ni Cat Connect
**Version:** 0.1 Draft
**Date:** 2026-08-18
**Phase:** Phase 0 — Planning and Specification
**Document status:** Draft; test tooling and application code are not yet initialized.

## 1. Current Test Status

As of this draft:

- No application test runner is configured.
- No Brew ni Cat Connect unit, component, integration, end-to-end, performance, accessibility, or security test has been executed.
- No passing test count, coverage result, build result, or continuous-integration result exists yet.
- Planned commands and thresholds below are targets for Phase 1 and later, not recorded results.

Test results must be reported only from an actual execution against an identified commit and environment.

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

When the selected Supabase platform is activated, database and authentication tests will run only against an isolated local or designated test project, never the production database.

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

Playwright will exercise a production-like build and isolated test backend. The initial critical path in Phase 1 is limited to the responsive application shell; ordering workflows are added only when implemented.

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

Before merging a relevant pull request, all applicable checks must pass on the reviewed commit:

1. Format check.
2. Lint.
3. Typecheck.
4. Unit/component/integration tests and configured coverage gate.
5. Relevant Playwright tests.
6. Production build.
7. Security/secret/dependency checks when configured.
8. Required manual accessibility/responsive evidence for UI work.

## 15. Planned Commands

Phase 1 will expose stable package scripts. Proposed command names are:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

CI must call project scripts rather than duplicate hidden command variants. Any necessary service startup, migration, seed, or environment step must be scripted and documented. None of these commands has been executed for application code during Phase 0.

## 16. Continuous Integration Strategy

When GitHub CI is configured, the planned pull-request pipeline will:

1. Check out the exact commit and install the pinned runtime/dependencies from the lockfile.
2. Run format, lint, and type checks.
3. Run unit, component, and isolated integration tests with coverage.
4. Build the production application.
5. Run relevant Playwright tests against the built application.
6. Run configured secret and dependency checks.
7. Upload limited failure evidence and test reports with a documented retention period.

Protected secrets must not be made available to untrusted pull-request code. Production deployment remains a separate environment-gated job. CI status is not considered evidence until the workflow exists and a linked run has completed.

## 17. Test Case and Evidence Records

Detailed cases will be maintained in `docs/test-cases.md` with stable IDs such as `TC-001` and columns:

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

Where practical, store compact text reports under a dated documentation evidence location. Large traces, videos, and screenshots should use CI/GitHub artifacts or approved storage with a stable link and retention note. Do not commit secrets, real customer data, or excessive binary evidence.

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
| Phase 1 — Foundation | Tooling configured; sample behavior test; lint, typecheck, tests, and production build executed; responsive shell manually checked |
| Phase 2 — Public showcase | Public navigation/content states, responsive behavior, accessibility, and media performance checked |
| Phase 3 — Menu/ordering | Critical calculation, product-configuration, cart, checkout-form/domain validation, and pre-submission journey cases pass; no persisted order is claimed before the backend exists |
| Phase 4 — Backend/accounts | Migration, auth, RLS cross-user denial, server validation, transaction, idempotent order creation, and recovery cases pass in isolation |
| Phase 5 — Customer experience | History, tracking, favorites, reorder, loyalty, concurrency, and authorization cases pass |
| Phase 6 — POS integration | Contract, source-of-truth, replay, conflict, offline/failure, security, and non-production integration cases pass |
| Phase 7 — Messenger | Webhook verification, policy flow, minimization, uncertain response, handoff, and backend contract cases pass |
| Phase 8 — Android | Shared contract, authentication, secure storage, device compatibility, offline/error, and critical journey cases pass |
| Phase 9 — QA | Full regression, security, accessibility, performance, inspection, peer review, and owner UAT evidence completed |
| Phase 10 — Deployment | Production configuration verification, smoke tests, monitoring, restore readiness, and documentation validated |

## 21. Review and Evolution

This strategy is reviewed whenever requirements, architecture, supported clients, data handling, POS integration, or a third-party service changes. Material changes require an entry in `docs/decisions.md`. Actual commands, versions, coverage exclusions, browser targets, and CI links will replace proposed details as the implementation provides evidence.
