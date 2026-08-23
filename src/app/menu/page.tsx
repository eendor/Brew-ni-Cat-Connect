import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = {
  title: "Menu",
  description: "Planned digital menu for Brew ni Cat Connect.",
};

export default function MenuPage() {
  return (
    <PlaceholderPage
      title="Menu"
      plannedPhase="Planned for Phase 3"
      description="The Brew ni Cat digital menu will be added during the menu and ordering phase after products, options, and prices are confirmed by the owner."
    />
  );
}
