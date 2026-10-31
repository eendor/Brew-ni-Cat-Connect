"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { EASE, gsap } from "@/components/motion/gsap";
import { usePresence } from "@/components/motion/use-presence";
import { StateScene } from "@/components/three/state-scene";
import { useCart } from "@/context/cart-context";
import { useShopFacts } from "@/context/shop-facts-context";
import { useFocusTrap } from "@/lib/accessibility/focus-trap";
import { formatPrice } from "@/lib/menu/format-price";
import { joinList, takeoutBoxText } from "@/lib/site-content/format";
import { usePreparedSummary } from "@/lib/ordering/prepared-summary";

import { CartLineItem } from "./cart-line-item";

/** The drawer slides in with its sections following; it slides out again. */
const drawerMotion = {
  enter: (root: HTMLElement) =>
    gsap
      .timeline()
      .fromTo(
        root.querySelector("[data-overlay=backdrop]"),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.4, ease: "power2.out" },
      )
      .fromTo(
        root.querySelector("[data-overlay=panel]"),
        { xPercent: 100 },
        { xPercent: 0, duration: 0.75, ease: EASE.enter },
        0,
      )
      .fromTo(
        root.querySelectorAll("[data-overlay=panel] > *"),
        { autoAlpha: 0, x: 36 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.6,
          ease: EASE.enter,
          stagger: 0.07,
          clearProps: "opacity,visibility,transform",
        },
        0.12,
      ),
  exit: (root: HTMLElement) =>
    gsap
      .timeline()
      .to(root.querySelector("[data-overlay=panel]"), {
        xPercent: 100,
        duration: 0.45,
        ease: EASE.exit,
      })
      .to(
        root.querySelector("[data-overlay=backdrop]"),
        { autoAlpha: 0, duration: 0.35, ease: "power2.in" },
        0.1,
      ),
};

export function CartDrawer() {
  const { address, payments, takeoutBoxPrice } = useShopFacts();
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
  // a summary made at checkout holds the order the cart gave up (ADR-020)
  const savedSummary = usePreparedSummary();

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const drawerContainerRef = useFocusTrap<HTMLDivElement>(isDrawerOpen, {
    onClose: closeDrawer,
    initialFocusRef: closeButtonRef,
  });

  const { present, leaving } = usePresence(
    isDrawerOpen,
    drawerContainerRef,
    drawerMotion,
  );

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

  if (!present) {
    return null;
  }

  return (
    <div
      ref={drawerContainerRef}
      className="fixed inset-0 z-[70] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      // on its way out: no clicks or focus while it slides away
      inert={leaving}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--ink-scrim)] backdrop-blur-xs"
        aria-hidden="true"
        data-overlay="backdrop"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="relative flex w-screen max-w-md flex-col border-l border-[var(--separator)] bg-[var(--surface-overlay)] shadow-[var(--sheet-shadow)]"
          data-overlay="panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--separator)] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h2
                id="cart-drawer-title"
                className="font-display text-xl text-[var(--text-strong)]"
              >
                Your Order
              </h2>
              <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-strong)] tabular-nums">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className="ios-icon-button text-[var(--text-muted)] hover:text-[var(--text-strong)]"
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
                <StateScene
                  kind="empty"
                  className="mb-2 size-40"
                  fallback={
                    <div className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[var(--text-muted)]">
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
                  }
                />
                <h3 className="font-display text-lg text-[var(--text-strong)]">
                  Your cart is empty
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                  Explore our drinks, snacks, and cat treats to begin your Brew
                  ni Cat order.
                </p>
                <Link
                  href="/menu"
                  className="button-primary mt-6"
                  onClick={closeDrawer}
                >
                  Browse Menu
                </Link>
                {savedSummary ? (
                  <Link
                    href="/checkout"
                    className="button-secondary mt-3"
                    onClick={closeDrawer}
                  >
                    View your order summary
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--separator)] pb-2">
                  <span className="ios-caption">Selected Items</span>
                  <button
                    type="button"
                    className="-mr-2 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                    onClick={() => clearCart()}
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
            <div className="space-y-4 border-t border-[var(--separator)] bg-[var(--surface-card)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-[var(--text-strong)]">
                    Subtotal
                  </span>
                  <span className="block text-xs text-[var(--text-subtle)]">
                    Exact catalog pricing
                  </span>
                </div>
                <span className="text-2xl font-bold text-[var(--accent-strong)] tabular-nums">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="text-xs leading-5 text-[var(--text-muted)]">
                Pick up at {address.street} and pay{" "}
                {joinList(payments.methods, "or")} at the shop, or have a local
                rider order and deliver it. The{" "}
                {takeoutBoxText(takeoutBoxPrice)} is not in the subtotal.
              </p>

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
                  className="button-secondary w-full text-center"
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
