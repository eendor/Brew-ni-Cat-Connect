"use client";

import { useEffect, useRef, useState } from "react";

import { EASE, gsap } from "@/components/motion/gsap";
import { usePresence } from "@/components/motion/use-presence";
import { useCart } from "@/context/cart-context";

const UNDO_MS = 5000;

/** "Removed … · Undo" toast after a cart removal or Clear all (about 5 s). */
export function CartUndoToast() {
  const { undo, undoLast, dismissUndo } = useCart();
  const toastRef = useRef<HTMLDivElement>(null);
  // the last message stays on the toast while it slides away
  const [shown, setShown] = useState(undo);
  if (undo && undo !== shown) setShown(undo);

  const { present, leaving } = usePresence(Boolean(undo), toastRef, {
    enter: (toast) =>
      gsap.fromTo(
        toast,
        { autoAlpha: 0, y: 28, scale: 0.94 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: EASE.enter,
          clearProps: "opacity,visibility,transform",
        },
      ),
    exit: (toast) =>
      gsap.to(toast, {
        autoAlpha: 0,
        y: 18,
        duration: 0.3,
        ease: EASE.exit,
      }),
  });

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
      {present && shown ? (
        <div
          ref={toastRef}
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--glass-stroke)] bg-[var(--bar-fill)] py-1.5 pr-1.5 pl-5 text-sm font-semibold text-[var(--text-strong)] shadow-[var(--glass-rim),var(--sheet-shadow)] backdrop-blur-xl backdrop-saturate-[1.8]"
          inert={leaving}
        >
          <span>{shown.message}</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-[var(--accent-solid)] hover:bg-[var(--accent-soft)]"
            onClick={undoLast}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
