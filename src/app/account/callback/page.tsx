import type { Metadata } from "next";

import { AuthCallbackView } from "@/components/account/auth-callback-view";

export const metadata: Metadata = {
  title: "Signing In",
  description: "Finishing your Brew ni Cat sign-in with Google.",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return <AuthCallbackView />;
}
