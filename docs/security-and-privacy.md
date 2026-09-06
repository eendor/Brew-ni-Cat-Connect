# Security and Privacy

**Project:** Brew ni Cat Connect
**Version:** 0.1 Draft
**Date:** 2026-08-24
**Phase:** Living baseline through Phase 2
**Document status:** Phase 1 controls are verified historical evidence. Phase 2 public catalog/media implementation is in Testing / Review and awaits independent review. Live public catalog rendering is verified, but the manually RLS-disabled database state is a production security blocker; later-feature controls remain Planned.

## 1. Current State and Purpose

Brew ni Cat Connect now has a customer-facing Phase 2 showcase and a browser-runtime, read-only Supabase catalog client. It has no authentication, order processing, customer records, loyalty, online payment, analytics, Messenger, Android, or POS synchronization. Application code collects no customer personal data and configures the public Supabase client without session persistence. Approved photographs may contain customers, but the site does not identify them or infer attributes.

This document establishes an engineering baseline for protecting customer and business information across the future website, shared backend, Android client, Messenger channel, and existing POS integration. It is not a legal opinion or a completed compliance assessment. The business must designate an accountable privacy role and obtain qualified advice when a legal interpretation or formal compliance determination is required.

Status terms used here are:

- **Current:** verified repository or project state.
- **Planned:** approved direction that still requires implementation and verification.
- **Proposed:** subject to an architecture or business decision.
- **Deferred:** intentionally outside the current phase.

### 1.1 Phase 1 verified control state

| Control area | Current Phase 1 state | Evidence / limitation |
| --- | --- | --- |
| Secrets | `.env.example` contains variable names with empty values only; `.env`, `.env.*`, and generated outputs are ignored while `.env.example` is explicitly allowed; a focused scan of 62 text files found zero credential-pattern findings and zero non-empty example values | No Supabase, Meta, Android, POS, payment, or other runtime credential is configured; this local pattern check does not replace later managed secret scanning |
| Public surface | Only `/`, `/menu`, `/about`, `/gallery`, `/contact`, framework error/loading, and not-found UI exist | No API route, server action, form submission, account, database, or effectful business operation exists |
| Data minimization | UI uses project identity, development placeholder copy, and the owner-confirmation TODO marker | No customer fixture, testimonial, price, address, contact detail, hours, promotion, or production record is embedded |
| Framework baseline | Strict TypeScript, React strict mode, semantic landmarks, visible focus behavior, and `poweredByHeader: false` are configured | CSP, deployment HTTPS, rate limiting, authentication controls, and production logging must be designed for the phase that introduces those surfaces |
| Dependencies | Exact direct versions are locked; npm is configured to deny the optional `unrs-resolver` native-fallback install script; a clean temporary-directory `npm ci` added 477 packages, audited 478 packages, reported 0 vulnerabilities, and produced no blocked-script warning | `npm audit --audit-level=high` also returned `found 0 vulnerabilities` with exit status 0 on 2026-08-23; point-in-time results do not replace continuing review |
| External integrations | None | Supabase, Messenger/AI, Android, and POS controls below remain planned or deferred |

The automated accessibility and route tests verify selected shell behavior only. Renier's independent manual QA and pull-request review remain pending and must not be represented as completed.

## 2. Security and Privacy Objectives

1. Preserve the confidentiality, integrity, and availability of customer and business data.
2. Collect only data needed for documented features and declared purposes.
3. Ensure each user and integration can access only the records and operations it needs.
4. Keep credentials and privileged operations out of public clients and source control.
5. Make security-relevant events diagnosable without placing secrets or unnecessary personal data in logs.
6. Provide testable controls for the website, backend, third-party integrations, and POS boundary.
7. Support data-subject requests, retention decisions, correction, and deletion through documented processes before production launch.

## 3. Philippine Data Privacy Engineering Baseline

Republic Act No. 10173, the **Data Privacy Act of 2012**, and its Implementing Rules and Regulations are the project's primary Philippine privacy references. The National Privacy Commission (NPC) sources describe the general principles of transparency, legitimate purpose, and proportionality, criteria for lawful processing, data-subject rights, and organizational, physical, and technical safeguards.

Engineering work will therefore apply the following baseline:

- State a specific purpose before collecting each personal-data field.
- Identify and document an appropriate lawful basis for each processing activity; do not assume that consent is always the correct basis.
- Present privacy information in clear, accessible language before or at collection.
- Collect the minimum data compatible with the declared purpose.
- Do not reuse personal data for an incompatible purpose without a documented basis and notice.
- Keep identifiable data only for a documented period, then securely delete or anonymize it as appropriate.
- Provide a documented operational path for access, correction, objection, deletion/blocking where applicable, and other data-subject requests.
- Evaluate data sharing and processing by cloud, messaging, analytics, notification, and POS providers before enabling them.
- Maintain proportionate organizational, physical, and technical safeguards and an incident-response process.

Final decisions about controller/processor roles, privacy notices, lawful bases, retention periods, registration or notification obligations, direct marketing, and breach handling require review by the business's accountable privacy role.

### Authoritative references

- [National Privacy Commission — Republic Act No. 10173](https://privacy.gov.ph/data-privacy-act/)
- [National Privacy Commission — Implementing Rules and Regulations of the Data Privacy Act of 2012](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)

## 4. Data Inventory and Minimization

The following is a planning inventory, not evidence that the data is already collected.

| Data domain | Minimum candidate data | Intended purpose | Classification | Retention / disposition | Status |
| --- | --- | --- | --- | --- | --- |
| Public browsing | Essential session and security metadata | Deliver the site, preserve a cart, and prevent abuse | Operational; may become personal when linkable | Define before deployment; keep only as long as necessary | Proposed |
| Customer account | Email or other approved sign-in identifier, authentication-provider subject ID | Registration, login, account recovery | Personal | TODO: Confirm with Brew ni Cat owner. Determine account and inactive-account retention with the privacy role. | Planned |
| Customer profile | Display name and only owner-approved contact fields | Fulfillment and customer account features | Personal | TODO: Confirm with Brew ni Cat owner. Determine required fields and retention. | Planned |
| Order | Line items, totals, timestamps, fulfillment status, customer reference; pickup details only when necessary | Submit, fulfill, track, reconcile, and support orders | Personal when linked to a customer | TODO: Confirm with Brew ni Cat owner. Determine operational and accounting retention requirements. | Planned |
| Loyalty | Customer reference, balance, transaction history | Earn, audit, and redeem rewards | Personal | TODO: Confirm with Brew ni Cat owner. Define expiration and retention rules. | Planned |
| Delivery | Deferred pending owner approval and requirements | No collection until the feature is approved | Potentially sensitive in context because it may reveal a location | Not applicable while deferred | Deferred |
| Messenger | Platform-scoped identifier and minimum request context | Respond to customer-initiated interactions | Personal | Define before integration; do not retain entire conversations by default | Deferred |
| Android device | Push token only if notifications are justified and enabled | Deliver approved transactional notifications | Personal/unique identifier | Remove on sign-out, invalidation, or documented expiry | Deferred |
| Security telemetry | Timestamp, request/correlation ID, event type, coarse technical context | Detect abuse, investigate errors, and audit privileged changes | Operational; may contain personal data | Short, documented retention with restricted access | Planned |
| Payment | TODO: Confirm with Brew ni Cat owner. Define the approved payment flow. | Complete an approved payment method | Potentially high risk | The application must not store card credentials or payment account secrets | Proposed |

The application will avoid collecting sensitive personal information unless a documented, necessary feature and reviewed lawful basis require it. Development fixtures must be synthetic and visibly labeled `MOCK DATA — FOR DEVELOPMENT ONLY`.

## 5. Roles, Ownership, and Trust Boundaries

The exact legal and operational roles remain to be confirmed. The anticipated engineering model is:

- Brew ni Cat controls the customer and order purposes and owns its business records, subject to applicable rights and obligations.
- Cloud hosting, authentication, messaging, notification, analytics, and similar services may process limited data under their terms and configured purpose.
- Public web, Android, and Messenger clients are untrusted input sources.
- Server-side components form a privileged boundary but remain subject to least privilege, validation, and audit.
- The existing POS is a separate trust boundary. It must not be exposed directly to public clients.
- Production, preview, test, and local environments must use separate credentials and data.

Before production processing, document data flows, vendor roles, transfer locations, subprocessors, data-sharing terms, and the accountable owner for each dataset.

## 6. Threat Baseline

Threat modeling will be revisited for every material architecture change. Initial risks and controls are:

| Threat | Example impact | Planned preventive controls | Planned verification |
| --- | --- | --- | --- |
| Broken object-level authorization | One customer reads or changes another customer's profile or order | Server-side authorization plus deny-by-default database policies | Cross-account negative integration tests and RLS policy tests |
| Privilege escalation | Customer invokes staff or integration operations | Explicit roles/claims, server-only privileged endpoints, least privilege | Role matrix tests; review of every privileged route |
| Injection or malformed input | Corrupt orders, unexpected queries, or code execution | Typed schemas, allow-lists, parameterized data access, output encoding | Unit tests, malicious-input integration cases, dependency scanning |
| Credential exposure | Database or service compromise | Environment variables, secret manager, scanning, key rotation, no secret logging | Repository/CI secret scan and deployment configuration review |
| Session theft or account takeover | Unauthorized account use | Managed authentication, secure cookies/tokens, short-lived sessions where practical, safe recovery and rate limits | Authentication and recovery-flow tests |
| Order or loyalty tampering | Incorrect totals, state, or balances | Authoritative server calculations, transactional updates, idempotency, append-only history where justified | Domain unit tests, replay/concurrency tests, audit review |
| Forged webhook or integration request | Fake status or order update | Signature verification, timestamp/replay checks, route-specific secrets | Invalid-signature and replay tests |
| Abuse and denial of service | Ordering or tracking unavailable | Rate limiting, bounded payloads, timeouts, caching where safe, monitoring | Load and abuse cases before launch |
| Personal data in logs | Accidental disclosure to developers or vendors | Structured redaction, field allow-listing, restricted log access | Log-content tests and manual evidence review |
| Supply-chain compromise | Malicious or vulnerable dependency | Minimal dependencies, lockfile, review, automated advisories, pinned CI actions | Dependency review and security scan |
| POS boundary compromise | Public service reaches privileged POS resources | Mediated integration service, narrow contract, network controls, scoped credential | Contract and authorization tests in a non-production environment |
| Data loss or corruption | Orders or status history become unavailable | Database constraints, transactions, managed backup/recovery configuration | Restore exercise and integrity checks before launch |

## 7. Authentication and Authorization

### Authentication

- Use the selected planned Supabase Auth service when Phase 4 is activated rather than implementing password storage.
- Require verified, non-enumerating account recovery behavior and apply rate limiting to login, registration, and recovery endpoints.
- Store browser sessions with the framework/provider's secure approach. Do not place privileged credentials in browser-accessible storage.
- Do not reveal whether an account exists more than the approved UX requires.
- Staff and integration access require a separate, documented role model; being authenticated is not sufficient authorization.
- Multi-factor authentication for privileged roles will be evaluated before administration capabilities are exposed.

### Authorization

- Authorize every protected read and write on the server or database, including requests originating from a trusted-looking UI.
- Default to deny. Grant the smallest operation, row set, and field set required by a role.
- Never accept ownership, price, loyalty balance, role, or final order total solely from a client.
- Centralize order-state transition rules and test invalid transitions.
- Record actor, time, operation, entity reference, and outcome for security-relevant privileged changes without logging sensitive payloads.

### Supabase Row Level Security and the Phase 2 public catalog

The initial Phase 2 public probes returned HTTP 200 with zero `categories` and `items` rows while a controlled privileged read-only comparison confirmed catalog rows existed. That **BEFORE** observation is retained as historical failure-state evidence.

For the live-menu follow-up on 2026-08-24, the project owner/developer manually disabled RLS on the relevant catalog tables. Using the same browser publishable configuration as the application, read-only GET requests then returned 6 categories and 16 items, with 0 unavailable items and 0 unmatched item/category relationships. The application and this follow-up made no RLS, policy, schema, menu, price, inventory, sales, expense, customer, order, or other business-data change.

The current public catalog therefore depends on table-level public grants while RLS is disabled. A successful public read proves availability, not least-privilege authorization. Explicit projections constrain this application request, but they do not prevent another holder of the public key from requesting other granted fields or tables. This state is not an acceptable production authorization boundary.

1. Enable RLS before a table containing non-public or user-owned data is reachable through the Data API.
2. Create explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; do not rely on a broad all-operations policy.
3. Permit anonymous access only to specifically approved public menu fields and available records.
4. Limit authenticated customers to their own profile, orders, favorites, loyalty account, and other justified records using the authenticated subject identifier.
5. Prevent customers from directly updating prices, roles, order ownership/status, reward rules, or loyalty balances.
6. Keep the Supabase service-role key in server-only trusted execution. It must never be shipped in web or Android bundles.
7. Model staff and integration privileges explicitly; user-editable profile metadata must not grant authorization.
8. Test each policy as anonymous, customer A, customer B, staff, and trusted integration identities, including denied cross-account operations.
9. Review storage-bucket policies separately; database RLS does not automatically protect stored objects.

## 8. Input, API, and Business-Logic Security

- Validate all boundary inputs server-side, even when the client performs the same validation for usability.
- Define maximum lengths, numeric ranges, allowed option combinations, supported content types, and request-size limits.
- Calculate prices, discounts, loyalty points, and eligible transitions from authoritative server data.
- Use database constraints and transactions to preserve referential and monetary integrity.
- Represent money with integer minor units or another exact decimal strategy selected in the database design; do not use binary floating point for authoritative totals.
- Use idempotency protection for order submission and external callbacks.
- Return stable, non-sensitive error codes/messages; retain diagnostic detail only in restricted logs.
- Protect state-changing browser requests using the chosen framework's session and cross-site request controls.
- Configure restrictive CORS, security headers, content security policy, and allowed redirect origins for deployed environments.
- Rate-limit expensive, authentication, tracking, recommendation, and webhook endpoints according to measured risk.

## 9. Secrets and Environment Separation

- Real API keys, service-role keys, passwords, tokens, webhook secrets, private certificates, and production connection strings must never enter Git, examples, screenshots, logs, test fixtures, or client bundles.
- **Current through Phase 2:** `.env.example` contains documented names with empty values only. Real `.env.local` remains ignored and untracked. The browser code references only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server-only names are not runtime dependencies. The refreshed follow-up scan found zero real local values in tracked files and zero actual privileged values or privileged variable names in application/browser bundles.
- Maintain separate local, preview/test, and production credentials and databases.
- Use deployment-platform secret storage and restrict access by role.
- Rotate a credential immediately when exposure is suspected and document the incident without reproducing the secret.
- Treat variables prefixed for public client exposure as public. A Supabase publishable key is not authorization by itself; expose it only with a tested least-privilege anonymous policy and explicit field projections.
- Add automated secret detection to CI before production work; review results rather than bypassing findings.

## 10. Transport, Storage, Backups, and Logging

- Enforce HTTPS in deployed environments and use supported TLS configurations for external connections.
- Prefer managed encryption at rest and document provider responsibility and limitations.
- Encrypt especially sensitive application fields separately only when the threat model justifies it and key management is defined.
- Backups must be access-controlled, encrypted where supported, retention-limited, and covered by a tested restore procedure before production launch.
- Logs must use allow-listed structured fields. Do not log passwords, tokens, authorization headers, full payment data, private message content, or full customer profiles.
- Use opaque correlation IDs instead of personal identifiers where practical.
- Restrict production-log access and document retention, deletion, and incident access.
- Monitoring must distinguish availability telemetry from customer analytics. Optional analytics require separate privacy review and configuration.

## 11. External Integrations

Each external service must receive a documented review covering purpose, data fields, authentication, permissions, retention, failure behavior, terms, subprocessors, and deletion path.

- **Existing POS:** integrate through a narrow server-to-server contract. Define the source of truth, conflict handling, replay/idempotency, offline behavior, and audit events before implementation.
- **Messenger:** process only customer-initiated and policy-compliant requests; minimize stored platform identifiers and conversation content. Verify webhook signatures. Human handoff and uncertain-answer behavior must be specified.
- **AI-assisted features:** do not send customer personal data or full order history to a model by default. Document the exact purpose, inputs, outputs, provider retention, human oversight, error limits, and opt-out/notice requirements before activation. AI output must not authorize order, refund, loyalty, or account changes by itself.
- **Android:** no embedded privileged keys. Use the same authenticated API and authorization rules as the web client; protect local tokens using platform-supported secure storage.
- **Payment provider, analytics, maps, email/SMS, and push services:** remain unselected until justified and documented. Do not activate them with production data during evaluation.

## 12. Privacy and Security Operations

Before production launch, the team and business must establish:

1. A data inventory and processing record with purpose, lawful basis, recipients, retention, and responsible owner.
2. A reviewed privacy notice and consent interfaces only where consent is the documented basis.
3. A verified request process for identity verification, access, correction, objection, and deletion/blocking where applicable.
4. A retention schedule and automated/manual deletion procedure, including backups and third parties.
5. An incident plan covering triage, containment, evidence preservation, credential rotation, impact assessment, communication, and applicable NPC/data-subject notification decisions.
6. Named contacts and escalation routes, including the business's accountable privacy role.
7. Periodic access review, dependency review, RLS review, backup restore exercise, and security test schedule.
8. Secure offboarding for developers, staff, vendors, and integration credentials.

## 13. Security Verification Gates

No production release should proceed until evidence confirms:

- Threat model and data-flow review completed for the release scope.
- Authentication and authorization tests pass, including cross-customer denial cases.
- All relevant tables and storage buckets have reviewed, tested RLS/policies when Supabase is activated.
- Input-validation and business-integrity tests pass.
- Dependency and secret scans have no unresolved release-blocking finding.
- HTTPS, headers, origins, cookies/tokens, rate limits, and environment separation are verified in the deployment environment.
- Production bundles contain no privileged secret.
- Backup and restore responsibilities are documented and a restore exercise is recorded.
- Privacy notice, retention schedule, request handling, incident contacts, and vendor reviews are approved by the accountable business role.

Evidence must include the exact command or procedure, date, commit/deployment identifier, environment, literal result or attached record, and reviewer. Phase 1 has successful merged evidence. Phase 2 now has successful public-key catalog reads, live responsive rendering, a passing final local quality-gate rerun, refreshed secret/bundle scans, and both hosted workflows passed for evidence head `975561b`. Independent review remains pending. Authentication/customer authorization features are not implemented, and no production write-policy test was attempted.

## 14. Open Decisions and Owner Inputs

- TODO: Confirm with Brew ni Cat owner. Identify the customer profile fields that are necessary.
- The customer-arranged external-rider information is confirmed for public display and collects no location. **TODO: Confirm with Brew ni Cat owner.** Decide whether any future integrated delivery feature is approved and, if so, the minimum location/contact data required.
- Cash and GCash are confirmed for public display. **TODO: Confirm with Brew ni Cat owner.** Define any future online payment proof/provider, settlement, failure, and refund workflow.
- TODO: Confirm with Brew ni Cat owner. Set retention needs for accounts, orders, loyalty, inquiries, and security logs.
- TODO: Confirm with Brew ni Cat owner. Designate the business's accountable privacy/security contacts and escalation route.
- TODO: Confirm with Brew ni Cat owner. Review formal privacy notices, lawful bases, vendor terms, and applicable compliance obligations before production processing.
- TODO: Confirm with Brew ni Cat owner. Complete a POS-specific threat and data-flow assessment before integration work.

## 15. Change Control

Material changes to personal-data collection, authentication, roles, database exposure, third-party processors, AI use, payment, Messenger, Android, or POS integration require an architecture/security review and an entry in `docs/decisions.md`. Tests and this document must change with the implementation.

## 16. Phase 2 Security and Privacy Addendum

### 16.1 Public catalog controls

- `@supabase/supabase-js` 2.112.3 is instantiated only after both public configuration values are present.
- Auth token refresh, URL session detection, and session persistence are disabled because Phase 2 has no account feature.
- Queries select only `id`, names/category relation, public flavors/variants/prices, and availability; timestamps and unrelated/internal records are not requested.
- Raw provider errors and database details are not rendered. Customers receive a generic retry/contact state.
- Builds and CI need no production credential or network access.
- Application source contains no `INSERT`, `UPDATE`, `DELETE`, RPC, menu mutation, inventory/sales/customer/order operation, or privileged fallback. The follow-up performed catalog GET requests and HEAD-only/no-body accessibility probes; it did not retrieve unrelated table contents or mutate business data.

The earlier local privileged discovery credential was used only for the retained **BEFORE** read-only comparison. The live follow-up and evidence screenshots use the browser publishable configuration instead. No credential value or diagnostic payload is retained, and application runtime never depends on a privileged credential.

### 16.2 RLS/access decision

The owner/developer manually disabled RLS on the relevant catalog tables to unblock public catalog verification. This allowed the publishable runtime to display the real menu, but it is not a least-privilege security resolution. Current access depends on table grants, and the follow-up did not test writes against production.

Before production deployment, restore RLS and add reviewed, explicit anonymous `SELECT` policies limited to the intended public catalog rows and fields. A non-production or otherwise approved policy test must demonstrate that approved catalog reads succeed, catalog writes fail, unrelated business/customer relations remain unreadable, and client bundles contain no privileged value. This remains an open Phase 2 security limitation and production blocker.

### 16.2.1 Public table exposure assessment

HEAD-only/no-body probes using the publishable identity checked accessibility without dumping sensitive records:

| Relation | Public result | Assessment |
| --- | --- | --- |
| `inventory` | Reachable; response count 11 | Unrelated business table publicly readable; production security blocker |
| `recipe_mappings` | Reachable; response count 20 | Unrelated internal mapping table publicly readable; production security blocker |
| `expenses` | Reachable; response count 76 | Sensitive business table publicly readable; production security blocker |
| `orders` | Reachable; response count 1,942 | Sensitive order table publicly readable; production security blocker |
| `order_items` | Reachable; response count 4,276 | Sensitive order-detail table publicly readable; production security blocker |
| `app_release` | Reachable; response count 19 | Unrelated table publicly reachable; requires least-privilege review |
| `customers` | HTTP 404 | Ambiguous: absent, unexposed, or hidden; not proof of denial |
| `sales` | HTTP 404 | Ambiguous: absent, unexposed, or hidden; not proof of denial |
| `payments` | HTTP 404 | Ambiguous: absent, unexposed, or hidden; not proof of denial |

No unrelated row body was retrieved. No public write was attempted, so this evidence must not be represented as proof that writes are denied.

### 16.3 Approved customer photographs

The client approved the local shop/customer imagery for website use. Phase 2 limits publication to 19 curated images, avoids names and sensitive/personal inferences in alternative text, and does not add face recognition, biometric processing, customer tagging, third-party image upload, or unnecessary metadata display. Approval to display an image does not authorize unrelated reuse.

### 16.4 Public delivery and contact information

The contact page publishes only the confirmed business address, phone, email, payments, takeout fee, social links, and informational rider links. It collects no address/contact form data. Rider links are external; the copy states that customers book and pay riders independently and that Brew ni Cat does not control availability, fee, or ETA. External links use appropriate browser separation.

### 16.5 Pre-PR checks

Before commit/PR, inspect staged and unstaged diffs, verify `.env.local` is untracked/ignored, search tracked text for credential-like values without printing any value, inspect browser-facing source for privileged-variable references, and run formatter/lint/type/test/build/browser/document validators. Record literal results only after execution.
