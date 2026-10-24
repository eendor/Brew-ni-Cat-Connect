"use client";

import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/menu/format-price";

export function MenuCartBar() {
  const { itemCount, subtotal, isEmpty, isHydrated, openDrawer } = useCart();

  if (!isHydrated || isEmpty) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-card)] p-3 min-[769px]:hidden">
      <span className="text-sm font-bold text-[var(--text-strong)]">
        {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
        {formatPrice(subtotal)}
      </span>
      <button
        type="button"
        onClick={openDrawer}
        className="button-primary min-h-11 px-4"
      >
        View cart
      </button>
    </div>
  );
}
