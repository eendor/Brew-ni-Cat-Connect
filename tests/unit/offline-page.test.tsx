import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import OfflinePage from "@/app/offline/page";

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("TC-P8-009 — Try again reloads the page", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    const user = userEvent.setup();
    render(<OfflinePage />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("TC-P8-010 — offers a link back to the home page", () => {
    render(<OfflinePage />);

    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
