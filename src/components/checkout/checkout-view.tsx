"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageIntro } from "@/components/ui/page-intro";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/cart-context";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { formatPrice } from "@/lib/menu/format-price";
import type { MenuCatalog } from "@/types/menu";
import type { CartItem, FulfillmentType } from "@/types/ordering";

import { CartLineItem } from "../cart/cart-line-item";

export type CheckoutStep = "details" | "review" | "send";

export type CustomerDetails = Readonly<{
  name: string;
  phone: string;
  notes: string;
  paymentPreference: "Cash" | "GCash";
}>;

export type PreparedOrderSummary = Readonly<{
  createdAt: string;
  customer: CustomerDetails;
  fulfillment: FulfillmentType;
  lines: readonly CartItem[];
  subtotal: number;
  itemCount: number;
}>;

export function formatOrderSummaryText(
  summary: PreparedOrderSummary,
): string {
  const fulfillmentText =
    summary.fulfillment === "pickup"
      ? `Pickup at Shop (${siteConfig.address.street}, ${siteConfig.address.locality})`
      : "Customer-Arranged External Rider";

  const itemsText = summary.lines
    .map(
      (l) =>
        `- ${l.quantity}× ${l.itemName} (${l.variantName}${l.flavor ? `, ${l.flavor}` : ""}) — ${formatPrice(l.lineTotal)}`,
    )
    .join("\n");

  return [
    `Brew ni Cat Coffee Shop — Order Summary`,
    `Customer: ${summary.customer.name}`,
    `Phone: ${summary.customer.phone}`,
    `Fulfillment: ${fulfillmentText}`,
    summary.customer.notes ? `Notes: ${summary.customer.notes}` : null,
    `Items:`,
    itemsText,
    `Subtotal: ${formatPrice(summary.subtotal)}`,
    `Payment preference: ${summary.customer.paymentPreference} at counter`,
    `Packaging: ${siteConfig.operations.takeoutFee} applies to takeout.`,
  ]
    .filter(Boolean)
    .join("\n");
}

type CheckoutViewProps = Readonly<{
  loadMenu?: () => Promise<MenuCatalog>;
}>;

export function CheckoutView({ loadMenu = fetchPublicMenu }: CheckoutViewProps) {
  const {
    lines,
    fulfillment,
    subtotal,
    itemCount,
    isEmpty,
    setFulfillment,
    revalidateWithCatalog,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<CheckoutStep>("details");
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    phone: "",
    notes: "",
    paymentPreference: "Cash",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preparedSummary, setPreparedSummary] =
    useState<PreparedOrderSummary | null>(null);
  const [revalidationWarnings, setRevalidationWarnings] = useState<
    readonly string[]
  >([]);
  const [isCopied, setIsCopied] = useState(false);

  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);
  const step3HeadingRef = useRef<HTMLHeadingElement>(null);

  const nameInputId = useId();
  const phoneInputId = useId();
  const notesInputId = useId();

  // Revalidate cart prices against authoritative menu on mount
  useEffect(() => {
    let isMounted = true;
    void loadMenu()
      .then((catalog) => {
        if (!isMounted) return;
        const result = revalidateWithCatalog(catalog);
        if (result.warnings.length > 0) {
          setRevalidationWarnings(result.warnings);
        }
      })
      .catch(() => {
        // Continue with current local cart if network is temporarily unavailable
      });

    return () => {
      isMounted = false;
    };
  }, [loadMenu, revalidateWithCatalog]);

  function goToStep(nextStep: CheckoutStep) {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      if (nextStep === "details") {
        step1HeadingRef.current?.focus();
      } else if (nextStep === "review") {
        step2HeadingRef.current?.focus();
      } else if (nextStep === "send") {
        step3HeadingRef.current?.focus();
      }
    }, 50);
  }

  function validateDetails(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!customer.name.trim()) {
      nextErrors.name = "Please enter your full name.";
    }

    const cleanPhone = customer.phone.replace(/[\s\-()]/g, "");
    const phMobileRegex = /^(09\d{9}|\+639\d{9})$/;
    if (!cleanPhone) {
      nextErrors.phone = "Please enter your contact phone number.";
    } else if (!phMobileRegex.test(cleanPhone)) {
      nextErrors.phone =
        "Please enter a valid Philippine mobile number (e.g. 0912 345 6789 or +63 912 345 6789).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleProceedToReview(e: React.FormEvent) {
    e.preventDefault();
    if (validateDetails()) {
      goToStep("review");
    }
  }

  function handleProceedToSend() {
    const summary: PreparedOrderSummary = {
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

    setPreparedSummary(summary);
    clearCart();
    goToStep("send");
  }

  function copySummaryToClipboard(summary: PreparedOrderSummary) {
    const text = formatOrderSummaryText(summary);
    void navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  }

  // If cart is empty and not on send step, show empty cart notice
  if (isEmpty && step !== "send") {
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
                Browse our delicious coffee, cold drinks, snacks, and treats to start your order.
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
              : "Order Summary for Shop"
        }
        description={
          step === "details" ? (
            <p>
              Confirm your contact details and fulfillment option. Payment is settled directly with the shop upon collection.
            </p>
          ) : step === "review" ? (
            <p>
              Double check your order items, contact details, and fulfillment arrangement before preparing your order summary.
            </p>
          ) : (
            <p>
              Your order summary is ready. Send it directly to Brew ni Cat via Facebook Messenger or phone to place your order.
            </p>
          )
        }
      />

      <section className="py-12 sm:py-16 lg:py-20" aria-label="Checkout flow">
        <Container>
          {/* Revalidation Warnings Banner */}
          {revalidationWarnings.length > 0 && step !== "send" ? (
            <div
              role="alert"
              className="mb-8 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-sm text-[var(--notice-text)] space-y-1"
            >
              <strong className="block font-bold">
                Cart Items Refreshed to Current Menu
              </strong>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {revalidationWarnings.map((warn) => (
                  <li key={warn}>{warn}</li>
                ))}
              </ul>
            </div>
          ) : null}

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
                    : step === "send"
                      ? "text-[var(--deep-green)] font-semibold"
                      : "text-[var(--text-subtle)] font-medium"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "review"
                      ? "bg-[var(--accent-solid)] text-white"
                      : step === "send"
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
                  step === "send"
                    ? "text-[var(--accent-strong)] font-extrabold"
                    : "text-[var(--text-subtle)] font-medium"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "send"
                      ? "bg-[var(--accent-solid)] text-white"
                      : "bg-[var(--surface-warm)] text-[var(--text-subtle)]"
                  }`}
                >
                  3
                </span>
                <span>Send to Shop</span>
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
                  <h2
                    ref={step1HeadingRef}
                    tabIndex={-1}
                    className="font-display text-xl font-bold text-[var(--text-strong)] outline-none"
                  >
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
                          onChange={() => setFulfillment("pickup" as FulfillmentType)}
                          className="size-4 accent-[var(--accent-solid)] mt-1"
                        />
                      </div>
                      <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                        Pick up directly at {siteConfig.address.street}, {siteConfig.address.locality} ({siteConfig.address.landmark}). {siteConfig.operations.hoursNotice}
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
                          onChange={() => setFulfillment("external-rider" as FulfillmentType)}
                          className="size-4 accent-[var(--accent-solid)] mt-1"
                        />
                      </div>
                      <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
                        Arrange and pay your own preferred rider (e.g., Papa&apos;s Delivery). Your rider collects the order at the shop.
                      </p>
                    </label>
                  </div>

                  {fulfillment === "external-rider" ? (
                    <div className="mt-6 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-xs leading-6 text-[var(--notice-text)]">
                      <strong className="block text-sm font-bold mb-1">
                        How External Rider Pickup Works:
                      </strong>
                      <ol className="list-decimal pl-4 space-y-1 mb-3">
                        <li>Prepare your order summary through this page.</li>
                        <li>Contact Brew ni Cat via Facebook Messenger or phone to place the order.</li>
                        <li>Contact and book your external rider yourself (Papa&apos;s Delivery, local rider, etc.).</li>
                        <li>Your rider collects the prepared order at the shop counter ({siteConfig.address.street}, {siteConfig.address.landmark}).</li>
                      </ol>
                      <p className="border-t border-[var(--notice-border)] pt-2 text-[var(--notice-text)]">
                        Rider availability, delivery fees, arrival time, and rider payment are separate from Brew ni Cat. The shop does not calculate, book, or charge rider fees.
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
                    This information will be included in your order summary for the shop.
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
                          setCustomer((prev) => ({ ...prev, name: e.target.value }));
                          if (errors.name) {
                            setErrors((prev) => ({ ...prev, name: "" }));
                          }
                        }}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
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
                        Contact Phone Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        id={phoneInputId}
                        type="tel"
                        required
                        value={customer.phone}
                        onChange={(e) => {
                          setCustomer((prev) => ({ ...prev, phone: e.target.value }));
                          if (errors.phone) {
                            setErrors((prev) => ({ ...prev, phone: "" }));
                          }
                        }}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
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

                    <div className="sm:col-span-2">
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
                        Special Instructions or Preferred Pickup Time (Optional)
                      </label>
                      <textarea
                        id={notesInputId}
                        rows={3}
                        value={customer.notes}
                        onChange={(e) =>
                          setCustomer((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="e.g. Less ice for iced latte, preferred pickup time today, pack pastries separately..."
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
                        {fulfillment === "pickup" ? "Pickup at shop" : "External rider"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Takeout packaging</span>
                      <span className="text-xs font-semibold text-[var(--text-subtle)]">
                        {siteConfig.operations.takeoutFee} upon collection
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
                      Shop Hours & Takeout Note
                    </strong>
                    {siteConfig.operations.hoursNotice} Takeout packaging incurs a confirmed {siteConfig.operations.takeoutFee}. Payment is settled via Cash or GCash directly with the shop.
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

          {/* STEP 2: Order Review Screen Before Send */}
          {step === "review" && (
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <div className="space-y-8 lg:col-span-7 xl:col-span-8">
                {/* Itemized Order Review */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)] mb-6">
                    <div>
                      <h2
                        ref={step2HeadingRef}
                        tabIndex={-1}
                        className="font-display text-2xl font-bold text-[var(--text-strong)] outline-none"
                      >
                        Review Items
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {itemCount} {itemCount === 1 ? "item" : "items"} in order summary
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
                      <CartLineItem
                        key={line.key}
                        item={line}
                        readOnly
                      />
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
                      onClick={() => goToStep("details")}
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
                          ? `${siteConfig.address.street}, ${siteConfig.address.locality} (${siteConfig.address.landmark})`
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
                          Special Instructions / Timing
                        </dt>
                        <dd className="mt-1 text-sm text-[var(--text-strong)]">
                          {customer.notes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>

              {/* Review Sidebar */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
                  <h3 className="font-display text-xl font-bold text-[var(--text-strong)] pb-4 border-b border-[var(--border-soft)]">
                    Final Review
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
                        {fulfillment === "pickup" ? "Pickup at shop" : "External rider"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Takeout packaging</span>
                      <span className="text-xs font-semibold text-[var(--text-subtle)]">
                        {siteConfig.operations.takeoutFee} upon collection
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
                      Order Preparation Notice
                    </strong>
                    Proceeding generates your complete order summary. Online order transmission will be added in a future phase; you will send this summary directly to the shop via Facebook Messenger or phone to place your order.
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedToSend}
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Proceed to Send to Shop →
                  </button>

                  <button
                    type="button"
                    onClick={() => goToStep("details")}
                    className="button-secondary w-full text-center text-sm"
                  >
                    ← Back to Edit Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Order Summary for the Shop (Send to Shop) */}
          {step === "send" && preparedSummary && (
            <div className="mx-auto max-w-2xl">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-8 sm:p-12 shadow-[var(--shadow-card)] text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--accent-strong)] mb-6">
                  <svg
                    className="size-10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 2L11 13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>

                <span className="eyebrow block">Order Summary Ready</span>
                <h2
                  ref={step3HeadingRef}
                  tabIndex={-1}
                  className="font-display mt-2 text-3xl font-bold text-[var(--text-strong)] sm:text-4xl outline-none"
                >
                  Order Summary for the Shop
                </h2>

                {/* Plain truthful explanation: no fake order placed */}
                <div className="mt-4 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-4 text-sm text-[var(--notice-text)] leading-relaxed text-left">
                  <strong className="block font-bold text-base mb-1">
                    Notice: The website does not transmit orders to the shop yet.
                  </strong>
                  Online order transmission is coming in a future update. No order has been sent to Brew ni Cat. Please copy your order summary below and message or call the shop to place your order.
                </div>

                {/* Formatted Order Text Box with Copy Button */}
                <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-warm)] p-5 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-strong)]/40 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                      Formatted Order Summary
                    </span>
                    <button
                      type="button"
                      onClick={() => copySummaryToClipboard(preparedSummary)}
                      className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--text-strong)] hover:bg-[var(--surface-card)] transition-colors inline-flex items-center gap-1.5"
                    >
                      <svg
                        className="size-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {isCopied ? "Copied to clipboard!" : "Copy order summary"}
                    </button>
                  </div>

                  <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-[var(--text-strong)] leading-relaxed select-all">
                    {formatOrderSummaryText(preparedSummary)}
                  </pre>
                </div>

                {/* Direct Shop Action Links */}
                <div className="mt-6 p-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] text-left space-y-4">
                  <h3 className="font-bold text-[var(--text-strong)] text-base">
                    Next step: Contact Brew ni Cat to arrange your order
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Paste your copied order summary into Facebook Messenger or read it over the phone:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <ExternalLink
                      href={siteConfig.social.facebook}
                      className="button-primary flex-1 text-center"
                    >
                      Message on Facebook
                    </ExternalLink>
                    <a
                      href={siteConfig.contact.phoneHref}
                      className="button-secondary flex-1 text-center"
                    >
                      Call or Text {siteConfig.contact.phone}
                    </a>
                  </div>
                </div>

                {/* Next Steps Guidance */}
                <div className="mt-6 rounded-2xl bg-[var(--surface-warm)] p-6 text-left text-sm leading-relaxed space-y-3">
                  <h4 className="font-bold text-[var(--text-strong)] text-base">
                    Fulfillment & Collection Guide
                  </h4>

                  {preparedSummary.fulfillment === "pickup" ? (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Send your order summary to Brew ni Cat via Facebook or phone ({siteConfig.contact.phone}).
                      </li>
                      <li>
                        Head to Brew ni Cat at <strong className="text-[var(--text-strong)]">{siteConfig.address.street}, {siteConfig.address.locality}</strong> ({siteConfig.address.landmark}).
                      </li>
                      <li>
                        Pay <strong className="text-[var(--text-strong)]">{formatPrice(preparedSummary.subtotal)}</strong> (plus confirmed {siteConfig.operations.takeoutFee} for takeout packaging) via {preparedSummary.customer.paymentPreference} at the counter.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Send your order summary to Brew ni Cat so the shop can prepare it.
                      </li>
                      <li>
                        Book your preferred external rider (e.g. Papa&apos;s Delivery). Provide the rider with your order details and the shop address: {siteConfig.address.street}, {siteConfig.address.locality} ({siteConfig.address.landmark}).
                      </li>
                      <li>
                        Your rider collects your prepared order at the counter. Settle the rider&apos;s delivery fee directly with them.
                      </li>
                    </ol>
                  )}

                  <p className="border-t border-[var(--border-strong)]/40 pt-3 text-xs text-[var(--text-subtle)]">
                    {siteConfig.operations.hoursNotice}
                  </p>
                </div>

                {/* CTAs */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/menu" className="button-primary">
                    Start Another Order
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
