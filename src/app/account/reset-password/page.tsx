import type { Metadata } from "next";

import { ResetPasswordView } from "@/components/account/reset-password-view";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set a new password for your Brew ni Cat account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
