import type { Metadata } from "next";
import Image from "next/image";

import { GalleryRing } from "@/components/three/gallery-ring";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/config/site";
import { ringPhotos } from "@/lib/site-content/format";
import { getSiteContent } from "@/lib/site-content/load";

export async function generateMetadata(): Promise<Metadata> {
  const { address } = await getSiteContent();
  return {
    title: "Gallery",
    description: `Explore photos of ${siteConfig.name}, its food, café cats, space, and community in ${address.town}.`,
  };
}

export default async function GalleryPage() {
  const { gallery } = await getSiteContent();
  const galleryImages = gallery.photos;

  return (
    <>
      <PageIntro
        mood="gallery"
        eyebrow="Life at the shop"
        title="Gallery"
        description={
          <p>
            A curated look at Brew ni Cat’s café cats, food, welcoming spaces,
            and community moments, newest Facebook favorites first.
          </p>
        }
      />

      <GalleryRing photos={ringPhotos(gallery)} />

      <section
        className="cinema-canvas py-12 sm:py-16 lg:py-20"
        aria-label="Brew ni Cat photo gallery"
      >
        <Container>
          <Reveal className="mb-8 border-b border-[var(--border-soft)] pb-5">
            <p className="eyebrow-light">Reel</p>
            <h2 className="mt-1 font-display text-2xl text-[var(--text-strong)] sm:text-3xl">
              Every frame from the café
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {galleryImages.map((image, index) => (
              <figure
                key={image.src}
                className="gallery-tile group"
                data-unveil=""
              >
                <Image
                  src={image.src}
                  width={768}
                  height={1024}
                  alt={image.alt}
                  priority={index < 2}
                  sizes="(max-width: 1023px) 46vw, 31vw"
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
