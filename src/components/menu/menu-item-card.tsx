"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

import { optimizedSrc } from "@/components/three/engine/image-src";
import { matchGlowForItem } from "@/components/three/showcase-data";
import { getMenuItemImage } from "@/config/menu-item-images";
import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";

import { DEFAULT_GLOW, type GlowPair } from "./category-glow";
import { MenuItemOrderDialog } from "./menu-item-order-dialog";

type MenuItemCardProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
  /** Glow pair of the category the card sits in. */
  categoryGlow?: GlowPair;
  /** Lead card of its category: a bigger stage and a wider slot. */
  featured?: boolean;
  /** Grid spans out of 2 columns (md) and 12 columns (xl). */
  span?: Readonly<{ md: number; xl: number }>;
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

/** Sizes with just a name and a price read best as a row of price chips. */
function isSimpleVariant(variant: MenuVariant) {
  return (
    !variant.description &&
    variant.flavorPrices.length === 0 &&
    variant.basePrice !== null &&
    variant.name.length <= 12
  );
}

export function MenuItemCard({
  item,
  catalog,
  categoryGlow = DEFAULT_GLOW,
  featured = false,
  span = { md: 1, xl: 4 },
}: MenuItemCardProps) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const prices = getItemPrices(item).filter(
    (price): price is number => price !== null,
  );
  const lowestPrice = getLowestItemPrice(prices);
  const singlePrice = new Set(prices).size === 1;
  const unavailable = item.availability === "unavailable";
  const image = getMenuItemImage(item.name);
  const glow = matchGlowForItem(item.name) ?? categoryGlow.a;
  const { base, nickname } = splitName(item.name);
  const canOrder =
    item.availability === "available" && item.variants.length > 0;
  const simpleSizes =
    item.variants.length > 0 && item.variants.every(isSimpleVariant);

  return (
    <article
      className={`menu-card ${featured ? "menu-card--featured" : ""} ${
        image ? "" : "menu-card--imageless"
      } ${unavailable ? "menu-card--unavailable" : ""}`}
      style={
        {
          "--card-glow": glow,
          "--card-glow-b": categoryGlow.b,
          "--glow": glow,
          "--span-md": span.md,
          "--span-xl": span.xl,
        } as CSSProperties
      }
    >
      <div className="menu-card__inner">
        <div className="menu-card__stage">
          <div className="menu-card__set">
            <span className="menu-card__pool" aria-hidden="true" />
            <span className="menu-card__floor" aria-hidden="true" />
            {image ? (
              <div className="menu-card__product">
                <div
                  className="menu-card__print"
                  data-three-tile={optimizedSrc(
                    image.src,
                    featured ? 640 : 384,
                  )}
                  data-glow={glow}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes={
                      featured ? "(min-width: 768px) 320px, 70vw" : "260px"
                    }
                    className="menu-card__image object-cover"
                  />
                </div>
                {/* soft studio-floor reflection of the photo */}
                <div className="menu-card__reflection" aria-hidden="true">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : (
              // no shop photo for this item: a lit sign letter on a plinth,
              // never a stock photo
              <div
                className="menu-card__placeholder"
                aria-hidden="true"
                data-testid="menu-card-placeholder"
              >
                <span className="menu-card__glyph">
                  {base.charAt(0).toUpperCase()}
                </span>
                <span className="menu-card__plinth" />
              </div>
            )}
          </div>
          <span className="menu-card__sweep" aria-hidden="true" />
        </div>

        <div className="menu-card__body">
          <div className="menu-card__head">
            <h3 className="menu-card__title" aria-label={item.name}>
              {nickname ? (
                <span className="menu-card__nickname">{nickname}</span>
              ) : null}
              <span className="menu-card__name">{base}</span>
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
                        {variant.name}
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
                        <span className="font-bold text-[var(--text-strong)]">
                          {variant.name}
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

          {canOrder ? (
            <div className="menu-card__footer">
              <button
                type="button"
                data-order-trigger=""
                onClick={() => setIsOrderOpen(true)}
                className="button-primary menu-card__order"
                aria-label={`Order ${item.name}`}
              >
                Order / Add to Cart +
              </button>
            </div>
          ) : null}
        </div>
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
