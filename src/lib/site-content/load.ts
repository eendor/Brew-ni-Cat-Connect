import { cache } from "react";

import { getServerReadClient } from "@/lib/supabase/server-read-client";

import { fallbackAbout, fallbackGallery } from "./fallback-pages";
import { fallbackShop } from "./fallback-shop";
import {
  SITE_CONTENT_SECTIONS,
  type LoadedSiteContent,
  type SiteContent,
  type SiteContentRow,
  type SiteContentSection,
  type SiteContentSource,
} from "./types";
import { parseSection } from "./validate";

/** Server only: pages and layouts read site content through this. */

export const fallbackSiteContent: SiteContent = {
  ...fallbackShop,
  about: fallbackAbout,
  gallery: fallbackGallery,
};

/** Every row of public.site_content, or null when it can't be read. */
async function readRows(): Promise<readonly SiteContentRow[] | null> {
  const client = getServerReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("site_content")
    .select("section, content")
    .returns<SiteContentRow[]>();
  return error ? null : data;
}

/**
 * The saved content, section by section. A section that is missing or breaks
 * a rule in validate.ts shows its fallback copy instead, so one bad value
 * never takes a page down (ADR-017).
 */
export async function loadSiteContent(
  read: () => Promise<readonly SiteContentRow[] | null> = readRows,
): Promise<LoadedSiteContent> {
  let rows: readonly SiteContentRow[] | null = null;
  try {
    rows = await read();
  } catch {
    rows = null;
  }

  const saved = new Map(rows?.map((row) => [row.section, row.content]));
  const content: Partial<Record<SiteContentSection, unknown>> = {};
  const sources: Partial<Record<SiteContentSection, SiteContentSource>> = {};
  const rejected: SiteContentSection[] = [];

  for (const section of SITE_CONTENT_SECTIONS) {
    const live = saved.has(section)
      ? parseSection(section, saved.get(section))
      : null;
    if (saved.has(section) && !live) rejected.push(section);
    content[section] = live ?? fallbackSiteContent[section];
    sources[section] = live ? "live" : "fallback";
  }

  if (rows === null) {
    console.warn(
      "Site content: the live content can't be read; showing the fallback.",
    );
  } else if (rejected.length > 0) {
    console.warn(
      `Site content: showing the fallback for ${rejected.join(", ")}.`,
    );
  }

  return {
    content: content as SiteContent,
    sources: sources as LoadedSiteContent["sources"],
  };
}

/** One read per render, shared by the layout and the page. */
export const getSiteContent = cache(
  async () => (await loadSiteContent()).content,
);
