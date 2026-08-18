# Brew ni Cat Connect

**Development status:** Phase 0 — Initial specification complete\
**Specification version:** 0.1 Draft\
**Last updated:** 2026-08-18

Brew ni Cat Connect is the planned customer-facing omnichannel platform for Brew ni Cat Coffee Shop. It is intended to provide an official business website and, in later approved phases, shared customer experiences for web ordering, accounts, order tracking, loyalty, Messenger, and Android.

This project complements the existing Brew ni Cat POS. It does **not** recreate the POS or claim that any production integration currently exists.

## Current milestone

The Version 0.1 documentation baseline has passed its repository consistency review. Application features remain unimplemented; Phase 1 is the next separate milestone.

| Area | Status |
| --- | --- |
| Phase 0 specification | Initial Version 0.1 Draft complete |
| Web application | Planned |
| Supabase backend | Planned |
| POS integration | Deferred pending POS analysis |
| Messenger assistant | Deferred until the backend is stable |
| Android application | Deferred to its documented phase |

No application runtime or production data store exists in this initial milestone.

## Documentation

Start with:

- [`docs/srs.md`](docs/srs.md) — master Software Requirements Specification
- [`docs/project-overview.md`](docs/project-overview.md) — purpose, users, scope, and boundaries
- [`docs/functional-requirements.md`](docs/functional-requirements.md) — testable functional requirements
- [`docs/non-functional-requirements.md`](docs/non-functional-requirements.md) — quality requirements
- [`docs/execution-paths.md`](docs/execution-paths.md) — planned end-to-end behavior
- [`docs/system-architecture.md`](docs/system-architecture.md) — planned architecture and trust boundaries
- [`docs/decisions.md`](docs/decisions.md) — architecture decision records
- [`docs/development-log.md`](docs/development-log.md) — truthful milestone history

## Selected technology direction

- Next.js App Router, React, and TypeScript for the responsive, SEO-friendly web experience
- Tailwind CSS with project design tokens for a consistent mobile-first interface
- Supabase for the planned cloud PostgreSQL, authentication, storage, and realtime capabilities
- Zod for shared boundary validation
- Vitest and Testing Library for unit/component tests; Playwright for end-to-end tests
- Native Android with Kotlin and Jetpack Compose in the later Android phase
- A secured server-side webhook adapter for the future Messenger channel

Exact dependency versions will be compatibility-checked and locked during Phase 1. See [`docs/software-and-apis.md`](docs/software-and-apis.md).

## Business-data rule

Production business information is never invented. Unknown address, hours, menu, prices, payment details, policies, promotions, and contact data remain marked:

```text
TODO: Confirm with Brew ni Cat owner.
```

Any later development fixtures must be isolated and labelled:

```text
MOCK DATA — FOR DEVELOPMENT ONLY
```

## Contributing

Use feature branches, meaningful Conventional Commit-style messages, tests appropriate to the change, and pull requests for reviewable modules. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/development-standards.md`](docs/development-standards.md).

## Configuration and secrets

Copy `.env.example` only when a later phase introduces runtime configuration. Never commit `.env`, service-role keys, tokens, passwords, webhook secrets, or private certificates.

## License

This repository currently uses an interim proprietary, all-rights-reserved license while client and academic distribution terms are confirmed. See [`LICENSE`](LICENSE) and ADR-005 in [`docs/decisions.md`](docs/decisions.md).
