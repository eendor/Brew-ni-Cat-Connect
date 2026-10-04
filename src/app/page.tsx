import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "@/components/ui/external-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { homeGalleryImages } from "@/config/gallery";
import { siteConfig } from "@/config/site";

const favorites = [
  {
    name: "Matcha",
    nickname: "The Lucky Green Neko",
    price: "From ₱49",
    note: "Creamy iced matcha handcrafted with rich green tea, fresh milk, and sweet caramel accents.",
    image: "/images/shop/photo_148.jpg",
    alt: "Iced salted caramel matcha served at Brew ni Cat",
  },
  {
    name: "Takoyaki",
    nickname: "Pawsome Balls",
    price: "From ₱40",
    note: "Golden Japanese-style savory takoyaki balls drizzled with sweet-savory sauce, Japanese mayo, and bonito flakes.",
    image: "/images/menu/bites.jpg",
    alt: "Freshly prepared savory takoyaki balls with sauce",
  },
  {
    name: "Fries",
    nickname: "Cat Claws",
    price: "From ₱30",
    note: "Crispy shoestring fries seasoned in cheese, sour cream, barbecue, or spicy flavoring.",
    image: "/images/menu/combo.jpg",
    alt: "Golden crispy seasoned fries served in a basket",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="cinematic-hero" aria-labelledby="home-heading">
        <div className="cinematic-hero__media" aria-hidden="true">
          <Image
            src="/images/shop/photo_148.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="ken-burns object-cover"
          />
        </div>
        <div className="cinematic-hero__overlay" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[85vh] flex-col justify-end gap-10 py-14 lg:min-h-[92vh] lg:justify-center lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl fade-up-reveal">
              <p className="eyebrow-light">
                Kabacan, Cotabato · Est. June 2026
              </p>
              <h1
                id="home-heading"
                className="font-display mt-5 max-w-4xl text-5xl leading-[0.95] font-semibold tracking-[-0.025em] text-balance text-white sm:text-6xl lg:text-7xl xl:text-8xl"
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
                  src="/images/shop/photo_152.jpg"
                  width={384}
                  height={512}
                  alt=""
                  sizes="140px"
                  className="aspect-[3/4] h-full w-full object-cover"
                />
              </div>
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/20 shadow-[var(--shadow-cinema)]">
                <Image
                  src="/images/shop/photo_004.jpg"
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
          <Reveal>
            <dl className="grid overflow-hidden rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 sm:border-r sm:border-[var(--border-soft)] sm:p-6">
                <dt className="eyebrow">Find us</dt>
                <dd className="mt-2 font-bold text-[var(--text-strong)]">
                  Segundo St, Poblacion, Kabacan
                </dd>
              </div>
              <div className="border-t border-[var(--border-soft)] p-5 sm:border-t-0 lg:border-r lg:border-[var(--border-soft)] sm:p-6">
                <dt className="eyebrow">Landmark</dt>
                <dd className="mt-2 font-bold text-[var(--text-strong)]">
                  {siteConfig.address.landmark}
                </dd>
              </div>
              <div className="border-t border-[var(--border-soft)] p-5 sm:border-r sm:border-[var(--border-soft)] lg:border-t-0 sm:p-6">
                <dt className="eyebrow">Hours</dt>
                <dd className="mt-2 font-bold text-[var(--text-strong)]">
                  <span>Mon–Sat</span>
                  <span className="ml-1 text-sm font-semibold text-[var(--accent-strong)]">
                    · Closed every Sunday
                  </span>
                  <span className="block text-xs font-normal text-[var(--text-muted)]">
                    Hours vary · check Facebook
                  </span>
                </dd>
              </div>
              <div className="border-t border-[var(--border-soft)] p-5 sm:border-t-0 sm:p-6">
                <dt className="eyebrow">Payment</dt>
                <dd className="mt-2 font-bold text-[var(--text-strong)]">
                  Cash and GCash
                </dd>
              </div>
            </dl>
          </Reveal>
        </Container>
      </section>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="favorites-heading"
      >
        <Container>
          <Reveal>
            <SectionHeading
              id="favorites-heading"
              eyebrow="Popular at Brew ni Cat"
              title="Familiar favorites worth a closer look."
              description="Matcha, Takoyaki, and Fries are customer-favorite groups. Open the current menu for today’s available options and prices."
            />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {favorites.map((favorite, index) => (
              <Reveal key={favorite.name} delayMs={index * 90}>
                <article className="group surface-lift flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-[var(--shadow-subtle)]">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--surface-warm)]">
                    <Image
                      src={favorite.image}
                      alt={favorite.alt}
                      fill
                      sizes="(max-width: 767px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-[var(--ease-cinematic)] group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 rounded-full border border-black/10 bg-[var(--surface-card)]/95 px-3 py-1 text-xs font-extrabold text-[var(--deep-green)] backdrop-blur-sm shadow-sm">
                      {favorite.price}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-xs font-semibold text-[var(--warm-gold)]">
                      {favorite.nickname}
                    </span>
                    <h3 className="font-display mt-1 text-2xl font-semibold text-[var(--text-strong)]">
                      {favorite.name}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-[var(--text-muted)]">
                      {favorite.note}
                    </p>
                    <div className="mt-6 pt-4 border-t border-[var(--border-soft)]/60">
                      <Link
                        href="/menu"
                        className="inline-flex min-h-11 items-center font-extrabold text-[var(--deep-green)] underline decoration-[var(--warm-gold)] decoration-2 underline-offset-4 hover:text-[var(--deep-green-hover)]"
                      >
                        Browse the menu
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="bg-[var(--deep-green)] py-16 text-white sm:py-20 lg:py-24"
        aria-labelledby="about-preview-heading"
      >
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal className="relative mx-auto w-full max-w-[34rem] pb-8 pl-8">
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
          </Reveal>
          <Reveal delayMs={120}>
            <h2
              id="about-preview-heading"
              className="font-display text-4xl font-semibold tracking-[-0.025em] text-balance sm:text-5xl"
            >
              A local café with a playful cat-inspired spirit.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#e4e6d9]">
              Brew ni Cat Coffee Shop welcomes the Kabacan community for drinks,
              bites, noodles, combos, and time spent together. The shop’s warm
              spaces and cat-themed personality make every visit distinctly Brew
              ni Cat.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-extrabold tracking-wider text-[#f6cf80] uppercase">
                Visiting the Cats
              </h3>
              <ul className="mt-3 grid gap-3 text-xs leading-5 text-[#e4e6d9] sm:grid-cols-3">
                <li className="flex flex-col gap-1">
                  <strong className="text-white font-semibold">
                    No entrance fee
                  </strong>
                  <span>Cats roam freely; enjoy with any food or drink.</span>
                </li>
                <li className="flex flex-col gap-1">
                  <strong className="text-white font-semibold">
                    Gentle paws welcome
                  </strong>
                  <span>Approach resting cats calmly, and pet with care.</span>
                </li>
                <li className="flex flex-col gap-1">
                  <strong className="text-white font-semibold">
                    Clean cuddles
                  </strong>
                  <span>
                    Please use our sanitizing stations before and after petting.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/about"
                className="inline-flex min-h-12 items-center rounded-full bg-white px-6 py-3 font-extrabold text-[var(--deep-green)] transition-colors hover:bg-[var(--surface-warm)]"
              >
                Read about the shop
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <section
        className="bg-[#122822] py-16 text-white sm:py-20 lg:py-24"
        aria-labelledby="gallery-preview-heading"
      >
        <Container>
          <Reveal className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2
                id="gallery-preview-heading"
                className="font-display text-4xl font-semibold tracking-[-0.025em] text-balance sm:text-5xl"
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
          </Reveal>
        </Container>
        <div
          className="film-reel mt-10"
          role="region"
          aria-label="Featured café photos gallery"
          tabIndex={0}
        >
          <div className="film-reel__track">
            {[...homeGalleryImages, ...homeGalleryImages].map(
              (image, index) => (
                <figure
                  key={`${image.src}-${index}`}
                  className="film-reel__frame"
                  aria-hidden={index >= homeGalleryImages.length}
                >
                  <Image
                    src={image.src}
                    width={image.landscape ? 1024 : 768}
                    height={image.landscape ? 768 : 1024}
                    alt={index >= homeGalleryImages.length ? "" : image.alt}
                    sizes="(max-width: 639px) 70vw, (max-width: 1023px) 40vw, 21rem"
                  />
                </figure>
              ),
            )}
          </div>
          <div className="film-reel__static">
            {homeGalleryImages.map((image) => (
              <figure key={`static-${image.src}`} className="film-reel__frame">
                <Image
                  src={image.src}
                  width={image.landscape ? 1024 : 768}
                  height={image.landscape ? 768 : 1024}
                  alt={image.alt}
                  sizes="(max-width: 639px) 46vw, 31vw"
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
        <Container>
          <Reveal className="depth-card rounded-[1.75rem] p-6 sm:p-9">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div>
                <h2
                  id="visit-heading"
                  className="font-display text-3xl font-semibold text-[var(--text-strong)] sm:text-4xl"
                >
                  Find us in Kabacan
                </h2>
                <address className="mt-5 text-base leading-7 text-[var(--text-muted)] not-italic sm:text-lg sm:leading-8">
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
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
                className="glass-panel rounded-[1.25rem] border-[var(--notice-border)] bg-[var(--notice-surface)] p-5 sm:p-6"
                aria-label="Before you visit"
              >
                <p className="text-xs font-bold tracking-[0.12em] text-[var(--notice-text)] uppercase">
                  Hours &amp; Schedule
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                  Closed every Sunday.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--notice-text)]">
                  {siteConfig.operations.hoursNotice}
                </p>
                <dl className="mt-5 grid gap-3 border-t border-[var(--notice-border)] pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-[var(--text-subtle)] uppercase">
                      Payment
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-strong)]">
                      Cash · GCash
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-[var(--text-subtle)] uppercase">
                      Takeout
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-strong)]">
                      {siteConfig.operations.takeoutFee}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-xl border border-[var(--notice-border)] bg-white/70 p-3.5 text-xs leading-5 text-[var(--notice-text)]">
                  <strong className="block font-bold text-[var(--text-strong)]">
                    Local delivery in Kabacan:
                  </strong>
                  <span>
                    Orders can be picked up for takeout or arranged with
                    independent local riders (such as Papa&apos;s Delivery).
                  </span>
                </div>
                <ExternalLink
                  href={siteConfig.social.facebook}
                  className="mt-5 inline-flex min-h-10 items-center text-sm font-bold text-[var(--deep-green)] underline decoration-[var(--border-strong)] underline-offset-4"
                >
                  Check Facebook for today’s hours
                </ExternalLink>
              </aside>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
