import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

describe("SiteHeader", () => {
  it("TC-P1-001 / TC-P2-004 — renders one desktop Menu action and a distinct visit CTA", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "Brew ni Cat Coffee Shop home" }),
    ).toHaveAttribute("href", "/");

    const navigation = screen.getByRole("navigation", {
      name: "Desktop navigation",
    });

    for (const linkName of ["Home", "Menu", "About", "Gallery", "Contact"]) {
      expect(
        within(navigation).getByRole("link", { name: linkName }),
      ).toBeInTheDocument();
    }

    const desktopMenuLinks = within(navigation)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/menu");
    expect(desktopMenuLinks).toHaveLength(1);
    expect(
      screen.queryByRole("link", { name: "View menu" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visit us" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("TC-P1-003 / TC-P2-005 — opens mobile navigation and closes it after a link is selected", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const openButton = screen.getByRole("button", { name: "Open navigation" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(openButton).toHaveAttribute("aria-controls", "mobile-navigation");
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();

    await user.click(openButton);

    const closeButton = screen.getByRole("button", {
      name: "Close navigation",
    });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");

    const navigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    const menuLinks = within(navigation)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/menu");
    expect(menuLinks).toHaveLength(1);
    menuLinks[0]?.addEventListener("click", (event) => event.preventDefault());

    await user.click(menuLinks[0]!);

    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-P1-004 / TC-P2-006 — closes mobile navigation with Escape and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    const openButton = screen.getByRole("button", { name: "Open navigation" });
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it("TC-P4-033 — the mobile menu links Facebook and TikTok with named round buttons", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const navigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });

    const facebook = within(navigation).getByRole("link", {
      name: "Brew ni Cat on Facebook",
    });
    const tiktok = within(navigation).getByRole("link", {
      name: "Brew ni Cat on TikTok",
    });
    expect(facebook).toHaveAttribute("href", siteConfig.social.facebook);
    expect(tiktok).toHaveAttribute("href", siteConfig.social.tiktok);
    for (const link of [facebook, tiktok]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    // still one link per page; the two social links are the only extras
    expect(within(navigation).getAllByRole("link")).toHaveLength(
      siteConfig.navigation.length + 2,
    );

    // the address and hours icons and the brand marks are decorative
    const icons = navigation.querySelectorAll("svg");
    expect(icons).toHaveLength(4);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    });

    // the page opens in a new tab, so the menu stays where it was
    facebook.addEventListener("click", (event) => event.preventDefault());
    await user.click(facebook);
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();
  });
});
