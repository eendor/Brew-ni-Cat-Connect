"use client";

import Image from "next/image";
import { useState } from "react";

import { optimizedSrc } from "@/components/three/engine/image-src";
import { glowForItem } from "@/components/three/showcase-data";
import { getMenuItemImage } from "@/config/menu-item-images";
import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem } from "@/types/menu";

import { MenuItemOrderDialog } from "./menu-item-order-dialog";

type MenuItemCardProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
  /** Card spans the full grid row (odd last item), so variants use two columns. */
  wide?: boolean;
}>;

function getItemPrices(item: MenuItem): readonly (number | null)[] {
  return item.variants.flatMap((variant) => {
    const flavorPrices = variant.flavorPrices.map((entry) => entry.price);
    const basePrice =
      variant.basePrice === 0 && flavorPrices.length > 0
        ? []
        : [variant.basePrice];

    return [...basePrice, ...flavorPrices];
  });
}

export function MenuItemCard({
  item,
  catalog,
  wide = false,
}: MenuItemCardProps) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const lowestPrice = getLowestItemPrice(getItemPrices(item));
  const unavailable = item.availability === "unavailable";
  const image = getMenuItemImage(item.name);
  const canOrder =
    item.availability === "available" && item.variants.length > 0;

  return (
    <article
      className={`menu-card surface-lift flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-[var(--surface-card)] p-5 shadow-[var(--shadow-subtle)] sm:p-6 ${
        wide ? "md:col-span-2" : ""
      } ${
        unavailable
          ? "border-[var(--border-strong)] opacity-75"
          : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex items-center gap-4">
        {image ? (
          <div
            className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-warm)] shadow-[var(--shadow-subtle)] sm:size-28"
            data-three-tile={optimizedSrc(image.src, 384)}
            data-glow={glowForItem(item.name)}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="112px"
              className="menu-card__image object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-semibold leading-tight text-balance text-[var(--text-strong)]">
            {item.name}
          </h3>
          {lowestPrice !== null ? (
            <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
              From{" "}
              <span className="text-lg font-extrabold text-[var(--accent-strong)]">
                {formatPrice(lowestPrice)}
              </span>
            </p>
          ) : null}
          {item.availability !== "available" ? (
            <p className="mt-2 inline-flex rounded-full bg-[var(--notice-surface)] px-3 py-1 text-xs font-bold text-[var(--notice-text)]">
              {unavailable
                ? "Temporarily unavailable"
                : "Availability not confirmed"}
            </p>
          ) : null}
        </div>
      </div>

      <div className={`flex-1 ${canOrder ? "pb-6" : ""}`}>
        {item.flavors.length > 0 ? (
          <div className="mt-5">
            <h4 className="text-xs font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">
              Flavors
            </h4>
            <ul
              className="mt-2 flex flex-wrap gap-2"
              aria-label={`${item.name} flavors`}
            >
              {item.flavors.map((flavor) => (
                <li
                  key={flavor}
                  className="rounded-full bg-[var(--surface-warm)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
                >
                  {flavor}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {item.variants.length > 0 ? (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
            <h4 className="sr-only">Sizes, options, and prices</h4>
            <ul
              className={`grid gap-3 ${wide && item.variants.length > 1 ? "md:grid-cols-2 md:gap-x-10" : ""}`}
            >
              {item.variants.map((variant) => (
                <li key={variant.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-bold text-[var(--text-strong)]">
                      {variant.name}
                    </span>
                    {variant.basePrice !== null &&
                    !(
                      variant.basePrice === 0 && variant.flavorPrices.length > 0
                    ) ? (
                      <span className="shrink-0 font-extrabold text-[var(--accent-strong)]">
                        {formatPrice(variant.basePrice)}
                      </span>
                    ) : null}
                  </div>
                  {variant.description ? (
                    <p className="mt-1 leading-6 text-[var(--text-muted)]">
                      {variant.description}
                    </p>
                  ) : null}
                  {variant.flavorPrices.length > 0 ? (
                    <ul
                      className="mt-2 grid gap-1 border-l border-[var(--border-soft)] pl-3 text-[var(--text-muted)]"
                      aria-label={`${variant.name} flavor prices`}
                    >
                      {variant.flavorPrices.map((entry) => (
                        <li
                          key={entry.flavor}
                          className="flex justify-between gap-4"
                        >
                          <span>{entry.flavor}</span>
                          <span className="font-bold text-[var(--text-strong)]">
                            {formatPrice(entry.price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-muted)]">
            Contact the shop for current price details.
          </p>
        )}
      </div>

      {/* Phase 3 Ordering Trigger */}
      {canOrder ? (
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-soft)] pt-4">
          <button
            type="button"
            data-order-trigger=""
            onClick={() => setIsOrderOpen(true)}
            className="button-primary min-h-12 w-full whitespace-nowrap px-4 py-2 text-xs font-bold sm:w-auto"
            aria-label={`Order ${item.name}`}
          >
            Order / Add to Cart +
          </button>
        </div>
      ) : null}

      {isOrderOpen ? (
        <MenuItemOrderDialog
          item={item}
          catalog={catalog}
          onClose={() => setIsOrderOpen(false)}
        />
      ) : null}
    </article>
  );
}
