# Project Overview

**Project:** Brew ni Cat Connect\
**Academic title:** Development of an Omnichannel Online Ordering and Intelligent Customer Engagement System for Brew ni Cat Coffee Shop\
**Version:** 0.1 Draft\
**Status:** Version 0.1 Draft — Phase 2 public showcase in Testing / Review\
**Last updated:** 2026-08-24

## 1. Purpose

Brew ni Cat Connect is a customer-facing digital platform that will establish an official web presence for Brew ni Cat Coffee Shop and progressively support a consistent customer journey across the website, a future Android application, and a future Facebook Messenger assistant.

The platform is intended to solve these documented problems:

- customers need an authoritative, mobile-friendly place to discover the shop and its confirmed offerings;
- online ordering and order-status interactions need a consistent customer experience;
- customer account and loyalty capabilities need a shared data model rather than channel-specific records; and
- future customer-channel activity must integrate with, rather than duplicate, the existing Brew ni Cat POS.

No unverified claim is made about current business processes, transaction volumes, menu data, or POS capabilities.

## 2. Intended users and stakeholders

| Role | Intended interaction | Current status |
| --- | --- | --- |
| Visitor | View confirmed public business information and the read-only current menu | Phase 2 implemented surface; live anonymous menu rows blocked by existing access policy |
| Customer | Order, track orders, and use account features when implemented | Planned |
| Shop staff | Receive and update online orders through an approved integration workflow | Planned; workflow requires POS analysis |
| Business owner/authorized manager | Confirm business content, scope, policies, and integration decisions | Required stakeholder |
| Development team | Design, implement, test, review, deploy, and maintain the system | Active through Phase 2 |
| Academic evaluators | Assess requirements, design evidence, tests, and process artifacts | Planned repository audience |

Role names describe system responsibilities and do not define specific people or permissions. Authorization rules will be specified before protected features are implemented.

## 3. Product scope

### 3.1 In scope across the roadmap

- responsive official business website;
- confirmed menu presentation and product discovery;
- customer ordering for approved fulfillment methods;
- customer authentication and account management;
- order history and status tracking;
- favorites, reorder, loyalty, and rewards when business rules are confirmed;
- a shared cloud backend and documented APIs;
- controlled integration with the existing POS after architecture analysis;
- a Messenger customer assistant using the shared backend;
- an Android customer application using the shared backend; and
- testing, security, privacy, deployment, maintenance, and academic evidence.

These items are planned roadmap scope, not implemented functionality.

### 3.2 Initial release sequence

1. Phase 0: specification and architecture.
2. Phase 1: web project foundation and responsive shell.
3. Phase 2: public business showcase using confirmed content or labelled fixtures.
4. Phase 3: menu and ordering experience.
5. Phase 4: cloud backend and customer accounts.
6. Later phases: customer experience, POS integration, Messenger, Android, QA, and deployment.

Each phase is gated by relevant decisions, requirements, and verification.

## 4. Relationship to Brew ni Cat POS

The existing Brew ni Cat POS remains the business-side point-of-sale system. Brew ni Cat Connect is not a replacement and must not reproduce POS sales-management screens merely to create an administrative module.

Before integration work, the team will inspect and document:

- the POS technology and data model;
- ownership/source of truth for products, prices, availability, orders, and statuses;
- the approved integration mechanism;
- authentication, authorization, audit, retry, conflict, and offline behavior; and
- test and rollback procedures that do not risk production data.

Connect will interact through an explicitly designed integration boundary. Direct exposure of POS tables to public clients is out of scope.

## 5. Business-information boundary

The Phase 2 client brief confirms the public address and landmark, contact details, Facebook/TikTok destinations, Cash/GCash acceptance, ₱10 takeout box, variable-hours notice, official logo, approved shop/customer imagery, and customer-arranged external-rider information. The existing Supabase catalog is the current menu source, although its anonymous policy currently returns zero rows.

The following values remain unresolved:

- promotions and future ordering customization/add-on rules;
- pickup, cancellation/refund, online-payment, and loyalty rules;
- whether a future integrated delivery workflow will collect location data or calculate any charge;
- owner/staff identities and operational permissions; and
- the full POS interface, mutation authority, data ownership, and synchronization contract.

For each unresolved owner decision: **TODO: Confirm with Brew ni Cat owner.**

Development fixtures, if later needed, will be stored separately from production data and visibly labelled `MOCK DATA — FOR DEVELOPMENT ONLY`.

## 6. Explicit exclusions and constraints

- No existing POS recreation.
- No in-app delivery, rider booking, fee calculation, or ETA guarantee. Phase 2 may display the confirmed customer-arranged external-rider workflow; any integrated delivery feature still requires approval and testable requirements.
- No real payment integration until provider, workflow, security, and business policy decisions exist.
- No AI feature without a defined customer purpose, bounded data access, evaluation criteria, and human-manageable fallback behavior.
- No production customer or POS data during unapproved development/testing.
- No special hardware unless a later verified requirement justifies it.
- No claim that a planned, in-development, or untested feature is operational.

## 7. Status vocabulary

| Status | Meaning |
| --- | --- |
| Planned | Approved as roadmap/specification work but not started |
| In development | Work has begun and is not yet verified complete |
| Implemented | Code/configuration exists but required testing may remain |
| Tested | Defined verification has run and evidence is recorded |
| Deferred | Intentionally postponed to a later gate or decision |
| Blocked | Progress needs documented owner input, credentials, or an external dependency |

## 8. Success indicators

Success will be evaluated against approved requirements rather than invented business metrics. At minimum, the project should provide:

- requirement-to-test traceability;
- a responsive and accessible customer experience;
- secure separation of public, customer, staff/integration, and secret-bearing operations;
- reliable order state and data-integrity behavior;
- documented integration contracts that protect the POS;
- repeatable test, review, build, and deployment evidence; and
- documentation that accurately distinguishes planned and verified work.

Business-specific acceptance targets remain **TODO: Confirm with Brew ni Cat owner.**

## 8. Phase 2 Current Public Boundary

Phase 1 was tested, approved by Renier Apal, and merged through Pull Request #1 at merge commit `11c546d`. Phase 2 replaces the placeholders with Home, Menu, About, Gallery, and Contact experiences using the official logo, 19 curated approved photographs, and the client-confirmed facts dated 2026-08-24.

Current-menu retrieval is the one intentional Phase 2 Supabase exception to the original later-backend roadmap. It is read-only, runs at browser request time through public configuration, maps `categories` and `items` into application types, and does not include authentication, customer records, ordering, or mutations. Existing anonymous policy behavior currently returns zero catalog rows, which the public UI reports honestly. A reviewed public-read boundary remains a release prerequisite.

The published independent-rider information does not enable delivery: customers book/pay riders separately and Brew ni Cat does not control fees, availability, or ETA.
