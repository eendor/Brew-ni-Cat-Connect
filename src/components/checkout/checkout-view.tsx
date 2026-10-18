"use client";

import { validateDetails as validateDetailsHelper } from "@/lib/ordering/validation";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageIntro } from "@/components/ui/page-intro";
import { RiderList } from "@/components/ui/rider-list";
import { StateScene } from "@/components/three/state-scene";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/cart-context";
import {
  clearStoredSummary,
  getStoredSummary,
  saveStoredSummary,
  subscribeStoredSummary,
} from "@/lib/ordering/summary-storage";
import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { formatOptionName } from "@/lib/menu/format-name";
import { formatPrice } from "@/lib/menu/format-price";
import type { MenuCatalog } from "@/types/menu";
import type { CartItem, FulfillmentType } from "@/types/ordering";

import { CartLineItem } from "../cart/cart-line-item";

export type CheckoutStep = "details" | "review" | "send";

export type CustomerDetails = Readonly<{
  name: string;
  phone: string;
  /** Where the rider delivers. Empty for pickup; missing in summaries
   *  saved before rider delivery existed. */
  address?: string;
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

/** Shape check for a summary read back from storage. */
function isPreparedSummary(value: unknown): value is PreparedOrderSummary {
  if (typeof value !== "object" || value === null) return false;
  const summary = value as Partial<PreparedOrderSummary>;
  const customer = summary.customer as Partial<CustomerDetails> | undefined;
  return (
    typeof summary.createdAt === "string" &&
    typeof summary.subtotal === "number" &&
    typeof summary.itemCount === "number" &&
    (summary.fulfillment === "pickup" ||
      summary.fulfillment === "external-rider") &&
    typeof customer?.name === "string" &&
    typeof customer.phone === "string" &&
    typeof customer.notes === "string" &&
    (customer.address === undefined || typeof customer.address === "string") &&
    (customer.paymentPreference === "Cash" ||
      customer.paymentPreference === "GCash") &&
    Array.isArray(summary.lines) &&
    summary.lines.every(
      (line: Partial<CartItem> | null) =>
        typeof line?.key === "string" &&
        typeof line.itemName === "string" &&
        typeof line.variantName === "string" &&
        typeof line.quantity === "number" &&
        typeof line.unitPrice === "number" &&
        typeof line.lineTotal === "number",
    )
  );
}

const readPreparedSummary = () => getStoredSummary(isPreparedSummary);

/** What the summary was made from: lines, quantities, prices, fulfillment. */
function orderSignature(
  lines: readonly CartItem[],
  fulfillment: FulfillmentType,
) {
  return `${fulfillment}|${lines
    .map((line) => `${line.key}x${line.quantity}@${line.unitPrice}`)
    .join(",")}`;
}

type CopyState = "idle" | "copied" | "failed";

export function formatOrderSummaryText(summary: PreparedOrderSummary): string {
  const shop = siteConfig.address;
  const isRiderDelivery = summary.fulfillment === "external-rider";
  const deliverTo = summary.customer.address?.trim();

  // A rider orders at the shop for the customer, so the rider's copy names
  // the shop to order from and the address to deliver to.
  const fulfillmentLines = isRiderDelivery
    ? [
        `Fulfillment: Rider delivery`,
        `Order and pick up at: ${siteConfig.shortName}, ${shop.street}, ${shop.locality} (${shop.landmark})`,
        deliverTo ? `Deliver to: ${deliverTo}` : null,
      ]
    : [`Fulfillment: Pickup at Shop (${shop.street}, ${shop.locality})`];

  const itemsText = summary.lines
    .map(
      (l) =>
        `- ${l.quantity}× ${l.itemName} (${formatOptionName(l.variantName)}${l.flavor ? `, ${l.flavor}` : ""}) — ${formatPrice(l.lineTotal)}`,
    )
    .join("\n");

  return [
    `Brew ni Cat Coffee Shop — Order Summary`,
    `Customer: ${summary.customer.name}`,
    `Phone: ${summary.customer.phone}`,
    ...fulfillmentLines,
    summary.customer.notes ? `Notes: ${summary.customer.notes}` : null,
    `Items:`,
    itemsText,
    `Subtotal: ${formatPrice(summary.subtotal)}`,
    isRiderDelivery
      ? `Payment and delivery fee: agreed with the rider`
      : `Payment preference: ${summary.customer.paymentPreference} at counter`,
    `Takeout box: ${siteConfig.operations.takeoutBoxPrice}, not included in the subtotal (the shop confirms it).`,
  ]
    .filter(Boolean)
    .join("\n");
}

type CheckoutViewProps = Readonly<{
  loadMenu?: () => Promise<MenuCatalog>;
}>;

export function CheckoutView({
  loadMenu = fetchPublicMenu,
}: CheckoutViewProps) {
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

  const [formStep, setStep] = useState<CheckoutStep>("details");
  // The generated summary survives a refresh; while one is stored the page
  // stays on the final step until the visitor starts a new order. It only
  // stands for the cart it was made from: once the cart changes (other than
  // being emptied by a successful copy), the visitor starts again.
  const storedSummary = useSyncExternalStore(
    subscribeStoredSummary,
    readPreparedSummary,
    () => null,
  );
  const summaryIsStale =
    storedSummary !== null &&
    !isEmpty &&
    orderSignature(storedSummary.lines, storedSummary.fulfillment) !==
      orderSignature(lines, fulfillment);
  const preparedSummary = summaryIsStale ? null : storedSummary;
  // If the cart changes on the last step (in the cart drawer or another
  // tab), the old summary is dropped and the visitor reviews the new cart.
  const step: CheckoutStep = preparedSummary
    ? "send"
    : formStep === "send"
      ? "review"
      : formStep;
  const isRiderDelivery =
    (preparedSummary?.fulfillment ?? fulfillment) === "external-rider";
  const flowRef = useRef<HTMLElement>(null);
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    phone: "",
    address: "",
    notes: "",
    paymentPreference: "Cash",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [revalidationWarnings, setRevalidationWarnings] = useState<
    readonly string[]
  >([]);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyTimerRef = useRef<number | undefined>(undefined);
  const summaryTextRef = useRef<HTMLPreElement>(null);

  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);
  const step3HeadingRef = useRef<HTMLHeadingElement>(null);

  const nameInputId = useId();
  const phoneInputId = useId();
  const addressInputId = useId();
  const notesInputId = useId();

  useEffect(() => {
    if (summaryIsStale) clearStoredSummary();
  }, [summaryIsStale]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

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
    // after the step renders, bring its form section (not the page hero)
    // to the top under the sticky header and move focus to its heading
    setTimeout(() => {
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const flow = flowRef.current;
      if (typeof flow?.scrollIntoView === "function")
        flow.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      const heading =
        nextStep === "details"
          ? step1HeadingRef.current
          : nextStep === "review"
            ? step2HeadingRef.current
            : step3HeadingRef.current;
      heading?.focus({ preventScroll: true });
    }, 50);
  }

  function handleProceedToReview(e: React.FormEvent) {
    e.preventDefault();
    const result = validateDetailsHelper(customer, {
      requireAddress: isRiderDelivery,
    });
    setErrors(result.errors);
    if (result.isValid) {
      goToStep("review");
      return;
    }
    // On phones the submit button sits far below the fields; take the
    // visitor to the first field that needs fixing.
    const firstInvalid = result.errors.name
      ? nameInputId
      : result.errors.phone
        ? phoneInputId
        : addressInputId;
    setTimeout(() => document.getElementById(firstInvalid)?.focus(), 0);
  }

  function handleProceedToSend() {
    const summary: PreparedOrderSummary = {
      createdAt: new Date().toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      // a pickup order carries no delivery address
      customer: isRiderDelivery ? customer : { ...customer, address: "" },
      fulfillment,
      lines: [...lines],
      subtotal,
      itemCount,
    };

    // the cart stays until the summary is copied or a new order is started
    saveStoredSummary(summary);
    goToStep("send");
  }

  /** Selects the summary text so it can be copied by hand. */
  function selectSummaryText() {
    const pre = summaryTextRef.current;
    const selection = window.getSelection?.();
    if (!pre || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(pre);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function copySummaryToClipboard(summary: PreparedOrderSummary) {
    window.clearTimeout(copyTimerRef.current);
    try {
      if (typeof navigator.clipboard?.writeText !== "function") {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(formatOrderSummaryText(summary));
    } catch {
      // nothing was copied, so the cart stays and the text is selected
      selectSummaryText();
      setCopyState("failed");
      return;
    }
    setCopyState("copied");
    // copied: the order now lives in the visitor's message to the shop or rider
    clearCart({ undoable: false });
    copyTimerRef.current = window.setTimeout(() => setCopyState("idle"), 2500);
  }

  // If cart is empty and not on send step, show empty cart notice
  if (isEmpty && step !== "send") {
    return (
      <>
        <PageIntro
          mood="checkout"
          eyebrow="Checkout"
          title="Checkout"
          description={
            <p>Please add items to your cart before proceeding to checkout.</p>
          }
        />
        <section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-lg text-center rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-8 sm:p-12 shadow-[var(--shadow-subtle)]">
              <StateScene
                kind="empty"
                tone="card"
                className="mx-auto mb-4 size-44 sm:size-52"
                fallback={
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--accent-strong)]">
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
                }
              />
              <h2 className="font-display text-2xl text-[var(--text-strong)]">
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
        mood="checkout"
        eyebrow="Order Flow"
        title={
          step === "details"
            ? "Checkout"
            : step === "review"
              ? "Review Order"
              : isRiderDelivery
                ? "Order Summary for Your Rider"
                : "Order Summary for Shop"
        }
        description={
          step === "details" ? (
            <p>
              Choose pickup or rider delivery and add your contact details. No
              payment is taken on this website.
            </p>
          ) : step === "review" ? (
            <p>
              Double check your order items, contact details, and fulfillment
              arrangement before preparing your order summary.
            </p>
          ) : isRiderDelivery ? (
            <p>
              Your order summary is ready. Send it to a local rider on Facebook;
              the rider orders it at Brew ni Cat and delivers it to you.
            </p>
          ) : (
            <p>
              Your order summary is ready. Send it directly to Brew ni Cat via
              Facebook Messenger or phone to place your order.
            </p>
          )
        }
      />

      <section
        ref={flowRef}
        className="scroll-mt-20 py-12 sm:py-16 lg:scroll-mt-24 lg:py-20"
        aria-label="Checkout flow"
      >
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
                    : "text-[var(--accent-solid)] font-semibold"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "details"
                      ? "bg-[var(--accent-solid)] text-[var(--on-accent)]"
                      : "bg-[var(--surface-accent)] text-[var(--accent-solid)]"
                  }`}
                >
                  1
                </span>
                <span className="sr-only sm:not-sr-only">
                  Details & Fulfillment
                </span>
              </li>

              <li className="text-[var(--border-strong)]" aria-hidden="true">
                →
              </li>

              <li
                className={`flex items-center gap-2 ${
                  step === "review"
                    ? "text-[var(--accent-strong)] font-extrabold"
                    : step === "send"
                      ? "text-[var(--accent-solid)] font-semibold"
                      : "text-[var(--text-subtle)] font-medium"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${
                    step === "review"
                      ? "bg-[var(--accent-solid)] text-[var(--on-accent)]"
                      : step === "send"
                        ? "bg-[var(--surface-accent)] text-[var(--accent-solid)]"
                        : "bg-[var(--surface-warm)] text-[var(--text-subtle)]"
                  }`}
                >
                  2
                </span>
                <span className="sr-only sm:not-sr-only">Review Order</span>
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
                      ? "bg-[var(--accent-solid)] text-[var(--on-accent)]"
                      : "bg-[var(--surface-warm)] text-[var(--text-subtle)]"
                  }`}
                >
                  3
                </span>
                <span className="sr-only sm:not-sr-only">
                  {isRiderDelivery ? "Send to Rider" : "Send to Shop"}
                </span>
              </li>
            </ol>
          </nav>

          {/* STEP 1: Details & Fulfillment Form */}
          {step === "details" && (
            <form
              onSubmit={handleProceedToReview}
              noValidate
              className="grid gap-10 min-[900px]:grid-cols-12 min-[900px]:items-start min-[900px]:gap-8 xl:gap-12"
            >
              <div className="space-y-8 min-[900px]:col-span-7 xl:col-span-8">
                {/* Fulfillment Selection */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <h2
                    ref={step1HeadingRef}
                    tabIndex={-1}
                    className="font-display text-xl text-[var(--text-strong)] outline-none"
                  >
                    1. Select Fulfillment Mode
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Choose how you will receive your order from Brew ni Cat.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label
                      className={`surface-lift flex cursor-pointer flex-col justify-between rounded-2xl p-5 ${
                        fulfillment === "pickup"
                          ? "outline-2 outline-[var(--accent-solid)]"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-extrabold text-[var(--text-strong)] text-base block">
                            Pickup at Shop
                          </span>
                          <span className="text-xs text-[var(--accent-solid)] font-semibold mt-1 block">
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
                        {siteConfig.address.locality} (
                        {siteConfig.address.landmark}).{" "}
                        {siteConfig.operations.hoursNotice}
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
                          <span className="font-extrabold text-[var(--text-strong)] text-base block">
                            Rider Delivery
                          </span>
                          <span className="text-xs text-[var(--accent-strong)] font-semibold mt-1 block">
                            A local rider orders and delivers
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
                        Send your order summary to a local delivery service in
                        Kabacan. The rider orders it at the shop for you and
                        brings it to your address.
                      </p>
                    </label>
                  </div>

                  {isRiderDelivery ? (
                    <div className="mt-6 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-xs leading-6 text-[var(--notice-text)]">
                      <strong className="block text-sm font-bold mb-1">
                        How Rider Delivery Works:
                      </strong>
                      <ol className="list-decimal pl-4 space-y-1 mb-3">
                        <li>Prepare your order summary on this page.</li>
                        <li>
                          On the last step, send it to one of the local riders
                          listed there.
                        </li>
                        <li>
                          The rider orders at Brew ni Cat, picks it up at{" "}
                          {siteConfig.address.street} (
                          {siteConfig.address.landmark}) and delivers it to you.
                        </li>
                      </ol>
                      <p className="border-t border-[var(--notice-border)] pt-2 text-[var(--notice-text)]">
                        Delivery fee, timing and payment are agreed with your
                        rider. Brew ni Cat doesn&apos;t book riders or charge
                        rider fees.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Customer Contact Details */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <h2 className="font-display text-xl text-[var(--text-strong)]">
                    2. Customer Contact Information
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    This information will be included in your order summary for{" "}
                    {isRiderDelivery ? "your rider" : "the shop"}.
                  </p>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={nameInputId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        Full Name{" "}
                        <span
                          className="text-[var(--danger)]"
                          aria-hidden="true"
                        >
                          *
                        </span>
                      </label>
                      <input
                        id={nameInputId}
                        type="text"
                        required
                        autoComplete="name"
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
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                      {errors.name ? (
                        <p
                          id="name-error"
                          role="alert"
                          className="mt-1.5 text-sm font-bold text-[var(--danger)]"
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
                        <span
                          className="text-[var(--danger)]"
                          aria-hidden="true"
                        >
                          *
                        </span>
                      </label>
                      <input
                        id={phoneInputId}
                        type="tel"
                        required
                        autoComplete="tel"
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
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                      {errors.phone ? (
                        <p
                          id="phone-error"
                          role="alert"
                          className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                        >
                          {errors.phone}
                        </p>
                      ) : null}
                    </div>

                    {isRiderDelivery ? (
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={addressInputId}
                          className="block text-sm font-bold text-[var(--text-strong)]"
                        >
                          Delivery Address{" "}
                          <span
                            className="text-[var(--danger)]"
                            aria-hidden="true"
                          >
                            *
                          </span>
                        </label>
                        <input
                          id={addressInputId}
                          type="text"
                          required
                          autoComplete="street-address"
                          value={customer.address ?? ""}
                          onChange={(e) => {
                            setCustomer((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }));
                            if (errors.address) {
                              setErrors((prev) => ({ ...prev, address: "" }));
                            }
                          }}
                          aria-invalid={!!errors.address}
                          aria-describedby={
                            errors.address ? "address-error" : undefined
                          }
                          placeholder="e.g. House no., street, barangay, landmark"
                          className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                        />
                        {errors.address ? (
                          <p
                            id="address-error"
                            role="alert"
                            className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                          >
                            {errors.address}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <fieldset>
                          <legend className="block text-sm font-bold text-[var(--text-strong)]">
                            Payment Preference at Shop
                          </legend>
                          <div className="mt-1 flex flex-wrap gap-x-6">
                            <label className="flex min-h-11 items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--text-strong)]">
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
                            <label className="flex min-h-11 items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--text-strong)]">
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
                    )}

                    <div className="sm:col-span-2">
                      <label
                        htmlFor={notesInputId}
                        className="block text-sm font-bold text-[var(--text-strong)]"
                      >
                        {isRiderDelivery
                          ? "Special Instructions or Delivery Notes (Optional)"
                          : "Special Instructions or Preferred Pickup Time (Optional)"}
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
                        placeholder={
                          isRiderDelivery
                            ? "e.g. Less ice for iced latte, deliver after 3 PM, call when you arrive..."
                            : "e.g. Less ice for iced latte, preferred pickup time today, pack pastries separately..."
                        }
                        className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
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
                        {isRiderDelivery ? "Rider delivery" : "Pickup at shop"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-[var(--text-muted)]">
                      <span>Takeout box</span>
                      <span className="text-right text-xs font-semibold text-[var(--text-subtle)]">
                        {isRiderDelivery
                          ? `${siteConfig.operations.takeoutBoxPrice} · not in subtotal`
                          : `${siteConfig.operations.takeoutBoxPrice}, paid at the shop · not in subtotal`}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-soft)] flex items-baseline justify-between">
                      <div>
                        <span className="block text-base font-extrabold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          {isRiderDelivery
                            ? "Before delivery fee"
                            : "Catalog exact"}
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
                    {siteConfig.operations.hoursNotice} The{" "}
                    {siteConfig.operations.takeoutFee} is not included in the
                    subtotal.{" "}
                    {isRiderDelivery
                      ? "The shop confirms it when your rider orders. Delivery fee and payment are agreed with your rider."
                      : "The shop confirms it when you order. Payment is settled via Cash or GCash directly with the shop."}
                  </div>

                  <button
                    type="submit"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Continue to Order Review{"\u00a0"}→
                  </button>

                  <Link
                    href="/cart"
                    className="button-secondary w-full text-center text-sm"
                  >
                    ←{"\u00a0"}Back to Cart
                  </Link>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: Order Review Screen Before Send */}
          {step === "review" && (
            <div className="grid gap-10 min-[900px]:grid-cols-12 min-[900px]:items-start min-[900px]:gap-8 xl:gap-12">
              <div className="space-y-8 min-[900px]:col-span-7 xl:col-span-8">
                {/* Itemized Order Review */}
                <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)] mb-6">
                    <div>
                      <h2
                        ref={step2HeadingRef}
                        tabIndex={-1}
                        className="font-display text-2xl text-[var(--text-strong)] outline-none"
                      >
                        Review Items
                      </h2>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {itemCount} {itemCount === 1 ? "item" : "items"} in
                        order summary
                      </p>
                    </div>
                    <Link
                      href="/cart"
                      className="-my-1.5 inline-flex min-h-11 items-center text-xs font-bold text-[var(--accent-strong)] hover:underline"
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
                    <h2 className="font-display text-2xl text-[var(--text-strong)]">
                      Fulfillment & Customer Details
                    </h2>
                    <button
                      type="button"
                      onClick={() => goToStep("details")}
                      className="-my-1.5 inline-flex min-h-11 items-center text-xs font-bold text-[var(--accent-strong)] hover:underline"
                    >
                      Edit details
                    </button>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2 text-sm [overflow-wrap:anywhere]">
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
                      <dd className="mt-1">
                        <span className="block text-base font-bold text-[var(--text-strong)]">
                          {isRiderDelivery
                            ? "Rider Delivery"
                            : "Pickup at Shop"}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                          {isRiderDelivery
                            ? `A local rider orders at ${siteConfig.address.street} and delivers`
                            : `${siteConfig.address.street}, ${siteConfig.address.locality} (${siteConfig.address.landmark})`}
                        </span>
                      </dd>
                    </div>

                    <div className="rounded-xl bg-[var(--surface-warm)] p-4">
                      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                        {isRiderDelivery ? "Payment" : "Payment Preference"}
                      </dt>
                      <dd className="mt-1">
                        <span className="block text-base font-bold text-[var(--text-strong)]">
                          {isRiderDelivery
                            ? "Agreed with your rider"
                            : `${customer.paymentPreference} at counter`}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                          {isRiderDelivery
                            ? "Delivery fee not in the subtotal"
                            : "Settled directly with shop"}
                        </span>
                      </dd>
                    </div>

                    {isRiderDelivery ? (
                      <div className="sm:col-span-2 rounded-xl bg-[var(--surface-warm)] p-4">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                          Delivery Address
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--text-strong)] text-base">
                          {customer.address}
                        </dd>
                      </div>
                    ) : null}

                    {customer.notes ? (
                      <div className="sm:col-span-2 rounded-xl bg-[var(--surface-warm)] p-4">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                          {isRiderDelivery
                            ? "Special Instructions / Delivery Notes"
                            : "Special Instructions / Timing"}
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
              <div className="min-[900px]:col-span-5 xl:col-span-4">
                <div className="sticky top-28 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
                  <h3 className="font-display text-xl text-[var(--text-strong)] pb-4 border-b border-[var(--border-soft)]">
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
                        {isRiderDelivery ? "Rider delivery" : "Pickup at shop"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-[var(--text-muted)]">
                      <span>Takeout box</span>
                      <span className="text-right text-xs font-semibold text-[var(--text-subtle)]">
                        {isRiderDelivery
                          ? `${siteConfig.operations.takeoutBoxPrice} · not in subtotal`
                          : `${siteConfig.operations.takeoutBoxPrice}, paid at the shop · not in subtotal`}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-soft)] flex items-baseline justify-between">
                      <div>
                        <span className="block text-base font-extrabold text-[var(--text-strong)]">
                          Subtotal
                        </span>
                        <span className="block text-xs text-[var(--text-subtle)]">
                          {isRiderDelivery
                            ? "Before delivery fee"
                            : "Payable at counter"}
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
                    {isRiderDelivery
                      ? "Proceeding generates your complete order summary. You then send it to a local rider on Facebook, and the rider places the order at the shop."
                      : "Proceeding generates your complete order summary. Online order transmission will be added in a future phase; you will send this summary directly to the shop via Facebook Messenger or phone to place your order."}
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedToSend}
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    {isRiderDelivery
                      ? "Proceed to Send to Rider"
                      : "Proceed to Send to Shop"}
                    {"\u00a0"}→
                  </button>

                  <button
                    type="button"
                    onClick={() => goToStep("details")}
                    className="button-secondary w-full text-center text-sm"
                  >
                    ←{"\u00a0"}Back to Edit Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: The order summary to send to the shop, or to a rider */}
          {step === "send" && preparedSummary && (
            <div className="mx-auto max-w-4xl">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 sm:p-12 shadow-[var(--shadow-card)] text-center">
                <StateScene
                  kind="ready"
                  tone="card"
                  className="mx-auto mb-4 size-48 sm:size-56"
                  fallback={
                    <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--accent-strong)]">
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
                  }
                />

                <span className="eyebrow block">Order Summary Ready</span>
                <h2
                  ref={step3HeadingRef}
                  tabIndex={-1}
                  className="font-display mt-2 text-3xl text-[var(--text-strong)] sm:text-4xl outline-none"
                >
                  {isRiderDelivery
                    ? "Order Summary for Your Rider"
                    : "Order Summary for the Shop"}
                </h2>

                {/* Plain truthful explanation: no fake order placed */}
                <div className="mt-4 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-4 text-sm text-[var(--notice-text)] leading-relaxed text-left">
                  <strong className="block font-bold text-base mb-1">
                    Notice: The website does not transmit orders to the shop
                    yet.
                  </strong>
                  {isRiderDelivery
                    ? "No order has been sent to Brew ni Cat or to any rider. Copy your order summary below and message one of the local riders; the rider places the order at the shop for you."
                    : "Online order transmission is coming in a future update. No order has been sent to Brew ni Cat. Please copy your order summary below and message or call the shop to place your order."}
                </div>

                {/* Formatted Order Text Box with Copy Button */}
                <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-warm)] p-4 sm:p-5 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-strong)]/40 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                      Formatted Order Summary
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copySummaryToClipboard(preparedSummary)
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm font-bold text-[var(--text-strong)] transition-colors hover:border-[var(--accent-solid)]"
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
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {copyState === "copied"
                        ? "Copied to clipboard!"
                        : "Copy order summary"}
                    </button>
                  </div>

                  {/* always rendered, so screen readers hear the result */}
                  <p
                    role="status"
                    className={
                      copyState === "idle"
                        ? "sr-only"
                        : "mb-3 text-sm font-semibold text-[var(--text-muted)]"
                    }
                  >
                    {copyState === "copied"
                      ? isRiderDelivery
                        ? "Copied. Paste it into a message to your rider on Facebook."
                        : "Copied. Paste it into Messenger or read it out on the phone."
                      : copyState === "failed"
                        ? "Couldn’t copy automatically. The summary is selected, so copy it with Ctrl+C or a long press."
                        : null}
                  </p>

                  <pre
                    ref={summaryTextRef}
                    className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-[var(--text-strong)] leading-relaxed select-all [overflow-wrap:anywhere]"
                  >
                    {formatOrderSummaryText(preparedSummary)}
                  </pre>
                </div>

                {/* Next step: who to send the summary to */}
                {isRiderDelivery ? (
                  <div className="mt-6 p-4 sm:p-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] text-left space-y-4">
                    <h3 className="font-bold text-[var(--text-strong)] text-base">
                      Next step: Message a rider with your order summary
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Open a rider&apos;s Facebook page and paste your copied
                      order summary into Messenger:
                    </p>
                    <RiderList />
                  </div>
                ) : (
                  <div className="mt-6 p-4 sm:p-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-card)] text-left space-y-4">
                    <h3 className="font-bold text-[var(--text-strong)] text-base">
                      Next step: Contact Brew ni Cat to arrange your order
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Paste your copied order summary into Facebook Messenger or
                      read it over the phone:
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
                )}

                {/* Next Steps Guidance */}
                <div className="mt-6 rounded-2xl bg-[var(--surface-warm)] p-4 sm:p-6 text-left text-sm leading-relaxed space-y-3">
                  <h4 className="font-bold text-[var(--text-strong)] text-base">
                    {isRiderDelivery
                      ? "Rider Delivery Guide"
                      : "Fulfillment & Collection Guide"}
                  </h4>

                  {preparedSummary.fulfillment === "pickup" ? (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Send your order summary to Brew ni Cat via Facebook or
                        phone ({siteConfig.contact.phone}).
                      </li>
                      <li>
                        Head to Brew ni Cat at{" "}
                        <strong className="text-[var(--text-strong)]">
                          {siteConfig.address.street},{" "}
                          {siteConfig.address.locality}
                        </strong>{" "}
                        ({siteConfig.address.landmark}).
                      </li>
                      <li>
                        Pay{" "}
                        <strong className="text-[var(--text-strong)]">
                          {formatPrice(preparedSummary.subtotal)}
                        </strong>{" "}
                        via {preparedSummary.customer.paymentPreference} at the
                        counter. The {siteConfig.operations.takeoutFee} is not
                        included in that amount; the shop confirms it when you
                        order.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                      <li>
                        Send your order summary to one of the riders above on
                        Facebook.
                      </li>
                      <li>
                        The rider orders it at Brew ni Cat,{" "}
                        <strong className="text-[var(--text-strong)]">
                          {siteConfig.address.street},{" "}
                          {siteConfig.address.locality}
                        </strong>{" "}
                        ({siteConfig.address.landmark}), and picks it up.
                      </li>
                      <li>
                        The rider delivers it to{" "}
                        <strong className="text-[var(--text-strong)]">
                          {preparedSummary.customer.address?.trim() ||
                            "your address"}
                        </strong>
                        . Delivery fee and payment are agreed with the rider;
                        the {siteConfig.operations.takeoutFee} is not included
                        in the{" "}
                        <strong className="text-[var(--text-strong)]">
                          {formatPrice(preparedSummary.subtotal)}
                        </strong>{" "}
                        subtotal.
                      </li>
                    </ol>
                  )}

                  <p className="border-t border-[var(--border-strong)]/40 pt-3 text-xs text-[var(--text-subtle)]">
                    {siteConfig.operations.hoursNotice}
                  </p>
                </div>

                {/* CTAs */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/menu"
                    className="button-primary"
                    onClick={() => {
                      clearStoredSummary();
                      clearCart({ undoable: false });
                    }}
                  >
                    Start a new order
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
