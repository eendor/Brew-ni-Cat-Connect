/**
 * The brand and the site's pages. Everything else the shop can change (hours,
 * contact, address, payments, notice, links, riders, page text and photos)
 * is saved content: see src/lib/site-content and FR-085/FR-086.
 */
export const siteConfig = {
  name: "Brew ni Cat Coffee Shop",
  shortName: "Brew ni Cat",
  productName: "Brew ni Cat Connect",
  navigation: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "About", href: "/about" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type NavigationItem = (typeof siteConfig.navigation)[number];
