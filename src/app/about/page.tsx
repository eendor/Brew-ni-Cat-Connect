import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Get to know Brew ni Cat Coffee Shop, a local cat-inspired café in Kabacan, Cotabato, opened June 12, 2026.",
};

const shopDetails = [
  {
    label: "Opened",
    value: siteConfig.openingDate,
  },
  {
    label: "Community",
    value: "Kabacan, Cotabato",
  },
  {
    label: "On the menu",
    value: "Drinks, snacks, noodles, and combos",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="Our local café"
        title="About Brew ni Cat"
        description={
          <p>
            Brew ni Cat Coffee Shop is a local Kabacan café with warm spaces, a
            playful cat-inspired personality, and a menu made for everyday
            catch-ups and snack breaks.
          </p>
        }
      />

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="story-heading"
      >
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div className="grid grid-cols-5 grid-rows-5 gap-3">
            <Image
              src="/images/shop/photo_145.jpg"
              width={768}
              height={1024}
              alt="Two people wearing Brew ni Cat aprons at the service counter"
              priority
              sizes="(max-width: 1023px) 55vw, 32vw"
              className="col-span-3 row-span-5 h-full w-full rounded-[2rem] object-cover shadow-[var(--shadow-card)]"
            />
            <Image
              src="/images/shop/photo_009.jpg"
              width={768}
              height={1024}
              alt="Siamese cat in front of the café’s leafy interior wall"
              sizes="(max-width: 1023px) 36vw, 18vw"
              className="col-span-2 row-span-3 mt-6 h-full w-full rounded-[1.5rem] object-cover shadow-[var(--shadow-subtle)]"
            />
            <Image
              src="/images/shop/photo_063.jpg"
              width={768}
              height={1024}
              alt="Customer holding a green drink beside Brew ni Cat’s wall logo"
              sizes="(max-width: 1023px) 36vw, 18vw"
              className="col-span-2 row-span-2 h-full w-full rounded-[1.5rem] object-cover shadow-[var(--shadow-subtle)]"
            />
          </div>

          <div>
            <SectionHeading
              id="story-heading"
              eyebrow="A place to pause"
              title="Rooted in Kabacan, shaped by its community."
            />
            <div className="mt-6 grid gap-5 text-base leading-8 text-[var(--text-muted)] sm:text-lg">
              <p>
                Brew ni Cat opened on {siteConfig.openingDate} in Poblacion,
                Kabacan. The shop serves drinks, snacks, noodles, combos, and
                cat-themed menu choices in a relaxed local café setting.
              </p>
              <p>
                Its public website supports the business’s digitalization by
                making current menu and visit information easier to find. The
                café experience itself remains simple: come by, choose something
                from the menu, and enjoy the shop’s cozy character.
              </p>
            </div>
            <Link href="/gallery" className="button-secondary mt-8">
              See life at the shop
            </Link>
          </div>
        </Container>
      </section>

      <section
        className="border-y border-[var(--border-soft)] bg-[var(--surface-green)] py-14 sm:py-16"
        aria-label="Brew ni Cat facts"
      >
        <Container>
          <dl className="grid gap-4 md:grid-cols-3">
            {shopDetails.map((detail) => (
              <div
                key={detail.label}
                className="rounded-[1.5rem] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-subtle)]"
              >
                <dt className="eyebrow">{detail.label}</dt>
                <dd className="font-display mt-3 text-2xl font-semibold text-[var(--text-strong)]">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="about-visit-heading">
        <Container className="rounded-[2rem] bg-[var(--deep-green)] p-7 text-white sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#f6cf80] uppercase">
              Come say hello
            </p>
            <h2
              id="about-visit-heading"
              className="font-display mt-3 text-3xl font-semibold sm:text-4xl"
            >
              Visit Brew ni Cat in Poblacion, Kabacan.
            </h2>
            <p className="mt-3 leading-7 text-[#e4e6d9]">
              Operating hours can vary, so check Facebook or contact the shop
              before making the trip.
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-7 inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 font-extrabold text-[var(--deep-green)] hover:bg-[var(--surface-warm)] lg:mt-0"
          >
            Get visit details
          </Link>
        </Container>
      </section>
    </>
  );
}
