import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unit tests never call the live menu service. If the shell has the public
// Supabase settings exported (for a local build, say), components that load
// the menu by default would fetch it mid-test and drop the test cart's items.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  cleanup();
});
