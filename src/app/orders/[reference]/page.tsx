"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/menu/format-price";
import { fetchOrder } from "@/lib/orders/fetch-order";
import { readTrackingTokenFromHash } from "@/lib/orders/order-link";
import { isOrderReference, OrderView } from "@/lib/orders/types";

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "success"; order: OrderView };

export default function OrderConfirmationPage() {
  const params = useParams();
  const referenceParam =
    typeof params.reference === "string" ? params.reference : "";
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    async function loadOrder() {
      if (!isOrderReference(referenceParam)) {
        setState({ status: "not-found" });
        return;
      }

      const token = readTrackingTokenFromHash(window.location.hash);
      if (!token) {
        setState({ status: "not-found" });
        return;
      }

      try {
        const orderData = await fetchOrder(referenceParam, token);
        if (!orderData) {
          setState({ status: "not-found" });
          return;
        }

        setState({ status: "success", order: orderData });
      } catch {
        setState({
          status: "error",
          message: "Failed to load order confirmation. Please try again later.",
        });
      }
    }

    loadOrder();
  }, [referenceParam]);

  if (state.status === "loading") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto" />
          <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-xl mt-6" />
        </div>
        <p className="mt-4 text-sm text-zinc-400">Loading order details...</p>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">
            Order Not Found
          </h1>
          <p className="mt-3 text-zinc-400 text-sm">
            We couldn’t find an order matching this reference or tracking link.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-red-500 uppercase tracking-wide">
            Something Went Wrong
          </h1>
          <p className="mt-3 text-zinc-400 text-sm">{state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-emerald-500 text-black font-semibold rounded-full hover:bg-emerald-400 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { order } = state;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="border-b border-zinc-800 pb-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">
              Order Placed
            </h1>
            <p className="text-sm text-zinc-400 mt-1 font-mono">
              Reference:{" "}
              <span className="text-emerald-400 font-semibold">
                {order.reference}
              </span>
            </p>
          </div>
          <span className="self-start sm:self-auto uppercase text-xs font-bold px-4 py-1.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 tracking-wider">
            {order.status}
          </span>
        </div>
      </header>

      <section className="space-y-6">
        {/* Renier's live order tracker goes here in week 2. */}

        {/* Customer Details Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">
            Customer Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 text-xs uppercase font-medium">
                Name
              </p>
              <p className="text-white font-medium mt-0.5">
                {order.customerName}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-medium">
                Payment
              </p>
              <p className="text-white font-medium mt-0.5">
                {order.paymentPreference}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-medium">
                Fulfillment
              </p>
              <p className="text-white font-medium capitalize mt-0.5">
                {order.fulfillment}
              </p>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <p className="text-zinc-500 text-xs uppercase font-medium">
                Notes
              </p>
              <p className="text-zinc-300 text-sm mt-0.5">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">
            Items Summary
          </h2>
          <ul className="divide-y divide-zinc-800">
            {order.items.map((item, index) => (
              <li
                key={index}
                className="py-4 flex justify-between items-center text-sm"
              >
                <div>
                  <p className="font-semibold text-white text-base">
                    {item.itemName}
                  </p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {item.variantName} {item.flavor ? `• ${item.flavor}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-base">
                    {formatPrice(item.lineTotal)}
                  </p>
                  <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center text-xl font-bold border-t border-zinc-800 pt-5 mt-2">
            <span className="text-white uppercase text-sm tracking-wider">
              Subtotal
            </span>
            <span className="text-white">{formatPrice(order.subtotal)}</span>
          </div>
        </div>

        {/* Next steps (FR-026), from the shop facts the checkout uses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">
            Next Steps
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>Bookmark this page to check your order later.</li>
            <li>
              When your order is ready, pick it up at Brew ni Cat,{" "}
              {siteConfig.address.street}, {siteConfig.address.locality} (
              {siteConfig.address.landmark}).
            </li>
            <li>
              Pay {formatPrice(order.subtotal)} via {order.paymentPreference} at
              the counter. The {siteConfig.operations.takeoutFee} is not
              included in that amount.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
