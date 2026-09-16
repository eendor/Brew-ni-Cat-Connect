import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageIntro } from "@/components/ui/page-intro";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact and Location",
  description:
    "Find Brew ni Cat Coffee Shop on Segundo St in Poblacion, Kabacan, beside Pulido Eatery, and view current contact details.",
};

const contactCards = [
  {
    label: "Call or text",
    value: siteConfig.contact.phone,
    href: siteConfig.contact.phoneHref,
  },
  {
    label: "Email",
    value: siteConfig.contact.email,
    href: siteConfig.contact.emailHref,
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Plan your visit"
        title="Contact & location"
        description={
          <p>
            Find Brew ni Cat in Poblacion, Kabacan, get in touch, and check the
            latest shop schedule before visiting.
          </p>
        }
        aside={
          <ExternalLink
            href={siteConfig.address.mapUrl}
            className="button-primary"
          >
            Open location in Maps
          </ExternalLink>
        }
      />

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="location-heading"
      >
        <Container className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-subtle)] sm:p-10">
            <p className="eyebrow">Where to find us</p>
            <h2
              id="location-heading"
              className="font-display mt-3 text-4xl font-semibold text-[var(--text-strong)] sm:text-5xl"
            >
              Brew ni Cat Coffee Shop
            </h2>
            <address className="mt-6 text-lg leading-8 text-[var(--text-muted)] not-italic">
              {siteConfig.address.street}
              <br />
              {siteConfig.address.locality}
              <br />
              {siteConfig.address.country}
              <br />
              <strong className="mt-2 inline-block text-[var(--deep-green)]">
                {siteConfig.address.landmark}
              </strong>
            </address>
            <ExternalLink
              href={siteConfig.address.mapUrl}
              className="button-secondary mt-8"
            >
              Get directions
            </ExternalLink>
          </div>

          <aside
            className="rounded-[2rem] bg-[var(--deep-green)] p-7 text-white shadow-[var(--shadow-card)] sm:p-10"
            aria-labelledby="hours-heading"
          >
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#f6cf80] uppercase">
              Today’s schedule
            </p>
            <h2
              id="hours-heading"
              className="font-display mt-3 text-4xl font-semibold"
            >
              Hours may vary.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#e4e6d9]">
              {siteConfig.operations.hoursNotice}
            </p>
            <ExternalLink
              href={siteConfig.social.facebook}
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 font-extrabold text-[var(--deep-green)] transition-colors hover:bg-[var(--surface-warm)]"
            >
              Check Facebook
            </ExternalLink>
          </aside>
        </Container>
      </section>

      <section
        className="border-y border-[var(--border-soft)] bg-[var(--surface-green)] py-16 sm:py-20"
        aria-labelledby="contact-heading"
      >
        <Container>
          <div className="max-w-2xl">
            <p className="eyebrow">Get in touch</p>
            <h2
              id="contact-heading"
              className="font-display mt-3 text-4xl font-semibold text-[var(--text-strong)] sm:text-5xl"
            >
              Contact Brew ni Cat directly.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {contactCards.map((contact) => (
              <a
                key={contact.label}
                href={contact.href}
                className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-subtle)] transition-transform hover:-translate-y-0.5"
              >
                <span className="eyebrow">{contact.label}</span>
                <span className="mt-3 block break-words text-lg font-extrabold text-[var(--deep-green)] sm:text-xl">
                  {contact.value}
                </span>
              </a>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8">
            <h3 className="font-display text-2xl font-semibold text-[var(--text-strong)]">
              Follow Brew ni Cat
            </h3>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ExternalLink
                href={siteConfig.social.facebook}
                className="button-secondary"
              >
                Facebook page
              </ExternalLink>
              <ExternalLink
                href={siteConfig.social.facebookPhotos}
                className="button-secondary"
              >
                Facebook photos
              </ExternalLink>
              <ExternalLink
                href={siteConfig.social.tiktok}
                className="button-secondary"
              >
                TikTok
              </ExternalLink>
            </div>
          </div>
        </Container>
      </section>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="visit-details-heading"
      >
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-subtle)]">
              <p className="eyebrow">At the shop</p>
              <h2
                id="visit-details-heading"
                className="font-display mt-3 text-3xl font-semibold text-[var(--text-strong)]"
              >
                Payment & takeout
              </h2>
              <dl className="mt-6 grid gap-4">
                <div>
                  <dt className="text-sm font-bold text-[var(--text-subtle)]">
                    Payment methods
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold text-[var(--text-strong)]">
                    Cash · GCash
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-[var(--text-subtle)]">
                    Takeout packaging
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold text-[var(--text-strong)]">
                    {siteConfig.operations.takeoutFee}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-subtle)] lg:col-span-2">
              <p className="eyebrow">External rider pickup</p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-[var(--text-strong)]">
                Arrange your preferred rider separately.
              </h2>
              <ol className="mt-5 grid gap-3 text-[var(--text-muted)] sm:grid-cols-3">
                <li className="rounded-xl bg-[var(--surface-warm)] p-4">
                  <strong className="block text-[var(--text-strong)]">
                    1. Arrange your order
                  </strong>
                  Contact Brew ni Cat directly.
                </li>
                <li className="rounded-xl bg-[var(--surface-warm)] p-4">
                  <strong className="block text-[var(--text-strong)]">
                    2. Book a rider
                  </strong>
                  Choose and contact an external rider yourself.
                </li>
                <li className="rounded-xl bg-[var(--surface-warm)] p-4">
                  <strong className="block text-[var(--text-strong)]">
                    3. Rider pickup
                  </strong>
                  The rider collects the prepared order at the shop.
                </li>
              </ol>
              <p className="mt-5 leading-7 text-[var(--text-muted)]">
                Rider availability, delivery fees, arrival time, and rider
                payment are separate from Brew ni Cat. The ₱10 takeout box fee
                does not include any rider charge.
              </p>
              <div
                className="mt-6 flex flex-wrap gap-3"
                aria-label="External rider pages"
              >
                {siteConfig.externalRiders.map((riderUrl, index) => (
                  <ExternalLink
                    key={riderUrl}
                    href={riderUrl}
                    className="button-secondary"
                  >
                    External rider page {index + 1}
                  </ExternalLink>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Looking for the current menu?{" "}
            <Link
              href="/menu"
              className="font-extrabold text-[var(--deep-green)] underline underline-offset-4"
            >
              Browse it here.
            </Link>
          </p>
        </Container>
      </section>
    </>
  );
}
