"use client";

import { useEffect } from "react";

import { useCart } from "@/context/cart-context";

const UNDO_MS = 5000;

/** "Removed … · Undo" toast after a cart removal or Clear all (about 5 s). */
export function CartUndoToast() {
  const { undo, undoLast, dismissUndo } = useCart();

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(dismissUndo, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo, dismissUndo]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {undo ? (
        <div
          key={undo.id}
          className="undo-toast pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] py-1.5 pr-1.5 pl-5 text-sm font-semibold text-[var(--text-strong)] shadow-[var(--shadow-card)]"
        >
          <span>{undo.message}</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full px-4 font-extrabold text-[var(--accent-solid)] hover:bg-[var(--accent-soft)]"
            onClick={undoLast}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
