/**
 * Customer data correction and deletion requests (FR-042).
 *
 * Reads and writes `public.data_requests`. RLS lets a signed-in customer read
 * only their own requests and add one. `customer_id` defaults to `auth.uid()`
 * and `status` defaults to `'open'` in the database, so the insert sends only
 * `kind` and `message`: the browser can never choose another customer or set a
 * status. The explicit `.eq("customer_id", userId)` on reads is
 * defence-in-depth if RLS is ever misconfigured (same idea as order history).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

/** The database keeps a trimmed message of 1 to 1000 characters. */
export const DATA_REQUEST_MESSAGE_MAX_LENGTH = 1000;

export type DataRequestKind = "correction" | "deletion";

export type DataRequestStatus =
  "open" | "in-progress" | "resolved" | "declined";

export type DataRequestEntry = Readonly<{
  id: string;
  kind: DataRequestKind;
  message: string;
  status: DataRequestStatus;
  createdAt: string;
}>;

export type SubmitDataRequestOptions = Readonly<{
  kind: DataRequestKind;
  message: string;
  client?: SupabaseClient;
}>;

export type FetchDataRequestsOptions = Readonly<{
  userId: string;
  client?: SupabaseClient;
}>;

type RawDataRequestRow = {
  id: string;
  kind: DataRequestKind;
  message: string;
  status: DataRequestStatus;
  created_at: string;
};

/**
 * Returns the first problem with a request message, or null when it is valid.
 * The message is trimmed, matching the database check.
 */
export function validateDataRequestMessage(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed) {
    return "Please write what you would like us to correct or delete.";
  }

  if (trimmed.length > DATA_REQUEST_MESSAGE_MAX_LENGTH) {
    return `Please keep the message to ${DATA_REQUEST_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function submitDataRequest({
  kind,
  message,
  client,
}: SubmitDataRequestOptions): Promise<void> {
  const problem = validateDataRequestMessage(message);
  if (problem) {
    throw new Error(problem);
  }

  const supabase = client ?? getAuthSupabaseClient();

  const { error } = await supabase
    .from("data_requests")
    .insert({ kind, message: message.trim() });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchDataRequests({
  userId,
  client,
}: FetchDataRequestsOptions): Promise<DataRequestEntry[]> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("data_requests")
    .select("id, kind, message, status, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RawDataRequestRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}
