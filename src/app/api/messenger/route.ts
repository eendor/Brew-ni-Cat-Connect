import { after } from "next/server";

import { createMessengerDeps } from "@/lib/messenger/deps";
import { processWebhook } from "@/lib/messenger/events";
import {
  checkSubscription,
  isValidSignature,
  MAX_WEBHOOK_BODY_BYTES,
} from "@/lib/messenger/signature";

/**
 * The Messenger webhook (FR-058, NFR-022).
 *
 * GET answers Meta's subscription check. POST takes Meta's signed events: it
 * checks the signature against the raw body before reading it, answers 200
 * at once, and replies to customers after the response, so Meta never waits
 * on the database or the Send API and doesn't resend the events.
 */

/** Smart replies may go round the Gemini models after the 200 (ADR-031). */
export const maxDuration = 60;

const HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/plain; charset=utf-8",
  "x-content-type-options": "nosniff",
};

function plain(body: string, status: number): Response {
  return new Response(body, { status, headers: HEADERS });
}

/** The event name only: no secrets, IDs or message text. */
function warn(event: string): void {
  console.warn(JSON.stringify({ event }));
}

export function GET(request: Request): Response {
  const check = checkSubscription(
    new URL(request.url).searchParams,
    process.env.MESSENGER_VERIFY_TOKEN,
  );
  return check.ok ? plain(check.challenge, 200) : plain("Forbidden", 403);
}

export async function POST(request: Request): Promise<Response> {
  const appSecret = process.env.MESSENGER_APP_SECRET;
  if (!appSecret) {
    warn("messenger-not-configured");
    return plain("Not configured", 503);
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_WEBHOOK_BODY_BYTES) return plain("Too large", 413);
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return plain("Too large", 413);
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!isValidSignature(body, signature, appSecret)) {
    warn("messenger-bad-signature");
    return plain("Unauthorized", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return plain("Bad request", 400);
  }
  const object =
    typeof payload === "object" && payload !== null
      ? (payload as { object?: unknown }).object
      : undefined;
  if (object !== "page") return plain("Not found", 404);

  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    // Still 200: Meta turns off a webhook that keeps failing.
    warn("messenger-no-page-token");
    return plain("EVENT_RECEIVED", 200);
  }

  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      await processWebhook(
        payload,
        createMessengerDeps(origin, pageToken, appSecret),
      );
    } catch {
      warn("messenger-processing-failed");
    }
  });
  return plain("EVENT_RECEIVED", 200);
}
