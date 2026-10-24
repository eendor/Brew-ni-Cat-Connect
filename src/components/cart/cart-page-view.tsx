"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/cart-context";
import { StateScene } from "@/components/three/state-scene";
import { formatPrice } from "@/lib/menu/format-price";
import type { FulfillmentType } from "@/types/ordering";

import { CartLineItem } from "./cart-line-item";

export function CartPageView() {
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
            <div className="mx-auto max-w-xl text-center rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-8 sm:p-12 shadow-[var(--shadow-subtle)]">
              <StateScene
                kind="empty"
                tone="card"
                className="mx-auto mb-4 size-44 sm:size-52"
                fallback={
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--accent-strong)]">
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
              <div className="mt-8 flex justify-center">
                <Link href="/menu" className="button-primary">
                  Explore Current Menu
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-10 min-[900px]:grid-cols-12 min-[900px]:items-start min-[900px]:gap-8 xl:gap-12">
              {/* Left Column: Items and Fulfillment Selection */}
              <div className="space-y-8 min-[900px]:col-span-7 xl:col-span-8">
                {/* Cart Lines Card */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)] mb-6">
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
                      className="-mr-2 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
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
                      />
                    ))}
                  </ul>
                </div>

                {/* Fulfillment Selection Section */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
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
                            <div className="font-extrabold text-[var(--text-strong)] text-base">
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
                          Collect directly at {siteConfig.address.street},{" "}
                          {siteConfig.address.locality}. Open Mon–Fri 11 AM – 9
                          PM and Sun 1 PM – 9 PM. Closed Saturday.
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
                            <div className="font-extrabold text-[var(--text-strong)] text-base">
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
                          Send your order summary to a local delivery service in
                          Kabacan. The rider orders it at the shop for you and
                          brings it to your address.
                        </p>
                      </label>
                    </div>
                  </fieldset>

                  {fulfillment === "external-rider" ? (
                    <div className="mt-5 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-4 text-xs leading-6 text-[var(--notice-text)]">
                      <strong className="block font-bold">
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
                <div className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
                  <h3 className="font-display text-xl text-[var(--text-strong)] pb-4 border-b border-[var(--border-soft)]">
                    Order Summary
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Total items</span>
                      <span className="font-bold text-[var(--text-strong)]">
                        {itemCount}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Fulfillment</span>
                      <span className="font-bold text-[var(--text-strong)]">
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
                          ? `${siteConfig.operations.takeoutBoxPrice}, paid at the shop · not in subtotal`
                          : `${siteConfig.operations.takeoutBoxPrice} · not in subtotal`}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-soft)] flex items-baseline justify-between">
                      <div>
                        <span className="block text-base font-extrabold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          PHP (₱)
                        </span>
                      </div>
                      <span className="text-3xl font-black text-[var(--accent-strong)]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-warm)] p-4 text-xs leading-5 text-[var(--text-muted)]">
                    <strong className="block font-bold text-[var(--text-strong)]">
                      Payment Policy
                    </strong>
                    {fulfillment === "pickup"
                      ? "Payment is settled directly with the shop via Cash or GCash when you pick up your order."
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
    </>
  );
}
