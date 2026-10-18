import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiderList } from "@/components/ui/rider-list";
import { siteConfig } from "@/config/site";

describe("Rider list", () => {
  it("TC-P4-029 — links each local rider's Facebook page with its logo", () => {
    const { container } = render(<RiderList />);

    const list = screen.getByRole("list", { name: "Rider delivery services" });
    const links = within(list).getAllByRole("link");
    expect(siteConfig.externalRiders).toHaveLength(3);
    expect(links).toHaveLength(siteConfig.externalRiders.length);

    siteConfig.externalRiders.forEach((rider, index) => {
      const link = links[index];
      expect(link).toHaveAccessibleName(`${rider.name} Facebook page`);
      expect(link).toHaveAttribute("href", rider.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(rider.href).toMatch(/^https:\/\/www\.facebook\.com\//);
    });

    // the logos are decorative: the rider's name already labels each link
    const logos = container.querySelectorAll("img");
    expect(logos).toHaveLength(siteConfig.externalRiders.length);
    siteConfig.externalRiders.forEach((rider, index) => {
      const logo = logos[index];
      expect(logo).toHaveAttribute("alt", "");
      expect(decodeURIComponent(logo?.getAttribute("src") ?? "")).toContain(
        rider.logo,
      );
    });
  });
});
