/**
 * Sends the assistant's replies through Meta's Send API (FR-059).
 *
 * The Page access token stays on the server: it goes in the Authorization
 * header, never in a URL, a log line or a reply. Logs name the failed call
 * and its HTTP status only.
 */

import type { Reply } from "./replies";
import { MAX_QUICK_REPLIES } from "./replies";

const GRAPH_API_ORIGIN = "https://graph.facebook.com";

/** The Graph API version the webhook was built and tested against. */
export const GRAPH_API_VERSION = "v26.0";

const SEND_TIMEOUT_MS = 8000;

/** The Send API body for one reply to one customer. */
export function sendApiBody(recipient: string, answer: Reply) {
  const quickReplies = answer.quickReplies.slice(0, MAX_QUICK_REPLIES);
  return {
    recipient: { id: recipient },
    messaging_type: "RESPONSE",
    message: {
      text: answer.text,
      ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
    },
  };
}

export type GraphClient = Readonly<{
  /** True when Meta accepted the message. */
  send: (recipient: string, answer: Reply) => Promise<boolean>;
}>;

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
      // A timeout or network error; logged below with status 0.
    }
    console.warn(
      JSON.stringify({ event: "messenger-graph-failed", path, status }),
    );
    return false;
  }

  return {
    send: (recipient, answer) =>
      post("/me/messages", sendApiBody(recipient, answer)),
  };
}
