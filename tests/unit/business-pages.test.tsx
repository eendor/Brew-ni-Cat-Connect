import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AboutPage from "@/app/about/page";
import ContactPage from "@/app/contact/page";
import GalleryPage from "@/app/gallery/page";
import { fallbackShop } from "@/lib/site-content/fallback-shop";
import { emailHref, phoneHref } from "@/lib/site-content/format";
import type { SiteContent } from "@/lib/site-content/types";

// Pages read the saved content and the live menu; these stand-ins let a test
// change either one. Without a change the page shows the fallback copy.
const live = vi.hoisted(() => ({
  content: null as SiteContent | null,
  takeoutBoxPrice: 10 as number | null,
}));

vi.mock("@/lib/site-content/load", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/site-content/load")>();
  return {
    ...actual,
    getSiteContent: async () => live.content ?? actual.fallbackSiteContent,
  };
});

vi.mock("@/lib/menu/load-menu-facts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/menu/load-menu-facts")>();
  return {
    ...actual,
    getMenuFacts: async () => ({
      ...(await actual.loadMenuFacts(async () => null)),
      takeoutBoxPrice: live.takeoutBoxPrice,
    }),
  };
});

afterEach(() => {
  live.content = null;
  live.takeoutBoxPrice = 10;
});

/** Matches text that contains `text` as written. */
const containing = (text: string) =>
  new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

describe("About page", () => {
  it("TC-P2-015 — renders the restrained, confirmed Brew ni Cat business facts", async () => {
    const { container } = render(await AboutPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "About Brew ni Cat" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("June 12, 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kabacan, Cotabato/).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Drinks, snacks, noodles, and combos"),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /award-winning|best coffee|founder said/i,
    );
  });
});

describe("Contact and location page", () => {
  it("TC-P2-016 — renders confirmed contact, location, payment, takeout, and variable-hours information", async () => {
    render(await ContactPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Contact & location" }),
    ).toBeInTheDocument();
    const address = document.querySelector("address");
    expect(address).toHaveTextContent("Abellera St, Poblacion");
    expect(address).toHaveTextContent("Kabacan, Cotabato 9407");
    expect(address).toHaveTextContent("Philippines");
    expect(address).toHaveTextContent("Beside Pulido Eatery");

    const { phone, email } = fallbackShop.contact;
    expect(
      screen.getByRole("link", { name: containing(phone) }),
    ).toHaveAttribute("href", phoneHref(phone));
    expect(
      screen.getByRole("link", { name: containing(email) }),
    ).toHaveAttribute("href", emailHref(email));
    expect(screen.getByText("Cash · GCash")).toBeInTheDocument();
    expect(screen.getByText("₱10 takeout box")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Closed every Saturday/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/11 AM – 9 PM/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 PM – 9 PM on Sunday/).length).toBeGreaterThan(
      0,
    );
    // the old Monday to Saturday hours are gone
    expect(screen.queryByText(/10 PM|Closed every Sunday/i)).toBeNull();
  });

  it("TC-P2-017 — explains rider delivery and lists the local riders without promising fees or ETA", async () => {
    const { container } = render(await ContactPage());

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Let a local rider order it for you.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Message a rider")).toBeInTheDocument();
    expect(screen.getByText("2. The rider orders")).toBeInTheDocument();
    expect(screen.getByText("3. Delivered to you")).toBeInTheDocument();
    expect(container).toHaveTextContent(
      "Delivery fee, timing and payment are agreed with your rider. Brew ni Cat doesn't book riders or charge rider fees",
    );
    expect(container.textContent).not.toMatch(
      /minutes|free delivery|guaranteed|delivery fee: ₱/i,
    );

    const riderList = screen.getByRole("list", {
      name: "Rider delivery services",
    });
    expect(within(riderList).getAllByRole("link")).toHaveLength(
      fallbackShop.riders.partners.length,
    );
  });

  it("TC-P4-031 — keeps the contact page's link and label names, with decorative icons", async () => {
    const { container } = render(await ContactPage());

    expect(
      screen.getByRole("link", { name: "Get directions" }),
    ).toHaveAttribute("href", fallbackShop.address.mapUrl);
    // the schedule note under the hours is the owner's saved text
    expect(screen.getByText(fallbackShop.hours.note)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook page" })).toHaveAttribute(
      "href",
      fallbackShop.social.facebook,
    );
    expect(
      screen.getByRole("link", { name: "Facebook photos" }),
    ).toHaveAttribute("href", fallbackShop.social.facebookPhotos);
    expect(screen.getByRole("link", { name: "TikTok" })).toHaveAttribute(
      "href",
      fallbackShop.social.tiktok,
    );
    expect(screen.getByText("Payment methods")).toBeInTheDocument();
    expect(screen.getByText("Takeout packaging")).toBeInTheDocument();

    // 13 page icons plus a Facebook mark on each rider card; the rider
    // cards' arrows are older and hidden the same way
    expect(container.querySelectorAll('svg[focusable="false"]')).toHaveLength(
      13 + fallbackShop.riders.partners.length,
    );
    container.querySelectorAll("svg").forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("Gallery page", () => {
  it("TC-P2-018 — renders a curated approved-photo selection with generic alt text", async () => {
    render(await GalleryPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Gallery" }),
    ).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(12);
    expect(images.length).toBeLessThanOrEqual(60);
    for (const image of images) {
      expect(image).toHaveAccessibleName();
      expect(decodeURIComponent(image.getAttribute("src") ?? "")).toContain(
        "/images/shop/",
      );
    }

    expect(
      screen.getByRole("img", {
        name: "Customers gathered around drinks and snacks inside Brew ni Cat",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Siamese cat sitting on wooden cat furniture inside the shop",
      }),
    ).toBeInTheDocument();
  });
});

describe("Saved content on the pages (FR-085, FR-086)", () => {
  it("TC-P4-215 — the About and Contact pages show what the owner saved, with no code change", async () => {
    const saved = (await import("@/lib/site-content/load")).fallbackSiteContent;
    live.content = {
      ...saved,
      hours: {
        days: {
          ...saved.hours.days,
          saturday: { opens: "08:00", closes: "12:00" },
        },
        note: "Holiday hours are posted on Facebook.",
      },
      contact: { phone: "+63 900 000 0000", email: "hello@example.com" },
      address: { ...saved.address, street: "Rizal St", landmark: "" },
      payments: { methods: ["Cash", "GCash", "Maya"], qrCode: null },
      social: { ...saved.social, tiktok: "" },
      riders: { partners: [] },
      about: {
        ...saved.about,
        openedOn: "2026-07-01",
        menuSummary: "Coffee, matcha and snacks",
      },
    };
    live.takeoutBoxPrice = 15;

    const contact = render(await ContactPage());
    const address = document.querySelector("address");
    expect(address).toHaveTextContent("Rizal St");
    expect(address).not.toHaveTextContent("Beside");
    expect(
      screen.getByRole("link", { name: /\+63 900 000 0000/ }),
    ).toHaveAttribute("href", "tel:+639000000000");
    expect(screen.getByText("Cash · GCash · Maya")).toBeInTheDocument();
    expect(screen.getByText("₱15 takeout box")).toBeInTheDocument();
    expect(
      screen.getAllByText(/8 AM – 12 PM on Saturday/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Holiday hours are posted on Facebook."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Closed every Saturday/i)).toBeNull();
    expect(screen.queryByRole("link", { name: "TikTok" })).toBeNull();
    expect(
      screen.queryByRole("list", { name: "Rider delivery services" }),
    ).toBeNull();
    contact.unmount();

    render(await AboutPage());
    expect(screen.getAllByText("July 1, 2026").length).toBeGreaterThan(0);
    expect(screen.getByText("Coffee, matcha and snacks")).toBeInTheDocument();
  });

  it("TC-P4-216 — while the menu can't be read, the contact page names the takeout box without a price", async () => {
    live.takeoutBoxPrice = null;
    const { container } = render(await ContactPage());
    expect(screen.getByText("Takeout box")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/₱\d+ takeout box/);
  });
});
