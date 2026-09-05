*Project:* Brew ni Cat Connect
*Phase:* Phase 2 — Public Showcase Website
*Presenter / Pitcher:* Rizjie
*Status:* Presentation Preparation
*Last Updated:* 2026-09-05

## 1. Presentation Objective

The Phase 2 presentation should show that Brew ni Cat Connect has progressed from a technical foundation into a real customer-facing website for Brew ni Cat Coffee Shop.

Do not claim future features such as ordering, accounts, loyalty, tracking, Messenger, Android, or POS synchronization are already implemented.

## 2. Short Project Introduction

Brew ni Cat Connect is the customer-facing platform being developed for Brew ni Cat Coffee Shop.

It complements the existing Brew ni Cat POS.

The POS focuses on internal shop/cashier operations, while Brew ni Cat Connect focuses on the customer experience.

The long-term platform will support discovery, menu browsing, ordering, tracking, loyalty, Messenger interaction, and an Android app.

Phase 2 only focuses on the official showcase website and live read-only menu.

## 3. Suggested 2–3 Minute Pitch

Brew ni Cat Connect is a customer-facing digital platform designed for Brew ni Cat Coffee Shop.

The business already has an internal POS system, but Brew ni Cat Connect has a different purpose. Instead of focusing on cashier and internal operations, this platform focuses on the customer journey.

For Phase 2, we developed Brew ni Cat's official public showcase website.

Customers can view the shop's branding, browse its current menu, learn basic information about the business, view approved shop photos, and find the shop's contact and location information.

One important part of this phase is the live menu. Instead of manually copying prices from old menu posters, the website reads the current menu data from Supabase. This means Supabase is treated as the source of truth for menu categories, items, variants, flavors, and prices.

The menu is currently browse-only. We intentionally did not implement cart, checkout, customer accounts, or order submission because those belong to later phases.

This phased approach allows us to properly develop, test, and document each part before adding more complex features.

After Phase 2 passes independent QA and review, the project can continue to the ordering experience in Phase 3.

## 4. Demo Flow

Demo order:

1. Home
2. Menu
3. Gallery
4. About
5. Contact / Location
6. Responsive/mobile view
7. GitHub / CI / QA evidence

### Home

Show:

- official Brew ni Cat logo/branding
- hero section
- featured menu groups
- gallery preview
- visit/contact information
- navigation

Explain:
The Home page introduces the business and gives customers direct access to the important areas of the website.

### Menu

Show:

- categories
- current items
- prices
- sizes/variants
- flavors
- combos
- availability
- Cat Treats marked as food for cats

Explain:
The current menu is retrieved from Supabase instead of manually copying old poster prices.

Do NOT demonstrate:

- cart
- checkout
- ordering
- payment

because those are not part of Phase 2.

### Gallery

Show the approved shop/customer photos.

Do not identify customers by name.

### About

Only explain confirmed business information.

Do not invent owner biography or business origin story.

### Contact / Location

Show:

- Segundo St, Poblacion, Kabacan, Cotabato 9407
- beside Pulido Eatery
- phone
- email
- Facebook / TikTok
- variable-hours notice
- Cash / GCash
- external rider information

Explain:
Brew ni Cat does not currently operate its own delivery fleet.

Customers arrange an external rider separately.

### Responsive View

Show desktop/mobile view.

Explain:
The website was designed and tested for different screen sizes.

### Development Evidence

If needed show:

- GitHub PRs
- CI checks
- tests
- documentation
- QA evidence after Renier finishes

## 5. Phase 2 Does NOT Include

Do not claim these are implemented:

- Cart
- Checkout
- Order submission
- Customer accounts
- Loyalty
- Order tracking
- Messenger assistant
- Android app
- POS synchronization changes
- Online payment processing

These belong to future phases.

## 6. Possible Panel Questions

### Q1. What is the difference between Brew ni Cat Connect and the POS?

The POS focuses on internal shop/cashier operations.

Brew ni Cat Connect focuses on the customer-facing experience.

### Q2. Why build the website before ordering?

We are developing the project in phases.

The showcase website establishes the official customer interface, business content, responsive design, and live menu foundation before adding transaction features.

### Q3. Where does the menu data come from?

The website retrieves current menu information from Supabase.

Supabase is the source of truth for current menu/prices.

Old posters are visual references only.

### Q4. Why Supabase?

Supabase gives us a shared cloud backend that can later support the website, orders, customer accounts, realtime tracking, Messenger, Android, and POS integration.

### Q5. Is ordering already working?

No.

Phase 2 is browse-only.

Ordering belongs to the next phase.

### Q6. Does Brew ni Cat have its own delivery riders?

No.

The customer arranges an external rider separately.

### Q7. Why are operating hours not fixed?

The real shop schedule can vary.

The website therefore asks customers to check Facebook or contact the shop for the current schedule.

### Q8. Are the customer photos allowed?

The photos being used were approved for website use.

The website also does not identify customers by name.

### Q9. What emerging technologies are being used?

The project uses a cloud backend through Supabase and is designed for future realtime tracking, Messenger interaction, mobile integration, and shared data across channels.

### Q10. How do you ensure quality?

We use automated tests, linting, type checking, builds, responsive testing, GitHub Actions CI, documentation, peer review, and independent QA.

### Q11. Why is Cat Treats separate?

Cat Treats is food intended for cats, not humans.

The website clearly labels it to avoid confusion.

### Q12. What happens after Phase 2?

After independent QA and merge, Phase 3 will focus on the customer ordering flow such as cart, customization, fulfillment choice, checkout, and order submission.

## 7. Presenter / Customer Review Notes

Reviewed by Rizjie against the live Phase 2 pages.

*Format:*

- Observation:
- Page:
- Why it may be confusing:
- Suggested improvement:

Do not directly edit website code.

If you find an issue, report it to Rodnee first.

### Observation 1

- **Observation:** Menu items do not show availability status (e.g., sold-out or currently unavailable items are not marked).
- **Page:** Menu
- **Why it may be confusing:** A customer could see an item listed and assume it's available to order (once ordering launches), when it may actually be out of stock.
- **Suggested improvement:** Add a visible "unavailable" or "sold out" tag/state for items not currently offered, sourced from the same Supabase data.

### Observation 2

- **Observation:** There's no mention of takeout or external rider pickup directly on the Menu page — it's only found on the Contact/Location page.
- **Page:** Menu (missing) / Contact & Location (currently has it)
- **Why it may be confusing:** A customer browsing the menu with intent to order via a rider (Grab, Lalamove, etc.) has to leave the menu and go find this info elsewhere, which adds friction.
- **Suggested improvement:** Add a small note or banner on the Menu page (e.g., "Available for pickup or via your own rider — see Contact for details") linking to the Contact page, so the info is visible where the buying intent actually happens.

### Observation 3

- **Observation:** On mobile, the navigation (Menu, Contact, About, etc.) is hidden behind a dropdown/hamburger menu and requires an extra tap to access, rather than being visible directly.
- **Page:** General / Mobile navigation (site-wide)
- **Why it may be confusing:** Not confusing exactly, but adds an extra step for mobile users, who are likely the majority of visitors.
- **Suggested improvement:** Consider a persistent bottom nav bar or always-visible top links for key pages (Menu, Contact) on mobile, instead of requiring the hamburger tap. This is a UX preference, not a bug — worth floating to Rodnee as a "nice to have," not a blocker.

### Other pages reviewed — no issues found

- **Home:** No issues found.
- **Gallery:** No issues found.
- **About:** No issues found; information shown is accurate.
- **Responsive/Mobile (layout):** No issues found aside from the navigation point in Observation 3.

## 8. Presenter Readiness Checklist

- [x] Reviewed the actual Phase 2 website
- [/] Verified the pitch matches implemented features
- [x] Verified future features are not presented as completed
- [/] Prepared the 2–3 minute pitch
- [/] Prepared the demo flow
- [/] Prepared panel questions and answers
- [x] Recorded customer/demo observations
- [/] Verified business claims against current project documentation

## 9. Presenter Recommendation

Current status:

Phase 2 presentation materials are being prepared before independent QA. Live-site review is complete; three refinement observations were logged for Rodnee (availability status, rider/pickup visibility on the Menu page, and mobile navigation visibility). None of these affect Phase 2 scope or block the presentation.

Do not claim Phase 2 is fully completed until QA and merge gates are finished.