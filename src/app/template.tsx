import type { ReactNode } from "react";

/** Re-mounts per route so each navigation gets a soft fade/rise entrance. */
export default function Template({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div className="page-transition">{children}</div>;
}
