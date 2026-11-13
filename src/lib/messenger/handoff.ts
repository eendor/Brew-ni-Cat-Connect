/**
 * Messages that only the shop's people should answer (added 2026-11-13).
 *
 * Read from the Page's chats since it opened on 2026-06-12: delivery riders
 * and partner shops sending a customer's order, suppliers offering ice or
 * other stock, people proposing a collab, a booth or an event, job seekers,
 * and customers asking about something they left behind. The assistant says
 * the staff will reply and leaves the message unread for them; it never
 * accepts or turns down an order or an offer on the shop's behalf. Offers
 * (ice and other supplies included) get no reply at all: the staff answer.
 */

export type HandoffTopic =
  "partner-order" | "bulk-order" | "offer" | "hiring" | "lost-item" | "concern";

/** Delivery services and partner shops that send orders for customers. */
const PARTNER_PATTERN =
  /\b(?:m\s?&\s?s|ozmo|gke|gutom\s?ka|gutomka\w*|papa'?s|momshies|rider|store\s?\/\s?restaurant|cs\b)/;
const ORDER_WORD_PATTERN = /\b(?:order|paorder|pa-order|mag-?order|orde)\b/;

const TOPIC_PATTERNS: readonly Readonly<[HandoffTopic, RegExp]>[] = [
  [
    "offer",
    /\b(?:o*ffer\w*|[mn]ag\s?o+ffer\w*|supplier|supply|distributor|collab\w*|partnership|sponsor\w*|consign\w*|proposal|coffee crawl|advertis\w*|promote)\b|\bice\s?(?:cubes?|order|supply|supplier)|\byelo\b/,
  ],
  [
    "bulk-order",
    /\b(?:catering|bulk|party|birthday|event|reserv\w*|pa-?reserve|wholesale order)\b/,
  ],
  [
    "hiring",
    /\b(?:hiring|hire|apply|applicant|application|resume|biodata|part[\s-]?timers?|vacan\w*|tindira)\b/,
  ],
  ["lost-item", /\b(?:naiwan\w*|nawala\w*|lost|left (?:my|our))\b/],
  ["concern", /\b(?:refund|complain\w*|reklamo|nakagat|bite)\b|scratch/],
];

/** The topic of a message the staff should answer, or null. */
export function handoffTopic(text: string): HandoffTopic | null {
  const normalized = text.toLowerCase();
  if (PARTNER_PATTERN.test(normalized) && ORDER_WORD_PATTERN.test(normalized)) {
    return "partner-order";
  }
  // A long list of items is an order typed by hand, often for a rider.
  if (
    /^\s*(?:order\s*\d|\d+\s*[-x×]?\s*\w)/m.test(normalized) &&
    normalized.split("\n").length >= 3
  ) {
    return "partner-order";
  }
  for (const [topic, pattern] of TOPIC_PATTERNS) {
    if (pattern.test(normalized)) return topic;
  }
  return null;
}

const HANDOFF_TEXT: Readonly<Record<HandoffTopic, string>> = {
  "partner-order":
    "Got it, thank you! 🛵 Our staff will confirm the order and tell you when it's ready for pick-up here in this chat.",
  "bulk-order":
    "Thank you for thinking of us! 🎉 Our owner handles big orders and events personally and will reply here soon.",
  offer:
    "Thank you for reaching out! 😊 We've passed this to our owner, who will get back to you here.",
  hiring:
    "Thank you for your interest in joining Brew ni Cat! 🐱 Our owner will reply here about any openings.",
  "lost-item":
    "Oh no! 😿 Our staff will check the shop and reply here as soon as they can.",
  concern:
    "Thank you for telling us. 🙏 Our staff will look into this and reply here personally.",
};

export function handoffText(topic: HandoffTopic): string {
  return HANDOFF_TEXT[topic];
}
