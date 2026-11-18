import { loadFont as loadBigShoulders } from "@remotion/google-fonts/BigShoulders";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Same faces as the website: Big Shoulders for signs, Inter for everything else.
export const display = loadBigShoulders("normal", {
  weights: ["800", "900"],
  subsets: ["latin"],
}).fontFamily;
export const body = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

// Colours from DESIGN.md ("Daylight Glass").
export const c = {
  canvas: "#f6eee1",
  warm: "#ecdfcb",
  strong: "#1d2a21",
  muted: "#4b5a4f",
  action: "#1f6b45",
  actionDeep: "#123f29",
  actionBright: "#2a8156",
  mint: "#7dcfa0",
  accent: "#9e451e",
  peach: "#e9a06e",
  footer: "#183a2a",
  cream: "#f6eee1",
  white: "#ffffff",
};

export const SITE = "brew-ni-cat-connect.vercel.app";
