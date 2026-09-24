import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "@/components/ui/external-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import { homeGalleryImages } from "@/config/gallery";
import { siteConfig } from "@/config/site";

const favorites = [
  {
    name: "Matcha",
    note: "Explore today’s Matcha sizes and options in the current menu.",
    mark: "M",
  },
  {
    name: "Takoyaki",
    note: "See the available Takoyaki counts, flavors, and prices.",
    mark: "T",
  },
  {
    name: "Fries",
    note: "Browse the current Fries sizes and savory flavor choices.",
    mark: "F",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="cinematic-hero" aria-labelledby="home-heading">
        <div className="cinematic-hero__media" aria-hidden="true">
          <Image
            src="/images/shop/photo_030.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="ken-burns object-cover"
          />
        </div>
        <div className="cinematic-hero__overlay" aria-hidden="true" />
        <div className="film-grain" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[85vh] flex-col justify-end gap-10 py-14 lg:min-h-[92vh] lg:justify-center lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl fade-up-reveal">
              <div className="flex items-center gap-4">
                <Image
                  src="/images/branding/brew-ni-cat-logo.png"
                  width={112}
                  height={112}
                  alt="Brew ni Cat Coffee Shop logo"
                  priority
                  className="size-20 object-contain drop-shadow-lg sm:size-24"
                />
                <div>
                  <p className="eyebrow-light">Kabacan, Cotabato</p>
                  <p className="mt-1 text-sm font-bold text-[#e4e6d9]">
                    Local coffee shop · Est. June 2026
                  </p>
                </div>
              </div>
              <h1
                id="home-heading"
                className="font-display mt-8 max-w-4xl text-5xl leading-[0.95] font-semibold tracking-[-0.045em] text-balance text-white sm:text-6xl lg:text-7xl xl:text-8xl"
              >
                Coffee, comfort, and a little cat energy.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-[#d8d7c8] sm:text-xl">
                Settle in at Brew ni Cat for drinks, snacks, noodles, combos,
                and cozy community moments in the heart of Kabacan.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center fade-up-reveal-delay">
                <Link href="/menu" className="button-primary">
                  Browse current menu
                </Link>
                <Link href="/contact" className="button-ghost">
                  Plan your visit
                </Link>
              </div>
            </div>

            <div
              className="relative mx-auto hidden w-full max-w-[18rem] gap-3 sm:grid sm:grid-cols-2 lg:mx-0 fade-up-reveal-delay-2"
              aria-hidden="true"
            >
              <div className="overflow-hidden rounded-2xl border border-white/20 shadow-[var(--shadow-cinema)]">
                <Image
                  src="/images/shop/photo_148.jpg"
                  width={384}
                  height={512}
                  alt=""
                  sizes="140px"
                  className="aspect-[3/4] h-full w-full object-cover"
                />
              </div>
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/20 shadow-[var(--shadow-cinema)]">
                <Image
                  src="/images/shop/photo_153.jpg"
                  width={384}
                  height={512}
                  alt=""
                  sizes="140px"
                  className="aspect-[3/4] h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        className="relative z-10 -mt-6 pb-10 sm:-mt-8 sm:pb-12"
        aria-label="Visit facts"
      >
        <Container>
          <dl className="grid overflow-hidden rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] sm:grid-cols-3">
            <div className="p-5 sm:border-r sm:border-[var(--border-soft)] sm:p-6">
              <dt className="eyebrow">Find us</dt>
              <dd className="mt-2 font-bold text-[var(--text-strong)]">
                Segundo St, Poblacion, Kabacan
              </dd>
            </div>
            <div className="border-t border-[var(--border-soft)] p-5 sm:border-t-0 sm:border-r sm:p-6">
              <dt className="eyebrow">Landmark</dt>
              <dd className="mt-2 font-bold text-[var(--text-strong)]">
                {siteConfig.address.landmark}
              </dd>
            </div>
            <div className="border-t border-[var(--border-soft)] p-5 sm:border-t-0 sm:p-6">
              <dt className="eyebrow">Payment</dt>
              <dd className="mt-2 font-bold text-[var(--text-strong)]">
                Cash and GCash
              </dd>
            </div>
          </dl>
        </Container>
      </section>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="favorites-heading"
      >
        <Container>
          <SectionHeading
            id="favorites-heading"
            eyebrow="Popular at Brew ni Cat"
            title="Familiar favorites worth a closer look."
            description="Matcha, Takoyaki, and Fries are customer-favorite groups. Open the current menu for today’s available options and prices."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {favorites.map((favorite) => (
              <article
                key={favorite.name}
                className="group relative overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-subtle)]"
              >
                <span
                  className="font-display absolute -right-3 -bottom-9 text-[8rem] font-bold leading-none text-[var(--accent-soft)] opacity-50 transition-transform group-hover:-rotate-3"
                  aria-hidden="true"
                >
                  {favorite.mark}
                </span>
                <p className="eyebrow relative">Customer favorite</p>
                <h3 className="font-display relative mt-3 text-3xl font-semibold text-[var(--text-strong)]">
                  {favorite.name}
                </h3>
                <p className="relative mt-3 min-h-14 leading-7 text-[var(--text-muted)]">
                  {favorite.note}
                </p>
                <Link
                  href="/menu"
                  className="relative mt-6 inline-flex min-h-11 items-center rounded-full font-extrabold text-[var(--deep-green)] underline decoration-[var(--warm-gold)] decoration-2 underline-offset-4"
                >
                  Browse the menu
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="bg-[var(--deep-green)] py-16 text-white sm:py-20 lg:py-24"
        aria-labelledby="about-preview-heading"
      >
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <div className="relative mx-auto w-full max-w-[34rem] pb-8 pl-8">
            <div className="about-drama">
              <Image
                src="/images/shop/photo_124.jpg"
                width={900}
                height={1125}
                alt="Brew ni Cat seating area with a cat resting near the window"
                sizes="(max-width: 1023px) 90vw, 42vw"
                className="ken-burns-slow aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 max-w-56 rounded-2xl bg-[var(--warm-gold)] p-5 text-[var(--text-strong)] shadow-xl">
              <p className="text-xs font-extrabold tracking-[0.13em] uppercase">
                Opened
              </p>
              <p className="font-display mt-1 text-2xl font-semibold">
                {siteConfig.openingDate}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#f6cf80] uppercase">
              Meet Brew ni Cat
            </p>
            <h2
              id="about-preview-heading"
              className="font-display mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              A local café with a playful cat-inspired spirit.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#e4e6d9]">
              Brew ni Cat Coffee Shop welcomes the Kabacan community for drinks,
              bites, noodles, combos, and time spent together. The shop’s warm
              spaces and cat-themed personality make every visit distinctly Brew
              ni Cat.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-6 py-3 font-extrabold text-[var(--deep-green)] transition-colors hover:bg-[var(--surface-warm)]"
            >
              Read about the shop
            </Link>
          </div>
        </Container>
      </section>

      <section
        className="cinema-canvas py-16 text-white sm:py-20 lg:py-24"
        aria-labelledby="gallery-preview-heading"
      >
        <Container>
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow-light">Scene · Inside Brew ni Cat</p>
              <h2
                id="gallery-preview-heading"
                className="font-display mt-3 text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
              >
                Coffee, cats, and community.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#d8d7c8] sm:text-lg">
                A glimpse of the food, familiar faces, cozy corners, and cats
                that shape the Brew ni Cat atmosphere.
              </p>
            </div>
            <Link href="/gallery" className="button-ghost shrink-0 self-start">
              View the gallery
            </Link>
          </div>
        </Container>
        <div className="mt-10 pl-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          <div className="film-strip pr-4 sm:pr-6">
            {homeGalleryImages.map((image) => (
              <figure key={image.src} className="film-strip__frame">
                <Image
                  src={image.src}
                  width={image.landscape ? 1024 : 768}
                  height={image.landscape ? 768 : 1024}
                  alt={image.alt}
                  sizes="(max-width: 639px) 72vw, (max-width: 1023px) 42vw, 22rem"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-[var(--border-soft)] bg-[var(--surface-warm)] py-16 sm:py-20"
        aria-labelledby="visit-heading"
      >
        <Container className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="rounded-[2rem] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-subtle)] sm:p-10">
            <p className="eyebrow">Visit Brew ni Cat</p>
            <h2
              id="visit-heading"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-5xl"
            >
              Find your next cozy stop in Kabacan.
            </h2>
            <address className="mt-6 text-lg leading-8 text-[var(--text-muted)] not-italic">
              <strong className="text-[var(--text-strong)]">
                {siteConfig.name}
              </strong>
              <br />
              {siteConfig.address.street}
              <br />
              {siteConfig.address.locality}, {siteConfig.address.country}
              <br />
              {siteConfig.address.landmark}
            </address>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ExternalLink
                href={siteConfig.address.mapUrl}
                className="button-primary"
              >
                Open in Maps
              </ExternalLink>
              <Link href="/contact" className="button-secondary">
                Contact and visit details
              </Link>
            </div>
          </div>
          <aside
            className="rounded-[2rem] bg-[var(--deep-green)] p-7 text-white shadow-[var(--shadow-card)] sm:p-10"
            aria-label="Before you visit"
          >
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#f6cf80] uppercase">
              Before you visit
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold">
              Closed every Sunday.
            </h2>
            <p className="mt-4 leading-7 text-[#e4e6d9]">
              {siteConfig.operations.hoursNotice}
            </p>
            <dl className="mt-7 grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <dt className="text-xs font-extrabold tracking-wide text-[#f6cf80] uppercase">
                  Payment
                </dt>
                <dd className="mt-1 font-bold">Cash · GCash</dd>
              </div>
              <div>
                <dt className="text-xs font-extrabold tracking-wide text-[#f6cf80] uppercase">
                  Takeout
                </dt>
                <dd className="mt-1 font-bold">
                  {siteConfig.operations.takeoutFee}
                </dd>
              </div>
            </dl>
            <ExternalLink
              href={siteConfig.social.facebook}
              className="mt-7 inline-flex min-h-11 items-center rounded-full font-extrabold text-white underline decoration-[#f6cf80] decoration-2 underline-offset-4"
            >
              Check Brew ni Cat on Facebook
            </ExternalLink>
          </aside>
        </Container>
      </section>
    </>
  );
}
