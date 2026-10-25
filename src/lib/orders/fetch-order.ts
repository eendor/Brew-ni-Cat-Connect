import { getPublicSupabaseClient } from "@/lib/supabase/public-client";
import {
  isOrderReference,
  isTrackingToken,
  OrderView,
} from "@/lib/orders/types";

// Keep fixture for local work while Place order is off on live site
const USE_MOCK_DATA = true;

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

  if (USE_MOCK_DATA) {
    return MOCK_ORDER;
  }

  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.rpc("get_online_order", {
      p_reference: reference,
      p_tracking_token: trackingToken,
    });

    if (error || !data) {
      return null;
    }

    return data as OrderView;
  } catch {
    return null;
  }
}
