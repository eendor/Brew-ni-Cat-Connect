import Link from "next/link";

import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <p
          className="font-display text-6xl font-semibold text-[var(--accent-solid)]"
          aria-hidden="true"
        >
          404
        </p>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
          This page wandered off. Head home or browse Brew ni Cat’s current menu
          instead.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="button-primary">
            Return home
          </Link>
          <Link href="/menu" className="button-secondary">
            Browse menu
          </Link>
        </div>
      </div>
    </Container>
  );
}
