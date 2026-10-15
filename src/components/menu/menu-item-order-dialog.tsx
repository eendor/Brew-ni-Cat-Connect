"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/context/cart-context";
import { useFocusTrap } from "@/lib/accessibility/focus-trap";
import { formatPrice } from "@/lib/menu/format-price";
import {
  calculateLineTotal,
  resolveVariantUnitPrice,
} from "@/lib/ordering/cart-pricing";
import type { MenuCatalog, MenuItem } from "@/types/menu";

type MenuItemOrderDialogProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
  onClose: () => void;
}>;

export function MenuItemOrderDialog({
  item,
  catalog,
  onClose,
}: MenuItemOrderDialogProps) {
  const { addItem, openDrawer } = useCart();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    () => item.variants[0]?.id ?? "",
  );
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialogRef = useFocusTrap<HTMLDivElement>(mounted, {
    onClose,
    initialFocusRef: closeButtonRef,
  });

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const selectedVariant = useMemo(() => {
    return (
      item.variants.find((variant) => variant.id === selectedVariantId) ??
      item.variants[0]
    );
  }, [item.variants, selectedVariantId]);

  const priceResolution = useMemo(() => {
    if (!selectedVariant) {
      return { ok: false as const, reason: "missing-price" as const };
    }
    return resolveVariantUnitPrice(item, selectedVariant, selectedFlavor);
  }, [item, selectedVariant, selectedFlavor]);

  const lineTotal = useMemo(() => {
    if (priceResolution.ok) {
      return calculateLineTotal(priceResolution.unitPrice, quantity);
    }
    return null;
  }, [priceResolution, quantity]);

  // Construct fallback catalog if none provided
  const activeCatalog: MenuCatalog = catalog ?? {
    categories: [
      {
        id: "cat-default",
        name: "Current Items",
        items: [item],
      },
    ],
  };

  function handleAddToCart() {
    setFeedbackError(null);

    if (!selectedVariant) {
      setFeedbackError("Please choose an option or size.");
      return;
    }

    if (!priceResolution.ok) {
      if (
        selectedVariant.basePrice === 0 &&
        selectedVariant.flavorPrices.length > 0 &&
        !selectedFlavor
      ) {
        setFeedbackError("Please choose a flavor to complete this selection.");
        return;
      }
      setFeedbackError("This selection is not currently available for purchase.");
      return;
    }

    const result = addItem(activeCatalog, {
      itemId: item.id,
      variantId: selectedVariant.id,
      flavor: selectedFlavor,
      quantity,
    });

    if (result.ok) {
      onClose();
      openDrawer();
    } else {
      setFeedbackError(result.message);
    }
  }

  if (!mounted) {
    return null;
  }

  const dialogElement = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
          <div>
            <span className="eyebrow block">Configure item</span>
            <h2
              id={titleId}
              className="font-display mt-1 text-2xl font-bold text-[var(--text-strong)]"
            >
              {item.name}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-warm)] hover:text-[var(--text-strong)] transition-colors"
            aria-label="Close dialog"
            onClick={onClose}
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

        <div className="mt-6 space-y-6">
          {/* Variant Selection Fieldset */}
          {item.variants.length > 0 ? (
            <fieldset className="border-0 p-0 m-0">
              <legend className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                Choose Size / Option
              </legend>
              <div className="grid gap-2 sm:grid-cols-2" role="group">
                {item.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setFeedbackError(null);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[var(--accent-solid)] bg-[var(--surface-warm)] ring-2 ring-[var(--accent-solid)] font-extrabold"
                          : "border-[var(--border-soft)] bg-[var(--surface-card)] hover:bg-[var(--surface-warm)]"
                      }`}
                    >
                      <span className="font-bold text-sm text-[var(--text-strong)]">
                        {variant.name}
                        {isSelected ? " (Selected)" : ""}
                      </span>
                      {variant.basePrice !== null &&
                      !(
                        variant.basePrice === 0 &&
                        variant.flavorPrices.length > 0
                      ) ? (
                        <span className="text-xs font-extrabold text-[var(--accent-strong)] mt-1">
                          {formatPrice(variant.basePrice)}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] mt-1">
                          Flavor pricing applies
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {/* Flavor Selection Fieldset */}
          {item.flavors.length > 0 ? (
            <fieldset className="border-0 p-0 m-0">
              <div className="flex items-center justify-between mb-2">
                <legend className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Choose Flavor
                </legend>
                {selectedVariant?.basePrice === 0 &&
                selectedVariant.flavorPrices.length > 0 ? (
                  <span className="text-xs font-bold text-[var(--accent-solid)]">
                    Required
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">
                    Optional
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2" role="group">
                {selectedVariant?.basePrice !== 0 ? (
                  <button
                    type="button"
                    aria-pressed={selectedFlavor === null}
                    onClick={() => {
                      setSelectedFlavor(null);
                      setFeedbackError(null);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      selectedFlavor === null
                        ? "bg-[var(--accent-solid)] text-white shadow-xs"
                        : "border border-[var(--border-soft)] bg-[var(--surface-warm)] text-[var(--text-strong)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    No flavor / Standard
                  </button>
                ) : null}

                {item.flavors.map((flavor) => {
                  const isSelected = selectedFlavor === flavor;
                  const flavorPriceOverride =
                    selectedVariant?.flavorPrices.find(
                      (entry) => entry.flavor === flavor,
                    )?.price;

                  return (
                    <button
                      key={flavor}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedFlavor(flavor);
                        setFeedbackError(null);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[var(--accent-solid)] text-white shadow-xs"
                          : "border border-[var(--border-soft)] bg-[var(--surface-warm)] text-[var(--text-strong)] hover:bg-[var(--accent-soft)]"
                      }`}
                    >
                      {flavor}
                      {flavorPriceOverride !== undefined ? (
                        <span className="ml-1 opacity-90">
                          ({formatPrice(flavorPriceOverride)})
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {/* Quantity Controls */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2">
              Quantity
            </label>
            <div className="inline-flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-warm)] p-1">
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)] disabled:opacity-40"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <svg
                  className="size-4"
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
              <span className="min-w-10 px-2 text-center text-sm font-extrabold text-[var(--text-strong)]">
                {quantity}
              </span>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)]"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <svg
                  className="size-4"
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
          </div>

          {/* Error Notice */}
          {feedbackError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-800"
            >
              {feedbackError}
            </div>
          ) : null}

          {/* Total & Action */}
          <div className="border-t border-[var(--border-soft)] pt-5 flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs text-[var(--text-subtle)]">
                Selection total
              </span>
              <span className="text-2xl font-black text-[var(--accent-strong)]">
                {lineTotal !== null ? formatPrice(lineTotal) : "—"}
              </span>
            </div>

            <button
              type="button"
              className="button-primary"
              onClick={handleAddToCart}
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogElement, document.body);
}
