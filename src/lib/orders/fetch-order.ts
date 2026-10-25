import { getPublicSupabaseClient } from "@/lib/supabase/public-client";
import {
  isOrderReference,
  isTrackingToken,
  OrderView,
} from "@/lib/orders/types";

// MOCK DATA — FOR DEVELOPMENT ONLY. While Place order is off on the live
// site, `npm run dev` shows this order at /orders/BNC-234567#token= plus
// any 43 letters or digits. Production builds never use it.
const USE_MOCK_DATA = process.env.NODE_ENV === "development";

const MOCK_ORDER: OrderView = {
  reference: "BNC-234567",
  createdAt: new Date().toISOString(),
  status: "pending",
  customerName: "Test Customer Verification",
  paymentPreference: "Cash",
  fulfillment: "pickup",
  notes: "Less ice please",
  itemCount: 3,
  rejectionReason: null,
  realtimeTopic: "order:BNC-234567",
  statusHistory: [
    {
      status: "pending",
      changedAt: new Date().toISOString(),
    },
  ],
  items: [
    {
      itemId: "item-1",
      variantId: "var-1",
      itemName: "Brew Special Coffee",
      variantName: "Large",
      flavor: "Caramel",
      quantity: 2,
      unitPrice: 150,
      lineTotal: 300,
    },
    {
      itemId: "item-2",
      variantId: "var-2",
      itemName: "Matcha Latte",
      variantName: "Medium",
      flavor: null,
      quantity: 1,
      unitPrice: 120,
      lineTotal: 120,
    },
  ],
  subtotal: 420,
};

export async function fetchOrder(
  reference: string,
  trackingToken: string,
): Promise<OrderView | null> {
  if (!isOrderReference(reference) || !isTrackingToken(trackingToken)) {
    return null;
  }

  if (USE_MOCK_DATA && reference === MOCK_ORDER.reference) {
    return MOCK_ORDER;
  }

  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase.rpc("get_online_order", {
    p_reference: reference,
    p_tracking_token: trackingToken,
  });

  // A failed request throws, so the page shows its error state. No data
  // means no order matches this reference and token.
  if (error) {
    throw new Error("The order could not be loaded.");
  }

  return (data as OrderView | null) ?? null;
}
