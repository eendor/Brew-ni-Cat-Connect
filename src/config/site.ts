export const siteConfig = {
  name: "Brew ni Cat Coffee Shop",
  shortName: "Brew ni Cat",
  productName: "Brew ni Cat Connect",
  description:
    "Discover Brew ni Cat Coffee Shop in Kabacan, Cotabato, browse the current menu, and find contact and visit information.",
  openingDate: "June 12, 2026",
  address: {
    street: "Abellera St, Poblacion",
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
    closedDays: "Saturday",
    /** From the shop's "We are open" poster (shared 2026-10-24). */
    hoursNotice:
      "Open 11 AM to 9 PM, Monday to Friday, and 1 PM to 9 PM on Sunday. Closed every Saturday. Check our Facebook page or contact us for any schedule changes.",
    payments: ["Cash", "GCash"],
    takeoutFee: "₱10 takeout box",
    /** Confirmed price; when it applies is not documented, so it is never
     *  added to totals (fee calculation is deferred, FR-029–FR-030). */
    takeoutBoxPrice: "₱10",
    takeoutNote:
      "Not included in the subtotal. The shop confirms it when you order.",
  },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100084186931413",
    facebookPhotos:
      "https://www.facebook.com/profile.php?id=100084186931413&sk=photos",
    tiktok:
      "https://www.tiktok.com/@potelco/video/7649246393923570965?_r=1&_t=ZS-977tdEv9JjR",
  },
  /** Local delivery services in Kabacan. A rider orders at the shop for the
   *  customer and delivers it. Names are the services' public Facebook page
   *  titles and logos their public profile photos (checked 2026-10-18). */
  externalRiders: [
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
  navigation: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "About", href: "/about" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type NavigationItem = (typeof siteConfig.navigation)[number];
