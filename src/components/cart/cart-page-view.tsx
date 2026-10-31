"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { useCart } from "@/context/cart-context";
import { useShopFacts } from "@/context/shop-facts-context";
import { StateScene } from "@/components/three/state-scene";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { findCatalogItem } from "@/lib/ordering/cart-pricing";
import { formatPrice } from "@/lib/menu/format-price";
import {
  hoursSummary,
  joinList,
  localityLine,
  streetLine,
  takeoutPriceText,
} from "@/lib/site-content/format";
import { usePreparedSummary } from "@/lib/ordering/prepared-summary";
import type { MenuCatalog } from "@/types/menu";
import type { CartItem, FulfillmentType } from "@/types/ordering";

import { CartLineItem } from "./cart-line-item";
import { MenuItemOrderDialog } from "../menu/menu-item-order-dialog";

function findItemCategoryName(catalog: MenuCatalog, itemId: string): string {
  for (const cat of catalog.categories) {
    if (cat.items.some((it) => it.id === itemId)) {
      return cat.name;
    }
  }
  return "";
}

export function CartPageView() {
  const { address, hours, payments, takeoutBoxPrice } = useShopFacts();
  const {
    lines,
    fulfillment,
    subtotal,
    itemCount,
    isEmpty,
    updateQuantity,
    removeItem,
    setFulfillment,
    clearCart,
  } = useCart();
  // a summary made at checkout holds the order the cart gave up (ADR-020)
  const savedSummary = usePreparedSummary();

  const [catalog, setCatalog] = useState<MenuCatalog | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [menuError, setMenuError] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<CartItem | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublicMenu()
      .then((result) => {
        if (!active) return;
        if (result) {
          setCatalog(result);
        } else {
          setMenuError(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setMenuError(true);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingMenu(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageIntro
        mood="cart"
        eyebrow="Your Order"
        title="Shopping Cart"
        description={
          <p>
            Review your selected drinks, snacks, and cat treats. Choose pickup
            at our shop or have a local rider order and deliver it.
          </p>
        }
      />

      <section
        className="py-12 sm:py-16 lg:py-20"
        aria-label="Order Cart Content"
      >
        <Container>
          {isEmpty ? (
            <div className="ios-card mx-auto max-w-xl p-8 text-center sm:p-12">
              <StateScene
                kind="empty"
                className="mx-auto mb-4 size-44 sm:size-52"
                fallback={
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[var(--accent-strong)]">
                    <svg
                      className="size-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                }
              />
              <h2 className="font-display text-2xl text-[var(--text-strong)] sm:text-3xl">
                Your cart is empty
              </h2>
              <p className="mt-3 text-base text-[var(--text-muted)] leading-relaxed">
                You haven&apos;t added any items to your order yet. Check out
                our delicious handcrafted drinks and café favorites.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/menu" className="button-primary">
                  Explore Current Menu
                </Link>
                {savedSummary ? (
                  <Link href="/checkout" className="button-secondary">
                    View your order summary
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-10 min-[900px]:grid-cols-12 min-[900px]:items-start min-[900px]:gap-8 xl:gap-12">
              {/* Left Column: Items and Fulfillment Selection */}
              <div className="space-y-8 min-[900px]:col-span-7 xl:col-span-8">
                {/* Cart Lines Card */}
                <div className="ios-card p-6 sm:p-8">
                  <div className="mb-6 flex items-center justify-between border-b border-[var(--separator)] pb-4">
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-strong)]">
                        Items in Cart
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {itemCount} {itemCount === 1 ? "item" : "items"} total
                      </p>
                    </div>
                    <button
                      type="button"
                      className="-mr-2 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                      onClick={() => clearCart()}
                    >
                      Clear cart
                    </button>
                  </div>

                  <ul className="space-y-4" aria-label="Cart items list">
                    {lines.map((line) => (
                      <CartLineItem
                        key={line.key}
                        item={line}
                        onUpdateQuantity={(qty) =>
                          updateQuantity(line.key, qty)
                        }
                        onRemove={() => removeItem(line.key)}
                        onEdit={
                          !isLoadingMenu && !menuError && catalog
                            ? () => setEditingLine(line)
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </div>

                {/* Fulfillment Selection Section */}
                <div className="ios-card p-6 sm:p-8">
                  <h3 className="font-display text-xl text-[var(--text-strong)]">
                    Fulfillment Preference
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    How would you like to receive your order?
                  </p>

                  <fieldset className="mt-5">
                    <legend className="sr-only">
                      Choose fulfillment method
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label
                        className={`surface-lift flex cursor-pointer flex-col justify-between rounded-2xl p-5 ${
                          fulfillment === "pickup"
                            ? "outline-2 outline-[var(--accent-solid)]"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-[var(--text-strong)]">
                              Pickup at Shop
                            </div>
                            <div className="text-xs text-[var(--accent-solid)] font-semibold mt-1">
                              Free · In-person collection
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="fulfillment-method"
                            value="pickup"
                            checked={fulfillment === "pickup"}
                            onChange={() =>
                              setFulfillment("pickup" as FulfillmentType)
                            }
                            className="size-4 accent-[var(--accent-solid)] mt-1"
                          />
                        </div>
                        <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                          Collect directly at {streetLine(address)},{" "}
                          {localityLine(address)}. {hoursSummary(hours)}
                        </p>
                      </label>

                      <label
                        className={`surface-lift flex cursor-pointer flex-col justify-between rounded-2xl p-5 ${
                          fulfillment === "external-rider"
                            ? "outline-2 outline-[var(--accent-solid)]"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-[var(--text-strong)]">
                              Rider Delivery
                            </div>
                            <div className="text-xs text-[var(--accent-strong)] font-semibold mt-1">
                              A local rider orders and delivers
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="fulfillment-method"
                            value="external-rider"
                            checked={fulfillment === "external-rider"}
                            onChange={() =>
                              setFulfillment(
                                "external-rider" as FulfillmentType,
                              )
                            }
                            className="size-4 accent-[var(--accent-solid)] mt-1"
                          />
                        </div>
                        <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                          Send your order summary to a local delivery service in{" "}
                          {address.town}. The rider orders it at the shop for
                          you and brings it to your address.
                        </p>
                      </label>
                    </div>
                  </fieldset>

                  {fulfillment === "external-rider" ? (
                    <div className="mt-5 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-4 text-xs leading-6 text-[var(--notice-text)]">
                      <strong className="block font-semibold">
                        How Rider Delivery Works
                      </strong>
                      At checkout you prepare an order summary and send it to a
                      local rider on Facebook. The rider orders it at Brew ni
                      Cat and delivers it to you. Delivery fee, timing and
                      payment are agreed with your rider; Brew ni Cat
                      doesn&apos;t book riders or charge rider fees.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="min-[900px]:col-span-5 xl:col-span-4">
                <div className="ios-card sticky top-28 space-y-6 p-6 sm:p-8">
                  <h3 className="font-display border-b border-[var(--separator)] pb-4 text-xl text-[var(--text-strong)]">
                    Order Summary
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Total items</span>
                      <span className="font-semibold text-[var(--text-strong)]">
                        {itemCount}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Fulfillment</span>
                      <span className="font-semibold text-[var(--text-strong)]">
                        {fulfillment === "pickup"
                          ? "Pickup at shop"
                          : "Rider delivery"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Rider fee</span>
                      <span className="font-semibold text-[var(--text-subtle)] text-xs text-right max-w-44">
                        {fulfillment === "pickup"
                          ? "None (Pickup)"
                          : "Agreed with your rider"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-[var(--text-muted)]">
                      <span>Takeout box</span>
                      <span className="text-right text-xs font-semibold text-[var(--text-subtle)]">
                        {fulfillment === "pickup"
                          ? `${takeoutPriceText(takeoutBoxPrice)}, paid at the shop · not in subtotal`
                          : `${takeoutPriceText(takeoutBoxPrice)} · not in subtotal`}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-[var(--separator)] pt-3">
                      <div>
                        <span className="block text-base font-semibold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          PHP (₱)
                        </span>
                      </div>
                      <span className="text-3xl font-bold text-[var(--accent-strong)] tabular-nums">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="ios-well p-4 text-xs leading-5 text-[var(--text-muted)]">
                    <strong className="block font-semibold text-[var(--text-strong)]">
                      Payment Policy
                    </strong>
                    {fulfillment === "pickup"
                      ? `Payment is settled directly with the shop via ${joinList(payments.methods, "or")} when you pick up your order.`
                      : "Payment and the delivery fee are agreed with your rider."}{" "}
                    No online payment is charged on this website.
                  </div>

                  <Link
                    href="/checkout"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Proceed to Checkout{"\u00a0"}→
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>

      {editingLine && catalog
        ? (() => {
            const item = findCatalogItem(catalog, editingLine.itemId);
            if (!item) return null;
            return (
              <MenuItemOrderDialog
                item={item}
                catalog={catalog}
                editingLine={editingLine}
                categoryName={findItemCategoryName(catalog, editingLine.itemId)}
                onClose={() => setEditingLine(null)}
              />
            );
          })()
        : null}
    </>
  );
}
