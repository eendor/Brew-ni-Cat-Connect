"use client";

import { useState } from "react";

import { useCart } from "@/context/cart-context";
import { getItemQuantityInCart } from "@/lib/ordering/cart-selectors";
import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice, getLowestItemPrice } from "@/lib/menu/format-price";
import type { MenuCatalog, MenuItem, MenuVariant } from "@/types/menu";

import { MenuItemOrderDialog } from "./menu-item-order-dialog";
import { MenuItemMedia } from "./menu-item-media";

type MenuItemCardProps = Readonly<{
  item: MenuItem;
  catalog?: MenuCatalog;
  categoryName?: string;
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

export function MenuItemCard({
  item,
  catalog,
  categoryName = "",
}: MenuItemCardProps) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const { state: cartState } = useCart();
  const cartQuantity = getItemQuantityInCart(cartState, item.id);
  const prices = getItemPrices(item).filter(
    (price): price is number => price !== null,
  );
  const lowestPrice = getLowestItemPrice(prices);
  const singlePrice = new Set(prices).size === 1;
  const unavailable = item.availability === "unavailable";
  const { base, nickname } = splitName(item.name);
  const canOrder =
    item.availability === "available" && item.variants.length > 0;
  const simpleSizes =
    item.variants.length > 0 && item.variants.every(isSimpleVariant);

  return (
    <article
      className={`menu-card${unavailable ? " menu-card--unavailable" : ""}`}
    >
      <MenuItemMedia item={item} />

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

        {canOrder ? (
          <div className="menu-card__footer">
            <div className="menu-card__order-group">
              <button
                type="button"
                data-order-trigger=""
                onClick={() => setIsOrderOpen(true)}
                className="button-primary menu-card__order"
                aria-label={`Order ${item.name}`}
              >
                Add to order
              </button>

              {cartQuantity > 0 ? (
                <span className="menu-card__cart-badge">
                  {cartQuantity} in cart
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {isOrderOpen ? (
        <MenuItemOrderDialog
          item={item}
          catalog={catalog}
          categoryName={categoryName}
          onClose={() => setIsOrderOpen(false)}
        />
      ) : null}
    </article>
  );
}
