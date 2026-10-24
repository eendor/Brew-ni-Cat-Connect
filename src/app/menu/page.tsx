import type { Metadata } from "next";
import { MenuCartBar } from "@/components/cart/menu-cart-bar";
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
        className="menu-catalog-section scroll-mt-20 pt-10 pb-24 lg:pb-20"
        aria-label="Current Brew ni Cat menu"
      >
        <Container>
          <p
            className="mb-8 max-w-2xl text-sm leading-6 text-[var(--text-muted)]"
            data-rise=""
          >
            <strong className="text-[var(--text-strong)]">
              How ordering works:
            </strong>{" "}
            add items to build an order summary, then copy it at checkout and
            send it to the shop for pickup, or to a local rider who orders and
            delivers it for you.
          </p>
          <MenuCatalog />
        </Container>
      </section>

      <MenuCartBar />
    </>
  );
}