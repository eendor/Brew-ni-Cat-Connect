import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstallAppButton } from "@/components/pwa/install-app-button";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function fireBeforeInstallPrompt() {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(event, "prompt", { value: prompt });
  Object.defineProperty(event, "userChoice", {
    value: Promise.resolve({ outcome: "accepted", platform: "web" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}

describe("Install app button", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: false,
    });
  });

  it("TC-P8-003 — renders nothing when the browser never offers install", () => {
    render(<InstallAppButton />);

    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("TC-P8-004 — shows the button after beforeinstallprompt and cancels the browser prompt", () => {
    render(<InstallAppButton />);
    const { event } = fireBeforeInstallPrompt();

    expect(screen.getByRole("button", { name: "Install app" })).toBeVisible();
    expect(event.defaultPrevented).toBe(true);
  });

  it("TC-P8-005 — asks the browser to install, then hides after the customer chooses", async () => {
    const user = userEvent.setup();
    render(<InstallAppButton />);
    const { prompt } = fireBeforeInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Install app" }));

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Install app" })).toBeNull(),
    );
  });

  it("TC-P8-006 — hides the button after the app is installed", () => {
    render(<InstallAppButton />);
    fireBeforeInstallPrompt();
    expect(screen.getByRole("button", { name: "Install app" })).toBeVisible();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("TC-P8-007 — renders nothing when the app already runs installed", () => {
    stubMatchMedia(true);
    const { unmount } = render(<InstallAppButton />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
    unmount();

    stubMatchMedia(false);
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
    render(<InstallAppButton />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });
});
