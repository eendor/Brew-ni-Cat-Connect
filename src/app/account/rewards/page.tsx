import type { Metadata } from "next";

import { RewardsView } from "@/components/loyalty/rewards-view";

export const metadata: Metadata = {
  title: "Loyalty & Rewards",
  description: "View your Brew ni Cat loyalty balance and available rewards.",
};

export default function RewardsPage() {
  return <RewardsView />;
}
