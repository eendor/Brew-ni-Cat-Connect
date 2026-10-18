import Image from "next/image";
import Link from "next/link";

import { HomeShowcase } from "@/components/three/home-showcase";
import { visitFacts } from "@/components/three/visit-facts";
import { VisitStage } from "@/components/three/visit-stage";
import { ExternalLink } from "@/components/ui/external-link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { homeGalleryImages } from "@/config/gallery";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <>
      <HomeShowcase />

      <section
        className="relative z-10 -mt-6 pb-10 sm:-mt-8 sm:pb-12"
        aria-label="Visit facts"
      >
        <Container>
          <Reveal>
            <dl className="grid overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
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
                    11 AM – 10 PM · check Facebook for changes
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
        className="border-y border-[var(--border-soft)] bg-[var(--surface-raised)] py-16 text-[var(--text-strong)] sm:py-20 lg:py-24"
        aria-labelledby="about-preview-heading"
      >
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal className="relative mx-auto w-full max-w-[34rem] pb-8 pl-8">
            <div className="about-drama" data-unveil="">
              <Image
                src="/images/shop/photo_124.jpg"
                width={900}
                height={1125}
                alt="Brew ni Cat seating area with a cat resting near the window"
                sizes="(max-width: 1023px) 90vw, 42vw"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 max-w-56 rounded-2xl bg-[var(--accent-strong)] p-5 text-[var(--on-accent)] shadow-xl">
              <p className="text-xs font-extrabold tracking-[0.13em] uppercase">
                Opened
              </p>
              <p className="font-display mt-1 text-2xl">
                {siteConfig.openingDate}
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <h2
              data-split=""
              id="about-preview-heading"
              className="font-display text-4xl text-balance sm:text-5xl"
            >
              A local café with a playful cat-inspired spirit.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              Brew ni Cat Coffee Shop welcomes the Kabacan community for drinks,
              bites, noodles, combos, and time spent together. The shop’s warm
              spaces and cat-themed personality make every visit distinctly Brew
              ni Cat.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-extrabold tracking-wider text-[var(--accent-strong)] uppercase">
                Visiting the Cats
              </h3>
              <ul className="mt-3 grid gap-3 text-xs leading-5 text-[var(--text-muted)] sm:grid-cols-3">
                <li className="flex flex-col gap-1">
                  <strong className="font-semibold text-[var(--text-strong)]">
                    No entrance fee
                  </strong>
                  <span>Cats roam freely; enjoy with any food or drink.</span>
                </li>
                <li className="flex flex-col gap-1">
                  <strong className="font-semibold text-[var(--text-strong)]">
                    Gentle paws welcome
                  </strong>
                  <span>Approach resting cats calmly, and pet with care.</span>
                </li>
                <li className="flex flex-col gap-1">
                  <strong className="font-semibold text-[var(--text-strong)]">
                    Clean cuddles
                  </strong>
                  <span>
                    Please use our sanitizing stations before and after petting.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/about" className="button-primary" data-magnetic="">
                Read about the shop
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <section
        className="bg-[var(--surface-canvas)] py-16 text-[var(--text-strong)] sm:py-20 lg:py-24"
        aria-labelledby="gallery-preview-heading"
      >
        <Container>
          <Reveal className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2
                data-split=""
                id="gallery-preview-heading"
                className="font-display text-4xl text-balance sm:text-5xl"
              >
                Coffee, cats, and community.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                A glimpse of the drinks, familiar faces, cozy corners, and cats
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
        id="visit"
        className="scroll-mt-20 border-t border-[var(--border-soft)] pt-16 sm:pt-20 lg:scroll-mt-24"
        aria-labelledby="visit-heading"
      >
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              data-split=""
              id="visit-heading"
              className="font-display text-3xl text-[var(--text-strong)] sm:text-4xl lg:text-5xl"
            >
              Find us in Kabacan
            </h2>
            <address
              className="mt-4 text-base leading-7 text-[var(--text-muted)] not-italic sm:text-lg"
              data-rise=""
            >
              {`${siteConfig.address.street}, ${siteConfig.address.locality} · ${siteConfig.address.landmark}`}
            </address>
          </div>
          <div data-rise="">
            <ExternalLink
              href={siteConfig.address.mapUrl}
              className="button-primary"
              data-magnetic=""
            >
              Open in Maps
            </ExternalLink>
          </div>
        </Container>
        <VisitStage facts={visitFacts} className="visit-stage--bleed mt-6" />
      </section>
    </>
  );
}
