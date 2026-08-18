# Brew ni Cat Connect — Non-Functional Requirements

- **Version:** 0.1 Draft
- **Date:** 2026-08-18
- **Phase:** Phase 0 — Planning and Specification
- **Status note:** All requirements are **Planned** and represent initial engineering acceptance targets, not measured results. Targets that depend on hosting/service-plan or owner policy must be reviewed before production release.

## 1. Measurement conventions

- Performance percentiles are calculated from the recorded requests in the stated acceptance profile after warm-up; failed requests are reported separately, not removed silently.
- The preliminary small-business load profile is **50 concurrent browsing sessions and 10 concurrent order submissions for 15 minutes** in a production-like test environment. This is an engineering test baseline, not a claim about customer traffic. **TODO: Confirm with Brew ni Cat owner.** Confirm expected peak usage before finalizing the profile.
- “Supported browsers” means the latest two stable major versions available at release of Chrome, Edge, Firefox, and Safari, subject to a documented compatibility review.
- Availability and recovery targets depend on the selected cloud plan and operating budget. **TODO: Confirm with Brew ni Cat owner.**
- Evidence must record environment, build/commit, date, command/tool, inputs/profile, raw summary, passed/failed counts, and conclusion.

## 2. Performance and responsiveness

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-001 | Public pages shall provide fast initial rendering on representative mobile conditions. | Lighthouse or equivalent on a production build, tested on key public routes with mobile emulation and a documented throttling profile: p75 Largest Contentful Paint ≤ 2.5 s, Interaction to Next Paint ≤ 200 ms, and Cumulative Layout Shift ≤ 0.1. | 2 onward | Planned |
| NFR-002 | Backend read operations used by menu and account views shall respond promptly under the preliminary load profile. | p95 server response time ≤ 1.0 s and error rate < 1%, excluding deliberately injected dependency failures; queries and dataset size are recorded. | 4 onward | Planned |
| NFR-003 | Order validation/submission shall give a timely definitive result under the preliminary load profile. | p95 response time ≤ 2.0 s and no duplicate persisted orders for 10 concurrent submissions plus retries; third-party provider delay, if any, is separately reported. | 4 onward | Planned |
| NFR-004 | A committed order-status change shall reach a connected authorized realtime client promptly. | p95 end-to-end propagation ≤ 5 s across at least 100 recorded status events in a production-like environment; unauthorized clients receive zero protected events. | 4–5 | Planned |
| NFR-005 | Customer-facing images and static assets shall be optimized for their rendered context. | Automated build/audit finds responsive dimensions or equivalent optimization, lazy loading below the fold where appropriate, and no known oversized asset causing failure of NFR-001. | 2 onward | Planned |

## 3. Reliability, availability, and recovery

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-006 | Order creation and loyalty redemption shall be atomic and idempotent. | Automated concurrency and retry tests create one valid result per idempotency key; partial order/item/points state count is zero. | 4–5 | Planned |
| NFR-007 | Production service availability shall have a documented target and measurement source. | Initial target: ≥ 99.5% monthly availability excluding announced maintenance, measured by external health checks; final target/service plan is **TODO: Confirm with Brew ni Cat owner.** | 10 | Planned |
| NFR-008 | A dependency outage shall not be presented as a successful order or reward operation. | Fault-injection tests for database/network/POS/provider failure produce an explicit pending/failure state, zero false confirmations, and a recoverable retry/reconciliation path. | 4–7 | Planned |
| NFR-009 | Persistent production data shall use automated backups and a documented restoration procedure. | Backup job status is monitored; at least one non-production restore drill before launch verifies readable, relationally consistent data. Initial targets: RPO ≤ 24 h and RTO ≤ 8 h; service/budget approval is **TODO: Confirm with Brew ni Cat owner.** | 4/10 | Planned |
| NFR-010 | Realtime loss shall not make order status permanently inaccessible. | Disconnect/reconnect tests show a visible stale state and successful manual/polling refresh; no duplicated or out-of-order displayed terminal state. | 4–5 | Planned |
| NFR-011 | Deployments and schema changes shall have a documented rollback or forward-recovery procedure. | A staging rehearsal executes the exact deployment and rollback/recovery commands and verifies application/data compatibility before production release. | 1 onward | Planned |

## 4. Security

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-012 | All production network traffic carrying application or personal data shall use HTTPS/TLS. | Automated endpoint scan finds no supported plaintext application endpoint and no mixed active content; HTTP redirects to HTTPS or is unavailable. | 10 | Planned |
| NFR-013 | Authentication secrets/passwords shall be handled only by the approved authentication provider and never stored in application plaintext. | Architecture/configuration review plus repository/database inspection finds zero plaintext passwords; provider settings meet its documented secure defaults. | 4 onward | Planned |
| NFR-014 | Authorization shall default to deny and be enforced server-side and, when Supabase is activated, through tested Row Level Security policies for exposed tables. | Anonymous, same-user, cross-user, staff, and service-role policy tests cover each operation; all prohibited cases are denied and reveal no protected row data. | 4 onward | Planned |
| NFR-015 | All external input shall be schema-validated server-side before business processing or persistence. | Positive, boundary, malformed, oversized, and unexpected-field tests exist for every write endpoint; invalid cases create no business record. | 3 onward | Planned |
| NFR-016 | Customer output shall be protected against injection, including cross-site scripting and unsafe URL/content rendering. | Automated static/dependency checks and targeted payload tests on every rich/free-text output produce no executable injected content; approved sanitization/encoding is documented. | 2 onward | Planned |
| NFR-017 | Privileged secrets shall remain outside source control, client bundles, logs, and error responses. | Secret scanning of Git history and production build artifacts reports zero real secrets; `.env.example` contains names/placeholders only; log/error fixtures contain no tokens. | 0 onward | Planned |
| NFR-018 | Public authentication, recovery, order submission, tracking, and webhook endpoints shall use documented abuse controls. | Rate-limit tests confirm thresholds return a controlled response and recover after the window; thresholds are documented per endpoint and reviewed before launch. | 4–7 | Planned |
| NFR-019 | Sessions and sensitive credentials shall use provider/platform-secure storage, expiry, rotation/revocation, and logout behavior. | Web and Android session tests cover valid, expired, revoked, logout, and stolen/replayed-token cases according to the selected provider design. | 4/8 | Planned |
| NFR-020 | Dependencies and build artifacts shall be checked for known vulnerabilities. | CI runs a lockfile-aware vulnerability scan on each release candidate; unresolved critical/high findings block release unless a time-bounded, documented risk decision is approved. | 1 onward | Planned |
| NFR-021 | Security-relevant operations shall produce tamper-resistant, access-controlled audit information without secrets or unnecessary personal data. | Staff/integration/login-abuse fixtures generate required event fields; customer/anonymous access fails; secret/redaction checks pass. Retention is **TODO: Confirm with Brew ni Cat owner.** | 4–6 | Planned |
| NFR-022 | Messenger and POS inbound integrations shall authenticate requests and resist replay/duplicate processing. | Invalid signature/credential, expired timestamp where supported, duplicate event ID, and retry tests result in zero unauthorized or duplicate business operations. | 6–7 | Planned |

## 5. Privacy and regulatory alignment

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-023 | Each collected personal-data field shall have a documented purpose, access role, retention rule, and requirement reference before production collection. | Data-inventory review has no undocumented field; fields lacking an approved purpose are removed/disabled. Retention/policy input is **TODO: Confirm with Brew ni Cat owner.** | 4/10 | Planned |
| NFR-024 | The system shall collect the minimum personal data needed for the enabled workflow and shall not make optional data mandatory. | Field-by-field test/design review maps every required field to an active FR; optional fields can be omitted without blocking unrelated functions. | 3 onward | Planned |
| NFR-025 | Customer personal data shall be accessible only to the customer and authorized roles with a documented need. | Role/access matrix tests produce zero unauthorized reads/updates across profiles, orders, tracking, loyalty, and privacy requests. | 4 onward | Planned |
| NFR-026 | Privacy notices and consent/acknowledgment controls shall be presented at or before relevant data collection where legally or operationally required. | UI acceptance verifies versioned notice links/text and records required acknowledgment without preselecting optional consent. Final wording is **TODO: Confirm with Brew ni Cat owner.** | 4/10 | Planned |
| NFR-027 | Privacy request and retention workflows shall preserve an auditable result while deleting or anonymizing eligible data. | Staging tests execute access/correction/deletion cases against the approved matrix and verify retained versus removed fields. Process and time frames are **TODO: Confirm with Brew ni Cat owner.** | 5/10 | Planned |
| NFR-028 | Analytics, tracking, recommendation, and notification data use shall remain disabled until documented purpose, disclosure, retention, and consent/legal basis are approved. | Configuration and network inspection show no unapproved tracker/data destination; any enabled tool has an inventory entry and acceptance evidence. **TODO: Confirm with Brew ni Cat owner.** | All phases | Planned |

The project will document how these controls support the Philippine Data Privacy Act of 2012 (RA 10173). This SRS is an engineering specification and does not substitute for owner-approved privacy policy or professional legal review.

## 6. Accessibility and usability

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-029 | Customer-facing web flows shall conform to WCAG 2.2 Level AA for applicable success criteria. | Automated accessibility scans report zero serious/critical violations on key routes, and a documented manual checklist covers keyboard, focus, labels, errors, zoom, contrast, and screen-reader smoke tests. | 2 onward | Planned |
| NFR-030 | All interactive web functions shall be operable by keyboard with visible focus and logical focus order. | Manual test completes navigation, menu configuration, cart, checkout, login, and tracking without a pointer; no keyboard trap occurs. | 2 onward | Planned |
| NFR-031 | Forms shall expose programmatic labels and specific, perceivable validation guidance without relying only on color. | Automated/manual tests with valid and invalid input confirm labels, error association/announcement, focus movement as appropriate, and retained correct fields. | 2 onward | Planned |
| NFR-032 | Motion shall be restrained and respect the user's reduced-motion preference. | With `prefers-reduced-motion: reduce`, non-essential animation/transitions are removed or minimized and no function depends on motion. | 2 onward | Planned |
| NFR-033 | Core mobile customer tasks shall be understandable without training. | Before production, representative usability participants complete browse → configure → cart → checkout/tracking tasks; success criteria/sample and findings are documented, with owner/user recruitment **TODO: Confirm with Brew ni Cat owner.** | 3/9 | Planned |

## 7. Compatibility and responsive behavior

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-034 | Web customer flows shall work on supported browsers and responsive widths from 320 CSS pixels through 1440 CSS pixels. | A documented browser/viewport matrix completes key journeys with no horizontal page overflow, clipped required control, or blocker defect; larger widths remain usable. | 2 onward | Planned |
| NFR-035 | Core public/menu/cart content shall remain usable when optional browser capabilities such as realtime or enhanced animation are unavailable. | Capability-disable tests retain browsing/cart and provide documented fallback for status updates; unsupported critical requirements are stated before release. | 2–5 | Planned |
| NFR-036 | The Android phase shall define and test a supported OS/API and device matrix before implementation is declared complete. | The architecture decision records minimum/target SDK based on current platform/security support; CI/emulator and selected physical-device results cover that matrix. Exact versions are deferred until Phase 8 to avoid a stale invented commitment. | 8 | Planned |

## 8. Maintainability, testability, and documentation

| ID | Requirement | Metric / verification | Target phase | Status |
| --- | --- | --- | --- | --- |
| NFR-037 | Production code shall pass repository formatting, linting, and type checking with no suppressed error added solely to pass CI. | The documented clean-checkout commands exit 0; new suppressions require a code comment and review rationale. | 1 onward | Planned |
| NFR-038 | Important business logic shall be isolated from UI/framework concerns and covered by repeatable automated tests. | Order totals/validation/state transitions, loyalty, authorization policies, and synchronization/idempotency modules each have positive, boundary, and negative tests before their feature is Tested. | 1 onward | Planned |
| NFR-039 | The default branch shall remain buildable and deployable from documented commands with reproducible dependency resolution. | On a clean checkout, install with the committed lockfile, lint, type-check, test, and production build all exit 0; commands and environment prerequisites are recorded. | 1 onward | Planned |
| NFR-040 | Documentation shall accurately distinguish Planned, In development, Implemented, Tested, and Deferred work and remain traceable to code/tests/decisions. | Each meaningful milestone review checks SRS/FR/NFR, development log, decisions, and test evidence; no feature is marked Implemented/Tested without corresponding artifact/evidence. | 0 onward | Planned |

## 9. Preliminary release gates

A production release must not proceed until:

1. Applicable Must-priority FRs have Implemented and Tested evidence or a documented approved scope decision.
2. NFR-012 through NFR-028 security/privacy checks have recorded results for the release candidate.
3. Critical journeys pass the supported browser/device matrix and accessibility review.
4. Restore, deployment, and rollback/recovery procedures have been rehearsed in a non-production environment.
5. No unresolved critical/high security finding or blocker defect remains without an explicit, time-bounded owner/project decision.
6. Real business information, privacy content, operating rules, and production launch are approved. **TODO: Confirm with Brew ni Cat owner.**

## 10. Quality traceability summary

| Quality area | NFR IDs | Principal evidence |
| --- | --- | --- |
| Performance / realtime | NFR-001–NFR-005 | Lighthouse/Web Vitals, load tests, propagation measurements |
| Reliability / recovery | NFR-006–NFR-011 | Concurrency, fault injection, backup restore, deployment rehearsal |
| Security | NFR-012–NFR-022 | Policy/authorization tests, validation tests, scans, integration signature tests |
| Privacy | NFR-023–NFR-028 | Data inventory, access matrix, privacy workflow and network/config review |
| Accessibility / usability | NFR-029–NFR-033 | Automated plus manual WCAG review and documented usability evaluation |
| Compatibility | NFR-034–NFR-036 | Browser, viewport, fallback, Android device/API matrices |
| Maintainability / evidence | NFR-037–NFR-040 | CI commands, automated tests, clean build, documentation review |
