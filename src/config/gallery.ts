export type GalleryImage = Readonly<{
  src: string;
  alt: string;
  featured?: boolean;
  landscape?: boolean;
}>;

export const galleryImages: readonly GalleryImage[] = [
  {
    src: "/images/shop/photo_004.jpg",
    alt: "Cats resting on a café table beneath blue evening lights at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_006.jpg",
    alt: "Fluffy white cat resting beside greenery inside Brew ni Cat",
  },
  {
    src: "/images/shop/photo_007.jpg",
    alt: "Black-and-white cat sitting near a wooden cat tower at Brew ni Cat",
  },
  {
    src: "/images/shop/photo_009.jpg",
    alt: "Siamese cat in front of the café’s leafy interior wall",
  },
  {
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy noodles served with a fried egg and seaweed at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_030.jpg",
    alt: "Customers gathered around drinks and snacks inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_041.jpg",
    alt: "Group enjoying colorful drinks and snacks at Brew ni Cat",
  },
  {
    src: "/images/shop/photo_045.jpg",
    alt: "Customers seated in Brew ni Cat’s outdoor area",
  },
  {
    src: "/images/shop/photo_060.jpg",
    alt: "Customers sharing drinks beside a cat at the window counter",
    featured: true,
  },
  {
    src: "/images/shop/photo_063.jpg",
    alt: "Customer holding a green drink beside Brew ni Cat’s wall logo",
    featured: true,
  },
  {
    src: "/images/shop/photo_064.jpg",
    alt: "Customers seated outdoors under warm string lights at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_074.jpg",
    alt: "Customers seated with cats, drinks, and snacks inside Brew ni Cat",
  },
  {
    src: "/images/shop/photo_092.jpg",
    alt: "Group gathered around a café table with two cats",
  },
  {
    src: "/images/shop/photo_119.jpg",
    alt: "Siamese cat sitting on wooden cat furniture inside the shop",
  },
  {
    src: "/images/shop/photo_124.jpg",
    alt: "Brew ni Cat seating area with a cat resting near the window",
    featured: true,
  },
  {
    src: "/images/shop/photo_126.jpg",
    alt: "Fluffy white cat in a blue shirt resting by the café window",
  },
  {
    src: "/images/shop/photo_135.jpg",
    alt: "Community group gathered inside Brew ni Cat Coffee Shop",
    landscape: true,
  },
  {
    src: "/images/shop/photo_145.jpg",
    alt: "Two people wearing Brew ni Cat aprons at the service counter",
  },
  {
    src: "/images/shop/photo_146.jpg",
    alt: "Group gathered with cats inside Brew ni Cat Coffee Shop",
    featured: true,
  },
];

export const homeGalleryImages = galleryImages.filter(
  (image) => image.featured,
);
