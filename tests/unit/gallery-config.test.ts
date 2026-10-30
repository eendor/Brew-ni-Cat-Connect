import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fallbackGallery } from "@/lib/site-content/fallback-pages";

const galleryImages = fallbackGallery.photos;

describe("Gallery fallback photos", () => {
  it("TC-P4-146 — has a full last row, no repeats, and every file exists", () => {
    expect(galleryImages.length % 6).toBe(0);
    const sources = galleryImages.map((image) => image.src);
    expect(new Set(sources).size).toBe(sources.length);
    const alts = galleryImages.map((image) => image.alt);
    expect(new Set(alts).size).toBe(alts.length);
    for (const image of galleryImages) {
      expect(image.alt.length).toBeGreaterThan(10);
      expect(existsSync(join(process.cwd(), "public", image.src))).toBe(true);
    }
  });
});
