import type { Metadata } from "next";

import { OrderHistoryView } from "@/components/account/order-history-view";

export const metadata: Metadata = {
  title: "Order History",
  description:
    "View your past Brew ni Cat orders, check status, and easily reorder your favorites.",
};

export default function OrderHistoryPage() {
  return <OrderHistoryView />;
}
