import type { Metadata } from "next";

import { ForgotPasswordView } from "@/components/account/forgot-password-view";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Brew ni Cat account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
