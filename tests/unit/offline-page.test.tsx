import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflinePage from "@/app/offline/page";

describe("Offline page", () => {
  it("TC-P8-008 — tells the customer they are offline and asks them to check the connection", () => {
    render(<OfflinePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "You're offline" }),
    ).toBeVisible();
    expect(
      screen.getByText("Check your internet connection, then try again."),
    ).toBeVisible();
  });

  it("TC-P8-009 — Try again reloads the page with a plain form submit", () => {
    render(<OfflinePage />);

    const button = screen.getByRole("button", { name: "Try again" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).toHaveAttribute("method", "get");
  });

  it("TC-P8-010 — offers a link back to the home page", () => {
    render(<OfflinePage />);

    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
