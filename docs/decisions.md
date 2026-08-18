# Architecture Decision Records

**Document version:** 0.1 Draft\
**Last updated:** 2026-08-18

Statuses used here are `Proposed`, `Accepted`, `Superseded`, and `Deferred`. Acceptance records a direction; it does not claim implementation.

---

## ADR-001 — Web foundation stack

**Decision:** Use Next.js App Router, React, and TypeScript as the Phase 1 web foundation, with Tailwind CSS and project-owned design tokens for styling.\
**Date:** 2026-08-18\
**Status:** Accepted; implementation planned for Phase 1\
**Context:** The public site needs mobile-first usability, accessible interactions, strong visual presentation, discoverable public content, interactive ordering, and later server-only integration endpoints. The academic project also needs maintainable typing, testing, and deployment workflows.\
**Options considered:**

1. Static HTML/CSS/JavaScript — small initial surface but weaker structure for later authenticated/order flows.
2. React with Vite — simple client application, but public content rendering/metadata and server endpoints require additional architecture.
3. Next.js App Router with TypeScript — integrated rendering, routing, metadata, server/client boundaries, and ecosystem support.

**Chosen approach:** Option 3, with Tailwind constrained by semantic components and design tokens rather than one-off styling.\
**Reason:** It provides a coherent path from public website to validated customer flows without adding a separate API server before requirements justify one.\
**Consequences:** The team must understand server/client component boundaries, prevent secrets from entering client bundles, verify version compatibility, monitor bundle performance, and avoid coupling domain logic to framework components.

---

## ADR-002 — Planned shared cloud backend

**Decision:** Use Supabase as the planned shared backend, subject to a Phase 4 schema/security gate and owner-approved project configuration.\
**Date:** 2026-08-18\
**Status:** Accepted in principle; implementation deferred to Phase 4\
**Context:** Web, Messenger, Android, and POS integration need consistent business data, authentication, relational constraints, and selected realtime updates. A small business benefits from managed infrastructure, but public database access must be constrained.\
**Options considered:** Supabase; a custom Node API with self-managed PostgreSQL; Firebase; separate channel-specific backends.\
**Chosen approach:** Managed Supabase PostgreSQL, Auth, Storage, Realtime, and server-side functions only where justified.\
**Reason:** Relational order data, RLS, managed authentication, and cross-platform SDKs align with the scope while limiting operational overhead.\
**Consequences:** Database design, migrations, RLS, backups, region, retention, vendor limits, costs, and service-key isolation must be documented and tested. Channel-specific databases are prohibited.

---

## ADR-003 — Integration boundary with the existing POS

**Decision:** Integrate through a versioned adapter/contract after POS analysis; never expose POS tables or credentials directly to public clients.\
**Date:** 2026-08-18\
**Status:** Accepted; implementation deferred to Phase 6\
**Context:** The POS already handles business-side operations. Recreating it would duplicate responsibility and create conflicting data. Its architecture and safe interfaces are not yet documented in this repository.\
**Options considered:** Direct shared-table access; duplicate Connect administration/POS; file/manual transfer; a controlled API/event/synchronization adapter selected after analysis.\
**Chosen approach:** The controlled adapter option, with source-of-truth, idempotency, retries, conflict handling, audit, offline behavior, security, validation, and rollback specified first.\
**Reason:** It protects the production-style POS and allows the integration mechanism to match evidence rather than assumption.\
**Consequences:** Integration cannot begin until read-only POS analysis and owner approval occur. Some order operations may require staff workflow changes that must be confirmed.

---

## ADR-004 — Future customer channels

**Decision:** Reuse shared backend contracts for Messenger and Android; use a server-side webhook adapter for Messenger and prefer native Kotlin/Jetpack Compose for the planned Android client.\
**Date:** 2026-08-18\
**Status:** Accepted direction; revalidation deferred to Phases 7 and 8\
**Context:** Channel-specific data stores would cause inconsistent menu, order, and loyalty state. Messenger requires secret-bearing webhook operations, while the academic roadmap calls for an Android customer application.\
**Options considered:** Independent channel backends; web-only/PWA; cross-platform mobile; native Android plus shared backend.\
**Chosen approach:** Shared domain contracts, server-only Messenger integration, and native Android for the Android phase.\
**Reason:** It preserves centralized business data, keeps tokens off clients, and provides a platform-aligned Android implementation.\
**Consequences:** API contracts need versioning and channel-neutral semantics. Meta policy/version and Android SDK choices must be reassessed at implementation time. A responsive web experience remains mandatory regardless of native app availability.

---

## ADR-005 — Interim project license

**Decision:** Keep the private client-associated repository under an interim proprietary, all-rights-reserved license until source ownership and distribution are confirmed.\
**Date:** 2026-08-18\
**Status:** Accepted as interim\
**Context:** A license file is required, but the project is for a real business and no permission to publish or grant open-source rights has been documented. Academic submission access may differ from public distribution.\
**Options considered:** MIT immediately; no license file; interim proprietary terms followed by an explicit later decision.\
**Chosen approach:** Interim proprietary terms. Revisit before public release or client deployment.\
**Reason:** This avoids granting distribution rights without confirmed authority while making the current terms explicit.\
**Consequences:** Public reuse/distribution is not permitted under the interim file. Final ownership and licensing are **TODO: Confirm with Brew ni Cat owner.** Dependency licenses remain independently applicable.

---

## ADR-006 — Source-control visibility and review workflow

**Decision:** Use a private GitHub repository, `main` as the primary branch, focused branches for meaningful work, and pull requests left open when peer-review evidence is required.\
**Date:** 2026-08-18\
**Status:** Accepted and established\
**Context:** The project needs academic evidence, team review, controlled client-associated source, and maintainable history.\
**Options considered:** Local-only Git; public repository from inception; private GitHub repository with later visibility decision.\
**Chosen approach:** Private GitHub repository `eendor/Brew-ni-Cat-Connect`, with later visibility review.\
**Reason:** It enables remote history and collaboration without prematurely publishing client-related work.\
**Consequences:** Contributors need authorized GitHub access. Real reviews must identify their reviewer and findings; automated or fictitious review evidence is prohibited.
