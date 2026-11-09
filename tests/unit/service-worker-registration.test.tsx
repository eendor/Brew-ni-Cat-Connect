import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

function stubServiceWorker() {
  const register = vi.fn().mockResolvedValue({});
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
  return register;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Service worker registration", () => {
  it("TC-P8-011 — registers /sw.js in production after the page loads", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = stubServiceWorker();
    const readyState = vi
      .spyOn(document, "readyState", "get")
      .mockReturnValue("loading");
    render(<ServiceWorkerRegistration />);

    window.dispatchEvent(new Event("load"));

    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));
    expect(readyState).toHaveBeenCalled();
  });

  it("TC-P8-012 — never registers in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const register = stubServiceWorker();
    render(<ServiceWorkerRegistration />);

    window.dispatchEvent(new Event("load"));

    expect(register).not.toHaveBeenCalled();
  });
});
