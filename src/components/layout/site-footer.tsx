import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "@/components/ui/external-link";
import {
  ClockIcon,
  FacebookIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  TikTokIcon,
} from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import {
  emailHref,
  hoursNotice,
  joinList,
  localityLine,
  phoneHref,
  streetLine,
} from "@/lib/site-content/format";
import type { SiteContent } from "@/lib/site-content/types";

import { Container } from "../ui/container";

const footerLinkClass =
  "inline-flex min-h-11 min-w-11 items-center gap-2 rounded-sm text-sm leading-6 text-[var(--footer-muted)] transition-colors hover:text-[var(--text-strong)]";

// 1rem icons. Beside text that wraps, mt-1 centers one on the first
// 1.5rem line.
const footerIconClass = "size-4 shrink-0";

type SiteFooterProps = Readonly<{
  content: Pick<
    SiteContent,
    "about" | "address" | "contact" | "hours" | "payments" | "social"
  >;
}>;

export function SiteFooter({ content }: SiteFooterProps) {
  const { address, contact, social } = content;
  return (
    <footer className="border-t border-[var(--border-soft)] bg-[var(--footer-surface)] text-[var(--footer-text)]">
      <Container
        data-rise-group=""
        className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.7fr_1.1fr_0.8fr] lg:gap-12 lg:py-16"
      >
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-lg text-[var(--text-strong)]"
          >
            <Image
              src="/images/branding/brew-ni-cat-logo.png"
              width={72}
              height={72}
              alt=""
              className="size-16 object-contain"
            />
            <span className="font-display text-2xl">
              {siteConfig.shortName}
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--footer-muted)]">
            {content.about.footerText}
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="footer-heading">Explore</h2>
          <ul className="mt-2 grid">
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
          <address className="mt-4 grid gap-1 text-sm leading-6 text-[var(--footer-muted)] not-italic">
            <p className="flex gap-2">
              <MapPinIcon className={`mt-1 ${footerIconClass}`} />
              <span>
                {streetLine(address)}
                <br />
                {localityLine(address)}, {address.country}
                {address.landmark ? (
                  <>
                    <br />
                    <span className="text-[var(--text-strong)]">
                      {address.landmark}
                    </span>
                  </>
                ) : null}
              </span>
            </p>
            <a href={phoneHref(contact.phone)} className={footerLinkClass}>
              <PhoneIcon className={footerIconClass} />
              {contact.phone}
            </a>
            <a href={emailHref(contact.email)} className={footerLinkClass}>
              <MailIcon className={footerIconClass} />
              <span className="min-w-0 break-all">{contact.email}</span>
            </a>
          </address>
        </section>

        <section aria-labelledby="social-footer-heading">
          <h2 id="social-footer-heading" className="footer-heading">
            Follow along
          </h2>
          <ul className="mt-2 grid">
            {social.facebook ? (
              <li>
                <ExternalLink
                  href={social.facebook}
                  className={footerLinkClass}
                >
                  <FacebookIcon className={footerIconClass} />
                  Facebook
                </ExternalLink>
              </li>
            ) : null}
            {social.tiktok ? (
              <li>
                <ExternalLink href={social.tiktok} className={footerLinkClass}>
                  <TikTokIcon className={footerIconClass} />
                  TikTok
                </ExternalLink>
              </li>
            ) : null}
          </ul>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-[var(--footer-muted)]">
            <ClockIcon className={`mt-1 ${footerIconClass}`} />
            <span>{hoursNotice(content.hours)}</span>
          </p>
        </section>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs leading-5 text-[var(--footer-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span>{joinList(content.payments.methods)} accepted</span>
        </Container>
      </div>
    </footer>
  );
}
