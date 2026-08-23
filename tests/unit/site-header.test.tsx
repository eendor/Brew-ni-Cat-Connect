import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteHeader } from "@/components/layout/site-header";

describe("SiteHeader", () => {
  it("TC-P1-001 — renders the brand and primary desktop navigation", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: /Brew ni Cat/ })).toHaveAttribute(
      "href",
      "/",
    );

    const navigation = screen.getByRole("navigation", {
      name: "Desktop navigation",
    });

    for (const linkName of ["Home", "Menu", "About", "Gallery", "Contact"]) {
      expect(
        within(navigation).getByRole("link", { name: linkName }),
      ).toBeInTheDocument();
    }
  });

  it("TC-P1-003 — opens the mobile navigation and closes it after a link is selected", async () => {
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
    const menuLink = within(navigation).getByRole("link", { name: "Menu" });
    expect(menuLink).toHaveAttribute("href", "/menu");
    menuLink.addEventListener("click", (event) => event.preventDefault());

    await user.click(menuLink);

    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-P1-004 — closes the mobile navigation with Escape and returns focus to the trigger", async () => {
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
});
