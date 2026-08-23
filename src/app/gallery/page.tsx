import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Planned gallery page for Brew ni Cat Connect.",
};

export default function GalleryPage() {
  return (
    <PlaceholderPage
      title="Gallery"
      plannedPhase="Planned for Phase 2"
      description="Owner-approved shop and product photography will be added during the public business showcase phase."
    />
  );
}
