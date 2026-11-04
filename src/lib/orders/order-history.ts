/**
 * Customer order history query helper (Phase 5, FR-039).
 *
 * Retrieves the signed-in customer's past orders from `public.online_orders`
 * and `public.online_order_items` with pagination, newest first.
 * Row Level Security restricts queries to the authenticated customer's orders
 * (`customer_id = auth.uid()`). The query also adds an explicit
 * `.eq("customer_id", userId)` filter as defence-in-depth so that misconfigured
 * RLS or a future public client swap never leaks another customer's orders.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OrderItemSnapshot,
  OrderStatus,
  PaymentPreference,
} from "@/lib/orders/types";
import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

export const DEFAULT_PAGE_SIZE = 10;

export type CustomerOrderItem = OrderItemSnapshot;

export type CustomerOrderHistoryEntry = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  fulfillment: string;
  customerName: string;
  paymentPreference: PaymentPreference;
  notes: string;
  subtotal: number;
  itemCount: number;
  rejectionReason: string | null;
  createdAt: string;
  items: readonly CustomerOrderItem[];
}>;

export type CustomerOrderHistoryPage = Readonly<{
  orders: readonly CustomerOrderHistoryEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;

export type FetchCustomerOrdersOptions = Readonly<{
  page?: number;
  pageSize?: number;
  /**
   * Supabase auth user ID. Always sent as `.eq("customer_id", userId)`, so even
   * a staff account (RLS lets staff read every order) sees only its own orders.
   */
  userId: string;
  client?: SupabaseClient;
}>;

type RawOrderItem = {
  line_number: number;
  item_id: string;
  item_name: string;
  variant_id: string;
  variant_name: string;
  flavor: string | null;
  unit_price: number | string;
  quantity: number | string;
  line_total: number | string;
};

type RawOrderRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  fulfillment: string;
  customer_name: string;
  payment_preference: PaymentPreference;
  notes: string;
  subtotal: number | string;
  item_count: number | string;
  rejection_reason: string | null;
  created_at: string;
  items?: RawOrderItem[];
};

export async function fetchCustomerOrders({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  userId,
  client,
}: FetchCustomerOrdersOptions): Promise<CustomerOrderHistoryPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const supabase = client ?? getAuthSupabaseClient();

  const query = supabase
    .from("online_orders")
    .select(
      `
      id,
      reference,
      status,
      fulfillment,
      customer_name,
      payment_preference,
      notes,
      subtotal,
      item_count,
      rejection_reason,
      created_at,
      items:online_order_items (
        line_number,
        item_id,
        item_name,
        variant_id,
        variant_name,
        flavor,
        unit_price,
        quantity,
        line_total
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .eq("customer_id", userId);

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(`Failed to load order history: ${error.message}`);
  }

  const rawRows = (data ?? []) as unknown as RawOrderRow[];
  const totalCount = typeof count === "number" ? count : rawRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

  const orders: CustomerOrderHistoryEntry[] = rawRows.map((row) => {
    const rawItems = Array.isArray(row.items) ? row.items : [];
    const sortedItems = [...rawItems].sort(
      (a, b) => Number(a.line_number) - Number(b.line_number),
    );

    const items: CustomerOrderItem[] = sortedItems.map((item) => ({
      itemId: String(item.item_id),
      itemName: String(item.item_name),
      variantId: String(item.variant_id),
      variantName: String(item.variant_name),
      flavor: item.flavor ?? null,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      lineTotal: Number(item.line_total),
    }));

    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      fulfillment: row.fulfillment,
      customerName: row.customer_name,
      paymentPreference: row.payment_preference,
      notes: row.notes ?? "",
      subtotal: Number(row.subtotal),
      itemCount: Number(row.item_count),
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      items,
    };
  });

  return {
    orders,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
