# Brew ni Cat Connect — Functional Requirements

- **Version:** 0.1 Draft
- **Date:** 2026-08-18; Phase 2 status update 2026-08-24
- **Phase:** Living requirements through Phase 2
- **Status note:** Phase 1 is Tested and merged. Phase 2 requirements are Implemented or In development only where marked; developer automation passed and independent QA remains pending. Later and conditional capabilities remain Planned or Deferred.

## 1. Requirement conventions

- **Shall** indicates mandatory behavior for the requirement's target release.
- Acceptance criteria describe observable results; detailed test data will be recorded in `test-cases.md` when implementation begins.
- Production content must be owner-approved. Unknown facts use **TODO: Confirm with Brew ni Cat owner.**
- UI fixture content must be labeled **MOCK DATA — FOR DEVELOPMENT ONLY** and isolated from production data.
- Implementation commits, pull requests, and test cases must reference relevant `FR-###` IDs.

## 2. Public website

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-001 | The system shall provide a public, mobile-first home page that identifies Brew ni Cat Connect as the official customer-facing site and presents owner-approved branding. | At supported viewport sizes, the page renders the official logo, recognizable header, primary customer content, and footer without horizontal scrolling; only approved assets/text appear. | Must | 2 | Implemented |
| FR-002 | The system shall present owner-approved About content without inventing business history, owner details, or claims. | Published copy is traceable to the confirmed opening date, location, offerings, and digitalization context; unavailable owner-story details are omitted rather than fabricated. | Must | 2 | Implemented |
| FR-003 | The system shall display configured location, variable-hours notice, contact information, payment/takeout facts, and social links. | Each confirmed field renders accurately and each link uses its configured destination; the site tells customers to check Facebook/contact the shop rather than promising a fixed schedule. | Must | 2 | Implemented |
| FR-004 | The system shall provide consistent navigation to Home, Menu, About, Gallery, and Contact content, plus ordering/account entry points only when those modules are enabled. | Every visible navigation control reaches the named destination using keyboard, pointer, and touch; one Menu destination is shown and disabled modules are not presented as operational. | Must | 2 | Implemented |
| FR-005 | The system shall present an owner-approved gallery with meaningful alternative text or an explicit decorative-image treatment. | Every rendered image comes from the approved local set, avoids identifying customers, and has meaningful generic alternative text or an appropriate empty alternative. | Should | 2 | Implemented |
| FR-006 | The system shall present approved customer-favorite groups and shall obtain any displayed current product name or price from the authoritative menu source. | Matcha, Takoyaki, and Fries may be labelled as customer favorites without unsupported analytics; all three cards link to the live Menu, any specific catalog record/price matches Supabase, and a truthful state appears if public rows are unavailable. | Should | 2–4 | Implemented |
| FR-007 | The system shall display promotions only when an approved promotion is active and its conditions are available to the customer. | Before start and after end, the promotion is absent or explicitly inactive; while active, configured terms and validity period render. Promotion rules are **TODO: Confirm with Brew ni Cat owner.** | Should | 2–4 | Planned |
| FR-008 | The system shall provide clear loading, empty, and recoverable error states for public dynamic content. | Simulated success, empty response, configuration/retrieval failure, and retry each yield a distinct non-blocking, accessible UI state. | Must | 2 | Implemented |
| FR-009 | The system shall expose page titles, headings, and share/search metadata derived from approved business content. | Each public route has one descriptive page title and primary heading; metadata accurately identifies the Kabacan business and does not claim online ordering is live. | Should | 2 | Implemented |

## 3. Menu

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-010 | The system shall list publicly readable menu categories in authoritative order when supplied, with a documented deterministic fallback when the source has no display order. | Only categories returned by the approved public source appear; Phase 2 sorts valid names alphabetically because no display-order field was discovered, and shows a documented empty state when no public rows are readable. | Must | 2–4 | Implemented |
| FR-011 | The system shall list public products under their assigned categories using authoritative Supabase names and current prices. | Typed API/UI results match representative live publishable-runtime records; no poster-derived price appears, zero base-price sentinels do not render as prices, price formatting is consistent, and zero public rows still produce a truthful empty state. | Must | 2–4 | Implemented |
| FR-012 | The system shall show a product detail view containing the approved description, image, base price, availability, and configurable choices. | Opening a product displays exactly the published fields; missing optional content has a defined omission/fallback rather than invented copy. | Must | 3 | Planned |
| FR-013 | The system shall enforce required option groups, allowed choice counts, and mutually exclusive choices when configuring a product. | Invalid configurations cannot be added to the cart; valid minimum/maximum combinations can be added and retain selected choices. Option rules are **TODO: Confirm with Brew ni Cat owner.** | Must | 3–4 | Planned |
| FR-014 | The system shall calculate the displayed configured-item price from the authoritative base price, option adjustments, add-ons, and quantity. | Unit and line totals match the server-side calculation for zero, one, and multiple adjustments; client-supplied prices are not trusted. | Must | 3–4 | Planned |
| FR-015 | The system shall distinguish available, temporarily unavailable, and unknown-availability products without enabling purchase in Phase 2. | The public browse UI presents each returned availability state with text rather than color alone; Phase 3 ordering controls remain absent. | Must | 2–4 | Implemented |
| FR-016 | The system shall allow customers to navigate the public menu by category while retaining access to the complete returned catalog. | Selecting a category navigation link reaches its labelled section without hiding other returned categories or requiring a page reload. | Should | 2–3 | Implemented |

## 4. Ordering

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-017 | The system shall add a valid configured product and quantity to a customer cart. | A valid item appears with product, selections, unit price, quantity, and line total; invalid or unavailable configurations are rejected with a specific message. | Must | 3 | Planned |
| FR-018 | The system shall allow a customer to change quantity, edit configuration, and remove cart items. | Each action updates the cart deterministically; quantity cannot fall outside documented limits and removing the last item produces an empty-cart state. Limits are **TODO: Confirm with Brew ni Cat owner.** | Must | 3 | Planned |
| FR-019 | The system shall preserve the active cart across supported in-site navigation and an ordinary page reload on the same device. | A cart created in a test session remains intact after navigation and reload until checkout, explicit clearing, logout rules, or documented expiration. Cart expiration is **TODO: Confirm with Brew ni Cat owner.** | Should | 3 | Planned |
| FR-020 | The system shall display an itemized order summary calculated from current authoritative data before submission. | Summary shows each item/configuration/quantity and all approved charges; the displayed grand total equals the sum of line totals and configured charges. | Must | 3–4 | Planned |
| FR-021 | The system shall revalidate product availability, configurations, and prices on the server immediately before creating an order. | A stale/altered cart is rejected or returned with explicit changes; the database never accepts a client-provided price as authoritative. | Must | 3–4 | Planned |
| FR-022 | The system shall provide pickup as the initial fulfillment mode and collect only the checkout fields required by the approved workflow. | A valid pickup checkout can proceed; missing required fields produce field-specific errors and no order. Pickup details are **TODO: Confirm with Brew ni Cat owner.** | Must | 3–4 | Planned |
| FR-023 | The system shall support guest or account-required checkout according to an owner-approved policy. | Automated cases confirm the selected policy permits and rejects the appropriate identity states. **TODO: Confirm with Brew ni Cat owner.** | Must | 3–4 | Planned |
| FR-024 | The system shall create at most one order for one confirmed checkout attempt. | Repeating a submission with the same idempotency key returns the original result and creates no duplicate order or loyalty transaction. | Must | 4 | Planned |
| FR-025 | The system shall issue a non-secret, unique customer-facing order reference after successful order creation. | Successful creation returns one reference mapped to the order; failed creation does not display a false success/reference. | Must | 3–4 | Planned |
| FR-026 | The system shall show an order confirmation containing the accepted order snapshot, reference, initial status, and approved next-step instructions. | The confirmation matches the persisted order and is reloadable through the authorized tracking mechanism. Instructions are **TODO: Confirm with Brew ni Cat owner.** | Must | 3–4 | Planned |
| FR-027 | The system shall allow an authorized shop workflow to accept or reject a newly submitted online order and, for rejection, record a customer-safe reason category/message. | Authorized actions result in exactly one permitted transition; unauthorized actors receive no capability; the customer sees the resulting status. Workflow and reasons are **TODO: Confirm with Brew ni Cat owner.** | Must | 4–6 | Planned |
| FR-028 | The system shall enforce the approved order state machine server-side and append status history for each successful transition. | Tests cover every allowed and disallowed transition; disallowed transitions leave current state/history unchanged. Final states/rules are **TODO: Confirm with Brew ni Cat owner.** | Must | 4 | Planned |
| FR-029 | The system shall present only owner-approved payment methods and shall not mark an order paid without authoritative provider/staff confirmation. | No unconfigured method is visible; forged client payment state is rejected. Payment scope is **TODO: Confirm with Brew ni Cat owner.** | Must if payments enabled | Later decision | Deferred |
| FR-030 | The system shall enable delivery only after service area, fee, address, timing, failure, and privacy rules are approved and tested. | Delivery controls remain disabled until all named rules are configured; boundary and fee cases pass tests before activation. **TODO: Confirm with Brew ni Cat owner.** | Could | Later decision | Deferred |

## 5. Customer authentication

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-031 | The system shall register a customer using the minimum approved identity attributes through the selected authentication provider. | Valid input creates one identity; duplicate/invalid input returns a non-sensitive error; collected attributes match the documented data inventory. Registration fields are **TODO: Confirm with Brew ni Cat owner.** | Must | 4 | Planned |
| FR-032 | The system shall authenticate a customer using the selected provider and establish a time-limited session. | Valid credentials establish a session; invalid credentials do not; response messages do not reveal whether an unrelated account exists. | Must | 4 | Planned |
| FR-033 | The system shall terminate the current customer session on logout and remove protected account data from the active UI. | After logout, protected routes/API calls require authentication and browser back navigation does not reveal live protected data. | Must | 4 | Planned |
| FR-034 | The system shall provide a provider-supported password reset or account recovery flow without exposing credentials. | A valid recovery flow changes access only after verification; tokens expire/cannot be reused; enumeration-resistant responses are used. | Must | 4 | Planned |
| FR-035 | The system shall require verified ownership of the configured contact channel before enabling actions designated as verified-only. | Attempts before verification are blocked and attempts after verification succeed; which actions require verification is documented. **TODO: Confirm with Brew ni Cat owner.** | Should | 4 | Planned |
| FR-036 | The system shall restore a still-valid session after an ordinary reload and send an expired session to login without losing public browsing access. | Valid and expired session cases follow the specified route/API behavior with no infinite redirect. | Must | 4 | Planned |
| FR-037 | The system shall not expose administrative or service-role authentication capabilities through customer registration or client bundles. | Build/configuration inspection finds no privileged key; customer tokens fail authorized-staff policy tests. | Must | 4 | Planned |

## 6. Customer account

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-038 | The system shall let an authenticated customer view and update only the approved fields of their own profile. | Owner A can read/update Owner A's allowed fields and cannot read/update Owner B's record; invalid fields are rejected. Allowed fields are **TODO: Confirm with Brew ni Cat owner.** | Must | 5 | Planned |
| FR-039 | The system shall display the authenticated customer's order history using authorized, paginated results. | Only that customer's orders appear; empty and multi-page cases render; another customer's identifier yields no disclosure. | Must | 5 | Planned |
| FR-040 | The system shall let an authenticated customer add and remove published products from their favorites. | Add is idempotent, remove affects only that customer, duplicates are prevented, and unavailable/unpublished display rules are enforced. | Should | 5 | Planned |
| FR-041 | The system shall let an authenticated customer initiate a reorder from a prior order without bypassing current validation. | Reorder creates a cart candidate, rechecks current products/options/prices/availability, and explicitly identifies anything changed or unavailable. | Should | 5 | Planned |
| FR-042 | The system shall provide a documented mechanism for customers to request correction or deletion of eligible profile data. | A request is recorded/routed without exposing another customer's data; fulfillment and legally/operationally retained records follow the approved policy. **TODO: Confirm with Brew ni Cat owner.** | Must before production | 5/10 | Planned |
| FR-043 | The system shall prevent account closure from silently corrupting or deleting records that must be retained for order integrity. | Closure test anonymizes/deletes eligible fields while order/accounting references follow the approved retention design. **TODO: Confirm with Brew ni Cat owner.** | Must before production | 5/10 | Planned |

## 7. Order tracking

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-044 | The system shall let an authenticated customer view only their own current and historical order status. | Cross-account tracking attempts fail without confirming protected order details. | Must | 4–5 | Planned |
| FR-045 | If guest ordering is approved, the system shall protect guest tracking with a sufficiently unguessable possession-based credential in addition to any human-readable reference. | Reference alone cannot retrieve personal/order details; valid tracking credential can; logging does not expose the credential. **TODO: Confirm with Brew ni Cat owner.** | Must if guest checkout | 4–5 | Planned |
| FR-046 | The system shall display current status and ordered status-history entries using customer-readable labels and timestamps. | Tracking matches persisted current/history state and orders events consistently; internal-only notes are absent. | Must | 4–5 | Planned |
| FR-047 | The system shall deliver authorized realtime status updates when available. | An authorized state change appears in an active test client without a full reload within the NFR-004 target; an unauthorized subscriber receives no event. | Should | 4–5 | Planned |
| FR-048 | The system shall provide manual or timed refresh when realtime connectivity is unavailable. | Disconnecting realtime leaves a visible stale/retry state and refresh retrieves the latest authorized status without duplicating history. | Must | 4–5 | Planned |
| FR-049 | The system shall communicate rejected, delayed, or failed order states using approved, actionable customer-safe content. | Each exceptional state renders the configured explanation/contact next step without exposing internal errors. Content is **TODO: Confirm with Brew ni Cat owner.** | Must | 4–5 | Planned |

## 8. Loyalty and rewards

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-050 | The system shall maintain at most one active loyalty account per eligible customer. | Concurrent or repeated enrollment produces one active account and a deterministic response. Eligibility is **TODO: Confirm with Brew ni Cat owner.** | Must | 5 | Planned |
| FR-051 | The system shall calculate earned points only from an authoritative completed-order event and an owner-approved formula. | Non-completed/replayed orders earn zero additional points; known completed-order examples match the configured formula. Formula is **TODO: Confirm with Brew ni Cat owner.** | Must | 5 | Planned |
| FR-052 | The system shall record loyalty changes as immutable transactions with reason, delta, source reference, and timestamp. | Every balance change has one traceable transaction; direct client balance updates fail; transaction sum reconciles to balance. | Must | 5 | Planned |
| FR-053 | The system shall display the authenticated customer's current loyalty balance and transaction history. | Display reconciles to authorized transactions and does not disclose another customer's balance/history. | Must | 5 | Planned |
| FR-054 | The system shall list only active rewards for which the customer can see eligibility and required points/conditions. | Active/inactive and eligible/ineligible fixtures render correctly; actual rewards and rules are **TODO: Confirm with Brew ni Cat owner.** | Should | 5 | Planned |
| FR-055 | The system shall validate and apply reward redemption atomically against current eligibility, balance, reward status, and order constraints. | Concurrent/duplicate redemption cannot overspend or apply the same reward twice; failure changes neither points nor order. | Must | 5 | Planned |
| FR-056 | The system shall support authorized, auditable corrections without editing or deleting prior loyalty transactions. | A correction produces a new adjustment record with actor/reason; unauthorized correction fails. Staff authority/rules are **TODO: Confirm with Brew ni Cat owner.** | Must | 5–6 | Planned |
| FR-057 | The system shall apply points expiration only if an owner-approved rule has been configured and disclosed. | With no approved rule, no expiration job changes points; with a rule, boundary-date cases match it and create transactions. **TODO: Confirm with Brew ni Cat owner.** | Could | 5 | Deferred |

## 9. Facebook Messenger assistant

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-058 | The Messenger integration shall verify webhook subscription requests and validate signed incoming requests according to current Meta documentation. | Valid verification/signatures are accepted; invalid/replayed inputs follow the documented rejection/idempotency behavior; secrets remain server-side. | Must | 7 | Planned |
| FR-059 | The assistant shall answer approved FAQ and business-information inquiries from the same authoritative content used by the website. | Test questions return configured content or an explicit unavailable/handoff response; no business fact is invented. FAQ content is **TODO: Confirm with Brew ni Cat owner.** | Must | 7 | Planned |
| FR-060 | The assistant shall support menu discovery using the same published products, prices, and availability as other channels. | Channel contract tests return equivalent records for identical queries, subject only to presentation differences. | Must | 7 | Planned |
| FR-061 | The assistant shall guide a customer toward the shared ordering flow without creating a conflicting cart/order source. | Guided selections resolve to the shared backend or a secure web handoff; identical webhook retries create no duplicate order. | Should | 7 | Planned |
| FR-062 | The assistant shall disclose that it is an automated assistant and offer an approved fallback when it cannot answer reliably. | First-use/appropriate context includes disclosure; unsupported requests trigger a configured fallback rather than a fabricated answer. Human contact workflow is **TODO: Confirm with Brew ni Cat owner.** | Must | 7 | Planned |
| FR-063 | The assistant shall expose order tracking only after an approved identity/linking or possession check. | Reference-only and cross-user attempts reveal no protected details; valid linked/secure flow returns authorized status. | Must | 7 | Planned |
| FR-064 | Intelligent recommendations, if enabled, shall use published menu/availability data, label limitations, avoid sensitive profiling, and provide a deterministic fallback. | Evaluation set confirms unavailable/unpublished products are never recommended and low-confidence/tool-failure cases fall back. Purpose and approval are **TODO: Confirm with Brew ni Cat owner.** | Could | 7 | Deferred |

## 10. Android customer application

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-065 | The Android application shall use the same versioned backend contracts and authoritative business/menu data as the website. | Cross-channel contract tests show equivalent records and server-side rules for the same authorized request. | Must | 8 | Planned |
| FR-066 | The Android application shall support the approved core customer journey: authentication, menu, cart, ordering, tracking, loyalty, and profile. | Each included journey passes device/emulator acceptance tests; any intentionally omitted web feature is documented. | Must | 8 | Planned |
| FR-067 | The Android application shall store session material using platform-secure mechanisms and shall contain no privileged backend credential. | Static/build inspection finds no service-role secret; authenticated logout/expiration removes access as designed. | Must | 8 | Planned |
| FR-068 | The Android application shall handle temporary network loss with a clear offline/error state and shall not report an unconfirmed order as submitted. | Simulated disconnect preserves safe local state, shows retry guidance, and creates no duplicate order after reconnection. | Must | 8 | Planned |
| FR-069 | The Android application shall meet the same authorization and server-side validation rules as the web client. | Directly altered requests from the app fail the same backend policy/validation tests as altered web requests. | Must | 8 | Planned |
| FR-070 | Push notifications shall be opt-in and shall exclude sensitive order detail from lock-screen content by default if implemented. | Permission denial leaves core tracking usable; opt-out stops sends; payload/log inspection meets the approved privacy design. Notification use is **TODO: Confirm with Brew ni Cat owner.** | Could | 8 | Deferred |

## 11. Administration and existing POS integration

| ID | Requirement | Acceptance / verification | Priority | Target phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-071 | Before POS integration implementation, the project shall document the existing POS interfaces, identifiers, source-of-truth ownership, supported operations, and failure/security constraints. | An approved integration analysis maps each synchronized field/event and explicitly identifies unsupported operations; no production data is changed during analysis without approval. | Must | 6 gate | Planned |
| FR-072 | The system shall provide authorized maintenance of customer-facing content through an approved source without granting customers staff privileges. | Role-policy tests allow authorized maintenance actions and reject customer/anonymous writes. The chosen source/workflow is **TODO: Confirm with Brew ni Cat owner.** | Must | 4–6 | Planned |
| FR-073 | The system shall synchronize only documented menu fields between the authoritative source and customer channels. | Contract tests verify field mapping, create/update/unpublish cases, and no propagation of undocumented/internal fields. | Must | 6 | Planned |
| FR-074 | The integration shall preserve stable cross-system identifiers or an explicit mapping rather than matching records by display name alone. | Rename and duplicate-name tests continue to update the correct record; unmapped records enter a visible reconciliation state. | Must | 6 | Planned |
| FR-075 | The integration shall ingest each online order into the approved shop workflow at most once. | Replayed, concurrent, and timeout-retry delivery cases result in one mapped POS/shop order or one recoverable pending item, never silent duplicates. | Must | 6 | Planned |
| FR-076 | The integration shall synchronize only allowed order state transitions and identify the authoritative actor/source for each transition. | Allowed POS/backend transitions converge; disallowed/conflicting transitions are rejected or quarantined with an audit record. Rules are **TODO: Confirm with Brew ni Cat owner.** | Must | 6 | Planned |
| FR-077 | The integration shall handle network or POS downtime by preserving a visible pending/failed state and supporting idempotent retry or reconciliation. | Simulated outage loses no accepted cloud order; recovery retries do not duplicate; unresolved items are visible to authorized staff. | Must | 6 | Planned |
| FR-078 | The integration shall not expose POS tables, database credentials, privileged cloud keys, or internal endpoints to public clients. | Architecture/build/network inspection confirms public clients access only the approved backend boundary and policy tests deny direct privileged operations. | Must | 6 | Planned |
| FR-079 | The system shall create audit records for security- or business-significant staff/integration actions, including actor/source, action, target, result, and timestamp. | Acceptance cases produce queryable records with no secrets and with access restricted to approved roles. Retention is **TODO: Confirm with Brew ni Cat owner.** | Must | 4–6 | Planned |
| FR-080 | The system shall provide authorized staff a way to identify online orders requiring acceptance, rejection, retry, or reconciliation without rebuilding unrelated POS functions. | Fixtures in each actionable state are distinguishable and can invoke only documented actions; no cashier/accounting/inventory feature is introduced. | Must | 4–6 | Planned |
| FR-081 | The system shall apply availability changes from the authoritative source consistently across web, Android, Messenger, and checkout validation. | After an availability event, channel views meet the NFR freshness target and stale checkout is blocked server-side. Source and manual override policy are **TODO: Confirm with Brew ni Cat owner.** | Must | 4–8 | Planned |

## 12. Requirement dependencies and open owner decisions

| Decision | Affected requirements | Status |
| --- | --- | --- |
| Approved business content and assets | FR-001–FR-009, FR-059 | Phase 2 facts, official logo, and shop-photo use confirmed; extended About story remains **TODO: Confirm with Brew ni Cat owner.** |
| Authoritative menu, pricing, option, best-seller, promotion, and availability rules | FR-006–FR-016, FR-081 | Supabase is authoritative for current catalog fields; the publishable runtime currently returns 6 categories/16 items. Favorites groups are approved without exact rankings; promotions and ordering option rules remain **TODO: Confirm with Brew ni Cat owner.** |
| Pickup fields, guest policy, order states, rejection/cancellation instructions | FR-018–FR-028, FR-045, FR-049 | **TODO: Confirm with Brew ni Cat owner.** |
| Payment and delivery scope | FR-029–FR-030 | Cash/GCash, ₱10 takeout box, and customer-arranged external-rider information are confirmed for display only. Online payment, ordering fulfillment, fee calculation, and rider booking remain Deferred. |
| Customer profile and retention policy | FR-031, FR-035, FR-038, FR-042–FR-043 | **TODO: Confirm with Brew ni Cat owner.** |
| Loyalty rules and authority | FR-050–FR-057 | **TODO: Confirm with Brew ni Cat owner.** |
| Messenger handoff, transactional scope, and recommendation purpose | FR-061–FR-064 | **TODO: Confirm with Brew ni Cat owner.** |
| Notifications | FR-070 | Deferred; **TODO: Confirm with Brew ni Cat owner.** |
| Existing POS contract/source of truth | FR-071–FR-081 | Phase 2 inspected catalog source structures only; full synchronization contract, mutation authority, and Phase 6 approval remain pending. |

## 13. Traceability rule

Detailed test cases will use IDs such as `TC-###` and include a `Requirement IDs` field. No row's status may be changed to Tested solely because a related screen exists; its acceptance behavior, negative cases, authorization boundaries, and recorded command/result must be verified.

## 14. Phase 2 Implementation Status Note

The Phase 2 public routes and typed catalog client exist. The final formatter, audit, lint, type-check, 21/21 unit/component, build, 13/13 browser, and documentation-validator gates passed on 2026-08-24; live publishable Menu rendering also passed at five widths. **Implemented** does not mean independently Tested: Renier's QA and peer review remain pending.

FR-006, FR-010, FR-011, and FR-015 are **Implemented** because the publishable runtime now returns and renders the current 6-category/16-item catalog while retaining deterministic loading/empty/error coverage and omitting poster-derived or privileged data. This functional status does not close the security requirement: RLS is manually disabled, unrelated business tables are publicly reachable, and RLS restoration plus explicit catalog-only policies remain a production blocker.

FR-012–FR-014 remain Planned for Phase 3 because browse cards are not a purchase configuration/detail workflow, and no cart or price calculation is implemented. FR-007 remains Planned until an approved promotion exists.
