import { render, screen, within } from "@testing-library/react";

import AboutPage from "@/app/about/page";
import ContactPage from "@/app/contact/page";
import GalleryPage from "@/app/gallery/page";

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
    expect(screen.getByText(/Operating hours may vary/i)).toBeInTheDocument();
  });

  it("TC-P2-017 — explains the independent rider workflow without promising fees or ETA", () => {
    const { container } = render(<ContactPage />);

    expect(screen.getByText("1. Arrange your order")).toBeInTheDocument();
    expect(screen.getByText("2. Book a rider")).toBeInTheDocument();
    expect(screen.getByText("3. Rider pickup")).toBeInTheDocument();
    expect(container).toHaveTextContent(
      "Rider availability, delivery fees, arrival time, and rider payment are separate from Brew ni Cat.",
    );

    const riderLinks = screen.getByLabelText("External rider pages");
    expect(within(riderLinks).getAllByRole("link")).toHaveLength(3);
    for (const link of within(riderLinks).getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
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
    expect(images.length).toBeLessThanOrEqual(24);
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
