import type { Metadata } from "next";

import { ProfileView } from "@/components/account/profile-view";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and update your Brew ni Cat customer profile.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
