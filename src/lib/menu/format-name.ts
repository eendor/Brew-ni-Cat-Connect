/**
 * Menu option names arrive joined with "+" and no spaces
 * ("Nachos+Fries+Meat"), which reads poorly and can't wrap in a narrow
 * button. They are shown with a space either side of each plus:
 * "Nachos + Fries + Meat".
 */
export function formatOptionName(name: string): string {
  return name
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
