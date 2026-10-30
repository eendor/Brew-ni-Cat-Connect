import { siteConfig } from "@/config/site";
import {
  closedDays,
  daysLabel,
  formatRange,
  joinList,
  landmarkName,
  openRuns,
} from "@/lib/site-content/format";
import type { AddressContent, HoursContent } from "@/lib/site-content/types";

import type { VisitFacts } from "./scenes/visit";

/**
 * Text painted on the 3D sign and street model, from the saved hours and
 * address. The big line is the hours most days share; days with their own
 * hours go on the small line under it.
 */
export function visitFacts(
  hours: HoursContent,
  address: AddressContent,
): VisitFacts {
  const runs = openRuns(hours);
  const main = runs.reduce<(typeof runs)[number] | undefined>(
    (best, run) => (!best || run.days.length > best.days.length ? run : best),
    undefined,
  );
  const others = runs.filter((run) => run !== main);
  const style = others.length > 1 ? "short" : "long";

  return {
    hours: main ? formatRange(main.hours) : "",
    days: main ? daysLabel(main.days, "long") : "",
    others: others
      .map((run) => `${daysLabel(run.days, style)} ${formatRange(run.hours)}`)
      .join(" · "),
    closedDay: joinList(closedDays(hours)),
    shopSign: siteConfig.shortName,
    neighborSign: landmarkName(address),
    street: address.street,
  };
}
