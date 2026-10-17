"use client";

import { useCart } from "@/context/cart-context";

type CartTriggerButtonProps = Readonly<{
  className?: string;
}>;

export function CartTriggerButton({ className }: CartTriggerButtonProps) {
  const { itemCount, toggleDrawer } = useCart();

  const label =
    itemCount > 0
      ? `Open cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`
      : "Open cart (empty)";

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      aria-label={label}
      data-cart-trigger=""
      className={
        className ??
        "relative inline-flex size-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-strong)] shadow-sm transition-colors hover:border-[var(--accent-solid)]"
      }
    >
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {itemCount > 0 ? (
        <span
          className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-[var(--accent-solid)] px-1 text-xs font-black text-[var(--on-accent)] shadow-xs"
          aria-hidden="true"
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
