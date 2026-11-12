import type { Metadata } from "next";

import { SignUpView } from "@/components/account/sign-up-view";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Create a Brew ni Cat customer account with Google to manage your orders.",
};

export default function SignUpPage() {
  return <SignUpView />;
}
