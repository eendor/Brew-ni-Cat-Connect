"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { EASE, gsap, motionAllowed } from "@/components/motion/gsap";
import { requestCartToss } from "@/components/three/cart-toss";
import { optimizedSrc } from "@/components/three/engine/image-src";
import { glowForItem } from "@/components/three/showcase-data";
import { getMenuItemImage } from "@/config/menu-item-images";
import { useCart } from "@/context/cart-context";
import { useFocusTrap } from "@/lib/accessibility/focus-trap";
import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice } from "@/lib/menu/format-price";
import {
  calculateLineTotal,
  resolveVariantUnitPrice,
} from "@/lib/ordering/cart-pricing";
import type { MenuCatalog, MenuItem } from "@/types/menu";
import type { CartItem } from "@/types/ordering";

import { MenuOrderPreview } from "./menu-order-preview";

const emptySubscribe = () => () => {};

type MenuItemOrderDialogProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
  /** Opens with this size or option picked, e.g. from the 3D viewer. */
  initialVariantId?: string;
  /** Opens with this flavor picked, when the item lists it. */
  initialFlavor?: string | null;
  /** When editing an existing cart line. */
  editingLine?: CartItem;
  /** Used to pick a generic 3D model for items without a photo. */
  categoryName?: string;
  onClose: () => void;
}>;

export function MenuItemOrderDialog({
  item,
  catalog,
  initialVariantId,
  initialFlavor,
  editingLine,
  categoryName = "",
  onClose,
}: MenuItemOrderDialogProps) {
  const { addItem, replaceLine, openDrawer } = useCart();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // A preset only counts when it names one of this item's own options.
  const presetVariantId =
    editingLine?.variantId ??
    item.variants.find((variant) => variant.id === initialVariantId)?.id ??
    item.variants[0]?.id ??
    "";
  const presetFlavor =
    editingLine?.flavor !== undefined
      ? (editingLine.flavor && item.flavors.includes(editingLine.flavor) ? editingLine.flavor : null)
      : (initialFlavor && item.flavors.includes(initialFlavor) ? initialFlavor : null);
  const initialQty = editingLine?.quantity ?? 1;

  const [selectedVariantId, setSelectedVariantId] =
    useState<string>(presetVariantId);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(
    presetFlavor,
  );
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // The latest selection, updated synchronously by every handler, so Add
  // to Order always submits what was picked last, even on rapid clicks
  // that land before React re-renders this component.
  const selectionRef = useRef({
    variantId: presetVariantId,
    flavor: presetFlavor,
    quantity: initialQty,
  });
  const submittedRef = useRef(false);

  function chooseVariant(variantId: string) {
    selectionRef.current = { ...selectionRef.current, variantId };
    setSelectedVariantId(variantId);
    setFeedbackError(null);
  }

  function chooseFlavor(flavor: string | null) {
    selectionRef.current = { ...selectionRef.current, flavor };
    setSelectedFlavor(flavor);
    setFeedbackError(null);
  }

  function changeQuantity(delta: number) {
    const next = Math.max(1, selectionRef.current.quantity + delta);
    selectionRef.current = { ...selectionRef.current, quantity: next };
    setQuantity(next);
  }

  // Every way out (close, backdrop, Escape, Add to Order) plays the exit
  // first; the card unmounts the dialog once it has gone.
  const closingRef = useRef(false);
  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    const root = dialogRef.current;
    if (!root || !motionAllowed()) {
      onClose();
      return;
    }
    gsap
      .timeline({ onComplete: onClose })
      .to(root.querySelector("[data-overlay=panel]"), {
        autoAlpha: 0,
        y: 28,
        scale: 0.96,
        duration: 0.3,
        ease: EASE.exit,
      })
      .to(
        root.querySelector("[data-overlay=backdrop]"),
        { autoAlpha: 0, duration: 0.3, ease: "power2.in" },
        0.05,
      );
  }

  const dialogRef = useFocusTrap<HTMLDivElement>(mounted, {
    onClose: requestClose,
    initialFocusRef: closeButtonRef,
  });

  // The panel rises into place and its sections follow one by one.
  useLayoutEffect(() => {
    const root = dialogRef.current;
    if (!mounted || !root || !motionAllowed()) return;
    const panel = root.querySelector("[data-overlay=panel]");
    const entrance = gsap
      .timeline()
      .fromTo(
        root.querySelector("[data-overlay=backdrop]"),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.35, ease: "power2.out" },
      )
      .fromTo(
        panel,
        { autoAlpha: 0, y: 48, scale: 0.94 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, ease: EASE.enter },
        0,
      )
      .fromTo(
        panel?.querySelectorAll(":scope > *") ?? [],
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: EASE.enter,
          stagger: 0.06,
          clearProps: "opacity,visibility,transform",
        },
        0.12,
      );
    return () => {
      entrance.kill();
    };
  }, [mounted, dialogRef]);

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // long option names ("Nachos + Fries + Meat") read as full-width rows;
  // short sizes ("16oz") stay side by side
  const longOptions = item.variants.some(
    (variant) => formatOptionName(variant.name).length > 12,
  );

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
    if (submittedRef.current) return;
    setFeedbackError(null);

    // read the current selection at submit time, not the render closure
    const current = selectionRef.current;
    const variant =
      item.variants.find((entry) => entry.id === current.variantId) ??
      item.variants[0];

    if (!variant) {
      setFeedbackError("Please choose an option or size.");
      return;
    }

    const resolution = resolveVariantUnitPrice(item, variant, current.flavor);
    if (!resolution.ok) {
      if (
        variant.basePrice === 0 &&
        variant.flavorPrices.length > 0 &&
        !current.flavor
      ) {
        setFeedbackError("Please choose a flavor to complete this selection.");
        return;
      }
      setFeedbackError(
        "This selection is not currently available for purchase.",
      );
      return;
    }

    const result = editingLine
      ? replaceLine(activeCatalog, editingLine.key, {
          variantId: variant.id,
          flavor: current.flavor,
          quantity: current.quantity,
        })
      : addItem(activeCatalog, {
          itemId: item.id,
          variantId: variant.id,
          flavor: current.flavor,
          quantity: current.quantity,
        });

    if (result.ok) {
      submittedRef.current = true;
      if (!editingLine) {
        const rect = addButtonRef.current?.getBoundingClientRect();
        const photo = getMenuItemImage(item.name)?.src;
        const delay = rect
          ? requestCartToss({
              from: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
              },
              photo: photo ? optimizedSrc(photo, 384) : null,
              glow: glowForItem(item.name),
              label: item.name,
            })
          : 0;
        requestClose();
        if (delay > 0) {
          window.setTimeout(openDrawer, delay);
        } else {
          openDrawer();
        }
      } else {
        requestClose();
      }
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        aria-hidden="true"
        data-overlay="backdrop"
        onClick={requestClose}
      />

      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        data-overlay="panel"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
          <div>
            <span className="eyebrow block">Configure item</span>
            <h2
              id={titleId}
              className="font-display mt-1 text-2xl text-[var(--text-strong)]"
            >
              {item.name}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-warm)] hover:text-[var(--text-strong)] transition-colors"
            aria-label="Close dialog"
            onClick={requestClose}
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

        <MenuOrderPreview
          item={item}
          categoryName={categoryName}
          variant={selectedVariant ?? null}
          flavor={selectedFlavor}
        />

        <div className="mt-6 space-y-6">
          {/* Variant Selection Fieldset */}
          {item.variants.length > 0 ? (
            <fieldset className="mx-0 min-w-0 border-0 p-0">
              <legend className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                Choose Size / Option
              </legend>
              <div
                className={`grid gap-2 ${
                  longOptions
                    ? ""
                    : item.variants.length === 3
                      ? "sm:grid-cols-3"
                      : "sm:grid-cols-2"
                }`}
                role="group"
              >
                {item.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => chooseVariant(variant.id)}
                      className={`flex min-w-0 rounded-xl border p-3 text-left transition-all ${
                        longOptions
                          ? "items-center justify-between gap-3"
                          : "flex-col items-start"
                      } ${
                        isSelected
                          ? "border-[var(--accent-solid)] bg-[var(--surface-warm)] ring-2 ring-[var(--accent-solid)] font-extrabold"
                          : "border-[var(--border-soft)] bg-[var(--surface-card)] hover:bg-[var(--surface-warm)]"
                      }`}
                    >
                      <span className="min-w-0 font-bold text-sm text-[var(--text-strong)] [overflow-wrap:anywhere]">
                        {formatOptionName(variant.name)}
                        {isSelected ? (
                          <span className="sr-only"> (selected)</span>
                        ) : null}
                      </span>
                      {variant.basePrice !== null &&
                      !(
                        variant.basePrice === 0 &&
                        variant.flavorPrices.length > 0
                      ) ? (
                        <span
                          className={`shrink-0 text-xs font-extrabold text-[var(--accent-strong)] ${longOptions ? "" : "mt-1"}`}
                        >
                          {formatPrice(variant.basePrice)}
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 text-xs text-[var(--text-muted)] ${longOptions ? "" : "mt-1"}`}
                        >
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
            <fieldset className="mx-0 min-w-0 border-0 p-0">
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
                    onClick={() => chooseFlavor(null)}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold transition-all ${
                      selectedFlavor === null
                        ? "bg-[var(--accent-solid)] text-[var(--on-accent)] shadow-xs"
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
                      onClick={() => chooseFlavor(flavor)}
                      className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-[var(--accent-solid)] text-[var(--on-accent)] shadow-xs"
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
                className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)] disabled:opacity-40"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => changeQuantity(-1)}
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
                className="inline-flex size-11 items-center justify-center rounded-full text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-card)]"
                aria-label="Increase quantity"
                onClick={() => changeQuantity(1)}
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
              className="rounded-xl border border-[var(--danger)] bg-[rgb(255_133_119_/_10%)] p-3 text-sm font-bold text-[var(--danger)]"
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
              ref={addButtonRef}
              type="button"
              className="button-primary"
              onClick={handleAddToCart}
            >
              {editingLine ? "Update item" : "Add to Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(dialogElement, document.body);
}
