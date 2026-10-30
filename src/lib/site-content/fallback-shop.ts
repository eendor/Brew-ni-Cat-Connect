import type { ShopContent } from "./types";

/**
 * The shop's facts as they stood on 2026-10-30: hours, contact details,
 * address, payments, notice, social links and rider partners. The website
 * shows them only when the live content can't be read. Migration
 * 20261030120000_site_content.sql seeds the same values, and
 * tests/database/site-content.test.ts checks that they match. Shop facts may
 * only be written here and in fallback-pages.ts
 * (tests/unit/site-content-source.test.ts).
 */
export const fallbackShop: ShopContent = {
  hours: {
    days: {
      monday: {
        opens: "11:00",
        closes: "21:00",
      },
      tuesday: {
        opens: "11:00",
        closes: "21:00",
      },
      wednesday: {
        opens: "11:00",
        closes: "21:00",
      },
      thursday: {
        opens: "11:00",
        closes: "21:00",
      },
      friday: {
        opens: "11:00",
        closes: "21:00",
      },
      saturday: null,
      sunday: {
        opens: "13:00",
        closes: "21:00",
      },
    },
    note: "Check our Facebook page or contact us for any schedule changes.",
  },
  contact: {
    phone: "0976 630 4785",
    email: "popotpulido06@gmail.com",
  },
  address: {
    street: "Abellera St",
    area: "Poblacion",
    town: "Kabacan",
    province: "Cotabato",
    postalCode: "9407",
    country: "Philippines",
    landmark: "Beside Pulido Eatery",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=7.1134444%2C124.826155",
  },
  payments: {
    methods: ["Cash", "GCash"],
    qrCode: {
      src: "/images/payment/gcash-qr.svg",
      alt: "Brew ni Cat GCash and InstaPay QR code",
    },
  },
  notice: {
    text: "",
  },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100084186931413",
    facebookPhotos:
      "https://www.facebook.com/profile.php?id=100084186931413&sk=photos",
    tiktok:
      "https://www.tiktok.com/@potelco/video/7649246393923570965?_r=1&_t=ZS-977tdEv9JjR",
  },
  riders: {
    partners: [
      {
        name: "Papa's Delivery",
        href: "https://www.facebook.com/papa.s.delivery.2025",
        logo: "/images/riders/papas-delivery.jpg",
      },
      {
        name: "Momshie's Pamalengke and Delivery Kabacan",
        href: "https://www.facebook.com/profile.php?id=100072119632881",
        logo: "/images/riders/momshies-pamalengke-delivery.jpg",
      },
      {
        name: "M&S Delivery Express Kabacan",
        href: "https://www.facebook.com/profile.php?id=100065168154381",
        logo: "/images/riders/ms-delivery-express.jpg",
      },
    ],
  },
};
