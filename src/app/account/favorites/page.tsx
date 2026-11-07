import type { Metadata } from "next";

import { FavoritesView } from "@/components/account/favorites-view";

export const metadata: Metadata = {
  title: "Favorites",
  description: "View the Brew ni Cat menu items you saved as favorites.",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
