# Phase 2 Project Management and Readiness Report

*Project:* Brew ni Cat Connect
*Phase:* Phase 2 — Public Showcase Website
*Project Manager:* Van
*Status:* In Progress / Pre-QA Team Integration
*Last Updated:* 2026-08-26

## 1. Phase 2 Objective

Phase 2 delivers Brew ni Cat Coffee Shop's public-facing showcase website.

Current Phase 2 scope includes:

- Home
- Menu
- About
- Gallery
- Contact / Location
- Official Brew ni Cat branding
- Approved local shop imagery
- Read-only live Supabase menu data
- Responsive and accessible customer-facing pages

The following are not part of Phase 2:

- Cart
- Checkout
- Order submission
- Customer accounts
- Loyalty
- Order tracking
- Messenger assistant
- Android application
- POS synchronization changes

These remain future-phase work.

## 2. Current Project Status

| Area | Status |
| --- | --- |
| Phase 2 implementation | Complete for development |
| Phase 2 branch | feat/showcase-website |
| Phase 2 Pull Request | PR #2 — Open |
| Shan documentation contribution | Merged through PR #3 |
| Latest GitHub CI | Pass |
| Live Supabase menu | Working |
| Automated developer verification | Pass |
| Independent QA by Renier | Pending |
| Phase 2 merge to main | Pending |
| Phase 3 | Not started |

## 3. Team Responsibility Status

### Rodnee — Developer / Business Liaison

Current responsibilities:

- Phase 2 implementation
- Supabase menu integration
- Git and Pull Request maintenance
- Technical fixes
- Business-owner communication

Current status:
Development implementation completed and waiting for independent QA.

### Shan — Technical Writer / Documenter

Current responsibilities:

- Business content verification
- Documentation consistency
- Phase 2 evidence organization

Current status:
Documentation contribution completed and merged through PR #3.

### Renier — QA Tester

Current responsibilities:

- Independent manual testing
- Automated verification
- Source/code inspection
- Regression testing
- Formal PR review

Current status:
Independent Phase 2 QA pending.

### Rizjie — Presenter / Pitcher

Current responsibilities:

- Phase 2 presentation story
- Demo flow
- Panel questions and answers
- Customer/presentation review

Current status:
Presentation contribution pending / To Do.
Reason: The presentation contribution has not formally started yet.

### Van — Project Manager

Current responsibilities:

- Track Phase 2 progress
- Monitor team tasks
- Record risks and blockers
- Control Phase 2 scope
- Prepare QA readiness gate
- Prepare merge readiness gate

Current status:
Project-management readiness review in progress.

## 4. Completed Phase 2 Milestones

- Phase 2 feature branch created.
- Public Brew ni Cat showcase website implemented.
- Official logo and approved shop photos integrated.
- Live current Supabase menu integrated.
- Supabase established as the source of truth for current menu and pricing.
- Menu posters retained only as visual reference.
- Phase 1 UX duplicate-menu finding resolved.
- Phase 1 Windows line-ending finding resolved.
- Automated tests and responsive checks implemented.
- Shan documentation contribution merged through PR #3.
- Current GitHub CI passes.

## 5. Pending Work

The following must still be completed before Phase 2 is considered finished:

- Renier performs independent Phase 2 QA.
- Renier records actual PASS/FAIL results.
- Renier performs peer code review.
- Any blocking QA findings are fixed.
- Required regression testing is completed after fixes.
- Renier submits formal GitHub review.
- Final Phase 2 merge-readiness decision is recorded.
- PR #2 is merged only after the QA gate is complete.

## 6. Current Risks and Limitations

### RISK-P2-001 — Supabase RLS Disabled

Current Supabase Row Level Security is disabled.

The live public menu works, but unrelated POS tables may currently be publicly reachable.

Current handling:

- The limitation is documented.
- The browser continues to use only the Supabase publishable key.
- No privileged secret is intentionally exposed in client code.
- Database security hardening remains required before production deployment.

Status:
OPEN / Known security hardening follow-up.

### RISK-P2-002 — Independent QA Pending

Developer verification has passed, but independent QA has not yet been completed.

Status:
OPEN.

Mitigation:
Renier must perform independent QA and PR review before the Phase 2 merge gate is completed.

## 7. QA Readiness Checklist

Before handing Phase 2 to QA:

- [x] Phase 2 development implementation completed
- [x] Live menu works from Supabase
- [x] Current menu/pricing uses Supabase as source of truth
- [x] Developer automated verification completed
- [x] Documentation contribution integrated
- [x] Latest CI passes
- [x] PR #2 remains open
- [ ] Renier begins independent QA

## 8. Phase 2 Merge Readiness Checklist

Phase 2 must NOT be marked Done until:

- [ ] Renier manual QA completed
- [ ] Renier automated verification completed
- [ ] Renier code review completed
- [ ] Blocking defects resolved
- [ ] Regression tests passed after required fixes
- [ ] Formal GitHub review submitted
- [ ] Final CI passes
- [ ] Project Manager verifies team deliverables
- [ ] PR #2 approved for merge

## 9. Phase 3 Gate

Phase 3 must not begin from the Phase 2 Pull Request.

Phase 3 may begin only after the team formally closes the Phase 2 development and QA cycle.

Planned Phase 3 focus:

- customer menu ordering flow
- cart
- item customization
- pickup / external-rider delivery choice
- checkout flow
- order submission

## 10. Project Manager Decision

Current recommendation:

*Phase 2 is ready for independent QA, but is not yet ready to be marked Done.*

PR #2 must remain open until Renier completes independent QA and the team resolves any blocking findings.