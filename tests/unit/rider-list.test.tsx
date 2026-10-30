import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiderList } from "@/components/ui/rider-list";
import { fallbackShop } from "@/lib/site-content/fallback-shop";

const partners = fallbackShop.riders.partners;

describe("Rider list", () => {
  it("TC-P4-029 — links each local rider's Facebook page with its logo", () => {
    const { container } = render(<RiderList partners={partners} />);

    const list = screen.getByRole("list", { name: "Rider delivery services" });
    const links = within(list).getAllByRole("link");
    expect(partners).toHaveLength(3);
    expect(links).toHaveLength(partners.length);

    partners.forEach((rider, index) => {
      const link = links[index];
      expect(link).toHaveAccessibleName(`${rider.name} Facebook page`);
      expect(link).toHaveAttribute("href", rider.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(rider.href).toMatch(/^https:\/\/www\.facebook\.com\//);
    });

    // the logos are decorative: the rider's name already labels each link
    const logos = container.querySelectorAll("img");
    expect(logos).toHaveLength(partners.length);
    partners.forEach((rider, index) => {
      const logo = logos[index];
      expect(logo).toHaveAttribute("alt", "");
      expect(decodeURIComponent(logo?.getAttribute("src") ?? "")).toContain(
        rider.logo,
      );
    });
  });

  it("TC-P4-213 — shows the riders the owner saved, and nothing when the list is empty", () => {
    const { rerender } = render(
      <RiderList
        partners={[
          {
            name: "Town Riders",
            href: "https://www.facebook.com/townriders",
            logo: "/images/riders/town-riders.jpg",
          },
        ]}
      />,
    );
    const links = within(
      screen.getByRole("list", { name: "Rider delivery services" }),
    ).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Town Riders Facebook page");

    rerender(<RiderList partners={[]} />);
    expect(
      screen.queryByRole("list", { name: "Rider delivery services" }),
    ).toBeNull();
  });

  it("TC-P4-034 — the Facebook mark and the arrow on each rider card are decorative", () => {
    render(<RiderList partners={partners} />);

    const links = within(
      screen.getByRole("list", { name: "Rider delivery services" }),
    ).getAllByRole("link");
    expect(links).toHaveLength(partners.length);

    links.forEach((link, index) => {
      expect(link).toHaveAccessibleName(
        `${partners[index]?.name} Facebook page`,
      );
      const icons = link.querySelectorAll("svg");
      expect(icons).toHaveLength(2);
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      });
      // the mark comes first and fills with the label's amber
      expect(icons[0]).toHaveAttribute("fill", "currentColor");
      expect(icons[0]).toHaveAttribute("focusable", "false");
    });
  });
});
