import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "@/components/ui/external-link";
import { siteConfig } from "@/config/site";

import { Container } from "../ui/container";

const footerLinkClass =
  "rounded-sm text-sm leading-6 text-[var(--footer-muted)] transition-colors hover:text-white";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-soft)] bg-[var(--footer-surface)] text-[var(--footer-text)]">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.7fr_1.1fr_0.8fr] lg:gap-12 lg:py-16">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md text-white"
          >
            <Image
              src="/images/branding/brew-ni-cat-logo.png"
              width={72}
              height={72}
              alt=""
              className="size-16 object-contain"
            />
            <span className="font-display text-2xl font-semibold">
              {siteConfig.shortName}
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--footer-muted)]">
            A local coffee shop in Kabacan serving drinks, snacks, noodles, and
            combos with a little cat personality.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="footer-heading">Explore</h2>
          <ul className="mt-4 grid gap-2.5">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="contact-footer-heading">
          <h2 id="contact-footer-heading" className="footer-heading">
            Find us
          </h2>
          <address className="mt-4 grid gap-2.5 text-sm leading-6 text-[var(--footer-muted)] not-italic">
            <p>
              {siteConfig.address.street}
              <br />
              {siteConfig.address.locality}, {siteConfig.address.country}
              <br />
              <span className="text-white">{siteConfig.address.landmark}</span>
            </p>
            <a href={siteConfig.contact.phoneHref} className={footerLinkClass}>
              {siteConfig.contact.phone}
            </a>
            <a
              href={siteConfig.contact.emailHref}
              className={`${footerLinkClass} break-all`}
            >
              {siteConfig.contact.email}
            </a>
          </address>
        </section>

        <section aria-labelledby="social-footer-heading">
          <h2 id="social-footer-heading" className="footer-heading">
            Follow along
          </h2>
          <ul className="mt-4 grid gap-2.5">
            <li>
              <ExternalLink
                href={siteConfig.social.facebook}
                className={footerLinkClass}
              >
                Facebook
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={siteConfig.social.tiktok}
                className={footerLinkClass}
              >
                TikTok
              </ExternalLink>
            </li>
          </ul>
          <p className="mt-5 text-xs leading-5 text-[var(--footer-muted)]">
            {siteConfig.operations.hoursNotice}
          </p>
        </section>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs leading-5 text-[var(--footer-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Brew ni Cat Coffee Shop</span>
          <span>Cash and GCash accepted</span>
        </Container>
      </div>
    </footer>
  );
}
