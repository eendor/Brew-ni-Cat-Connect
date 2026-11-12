import type { Metadata } from "next";

import { AccountHomeView } from "@/components/account/account-home-view";

export const metadata: Metadata = {
  title: "My Account",
  description:
    "Your Brew ni Cat orders, favorites, rewards, profile and data requests in one place.",
};

export default function AccountIndexPage() {
  return <AccountHomeView />;
}
