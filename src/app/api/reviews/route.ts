/**
 * `POST /api/reviews`: Post or edit a customer review (FR-098).
 *
 * Calls `public.post_review` using the publishable key.
 * If signed in, the customer's session token is passed along.
 * Rate limited to prevent flooding.
 *
 * Logs never include review text, names, emails, or personal data.
 */

import {
  RATE_LIMITED_MESSAGE,
  REVIEW_ERROR_MESSAGES,
} from "@/lib/reviews/constants";
import { clientKey, reviewRateLimiter } from "@/lib/reviews/rate-limit";
import { normalizeReview, validateReviewInput } from "@/lib/reviews/service";
import type { PostReviewResult, RawReviewRow } from "@/lib/reviews/types";
import {
  getPublicSupabaseClient,
  PublicSupabaseConfigurationError,
} from "@/lib/supabase/public-client";

function logFailure(correlationId: string, code: string): void {
  console.error(
    JSON.stringify({ event: "post-review-failed", correlationId, code }),
  );
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const respond = (
    result: PostReviewResult,
    status: number,
    extraHeaders: Record<string, string> = {},
  ) =>
    Response.json(result, {
      status,
      headers: {
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
        ...extraHeaders,
      },
    });

  const limit = reviewRateLimiter.check(clientKey(request));
  if (!limit.allowed) {
    logFailure(correlationId, "rate-limited");
    return respond(
      {
        ok: false,
        error: "rate-limited",
        message: RATE_LIMITED_MESSAGE,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      429,
      {
        "retry-after": String(limit.retryAfterSeconds),
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    logFailure(correlationId, "invalid-json");
    return respond(
      {
        ok: false,
        error: "invalid-json",
        message: "Invalid JSON in request body.",
      },
      400,
    );
  }

  const validation = validateReviewInput(rawBody);
  if (!validation.ok) {
    logFailure(correlationId, validation.error);
    return respond(
      {
        ok: false,
        error: validation.error,
        message: validation.message,
      },
      400,
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader
    ? authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : ""
    : null;

  let supabase: ReturnType<typeof getPublicSupabaseClient>;
  try {
    supabase = getPublicSupabaseClient(token);
  } catch (error) {
    if (!(error instanceof PublicSupabaseConfigurationError)) throw error;
    logFailure(correlationId, "not-configured");
    return respond(
      {
        ok: false,
        error: "not-configured",
        message: REVIEW_ERROR_MESSAGES.serverError,
      },
      503,
    );
  }

  if (token !== null) {
    if (!token) {
      logFailure(correlationId, "invalid-token");
      return respond(
        {
          ok: false,
          error: "session-expired",
          message: REVIEW_ERROR_MESSAGES.unauthorized,
        },
        401,
      );
    }
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        logFailure(correlationId, authError?.code || "invalid-token");
        return respond(
          {
            ok: false,
            error: "session-expired",
            message: REVIEW_ERROR_MESSAGES.unauthorized,
          },
          401,
        );
      }
    } catch {
      logFailure(correlationId, "auth-unreachable");
      return respond(
        {
          ok: false,
          error: "auth-unreachable",
          message: REVIEW_ERROR_MESSAGES.serverError,
        },
        502,
      );
    }
  }

  let data: unknown;
  try {
    const answer = await supabase.rpc("post_review", {
      p_rating: validation.data.rating,
      p_body: validation.data.body,
    });
    if (answer.error) {
      logFailure(correlationId, answer.error.code || "rpc-error");
      const isGuestFlood = answer.error.message?.includes(
        "Too many guest reviews",
      );
      const message = isGuestFlood
        ? REVIEW_ERROR_MESSAGES.guestFlood
        : REVIEW_ERROR_MESSAGES.serverError;
      const status = isGuestFlood ? 429 : 502;
      return respond(
        {
          ok: false,
          error: isGuestFlood ? "rate-limited" : "rpc-error",
          message,
        },
        status,
      );
    }
    data = answer.data;
  } catch {
    logFailure(correlationId, "rpc-unreachable");
    return respond(
      {
        ok: false,
        error: "rpc-unreachable",
        message: REVIEW_ERROR_MESSAGES.serverError,
      },
      502,
    );
  }

  if (!data || typeof data !== "object") {
    logFailure(correlationId, "unexpected-response");
    return respond(
      {
        ok: false,
        error: "unexpected-response",
        message: REVIEW_ERROR_MESSAGES.serverError,
      },
      502,
    );
  }

  const review = normalizeReview(data as RawReviewRow);
  return respond({ ok: true, review }, 200);
}
