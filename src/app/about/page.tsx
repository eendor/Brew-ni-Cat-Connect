import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig } from "@/config/site";
import { formatDate, hoursNotice, townLine } from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export async function generateMetadata(): Promise<Metadata> {
  const { about, address } = await getSiteContent();
  return {
    title: "About",
    description: `Get to know ${siteConfig.name}, a local cat-inspired café in ${townLine(address)}, opened ${formatDate(about.openedOn)}.`,
  };
}

/** The About collage's three frames, biggest first. */
const COLLAGE = [
  {
    frame:
      "col-span-3 row-span-5 overflow-hidden rounded-[2rem] shadow-[var(--shadow-card)]",
    sizes: "(max-width: 1023px) 55vw, 32vw",
  },
  {
    frame:
      "col-span-2 row-span-3 mt-6 overflow-hidden rounded-3xl shadow-[var(--shadow-subtle)]",
    sizes: "(max-width: 1023px) 36vw, 18vw",
  },
  {
    frame:
      "col-span-2 row-span-2 overflow-hidden rounded-3xl shadow-[var(--shadow-subtle)]",
    sizes: "(max-width: 1023px) 36vw, 18vw",
  },
] as const;

export default async function AboutPage() {
  const { about, address, hours } = await getSiteContent();
  const shopDetails = [
    { label: "Opened", value: formatDate(about.openedOn) },
    { label: "Community", value: townLine(address) },
    { label: "On the menu", value: about.menuSummary },
  ];

  return (
    <>
      <PageIntro
        mood="about"
        eyebrow="Our local café"
        title="About Brew ni Cat"
        description={<p>{about.intro}</p>}
      />

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="story-heading"
      >
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div className="grid grid-cols-5 grid-rows-5 gap-3">
            {about.photos.slice(0, COLLAGE.length).map((photo, index) => (
              <div
                key={photo.src}
                className={COLLAGE[index]?.frame}
                data-unveil=""
              >
                <Image
                  src={photo.src}
                  width={768}
                  height={1024}
                  alt={photo.alt}
                  priority={index === 0}
                  sizes={COLLAGE[index]?.sizes}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          <Reveal delayMs={100}>
            <SectionHeading
              id="story-heading"
              eyebrow="A place to pause"
              title={about.storyTitle}
            />
            <div className="mt-6 grid gap-5 text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              {about.story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link href="/gallery" className="button-secondary mt-8">
              See life at the shop
            </Link>
          </Reveal>
        </Container>
      </section>

      <section
        className="border-y border-[var(--border-soft)] bg-[var(--surface-accent)] py-14 sm:py-16"
        aria-label="Brew ni Cat facts"
      >
        <Container>
          <div className="grid gap-4 md:grid-cols-3" data-rise-group="">
            {shopDetails.map((detail) => (
              <div key={detail.label}>
                <div className="surface-lift h-full rounded-3xl bg-[var(--surface-card)] p-6 shadow-[var(--shadow-subtle)]">
                  <p className="eyebrow">{detail.label}</p>
                  <p className="font-display mt-3 text-2xl text-[var(--text-strong)]">
                    {detail.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="about-visit-heading">
        <Container>
          <Reveal className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-7 text-[var(--text-strong)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
                Come say hello
              </p>
              <h2
                data-split=""
                id="about-visit-heading"
                className="font-display mt-3 text-3xl sm:text-4xl"
              >
                Visit {siteConfig.shortName} in {address.area}, {address.town}.
              </h2>
              <p className="mt-3 leading-7 text-[var(--text-muted)]">
                {hoursNotice(hours)}
              </p>
            </div>
            <Link
              href="/contact"
              className="button-primary mt-7 shrink-0 lg:mt-0"
              data-magnetic=""
            >
              Get visit details
            </Link>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
