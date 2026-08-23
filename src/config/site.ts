export const siteConfig = {
  name: "Brew ni Cat",
  productName: "Brew ni Cat Connect",
  description:
    "The customer-facing digital platform foundation for Brew ni Cat Coffee Shop.",
  navigation: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "About", href: "/about" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
  ],
  ownerConfirmationMessage: "TODO: Confirm with Brew ni Cat owner.",
} as const;

export type NavigationItem = (typeof siteConfig.navigation)[number];
