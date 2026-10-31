import Image from "next/image";
import Link from "next/link";

import { HomeShowcase } from "@/components/three/home-showcase";
import { visitFacts } from "@/components/three/visit-facts";
import { VisitStage } from "@/components/three/visit-stage";
import { ExternalLink } from "@/components/ui/external-link";
import { Container } from "@/components/ui/container";
import {
  ClockIcon,
  MapPinIcon,
  NavigationIcon,
  StoreIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { getMenuFacts } from "@/lib/menu/load-menu-facts";
import {
  closedLine,
  formatDate,
  homePhotos,
  joinList,
  localityLine,
  openHoursLines,
  shortAddress,
  streetLine,
  townLine,
} from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export default async function HomePage() {
  const [content, menu] = await Promise.all([getSiteContent(), getMenuFacts()]);
  const { about, address, hours } = content;
  const homeGalleryImages = homePhotos(content.gallery);
  const closed = closedLine(hours);

  return (
    <>
      <HomeShowcase
        eyebrow={`${townLine(address)} · Est. ${formatDate(about.openedOn, "month")}`}
        title={about.heroTitle}
        lede={about.heroText}
        prices={menu.showcasePrices}
      />

      <section
        className="relative z-10 -mt-6 pb-10 sm:-mt-8 sm:pb-12"
        aria-label="Visit facts"
      >
        <Container>
          <Reveal>
            <dl className="ios-card grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 sm:border-r sm:border-[var(--separator)] sm:p-6">
                <dt className="eyebrow flex items-center gap-2">
                  <MapPinIcon className="size-4 shrink-0" />
                  Find us
                </dt>
                <dd className="mt-2 font-semibold text-[var(--text-strong)]">
                  {shortAddress(address)}
                </dd>
              </div>
              <div className="border-t border-[var(--separator)] p-5 sm:border-t-0 sm:p-6 lg:border-r lg:border-[var(--separator)]">
                <dt className="eyebrow flex items-center gap-2">
                  <StoreIcon className="size-4 shrink-0" />
                  Landmark
                </dt>
                <dd className="mt-2 font-semibold text-[var(--text-strong)]">
                  {address.landmark || address.area}
                </dd>
              </div>
              <div className="border-t border-[var(--separator)] p-5 sm:border-r sm:border-[var(--separator)] sm:p-6 lg:border-t-0">
                <dt className="eyebrow flex items-center gap-2">
                  <ClockIcon className="size-4 shrink-0" />
                  Hours
                </dt>
                <dd className="mt-2 font-semibold text-[var(--text-strong)]">
                  {openHoursLines(hours).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  {closed ? (
                    <span className="block text-sm font-semibold text-[var(--accent-strong)]">
                      {closed}
                    </span>
                  ) : null}
                  {hours.note ? (
                    <span className="block text-xs font-normal text-[var(--text-muted)]">
                      {hours.note}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="border-t border-[var(--separator)] p-5 sm:border-t-0 sm:p-6">
                <dt className="eyebrow flex items-center gap-2">
                  <WalletIcon className="size-4 shrink-0" />
                  Payment
                </dt>
                <dd className="mt-2 font-semibold text-[var(--text-strong)]">
                  {joinList(content.payments.methods)}
                </dd>
              </div>
            </dl>
          </Reveal>
        </Container>
      </section>

      <section
        className="border-y border-[var(--separator)] bg-[var(--surface-raised)] py-16 text-[var(--text-strong)] sm:py-20 lg:py-24"
        aria-labelledby="about-preview-heading"
      >
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal className="relative mx-auto w-full max-w-[34rem] pb-8 pl-8">
            <div className="about-drama" data-unveil="">
              <Image
                src={about.homePhoto.src}
                width={900}
                height={1125}
                alt={about.homePhoto.alt}
                sizes="(max-width: 1023px) 90vw, 42vw"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 left-0 max-w-56 rounded-[var(--shape-lg)] bg-[var(--accent-strong-fill)] p-5 text-[var(--on-accent)] shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold">Opened</p>
              <p className="font-display mt-1 text-2xl">
                {formatDate(about.openedOn)}
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <h2
              data-split=""
              id="about-preview-heading"
              className="font-display text-4xl text-balance sm:text-5xl"
            >
              {about.homeTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              {about.homeText}
            </p>

            {about.catRules.length > 0 ? (
              <div className="mt-8 glass-panel rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[var(--accent-strong)]">
                  Visiting the Cats
                </h3>
                <ul className="mt-3 grid gap-3 text-sm leading-5 text-[var(--text-muted)] sm:grid-cols-3">
                  {about.catRules.map((rule) => (
                    <li key={rule.title} className="flex flex-col gap-1">
                      <strong className="font-semibold text-[var(--text-strong)]">
                        {rule.title}
                      </strong>
                      <span>{rule.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8">
              <Link href="/about" className="button-primary" data-magnetic="">
                Read about the shop
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <section
        className="py-16 text-[var(--text-strong)] sm:py-20 lg:py-24"
        aria-labelledby="gallery-preview-heading"
      >
        <Container>
          <Reveal className="flex flex-col gap-6 border-b border-[var(--separator)] pb-8 sm:flex-row sm:items-end sm:justify-between">
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
        className="scroll-mt-20 border-t border-[var(--separator)] pt-16 sm:pt-20 lg:scroll-mt-24"
        aria-labelledby="visit-heading"
      >
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              data-split=""
              id="visit-heading"
              className="font-display text-3xl text-[var(--text-strong)] sm:text-4xl lg:text-5xl"
            >
              Find us in {address.town}
            </h2>
            <address
              className="mt-4 flex gap-2 text-base leading-7 text-[var(--text-muted)] not-italic sm:text-lg"
              data-rise=""
            >
              {/* mt-1.5 centers the 1rem pin on the first 1.75rem line. */}
              <MapPinIcon className="mt-1.5 size-4 shrink-0 text-[var(--accent-strong)]" />
              <span>
                {`${streetLine(address)}, ${localityLine(address)}`}
                {address.landmark ? ` · ${address.landmark}` : null}
              </span>
            </address>
          </div>
          <div data-rise="">
            <ExternalLink
              href={address.mapUrl}
              className="button-primary"
              data-magnetic=""
            >
              <NavigationIcon className="size-4.5 shrink-0" />
              Open in Maps
            </ExternalLink>
          </div>
        </Container>
        <VisitStage
          facts={visitFacts(hours, address)}
          className="visit-stage--bleed mt-6"
        />
      </section>
    </>
  );
}
