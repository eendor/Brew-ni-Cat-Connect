import type { Metadata } from "next";

import { ReviewsSection } from "@/components/reviews/reviews-section";
import { PageIntro } from "@/components/ui/page-intro";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Reviews",
  description: `Ratings and reviews from ${siteConfig.shortName} customers, and a form to leave your own.`,
};

/**
 * Customer ratings and reviews on their own page (FR-098, update
 * 2026-11-13): the list with the average rating and the review form, moved
 * here from the About page.
 */
export default function ReviewsPage() {
  return (
    <>
      <PageIntro
        mood="about"
        eyebrow="Community voices"
        title="Reviews"
        description={
          <p>
            What customers say about {siteConfig.shortName}. Been here? Tell us
            how your visit went.
          </p>
        }
      />
      <ReviewsSection />
    </>
  );
}
