"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="ios-card mx-auto max-w-2xl p-7 text-center sm:p-10">
        <p className="eyebrow">Temporary interruption</p>
        <h1 className="font-display mt-3 text-4xl text-[var(--text-strong)]">
          Something went wrong
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
          The page encountered an unexpected problem. Try it again, or return to
          the homepage.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="button-primary">
            Try again
          </button>
          <Link href="/" className="button-secondary">
            Return home
          </Link>
        </div>
      </div>
    </Container>
  );
}
