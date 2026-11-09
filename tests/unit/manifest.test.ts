import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { siteConfig } from "@/config/site";

const result = manifest();

describe("Web app manifest", () => {
  it("TC-P8-001 — describes the site as a standalone installable app", () => {
    expect(result.name).toBe(siteConfig.name);
    expect(result.short_name).toBe(siteConfig.shortName);
    expect(result.description).toBeTruthy();
    expect(result.description).not.toMatch(/\n/);
    expect(result.id).toBe("/");
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.background_color).toBe("#f6eee1");
    expect(result.theme_color).toBe("#f6eee1");
  });

  it("TC-P8-002 — lists the any and maskable app icons", () => {
    expect(result.icons).toEqual([
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
    ]);
  });
});
