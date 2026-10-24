import { siteConfig } from "@/config/site";

import type { VisitFacts } from "./scenes/visit";

/**
 * Text painted on the 3D sign and street model. The hours restate
 * `siteConfig.operations.hoursNotice`: weekdays, then Sunday's shorter
 * hours. The neighbor sign is the confirmed landmark ("Beside Pulido
 * Eatery").
 */
export const visitFacts: VisitFacts = {
  hours: "11 AM – 9 PM",
  days: "Monday to Friday",
  otherDay: "Sunday",
  otherHours: "1 PM – 9 PM",
  closedDay: siteConfig.operations.closedDays,
  shopSign: siteConfig.shortName,
  neighborSign: siteConfig.address.landmark.replace(/^Beside\s+/i, ""),
  street: siteConfig.address.street.split(",")[0] ?? "Abellera St",
};
