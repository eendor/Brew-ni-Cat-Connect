import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = {
  title: "About",
  description: "Planned business information page for Brew ni Cat Connect.",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      plannedPhase="Planned for Phase 2"
      description="The Brew ni Cat story and business information will be prepared for the public showcase using content reviewed with the owner."
    />
  );
}
