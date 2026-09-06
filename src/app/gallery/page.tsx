import type { Metadata } from "next";
import Image from "next/image";

import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/ui/page-intro";
import { galleryImages } from "@/config/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore approved photos of Brew ni Cat Coffee Shop, its food, café cats, space, and community in Kabacan.",
};

export default function GalleryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Life at the shop"
        title="Gallery"
        description={
          <p>
            A curated look at Brew ni Cat’s café cats, food, welcoming spaces,
            and community moments.
          </p>
        }
        aside={
          <div className="max-w-xs rounded-2xl bg-[var(--deep-green)] p-5 text-sm leading-6 text-white shadow-[var(--shadow-subtle)]">
            <strong className="block text-[#f6cf80]">A small first look</strong>
            This gallery presents a selected set of approved shop photos for a
            faster, more focused visit.
          </div>
        }
      />

      <section
        className="py-12 sm:py-16 lg:py-20"
        aria-label="Brew ni Cat photo gallery"
      >
        <Container>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {galleryImages.map((image) => (
              <figure
                key={image.src}
                className="group relative overflow-hidden rounded-[1.25rem] bg-[var(--surface-warm)] shadow-[var(--shadow-subtle)] sm:rounded-[1.5rem]"
              >
                <Image
                  src={image.src}
                  width={768}
                  height={1024}
                  alt={image.alt}
                  sizes="(max-width: 639px) 46vw, (max-width: 1023px) 46vw, 31vw"
                  className="aspect-[3/4] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                />
              </figure>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
