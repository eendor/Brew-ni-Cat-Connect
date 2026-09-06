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
      <section className="page-hero" aria-labelledby="home-heading">
        <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <Image
                src="/images/branding/brew-ni-cat-logo.png"
                width={112}
                height={112}
                alt="Brew ni Cat Coffee Shop logo"
                priority
                className="size-24 object-contain sm:size-28"
              />
              <div>
                <p className="eyebrow">Kabacan, Cotabato</p>
                <p className="mt-1 text-sm font-bold text-[var(--deep-green)]">
                  Local coffee shop · Est. June 2026
                </p>
              </div>
            </div>
            <h1
              id="home-heading"
              className="font-display mt-7 max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-[var(--text-strong)] sm:text-6xl lg:text-7xl"
            >
              Coffee, comfort, and a little cat energy.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-pretty text-[var(--text-muted)] sm:text-xl">
              Settle in at Brew ni Cat for drinks, snacks, noodles, combos, and
              cozy community moments in the heart of Kabacan.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/menu" className="button-primary">
                Browse current menu
              </Link>
              <Link href="/contact" className="button-secondary">
                Plan your visit
              </Link>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-[34rem] grid-cols-5 grid-rows-5 gap-3 lg:mx-0">
            <div className="col-span-3 row-span-5 overflow-hidden rounded-[2rem] border-4 border-[var(--surface-card)] bg-[var(--surface-warm)] shadow-[var(--shadow-card)]">
              <Image
                src="/images/shop/photo_030.jpg"
                width={768}
                height={1024}
                alt="Customers gathered around drinks and snacks inside Brew ni Cat"
                priority
                sizes="(max-width: 1023px) 58vw, 29vw"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="col-span-2 row-span-3 mt-7 overflow-hidden rounded-[1.5rem] border-4 border-[var(--surface-card)] bg-[var(--surface-warm)] shadow-[var(--shadow-card)]">
              <Image
                src="/images/shop/photo_004.jpg"
                width={768}
                height={1024}
                alt="Cats resting on a café table beneath blue evening lights at Brew ni Cat"
                priority
                sizes="(max-width: 1023px) 38vw, 19vw"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="col-span-2 row-span-2 overflow-hidden rounded-[1.5rem] border-4 border-[var(--surface-card)] bg-[var(--surface-warm)] shadow-[var(--shadow-card)]">
              <Image
                src="/images/shop/photo_011.jpg"
                width={768}
                height={1024}
                alt="Spicy noodles served with a fried egg and seaweed at Brew ni Cat"
                sizes="(max-width: 1023px) 38vw, 19vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Container>

        <Container className="pb-10 sm:pb-12">
          <dl className="grid overflow-hidden rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-[var(--shadow-subtle)] sm:grid-cols-3">
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
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div className="relative mx-auto w-full max-w-[30rem] pb-8 pl-8">
            <Image
              src="/images/shop/photo_124.jpg"
              width={768}
              height={1024}
              alt="Brew ni Cat seating area with a cat resting near the window"
              sizes="(max-width: 1023px) 85vw, 38vw"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl"
            />
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
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="gallery-preview-heading"
      >
        <Container>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              id="gallery-preview-heading"
              eyebrow="Inside Brew ni Cat"
              title="Coffee, cats, and community."
              description="A glimpse of the food, familiar faces, cozy corners, and cats that shape the Brew ni Cat atmosphere."
            />
            <Link
              href="/gallery"
              className="button-secondary shrink-0 self-start sm:self-auto"
            >
              View the gallery
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {homeGalleryImages.map((image, index) => (
              <figure
                key={image.src}
                className={`overflow-hidden rounded-[1.25rem] bg-[var(--surface-warm)] ${
                  index === 0 || index === 5 ? "sm:col-span-2" : ""
                }`}
              >
                <Image
                  src={image.src}
                  width={image.landscape ? 1024 : 768}
                  height={image.landscape ? 768 : 1024}
                  alt={image.alt}
                  sizes="(max-width: 639px) 46vw, (max-width: 1023px) 23vw, 260px"
                  className="aspect-[4/5] h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </figure>
            ))}
          </div>
        </Container>
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
              Today’s hours can change.
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
