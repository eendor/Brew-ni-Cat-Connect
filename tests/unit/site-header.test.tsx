import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/context/auth-context";
import type { SupabaseClient, User } from "@supabase/supabase-js";

function createMockSupabase(user: User | null = null, signOutMock = vi.fn()) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user, access_token: "tok" } : null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: signOutMock.mockResolvedValue({ error: null }),
    },
  } as unknown as SupabaseClient;
}

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

    // five page links, the sign-in link, and the two social links
    expect(within(navigation).getAllByRole("link")).toHaveLength(
      siteConfig.navigation.length + 3,
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

  it("TC-P4-158 — displays Sign in link on desktop and mobile when signed out", async () => {
    const user = userEvent.setup();
    const client = createMockSupabase(null);

    render(
      <AuthProvider client={client}>
        <SiteHeader />
      </AuthProvider>,
    );

    // Desktop header has Sign in link
    const signInLinks = await screen.findAllByRole("link", {
      name: /sign in/i,
    });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute("href", "/account/sign-in");

    // Open mobile navigation and verify mobile Sign in link
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(mobileNav).getByRole("link", { name: /sign in/i }),
    ).toHaveAttribute("href", "/account/sign-in");
  });

  it("TC-P4-159 — displays Account menu with Sign out on desktop when signed in", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn();
    const mockUser: User = {
      id: "cust-1",
      email: "cust@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const client = createMockSupabase(mockUser, signOutMock);

    render(
      <AuthProvider client={client}>
        <SiteHeader />
      </AuthProvider>,
    );

    // Account menu button is present once session resolves
    const accountBtn = await screen.findByRole("button", {
      name: "Account menu",
    });
    expect(accountBtn).toHaveAttribute("aria-expanded", "false");

    // Should not display "Sign in" on desktop
    expect(
      screen.queryByRole("link", { name: /^sign in$/i }),
    ).not.toBeInTheDocument();

    // Click to open account menu
    await user.click(accountBtn);
    expect(accountBtn).toHaveAttribute("aria-expanded", "true");

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();

    await user.click(signOutBtn);
    expect(signOutMock).toHaveBeenCalled();
  });

  it("TC-P4-160 — displays Sign out in mobile navigation when signed in", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn();
    const mockUser: User = {
      id: "cust-2",
      email: "mobile@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const client = createMockSupabase(mockUser, signOutMock);

    render(
      <AuthProvider client={client}>
        <SiteHeader />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });

    const mobileSignOutBtn = within(mobileNav).getByRole("button", {
      name: /sign out/i,
    });
    expect(mobileSignOutBtn).toBeInTheDocument();

    await user.click(mobileSignOutBtn);
    expect(signOutMock).toHaveBeenCalled();
  });
});
