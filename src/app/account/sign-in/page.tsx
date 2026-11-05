import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInView } from "@/components/account/sign-in-view";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Brew ni Cat customer account.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInView />
    </Suspense>
  );
}
