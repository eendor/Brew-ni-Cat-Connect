import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Complete your Brew ni Cat Coffee Shop order draft. Choose pickup or rider delivery and review your order summary.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
