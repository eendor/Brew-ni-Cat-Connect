"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  useCallback,
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
import { defaultFlavor, modelSpecFor } from "@/components/three/menu-models";
import { useThreeEnabled } from "@/components/three/use-three-enabled";
import {
  getMenuFlavorImage,
  getMenuItemImage,
} from "@/config/menu-item-images";
import { useFocusTrap } from "@/lib/accessibility/focus-trap";
import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice } from "@/lib/menu/format-price";
import { resolveVariantUnitPrice } from "@/lib/ordering/cart-pricing";
import type { MenuItem, MenuVariant } from "@/types/menu";

const MenuViewerCanvas = dynamic(
  () => import("@/components/three/canvas/menu-viewer-canvas"),
  { ssr: false },
);

const emptySubscribe = () => () => {};

/** The size and flavor picked in the viewer, handed to the order dialog. */
export type ViewerPick = Readonly<{
  variantId: string;
  flavor: string | null;
}>;

type MenuItemViewerProps = Readonly<{
  item: MenuItem;
  onClose: () => void;
  /** Add to order. Called once the viewer has closed. */
  onOrder?: (pick: ViewerPick) => void;
}>;

type StageState = "loading" | "ready" | "failed";

/** Sizes priced only per flavor (Takoyaki) need a flavor picked. */
function needsFlavor(variant: MenuVariant | null | undefined) {
  return Boolean(
    variant && variant.basePrice === 0 && variant.flavorPrices.length > 0,
  );
}

function chipClass(selected: boolean) {
  return `inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold transition-all ${
    selected
      ? "bg-[var(--accent-solid)] text-[var(--on-accent)] shadow-xs"
      : "border border-[var(--border-soft)] bg-[var(--surface-warm)] text-[var(--text-strong)] hover:bg-[var(--accent-soft)]"
  }`;
}

const legendClass =
  "mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]";

/**
 * The Menu's 3D preview: the item's model spins on a studio stage, and
 * the size and flavor chips swap the model in place (cup size, drink
 * layers, takoyaki count and toppings, combo contents). The real photo
 * stays in view, and Add to order hands the pick to the order dialog.
 * Without WebGL the stage shows the photo instead.
 */
export function MenuItemViewer({
  item,
  onClose,
  onOrder,
}: MenuItemViewerProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const threeEnabled = useThreeEnabled();
  const [variantId, setVariantId] = useState(item.variants[0]?.id ?? "");
  const [flavor, setFlavor] = useState<string | null>(() =>
    defaultFlavor(item, item.variants[0]),
  );
  const [stage, setStage] = useState<StageState>("loading");

  const variant =
    item.variants.find((entry) => entry.id === variantId) ??
    item.variants[0] ??
    null;
  const flavorRequired = needsFlavor(variant);

  function chooseVariant(next: MenuVariant) {
    setVariantId(next.id);
    if (needsFlavor(next) && flavor === null) {
      setFlavor(defaultFlavor(item, next));
    }
  }

  const spec = useMemo(
    () => modelSpecFor(item, variant, flavor),
    [item, variant, flavor],
  );
  const photo =
    getMenuFlavorImage(item.name, flavor) ?? getMenuItemImage(item.name);
  const price = variant ? resolveVariantUnitPrice(item, variant, flavor) : null;
  const canOrder =
    Boolean(onOrder) &&
    item.availability === "available" &&
    variant !== null &&
    price?.ok === true;

  const showCanvas = threeEnabled && spec !== null && stage !== "failed";
  const stageState: StageState = showCanvas ? stage : "failed";
  const onReady = useCallback(() => setStage("ready"), []);
  const onError = useCallback(() => setStage("failed"), []);

  // Every way out plays the exit first. Add to order remembers the pick
  // and hands it over once the viewer has gone.
  const pickRef = useRef<ViewerPick | null>(null);
  const closingRef = useRef(false);
  function finish() {
    onClose();
    const pick = pickRef.current;
    if (pick) onOrder?.(pick);
  }

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    const root = dialogRef.current;
    if (!root || !motionAllowed()) {
      finish();
      return;
    }
    gsap
      .timeline({ onComplete: finish })
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

  function handleOrder() {
    if (!canOrder || !variant) return;
    pickRef.current = { variantId: variant.id, flavor };
    requestClose();
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

  if (!mounted) {
    return null;
  }

  const status =
    stageState === "loading"
      ? "Loading 3D model…"
      : stageState === "ready"
        ? `3D model of ${item.name} ready`
        : photo
          ? "3D preview unavailable, showing the photo"
          : "3D preview unavailable";
  const pickedName = [
    variant && item.variants.length > 1 ? formatOptionName(variant.name) : null,
    flavor,
  ]
    .filter(Boolean)
    .join(" · ");

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
        className="relative w-full max-w-4xl rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        data-overlay="panel"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
          <div>
            <span className="eyebrow block">3D preview</span>
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-warm)] hover:text-[var(--text-strong)] transition-colors"
            aria-label="Close 3D preview"
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

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
          <div className="menu-viewer__stage" data-state={stageState}>
            {photo ? (
              <div className="menu-viewer__photo">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 30rem, 92vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            {showCanvas && spec ? (
              <MenuViewerCanvas
                spec={spec}
                onReady={onReady}
                onError={onError}
              />
            ) : null}
            <p role="status" className="menu-viewer__status">
              {status}
            </p>
            {stageState === "ready" ? (
              <p className="menu-viewer__hint" aria-hidden="true">
                Drag to spin
              </p>
            ) : null}
          </div>

          <div className="space-y-6">
            {item.variants.length > 1 ? (
              <fieldset className="mx-0 min-w-0 border-0 p-0">
                <legend className={legendClass}>Size or option</legend>
                <div className="flex flex-wrap gap-2">
                  {item.variants.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={entry.id === variant?.id}
                      onClick={() => chooseVariant(entry)}
                      className={chipClass(entry.id === variant?.id)}
                    >
                      {formatOptionName(entry.name)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {item.flavors.length > 0 ? (
              <fieldset className="mx-0 min-w-0 border-0 p-0">
                <legend className={legendClass}>Flavor</legend>
                <div className="flex flex-wrap gap-2">
                  {flavorRequired ? null : (
                    <button
                      type="button"
                      aria-pressed={flavor === null}
                      onClick={() => setFlavor(null)}
                      className={chipClass(flavor === null)}
                    >
                      Standard
                    </button>
                  )}
                  {item.flavors.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      aria-pressed={flavor === entry}
                      onClick={() => setFlavor(entry)}
                      className={chipClass(flavor === entry)}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="border-t border-[var(--border-soft)] pt-5">
              {pickedName ? (
                <span className="block text-xs text-[var(--text-subtle)]">
                  {pickedName}
                </span>
              ) : null}
              <span
                className="text-2xl font-black text-[var(--accent-strong)]"
                data-testid="menu-viewer-price"
              >
                {price?.ok ? formatPrice(price.unitPrice) : "—"}
              </span>
              {variant?.description ? (
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {variant.description}
                </p>
              ) : null}
              {onOrder && item.availability === "available" ? (
                <button
                  type="button"
                  className="button-primary mt-5 w-full"
                  aria-label={`Add ${item.name} to order`}
                  disabled={!canOrder}
                  onClick={handleOrder}
                >
                  Add to order
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogElement, document.body);
}
