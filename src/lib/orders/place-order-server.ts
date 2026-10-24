/**
 * Place order on the server: reading the request body and turning the
 * database's answer into the API response.
 *
 * The database function `public.place_online_order` checks the request in
 * full and prices it (see `supabase/migrations/20261024064700_online_order_functions.sql`).
 * This module only keeps out what the database cannot take: oversized or
 * malformed bodies, and text Postgres refuses (`\u0000` and unpaired
 * surrogates), which would otherwise come back as a server error.
 */

import {
  FIELD_ERROR_MESSAGES,
  isLineProblemReason,
  isRecord,
  PLACE_ORDER_MESSAGES,
  placeOrderFailure,
} from "@/lib/orders/place-order";
import {
  isOrderReference,
  isOrderStatus,
  isTrackingToken,
  type OrderFieldErrors,
  type PlaceOrderLineProblem,
  type PlaceOrderResult,
} from "@/lib/orders/types";

/** Largest request body the order API reads, in bytes. */
export const MAX_PLACE_ORDER_BODY_BYTES = 32 * 1024;

/** Deepest nesting a request may have. A real one nests 3 levels. */
const MAX_JSON_DEPTH = 6;

export type PlaceOrderBody =
  | Readonly<{
      ok: true;
      /** The parsed request, passed to the database as it is. */
      request: Record<string, unknown>;
      trackingToken: string;
    }>
  | Readonly<{ ok: false; status: 400 | 413 | 415 }>;

/** Reads at most `limit` bytes, or reports that the body is larger. */
async function readLimited(
  request: Request,
  limit: number,
): Promise<Uint8Array | null> {
  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isDatabaseSafeText(text: string): boolean {
  return !text.includes("\u0000") && text.isWellFormed();
}

/**
 * True when Postgres can store the value as `jsonb` unchanged: finite
 * numbers, and text without `\u0000` or unpaired surrogates.
 */
export function isDatabaseSafeJson(root: unknown): boolean {
  const pending: Array<Readonly<{ value: unknown; depth: number }>> = [
    { value: root, depth: 0 },
  ];

  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { value, depth } = next;
    if (typeof value === "string") {
      if (!isDatabaseSafeText(value)) return false;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
    } else if (Array.isArray(value)) {
      if (depth >= MAX_JSON_DEPTH) return false;
      for (const entry of value)
        pending.push({ value: entry, depth: depth + 1 });
    } else if (isRecord(value)) {
      if (depth >= MAX_JSON_DEPTH) return false;
      for (const [key, entry] of Object.entries(value)) {
        if (!isDatabaseSafeText(key)) return false;
        pending.push({ value: entry, depth: depth + 1 });
      }
    } else if (value !== null && typeof value !== "boolean") {
      return false;
    }
  }
  return true;
}

/**
 * Reads a Place order request: JSON, at most 32 KB, with text and numbers
 * the database can store, and a well-formed tracking token. The rest is
 * checked by the database.
 */
export async function readPlaceOrderBody(
  request: Request,
): Promise<PlaceOrderBody> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType.trim())) {
    return { ok: false, status: 415 };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_PLACE_ORDER_BODY_BYTES) {
    return { ok: false, status: 413 };
  }

  let parsed: unknown;
  try {
    const bytes = await readLimited(request, MAX_PLACE_ORDER_BODY_BYTES);
    if (bytes === null) return { ok: false, status: 413 };
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return { ok: false, status: 400 };
  }

  if (
    !isRecord(parsed) ||
    !isDatabaseSafeJson(parsed) ||
    !isTrackingToken(parsed.trackingToken)
  ) {
    return { ok: false, status: 400 };
  }

  return { ok: true, request: parsed, trackingToken: parsed.trackingToken };
}

export type PlaceOrderResponse = Readonly<{
  result: PlaceOrderResult;
  status: number;
}>;

function toFieldErrors(value: unknown): OrderFieldErrors | null {
  if (!isRecord(value)) return null;

  const errors: Partial<Record<"name" | "phone" | "notes", string>> = {};
  for (const [field, code] of Object.entries(value)) {
    if (field !== "name" && field !== "phone" && field !== "notes") return null;
    const messages: Readonly<Record<string, string>> =
      FIELD_ERROR_MESSAGES[field];
    const message =
      typeof code === "string" && Object.hasOwn(messages, code)
        ? messages[code]
        : undefined;
    if (message === undefined) return null;
    errors[field] = message;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

function toLineProblems(value: unknown): PlaceOrderLineProblem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const problems: PlaceOrderLineProblem[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      !Number.isSafeInteger(entry.index) ||
      (entry.index as number) < 0 ||
      !isLineProblemReason(entry.reason)
    ) {
      return null;
    }
    problems.push({ index: entry.index as number, reason: entry.reason });
  }
  return problems;
}

/**
 * The API response for what `public.place_online_order` returned, or `null`
 * when it is not a shape the function returns. The tracking token comes from
 * the request: the database keeps only its hash.
 */
export function toPlaceOrderResponse(
  data: unknown,
  trackingToken: string,
): PlaceOrderResponse | null {
  if (!isRecord(data)) return null;

  if (data.ok === true) {
    if (
      typeof data.created !== "boolean" ||
      !isOrderReference(data.reference) ||
      !isOrderStatus(data.status) ||
      typeof data.createdAt !== "string"
    ) {
      return null;
    }
    return {
      status: data.created ? 201 : 200,
      result: {
        ok: true,
        reference: data.reference,
        trackingToken,
        status: data.status,
        createdAt: data.createdAt,
      },
    };
  }

  if (data.ok !== false) return null;

  switch (data.reason) {
    case "invalid-request":
      return { status: 400, result: placeOrderFailure("invalid-request") };
    case "empty-cart":
      return { status: 422, result: placeOrderFailure("empty-cart") };
    case "invalid-details": {
      const fieldErrors = toFieldErrors(data.fieldErrors);
      if (fieldErrors === null) return null;
      return {
        status: 422,
        result: {
          ok: false,
          reason: "invalid-details",
          message: PLACE_ORDER_MESSAGES["invalid-details"],
          fieldErrors,
        },
      };
    }
    case "line-unavailable": {
      const lines = toLineProblems(data.lines);
      if (lines === null) return null;
      return {
        status: 409,
        result: {
          ok: false,
          reason: "line-unavailable",
          message: PLACE_ORDER_MESSAGES["line-unavailable"],
          lines,
        },
      };
    }
    case "price-changed": {
      const subtotal = data.subtotal;
      if (
        typeof subtotal !== "number" ||
        !Number.isFinite(subtotal) ||
        subtotal < 0
      ) {
        return null;
      }
      return {
        status: 409,
        result: {
          ok: false,
          reason: "price-changed",
          message: PLACE_ORDER_MESSAGES["price-changed"],
          subtotal,
        },
      };
    }
    default:
      return null;
  }
}
