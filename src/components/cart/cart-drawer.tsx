"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useCart } from "@/context/cart-context";
import { useFocusTrap } from "@/lib/accessibility/focus-trap";
import { formatPrice } from "@/lib/menu/format-price";

import { CartLineItem } from "./cart-line-item";

export function CartDrawer() {
  const {
    lines,
    subtotal,
    itemCount,
    isEmpty,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const drawerContainerRef = useFocusTrap<HTMLDivElement>(isDrawerOpen, {
    onClose: closeDrawer,
    initialFocusRef: closeButtonRef,
  });

  // Lock background scroll when open
  useEffect(() => {
    if (isDrawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isDrawerOpen]);

  if (!isDrawerOpen) {
    return null;
  }

  return (
    <div
      ref={drawerContainerRef}
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative flex w-screen max-w-md flex-col bg-[var(--surface-canvas)] shadow-2xl border-l border-[var(--border-soft)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4 bg-[var(--surface-card)]">
            <div className="flex items-center gap-2.5">
              <h2
                id="cart-drawer-title"
                className="font-display text-xl font-bold text-[var(--text-strong)]"
              >
                Your Order
              </h2>
              <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--accent-strong)]">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-warm)] hover:text-[var(--text-strong)] transition-colors"
              aria-label="Close cart drawer"
              onClick={closeDrawer}
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--text-muted)] mb-4">
                  <svg
                    className="size-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-[var(--text-strong)]">
                  Your cart is empty
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Explore our drinks, snacks, and cat treats to begin your Brew
                  ni Cat order.
                </p>
                <Link
                  href="/menu"
                  className="button-primary mt-6 text-sm"
                  onClick={closeDrawer}
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
                  <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-subtle)]">
                    Selected Items
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold text-[var(--text-muted)] hover:text-red-700 transition-colors"
                    onClick={clearCart}
                  >
                    Clear all
                  </button>
                </div>

                <ul className="space-y-3" aria-label="Cart items list">
                  {lines.map((line) => (
                    <CartLineItem
                      key={line.key}
                      item={line}
                      onUpdateQuantity={(qty) => updateQuantity(line.key, qty)}
                      onRemove={() => removeItem(line.key)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {!isEmpty ? (
            <div className="border-t border-[var(--border-soft)] bg-[var(--surface-card)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-bold text-[var(--text-strong)]">
                    Subtotal
                  </span>
                  <span className="block text-xs text-[var(--text-subtle)]">
                    Exact catalog pricing
                  </span>
                </div>
                <span className="text-2xl font-black text-[var(--accent-strong)]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="rounded-xl bg-[var(--surface-warm)] p-3 text-xs leading-5 text-[var(--text-muted)]">
                <strong className="block font-bold text-[var(--text-strong)]">
                  Fulfillment & Payment Notice
                </strong>
                Available for pickup at Segundo St or external rider
                arrangement. Payment is settled via Cash or GCash directly with
                the shop.
              </div>

              <div className="grid gap-2">
                <Link
                  href="/checkout"
                  className="button-primary w-full text-center"
                  onClick={closeDrawer}
                >
                  Proceed to Checkout
                </Link>
                <Link
                  href="/cart"
                  className="button-secondary w-full text-center text-sm"
                  onClick={closeDrawer}
                >
                  View Full Cart Page
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
