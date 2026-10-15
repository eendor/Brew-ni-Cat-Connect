import type { Metadata } from "next";

import { CartPageView } from "@/components/cart/cart-page-view";

export const metadata: Metadata = {
  title: "Your Cart",
  description:
    "Review your Brew ni Cat Coffee Shop order cart, adjust quantities, choose pickup or customer-arranged rider, and proceed to checkout.",
};

export default function CartPage() {
  return <CartPageView />;
}
