"use client";

import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice } from "@/lib/menu/format-price";
import type { CartItem } from "@/types/ordering";

type CartLineItemProps = Readonly<{
  item: CartItem;
  onUpdateQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
}>;

export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
  onEdit,
  readOnly = false,
}: CartLineItemProps) {
  const variantName = formatOptionName(item.variantName);
  const lineDescription = [
    variantName,
    item.flavor ? `Flavor: ${item.flavor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="@container rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-subtle)] transition-all"
      data-testid={`cart-line-${item.key}`}
    >
      {/* Lays out by its own width, not the viewport: in the narrow drawer
          the name gets the full width and the stepper sits below it. */}
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-[var(--text-strong)] text-base break-words">
              {item.itemName}
            </h4>
            <span className="@lg:hidden font-extrabold text-[var(--accent-strong)] text-base whitespace-nowrap">
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

        <div className="flex items-center justify-between @lg:justify-end gap-4 @lg:gap-6 pt-2 @lg:pt-0 border-t @lg:border-t-0 border-[var(--border-soft)]">
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
                aria-label={`Quantity controls for ${item.itemName} (${variantName})`}
              >
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)] disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Decrease quantity of ${item.itemName} (${variantName})`}
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
                  className="min-w-7 px-1 text-center text-sm font-extrabold text-[var(--text-strong)]"
                  aria-live="polite"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)]"
                  aria-label={`Increase quantity of ${item.itemName} (${variantName})`}
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

              {onEdit ? (
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--accent-strong)] hover:bg-[var(--surface-warm)] transition-colors"
                  aria-label={`Edit ${item.itemName} (${variantName})`}
                  onClick={onEdit}
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
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              ) : null}

              {onRemove ? (
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                  aria-label={`Remove ${item.itemName} (${variantName}) from cart`}
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

          <div className="hidden @lg:block text-right min-w-20">
            <span className="block font-extrabold text-[var(--accent-strong)] text-base">
              {formatPrice(item.lineTotal)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
