"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import {
  fetchCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/account/profile";

export type ProfileViewProps = Readonly<{
  initialProfile?: CustomerProfile | null;
  fetchProfile?: typeof fetchCustomerProfile;
  saveProfile?: typeof saveCustomerProfile;
}>;

export function ProfileView({
  initialProfile,
  fetchProfile = fetchCustomerProfile,
  saveProfile = saveCustomerProfile,
}: ProfileViewProps) {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [fullName, setFullName] = useState(initialProfile?.fullName ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [isLoadingProfile, setIsLoadingProfile] = useState(
    initialProfile === undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const nameInputId = useId();
  const phoneInputId = useId();

  useEffect(() => {
    if (isAuthLoading || !user || initialProfile !== undefined) return;

    let active = true;

    fetchProfile({ userId: user.id })
      .then((profile) => {
        if (!active) return;
        if (profile) {
          setFullName(profile.fullName);
          setPhone(profile.phone ?? "");
        }
        setIsLoadingProfile(false);
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage("Unable to load profile. Please try again later.");
        setIsLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user, isAuthLoading, initialProfile, fetchProfile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("You must be signed in to update your profile.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveProfile({
        userId: user.id,
        input: {
          fullName,
          phone,
        },
      });

      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors);
        }
        setErrorMessage(result.message);
      } else {
        setErrors({});
        setFullName(result.profile.fullName);
        setPhone(result.profile.phone ?? "");
        setSuccessMessage("Your profile has been saved successfully.");
      }
    } catch {
      setErrorMessage("We couldn't save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || (user && isLoadingProfile)) {
    return (
      <Container className="py-12 max-w-xl">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-48 rounded-[var(--shape-md)] bg-[var(--fill-secondary)]" />
          <div className="h-5 w-80 rounded-[var(--shape-sm)] bg-[var(--fill-secondary)]" />
          <div className="ios-card space-y-4 p-6 sm:p-8">
            <div className="h-12 rounded-[var(--shape-md)] bg-[var(--fill-secondary)]" />
            <div className="h-12 rounded-[var(--shape-md)] bg-[var(--fill-secondary)]" />
            <div className="h-11 w-32 rounded-full bg-[var(--fill-secondary)] pt-4" />
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-16 max-w-xl text-center">
        <div className="ios-card p-8 sm:p-10">
          <h1 className="font-display text-2xl text-[var(--text-strong)]">
            Sign In to View Profile
          </h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Please sign in to access your customer profile and manage your
            details.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/account/sign-in?returnTo=/account/profile"
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-xl">
          <div className="text-center sm:text-left">
            <p className="eyebrow">Customer Account</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--text-strong)] sm:text-4xl">
              Profile
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Keep your contact details up to date for fast checkout and order
              notifications.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="ios-card mt-8 space-y-5 p-6 sm:p-8"
            noValidate
          >
            {successMessage ? (
              <div
                role="status"
                className="rounded-[var(--shape-md)] border border-[var(--accent-solid)] bg-[var(--accent-soft)] p-3 text-sm font-medium text-[var(--accent-solid)]"
              >
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-[var(--shape-md)] border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            <div>
              <label htmlFor="account-email" className="ios-label block">
                Email address
              </label>
              <input
                id="account-email"
                type="email"
                value={user.email ?? ""}
                disabled
                aria-disabled="true"
                className="ios-field mt-2 opacity-70 cursor-not-allowed bg-[var(--fill-tertiary)]"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Email is managed through your login credentials.
              </p>
            </div>

            <div>
              <label htmlFor={nameInputId} className="ios-label block">
                Full Name
              </label>
              <input
                id={nameInputId}
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) {
                    setErrors((prev) => ({ ...prev, fullName: "" }));
                  }
                }}
                className={`ios-field mt-2 ${errors.fullName ? "border-[var(--danger)]" : ""}`}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "name-error" : undefined}
                placeholder="Juan Dela Cruz"
              />
              {errors.fullName ? (
                <p
                  id="name-error"
                  className="mt-1 text-xs text-[var(--danger)]"
                >
                  {errors.fullName}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={phoneInputId} className="ios-label block">
                Phone Number
              </label>
              <input
                id={phoneInputId}
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) {
                    setErrors((prev) => ({ ...prev, phone: "" }));
                  }
                }}
                className={`ios-field mt-2 ${errors.phone ? "border-[var(--danger)]" : ""}`}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : "phone-help"}
                placeholder="e.g. 0912 345 6789"
              />
              {errors.phone ? (
                <p
                  id="phone-error"
                  className="mt-1 text-xs text-[var(--danger)]"
                >
                  {errors.phone}
                </p>
              ) : (
                <p
                  id="phone-help"
                  className="mt-1 text-xs text-[var(--text-muted)]"
                >
                  {"Philippine mobile number (e.g. 0912 345 6789)."}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="button-primary w-full sm:w-auto"
              >
                {isSubmitting ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}
