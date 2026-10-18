import { render, screen, within } from "@testing-library/react";

import AboutPage from "@/app/about/page";
import ContactPage from "@/app/contact/page";
import GalleryPage from "@/app/gallery/page";
import { siteConfig } from "@/config/site";

describe("About page", () => {
  it("TC-P2-015 — renders the restrained, confirmed Brew ni Cat business facts", () => {
    const { container } = render(<AboutPage />);

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
  it("TC-P2-016 — renders confirmed contact, location, payment, takeout, and variable-hours information", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Contact & location" }),
    ).toBeInTheDocument();
    const address = document.querySelector("address");
    expect(address).toHaveTextContent("Segundo St, Poblacion");
    expect(address).toHaveTextContent("Kabacan, Cotabato 9407");
    expect(address).toHaveTextContent("Philippines");
    expect(address).toHaveTextContent("Beside Pulido Eatery");

    expect(screen.getByRole("link", { name: /0976 630 4785/ })).toHaveAttribute(
      "href",
      "tel:+639766304785",
    );
    expect(
      screen.getByRole("link", { name: /popotpulido06@gmail.com/ }),
    ).toHaveAttribute("href", "mailto:popotpulido06@gmail.com");
    expect(screen.getByText("Cash · GCash")).toBeInTheDocument();
    expect(screen.getByText("₱10 takeout box")).toBeInTheDocument();
    expect(screen.getAllByText(/Closed every Sunday/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/11 AM – 10 PM/).length).toBeGreaterThan(0);
  });

  it("TC-P2-017 — explains rider delivery and lists the local riders without promising fees or ETA", () => {
    const { container } = render(<ContactPage />);

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
      siteConfig.externalRiders.length,
    );
  });
});

describe("Gallery page", () => {
  it("TC-P2-018 — renders a curated approved-photo selection with generic alt text", () => {
    render(<GalleryPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Gallery" }),
    ).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(12);
    expect(images.length).toBeLessThanOrEqual(36);
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
