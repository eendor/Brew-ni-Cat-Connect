import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataRequestView } from "@/components/account/data-request-view";
import { useAuth } from "@/context/auth-context";
import {
  fetchDataRequests,
  submitDataRequest,
} from "@/lib/account/data-requests";

vi.mock("@/context/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/account/data-requests", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/account/data-requests")>();
  return {
    ...actual,
    fetchDataRequests: vi.fn(),
    submitDataRequest: vi.fn(),
  };
});

function renderPage() {
  return render(<DataRequestView />);
}

async function chooseKind(kind: "Correction" | "Deletion") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: new RegExp(kind) }));
}

describe("DataRequestView (FR-042)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "customer-123" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(fetchDataRequests).mockResolvedValue([]);
    vi.mocked(submitDataRequest).mockResolvedValue(undefined);
  });

  it("TC-P5-139 — both the choice and the message are required", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(
      screen.getByText("Choose Correction or Deletion."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please write what you would like us to correct or delete.",
      ),
    ).toBeInTheDocument();
    expect(submitDataRequest).not.toHaveBeenCalled();

    const message = screen.getByRole("textbox", { name: "Your message" });
    const error = screen.getByText(
      "Please write what you would like us to correct or delete.",
    );
    expect(message).toHaveAttribute("aria-invalid", "true");
    expect(message.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("TC-P5-140 — trims the message before sending it", async () => {
    const user = userEvent.setup();
    renderPage();

    await chooseKind("Correction");
    await user.type(
      screen.getByRole("textbox", { name: "Your message" }),
      "   Please fix my name.   ",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(submitDataRequest).toHaveBeenCalledWith({
        kind: "correction",
        message: "Please fix my name.",
      }),
    );
  });

  it("TC-P5-141 — counts characters live and keeps the 1000-character limit", async () => {
    const user = userEvent.setup();
    renderPage();

    const message = screen.getByRole("textbox", { name: "Your message" });
    expect(message).toHaveAttribute("maxlength", "1000");
    expect(screen.getByText("0 / 1000 characters")).toBeInTheDocument();

    await user.type(message, "Fix my phone");
    expect(screen.getByText("12 / 1000 characters")).toBeInTheDocument();

    // fireEvent bypasses maxlength so the guard is exercised too.
    fireEvent.change(message, { target: { value: "a".repeat(1001) } });
    await chooseKind("Deletion");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(
      screen.getByText("Please keep the message to 1000 characters or fewer."),
    ).toBeInTheDocument();
    expect(submitDataRequest).not.toHaveBeenCalled();
  });

  it("TC-P5-142 — disables Send request while sending", async () => {
    let finishSending: () => void = () => {};
    vi.mocked(submitDataRequest).mockReturnValue(
      new Promise<void>((resolve) => {
        finishSending = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await chooseKind("Correction");
    await user.type(
      screen.getByRole("textbox", { name: "Your message" }),
      "Fix my name.",
    );

    const button = screen.getByRole("button", { name: "Send request" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();

    finishSending();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send request" }),
      ).toBeEnabled(),
    );
  });

  it("TC-P5-143 — confirms what happens next after a request is sent", async () => {
    const user = userEvent.setup();
    renderPage();
    const fetchCallsBefore = vi.mocked(fetchDataRequests).mock.calls.length;

    await chooseKind("Correction");
    await user.type(
      screen.getByRole("textbox", { name: "Your message" }),
      "Fix my phone number.",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /Your request has been sent/,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /The shop will review it and contact you/,
    );
    await waitFor(() =>
      expect(vi.mocked(fetchDataRequests).mock.calls.length).toBeGreaterThan(
        fetchCallsBefore,
      ),
    );
  });

  it("TC-P5-144 — an error keeps the typed request and Try again resends it", async () => {
    vi.mocked(submitDataRequest)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderPage();

    await chooseKind("Deletion");
    const message = screen.getByRole("textbox", { name: "Your message" });
    await user.type(message, "Delete my profile data.");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /We couldn't send your request/,
    );
    expect(message).toHaveValue("Delete my profile data.");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(submitDataRequest).toHaveBeenLastCalledWith({
        kind: "deletion",
        message: "Delete my profile data.",
      }),
    );
    expect(
      await screen.findByText(/Your request has been sent/),
    ).toBeInTheDocument();
  });

  it("TC-P5-145 — lists the customer's earlier requests with plain-word statuses", async () => {
    vi.mocked(fetchDataRequests).mockResolvedValue([
      {
        id: "request-2",
        kind: "deletion",
        message: "MOCK DATA — FOR DEVELOPMENT ONLY: delete my profile data.",
        status: "in-progress",
        createdAt: "2026-11-12T08:00:00Z",
      },
      {
        id: "request-1",
        kind: "correction",
        message: "MOCK DATA — FOR DEVELOPMENT ONLY: fix my phone number.",
        status: "resolved",
        createdAt: "2026-11-10T08:00:00Z",
      },
    ]);
    renderPage();

    expect(await screen.findByText("Deletion request")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Correction request")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText(/Nov 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Nov 10, 2026/)).toBeInTheDocument();
    expect(fetchDataRequests).toHaveBeenCalledWith({
      userId: "customer-123",
    });
  });

  it("TC-P5-146 — explains what a deletion request covers", () => {
    renderPage();

    expect(
      screen.getByText(/A deletion request covers your profile data/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Order records that the shop must keep may stay/),
    ).toBeInTheDocument();
  });
});
