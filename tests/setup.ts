import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unit tests never call the live menu service. If the shell has the public
// Supabase settings exported (for a local build, say), components that load
// the menu by default would fetch it mid-test and drop the test cart's items.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Place order is off unless a test turns it on.
delete process.env.NEXT_PUBLIC_ONLINE_ORDERING;

// Node 25 and later have their own localStorage, which is empty without a
// --localstorage-file and hides jsdom's. The project runs on Node 24 (.nvmrc,
// CI), but put jsdom's storage back so the tests also run on newer Node.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom) {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    if (!Reflect.get(globalThis, name)) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: dom.window[name],
      });
    }
  }
}

afterEach(() => {
  cleanup();
});
