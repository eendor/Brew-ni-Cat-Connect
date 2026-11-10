"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { StarRatingPicker } from "@/components/reviews/star-rating";
import { useAuth } from "@/context/auth-context";
import { fetchCustomerProfile } from "@/lib/account/profile";
import {
  REVIEW_ERROR_MESSAGES,
  REVIEW_MAX_LENGTH,
} from "@/lib/reviews/constants";
import { fetchMyReview, submitReview } from "@/lib/reviews/service";
import type { Review } from "@/lib/reviews/types";

export type ReviewFormProps = Readonly<{
  onReviewPosted: (review: Review) => void;
  initialReview?: Review | null;
}>;

export function ReviewForm({ onReviewPosted, initialReview }: ReviewFormProps) {
  const { user, session } = useAuth();
  const textareaId = useId();

  const [rating, setRating] = useState<number>(initialReview?.rating ?? 0);
  const [body, setBody] = useState<string>(initialReview?.body ?? "");
  const [firstName, setFirstName] = useState<string>("");
  const [existingReviewId, setExistingReviewId] = useState<string | null>(
    initialReview?.id ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    rating?: string;
    body?: string;
  }>({});

  // Determine user identity: First name of profile or 'Customer'
  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    // Load customer profile name
    fetchCustomerProfile({ userId: user.id })
      .then((profile) => {
        if (!active) return;
        if (profile?.fullName?.trim()) {
          const first = profile.fullName.trim().split(/\s+/)[0];
          setFirstName(first || "Customer");
        } else {
          setFirstName("Customer");
        }
      })
      .catch(() => {
        if (active) setFirstName("Customer");
      });

    // Check for existing review by this customer to allow editing
    if (initialReview === undefined) {
      fetchMyReview({ token: session?.access_token })
        .then((existing) => {
          if (!active) return;
          if (existing) {
            setExistingReviewId(existing.id);
            setRating(existing.rating);
            setBody(existing.body);
          }
        })
        .catch(() => {
          // Ignore error on checking existing review
        });
    }

    return () => {
      active = false;
    };
  }, [user, session, initialReview]);

  const remainingChars = REVIEW_MAX_LENGTH - body.length;
  const isEditing = Boolean(user && existingReviewId);
  const currentFirstName = user ? firstName || "Customer" : "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setFieldErrors({});

    const errors: { rating?: string; body?: string } = {};

    if (!rating || rating < 1 || rating > 5) {
      errors.rating = REVIEW_ERROR_MESSAGES.ratingRequired;
    }

    const trimmed = body.trim();
    if (trimmed.length === 0) {
      errors.body = REVIEW_ERROR_MESSAGES.textEmpty;
    } else if (trimmed.length > REVIEW_MAX_LENGTH) {
      errors.body = REVIEW_ERROR_MESSAGES.textTooLong;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitReview(
        { rating, body: trimmed },
        session?.access_token,
      );

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage(
        isEditing
          ? "Your review has been updated. Thank you!"
          : "Thank you! Your review has been posted.",
      );
      setExistingReviewId(result.review.id);
      onReviewPosted(result.review);

      // If guest, reset the form
      if (!user) {
        setRating(0);
        setBody("");
      }
    } catch {
      setErrorMessage(REVIEW_ERROR_MESSAGES.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ios-card p-6 sm:p-8">
      <div className="border-b border-[var(--separator)] pb-4">
        <h3 className="font-display text-xl font-bold text-[var(--text-strong)] sm:text-2xl">
          {isEditing ? "Edit your review" : "Leave a review"}
        </h3>
        <div className="mt-2 text-sm">
          {user ? (
            <p className="text-[var(--text-strong)]">
              Posting as{" "}
              <span className="font-semibold text-[var(--accent-solid)]">
                {currentFirstName}
              </span>
              {isEditing ? " • Editing your existing review" : ""}
            </p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-[var(--text-strong)]">
                Posting as Guest
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Guest reviews cannot be edited after posting.
              </p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        {successMessage ? (
          <div
            role="status"
            className="rounded-[var(--shape-md)] border border-[var(--accent-solid)] bg-[var(--accent-soft)] p-3.5 text-sm font-medium text-[var(--accent-solid)]"
          >
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-[var(--shape-md)] border border-[var(--danger)] bg-[var(--danger-soft)] p-3.5 text-sm text-[var(--danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        <StarRatingPicker
          value={rating}
          onChange={(newRating) => {
            setRating(newRating);
            if (fieldErrors.rating) {
              setFieldErrors((prev) => ({ ...prev, rating: undefined }));
            }
          }}
          disabled={isSubmitting}
          error={fieldErrors.rating}
        />

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="ios-label block font-medium text-[var(--text-strong)]"
            >
              Your review <span className="text-[var(--danger)]">*</span>
            </label>
            <span
              id="char-count"
              aria-live="polite"
              className={`text-xs ${
                remainingChars < 0
                  ? "font-semibold text-[var(--danger)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {body.length}/{REVIEW_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id={textareaId}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (fieldErrors.body) {
                setFieldErrors((prev) => ({ ...prev, body: undefined }));
              }
            }}
            disabled={isSubmitting}
            aria-describedby="char-count"
            aria-invalid={fieldErrors.body ? "true" : "false"}
            rows={4}
            placeholder="Share your experience at Brew ni Cat..."
            className="ios-field mt-1.5 w-full resize-y rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
          />
          {fieldErrors.body ? (
            <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
              {fieldErrors.body}
            </p>
          ) : null}
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-primary w-full sm:w-auto"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update review"
                : "Post review"}
          </button>
        </div>
      </form>
    </div>
  );
}
