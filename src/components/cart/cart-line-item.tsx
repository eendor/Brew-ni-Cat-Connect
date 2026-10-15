"use client";

import { formatPrice } from "@/lib/menu/format-price";
import type { CartItem } from "@/types/ordering";

type CartLineItemProps = Readonly<{
  item: CartItem;
  onUpdateQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}>;

export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
  readOnly = false,
}: CartLineItemProps) {
  const lineDescription = [
    item.variantName,
    item.flavor ? `Flavor: ${item.flavor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-subtle)] transition-all sm:flex-row sm:items-center sm:justify-between"
      data-testid={`cart-line-${item.key}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-[var(--text-strong)] text-base truncate">
            {item.itemName}
          </h4>
          <span className="sm:hidden font-extrabold text-[var(--accent-strong)] text-base whitespace-nowrap">
            {formatPrice(item.lineTotal)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)] font-medium">
          {lineDescription}
        </p>
        <p className="mt-1 text-xs text-[var(--text-subtle)]">
          {formatPrice(item.unitPrice)} each
        </p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-soft)]">
        {readOnly ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="font-semibold">Qty:</span>
            <span className="font-extrabold text-[var(--text-strong)]">
              {item.quantity}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-warm)] p-0.5"
              role="group"
              aria-label={`Quantity controls for ${item.itemName} (${item.variantName})`}
            >
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={`Decrease quantity of ${item.itemName} (${item.variantName})`}
                disabled={item.quantity <= 1}
                onClick={() => onUpdateQuantity?.(item.quantity - 1)}
              >
                <svg
                  className="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span
                className="min-w-7 px-1 text-center text-xs font-extrabold text-[var(--text-strong)]"
                aria-live="polite"
              >
                {item.quantity}
              </span>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)]"
                aria-label={`Increase quantity of ${item.itemName} (${item.variantName})`}
                onClick={() => onUpdateQuantity?.(item.quantity + 1)}
              >
                <svg
                  className="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            {onRemove ? (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-full text-[var(--text-subtle)] hover:text-red-700 hover:bg-red-50 transition-colors"
                aria-label={`Remove ${item.itemName} (${item.variantName}) from cart`}
                onClick={onRemove}
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            ) : null}
          </div>
        )}

        <div className="hidden sm:block text-right min-w-20">
          <span className="block font-extrabold text-[var(--accent-strong)] text-base">
            {formatPrice(item.lineTotal)}
          </span>
        </div>
      </div>
    </li>
  );
}
