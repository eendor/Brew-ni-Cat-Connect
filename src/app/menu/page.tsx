import type { Metadata } from "next";

import { MenuCatalog } from "@/components/menu/menu-catalog";
import { MenuHero } from "@/components/three/menu-hero";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Current Menu",
  description:
    "Browse the current Brew ni Cat Coffee Shop menu, including available drinks, snacks, noodles, and combos.",
};

export default function MenuPage() {
  return (
    <>
      <MenuHero />
      <section
        id="menu-catalog"
        className="menu-catalog-section scroll-mt-20 pt-10 pb-12 sm:pb-16 lg:pb-20"
        aria-label="Current Brew ni Cat menu"
      >
        <Container>
          <div className="mb-8 max-w-2xl rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 text-sm leading-6 text-[var(--notice-text)]">
            <strong className="block">Online Order Drafts</strong>
            Select items to build an order summary for pickup or external rider
            delivery. Review your items and copy the order summary at checkout
            to message or call the shop.
          </div>
          <MenuCatalog />
        </Container>
      </section>
    </>
  );
}
