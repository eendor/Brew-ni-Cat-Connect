import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Planned contact information page for Brew ni Cat Connect.",
};

export default function ContactPage() {
  return (
    <PlaceholderPage
      title="Contact"
      plannedPhase="Planned for Phase 2"
      description="Verified contact details, location, opening hours, and social links will be added after confirmation with the owner."
    />
  );
}
