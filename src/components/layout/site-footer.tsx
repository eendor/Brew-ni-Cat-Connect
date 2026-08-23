import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Container } from "../ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-soft)] bg-[var(--footer-surface)] text-[var(--footer-text)]">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr] lg:gap-12 lg:py-14">
        <div>
          <Link
            href="/"
            className="font-display inline-flex rounded-md text-2xl font-semibold text-white"
          >
            {siteConfig.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--footer-muted)]">
            Brew ni Cat Connect is the customer-facing digital platform project.
            This Phase 1 release provides its web application foundation.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-sm font-bold tracking-[0.12em] text-white uppercase">
            Quick links
          </h2>
          <ul className="mt-4 grid gap-3">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm text-sm text-[var(--footer-muted)] transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="contact-footer-heading">
          <h2
            id="contact-footer-heading"
            className="text-sm font-bold tracking-[0.12em] text-white uppercase"
          >
            Contact
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--footer-muted)]">
            {siteConfig.ownerConfirmationMessage}
          </p>
        </section>

        <section aria-labelledby="social-footer-heading">
          <h2
            id="social-footer-heading"
            className="text-sm font-bold tracking-[0.12em] text-white uppercase"
          >
            Social
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--footer-muted)]">
            {siteConfig.ownerConfirmationMessage}
          </p>
        </section>
      </Container>

      <div className="border-t border-white/10">
        <Container className="py-5 text-xs leading-5 text-[var(--footer-muted)]">
          Brew ni Cat Connect · Phase 1 project foundation
        </Container>
      </div>
    </footer>
  );
}
