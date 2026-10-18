import Link from "next/link";
import type { ReactNode } from "react";

import { AmbientBackdrop } from "@/components/three/ambient-backdrop";
import type { AmbientMood } from "@/components/three/scenes/ambient";

import { Container } from "./container";

type PageIntroProps = Readonly<{
  eyebrow: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
  /** Colour and ingredients of the decorative 3D backdrop. */
  mood?: AmbientMood;
}>;

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
  mood,
}: PageIntroProps) {
  return (
    <section className="page-hero" aria-labelledby="page-heading">
      {mood ? <AmbientBackdrop mood={mood} /> : null}
      <Container className="py-12 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" data-rise="">
          <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <li>
              {/* a 44 px tap target; the negative margin keeps the line height */}
              <Link
                href="/"
                className="-my-3 inline-flex min-h-11 min-w-11 items-center rounded-sm font-bold underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--text-strong)]"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow" data-rise="">
              {eyebrow}
            </p>
            {/* keyed by the title: when a checkout step renames the page, a
                fresh heading replaces the split one, whose lines and label
                would otherwise bring the old title back */}
            <h1
              key={title}
              id="page-heading"
              data-split=""
              className="font-display mt-3 text-5xl leading-[1.02] text-balance text-[var(--text-strong)] sm:text-6xl"
            >
              {title}
            </h1>
            <div
              className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-[var(--text-muted)]"
              data-rise=""
            >
              {description}
            </div>
          </div>
          {aside ? <div data-rise="">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
