import type { ReactNode } from "react";

import { AccountGuard } from "@/components/account/account-guard";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountGuard>{children}</AccountGuard>;
}
