import type { Metadata } from "next";

import { GamesView } from "@/components/games/games-view";

export const metadata: Metadata = {
  title: "Cat games",
  description:
    "Play short games with the Brew ni Cat café cats to earn loyalty points.",
};

export default function GamesPage() {
  return <GamesView />;
}
