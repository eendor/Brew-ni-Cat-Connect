"use client";

import Image from "next/image";
import { useState } from "react";

import { getMenuItemImage } from "@/config/menu-item-images";
import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem } from "@/types/menu";

import { MenuItemOrderDialog } from "./menu-item-order-dialog";

type MenuItemCardProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
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

export function MenuItemCard({ item, catalog }: MenuItemCardProps) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const lowestPrice = getLowestItemPrice(getItemPrices(item));
  const unavailable = item.availability === "unavailable";
  const image = getMenuItemImage(item.name);
  const isAvailable = item.availability === "available";

  return (
    <article
      className={`surface-lift overflow-hidden rounded-[1.5rem] border bg-[var(--surface-card)] shadow-[var(--shadow-subtle)] ${
        unavailable
          ? "border-[var(--border-strong)] opacity-75"
          : "border-[var(--border-soft)]"
      }`}
    >
      {image ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--surface-warm)]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-[var(--text-strong)]">
              {item.name}
            </h3>
            {item.availability !== "available" ? (
              <p className="mt-2 inline-flex rounded-full bg-[var(--notice-surface)] px-3 py-1 text-xs font-bold text-[var(--notice-text)]">
                {unavailable
                  ? "Temporarily unavailable"
                  : "Availability not confirmed"}
              </p>
            ) : null}
          </div>
          {lowestPrice !== null ? (
            <p className="shrink-0 text-right text-sm font-semibold text-[var(--text-muted)]">
              <span className="block text-xs tracking-wide uppercase">
                From
              </span>
              <span className="text-lg font-extrabold text-[var(--accent-strong)]">
                {formatPrice(lowestPrice)}
              </span>
            </p>
          ) : null}
        </div>

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
            <ul className="grid gap-3">
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
                      className="mt-2 grid gap-1 border-l-2 border-[var(--accent-soft)] pl-3 text-[var(--text-muted)]"
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

        {/* Phase 3 Ordering Trigger */}
        {isAvailable && item.variants.length > 0 ? (
          <div className="mt-6 border-t border-[var(--border-soft)] pt-4 flex items-center justify-between">
            <span className="text-xs text-[var(--text-subtle)] font-medium">
              Ready to enjoy?
            </span>
            <button
              type="button"
              onClick={() => setIsOrderOpen(true)}
              className="button-primary min-h-10 px-4 py-2 text-xs font-bold"
              aria-label={`Order ${item.name}`}
            >
              Order / Add to Cart +
            </button>
          </div>
        ) : null}
      </div>

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
