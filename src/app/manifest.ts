import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * The installable web app's manifest (FR-068). Rodnee builds the Android
 * Trusted Web Activity from this file, so the values stay in step with the
 * site configuration.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description:
      "Browse the menu, order ahead, and follow your Brew ni Cat order from your phone.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6eee1",
    theme_color: "#f6eee1",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
