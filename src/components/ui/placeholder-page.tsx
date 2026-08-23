import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Container } from "./container";

type PlaceholderPageProps = Readonly<{
  title: string;
  description: string;
  plannedPhase: string;
}>;

export function PlaceholderPage({
  title,
  description,
  plannedPhase,
}: PlaceholderPageProps) {
  return (
    <section className="py-14 sm:py-20" aria-labelledby="page-heading">
      <Container>
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link
                  href="/"
                  className="rounded-sm font-semibold underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--text-strong)]"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>

          <div className="mt-9 rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)] sm:p-10">
            <p className="text-sm font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
              {plannedPhase}
            </p>
            <h1
              id="page-heading"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-5xl"
            >
              {title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">
              {description}
            </p>

            <div
              className="mt-8 rounded-2xl border border-[var(--notice-border)] bg-[var(--notice-surface)] p-5"
              role="note"
              aria-label="Owner confirmation required"
            >
              <p className="text-sm font-bold text-[var(--notice-text)]">
                {siteConfig.ownerConfirmationMessage}
              </p>
            </div>

            <Link
              href="/"
              className="mt-8 inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-warm)]"
            >
              Return home
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
