/**
 * Sends the assistant's replies with Meta's Send API (FR-058, FR-064).
 *
 * A reply can be several messages, sent in this order: the text (a button
 * template when it has buttons), its pictures, then a carousel. The quick
 * replies go on the last message, because Messenger shows them only under
 * the newest one.
 *
 * Buttons sit inside the message so they show on the reply itself. Website
 * links are always buttons, never pasted into the text. A template allows
 * three buttons: the website links come first, then the first choices; the
 * other choices become quick replies. The Page access token stays in the
 * Authorization header, and logs carry only the path and Meta's status.
 */

import {
  MAX_QUICK_REPLIES,
  type Card,
  type CardButton,
  type QuickReply,
  type Reply,
} from "./replies";

/** A button template's text is limited to 640 characters. */
export const MAX_BUTTON_TEXT = 640;
/** A template allows three buttons. */
export const MAX_BUTTONS = 3;
/** A carousel allows ten cards. */
export const MAX_CARDS = 10;
/** Shown when the text is too long for a button template. */
const BUTTONS_PROMPT = "Tap below 👇";

export const GRAPH_API_VERSION = "v26.0";
const GRAPH_API_ORIGIN = "https://graph.facebook.com";
const SEND_TIMEOUT_MS = 8000;

type Message = Readonly<Record<string, unknown>>;

export type SendApiBody = Readonly<{
  recipient: Readonly<{ id: string }>;
  messaging_type: "RESPONSE";
  message: Message;
}>;

const postbackButton = (choice: QuickReply) => ({
  type: "postback",
  title: choice.title,
  payload: choice.payload,
});

const cardButton = (button: CardButton) =>
  button.type === "web_url"
    ? { type: "web_url", url: button.url, title: button.title }
    : { type: "postback", title: button.title, payload: button.payload };

const cardElement = (card: Card) => ({
  title: card.title,
  subtitle: card.subtitle,
  image_url: card.imageUrl,
  buttons: card.buttons.slice(0, MAX_BUTTONS).map(cardButton),
});

const template = (payload: Readonly<Record<string, unknown>>): Message => ({
  attachment: { type: "template", payload },
});

/** The messages of a reply, in the order they are sent. */
export function sendApiBodies(recipient: string, answer: Reply): SendApiBody[] {
  const links = (answer.links ?? []).slice(0, MAX_BUTTONS);
  // A choice list that is meant to be picked from stays below the message.
  const inline = answer.listChoices
    ? []
    : answer.quickReplies.slice(
        0,
        Math.min(
          MAX_BUTTONS - links.length,
          answer.inlineChoices ?? MAX_BUTTONS,
        ),
      );
  const buttons = [
    ...links.map((link) => ({
      type: "web_url",
      url: link.url,
      title: link.title,
    })),
    ...inline.map(postbackButton),
  ];

  const messages: Message[] = [];
  if (buttons.length === 0) {
    messages.push({ text: answer.text });
  } else if (answer.text.length <= MAX_BUTTON_TEXT) {
    messages.push(
      template({ template_type: "button", text: answer.text, buttons }),
    );
  } else {
    messages.push(
      { text: answer.text },
      template({ template_type: "button", text: BUTTONS_PROMPT, buttons }),
    );
  }
  for (const url of answer.images ?? []) {
    messages.push({
      attachment: { type: "image", payload: { url, is_reusable: true } },
    });
  }
  const cards = (answer.cards ?? []).slice(0, MAX_CARDS);
  if (cards.length > 0) {
    messages.push(
      template({
        template_type: "generic",
        image_aspect_ratio: "square",
        elements: cards.map(cardElement),
      }),
    );
  }

  const quickReplies = [
    ...(answer.askPhone ? [{ content_type: "user_phone_number" }] : []),
    ...answer.quickReplies.slice(inline.length),
  ].slice(0, MAX_QUICK_REPLIES);
  const last = messages.length - 1;
  return messages.map((message, index) => ({
    recipient: { id: recipient },
    messaging_type: "RESPONSE",
    message:
      index === last && quickReplies.length > 0
        ? { ...message, quick_replies: quickReplies }
        : message,
  }));
}

/** A picture that Meta can't fetch shouldn't stop the rest of the reply. */
const isPicture = (body: SendApiBody) =>
  (body.message.attachment as { type?: unknown } | undefined)?.type === "image";

export type GraphClient = Readonly<{
  /** True when Meta accepted every message of the reply. */
  send: (recipient: string, answer: Reply) => Promise<boolean>;
  /**
   * The name on the customer's Messenger profile for an order (FR-106), or
   * null when Meta doesn't give one. It is never logged or kept.
   */
  customerName: (recipient: string) => Promise<string | null>;
}>;

const MAX_NAME_LENGTH = 100;

/** A profile name safe to store: one line, no control characters, <= 100. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .toWellFormed()
    .trim();
  return name.length > 0 ? name : null;
}

/** The customer in a conversation lookup's participants, by their ID. */
export function participantName(body: unknown, recipient: string) {
  const rows = (body as { data?: unknown } | null)?.data;
  const first = Array.isArray(rows) ? (rows[0] as unknown) : null;
  const people = (first as { participants?: { data?: unknown } } | null)
    ?.participants?.data;
  if (!Array.isArray(people)) return null;
  const person = people.find(
    (entry) => (entry as { id?: unknown } | null)?.id === recipient,
  ) as { name?: unknown } | undefined;
  return cleanName(person?.name);
}

export function createGraphClient(
  pageToken: string,
  fetchImpl: typeof fetch = fetch,
): GraphClient {
  async function post(path: string, body: unknown): Promise<boolean> {
    let status = 0;
    try {
      const response = await fetchImpl(
        `${GRAPH_API_ORIGIN}/${GRAPH_API_VERSION}${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pageToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        },
      );
      if (response.ok) return true;
      status = response.status;
    } catch {
      // A network error or timeout is logged below with status 0.
    }
    logFailure(path, status);
    return false;
  }

  /** Only the path and status are logged: never a token, ID or message. */
  function logFailure(path: string, status: number): void {
    console.warn(
      JSON.stringify({ event: "messenger-graph-failed", path, status }),
    );
  }

  return {
    async send(recipient, answer) {
      for (const body of sendApiBodies(recipient, answer)) {
        if (!(await post("/me/messages", body)) && !isPicture(body)) {
          return false;
        }
      }
      return true;
    },
    async customerName(recipient) {
      const path = "/me/conversations";
      const query = new URLSearchParams({
        platform: "messenger",
        user_id: recipient,
        fields: "participants",
        limit: "1",
      });
      let status = 0;
      try {
        const response = await fetchImpl(
          `${GRAPH_API_ORIGIN}/${GRAPH_API_VERSION}${path}?${query}`,
          {
            headers: { Authorization: `Bearer ${pageToken}` },
            cache: "no-store",
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
          },
        );
        if (response.ok) {
          return participantName(await response.json(), recipient);
        }
        status = response.status;
      } catch {
        // A network error, timeout or odd answer is logged with status 0.
      }
      logFailure(path, status);
      return null;
    },
  };
}
