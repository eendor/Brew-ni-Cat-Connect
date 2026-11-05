import { Suspense, type ReactNode } from "react";

import { AccountGuard } from "@/components/account/account-guard";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AccountGuard>{children}</AccountGuard>
    </Suspense>
  );
}
