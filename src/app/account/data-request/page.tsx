import type { Metadata } from "next";

import { DataRequestView } from "@/components/account/data-request-view";

export const metadata: Metadata = {
  title: "Data Requests",
  description:
    "Ask the Brew ni Cat coffee shop to correct or delete your customer data.",
};

export default function DataRequestPage() {
  return <DataRequestView />;
}
