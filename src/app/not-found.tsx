import type { Metadata } from "next";
import Link from "next/link";

import { StateScene } from "@/components/three/state-scene";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-heading">
      <StateScene
        kind="lost"
        tone="canvas"
        className="not-found__stage"
        fallback={<p className="not-found__code">404</p>}
      />
      <Container className="relative -mt-10 pb-16 text-center sm:-mt-14 sm:pb-24">
        <h1
          id="not-found-heading"
          data-split=""
          className="font-display text-4xl text-[var(--text-strong)] sm:text-5xl"
        >
          Page not found
        </h1>
        <p
          className="mx-auto mt-4 max-w-lg leading-7 text-[var(--text-muted)]"
          data-rise=""
        >
          This page wandered off. Head back home and pick up from there.
        </p>
        <div className="mt-8 flex justify-center" data-rise="">
          <Link href="/" className="button-primary" data-magnetic="">
            Return home
          </Link>
        </div>
      </Container>
    </section>
  );
}
