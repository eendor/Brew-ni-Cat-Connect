# Business Content Register

**Last Updated:** 2026-08-24
**Maintainer:** Shan (Technical Writer / Documenter)

This document tracks all business facts, copy, and media assets for Brew ni Cat Connect. It establishes the single source of truth for project data across Phase 2 and beyond.

---

## 1. Single Source of Truth Policy

* **Menu & Pricing Source of Truth:** **Supabase Database**. All active products, categories, descriptions, and prices rendered in the application must be sourced from Supabase.
* **Menu Posters & Static Images:** Physical or digital menu posters serve solely as **visual reference** and static presentation material. They are **not** an authoritative source for real-time item availability or pricing.

---

## 2. Business Content Status Register

| Data / Asset Area | Details / Value | Status | Owner Approval Required? | Notes / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| **Official Logo & Branding** | Store logo and color palette assets stored in `/public/images/` | **Confirmed** | Approved | Sourced from official brand folder. |
| **Delivery Model** | Direct store pickup & third-party partner fulfillment | **Confirmed** | Approved | Standard fulfillment workflow documented. |
| **Payment Methods** | Cash on pickup, GCash, and Maya (manual verification) | **Confirmed** | Approved | No automated payment gateway integration in Phase 2. |
| **Menu Items & Pricing** | Product catalog in Supabase DB | **Confirmed** | Approved | DB schema holds official pricing. Posters are secondary visuals. |
| **Business Hours Wording** | Regular hours + *"Operating hours subject to change on holidays/special events."* | **Provisional** | **Yes** | Standard hours drafted; exact holiday wording pending sign-off. |
| **Store Physical Address** | Draft store address in footer/contact routes | **Provisional** | **Yes** | Awaiting final confirmation of complete street address and map pin. |
| **Contact Info & Socials** | Phone numbers, official FB/IG page handles | **Missing** | **Yes** | Placeholders currently used in `/contact`. Needs real owner data. |

---

## 3. Provisional Copy Pending Owner Sign-off

1. **Exact Operating Hours:** Finalize exact opening and closing times per day of the week, along with seasonal variations.
2. **Contact & Social Handles:** Provide active phone numbers, official Facebook page URL, and Instagram handle.
3. **Physical Store Address:** Verify the exact street level details for location mapping.
4. **About Us / Story Copy:** Final approval on the short brand story and store background copy used on the `/about` route.
