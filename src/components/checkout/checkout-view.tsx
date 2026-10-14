"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageIntro } from "@/components/ui/page-intro";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/menu/format-price";
import type { CartItem, FulfillmentType } from "@/types/ordering";

import { CartLineItem } from "../cart/cart-line-item";

export type CheckoutStep = "details" | "review" | "confirmation";

export type CustomerDetails = Readonly<{
  name: string;
  phone: string;
  notes: string;
  paymentPreference: "Cash" | "GCash";
  pickupTimePreference: string;
}>;

export type ConfirmedOrderSnapshot = Readonly<{
  reference: string;
  createdAt: string;
  customer: CustomerDetails;
  fulfillment: FulfillmentType;
  lines: readonly CartItem[];
  subtotal: number;
  itemCount: number;
}>;

function generateOrderReference(): string {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timePart = Date.now().toString().slice(-4);
  return `BNC-${timePart}-${randomPart}`;
}

export function CheckoutView() {
  const {
    lines,
    fulfillment,
    subtotal,
    itemCount,
    isEmpty,
    setFulfillment,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<CheckoutStep>("details");
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    phone: "",
    notes: "",
    paymentPreference: "Cash",
    pickupTimePreference: "asap",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedOrder, setConfirmedOrder] =
    useState<ConfirmedOrderSnapshot | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const nameInputId = useId();
  const phoneInputId = useId();
  const notesInputId = useId();
  const pickupTimeId = useId();

  function validateDetails(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!customer.name.trim()) {
      nextErrors.name = "Please enter your full name.";
    }

    const cleanPhone = customer.phone.replace(/[\s\-()]/g, "");
    if (!cleanPhone) {
      nextErrors.phone = "Please enter your contact phone number.";
    } else if (
      !/^(09|\+639)\d{9}$/.test(cleanPhone) &&
      cleanPhone.length < 10
    ) {
      nextErrors.phone =
        "Please enter a valid Philippine mobile number (e.g., 0912 345 6789).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleProceedToReview(e: React.FormEvent) {
    e.preventDefault();
    if (validateDetails()) {
      setStep("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleConfirmOrder() {
    // Requirements: No Supabase order write yet.
    // Transition state client-side, record draft snapshot, and clear cart.
    const snapshot: ConfirmedOrderSnapshot = {
      reference: generateOrderReference(),
      createdAt: new Date().toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      customer,
      fulfillment,
      lines: [...lines],
      subtotal,
      itemCount,
    };

    setConfirmedOrder(snapshot);
    clearCart();
    setStep("confirmation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyReference(ref: string) {
    void navigator.clipboard.writeText(ref);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  }

  // If cart is empty and not on confirmation, show empty cart message
  if (isEmpty && step !== "confirmation") {
    return (
      <>
        <PageIntro
          eyebrow="Checkout"
          title="Checkout"
          description={
            <p>Please add items to your cart before proceeding to checkout.</p>
          }
        />
        <section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-lg text-center rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-8 sm:p-12 shadow-[var(--shadow-subtle)]">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--accent-strong)] mb-4">
                <svg
                  className="size-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-[var(--text-strong)]">
                Your cart is empty
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Browse our delicious coffee, cold drinks, snacks, and treats to
                start your order.
              </p>
              <Link href="/menu" className="button-primary mt-6">
                Browse Menu
              </Link>
            </div>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="Order Flow"
        title={
          step === "details"
            ? "Checkout"
            : step === "review"
              ? "Review Order"
              : "Order Received"
        }
        description={
          step === "details" ? (
            <p>
              Confirm your contact details and fulfillment option. Payment is
              settled directly with the shop upon collection.
            </p>
          ) : step === "review" ? (
            <p>
              Double check your order items, contact details, and pickup/rider
              arrangement before finalizing your order draft.
            </p>
          ) : (
            <p>Thank you! Your order draft has been logged for preparation.</p>
          )
        }
      />

      <section className="py-12 sm:py-16 lg:py-20" aria-label="Checkout flow">
        <Container>
          {/* Step Progress Indicator */}
          <nav aria-label="Checkout Progress" className="mb-10">
            <ol className="flex items-center justify-center gap-2 sm:gap-6 text-sm font-bold">
              <li
                className={`flex items-center gap-2 ${
                  step === "details"
                    ? "text-[var(--accent-strong)] font-extrabold"
                    : "text-[var(--deep-green)] font-semibold"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "details"
                      ? "bg-[var(--accent-solid)] text-white"
                      : "bg-[var(--surface-green)] text-[var(--deep-green)]"
                  }`}
                >
                  1
                </span>
                <span>Details & Fulfillment</span>
              </li>

              <li className="text-[var(--border-strong)]" aria-hidden="true">
                →
              </li>

              <li
                className={`flex items-center gap-2 ${
                  step === "review"
                    ? "text-[var(--accent-strong)] font-extrabold"
                    : step === "confirmation"
                      ? "text-[var(--deep-green)] font-semibold"
                      : "text-[var(--text-subtle)] font-medium"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "review"
                      ? "bg-[var(--accent-solid)] text-white"
                      : step === "confirmation"
                        ? "bg-[var(--surface-green)] text-[var(--deep-green)]"
                        : "bg-[var(--surface-warm)] text-[var(--text-subtle)]"
                  }`}
                >
                  2
                </span>
                <span>Review Order</span>
              </li>

              <li className="text-[var(--border-strong)]" aria-hidden="true">
                →
              </li>

              <li
                className={`flex items-center gap-2 ${
                  step === "confirmation"
                    ? "text-[var(--accent-strong)] font-extrabold"
                    : "text-[var(--text-subtle)] font-medium"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "confirmation"
                      ? "bg-[var(--accent-solid)] text-white"
                      : "bg-[var(--surface-warm)] text-[var(--text-subtle)]"
                  }`}
                >
                  3
                </span>
                <span>Confirmation</span>
              </li>
            </ol>
          </nav>

          {/* STEP 1: Details & Fulfillment Form */}
          {step === "details" && (
            <form
              onSubmit={handleProceedToReview}
              noValidate
              className="grid gap-10 lg:grid-cols-12 lg:items-start"
            >
              <div className="space-y-8 lg:col-span-7 xl:col-span-8">
                {/* Fulfillment Selection */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <h2 className="font-display text-xl font-bold text-[var(--text-strong)]">
                    1. Select Fulfillment Mode
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Choose how you will receive your order from Brew ni Cat.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label
                      className={`surface-lift flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                        fulfillment === "pickup"
                          ? "border-[var(--accent-solid)] bg-[var(--surface-warm)] ring-2 ring-[var(--accent-solid)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-card)] hover:bg-[var(--surface-warm)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-extrabold text-[var(--text-strong)] text-base block">
                            Pickup at Shop
                          </span>
                          <span className="text-xs text-[var(--deep-green)] font-semibold mt-1 block">
                            In-person pickup · Free
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="checkout-fulfillment"
                          value="pickup"
                          checked={fulfillment === "pickup"}
                          onChange={() =>
                            setFulfillment("pickup" as FulfillmentType)
                          }
                          className="size-4 accent-[var(--accent-solid)] mt-1"
                        />
                      </div>
                      <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                        Pick up directly at {siteConfig.address.street},{" "}
                        {siteConfig.address.locality}. Open 11 AM to 10 PM,
                        Mon–Sat (closed Sundays).
                      </p>
                    </label>

                    <label
                      className={`surface-lift flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                        fulfillment === "external-rider"
                          ? "border-[var(--accent-solid)] bg-[var(--surface-warm)] ring-2 ring-[var(--accent-solid)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-card)] hover:bg-[var(--surface-warm)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-extrabold text-[var(--text-strong)] text-base block">
                            Customer-Arranged Rider
                          </span>
                          <span className="text-xs text-[var(--accent-strong)] font-semibold mt-1 block">
                            External rider pickup
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="checkout-fulfillment"
                          value="external-rider"
                          checked={fulfillment === "external-rider"}
                          onChange={() =>
                            setFulfillment("external-rider" as FulfillmentType)
                          }
                          className="size-4 accent-[var(--accent-solid)] mt-1"
                        />
                      </div>
                      <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                        Arrange and pay your own preferred rider (e.g.,
                        Papa&apos;s Delivery). Your rider collects the order at
                        the shop.
                      </p>
                    </label>
                  </div>

                  {fulfillment === "external-rider" ? (
                    <div className="mt-6 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-xs leading-6 text-[var(--notice-text)]">
                      <strong className="block text-sm font-bold mb-1">
                        How External Rider Pickup Works:
                      </strong>
                      <ol className="list-decimal pl-4 space-y-1 mb-3">
                        <li>Submit your order draft through this checkout.</li>
                        <li>Contact and book your external rider yourself.</li>
                        <li>
                          Give the rider your Order Reference code and shop
                          address.
                        </li>
                        <li>
                          The rider collects your prepared order at the counter.
                        </li>
                      </ol>
                      <p className="border-t border-[var(--notice-border)] pt-2 text-[var(--notice-text)]">
                        Rider availability, delivery fees, arrival time, and
                        rider payment are separate from Brew ni Cat. The shop
                        does not calculate, book, or charge rider fees.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {siteConfig.externalRiders.map((riderUrl, index) => (
                          <ExternalLink
                            key={riderUrl}
                            href={riderUrl}
                            className="inline-flex items-center text-xs font-bold text-[var(--deep-green)] underline"
                          >
                            Rider Partner {index + 1}
                          </ExternalLink>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Customer Contact Details */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <h2 className="font-display text-xl font-bold text-[var(--text-strong)]">
                    2. Customer Contact Information
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    We will associate this information with your order draft.
                  </p>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={nameInputId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        Full Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        id={nameInputId}
                        type="text"
                        required
                        value={customer.name}
                        onChange={(e) => {
                          setCustomer((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }));
                          if (errors.name) {
                            setErrors((prev) => ({ ...prev, name: "" }));
                          }
                        }}
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? "name-error" : undefined
                        }
                        placeholder="e.g. Maria Santos"
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder-[var(--text-subtle)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                      {errors.name ? (
                        <p
                          id="name-error"
                          role="alert"
                          className="mt-1.5 text-xs font-bold text-red-600"
                        >
                          {errors.name}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={phoneInputId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        Contact Phone Number{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        id={phoneInputId}
                        type="tel"
                        required
                        value={customer.phone}
                        onChange={(e) => {
                          setCustomer((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }));
                          if (errors.phone) {
                            setErrors((prev) => ({ ...prev, phone: "" }));
                          }
                        }}
                        aria-invalid={!!errors.phone}
                        aria-describedby={
                          errors.phone ? "phone-error" : undefined
                        }
                        placeholder="e.g. 0912 345 6789"
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder-[var(--text-subtle)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                      {errors.phone ? (
                        <p
                          id="phone-error"
                          role="alert"
                          className="mt-1.5 text-xs font-bold text-red-600"
                        >
                          {errors.phone}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={pickupTimeId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        Timing Preference
                      </label>
                      <select
                        id={pickupTimeId}
                        value={customer.pickupTimePreference}
                        onChange={(e) =>
                          setCustomer((prev) => ({
                            ...prev,
                            pickupTimePreference: e.target.value,
                          }))
                        }
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      >
                        <option value="asap">
                          As soon as prepared (15–30 mins)
                        </option>
                        <option value="in-1-hour">In ~1 hour</option>
                        <option value="in-2-hours">In ~2 hours</option>
                        <option value="later-today">
                          Later today (within shop hours)
                        </option>
                      </select>
                    </div>

                    <div>
                      <fieldset>
                        <legend className="block text-sm font-bold text-[var(--text-strong)]">
                          Payment Preference at Shop
                        </legend>
                        <div className="mt-2 flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--text-strong)]">
                            <input
                              type="radio"
                              name="payment-preference"
                              value="Cash"
                              checked={customer.paymentPreference === "Cash"}
                              onChange={() =>
                                setCustomer((prev) => ({
                                  ...prev,
                                  paymentPreference: "Cash",
                                }))
                              }
                              className="size-4 accent-[var(--accent-solid)]"
                            />
                            Cash at counter
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--text-strong)]">
                            <input
                              type="radio"
                              name="payment-preference"
                              value="GCash"
                              checked={customer.paymentPreference === "GCash"}
                              onChange={() =>
                                setCustomer((prev) => ({
                                  ...prev,
                                  paymentPreference: "GCash",
                                }))
                              }
                              className="size-4 accent-[var(--accent-solid)]"
                            />
                            GCash at counter
                          </label>
                        </div>
                      </fieldset>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor={notesInputId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        Special Instructions or Notes (Optional)
                      </label>
                      <textarea
                        id={notesInputId}
                        rows={3}
                        value={customer.notes}
                        onChange={(e) =>
                          setCustomer((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="e.g. Less ice for drinks, pack pastries separately, or preferred rider name..."
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder-[var(--text-subtle)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
                  <h3 className="font-display text-xl font-bold text-[var(--text-strong)] pb-4 border-b border-[var(--border-soft)]">
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
                      <span className="font-bold text-[var(--text-strong)] capitalize">
                        {fulfillment === "pickup"
                          ? "Pickup at shop"
                          : "External rider"}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-soft)] flex items-baseline justify-between">
                      <div>
                        <span className="block text-base font-extrabold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          Catalog exact
                        </span>
                      </div>
                      <span className="text-3xl font-black text-[var(--accent-strong)]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-warm)] p-4 text-xs leading-5 text-[var(--text-muted)]">
                    <strong className="block font-bold text-[var(--text-strong)]">
                      Shop Hours & Payment
                    </strong>
                    Open Mon–Sat 11 AM – 10 PM. Closed Sunday. Payment is
                    settled via Cash or GCash directly with the shop. No online
                    payment processing is charged.
                  </div>

                  <button
                    type="submit"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Continue to Order Review →
                  </button>

                  <Link
                    href="/cart"
                    className="button-secondary w-full text-center text-sm"
                  >
                    ← Back to Cart
                  </Link>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: Order Review Screen Before Confirmation */}
          {step === "review" && (
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <div className="space-y-8 lg:col-span-7 xl:col-span-8">
                {/* Itemized Order Review */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)] mb-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-[var(--text-strong)]">
                        Review Items
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {itemCount} {itemCount === 1 ? "item" : "items"} in
                        order draft
                      </p>
                    </div>
                    <Link
                      href="/cart"
                      className="text-xs font-bold text-[var(--accent-strong)] hover:underline"
                    >
                      Edit items in cart
                    </Link>
                  </div>

                  <ul className="space-y-4" aria-label="Review items list">
                    {lines.map((line) => (
                      <CartLineItem key={line.key} item={line} readOnly />
                    ))}
                  </ul>
                </div>

                {/* Customer and Fulfillment Details Review */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)] mb-6">
                    <h2 className="font-display text-2xl font-bold text-[var(--text-strong)]">
                      Fulfillment & Customer Details
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-xs font-bold text-[var(--accent-strong)] hover:underline"
                    >
                      Edit details
                    </button>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div className="rounded-xl bg-[var(--surface-warm)] p-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                        Customer Name
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--text-strong)] text-base">
                        {customer.name}
                      </dd>
                    </div>

                    <div className="rounded-xl bg-[var(--surface-warm)] p-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                        Contact Phone
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--text-strong)] text-base">
                        {customer.phone}
                      </dd>
                    </div>

                    <div className="rounded-xl bg-[var(--surface-warm)] p-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                        Fulfillment Mode
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--text-strong)] text-base">
                        {fulfillment === "pickup"
                          ? "Pickup at Shop"
                          : "Customer-Arranged Rider"}
                      </dd>
                      <span className="text-xs text-[var(--text-muted)] mt-0.5 block">
                        {fulfillment === "pickup"
                          ? "Segundo St, Poblacion, Kabacan (beside Pulido Eatery)"
                          : "You independently book & pay your external rider"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[var(--surface-warm)] p-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                        Payment Preference
                      </dt>
                      <dd className="mt-1 font-bold text-[var(--text-strong)] text-base">
                        {customer.paymentPreference} at counter
                      </dd>
                      <span className="text-xs text-[var(--text-muted)] mt-0.5 block">
                        Settled directly with shop
                      </span>
                    </div>

                    {customer.notes ? (
                      <div className="sm:col-span-2 rounded-xl bg-[var(--surface-warm)] p-4">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                          Special Instructions
                        </dt>
                        <dd className="mt-1 text-sm text-[var(--text-strong)]">
                          {customer.notes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>

              {/* Review Confirmation Sidebar */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
                  <h3 className="font-display text-xl font-bold text-[var(--text-strong)] pb-4 border-b border-[var(--border-soft)]">
                    Final Order Review
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
                          : "External rider"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Rider fee</span>
                      <span className="text-xs font-semibold text-[var(--text-subtle)]">
                        {fulfillment === "pickup"
                          ? "₱0 (Pickup)"
                          : "Handled directly with rider"}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-soft)] flex items-baseline justify-between">
                      <div>
                        <span className="block text-base font-extrabold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          Payable at counter
                        </span>
                      </div>
                      <span className="text-3xl font-black text-[var(--accent-strong)]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-4 text-xs leading-5 text-[var(--notice-text)]">
                    <strong className="block font-bold">
                      Confirmation Summary Notice
                    </strong>
                    Confirming this order creates an order draft for
                    preparation. No online payment is charged right now. Pay in
                    person via Cash or GCash upon collection.
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Confirm Order Draft ✓
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="button-secondary w-full text-center text-sm"
                  >
                    ← Back to Edit Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Order Confirmation Screen */}
          {step === "confirmation" && confirmedOrder && (
            <div className="mx-auto max-w-2xl">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-8 sm:p-12 shadow-[var(--shadow-card)] text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--surface-green)] text-[var(--deep-green)] mb-6">
                  <svg
                    className="size-10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <span className="eyebrow block">Order Draft Received</span>
                <h2 className="font-display mt-2 text-3xl font-bold text-[var(--text-strong)] sm:text-4xl">
                  Thank You, {confirmedOrder.customer.name}!
                </h2>
                <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
                  Your order draft has been logged at Brew ni Cat. Keep your
                  order reference code handy.
                </p>

                {/* Reference Code Display */}
                <div className="mt-8 rounded-2xl border border-[var(--accent-soft)] bg-[var(--surface-warm)] p-6 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] block">
                    Order Reference Code
                  </span>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-[var(--accent-strong)] tracking-wider">
                      {confirmedOrder.reference}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyReference(confirmedOrder.reference)}
                      className="rounded-lg border border-[var(--border-strong)] bg-white px-2.5 py-1 text-xs font-bold text-[var(--text-strong)] hover:bg-[var(--surface-card)] transition-colors"
                      aria-label="Copy order reference code"
                    >
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <span className="mt-2 block text-xs text-[var(--text-subtle)]">
                    Submitted at {confirmedOrder.createdAt}
                  </span>
                </div>

                {/* Order Summary Snapshot */}
                <div className="mt-8 rounded-2xl border border-[var(--border-soft)] p-6 text-left space-y-4">
                  <h3 className="font-bold text-[var(--text-strong)] text-base border-b border-[var(--border-soft)] pb-3">
                    Order Snapshot
                  </h3>

                  <ul className="divide-y divide-[var(--border-soft)] text-sm">
                    {confirmedOrder.lines.map((line) => (
                      <li
                        key={line.key}
                        className="py-2.5 flex justify-between gap-4"
                      >
                        <div>
                          <span className="font-semibold text-[var(--text-strong)]">
                            {line.quantity}× {line.itemName} ({line.variantName}
                            )
                          </span>
                          {line.flavor ? (
                            <span className="text-xs text-[var(--text-muted)] block">
                              Flavor: {line.flavor}
                            </span>
                          ) : null}
                        </div>
                        <span className="font-bold text-[var(--accent-strong)] shrink-0">
                          {formatPrice(line.lineTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-[var(--border-soft)] flex justify-between items-baseline text-base font-extrabold text-[var(--text-strong)]">
                    <span>Total Subtotal:</span>
                    <span className="text-xl text-[var(--accent-strong)]">
                      {formatPrice(confirmedOrder.subtotal)}
                    </span>
                  </div>
                </div>

                {/* Next Steps Guidance */}
                <div className="mt-8 rounded-2xl bg-[var(--surface-warm)] p-6 text-left text-sm leading-relaxed space-y-3">
                  <h4 className="font-bold text-[var(--text-strong)] text-base">
                    What happens next?
                  </h4>

                  {confirmedOrder.fulfillment === "pickup" ? (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Visit Brew ni Cat at{" "}
                        <strong className="text-[var(--text-strong)]">
                          {siteConfig.address.street},{" "}
                          {siteConfig.address.locality}
                        </strong>{" "}
                        (beside Pulido Eatery).
                      </li>
                      <li>
                        Present reference code{" "}
                        <strong className="font-mono text-[var(--accent-strong)]">
                          {confirmedOrder.reference}
                        </strong>{" "}
                        at the counter.
                      </li>
                      <li>
                        Pay{" "}
                        <strong className="text-[var(--text-strong)]">
                          {formatPrice(confirmedOrder.subtotal)}
                        </strong>{" "}
                        via {confirmedOrder.customer.paymentPreference} and pick
                        up your items.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Contact your preferred external rider (e.g. Papa&apos;s
                        Delivery).
                      </li>
                      <li>
                        Give your rider your reference code{" "}
                        <strong className="font-mono text-[var(--accent-strong)]">
                          {confirmedOrder.reference}
                        </strong>{" "}
                        and shop address ({siteConfig.address.street}, beside
                        Pulido Eatery).
                      </li>
                      <li>
                        The rider collects the order at the counter and delivers
                        it to you. Settle the rider&apos;s delivery fee directly
                        with them.
                      </li>
                    </ol>
                  )}

                  <p className="border-t border-[var(--border-strong)]/40 pt-3 text-xs text-[var(--text-subtle)]">
                    Operating Hours: Mon–Sat 11 AM – 10 PM. Closed Sundays. If
                    you have questions or schedule changes, call us directly at{" "}
                    {siteConfig.contact.phone}.
                  </p>
                </div>

                {/* CTAs */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/menu" className="button-primary">
                    Order More Items
                  </Link>
                  <Link href="/" className="button-secondary">
                    Return to Home
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
