export const siteConfig = {
  name: "Brew ni Cat Coffee Shop",
  shortName: "Brew ni Cat",
  productName: "Brew ni Cat Connect",
  description:
    "Discover Brew ni Cat Coffee Shop in Kabacan, Cotabato, browse the current menu, and find contact and visit information.",
  openingDate: "June 12, 2026",
  address: {
    street: "Segundo St, Poblacion",
    locality: "Kabacan, Cotabato 9407",
    country: "Philippines",
    landmark: "Beside Pulido Eatery",
    plusCode: "4R7G+9FC",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=7.1134444%2C124.826155",
  },
  contact: {
    email: "popotpulido06@gmail.com",
    emailHref: "mailto:popotpulido06@gmail.com",
    phone: "0976 630 4785",
    phoneHref: "tel:+639766304785",
  },
  operations: {
    hoursNotice:
      "Operating hours may vary. Check our Facebook page or contact us for today’s schedule.",
    payments: ["Cash", "GCash"],
    takeoutFee: "₱10 takeout box",
  },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100084186931413",
    facebookPhotos:
      "https://www.facebook.com/profile.php?id=100084186931413&sk=photos",
    tiktok:
      "https://www.tiktok.com/@potelco/video/7649246393923570965?_r=1&_t=ZS-977tdEv9JjR",
  },
  externalRiders: [
    "https://www.facebook.com/papa.s.delivery.2025",
    "https://www.facebook.com/profile.php?id=100072119632881",
    "https://www.facebook.com/profile.php?id=100065168154381",
  ],
  navigation: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "About", href: "/about" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type NavigationItem = (typeof siteConfig.navigation)[number];
