"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import {
  DATA_REQUEST_MESSAGE_MAX_LENGTH,
  fetchDataRequests,
  submitDataRequest,
  validateDataRequestMessage,
  type DataRequestEntry,
  type DataRequestKind,
  type DataRequestStatus,
} from "@/lib/account/data-requests";

const KIND_OPTIONS: ReadonlyArray<{
  value: DataRequestKind;
  label: string;
  description: string;
}> = [
  {
    value: "correction",
    label: "Correction",
    description: "Ask the shop to fix details such as your name or phone.",
  },
  {
    value: "deletion",
    label: "Deletion",
    description: "Ask the shop to delete the data it is allowed to delete.",
  },
];

const STATUS_LABELS: Record<DataRequestStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
  declined: "Declined",
};

const KIND_LABELS: Record<DataRequestKind, string> = {
  correction: "Correction",
  deletion: "Deletion",
};

function getStatusStyle(status: DataRequestStatus): string {
  switch (status) {
    case "resolved":
      return "bg-[var(--accent-soft)] text-[var(--accent-solid)] border-[var(--accent-solid)]";
    case "declined":
      return "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]";
    case "in-progress":
      return "bg-[var(--notice-surface)] text-[var(--notice-text)] border-[var(--notice-border)]";
    case "open":
    default:
      return "bg-[var(--fill-tertiary)] text-[var(--text-muted)] border-[var(--separator)]";
  }
}

function formatRequestDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

/**
 * Data correction and deletion requests (FR-042). The insert sends only the
 * chosen kind and the trimmed message; the database sets the customer and the
 * initial status. Earlier requests are the signed-in customer's own rows only.
 */
export function DataRequestView() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [kind, setKind] = useState<DataRequestKind | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    kind?: string;
    message?: string;
  }>({});
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [requests, setRequests] = useState<DataRequestEntry[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestsReloadKey, setRequestsReloadKey] = useState(0);

  const kindErrorId = useId();
  const messageId = useId();
  const messageHelpId = useId();
  const messageErrorId = useId();

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;

    fetchDataRequests({ userId: user.id })
      .then((entries) => {
        if (!active) return;
        setRequests(entries);
        setIsLoadingRequests(false);
      })
      .catch(() => {
        if (!active) return;
        setRequestsError(
          "Unable to load your earlier requests. Please try again.",
        );
        setIsLoadingRequests(false);
      });

    return () => {
      active = false;
    };
  }, [user, isAuthLoading, requestsReloadKey]);

  const sendRequest = async (
    kindToSend: DataRequestKind,
    messageToSend: string,
  ) => {
    setSubmitError("");
    setSuccessMessage("");
    setIsSending(true);

    try {
      await submitDataRequest({ kind: kindToSend, message: messageToSend });
      setKind("");
      setMessage("");
      setErrors({});
      setSuccessMessage(
        "Your request has been sent. The shop will review it and contact you about what happens next. You can follow its status below.",
      );
      setRequestsReloadKey((key) => key + 1);
    } catch {
      setSubmitError(
        "We couldn't send your request. Your message is still here, so you can try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const nextErrors: { kind?: string; message?: string } = {};
    if (!kind) {
      nextErrors.kind = "Choose Correction or Deletion.";
    }

    const messageProblem = validateDataRequestMessage(message);
    if (messageProblem) {
      nextErrors.message = messageProblem;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void sendRequest(kind as DataRequestKind, message.trim());
  };

  return (
    <Container className="py-8 md:py-12 max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-strong)] tracking-tight">
          Data Requests
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ask the shop to correct or delete your data. The shop reviews every
          request by hand.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="ios-card space-y-6 p-5 sm:p-8"
        aria-labelledby="data-request-form-heading"
      >
        <h2
          id="data-request-form-heading"
          className="font-display text-xl font-semibold text-[var(--text-strong)]"
        >
          Send a request
        </h2>

        {successMessage ? (
          <div
            role="status"
            className="rounded-[var(--shape-md)] border border-[var(--accent-solid)] bg-[var(--accent-soft)] p-3 text-sm font-medium text-[var(--accent-solid)]"
          >
            {successMessage}
          </div>
        ) : null}

        {submitError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--shape-md)] border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          >
            <span className="min-w-0 break-words">{submitError}</span>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : null}

        <fieldset
          aria-describedby={errors.kind ? kindErrorId : undefined}
          aria-invalid={Boolean(errors.kind)}
        >
          <legend className="ios-label">What would you like us to do?</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {KIND_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-[var(--shape-md)] border border-[var(--separator)] p-4 transition-colors hover:bg-[var(--glass-hover)]"
              >
                <input
                  type="radio"
                  name="data-request-kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => {
                    setKind(option.value);
                    if (errors.kind) {
                      setErrors((previous) => ({ ...previous, kind: "" }));
                    }
                  }}
                  required
                  aria-describedby={errors.kind ? kindErrorId : undefined}
                  className="mt-1 size-4 shrink-0 accent-[var(--accent-solid)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text-strong)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.kind ? (
            <p id={kindErrorId} className="mt-2 text-xs text-[var(--danger)]">
              {errors.kind}
            </p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor={messageId} className="ios-label block">
            Your message
          </label>
          <textarea
            id={messageId}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (errors.message) {
                setErrors((previous) => ({ ...previous, message: "" }));
              }
            }}
            required
            maxLength={DATA_REQUEST_MESSAGE_MAX_LENGTH}
            rows={5}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message
                ? `${messageHelpId} ${messageErrorId}`
                : messageHelpId
            }
            className={`ios-field mt-2 w-full resize-y ${errors.message ? "border-[var(--danger)]" : ""}`}
            placeholder="Tell the shop which details you would like corrected or deleted."
          />
          <p
            id={messageHelpId}
            className="mt-1 text-xs text-[var(--text-muted)]"
          >
            {message.length} / {DATA_REQUEST_MESSAGE_MAX_LENGTH} characters
          </p>
          {errors.message ? (
            <p
              id={messageErrorId}
              className="mt-1 text-xs text-[var(--danger)]"
            >
              {errors.message}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--shape-md)] bg-[var(--fill-tertiary)] p-4 text-sm text-[var(--text-muted)]">
          <p>
            A deletion request covers your profile data. Order records that the
            shop must keep may stay after your request.
          </p>
          <p className="mt-2">
            Correction requests can cover the name and phone number saved in
            your profile.
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSending}
            className="button-primary w-full disabled:opacity-60 sm:w-auto"
          >
            {isSending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>

      <section className="mt-10" aria-labelledby="earlier-requests-heading">
        <h2
          id="earlier-requests-heading"
          className="font-display text-xl font-semibold text-[var(--text-strong)]"
        >
          Your earlier requests
        </h2>

        {requestsError ? (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--shape-md)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
          >
            <span className="min-w-0 break-words">{requestsError}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoadingRequests(true);
                setRequestsError("");
                setRequestsReloadKey((key) => key + 1);
              }}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : isLoadingRequests ? (
          <div
            role="status"
            aria-label="Loading your earlier requests"
            data-testid="data-requests-loading"
            className="mt-4 h-24 animate-pulse rounded-[var(--shape-lg)] bg-[var(--fill-secondary)]"
          />
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            You haven’t sent any requests yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((request) => (
              <li
                key={request.id}
                className="ios-card min-w-0 border border-[var(--separator)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-strong)]">
                      {KIND_LABELS[request.kind]} request
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(
                        request.status,
                      )}`}
                    >
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>
                  <time
                    dateTime={request.createdAt}
                    className="text-xs text-[var(--text-muted)]"
                  >
                    {formatRequestDate(request.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-muted)]">
                  {request.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
