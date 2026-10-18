# Business Content Register

**Last Updated:** 2026-10-18
**Maintainer:** Shan (Technical Writer / Documenter)

This document tracks all business facts, copy, and media assets for Brew ni Cat Connect. It establishes the single source of truth for project data across Phase 2 and beyond.

---

## 1. Single Source of Truth Policy

* **Menu & Pricing Source of Truth:** Supabase database is the sole source of truth for current menu items and pricing.
* **Menu Posters & Static Images:** Physical/posted menu posters serve as visual reference only. They are not an authoritative source for real-time item availability or pricing.

---

## 2. Business Content Status Register

| Data / Asset Area | Details / Value | Status | Owner Approval Required? | Notes / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| **Official Logo & Branding** | Store logo and color palette assets stored in `/public/images/` | **Confirmed** | Approved | Sourced from official brand folder. |
| **Store Address & Location** | **Address:** Segundo St, Poblacion, Kabacan, Cotabato 9407, Philippines<br>**Landmark:** Beside Pulido Eatery | **Confirmed** | Approved | Exact street level details and landmark verified. |
| **Contact Information** | **Phone:** 0976 630 4785<br>**Email:** popotpulido06@gmail.com | **Confirmed** | Approved | Active store contact details confirmed. |
| **Social Media Links** | **Facebook:** Confirmed<br>**TikTok:** Confirmed<br>*(Note: Instagram is explicitly omitted/not supported)* | **Confirmed** | Approved | Official FB and TikTok channels active. No Instagram. |
| **Operating Hours** | **Open 11 AM to 10 PM, Monday to Saturday. Closed every Sunday.** Customers should check Facebook or contact the shop for any schedule changes. | **Confirmed** | Approved | Owner confirmed Sunday closure on 2026-09-24 and opening hours of 11 AM to 10 PM on 2026-10-11 (both relayed by Lead Developer). |
| **Payment Methods** | **Accepted:** Cash, GCash<br>*(Note: Maya / Maya QR removed)* | **Confirmed** | Approved | Cash on pickup and GCash accepted only. |
| **Delivery Model** | * Customer messages a local rider with the order summary.<br>* The rider orders at Brew ni Cat for the customer and picks it up.<br>* The rider delivers to the customer's address.<br>* Delivery fee, timing and payment are agreed with the rider.<br>* No in-house delivery fleet; Brew ni Cat does not book riders or charge rider fees. | **Confirmed** | Approved | Customer-arranged external rider model from the Phase 2 client brief. Updated 2026-10-18: the lead developer confirmed that the rider orders at the shop for the customer. |
| **Rider Delivery Services** | [Papa's Delivery](https://www.facebook.com/papa.s.delivery.2025)<br>[Momshie's Pamalengke and Delivery Kabacan](https://www.facebook.com/profile.php?id=100072119632881)<br>[M&S Delivery Express Kabacan](https://www.facebook.com/profile.php?id=100065168154381)<br>Logos in `public/images/riders/` | **Confirmed** | Approved | The three Facebook links came with the Phase 2 client brief (2026-08-24). Names and logos added 2026-10-18 (PR #25), supplied by the lead developer: the logos are the services' public profile photos, resized to 256 × 256 px with metadata removed, and their cover photos are not used. Listing a rider is not an endorsement or partnership. |
| **GCash QR Code** | Not yet supplied | **Pending** | Yes, awaiting owner | Requested from the owner (Popot). Not shown on the site until the shop sends it; no placeholder QR is used. |
| **Menu Product Photos** | Six product photos supplied by the shop (Takoyaki, Buldak Carbo, Buldak Cheese, Fries, Cat-Feine, Matcha) in `public/images/menu/items/`; one photo per item, EXIF/GPS removed. Menu-board images are not used on cards. | **Confirmed** | Approved | Shop-provided photos, approved for the Menu on 2026-10-15 (PR #16). Items without a matching photo stay imageless. |
| **Menu Items & Pricing** | Product catalog in Supabase DB | **Confirmed** | Approved | Supabase DB holds official pricing. Posters are secondary visuals. |

---

## 3. Confirmed Business Details Summary

1. **Address & Location:**
   **Address:** Segundo St, Poblacion, Kabacan, Cotabato 9407, Philippines
   **Landmark:** Beside Pulido Eatery

2. **Contact Information:**
   **Phone:** 0976 630 4785
   **Email:** popotpulido06@gmail.com

3. **Social Media Links:**
   **Facebook:** Confirmed
   **TikTok:** Confirmed
   *(Note: Instagram is explicitly omitted/not supported)*

4. **Operating Hours:**
   **Open 11 AM to 10 PM, Monday to Saturday. Closed every Sunday.** Check the official Facebook page or shop contact details for any schedule changes.

5. **Payment Methods:**
   **Accepted:** Cash, GCash
   *(Note: Maya / Maya QR removed)*
   **GCash QR:** Pending from the owner; not shown until the shop sends it.

6. **Delivery Model:**
   * Customer messages a local rider with the order summary.
   * The rider orders at Brew ni Cat for the customer, picks it up and delivers it to the customer's address.
   * Delivery fee, timing and payment are agreed with the rider.
   * No in-house delivery fleet; Brew ni Cat does not book riders or charge rider fees.
   * Listed riders: Papa's Delivery, Momshie's Pamalengke and Delivery Kabacan, and M&S Delivery Express Kabacan, linked to their public Facebook pages from Contact and Checkout.

7. **Menu & Pricing Source of Truth:**
   * Supabase database is the sole source of truth for current menu items and pricing.
   * Physical/posted menu posters serve as visual reference only.