import type { Metadata } from "next";

import { PointsHistoryView } from "@/components/loyalty/points-history-view";

export const metadata: Metadata = {
  title: "Coins History",
  description: "Every Brew ni Cat coin you earned or spent.",
};

export default function PointsHistoryPage() {
  return <PointsHistoryView />;
}
