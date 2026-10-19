import { siteConfig } from "@/config/site";

import type { VisitFacts } from "./scenes/visit";

/**
 * Text painted on the 3D sign and street model. Hours and days restate
 * `siteConfig.operations.hoursNotice`; the neighbor sign is the confirmed
 * landmark ("Beside Pulido Eatery").
 */
export const visitFacts: VisitFacts = {
  hours: "11 AM – 10 PM",
  days: "Monday to Saturday",
  closedDay: siteConfig.operations.closedDays,
  shopSign: siteConfig.shortName,
  neighborSign: siteConfig.address.landmark.replace(/^Beside\s+/i, ""),
  street: siteConfig.address.street.split(",")[0] ?? "Abellera St",
};
