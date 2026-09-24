import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "./container";

type PageIntroProps = Readonly<{
  eyebrow: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
}>;

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: PageIntroProps) {
  return (
    <section className="page-hero" aria-labelledby="page-heading">
      <Container className="py-12 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" className="fade-up-reveal">
          <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <li>
              <Link
                href="/"
                className="rounded-sm font-bold underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-strong)]"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl fade-up-reveal-delay">
            <p className="eyebrow">{eyebrow}</p>
            <h1
              id="page-heading"
              className="font-display mt-3 text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-balance text-[var(--text-strong)] sm:text-6xl"
            >
              {title}
            </h1>
            <div className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-[var(--text-muted)]">
              {description}
            </div>
          </div>
          {aside ? <div className="fade-up-reveal-delay-2">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
