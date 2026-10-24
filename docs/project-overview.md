# Project Overview

**Project:** Brew ni Cat Connect\
**Academic title:** Development of an Omnichannel Online Ordering and Intelligent Customer Engagement System for Brew ni Cat Coffee Shop\
**Course:** ICT05a Applications Development & Emerging Technologies\
**Version:** 0.1 Draft\
**Status:** Version 0.1 Draft — Phases 1 and 2 merged; Phase 3 browser-side ordering and the 3D and motion layer merged, server-side order creation planned\
**Last updated:** 2026-10-23

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
| Visitor | View confirmed public business information and the read-only current menu | Phase 2 implemented surface; publishable runtime renders 6 categories/16 items; RLS-disabled production security blocker remains (closed on 2026-10-24 by PR #41) |
| Customer | Order, track orders, and use account features when implemented | Phase 3 browser-side cart and checkout merged: the customer prepares an order summary and sends it to the shop; server-side orders, tracking and accounts are Planned |
| Shop staff | Receive and update online orders through an approved integration workflow | Planned; workflow requires POS analysis |
| Business owner/authorized manager | Confirm business content, scope, policies, and integration decisions | Required stakeholder |
| Development team | Design, implement, test, review, deploy, and maintain the system | Active through Phase 3 |
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
3. Phase 2: public business showcase using confirmed content or labeled fixtures.
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

The Phase 2 client brief confirms the public address and landmark, contact details, Facebook/TikTok destinations, Cash/GCash acceptance, ₱10 takeout box, opening-hours notice, official logo, approved shop/customer imagery, and customer-arranged external-rider information. The existing Supabase catalog is the current menu source; its publishable runtime now returns 6 categories and 16 items after RLS was manually disabled.

The following values remain unresolved:

- promotions and future ordering customization/add-on rules;
- pickup, cancellation/refund, online-payment, and loyalty rules;
- whether a future integrated delivery workflow will collect location data or calculate any charge;
- owner/staff identities and operational permissions; and
- the full POS interface, mutation authority, data ownership, and synchronization contract.

For each unresolved owner decision: **TODO: Confirm with Brew ni Cat owner.**

Development fixtures, if later needed, will be stored separately from production data and visibly labeled `MOCK DATA — FOR DEVELOPMENT ONLY`.

## 6. Explicit exclusions and constraints

- No existing POS recreation.
- No in-app delivery, rider booking, fee calculation, or ETA guarantee. The site explains the customer-arranged rider workflow (the customer messages a local rider, who orders at the shop and delivers) and lists the three local rider services; any integrated delivery feature still requires approval and testable requirements.
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

## 9. Phase 2 Current Public Boundary

Phase 1 was tested, approved by Renier Apal, and merged through Pull Request #1 at merge commit `11c546d`. Phase 2 replaces the placeholders with Home, Menu, About, Gallery, and Contact experiences using the official logo, 19 curated approved photographs, and the client-confirmed facts dated 2026-08-24.

Current-menu retrieval is the one intentional Phase 2 Supabase exception to the original later-backend roadmap. It is read-only, runs at browser request time through public configuration, maps `categories` and `items` into application types, and does not include authentication, customer records, ordering, or mutations. The initial zero-row state remains historical evidence; the current publishable runtime renders the live catalog. Because RLS is manually disabled and unrelated business tables are publicly reachable, restoring RLS and verifying explicit catalog-only anonymous `SELECT` policies remains a production release prerequisite. **Update (2026-10-24):** RLS is restored, and guests can read only the menu and the POS releases (PR #41).

The published rider information does not enable delivery: the customer messages a local rider, who orders at the shop for the customer and delivers it, and the fee, timing and payment are agreed with the rider. Brew ni Cat does not book riders, charge rider fees or control availability or ETA.

## 10. Phase 3 Current Ordering Boundary

Phase 2 merged on 2026-09-16 as `ae002f1` through Pull Request #2, after Renier's independent QA (Pull Request #6). Phase 3 adds browser-side ordering: the ordering core and cart domain (Pull Request #7), Van's cart drawer, cart page and checkout (Pull Request #14), and Shan's checkout validation (Pull Request #20). Prices come only from the current catalog. Checkout asks for a name, a Philippine mobile number and optional notes, plus a delivery address for rider delivery, which stay in the browser, and ends in an order summary that the customer copies and sends to Brew ni Cat through Facebook Messenger or by phone, or, for rider delivery, to a local rider. No order, name, phone number or address is sent to Supabase or any other server; server-side order creation, online payment and order tracking remain Planned.

Pull Request #23 adds the Night Shift Glow redesign on a decorative three.js and GSAP layer (ADR-014 and ADR-015); every page keeps its HTML content and controls without it. Pull Request #24 adds phone checks and 44 px tap targets and removes duplicate photographs, leaving 30 curated gallery photographs. Pull Request #25 updates the rider flow: a local rider orders at the shop for the customer and delivers it, checkout asks for a delivery address only for rider delivery, and the checkout and contact pages list the three local rider services with their names and logos. Pull Request #26 adds decorative Facebook, TikTok and contact icons (Lucide and Simple Icons shapes copied inline, not an npm package) beside the existing links and visit facts. The Phase 2 RLS blocker in §9 still stands. **Update (2026-10-24):** it is closed by PR #41.
