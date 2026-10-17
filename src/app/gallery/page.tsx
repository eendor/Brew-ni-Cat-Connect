import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/three/ambient-backdrop";
import { GalleryRing } from "@/components/three/gallery-ring";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { galleryImages } from "@/config/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore photos of Brew ni Cat Coffee Shop, its food, café cats, space, and community in Kabacan.",
};

const leadImage = galleryImages[0]!;

export default function GalleryPage() {
  return (
    <>
      <section
        className="relative isolate overflow-hidden border-b border-[var(--border-soft)] bg-[var(--surface-cinema)] text-[var(--text-strong)]"
        aria-labelledby="page-heading"
      >
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_70%_at_85%_40%,rgb(94_225_255_/_10%),transparent_70%)]"
          aria-hidden="true"
        />
        <AmbientBackdrop mood="gallery" />

        <Container className="relative z-10 py-14 sm:py-16 lg:py-24">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link
                  href="/"
                  className="rounded-sm font-bold underline decoration-white/30 underline-offset-4 hover:text-[var(--text-strong)]"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[var(--text-strong)]">
                Gallery
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-end">
            <div className="max-w-3xl fade-up-reveal">
              <p className="eyebrow-light">Life at the shop</p>
              <h1
                id="page-heading"
                className="font-display mt-3 text-5xl leading-[1.02] text-balance sm:text-6xl lg:text-7xl"
              >
                Gallery
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-[var(--text-muted)]">
                A curated look at Brew ni Cat’s café cats, food, welcoming
                spaces, and community moments — newest Facebook favorites first.
              </p>
            </div>

            <figure className="relative overflow-hidden rounded-3xl border border-white/15 shadow-[var(--shadow-cinema)] fade-up-reveal-delay">
              <Image
                src={leadImage.src}
                width={768}
                height={1024}
                alt={leadImage.alt}
                priority
                sizes="(max-width: 1023px) 85vw, 22rem"
                className="aspect-[4/5] w-full object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-12 pb-4 text-sm font-semibold text-[var(--text-strong)]">
                Featured still
              </figcaption>
            </figure>
          </div>

          <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-[var(--text-muted)] backdrop-blur-sm">
            <strong className="block text-[var(--accent-strong)]">
              Fresh from the shop
            </strong>
            Recent photos from Brew ni Cat’s Facebook page sit at the top, with
            earlier favorites kept below for a fuller visit.
          </div>
        </Container>
      </section>

      <div className="pt-10 sm:pt-14">
        <GalleryRing photos={galleryImages} />
      </div>

      <section
        className="cinema-canvas py-12 sm:py-16 lg:py-20"
        aria-label="Brew ni Cat photo gallery"
      >
        <Container>
          <Reveal className="mb-8 border-b border-white/10 pb-5">
            <p className="eyebrow-light">Reel</p>
            <p className="mt-1 font-display text-2xl text-[var(--text-strong)] sm:text-3xl">
              Every frame from the café
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {galleryImages.map((image) => (
              <figure
                key={image.src}
                className="gallery-tile gallery-tile--stagger group"
              >
                <Image
                  src={image.src}
                  width={768}
                  height={1024}
                  alt={image.alt}
                  sizes="(max-width: 639px) 46vw, (max-width: 1023px) 46vw, 31vw"
                />
                <figcaption className="gallery-tile__caption">
                  {image.alt}
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
