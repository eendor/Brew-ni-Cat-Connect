"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { modelSpecFor } from "@/components/three/menu-models";
import { useThreeEnabled } from "@/components/three/use-three-enabled";
import { getMenuItemImage } from "@/config/menu-item-images";
import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";

import { MenuItemOrderDialog } from "./menu-item-order-dialog";
import { MenuItemViewer, type ViewerPick } from "./menu-item-viewer";

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

/** "Fries (Cat Claws)" → name "Fries", nickname "Cat Claws". */
function splitName(name: string) {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name.trim());
  return match
    ? { base: match[1] ?? name, nickname: match[2] ?? null }
    : { base: name.trim(), nickname: null };
}

function hasBasePrice(variant: MenuVariant) {
  return (
    variant.basePrice !== null &&
    !(variant.basePrice === 0 && variant.flavorPrices.length > 0)
  );
}

/** Sizes with just a short name and a price read best as price chips. */
function isSimpleVariant(variant: MenuVariant) {
  return (
    !variant.description &&
    variant.flavorPrices.length === 0 &&
    variant.basePrice !== null &&
    variant.name.length <= 12
  );
}

export function MenuItemCard({ item, catalog }: MenuItemCardProps) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  // the size and flavor picked in the 3D viewer, if the order came from it
  const [orderPreset, setOrderPreset] = useState<ViewerPick | null>(null);
  const threeEnabled = useThreeEnabled();
  const hasModel = useMemo(() => modelSpecFor(item) !== null, [item]);
  const prices = getItemPrices(item).filter(
    (price): price is number => price !== null,
  );
  const lowestPrice = getLowestItemPrice(prices);
  const singlePrice = new Set(prices).size === 1;
  const unavailable = item.availability === "unavailable";
  const image = getMenuItemImage(item.name);
  const { base, nickname } = splitName(item.name);
  const canOrder =
    item.availability === "available" && item.variants.length > 0;
  const simpleSizes =
    item.variants.length > 0 && item.variants.every(isSimpleVariant);
  // the 3D button appears after hydration, only with WebGL and motion on
  const canView = threeEnabled && hasModel;

  return (
    <article
      className={`menu-card${unavailable ? " menu-card--unavailable" : ""}`}
    >
      {image ? (
        <div className="menu-card__media">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="menu-card__body">
        <div className="menu-card__head">
          <h3 className="menu-card__title" aria-label={item.name}>
            {nickname ? (
              <span className="menu-card__nickname">{nickname}</span>
            ) : null}
            <span className="menu-card__name">
              {base.split(" ").map((word, index) => (
                <span key={`${word}-${index}`}>
                  {index > 0 ? " " : null}
                  {word.includes("-") ? (
                    <span className="whitespace-nowrap">{word}</span>
                  ) : (
                    word
                  )}
                </span>
              ))}
            </span>
          </h3>
          {lowestPrice !== null ? (
            <p className="menu-card__price">
              {singlePrice ? null : (
                <span className="menu-card__price-from">From</span>
              )}
              <span className="menu-card__price-value">
                {formatPrice(lowestPrice)}
              </span>
            </p>
          ) : null}
        </div>

        {item.availability !== "available" ? (
          <p className="menu-card__status">
            {unavailable
              ? "Temporarily unavailable"
              : "Availability not confirmed"}
          </p>
        ) : null}

        {item.flavors.length > 0 ? (
          <div className="menu-card__group">
            <h4 className="menu-card__label">Flavors</h4>
            <ul
              className="menu-card__chips"
              aria-label={`${item.name} flavors`}
            >
              {item.flavors.map((flavor) => (
                <li key={flavor} className="menu-card__chip">
                  {flavor}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {item.variants.length > 0 ? (
          <div className="menu-card__group">
            <h4 className={simpleSizes ? "menu-card__label" : "sr-only"}>
              {simpleSizes ? "Sizes" : "Sizes, options, and prices"}
            </h4>
            {simpleSizes ? (
              <ul className="menu-card__sizes">
                {item.variants.map((variant) => (
                  <li key={variant.id} className="menu-card__size">
                    <span className="menu-card__size-name">
                      {formatOptionName(variant.name)}
                    </span>
                    <span className="menu-card__size-price">
                      {formatPrice(variant.basePrice ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="menu-card__rows">
                {item.variants.map((variant) => (
                  <li key={variant.id} className="menu-card__row">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0 font-bold text-[var(--text-strong)] [overflow-wrap:anywhere]">
                        {formatOptionName(variant.name)}
                      </span>
                      {hasBasePrice(variant) ? (
                        <span className="menu-card__row-price">
                          {formatPrice(variant.basePrice ?? 0)}
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
                        className="menu-card__flavor-prices"
                        aria-label={`${variant.name} flavor prices`}
                      >
                        {variant.flavorPrices.map((entry) => (
                          <li key={entry.flavor}>
                            <span>{entry.flavor}</span>
                            <span className="font-bold text-[var(--text-strong)] tabular-nums">
                              {formatPrice(entry.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="menu-card__group text-sm text-[var(--text-muted)]">
            Contact the shop for current price details.
          </p>
        )}

        {canOrder || canView ? (
          <div className="menu-card__footer">
            {canView ? (
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                className="button-ghost menu-card__view3d"
                aria-label={`View ${item.name} in 3D`}
                aria-haspopup="dialog"
              >
                View in 3D
              </button>
            ) : null}
            {canOrder ? (
              <button
                type="button"
                data-order-trigger=""
                onClick={() => {
                  setOrderPreset(null);
                  setIsOrderOpen(true);
                }}
                className="button-primary menu-card__order"
                aria-label={`Order ${item.name}`}
              >
                Add to order
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isViewerOpen ? (
        <MenuItemViewer
          item={item}
          onClose={() => setIsViewerOpen(false)}
          onOrder={
            canOrder
              ? (pick) => {
                  setOrderPreset(pick);
                  setIsOrderOpen(true);
                }
              : undefined
          }
        />
      ) : null}

      {isOrderOpen ? (
        <MenuItemOrderDialog
          item={item}
          catalog={catalog}
          initialVariantId={orderPreset?.variantId}
          initialFlavor={orderPreset?.flavor}
          onClose={() => setIsOrderOpen(false)}
        />
      ) : null}
    </article>
  );
}
