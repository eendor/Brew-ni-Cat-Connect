# Development Standards

**Project:** Brew ni Cat Connect
**Version:** 0.1 Draft
**Date:** 2026-08-23
**Phase:** Phase 1 — Project Foundation
**Document status:** Draft specification with the Phase 1 web toolchain implemented; teammate QA and pull-request review are pending.

## 1. Purpose and Current State

These standards define how Brew ni Cat Connect will be designed, implemented, reviewed, tested, and documented. They apply to web code, shared backend code, database changes, future integrations, test code, scripts, and documentation.

The Phase 1 web foundation uses **Next.js App Router with React and strict TypeScript**, styled with Tailwind CSS project tokens. Exact installed dependency versions are recorded in `docs/software-and-apis.md` and locked in `package-lock.json`. Local formatter, lint, type-check, unit/component test, end-to-end test, coverage, and production-build commands are configured; command outcomes are reported only in dated test evidence and the development log. GitHub Actions performs the lightweight pull-request validation gate, while Playwright remains a required local Phase 1 check.

Normative language:

- **Must:** required for merge unless a documented exception is approved.
- **Should:** expected; departures need a clear reason in the pull request.
- **May:** optional and context-dependent.

## 2. Engineering Principles

1. Implement the smallest requirement-complete change; do not anticipate unapproved scope.
2. Keep public website, ordering domain, infrastructure, and external integrations separated by explicit boundaries.
3. Prefer straightforward, typed, testable code over speculative abstractions.
4. Validate at every trust boundary and keep authoritative decisions on the server.
5. Use accessible, mobile-first interfaces and progressively enhance them.
6. Keep production data, secrets, and owner-unconfirmed business information out of source and fixtures.
7. Update requirements, decisions, tests, and user/developer documentation with the behavior they describe.
8. Treat warnings, flaky tests, and bypassed checks as engineering work, not as acceptable background noise.
9. Apply SOLID principles proportionally where they improve cohesion, substitution, interface clarity, dependency direction, or testability; do not add abstraction layers only to satisfy a label.

## 3. Phase 1 Repository Structure

The implemented foundation uses this deliberately small structure:

```text
src/
  app/             App Router pages, root layout, global styles, and state boundaries
  components/
    layout/        Reusable site shell and navigation components
    ui/            Small shared presentation primitives
  config/          Typed project-owned public configuration
tests/
  unit/            Vitest and Testing Library behavior tests
  e2e/             Playwright browser smoke tests
  setup.ts         Shared DOM matcher and cleanup setup
public/            Static, optimized public assets when a phase introduces them
docs/              Version-controlled project documentation
.github/workflows/ Pull-request and branch validation
```

Rules:

- Add `features/`, `domain/`, or infrastructure directories only when an approved capability needs them; Phase 1 does not create empty architecture placeholders.
- Prefer feature-local code until it is demonstrably shared.
- When a domain layer is introduced, do not import route/UI concerns into it.
- Wrap external providers behind narrow project-owned interfaces where this improves testability or prevents vendor concepts from spreading.
- Avoid generic `utils` dumping grounds. A module name must communicate its responsibility.
- Use path aliases only when configured consistently for TypeScript, tests, lint, and build.

## 4. TypeScript Standards

- Enable TypeScript strict mode and keep it enabled.
- Keep `allowJs: false`, `noEmit: true`, `noUncheckedIndexedAccess: true`, and `noFallthroughCasesInSwitch: true` unless a documented compatibility decision requires a change.
- Use the configured `@/*` alias for imports rooted in `src/`; do not introduce competing aliases.
- Do not introduce implicit `any`. Explicit `any` requires a localized explanation and a follow-up issue when it cannot be removed immediately.
- Prefer `unknown` for untrusted values, then narrow through validation or type guards.
- Do not use unsafe non-null assertions to silence an unhandled state.
- Model finite domain states with literal unions or discriminated unions rather than unrelated booleans.
- Keep public function/component interfaces small and intentionally exported.
- Prefer immutable inputs and `readonly` data where mutation is not part of the contract.
- Use `satisfies` when it validates a structure without unnecessarily widening its inferred type.
- Avoid TypeScript `enum` unless interoperability requires it; prefer `as const` objects or literal unions.
- Generate or centrally define database/API types where supported; do not maintain divergent hand-written copies without a reason.
- Parse dates, money, identifiers, and external payloads at the boundary. A TypeScript type alone does not validate runtime data.

### Naming

| Item                                        | Convention                       | Example                         |
| ------------------------------------------- | -------------------------------- | ------------------------------- |
| React component, type, interface            | `PascalCase`                     | `OrderSummary`                  |
| Function, variable, hook                    | `camelCase`                      | `calculateCartTotal`, `useCart` |
| Constant with truly global/static semantics | `UPPER_SNAKE_CASE`               | `MAX_CART_QUANTITY`             |
| File containing a React component           | `kebab-case.tsx`                 | `order-summary.tsx`             |
| General TypeScript module                   | `kebab-case.ts`                  | `order-transition.ts`           |
| Test                                        | source name plus `.test`/`.spec` | `order-transition.test.ts`      |
| Playwright test                             | behavior name plus `.spec.ts`    | `guest-ordering.spec.ts`        |
| Environment variable                        | `UPPER_SNAKE_CASE`               | `SUPABASE_SERVICE_ROLE_KEY`     |

Use business vocabulary from the approved requirements. Avoid abbreviations and generic names such as `data`, `item`, `manager`, or `helper` when a precise name exists.

## 5. Next.js and React Standards

- Use the Next.js App Router selected by the project architecture.
- Prefer Server Components for non-interactive rendering and data access. Add `"use client"` only at the smallest boundary that requires browser state, effects, or event handlers.
- Never import server-only modules, credentials, or privileged database clients into a Client Component.
- Keep route handlers and server actions thin: validate input, authorize, invoke domain/application logic, translate the result, and record safe telemetry.
- Do not trust hidden fields, route parameters, cookies, client totals, or client-supplied ownership.
- Use framework metadata, optimized images/fonts, and caching intentionally. Document freshness and invalidation for menu availability and order status.
- Provide route-level loading, empty, not-found, and error experiences where applicable.
- Components should have one clear purpose. Prefer composition to large prop/configuration surfaces.
- Store essential business state on the authoritative backend; do not make browser state the source of truth for accepted orders, prices, loyalty, or status.
- Use effects only for synchronization with external systems, not for derived values that can be computed during render.
- Use semantic HTML before ARIA and native controls before custom controls.

## 6. Formatting, Linting, and Static Analysis

Phase 1 configures and pins this automated baseline:

- ESLint with the supported Next.js and TypeScript rules.
- Prettier for deterministic formatting, unless a documented decision selects one consolidated formatter/linter instead.
- TypeScript compiler checks with no emit for validation.
- Framework production build as a separate check.

Standards:

- Formatting is tool-controlled; do not manually debate formatting already covered by the formatter.
- No lint or TypeScript error may be suppressed globally to land a change.
- A localized suppression must include a reason and, when temporary, a tracked cleanup reference.
- Do not weaken strict compiler/linter settings merely to make a check pass.
- Generated files must be identified and excluded or handled through their generator, not manually edited.

Available local scripts:

```text
npm run format:check
npm run audit
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
python scripts/validate_phase0_docs.py
```

GitHub Actions selects Python 3.14 for the specification-document validator plus Node.js 24 and the manifest-pinned npm 12.0.2, then runs `npm ci`, `audit`, `format:check`, document validation, `lint`, `typecheck`, `test`, and `build`. Playwright is intentionally omitted from the initial CI job to avoid installing browser binaries on every lightweight validation run; `npm run test:e2e` remains a required local Phase 1 command. A command is reported as passing only when its dated execution result has been captured for the relevant revision.

## 7. Functions, Domain Logic, and Errors

- Keep calculations and state transitions in pure or narrowly side-effecting domain functions when practical.
- Use explicit inputs and outputs; avoid hidden mutable module state.
- Check preconditions and invariants close to the domain operation.
- Represent expected failures with typed results or domain errors that callers must handle.
- Reserve thrown exceptions for unexpected or framework-required control paths; translate them at system boundaries.
- Never expose stack traces, database details, secrets, or provider payloads to customers.
- User-facing errors must explain the next useful action without claiming an order succeeded when its state is unknown.
- Give integrations timeouts, bounded retry policies, idempotency, and observable failure paths. Do not retry non-idempotent work blindly.
- Monetary calculations must use the exact representation selected in the architecture/database design, not JavaScript floating-point arithmetic for authoritative totals.

## 8. Validation and Data Access

- Validate external input at runtime using an intentionally selected schema approach recorded in `docs/software-and-apis.md`.
- Share schemas only when the client and server contracts are genuinely identical; the server remains authoritative.
- Normalize only fields where normalization is documented; never silently alter significant customer input.
- Database constraints complement application validation and protect invariants under concurrency.
- Query only required columns and rows. Avoid unbounded list operations.
- Use migrations for schema and policy changes; never make undocumented production-only changes.
- Review migrations for reversibility, data impact, locking risk, RLS, indexes, and deployment ordering.
- Do not expose POS tables directly. Future POS access must go through a documented integration boundary.

## 9. Security and Privacy in Code

All changes must follow `docs/security-and-privacy.md`.

- No credentials or real personal data in Git, fixtures, examples, screenshots, test output, or logs.
- Use `.env.example` values that are obvious placeholders.
- Authorize server-side and apply least privilege. UI visibility is not authorization.
- Treat all browser, URL, webhook, Messenger, Android, and POS input as untrusted.
- Redact logs through allow-listed fields.
- Review dependency necessity, maintenance, version, license, bundle impact, and data behavior before addition.
- Add tests for authorization denials and invalid input, not just successful behavior.

## 10. Accessibility and Responsive UI

The target is WCAG 2.2 Level AA for customer-facing flows, with automated checks supplemented by keyboard, screen-reader, zoom, contrast, and device testing.

- Build mobile-first and test from narrow widths upward; do not rely on hover.
- Preserve visible keyboard focus and logical focus order.
- Every interactive element must be keyboard operable and have an accessible name.
- Use one logical heading hierarchy, landmarks, labels, instructions, and descriptive link text.
- Associate validation errors with their fields and provide a summary/focus strategy for failed forms.
- Do not use color alone to communicate state. Meet approved contrast requirements.
- Provide meaningful alternative text for informative images and empty alternative text for decorative images.
- Respect reduced-motion preferences and avoid unnecessary animation.
- Keep touch targets and spacing usable on common phones.
- Test zoom/reflow and content expansion; avoid fixed heights that clip translated or enlarged text.
- Announce important asynchronous status changes appropriately without excessive live-region noise.
- Optimize images and fonts and preserve layout dimensions to reduce shifts on slower mobile connections.

Accessibility defects in account, cart, checkout, and order-tracking critical paths block release unless explicitly assessed and documented.

## 11. Testing Standards

- Use Vitest for TypeScript unit/integration tests, Testing Library for user-observable component behavior, and Playwright for browser workflows, as specified in `docs/testing-strategy.md`.
- Keep unit/component tests under `tests/unit`, browser tests under `tests/e2e`, and stable academic test identifiers in test titles and `docs/test-cases.md`.
- Follow arrange-act-assert or an equally clear structure.
- Name tests by behavior and expected result, not implementation method.
- Test public behavior; avoid snapshots or private implementation assertions as the primary proof.
- Keep tests deterministic and independent. Freeze time, randomness, network, and identifiers when relevant.
- Mock at external boundaries, not every internal function.
- Every defect fix should include a regression test when technically practical.
- Do not skip, focus, weaken, or delete a valid test merely to pass the suite.
- Test status may be reported only from an executed command and captured result for the relevant commit.

## 12. Documentation and Comments

- Code should explain **what** through names and structure; comments should explain non-obvious **why**, constraints, or trade-offs.
- Remove stale and commented-out code rather than preserving it in source control.
- Public interfaces and complex domain rules should document units, invariants, side effects, and failure behavior.
- Use `TODO:` only with a specific missing decision/action; owner-dependent business data must use `TODO: Confirm with Brew ni Cat owner.`
- Clearly label development fixtures as `MOCK DATA — FOR DEVELOPMENT ONLY` and keep them separate from production data access.
- Update requirements, architecture decisions, execution paths, test cases, security/privacy, API/database design, and the development log when a change affects them.
- Never mark a planned feature implemented, a test passed, or a review completed without evidence.

## 13. Git and Branch Workflow

- Primary branch: `main`.
- Use a focused branch for meaningful work, such as `docs/srs`, `feat/public-website`, `feat/menu`, `test/ordering`, or `fix/mobile-navigation`.
- Keep commits small enough to review and complete enough to build on.
- Write imperative Conventional Commit-style messages, for example:
  - `docs: add initial security and testing standards`
  - `feat: add accessible mobile navigation shell`
  - `test: cover invalid order transitions`
  - `fix: prevent duplicate checkout submission`
- Use only the contributor's configured Git identity. Do not add assistant, automation, or AI co-author trailers.
- Do not rewrite shared history or force-push a shared branch without explicit team coordination.
- Inspect staged files and diff before every commit. Do not commit secrets, local environment files, generated build output, dependency folders, or unrelated changes.
- Pull requests for meaningful modules must include summary, requirement IDs, changes, test commands/results, screenshots for UI changes, accessibility/security considerations, known limitations, and a checklist.
- Leave pull requests intended as peer-review evidence open until an actual teammate reviews them. Do not represent self-checks as peer review.

## 14. Code Review Checklist

Reviewers should verify:

- Scope traces to approved functional/non-functional requirement IDs.
- Names, module boundaries, and abstractions are clear and necessary.
- Types and boundary validation cover failure cases.
- Authentication, authorization, RLS/data access, secrets, and logs follow the security baseline.
- Data minimization and privacy documentation remain accurate.
- Customer-facing behavior is keyboard accessible, responsive, and resilient to loading/empty/error states.
- Tests cover important success, denial, boundary, and regression behavior.
- Lint, typecheck, tests, and build results apply to the reviewed commit.
- Dependencies and licenses are documented and justified.
- Documentation and migrations accurately reflect the implementation.
- No owner-unconfirmed information is presented as real business data.

Findings, reviewer identity, date, changes, and disposition belong in `docs/code-review.md`. A review is complete only when performed by the named reviewer.

## 15. Dependency and Upgrade Standards

- Add a dependency only when it provides material value over a small project-owned implementation or supported platform feature.
- Record purpose, exact version, license, and relevant notes in `docs/software-and-apis.md`.
- Use the committed package-manager lockfile; do not mix package managers.
- Review release activity, security advisories, transitive impact, browser/server compatibility, and bundle size.
- Avoid abandoned packages and overlapping libraries that solve the same problem.
- Keep install-time dependency scripts denied by default under the npm `allowScripts` policy; enable a package script only after inspecting its behavior and documenting why it is required.
- Upgrade incrementally, read migration notes, run the complete relevant checks, and record architecture-impacting changes.

## 16. Definition of Done

A development item is done only when all applicable statements are true:

1. Acceptance criteria and linked requirement IDs are satisfied without unapproved scope.
2. Implementation follows architecture, security, privacy, accessibility, and coding standards.
3. Appropriate unit, component, integration, and/or end-to-end tests exist and pass on the target commit.
4. Formatter, lint, typecheck, and production build pass.
5. Relevant manual checks are recorded, including mobile/accessibility checks for UI work.
6. The diff has been self-inspected and meaningful review findings are resolved or documented.
7. Documentation, test cases, development log, and decisions are updated accurately.
8. No secret, production personal data, build output, or unrelated file is included.
9. Commit and push/PR status are recorded truthfully.

The Phase 1 implementation may move to Testing / Review after its automated gates and local responsive checks pass. The team phase remains open until an actual teammate completes QA and pull-request review.

## 17. Exceptions and Evolution

Standards may evolve when the team gains evidence. A material exception must be narrow, documented in the pull request, risk-assessed, approved by the appropriate reviewer, and recorded in `docs/decisions.md` when it affects architecture or future work. Exceptions must not be hidden through disabled checks.
