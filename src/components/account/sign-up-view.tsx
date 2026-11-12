"use client";

import { GoogleAuthView } from "@/components/account/sign-in-view";

/** Creating an account is the same Google sign-in (ADR-030). */
export function SignUpView() {
  return <GoogleAuthView mode="sign-up" />;
}
