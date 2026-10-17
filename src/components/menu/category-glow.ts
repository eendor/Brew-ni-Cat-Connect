/**
 * Colour pairs for menu categories, taken from the Night Shift Glow item
 * colours (drinks green and amber, bites orange and yellow, buldak pink and
 * cyan, …). The catalog uses them for each category's index number and the
 * rule under its heading; cards stay neutral.
 */
export type GlowPair = Readonly<{ a: string; b: string }>;

export const DRINKS_GLOW: GlowPair = { a: "#7CFF6B", b: "#FFB547" };
const BITES: GlowPair = { a: "#FF6A3D", b: "#FFD93B" };
const BULDAK: GlowPair = { a: "#FF3D7F", b: "#5EE1FF" };
const COMBOS: GlowPair = { a: "#FFB547", b: "#FF6A3D" };
const TAKEOUT: GlowPair = { a: "#FFD93B", b: "#FFB547" };
const TREATS: GlowPair = { a: "#5EE1FF", b: "#7CFF6B" };

export function glowForCategory(name: string): GlowPair {
  const n = name.toLowerCase();
  if (/drink|coffee|latte|tea|soda|frapp/.test(n)) return DRINKS_GLOW;
  if (/bite|snack|fries|takoyaki|nacho/.test(n)) return BITES;
  if (/buldak|sedaap|noodle|ramen/.test(n)) return BULDAK;
  if (/combo|package|bundle/.test(n)) return COMBOS;
  if (/take-?out|box/.test(n)) return TAKEOUT;
  if (/treat/.test(n)) return TREATS;
  return DRINKS_GLOW;
}
