import type { Metadata } from "next";

import { MenuCatalog } from "@/components/menu/menu-catalog";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";

export const metadata: Metadata = {
  title: "Current Menu",
  description:
    "Browse the current Brew ni Cat Coffee Shop menu, including available drinks, snacks, noodles, and combos.",
};

export default function MenuPage() {
  return (
    <>
      <PageIntro
        eyebrow="Current catalog"
        title="Menu"
        description={
          <p>
            Browse Brew ni Cat’s current categories, choices, sizes, flavors,
            and prices. Availability may change at the shop.
          </p>
        }
        aside={
          <div className="max-w-sm rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-sm leading-6 text-[var(--notice-text)]">
            <strong className="block">Online Order Drafts</strong>
            Select items to build your order cart for pickup or
            customer-arranged rider delivery. Finalize details at checkout.
          </div>
        }
      />
      <section
        className="py-12 sm:py-16 lg:py-20"
        aria-label="Current Brew ni Cat menu"
      >
        <Container>
          <MenuCatalog />
        </Container>
      </section>
    </>
  );
}
