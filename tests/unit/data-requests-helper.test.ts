import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  DATA_REQUEST_MESSAGE_MAX_LENGTH,
  fetchDataRequests,
  submitDataRequest,
  validateDataRequestMessage,
} from "@/lib/account/data-requests";

type QueryError = { code: string; message: string } | null;

function createClient(
  overrides: {
    insertError?: QueryError;
    selectError?: QueryError;
    rows?: unknown[];
  } = {},
) {
  const order = vi.fn().mockResolvedValue({
    data: overrides.selectError ? null : (overrides.rows ?? []),
    error: overrides.selectError ?? null,
  });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi
    .fn()
    .mockResolvedValue({ error: overrides.insertError ?? null });
  const client = {
    from: vi.fn(() => ({ select, insert })),
  } as unknown as SupabaseClient;

  return { client, insert, select, eq, order };
}

describe("Data request helper (FR-042)", () => {
  it("TC-P5-130 — sends only the kind and trimmed message", async () => {
    const { client, insert } = createClient();

    await submitDataRequest({
      kind: "correction",
      message: "  Please fix my phone number.  ",
      client,
    });

    expect(client.from).toHaveBeenCalledWith("data_requests");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      kind: "correction",
      message: "Please fix my phone number.",
    });
    // The browser must never choose the customer or the status.
    expect(insert.mock.calls[0]?.[0]).not.toHaveProperty("customer_id");
    expect(insert.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("TC-P5-131 — throws the insert error", async () => {
    const { client } = createClient({
      insertError: { code: "42501", message: "permission denied" },
    });

    await expect(
      submitDataRequest({
        kind: "deletion",
        message: "Please delete my profile data.",
        client,
      }),
    ).rejects.toThrow("permission denied");
  });

  it("TC-P5-132 — lists that customer's requests, newest first", async () => {
    const { client, select, eq, order } = createClient({
      rows: [
        {
          id: "request-2",
          kind: "deletion",
          message: "Delete my profile data.",
          status: "in-progress",
          created_at: "2026-11-12T08:00:00Z",
        },
        {
          id: "request-1",
          kind: "correction",
          message: "Fix my phone number.",
          status: "resolved",
          created_at: "2026-11-10T08:00:00Z",
        },
      ],
    });

    const requests = await fetchDataRequests({
      userId: "customer-123",
      client,
    });

    expect(select).toHaveBeenCalledWith(
      "id, kind, message, status, created_at",
    );
    expect(eq).toHaveBeenCalledWith("customer_id", "customer-123");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(requests).toEqual([
      {
        id: "request-2",
        kind: "deletion",
        message: "Delete my profile data.",
        status: "in-progress",
        createdAt: "2026-11-12T08:00:00Z",
      },
      {
        id: "request-1",
        kind: "correction",
        message: "Fix my phone number.",
        status: "resolved",
        createdAt: "2026-11-10T08:00:00Z",
      },
    ]);
  });

  it("TC-P5-133 — throws when the list cannot load", async () => {
    const { client } = createClient({
      selectError: { code: "PGRST301", message: "JWT expired" },
    });

    await expect(
      fetchDataRequests({ userId: "customer-123", client }),
    ).rejects.toThrow("JWT expired");
  });

  it("TC-P5-133 — rejects an empty or overlong message before inserting", async () => {
    const { client, insert } = createClient();

    expect(validateDataRequestMessage("   ")).toBe(
      "Please write what you would like us to correct or delete.",
    );
    expect(
      validateDataRequestMessage(
        "a".repeat(DATA_REQUEST_MESSAGE_MAX_LENGTH + 1),
      ),
    ).toBe("Please keep the message to 1000 characters or fewer.");
    expect(validateDataRequestMessage("a".repeat(1000))).toBeNull();

    await expect(
      submitDataRequest({ kind: "correction", message: "   ", client }),
    ).rejects.toThrow(
      "Please write what you would like us to correct or delete.",
    );
    expect(insert).not.toHaveBeenCalled();
  });
});
